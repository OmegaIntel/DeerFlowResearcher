#!/usr/bin/env python3
"""Test attachment persistence in chat messages"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000/api"
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."

def login():
    """Login and get auth token"""
    response = requests.post(
        f"{BASE_URL}/token",
        data={"username": EMAIL, "password": PASSWORD}
    )
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"✓ Login successful, token: {token[:20]}...")
        return token
    else:
        print(f"✗ Login failed: {response.status_code} - {response.text}")
        return None

def test_chat_with_attachments(token, thread_id="test_attachment_123"):
    """Test sending a chat message with attachments"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Simulate attachments (as if they were uploaded)
    attachments = [
        {
            "filename": "test_document.pdf",
            "size": 1024000,
            "type": "application/pdf",
            "documentId": "doc_123"
        }
    ]
    
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "Here's my test document with attachments",
                "attachments": attachments
            }
        ],
        "thread_id": thread_id
    }
    
    print(f"\n📤 Sending chat message with attachments:")
    print(json.dumps(attachments, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/chat/simple",
        headers=headers,
        json=payload,
        stream=True
    )
    
    if response.status_code == 200:
        print("✓ Chat message sent successfully")
        # Read streaming response
        for line in response.iter_lines():
            if line:
                print(f"  Response: {line.decode()[:100]}...")
                break
    else:
        print(f"✗ Failed to send chat: {response.status_code} - {response.text}")
    
    return thread_id

def get_chat_session(token, thread_id):
    """Get chat session to verify attachments are persisted"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # First get all sessions
    response = requests.get(f"{BASE_URL}/chat/sessions", headers=headers)
    if response.status_code != 200:
        print(f"✗ Failed to get sessions: {response.status_code}")
        return
    
    sessions = response.json()
    print(f"\n📋 Found {len(sessions)} sessions")
    
    # Find our test session
    for session in sessions:
        if session["thread_id"] == thread_id:
            session_id = session["id"]
            print(f"✓ Found test session: {session_id}")
            
            # Get session details with messages
            response = requests.get(
                f"{BASE_URL}/chat/sessions/{session_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                session_detail = response.json()
                print(f"\n📨 Session has {len(session_detail['messages'])} messages")
                
                for msg in session_detail["messages"]:
                    print(f"\n  Message {msg['id']}:")
                    print(f"    Role: {msg['role']}")
                    print(f"    Content: {msg['content'][:50]}...")
                    
                    if msg.get("attachments"):
                        print(f"    ✓ Attachments found: {len(msg['attachments'])}")
                        for att in msg["attachments"]:
                            print(f"      - {att['filename']} ({att['size']} bytes)")
                    else:
                        print(f"    ✗ No attachments in message")
                        
            break

def main():
    print("🧪 Testing Attachment Persistence in Chat Messages")
    print("=" * 50)
    
    # Login
    token = login()
    if not token:
        return
    
    # Send chat with attachments
    thread_id = test_chat_with_attachments(token)
    
    # Wait a moment for processing
    import time
    time.sleep(2)
    
    # Verify attachments are persisted
    get_chat_session(token, thread_id)

if __name__ == "__main__":
    main()