#!/usr/bin/env python3
"""
Test MySQL connection to existing AWS RDS instance
"""
import pymysql
from pymysql.cursors import DictCursor
import os
from dotenv import load_dotenv

# Load environment
load_dotenv('../.env.aws-prod')

def test_mysql_connection():
    """Test connection to MySQL RDS"""
    config = {
        'host': os.getenv('AWS_RDS_HOST', 'omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com'),
        'port': int(os.getenv('AWS_RDS_PORT', 3306)),
        'database': os.getenv('AWS_RDS_DATABASE', 'omni_ai'),
        'user': os.getenv('AWS_RDS_USERNAME', 'admin'),
        'password': os.getenv('AWS_RDS_PASSWORD', '7atwj76e'),
        'charset': 'utf8mb4',
        'cursorclass': DictCursor
    }
    
    print("Testing MySQL connection...")
    print(f"Host: {config['host']}")
    print(f"Database: {config['database']}")
    
    try:
        conn = pymysql.connect(**config)
        cursor = conn.cursor()
        
        # Test connection
        cursor.execute("SELECT VERSION() as version")
        result = cursor.fetchone()
        print(f"✓ Connected successfully!")
        print(f"  MySQL Version: {result['version']}")
        
        # Check existing tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"\nExisting tables in {config['database']}:")
        for table in tables:
            table_name = list(table.values())[0]
            cursor.execute(f"SELECT COUNT(*) as count FROM `{table_name}`")
            count = cursor.fetchone()['count']
            print(f"  - {table_name}: {count} rows")
        
        # Check if our tables exist
        cursor.execute("SHOW TABLES LIKE 'companies'")
        if cursor.fetchone():
            print("\n✓ 'companies' table exists")
        else:
            print("\n✗ 'companies' table does not exist - will be created during migration")
            
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_mysql_connection()