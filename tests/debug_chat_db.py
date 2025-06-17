#!/usr/bin/env python3
"""
Debug chat database - check what's actually saved
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Database connection
DATABASE_URL = "mysql+pymysql://deer_user:deer_password@localhost:3306/deer_flow"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def debug_chat_db():
    db = SessionLocal()
    
    try:
        # Get recent sessions
        print("=== Recent Chat Sessions ===")
        result = db.execute(text("""
            SELECT id, thread_id, title, mode, created_at, last_message_at
            FROM chat_sessions
            ORDER BY created_at DESC
            LIMIT 5
        """))
        
        sessions = []
        for row in result:
            sessions.append({
                'id': str(row[0]),
                'thread_id': row[1],
                'title': row[2],
                'mode': row[3],
                'created_at': row[4],
                'last_message_at': row[5]
            })
            print(f"\nSession: {row[0]}")
            print(f"  Thread ID: {row[1]}")
            print(f"  Title: {row[2]}")
            print(f"  Created: {row[4]}")
        
        # For each session, get messages
        print("\n=== Messages per Session ===")
        for session in sessions[:3]:  # First 3 sessions
            print(f"\nSession {session['id']} (thread: {session['thread_id']}):")
            
            result = db.execute(text("""
                SELECT id, role, content, created_at
                FROM chat_messages
                WHERE session_id = :session_id
                ORDER BY created_at
                LIMIT 10
            """), {'session_id': session['id']})
            
            msg_count = 0
            for msg_row in result:
                msg_count += 1
                print(f"  [{msg_row[1]}] {msg_row[2][:100]}...")
            
            if msg_count == 0:
                print("  No messages found!")
        
        # Check for messages without proper content
        print("\n=== Check for Empty Messages ===")
        result = db.execute(text("""
            SELECT COUNT(*) as empty_count
            FROM chat_messages
            WHERE content = '' OR content IS NULL
        """))
        
        empty_count = result.fetchone()[0]
        print(f"Empty messages: {empty_count}")
        
    finally:
        db.close()

if __name__ == "__main__":
    debug_chat_db()