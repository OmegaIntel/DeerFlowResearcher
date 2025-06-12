from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import json

from src.db.db_session import get_db
from src.db_models import Document, User
from src.server.auth import get_current_user
from src.utils.s3_client import s3_client

router = APIRouter()


class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    content_type: str
    processing_status: str
    vectors_created: int
    chunks_created: int
    pinecone_index: Optional[str]
    created_at: datetime
    download_url: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    success: bool
    message: str
    document_id: Optional[str] = None
    job_id: Optional[str] = None


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
    page: int
    per_page: int


@router.get("/", response_model=DocumentListResponse)
async def get_documents(
    page: int = 1,
    per_page: int = 20,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's documents with pagination"""
    skip = (page - 1) * per_page
    
    query = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.is_active == True
    )
    
    if status_filter:
        query = query.filter(Document.processing_status == status_filter)
    
    total = query.count()
    documents = query.order_by(desc(Document.created_at)).offset(skip).limit(per_page).all()
    
    # Generate presigned URLs for documents
    document_responses = []
    for doc in documents:
        download_url = None
        if s3_client.is_available():
            download_url = s3_client.generate_presigned_url(doc.s3_key, expiration=3600)
        
        document_responses.append(DocumentResponse(
            id=str(doc.id),
            filename=doc.filename,
            original_filename=doc.original_filename,
            file_size=doc.file_size,
            content_type=doc.content_type,
            processing_status=doc.processing_status,
            vectors_created=doc.vectors_created,
            chunks_created=doc.chunks_created,
            pinecone_index=doc.pinecone_index,
            created_at=doc.created_at,
            download_url=download_url
        ))
    
    return DocumentListResponse(
        documents=document_responses,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific document"""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = db.query(Document).filter(
        Document.id == doc_uuid,
        Document.user_id == current_user.id,
        Document.is_active == True
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    download_url = None
    if s3_client.is_available():
        download_url = s3_client.generate_presigned_url(document.s3_key, expiration=3600)
    
    return DocumentResponse(
        id=str(document.id),
        filename=document.filename,
        original_filename=document.original_filename,
        file_size=document.file_size,
        content_type=document.content_type,
        processing_status=document.processing_status,
        vectors_created=document.vectors_created,
        chunks_created=document.chunks_created,
        pinecone_index=document.pinecone_index,
        created_at=document.created_at,
        download_url=download_url
    )


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload documents to S3 and process with Pinecone"""
    if not s3_client.is_available():
        raise HTTPException(status_code=503, detail="File storage service unavailable")
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    uploaded_docs = []
    
    for file in files:
        if not file.filename:
            continue
            
        # Read file content
        content = await file.read()
        
        # Generate S3 key
        s3_key = s3_client.generate_file_key(str(current_user.id), file.filename)
        
        # Upload to S3
        metadata = {
            'user_id': str(current_user.id),
            'original_filename': file.filename,
            'upload_timestamp': datetime.utcnow().isoformat()
        }
        
        success = s3_client.upload_file(
            file_content=content,
            file_key=s3_key,
            content_type=file.content_type or 'application/octet-stream',
            metadata=metadata
        )
        
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {file.filename}")
        
        # Create document record
        document = Document(
            user_id=current_user.id,
            filename=file.filename,
            original_filename=file.filename,
            file_size=len(content),
            content_type=file.content_type or 'application/octet-stream',
            s3_bucket=s3_client.bucket_name,
            s3_key=s3_key,
            processing_status='uploaded',
            upload_metadata=json.dumps(metadata)
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        uploaded_docs.append(str(document.id))
    
    if len(uploaded_docs) == 1:
        message = f"File uploaded successfully"
    else:
        message = f"{len(uploaded_docs)} files uploaded successfully"
    
    return DocumentUploadResponse(
        success=True,
        message=message,
        document_id=uploaded_docs[0] if len(uploaded_docs) == 1 else None
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a document"""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = db.query(Document).filter(
        Document.id == doc_uuid,
        Document.user_id == current_user.id,
        Document.is_active == True
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete from S3
    if s3_client.is_available():
        s3_client.delete_file(document.s3_key)
    
    # Soft delete from database
    document.is_active = False
    db.commit()
    
    return {"message": "Document deleted successfully"}


@router.get("/{document_id}/download-url")
async def get_download_url(
    document_id: str,
    expiration: int = 3600,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a presigned download URL for a document"""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = db.query(Document).filter(
        Document.id == doc_uuid,
        Document.user_id == current_user.id,
        Document.is_active == True
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not s3_client.is_available():
        raise HTTPException(status_code=503, detail="File storage service unavailable")
    
    download_url = s3_client.generate_presigned_url(document.s3_key, expiration=expiration)
    
    if not download_url:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")
    
    return {
        "download_url": download_url,
        "expires_in": expiration,
        "filename": document.original_filename
    }


@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reprocess a document with Pinecone"""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    document = db.query(Document).filter(
        Document.id == doc_uuid,
        Document.user_id == current_user.id,
        Document.is_active == True
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Reset processing status
    document.processing_status = 'pending'
    document.vectors_created = 0
    document.chunks_created = 0
    document.processing_job_id = None
    
    db.commit()
    
    # TODO: Trigger Pinecone processing job here
    # This would integrate with your existing Pinecone upload workflow
    
    return {"message": "Document queued for reprocessing"}