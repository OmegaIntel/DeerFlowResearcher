#!/usr/bin/env python3
"""
Test authentication flow as it would happen in browser
"""

import requests
import json

# Use the actual EC2 URLs as configured
FRONTEND_URL = "http://ec2-54-91-85-225.compute-1.amazonaws.com:3000"
API_BASE_URL = "http://ec2-54-91-85-225.compute-1.amazonaws.com:8000/api"

def test_browser_flow():
    print("=== Browser Authentication Flow Test ===\n")
    
    # Step 1: Login (simulating what the frontend does)
    print("1. Login via API...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{API_BASE_URL}/token", data=login_data)
    if response.ok:
        token_data = response.json()
        token = token_data["access_token"]
        print(f"   ✓ Token received: {token[:30]}...")
    else:
        print(f"   ✗ Login failed: {response.text}")
        return
    
    # Step 2: Test upload with token
    print("\n2. Upload with Bearer token...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Origin": FRONTEND_URL,
        "Referer": f"{FRONTEND_URL}/"
    }
    
    files = {'file': ('test_auth.txt', 'Testing authentication flow', 'text/plain')}
    
    response = requests.post(
        f"{API_BASE_URL}/documents/upload",
        headers=headers,
        files=files
    )
    
    print(f"   Status: {response.status_code}")
    if response.ok:
        print(f"   ✓ Upload successful")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"   ✗ Upload failed: {response.text}")
    
    # Step 3: Test what happens with null token (current browser behavior)
    print("\n3. Test with 'Bearer null' (current browser behavior)...")
    bad_headers = {
        "Authorization": "Bearer null",
        "Origin": FRONTEND_URL,
        "Referer": f"{FRONTEND_URL}/"
    }
    
    files = {'file': ('test_null.txt', 'Testing null token', 'text/plain')}
    
    response = requests.post(
        f"{API_BASE_URL}/documents/upload",
        headers=bad_headers,
        files=files
    )
    
    print(f"   Status: {response.status_code}")
    print(f"   Expected: 401 Unauthorized")
    print(f"   Response: {response.text[:100]}...")

if __name__ == "__main__":
    test_browser_flow()