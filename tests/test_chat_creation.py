#!/usr/bin/env python3
"""
Test chat creation and verify it appears in history
"""

import requests
import json
import uuid
import time

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_chat_creation():
    print("=== Testing Chat Creation ===\n")
    
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
        print(f"   Token: {token[:20]}...")
    else:
        print(f"   ✗ Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Check sessions before
    print("\n2. Checking sessions before chat...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    if response.ok:
        sessions_before = response.json()
        print(f"   Sessions before: {len(sessions_before)}")
    else:
        print(f"   Failed to get sessions: {response.status_code}")
        return
    
    # 3. Create a new chat
    print("\n3. Creating new chat...")
    thread_id = str(uuid.uuid4())
    print(f"   Thread ID: {thread_id}")
    
    chat_data = {
        "messages": [{"role": "user", "content": "Test message from Python script"}],
        "temperature": 0.7,
        "max_tokens": 150,
        "thread_id": thread_id
    }
    
    # Send with streaming
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    print(f"   Response status: {response.status_code}")
    print(f"   Response headers: {dict(response.headers)}")
    
    if response.ok:
        print("   ✓ Chat request sent successfully")
        # Consume the streaming response
        event_count = 0
        for line in response.iter_lines():
            if line:
                event_count += 1
                if event_count <= 3:
                    print(f"   Event {event_count}: {line.decode()[:100]}...")
        print(f"   Total events received: {event_count}")
    else:
        print(f"   ✗ Failed to create chat: {response.status_code}")
        print(f"   Error: {response.text}")
        return
    
    # 4. Wait and check sessions after
    print("\n4. Waiting 2 seconds...")
    time.sleep(2)
    
    print("\n5. Checking sessions after chat...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    if response.ok:
        sessions_after = response.json()
        print(f"   Sessions after: {len(sessions_after)}")
        
        # Check if our thread_id appears
        thread_found = False
        for session in sessions_after:
            if session['thread_id'] == thread_id:
                thread_found = True
                print(f"   ✓ Found our session! ID: {session['id']}")
                print(f"     Messages: {session['message_count']}")
                break
        
        if not thread_found:
            print(f"   ✗ Our thread_id {thread_id} NOT found in sessions!")
            
        # Show difference
        new_sessions = len(sessions_after) - len(sessions_before)
        print(f"\n   New sessions created: {new_sessions}")
    else:
        print(f"   Failed to get sessions: {response.status_code}")

if __name__ == "__main__":
    test_chat_creation()