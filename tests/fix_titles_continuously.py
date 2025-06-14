#!/usr/bin/env python3
"""
Continuously fix session titles
"""

import time
from src.db.db_session import SessionLocal
from src.db_models import ChatSession, ChatMessage

def fix_titles_loop():
    while True:
        db = SessionLocal()
        try:
            # Find sessions without titles that have messages
            sessions_to_fix = db.query(ChatSession).filter(
                (ChatSession.title == None) | (ChatSession.title == '')
            ).all()
            
            fixed = 0
            for session in sessions_to_fix:
                # Get first user message
                first_msg = db.query(ChatMessage).filter(
                    ChatMessage.session_id == session.id,
                    ChatMessage.role == 'user'
                ).order_by(ChatMessage.created_at).first()
                
                if first_msg and first_msg.content:
                    session.title = first_msg.content[:100]
                    fixed += 1
            
            if fixed > 0:
                db.commit()
                print(f"Fixed {fixed} session titles")
                
        except Exception as e:
            print(f"Error: {e}")
            db.rollback()
        finally:
            db.close()
        
        time.sleep(5)  # Check every 5 seconds

if __name__ == "__main__":
    print("Starting title fixer service...")
    fix_titles_loop()