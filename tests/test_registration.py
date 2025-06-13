#!/usr/bin/env python3
"""
Test registration functionality
"""

import requests
import json
import uuid

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_registration():
    print("=== Testing Registration ===\n")
    
    # Generate unique email
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    
    print(f"1. Testing registration with email: {unique_email}")
    
    # Test with form data (as expected by the backend)
    form_data = {
        "email": unique_email,
        "password": "testpassword123"
    }
    
    response = requests.post(
        f"{API_BASE_URL}/register",
        data=form_data,  # Send as form data, not JSON
        headers={
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )
    
    print(f"   Status: {response.status_code}")
    print(f"   Headers: {dict(response.headers)}")
    
    if response.ok:
        data = response.json()
        print(f"   ✓ Registration successful!")
        print(f"   User ID: {data['id']}")
        print(f"   Email: {data['email']}")
        print(f"   Is Admin: {data['is_admin']}")
        
        # Test login with new credentials
        print("\n2. Testing login with new user...")
        login_data = {
            "username": unique_email,  # Note: login uses 'username' not 'email'
            "password": "testpassword123"
        }
        
        login_response = requests.post(
            f"{API_BASE_URL}/token",
            data=login_data
        )
        
        if login_response.ok:
            token_data = login_response.json()
            print(f"   ✓ Login successful!")
            print(f"   Token: {token_data['access_token'][:30]}...")
        else:
            print(f"   ✗ Login failed: {login_response.status_code}")
            print(f"   Error: {login_response.text}")
    else:
        print(f"   ✗ Registration failed!")
        print(f"   Error: {response.text}")
    
    # Test duplicate registration
    print("\n3. Testing duplicate registration (should fail)...")
    response = requests.post(
        f"{API_BASE_URL}/register",
        data=form_data
    )
    
    if response.status_code == 400:
        print(f"   ✓ Correctly rejected duplicate registration")
        print(f"   Error: {response.json()['detail']}")
    else:
        print(f"   ✗ Unexpected response: {response.status_code}")

if __name__ == "__main__":
    test_registration()