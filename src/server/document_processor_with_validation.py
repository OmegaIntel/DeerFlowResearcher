"""Enhanced document processor with better validation"""

import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from src.db.db_session import SessionLocal
from src.db_models import Document
from src.server.document_processor_enhanced import enhanced_document_processor
import uuid

logger = logging.getLogger(__name__)

class ValidatedDocumentProcessor:
    """Wrapper around document processor that validates documents exist in DB"""
    
    def __init__(self):
        self.processor = enhanced_document_processor
    
    def search_documents_with_validation(
        self, 
        query: str, 
        user_id: str,
        session_id: Optional[str] = None,
        top_k: int = 5,
        db: Optional[Session] = None
    ) -> List[Dict]:
        """Search documents and validate they exist in database"""
        
        # Get database session
        if db is None:
            db = SessionLocal()
            close_db = True
        else:
            close_db = False
        
        try:
            # First, get all valid document IDs for this user
            valid_docs_query = db.query(Document).filter(
                Document.user_id == uuid.UUID(user_id),
                Document.is_active == True
            )
            
            # If session_id provided, filter by session
            if session_id:
                # Try both UUID formats
                try:
                    # If session_id is already a valid UUID with dashes
                    session_uuid = uuid.UUID(session_id)
                    valid_docs_query = valid_docs_query.filter(
                        Document.session_id == session_uuid
                    )
                except ValueError:
                    # If not, try without dashes
                    valid_docs_query = valid_docs_query.filter(
                        Document.session_id == session_id
                    )
            
            # Get valid documents and store IDs in both formats (with and without dashes)
            valid_docs = valid_docs_query.all()
            valid_doc_ids = set()
            for doc in valid_docs:
                doc_id_str = str(doc.id)
                # Add both formats
                valid_doc_ids.add(doc_id_str.replace('-', ''))  # Without dashes
                valid_doc_ids.add(doc_id_str)  # Original format
                # Also try adding with dashes if not present
                if '-' not in doc_id_str and len(doc_id_str) == 32:
                    # Format: 8-4-4-4-12
                    formatted = f"{doc_id_str[:8]}-{doc_id_str[8:12]}-{doc_id_str[12:16]}-{doc_id_str[16:20]}-{doc_id_str[20:]}"
                    valid_doc_ids.add(formatted)
            logger.info(f"[VALIDATED-SEARCH] User has {len(valid_doc_ids)} valid documents")
            
            # Search with appropriate filter
            # Ensure user_id has dashes for Pinecone
            if len(user_id) == 32 and '-' not in user_id:
                # Format: 8-4-4-4-12
                formatted_user_id = f"{user_id[:8]}-{user_id[8:12]}-{user_id[12:16]}-{user_id[16:20]}-{user_id[20:]}"
            else:
                formatted_user_id = user_id
                
            filter_dict = {"user_id": formatted_user_id}
            if session_id:
                # Ensure session_id has dashes for Pinecone filter
                if len(session_id) == 32 and '-' not in session_id:
                    # Format: 8-4-4-4-12
                    formatted_session_id = f"{session_id[:8]}-{session_id[8:12]}-{session_id[12:16]}-{session_id[16:20]}-{session_id[20:]}"
                    filter_dict["session_id"] = formatted_session_id
                else:
                    filter_dict["session_id"] = session_id
            
            # Get more results than needed since some might be filtered out
            search_results = self.processor.search_documents_with_citations(
                query=query,
                top_k=top_k * 2,  # Get double to account for filtering
                filter_dict=filter_dict
            )
            
            # Filter results to only include valid documents
            valid_results = []
            for result in search_results:
                doc_id = result['citation']['document_id']
                # Also check without dashes
                doc_id_no_dash = doc_id.replace('-', '')
                if doc_id in valid_doc_ids or doc_id_no_dash in valid_doc_ids:
                    valid_results.append(result)
                    logger.info(f"[VALIDATED-SEARCH] Including valid document: {doc_id} - {result['citation']['filename']}")
                    if len(valid_results) >= top_k:
                        break
                else:
                    logger.warning(f"[VALIDATED-SEARCH] Filtering out invalid document: {doc_id} - {result['citation']['filename']} (not owned by user {user_id})")
            
            logger.info(f"[VALIDATED-SEARCH] Returning {len(valid_results)} valid results")
            return valid_results
            
        finally:
            if close_db:
                db.close()
    
    async def process_document(self, *args, **kwargs):
        """Pass through to underlying processor"""
        return await self.processor.process_document(*args, **kwargs)

# Create singleton instance
validated_document_processor = ValidatedDocumentProcessor()