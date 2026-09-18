'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input } from '@smm/ui';
import { ApiError, api } from '@/lib/api';
import { GoogleAuthButton } from '@/components/google-auth-button';

function describeAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Invalid email or password.';
    if (err.status === 403) return 'This account cannot access the user portal.';
    if (err.status >= 500) return 'The server encountered an error. Please try again.';
    return err.message;
  }
  return 'Cannot reach the API. Check that the backend on port 4000 is running and try again.';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/auth/user/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(describeAuthError(err));
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your orders and wallet.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error ? (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
        ) : null}

        <Button type="submit" fullWidth loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="mt-5">
        <GoogleAuthButton redirect="/login" />
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  );
}
