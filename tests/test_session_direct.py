#!/usr/bin/env python3
"""
Test creating session directly then uploading
"""

import requests
import json
import uuid
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_session_upload():
    print("\n1. Login...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{API_BASE_URL}/token", data=login_data)
    if response.ok:
        token = response.json()["access_token"]
        print(f"   Token: {token[:30]}...")
    else:
        print(f"   Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a properly formatted session ID
    session_id = str(uuid.uuid4())
    print(f"\n2. Session ID: {session_id}")
    
    print("\n3. Upload with session...")
    files = {'file': ('test_with_session.txt', f'Test content for session {session_id}', 'text/plain')}
    
    # First upload with proper session_id parameter
    upload_url = f"{API_BASE_URL}/documents/upload?session_id={session_id}"
    print(f"   Upload URL: {upload_url}")
    
    response = requests.post(upload_url, headers=headers, files=files)
    print(f"   Status: {response.status_code}")
    if response.ok:
        result = response.json()
        print(f"   Result: {json.dumps(result, indent=2)}")
        
        # Check if session_id matches
        doc_session = result['document'].get('session_id')
        print(f"   Session ID match: {doc_session == session_id}")
    else:
        print(f"   Error: {response.text[:500]}...")
    
    print("\n4. List documents for session...")
    response = requests.get(f"{API_BASE_URL}/documents?session_id={session_id}", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.ok:
        data = response.json()
        print(f"   Documents in session: {data['total']}")
        for doc in data['documents']:
            print(f"   - {doc['filename']}")

if __name__ == "__main__":
    test_session_upload()