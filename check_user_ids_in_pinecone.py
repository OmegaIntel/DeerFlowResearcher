#!/usr/bin/env python3
"""Check user IDs in Pinecone"""

import os
from pinecone import Pinecone
from dotenv import load_dotenv
import random

load_dotenv()

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("omegaintel-docs")

# Query for random vectors to see metadata
print("=== Sampling vectors from Pinecone ===")

# Generate a random vector
random_vector = [random.random() for _ in range(1536)]

results = index.query(
    vector=random_vector,
    top_k=10,
    include_metadata=True
)

print(f"\nFound {len(results['matches'])} vectors")
print("\nUnique user IDs found:")
user_ids = set()
for match in results['matches']:
    meta = match.get('metadata', {})
    user_id = meta.get('user_id', 'Unknown')
    user_ids.add(user_id)
    
for uid in sorted(user_ids):
    print(f"  - {uid} (length: {len(uid)}, has dashes: {'-' in uid})")

# Check a specific document
print("\n=== Checking specific patterns ===")
# Try different user ID formats
test_ids = [
    "3e60a427-97e3-4c8b-89c7-39ccf8f89a64",  # With dashes
    "3e60a42797e34c8b89c739ccf8f89a64",      # Without dashes
]

for test_id in test_ids:
    results = index.query(
        vector=random_vector,
        top_k=5,
        include_metadata=True,
        filter={"user_id": test_id}
    )
    print(f"\nUser ID '{test_id}': {len(results['matches'])} matches")
    if results['matches']:
        print(f"  Sample: {results['matches'][0]['metadata'].get('filename', 'Unknown')}")