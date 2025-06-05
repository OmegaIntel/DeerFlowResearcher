from sqlalchemy import Column, ForeignKey, String, Text, TIMESTAMP, func
from sqlalchemy_utils import UUIDType
from sqlalchemy.orm import relationship
import uuid

from .base import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUIDType(binary=False), ForeignKey("chat_sessions.id"))
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    session = relationship("ChatSession", back_populates="messages")
