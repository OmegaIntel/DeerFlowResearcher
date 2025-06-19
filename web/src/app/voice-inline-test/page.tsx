'use client';

import { useState } from 'react';

export default function VoiceInlineTest() {
  const [status, setStatus] = useState('Click button to test');
  const [isListening, setIsListening] = useState(false);

  const testVoice = () => {
    console.log('[VoiceInlineTest] Button clicked');
    setStatus('Testing...');

    // Direct browser API test
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setStatus('❌ Speech Recognition not supported');
      console.error('No speech recognition support');
      return;
    }

    setStatus('✅ API available, starting recognition...');
    
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        console.log('Recognition started');
        setStatus('🎤 Listening... Speak now!');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Transcript:', transcript);
        setStatus(`✅ Heard: "${transcript}"`);
      };

      recognition.onerror = (event: any) => {
        console.error('Recognition error:', event.error);
        setStatus(`❌ Error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('Recognition ended');
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start:', err);
      setStatus(`❌ Failed: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Voice API Direct Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={testVoice}
          disabled={isListening}
          className={`px-6 py-3 rounded ${
            isListening 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isListening ? '🎤 Listening...' : 'Click to Test Voice'}
        </button>
        
        <div className="p-4 bg-gray-100 rounded">
          <p className="font-mono text-sm">{status}</p>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>Browser: {navigator.userAgent}</p>
          <p>Protocol: {window.location.protocol}</p>
          <p>Host: {window.location.host}</p>
        </div>
      </div>
    </div>
  );
}