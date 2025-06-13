"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "~/services/auth";
import { resolveServiceURL } from "~/core/api/resolve-service-url";

export function ChatHistoryDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDebug = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        auth: {},
        api: {},
        error: null
      };

      try {
        // Check auth token
        const token = getAuthToken();
        info.auth.hasToken = !!token;
        info.auth.tokenPreview = token ? `${token.substring(0, 20)}...` : null;
        
        // Check storage
        info.auth.cookie = document.cookie.includes('authToken');
        info.auth.localStorage = !!localStorage.getItem('authToken');
        info.auth.sessionStorage = !!sessionStorage.getItem('authToken');
        
        // Try API call
        if (token) {
          const url = resolveServiceURL("chat/sessions");
          info.api.url = url;
          
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          info.api.status = response.status;
          info.api.ok = response.ok;
          
          if (response.ok) {
            const data = await response.json();
            info.api.sessionCount = data.length;
            info.api.sessions = data.slice(0, 3); // First 3 sessions
          } else {
            info.api.error = await response.text();
          }
        } else {
          info.api.error = "No auth token found";
        }
      } catch (error: any) {
        info.error = error.message;
      }

      setDebugInfo(info);
      setLoading(false);
    };

    runDebug();
  }, []);

  if (loading) {
    return <div>Loading debug info...</div>;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg bg-black/90 p-4 text-xs text-white">
      <h3 className="mb-2 text-sm font-bold">Chat History Debug</h3>
      <pre className="overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded bg-blue-500 px-2 py-1 text-xs hover:bg-blue-600"
      >
        Reload
      </button>
    </div>
  );
}