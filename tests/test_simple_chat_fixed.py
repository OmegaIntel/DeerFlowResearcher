#!/usr/bin/env python3

import requests
import json

def get_token():
    login_data = {
        'username': 'research@example.com', 
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

def test_simple_chat(token):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    request_data = {
        'messages': [{'role': 'user', 'content': 'Hello, how are you?'}],
        'thread_id': 'test-simple-chat'
    }
    
    print(f"Testing simple chat with: {request_data['messages'][0]['content']}")
    
    response = requests.post(
        'http://localhost:8000/api/chat/simple',
        headers=headers,
        json=request_data,
        stream=True,
        timeout=30
    )
    
    print(f"Simple chat response: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    print("\nStreaming response (parsed):")
    
    # Parse SSE stream
    for line in response.iter_lines(decode_unicode=True):
        if line:
            if line.startswith("event:"):
                event_type = line.split(":", 1)[1].strip()
                print(f"Event: {event_type}")
            elif line.startswith("data:"):
                data_str = line.split(":", 1)[1].strip()
                try:
                    data = json.loads(data_str)
                    print(f"Data: {json.dumps(data, indent=2)}")
                except json.JSONDecodeError as e:
                    print(f"Failed to parse JSON: {e}")
                    print(f"Raw data: {data_str}")

if __name__ == "__main__":
    token = get_token()
    if token:
        print(f"Got token: {token[:20]}...")
        test_simple_chat(token)
    else:
        print("Failed to get token")