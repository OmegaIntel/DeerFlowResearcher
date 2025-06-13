"use client";

import { useEffect, useState } from "react";

export default function ChatHistoryMinimalPage() {
  const [status, setStatus] = useState<string>("Starting...");
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testFlow = async () => {
      try {
        // Step 1: Get token from storage
        setStatus("Getting auth token...");
        
        // Check all possible storage locations
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('authToken='))
          ?.split('=')[1];
        
        const localToken = localStorage.getItem('authToken');
        const sessionToken = sessionStorage.getItem('authToken');
        
        const token = cookieToken || localToken || sessionToken;
        
        if (!token) {
          setError("No auth token found in any storage");
          return;
        }
        
        setStatus(`Found token: ${token.substring(0, 30)}...`);
        
        // Step 2: Make API call
        setStatus("Calling API...");
        
        const response = await fetch('http://localhost:8000/api/chat/sessions', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        setStatus(`API responded with status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          setError(`API Error: ${response.status} - ${errorText}`);
          return;
        }
        
        // Step 3: Parse response
        const data = await response.json();
        setStatus(`Success! Found ${data.length} sessions`);
        setSessions(data);
        
      } catch (err: any) {
        setError(`Error: ${err.message}`);
        setStatus("Failed");
      }
    };
    
    testFlow();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Chat History - Minimal Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {sessions.length > 0 && (
        <div>
          <h2>Sessions Found: {sessions.length}</h2>
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
            <pre>{JSON.stringify(sessions, null, 2)}</pre>
          </div>
        </div>
      )}
      
      <hr style={{ margin: '20px 0' }} />
      
      <div>
        <h3>Debug Info:</h3>
        <button onClick={() => window.location.reload()}>Reload Page</button>
        <button onClick={() => window.location.href = '/chat-history'} style={{ marginLeft: '10px' }}>
          Go to Main Chat History
        </button>
        <button onClick={() => window.location.href = '/auth/login'} style={{ marginLeft: '10px' }}>
          Go to Login
        </button>
      </div>
    </div>
  );
}