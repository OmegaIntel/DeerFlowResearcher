import os
import logging
from typing import List, Dict, Optional, Tuple
import tempfile
from langchain_community.document_loaders import TextLoader
from langchain.schema import Document
try:
    from langchain_community.document_loaders import PyPDFLoader
except ImportError:
    PyPDFLoader = None
try:
    from langchain_community.document_loaders import CSVLoader
except ImportError:
    CSVLoader = None
try:
    from langchain_community.document_loaders import UnstructuredFileLoader
except ImportError:
    UnstructuredFileLoader = None
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
import uuid
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

logger = logging.getLogger(__name__)

class EnhancedDocumentProcessor:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # Initialize Pinecone
        self.pinecone_client = Pinecone(
            api_key=os.getenv('PINECONE_API_KEY')
        )
        
        # Text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            is_separator_regex=False,
        )
        
        # Use the first available index or create a new one
        try:
            existing_indexes = [index.name for index in self.pinecone_client.list_indexes()]
            if existing_indexes:
                # Use the first available index
                self.index_name = existing_indexes[0]
                logger.info(f"Using existing Pinecone index: {self.index_name}")
            else:
                # Create a new index with the new API
                self.index_name = "omegaintel-docs"
                logger.info(f"Creating Pinecone index: {self.index_name}")
                from pinecone import ServerlessSpec
                self.pinecone_client.create_index(
                    name=self.index_name,
                    dimension=1536,  # OpenAI embedding dimension
                    metric='cosine',
                    spec=ServerlessSpec(
                        cloud='aws',
                        region='us-east-1'
                    )
                )
        except Exception as e:
            logger.error(f"Error initializing Pinecone index: {e}")
            # Fallback to a known existing index
            self.index_name = "df-06122343-209b21"
            logger.info(f"Using fallback index: {self.index_name}")
    
    def extract_pdf_with_pages(self, file_path: str) -> List[Dict]:
        """Extract PDF content with page number tracking"""
        documents_with_pages = []
        
        if PyPDF2:
            try:
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    text = page.extract_text()
                    if text.strip():  # Only add non-empty pages
                        # Create a document for each page
                        doc = Document(
                            page_content=text,
                            metadata={
                                'page_number': page_num,
                                'total_pages': len(pdf_reader.pages),
                                'source': file_path
                            }
                        )
                        documents_with_pages.append({
                            'document': doc,
                            'page_number': page_num,
                            'char_start': 0,  # Will be updated during chunking
                            'char_end': len(text)
                        })
            except Exception as e:
                logger.error(f"Error extracting PDF with pages: {e}")
        
        # Fall back to regular PyPDFLoader if PyPDF2 failed or not available
        if not documents_with_pages and PyPDFLoader:
            try:
                loader = PyPDFLoader(file_path)
                docs = loader.load()
                for i, doc in enumerate(docs):
                    documents_with_pages.append({
                        'document': doc,
                        'page_number': i + 1,
                        'char_start': 0,
                        'char_end': len(doc.page_content)
                    })
            except Exception as e:
                logger.error(f"Error with PyPDFLoader: {e}")
        
        return documents_with_pages
    
    def get_enhanced_loader_for_file(self, file_path: str, content_type: str) -> Tuple[List[Document], bool]:
        """Get appropriate loader based on file type with enhanced metadata"""
        is_pdf = False
        
        if content_type == 'application/pdf' or file_path.endswith('.pdf'):
            is_pdf = True
            docs_with_meta = self.extract_pdf_with_pages(file_path)
            return [item['document'] for item in docs_with_meta], is_pdf
        elif (content_type == 'text/csv' or file_path.endswith('.csv')) and CSVLoader:
            loader = CSVLoader(file_path)
            return loader.load(), is_pdf
        elif UnstructuredFileLoader and content_type not in ['text/plain', 'text/csv', 'application/pdf']:
            loader = UnstructuredFileLoader(file_path)
            return loader.load(), is_pdf
        else:
            # Default to text loader
            loader = TextLoader(file_path)
            return loader.load(), is_pdf
    
    def chunk_with_metadata(self, documents: List[Document], is_pdf: bool = False) -> List[Document]:
        """Split documents into chunks while preserving page metadata"""
        enhanced_chunks = []
        
        for doc in documents:
            # Get the page number if it exists
            page_number = doc.metadata.get('page_number', 1)
            
            # Split the document
            chunks = self.text_splitter.split_text(doc.page_content)
            
            # Track character position within the page
            char_position = 0
            
            for i, chunk_text in enumerate(chunks):
                # Find the actual position of this chunk in the original text
                chunk_start = doc.page_content.find(chunk_text, char_position)
                if chunk_start == -1:
                    chunk_start = char_position
                chunk_end = chunk_start + len(chunk_text)
                
                # Create enhanced chunk with position metadata
                enhanced_chunk = Document(
                    page_content=chunk_text,
                    metadata={
                        **doc.metadata,
                        'page_number': page_number,
                        'chunk_char_start': chunk_start,
                        'chunk_char_end': chunk_end,
                        'chunk_index_in_page': i,
                        'total_chunks_in_page': len(chunks)
                    }
                )
                enhanced_chunks.append(enhanced_chunk)
                
                # Update position for next search
                char_position = chunk_end
        
        return enhanced_chunks
    
    async def process_document(self, file_content: bytes, filename: str, content_type: str, 
                             document_id: str, session_id: Optional[str] = None, 
                             user_id: Optional[str] = None) -> Dict:
        """Process a document and store embeddings with enhanced metadata in Pinecone"""
        try:
            logger.info(f"Processing document with enhanced metadata: {filename}, type: {content_type}, id: {document_id}")
            
            # Save file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{filename}") as tmp_file:
                tmp_file.write(file_content)
                tmp_file_path = tmp_file.name
            
            # Load document with enhanced metadata
            documents, is_pdf = self.get_enhanced_loader_for_file(tmp_file_path, content_type)
            logger.info(f"Loaded {len(documents)} documents from {filename}")
            
            # Split into chunks with metadata preservation
            chunks = self.chunk_with_metadata(documents, is_pdf)
            logger.info(f"Split into {len(chunks)} chunks with enhanced metadata")
            
            # Add metadata to each chunk
            for i, chunk in enumerate(chunks):
                metadata = {
                    'document_id': document_id,
                    'filename': filename,
                    'chunk_index': i,
                    'total_chunks': len(chunks),
                    'content_type': content_type,
                    # Enhanced metadata
                    'page_number': chunk.metadata.get('page_number', 1),
                    'chunk_char_start': chunk.metadata.get('chunk_char_start', 0),
                    'chunk_char_end': chunk.metadata.get('chunk_char_end', 0),
                    'chunk_index_in_page': chunk.metadata.get('chunk_index_in_page', 0),
                    'total_chunks_in_page': chunk.metadata.get('total_chunks_in_page', 1)
                }
                
                # Add session_id if provided
                if session_id:
                    metadata['session_id'] = session_id
                
                # Add user_id if provided
                if user_id:
                    metadata['user_id'] = user_id
                
                # Create a unique chunk ID for reference
                metadata['chunk_id'] = f"{document_id}_p{metadata['page_number']}_c{i}"
                
                chunk.metadata = metadata
            
            # Create vector store and add documents
            vector_store = PineconeVectorStore(
                index_name=self.index_name,
                embedding=self.embeddings,
                pinecone_api_key=os.getenv('PINECONE_API_KEY')
            )
            
            # Add documents to vector store
            logger.info(f"Adding {len(chunks)} chunks with enhanced metadata to Pinecone")
            vector_store.add_documents(chunks)
            logger.info(f"Successfully added documents to Pinecone")
            
            # Clean up temp file
            os.unlink(tmp_file_path)
            
            return {
                'success': True,
                'chunks_created': len(chunks),
                'vectors_created': len(chunks),
                'index_name': self.index_name,
                'pages_processed': max([c.metadata.get('page_number', 1) for c in chunks])
            }
            
        except Exception as e:
            logger.error(f"Error processing document: {e}", exc_info=True)
            # Clean up temp file on error
            if 'tmp_file_path' in locals():
                try:
                    os.unlink(tmp_file_path)
                except:
                    pass
            return {
                'success': False,
                'error': str(e),
                'chunks_created': 0,
                'vectors_created': 0
            }
    
    def search_documents_with_citations(self, query: str, top_k: int = 5, 
                                      filter_dict: Optional[Dict] = None) -> List[Dict]:
        """Search for relevant documents and return with citation metadata"""
        try:
            vector_store = PineconeVectorStore(
                index_name=self.index_name,
                embedding=self.embeddings,
                pinecone_api_key=os.getenv('PINECONE_API_KEY')
            )
            
            # Perform similarity search
            if filter_dict:
                results = vector_store.similarity_search_with_score(
                    query=query,
                    k=top_k,
                    filter=filter_dict
                )
            else:
                results = vector_store.similarity_search_with_score(
                    query=query,
                    k=top_k
                )
            
            # Format results with citation information
            formatted_results = []
            for i, (doc, score) in enumerate(results):
                citation_id = f"[{i+1}]"
                formatted_results.append({
                    'citation_id': citation_id,
                    'content': doc.page_content,
                    'metadata': doc.metadata,
                    'score': score,
                    'citation': {
                        'id': citation_id,
                        'document_id': doc.metadata.get('document_id'),
                        'filename': doc.metadata.get('filename'),
                        'page_number': doc.metadata.get('page_number', 1),
                        'chunk_id': doc.metadata.get('chunk_id'),
                        'char_start': doc.metadata.get('chunk_char_start', 0),
                        'char_end': doc.metadata.get('chunk_char_end', 0)
                    }
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []

# Singleton instance
enhanced_document_processor = EnhancedDocumentProcessor()