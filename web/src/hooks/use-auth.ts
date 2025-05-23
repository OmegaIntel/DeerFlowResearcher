'use client';

import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export const useAuth = () => {
  const router = useRouter();
  
  return {
    isAuthenticated: () => !!Cookies.get('authToken'),
    getToken: () => Cookies.get('authToken'),
    logout: () => {
      Cookies.remove('authToken', { path: '/' });
      router.push('/auth/login');
    },
  };
};