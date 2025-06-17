import { useEffect, useState } from 'react';
import { getAuthToken } from '~/services/auth';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }

        const response = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setError('Failed to fetch user');
          setUser(null);
        }
      } catch (err) {
        setError('Failed to fetch user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Re-fetch on focus
    const handleFocus = () => {
      fetchUser();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return { user, loading, error };
}