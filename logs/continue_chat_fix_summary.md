# Continue Chat Fix Summary

## Issue
When users selected a chat from ChatHistory to continue, only the initial query was shown - the responses and research reports were not displayed.

## Root Cause
1. The backend was returning all messages correctly
2. However, the frontend's message rendering logic depends on the `agent` property to determine how to display messages
3. When loading messages from the database, the `agent` property was not being set
4. This caused planner/coordinator JSON messages to be displayed as regular messages, and reporter messages were not properly rendered

## Fix Applied
Updated `/root/deer-flow/web/src/core/store/store.ts` in the `loadChat` function to:

1. **Detect agent type from message content**:
   - For assistant messages starting with `{` and containing `has_enough_context` or `thought`, set agent as "planner"
   - For assistant messages containing markdown headers (`# `) and length > 500 chars, set agent as "reporter"

2. **Initialize research-related state**:
   - For research mode sessions, populate `researchIds`, `researchPlanIds`, and `researchReportIds`
   - This ensures research cards and report cards are properly displayed

## Changes Made
```typescript
// Added agent detection logic
let agent: Message["agent"] = undefined;

if (msg.role === "assistant" && msg.content) {
  const content = msg.content.trim();
  
  // Check if it's a JSON message from planner/coordinator
  if (content.startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.has_enough_context !== undefined || parsed.thought) {
        agent = "planner";
      }
    } catch (e) {
      // Not JSON, continue checking
    }
  }
  
  // Check for reporter messages (usually contain markdown headers)
  if (content.includes('# ') && content.length > 500) {
    agent = "reporter";
  }
}
```

## Testing
To verify the fix works:

1. Login to the application
2. Navigate to Chat History
3. Select a research session with multiple messages
4. Click "Continue Chat"
5. You should now see:
   - The original user query
   - The research plan (if not auto-accepted)
   - The final research report
   - Any intermediate messages

## Future Improvements
Consider storing the `agent` property in the database to avoid having to detect it from content. This would be more reliable and performant.