# Voice Module Architecture Plan

## Phase 1: Foundation (Minimal Viable Voice)
**Goal**: Basic voice input with browser APIs (1-2 days)

### Technologies:
- **Wake Word**: Simple keyword detection with Web Speech API
- **STT**: SpeechRecognition API (Chrome/Edge native)
- **TTS**: SpeechSynthesis API (all browsers)
- **VAD**: Web Audio API with volume detection

### Benefits:
- Zero external dependencies
- Works offline
- Instant setup
- 95% browser compatibility

### Implementation:
```typescript
// 1. Continuous listening with Web Speech API
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

// 2. Simple "O" detection
recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  if (transcript.toLowerCase().includes('o')) {
    // Start recording for command
  }
};

// 3. Native TTS response
const utterance = new SpeechSynthesisUtterance(response);
speechSynthesis.speak(utterance);
```

## Phase 2: Enhanced Accuracy (Production Quality)
**Goal**: Better wake word detection and accuracy (3-4 days)

### Technologies:
- **Wake Word**: OpenWakeWord (lightweight, accurate)
- **STT**: Faster-Whisper via API
- **TTS**: SpeechSynthesis + Coqui fallback
- **VAD**: WebRTC VAD + silence detection

### Benefits:
- More accurate wake word detection
- Better noise handling
- Customizable voice responses
- Lower false positives

## Phase 3: Advanced Features (Optional)
**Goal**: Production-grade voice assistant (1-2 weeks)

### Technologies:
- **Wake Word**: Custom trained model
- **STT**: Streaming Whisper
- **TTS**: Custom voice cloning
- **NLU**: Intent recognition
- **Speaker ID**: Voice authentication

## Recommended Start: Phase 1

Let's begin with Phase 1 because:
1. **Fastest time to working prototype**
2. **No external services needed**
3. **Works in all modern browsers**
4. **Easy to test and iterate**
5. **Can always upgrade later**

## Test-Driven Development Plan

### Step 1: Basic Audio Detection
- Create audio permission handling
- Implement microphone access
- Test browser compatibility

### Step 2: Wake Word Detection
- Implement "O" keyword detection
- Add false positive prevention
- Test accuracy with different voices

### Step 3: Integration
- Connect to existing chat system
- Handle voice input as text message
- Test end-to-end flow

### Step 4: UI Enhancement
- Add voice button to chat bar
- Visual feedback for listening state
- Error handling and user guidance

Would you like to proceed with Phase 1 implementation?