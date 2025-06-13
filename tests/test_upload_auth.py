#!/usr/bin/env python3
import requests
import json

# Test authentication and file upload
def test_auth_and_upload():
    base_url = "http://localhost:8000"
    
    # Step 1: Login
    print("1. Logging in...")
    login_response = requests.post(
        f"{base_url}/api/token",
        data={
            "username": "testuser@example.com",
            "password": "testpassword"
        }
    )
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    print(f"Got token: {token[:20]}...")
    
    # Step 2: Create a test file
    print("\n2. Creating test file...")
    test_content = "This is a test document for upload verification."
    
    # Step 3: Upload file
    print("\n3. Uploading file...")
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    files = {
        "file": ("test_document.txt", test_content, "text/plain")
    }
    
    upload_response = requests.post(
        f"{base_url}/api/documents/upload",
        headers=headers,
        files=files
    )
    
    print(f"Upload status: {upload_response.status_code}")
    print(f"Upload response: {json.dumps(upload_response.json(), indent=2)}")
    
    # Step 4: Get documents list
    print("\n4. Getting documents list...")
    list_response = requests.get(
        f"{base_url}/api/documents",
        headers=headers
    )
    
    if list_response.status_code == 200:
        docs = list_response.json()
        print(f"Found {docs['total']} documents:")
        for doc in docs['documents']:
            print(f"  - {doc['original_filename']} ({doc['processing_status']})")
    else:
        print(f"Failed to get documents: {list_response.text}")

if __name__ == "__main__":
    test_auth_and_upload()