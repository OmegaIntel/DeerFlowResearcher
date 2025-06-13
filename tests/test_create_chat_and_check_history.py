#!/usr/bin/env python3
"""
Test creating a chat and checking if it appears in history
"""

import requests
import json
import uuid
import time

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_chat_and_history():
    print("=== Testing Chat Creation and History Display ===\n")
    
    # 1. Login
    print("1. Login...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{API_BASE_URL}/token", data=login_data)
    if response.ok:
        token = response.json()["access_token"]
        print(f"   ✓ Login successful")
    else:
        print(f"   ✗ Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get initial session count
    print("\n2. Get initial chat sessions...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    if response.ok:
        initial_sessions = response.json()
        print(f"   ✓ Found {len(initial_sessions)} existing sessions")
    else:
        print(f"   ✗ Failed to get sessions: {response.text}")
        return
    
    # 3. Create a new chat with a unique thread ID
    print("\n3. Create new chat...")
    thread_id = str(uuid.uuid4())
    print(f"   Thread ID: {thread_id}")
    
    chat_data = {
        "messages": [{"role": "user", "content": "Hello! This is a test message to verify chat history."}],
        "temperature": 0.7,
        "max_tokens": 150,
        "thread_id": thread_id
    }
    
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    if response.ok:
        print("   ✓ Chat created successfully")
        # Read streaming response
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: ') and line_str != 'data: [DONE]':
                    try:
                        data = json.loads(line_str[6:])
                        if data.get('type') == 'message_chunk' and 'content' in data:
                            pass  # Just consume the response
                    except:
                        pass
    else:
        print(f"   ✗ Failed to create chat: {response.text}")
        return
    
    # 4. Wait a moment for database to update
    print("\n4. Wait 2 seconds for database update...")
    time.sleep(2)
    
    # 5. Get sessions again and check if new one appears
    print("\n5. Check chat sessions again...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    if response.ok:
        new_sessions = response.json()
        print(f"   ✓ Found {len(new_sessions)} sessions now")
        
        # Find our new session
        our_session = None
        for session in new_sessions:
            if session.get('thread_id') == thread_id:
                our_session = session
                break
        
        if our_session:
            print(f"   ✅ SUCCESS! New chat appears in history!")
            print(f"   - Session ID: {our_session['id']}")
            print(f"   - Thread ID: {our_session['thread_id']}")
            print(f"   - Messages: {our_session['message_count']}")
            print(f"   - Created: {our_session['created_at']}")
        else:
            print(f"   ❌ PROBLEM: New chat NOT found in history!")
            print(f"   Looking for thread_id: {thread_id}")
            print(f"   Available thread_ids: {[s.get('thread_id') for s in new_sessions]}")
    
    # 6. Direct database check
    print("\n6. Direct database check...")
    import subprocess
    cmd = f'docker exec deer-flow-mysql mysql -u deer_user -pdeer_password deer_flow -e "SELECT id, thread_id, user_id FROM chat_sessions WHERE thread_id = \'{thread_id}\';"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print("   Database result:")
    print(result.stdout)
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_chat_and_history()