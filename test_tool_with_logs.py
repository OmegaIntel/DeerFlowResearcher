#!/usr/bin/env python3
"""Test tool endpoint with detailed logging"""

import requests
import json
from datetime import datetime

# Test credentials
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."
BASE_URL = "http://localhost:8000"

# Login
print(f"[{datetime.now()}] Logging in...")
resp = requests.post(f"{BASE_URL}/api/token", data={"username": EMAIL, "password": PASSWORD})
if resp.status_code != 200:
    print(f"Login failed: {resp.status_code}")
    exit(1)

token = resp.json()["access_token"]
print("✓ Login successful")

# Test tool endpoint
thread_id = f"test_tool_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
print(f"\n[{datetime.now()}] Testing tool endpoint with thread_id: {thread_id}")

headers = {"Authorization": f"Bearer {token}"}
data = {
    "messages": [{"role": "user", "content": "What is AI?"}],
    "thread_id": thread_id,
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": True
}

print("✓ Sending request to /api/chat/tool...")
resp = requests.post(f"{BASE_URL}/api/chat/tool", json=data, headers=headers, stream=True)
print(f"Response status: {resp.status_code}")

# Read streaming response
event_count = 0
agents_seen = set()
finish_reasons = []

for line in resp.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                event_data = json.loads(line_str[6:])
                event_count += 1
                
                agent = event_data.get("agent", "unknown")
                agents_seen.add(agent)
                
                finish_reason = event_data.get("finish_reason")
                if finish_reason:
                    finish_reasons.append(f"{agent}:{finish_reason}")
                    print(f"  Event {event_count}: {agent} - finish_reason={finish_reason}")
                    
                    # Stop after interrupt or error
                    if finish_reason in ["interrupt", "error"]:
                        break
                        
            except json.JSONDecodeError:
                pass

print(f"\n[{datetime.now()}] Stream completed")
print(f"Total events: {event_count}")
print(f"Agents seen: {', '.join(agents_seen)}")
print(f"Finish reasons: {', '.join(finish_reasons)}")

# Check if session was saved
print(f"\n[{datetime.now()}] Checking if session was saved...")
resp = requests.get(f"{BASE_URL}/api/chat/sessions?skip=0&limit=5", headers=headers)

if resp.status_code == 200:
    sessions = resp.json()
    found = False
    
    for session in sessions:
        if session["thread_id"] == thread_id:
            found = True
            print(f"✓ Session found!")
            print(f"  ID: {session['id']}")
            print(f"  Mode: {session['mode']}")
            print(f"  Title: {session.get('title', 'No title')[:50]}...")
            
            # Get session details
            detail_resp = requests.get(f"{BASE_URL}/api/chat/sessions/{session['id']}", headers=headers)
            if detail_resp.status_code == 200:
                detail = detail_resp.json()
                print(f"  Messages: {len(detail.get('messages', []))}")
            break
    
    if not found:
        print("⚠️  Session NOT found in database!")
else:
    print(f"Failed to get sessions: {resp.status_code}")