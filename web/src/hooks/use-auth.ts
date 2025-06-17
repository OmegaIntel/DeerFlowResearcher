'use client';

import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();
  
  return {
    isAuthenticated: () => !!Cookies.get('authToken'),
    getToken: () => Cookies.get('authToken'),
    logout: () => {
      Cookies.remove('authToken');
      Cookies.remove('userInfo');
      localStorage.removeItem('userInfo');
      router.push('/auth/login');
    },
  };
};