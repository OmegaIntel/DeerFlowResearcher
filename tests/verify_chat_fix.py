#!/usr/bin/env python3
"""Verify chat continue fix"""

import requests
from datetime import datetime

# Test credentials
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."
BASE_URL = "http://localhost:8000"

def login():
    """Login and get token"""
    response = requests.post(
        f"{BASE_URL}/api/token",
        data={"username": EMAIL, "password": PASSWORD}
    )
    
    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        exit(1)
    
    token = response.json()["access_token"]
    return token

def verify_simple_chat():
    """Verify simple chat sessions"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Verifying Simple Chat Sessions")
    print("="*60)
    
    # Get a simple chat session
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions?limit=5&mode=chat",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Failed to get sessions: {response.status_code}")
        return
    
    sessions = response.json()
    
    # Find a chat session with multiple messages
    test_session = None
    for session in sessions:
        if session['mode'] == 'chat' and session['message_count'] >= 2:
            test_session = session
            break
    
    if not test_session:
        print("No suitable chat session found")
        return
    
    print(f"\nTest Session Found:")
    print(f"  Thread ID: {test_session['thread_id']}")
    print(f"  Messages: {test_session['message_count']}")
    print(f"  Title: {test_session.get('title', 'No title')[:60]}...")
    
    # Get full details
    detail_response = requests.get(
        f"{BASE_URL}/api/chat/sessions/by-thread/{test_session['thread_id']}",
        headers=headers
    )
    
    if detail_response.status_code == 200:
        detail = detail_response.json()
        print(f"\nMessage Details:")
        for i, msg in enumerate(detail['messages']):
            print(f"  Message {i+1}: {msg['role']} - {msg['content'][:60]}...")
        
        print(f"\n✅ BACKEND: All {len(detail['messages'])} messages retrieved")
        print(f"\n📋 TO TEST FRONTEND:")
        print(f"1. Go to: http://localhost:3000/chat-history")
        print(f"2. Find session: '{test_session.get('title', 'Chat session')[:40]}...'")
        print(f"3. Click 'Continue Chat'")
        print(f"4. Verify you see {len(detail['messages'])} messages:")
        for i, msg in enumerate(detail['messages']):
            if msg['role'] == 'user':
                print(f"   - User message (blue bubble on right)")
            else:
                print(f"   - Assistant message (gray bubble on left)")
        
        print(f"\n🔗 Direct URL: http://localhost:3000/chat?thread={test_session['thread_id']}")
    else:
        print(f"Failed to get session details: {detail_response.status_code}")

if __name__ == "__main__":
    print(f"[{datetime.now()}] Chat Continue Fix Verification")
    print()
    verify_simple_chat()