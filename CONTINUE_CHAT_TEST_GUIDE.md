# Continue Chat Testing Guide

## Test URLs
Based on the debug output, here are specific sessions you can test:

### Simple Chat Session
- **Thread ID**: `test_simple_20250616_230953`
- **Direct URL**: http://localhost:3000/chat?thread=test_simple_20250616_230953
- **Expected**: 2 messages (user greeting + assistant response)

### Research Session  
- **Thread ID**: `test_continue_20250616_230706`
- **Direct URL**: http://localhost:3000/chat?thread=test_continue_20250616_230706
- **Expected**: 2 messages (user question + planner JSON)

## Testing Steps

1. **Open Browser Developer Console** (F12)
   - This is crucial to see debug messages

2. **Navigate to Chat History**
   - Go to http://localhost:3000/chat-history
   - Login with: chetan@omegaintelligence.ai / Test123.

3. **Look for Console Messages**
   When you click "Continue Chat", you should see:
   ```
   [Store] loadChat called with threadId: xxx
   [Store] Version: v2 with agent detection
   [Store] Fetched session: {...}
   [Store] Loading message v2: {...}
   ```

4. **Check Message Rendering**
   - User messages → Blue chat bubbles on the right
   - Assistant messages → Gray chat bubbles on the left
   - Planner messages → Should show as plan cards
   - Reporter messages → Should show as formatted reports

## What Was Fixed

1. **Backend**: Already working correctly, returns all messages

2. **Frontend Store** (`/web/src/core/store/store.ts`):
   - Added agent detection based on message content
   - Added research state initialization
   - Added debug logging

3. **Message Detection Logic**:
   ```typescript
   // JSON messages with has_enough_context → "planner"
   if (content.startsWith('{')) {
     const parsed = JSON.parse(content);
     if (parsed.has_enough_context !== undefined || parsed.thought) {
       agent = "planner";
     }
   }
   
   // Long messages with markdown headers → "reporter"
   if (content.includes('# ') && content.length > 500) {
     agent = "reporter";
   }
   ```

## Debugging

If messages still don't appear:

1. **Check Browser Console** for:
   - JavaScript errors
   - Network errors (401, 404, etc.)
   - [Store] debug messages

2. **Verify Backend**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/chat/sessions/by-thread/THREAD_ID
   ```

3. **Check Frontend Compilation**:
   ```bash
   docker logs deer-flow-frontend | grep -E "(Error|Warning|Compiled)"
   ```

## Known Issues

- Research sessions that hit context limits may not have reporter messages
- The frontend needs to be restarted after code changes in development mode
- Browser cache may need to be cleared (Ctrl+Shift+R)

## Manual Workaround

If continue chat still doesn't work, users can:
1. Copy the thread ID from the URL
2. Start a new chat
3. Reference the previous conversation manually