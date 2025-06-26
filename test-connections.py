#!/usr/bin/env python3
"""Test AWS connections"""
import os
from dotenv import load_dotenv

load_dotenv('.env')

print("=== Testing Connections ===")
print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'Not set')}")
print(f"REDIS_URL: {os.getenv('REDIS_URL', 'Not set')}")

# Test MySQL connection
try:
    import pymysql
    mysql_config = {
        'host': os.getenv('AWS_RDS_HOST'),
        'port': int(os.getenv('AWS_RDS_PORT', 3306)),
        'database': os.getenv('AWS_RDS_DATABASE'),
        'user': os.getenv('AWS_RDS_USERNAME'),
        'password': os.getenv('AWS_RDS_PASSWORD')
    }
    print(f"\nConnecting to MySQL at {mysql_config['host']}...")
    conn = pymysql.connect(**mysql_config)
    print("✓ MySQL connection successful!")
    conn.close()
except Exception as e:
    print(f"✗ MySQL connection failed: {e}")

# Test Redis connection
try:
    import redis
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
    print(f"\nConnecting to Redis at {redis_url}...")
    r = redis.from_url(redis_url)
    r.ping()
    print("✓ Redis connection successful!")
except Exception as e:
    print(f"✗ Redis connection failed: {e}")

print("\n=== API Keys Status ===")
print(f"FMP_API_KEY: {'✓ Set' if os.getenv('FMP_API_KEY') else '✗ Not set'}")
print(f"POLYGON_API_KEY: {'✓ Set' if os.getenv('POLYGON_API_KEY') else '✗ Not set'}")
print(f"ALPHA_VANTAGE_API_KEY: {'✓ Set' if os.getenv('ALPHA_VANTAGE_API_KEY') else '✗ Not set'}")
print(f"OPENBB_PAT: {'✓ Set' if os.getenv('OPENBB_PAT') else '✗ Not set'}")