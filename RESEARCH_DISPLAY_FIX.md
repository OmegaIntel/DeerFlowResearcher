# Research Display Fix

## Issue
Research activities and reports were showing on both the left (main chat) and right (research panel) sides of the screen.

## Root Cause
In the `MessageListView` component (left side), the condition included:
```javascript
message.role === "assistant"
```

This caused ALL assistant messages to be displayed, including:
- researcher messages (should only be on right side)
- reporter messages (should only be on right side)

## Fix Applied
Removed `message.role === "assistant"` from the display condition in `message-list-view.tsx`.

Now the left side only shows:
- User messages (`message.role === "user"`)
- Coordinator messages (`message.agent === "coordinator"`)
- Planner messages (`message.agent === "planner"`)
- Podcast messages (`message.agent === "podcast"`)
- Research start cards (`startOfResearch`)

## How It Works Now

### Left Side (Main Chat)
- Shows user messages
- Shows coordinator responses
- Shows plan cards from planner
- Shows research cards (just the card to open/close research panel)
- Does NOT show researcher activities
- Does NOT show reports

### Right Side (Research Panel)
- **Activities Tab**: Shows all research activities (researcher messages, tool calls)
- **Report Tab**: Shows the final report from the reporter agent

## Result
Research content is now properly isolated to the right panel only, matching the original DeerFlow project behavior.