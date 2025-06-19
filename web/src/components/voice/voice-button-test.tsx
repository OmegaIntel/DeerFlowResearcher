'use client';

import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '~/components/ui/button';

export function VoiceButtonTest() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const startListening = () => {
    console.log('[VoiceButtonTest] Starting speech recognition...');
    
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      console.error('[VoiceButtonTest] No speech recognition support');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('[VoiceButtonTest] Recognition started');
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        console.log('[VoiceButtonTest] Result:', result);
        setTranscript(result);
      };

      recognition.onerror = (event: any) => {
        console.error('[VoiceButtonTest] Error:', event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('[VoiceButtonTest] Recognition ended');
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('[VoiceButtonTest] Failed to start:', err);
      setError(`Failed: ${err}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={startListening}
        disabled={isListening}
        className={isListening ? 'text-red-500' : ''}
      >
        {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
      {transcript && <span className="text-xs">Last: {transcript}</span>}
    </div>
  );
}