'use client';

import { useState, useEffect } from 'react';
import { VoiceButton, VoiceStatus } from '~/components/voice/voice-button';
import { useVoice } from '~/hooks/use-voice';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';

export default function VoiceDebugPage() {
  const [componentStatus, setComponentStatus] = useState({
    voiceButton: false,
    voiceStatus: false,
    useVoice: false,
    browserSupport: false,
  });
  
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  useEffect(() => {
    // Check component imports - these should always be true if imported correctly
    console.log('[VoiceDebug] Checking components:', {
      VoiceButton,
      VoiceStatus,
      useVoice
    });
    
    setComponentStatus({
      voiceButton: !!VoiceButton,
      voiceStatus: !!VoiceStatus,
      useVoice: !!useVoice,
      browserSupport: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    });
    
    // Get browser info
    setDebugInfo({
      userAgent: navigator.userAgent,
      speechRecognition: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
      speechSynthesis: !!window.speechSynthesis,
      mediaDevices: !!navigator.mediaDevices,
      windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('speech')),
    });
  }, []);
  
  const handleVoiceCommand = (command: string) => {
    console.log('[Debug] Voice command:', command);
    alert(`Voice command received: ${command}`);
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Voice Module Debug Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Component Status */}
          <div>
            <h3 className="font-semibold mb-2">Component Import Status:</h3>
            <div className="space-y-1 text-sm">
              <div>VoiceButton: {componentStatus.voiceButton ? '✅ Loaded' : '❌ Not loaded'}</div>
              <div>VoiceStatus: {componentStatus.voiceStatus ? '✅ Loaded' : '❌ Not loaded'}</div>
              <div>useVoice Hook: {componentStatus.useVoice ? '✅ Loaded' : '❌ Not loaded'}</div>
              <div>Browser Support: {componentStatus.browserSupport ? '✅ Supported' : '❌ Not supported'}</div>
            </div>
          </div>
          
          {/* Browser Debug Info */}
          <div>
            <h3 className="font-semibold mb-2">Browser Debug Info:</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
          
          {/* Voice Button Test */}
          <div>
            <h3 className="font-semibold mb-2">Voice Button Test:</h3>
            <div className="flex items-center gap-4">
              {componentStatus.voiceButton ? (
                <>
                  <VoiceButton 
                    onVoiceCommand={handleVoiceCommand}
                    className="h-12 w-12"
                  />
                  <VoiceStatus />
                </>
              ) : (
                <div className="text-red-500">Voice components not loaded</div>
              )}
            </div>
          </div>
          
          {/* Direct Voice Hook Test */}
          <div>
            <h3 className="font-semibold mb-2">Direct Voice Hook Test:</h3>
            <DirectVoiceTest />
          </div>
          
          {/* Navigation */}
          <div className="pt-4 border-t">
            <Button onClick={() => window.location.href = '/chat'}>
              Go to Chat Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DirectVoiceTest() {
  const voice = useVoice({
    onWakeWord: (command) => {
      console.log('[DirectTest] Wake word detected:', command);
    }
  });
  
  return (
    <div className="space-y-2 text-sm">
      <div>Is Supported: {voice.isSupported ? 'Yes' : 'No'}</div>
      <div>Has Permission: {voice.hasPermission ? 'Yes' : 'No'}</div>
      <div>Is Listening: {voice.isListening ? 'Yes' : 'No'}</div>
      <div>Error: {voice.error || 'None'}</div>
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={() => voice.requestPermission()}>
          Request Permission
        </Button>
        <Button size="sm" onClick={() => voice.startListening()}>
          Start Listening
        </Button>
        <Button size="sm" onClick={() => voice.stopListening()}>
          Stop Listening
        </Button>
      </div>
    </div>
  );
}