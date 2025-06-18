from sqlalchemy import Column, String, TIMESTAMP, func, Text, Boolean, JSON, ForeignKey
from src.db_models.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy_utils import UUIDType
import uuid


class Integration(Base):
    """Model for storing user integrations with external services"""
    __tablename__ = "integrations"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUIDType(binary=False), ForeignKey("users.id"), nullable=False)
    
    # Integration provider (e.g., 'apideck' but we won't show this name to users)
    provider = Column(String(50), nullable=False)
    
    # Service type (e.g., 'box', 'dropbox', 'google_drive', etc.)
    service_type = Column(String(50), nullable=False)
    
    # Display name for the service
    service_name = Column(String(100), nullable=False)
    
    # Whether the integration is enabled
    enabled = Column(Boolean, default=True, nullable=False)
    
    # Connection status
    is_connected = Column(Boolean, default=False, nullable=False)
    
    # Service-specific configuration (encrypted)
    config = Column(JSON, nullable=True)
    
    # Connection metadata (e.g., account email, workspace name)
    connection_metadata = Column(JSON, nullable=True)
    
    # APIdeck specific fields (stored but not exposed to user)
    connection_id = Column(String(255), nullable=True)  # APIdeck connection ID
    
    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    last_synced_at = Column(TIMESTAMP, nullable=True)
    
    # Relationships
    user = relationship("User", backref="integrations")


class IntegrationLog(Base):
    """Model for logging integration activities"""
    __tablename__ = "integration_logs"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    integration_id = Column(UUIDType(binary=False), ForeignKey("integrations.id"), nullable=False)
    
    # Log type (e.g., 'connection', 'sync', 'error')
    log_type = Column(String(50), nullable=False)
    
    # Log message
    message = Column(Text, nullable=False)
    
    # Additional data
    log_metadata = Column(JSON, nullable=True)
    
    # Timestamp
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Relationships
    integration = relationship("Integration", backref="logs")