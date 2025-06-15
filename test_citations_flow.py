#!/usr/bin/env python3
"""Test the complete citations flow"""

import requests
import json
import time

API_BASE = "http://localhost:8000"

def test_citations():
    # Test user credentials
    email = "chetan@omegaintelligence.ai"
    password = "Test123."
    
    # Login
    print("1. Logging in...")
    login_resp = requests.post(f"{API_BASE}/api/token", data={
        "username": email,
        "password": password
    })
    
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.text}")
        return
        
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get user info
    print("2. Getting user info...")
    user_resp = requests.get(f"{API_BASE}/api/auth/me", headers=headers)
    user = user_resp.json()
    print(f"User: {user}")
    
    # Check documents
    print("\n3. Checking user documents...")
    docs_resp = requests.get(f"{API_BASE}/api/documents", headers=headers)
    if docs_resp.status_code == 200:
        docs = docs_resp.json()
        print(f"User has {len(docs)} documents")
        for doc in docs[:3]:
            print(f"  - {doc['id']}: {doc['filename']}")
    
    # Test chat with citations
    print("\n4. Testing chat with citations...")
    chat_data = {
        "thread_id": f"test-citations-{int(time.time())}",
        "messages": [{"role": "user", "content": "What are typical SaaS valuation multiples?"}]
    }
    
    chat_resp = requests.post(
        f"{API_BASE}/api/chat/simple", 
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    print("5. Streaming response:")
    citations_found = False
    for line in chat_resp.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data: '):
                try:
                    data = json.loads(line_str[6:])
                    if 'citations' in data and data['citations']:
                        citations_found = True
                        print(f"\nFound {len(data['citations'])} citations!")
                        for i, cit in enumerate(data['citations'][:2]):
                            print(f"  Citation {i+1}: {cit['filename']} (page {cit.get('page_number', 'N/A')})")
                except:
                    pass
    
    if not citations_found:
        print("\nNo citations found in response!")
    
    print("\nTest complete.")

if __name__ == "__main__":
    test_citations()