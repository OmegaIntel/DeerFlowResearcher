#!/usr/bin/env python3
"""
Test if session_id is being added to Pinecone metadata
"""

import requests
import uuid
import time
import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

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
print("✓ Logged in")

# Create unique session ID
session_id = f"metadata_test_{uuid.uuid4()}"
print(f"\n2. Session ID: {session_id}")

# Create test file
test_content = f"This is a test document for session {session_id}. It contains unique content to identify it."
test_file = "/tmp/test_metadata.txt"
with open(test_file, "w") as f:
    f.write(test_content)

# Upload with session ID
print(f"\n3. Uploading document...")
with open(test_file, "rb") as f:
    files = {"file": ("test_metadata.txt", f, "text/plain")}
    upload_url = f"{API_BASE_URL}/documents/upload?session_id={session_id}"
    response = requests.post(upload_url, files=files, headers=headers)

if response.status_code != 200:
    print(f"Upload failed: {response.text}")
    exit(1)

result = response.json()
doc_id = result['document']['id']
print(f"✓ Document uploaded with ID: {doc_id}")

# Wait for processing
print("\n4. Waiting for processing...")
time.sleep(5)

# Check backend logs
print("\n5. Checking backend logs for session_id processing...")
import subprocess
logs = subprocess.run(
    ["docker", "logs", "deer-flow-backend", "--tail", "50"],
    capture_output=True,
    text=True
)

found_processing = False
for line in logs.stdout.split('\n') + logs.stderr.split('\n'):
    if "DOCUMENT_PROCESSOR" in line or f"session_id: {session_id}" in line:
        print(f"  LOG: {line}")
        found_processing = True

if not found_processing:
    print("  ⚠️  No processing logs found for session_id")

# Check Pinecone directly
print("\n6. Checking Pinecone metadata...")
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
index = pc.Index('omegaintel-docs')

# Search for vectors with our document_id
stats = index.describe_index_stats()
print(f"  Index has {stats.total_vector_count} vectors")

# Query with a filter for our document
query_result = index.query(
    vector=[0.0] * 1536,
    top_k=10,
    include_metadata=True,
    filter={"document_id": doc_id}
)

print(f"\n7. Found {len(query_result.matches)} chunks for document {doc_id}:")
for match in query_result.matches:
    print(f"  - Chunk metadata: {match.metadata}")
    if 'session_id' in match.metadata:
        print(f"    ✓ session_id found: {match.metadata['session_id']}")
    else:
        print(f"    ✗ session_id NOT found in metadata")

# Cleanup
os.remove(test_file)

# Summary
has_session_id = any('session_id' in match.metadata for match in query_result.matches if match.metadata)
print(f"\n8. Summary:")
print(f"  - Document ID: {doc_id}")
print(f"  - Session ID: {session_id}")
print(f"  - Session ID in metadata: {'✓ YES' if has_session_id else '✗ NO'}")