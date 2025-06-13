"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "~/services/auth";
import { resolveServiceURL } from "~/core/api/resolve-service-url";

export default function TestChatHistoryPage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testChatHistory();
  }, []);

  const testChatHistory = async () => {
    const logs: string[] = [];
    
    try {
      // Check auth
      const token = getAuthToken();
      logs.push(`Auth token: ${token ? 'Present' : 'Missing'}`);
      
      if (!token) {
        logs.push('ERROR: No auth token found');
        setResults(logs);
        setLoading(false);
        return;
      }

      // Show API URL
      const apiUrl = resolveServiceURL('chat/sessions');
      logs.push(`API URL: ${apiUrl}`);

      // Make request
      logs.push('Making API request...');
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      });

      logs.push(`Response status: ${response.status}`);
      logs.push(`Response OK: ${response.ok}`);

      // Get raw text first
      const responseText = await response.text();
      logs.push(`Response length: ${responseText.length} characters`);
      logs.push(`First 500 chars: ${responseText.substring(0, 500)}`);

      // Try to parse
      try {
        const data = JSON.parse(responseText);
        logs.push(`Parsed successfully!`);
        logs.push(`Type: ${typeof data}`);
        logs.push(`Is Array: ${Array.isArray(data)}`);
        
        if (Array.isArray(data)) {
          logs.push(`Number of sessions: ${data.length}`);
          
          // Show first 3 sessions
          data.slice(0, 3).forEach((session, i) => {
            logs.push(`\nSession ${i + 1}:`);
            logs.push(`  ID: ${session.id}`);
            logs.push(`  Thread ID: ${session.thread_id}`);
            logs.push(`  Messages: ${session.message_count}`);
          });
        } else {
          logs.push(`Data is not an array: ${JSON.stringify(data).substring(0, 200)}`);
        }
      } catch (parseError: any) {
        logs.push(`JSON Parse Error: ${parseError.message}`);
      }

    } catch (error: any) {
      logs.push(`Network Error: ${error.message}`);
      logs.push(`Stack: ${error.stack}`);
    }

    setResults(logs);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Test Chat History API</h1>
      <button onClick={() => window.location.reload()}>Reload</button>
      <hr />
      
      {loading ? (
        <p>Testing...</p>
      ) : (
        <pre style={{ background: '#f0f0f0', padding: '10px', whiteSpace: 'pre-wrap' }}>
          {results.join('\n')}
        </pre>
      )}
    </div>
  );
}