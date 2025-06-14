import requests
import json
import time
from datetime import datetime

def test_chat_creation_and_history():
    print("="*60)
    print("Testing Chat Creation and History UI")
    print("="*60)
    
    # First, let's login via API to get token
    print("\n1. Logging in via API...")
    login_url = "http://ec2-54-91-85-225.compute-1.amazonaws.com:8000/api/token"
    login_data = {
        "username": "test2@example.com",  # OAuth2PasswordRequestForm expects 'username' field
        "password": "testpass123"
    }
    
    session = requests.Session()
    login_response = session.post(login_url, data=login_data)
    print(f"   Login status: {login_response.status_code}")
    
    if login_response.status_code != 200:
        print(f"   Login failed: {login_response.text}")
        return False
    
    # Get the auth token from response
    token_data = login_response.json()
    auth_token = token_data.get('access_token')
    print(f"   Auth token obtained: {'Yes' if auth_token else 'No'}")
    
    # Create a chat session
    print("\n2. Creating a new chat session...")
    chat_url = "http://ec2-54-91-85-225.compute-1.amazonaws.com:8000/api/chat/simple"
    
    test_message = "What is the capital of France?"
    thread_id = f"test_thread_{int(time.time())}"
    chat_data = {
        "messages": [{"role": "user", "content": test_message}],
        "thread_id": thread_id
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}" if auth_token else ""
    }
    
    chat_response = session.post(
        chat_url, 
        json=chat_data,
        headers=headers,
        stream=True
    )
    
    print(f"   Chat response status: {chat_response.status_code}")
    
    if chat_response.status_code != 200:
        print(f"   Chat creation failed: {chat_response.text}")
        return False
    
    # Parse the streaming response to get session_id
    session_id = None
    response_data = []
    for line in chat_response.iter_lines():
        if line:
            try:
                line_str = line.decode('utf-8')
                print(f"   Response line: {line_str[:100]}...")  # Debug output
                if line_str.startswith('data: '):
                    data_str = line_str[6:]
                    if data_str != '[DONE]':
                        data = json.loads(data_str)
                        response_data.append(data)
                        if 'session_id' in data:
                            session_id = data['session_id']
                            print(f"   Session ID: {session_id}")
                        if 'thread_id' in data:
                            print(f"   Thread ID: {data['thread_id']}")
            except Exception as e:
                print(f"   Error parsing line: {e}")
    
    # We'll use thread_id instead of session_id
    if not thread_id:
        print("   Failed to get thread ID")
        return False
    
    print(f"   Using thread_id: {thread_id}")
    
    # Wait a bit for the session to be saved
    print("\n3. Waiting for session to be saved...")
    time.sleep(2)
    
    # Get chat history
    print("\n4. Fetching chat history...")
    history_url = "http://ec2-54-91-85-225.compute-1.amazonaws.com:8000/api/chat/sessions"
    
    history_response = session.get(history_url, headers=headers)
    print(f"   History response status: {history_response.status_code}")
    
    if history_response.status_code != 200:
        print(f"   Failed to get history: {history_response.text}")
        return False
    
    history_data = history_response.json()
    print(f"   Total sessions found: {len(history_data)}")
    
    # Look for our session
    print("\n5. Looking for our chat session...")
    found_session = False
    
    for session in history_data:
        print(f"\n   Session ID: {session.get('id')}")
        print(f"   Thread ID: {session.get('thread_id')}")
        print(f"   Title: {session.get('title')}")
        print(f"   Created: {session.get('created_at')}")
        
        if session.get('thread_id') == thread_id:
            found_session = True
            title = session.get('title', '')
            
            print(f"\n   ✓ Found our session!")
            print(f"   Title: '{title}'")
            
            if title == test_message:
                print("   ✓ SUCCESS: Title matches our message!")
                return True
            elif title == "chat session" or not title:
                print("   ✗ ISSUE: Title is still default 'chat session' or empty")
                return False
            else:
                print(f"   ? Title is different: '{title}'")
                return False
    
    if not found_session:
        print(f"\n   ✗ ISSUE: Could not find session with thread_id {thread_id}")
        return False
    
    return False

if __name__ == "__main__":
    result = test_chat_creation_and_history()
    print("\n" + "="*60)
    print(f"Test Result: {'PASSED' if result else 'FAILED'}")
    print("="*60)