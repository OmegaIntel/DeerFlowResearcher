# APIdeck Integration Guide

## Overview
The APIdeck integration has been successfully implemented in your application. Users can now connect to various enterprise services through a unified interface.

## Supported Services
- **Box** - Cloud content management and file sharing
- **Dropbox** - Cloud storage and file synchronization  
- **Google Drive** - Cloud storage and file management
- **Microsoft Outlook** - Email and calendar management
- **OneDrive** - Microsoft cloud storage
- **SharePoint** - Document management and collaboration
- **Salesforce** - Customer relationship management

## How It Works

### 1. Enable Integration
- Go to Account Settings > Integrations tab
- Find the service you want to connect
- Toggle the switch to enable the integration

### 2. Connect Service
- Once enabled, a "Connect" button appears
- Click "Connect" to open the APIdeck Vault
- You'll be redirected to the service's OAuth login page
- Enter your credentials for that service (e.g., Box login)
- Authorize the connection

### 3. After Authorization
- You'll be redirected back to your account page
- The system will verify the connection
- If successful, you'll see "Connected" status
- The service is now ready to use

## Important Notes

### APIdeck Dashboard Configuration
For the integrations to work properly, you need to:
1. Log in to your APIdeck dashboard at https://app.apideck.com
2. Enable the following Unified APIs:
   - File Storage (for Box, Dropbox, Google Drive, OneDrive, SharePoint)
   - CRM (for Salesforce, Microsoft Outlook)
   - Email (for Outlook email features)
3. For each service, enable the specific connector:
   - Box connector
   - Dropbox connector
   - Google Drive connector
   - Microsoft Graph (for Outlook, OneDrive, SharePoint)
   - Salesforce connector

### OAuth App Configuration
Each service requires OAuth app credentials to be configured in APIdeck:
- **Box**: Create a Box app and add OAuth credentials
- **Google**: Create Google Cloud project and enable Drive API
- **Microsoft**: Register app in Azure AD for Microsoft services
- **Salesforce**: Create Connected App in Salesforce

## Testing the Integration

1. **Enable and Connect**:
   - Enable Box integration
   - Click Connect
   - Log in with Box credentials
   - Authorize the app

2. **Verify Connection**:
   - After OAuth callback, check if status shows "Connected"
   - The integration will display the connected account name

3. **Use the Integration**:
   - Once connected, the service can be accessed through your app
   - Files and data from the connected service will be available

## Troubleshooting

### "Failed to initialize connection"
- Check APIdeck API credentials in .env file
- Verify the Unified APIs are enabled in APIdeck dashboard

### OAuth Page Not Loading
- Ensure the service connector is enabled in APIdeck
- Check if OAuth app is properly configured for that service

### Connection Not Updating
- The callback URL must redirect back to the frontend
- Check browser console for any errors
- Verify the check-connection endpoint is working

## API Endpoints

- `GET /api/integrations` - List all integrations
- `POST /api/integrations/{service}/enable` - Enable integration
- `POST /api/integrations/{service}/disable` - Disable integration  
- `POST /api/integrations/{service}/connect` - Get OAuth URL
- `POST /api/integrations/{service}/disconnect` - Disconnect service
- `POST /api/integrations/{service}/check-connection` - Verify connection status

## Environment Variables

```env
APIDECK_APP_ID=your_app_id
APIDECK_API_KEY=your_api_key
APIDECK_CONSUMER_ID=optional_default_consumer
```