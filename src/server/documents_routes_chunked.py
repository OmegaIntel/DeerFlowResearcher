from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid
import json
import os
import tempfile
from datetime import datetime

from src.db.db_session import get_db
from src.db_models import Document
from src.api.api_get_current_user import get_current_user, User as UserResponse
from src.server.s3_utils import s3_manager
from src.server.document_processor_enhanced import enhanced_document_processor

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Store incomplete uploads
upload_sessions = {}

class ChunkUploadRequest(BaseModel):
    chunk_number: int
    total_chunks: int
    chunk_data: str  # base64 encoded chunk
    filename: str
    content_type: str
    upload_id: str
    session_id: Optional[str] = None

class ChunkUploadResponse(BaseModel):
    success: bool
    message: str
    upload_id: str
    chunks_received: int
    document_id: Optional[str] = None

@router.post("/upload-chunk")
async def upload_document_chunk(
    request: ChunkUploadRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
) -> ChunkUploadResponse:
    """Upload a document chunk."""
    # Debug logging
    logger.info(f"[CHUNK-UPLOAD] Received chunk {request.chunk_number}/{request.total_chunks} for {request.filename}")
    logger.info(f"[CHUNK-UPLOAD] Session ID in request: {request.session_id}")
    logger.info(f"[CHUNK-UPLOAD] Upload ID: {request.upload_id}")
    logger.info(f"[CHUNK-UPLOAD] User: {current_user.email}")
    
    upload_key = f"{current_user.id}:{request.upload_id}"
    
    # Initialize session if first chunk
    if upload_key not in upload_sessions:
        upload_sessions[upload_key] = {
            'chunks': {},
            'filename': request.filename,
            'content_type': request.content_type,
            'total_chunks': request.total_chunks,
            'session_id': request.session_id,
            'temp_file': tempfile.NamedTemporaryFile(delete=False)
        }
    
    session = upload_sessions[upload_key]
    
    # Decode and store chunk
    import base64
    chunk_data = base64.b64decode(request.chunk_data)
    session['chunks'][request.chunk_number] = chunk_data
    
    logger.info(f"Received chunk {request.chunk_number}/{request.total_chunks} for {request.filename}")
    
    # Check if all chunks received
    if len(session['chunks']) == request.total_chunks:
        try:
            # Combine all chunks
            combined_data = b''
            for i in range(request.total_chunks):
                combined_data += session['chunks'][i]
            
            logger.info(f"All chunks received. Total size: {len(combined_data)} bytes")
            
            # Upload to S3
            result = s3_manager.upload_file(
                file_content=combined_data,
                filename=request.filename,
                content_type=request.content_type,
                user_id=current_user.id
            )
            
            doc_id = result['file_id']
            
            # Handle session
            session_uuid = None
            # Use the session_id from the upload session (stored with first chunk) for consistency
            stored_session_id = session.get('session_id')
            logger.info(f"[CHUNK-UPLOAD] Processing session_id from request: {request.session_id}")
            logger.info(f"[CHUNK-UPLOAD] Processing session_id from stored session: {stored_session_id}")
            if stored_session_id:
                from src.db_models.chat_session import ChatSession
                logger.info(f"[CHUNK-UPLOAD] Looking for chat session with thread_id: {stored_session_id}")
                chat_session = db.query(ChatSession).filter(
                    ChatSession.thread_id == stored_session_id
                ).first()
                if not chat_session:
                    logger.info(f"[CHUNK-UPLOAD] No existing session found, creating new one")
                    chat_session = ChatSession(
                        thread_id=stored_session_id,
                        user_id=uuid.UUID(current_user.id),
                        mode='chat'
                    )
                    db.add(chat_session)
                    db.commit()
                    db.refresh(chat_session)
                    logger.info(f"[CHUNK-UPLOAD] Created new session with ID: {chat_session.id}")
                else:
                    logger.info(f"[CHUNK-UPLOAD] Found existing session with ID: {chat_session.id}")
                session_uuid = chat_session.id
                logger.info(f"[CHUNK-UPLOAD] Final session_uuid: {session_uuid}")
            else:
                logger.warning(f"[CHUNK-UPLOAD] No session_id provided - request.session_id: {request.session_id}, stored: {stored_session_id}")
            
            # Create database record
            document = Document(
                id=uuid.UUID(doc_id),
                user_id=uuid.UUID(current_user.id),
                session_id=session_uuid,
                filename=result['filename'],
                original_filename=request.filename,
                s3_bucket=s3_manager.bucket_name,
                s3_key=result['key'],
                file_size=len(combined_data),
                content_type=request.content_type,
                processing_status="processing",
                upload_metadata=json.dumps({
                    'user_id': current_user.id,
                    'original_filename': request.filename,
                    'upload_timestamp': datetime.utcnow().isoformat(),
                    'upload_method': 'chunked'
                })
            )
            db.add(document)
            db.commit()
            
            # Process document
            try:
                session_id_str = str(session_uuid) if session_uuid else None
                processing_result = await enhanced_document_processor.process_document(
                    file_content=combined_data,
                    filename=request.filename,
                    content_type=request.content_type,
                    document_id=doc_id,
                    session_id=session_id_str,
                    user_id=current_user.id
                )
                
                document.processing_status = "completed" if processing_result['success'] else "failed"
                document.chunks_created = processing_result.get('chunks_created', 0)
                document.vectors_created = processing_result.get('vectors_created', 0)
                document.pinecone_index = processing_result.get('index_name')
            except Exception as e:
                logger.error(f"Error processing document: {e}")
                document.processing_status = "failed"
            
            db.commit()
            
            # Clean up
            del upload_sessions[upload_key]
            if 'temp_file' in session:
                try:
                    os.unlink(session['temp_file'].name)
                except:
                    pass
            
            return ChunkUploadResponse(
                success=True,
                message="Upload completed successfully",
                upload_id=request.upload_id,
                chunks_received=request.total_chunks,
                document_id=str(document.id)
            )
            
        except Exception as e:
            logger.error(f"Error processing completed upload: {e}")
            # Clean up on error
            if upload_key in upload_sessions:
                del upload_sessions[upload_key]
            raise HTTPException(status_code=500, detail=str(e))
    
    # Not all chunks received yet
    return ChunkUploadResponse(
        success=True,
        message=f"Chunk {request.chunk_number} received",
        upload_id=request.upload_id,
        chunks_received=len(session['chunks']),
        document_id=None
    )