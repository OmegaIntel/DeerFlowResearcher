#!/usr/bin/env python3
"""
Test RAG isolation between sessions with unique content
"""

import requests
import uuid
import time
import os

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

# Login
print("1. Logging in...")
login_data = {
    "username": "chetan@omegaintelligence.ai",
    "password": "Test123."
}

response = requests.post(f"{API_BASE_URL}/token", data=login_data)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("✓ Logged in successfully")

# Create two unique sessions
session1_id = f"session1_{uuid.uuid4()}"
session2_id = f"session2_{uuid.uuid4()}"

# Create unique test content for each session
print("\n2. Creating unique documents for each session...")

# Document 1 with unique made-up information
doc1_content = """
# Secret Company Information - Session 1

The secret project codename is BLUEPHOENIX-42.
The project leader is Dr. Sarah Montgomery.
The project budget is exactly $7,892,345.
The launch date is scheduled for March 17, 2025.
The headquarters location is in Quantum Tower, Floor 88.
"""

# Document 2 with different unique information  
doc2_content = """
# Secret Company Information - Session 2

The secret project codename is REDHAWK-99.
The project leader is Prof. James Chen.
The project budget is exactly $3,456,789.
The launch date is scheduled for July 23, 2025.
The headquarters location is in Crystal Building, Floor 12.
"""

# Upload document 1 to session 1
print(f"\n3. Uploading document to session 1...")
with open("/tmp/doc1.txt", "w") as f:
    f.write(doc1_content)

with open("/tmp/doc1.txt", "rb") as f:
    files = {"file": ("session1_doc.txt", f, "text/plain")}
    response = requests.post(
        f"{API_BASE_URL}/documents/upload?session_id={session1_id}", 
        files=files, 
        headers=headers
    )
    print(f"✓ Document 1 uploaded: {response.json()['document']['id']}")

# Upload document 2 to session 2
print(f"\n4. Uploading document to session 2...")
with open("/tmp/doc2.txt", "w") as f:
    f.write(doc2_content)

with open("/tmp/doc2.txt", "rb") as f:
    files = {"file": ("session2_doc.txt", f, "text/plain")}
    response = requests.post(
        f"{API_BASE_URL}/documents/upload?session_id={session2_id}", 
        files=files, 
        headers=headers
    )
    print(f"✓ Document 2 uploaded: {response.json()['document']['id']}")

# Wait for processing
print("\n5. Waiting for processing...")
time.sleep(5)

# Test questions
questions = [
    "What is the secret project codename?",
    "Who is the project leader?",
    "What is the exact project budget?"
]

print("\n6. Testing RAG isolation...")
print("=" * 70)

for question in questions:
    print(f"\nQuestion: {question}")
    print("-" * 50)
    
    # Ask session 1
    chat_data = {
        "messages": [{"role": "user", "content": question}],
        "temperature": 0.1,
        "max_tokens": 100,
        "thread_id": session1_id
    }
    
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    print("Session 1 answer: ", end="")
    session1_answer = ""
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data:'):
                try:
                    import json
                    data = json.loads(line_str[5:])
                    if 'content' in data:
                        session1_answer += data['content']
                        print(data['content'], end='', flush=True)
                except:
                    pass
    print()
    
    # Ask session 2
    chat_data["thread_id"] = session2_id
    
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    print("Session 2 answer: ", end="")
    session2_answer = ""
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data:'):
                try:
                    import json
                    data = json.loads(line_str[5:])
                    if 'content' in data:
                        session2_answer += data['content']
                        print(data['content'], end='', flush=True)
                except:
                    pass
    print()
    
    # Check isolation
    if "BLUEPHOENIX" in session1_answer and "REDHAWK" not in session1_answer:
        print("✓ Session 1 correctly using its own document")
    elif "Dr. Sarah Montgomery" in session1_answer and "Prof. James Chen" not in session1_answer:
        print("✓ Session 1 correctly using its own document")
    elif "$7,892,345" in session1_answer and "$3,456,789" not in session1_answer:
        print("✓ Session 1 correctly using its own document")
    
    if "REDHAWK" in session2_answer and "BLUEPHOENIX" not in session2_answer:
        print("✓ Session 2 correctly using its own document")
    elif "Prof. James Chen" in session2_answer and "Dr. Sarah Montgomery" not in session2_answer:
        print("✓ Session 2 correctly using its own document")
    elif "$3,456,789" in session2_answer and "$7,892,345" not in session2_answer:
        print("✓ Session 2 correctly using its own document")

# Cleanup
os.remove("/tmp/doc1.txt")
os.remove("/tmp/doc2.txt")

print("\n" + "=" * 70)
print("Test completed. Sessions should have different answers based on their documents.")