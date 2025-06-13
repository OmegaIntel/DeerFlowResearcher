#!/usr/bin/env python3
"""Test full flow: registration, login, chat session, document upload and chat with RAG"""

import requests
import json
import time
import uuid

BASE_URL = "http://localhost:8000"

def test_registration():
    """Test user registration"""
    print("Testing user registration...")
    
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpassword123"
    
    response = requests.post(f"{BASE_URL}/api/register", data={
        "email": email,
        "password": password
    })
    
    print(f"Registration response: {response.status_code}")
    if response.ok:
        print(json.dumps(response.json(), indent=2))
        return email, password
    else:
        print(f"Error: {response.text}")
        return None, None

def test_login(email, password):
    """Test user login"""
    print("\nTesting user login...")
    
    response = requests.post(f"{BASE_URL}/api/token", data={
        "username": email,
        "password": password
    })
    
    print(f"Login response: {response.status_code}")
    if response.ok:
        result = response.json()
        print(json.dumps(result, indent=2))
        return result["access_token"]
    else:
        print(f"Error: {response.text}")
        return None

def test_create_chat_session(token):
    """Test creating a chat session"""
    print("\nTesting chat session creation...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/api/chat/sessions", 
        headers=headers,
        json={"mode": "chat", "title": "Test Chat Session"}
    )
    
    print(f"Create session response: {response.status_code}")
    if response.ok:
        result = response.json()
        print(json.dumps(result, indent=2))
        return result["id"]
    else:
        print(f"Error: {response.text}")
        return None

def test_upload_document(token, session_id):
    """Test document upload linked to session"""
    print("\nTesting document upload...")
    
    # Create a test file
    test_content = """
    Test Document for RAG System
    
    This document contains information about artificial intelligence.
    AI is transforming various industries including healthcare, finance, and transportation.
    Machine learning algorithms can analyze large datasets to find patterns.
    Deep learning uses neural networks with multiple layers.
    Natural language processing enables computers to understand human language.
    """
    
    with open("/tmp/test_doc.txt", "w") as f:
        f.write(test_content)
    
    # Upload file
    with open("/tmp/test_doc.txt", "rb") as f:
        files = {"file": ("test_doc.txt", f, "text/plain")}
        headers = {"Authorization": f"Bearer {token}"}
        params = {"session_id": session_id} if session_id else {}
        
        response = requests.post(f"{BASE_URL}/api/documents/upload", 
            files=files, headers=headers, params=params)
        
    print(f"Upload response: {response.status_code}")
    if response.ok:
        result = response.json()
        print(json.dumps(result, indent=2))
        return result["document"]["id"]
    else:
        print(f"Error: {response.text}")
        return None

def test_list_documents(token):
    """Test listing documents"""
    print("\nTesting document list...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/documents", headers=headers)
    
    print(f"List response: {response.status_code}")
    if response.ok:
        result = response.json()
        print(f"Total documents: {result['total']}")
        for doc in result["documents"]:
            print(f"- {doc['original_filename']} (Session: {doc.get('session_id', 'None')})")
    else:
        print(f"Error: {response.text}")

def test_chat_with_rag(token, session_id):
    """Test chat with RAG context"""
    print("\nTesting chat with RAG...")
    
    data = {
        "messages": [{"role": "user", "content": "What do you know about AI from my documents?"}],
        "thread_id": session_id,
        "model": "claude-3-sonnet-20240229",
        "stream": False
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{BASE_URL}/api/chat/simple", 
        json=data, headers=headers, stream=True)
    
    print(f"Chat response: {response.status_code}")
    if response.ok:
        # Handle SSE format
        full_content = ""
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    try:
                        data = json.loads(line[6:])
                        if 'content' in data:
                            full_content += data['content']
                    except:
                        pass
        print(f"Assistant: {full_content[:500]}...")
    else:
        print(f"Error: {response.text}")

def test_chat_history(token):
    """Test getting chat history"""
    print("\nTesting chat history...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/chat/sessions", headers=headers)
    
    print(f"History response: {response.status_code}")
    if response.ok:
        sessions = response.json()
        print(f"Total sessions: {len(sessions)}")
        for session in sessions[:3]:  # Show first 3
            print(f"- {session.get('title', 'Untitled')} ({session['mode']}) - {session['message_count']} messages")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    print("Starting full flow test...\n")
    
    # Test registration and login
    email, password = test_registration()
    if not email:
        print("Registration failed, exiting")
        exit(1)
    
    token = test_login(email, password)
    if not token:
        print("Login failed, exiting")
        exit(1)
    
    # Create chat session
    session_id = test_create_chat_session(token)
    
    # Upload document linked to session
    doc_id = test_upload_document(token, session_id)
    
    # Wait for processing
    time.sleep(3)
    
    # List documents
    test_list_documents(token)
    
    # Chat with RAG
    if session_id:
        test_chat_with_rag(token, session_id)
    
    # Get chat history
    test_chat_history(token)
    
    print("\nFull flow test completed!")