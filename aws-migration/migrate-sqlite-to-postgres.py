#!/usr/bin/env python3
"""
Script to migrate SQLite data to PostgreSQL on AWS RDS
"""
import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
import os
from datetime import datetime
from dotenv import load_dotenv

# Load AWS configuration
load_dotenv('aws-config.env')

# SQLite configuration
SQLITE_DB_PATH = '/data/company_database.db'
SQLITE_INCREMENTAL_DB_PATH = '/data/incremental_companies.db'

# PostgreSQL configuration from environment
PG_CONFIG = {
    'host': os.getenv('AWS_RDS_HOST'),
    'port': os.getenv('AWS_RDS_PORT', 5432),
    'database': os.getenv('AWS_RDS_DATABASE'),
    'user': os.getenv('AWS_RDS_USERNAME'),
    'password': os.getenv('AWS_RDS_PASSWORD')
}

def migrate_table(sqlite_path, table_name, pg_table_name=None):
    """Migrate a single table from SQLite to PostgreSQL"""
    if pg_table_name is None:
        pg_table_name = table_name
    
    print(f"Migrating {table_name} from {sqlite_path} to PostgreSQL...")
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(**PG_CONFIG)
    pg_cursor = pg_conn.cursor()
    
    try:
        # Get data from SQLite
        sqlite_cursor.execute(f"SELECT * FROM {table_name}")
        rows = sqlite_cursor.fetchall()
        
        if not rows:
            print(f"No data found in {table_name}")
            return
        
        # Get column names
        columns = list(rows[0].keys())
        
        # Prepare insert query
        placeholders = ', '.join(['%s'] * len(columns))
        columns_str = ', '.join(columns)
        insert_query = f"""
            INSERT INTO {pg_table_name} ({columns_str}) 
            VALUES ({placeholders})
            ON CONFLICT (id) DO UPDATE SET
            {', '.join([f"{col} = EXCLUDED.{col}" for col in columns if col != 'id'])}
        """
        
        # Convert rows to tuples
        data = [tuple(row) for row in rows]
        
        # Batch insert into PostgreSQL
        execute_batch(pg_cursor, insert_query, data, page_size=100)
        
        pg_conn.commit()
        print(f"Successfully migrated {len(rows)} rows from {table_name}")
        
    except Exception as e:
        print(f"Error migrating {table_name}: {str(e)}")
        pg_conn.rollback()
        raise
    finally:
        sqlite_conn.close()
        pg_cursor.close()
        pg_conn.close()

def main():
    """Main migration function"""
    print("Starting SQLite to PostgreSQL migration...")
    print(f"Timestamp: {datetime.now()}")
    
    # Check if SQLite databases exist
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"Warning: {SQLITE_DB_PATH} not found")
    else:
        # Migrate main companies table
        migrate_table(SQLITE_DB_PATH, 'companies', 'companies')
    
    if not os.path.exists(SQLITE_INCREMENTAL_DB_PATH):
        print(f"Warning: {SQLITE_INCREMENTAL_DB_PATH} not found")
    else:
        # Migrate incremental companies table
        migrate_table(SQLITE_INCREMENTAL_DB_PATH, 'companies', 'incremental_companies')
    
    print("Migration completed!")

if __name__ == "__main__":
    main()