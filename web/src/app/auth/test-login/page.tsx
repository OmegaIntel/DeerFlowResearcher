'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, setAuthToken } from '~/services/auth';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

export default function TestLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleTestLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Create FormData for login
      const formData = new FormData();
      formData.append('username', 'chetan@omegaintelligence.ai');
      formData.append('password', 'Test123.');

      // Call login API
      const response = await loginUser(formData);
      
      if (response.access_token) {
        // Set the auth token
        setAuthToken(response.access_token);
        setSuccess(true);
        
        // Redirect to chat after 2 seconds
        setTimeout(() => {
          router.push('/chat');
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to log in with test credentials:
          </p>
          
          <div className="bg-gray-50 p-3 rounded text-sm">
            <p><strong>Email:</strong> chetan@omegaintelligence.ai</p>
            <p><strong>Password:</strong> Test123.</p>
          </div>

          <Button 
            onClick={handleTestLogin}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Logging in...' : 'Login with Test Credentials'}
          </Button>

          {error && (
            <div className="text-red-500 text-sm">
              Error: {error}
            </div>
          )}

          {success && (
            <div className="text-green-500 text-sm">
              Login successful! Redirecting to chat...
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            <p>Or navigate to the normal login page:</p>
            <Button
              variant="link"
              onClick={() => router.push('/auth/login')}
              className="p-0 h-auto"
            >
              Go to Login Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}