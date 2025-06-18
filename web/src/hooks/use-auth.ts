'use client';

import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();
  
  return {
    isAuthenticated: () => !!Cookies.get('authToken'),
    getToken: () => Cookies.get('authToken'),
    logout: async () => {
      // Clear client-side storage
      Cookies.remove('authToken');
      Cookies.remove('userInfo');
      localStorage.removeItem('userInfo');
      
      // Call logout API to clear server-side cookies
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout error:', error);
      }
      
      router.push('/auth/login');
    },
  };
};