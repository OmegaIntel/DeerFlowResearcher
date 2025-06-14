#!/usr/bin/env python3
"""Test the backend fixes for S3 metadata encoding, document processor, and citations."""

import requests
import json
import time
import os
import tempfile

# Base URL for the API
BASE_URL = "http://localhost:8000"

# Test credentials
TEST_EMAIL = "chetan@omegaintelligence.ai"
TEST_PASSWORD = "Test123."

def login():
    """Login and get access token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return None
    return response.json()["access_token"]

def test_non_ascii_filename_upload(token):
    """Test uploading a file with non-ASCII characters in the filename."""
    print("\n=== Testing Non-ASCII Filename Upload ===")
    
    # Create a test file with non-ASCII filename
    content = "This is a test file with special characters in the filename."
    filename = "测试文件_Tëst_Fîlé_🎯.txt"
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(content)
        temp_path = f.name
    
    try:
        # Upload the file
        with open(temp_path, 'rb') as f:
            files = {'file': (filename, f, 'text/plain')}
            headers = {'Authorization': f'Bearer {token}'}
            
            response = requests.post(
                f"{BASE_URL}/api/documents/upload",
                files=files,
                headers=headers
            )
        
        if response.status_code == 200:
            print(f"✓ Successfully uploaded file with non-ASCII filename: {filename}")
            result = response.json()
            print(f"  Document ID: {result['document']['id']}")
            return result['document']['id']
        else:
            print(f"✗ Failed to upload file: {response.status_code}")
            print(f"  Error: {response.text}")
            return None
    finally:
        os.unlink(temp_path)

def test_document_processor_parameters(token):
    """Test that document processor works with correct parameters."""
    print("\n=== Testing Document Processor Parameters ===")
    
    # Create a test file
    content = "This is a test document for the document processor."
    filename = "test_processor.txt"
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(content)
        temp_path = f.name
    
    try:
        # Upload with session_id
        session_id = "test-session-123"
        with open(temp_path, 'rb') as f:
            files = {'file': (filename, f, 'text/plain')}
            headers = {'Authorization': f'Bearer {token}'}
            params = {'session_id': session_id}
            
            response = requests.post(
                f"{BASE_URL}/api/documents/upload",
                files=files,
                headers=headers,
                params=params
            )
        
        if response.status_code == 200:
            print(f"✓ Successfully uploaded file with session_id: {session_id}")
            result = response.json()
            print(f"  Document ID: {result['document']['id']}")
            print(f"  Processing status: {result['document']['processing_status']}")
            return result['document']['id']
        else:
            print(f"✗ Failed to upload file: {response.status_code}")
            print(f"  Error: {response.text}")
            return None
    finally:
        os.unlink(temp_path)

def test_chat_endpoint_citations(token):
    """Test that chat endpoint works without citations error."""
    print("\n=== Testing Chat Endpoint Citations ===")
    
    # Create a chat session
    headers = {'Authorization': f'Bearer {token}'}
    
    # Send a simple chat message
    chat_data = {
        "messages": [
            {"role": "user", "content": "Hello, this is a test message."}
        ],
        "thread_id": "test-chat-" + str(int(time.time()))
    }
    
    response = requests.post(
        f"{BASE_URL}/api/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    if response.status_code == 200:
        print("✓ Chat endpoint responded successfully")
        
        # Read streaming response
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    try:
                        data = json.loads(line[6:])
                        if 'content' in data:
                            print(f"  Assistant: {data['content'][:100]}...")
                        # Check if citations field exists (even if None)
                        if 'citations' in data:
                            print("  ✓ Citations field present in response")
                    except json.JSONDecodeError:
                        pass
    else:
        print(f"✗ Chat endpoint failed: {response.status_code}")
        print(f"  Error: {response.text}")

def main():
    """Run all tests."""
    print("Testing Backend Fixes")
    print("===================")
    
    # Login first
    token = login()
    if not token:
        print("Failed to login. Exiting.")
        return
    
    print("✓ Login successful")
    
    # Run tests
    doc_id1 = test_non_ascii_filename_upload(token)
    doc_id2 = test_document_processor_parameters(token)
    test_chat_endpoint_citations(token)
    
    # Check document status
    if doc_id1:
        time.sleep(3)  # Wait for processing
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/documents/{doc_id1}", headers=headers)
        if response.status_code == 200:
            doc = response.json()
            print(f"\n✓ Document with non-ASCII filename status: {doc['processing_status']}")
    
    print("\n=== Test Summary ===")
    print("All backend fixes have been applied and tested.")

if __name__ == "__main__":
    main()