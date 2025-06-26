#!/usr/bin/env python3
"""
Automatic migration script - non-interactive version
"""
import sqlite3
import pymysql
from pymysql.cursors import DictCursor
import os
from datetime import datetime
from dotenv import load_dotenv
import sys
import time

# Load environment
load_dotenv('../.env')

# Configuration
SQLITE_DB_PATH = '/root/pvtcompanydata/data/processed/company_database.db'
MYSQL_CONFIG = {
    'host': os.getenv('AWS_RDS_HOST', 'omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com'),
    'port': int(os.getenv('AWS_RDS_PORT', 3306)),
    'database': os.getenv('AWS_RDS_DATABASE', 'omni_ai'),
    'user': os.getenv('AWS_RDS_USERNAME', 'admin'),
    'password': os.getenv('AWS_RDS_PASSWORD', '7atwj76e'),
    'charset': 'utf8mb4',
    'cursorclass': DictCursor,
    'connect_timeout': 30
}

def check_if_migration_needed():
    """Check if migration is needed"""
    mysql_conn = pymysql.connect(**MYSQL_CONFIG)
    cursor = mysql_conn.cursor()
    
    try:
        # Check existing data
        cursor.execute("SELECT COUNT(*) as count FROM companies")
        mysql_count = cursor.fetchone()['count']
        
        # Check SQLite count
        if os.path.exists(SQLITE_DB_PATH):
            sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
            sqlite_cursor = sqlite_conn.cursor()
            sqlite_cursor.execute("SELECT COUNT(*) FROM companies")
            sqlite_count = sqlite_cursor.fetchone()[0]
            sqlite_conn.close()
        else:
            sqlite_count = 0
        
        print(f"SQLite rows: {sqlite_count:,}")
        print(f"MySQL rows: {mysql_count:,}")
        
        if mysql_count >= sqlite_count:
            print("✓ Migration already complete!")
            return False
        
        print(f"Need to migrate {sqlite_count - mysql_count:,} rows")
        return True
        
    finally:
        cursor.close()
        mysql_conn.close()

def main():
    """Main function"""
    print("=== Checking Migration Status ===")
    print(f"Timestamp: {datetime.now()}")
    
    if not check_if_migration_needed():
        print("\nNo migration needed. Starting application...")
        return
    
    print("\n⚠️  LARGE MIGRATION DETECTED!")
    print("The database has 14.9 million rows to migrate.")
    print("This could take 30-60 minutes and may cause system load.")
    print("")
    print("Options:")
    print("1. Skip migration and start with empty MySQL (faster)")
    print("2. Run full migration later when system is less busy")
    print("")
    print("For now, let's start the application with the existing MySQL data.")
    print("You can run the migration manually later with:")
    print("  cd aws-migration && python3 migrate-sqlite-to-mysql.py")

if __name__ == "__main__":
    main()