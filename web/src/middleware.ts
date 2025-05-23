import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/profile', '/projects', '/chat'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('=== MIDDLEWARE DEBUG ===');
  console.log('Pathname:', pathname);
  console.log('All cookies:', request.cookies.getAll());

  const token = request.cookies.get('authToken')?.value;
  console.log('Auth token:', token);

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  console.log('Is protected route:', isProtected);

  if (isProtected && !token) {
    console.log('REDIRECTING TO LOGIN');
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  console.log('ALLOWING ACCESS');
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/profile/:path*', 
    '/projects/:path*', 
    '/chat/:path*',
    '/dashboard',
    '/profile',
    '/projects', 
    '/chat'
  ],
};