# Voice Testing Steps

## 1. Open the Full Test Page

Navigate to: **http://localhost:3000/voice-full-test**

This comprehensive test page will help diagnose any issues.

## 2. Follow These Steps:

1. **Click "Check Browser Support"**
   - This will show if your browser supports Speech Recognition
   - Check that it shows "✅ Available" for Speech Recognition API
   - Ensure you're using localhost (not an IP address)

2. **Click "Start Recording"**
   - Browser will ask for microphone permission - click "Allow"
   - The button should turn red and show "Stop Recording"
   - You should see "✅ Recognition started - Speak now!" in the logs

3. **Speak clearly**
   - Say something like "Hello, testing voice recognition"
   - You should see interim results appearing in the logs
   - Final transcripts will appear in the transcript box

4. **Click "Stop Recording"** when done

## Common Issues:

### If nothing happens when clicking Start Recording:
- Check browser console (F12) for errors
- Ensure you're using Chrome or Edge
- Make sure you're on http://localhost:3000 (not IP address)

### If you see "not-allowed" error:
- Microphone permission was denied
- Check browser settings
- Try in incognito mode

### If Speech Recognition shows "❌ Not Available":
- Your browser doesn't support it
- Use Chrome or Edge (latest versions)

## 3. Once Basic Test Works

If the full test page works, we can:
1. Fix the chat interface integration
2. Add auto-send functionality
3. Implement wake word detection

## 4. Alternative: Simple HTML Test

If the React app isn't working, try the static HTML test:
Open `/root/deer-flow/test-voice-render.html` in your browser directly.

Let me know what you see in the logs on the test page!