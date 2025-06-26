#!/usr/bin/env python3
"""
Run data cleaning process for Non-PPP companies
"""
import os
import sys
import logging
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.data_cleaning_service import DataCleaningService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Run the data cleaning process"""
    try:
        # Initialize service
        service = DataCleaningService()
        
        # First, get analysis
        logger.info("Analyzing data quality issues...")
        analysis = service.analyze_non_ppp_companies()
        
        logger.info(f"Total Non-PPP companies: {analysis.get('total_non_ppp', 0)}")
        summary = analysis.get('summary', {})
        logger.info("Data quality issues:")
        for issue_type, count in summary.items():
            logger.info(f"  - {issue_type}: {count:,}")
        
        # Ask for confirmation
        print("\n" + "="*60)
        print("DATA CLEANING PROCESS")
        print("="*60)
        print(f"Total companies to process: {analysis.get('total_non_ppp', 0):,}")
        print(f"Companies with person names: {summary.get('person_names_count', 0):,}")
        print(f"Companies with long descriptions: {summary.get('long_descriptions_count', 0):,}")
        print("\nThis process will:")
        print("1. Extract company names from descriptions")
        print("2. Clean person names using website domains")
        print("3. Save original and cleaned data to S3 (or local)")
        print("4. Create detailed reports")
        print("\n" + "="*60)
        
        response = input("\nProceed with cleaning? (yes/no): ")
        if response.lower() != 'yes':
            logger.info("Cleaning cancelled by user")
            return
        
        # Run cleaning with smaller batch size for testing
        batch_size = int(input("Enter batch size (default 1000): ") or "1000")
        
        logger.info(f"Starting cleaning process with batch size {batch_size}...")
        
        # Run the cleaning
        summary = service.run_cleaning_process(batch_size=batch_size)
        
        logger.info("Cleaning process completed!")
        logger.info(f"Summary: {summary}")
        
        print("\n" + "="*60)
        print("CLEANING COMPLETED")
        print("="*60)
        print(f"Total companies processed: {summary.get('total_companies', 0):,}")
        print(f"Companies cleaned: {summary.get('companies_cleaned', 0):,}")
        print(f"Companies enriched: {summary.get('companies_enriched', 0):,}")
        print("\nFiles created:")
        for file_type, filename in summary.get('files_created', {}).items():
            print(f"  - {file_type}: {filename}")
        print("="*60)
        
    except KeyboardInterrupt:
        logger.info("Process interrupted by user")
    except Exception as e:
        logger.error(f"Error in cleaning process: {str(e)}")
        raise

if __name__ == "__main__":
    main()