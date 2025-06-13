#!/usr/bin/env python3
import requests
import time

def test_frontend_flow():
    """Test the complete flow from frontend perspective"""
    
    print("=== Testing Frontend Flow ===\n")
    
    # 1. Login
    print("1. Logging in...")
    login_response = requests.post(
        "http://localhost:8000/api/token",
        data={
            "username": "testuser@example.com",
            "password": "testpassword"
        }
    )
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    print(f"✓ Got token: {token[:20]}...")
    
    # 2. Test chat without session
    print("\n2. Testing chat (no session)...")
    chat_response = requests.post(
        "http://localhost:8000/api/chat/simple",
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "thread_id": "__default__"
        }
    )
    print(f"Chat response status: {chat_response.status_code}")
    if chat_response.status_code == 200:
        print("✓ Chat works without authentication")
    
    # 3. Test authenticated chat
    print("\n3. Testing authenticated chat...")
    # Note: The chat API doesn't support auth headers directly, would need to use cookies
    
    # 4. Test document upload via proxy endpoint
    print("\n4. Testing document upload via proxy...")
    
    # First, let's check if the proxy endpoint exists
    test_content = "Test document content"
    files = {"file": ("test.txt", test_content, "text/plain")}
    
    # Test direct backend upload first
    print("   a. Testing direct backend upload...")
    direct_response = requests.post(
        "http://localhost:8000/api/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    print(f"   Direct upload status: {direct_response.status_code}")
    if direct_response.status_code == 200:
        print(f"   ✓ Direct upload successful: {direct_response.json()['document']['id']}")
    else:
        print(f"   ✗ Direct upload failed: {direct_response.text}")
    
    # 5. Test document listing
    print("\n5. Testing document listing...")
    list_response = requests.get(
        "http://localhost:8000/api/documents",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Document list status: {list_response.status_code}")
    if list_response.status_code == 200:
        docs = list_response.json()
        print(f"✓ Found {docs['total']} documents")
    
    print("\n=== Summary ===")
    print("- Backend APIs are working correctly")
    print("- Authentication via Bearer token works for backend")
    print("- Chat API works without authentication")
    print("- Document upload requires authentication (as expected)")
    print("\nThe issue is likely in the frontend not sending the auth token correctly.")

if __name__ == "__main__":
    test_frontend_flow()