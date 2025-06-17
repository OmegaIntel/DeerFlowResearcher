"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "~/services/auth";
import { resolveServiceURL } from "~/core/api/resolve-service-url";

export default function WhoAmIPage() {
  const [info, setInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const result: any = {
      timestamp: new Date().toISOString(),
      auth: {},
      user: null,
      sessions: null,
      error: null
    };

    try {
      // Check auth token
      const token = getAuthToken();
      result.auth.hasToken = !!token;
      result.auth.tokenPreview = token ? token.substring(0, 50) + '...' : null;
      
      // Check storage
      result.auth.cookie = document.cookie.includes('authToken');
      result.auth.localStorage = !!localStorage.getItem('authToken');
      result.auth.sessionStorage = !!sessionStorage.getItem('authToken');
      
      if (!token) {
        result.error = "No auth token found";
        setInfo(result);
        setLoading(false);
        return;
      }

      // Decode JWT to get user info
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]!));
          result.tokenPayload = payload;
          result.user = {
            sub: payload.sub,
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null
          };
        }
      } catch (e) {
        result.decodeError = "Failed to decode token";
      }

      // Get current user from API
      try {
        const userResponse = await fetch(resolveServiceURL('users/current'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        result.userApi = {
          status: userResponse.status,
          ok: userResponse.ok
        };
        
        if (userResponse.ok) {
          result.currentUser = await userResponse.json();
        } else if (userResponse.status === 404) {
          result.userApi.error = "Endpoint not found";
        } else {
          result.userApi.error = await userResponse.text();
        }
      } catch (e: any) {
        result.userApi = { error: e.message };
      }

      // Get sessions count
      try {
        const sessionsResponse = await fetch(resolveServiceURL('chat/sessions'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json();
          result.sessions = {
            count: sessions.length,
            firstThree: sessions.slice(0, 3)
          };
        }
      } catch (e: any) {
        result.sessionsError = e.message;
      }

    } catch (error: any) {
      result.error = error.message;
    }

    setInfo(result);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Who Am I?</h1>
      <button onClick={() => window.location.reload()}>Reload</button>
      <button onClick={() => window.location.href = '/chat/history'} style={{ marginLeft: '10px' }}>
        Go to Chat History
      </button>
      <hr />
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <pre style={{ background: '#f0f0f0', padding: '10px', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(info, null, 2)}
        </pre>
      )}
    </div>
  );
}