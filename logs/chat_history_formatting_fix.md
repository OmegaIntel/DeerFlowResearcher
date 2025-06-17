# Chat History Formatting Fix

## Issue
Research reports were displaying as plain text in the Chat History page, showing raw markdown syntax instead of formatted content.

## Root Cause
The Chat History page was rendering message content with just `{message.content}` inside a div with `whitespace-pre-wrap`, which displays the raw text including markdown syntax.

The main chat page uses a `<Markdown>` component that properly renders:
- Headers (# , ## , etc.)
- Lists (- , 1. , etc.)
- Bold/italic text
- Code blocks
- Links
- And other markdown formatting

## Fix Applied
Updated `/web/src/app/chat-history/main.tsx`:

1. Added import for Markdown component:
```typescript
import { Markdown } from "~/components/deer-flow/markdown";
```

2. Changed message rendering from:
```tsx
<div className="whitespace-pre-wrap break-words">
  {message.content}
</div>
```

To:
```tsx
<div className="prose prose-sm dark:prose-invert max-w-none">
  <Markdown>{message.content}</Markdown>
</div>
```

## Result
Now research reports (and all messages) in the Chat History page will display with proper markdown formatting, matching the appearance in the main chat page.

The `prose` classes from Tailwind CSS provide consistent typography styling for markdown content.