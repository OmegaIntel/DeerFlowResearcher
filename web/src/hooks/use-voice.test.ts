// Voice Hook Tests
import { renderHook, act } from '@testing-library/react';
import { useVoice } from './use-voice';

// Mock Web APIs
const mockGetUserMedia = jest.fn();
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
};

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => []),
};

// Setup mocks
beforeEach(() => {
  // @ts-ignore
  global.navigator.mediaDevices = { getUserMedia: mockGetUserMedia };
  // @ts-ignore
  global.webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);
  // @ts-ignore
  global.speechSynthesis = mockSpeechSynthesis;
});

describe('useVoice Hook', () => {
  test('should initialize with correct default state', () => {
    const { result } = renderHook(() => useVoice());
    
    expect(result.current.isListening).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should request microphone permission', async () => {
    mockGetUserMedia.mockResolvedValue({});
    const { result } = renderHook(() => useVoice());
    
    await act(async () => {
      await result.current.requestPermission();
    });
    
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.hasPermission).toBe(true);
  });

  test('should handle permission denial', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
    const { result } = renderHook(() => useVoice());
    
    await act(async () => {
      await result.current.requestPermission();
    });
    
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toContain('Permission denied');
  });

  test('should start continuous listening', async () => {
    mockGetUserMedia.mockResolvedValue({});
    const { result } = renderHook(() => useVoice());
    
    await act(async () => {
      await result.current.requestPermission();
      result.current.startListening();
    });
    
    expect(mockSpeechRecognition.start).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true);
  });

  test('should detect "O" wake word', async () => {
    const onWakeWord = jest.fn();
    const { result } = renderHook(() => useVoice({ onWakeWord }));
    
    await act(async () => {
      await result.current.requestPermission();
      result.current.startListening();
    });
    
    // Simulate speech recognition result with "O"
    const mockEvent = {
      results: [
        [{ transcript: 'O, what is the weather today?', confidence: 0.9 }]
      ]
    };
    
    // Trigger the speech recognition result
    const onResult = mockSpeechRecognition.addEventListener.mock.calls
      .find(call => call[0] === 'result')?.[1];
    
    if (onResult) {
      onResult(mockEvent);
    }
    
    expect(onWakeWord).toHaveBeenCalledWith('what is the weather today?');
  });

  test('should ignore speech without "O" wake word', async () => {
    const onWakeWord = jest.fn();
    const { result } = renderHook(() => useVoice({ onWakeWord }));
    
    await act(async () => {
      await result.current.requestPermission();
      result.current.startListening();
    });
    
    // Simulate speech without "O"
    const mockEvent = {
      results: [
        [{ transcript: 'Hello there, how are you?', confidence: 0.9 }]
      ]
    };
    
    const onResult = mockSpeechRecognition.addEventListener.mock.calls
      .find(call => call[0] === 'result')?.[1];
    
    if (onResult) {
      onResult(mockEvent);
    }
    
    expect(onWakeWord).not.toHaveBeenCalled();
  });

  test('should stop listening after 5 seconds of silence', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useVoice());
    
    await act(async () => {
      await result.current.requestPermission();
      result.current.startListening();
    });
    
    // Fast forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  test('should speak response using TTS', () => {
    const { result } = renderHook(() => useVoice());
    
    act(() => {
      result.current.speak('Hello, this is a test response');
    });
    
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
  });
});