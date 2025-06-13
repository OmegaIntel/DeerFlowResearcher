#!/usr/bin/env python3
"""
Test cookie handling in browser context
"""

import requests
import json

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://ec2-54-91-85-225.compute-1.amazonaws.com:3000"
API_BASE_URL = f"{BASE_URL}/api"

def test_cookie_auth():
    # Create a session to maintain cookies
    session = requests.Session()
    
    print("\n1. Login...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = session.post(f"{API_BASE_URL}/token", data=login_data)
    if response.ok:
        token = response.json()["access_token"]
        print(f"   Token: {token[:30]}...")
        print(f"   Cookies after login: {session.cookies}")
    else:
        print(f"   Login failed: {response.text}")
        return
    
    # Test with explicit Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n2. Test upload with Bearer token...")
    files = {'file': ('test_cookie.txt', 'Test content for cookie debug', 'text/plain')}
    
    response = session.post(f"{API_BASE_URL}/documents/upload", headers=headers, files=files)
    print(f"   Status: {response.status_code}")
    if response.ok:
        print(f"   Success: {response.json()}")
    else:
        print(f"   Error: {response.text}")
    
    print("\n3. Simulating browser request...")
    # Simulate what the browser is sending
    browser_headers = {
        "Authorization": "Bearer null",  # This is what we see in logs
        "Origin": FRONTEND_URL,
        "Referer": f"{FRONTEND_URL}/"
    }
    
    files = {'file': ('test_browser.txt', 'Test content from browser simulation', 'text/plain')}
    response = requests.post(f"{API_BASE_URL}/documents/upload", headers=browser_headers, files=files)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text[:200]}...")

if __name__ == "__main__":
    test_cookie_auth()