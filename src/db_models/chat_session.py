from sqlalchemy import Column, String, TIMESTAMP, func, ForeignKey, Text
from sqlalchemy_utils import UUIDType
from sqlalchemy.orm import relationship
import uuid

from .base import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUIDType(binary=False), ForeignKey("users.id"), nullable=False)
    thread_id = Column(String(255), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=True)  # Auto-generated or user-set title
    mode = Column(String(50), default='chat', nullable=False)  # chat, research, documents
    last_message_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
