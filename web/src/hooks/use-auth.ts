'use client';

import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();
  
  return {
    isAuthenticated: () => !!localStorage.getItem('authToken'),
    getToken: () => localStorage.getItem('authToken'),
    logout: () => {
      localStorage.removeItem('authToken');
      router.push('/login');
    },
  };
};