from sqlalchemy import Column, String, TIMESTAMP, func, ForeignKey, Text, Boolean
from sqlalchemy_utils import UUIDType
from sqlalchemy.orm import relationship
import uuid

from .base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUIDType(binary=False), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)  # hex color like #FF5733
    icon = Column(String(50), nullable=True)  # icon identifier
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    archived = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = relationship("User", back_populates="projects")
    chat_sessions = relationship("ChatSession", back_populates="project")
    documents = relationship("Document", back_populates="project")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUIDType(binary=False), ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUIDType(binary=False), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default='member', nullable=False)  # owner, editor, viewer, member
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Relationships
    project = relationship("Project")
    user = relationship("User")