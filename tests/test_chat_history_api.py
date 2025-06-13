#!/usr/bin/env python3
"""
Test chat history API to see if it's working
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_chat_history():
    print("=== Testing Chat History API ===\n")
    
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
    
    # 2. Get chat sessions
    print("\n2. Fetching chat sessions...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    
    print(f"   Status: {response.status_code}")
    print(f"   Headers: {dict(response.headers)}")
    
    if response.ok:
        sessions = response.json()
        print(f"   ✓ Found {len(sessions)} sessions")
        
        # Show first 3 sessions
        for i, session in enumerate(sessions[:3]):
            print(f"\n   Session {i+1}:")
            print(f"   - ID: {session['id']}")
            print(f"   - Thread ID: {session['thread_id']}")
            print(f"   - Title: {session.get('title', 'No title')}")
            print(f"   - Messages: {session['message_count']}")
            print(f"   - Created: {session['created_at']}")
    else:
        print(f"   ✗ Error: {response.text}")

if __name__ == "__main__":
    test_chat_history()