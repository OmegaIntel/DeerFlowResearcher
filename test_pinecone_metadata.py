#!/usr/bin/env python3
"""Test script to check Pinecone metadata consistency"""

import os
import sys
import logging
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
import json

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_pinecone_metadata():
    """Test Pinecone metadata to understand the citation 404 issue"""
    
    # Initialize Pinecone
    pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
    embeddings = OpenAIEmbeddings(api_key=os.getenv('OPENAI_API_KEY'))
    
    # Get the index name (use the same logic as document processor)
    existing_indexes = [index.name for index in pc.list_indexes()]
    if existing_indexes:
        index_name = existing_indexes[0]
        logger.info(f"Using index: {index_name}")
    else:
        logger.error("No Pinecone indexes found")
        return
    
    # Create vector store
    vector_store = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings,
        pinecone_api_key=os.getenv('PINECONE_API_KEY')
    )
    
    # Test search with different queries
    test_query = "test query for document search"
    
    logger.info("\n=== Test 1: Search without filter ===")
    try:
        results = vector_store.similarity_search_with_score(
            query=test_query,
            k=5
        )
        logger.info(f"Found {len(results)} results without filter")
        for i, (doc, score) in enumerate(results[:3]):
            logger.info(f"\nResult {i+1}:")
            logger.info(f"  Score: {score}")
            logger.info(f"  Content preview: {doc.page_content[:100]}...")
            logger.info(f"  Metadata: {json.dumps(doc.metadata, indent=2)}")
    except Exception as e:
        logger.error(f"Error in search without filter: {e}")
    
    # Test with session filter
    test_session_id = "8f2e6d35-3c58-4a7b-9f5e-1b8c9d2a3e4f"  # Example session ID
    logger.info(f"\n=== Test 2: Search with session_id filter ===")
    try:
        results = vector_store.similarity_search_with_score(
            query=test_query,
            k=5,
            filter={"session_id": test_session_id}
        )
        logger.info(f"Found {len(results)} results with session filter")
        for i, (doc, score) in enumerate(results[:3]):
            logger.info(f"\nResult {i+1}:")
            logger.info(f"  Score: {score}")
            logger.info(f"  Metadata: {json.dumps(doc.metadata, indent=2)}")
    except Exception as e:
        logger.error(f"Error in search with session filter: {e}")
    
    # Test with user filter
    test_user_id = "chetan@omegaintelligence.ai"  # Example user ID
    logger.info(f"\n=== Test 3: Search with user_id filter ===")
    try:
        results = vector_store.similarity_search_with_score(
            query=test_query,
            k=5,
            filter={"user_id": test_user_id}
        )
        logger.info(f"Found {len(results)} results with user filter")
        for i, (doc, score) in enumerate(results[:3]):
            logger.info(f"\nResult {i+1}:")
            logger.info(f"  Score: {score}")
            logger.info(f"  Metadata: {json.dumps(doc.metadata, indent=2)}")
    except Exception as e:
        logger.error(f"Error in search with user filter: {e}")
    
    # Check specific document IDs that were causing issues
    problem_doc_ids = [
        "dc4fad78-3599-4ac8-9bdf-6ab5e9e9d115",
        "45847320-f0c2-41b6-a8cd-07ed4ef0d1a3"
    ]
    
    logger.info(f"\n=== Test 4: Search for specific document IDs ===")
    for doc_id in problem_doc_ids:
        try:
            results = vector_store.similarity_search_with_score(
                query=test_query,
                k=5,
                filter={"document_id": doc_id}
            )
            logger.info(f"\nDocument ID {doc_id}: Found {len(results)} chunks")
            if results:
                doc, score = results[0]
                logger.info(f"  Metadata: {json.dumps(doc.metadata, indent=2)}")
        except Exception as e:
            logger.error(f"Error searching for document {doc_id}: {e}")

if __name__ == "__main__":
    test_pinecone_metadata()