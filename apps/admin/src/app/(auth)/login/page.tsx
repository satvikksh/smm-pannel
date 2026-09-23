'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Field, Icons, Input } from '@smm/ui';
import { ApiError, api, type AuthSessionState } from '@/lib/api';
import { currentPanelHost } from '@/lib/subdomain';
import { GoogleAuthButton } from '@/components/google-auth-button';

function describeAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status >= 500) return 'The server encountered an error. Please try again.';
    // 4xx messages come from the server and are specific to the failure:
    // invalid credentials, or an admin whose account is still pending approval,
    // rejected, blocked, or whose license is missing/invalid/suspended.
    return err.message;
  }
  return 'Cannot connect to the API server. Check your connection and try again.';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [panelHost, setPanelHost] = useState<string | null>(null);

  // When a licensed session lapses, the API layer bounces the admin back here
  // with the server-provided reason in the query string.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('licenseError');
    if (reason) setError(reason);
    setPanelHost(currentPanelHost());
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // The server validates the credentials and the admin's licence entitlement
      // (the licence tied to the approved admin account) before any session is
      // created. There is no client-side bypass and no manual licence entry.
      await api<AuthSessionState>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(describeAuthError(err));
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1 className="text-xl font-bold text-foreground">Admin sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage users, orders and the service catalog. Your licence is validated automatically.
      </p>
      {panelHost ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Icons.Subdomain className="h-3.5 w-3.5" />
          {panelHost}
        </p>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
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
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth loading={loading}>
          Sign in
        </Button>

        <GoogleAuthButton />

        <p className="text-center text-sm text-muted-foreground">
          New to the panel?{' '}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            Create admin account
          </Link>
        </p>
      </form>
    </Card>
  );
}
