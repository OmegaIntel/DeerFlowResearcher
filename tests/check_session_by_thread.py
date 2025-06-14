import pymysql
import os
from datetime import datetime

# Database connection
connection = pymysql.connect(
    host='localhost',
    user='deer',
    password='deerflow',
    database='deerflow',
    port=3306
)

try:
    with connection.cursor() as cursor:
        # Get recent sessions
        print("=== Recent Sessions ===")
        query = """
        SELECT id, thread_id, title, user_id, created_at, last_message_at
        FROM chat_sessions
        ORDER BY created_at DESC
        LIMIT 10
        """
        cursor.execute(query)
        sessions = cursor.fetchall()
        
        for session in sessions:
            print(f"\nSession ID: {session[0]}")
            print(f"Thread ID: {session[1]}")
            print(f"Title: {session[2]}")
            print(f"User ID: {session[3]}")
            print(f"Created: {session[4]}")
            print(f"Last Message: {session[5]}")
            
        # Look for sessions with thread_id starting with 'test_thread'
        print("\n\n=== Test Thread Sessions ===")
        query = """
        SELECT id, thread_id, title, user_id, created_at
        FROM chat_sessions
        WHERE thread_id LIKE 'test_thread%'
        ORDER BY created_at DESC
        """
        cursor.execute(query)
        test_sessions = cursor.fetchall()
        
        if test_sessions:
            for session in test_sessions:
                print(f"\nSession ID: {session[0]}")
                print(f"Thread ID: {session[1]}")
                print(f"Title: {session[2]}")
                print(f"User ID: {session[3]}")
                print(f"Created: {session[4]}")
        else:
            print("No test thread sessions found")
            
finally:
    connection.close()