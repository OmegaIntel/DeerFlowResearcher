#!/usr/bin/env python3
"""Check recent research sessions to see if reports are saved"""

import requests
from datetime import datetime

# Test credentials
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."
BASE_URL = "http://localhost:8000"

def check_recent_sessions():
    """Check recent research sessions"""
    # Login
    print(f"[{datetime.now()}] Logging in...")
    response = requests.post(
        f"{BASE_URL}/api/token",
        data={"username": EMAIL, "password": PASSWORD}
    )
    
    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Login successful")
    
    # Get recent sessions
    print(f"\n[{datetime.now()}] Getting recent sessions...")
    sessions_response = requests.get(
        f"{BASE_URL}/api/chat/sessions?skip=0&limit=10",
        headers=headers
    )
    
    if sessions_response.status_code == 200:
        sessions = sessions_response.json()
        print(f"Found {len(sessions)} recent sessions\n")
        
        research_sessions = []
        
        for session in sessions:
            if session["mode"] == "research":
                research_sessions.append(session)
                
                # Get session details
                detail_response = requests.get(
                    f"{BASE_URL}/api/chat/sessions/{session['id']}",
                    headers=headers
                )
                
                if detail_response.status_code == 200:
                    detail = detail_response.json()
                    messages = detail.get("messages", [])
                    
                    print(f"Research Session: {session['thread_id']}")
                    print(f"  Created: {session['created_at']}")
                    print(f"  Title: {session.get('title', 'No title')[:80]}...")
                    print(f"  Messages: {len(messages)}")
                    
                    # Check for reporter message
                    has_report = False
                    for msg in messages:
                        if msg["role"] == "assistant" and len(msg["content"]) > 1000 and "# " in msg["content"]:
                            has_report = True
                            print(f"  ✓ REPORT FOUND! Length: {len(msg['content'])} chars")
                            print(f"    Preview: {msg['content'][:150]}...")
                            break
                    
                    if not has_report:
                        print(f"  ⚠️  No report found")
                    
                    print()
        
        print(f"\nSummary:")
        print(f"  Total research sessions: {len(research_sessions)}")
        
        sessions_with_reports = sum(1 for s in research_sessions)
        print(f"  Sessions with reports: TBD (need to check individually)")
        
    else:
        print(f"Failed to get sessions: {sessions_response.status_code}")

if __name__ == "__main__":
    check_recent_sessions()