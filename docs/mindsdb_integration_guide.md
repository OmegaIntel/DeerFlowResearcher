# MindsDB Integration Guide

This guide explains how to integrate MindsDB with your deer-flow application and connect various services like Gmail, SharePoint, and Outlook.

## 1. Setting Up MindsDB

### Option A: Docker (Recommended)
```bash
# Start MindsDB with Docker
docker run -d \
  --name mindsdb \
  -p 47334:47334 \
  -p 47335:47335 \
  -v mindsdb_data:/root/mindsdb \
  mindsdb/mindsdb

# Access MindsDB GUI
open http://localhost:47334
```

### Option B: Cloud (MindsDB Cloud)
```bash
# Sign up at https://cloud.mindsdb.com
# Use cloud URL in your configuration:
# https://cloud.mindsdb.com/api/mcp/sse
```

### Option C: Local Installation
```bash
pip install mindsdb
python -m mindsdb --api http --port 47334
```

## 2. Configure MindsDB in deer-flow

Add to your MCP settings:

```json
{
  "mcp_settings": {
    "servers": {
      "mindsdb": {
        "name": "mindsdb",
        "transport": "sse",
        "url": "http://localhost:47334/api/mcp/sse",
        "env": {
          "MINDSDB_USERNAME": "mindsdb",
          "MINDSDB_PASSWORD": "your_password",
          "MINDSDB_API_KEY": "your_api_key"
        },
        "enabled_tools": [
          "query_database",
          "create_predictor", 
          "list_databases",
          "create_database",
          "train_model",
          "predict"
        ],
        "add_to_agents": ["researcher", "coordinator"]
      }
    }
  }
}
```

## 3. Service Integrations

### Google Drive Integration

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API
4. Create OAuth2 credentials (Desktop Application)
5. Download credentials.json file

#### Step 2: Connect Google Drive to MindsDB
```sql
-- Connect Google Drive
CREATE DATABASE google_drive_data
WITH ENGINE = 'google_drive',
PARAMETERS = {
    "credentials_file": "/path/to/credentials.json"
};

-- List available tables
SHOW TABLES FROM google_drive_data;

-- Query files
SELECT 
    name,
    mimeType,
    size,
    createdTime,
    modifiedTime,
    webViewLink
FROM google_drive_data.files
WHERE name LIKE '%report%'
    AND mimeType LIKE '%document%'
ORDER BY modifiedTime DESC
LIMIT 10;

-- Search for specific content
SELECT 
    name,
    content,
    mimeType,
    parents
FROM google_drive_data.files
WHERE content LIKE '%budget%'
    OR name LIKE '%budget%'
LIMIT 5;
```

#### Step 3: Use via MCP in deer-flow
```bash
# In deer-flow chat, use @ mention:
@mindsdb find documents about budget in my Google Drive
@mindsdb show me recent presentations from Drive
@mindsdb search for files containing "project timeline"
```

### Gmail Integration

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth2 credentials (Desktop Application)
5. Download credentials.json file

#### Step 2: Connect Gmail to MindsDB
```sql
-- Connect Gmail
CREATE DATABASE gmail_data
WITH ENGINE = 'gmail',
PARAMETERS = {
    "credentials_file": "/path/to/credentials.json"
};

-- List available tables
SHOW TABLES FROM gmail_data;

-- Query emails
SELECT 
    subject,
    sender,
    date,
    body_plain
FROM gmail_data.emails
WHERE date > '2024-01-01'
    AND subject LIKE '%meeting%'
LIMIT 10;
```

#### Step 3: Use via MCP
```bash
# In deer-flow chat, use @ mention:
@mindsdb query emails from Gmail about meetings this week
```

### SharePoint Integration

#### Step 1: Register Azure App
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "App registrations"
3. Create new registration
4. Add API permissions for SharePoint
5. Create client secret

#### Step 2: Connect SharePoint to MindsDB
```sql
-- Connect SharePoint
CREATE DATABASE sharepoint_data
WITH ENGINE = 'sharepoint',
PARAMETERS = {
    "tenant_id": "your_tenant_id",
    "client_id": "your_client_id", 
    "client_secret": "your_client_secret",
    "site_url": "https://yourcompany.sharepoint.com/sites/yoursite"
};

-- Query SharePoint lists
SELECT * FROM sharepoint_data.list_items
WHERE list_name = 'Tasks'
    AND status = 'In Progress';
```

### Outlook Integration

