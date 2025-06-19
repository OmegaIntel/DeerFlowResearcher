from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import base64
import uuid
import json
from datetime import datetime

from src.db.db_session import get_db
from src.db_models import Document
from src.api.api_get_current_user import get_current_user, User as UserResponse
from src.server.s3_utils import s3_manager
from src.server.document_processor_enhanced import enhanced_document_processor

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

class Base64UploadRequest(BaseModel):
    filename: str
    content_type: str
    content_base64: str
    session_id: Optional[str] = None

@router.post("/upload-base64")
async def upload_document_base64(
    request: Base64UploadRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """Upload a document using base64 encoding to bypass size limits."""
    logger.info(f"Base64 upload request from user: {current_user.email}, file: {request.filename}")
    
    try:
        # Decode base64 content
        content = base64.b64decode(request.content_base64)
        logger.info(f"Decoded file size: {len(content)} bytes")
        
        # Upload to S3
        result = s3_manager.upload_file(
            file_content=content,
            filename=request.filename,
            content_type=request.content_type,
            user_id=current_user.id
        )
        
        # Use the file_id from S3 result
        doc_id = result['file_id']
        
        # Handle session
        session_uuid = None
        if request.session_id:
            from src.db_models.chat_session import ChatSession
            session = db.query(ChatSession).filter(ChatSession.thread_id == request.session_id).first()
            if not session:
                session = ChatSession(
                    thread_id=request.session_id,
                    user_id=uuid.UUID(current_user.id),
                    mode='chat'
                )
                db.add(session)
                db.commit()
                db.refresh(session)
            session_uuid = session.id
        
        # Create database record
        document = Document(
            id=uuid.UUID(doc_id),
            user_id=uuid.UUID(current_user.id),
            session_id=session_uuid,
            filename=result['filename'],
            original_filename=request.filename,
            s3_bucket=s3_manager.bucket_name,
            s3_key=result['key'],
            file_size=len(content),
            content_type=request.content_type,
            processing_status="processing",
            upload_metadata=json.dumps({
                'user_id': current_user.id,
                'original_filename': request.filename,
                'upload_timestamp': datetime.utcnow().isoformat(),
                'upload_method': 'base64'
            })
        )
        db.add(document)
        db.commit()
        
        # Process document for RAG
        try:
            session_id_str = str(session_uuid) if session_uuid else None
            processing_result = await enhanced_document_processor.process_document(
                file_content=content,
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
        db.refresh(document)
        
        return {
            "success": True,
            "message": "File uploaded and processed successfully",
            "document": {
                "id": str(document.id),
                "filename": document.filename,
                "original_filename": document.original_filename,
                "size": document.file_size,
                "upload_time": document.created_at.isoformat() if document.created_at else None,
                "chunks_created": document.chunks_created,
                "vectors_created": document.vectors_created,
                "processing_status": document.processing_status,
                "session_id": request.session_id
            }
        }
    except Exception as e:
        logger.error(f"Error uploading document via base64: {e}")
        raise HTTPException(status_code=500, detail=str(e))