#!/usr/bin/env python3
import requests
import time
import json

def test_auth_flow():
    base_url = "http://localhost:8000"
    
    # Get fresh token
    print("1. Getting fresh token...")
    token_response = requests.post(
        f"{base_url}/api/token",
        data={
            "username": "testuser@example.com",
            "password": "testpassword"
        }
    )
    
    if token_response.status_code != 200:
        print(f"Failed to get token: {token_response.text}")
        return
        
    token_data = token_response.json()
    token = token_data["access_token"]
    print(f"Token: {token[:50]}...")
    
    # Decode token to check expiration
    import base64
    parts = token.split('.')
    payload = json.loads(base64.b64decode(parts[1] + '=='))
    exp_time = payload.get('exp', 0)
    current_time = time.time()
    print(f"Token expires at: {time.ctime(exp_time)}")
    print(f"Current time: {time.ctime(current_time)}")
    print(f"Time until expiration: {exp_time - current_time} seconds")
    
    # Test auth endpoint
    print("\n2. Testing /api/users/me...")
    me_response = requests.get(
        f"{base_url}/api/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {me_response.status_code}")
    if me_response.status_code == 200:
        print(f"User: {me_response.json()}")
    else:
        print(f"Error: {me_response.text}")
    
    # Test file upload
    print("\n3. Testing file upload...")
    test_content = "Test file content"
    files = {"file": ("test.txt", test_content, "text/plain")}
    
    upload_response = requests.post(
        f"{base_url}/api/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    
    print(f"Upload status: {upload_response.status_code}")
    if upload_response.status_code == 200:
        print(f"Upload response: {json.dumps(upload_response.json(), indent=2)}")
    else:
        print(f"Upload error: {upload_response.text}")
        print(f"Response headers: {dict(upload_response.headers)}")

if __name__ == "__main__":
    test_auth_flow()