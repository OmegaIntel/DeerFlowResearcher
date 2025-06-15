#!/usr/bin/env python3
"""Test streaming response to see what's being sent"""

import requests
import json

def test_stream():
    url = "http://localhost:8000/api/chat/simple"
    headers = {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
    }
    
    # Note: This won't work without proper auth, but we can at least see the structure
    payload = {
        "thread_id": "test-thread-123",
        "messages": [{"role": "user", "content": "test"}]
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, stream=True)
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            for line in response.iter_lines():
                if line:
                    print(f"Line: {line.decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_stream()