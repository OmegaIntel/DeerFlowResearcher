import React, { useState } from 'react';
import { copilotService } from './services/copilotService';

export function TestChat() {
  const [sessionId, setSessionId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const createSession = async () => {
    try {
      setError('');
      setLoading(true);
      const id = await copilotService.createSession('AAPL');
      setSessionId(id);
      console.log('Created session:', id);
    } catch (err: any) {
      setError('Failed to create session: ' + err.message);
      console.error('Session error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const sendMessage = async () => {
    try {
      setError('');
      setLoading(true);
      const resp = await copilotService.sendMessage(message);
      setResponse(resp);
      console.log('Got response:', resp);
    } catch (err: any) {
      setError('Failed to send message: ' + err.message);
      console.error('Message error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: '20px', background: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h1>Test Chat</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={createSession} disabled={loading}>
          Create Session
        </button>
        <span style={{ marginLeft: '10px' }}>
          Session ID: {sessionId || 'None'}
        </span>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ padding: '5px', marginRight: '10px', color: 'black' }}
        />
        <button onClick={sendMessage} disabled={loading || !sessionId}>
          Send Message
        </button>
      </div>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}
      
      {response && (
        <div style={{ 
          background: '#2a2a2a', 
          padding: '10px', 
          borderRadius: '5px',
          whiteSpace: 'pre-wrap'
        }}>
          <strong>Response:</strong><br />
          {response}
        </div>
      )}
      
      {loading && <div>Loading...</div>}
    </div>
  );
}