'use client';

import { useState } from 'react';
import { VoiceButtonSimple } from '~/components/voice/voice-button-simple';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

export default function VoicePressTest() {
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [status, setStatus] = useState('Ready to record');

  const handleTranscript = (transcript: string) => {
    console.log('[VoicePressTest] Received transcript:', transcript);
    setTranscripts(prev => [...prev, transcript]);
    setStatus(`Last transcript: "${transcript}"`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Voice Press-to-Talk Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="mb-4 text-muted-foreground">
              Click the microphone button and speak. Release to stop recording.
            </p>
            
            <div className="flex justify-center mb-4">
              <VoiceButtonSimple
                className="h-16 w-16"
                onTranscript={handleTranscript}
              />
            </div>
            
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Transcripts:</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transcripts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No transcripts yet. Click the mic to start.</p>
              ) : (
                transcripts.map((transcript, index) => (
                  <div key={index} className="p-2 bg-muted rounded text-sm">
                    {index + 1}. {transcript}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Browser: {typeof window !== 'undefined' ? navigator.userAgent : 'Loading...'}</p>
            <p>Speech API: {typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) ? 'Supported' : 'Not supported'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}