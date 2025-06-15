#!/usr/bin/env python3
"""Check database content for document-viewer links"""

import mysql.connector
import json

# Database connection
conn = mysql.connector.connect(
    host="localhost",
    port=3306,
    user="root",
    password="rootpassword",
    database="deer_flow"
)

cursor = conn.cursor()

# Check for messages with citations
print("=== Checking messages with citations ===")
cursor.execute("""
    SELECT id, role, SUBSTRING(content, 1, 100) as content_preview, citations
    FROM chat_messages 
    WHERE citations IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 5
""")

for row in cursor.fetchall():
    msg_id, role, content, citations = row
    print(f"\nMessage ID: {msg_id}")
    print(f"Role: {role}")
    print(f"Content preview: {content}")
    if citations:
        print(f"Citations: {json.dumps(json.loads(citations), indent=2)[:200]}...")

# Check for any content with document-viewer
print("\n\n=== Checking for document-viewer in content ===")
cursor.execute("""
    SELECT id, SUBSTRING(content, 1, 200) as content_preview
    FROM chat_messages 
    WHERE content LIKE '%document-viewer%'
""")

results = cursor.fetchall()
if results:
    for row in results:
        print(f"Found in message {row[0]}: {row[1]}")
else:
    print("No messages contain 'document-viewer'")

# Check for markdown links in content
print("\n\n=== Checking for markdown links in content ===")
cursor.execute("""
    SELECT id, content
    FROM chat_messages 
    WHERE content REGEXP '\\[[^\\]]+\\]\\([^\\)]+\\)'
    ORDER BY created_at DESC
    LIMIT 3
""")

results = cursor.fetchall()
if results:
    for row in results:
        import re
        links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', row[1])
        if links:
            print(f"\nMessage {row[0]} contains links:")
            for text, url in links[:5]:
                print(f"  [{text}]({url})")
else:
    print("No messages contain markdown links")

cursor.close()
conn.close()