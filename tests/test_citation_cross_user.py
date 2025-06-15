"""Test that citations from other users' documents are filtered out"""

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

def test_cross_user_filtering():
    """Test that documents from other users are filtered out"""
    # Login
    token = login()
    if not token:
        print("❌ Could not login")
        return
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Create a test session
    thread_id = f"test_cross_user_{int(time.time())}"
    
    print(f"Using thread_id: {thread_id}")
    
    # Send a chat message about SaaS valuation (which might find documents from other users)
    print("\n1. Sending chat message about SaaS valuation...")
    chat_response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json={
            "messages": [{
                "role": "user",
                "content": "What are the valuation multiples for SaaS companies?",
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
    
    print(f"\n2. Response received. Citations found: {citations is not None}")
    
    if not citations:
        print("✅ No citations found - this is expected if user has no documents about SaaS")
        print(f"Response: {full_response[:300]}...")
        return
    
    # Test opening each citation
    print(f"\n3. Testing {len(citations)} citations...")
    all_accessible = True
    
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
            print(f"   ✅ Document is accessible (belongs to current user)")
        else:
            print(f"   ❌ Document not accessible: {url_response.status_code}")
            all_accessible = False
    
    # Summary
    if all_accessible and citations:
        print("\n✅ All citations are from documents owned by the current user!")
    elif not citations:
        print("\n✅ No citations returned - validation is working correctly!")
    else:
        print("\n❌ Some citations were from documents not owned by the current user")

if __name__ == "__main__":
    print("Testing cross-user citation filtering...\n")
    test_cross_user_filtering()