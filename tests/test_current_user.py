#!/usr/bin/env python3
"""
Test which user is currently authenticated
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_current_user():
    print("=== Testing Current User ===\n")
    
    # Test with different credentials
    test_users = [
        ("test@example.com", "testpassword123"),
        ("chetan@omegaintelligence.ai", "testpassword123"),  # Try this one
    ]
    
    for email, password in test_users:
        print(f"\n--- Testing with {email} ---")
        
        # 1. Login
        print("1. Login...")
        login_data = {
            "username": email,
            "password": password
        }
        
        response = requests.post(f"{API_BASE_URL}/token", data=login_data)
        if not response.ok:
            print(f"   ✗ Login failed: {response.status_code}")
            continue
            
        token = response.json()["access_token"]
        print(f"   ✓ Login successful")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Get current user
        print("\n2. Get current user info...")
        response = requests.get(f"{API_BASE_URL}/users/current", headers=headers)
        
        if response.ok:
            user = response.json()
            print(f"   ✓ Current user:")
            print(f"   - ID: {user.get('id', 'N/A')}")
            print(f"   - Email: {user.get('email', 'N/A')}")
        else:
            print(f"   ✗ Error: {response.status_code}")
        
        # 3. Get chat sessions for this user
        print("\n3. Get chat sessions...")
        response = requests.get(f"{API_BASE_URL}/chat/sessions", headers=headers)
        
        if response.ok:
            sessions = response.json()
            print(f"   ✓ Found {len(sessions)} sessions")
        else:
            print(f"   ✗ Error: {response.status_code}")

if __name__ == "__main__":
    test_current_user()