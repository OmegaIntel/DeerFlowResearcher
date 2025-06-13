import os
import logging
from typing import List, Dict, Optional
import tempfile
from langchain.document_loaders import TextLoader
try:
    from langchain.document_loaders import PyPDFLoader
except ImportError:
    PyPDFLoader = None
try:
    from langchain.document_loaders import CSVLoader
except ImportError:
    CSVLoader = None
try:
    from langchain.document_loaders import UnstructuredFileLoader
except ImportError:
    UnstructuredFileLoader = None
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
import uuid

logger = logging.getLogger(__name__)

class DocumentProcessor:
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
        
    def get_loader_for_file(self, file_path: str, content_type: str):
        """Get appropriate loader based on file type"""
        if content_type == 'application/pdf' and PyPDFLoader:
            return PyPDFLoader(file_path)
        elif (content_type == 'text/csv' or file_path.endswith('.csv')) and CSVLoader:
            return CSVLoader(file_path)
        elif UnstructuredFileLoader and content_type not in ['text/plain', 'text/csv', 'application/pdf']:
            # Use unstructured loader for other file types
            return UnstructuredFileLoader(file_path)
        else:
            # Default to text loader
            return TextLoader(file_path)
    
    async def process_document(self, file_content: bytes, filename: str, content_type: str, document_id: str) -> Dict:
        """Process a document and store embeddings in Pinecone"""
        try:
            logger.info(f"Processing document: {filename}, type: {content_type}, id: {document_id}")
            logger.info(f"Using Pinecone index: {self.index_name}")
            
            # Save file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{filename}") as tmp_file:
                tmp_file.write(file_content)
                tmp_file_path = tmp_file.name
            
            # Load and split document
            loader = self.get_loader_for_file(tmp_file_path, content_type)
            documents = loader.load()
            logger.info(f"Loaded {len(documents)} documents from {filename}")
            
            # Split into chunks
            chunks = self.text_splitter.split_documents(documents)
            logger.info(f"Split into {len(chunks)} chunks")
            
            # Add metadata to each chunk
            for i, chunk in enumerate(chunks):
                chunk.metadata.update({
                    'document_id': document_id,
                    'filename': filename,
                    'chunk_index': i,
                    'total_chunks': len(chunks)
                })
            
            # Create vector store and add documents
            vector_store = PineconeVectorStore(
                index_name=self.index_name,
                embedding=self.embeddings,
                pinecone_api_key=os.getenv('PINECONE_API_KEY')
            )
            
            # Add documents to vector store
            logger.info(f"Adding {len(chunks)} chunks to Pinecone index {self.index_name}")
            vector_store.add_documents(chunks)
            logger.info(f"Successfully added documents to Pinecone")
            
            # Clean up temp file
            os.unlink(tmp_file_path)
            
            return {
                'success': True,
                'chunks_created': len(chunks),
                'vectors_created': len(chunks),
                'index_name': self.index_name
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
    
    def search_documents(self, query: str, top_k: int = 5, filter_dict: Optional[Dict] = None) -> List[Dict]:
        """Search for relevant documents"""
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
            
            # Format results
            formatted_results = []
            for doc, score in results:
                formatted_results.append({
                    'content': doc.page_content,
                    'metadata': doc.metadata,
                    'score': score
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []

# Singleton instance
document_processor = DocumentProcessor()