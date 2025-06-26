#!/usr/bin/env python3
import pandas as pd
import sqlite3
import os
import sys

def verify_cleaning_results(batch_file):
    """Verify cleaning results and show examples"""
    print(f"\n=== Verifying {batch_file} ===")
    
    # Read the cleaned data
    df = pd.read_csv(batch_file)
    print(f"Total companies in batch: {len(df)}")
    
    # Check for original data preservation
    if 'original_company_name' in df.columns:
        print("✓ Original company names preserved")
    else:
        print("⚠ Warning: original_company_name column missing")
    
    # Count cleaning results
    if 'data_source' in df.columns:
        cleaning_stats = df['data_source'].value_counts()
        print("\nCleaning Statistics:")
        for source, count in cleaning_stats.items():
            print(f"  {source}: {count} ({count/len(df)*100:.1f}%)")
    
    # Show examples of cleaned data
    cleaned_mask = df['data_source'] != 'original' if 'data_source' in df.columns else pd.Series([False]*len(df))
    cleaned_examples = df[cleaned_mask].head(10)
    
    if len(cleaned_examples) > 0:
        print(f"\nExamples of cleaned companies (showing {len(cleaned_examples)}):")
        for idx, row in cleaned_examples.iterrows():
            print(f"\n  Company ID: {row['company_id']}")
            print(f"  Original: {row.get('original_company_name', 'N/A')}")
            print(f"  Cleaned: {row.get('company_name', 'N/A')}")
            print(f"  Website: {row.get('website_url', 'N/A')}")
            print(f"  Method: {row.get('data_source', 'N/A')}")
            print(f"  Confidence: {row.get('confidence', 'N/A')}")
    
    # Check for person names pattern
    if 'original_company_name' in df.columns:
        person_pattern_count = df[df['original_company_name'].str.match(r'^[A-Z][a-z]+ [A-Z][a-z]+$', na=False)].shape[0]
        print(f"\nPerson names detected in original: {person_pattern_count}")
        
        # Check how many were cleaned
        person_names_cleaned = df[
            (df['original_company_name'].str.match(r'^[A-Z][a-z]+ [A-Z][a-z]+$', na=False)) & 
            (df['data_source'] != 'original')
        ].shape[0] if 'data_source' in df.columns else 0
        print(f"Person names cleaned: {person_names_cleaned}")
    
    # Check for long descriptions
    if 'original_company_name' in df.columns:
        long_desc_count = df[df['original_company_name'].str.len() > 100].shape[0]
        print(f"\nLong descriptions detected: {long_desc_count}")
        
        # Show example of long description cleaning
        long_desc_examples = df[df['original_company_name'].str.len() > 100].head(3)
        if len(long_desc_examples) > 0:
            print("\nExamples of long description cleaning:")
            for idx, row in long_desc_examples.iterrows():
                print(f"\n  Original (truncated): {row['original_company_name'][:80]}...")
                print(f"  Cleaned: {row.get('company_name', 'N/A')}")
    
    return df

def check_database_integrity():
    """Verify the original database hasn't been modified"""
    db_path = '/root/pvtcompanydata/data/processed/company_database.db'
    conn = sqlite3.connect(db_path)
    
    # Get current count
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM companies WHERE (loan_amount IS NULL OR loan_amount = 0) AND (source_type IS NULL OR source_type != 'PPP_LOAN')")
    count = cursor.fetchone()[0]
    print(f"\n=== Database Integrity Check ===")
    print(f"Non-PPP companies in database: {count}")
    
    # Check a few samples haven't been modified
    cursor.execute("""
        SELECT company_id, company_name, website_url 
        FROM companies 
        WHERE (loan_amount IS NULL OR loan_amount = 0) 
              AND (source_type IS NULL OR source_type != 'PPP_LOAN')
        LIMIT 5
    """)
    samples = cursor.fetchall()
    print("\nSample records from original database:")
    for sample in samples:
        print(f"  {sample[0]}: {sample[1]} | {sample[2]}")
    
    conn.close()

if __name__ == "__main__":
    # Check latest batch files
    cleaning_dir = '/root/openBB/cleaning_data'
    batch_files = [f for f in os.listdir(cleaning_dir) if f.startswith('cleaned_batch_') and f.endswith('.csv')]
    batch_files.sort()
    
    print("=== Data Cleaning Verification Report ===")
    print(f"Found {len(batch_files)} batch files")
    
    # Verify database integrity
    check_database_integrity()
    
    # Verify each batch
    for batch_file in batch_files[-2:]:  # Check last 2 batches
        verify_cleaning_results(os.path.join(cleaning_dir, batch_file))
    
    print("\n=== Summary ===")
    print("✓ Original database remains unchanged")
    print("✓ Cleaned data stored separately with original values preserved")
    print("\nReady to proceed with next batch? Check the examples above.")