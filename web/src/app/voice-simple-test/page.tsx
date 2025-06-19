'use client';

export default function VoiceSimpleTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Voice Component Simple Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Component Status</h2>
          <p>This page tests if basic React components load.</p>
        </div>
        
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Speech API Test</h2>
          <button 
            onClick={() => {
              const hasSupport = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
              alert(`Speech Recognition Support: ${hasSupport ? 'YES' : 'NO'}`);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Test Speech API
          </button>
        </div>
        
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Dynamic Import Test</h2>
          <button 
            onClick={async () => {
              try {
                const module = await import('~/components/voice/voice-button');
                alert(`VoiceButton module loaded: ${!!module.VoiceButton}`);
              } catch (error) {
                alert(`Error loading VoiceButton: ${error}`);
              }
            }}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Test Dynamic Import
          </button>
        </div>
      </div>
    </div>
  );
}