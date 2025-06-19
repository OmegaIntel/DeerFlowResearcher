import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid
import os

from src.db.db_session import get_db
from src.db_models import Document
from src.api.api_get_current_user import get_current_user, User as UserResponse
from src.db_models.chat_session import ChatSession
from pinecone import Pinecone
from src.server.document_processor_enhanced import enhanced_document_processor

logger = logging.getLogger(__name__)
router = APIRouter()

class UpdateDocumentSessionRequest(BaseModel):
    document_ids: List[str]
    thread_id: str

@router.post("/update-session")
async def update_document_session(
    request: UpdateDocumentSessionRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """Update document session associations when a chat session is created."""
    logger.info(f"[DOC-SESSION-UPDATE] Updating session for documents: {request.document_ids} with thread_id: {request.thread_id}")
    
    # Find or create the chat session
    chat_session = db.query(ChatSession).filter(
        ChatSession.thread_id == request.thread_id
    ).first()
    
    if not chat_session:
        logger.info(f"[DOC-SESSION-UPDATE] Creating new session for thread_id: {request.thread_id}")
        chat_session = ChatSession(
            thread_id=request.thread_id,
            user_id=uuid.UUID(current_user.id),
            mode='chat'
        )
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)
    
    # Update documents to associate with this session
    updated_count = 0
    pinecone_updated_count = 0
    
    # Initialize Pinecone for metadata updates
    try:
        pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
        index = pc.Index(enhanced_document_processor.index_name)
        logger.info(f"[DOC-SESSION-UPDATE] Connected to Pinecone index: {enhanced_document_processor.index_name}")
    except Exception as e:
        logger.error(f"[DOC-SESSION-UPDATE] Failed to connect to Pinecone: {e}")
        index = None
    
    for doc_id in request.document_ids:
        try:
            # Normalize UUID format - try both with and without dashes
            doc_uuid_no_dash = doc_id.replace('-', '')
            doc_uuid_with_dash = doc_id if '-' in doc_id else f"{doc_id[:8]}-{doc_id[8:12]}-{doc_id[12:16]}-{doc_id[16:20]}-{doc_id[20:]}"
            
            # Try to find document with either format
            document = db.query(Document).filter(
                (Document.id == doc_uuid_no_dash) | (Document.id == doc_uuid_with_dash),
                Document.user_id == uuid.UUID(current_user.id)
            ).first()
            
            if document and document.session_id is None:
                # Use consistent UUID format with dashes for session ID
                session_id_with_dash = str(chat_session.id)
                document.session_id = session_id_with_dash
                updated_count += 1
                logger.info(f"[DOC-SESSION-UPDATE] Updated document {document.id} with session {session_id_with_dash}")
                
                # Update Pinecone metadata if index is available
                if index:
                    try:
                        # Update all vectors for this document
                        # We need to find vectors by document_id in metadata
                        # Since we can't query by metadata alone, we'll update by constructing vector IDs
                        # Typically vector IDs include document ID and chunk index
                        
                        # Get document info to determine number of chunks
                        if document.chunks_created and document.chunks_created > 0:
                            for chunk_idx in range(document.chunks_created):
                                # Try different vector ID formats
                                vector_ids = [
                                    f"{doc_id}_p1_c{chunk_idx}",  # New format with page
                                    f"{doc_uuid_with_dash}_p1_c{chunk_idx}",
                                    f"{doc_uuid_no_dash}_p1_c{chunk_idx}",
                                    f"{doc_id}_{chunk_idx}",  # Old format
                                    f"{doc_uuid_with_dash}_{chunk_idx}",
                                    f"{doc_uuid_no_dash}_{chunk_idx}"
                                ]
                                
                                for vector_id in vector_ids:
                                    try:
                                        # Fetch the vector to get its current metadata
                                        fetch_response = index.fetch(ids=[vector_id])
                                        if vector_id in fetch_response.vectors:
                                            current_metadata = fetch_response.vectors[vector_id].metadata
                                            # Update metadata with session_id
                                            current_metadata['session_id'] = session_id_with_dash
                                            # Update the vector with new metadata
                                            index.update(
                                                id=vector_id,
                                                set_metadata={"session_id": session_id_with_dash}
                                            )
                                            pinecone_updated_count += 1
                                            logger.info(f"[DOC-SESSION-UPDATE] Updated Pinecone vector {vector_id} with session_id")
                                            break  # Found and updated this chunk, move to next
                                    except Exception as e:
                                        continue  # Try next format
                        
                        logger.info(f"[DOC-SESSION-UPDATE] Updated {pinecone_updated_count} Pinecone vectors for document {doc_id}")
                    except Exception as e:
                        logger.error(f"[DOC-SESSION-UPDATE] Error updating Pinecone metadata for document {doc_id}: {e}")
            else:
                if document and document.session_id:
                    logger.warning(f"[DOC-SESSION-UPDATE] Document {doc_id} already has session: {document.session_id}")
                else:
                    logger.warning(f"[DOC-SESSION-UPDATE] Document {doc_id} not found for user")
                
        except Exception as e:
            logger.error(f"[DOC-SESSION-UPDATE] Error updating document {doc_id}: {e}")
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Updated {updated_count} documents with session, {pinecone_updated_count} vectors in Pinecone",
        "session_id": str(chat_session.id),
        "thread_id": request.thread_id,
        "documents_updated": updated_count,
        "vectors_updated": pinecone_updated_count
    }