#!/usr/bin/env python3
"""
Fix existing session titles by setting them to first user message
"""

from src.db.db_session import SessionLocal
from src.db_models import ChatSession, ChatMessage

def fix_titles():
    db = SessionLocal()
    
    try:
        # Get all sessions without titles
        sessions_without_title = db.query(ChatSession).filter(
            (ChatSession.title == None) | (ChatSession.title == '')
        ).all()
        
        print(f"Found {len(sessions_without_title)} sessions without titles")
        
        fixed_count = 0
        for session in sessions_without_title:
            # Get first user message
            first_message = db.query(ChatMessage).filter(
                ChatMessage.session_id == session.id,
                ChatMessage.role == 'user'
            ).order_by(ChatMessage.created_at).first()
            
            if first_message and first_message.content:
                session.title = first_message.content[:100]
                fixed_count += 1
                print(f"Set title for session {session.id}: {session.title[:50]}...")
        
        db.commit()
        print(f"\nFixed {fixed_count} session titles")
        
        # Also show sessions for chetan
        from src.db_models import User
        user = db.query(User).filter(User.email == 'chetan@omegaintelligence.ai').first()
        if user:
            user_sessions = db.query(ChatSession).filter(
                ChatSession.user_id == user.id
            ).order_by(ChatSession.created_at.desc()).limit(5).all()
            
            print(f"\nRecent sessions for {user.email}:")
            for s in user_sessions:
                print(f"  - {s.title[:50] if s.title else 'No title'}... ({s.created_at})")
    
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_titles()