from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from src.db.db_session import get_db
from src.db.project_service import (
    get_user_projects, create_project, get_project_by_id,
    update_project, archive_project, delete_project,
    get_project_sessions, get_project_documents,
    move_session_to_project, move_document_to_project,
    get_or_create_default_project
)
from src.api.api_get_current_user import get_current_user

router = APIRouter()


# Pydantic models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: Optional[str]
    icon: Optional[str]
    created_at: str
    updated_at: str
    archived: bool
    session_count: int = 0
    document_count: int = 0

    class Config:
        from_attributes = True


class MoveToProjectRequest(BaseModel):
    project_id: Optional[str] = None  # None means move to "no project"


@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all projects for the current user"""
    projects = get_user_projects(db, str(current_user.id), include_archived)
    
    # Add counts for each project
    project_responses = []
    for project in projects:
        session_count = len(get_project_sessions(db, str(project.id), str(current_user.id)))
        document_count = len(get_project_documents(db, str(project.id), str(current_user.id)))
        
        project_response = ProjectResponse(
            id=str(project.id),
            name=project.name,
            description=project.description,
            color=project.color,
            icon=project.icon,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat(),
            archived=project.archived,
            session_count=session_count,
            document_count=document_count
        )
        project_responses.append(project_response)
    
    return project_responses


@router.post("/projects", response_model=ProjectResponse)
async def create_new_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new project"""
    project = create_project(
        db=db,
        user_id=str(current_user.id),
        name=project_data.name,
        description=project_data.description,
        color=project_data.color,
        icon=project_data.icon
    )
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        color=project.color,
        icon=project.icon,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
        archived=project.archived,
        session_count=0,
        document_count=0
    )


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific project"""
    project = get_project_by_id(db, project_id, str(current_user.id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    session_count = len(get_project_sessions(db, project_id, str(current_user.id)))
    document_count = len(get_project_documents(db, project_id, str(current_user.id)))
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        color=project.color,
        icon=project.icon,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
        archived=project.archived,
        session_count=session_count,
        document_count=document_count
    )


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_existing_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a project"""
    project = update_project(
        db=db,
        project_id=project_id,
        user_id=str(current_user.id),
        name=project_data.name,
        description=project_data.description,
        color=project_data.color,
        icon=project_data.icon
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    session_count = len(get_project_sessions(db, project_id, str(current_user.id)))
    document_count = len(get_project_documents(db, project_id, str(current_user.id)))
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        color=project.color,
        icon=project.icon,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
        archived=project.archived,
        session_count=session_count,
        document_count=document_count
    )


@router.delete("/projects/{project_id}")
async def delete_existing_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a project and move its content to no project"""
    success = delete_project(db, project_id, str(current_user.id))
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}


@router.post("/projects/{project_id}/archive")
async def archive_existing_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Archive a project"""
    success = archive_project(db, project_id, str(current_user.id))
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project archived successfully"}


@router.put("/chat/sessions/{session_id}/project")
async def move_session_to_project_endpoint(
    session_id: str,
    move_data: MoveToProjectRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Move a chat session to a project"""
    success = move_session_to_project(
        db=db,
        session_id=session_id,
        project_id=move_data.project_id,
        user_id=str(current_user.id)
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Session not found or invalid project")
    
    return {"message": "Session moved successfully"}


@router.put("/documents/{document_id}/project")
async def move_document_to_project_endpoint(
    document_id: str,
    move_data: MoveToProjectRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Move a document to a project"""
    success = move_document_to_project(
        db=db,
        document_id=document_id,
        project_id=move_data.project_id,
        user_id=str(current_user.id)
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or invalid project")
    
    return {"message": "Document moved successfully"}


@router.get("/projects/default")
async def get_default_project(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get or create the default project for the user"""
    project = get_or_create_default_project(db, str(current_user.id))
    
    session_count = len(get_project_sessions(db, str(project.id), str(current_user.id)))
    document_count = len(get_project_documents(db, str(project.id), str(current_user.id)))
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        color=project.color,
        icon=project.icon,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
        archived=project.archived,
        session_count=session_count,
        document_count=document_count
    )