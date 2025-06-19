# Document Upload Test Plan

## Test Scenario
Test document upload and RAG functionality with proper session ID handling.

## Test Steps:

1. **Navigate to chat page**
   - Go to http://localhost:3001/chat
   - Verify a thread ID is created in the URL (e.g., /chat?thread=uuid)

2. **Upload a document**
   - Click the paperclip icon
   - Select a PDF or text file
   - Verify the upload succeeds

3. **Ask a question about the document**
   - Type a question related to the uploaded document
   - Verify the response includes citations from the document

## Expected Behavior:

1. When navigating to /chat, a new session should be created immediately
2. The URL should update to include the thread ID
3. Document uploads should work on the first try
4. The thread ID should be consistent throughout the chat session

## Verification Points:

1. Check browser console for:
   - `[startNewChat] Created new session with thread ID: <uuid>`
   - `[EnhancedInputBox] Final sessionId for upload: <uuid>`
   - No "undefined" thread ID errors

2. Check backend logs for:
   - `Upload request from user: <email>`
   - `Looking for session with thread_id: <uuid>`
   - `Created session with id: <uuid>` or `Found existing session with id: <uuid>`

## Test Credentials:
- Email: chetan@omegaintelligence.ai
- Password: Test123.

## Test Document:
You can use any PDF or text file. A simple test document with unique content will help verify RAG is working.