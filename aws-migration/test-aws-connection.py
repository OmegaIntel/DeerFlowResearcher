#!/usr/bin/env python3
"""
Test script to verify AWS services connectivity
"""
import os
import sys
import psycopg2
import redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

def test_rds_connection():
    """Test RDS PostgreSQL connection"""
    print("Testing RDS PostgreSQL connection...")
    
    try:
        # Get connection parameters
        db_config = {
            'host': os.getenv('AWS_RDS_HOST'),
            'port': os.getenv('AWS_RDS_PORT', 5432),
            'database': os.getenv('AWS_RDS_DATABASE', 'postgres'),  # Use default postgres DB for initial connection
            'user': os.getenv('AWS_RDS_USERNAME'),
            'password': os.getenv('AWS_RDS_PASSWORD')
        }
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✓ Successfully connected to RDS PostgreSQL")
        print(f"  PostgreSQL version: {version[0]}")
        
        # Check if openbb_db exists
        cursor.execute("SELECT datname FROM pg_database WHERE datname = 'openbb_db';")
        db_exists = cursor.fetchone()
        
        if not db_exists:
            print("  Creating openbb_db database...")
            conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
            cursor.execute("CREATE DATABASE openbb_db;")
            print("  ✓ Database openbb_db created")
        else:
            print("  ✓ Database openbb_db already exists")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ RDS connection failed: {str(e)}")
        return False

def test_elasticache_connection():
    """Test ElastiCache Redis connection"""
    print("\nTesting ElastiCache Redis connection...")
    
    try:
        # Get connection parameters
        redis_host = os.getenv('AWS_REDIS_HOST')
        redis_port = int(os.getenv('AWS_REDIS_PORT', 6379))
        
        # Connect to Redis
        client = redis.Redis(
            host=redis_host,
            port=redis_port,
            decode_responses=True
        )
        
        # Test connection
        client.ping()
        print(f"✓ Successfully connected to ElastiCache Redis")
        
        # Set and get test value
        client.set('test_key', 'test_value', ex=60)
        value = client.get('test_key')
        if value == 'test_value':
            print("  ✓ Redis read/write test passed")
        
        # Check memory info
        info = client.info('memory')
        print(f"  Used memory: {info.get('used_memory_human', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"✗ ElastiCache connection failed: {str(e)}")
        return False

def main():
    """Run all connection tests"""
    print("AWS Services Connection Test for OpenBB")
    print("=" * 50)
    
    # Check if environment variables are set
    required_vars = [
        'AWS_RDS_HOST', 'AWS_RDS_USERNAME', 'AWS_RDS_PASSWORD',
        'AWS_REDIS_HOST'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        print(f"✗ Missing required environment variables: {', '.join(missing_vars)}")
        print("  Please update your .env file with AWS endpoints")
        sys.exit(1)
    
    # Run tests
    rds_ok = test_rds_connection()
    redis_ok = test_elasticache_connection()
    
    print("\n" + "=" * 50)
    if rds_ok and redis_ok:
        print("✓ All AWS services are connected successfully!")
        print("\nNext steps:")
        print("1. Run the migration script to transfer SQLite data to RDS")
        print("2. Update backend services to use AWS connections")
        print("3. Start the application with docker-compose.aws.yml")
    else:
        print("✗ Some services failed to connect. Please check your configuration.")
        sys.exit(1)

if __name__ == "__main__":
    main()