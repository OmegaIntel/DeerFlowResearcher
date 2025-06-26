import os
import json
import sqlite3
from datetime import datetime
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class CleaningCheckpointService:
    """Service to manage cleaning process checkpoints for resumable processing"""
    
    def __init__(self):
        self.checkpoint_file = '/cleaning_data/cleaning_checkpoint.json'
        self.db_path = os.getenv('PRIVATE_COMPANY_DB_PATH', '/data/company_database.db')
        
    def get_checkpoint(self) -> Optional[Dict]:
        """Get the current checkpoint status"""
        try:
            if os.path.exists(self.checkpoint_file):
                with open(self.checkpoint_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error reading checkpoint: {str(e)}")
        return None
    
    def save_checkpoint(self, checkpoint: Dict):
        """Save checkpoint status"""
        try:
            checkpoint['last_updated'] = datetime.now().isoformat()
            with open(self.checkpoint_file, 'w') as f:
                json.dump(checkpoint, f, indent=2)
            logger.info(f"Checkpoint saved: {checkpoint}")
        except Exception as e:
            logger.error(f"Error saving checkpoint: {str(e)}")
    
    def initialize_checkpoint(self) -> Dict:
        """Initialize a new checkpoint"""
        try:
            # Get total count of Non-PPP companies
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM companies
                WHERE (loan_amount IS NULL OR loan_amount = 0) 
                      AND (source_type IS NULL OR source_type != 'PPP_LOAN')
            """)
            total_count = cursor.fetchone()[0]
            conn.close()
            
            checkpoint = {
                'status': 'initialized',
                'total_companies': total_count,
                'processed_count': 0,
                'cleaned_count': 0,
                'error_count': 0,
                'last_company_id': None,
                'batch_size': 1000,
                'start_time': datetime.now().isoformat(),
                'session_id': datetime.now().strftime('%Y%m%d_%H%M%S'),
                'batches_completed': 0,
                'files_created': []
            }
            
            self.save_checkpoint(checkpoint)
            return checkpoint
            
        except Exception as e:
            logger.error(f"Error initializing checkpoint: {str(e)}")
            raise
    
    def update_progress(self, processed: int, cleaned: int, errors: int, last_company_id: str, batch_num: int):
        """Update processing progress"""
        checkpoint = self.get_checkpoint()
        if checkpoint:
            checkpoint['processed_count'] = processed
            checkpoint['cleaned_count'] = cleaned
            checkpoint['error_count'] = errors
            checkpoint['last_company_id'] = last_company_id
            checkpoint['batches_completed'] = batch_num
            checkpoint['status'] = 'in_progress'
            self.save_checkpoint(checkpoint)
    
    def mark_completed(self):
        """Mark the cleaning process as completed"""
        checkpoint = self.get_checkpoint()
        if checkpoint:
            checkpoint['status'] = 'completed'
            checkpoint['end_time'] = datetime.now().isoformat()
            self.save_checkpoint(checkpoint)
    
    def add_created_file(self, filename: str):
        """Add a created file to the checkpoint"""
        checkpoint = self.get_checkpoint()
        if checkpoint:
            if 'files_created' not in checkpoint:
                checkpoint['files_created'] = []
            checkpoint['files_created'].append({
                'filename': filename,
                'created_at': datetime.now().isoformat()
            })
            self.save_checkpoint(checkpoint)
    
    def get_resume_info(self) -> Dict:
        """Get information needed to resume processing"""
        checkpoint = self.get_checkpoint()
        if not checkpoint:
            return {'can_resume': False, 'message': 'No checkpoint found'}
        
        if checkpoint['status'] == 'completed':
            return {
                'can_resume': False,
                'message': 'Cleaning already completed',
                'total_processed': checkpoint['processed_count'],
                'total_cleaned': checkpoint['cleaned_count']
            }
        
        remaining = checkpoint['total_companies'] - checkpoint['processed_count']
        progress_pct = (checkpoint['processed_count'] / checkpoint['total_companies'] * 100) if checkpoint['total_companies'] > 0 else 0
        
        return {
            'can_resume': True,
            'status': checkpoint['status'],
            'total_companies': checkpoint['total_companies'],
            'processed_count': checkpoint['processed_count'],
            'cleaned_count': checkpoint['cleaned_count'],
            'error_count': checkpoint['error_count'],
            'remaining_count': remaining,
            'progress_percentage': round(progress_pct, 2),
            'last_company_id': checkpoint['last_company_id'],
            'batches_completed': checkpoint['batches_completed'],
            'session_id': checkpoint['session_id'],
            'last_updated': checkpoint.get('last_updated', 'Unknown')
        }