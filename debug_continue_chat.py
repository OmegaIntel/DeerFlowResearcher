#!/usr/bin/env python3
"""Debug continue chat issue"""

import requests
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

def check_existing_sessions():
    """Check what sessions exist and their content"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"[{datetime.now()}] Getting existing sessions...")
    
    # Get recent sessions
    response = requests.get(
        f"{BASE_URL}/api/chat/sessions?limit=3",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Failed to get sessions: {response.status_code}")
        return
    
    sessions = response.json()
    print(f"Found {len(sessions)} sessions\n")
    
    # Check each session
    for i, session in enumerate(sessions):
        print(f"Session {i+1}:")
        print(f"  Thread ID: {session['thread_id']}")
        print(f"  Mode: {session['mode']}")
        print(f"  Messages: {session['message_count']}")
        print(f"  Title: {session.get('title', 'No title')[:60]}...")
        
        # Get full session details
        detail_response = requests.get(
            f"{BASE_URL}/api/chat/sessions/by-thread/{session['thread_id']}",
            headers=headers
        )
        
        if detail_response.status_code == 200:
            detail = detail_response.json()
            print(f"\n  Detailed message analysis:")
            
            for j, msg in enumerate(detail['messages']):
                # Determine message type
                msg_type = "user" if msg['role'] == 'user' else "unknown"
                
                if msg['role'] == 'assistant':
                    content = msg['content'].strip()
                    if content.startswith('{'):
                        try:
                            import json
                            parsed = json.loads(content)
                            if 'has_enough_context' in parsed or 'thought' in parsed:
                                msg_type = "planner"
                            else:
                                msg_type = "json"
                        except:
                            msg_type = "assistant"
                    elif len(content) > 500 and '# ' in content:
                        msg_type = "reporter"
                    else:
                        msg_type = "assistant"
                
                preview = msg['content'][:80].replace('\n', ' ')
                print(f"    Msg {j+1}: {msg_type} - {preview}...")
            
            print(f"\n  Frontend navigation URL: /chat?thread={session['thread_id']}")
            print("  " + "-"*60)
            print()

def main():
    print("Continue Chat Debug Tool")
    print("="*80)
    check_existing_sessions()
    
    print("\nDEBUGGING STEPS:")
    print("1. The backend is returning all messages correctly")
    print("2. The frontend code has been updated to detect message types")
    print("3. Check browser console for errors when continuing a chat")
    print("4. Look for [Store] logging messages in browser console")

if __name__ == "__main__":
    main()