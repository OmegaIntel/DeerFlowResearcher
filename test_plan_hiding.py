import time
import requests
import json
from datetime import datetime

# Configuration
API_URL = "http://localhost:8000/api"
WEB_URL = "http://localhost:3000"
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."

print(f"[{datetime.now()}] Testing plan hiding functionality...")

# Register/Login first
print(f"[{datetime.now()}] Registering user...")
try:
    register_response = requests.post(
        f"{API_URL}/register",
        json={"email": EMAIL, "password": PASSWORD}
    )
    print(f"Register response: {register_response.status_code}")
except:
    print("Registration endpoint not found, trying login...")

# Login
print(f"[{datetime.now()}] Logging in...")
login_response = requests.post(
    f"{API_URL}/login",
    json={"email": EMAIL, "password": PASSWORD}
)
print(f"Login response: {login_response.status_code}")

if login_response.status_code != 200:
    print("Login failed!")
    exit(1)

# Get token
auth_data = login_response.json()
auth_token = auth_data.get("token")
print(f"Auth token: {auth_token[:20]}...")

# Create a new thread
print(f"[{datetime.now()}] Creating new thread...")
thread_response = requests.post(
    f"{API_URL}/threads",
    headers={"Authorization": f"Bearer {auth_token}"}
)
print(f"Thread response: {thread_response.status_code}")
thread_data = thread_response.json()
thread_id = thread_data.get("id")
print(f"Thread ID: {thread_id}")

# Send research request
print(f"[{datetime.now()}] Sending research request...")
headers = {
    "Authorization": f"Bearer {auth_token}",
    "Content-Type": "application/json"
}

research_request = {
    "message": "@research What are the latest developments in quantum computing in 2024?",
    "thread_id": thread_id,
    "enable_background_investigation": True,
    "tool_id": "research",
    "tool_type": "agent"
}

print(f"[{datetime.now()}] Opening SSE connection for research...")
response = requests.post(
    f"{API_URL}/chat/research",
    headers=headers,
    json=research_request,
    stream=True
)

print(f"[{datetime.now()}] Response status: {response.status_code}")
print(f"[{datetime.now()}] Response headers: {response.headers}")

if response.status_code != 200:
    print(f"Error: {response.text}")
    exit(1)

# Process SSE stream
plan_received = False
report_received = False
plan_message_id = None
research_id = None

print(f"[{datetime.now()}] Processing research stream...")
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data: '):
            data_str = line_str[6:]
            if data_str == '[DONE]':
                print(f"[{datetime.now()}] Stream completed")
                break
            
            try:
                data = json.loads(data_str)
                event_type = data.get('type')
                event_data = data.get('data', {})
                
                if event_type == 'message_chunk' and event_data.get('agent') == 'planner':
                    if not plan_received:
                        print(f"[{datetime.now()}] Plan received from planner")
                        plan_received = True
                        plan_message_id = event_data.get('id')
                        print(f"Plan message ID: {plan_message_id}")
                
                if event_type == 'research' and not research_id:
                    research_id = event_data.get('id')
                    print(f"[{datetime.now()}] Research started with ID: {research_id}")
                
                if event_type == 'message_chunk' and event_data.get('agent') == 'reporter':
                    if not report_received:
                        print(f"[{datetime.now()}] Report generation started")
                        report_received = True
                
                # Log debug events
                if 'DEBUG' in str(event_data):
                    print(f"[{datetime.now()}] DEBUG: {event_data}")
                    
            except json.JSONDecodeError:
                pass

print(f"\n[{datetime.now()}] Test completed:")
print(f"- Plan received: {plan_received}")
print(f"- Plan message ID: {plan_message_id}")
print(f"- Research ID: {research_id}")
print(f"- Report received: {report_received}")
print(f"\nCheck browser console logs for plan hiding debug messages")
print(f"Expected: Plan should be hidden after report is generated")