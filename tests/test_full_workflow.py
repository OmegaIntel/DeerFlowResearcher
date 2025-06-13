#!/usr/bin/env python3
"""
Test complete workflow: login, create session, upload document, chat with context
"""

import requests
import json
import uuid
import time

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_full_workflow():
    print("=== FULL WORKFLOW TEST ===\n")
    
    # 1. Login
    print("1. Login...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{API_BASE_URL}/token", data=login_data)
    if response.ok:
        token = response.json()["access_token"]
        print(f"   ✓ Login successful")
    else:
        print(f"   ✗ Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create a new session
    session_id = str(uuid.uuid4())
    print(f"\n2. Create session: {session_id}")
    
    # 3. Upload a document with session
    print("\n3. Upload document to session...")
    test_content = """
    Python Programming Best Practices:
    1. Use meaningful variable names
    2. Follow PEP 8 style guide
    3. Write docstrings for functions
    4. Use type hints
    5. Handle exceptions properly
    """
    
    files = {'file': ('python_best_practices.txt', test_content, 'text/plain')}
    upload_url = f"{API_BASE_URL}/documents/upload?session_id={session_id}"
    
    response = requests.post(upload_url, headers=headers, files=files)
    if response.ok:
        doc_info = response.json()
        print(f"   ✓ Document uploaded: {doc_info['document']['filename']}")
        print(f"   ✓ Chunks created: {doc_info['document']['chunks_created']}")
        print(f"   ✓ Vectors created: {doc_info['document']['vectors_created']}")
    else:
        print(f"   ✗ Upload failed: {response.text}")
        return
    
    # 4. Wait a moment for processing
    print("\n4. Waiting for document processing...")
    time.sleep(2)
    
    # 5. Chat with context from the document
    print("\n5. Chat with document context...")
    chat_data = {
        "message": "What are the Python best practices mentioned in the uploaded document?",
        "temperature": 0.7,
        "max_tokens": 300,
        "thread_id": session_id
    }
    
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    if response.ok:
        print("   Response:")
        full_response = ""
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data_str = line_str[6:]
                    if data_str == '[DONE]':
                        break
                    try:
                        data = json.loads(data_str)
                        if 'content' in data:
                            print(f"   {data['content']}", end='', flush=True)
                            full_response += data['content']
                    except json.JSONDecodeError:
                        pass
        print("\n   ✓ Chat response received")
    else:
        print(f"   ✗ Chat failed: {response.text}")
    
    # 6. List all documents in session
    print("\n6. List documents in session...")
    response = requests.get(f"{API_BASE_URL}/documents?session_id={session_id}", headers=headers)
    if response.ok:
        data = response.json()
        print(f"   ✓ Documents found: {data['total']}")
        for doc in data['documents']:
            print(f"   - {doc['filename']} (status: {doc['processing_status']})")
    
    # 7. Get chat history
    print("\n7. Get chat history...")
    response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
    if response.ok:
        sessions = response.json()
        print(f"   ✓ Total sessions: {len(sessions)}")
        # Note: The session endpoint returns sessions by internal ID, not thread_id
        # This is expected behavior - sessions are created when messages are sent
    
    print("\n=== TEST COMPLETE ===")

if __name__ == "__main__":
    test_full_workflow()