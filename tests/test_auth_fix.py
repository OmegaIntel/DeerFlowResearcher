#!/usr/bin/env python3
"""
Test script to verify authentication fixes
"""

import requests
import json

# Configuration
BASE_URL = "http://ec2-54-91-85-225.compute-1.amazonaws.com:8000"
API_URL = f"{BASE_URL}/api"

def test_login():
    """Test login and get token"""
    print("1. Testing login...")
    
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{API_URL}/token", data=login_data)
    print(f"Login response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        print(f"Login successful! Token: {token[:20]}...")
        return token
    else:
        print(f"Login failed: {response.text}")
        return None

def test_authenticated_request(token):
    """Test authenticated API request"""
    print("\n2. Testing authenticated request...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(f"{API_URL}/users/me", headers=headers)
    print(f"Get user response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"User data: {json.dumps(data, indent=2)}")
        return True
    else:
        print(f"Failed to get user: {response.text}")
        return False

def test_document_upload(token):
    """Test document upload with authentication"""
    print("\n3. Testing document upload...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Create a test file
    files = {
        'file': ('test.txt', 'This is a test document content', 'text/plain')
    }
    
    response = requests.post(
        f"{API_URL}/documents/upload",
        headers=headers,
        files=files
    )
    
    print(f"Upload response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Upload successful: {json.dumps(data, indent=2)}")
        return True
    else:
        print(f"Upload failed: {response.text}")
        # Print headers for debugging
        print(f"Request headers sent: {headers}")
        return False

def main():
    """Run all tests"""
    print("Testing Authentication Fix")
    print("=" * 50)
    
    # Test login
    token = test_login()
    if not token:
        print("\nLogin failed - cannot continue tests")
        return
    
    # Test authenticated request
    if test_authenticated_request(token):
        print("\nAuthenticated request successful!")
    
    # Test document upload
    if test_document_upload(token):
        print("\nDocument upload successful!")
    else:
        print("\nDocument upload failed - this is the issue to fix")

if __name__ == "__main__":
    main()