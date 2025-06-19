'use client';

import { useEffect, useState } from 'react';

export default function VoiceMinimalTest() {
  const [status, setStatus] = useState('Loading...');
  
  useEffect(() => {
    // Test if we can dynamically import the voice components
    import('~/components/voice/voice-button')
      .then(module => {
        console.log('[VoiceMinimalTest] Module loaded:', module);
        setStatus(`VoiceButton: ${!!module.VoiceButton ? 'Loaded' : 'Not found'}`);
      })
      .catch(error => {
        console.error('[VoiceMinimalTest] Import error:', error);
        setStatus(`Error: ${error.message}`);
      });
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Voice Minimal Test</h1>
      <p>{status}</p>
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>Browser info:</p>
        <p>Speech Recognition: {typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}