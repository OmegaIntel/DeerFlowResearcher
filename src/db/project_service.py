from sqlalchemy.orm import Session
from typing import List, Optional
from src.db_models import Project, ChatSession, Document
import uuid


def get_user_projects(db: Session, user_id: str, include_archived: bool = False) -> List[Project]:
    """Get all projects for a user"""
    query = db.query(Project).filter(Project.user_id == user_id)
    if not include_archived:
        query = query.filter(Project.archived == False)
    return query.order_by(Project.updated_at.desc()).all()


def create_project(db: Session, user_id: str, name: str, description: str = None, 
                  color: str = None, icon: str = None) -> Project:
    """Create a new project"""
    project = Project(
        user_id=user_id,
        name=name,
        description=description,
        color=color,
        icon=icon
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_project_by_id(db: Session, project_id: str, user_id: str) -> Optional[Project]:
    """Get a project by ID for a specific user"""
    return db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user_id,
        Project.archived == False
    ).first()


def update_project(db: Session, project_id: str, user_id: str, 
                  name: str = None, description: str = None, 
                  color: str = None, icon: str = None) -> Optional[Project]:
    """Update a project"""
    project = get_project_by_id(db, project_id, user_id)
    if not project:
        return None
    
    if name is not None:
        project.name = name
    if description is not None:
        project.description = description
    if color is not None:
        project.color = color
    if icon is not None:
        project.icon = icon
    
    db.commit()
    db.refresh(project)
    return project


def archive_project(db: Session, project_id: str, user_id: str) -> bool:
    """Archive a project"""
    project = get_project_by_id(db, project_id, user_id)
    if not project:
        return False
    
    project.archived = True
    db.commit()
    return True


def delete_project(db: Session, project_id: str, user_id: str) -> bool:
    """Delete a project and move its content to no project"""
    project = get_project_by_id(db, project_id, user_id)
    if not project:
        return False
    
    # Move chat sessions to no project
    db.query(ChatSession).filter(ChatSession.project_id == project_id).update(
        {ChatSession.project_id: None}
    )
    
    # Move documents to no project
    db.query(Document).filter(Document.project_id == project_id).update(
        {Document.project_id: None}
    )
    
    # Delete the project
    db.delete(project)
    db.commit()
    return True


def get_project_sessions(db: Session, project_id: str, user_id: str) -> List[ChatSession]:
    """Get all chat sessions for a project"""
    return db.query(ChatSession).filter(
        ChatSession.project_id == project_id,
        ChatSession.user_id == user_id
    ).order_by(ChatSession.last_message_at.desc()).all()


def get_project_documents(db: Session, project_id: str, user_id: str) -> List[Document]:
    """Get all documents for a project"""
    return db.query(Document).filter(
        Document.project_id == project_id,
        Document.user_id == user_id
    ).order_by(Document.created_at.desc()).all()


def move_session_to_project(db: Session, session_id: str, project_id: str, user_id: str) -> bool:
    """Move a chat session to a project"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user_id
    ).first()
    
    if not session:
        return False
    
    # Verify project exists and belongs to user (if project_id is not None)
    if project_id:
        project = get_project_by_id(db, project_id, user_id)
        if not project:
            return False
    
    session.project_id = project_id
    db.commit()
    return True


def move_document_to_project(db: Session, document_id: str, project_id: str, user_id: str) -> bool:
    """Move a document to a project"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user_id
    ).first()
    
    if not document:
        return False
    
    # Verify project exists and belongs to user (if project_id is not None)
    if project_id:
        project = get_project_by_id(db, project_id, user_id)
        if not project:
            return False
    
    document.project_id = project_id
    db.commit()
    return True


def get_or_create_default_project(db: Session, user_id: str) -> Project:
    """Get or create a default 'General' project for a user"""
    default_project = db.query(Project).filter(
        Project.user_id == user_id,
        Project.name == "General",
        Project.archived == False
    ).first()
    
    if not default_project:
        default_project = create_project(
            db=db,
            user_id=user_id,
            name="General",
            description="Default project for organizing your chats and documents",
            color="#6366F1",  # Indigo
            icon="folder"
        )
    
    return default_project