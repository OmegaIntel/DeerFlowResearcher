import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get auth token from cookies
  const authToken = request.cookies.get('authToken')?.value;
  
  console.log('[Middleware] Request:', {
    pathname,
    method: request.method,
    hasAuthToken: !!authToken,
    tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : null,
    cookies: request.cookies.getAll().map(c => c.name),
  });
  
  // Intercept document-viewer requests
  if (pathname.startsWith('/document-viewer/')) {
    console.error('[Middleware] INTERCEPTED document-viewer request!', pathname);
    const documentId = pathname.replace('/document-viewer/', '').split('?')[0];  // Remove query params
    
    // Redirect to the documents API to get the actual URL
    const apiUrl = new URL('/api/documents/' + documentId + '/download-url', request.url);
    console.log('[Middleware] Redirecting to:', apiUrl.toString());
    
    // Return a page that will fetch and redirect
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Opening document...</title>
      </head>
      <body>
        <h1>Opening document...</h1>
        <script>
          console.log('Document ID: ${documentId}');
          const authToken = (document.cookie.match(/authToken=([^;]+)/) || [])[1];
          console.log('Auth token found:', !!authToken);
          
          fetch('/api/documents/${documentId}/download-url', {
            headers: {
              'Authorization': 'Bearer ' + authToken
            }
          })
          .then(res => {
            console.log('Response status:', res.status);
            if (!res.ok) {
              throw new Error('Failed to get document URL: ' + res.status);
            }
            return res.json();
          })
          .then(data => {
            console.log('Response data:', data);
            if (data.download_url) {
              console.log('Redirecting to:', data.download_url);
              window.location.href = data.download_url;
            } else {
              alert('Failed to get document URL - no download_url in response');
            }
          })
          .catch(err => {
            console.error('Error:', err);
            alert('Error: ' + err.message);
          });
        </script>
      </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
  
  // Define protected routes
  const protectedRoutes = ['/chat', '/chat-history', '/research', '/documents', '/settings'];
  const authRoutes = ['/auth/login', '/auth/register'];
  
  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if current path is auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // If user is not authenticated and trying to access protected route
  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If user is authenticated and trying to access auth routes, redirect to chat
  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }
  
  // For root path, redirect to chat if authenticated, otherwise to login
  if (pathname === '/') {
    if (authToken) {
      return NextResponse.redirect(new URL('/chat', request.url));
    } else {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|public).*)'],
};