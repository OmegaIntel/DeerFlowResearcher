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
  
  
  // Define protected routes
  const protectedRoutes = ['/chat', '/chat-history', '/research', '/documents', '/settings', '/account'];
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
    console.log('[Middleware] No auth token, redirecting to login');
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If user is authenticated and trying to access auth routes, redirect to chat
  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }
  
  // For root path, let it through to show the landing page
  // Users can navigate to login/chat from there
  if (pathname === '/') {
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|public).*)'],
};