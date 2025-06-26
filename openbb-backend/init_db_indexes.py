#!/usr/bin/env python3
import sqlite3
import time
import os

db_path = '/data/company_database.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Initializing database indexes for {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check current indexes
cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
existing_indexes = [row[0] for row in cursor.fetchall()]
print(f"Existing indexes: {existing_indexes}")

# Create indexes
indexes = [
    ("idx_company_name", "CREATE INDEX IF NOT EXISTS idx_company_name ON companies(company_name)"),
    ("idx_industry_primary", "CREATE INDEX IF NOT EXISTS idx_industry_primary ON companies(industry_primary)"),
    ("idx_state", "CREATE INDEX IF NOT EXISTS idx_state ON companies(state)"),
    ("idx_status", "CREATE INDEX IF NOT EXISTS idx_status ON companies(status)"),
    ("idx_founded_year", "CREATE INDEX IF NOT EXISTS idx_founded_year ON companies(founded_year)"),
    ("idx_source_type", "CREATE INDEX IF NOT EXISTS idx_source_type ON companies(source_type)"),
    ("idx_city", "CREATE INDEX IF NOT EXISTS idx_city ON companies(city)"),
    ("idx_website_domain", "CREATE INDEX IF NOT EXISTS idx_website_domain ON companies(website_domain)"),
    ("idx_state_industry", "CREATE INDEX IF NOT EXISTS idx_state_industry ON companies(state, industry_primary)"),
]

for idx_name, idx_sql in indexes:
    print(f"Creating index: {idx_name}...")
    start = time.time()
    cursor.execute(idx_sql)
    conn.commit()
    print(f"  Created in {time.time() - start:.2f}s")

# Test query performance
print("\nTesting query performance...")

# Test 1: Count query
start = time.time()
count = cursor.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
print(f"Total count: {count:,} (took {time.time() - start:.3f}s)")

# Test 2: Filtered count
start = time.time()
count = cursor.execute("SELECT COUNT(*) FROM companies WHERE state = 'CA'").fetchone()[0]
print(f"California companies: {count:,} (took {time.time() - start:.3f}s)")

# Test 3: Search query
start = time.time()
cursor.execute("SELECT * FROM companies WHERE company_name LIKE '%tech%' LIMIT 10")
results = cursor.fetchall()
print(f"Search for 'tech': {len(results)} results (took {time.time() - start:.3f}s)")

# Analyze database
cursor.execute("ANALYZE")
cursor.execute("PRAGMA optimize")

conn.close()
print("\nDatabase optimization complete!")