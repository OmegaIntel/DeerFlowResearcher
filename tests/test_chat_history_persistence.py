#!/usr/bin/env python3
"""
Test chat history persistence and continuity
"""

import requests
import json
import uuid
import time

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_chat_persistence():
    print("=== Testing Chat History Persistence ===\n")
    
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
    
    # 2. Get initial chat sessions
    print("\n2. Get initial chat sessions...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    if response.ok:
        sessions = response.json()
        initial_count = len(sessions)
        print(f"   ✓ Initial session count: {initial_count}")
        for session in sessions[:3]:  # Show first 3
            print(f"   - ID: {session.get('id', 'N/A')}")
            print(f"     Title: {session.get('title', 'N/A')}")
            print(f"     Messages: {session.get('message_count', 0)}")
    else:
        print(f"   ✗ Failed to get sessions: {response.text}")
        return
    
    # 3. Create a new chat with specific thread_id
    print("\n3. Create new chat session...")
    thread_id = str(uuid.uuid4())
    print(f"   Thread ID: {thread_id}")
    
    chat_data = {
        "message": "Hello! This is a test message for chat persistence.",
        "temperature": 0.7,
        "max_tokens": 150,
        "thread_id": thread_id
    }
    
    # Send first message
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    if response.ok:
        print("   ✓ First message sent")
        # Read streaming response
        full_response = ""
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data_str = line_str[6:]
                    if data_str == '[DONE]':
                        break
                    try:
                        data = json.loads(data_str)
                        if 'content' in data:
                            full_response += data['content']
                    except:
                        pass
        print(f"   Response preview: {full_response[:100]}...")
    else:
        print(f"   ✗ Chat failed: {response.text}")
        return
    
    # 4. Send second message in same thread
    print("\n4. Send second message in same thread...")
    chat_data["message"] = "Can you remember what I said in my first message?"
    
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    if response.ok:
        print("   ✓ Second message sent")
    else:
        print(f"   ✗ Failed: {response.text}")
    
    # 5. Check if session was created
    print("\n5. Check if session was saved...")
    time.sleep(1)  # Give it time to save
    
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    if response.ok:
        sessions = response.json()
        new_count = len(sessions)
        print(f"   ✓ New session count: {new_count}")
        
        # Find our session
        our_session = None
        for session in sessions:
            # Check if this is our session (need to check how sessions are identified)
            if session.get('message_count', 0) >= 2:  # At least our 2 messages
                our_session = session
                break
        
        if our_session:
            print(f"   ✓ Found our session!")
            print(f"   - Session ID: {our_session.get('id')}")
            print(f"   - Title: {our_session.get('title', 'No title')}")
            print(f"   - Messages: {our_session.get('message_count', 0)}")
            session_id = our_session.get('id')
        else:
            print(f"   ✗ Could not find our session")
            print(f"   Sessions found:")
            for s in sessions[:5]:
                print(f"   - {s}")
    else:
        print(f"   ✗ Failed to get sessions: {response.text}")
        return
    
    # 6. Get specific session with messages
    if 'session_id' in locals():
        print(f"\n6. Get session details with messages...")
        response = requests.get(f"{API_BASE_URL}/chat/sessions/{session_id}", headers=headers)
        if response.ok:
            session_detail = response.json()
            print(f"   ✓ Got session details")
            print(f"   - Title: {session_detail.get('title')}")
            print(f"   - Mode: {session_detail.get('mode')}")
            messages = session_detail.get('messages', [])
            print(f"   - Total messages: {len(messages)}")
            for i, msg in enumerate(messages[:4]):  # Show first 4 messages
                print(f"   Message {i+1}:")
                print(f"     Role: {msg.get('role')}")
                print(f"     Content: {msg.get('content', '')[:100]}...")
        else:
            print(f"   ✗ Failed to get session details: {response.text}")
    
    # 7. Test chat continuity - simulate returning user
    print("\n7. Test chat continuity (simulate returning user)...")
    print(f"   Using thread_id: {thread_id}")
    
    # Send a message referencing previous conversation
    continuity_data = {
        "message": "What were we talking about earlier? Can you summarize our conversation?",
        "temperature": 0.7,
        "max_tokens": 200,
        "thread_id": thread_id
    }
    
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=continuity_data,
        headers=headers,
        stream=True
    )
    
    if response.ok:
        print("   ✓ Continuity message sent")
        # Read response
        full_response = ""
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data_str = line_str[6:]
                    if data_str == '[DONE]':
                        break
                    try:
                        data = json.loads(data_str)
                        if 'content' in data:
                            full_response += data['content']
                    except:
                        pass
        print(f"   Response: {full_response[:200]}...")
        
        # Check if it references previous messages
        if "test message" in full_response.lower() or "persistence" in full_response.lower():
            print("   ✓ AI remembered previous context!")
        else:
            print("   ⚠ AI might not have previous context")
    else:
        print(f"   ✗ Continuity test failed: {response.text}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_chat_persistence()