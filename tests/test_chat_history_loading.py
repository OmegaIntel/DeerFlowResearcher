#!/usr/bin/env python3
import time
import requests
import json

BASE_URL = "http://localhost:8000/api"
TEST_EMAIL = "chetan@omegaintelligence.ai"
TEST_PASSWORD = "Test123."

def login():
    """Login and get auth token"""
    # Use form data instead of JSON
    form_data = {
        "username": TEST_EMAIL,  # OAuth2 expects 'username' field
        "password": TEST_PASSWORD
    }
    response = requests.post(f"{BASE_URL}/token", data=form_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def create_chat_with_messages(token):
    """Create a new chat session and send some messages"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a new chat session
    response = requests.post(f"{BASE_URL}/chat/sessions", 
                           headers=headers,
                           json={"title": "Test Chat History", "mode": "chat"})
    if response.status_code != 200:
        print(f"Failed to create session: {response.text}")
        return None
        
    session = response.json()
    thread_id = session["thread_id"]
    print(f"Created chat session with thread_id: {thread_id}")
    
    # Send some messages
    messages = [
        "Hello, this is my first message",
        "Can you help me with Python?",
        "What is the weather today?"
    ]
    
    for i, msg in enumerate(messages):
        print(f"Sending message {i+1}: {msg}")
        response = requests.post(f"{BASE_URL}/chat/simple", 
                               headers=headers,
                               json={"message": msg, "thread_id": thread_id})
        if response.status_code == 200:
            # Read the streaming response
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        if data.get("type") == "message" and data.get("data", {}).get("content"):
                            print(f"Response: {data['data']['content'][:50]}...")
                    except:
                        pass
        else:
            print(f"Failed to send message: {response.text}")
        
        time.sleep(1)  # Wait between messages
    
    return thread_id

def test_load_chat_history(token, thread_id):
    """Test loading chat history by thread_id"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\nTesting chat history loading for thread_id: {thread_id}")
    
    # Get chat session by thread_id
    response = requests.get(f"{BASE_URL}/chat/sessions/by-thread/{thread_id}", 
                          headers=headers)
    
    if response.status_code == 200:
        session_data = response.json()
        print(f"\nSuccessfully loaded chat session:")
        print(f"  - Session ID: {session_data['id']}")
        print(f"  - Thread ID: {session_data['thread_id']}")
        print(f"  - Title: {session_data.get('title', 'No title')}")
        print(f"  - Mode: {session_data['mode']}")
        print(f"  - Number of messages: {len(session_data['messages'])}")
        
        print("\nMessages in session:")
        for i, msg in enumerate(session_data['messages']):
            print(f"  {i+1}. [{msg['role']}] {msg['content'][:100]}...")
            
        return True
    else:
        print(f"Failed to load chat history: {response.status_code} - {response.text}")
        return False

def main():
    print("Testing Chat History Loading Functionality")
    print("=" * 50)
    
    # Login
    token = login()
    if not token:
        print("Failed to login")
        return
    
    print("Login successful!")
    
    # Create a chat with messages
    thread_id = create_chat_with_messages(token)
    if not thread_id:
        print("Failed to create chat session")
        return
    
    # Wait a bit for messages to be saved
    time.sleep(2)
    
    # Test loading the chat history
    success = test_load_chat_history(token, thread_id)
    
    if success:
        print("\n✅ Chat history loading test PASSED!")
        print(f"\nTo test in the UI:")
        print(f"1. Go to http://localhost:3000/chat-history")
        print(f"2. Find the chat titled 'Test Chat History'")
        print(f"3. Click 'Continue Chat'")
        print(f"4. You should see all the previous messages loaded in the chat")
        print(f"\nDirect link: http://localhost:3000/chat?thread={thread_id}")
    else:
        print("\n❌ Chat history loading test FAILED!")

if __name__ == "__main__":
    main()