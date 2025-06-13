#!/usr/bin/env python3
"""
Test chat continuity - loading previous context
"""

import requests
import json
import uuid
import time

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_chat_continuity():
    print("=== Testing Chat Continuity ===\n")
    
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
    
    # 2. Create a new conversation with specific context
    print("\n2. Start new conversation with context...")
    thread_id = str(uuid.uuid4())
    print(f"   Thread ID: {thread_id}")
    
    # Message 1: Introduce a topic
    chat_data = {
        "messages": [{"role": "user", "content": "My name is John and I'm interested in learning Python programming. I have some experience with JavaScript."}],
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
    
    # Message 2: Ask a follow-up question
    print("\n3. Send follow-up question...")
    chat_data["messages"] = [{"role": "user", "content": "What would be a good first Python project for someone with my background?"}]
    
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    if response.ok:
        print("   ✓ Second message sent")
    
    # 4. Simulate user leaving and coming back
    print("\n4. Simulate user leaving (wait 2 seconds)...")
    time.sleep(2)
    
    # 5. Test continuity - ask about previous context
    print("\n5. Test continuity - reference previous conversation...")
    continuity_data = {
        "messages": [{"role": "user", "content": "What was my name and what programming language did I mention I already know?"}],
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
        print(f"\n   AI Response: {full_response}")
        
        # Check if it remembers context
        context_found = False
        if "john" in full_response.lower():
            print("   ✓ AI remembered the name 'John'")
            context_found = True
        if "javascript" in full_response.lower():
            print("   ✓ AI remembered JavaScript experience")
            context_found = True
        
        if context_found:
            print("\n   ✅ CHAT CONTINUITY WORKING! AI has previous context.")
        else:
            print("\n   ❌ CHAT CONTINUITY NOT WORKING. AI doesn't remember context.")
    
    # 6. Test via Chat History UI
    print("\n6. Get chat sessions to verify...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    if response.ok:
        sessions = response.json()
        # Find our session
        our_session = None
        for session in sessions:
            if session.get('thread_id') == thread_id:
                our_session = session
                break
        
        if our_session:
            print(f"   ✓ Found session in history!")
            print(f"   - Session ID: {our_session['id']}")
            print(f"   - Thread ID: {our_session['thread_id']}")
            print(f"   - Messages: {our_session['message_count']}")
            print(f"\n   To continue this chat in UI:")
            print(f"   1. Go to http://localhost:3000/chat-history")
            print(f"   2. Click on the session")
            print(f"   3. Click 'Continue Chat'")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_chat_continuity()