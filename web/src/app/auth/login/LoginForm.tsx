'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { loginUser, setAuthToken } from '~/services/auth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPending] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const { access_token } = await loginUser(formData);
      console.log('[LoginForm] Token received:', access_token);
      
      setAuthToken(access_token);
      
      const returnTo = searchParams.get('returnTo') ?? '/';
      router.push(returnTo);
    } catch (error: unknown) {
      console.log('Error caught in login handler:', error);
      // ... rest of error handling
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/20">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Don&apos;t have an account?{' '}
            <a href="/auth/register" className="text-primary hover:underline">
              Register
            </a>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage &&
              (() => {
                console.log('Error message:', errorMessage);
                console.log('Error message type:', typeof errorMessage);
                console.log('Error message length:', errorMessage.length);
                return (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                );
              })()}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Logging in…' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
