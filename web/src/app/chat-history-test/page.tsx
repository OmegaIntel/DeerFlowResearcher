"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "~/services/auth";
import { resolveServiceURL } from "~/core/api/resolve-service-url";

export default function ChatHistoryTestPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const fetchSessions = async () => {
      const debug: any = {
        timestamp: new Date().toISOString(),
        token: null,
        apiUrl: null,
        response: null,
      };

      try {
        // Get token
        const token = getAuthToken();
        debug.token = token ? `${token.substring(0, 30)}...` : null;
        
        if (!token) {
          setError("No auth token found");
          setDebugInfo(debug);
          setLoading(false);
          return;
        }

        // Build URL
        const url = resolveServiceURL("chat/sessions");
        debug.apiUrl = url;

        // Make request
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        debug.response = {
          status: response.status,
          ok: response.ok,
        };

        if (response.ok) {
          const data = await response.json();
          setSessions(data);
          debug.sessionCount = data.length;
        } else {
          const errorText = await response.text();
          setError(`API Error: ${response.status} - ${errorText}`);
          debug.error = errorText;
        }
      } catch (err: any) {
        setError(`Network Error: ${err.message}`);
        debug.error = err.message;
      } finally {
        setDebugInfo(debug);
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Chat History Test Page</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Debug Info:</h2>
        <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>

      {loading && <p>Loading...</p>}
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Found {sessions.length} chat sessions
          </h2>
          
          {sessions.length > 0 && (
            <div className="space-y-2">
              {sessions.map((session, index) => (
                <div key={session.id} className="p-3 border rounded">
                  <p className="font-semibold">Session {index + 1}</p>
                  <p className="text-sm">ID: {session.id}</p>
                  <p className="text-sm">Thread: {session.thread_id}</p>
                  <p className="text-sm">Messages: {session.message_count}</p>
                  <p className="text-sm">Created: {session.created_at}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}