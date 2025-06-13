'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { getAuthToken } from '~/services/auth';

export function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkAuth = async () => {
    setLoading(true);
    console.log('[AuthDebug] Starting auth check...');
    
    // Check client-side token
    const clientToken = getAuthToken();
    console.log('[AuthDebug] Client-side token:', {
      exists: !!clientToken,
      length: clientToken?.length || 0,
      preview: clientToken ? `${clientToken.substring(0, 20)}...` : null
    });

    try {
      // Call debug endpoint
      const response = await fetch('/api/debug/auth', {
        credentials: 'include',
      });
      
      const data = await response.json();
      console.log('[AuthDebug] Debug endpoint response:', data);
      
      // Test backend auth
      const testResponse = await fetch('/api/debug/auth', {
        method: 'POST',
        credentials: 'include',
      });
      
      const testData = await testResponse.json();
      console.log('[AuthDebug] Backend test response:', testData);
      
      setDebugInfo({
        clientToken: {
          exists: !!clientToken,
          preview: clientToken ? `${clientToken.substring(0, 20)}...` : null,
        },
        debugEndpoint: data,
        backendTest: testData,
      });
    } catch (error) {
      console.error('[AuthDebug] Error:', error);
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
        clientToken: {
          exists: !!clientToken,
          preview: clientToken ? `${clientToken.substring(0, 20)}...` : null,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border bg-background p-4 shadow-lg">
      <h3 className="mb-2 font-semibold">Auth Debug Panel</h3>
      <Button onClick={checkAuth} disabled={loading} className="mb-2">
        {loading ? 'Checking...' : 'Check Auth Status'}
      </Button>
      {debugInfo && (
        <pre className="max-h-96 overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}
    </div>
  );
}