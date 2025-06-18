# APIdeck Integration Troubleshooting

## Current Issue
When you click the "Connect" button, the APIdeck Vault URL is being generated correctly, but the window might not be opening due to:

1. **Popup Blocker** - Your browser might be blocking the popup window
2. **JavaScript Error** - Check the browser console for any errors

## How to Test Manually

### Option 1: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Click the "Connect" button
4. Look for these log messages:
   - `[IntegrationsList] Connecting integration: box`
   - `[IntegrationsList] Connect response: {vault_url: ...}`
5. If you see errors, please share them

### Option 2: Allow Popups
1. Look for a popup blocker icon in your browser's address bar
2. Allow popups for localhost:3000
3. Try clicking Connect again

### Option 3: Direct URL Test
Since the API is working correctly, you can test the integration directly:

1. Copy this URL and open it in a new browser tab:
```
https://vault.apideck.com/session/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWRpcmVjdF91cmkiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYWNjb3VudD90YWI9aW50ZWdyYXRpb25zJmNvbm5lY3RlZD1ib3giLCJjb25zdW1lcl9tZXRhZGF0YSI6eyJ1c2VyX2lkIjoiYjYzOTUzNDctOTA0Ni00NjIwLThmODItZmRjZGM5Yjc2NWNmIiwiZW1haWwiOiJjaGV0YW5Ab21lZ2FpbnRlbGxpZ2VuY2UuYWkiLCJmdWxsX25hbWUiOiJDaGV0YW4gR29lbCJ9LCJzZXR0aW5ncyI6eyJ1bmlmaWVkX2FwaXMiOlsiZmlsZS1zdG9yYWdlIiwiY3JtIiwiZW1haWwiXX0sImNvbnN1bWVyX2lkIjoidXNlci1iNjM5NTM0Ny05MDQ2LTQ2MjAtOGY4Mi1mZGNkYzliNzY1Y2YiLCJhcHBsaWNhdGlvbl9pZCI6IjU0MklMekJ2T0xmNHJUUmF6VWo4b2lac1c1MVZ0RUt0eUxldXpVajkiLCJzY29wZXMiOltdLCJpYXQiOjE3NTAyNzYxNDgsImV4cCI6MTc1MDI3OTc0OH0.fK8ZSZ5q0jrCFRFzC29sp9i1Hh9skHJFEY7RPPWcxHY
```

2. You should see the APIdeck Vault page with Box, Dropbox, etc.
3. Click on "Box"
4. Click "Authorize"
5. Log in with your Box credentials

### Option 4: Check Network Tab
1. Open Developer Tools (F12)
2. Go to Network tab
3. Click "Connect" button
4. Look for a request to `/api/integrations/box/connect`
5. Check the response - it should contain `vault_url`

## What Should Happen

1. When you click "Connect", a new window should open with APIdeck Vault
2. You select the service (e.g., Box)
3. You authorize and log in
4. After successful auth, you're redirected back to your app
5. The integration shows as "Connected"

## Current Status

- ✅ Backend API is working correctly
- ✅ APIdeck Vault sessions are being created
- ✅ The vault URL is valid and functional
- ⚠️ The popup window might be blocked
- ⚠️ The redirect URL needs to be fixed (currently using port 8000 instead of 3000)

## Next Steps

1. Check browser console for errors
2. Allow popups if blocked
3. Try the direct URL test above
4. Let me know what happens when you:
   - Click the Connect button
   - Check the browser console
   - Try the direct URL