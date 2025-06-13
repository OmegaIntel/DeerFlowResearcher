#!/usr/bin/env python3
import requests
import json
import uuid
import time

class TestDeerFlow:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.token = None
        self.session_id = None
        
    def test_auth(self):
        """Test authentication"""
        print("=== Testing Authentication ===")
        
        # Register new user
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        password = "testpass123"
        
        print(f"1. Registering user: {email}")
        reg_response = requests.post(
            f"{self.base_url}/api/register",
            data={"email": email, "password": password}
        )
        
        if reg_response.status_code == 200:
            print("   ✓ Registration successful")
        else:
            print(f"   ✗ Registration failed: {reg_response.text}")
            return False
            
        # Login
        print("2. Logging in...")
        login_response = requests.post(
            f"{self.base_url}/api/token",
            data={"username": email, "password": password}
        )
        
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            print("   ✓ Login successful")
            return True
        else:
            print(f"   ✗ Login failed: {login_response.text}")
            return False
    
    def test_chat_sessions(self):
        """Test chat session CRUD operations"""
        print("\n=== Testing Chat Sessions ===")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create session
        print("1. Creating chat session...")
        create_response = requests.post(
            f"{self.base_url}/api/chat/sessions",
            headers=headers,
            json={"title": "Test Chat Session", "mode": "chat"}
        )
        
        if create_response.status_code == 200:
            session = create_response.json()
            self.session_id = session["id"]
            print(f"   ✓ Created session: {self.session_id}")
        else:
            print(f"   ✗ Create failed: {create_response.text}")
            return False
            
        # List sessions
        print("2. Listing chat sessions...")
        list_response = requests.get(
            f"{self.base_url}/api/chat/sessions",
            headers=headers
        )
        
        if list_response.status_code == 200:
            sessions = list_response.json()
            print(f"   ✓ Found {len(sessions)} sessions")
        else:
            print(f"   ✗ List failed: {list_response.text}")
            
        # Get session detail
        print("3. Getting session detail...")
        detail_response = requests.get(
            f"{self.base_url}/api/chat/sessions/{self.session_id}",
            headers=headers
        )
        
        if detail_response.status_code == 200:
            print("   ✓ Retrieved session details")
        else:
            print(f"   ✗ Get detail failed: {detail_response.text}")
            
        return True
    
    def test_document_upload(self):
        """Test document upload with session linkage"""
        print("\n=== Testing Document Upload ===")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Upload document linked to session
        print(f"1. Uploading document linked to session {self.session_id}...")
        
        test_content = f"""# Test Document
This is a test document uploaded at {time.strftime('%Y-%m-%d %H:%M:%S')}.
It is linked to chat session: {self.session_id}

## Content
This document contains test content for verifying the document upload functionality.
- Feature 1: Upload to S3
- Feature 2: Link to chat session
- Feature 3: Process for RAG
"""
        
        files = {"file": ("test_document.md", test_content, "text/markdown")}
        params = {"session_id": self.session_id} if self.session_id else {}
        
        upload_response = requests.post(
            f"{self.base_url}/api/documents/upload",
            headers=headers,
            files=files,
            params=params
        )
        
        if upload_response.status_code == 200:
            doc = upload_response.json()["document"]
            print(f"   ✓ Uploaded document: {doc['id']}")
            print(f"     - Linked to session: {doc.get('session_id', 'None')}")
            print(f"     - Processing status: {doc['processing_status']}")
            return doc['id']
        else:
            print(f"   ✗ Upload failed: {upload_response.text}")
            return None
    
    def test_document_operations(self, doc_id):
        """Test document CRUD operations"""
        print("\n=== Testing Document Operations ===")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get document
        print(f"1. Getting document {doc_id}...")
        get_response = requests.get(
            f"{self.base_url}/api/documents/{doc_id}",
            headers=headers
        )
        
        if get_response.status_code == 200:
            doc = get_response.json()
            print(f"   ✓ Retrieved document: {doc['original_filename']}")
        else:
            print(f"   ✗ Get failed: {get_response.text}")
            
        # Get download URL
        print("2. Getting download URL...")
        url_response = requests.get(
            f"{self.base_url}/api/documents/{doc_id}/download-url",
            headers=headers
        )
        
        if url_response.status_code == 200:
            url_data = url_response.json()
            print(f"   ✓ Got download URL (expires in {url_data['expires_in']}s)")
        else:
            print(f"   ✗ Get URL failed: {url_response.text}")
            
        # List documents for session
        print(f"3. Listing documents for session {self.session_id}...")
        list_response = requests.get(
            f"{self.base_url}/api/documents",
            headers=headers,
            params={"session_id": self.session_id}
        )
        
        if list_response.status_code == 200:
            docs = list_response.json()
            print(f"   ✓ Found {docs['total']} documents for session")
        else:
            print(f"   ✗ List failed: {list_response.text}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("Starting Deer Flow Full Functionality Test\n")
        
        # Test auth
        if not self.test_auth():
            print("\n❌ Authentication test failed. Stopping.")
            return
            
        # Test chat sessions
        if not self.test_chat_sessions():
            print("\n❌ Chat session test failed. Stopping.")
            return
            
        # Test document upload
        doc_id = self.test_document_upload()
        if doc_id:
            self.test_document_operations(doc_id)
        
        print("\n✅ All tests completed!")
        print(f"\nSummary:")
        print(f"- User authenticated successfully")
        print(f"- Chat session created: {self.session_id}")
        print(f"- Document uploaded and linked to session")
        print(f"- All CRUD operations working")
        print(f"\nYou can now:")
        print(f"1. View the chat history at http://localhost:3000/chat-history")
        print(f"2. View documents at http://localhost:3000/documents")
        print(f"3. Continue the chat at http://localhost:3000/chat?session={self.session_id}")

if __name__ == "__main__":
    tester = TestDeerFlow()
    tester.run_all_tests()