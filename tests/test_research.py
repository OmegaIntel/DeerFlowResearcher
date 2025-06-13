#!/usr/bin/env python3

import requests
import json

def get_token():
    # Login to get token
    login_data = {
        'username': 'test@example.com', 
        'password': 'testpass123'
    }
    
    token_response = requests.post(
        'http://localhost:8000/api/token',
        data=login_data
    )
    
    if token_response.status_code == 200:
        token_data = token_response.json()
        return token_data['access_token']
    else:
        print(f"Token error: {token_response.text}")
        return None

def test_research_tool(token):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test @research tool
    request_data = {
        'messages': [{'role': 'user', 'content': 'What are the latest developments in AI?'}],
        'thread_id': 'test-research-123',
        'tool_id': 'research',
        'tool_type': 'agent'
    }
    
    print(f"Testing research tool with:")
    print(f"Headers: {headers}")
    print(f"Data: {json.dumps(request_data, indent=2)}")
    
    response = requests.post(
        'http://localhost:8000/api/chat/tool',
        headers=headers,
        json=request_data,
        stream=True
    )
    
    print(f"Research response: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    
    # Read the streaming response
    print("\nStreaming response:")
    for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
        if chunk:
            print(chunk, end='')
    print("\n")

if __name__ == "__main__":
    token = get_token()
    if token:
        print(f"Got token: {token[:20]}...")
        test_research_tool(token)
    else:
        print("Failed to get token")