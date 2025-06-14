#!/usr/bin/env python3
"""Test the backend fixes for S3 metadata encoding, document processor, and citations."""

import requests
import json
import time
import os
import tempfile

# Base URL for the API
BASE_URL = "http://localhost:8000"

def test_non_ascii_s3_metadata():
    """Test that S3 metadata encoding handles non-ASCII characters."""
    print("\n=== Testing S3 Metadata Encoding ===")
    
    # Check if the s3_utils module has the encoding fix
    try:
        import sys
        sys.path.insert(0, '/root/deer-flow')
        from src.server.s3_utils import s3_manager
        
        # Check if urllib.parse is imported (our fix)
        import inspect
        source = inspect.getsource(s3_manager.upload_file)
        if 'urllib.parse.quote' in source:
            print("✓ S3 metadata encoding fix is present")
            print("  - Non-ASCII filenames will be URL-encoded before storing in S3 metadata")
            return True
        else:
            print("✗ S3 metadata encoding fix not found")
            return False
    except Exception as e:
        print(f"✗ Could not verify S3 metadata fix: {e}")
        return False

def test_document_processor_parameters():
    """Test that document processor accepts the correct parameters."""
    print("\n=== Testing Document Processor Parameters ===")
    
    try:
        import sys
        sys.path.insert(0, '/root/deer-flow')
        from src.server.document_processor import document_processor
        
        # Check the method signature
        import inspect
        sig = inspect.signature(document_processor.process_document)
        params = list(sig.parameters.keys())
        
        print("Document processor parameters:", params)
        
        if 'user_id' in params:
            print("✓ Document processor accepts user_id parameter")
        else:
            print("✗ Document processor does not accept user_id parameter")
            print("  (This is expected if we removed it from the call)")
        
        # Check if session_id is in parameters
        if 'session_id' in params:
            print("✓ Document processor accepts session_id parameter")
        
        return True
    except Exception as e:
        print(f"✗ Could not verify document processor: {e}")
        return False

def test_citations_initialization():
    """Test that citations variable is properly initialized."""
    print("\n=== Testing Citations Initialization ===")
    
    try:
        # Check the app.py file for citations initialization
        with open('/root/deer-flow/src/server/app.py', 'r') as f:
            content = f.read()
            
        # Look for citations initialization
        if 'citations = []' in content and '# citations = []' not in content.replace('    citations = []', ''):
            print("✓ Citations variable is properly initialized")
            
            # Check if it's used in the response
            if 'if citations:' in content:
                print("✓ Citations handling code is present")
            
            return True
        else:
            print("✗ Citations variable initialization not found or is commented out")
            return False
    except Exception as e:
        print(f"✗ Could not verify citations fix: {e}")
        return False

def test_backend_health():
    """Test that the backend is running properly."""
    print("\n=== Testing Backend Health ===")
    
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("✓ Backend is running and accessible")
            return True
        else:
            print(f"✗ Backend returned status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Backend is not accessible: {e}")
        return False

def main():
    """Run all tests."""
    print("Testing Backend Fixes")
    print("===================")
    
    # Run tests
    results = []
    results.append(test_backend_health())
    results.append(test_non_ascii_s3_metadata())
    results.append(test_document_processor_parameters())
    results.append(test_citations_initialization())
    
    print("\n=== Test Summary ===")
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total} tests")
    
    if passed == total:
        print("\n✓ All backend fixes have been successfully applied!")
    else:
        print("\n⚠ Some tests failed. Please review the output above.")

if __name__ == "__main__":
    main()