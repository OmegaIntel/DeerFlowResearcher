#!/usr/bin/env python3
"""Test script for document upload and RAG functionality"""

import requests
import json
import time
import os

BASE_URL = "http://localhost:8000"
AUTH_TOKEN = "mock-jwt-token-123456789"

def test_document_upload():
    """Test uploading a document"""
    print("Testing document upload...")
    
    # Create a test file
    test_content = """
    Omega Intelligence Test Document
    
    This is a test document for the RAG system.
    It contains information about artificial intelligence and machine learning.
    
    Key Points:
    1. Machine learning is a subset of AI
    2. Deep learning is a subset of machine learning
    3. Neural networks are inspired by the human brain
    4. Transformers have revolutionized NLP
    """
    
    with open("/tmp/test_rag.txt", "w") as f:
        f.write(test_content)
    
    # Upload file
    with open("/tmp/test_rag.txt", "rb") as f:
        files = {"file": ("test_rag.txt", f, "text/plain")}
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        response = requests.post(f"{BASE_URL}/api/documents/upload", files=files, headers=headers)
        
    print(f"Upload response: {response.status_code}")
    if response.ok:
        result = response.json()
        print(json.dumps(result, indent=2))
        return result["document"]["id"]
    else:
        print(f"Error: {response.text}")
        return None

def test_document_list():
    """Test listing documents"""
    print("\nTesting document list...")
    
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    response = requests.get(f"{BASE_URL}/api/documents", headers=headers)
    
    print(f"List response: {response.status_code}")
    if response.ok:
        result = response.json()
        print(f"Total documents: {result['total']}")
        for doc in result["documents"]:
            print(f"- {doc['original_filename']} (ID: {doc['id']})")
    else:
        print(f"Error: {response.text}")

def test_document_search():
    """Test document search"""
    print("\nTesting document search...")
    
    data = {
        "query": "machine learning AI",
        "top_k": 3
    }
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    
    response = requests.post(f"{BASE_URL}/api/documents/search", data=data, headers=headers)
    
    print(f"Search response: {response.status_code}")
    if response.ok:
        result = response.json()
        print(f"Found {result['total_results']} results")
        for i, res in enumerate(result["results"]):
            print(f"\nResult {i+1}:")
            print(f"Score: {res['score']}")
            print(f"Content: {res['content'][:200]}...")
    else:
        print(f"Error: {response.text}")

def test_chat_with_rag():
    """Test chat with RAG context"""
    print("\nTesting chat with RAG...")
    
    data = {
        "messages": [{"role": "user", "content": "What do you know about machine learning from my documents?"}],
        "thread_id": "__default__",
        "model": "claude-3-sonnet-20240229",
        "stream": False
    }
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{BASE_URL}/api/chat/simple", json=data, headers=headers, stream=True)
    
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

def test_document_delete(doc_id):
    """Test document deletion"""
    print(f"\nTesting document delete for ID: {doc_id}")
    
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    response = requests.delete(f"{BASE_URL}/api/documents/{doc_id}", headers=headers)
    
    print(f"Delete response: {response.status_code}")
    if response.ok:
        result = response.json()
        print(json.dumps(result, indent=2))
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    print("Starting document RAG tests...\n")
    
    # Test upload
    doc_id = test_document_upload()
    
    # Wait a bit for processing
    time.sleep(2)
    
    # Test list
    test_document_list()
    
    # Test search
    test_document_search()
    
    # Test chat with RAG
    test_chat_with_rag()
    
    # Clean up - delete test document
    if doc_id:
        test_document_delete(doc_id)
    
    print("\nTests completed!")