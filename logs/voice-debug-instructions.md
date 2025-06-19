# Voice Debug Instructions

## Test Pages Created

1. **Direct API Test**: http://localhost:3000/voice-inline-test
   - Most basic test - just a button that calls Speech API directly
   - Shows clear status messages
   - No React hooks or complex state

2. **Component Test**: http://localhost:3000/voice-press-test
   - Tests the voice components in isolation

## What to Check

1. **Open Browser Console** (F12)
2. Navigate to http://localhost:3000/voice-inline-test
3. Click "Click to Test Voice"
4. Look for console messages:
   ```
   [VoiceInlineTest] Button clicked
   Recognition started
   Transcript: your words here
   ```

## Common Issues & Solutions

### 1. HTTPS Required
- Speech Recognition requires HTTPS or localhost
- If using IP address (e.g., 192.168.x.x), it won't work
- Solution: Use http://localhost:3000

### 2. Browser Support
- Chrome/Edge: Full support
- Safari: Requires prefix (webkitSpeechRecognition)
- Firefox: Limited/No support
- Solution: Use Chrome or Edge

### 3. Microphone Permission
- Browser will prompt for permission
- If denied, you'll see "not-allowed" error
- Solution: Allow microphone access

### 4. Docker/Container Issues
- The browser runs on your host machine, not in Docker
- Microphone access is through your browser
- No special Docker config needed

## Debug Steps

1. First test http://localhost:3000/voice-inline-test
2. If that works, test the chat interface
3. Check console for any errors
4. Verify you're using localhost (not IP address)
5. Ensure microphone permissions are granted

## Expected Console Output

When working correctly:
```
[VoiceButtonTest] Starting speech recognition...
[VoiceButtonTest] Recognition started
[VoiceButtonTest] Result: hello world
[VoiceButtonTest] Recognition ended
```

## If Nothing Happens

1. Check browser console for errors
2. Try in Chrome incognito mode
3. Ensure you're on http://localhost:3000 (not IP)
4. Check if other sites can access your microphone
5. Try the simple test page first