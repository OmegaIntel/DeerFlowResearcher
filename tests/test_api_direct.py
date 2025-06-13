#!/usr/bin/env python3
"""
Test API directly to ensure it's working
"""

import requests
import json

# Test from inside container network
def test_api():
    print("=== Testing API Directly ===\n")
    
    # 1. Test backend health
    print("1. Testing backend health...")
    try:
        response = requests.get("http://localhost:8000/")
        print(f"   Backend status: {response.status_code}")
    except Exception as e:
        print(f"   Backend error: {e}")
    
    # 2. Login
    print("\n2. Login...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post("http://localhost:8000/api/token", data=login_data)
    if response.ok:
        token = response.json()["access_token"]
        print(f"   ✓ Login successful")
        print(f"   Token: {token[:30]}...")
    else:
        print(f"   ✗ Login failed: {response.text}")
        return
    
    # 3. Test chat sessions endpoint
    print("\n3. Testing chat sessions endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get("http://localhost:8000/api/chat/sessions", headers=headers)
    print(f"   Status: {response.status_code}")
    print(f"   Headers: {dict(response.headers)}")
    
    if response.ok:
        sessions = response.json()
        print(f"   ✓ Found {len(sessions)} sessions")
        if sessions:
            print(f"   First session: {json.dumps(sessions[0], indent=2)}")
    else:
        print(f"   ✗ Error: {response.text}")
    
    # 4. Test CORS headers
    print("\n4. Testing CORS headers...")
    cors_headers = {
        "Authorization": f"Bearer {token}",
        "Origin": "http://localhost:3000"
    }
    
    response = requests.get("http://localhost:8000/api/chat/sessions", headers=cors_headers)
    print(f"   CORS headers in response:")
    for header in ["Access-Control-Allow-Origin", "Access-Control-Allow-Credentials"]:
        print(f"   - {header}: {response.headers.get(header, 'Not present')}")

if __name__ == "__main__":
    test_api()