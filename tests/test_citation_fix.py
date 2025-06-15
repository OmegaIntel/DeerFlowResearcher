"""Test citation functionality after fix"""

import requests
import time
import json

# Configuration
API_BASE_URL = "http://localhost:8000/api"
USER_EMAIL = "chetan@omegaintelligence.ai"
USER_PASSWORD = "Test123."

def login():
    """Login and get auth token"""
    response = requests.post(
        f"{API_BASE_URL}/token",
        data={
            "username": USER_EMAIL,
            "password": USER_PASSWORD
        }
    )
    if response.status_code == 200:
        data = response.json()
        return data["access_token"]
    else:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return None

def test_citation_opening():
    """Test if citations can be opened without 404 errors"""
    # Login
    token = login()
    if not token:
        print("❌ Could not login")
        return
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Create a test session
    thread_id = f"test_citation_{int(time.time())}"
    
    print(f"Using thread_id: {thread_id}")
    
    # Upload a test file
    print("\n1. Uploading test document...")
    with open("/root/deer-flow/tests/test_files/medium_length_filename.txt", "rb") as f:
        files = {
            "file": ("test_document.txt", f, "text/plain")
        }
        response = requests.post(
            f"{API_BASE_URL}/documents/upload?session_id={thread_id}",
            files=files,
            headers=headers
        )
    
    if response.status_code != 200:
        print(f"❌ Upload failed: {response.status_code}")
        print(response.text)
        return
    
    upload_data = response.json()
    print(f"Upload response: {upload_data}")
    document_id = upload_data.get("document_id") or upload_data.get("id")
    print(f"✅ Document uploaded: {document_id}")
    
    # Wait for processing
    print("\n2. Waiting for document processing...")
    time.sleep(3)
    
    # Send a chat message that should trigger RAG search
    print("\n3. Sending chat message to trigger RAG search...")
    chat_response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json={
            "messages": [{
                "role": "user",
                "content": "What is in the document?",
                "attachments": []
            }],
            "thread_id": thread_id,
            "agent": "simple"
        },
        headers=headers,
        stream=True
    )
    
    if chat_response.status_code != 200:
        print(f"❌ Chat request failed: {chat_response.status_code}")
        print(chat_response.text)
        return
    
    # Parse streaming response
    citations = None
    full_response = ""
    
    for line in chat_response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    if "content" in data:
                        full_response += data["content"]
                    if "citations" in data and data["citations"]:
                        citations = data["citations"]
                except json.JSONDecodeError:
                    pass
    
    print(f"\n4. Response received. Citations found: {citations is not None}")
    
    if not citations:
        print("❌ No citations found in response")
        print(f"Response content: {full_response[:200]}...")
        return
    
    # Test opening each citation
    print(f"\n5. Testing citation download URLs...")
    success_count = 0
    
    for i, citation in enumerate(citations):
        print(f"\n   Citation {i+1}:")
        print(f"   - ID: {citation['id']}")
        print(f"   - Document ID: {citation['document_id']}")
        print(f"   - Filename: {citation['filename']}")
        
        # Try to get download URL
        url_response = requests.get(
            f"{API_BASE_URL}/documents/{citation['document_id']}/download-url",
            headers=headers
        )
        
        if url_response.status_code == 200:
            print(f"   ✅ Download URL retrieved successfully")
            success_count += 1
        else:
            print(f"   ❌ Failed to get download URL: {url_response.status_code}")
            print(f"   Response: {url_response.text}")
    
    # Summary
    print(f"\n\n📊 Summary:")
    print(f"   Total citations: {len(citations)}")
    print(f"   Successful downloads: {success_count}")
    print(f"   Failed downloads: {len(citations) - success_count}")
    
    if success_count == len(citations):
        print("\n✅ All citations can be opened successfully!")
    else:
        print(f"\n❌ {len(citations) - success_count} citations failed to open")

if __name__ == "__main__":
    print("Testing citation functionality...\n")
    test_citation_opening()