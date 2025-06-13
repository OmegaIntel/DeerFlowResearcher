import Cookies from 'js-cookie';

import { API_BASE_URL } from '~/lib/constant';


// Handles login using FormData
export async function loginUser(formData: FormData): Promise<{
  access_token: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/token`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Login failed');
  }

  const data = await response.json();
  return data;
}

export async function registerUser(formData: FormData): Promise<{ id: string; email: string }> {
  const response = await fetch(`${API_BASE_URL}/api/register`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Registration failed');
  }

  return await response.json();
}

// Utility: set token to cookies
export function setAuthToken(token: string) {
  console.log('[Auth Service] Setting auth token:', token ? `${token.substring(0, 20)}...` : 'null');
  
  // Try to set cookie with multiple fallback options
  try {
    // First attempt: js-cookie with proper settings
    Cookies.set('authToken', token, {
      path: '/',
      expires: 1/12, // 2 hours (1/12 of a day)
      sameSite: 'Lax', // Allow cross-site requests
      secure: window.location.protocol === 'https:', // Only secure on HTTPS
    });
    console.log('[Auth Service] Cookie set with js-cookie');
  } catch (e) {
    console.error('[Auth Service] Failed to set cookie with js-cookie:', e);
    
    // Fallback: Try native document.cookie
    try {
      const maxAge = 7200; // 2 hours in seconds
      const cookieString = `authToken=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = cookieString;
      console.log('[Auth Service] Cookie set with document.cookie');
    } catch (e2) {
      console.error('[Auth Service] Failed to set cookie with document.cookie:', e2);
    }
  }
  
  // Always save to localStorage as backup
  try {
    localStorage.setItem('authToken', token);
    console.log('[Auth Service] Saved token to localStorage as backup');
  } catch (e) {
    console.error('[Auth Service] Failed to save to localStorage:', e);
  }
  
  // Also save to sessionStorage for current session
  try {
    sessionStorage.setItem('authToken', token);
    console.log('[Auth Service] Saved token to sessionStorage');
  } catch (e) {
    console.error('[Auth Service] Failed to save to sessionStorage:', e);
  }
  
  // Verify it was set
  const savedToken = Cookies.get('authToken');
  const localToken = localStorage.getItem('authToken');
  const sessionToken = sessionStorage.getItem('authToken');
  console.log('[Auth Service] Token after setting:', {
    cookie: savedToken ? `${savedToken.substring(0, 20)}...` : 'null',
    localStorage: localToken ? `${localToken.substring(0, 20)}...` : 'null',
    sessionStorage: sessionToken ? `${sessionToken.substring(0, 20)}...` : 'null',
    cookieString: document.cookie
  });
}

// Utility: get token from cookies
export function getAuthToken(): string | undefined {
  // Try multiple methods to get the token
  let token = Cookies.get('authToken');
  let source = 'cookie';
  
  // If js-cookie fails, try manual parsing
  if (!token) {
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('authToken='));
    if (authCookie) {
      token = authCookie.split('=')[1];
      source = 'document.cookie';
    }
  }
  
  // Check sessionStorage
  if (!token) {
    token = sessionStorage.getItem('authToken') || undefined;
    if (token) source = 'sessionStorage';
  }
  
  // Finally check localStorage as last fallback
  if (!token) {
    token = localStorage.getItem('authToken') || undefined;
    if (token) source = 'localStorage';
  }
  
  console.log('[Auth Service] Getting auth token:', {
    exists: !!token,
    length: token?.length || 0,
    preview: token ? `${token.substring(0, 20)}...` : 'null',
    source: token ? source : 'none',
    allCookies: document.cookie.substring(0, 100) + '...'
  });
  return token;
}

// Utility: remove token from cookies
export function removeAuthToken() {
  // Remove from all storage locations
  try {
    Cookies.remove('authToken', { path: '/' });
  } catch (e) {
    console.error('[Auth Service] Failed to remove cookie:', e);
  }
  
  try {
    // Also try native cookie removal
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch (e) {
    console.error('[Auth Service] Failed to remove cookie via document.cookie:', e);
  }
  
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  
  console.log('[Auth Service] Removed auth token from all storage locations');
}