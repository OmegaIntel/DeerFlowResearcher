import { NextResponse } from 'next/server';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: process.env.NODE_ENV,
    },
    tests: {}
  };

  // Test 1: Try to reach backend from server-side
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    results.tests.backendUrl = backendUrl;
    
    // Try different URLs
    const urls = [
      'http://localhost:8000/api/health',
      'http://backend:8000/api/health', // Docker service name
      'http://deer-flow-backend:8000/api/health', // Container name
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        results.tests[url] = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
        };
      } catch (error: any) {
        results.tests[url] = {
          error: error.message,
        };
      }
    }
  } catch (error: any) {
    results.error = error.message;
  }

  return NextResponse.json(results);
}