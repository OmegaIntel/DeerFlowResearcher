import { API_BASE_URL } from '~/lib/constant';
import Cookies from 'js-cookie';

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
  Cookies.set('authToken', token, {
    path: '/',
    expires: 1/12, // 2 hours (1/12 of a day)
    sameSite: 'Strict',
  });
}

// Utility: get token from cookies
export function getAuthToken(): string | undefined {
  return Cookies.get('authToken');
}

// Utility: remove token from cookies
export function removeAuthToken() {
  Cookies.remove('authToken');
}
