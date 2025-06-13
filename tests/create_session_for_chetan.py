#!/usr/bin/env python3
"""
Create a test chat session for chetan@omegaintelligence.ai
"""

import requests
import json
import uuid

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def create_test_session():
    print("=== Creating Test Chat Session for chetan@omegaintelligence.ai ===\n")
    
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
    
    # 2. Create multiple chat sessions
    print("\n2. Creating chat sessions...")
    
    messages = [
        "Hello! Can you help me understand how Docker works?",
        "What are the best practices for React development?",
        "I need help with setting up a CI/CD pipeline",
        "Can you explain machine learning concepts?",
        "How do I optimize database queries?"
    ]
    
    for i, message in enumerate(messages):
        thread_id = str(uuid.uuid4())
        
        chat_data = {
            "messages": [{"role": "user", "content": message}],
            "temperature": 0.7,
            "max_tokens": 150,
            "thread_id": thread_id
        }
        
        print(f"\n   Creating session {i+1}: {message[:50]}...")
        response = requests.post(
            f"{API_BASE_URL}/chat/simple",
            json=chat_data,
            headers=headers,
            stream=True
        )
        
        if response.ok:
            print(f"   ✓ Chat {i+1} created with thread_id: {thread_id}")
            # Consume the streaming response
            for line in response.iter_lines():
                if line:
                    pass  # Just consume it
        else:
            print(f"   ✗ Failed to create chat {i+1}: {response.status_code}")
    
    # 3. Check if sessions appear in history
    print("\n3. Checking chat history...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    
    if response.ok:
        sessions = response.json()
        print(f"   ✓ Found {len(sessions)} sessions")
        if sessions:
            print("\n   Your chat sessions:")
            for i, session in enumerate(sessions):
                print(f"   {i+1}. Thread ID: {session['thread_id']}")
                print(f"      Messages: {session['message_count']}")
                print(f"      Created: {session['created_at']}")
    else:
        print(f"   ✗ Failed to get sessions: {response.text}")
    
    print("\n4. Done! You can now:")
    print("   - Go to http://ec2-54-91-85-225.compute-1.amazonaws.com:3000/verify-auth.html")
    print("   - Click 'Login as chetan@omegaintelligence.ai'")
    print("   - Then go to Chat History to see your sessions")

if __name__ == "__main__":
    create_test_session()