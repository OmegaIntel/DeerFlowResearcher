import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // Clear all auth-related cookies with various configurations
  const cookieOptions = [
    { name: 'authToken' },
    { name: 'authToken', path: '/' },
    { name: 'authToken', domain: '.getomegaintel.com' },
    { name: 'authToken', domain: 'www.getomegaintel.com' },
    { name: 'userInfo' },
    { name: 'userInfo', path: '/' },
  ];
  
  cookieOptions.forEach(option => {
    try {
      cookieStore.delete(option);
    } catch (e) {
      console.error('Failed to delete cookie:', option, e);
    }
  });
  
  // Set expired cookies to force removal
  const response = NextResponse.json({ success: true });
  response.cookies.set('authToken', '', { 
    expires: new Date(0), 
    path: '/',
    sameSite: 'lax'
  });
  response.cookies.set('userInfo', '', { 
    expires: new Date(0), 
    path: '/',
    sameSite: 'lax'
  });
  
  return response;
}

export async function GET() {
  const cookieStore = await cookies();
  
  // Clear all auth-related cookies
  cookieStore.delete('authToken');
  cookieStore.delete('userInfo');
  
  // Redirect to landing page with cleared cookies
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  response.cookies.set('authToken', '', { 
    expires: new Date(0), 
    path: '/',
    sameSite: 'lax'
  });
  response.cookies.set('userInfo', '', { 
    expires: new Date(0), 
    path: '/',
    sameSite: 'lax'
  });
  
  return response;
}