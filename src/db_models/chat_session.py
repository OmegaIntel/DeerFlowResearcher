from sqlalchemy import Column, String, TIMESTAMP, func
from sqlalchemy_utils import UUIDType
import uuid
from sqlalchemy.orm import relationship

from .base import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    thread_id = Column(String(255), unique=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    messages = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan"
    )
