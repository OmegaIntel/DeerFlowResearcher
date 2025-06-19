'use client';

import { useState } from 'react';
import { VoiceButton, VoiceStatus } from '~/components/voice/voice-button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

export default function VoiceTestPage() {
  const [lastCommand, setLastCommand] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const handleVoiceCommand = (command: string) => {
    console.log('Voice command received:', command);
    setLastCommand(command);
    setCommandHistory(prev => [...prev, command].slice(-5)); // Keep last 5 commands
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Voice Input Test Page</CardTitle>
          <p className="text-muted-foreground">
            Test the voice input functionality. Say "O" followed by your command.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Status */}
          <div className="flex items-center justify-between">
            <VoiceStatus />
            <VoiceButton 
              onVoiceCommand={handleVoiceCommand}
              className="h-12 w-12"
            />
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">How to test:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click the microphone button to start listening</li>
              <li>Say "O" followed by your command (e.g., "O, what is the weather today?")</li>
              <li>Wait for the command to be processed</li>
              <li>The transcribed command will appear below</li>
            </ol>
          </div>

          {/* Last Command */}
          {lastCommand && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Last Voice Command:</h3>
              <p className="text-lg bg-gray-50 p-3 rounded border">
                "{lastCommand}"
              </p>
            </div>
          )}

          {/* Command History */}
          {commandHistory.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Command History:</h3>
              <div className="space-y-2">
                {commandHistory.map((command, index) => (
                  <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                    <span className="text-gray-500">#{commandHistory.length - index}:</span> {command}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Browser Support Info */}
          <div className="text-sm text-muted-foreground">
            <p><strong>Browser Support:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Speech Recognition: {typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) ? '✅ Supported' : '❌ Not supported'}</li>
              <li>Speech Synthesis: {typeof window !== 'undefined' && window.speechSynthesis ? '✅ Supported' : '❌ Not supported'}</li>
              <li>Media Devices: {typeof navigator !== 'undefined' && navigator.mediaDevices ? '✅ Supported' : '❌ Not supported'}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}