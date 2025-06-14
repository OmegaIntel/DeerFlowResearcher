#!/usr/bin/env python3
"""
Debug why titles aren't being set
"""

import requests
import uuid
import time

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

# Login
login_data = {
    "username": "chetan@omegaintelligence.ai",
    "password": "Test123."
}

response = requests.post(f"{API_BASE_URL}/token", data=login_data)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create a new chat
thread_id = str(uuid.uuid4())
test_message = f"Test message at {time.strftime('%H:%M:%S')} - Why are titles not working?"

print(f"Creating chat with thread_id: {thread_id}")
print(f"Message: {test_message}")

chat_data = {
    "messages": [{"role": "user", "content": test_message}],
    "temperature": 0.7,
    "max_tokens": 150,
    "thread_id": thread_id
}

# Send request
response = requests.post(
    f"{API_BASE_URL}/chat/simple",
    json=chat_data,
    headers=headers,
    stream=True
)

print(f"Response status: {response.status_code}")

# Consume response
for line in response.iter_lines():
    if line:
        pass

# Wait a bit
time.sleep(2)

# Check the session
sessions = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers).json()
our_session = None
for s in sessions:
    if s['thread_id'] == thread_id:
        our_session = s
        break

if our_session:
    print(f"\nSession found:")
    print(f"  ID: {our_session['id']}")
    print(f"  Title: {repr(our_session.get('title'))}")
    print(f"  Expected: {test_message[:100]}")
else:
    print("Session not found!")

# Also check recent backend logs
import subprocess
logs = subprocess.run(
    ["docker", "logs", "deer-flow-backend", "--tail", "50"],
    capture_output=True,
    text=True
)
print("\nRecent backend logs mentioning our thread:")
for line in logs.stdout.split('\n') + logs.stderr.split('\n'):
    if thread_id in line or "CHAT_SIMPLE" in line or "Setting title" in line:
        print(f"  {line}")