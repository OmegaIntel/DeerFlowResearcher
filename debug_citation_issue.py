#!/usr/bin/env python3
"""Debug script to understand citation 404 issue"""

import asyncio
import os
import sys
sys.path.append('/app')

from src.server.document_processor_enhanced import enhanced_document_processor

async def debug_search():
    """Test search functionality"""
    
    print("Testing document search with different filters...")
    
    # Test 1: Search without filter
    results = enhanced_document_processor.search_documents_with_citations(
        query="test query",
        top_k=3
    )
    print(f"\n=== Test 1: No filter ===")
    print(f"Found {len(results)} results")
    for r in results[:2]:
        print(f"  Doc ID: {r['citation']['document_id']}")
        print(f"  Filename: {r['citation']['filename']}")
        print(f"  Session ID in metadata: {r['metadata'].get('session_id', 'None')}")
        print(f"  User ID in metadata: {r['metadata'].get('user_id', 'None')}")
    
    # Test 2: Search with session filter
    test_session_id = "8f2e6d35-3c58-4a7b-9f5e-1b8c9d2a3e4f"
    results = enhanced_document_processor.search_documents_with_citations(
        query="test query",
        top_k=3,
        filter_dict={"session_id": test_session_id}
    )
    print(f"\n=== Test 2: Session filter ({test_session_id}) ===")
    print(f"Found {len(results)} results")
    
    # Test 3: Search with user filter
    test_user_id = "chetan@omegaintelligence.ai"
    results = enhanced_document_processor.search_documents_with_citations(
        query="test query",
        top_k=3,
        filter_dict={"user_id": test_user_id}
    )
    print(f"\n=== Test 3: User filter ({test_user_id}) ===")
    print(f"Found {len(results)} results")
    for r in results[:2]:
        print(f"  Doc ID: {r['citation']['document_id']}")
        print(f"  Filename: {r['citation']['filename']}")

if __name__ == "__main__":
    asyncio.run(debug_search())