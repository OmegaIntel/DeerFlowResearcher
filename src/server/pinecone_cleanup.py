#!/usr/bin/env python3
"""Script to clean up orphaned documents in Pinecone"""

import os
import logging
from pinecone import Pinecone
from sqlalchemy.orm import Session
from src.db.db_session import SessionLocal
from src.db_models import Document
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_pinecone():
    """Remove vectors from Pinecone that don't have corresponding documents in DB"""
    
    # Initialize Pinecone
    pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
    
    # Get the index
    existing_indexes = [index.name for index in pc.list_indexes()]
    if not existing_indexes:
        logger.error("No Pinecone indexes found")
        return
    
    index_name = existing_indexes[0]
    logger.info(f"Using index: {index_name}")
    index = pc.Index(index_name)
    
    # Get all document IDs from database
    db = SessionLocal()
    try:
        all_docs = db.query(Document).filter(Document.is_active == True).all()
        valid_doc_ids = {str(doc.id) for doc in all_docs}
        logger.info(f"Found {len(valid_doc_ids)} valid documents in database")
        
        # Get stats from Pinecone
        stats = index.describe_index_stats()
        logger.info(f"Pinecone index has {stats['total_vector_count']} vectors")
        
        # Note: We can't easily list all vectors in Pinecone without knowing their IDs
        # So we'll focus on validating during search instead
        
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_pinecone()