#!/usr/bin/env python3
"""
Test RAG functionality with session-specific documents
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
if response.status_code != 200:
    print(f"Login failed: {response.status_code} - {response.text}")
    exit(1)

token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"✓ Logged in successfully")

# Create a unique thread ID for this test
thread_id = f"test_rag_{uuid.uuid4()}"
print(f"\n2. Using thread ID: {thread_id}")

# Create a test document
print("\n3. Creating test document...")
test_content = """
# Test Document for RAG

This is a test document containing information about AI and machine learning.

## Important Facts:
- The capital of France is Paris
- Machine learning is a subset of artificial intelligence
- Python is a popular programming language for AI development
- Neural networks are inspired by the human brain
- Deep learning uses multiple layers of neural networks

## Test Information:
This document is specifically created to test the RAG functionality.
When asked about the capital of France, the system should retrieve this information.
"""

# Save test content to a file
test_file_path = "/tmp/test_rag_document.txt"
with open(test_file_path, "w") as f:
    f.write(test_content)

# Upload the document with session ID
print(f"\n4. Uploading document to session {thread_id}...")
with open(test_file_path, "rb") as f:
    files = {"file": ("test_rag_document.txt", f, "text/plain")}
    upload_url = f"{API_BASE_URL}/documents/upload?session_id={thread_id}"
    response = requests.post(upload_url, files=files, headers=headers)

if response.status_code != 200:
    print(f"Upload failed: {response.status_code} - {response.text}")
    exit(1)

upload_result = response.json()
print(f"✓ Document uploaded: {upload_result}")

# Wait for processing
print("\n5. Waiting for document processing...")
time.sleep(5)

# Test RAG with a question
print(f"\n6. Testing RAG with a question about the document...")
chat_data = {
    "messages": [{"role": "user", "content": "What is the capital of France according to the document?"}],
    "temperature": 0.7,
    "max_tokens": 150,
    "thread_id": thread_id
}

response = requests.post(
    f"{API_BASE_URL}/chat/simple",
    json=chat_data,
    headers=headers,
    stream=True
)

print(f"Response status: {response.status_code}")
print("\n7. Chat response:")
print("-" * 50)

full_response = ""
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data:'):
            try:
                import json
                data = json.loads(line_str[5:])
                if 'content' in data:
                    full_response += data['content']
                    print(data['content'], end='', flush=True)
            except:
                pass

print("\n" + "-" * 50)

# Check if the response contains information from the document
if "Paris" in full_response:
    print("\n✅ SUCCESS: RAG is working! The response contains information from the uploaded document.")
else:
    print("\n❌ FAILED: The response doesn't seem to include information from the uploaded document.")

# Test with a different session
print(f"\n8. Testing with a different session (should NOT find the document)...")
different_thread_id = f"test_rag_different_{uuid.uuid4()}"
chat_data["thread_id"] = different_thread_id

response = requests.post(
    f"{API_BASE_URL}/chat/simple",
    json=chat_data,
    headers=headers,
    stream=True
)

print(f"Response status: {response.status_code}")
print("\n9. Chat response from different session:")
print("-" * 50)

different_response = ""
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data:'):
            try:
                import json
                data = json.loads(line_str[5:])
                if 'content' in data:
                    different_response += data['content']
                    print(data['content'], end='', flush=True)
            except:
                pass

print("\n" + "-" * 50)

# Clean up
os.remove(test_file_path)

print("\n10. Summary:")
print(f"- Document uploaded to session: {thread_id}")
print(f"- RAG search in same session: {'✓ Working' if 'Paris' in full_response else '✗ Not working'}")
print(f"- RAG search in different session: {'✓ Correctly isolated' if 'Paris' not in different_response else '✗ Not isolated'}")

# Check backend logs
print("\n11. Recent backend logs for debugging:")
import subprocess
logs = subprocess.run(
    ["docker", "logs", "deer-flow-backend", "--tail", "30"],
    capture_output=True,
    text=True
)
for line in logs.stdout.split('\n') + logs.stderr.split('\n'):
    if "[RAG]" in line or "session_id" in line:
        print(f"  {line}")