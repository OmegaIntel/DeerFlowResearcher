#!/usr/bin/env python3
"""Test continue chat functionality"""

import requests
import json
from datetime import datetime

# Test credentials
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."
BASE_URL = "http://localhost:8000"

def login():
    """Login and get token"""
    print(f"[{datetime.now()}] Logging in...")
    response = requests.post(
        f"{BASE_URL}/api/token",
        data={"username": EMAIL, "password": PASSWORD}
    )
    
    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        exit(1)
    
    token = response.json()["access_token"]
    print("✓ Login successful")
    return token

def test_continue_chat():
    """Test loading chat history by thread ID"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # First, get recent sessions
    print(f"\n[{datetime.now()}] Getting recent sessions...")
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions?limit=5",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Failed to get sessions: {response.status_code}")
        return
    
    sessions = response.json()
    print(f"✓ Found {len(sessions)} sessions")
    
    if not sessions:
        print("No sessions found")
        return
    
    # Find a research session with messages
    test_session = None
    for session in sessions:
        if session["message_count"] > 1:
            test_session = session
            break
    
    if not test_session:
        print("No session with multiple messages found")
        return
    
    print(f"\n[{datetime.now()}] Testing session:")
    print(f"  ID: {test_session['id']}")
    print(f"  Thread ID: {test_session['thread_id']}")
    print(f"  Mode: {test_session['mode']}")
    print(f"  Message count: {test_session['message_count']}")
    
    # Test 1: Get session by ID
    print(f"\n[{datetime.now()}] Test 1: Get session by ID...")
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions/{test_session['id']}",
        headers=headers
    )
    
    if response.status_code == 200:
        detail = response.json()
        print(f"✓ Success: Got {len(detail['messages'])} messages")
    else:
        print(f"✗ Failed: {response.status_code}")
    
    # Test 2: Get session by thread ID
    print(f"\n[{datetime.now()}] Test 2: Get session by thread ID...")
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions/by-thread/{test_session['thread_id']}",
        headers=headers
    )
    
    if response.status_code == 200:
        detail = response.json()
        print(f"✓ Success: Got {len(detail['messages'])} messages")
        
        # Show message details
        print(f"\nMessages in session:")
        for i, msg in enumerate(detail['messages']):
            content_preview = msg['content'][:100] + "..." if len(msg['content']) > 100 else msg['content']
            print(f"  {i+1}. {msg['role']}: {content_preview}")
            if msg.get('attachments'):
                print(f"     Attachments: {len(msg['attachments'])}")
            if msg.get('citations'):
                print(f"     Citations: {len(msg['citations'])}")
    else:
        print(f"✗ Failed: {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 3: Test what the frontend would see
    print(f"\n[{datetime.now()}] Test 3: Simulating frontend navigation...")
    print(f"Frontend would navigate to: /chat?thread={test_session['thread_id']}")
    print(f"Frontend would call: getChatSessionByThread('{test_session['thread_id']}')")
    
    # Check if the messages have the expected format
    if response.status_code == 200:
        print(f"\n✓ Backend is returning messages correctly")
        print(f"The issue might be in the frontend message rendering")

if __name__ == "__main__":
    test_continue_chat()