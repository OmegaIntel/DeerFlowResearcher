#!/usr/bin/env python3
"""
Test that chat sessions get titled with first message
"""

import requests
import json
import uuid

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_chat_title():
    print("=== Testing Chat Title ===\n")
    
    # 1. Login
    print("1. Login with chetan@omegaintelligence.ai...")
    login_data = {
        "username": "chetan@omegaintelligence.ai",
        "password": "Test123."
    }
    
    response = requests.post(f"{API_BASE_URL}/token", data=login_data)
    if response.ok:
        token = response.json()["access_token"]
        print(f"   ✓ Login successful")
    else:
        print(f"   ✗ Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create a new chat with specific message
    print("\n2. Creating new chat...")
    thread_id = str(uuid.uuid4())
    test_message = "How do I implement authentication in React?"
    
    chat_data = {
        "messages": [{"role": "user", "content": test_message}],
        "temperature": 0.7,
        "max_tokens": 150,
        "thread_id": thread_id
    }
    
    print(f"   Thread ID: {thread_id}")
    print(f"   Message: {test_message}")
    
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    if response.ok:
        print("   ✓ Chat created successfully")
        # Consume streaming response
        for line in response.iter_lines():
            if line:
                pass
    else:
        print(f"   ✗ Failed: {response.status_code}")
        return
    
    # 3. Check the session details
    print("\n3. Checking session details...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    
    if response.ok:
        sessions = response.json()
        # Find our session
        our_session = None
        for session in sessions:
            if session['thread_id'] == thread_id:
                our_session = session
                break
        
        if our_session:
            print(f"   ✓ Found session!")
            print(f"   Title: '{our_session.get('title', 'No title')}'")
            print(f"   Expected: '{test_message}'")
            if our_session.get('title') == test_message:
                print("   ✓ Title matches first message!")
            else:
                print("   ✗ Title does not match first message")
        else:
            print("   ✗ Session not found")
    else:
        print(f"   ✗ Failed to get sessions: {response.status_code}")

if __name__ == "__main__":
    test_chat_title()