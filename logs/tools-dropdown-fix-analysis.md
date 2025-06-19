# Tools Dropdown Integration Issue Analysis

## Problem
Enabled integrations (Box, Google Drive, etc.) don't appear in the tools dropdown in the chat interface.

## Root Cause
In `/root/deer-flow/web/src/app/chat/components/enhanced-input-box.tsx`, line 156:
```javascript
.filter((int: any) => int.enabled && int.is_connected)
```

The filter requires BOTH conditions:
1. `enabled: true` - Set when you enable the integration in settings
2. `is_connected: true` - Only set after successful OAuth connection

## Current Flow
1. User enables integration → `enabled: true`, `is_connected: false`
2. User clicks "Connect" → OAuth flow with APIdeck
3. After successful OAuth → `enabled: true`, `is_connected: true`
4. Only then does the integration appear in tools dropdown

## Solution Options

### Option 1: Show All Enabled Integrations (Recommended)
Modify the filter to show all enabled integrations, with visual indicator for connection status:

```javascript
// Change line 156 from:
.filter((int: any) => int.enabled && int.is_connected)

// To:
.filter((int: any) => int.enabled)

// Then modify the tool creation to indicate connection status:
const integrationTools: Tool[] = integrations
  .filter((int: any) => int.enabled)
  .map((int: any) => {
    const Icon = SERVICE_ICONS[int.service_type] || Building2;
    return {
      id: `integration-${int.service_type}`,
      name: int.service_name + (int.is_connected ? '' : ' (Not Connected)'),
      icon: <Icon className="w-4 h-4" />,
      enabled: int.is_connected, // Only enable if connected
      type: 'integration' as const,
      isConnected: int.is_connected, // Add connection status
    };
  });
```

### Option 2: Add Clear UI Feedback
Keep current behavior but add feedback when hovering over disabled integrations in the dropdown.

### Option 3: Auto-prompt Connection
When enabling an integration, automatically show the connection dialog.

## Files Affected
1. `/root/deer-flow/web/src/app/chat/components/enhanced-input-box.tsx` - Tools dropdown in chat
2. `/root/deer-flow/web/src/app/chat/components/input-box.tsx` - Alternative input box (also has tools)
3. `/root/deer-flow/web/src/components/deer-flow/integrations-list.tsx` - Integration management UI

## Testing Notes
- Added console logging to debug integration loading
- Backend correctly returns integration status
- Frontend correctly filters based on both enabled AND connected status