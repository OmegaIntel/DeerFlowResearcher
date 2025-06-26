import os
import sqlite3
import logging
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import time

from .data_cleaning_service import DataCleaningService
from .cleaning_checkpoint_service import CleaningCheckpointService

logger = logging.getLogger(__name__)

class ResumableCleaningService:
    """Service for resumable data cleaning with checkpoint support"""
    
    def __init__(self):
        self.cleaning_service = DataCleaningService()
        self.checkpoint_service = CleaningCheckpointService()
        self.db_path = os.getenv('PRIVATE_COMPANY_DB_PATH', '/data/company_database.db')
        
    def get_status(self) -> Dict:
        """Get current cleaning status"""
        return self.checkpoint_service.get_resume_info()
    
    def start_or_resume(self, batch_size: int = 1000) -> Dict:
        """Start new cleaning or resume from checkpoint"""
        resume_info = self.checkpoint_service.get_resume_info()
        
        if resume_info.get('can_resume') and resume_info['status'] == 'in_progress':
            logger.info(f"Resuming cleaning from checkpoint. Already processed: {resume_info['processed_count']}")
            return self._resume_cleaning(batch_size)
        else:
            logger.info("Starting new cleaning process")
            return self._start_new_cleaning(batch_size)
    
    def _start_new_cleaning(self, batch_size: int) -> Dict:
        """Start a new cleaning process"""
        # Initialize checkpoint
        checkpoint = self.checkpoint_service.initialize_checkpoint()
        checkpoint['batch_size'] = batch_size
        self.checkpoint_service.save_checkpoint(checkpoint)
        
        # Process first batch
        return self._process_next_batch(batch_size)
    
    def _resume_cleaning(self, batch_size: int) -> Dict:
        """Resume cleaning from last checkpoint"""
        checkpoint = self.checkpoint_service.get_checkpoint()
        if not checkpoint:
            raise ValueError("No checkpoint found to resume from")
        
        # Process next batch
        return self._process_next_batch(batch_size)
    
    def _process_next_batch(self, batch_size: int) -> Dict:
        """Process the next batch of companies"""
        checkpoint = self.checkpoint_service.get_checkpoint()
        if not checkpoint:
            # Initialize if no checkpoint exists
            checkpoint = self.checkpoint_service.initialize_checkpoint()
            checkpoint['batch_size'] = batch_size
            self.checkpoint_service.save_checkpoint(checkpoint)
        
        # Check if already completed
        if checkpoint['status'] == 'completed':
            return {
                'status': 'completed',
                'message': 'All companies have been processed',
                'total_processed': checkpoint['processed_count'],
                'total_cleaned': checkpoint['cleaned_count']
            }
        
        # Get next batch of companies
        conn = sqlite3.connect(self.db_path)
        
        # Build query to get next batch
        if checkpoint['last_company_id']:
            query = """
            SELECT company_id, company_name, website_url, industry_primary, description, 
                   city, state, employees, founded_year, website_domain
            FROM companies
            WHERE (loan_amount IS NULL OR loan_amount = 0) 
                  AND (source_type IS NULL OR source_type != 'PPP_LOAN')
                  AND company_id > ?
            ORDER BY company_id
            LIMIT ?
            """
            params = (checkpoint['last_company_id'], batch_size)
        else:
            query = """
            SELECT company_id, company_name, website_url, industry_primary, description, 
                   city, state, employees, founded_year, website_domain
            FROM companies
            WHERE (loan_amount IS NULL OR loan_amount = 0) 
                  AND (source_type IS NULL OR source_type != 'PPP_LOAN')
            ORDER BY company_id
            LIMIT ?
            """
            params = (batch_size,)
        
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()
        
        if len(df) == 0:
            # No more companies to process
            self.checkpoint_service.mark_completed()
            return {
                'status': 'completed',
                'message': 'All companies have been processed',
                'total_processed': checkpoint['processed_count'],
                'total_cleaned': checkpoint['cleaned_count']
            }
        
        # Convert to list of dicts for processing
        companies = df.to_dict('records')
        
        logger.info(f"Processing batch of {len(companies)} companies (batch #{checkpoint['batches_completed'] + 1})")
        
        # Process the batch
        start_time = time.time()
        cleaned_companies = self.cleaning_service.process_companies_batch(
            companies, 
            checkpoint['batches_completed'] + 1
        )
        
        # Count cleaned vs original
        cleaned_count = sum(1 for c in cleaned_companies if c['data_source'] != 'original')
        
        # Update checkpoint
        last_company_id = companies[-1]['company_id']
        self.checkpoint_service.update_progress(
            processed=checkpoint['processed_count'] + len(companies),
            cleaned=checkpoint['cleaned_count'] + cleaned_count,
            errors=checkpoint['error_count'],
            last_company_id=last_company_id,
            batch_num=checkpoint['batches_completed'] + 1
        )
        
        # Save cleaned data
        timestamp = checkpoint['session_id']
        batch_num = checkpoint['batches_completed'] + 1
        cleaned_df = pd.DataFrame(cleaned_companies)
        
        # Merge with original data for complete record
        result_df = df.merge(
            cleaned_df[['company_id', 'cleaned_name', 'data_source', 'confidence', 'enriched_data']],
            on='company_id',
            how='left'
        )
        result_df['original_company_name'] = result_df['company_name']
        result_df['company_name'] = result_df['cleaned_name'].fillna(result_df['company_name'])
        
        # Save batch results
        batch_filename = f"cleaned_batch_{batch_num}_{timestamp}.csv"
        save_path = self.cleaning_service.save_to_s3(result_df, batch_filename)
        self.checkpoint_service.add_created_file(batch_filename)
        
        # Calculate statistics
        processing_time = time.time() - start_time
        companies_per_second = len(companies) / processing_time if processing_time > 0 else 0
        
        # Get updated checkpoint for return
        updated_checkpoint = self.checkpoint_service.get_checkpoint()
        remaining = updated_checkpoint['total_companies'] - updated_checkpoint['processed_count']
        
        return {
            'status': 'success',
            'batch_number': batch_num,
            'batch_size': len(companies),
            'cleaned_in_batch': cleaned_count,
            'total_processed': updated_checkpoint['processed_count'],
            'total_cleaned': updated_checkpoint['cleaned_count'],
            'total_remaining': remaining,
            'progress_percentage': round((updated_checkpoint['processed_count'] / updated_checkpoint['total_companies'] * 100), 2),
            'processing_time': round(processing_time, 2),
            'companies_per_second': round(companies_per_second, 2),
            'estimated_time_remaining': round(remaining / companies_per_second / 60, 2) if companies_per_second > 0 else None,
            'file_saved': save_path,
            'next_action': 'Continue processing' if remaining > 0 else 'Complete'
        }
    
    def process_single_batch(self, batch_size: int = 1000) -> Dict:
        """Process a single batch and return results"""
        return self._process_next_batch(batch_size)
    
    def get_summary_report(self) -> Dict:
        """Get summary report of the cleaning process"""
        checkpoint = self.checkpoint_service.get_checkpoint()
        if not checkpoint:
            return {'error': 'No cleaning process found'}
        
        # Calculate duration
        start_time = datetime.fromisoformat(checkpoint['start_time'])
        if checkpoint.get('end_time'):
            end_time = datetime.fromisoformat(checkpoint['end_time'])
            duration = (end_time - start_time).total_seconds() / 60  # minutes
        else:
            duration = (datetime.now() - start_time).total_seconds() / 60
        
        return {
            'session_id': checkpoint['session_id'],
            'status': checkpoint['status'],
            'total_companies': checkpoint['total_companies'],
            'processed_count': checkpoint['processed_count'],
            'cleaned_count': checkpoint['cleaned_count'],
            'error_count': checkpoint['error_count'],
            'cleaning_rate': round((checkpoint['cleaned_count'] / checkpoint['processed_count'] * 100), 2) if checkpoint['processed_count'] > 0 else 0,
            'batches_completed': checkpoint['batches_completed'],
            'duration_minutes': round(duration, 2),
            'files_created': len(checkpoint.get('files_created', [])),
            'start_time': checkpoint['start_time'],
            'end_time': checkpoint.get('end_time', 'In progress'),
            'last_updated': checkpoint.get('last_updated', 'Unknown')
        }