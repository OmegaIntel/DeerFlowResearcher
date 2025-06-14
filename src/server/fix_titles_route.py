from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.db.db_session import get_db
from src.db_models import ChatSession, ChatMessage, User
from src.server.auth import get_current_user

router = APIRouter()

@router.post("/fix-titles")
async def fix_session_titles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fix all session titles for the current user"""
    
    # Get all sessions for current user
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).all()
    
    fixed_count = 0
    results = []
    
    for session in sessions:
        # Get first user message
        first_message = db.query(ChatMessage).filter(
            ChatMessage.session_id == session.id,
            ChatMessage.role == 'user'
        ).order_by(ChatMessage.created_at).first()
        
        old_title = session.title
        
        if first_message and first_message.content:
            new_title = first_message.content[:100]
            if session.title != new_title:
                session.title = new_title
                fixed_count += 1
                results.append({
                    "session_id": str(session.id),
                    "thread_id": session.thread_id,
                    "old_title": old_title,
                    "new_title": new_title
                })
    
    db.commit()
    
    return {
        "fixed": fixed_count,
        "total_sessions": len(sessions),
        "changes": results[:10]  # Show first 10 changes
    }

@router.get("/session-debug/{thread_id}")
async def debug_session(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Debug a specific session"""
    
    session = db.query(ChatSession).filter(
        ChatSession.thread_id == thread_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        return {"error": "Session not found"}
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at).all()
    
    return {
        "session": {
            "id": str(session.id),
            "thread_id": session.thread_id,
            "title": session.title,
            "created_at": session.created_at,
            "user_id": str(session.user_id)
        },
        "messages": [
            {
                "role": msg.role,
                "content": msg.content[:100] + "..." if len(msg.content) > 100 else msg.content,
                "created_at": msg.created_at
            }
            for msg in messages
        ]
    }