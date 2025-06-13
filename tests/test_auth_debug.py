#!/usr/bin/env python3
"""
Test script to debug authentication flow.
Run this after logging in through the web interface.
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_auth_flow(token):
    """Test authentication with the provided token"""
    
    print(f"\n{'='*60}")
    print(f"Testing Authentication Flow - {datetime.now()}")
    print(f"{'='*60}\n")
    
    print(f"Token preview: {token[:30]}..." if token else "No token provided")
    print(f"Token length: {len(token) if token else 0}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test 1: Get current user
    print("\n1. Testing /api/users/me endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/users/me", headers=headers)
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        if response.ok:
            print(f"   Response: {response.json()}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test 2: Get documents
    print("\n2. Testing /api/documents endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/documents", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.ok:
            data = response.json()
            print(f"   Total documents: {data.get('total', 0)}")
            print(f"   Response preview: {json.dumps(data, indent=2)[:200]}...")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test 3: Test upload (dry run)
    print("\n3. Testing upload endpoint (OPTIONS)...")
    try:
        response = requests.options(f"{API_BASE_URL}/documents/upload")
        print(f"   Status: {response.status_code}")
        print(f"   Allowed methods: {response.headers.get('Allow', 'Not specified')}")
        print(f"   CORS headers: {response.headers.get('Access-Control-Allow-Origin', 'Not set')}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    print(f"\n{'='*60}\n")

def main():
    print("\nDeer Flow Authentication Debug Tool")
    print("==================================\n")
    
    print("To get your auth token:")
    print("1. Log in through the web interface at http://localhost:3000")
    print("2. Open browser DevTools (F12)")
    print("3. Go to Application -> Cookies -> http://localhost:3000")
    print("4. Copy the value of the 'authToken' cookie\n")
    
    token = input("Paste your auth token here (or press Enter to skip): ").strip()
    
    if token:
        test_auth_flow(token)
    else:
        print("\nNo token provided. Please log in first and get your token from browser cookies.")
        print("\nAlternatively, you can test login programmatically:")
        email = input("Email (or press Enter to skip): ").strip()
        if email:
            password = input("Password: ").strip()
            
            # Test login
            print("\nTesting login...")
            form_data = {
                "username": email,
                "password": password
            }
            try:
                response = requests.post(f"{API_BASE_URL}/token", data=form_data)
                print(f"Login status: {response.status_code}")
                if response.ok:
                    data = response.json()
                    token = data.get("access_token")
                    print(f"Login successful! Token: {token[:30]}...")
                    test_auth_flow(token)
                else:
                    print(f"Login failed: {response.text}")
            except Exception as e:
                print(f"Login exception: {e}")

if __name__ == "__main__":
    main()