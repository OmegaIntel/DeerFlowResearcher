#!/usr/bin/env python3
"""Check recent chat sessions and their messages"""

import requests
from datetime import datetime

# Test credentials
email = "chetan@omegaintelligence.ai"
password = "Test123."

base_url = "http://localhost:8000"

# 1. Login
print(f"[{datetime.now()}] Logging in...")
login_response = requests.post(
    f"{base_url}/api/token",
    data={"username": email, "password": password}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    exit(1)

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("✓ Login successful")

# 2. Get recent sessions
print(f"\n[{datetime.now()}] Getting recent chat sessions...")
sessions_response = requests.get(
    f"{base_url}/api/chat/sessions?skip=0&limit=10",
    headers=headers
)

if sessions_response.status_code == 200:
    sessions = sessions_response.json()
    print(f"Found {len(sessions)} recent sessions:\n")
    
    for i, session in enumerate(sessions):
        print(f"Session {i+1}:")
        print(f"  - ID: {session['id']}")
        print(f"  - Thread ID: {session['thread_id']}")
        print(f"  - Mode: {session['mode']}")
        print(f"  - Title: {session.get('title', 'No title')[:80]}...")
        print(f"  - Created: {session['created_at']}")
        
        # Get messages for this session
        session_detail_response = requests.get(
            f"{base_url}/api/chat/sessions/{session['id']}",
            headers=headers
        )
        
        if session_detail_response.status_code == 200:
            detail = session_detail_response.json()
            messages = detail.get('messages', [])
            print(f"  - Messages: {len(messages)}")
            
            # Check if any message contains reporter content
            has_reporter = False
            for msg in messages:
                if msg['role'] == 'assistant' and msg['content'].startswith('# '):
                    has_reporter = True
                    print(f"    ✓ REPORTER MESSAGE FOUND!")
                    print(f"      Preview: {msg['content'][:150]}...")
                    break
            
            if session['mode'] == 'research' and not has_reporter:
                print(f"    ⚠️  Research session but no reporter message")
        
        print()
        
    # Look specifically for sessions with "Generative AI" in title
    print("\nSearching for 'Generative AI' sessions:")
    ai_sessions = [s for s in sessions if 'generative' in s.get('title', '').lower() or 'ai' in s.get('title', '').lower()]
    
    if ai_sessions:
        print(f"Found {len(ai_sessions)} AI-related sessions:")
        for session in ai_sessions:
            print(f"  - {session['thread_id']}: {session['title'][:60]}...")
    else:
        print("No sessions found with 'AI' or 'Generative' in title")
        
else:
    print(f"Failed to get sessions: {sessions_response.status_code}")
    print(sessions_response.text)