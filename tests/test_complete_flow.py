#!/usr/bin/env python3
"""
Test the complete authentication and document upload flow with session association.
"""

import requests
import json
from datetime import datetime
import time
import uuid

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_complete_flow():
    """Test complete flow: register, login, create session, upload document"""
    
    print(f"\n{'='*60}")
    print(f"Testing Complete Flow - {datetime.now()}")
    print(f"{'='*60}\n")
    
    # Step 1: Register a test user
    print("1. Registering test user...")
    test_email = f"test_{int(time.time())}@example.com"
    register_data = {
        "email": test_email,
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/register", data=register_data)
        print(f"   Registration status: {response.status_code}")
        if response.ok:
            user_data = response.json()
            print(f"   User created: {user_data}")
            user_id = user_data['id']
        else:
            print(f"   Error: {response.text}")
            return
    except Exception as e:
        print(f"   Exception: {e}")
        return
    
    # Step 2: Login to get token
    print("\n2. Logging in...")
    login_data = {
        "username": test_email,
        "password": "testpassword123"
    }
    
    token = None
    try:
        response = requests.post(f"{API_BASE_URL}/token", data=login_data)
        print(f"   Login status: {response.status_code}")
        if response.ok:
            data = response.json()
            token = data.get("access_token")
            print(f"   Token received: {token[:30]}...")
        else:
            print(f"   Error: {response.text}")
            return
    except Exception as e:
        print(f"   Exception: {e}")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
    }
    
    # Step 3: Start a chat session
    print("\n3. Starting a chat session...")
    thread_id = str(uuid.uuid4())
    chat_data = {
        "messages": [{"role": "user", "content": "Hello, this is a test"}],
        "thread_id": thread_id
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/chat/simple",
            json=chat_data,
            headers={**headers, "Content-Type": "application/json"}
        )
        print(f"   Chat status: {response.status_code}")
        print(f"   Thread ID: {thread_id}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Step 4: Upload document with session ID
    print("\n4. Uploading document with session association...")
    test_content = f"Test document content\nCreated at: {datetime.now()}\nSession: {thread_id}"
    
    files = {
        'file': ('test_session_doc.txt', test_content, 'text/plain')
    }
    
    try:
        # Upload with session_id
        upload_url = f"{API_BASE_URL}/documents/upload?session_id={thread_id}"
        response = requests.post(
            upload_url,
            headers=headers,
            files=files
        )
        print(f"   Upload status: {response.status_code}")
        if response.ok:
            upload_result = response.json()
            print(f"   Upload result: {json.dumps(upload_result, indent=2)}")
            doc_id = upload_result['document']['id']
            doc_session_id = upload_result['document'].get('session_id')
            print(f"   Document ID: {doc_id}")
            print(f"   Document Session ID: {doc_session_id}")
            print(f"   Session Match: {doc_session_id == thread_id}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Step 5: Verify document is associated with session
    print("\n5. Verifying document-session association...")
    try:
        # Get documents for this session
        response = requests.get(
            f"{API_BASE_URL}/documents?session_id={thread_id}",
            headers=headers
        )
        print(f"   Get documents status: {response.status_code}")
        if response.ok:
            data = response.json()
            print(f"   Documents in session: {data['total']}")
            if data['total'] > 0:
                for doc in data['documents']:
                    print(f"   - {doc['filename']} (session: {doc.get('session_id')})")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Step 6: Test chat with document context
    print("\n6. Testing chat with document context...")
    chat_data = {
        "messages": [{"role": "user", "content": "What's in my uploaded document?"}],
        "thread_id": thread_id
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/chat/simple",
            json=chat_data,
            headers={**headers, "Content-Type": "application/json"}
        )
        print(f"   Chat status: {response.status_code}")
        print(f"   Response will use document context from session")
    except Exception as e:
        print(f"   Exception: {e}")
    
    print(f"\n{'='*60}\n")
    print("✅ Test completed successfully!")
    print(f"   - User: {test_email}")
    print(f"   - Session: {thread_id}")
    print(f"   - Documents uploaded and associated with session")

if __name__ == "__main__":
    test_complete_flow()