#!/usr/bin/env python3
"""Manual test of continue chat functionality"""

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

def create_test_research():
    """Create a test research session"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a unique thread ID
    thread_id = f"test_continue_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"Creating research with thread_id: {thread_id}")
    
    # Send research request
    data = {
        "messages": [{"role": "user", "content": "What are the benefits of meditation?"}],
        "thread_id": thread_id,
        "tool_id": "research",
        "tool_type": "agent",
        "auto_accepted_plan": True,
        "max_plan_iterations": 1,
        "max_step_num": 5
    }
    
    print("Sending research request...")
    response = requests.post(
        f"{BASE_URL}/api/chat/tool",
        json=data,
        headers=headers,
        stream=True
    )
    
    if response.status_code != 200:
        print(f"Request failed: {response.status_code}")
        return None
    
    # Read streaming response
    event_count = 0
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith("data: "):
                try:
                    event_data = json.loads(line_str[6:])
                    event_count += 1
                    agent = event_data.get("agent", "unknown")
                    finish_reason = event_data.get("finish_reason")
                    
                    if finish_reason:
                        print(f"  {agent}: {finish_reason}")
                        
                except json.JSONDecodeError:
                    pass
    
    print(f"Total events: {event_count}")
    return thread_id

def test_continue_chat_backend(thread_id):
    """Test if backend returns all messages for continue chat"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\nTesting continue chat for thread: {thread_id}")
    
    # Wait for messages to be saved
    time.sleep(3)
    
    # Get session by thread ID (what frontend does)
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions/by-thread/{thread_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Got session with {len(data['messages'])} messages")
        
        # Check message details
        for i, msg in enumerate(data['messages']):
            content_preview = msg['content'][:80] + "..." if len(msg['content']) > 80 else msg['content']
            content_preview = content_preview.replace('\n', ' ')
            print(f"\nMessage {i+1}:")
            print(f"  Role: {msg['role']}")
            print(f"  Content: {content_preview}")
            
            # Check if it's JSON
            if msg['content'].strip().startswith('{'):
                try:
                    parsed = json.loads(msg['content'])
                    print(f"  Type: Planner/Coordinator (JSON)")
                except:
                    print(f"  Type: Regular message")
            elif len(msg['content']) > 500 and '# ' in msg['content']:
                print(f"  Type: Reporter (Research Report)")
            else:
                print(f"  Type: Regular message")
        
        return data
    else:
        print(f"✗ Failed to get session: {response.status_code}")
        return None

def main():
    print(f"[{datetime.now()}] Continue Chat Test")
    print("="*60)
    
    # Step 1: Create a test research session
    print("\n1. Creating test research session...")
    thread_id = create_test_research()
    
    if not thread_id:
        print("Failed to create test research")
        return
    
    # Step 2: Test backend retrieval
    print(f"\n2. Testing backend retrieval...")
    session_data = test_continue_chat_backend(thread_id)
    
    if session_data:
        print(f"\n3. Frontend would load this session:")
        print(f"   - Navigate to: /chat?thread={thread_id}")
        print(f"   - Load {len(session_data['messages'])} messages")
        print(f"   - Mode: {session_data['mode']}")
        
        print("\n4. Expected behavior:")
        print("   - User message should show in a chat bubble")
        print("   - Planner JSON messages should show as plan cards")
        print("   - Reporter messages should show as formatted research reports")
        print("   - Research UI elements should be visible")
        
        print(f"\n5. To test manually:")
        print(f"   a. Open http://localhost:3000")
        print(f"   b. Login with: {EMAIL}")
        print(f"   c. Go to Chat History")
        print(f"   d. Find the session 'What are the benefits of meditation?'")
        print(f"   e. Click 'Continue Chat'")
        print(f"   f. Verify all messages are displayed correctly")

if __name__ == "__main__":
    main()