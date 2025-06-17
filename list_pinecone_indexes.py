#!/usr/bin/env python3
"""List Pinecone indexes"""

import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

# List indexes
print("=== Pinecone Indexes ===")
indexes = list(pc.list_indexes())
print(f"Found {len(indexes)} indexes:")
for idx in indexes:
    print(f"  - {idx.name} (dimension: {idx.dimension}, metric: {idx.metric})")
    
if indexes:
    # Use the first index
    index_name = indexes[0].name
    print(f"\nUsing index: {index_name}")
    
    # Get index stats
    index = pc.Index(index_name)
    stats = index.describe_index_stats()
    print(f"Index stats: {stats}")