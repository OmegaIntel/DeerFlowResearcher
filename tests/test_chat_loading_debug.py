#!/usr/bin/env python3
"""Debug chat loading issue"""

import requests
import json
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

def debug_chat_loading():
    """Debug why chats don't load properly"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get recent sessions
    print("[1] Getting recent sessions...")
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions?limit=3",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Failed to get sessions: {response.status_code}")
        return
    
    sessions = response.json()
    
    # Find a session with messages
    test_session = None
    for session in sessions:
        if session["message_count"] > 2:
            test_session = session
            break
    
    if not test_session:
        print("No suitable session found")
        return
    
    print(f"\n[2] Testing with session:")
    print(f"  Thread ID: {test_session['thread_id']}")
    print(f"  Mode: {test_session['mode']}")
    print(f"  Messages: {test_session['message_count']}")
    
    # Get session by thread (what frontend does)
    print(f"\n[3] Getting session by thread ID...")
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions/by-thread/{test_session['thread_id']}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Got {len(data['messages'])} messages")
        
        # Check message structure
        print(f"\n[4] Checking message structure:")
        for i, msg in enumerate(data['messages'][:3]):  # First 3 messages
            print(f"\nMessage {i+1}:")
            print(f"  ID: {msg['id']}")
            print(f"  Role: {msg['role']}")
            print(f"  Content length: {len(msg['content'])}")
            print(f"  Has attachments: {bool(msg.get('attachments'))}")
            print(f"  Has citations: {bool(msg.get('citations'))}")
            
            # Check if content is JSON
            if msg['content'].strip().startswith('{'):
                try:
                    parsed = json.loads(msg['content'])
                    print(f"  Content is JSON with keys: {list(parsed.keys())}")
                except:
                    print(f"  Content starts with {{ but is not valid JSON")
            else:
                print(f"  Content preview: {msg['content'][:100]}...")
        
        # Check for any planner/coordinator messages that might be confusing the UI
        print(f"\n[5] Checking for system messages:")
        system_msgs = 0
        for msg in data['messages']:
            if msg['role'] == 'assistant':
                content = msg['content'].strip()
                if content.startswith('{') and 'thought' in content:
                    system_msgs += 1
                    print(f"  Found planner/coordinator message (ID: {msg['id']})")
        
        if system_msgs > 0:
            print(f"\n⚠️  Found {system_msgs} system messages that might be displayed incorrectly")
            print("These JSON messages should be hidden or formatted differently in the UI")
    else:
        print(f"✗ Failed: {response.status_code}")

if __name__ == "__main__":
    debug_chat_loading()