#!/usr/bin/env python3
"""Test continue chat with a simple chat (not research)"""

import requests
import json
from datetime import datetime
import time

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

def create_simple_chat():
    """Create a simple chat session"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a unique thread ID
    thread_id = f"test_simple_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"Creating chat with thread_id: {thread_id}")
    
    # Send first message
    data = {
        "messages": [{"role": "user", "content": "Hello, how are you?"}],
        "thread_id": thread_id
    }
    
    print("Sending first message...")
    response = requests.post(
        f"{BASE_URL}/api/chat/simple",
        json=data,
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Request failed: {response.status_code}")
        return None
    
    result = response.json()
    print(f"Got response: {result['content'][:100]}...")
    
    # Send second message
    time.sleep(2)
    data = {
        "messages": [
            {"role": "user", "content": "Hello, how are you?"},
            {"role": "assistant", "content": result['content']},
            {"role": "user", "content": "What's the weather like?"}
        ],
        "thread_id": thread_id
    }
    
    print("\nSending second message...")
    response = requests.post(
        f"{BASE_URL}/api/chat/simple",
        json=data,
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"Got response: {result['content'][:100]}...")
    
    return thread_id

def test_continue_chat(thread_id):
    """Test if continue chat loads all messages"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n\nTesting continue chat for thread: {thread_id}")
    
    # Wait for messages to be saved
    time.sleep(2)
    
    # Get session by thread ID
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions/by-thread/{thread_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Got session with {len(data['messages'])} messages")
        
        # Check message details
        for i, msg in enumerate(data['messages']):
            print(f"\nMessage {i+1}:")
            print(f"  Role: {msg['role']}")
            print(f"  Content: {msg['content'][:100]}...")
        
        print(f"\n\nSUMMARY:")
        print(f"Thread ID: {thread_id}")
        print(f"Mode: {data['mode']}")
        print(f"Messages: {len(data['messages'])}")
        
        if len(data['messages']) >= 4:
            print("\n✅ Backend is returning all messages correctly!")
            print("\nTo test the frontend:")
            print(f"1. Go to http://localhost:3000/chat-history")
            print(f"2. Find the chat starting with 'Hello, how are you?'")
            print(f"3. Click 'Continue Chat'")
            print(f"4. Check if all {len(data['messages'])} messages are displayed")
        else:
            print("\n⚠️  Not all messages were saved")
            
        return data
    else:
        print(f"✗ Failed to get session: {response.status_code}")
        return None

def main():
    print(f"[{datetime.now()}] Simple Chat Continue Test")
    print("="*60)
    
    # Create a simple chat
    thread_id = create_simple_chat()
    
    if thread_id:
        # Test continue chat
        test_continue_chat(thread_id)

if __name__ == "__main__":
    main()