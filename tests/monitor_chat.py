#!/usr/bin/env python3
"""
Monitor chat sessions being created
"""

import time
from src.db.db_session import SessionLocal
from src.db_models import ChatSession, User

def monitor_sessions():
    db = SessionLocal()
    
    # Get chetan user
    user = db.query(User).filter(User.email == 'chetan@omegaintelligence.ai').first()
    if not user:
        print("User not found!")
        return
    
    print(f"Monitoring sessions for: {user.email}")
    print("Press Ctrl+C to stop\n")
    
    # Get initial count
    initial_count = db.query(ChatSession).filter(ChatSession.user_id == user.id).count()
    anon_count = db.query(ChatSession).filter(ChatSession.user_id == None).count()
    
    print(f"Initial counts - User sessions: {initial_count}, Anonymous: {anon_count}")
    print("Watching for new sessions...\n")
    
    last_user_count = initial_count
    last_anon_count = anon_count
    
    try:
        while True:
            # Check counts
            user_count = db.query(ChatSession).filter(ChatSession.user_id == user.id).count()
            anon_count = db.query(ChatSession).filter(ChatSession.user_id == None).count()
            
            if user_count != last_user_count:
                print(f"✓ NEW USER SESSION! Total: {user_count} (+{user_count - last_user_count})")
                # Show the new session
                new_session = db.query(ChatSession).filter(
                    ChatSession.user_id == user.id
                ).order_by(ChatSession.created_at.desc()).first()
                print(f"  Thread: {new_session.thread_id}")
                print(f"  Created: {new_session.created_at}")
                last_user_count = user_count
            
            if anon_count != last_anon_count:
                print(f"✗ New ANONYMOUS session! Total: {anon_count} (+{anon_count - last_anon_count})")
                # Show the new session
                new_session = db.query(ChatSession).filter(
                    ChatSession.user_id == None
                ).order_by(ChatSession.created_at.desc()).first()
                print(f"  Thread: {new_session.thread_id}")
                print(f"  Created: {new_session.created_at}")
                print("  WARNING: This session has no user association!")
                last_anon_count = anon_count
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nMonitoring stopped")
    finally:
        db.close()

if __name__ == "__main__":
    monitor_sessions()