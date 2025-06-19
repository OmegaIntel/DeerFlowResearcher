'use client';

import { useState, useRef } from 'react';

export default function VoiceFullTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[VoiceFullTest] ${message}`);
  };

  const checkBrowserSupport = () => {
    addLog('Checking browser support...');
    
    const hasSpeechRecognition = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    addLog(`Speech Recognition API: ${hasSpeechRecognition ? '✅ Available' : '❌ Not Available'}`);
    addLog(`Media Devices API: ${hasMediaDevices ? '✅ Available' : '❌ Not Available'}`);
    addLog(`Protocol: ${protocol} (${protocol === 'https:' || hostname === 'localhost' ? '✅ OK' : '❌ Needs HTTPS or localhost'})`);
    addLog(`Hostname: ${hostname}`);
    addLog(`Browser: ${navigator.userAgent.substring(0, 50)}...`);
    
    return hasSpeechRecognition;
  };

  const requestMicrophonePermission = async () => {
    addLog('Requesting microphone permission...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addLog('✅ Microphone permission granted');
      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err: any) {
      addLog(`❌ Microphone permission denied: ${err.message}`);
      return false;
    }
  };

  const startRecording = async () => {
    addLog('Starting voice recording...');
    
    // Check support
    if (!checkBrowserSupport()) {
      addLog('❌ Browser does not support Speech Recognition');
      return;
    }

    // Request permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        addLog('✅ Recognition started - Speak now!');
        setIsRecording(true);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        if (finalTranscript) {
          addLog(`Final: "${finalTranscript.trim()}"`);
          setTranscript(prev => prev + ' ' + finalTranscript);
        }
        if (interimTranscript) {
          addLog(`Interim: "${interimTranscript}"`);
        }
      };
      
      recognition.onerror = (event: any) => {
        addLog(`❌ Error: ${event.error}`);
        setIsRecording(false);
        
        if (event.error === 'not-allowed') {
          addLog('Microphone access was denied. Please check browser settings.');
        }
      };
      
      recognition.onend = () => {
        addLog('Recognition ended');
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (err: any) {
      addLog(`❌ Failed to start recognition: ${err.message}`);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    addLog('Stopping recording...');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const clearAll = () => {
    setLogs([]);
    setTranscript('');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Voice Recognition Full Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Controls</h2>
            <div className="space-y-2">
              <button
                onClick={checkBrowserSupport}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Check Browser Support
              </button>
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full px-4 py-2 rounded text-white font-medium ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isRecording ? '🎤 Stop Recording' : '🎤 Start Recording'}
              </button>
              
              <button
                onClick={clearAll}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Clear All
              </button>
            </div>
          </div>
          
          {/* Transcript */}
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Transcript</h2>
            <div className="bg-gray-50 p-3 rounded min-h-[100px] max-h-[200px] overflow-y-auto">
              {transcript || <span className="text-gray-400">Transcript will appear here...</span>}
            </div>
          </div>
        </div>
        
        {/* Logs */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs h-[400px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Click "Check Browser Support" to start...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Click "Check Browser Support" first</li>
          <li>Click "Start Recording" and allow microphone access</li>
          <li>Speak clearly into your microphone</li>
          <li>Watch the logs for real-time feedback</li>
          <li>Click "Stop Recording" when done</li>
        </ol>
      </div>
    </div>
  );
}