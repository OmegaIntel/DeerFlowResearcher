#!/usr/bin/env python3
"""
Setup script for connecting Google Drive to MindsDB in deer-flow application.
Run this script to automatically configure Google Drive integration.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

def print_step(step_num, description):
    print(f"\n{'='*60}")
    print(f"STEP {step_num}: {description}")
    print('='*60)

def main():
    print("🦌 Google Drive + MindsDB Setup for deer-flow")
    print("This script will help you set up Google Drive integration with MindsDB")
    
    # Step 1: Check prerequisites
    print_step(1, "Checking Prerequisites")
    
    # Check if MindsDB is running
    try:
        import requests
        response = requests.get("http://localhost:47334/api/status", timeout=5)
        print("✅ MindsDB is running")
    except:
        print("❌ MindsDB is not running. Starting MindsDB with Docker...")
        try:
            subprocess.run([
                "docker", "run", "-d",
                "--name", "mindsdb",
                "-p", "47334:47334",
                "-p", "47335:47335",
                "-v", "mindsdb_data:/root/mindsdb",
                "mindsdb/mindsdb"
            ], check=True)
            print("✅ MindsDB started successfully")
        except subprocess.CalledProcessError:
            print("❌ Failed to start MindsDB. Please start it manually:")
            print("   docker run -d --name mindsdb -p 47334:47334 -p 47335:47335 mindsdb/mindsdb")
            sys.exit(1)
    
    # Step 2: Google Cloud Setup Instructions
    print_step(2, "Google Cloud Project Setup")
    print("""
To connect Google Drive, you need to:

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable Google Drive API:
   - Go to APIs & Services > Library
   - Search for "Google Drive API"
   - Click "Enable"
4. Create OAuth2 credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Desktop Application"
   - Download the credentials.json file
5. Save the credentials.json file to this directory: /root/deer-flow/

Required OAuth2 Scopes:
- https://www.googleapis.com/auth/drive.readonly
- https://www.googleapis.com/auth/drive.metadata.readonly
- https://www.googleapis.com/auth/drive.file
""")
    
    credentials_path = input("\nEnter the path to your credentials.json file: ").strip()
    if not os.path.exists(credentials_path):
        print(f"❌ File not found: {credentials_path}")
        sys.exit(1)
    
    # Step 3: Update deer-flow configuration
    print_step(3, "Updating deer-flow Configuration")
    
    # Read existing conf.yaml
    conf_path = "/root/deer-flow/conf.yaml"
    try:
        with open(conf_path, 'r') as f:
            conf_content = f.read()
    except FileNotFoundError:
        conf_content = ""
    
    # Add MindsDB configuration if not present
    mindsdb_config = f"""
  mindsdb:
    transport: sse
    url: http://localhost:47334/api/mcp/sse
    env:
      MINDSDB_USERNAME: mindsdb
      MINDSDB_PASSWORD: ""
      GOOGLE_CREDENTIALS_PATH: {credentials_path}
"""
    
    if "mindsdb:" not in conf_content:
        # Add to mcp_servers section
        if "mcp_servers:" in conf_content:
            conf_content += mindsdb_config
        else:
            conf_content += f"\nmcp_servers:{mindsdb_config}"
        
        with open(conf_path, 'w') as f:
            f.write(conf_content)
        print("✅ Updated conf.yaml with MindsDB configuration")
    else:
        print("✅ MindsDB already configured in conf.yaml")
    
    # Step 4: Generate MindsDB setup SQL
    print_step(4, "MindsDB Database Setup")
    
    sql_setup = f"""
-- Connect to Google Drive
CREATE DATABASE google_drive_data
WITH ENGINE = 'google_drive',
PARAMETERS = {{
    "credentials_file": "{credentials_path}"
}};

-- Test the connection
SHOW TABLES FROM google_drive_data;

-- Example queries you can run:

-- 1. List recent files
SELECT 
    name,
    mimeType,
    size,
    createdTime,
    modifiedTime,
    webViewLink
FROM google_drive_data.files
ORDER BY modifiedTime DESC
LIMIT 10;

-- 2. Search for documents
SELECT 
    name,
    content,
    mimeType
FROM google_drive_data.files
WHERE mimeType LIKE '%document%'
    AND name LIKE '%budget%'
LIMIT 5;

-- 3. Find spreadsheets
SELECT 
    name,
    size,
    modifiedTime
FROM google_drive_data.files
WHERE mimeType = 'application/vnd.google-apps.spreadsheet'
ORDER BY modifiedTime DESC
LIMIT 10;
"""
    
    with open("/root/deer-flow/google_drive_setup.sql", "w") as f:
        f.write(sql_setup)
    
    print("✅ Created google_drive_setup.sql with database setup commands")
    
    # Step 5: Usage instructions
    print_step(5, "Usage Instructions")
    print("""
🎉 Setup Complete! Here's how to use Google Drive with deer-flow:

1. Open MindsDB GUI: http://localhost:47334
2. Run the SQL commands from google_drive_setup.sql to set up the database
3. In deer-flow chat, use @ mentions like:
   
   @mindsdb find documents about budget in my Google Drive
   @mindsdb show me recent presentations from Drive
   @mindsdb search for files containing "project timeline"
   @mindsdb list all PDF files from last month

4. You can also run SQL queries directly in MindsDB:
   - Go to http://localhost:47334
   - Use the SQL editor to run custom queries

Example chat commands:
- "Find all spreadsheets modified this week"
- "Show me documents containing the word 'report'"
- "List my most recent Google Docs files"
- "Search for presentations about quarterly results"

For more examples, see: /root/deer-flow/docs/mindsdb_integration_guide.md
""")

if __name__ == "__main__":
    main()