#!/usr/bin/env python3
"""
Safe migration script with better error handling and progress monitoring
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
SQLITE_INCREMENTAL_DB_PATH = '/root/pvtcompanydata/data/processed/incremental_companies.db'

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

def check_existing_data(mysql_conn, table_name):
    """Check if table already has data"""
    cursor = mysql_conn.cursor()
    try:
        cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
        result = cursor.fetchone()
        return result['count'] if result else 0
    except:
        return 0
    finally:
        cursor.close()

def get_sqlite_count(db_path, table_name):
    """Get row count from SQLite table"""
    if not os.path.exists(db_path):
        return 0
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        return cursor.fetchone()[0]
    except:
        return 0
    finally:
        conn.close()

def migrate_with_progress(sqlite_path, sqlite_table, mysql_table, mysql_conn, batch_size=50):
    """Migrate with progress tracking and smaller batches"""
    print(f"\nMigrating {sqlite_table} from {os.path.basename(sqlite_path)}")
    
    # Check existing data
    existing_count = check_existing_data(mysql_conn, mysql_table)
    sqlite_count = get_sqlite_count(sqlite_path, sqlite_table)
    
    print(f"  SQLite rows: {sqlite_count}")
    print(f"  MySQL rows: {existing_count}")
    
    if existing_count >= sqlite_count:
        print(f"  ✓ Table {mysql_table} already has all data. Skipping...")
        return
    
    # Ask for confirmation
    response = input(f"  Migrate {sqlite_count - existing_count} new rows? (y/n): ")
    if response.lower() != 'y':
        print("  Skipping...")
        return
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    mysql_cursor = mysql_conn.cursor()
    
    try:
        # Get data in chunks
        offset = existing_count  # Start from where we left off
        processed = 0
        start_time = time.time()
        
        while offset < sqlite_count:
            # Get batch
            sqlite_cursor.execute(f"""
                SELECT * FROM {sqlite_table} 
                LIMIT {batch_size} OFFSET {offset}
            """)
            rows = sqlite_cursor.fetchall()
            
            if not rows:
                break
            
            # Get column names
            columns = list(rows[0].keys())
            if 'id' in columns:
                columns.remove('id')
            
            # Prepare data
            data = []
            for row in rows:
                row_data = []
                for col in columns:
                    value = row[col]
                    if value is None:
                        row_data.append(None)
                    elif col in ['last_funding_date', 'created_at', 'updated_at']:
                        if value and value != '':
                            try:
                                if 'T' in str(value):
                                    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                                    row_data.append(dt.strftime('%Y-%m-%d %H:%M:%S'))
                                else:
                                    row_data.append(value)
                            except:
                                row_data.append(None)
                        else:
                            row_data.append(None)
                    else:
                        row_data.append(value)
                data.append(tuple(row_data))
            
            # Insert batch
            placeholders = ', '.join(['%s'] * len(columns))
            columns_str = ', '.join([f"`{col}`" for col in columns])
            
            insert_query = f"""
                INSERT IGNORE INTO {mysql_table} ({columns_str}) 
                VALUES ({placeholders})
            """
            
            mysql_cursor.executemany(insert_query, data)
            mysql_conn.commit()
            
            processed += len(rows)
            offset += batch_size
            
            # Progress update
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            eta = (sqlite_count - offset) / rate if rate > 0 else 0
            
            print(f"  Progress: {offset}/{sqlite_count} ({offset/sqlite_count*100:.1f}%) "
                  f"Rate: {rate:.0f} rows/sec ETA: {eta/60:.1f} min", end='\r')
            
        print(f"\n  ✓ Migrated {processed} rows successfully!")
        
    except Exception as e:
        print(f"\n  ✗ Error: {str(e)}")
        mysql_conn.rollback()
        raise
    finally:
        sqlite_conn.close()
        mysql_cursor.close()

def main():
    """Main migration function"""
    print("=== Safe SQLite to MySQL Migration ===")
    print(f"Timestamp: {datetime.now()}")
    
    # Test connection
    try:
        mysql_conn = pymysql.connect(**MYSQL_CONFIG)
        print("✓ Connected to MySQL successfully")
    except Exception as e:
        print(f"✗ MySQL connection failed: {e}")
        sys.exit(1)
    
    try:
        # Check what needs migration
        print("\nChecking migration status...")
        
        # Main companies database
        if os.path.exists(SQLITE_DB_PATH):
            migrate_with_progress(SQLITE_DB_PATH, 'companies', 'companies', mysql_conn)
        else:
            print(f"✗ Main database not found: {SQLITE_DB_PATH}")
        
        # Incremental companies database
        if os.path.exists(SQLITE_INCREMENTAL_DB_PATH):
            migrate_with_progress(SQLITE_INCREMENTAL_DB_PATH, 'companies', 
                                'incremental_companies', mysql_conn)
        else:
            print(f"✗ Incremental database not found: {SQLITE_INCREMENTAL_DB_PATH}")
        
        # Final summary
        print("\n=== Migration Summary ===")
        cursor = mysql_conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as count FROM companies")
        companies_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM incremental_companies")
        incremental_count = cursor.fetchone()['count']
        
        print(f"Companies table: {companies_count:,} rows")
        print(f"Incremental companies: {incremental_count:,} rows")
        print(f"Total: {companies_count + incremental_count:,} rows")
        
    finally:
        mysql_conn.close()
        print("\n✓ Migration completed!")

if __name__ == "__main__":
    main()