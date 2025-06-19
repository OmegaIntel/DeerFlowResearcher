'use client';

import { useState } from 'react';
import { VoiceButtonContinuous } from '~/components/voice/voice-button-continuous';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

export default function VoiceContinuousTest() {
  const [message, setMessage] = useState('');
  const [interimText, setInterimText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (text: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${text}`]);
  };

  const handleTranscript = (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      addLog(`Final: "${transcript}"`);
      setMessage(prev => prev ? `${prev} ${transcript}` : transcript);
      setInterimText('');
    } else {
      addLog(`Interim: "${transcript}"`);
      setInterimText(transcript);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Continuous Voice Recognition Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Features:</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Continuous listening (doesn\'t stop after each phrase)</li>
              <li>Real-time interim results while you speak</li>
              <li>Auto-stop after 3 seconds of silence</li>
              <li>Click mic to start/stop manually</li>
            </ul>
          </div>

          <div className="flex items-center gap-4">
            <VoiceButtonContinuous
              className="h-12 w-12"
              onTranscript={handleTranscript}
              silenceTimeout={3000}
            />
            <span className="text-sm text-muted-foreground">
              Click to start/stop voice input
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message Input (like chat):</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border rounded-lg resize-none"
              rows={3}
              placeholder="Your voice input will appear here..."
            />
            {interimText && (
              <div className="mt-1 text-sm text-muted-foreground italic">
                Currently hearing: {interimText}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Activity Log:</h3>
              <button 
                onClick={() => {setLogs([]); setMessage(''); setInterimText('');}}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear All
              </button>
            </div>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">Logs will appear here...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
            <strong>Note:</strong> Using Chrome/Edge on localhost. Firefox doesn\'t support Speech Recognition API.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}