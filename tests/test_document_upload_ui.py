#!/usr/bin/env python3
"""
Test document upload functionality through the Documents page
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_document_upload():
    print("=== Testing Document Upload UI ===\n")
    
    # 1. Login
    print("1. Login...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{API_BASE_URL}/token", data=login_data)
    if response.ok:
        token = response.json()["access_token"]
        print(f"   ✓ Login successful")
    else:
        print(f"   ✗ Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get initial document count
    print("\n2. Get initial documents...")
    response = requests.get(f"{API_BASE_URL}/documents", headers=headers)
    if response.ok:
        data = response.json()
        initial_count = data["total"]
        print(f"   ✓ Initial document count: {initial_count}")
    else:
        print(f"   ✗ Failed to get documents: {response.text}")
        return
    
    # 3. Upload a test document
    print("\n3. Upload test document...")
    test_content = """
    Test Document for Upload UI
    
    This document tests the new upload functionality in the Documents page.
    
    Features tested:
    1. File upload dialog
    2. Drag and drop support
    3. Progress indication
    4. S3 storage
    5. Document processing for RAG
    """
    
    files = {'file': ('test_upload_ui.txt', test_content, 'text/plain')}
    
    response = requests.post(
        f"{API_BASE_URL}/documents/upload",
        headers=headers,
        files=files
    )
    
    if response.ok:
        result = response.json()
        print(f"   ✓ Upload successful!")
        print(f"   Document ID: {result['document']['id']}")
        print(f"   Processing status: {result['document']['processing_status']}")
        doc_id = result['document']['id']
    else:
        print(f"   ✗ Upload failed: {response.text}")
        return
    
    # 4. Wait for processing
    print("\n4. Waiting for document processing...")
    time.sleep(3)
    
    # 5. Verify document appears in list
    print("\n5. Verify document in list...")
    response = requests.get(f"{API_BASE_URL}/documents", headers=headers)
    if response.ok:
        data = response.json()
        new_count = data["total"]
        print(f"   ✓ New document count: {new_count}")
        
        # Find our uploaded document
        uploaded_doc = None
        for doc in data["documents"]:
            if doc["id"] == doc_id:
                uploaded_doc = doc
                break
        
        if uploaded_doc:
            print(f"   ✓ Document found in list!")
            print(f"   - Filename: {uploaded_doc['original_filename']}")
            print(f"   - Status: {uploaded_doc['processing_status']}")
            print(f"   - Vectors: {uploaded_doc['vectors_created']}")
            print(f"   - Chunks: {uploaded_doc['chunks_created']}")
        else:
            print(f"   ✗ Document not found in list")
    else:
        print(f"   ✗ Failed to get documents: {response.text}")
    
    # 6. Test document download
    print("\n6. Test document download...")
    response = requests.get(
        f"{API_BASE_URL}/documents/{doc_id}/download-url",
        headers=headers
    )
    
    if response.ok:
        data = response.json()
        print(f"   ✓ Download URL generated")
        print(f"   URL: {data['download_url'][:50]}...")
    else:
        print(f"   ✗ Failed to get download URL: {response.text}")
    
    print("\n=== Test Complete ===")
    print("\nTo test the UI:")
    print("1. Navigate to http://localhost:3000/documents")
    print("2. Click the 'Upload' button in the header")
    print("3. Drag and drop files or click to select")
    print("4. Watch the upload progress")
    print("5. See documents appear in the grid")

if __name__ == "__main__":
    test_document_upload()