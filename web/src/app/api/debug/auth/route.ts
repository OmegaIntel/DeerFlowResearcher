import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  console.log('[Debug Auth] Checking authentication...');
  
  // Get auth token from cookies
  const cookieStore = await cookies();
  const authToken = cookieStore.get('authToken');
  
  // Get Authorization header
  const authHeader = request.headers.get('Authorization');
  
  // Log all cookies
  const allCookies = cookieStore.getAll();
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    authToken: {
      exists: !!authToken,
      value: authToken?.value ? `${authToken.value.substring(0, 20)}...` : null,
      name: authToken?.name,
    },
    authHeader: {
      exists: !!authHeader,
      value: authHeader ? `${authHeader.substring(0, 30)}...` : null,
    },
    allCookies: allCookies.map(cookie => ({
      name: cookie.name,
      valueLength: cookie.value.length,
      preview: cookie.value.substring(0, 20) + '...'
    })),
    headers: Object.fromEntries(request.headers.entries()),
  };
  
  console.log('[Debug Auth] Debug info:', JSON.stringify(debugInfo, null, 2));
  
  return NextResponse.json(debugInfo);
}

export async function POST(request: NextRequest) {
  console.log('[Debug Auth] Testing auth with backend...');
  
  const cookieStore = await cookies();
  const authToken = cookieStore.get('authToken');
  
  if (!authToken) {
    return NextResponse.json({ 
      error: 'No auth token found in cookies',
      cookies: cookieStore.getAll().map(c => c.name)
    }, { status: 401 });
  }
  
  // Test the token with the backend
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
      },
    });
    
    console.log('[Debug Auth] Backend response status:', response.status);
    
    if (response.ok) {
      const userData = await response.json();
      return NextResponse.json({
        valid: true,
        user: userData,
        tokenPreview: `${authToken.value.substring(0, 20)}...`,
      });
    } else {
      const error = await response.text();
      return NextResponse.json({
        valid: false,
        error: error,
        status: response.status,
        tokenPreview: `${authToken.value.substring(0, 20)}...`,
      }, { status: response.status });
    }
  } catch (error) {
    console.error('[Debug Auth] Error testing token:', error);
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}