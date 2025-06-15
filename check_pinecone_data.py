#!/usr/bin/env python3
"""Check what's in Pinecone"""

import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "omegaintel"))

# Query for some documents
print("=== Checking Pinecone index ===")
print(f"Index name: {index.describe_index_stats()}")

# Try to query for documents
results = index.query(
    vector=[0.1] * 1536,  # Dummy vector
    top_k=5,
    include_metadata=True,
    filter={
        "user_id": "3e60a427-97e3-4c8b-89c7-39ccf8f89a64"  # With dashes
    }
)

print(f"\nDocuments for user (with dashes): {len(results['matches'])} found")
for match in results['matches']:
    meta = match.get('metadata', {})
    print(f"  - {meta.get('filename', 'Unknown')} (doc_id: {meta.get('document_id', 'Unknown')})")

# Try without dashes
results2 = index.query(
    vector=[0.1] * 1536,
    top_k=5,
    include_metadata=True,
    filter={
        "user_id": "3e60a42797e34c8b89c739ccf8f89a64"  # Without dashes
    }
)

print(f"\nDocuments for user (without dashes): {len(results2['matches'])} found")
for match in results2['matches']:
    meta = match.get('metadata', {})
    print(f"  - {meta.get('filename', 'Unknown')} (doc_id: {meta.get('document_id', 'Unknown')})")