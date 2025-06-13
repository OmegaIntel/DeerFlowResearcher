#!/usr/bin/env python3
"""
Automated test script to debug authentication and upload flow.
"""

import requests
import json
from datetime import datetime
import time

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_mock_user_upload():
    """Test upload flow with mock authentication"""
    
    print(f"\n{'='*60}")
    print(f"Testing Upload Flow - {datetime.now()}")
    print(f"{'='*60}\n")
    
    # Step 1: Register a test user
    print("1. Registering test user...")
    register_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/register", data=register_data)
        print(f"   Registration status: {response.status_code}")
        if response.ok:
            print(f"   Response: {response.json()}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Step 2: Login to get token
    print("\n2. Logging in...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    token = None
    try:
        response = requests.post(f"{API_BASE_URL}/token", data=login_data)
        print(f"   Login status: {response.status_code}")
        if response.ok:
            data = response.json()
            token = data.get("access_token")
            print(f"   Token received: {token[:30]}..." if token else "No token")
            print(f"   User info: {data.get('user')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    if not token:
        print("\n   Failed to get auth token. Stopping test.")
        return
    
    # Step 3: Test authenticated endpoints
    headers = {
        "Authorization": f"Bearer {token}",
    }
    
    print("\n3. Testing /api/users/me...")
    try:
        response = requests.get(f"{API_BASE_URL}/users/me", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.ok:
            print(f"   User data: {response.json()}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Step 4: Test document listing
    print("\n4. Testing /api/documents...")
    try:
        response = requests.get(f"{API_BASE_URL}/documents", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.ok:
            data = response.json()
            print(f"   Total documents: {data.get('total', 0)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Step 5: Test file upload
    print("\n5. Testing file upload...")
    test_content = "This is an automated test file.\nCreated for debugging authentication."
    
    files = {
        'file': ('test_automated.txt', test_content, 'text/plain')
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/documents/upload",
            headers=headers,
            files=files
        )
        print(f"   Upload status: {response.status_code}")
        print(f"   Response headers: {dict(response.headers)}")
        if response.ok:
            print(f"   Upload result: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"   Error response: {response.text}")
            print(f"   Error headers: {dict(response.headers)}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    test_mock_user_upload()