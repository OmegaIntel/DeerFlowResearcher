import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/profile', '/projects', '/chat'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  
  const token = request.cookies.get('authToken')?.value;
 
  
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  
  if (isProtected && !token) {
   
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