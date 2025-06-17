#!/usr/bin/env python3
"""
Create a test chat session for the current user
"""

import requests
import json
import uuid

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def create_test_session():
    print("=== Creating Test Chat Session ===\n")
    
    # 1. Login
    print("1. Login with test@example.com...")
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
        
        # Try creating the user
        print("\n2. Creating user...")
        register_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        
        response = requests.post(f"{API_BASE_URL}/users/register", json=register_data)
        if response.ok:
            print("   ✓ User created successfully")
            # Try login again
            response = requests.post(f"{API_BASE_URL}/token", data=login_data)
            if response.ok:
                token = response.json()["access_token"]
                print("   ✓ Login successful after registration")
            else:
                print(f"   ✗ Login still failed: {response.text}")
                return
        else:
            print(f"   ✗ Registration failed: {response.text}")
            return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create a new chat session
    print("\n2. Creating a new chat session...")
    thread_id = str(uuid.uuid4())
    
    chat_data = {
        "messages": [{"role": "user", "content": "Hello! This is a test message."}],
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
        print(f"   ✓ Chat created with thread_id: {thread_id}")
        # Consume the streaming response
        for line in response.iter_lines():
            if line:
                pass  # Just consume it
    else:
        print(f"   ✗ Failed to create chat: {response.status_code}")
    
    # 3. Check if session appears in history
    print("\n3. Checking chat history...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    
    if response.ok:
        sessions = response.json()
        print(f"   ✓ Found {len(sessions)} sessions")
        if sessions:
            print("\n   Your chat sessions:")
            for i, session in enumerate(sessions[:3]):
                print(f"   {i+1}. Thread ID: {session['thread_id']}")
                print(f"      Messages: {session['message_count']}")
                print(f"      Created: {session['created_at']}")
    else:
        print(f"   ✗ Failed to get sessions: {response.text}")
    
    print("\n4. You can now:")
    print("   - Go to http://ec2-54-91-85-225.compute-1.amazonaws.com:3000/chat/history")
    print("   - Login with: test@example.com / testpassword123")
    print("   - You should see your chat sessions")

if __name__ == "__main__":
    create_test_session()