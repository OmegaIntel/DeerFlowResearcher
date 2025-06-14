#!/usr/bin/env python3

import os
from pinecone import Pinecone

# Set environment variables
os.environ['PINECONE_API_KEY'] = 'pcsk_33Ao1x_6i2bLBECYcu3nk9xmaUFWSuaJFdVcenh4ZxB65dEgF1E5CvbfetFB13ieVDyT3z'

try:
    pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
    
    print("Listing all Pinecone indexes:")
    indexes = pc.list_indexes()
    
    if not indexes:
        print("No indexes found!")
    else:
        for idx in indexes:
            print(f"\nIndex: {idx.name}")
            print(f"  Host: {idx.host}")
            print(f"  State: {idx.state}")
            print(f"  Dimension: {idx.dimension}")
            print(f"  Metric: {idx.metric}")
            
            # Try to get stats if index is ready
            if idx.state == 'Ready':
                try:
                    index = pc.Index(idx.name)
                    stats = index.describe_index_stats()
                    print(f"  Total vectors: {stats.get('total_vector_count', 0)}")
                except Exception as e:
                    print(f"  Error getting stats: {e}")
                    
except Exception as e:
    print(f"Error connecting to Pinecone: {e}")