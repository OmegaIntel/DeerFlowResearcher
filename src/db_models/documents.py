from sqlalchemy import Column, ForeignKey, String, Text, TIMESTAMP, func, Integer, Boolean
from sqlalchemy_utils import UUIDType
from sqlalchemy.orm import relationship
import uuid

from .base import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUIDType(binary=False), ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100), nullable=False)
    s3_bucket = Column(String(255), nullable=False)
    s3_key = Column(String(500), nullable=False)
    pinecone_index = Column(String(255), nullable=True)
    pinecone_namespace = Column(String(255), nullable=True)
    processing_status = Column(String(50), default='pending', nullable=False)  # pending, processing, completed, failed
    processing_job_id = Column(String(255), nullable=True)
    vectors_created = Column(Integer, default=0)
    chunks_created = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    upload_metadata = Column(Text, nullable=True)  # JSON string for additional metadata
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships
    user = relationship("User", back_populates="documents")