#!/usr/bin/env python3
import requests
import time
import json
from datetime import datetime

def monitor_progress():
    """Monitor the batch processing progress"""
    api_url = "http://localhost:8000/api/v1/cleaning/status"
    
    print(f"Monitoring batch processing started at {datetime.now()}")
    print("=" * 60)
    
    last_batch = 0
    last_processed = 0
    stuck_count = 0
    
    while True:
        try:
            response = requests.get(api_url)
            if response.status_code != 200:
                print(f"ERROR: Failed to get status (HTTP {response.status_code})")
                time.sleep(30)
                continue
                
            data = response.json()
            if not data['success']:
                print(f"ERROR: Status check failed: {data.get('error', 'Unknown')}")
                time.sleep(30)
                continue
                
            status = data['data']
            
            # Check if processing has stopped
            if status['processed_count'] == last_processed:
                stuck_count += 1
                if stuck_count >= 5:  # No progress for 5 minutes
                    print(f"\n⚠️  WARNING: No progress for {stuck_count} minutes!")
                    print(f"Last processed count: {last_processed}")
            else:
                stuck_count = 0
                
            # Update progress
            if status['batches_completed'] > last_batch:
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Batch {status['batches_completed']} complete")
                print(f"  Processed: {status['processed_count']:,} | Cleaned: {status['cleaned_count']:,}")
                print(f"  Progress: {status['progress_percentage']:.2f}% | Remaining: {status['remaining_count']:,}")
                last_batch = status['batches_completed']
                
            last_processed = status['processed_count']
            
            # Check if complete
            if status['remaining_count'] == 0:
                print(f"\n✅ PROCESSING COMPLETE!")
                print(f"Total processed: {status['processed_count']:,}")
                print(f"Total cleaned: {status['cleaned_count']:,}")
                print(f"Cleaning rate: {(status['cleaned_count']/status['processed_count']*100):.2f}%")
                break
                
            time.sleep(60)  # Check every minute
            
        except Exception as e:
            print(f"\nERROR: {type(e).__name__}: {str(e)}")
            time.sleep(30)

if __name__ == "__main__":
    monitor_progress()