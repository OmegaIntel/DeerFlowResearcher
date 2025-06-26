#!/usr/bin/env python3
"""
Run data cleaning process non-interactively with a small batch
"""
import os
import sys
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.data_cleaning_service import DataCleaningService

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    try:
        service = DataCleaningService()
        
        # Run with a small batch for testing
        logger.info("Starting cleaning process with batch size 100...")
        summary = service.run_cleaning_process(batch_size=100)
        
        logger.info("Cleaning completed!")
        logger.info(f"Summary: {summary}")
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise

if __name__ == "__main__":
    main()