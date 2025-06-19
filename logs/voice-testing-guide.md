# Voice Module Testing Guide

## Current Implementation
I've implemented a simple press-to-talk voice button that:
- Shows a microphone icon (red when active, gray when inactive)
- Starts recording when clicked
- Stops recording when clicked again
- Transcribes speech to text
- Puts the transcribed text into the chat input field

## How to Test

### 1. Test on Standalone Page (Recommended First)
Navigate to: http://localhost:3000/voice-press-test

This page allows you to:
- Test the voice button in isolation
- See all transcripts in a list
- Verify browser support
- Grant microphone permissions

### 2. Test in Chat Interface
1. Login to the application
2. Navigate to http://localhost:3000/chat
3. Look for the microphone icon next to the paperclip button
4. Click the microphone icon (it will turn red and pulse)
5. Speak clearly
6. Click the microphone again to stop recording
7. Your speech will be transcribed and appear in the chat input

## What You Should See in Console
When working correctly, you'll see:
```
[VoiceButtonSimple] Started listening
[VoiceButtonSimple] Transcript: your speech here
[VoiceButtonSimple] Final transcript: your speech here
[EnhancedInputBox] Voice transcript: your speech here
[VoiceButtonSimple] Stopped listening
```

## Troubleshooting

### If the button doesn't work:
1. Make sure you're using Chrome, Edge, or Safari (Firefox has limited support)
2. Allow microphone permissions when prompted
3. Check the browser console for errors

### Common Issues:
- **"not-allowed" error**: Microphone permission was denied
- **No transcript appears**: Speak louder or clearer
- **Button is disabled**: Check if another operation is in progress

## Current Features
- ✅ Press-to-talk functionality
- ✅ Visual feedback (red pulse when recording)
- ✅ Automatic transcription
- ✅ Text appears in chat input
- ❌ Auto-send (currently commented out - easy to enable)
- ❌ Wake word detection (next step)

## Next Steps
Once basic transcription is working, we can:
1. Enable auto-send after transcription
2. Implement continuous listening with wake word "O"
3. Add voice activity detection
4. Add more visual/audio feedback