'use client';

export default function VoiceBasicTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Voice Basic Test</h1>
      
      <button
        onClick={() => {
          console.log('Button clicked!');
          alert('Button clicked! Check console for Speech API test.');
          
          const hasSpeechAPI = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
          console.log('Speech API available:', hasSpeechAPI);
          
          if (hasSpeechAPI) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.onstart = () => console.log('Started!');
            recognition.onerror = (e: any) => console.error('Error:', e.error);
            recognition.onresult = (e: any) => console.log('Result:', e.results[0][0].transcript);
            
            try {
              recognition.start();
              console.log('Recognition.start() called');
            } catch (err) {
              console.error('Start failed:', err);
            }
          }
        }}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test Voice (Check Console)
      </button>
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>Instructions:</p>
        <ol className="list-decimal list-inside">
          <li>Open browser console (F12)</li>
          <li>Click the button above</li>
          <li>Allow microphone access if prompted</li>
          <li>Check console for messages</li>
        </ol>
      </div>
    </div>
  );
}