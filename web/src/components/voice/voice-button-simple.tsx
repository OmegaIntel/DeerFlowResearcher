'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface VoiceButtonSimpleProps {
  onTranscript: (transcript: string) => void;
  className?: string;
  disabled?: boolean;
}

export function VoiceButtonSimple({ onTranscript, className, disabled }: VoiceButtonSimpleProps) {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    console.log('[VoiceButtonSimple] Component mounted, checking speech support...');
    
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    console.log('[VoiceButtonSimple] SpeechRecognition available:', !!SpeechRecognition);
    
    if (!SpeechRecognition) {
      console.error('[VoiceButtonSimple] Speech recognition not supported in this browser');
      setError('Speech recognition not supported');
      return;
    }

    // Create recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('[VoiceButtonSimple] Started listening');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');
      
      console.log('[VoiceButtonSimple] Transcript:', transcript);
      
      // Only send final results
      if (event.results[event.results.length - 1].isFinal) {
        console.log('[VoiceButtonSimple] Final transcript:', transcript);
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[VoiceButtonSimple] Error:', event.error);
      setError(event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        setHasPermission(false);
      }
    };

    recognition.onend = () => {
      console.log('[VoiceButtonSimple] Stopped listening');
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const handleClick = async () => {
    console.log('[VoiceButtonSimple] Button clicked, isListening:', isListening);
    console.log('[VoiceButtonSimple] Recognition ref:', !!recognitionRef.current);
    
    if (!recognitionRef.current) {
      console.error('[VoiceButtonSimple] No recognition instance');
      setError('Speech recognition not initialized');
      return;
    }

    if (isListening) {
      // Stop listening
      console.log('[VoiceButtonSimple] Stopping recognition...');
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Start listening
      try {
        // Request permission if needed
        if (!hasPermission && navigator.mediaDevices) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermission(true);
          } catch (err) {
            console.error('[VoiceButtonSimple] Permission denied:', err);
            setError('Microphone permission denied');
            return;
          }
        }

        recognitionRef.current.start();
      } catch (err) {
        console.error('[VoiceButtonSimple] Failed to start:', err);
        setError('Failed to start recording');
      }
    }
  };

  // Add visible state indicator
  console.log('[VoiceButtonSimple] Render state:', { isListening, hasPermission, error, disabled });

  return (
    <>
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
        disabled={disabled}
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
      </Button>
      {error && (
        <span className="text-xs text-destructive ml-2">{error}</span>
      )}
    </>
  );
}