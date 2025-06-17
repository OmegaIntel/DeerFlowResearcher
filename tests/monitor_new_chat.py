#!/usr/bin/env python3
"""
Monitor new chat creation in real-time
"""

import time
from datetime import datetime, timedelta
from src.db.db_session import SessionLocal
from src.db_models import ChatSession, ChatMessage, User

def monitor():
    db = SessionLocal()
    
    # Get user
    user = db.query(User).filter(User.email == 'chetan@omegaintelligence.ai').first()
    if not user:
        print("User not found!")
        return
    
    print(f"Monitoring new sessions for {user.email}")
    print("Watching for new sessions...\n")
    
    # Get current session count
    initial_count = db.query(ChatSession).filter(ChatSession.user_id == user.id).count()
    last_check = datetime.now()
    
    try:
        while True:
            # Check for new sessions
            new_sessions = db.query(ChatSession).filter(
                ChatSession.user_id == user.id,
                ChatSession.created_at > last_check
            ).all()
            
            if new_sessions:
                for session in new_sessions:
                    print(f"\n{'='*60}")
                    print(f"NEW SESSION DETECTED at {datetime.now()}")
                    print(f"Session ID: {session.id}")
                    print(f"Thread ID: {session.thread_id}")
                    print(f"Title: {repr(session.title)}")
                    print(f"Created: {session.created_at}")
                    
                    # Check messages
                    messages = db.query(ChatMessage).filter(
                        ChatMessage.session_id == session.id
                    ).order_by(ChatMessage.created_at).all()
                    
                    print(f"\nMessages ({len(messages)}):")
                    for i, msg in enumerate(messages):
                        print(f"  {i+1}. {msg.role}: {msg.content[:60]}...")
                    
                    # Check title after a delay
                    time.sleep(2)
                    db.refresh(session)
                    print(f"\nTitle after refresh: {repr(session.title)}")
                    print(f"{'='*60}\n")
                
                last_check = datetime.now()
            
            # Also check for title updates on recent sessions
            recent_sessions = db.query(ChatSession).filter(
                ChatSession.user_id == user.id,
                ChatSession.created_at > datetime.now() - timedelta(minutes=5)
            ).all()
            
            for session in recent_sessions:
                if session.title:
                    messages = db.query(ChatMessage).filter(
                        ChatMessage.session_id == session.id
                    ).count()
                    if messages > 0:
                        print(f"Session {session.thread_id[:20]}... has title: {session.title[:40]}... ({messages} msgs)")
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nMonitoring stopped")
    finally:
        db.close()

if __name__ == "__main__":
    monitor()