import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import uuid
import json

from src.db.db_session import get_db
from src.db_models import Document, User
from src.api.api_get_current_user import get_current_user, User as UserResponse
from src.server.s3_utils import s3_manager
from src.server.document_processor import document_processor

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_documents(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get documents for the current user with pagination."""
    try:
        # Build query
        query = db.query(Document).filter(
            Document.user_id == uuid.UUID(current_user.id),
            Document.is_active == True
        )
        
        if status_filter:
            query = query.filter(Document.processing_status == status_filter)
        
        if session_id:
            # First find the session by thread_id
            from src.db_models.chat_session import ChatSession
            session = db.query(ChatSession).filter(ChatSession.thread_id == session_id).first()
            if session:
                query = query.filter(Document.session_id == session.id)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        documents = query.order_by(desc(Document.created_at)).offset(offset).limit(per_page).all()
        
        # Convert to response format
        docs_response = []
        for doc in documents:
            # Generate presigned URL
            try:
                download_url = s3_manager.generate_presigned_url(doc.s3_key)
            except:
                download_url = None
            
            docs_response.append({
                "id": str(doc.id),
                "filename": doc.filename,
                "original_filename": doc.original_filename,
                "file_size": doc.file_size,
                "content_type": doc.content_type,
                "processing_status": doc.processing_status,
                "vectors_created": doc.vectors_created,
                "chunks_created": doc.chunks_created,
                "pinecone_index": doc.pinecone_index,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "download_url": download_url,
                "s3_key": doc.s3_key,
                "session_id": str(doc.session_id) if doc.session_id else None,
            })
        
        return {
            "documents": docs_response,
            "total": total,
            "page": page,
            "per_page": per_page
        }
    except Exception as e:
        logger.error(f"Error fetching documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    # Force a print to see if this is reached
    import sys
    print(f"UPLOAD DEBUG: session_id={session_id}", file=sys.stderr, flush=True)
    """Upload a document to S3 and process for RAG."""
    print(f"[DEBUG] Upload endpoint called with session_id: {session_id}", flush=True)
    logger.info(f"Upload request from user: {current_user.email}")
    try:
        # Read file content
        content = await file.read()
        
        # Upload to S3
        result = s3_manager.upload_file(
            file_content=content,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
            user_id=current_user.id
        )
        
        # Use the file_id from S3 result
        doc_id = result['file_id']
        
        # If session_id is provided, ensure the session exists
        if session_id:
            from src.db_models.chat_session import ChatSession
            print(f"[DEBUG] Looking for session with thread_id: {session_id}", flush=True)
            logger.info(f"Looking for session with thread_id: {session_id}")
            session = db.query(ChatSession).filter(ChatSession.thread_id == session_id).first()
            if not session:
                print(f"[DEBUG] No existing session found, creating new one", flush=True)
                logger.info(f"Creating new session for thread_id: {session_id}, user_id: {current_user.id}")
                # Create the session if it doesn't exist
                session = ChatSession(
                    thread_id=session_id,
                    user_id=uuid.UUID(current_user.id),
                    mode='chat'
                )
                db.add(session)
                db.commit()
                db.refresh(session)
                print(f"[DEBUG] Created session with id: {session.id}", flush=True)
                logger.info(f"Created session with id: {session.id}")
            else:
                print(f"[DEBUG] Found existing session with id: {session.id}", flush=True)
                logger.info(f"Found existing session with id: {session.id}")
            session_uuid = session.id
            print(f"[DEBUG] Using session_uuid: {session_uuid}", flush=True)
        else:
            session_uuid = None
        
        # Create database record
        logger.info(f"Creating document with doc_id: {doc_id}, user_id: {current_user.id}, session_uuid: {session_uuid}")
        document = Document(
            id=uuid.UUID(doc_id),
            user_id=uuid.UUID(current_user.id),
            session_id=session_uuid,
            filename=result['filename'],
            original_filename=file.filename,
            s3_bucket=s3_manager.bucket_name,
            s3_key=result['key'],
            file_size=len(content),
            content_type=file.content_type or "application/octet-stream",
            processing_status="processing",
            upload_metadata=json.dumps({
                'user_id': current_user.id,
                'original_filename': file.filename,
                'upload_timestamp': datetime.utcnow().isoformat()
            })
        )
        db.add(document)
        db.commit()
        
        # Process document for RAG (async)
        try:
            processing_result = await document_processor.process_document(
                file_content=content,
                filename=file.filename,
                content_type=file.content_type or "application/octet-stream",
                document_id=doc_id
            )
            
            # Update document with processing results
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
                "session_id": session_id  # Return the thread_id, not the internal session UUID
            }
        }
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific document."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = db.query(Document).filter(
        Document.id == doc_uuid,
        Document.user_id == uuid.UUID(current_user.id),
        Document.is_active == True
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    download_url = None
    try:
        download_url = s3_manager.generate_presigned_url(document.s3_key)
    except:
        pass
    
    return {
        "id": str(document.id),
        "filename": document.filename,
        "original_filename": document.original_filename,
        "file_size": document.file_size,
        "content_type": document.content_type,
        "processing_status": document.processing_status,
        "vectors_created": document.vectors_created,
        "chunks_created": document.chunks_created,
        "pinecone_index": document.pinecone_index,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "download_url": download_url,
        "session_id": str(document.session_id) if document.session_id else None
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """Delete a document from S3 and database."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = db.query(Document).filter(
        Document.id == doc_uuid,
        Document.user_id == uuid.UUID(current_user.id),
        Document.is_active == True
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete from S3
    try:
        s3_manager.delete_file(document.s3_key)
    except Exception as e:
        logger.warning(f"Error deleting S3 file: {e}")
    
    # Soft delete from database
    document.is_active = False
    db.commit()
    
    return {"success": True, "message": "Document deleted successfully"}


@router.get("/{document_id}/download-url")
async def get_document_download_url(
    document_id: str,
    expiration: int = 3600,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a presigned download URL for a document."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = db.query(Document).filter(
        Document.id == doc_uuid,
        Document.user_id == uuid.UUID(current_user.id),
        Document.is_active == True
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        download_url = s3_manager.generate_presigned_url(document.s3_key, expiration=expiration)
    except Exception as e:
        logger.error(f"Error generating download URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download URL")
    
    return {
        "download_url": download_url,
        "filename": document.original_filename,
        "expires_in": expiration
    }


@router.post("/search")
async def search_documents(
    query: str = Form(...),
    top_k: int = Form(5),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """Search across user's uploaded documents."""
    try:
        # Build filter for user's documents
        filter_dict = {"user_id": current_user.id}
        if session_id:
            filter_dict["session_id"] = session_id
        
        results = document_processor.search_documents(
            query=query,
            top_k=top_k,
            filter_dict=filter_dict
        )
        
        return {
            "query": query,
            "results": results,
            "total_results": len(results)
        }
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))