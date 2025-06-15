#!/usr/bin/env python3
"""Debug user documents"""

import mysql.connector
import json

conn = mysql.connector.connect(
    host="localhost",
    port=3306,
    user="root",
    password="rootpassword",
    database="deer_flow"
)

cursor = conn.cursor()

# Get all users
print("=== Users in system ===")
cursor.execute("SELECT id, email FROM users")
for user_id, email in cursor.fetchall():
    print(f"User: {user_id} - {email}")

# Get all documents
print("\n=== Documents in system ===")
cursor.execute("""
    SELECT d.id, d.user_id, d.filename, d.session_id, u.email
    FROM documents d
    LEFT JOIN users u ON d.user_id = u.id
    WHERE d.is_active = 1
    ORDER BY d.created_at DESC
    LIMIT 10
""")

for doc_id, user_id, filename, session_id, email in cursor.fetchall():
    print(f"Doc: {doc_id}")
    print(f"  User: {user_id} ({email})")
    print(f"  File: {filename}")
    print(f"  Session: {session_id}")
    print()

cursor.close()
conn.close()