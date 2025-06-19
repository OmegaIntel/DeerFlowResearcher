from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from src.db.db_session import get_db
from src.db_models import ChatSession, ChatMessage, User, Project
from src.server.auth import get_current_user

router = APIRouter()


class ProjectInfo(BaseModel):
    id: str
    name: str
    color: Optional[str]
    icon: Optional[str]


class ChatSessionResponse(BaseModel):
    id: str
    thread_id: str
    title: Optional[str]
    mode: str
    message_count: int
    last_message_at: datetime
    created_at: datetime
    project: Optional[ProjectInfo] = None

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    attachments: Optional[List[dict]] = None
    citations: Optional[List[dict]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionDetailResponse(BaseModel):
    id: str
    thread_id: str
    title: Optional[str]
    mode: str
    created_at: datetime
    messages: List[ChatMessageResponse]

    class Config:
        from_attributes = True


class CreateChatSessionRequest(BaseModel):
    title: Optional[str] = None
    mode: str = "chat"
    project_id: Optional[str] = None


class UpdateChatSessionRequest(BaseModel):
    title: Optional[str] = None


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    skip: int = 0,
    limit: int = 50,
    mode: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's chat sessions"""
    query = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)
    
    if mode:
        query = query.filter(ChatSession.mode == mode)
    
    sessions = query.order_by(desc(ChatSession.last_message_at)).offset(skip).limit(limit).all()
    
    # Add message count and project info to each session
    sessions_with_count = []
    for session in sessions:
        message_count = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).count()
        
        # Get project info if session has a project
        project_info = None
        if session.project_id:
            project = db.query(Project).filter(Project.id == session.project_id).first()
            if project:
                project_info = ProjectInfo(
                    id=str(project.id),
                    name=project.name,
                    color=project.color,
                    icon=project.icon
                )
        
        session_data = ChatSessionResponse(
            id=str(session.id),
            thread_id=session.thread_id,
            title=session.title,
            mode=session.mode,
            message_count=message_count,
            last_message_at=session.last_message_at,
            created_at=session.created_at,
            project=project_info
        )
        sessions_with_count.append(session_data)
    
    return sessions_with_count


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
async def get_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific chat session with messages"""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    session = db.query(ChatSession).filter(
        ChatSession.id == session_uuid,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at).all()
    
    message_responses = [
        ChatMessageResponse(
            id=str(msg.id),
            role=msg.role,
            content=msg.content,
            attachments=msg.attachments,
            citations=getattr(msg, 'citations', None),  # Include citations
            created_at=msg.created_at
        )
        for msg in messages
    ]
    
    return ChatSessionDetailResponse(
        id=str(session.id),
        thread_id=session.thread_id,
        title=session.title,
        mode=session.mode,
        created_at=session.created_at,
        messages=message_responses
    )


@router.get("/sessions/by-thread/{thread_id}", response_model=ChatSessionDetailResponse)
async def get_chat_session_by_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a chat session by thread ID with messages"""
    session = db.query(ChatSession).filter(
        ChatSession.thread_id == thread_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at).all()
    
    message_responses = [
        ChatMessageResponse(
            id=str(msg.id),
            role=msg.role,
            content=msg.content,
            attachments=msg.attachments,
            citations=getattr(msg, 'citations', None),  # Include citations
            created_at=msg.created_at
        )
        for msg in messages
    ]
    
    return ChatSessionDetailResponse(
        id=str(session.id),
        thread_id=session.thread_id,
        title=session.title,
        mode=session.mode,
        created_at=session.created_at,
        messages=message_responses
    )


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    request: CreateChatSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chat session"""
    thread_id = str(uuid.uuid4())
    
    session = ChatSession(
        user_id=current_user.id,
        thread_id=thread_id,
        title=request.title,
        mode=request.mode,
        project_id=request.project_id
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return ChatSessionResponse(
        id=str(session.id),
        thread_id=session.thread_id,
        title=session.title,
        mode=session.mode,
        message_count=0,
        last_message_at=session.created_at,
        created_at=session.created_at
    )


@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_chat_session(
    session_id: str,
    request: UpdateChatSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a chat session"""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    session = db.query(ChatSession).filter(
        ChatSession.id == session_uuid,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if request.title is not None:
        session.title = request.title
    
    db.commit()
    db.refresh(session)
    
    message_count = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).count()
    
    return ChatSessionResponse(
        id=str(session.id),
        thread_id=session.thread_id,
        title=session.title,
        mode=session.mode,
        message_count=message_count,
        last_message_at=session.last_message_at,
        created_at=session.created_at
    )


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat session"""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    session = db.query(ChatSession).filter(
        ChatSession.id == session_uuid,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    db.delete(session)
    db.commit()
    
    return {"message": "Chat session deleted successfully"}