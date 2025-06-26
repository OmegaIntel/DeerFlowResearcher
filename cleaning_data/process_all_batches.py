#!/usr/bin/env python3
import requests
import time
import json
import sys
from datetime import datetime

def process_all_remaining_batches():
    """Process all remaining batches sequentially"""
    api_url = "http://localhost:8000/api/v1/cleaning"
    batch_size = 1000
    error_count = 0
    max_errors = 3
    
    print(f"Starting batch processing at {datetime.now()}")
    
    while True:
        try:
            # Check current status
            status_response = requests.get(f"{api_url}/status")
            if status_response.status_code != 200:
                print(f"Error getting status: {status_response.status_code}")
                error_count += 1
                if error_count >= max_errors:
                    print(f"CRITICAL: Too many errors ({error_count}), stopping process")
                    break
                time.sleep(30)
                continue
                
            status_data = status_response.json()
            if not status_data['success']:
                print(f"Status check failed: {status_data.get('error', 'Unknown error')}")
                break
                
            current_status = status_data['data']
            remaining = current_status['remaining_count']
            processed = current_status['processed_count']
            cleaned = current_status['cleaned_count']
            batch_num = current_status['batches_completed']
            
            if remaining == 0:
                print(f"✓ All companies processed! Total: {processed}, Cleaned: {cleaned}")
                break
                
            print(f"\nBatch {batch_num + 1} starting - Remaining: {remaining:,} companies")
            
            # Process next batch
            process_response = requests.post(
                f"{api_url}/process-batch?batch_size={batch_size}",
                timeout=300  # 5 minute timeout
            )
            
            if process_response.status_code != 200:
                print(f"Error processing batch: {process_response.status_code}")
                error_count += 1
                if error_count >= max_errors:
                    print(f"CRITICAL: Too many errors ({error_count}), stopping process")
                    break
                time.sleep(30)
                continue
                
            result = process_response.json()
            if not result['success']:
                print(f"Batch processing failed: {result.get('error', 'Unknown error')}")
                error_count += 1
                if error_count >= max_errors:
                    print(f"CRITICAL: Too many errors ({error_count}), stopping process")
                    break
                time.sleep(30)
                continue
                
            # Reset error count on success
            error_count = 0
            batch_data = result['data']
            
            print(f"✓ Batch {batch_data['batch_number']} complete:")
            print(f"  - Cleaned in batch: {batch_data['cleaned_in_batch']}")
            print(f"  - Total processed: {batch_data['total_processed']:,}")
            print(f"  - Total cleaned: {batch_data['total_cleaned']:,}")
            print(f"  - Progress: {batch_data['progress_percentage']:.2f}%")
            print(f"  - Processing rate: {batch_data['companies_per_second']:.1f} companies/sec")
            print(f"  - Est. time remaining: {batch_data['estimated_time_remaining']:.1f} minutes")
            
            # Small delay between batches to avoid overwhelming the system
            time.sleep(2)
            
        except requests.exceptions.Timeout:
            print(f"Timeout processing batch, will retry...")
            error_count += 1
            if error_count >= max_errors:
                print(f"CRITICAL: Too many timeouts ({error_count}), stopping process")
                break
            time.sleep(30)
            
        except Exception as e:
            print(f"ERROR: {type(e).__name__}: {str(e)}")
            error_count += 1
            if error_count >= max_errors:
                print(f"CRITICAL: Too many errors ({error_count}), stopping process")
                break
            time.sleep(30)
    
    print(f"\nBatch processing ended at {datetime.now()}")
    
    # Final status check
    try:
        final_status = requests.get(f"{api_url}/status").json()
        if final_status['success']:
            data = final_status['data']
            print(f"\nFinal Status:")
            print(f"- Total processed: {data['processed_count']:,}")
            print(f"- Total cleaned: {data['cleaned_count']:,}")
            print(f"- Remaining: {data['remaining_count']:,}")
            print(f"- Batches completed: {data['batches_completed']}")
    except:
        pass

if __name__ == "__main__":
    process_all_remaining_batches()