#!/usr/bin/env python3
"""
Quickly create test chat sessions for chetan@omegaintelligence.ai
"""

import uuid
from datetime import datetime
from src.db.db_session import SessionLocal
from src.db_models import ChatSession, ChatMessage, User

def create_sessions():
    db = SessionLocal()
    
    try:
        # Find chetan user
        user = db.query(User).filter(User.email == 'chetan@omegaintelligence.ai').first()
        if not user:
            print("User not found!")
            return
            
        print(f"Creating sessions for {user.email} (id: {user.id})")
        
        # Create 5 test sessions
        messages = [
            "Hello! Can you help me understand how Docker works?",
            "What are the best practices for React development?",
            "I need help with setting up a CI/CD pipeline",
            "Can you explain machine learning concepts?",
            "How do I optimize database queries?"
        ]
        
        for i, message_text in enumerate(messages):
            # Create session
            thread_id = str(uuid.uuid4())
            session = ChatSession(
                user_id=user.id,
                thread_id=thread_id,
                mode='chat',
                title=message_text[:50]
            )
            db.add(session)
            db.flush()  # Get the session ID
            
            # Add user message
            user_msg = ChatMessage(
                session_id=session.id,
                role='user',
                content=message_text
            )
            db.add(user_msg)
            
            # Add assistant response
            assistant_msg = ChatMessage(
                session_id=session.id,
                role='assistant',
                content=f"I'd be happy to help you with that! Here's some information about {message_text[:30]}..."
            )
            db.add(assistant_msg)
            
            print(f"Created session {i+1}: {thread_id}")
        
        db.commit()
        print("\nSuccessfully created 5 sessions!")
        
        # Verify
        session_count = db.query(ChatSession).filter(ChatSession.user_id == user.id).count()
        print(f"Total sessions for user: {session_count}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sessions()