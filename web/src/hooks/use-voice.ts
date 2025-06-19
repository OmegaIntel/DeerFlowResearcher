import { useState, useEffect, useCallback, useRef } from 'react';

export interface VoiceOptions {
  onWakeWord?: (command: string) => void;
  onError?: (error: string) => void;
  wakeWord?: string;
  silenceTimeout?: number;
  language?: string;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  hasPermission: boolean;
  error: string | null;
  transcript: string;
  isSupported: boolean;
}

export interface VoiceActions {
  requestPermission: () => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeech: () => void;
}

export function useVoice(options: VoiceOptions = {}): VoiceState & VoiceActions {
  const {
    onWakeWord,
    onError,
    wakeWord = 'o',
    silenceTimeout = 5000,
    language = 'en-US'
  } = options;

  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    hasPermission: false,
    error: null,
    transcript: '',
    isSupported: false
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Check browser support
  const isSupported = useCallback(() => {
    return !!(
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) &&
      window.speechSynthesis &&
      navigator.mediaDevices?.getUserMedia
    );
  }, []);

  useEffect(() => {
    setState(prev => ({ ...prev, isSupported: isSupported() }));
  }, [isSupported]);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      if (!isSupported()) {
        throw new Error('Speech recognition not supported in this browser');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      setState(prev => ({ 
        ...prev, 
        hasPermission: true, 
        error: null 
      }));
      
      console.log('[Voice] Microphone permission granted');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone';
      setState(prev => ({ 
        ...prev, 
        hasPermission: false, 
        error: errorMessage 
      }));
      onError?.(errorMessage);
      console.error('[Voice] Permission error:', error);
    }
  }, [isSupported, onError]);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!isSupported() || recognitionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // Handle speech recognition results
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = finalTranscript || interimTranscript;
      setState(prev => ({ ...prev, transcript: fullTranscript }));

      // Reset silence timer on speech
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Check for wake word in final results
      if (finalTranscript && finalTranscript.toLowerCase().includes(wakeWord.toLowerCase())) {
        console.log('[Voice] Wake word detected:', finalTranscript);
        
        // Extract command after wake word
        const wakeWordIndex = finalTranscript.toLowerCase().indexOf(wakeWord.toLowerCase());
        const command = finalTranscript.substring(wakeWordIndex + wakeWord.length).trim();
        
        if (command) {
          setState(prev => ({ ...prev, isProcessing: true }));
          onWakeWord?.(command);
          
          // Stop listening temporarily while processing
          recognition.stop();
          setState(prev => ({ ...prev, isListening: false }));
        }
      }

      // Set silence timer
      silenceTimerRef.current = setTimeout(() => {
        console.log('[Voice] Silence timeout reached');
        recognition.stop();
      }, silenceTimeout);
    };

    recognition.onstart = () => {
      console.log('[Voice] Speech recognition started');
      setState(prev => ({ ...prev, isListening: true, error: null }));
    };

    recognition.onend = () => {
      console.log('[Voice] Speech recognition ended');
      setState(prev => ({ 
        ...prev, 
        isListening: false, 
        isProcessing: false,
        transcript: '' 
      }));
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };

    recognition.onerror = (event) => {
      console.error('[Voice] Speech recognition error:', event.error);
      const errorMessage = `Speech recognition error: ${event.error}`;
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isListening: false,
        isProcessing: false 
      }));
      onError?.(errorMessage);
    };

    recognitionRef.current = recognition;
  }, [isSupported, language, wakeWord, silenceTimeout, onWakeWord, onError]);

  // Start continuous listening
  const startListening = useCallback(() => {
    if (!state.hasPermission) {
      console.warn('[Voice] Permission not granted');
      return;
    }

    if (!recognitionRef.current) {
      initializeSpeechRecognition();
    }

    if (recognitionRef.current && !state.isListening) {
      try {
        recognitionRef.current.start();
        console.log('[Voice] Starting continuous listening for wake word:', wakeWord);
      } catch (error) {
        console.error('[Voice] Failed to start recognition:', error);
        setState(prev => ({ ...prev, error: 'Failed to start speech recognition' }));
      }
    }
  }, [state.hasPermission, state.isListening, initializeSpeechRecognition, wakeWord]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    console.log('[Voice] Stopped listening');
  }, []);

  // Text-to-speech
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      console.warn('[Voice] Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      console.log('[Voice] TTS started');
    };

    utterance.onend = () => {
      console.log('[Voice] TTS ended');
      
      // Resume listening after TTS completes
      if (state.hasPermission && !state.isListening) {
        setTimeout(() => {
          startListening();
        }, 500); // Small delay to avoid feedback
      }
    };

    utterance.onerror = (event) => {
      console.error('[Voice] TTS error:', event.error);
    };

    window.speechSynthesis.speak(utterance);
    console.log('[Voice] Speaking:', text);
  }, [state.hasPermission, state.isListening, startListening]);

  // Cancel speech
  const cancelSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('[Voice] Speech cancelled');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      cancelSpeech();
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [stopListening, cancelSpeech]);

  return {
    ...state,
    requestPermission,
    startListening,
    stopListening,
    speak,
    cancelSpeech
  };
}