import { API_BASE_URL } from "~/lib/constant";
import Cookies from 'js-cookie';

interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const fetcher = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = Cookies.get('authToken');

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // If you have refresh token logic, uncomment this:
      // return handleRefreshToken(url, options);
      
      // Otherwise, redirect to login
      Cookies.remove('authToken', { path: '/' });
      window.location.href = '/auth/login';
      throw new Error('Unauthorized');
    }

    console.log('HTTP-------------', response);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
};

export const fileFetcher = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = Cookies.get('authToken');

  const config: RequestInit = {
    ...options,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    if (response.status === 401) {
      // return handleRefreshToken(url, options);
      Cookies.remove('authToken', { path: '/' });
      window.location.href = '/auth/login';
      throw new Error('Unauthorized');
    }

    console.log('HTTP-------------', response);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
};

// Refresh Token Logic (Updated to use cookies)
const handleRefreshToken = async <T>(
  url: string,
  options: RequestInit
): Promise<ApiResponse<T>> => {
  const refreshToken = Cookies.get('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!refreshResponse.ok) {
    // Clear tokens and redirect to login
    Cookies.remove('authToken', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
    window.location.href = '/auth/login';
    throw new Error('Refresh token failed');
  }

  const { accessToken } = await refreshResponse.json();
  
  // Store new token in cookie
  Cookies.set('authToken', accessToken, {
    path: '/',
    expires: 1/12, // 2 hours
    sameSite: 'Strict',
  });

  // Retry original request with new token
  return fetcher(url, {
    ...options,
    headers: { 
      ...options.headers,
      Authorization: `Bearer ${accessToken}` 
    },
  });
};

// Helper functions for common HTTP methods
export const api = {
  get: <T>(url: string, options?: RequestInit) => 
    fetcher<T>(url, { ...options, method: 'GET' }),
  
  post: <T>(url: string, data?: any, options?: RequestInit) => 
    fetcher<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  put: <T>(url: string, data?: any, options?: RequestInit) => 
    fetcher<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: <T>(url: string, options?: RequestInit) => 
    fetcher<T>(url, { ...options, method: 'DELETE' }),
};

// File upload helper
export const uploadFile = async <T>(
  url: string,
  formData: FormData
): Promise<ApiResponse<T>> => {
  const token = Cookies.get('authToken');

  const config: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      // Don't set Content-Type for FormData, let browser set it
    },
    body: formData,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    if (response.status === 401) {
      Cookies.remove('authToken', { path: '/' });
      window.location.href = '/auth/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
};