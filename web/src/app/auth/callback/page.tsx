'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuthToken } from '~/services/auth';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('OAuth error:', error);
      router.push(`/auth/login?error=${error}`);
      return;
    }
    
    if (token) {
      console.log('[OAuth Callback] Token received');
      setAuthToken(token);
      
      // Redirect to chat or wherever the user was going
      router.push('/chat');
    } else {
      console.error('No token received');
      router.push('/auth/login?error=no_token');
    }
  }, [router, searchParams]);
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/20">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Logging you in...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-muted-foreground">Please wait while we complete your sign in.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}