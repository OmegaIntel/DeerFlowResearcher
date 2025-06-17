from sqlalchemy import Column, String, TIMESTAMP, func, Text, Boolean
from src.db_models.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy_utils import UUIDType
import uuid



# Define the User model
class User(Base):
    __tablename__ = "users"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Made nullable for OAuth users
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    is_master_admin = Column(Boolean, default=False, nullable=False)
    
    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # google, microsoft, linkedin
    oauth_provider_id = Column(String(255), nullable=True)  # Unique ID from provider
    oauth_access_token = Column(Text, nullable=True)  # For API access if needed
    oauth_refresh_token = Column(Text, nullable=True)  # For token refresh if needed
    profile_picture = Column(Text, nullable=True)  # Profile picture URL
    full_name = Column(String(255), nullable=True)  # Full name from OAuth provider

    # Relationships
    chat_sessions = relationship("ChatSession", back_populates="user")
    documents = relationship("Document", back_populates="user")
    projects = relationship("Project", back_populates="user")