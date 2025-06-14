#!/usr/bin/env python3
"""
Check Pinecone metadata for documents
"""

import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))

# List all indexes
print("Available Pinecone indexes:")
indexes = pc.list_indexes()
for idx in indexes:
    print(f"  - {idx.name}")

# Get the first index or use a specific one
if indexes:
    index_name = indexes[0].name
    print(f"\nUsing index: {index_name}")
    index = pc.Index(index_name)
else:
    print("No indexes found!")
    exit(1)

# Query to get some vectors with metadata
query_result = index.query(
    vector=[0.0] * 1536,  # Dummy vector for query
    top_k=5,
    include_metadata=True,
    include_values=False
)

print("Checking Pinecone metadata for documents:\n")
print("-" * 80)

for i, match in enumerate(query_result.matches):
    print(f"Document {i+1}:")
    print(f"  ID: {match.id}")
    print(f"  Score: {match.score}")
    print(f"  Metadata: {match.metadata}")
    print("-" * 80)

# Check for session_id in metadata
has_session_id = any('session_id' in match.metadata for match in query_result.matches if match.metadata)
print(f"\nAny documents have session_id in metadata: {has_session_id}")