#!/usr/bin/env python3

import requests
import json
import time
import os

def get_token():
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

def upload_document(token):
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # Create a test file
    test_content = """
    This is a test document about artificial intelligence.
    AI has been making significant progress in recent years.
    Machine learning and deep learning are key components of modern AI systems.
    Natural language processing enables computers to understand human language.
    Computer vision allows machines to interpret visual information.
    """
    
    files = {
        'file': ('test_ai_document.txt', test_content.encode(), 'text/plain')
    }
    
    print("Uploading test document...")
    response = requests.post(
        'http://localhost:8000/api/documents/upload',
        headers=headers,
        files=files
    )
    
    print(f"Upload response status: {response.status_code}")
    print(f"Upload response: {json.dumps(response.json(), indent=2)}")
    
    return response.json()

def search_documents(token, query):
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    data = {
        'query': query,
        'top_k': 5
    }
    
    print(f"\nSearching documents for: '{query}'")
    response = requests.post(
        'http://localhost:8000/api/documents/search',
        headers=headers,
        data=data  # Using form data, not JSON
    )
    
    print(f"Search response status: {response.status_code}")
    print(f"Search response: {json.dumps(response.json(), indent=2)}")
    
    return response.json()

def list_documents(token):
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    print("\nListing all documents...")
    response = requests.get(
        'http://localhost:8000/api/documents',
        headers=headers
    )
    
    print(f"List response status: {response.status_code}")
    print(f"List response: {json.dumps(response.json(), indent=2)}")
    
    return response.json()

def test_document_chat(token, query):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    request_data = {
        'messages': [{'role': 'user', 'content': query}],
        'thread_id': 'test-document-chat',
        'tool_id': 'documents',
        'tool_type': 'agent'
    }
    
    print(f"\nTesting document chat with: '{query}'")
    
    response = requests.post(
        'http://localhost:8000/api/chat/tool',
        headers=headers,
        json=request_data,
        stream=True,
        timeout=30
    )
    
    print(f"Document chat response: {response.status_code}")
    print("Response:")
    
    # Parse SSE stream
    for line in response.iter_lines(decode_unicode=True):
        if line:
            if line.startswith("data:"):
                data_str = line.split(":", 1)[1].strip()
                try:
                    data = json.loads(data_str)
                    if 'content' in data:
                        print(data['content'])
                except json.JSONDecodeError:
                    pass

def check_pinecone_index():
    """Direct check of Pinecone index"""
    try:
        from pinecone import Pinecone
        
        api_key = os.getenv('PINECONE_API_KEY')
        if not api_key:
            print("\nPINECONE_API_KEY not set!")
            return
            
        pc = Pinecone(api_key=api_key)
        
        print("\nChecking Pinecone indexes...")
        indexes = pc.list_indexes()
        for idx in indexes:
            print(f"Index: {idx.name}")
            
            # Get index stats
            index = pc.Index(idx.name)
            stats = index.describe_index_stats()
            print(f"  Total vectors: {stats.get('total_vector_count', 0)}")
            print(f"  Namespaces: {list(stats.get('namespaces', {}).keys())}")
            
    except Exception as e:
        print(f"Error checking Pinecone: {e}")

if __name__ == "__main__":
    token = get_token()
    if not token:
        print("Failed to get token")
        exit(1)
        
    print(f"Got token: {token[:20]}...")
    
    # Check Pinecone directly
    check_pinecone_index()
    
    # Upload a document
    upload_result = upload_document(token)
    
    # Wait a bit for processing
    print("\nWaiting 3 seconds for document processing...")
    time.sleep(3)
    
    # List documents
    list_documents(token)
    
    # Search documents
    search_documents(token, "artificial intelligence")
    search_documents(token, "machine learning")
    
    # Test document chat
    test_document_chat(token, "What does the document say about AI?")