#!/usr/bin/env python3
"""
Script to migrate SQLite data to MySQL on AWS RDS
"""
import sqlite3
import pymysql
from pymysql.cursors import DictCursor
import os
from datetime import datetime
from dotenv import load_dotenv
import sys

# Load AWS configuration
load_dotenv('../.env')

# SQLite configuration
SQLITE_DB_PATH = '/root/pvtcompanydata/data/processed/company_database.db'
SQLITE_INCREMENTAL_DB_PATH = '/root/pvtcompanydata/data/processed/incremental_companies.db'

# MySQL configuration from environment
MYSQL_CONFIG = {
    'host': os.getenv('AWS_RDS_HOST', 'omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com'),
    'port': int(os.getenv('AWS_RDS_PORT', 3306)),
    'database': os.getenv('AWS_RDS_DATABASE', 'omni_ai'),
    'user': os.getenv('AWS_RDS_USERNAME', 'admin'),
    'password': os.getenv('AWS_RDS_PASSWORD', '7atwj76e'),
    'charset': 'utf8mb4',
    'cursorclass': DictCursor
}

def create_tables_if_not_exists(mysql_conn):
    """Create tables in MySQL if they don't exist"""
    with open('rds-mysql-schema.sql', 'r') as f:
        schema_sql = f.read()
    
    cursor = mysql_conn.cursor()
    # Split and execute each statement
    for statement in schema_sql.split(';'):
        if statement.strip():
            try:
                cursor.execute(statement)
            except Exception as e:
                if 'already exists' not in str(e):
                    print(f"Error executing statement: {e}")
    
    mysql_conn.commit()
    cursor.close()

def migrate_table(sqlite_path, sqlite_table, mysql_table, mysql_conn):
    """Migrate a single table from SQLite to MySQL"""
    print(f"Migrating {sqlite_table} from {sqlite_path} to MySQL table {mysql_table}...")
    
    if not os.path.exists(sqlite_path):
        print(f"Warning: {sqlite_path} not found. Skipping...")
        return
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    mysql_cursor = mysql_conn.cursor()
    
    try:
        # Get data from SQLite
        sqlite_cursor.execute(f"SELECT * FROM {sqlite_table}")
        rows = sqlite_cursor.fetchall()
        
        if not rows:
            print(f"No data found in {sqlite_table}")
            return
        
        # Get column names
        columns = list(rows[0].keys())
        # Remove id column for auto-increment
        if 'id' in columns:
            columns.remove('id')
        
        # Prepare insert query
        placeholders = ', '.join(['%s'] * len(columns))
        columns_str = ', '.join([f"`{col}`" for col in columns])
        
        insert_query = f"""
            INSERT INTO {mysql_table} ({columns_str}) 
            VALUES ({placeholders})
            ON DUPLICATE KEY UPDATE
            updated_at = CURRENT_TIMESTAMP
        """
        
        # Convert rows to tuples
        data = []
        for row in rows:
            row_data = []
            for col in columns:
                value = row[col]
                # Handle None/NULL values
                if value is None:
                    row_data.append(None)
                # Handle date conversions
                elif col in ['last_funding_date', 'created_at', 'updated_at']:
                    if value and value != '':
                        try:
                            # Parse various date formats
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
        
        # Batch insert into MySQL
        batch_size = 100
        for i in range(0, len(data), batch_size):
            batch = data[i:i+batch_size]
            mysql_cursor.executemany(insert_query, batch)
            mysql_conn.commit()
            print(f"  Inserted batch {i//batch_size + 1} ({len(batch)} rows)")
        
        print(f"Successfully migrated {len(rows)} rows from {sqlite_table}")
        
    except Exception as e:
        print(f"Error migrating {sqlite_table}: {str(e)}")
        mysql_conn.rollback()
        raise
    finally:
        sqlite_conn.close()
        mysql_cursor.close()

def test_connection():
    """Test MySQL connection"""
    try:
        conn = pymysql.connect(**MYSQL_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"Connected to MySQL: {version}")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Failed to connect to MySQL: {e}")
        return False

def main():
    """Main migration function"""
    print("Starting SQLite to MySQL migration...")
    print(f"Timestamp: {datetime.now()}")
    print(f"MySQL Host: {MYSQL_CONFIG['host']}")
    print(f"Database: {MYSQL_CONFIG['database']}")
    
    # Test connection
    if not test_connection():
        print("Cannot connect to MySQL. Please check your configuration.")
        sys.exit(1)
    
    # Connect to MySQL
    mysql_conn = pymysql.connect(**MYSQL_CONFIG)
    
    try:
        # Create tables if they don't exist
        print("\nCreating tables if needed...")
        create_tables_if_not_exists(mysql_conn)
        
        # Migrate main companies table
        if os.path.exists(SQLITE_DB_PATH):
            migrate_table(SQLITE_DB_PATH, 'companies', 'companies', mysql_conn)
        
        # Migrate incremental companies table  
        if os.path.exists(SQLITE_INCREMENTAL_DB_PATH):
            migrate_table(SQLITE_INCREMENTAL_DB_PATH, 'companies', 'incremental_companies', mysql_conn)
        
        print("\nMigration completed successfully!")
        
        # Show summary
        cursor = mysql_conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM companies")
        companies_count = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM incremental_companies")
        incremental_count = cursor.fetchone()['count']
        
        print(f"\nSummary:")
        print(f"  Companies table: {companies_count} rows")
        print(f"  Incremental companies table: {incremental_count} rows")
        
    finally:
        mysql_conn.close()

if __name__ == "__main__":
    main()