#### Step 1: Use Microsoft Graph API
```sql
-- Connect Outlook
CREATE DATABASE outlook_data  
WITH ENGINE = 'outlook',
PARAMETERS = {
    "tenant_id": "your_tenant_id",
    "client_id": "your_client_id",
    "client_secret": "your_client_secret"
};

-- Query emails
SELECT 
    subject,
    from_email,
    received_datetime,
    body_preview
FROM outlook_data.messages
WHERE received_datetime > '2024-01-01'
    AND importance = 'high'
ORDER BY received_datetime DESC;
```

## 4. Advanced Queries

### Cross-Service Analytics
```sql
-- Analyze email patterns across Gmail and Outlook
SELECT 
    'Gmail' as source,
    COUNT(*) as email_count,
    AVG(LENGTH(body_plain)) as avg_length
FROM gmail_data.emails
WHERE date > '2024-01-01'

UNION ALL

SELECT 
    'Outlook' as source,
    COUNT(*) as email_count,
    AVG(LENGTH(body_preview)) as avg_length  
FROM outlook_data.messages
WHERE received_datetime > '2024-01-01';
```

### Create Predictive Models
```sql
-- Train model to predict email importance
CREATE MODEL email_importance_predictor
FROM gmail_data.emails
PREDICT importance
USING engine = 'lightgbm';

-- Make predictions
SELECT 
    subject,
    predicted_importance,
    confidence
FROM email_importance_predictor
WHERE subject LIKE '%budget%';
```

## 5. deer-flow Usage Examples

### Using @ Mentions for Google Drive
```bash
# Search documents
@mindsdb find all PDF files in my Google Drive from last month
@mindsdb show me documents containing "budget" or "financial"
@mindsdb list recent spreadsheets shared with me

# Content analysis
@mindsdb summarize the content of documents about project planning
@mindsdb find presentations about quarterly results
@mindsdb show me all files modified in the last 7 days

# Cross-service queries
@mindsdb compare document activity between Drive and SharePoint
@mindsdb find emails mentioning files from my Drive
```

### Using @ Mentions for Other Services
```bash
# Query across services
@mindsdb show me high priority emails from Outlook this week

# Analyze SharePoint data  
@mindsdb list all tasks in SharePoint with status "In Progress"

# Cross-service insights
@mindsdb compare email volume between Gmail and Outlook last month

# Predictive queries
@mindsdb predict which emails are most important based on subject and sender
```

### API Usage
```json
{
  "messages": [{"role": "user", "content": "Show me meeting requests from Gmail in the last 7 days"}],
  "tool_id": "mindsdb.query_database", 
  "tool_type": "mcp",
  "mcp_settings": {
    "servers": {
      "mindsdb": {
        "transport": "sse",
        "url": "http://localhost:47334/api/mcp/sse",
        "env": {
          "MINDSDB_USERNAME": "mindsdb",
          "MINDSDB_PASSWORD": "your_password"
        }
      }
    }
  }
}
```

## 6. Authentication Setup

### Environment Variables
```bash
# Add to your .env file
MINDSDB_USERNAME=mindsdb
MINDSDB_PASSWORD=your_secure_password
MINDSDB_API_KEY=your_api_key
GOOGLE_CREDENTIALS_PATH=/path/to/google_credentials.json
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
```

### Service-Specific Setup

#### Gmail OAuth2 Scopes
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`

#### Google Drive API Scopes
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive.metadata.readonly`
- `https://www.googleapis.com/auth/drive.file`

#### Microsoft Graph Permissions
- `Mail.Read`
- `Mail.Send`
- `Sites.Read.All`
- `Files.Read.All`

## 7. Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check API credentials
   - Verify OAuth2 tokens are valid
   - Ensure proper scopes are granted

2. **Connection Timeouts**
   - Increase timeout settings
   - Check MindsDB service status
   - Verify network connectivity

3. **Query Errors**
   - Check database connection status
   - Verify table/view names
   - Review MindsDB logs

### Debug Commands
```sql
-- Check database status
SHOW DATABASES;

-- Test connection
SELECT 1 FROM gmail_data.emails LIMIT 1;

-- View logs
SHOW LOGS;
```

## 8. Next Steps

1. **Set up MindsDB instance** (Docker recommended)
2. **Configure service credentials** for Gmail, SharePoint, Outlook
3. **Add MindsDB to deer-flow** MCP settings
4. **Test connections** with simple queries
5. **Create predictive models** for your specific use cases
6. **Integrate with deer-flow** @ mention system

For more information, visit:
- [MindsDB Documentation](https://docs.mindsdb.com)
- [MindsDB MCP Integration](https://docs.mindsdb.com/integrations/mcp)
- [Service-Specific Handlers](https://docs.mindsdb.com/integrations/data-integrations)