'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { getAuthToken } from '~/services/auth';
import { resolveServiceURL } from '~/core/api/resolve-service-url';

export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testFile, setTestFile] = useState<File | null>(null);

  const checkAuthStatus = async () => {
    setLoading(true);
    console.log('[Auth Debug Page] Checking auth status...');
    
    const clientToken = getAuthToken();
    const results: any = {
      timestamp: new Date().toISOString(),
      clientSide: {
        token: {
          exists: !!clientToken,
          length: clientToken?.length || 0,
          preview: clientToken ? `${clientToken.substring(0, 30)}...` : null
        },
        allCookies: document.cookie
      }
    };

    try {
      // Test 1: Call Next.js debug endpoint
      console.log('[Auth Debug Page] Testing Next.js debug endpoint...');
      const debugResponse = await fetch('/api/debug/auth', {
        credentials: 'include',
      });
      results.nextjsDebugEndpoint = {
        status: debugResponse.status,
        data: await debugResponse.json()
      };

      // Test 2: Verify token with backend
      console.log('[Auth Debug Page] Testing backend auth verification...');
      const verifyResponse = await fetch('/api/debug/auth', {
        method: 'POST',
        credentials: 'include',
      });
      results.backendVerification = {
        status: verifyResponse.status,
        data: await verifyResponse.json()
      };

      // Test 3: Direct backend call
      console.log('[Auth Debug Page] Testing direct backend call...');
      const backendUrl = resolveServiceURL('users/me');
      const directResponse = await fetch(backendUrl, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
        credentials: 'include'
      });
      results.directBackendCall = {
        url: backendUrl,
        status: directResponse.status,
        statusText: directResponse.statusText,
        headers: Object.fromEntries(directResponse.headers.entries()),
        data: directResponse.ok ? await directResponse.json() : await directResponse.text()
      };

      // Test 4: Documents endpoint
      console.log('[Auth Debug Page] Testing documents endpoint...');
      const docsUrl = resolveServiceURL('documents');
      const docsResponse = await fetch(docsUrl, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
        credentials: 'include'
      });
      results.documentsEndpoint = {
        url: docsUrl,
        status: docsResponse.status,
        statusText: docsResponse.statusText,
        data: docsResponse.ok ? await docsResponse.json() : await docsResponse.text()
      };

    } catch (error) {
      results.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      };
    }

    setDebugInfo(results);
    setLoading(false);
  };

  const testFileUpload = async () => {
    if (!testFile) {
      alert('Please select a file first');
      return;
    }

    setLoading(true);
    console.log('[Auth Debug Page] Testing file upload...');
    
    const clientToken = getAuthToken();
    const results: any = {
      timestamp: new Date().toISOString(),
      file: {
        name: testFile.name,
        size: testFile.size,
        type: testFile.type
      },
      token: {
        exists: !!clientToken,
        preview: clientToken ? `${clientToken.substring(0, 30)}...` : null
      }
    };

    try {
      const formData = new FormData();
      formData.append('file', testFile);
      
      const uploadUrl = resolveServiceURL('documents/upload');
      console.log('[Auth Debug Page] Upload URL:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
        credentials: 'include'
      });

      results.uploadResponse = {
        url: uploadUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: response.ok ? await response.json() : await response.text()
      };

    } catch (error) {
      results.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      };
    }

    setDebugInfo(results);
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debug Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={checkAuthStatus} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Checking...' : 'Check Auth Status'}
            </Button>
            
            <div className="flex gap-2">
              <input
                type="file"
                onChange={(e) => setTestFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Button 
                onClick={testFileUpload} 
                disabled={loading || !testFile}
                variant="secondary"
              >
                Test Upload
              </Button>
            </div>
          </div>

          {debugInfo && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Debug Information:</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Check Auth Status" to verify your authentication token</li>
              <li>Check the browser console (F12) for detailed logs</li>
              <li>Look for the authToken in the debug output</li>
              <li>Try uploading a small test file to verify the upload endpoint</li>
              <li>Check the Network tab in DevTools when uploading</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}