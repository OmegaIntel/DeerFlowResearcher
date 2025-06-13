#!/usr/bin/env python3
"""
Test chat API functionality
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

def test_chat():
    print("\n1. Login...")
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{API_BASE_URL}/token", data=login_data)
    if response.ok:
        token = response.json()["access_token"]
        print(f"   Token: {token[:30]}...")
    else:
        print(f"   Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n2. Test simple chat...")
    chat_data = {
        "message": "Hello, how are you?",
        "temperature": 0.7,
        "max_tokens": 150
    }
    
    # Test streaming response
    print("   Sending chat request...")
    response = requests.post(
        f"{API_BASE_URL}/chat/simple",
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    print(f"   Status: {response.status_code}")
    if response.ok:
        print("   Response:")
        full_response = ""
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data_str = line_str[6:]
                    if data_str == '[DONE]':
                        break
                    try:
                        data = json.loads(data_str)
                        if 'content' in data:
                            print(f"   {data['content']}", end='', flush=True)
                            full_response += data['content']
                    except json.JSONDecodeError:
                        pass
        print("\n   Complete response received")
    else:
        print(f"   Error: {response.text}")

if __name__ == "__main__":
    test_chat()