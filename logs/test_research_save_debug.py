#!/usr/bin/env python3
"""Debug test to check research save issue"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Test credentials
email = "chetan@omegaintelligence.ai"
password = "Test123."

# 1. Login
print(f"[{datetime.now()}] Logging in...")
login_response = requests.post(
    f"{BASE_URL}/api/token",
    data={"username": email, "password": password}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json()["access_token"]
print(f"[{datetime.now()}] Login successful, token: {token[:20]}...")

headers = {"Authorization": f"Bearer {token}"}

# 2. Get current user info
print(f"\n[{datetime.now()}] Getting current user info...")
user_response = requests.get(f"{BASE_URL}/api/users/me", headers=headers)
if user_response.status_code == 200:
    user_data = user_response.json()
    print(f"Current user: {user_data}")
    user_id = user_data.get("id")
else:
    print(f"Failed to get user info: {user_response.status_code}")
    print(user_response.text)

# 3. List all sessions for the current user
print(f"\n[{datetime.now()}] Listing all chat sessions...")
sessions_response = requests.get(
    f"{BASE_URL}/api/chat/sessions",
    headers=headers
)

if sessions_response.status_code == 200:
    sessions = sessions_response.json()
    print(f"Found {len(sessions)} sessions:")
    for session in sessions:
        print(f"  - ID: {session['id']}, Thread: {session['thread_id']}, Mode: {session['mode']}, Title: {session.get('title', 'No title')}")
else:
    print(f"Failed to list sessions: {sessions_response.status_code}")
    print(sessions_response.text)

# 4. Try to fetch a specific research session by thread ID
thread_id = "research_test_20250616_205920"  # Use a recent thread ID
print(f"\n[{datetime.now()}] Trying to fetch session by thread ID: {thread_id}")
session_response = requests.get(
    f"{BASE_URL}/api/chat/sessions/by-thread/{thread_id}",
    headers=headers
)

if session_response.status_code == 200:
    session_data = session_response.json()
    print(f"Session found: {json.dumps(session_data, indent=2)}")
else:
    print(f"Failed to get session: {session_response.status_code}")
    print(session_response.text)