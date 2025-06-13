#!/usr/bin/env python3
"""
Test simple document upload without session
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_simple_upload():
    print("\n1. Login as existing user...")
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
    
    print("\n2. Upload without session...")
    files = {'file': ('test_no_session.txt', 'Test content without session', 'text/plain')}
    
    response = requests.post(f"{API_BASE_URL}/documents/upload", headers=headers, files=files)
    print(f"   Status: {response.status_code}")
    if response.ok:
        print(f"   Result: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"   Error: {response.text}")
    
    print("\n3. List documents...")
    response = requests.get(f"{API_BASE_URL}/documents", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.ok:
        data = response.json()
        print(f"   Total documents: {data['total']}")
        for doc in data['documents']:
            print(f"   - {doc['filename']} (session: {doc.get('session_id', 'None')})")

if __name__ == "__main__":
    test_simple_upload()