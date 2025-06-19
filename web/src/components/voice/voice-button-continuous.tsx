'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface VoiceButtonContinuousProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  className?: string;
  disabled?: boolean;
  autoStop?: boolean; // Auto stop after silence
  silenceTimeout?: number; // Milliseconds of silence before stopping
}

export function VoiceButtonContinuous({ 
  onTranscript, 
  className, 
  disabled,
  autoStop = true,
  silenceTimeout = 3000 // 3 seconds default
}: VoiceButtonContinuousProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    if (autoStop && isListening) {
      silenceTimerRef.current = setTimeout(() => {
        console.log('[VoiceContinuous] Silence timeout - stopping');
        stopListening();
      }, silenceTimeout);
    }
  };

  const startListening = async () => {
    console.log('[VoiceContinuous] Starting...');
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      return;
    }

    try {
      // Request permission first
      if (navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening
      recognition.interimResults = true; // Show results while speaking
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[VoiceContinuous] Started listening');
        setIsListening(true);
        setError(null);
        resetSilenceTimer();
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Send interim results for real-time display
        if (interimTranscript && interimTranscript !== lastTranscriptRef.current) {
          console.log('[VoiceContinuous] Interim:', interimTranscript);
          onTranscript(interimTranscript, false);
          lastTranscriptRef.current = interimTranscript;
        }

        // Send final results
        if (finalTranscript) {
          console.log('[VoiceContinuous] Final:', finalTranscript.trim());
          onTranscript(finalTranscript.trim(), true);
          lastTranscriptRef.current = '';
          resetSilenceTimer(); // Reset timer on new speech
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[VoiceContinuous] Error:', event.error);
        setError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('[VoiceContinuous] Ended');
        setIsListening(false);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (err: any) {
      console.error('[VoiceContinuous] Failed to start:', err);
      setError(err.message);
    }
  };

  const stopListening = () => {
    console.log('[VoiceContinuous] Stopping...');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsListening(false);
  };

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative transition-all",
        isListening && "text-red-500 animate-pulse",
        error && "text-destructive",
        className
      )}
      onClick={handleClick}
      disabled={disabled || !!error}
      title={
        error 
          ? error 
          : isListening 
            ? "Click to stop listening" 
            : "Click to start voice input"
      }
    >
      {isListening ? (
        <Mic className="h-4 w-4" />
      ) : (
        <MicOff className="h-4 w-4" />
      )}
      {isListening && (
        <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </Button>
  );
}