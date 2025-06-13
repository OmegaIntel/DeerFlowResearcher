#!/usr/bin/env python3
"""
Debug frontend authentication flow
"""

import requests
import json
import time

BASE_URL = "http://localhost:3000"
API_URL = "http://localhost:8000/api"

def test_frontend_auth():
    print("=== Testing Frontend Auth Flow ===\n")
    
    # Create a session to maintain cookies
    session = requests.Session()
    
    # 1. Try to access chat-history page without auth
    print("1. Access chat-history without auth...")
    response = session.get(f"{BASE_URL}/chat-history")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✓ Page loaded")
    else:
        print("   Page might be protected")
    
    # 2. Check if there's a redirect
    if response.history:
        for resp in response.history:
            print(f"   Redirect: {resp.status_code} -> {resp.url}")
    
    # 3. Try to login via backend
    print("\n2. Login via backend API...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{API_URL}/token", data=login_data)
    if response.ok:
        token = response.json()["access_token"]
        print(f"   ✓ Got token: {token[:20]}...")
        
        # Set the token in cookies like the frontend would
        session.cookies.set('authToken', token, domain='localhost', path='/')
        print("   ✓ Set authToken cookie")
    else:
        print(f"   ✗ Login failed: {response.text}")
        return
    
    # 4. Try to access chat-history again with auth cookie
    print("\n3. Access chat-history with auth cookie...")
    response = session.get(f"{BASE_URL}/chat-history")
    print(f"   Status: {response.status_code}")
    
    # 5. Try direct API call from frontend perspective
    print("\n4. Test API call with token...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_URL}/chat/sessions", headers=headers)
    if response.ok:
        sessions = response.json()
        print(f"   ✓ API call successful, found {len(sessions)} sessions")
    else:
        print(f"   ✗ API call failed: {response.text}")
    
    # 6. Check frontend's debug auth endpoint
    print("\n5. Check frontend debug auth endpoint...")
    response = session.get(f"{BASE_URL}/api/debug/auth")
    print(f"   Status: {response.status_code}")
    if response.ok:
        print(f"   Response: {response.text[:200]}...")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_frontend_auth()