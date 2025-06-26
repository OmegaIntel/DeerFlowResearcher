#!/usr/bin/env python3
"""
View sample results from data cleaning
"""
import os
import sys
import glob
import pandas as pd
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def main():
    # Find latest cleaning files
    csv_files = glob.glob('/tmp/*_cleaned_*.csv') + glob.glob('/tmp/*_original_*.csv')
    json_files = glob.glob('/tmp/*_summary_*.json') + glob.glob('/tmp/*_analysis_*.json')
    
    print("Found files:")
    for f in csv_files + json_files:
        print(f"  - {f}")
    
    # Look for the latest cleaned file
    cleaned_files = [f for f in csv_files if 'cleaned' in f]
    if cleaned_files:
        latest_cleaned = max(cleaned_files, key=os.path.getctime)
        print(f"\nReading latest cleaned file: {latest_cleaned}")
        
        df = pd.read_csv(latest_cleaned)
        print(f"\nTotal rows: {len(df)}")
        
        # Show some statistics
        if 'data_source' in df.columns:
            print("\nData sources:")
            print(df['data_source'].value_counts())
        
        if 'confidence' in df.columns:
            print("\nConfidence distribution:")
            print(f"  High (>0.8): {len(df[df['confidence'] > 0.8])}")
            print(f"  Medium (0.5-0.8): {len(df[(df['confidence'] >= 0.5) & (df['confidence'] <= 0.8)])}")
            print(f"  Low (<0.5): {len(df[df['confidence'] < 0.5])}")
        
        # Show sample of cleaned companies
        print("\nSample of cleaned companies:")
        # Look for companies that were actually cleaned
        if 'original_company_name' in df.columns and 'company_name' in df.columns:
            cleaned_df = df[df['original_company_name'] != df['company_name']].head(10)
            for idx, row in cleaned_df.iterrows():
                print(f"\n  Original: {row['original_company_name'][:60]}...")
                print(f"  Cleaned: {row['company_name']}")
                if 'data_source' in row:
                    print(f"  Source: {row['data_source']}")
    
    # Look for summary file
    summary_files = [f for f in json_files if 'summary' in f]
    if summary_files:
        latest_summary = max(summary_files, key=os.path.getctime)
        print(f"\n\nReading summary: {latest_summary}")
        with open(latest_summary, 'r') as f:
            summary = json.load(f)
            print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()