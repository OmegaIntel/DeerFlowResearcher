from sqlalchemy import Column, ForeignKey, String, Text, TIMESTAMP, func
from sqlalchemy_utils import UUIDType
import uuid
from sqlalchemy.orm import relationship

from .base import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUIDType(binary=False), ForeignKey("chat_sessions.id"), nullable=False
    )
    role = Column(String(32), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    session = relationship("ChatSession", back_populates="messages")
