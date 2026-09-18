'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input } from '@smm/ui';
import { ApiError, api } from '@/lib/api';

/**
 * Surface the real failure instead of collapsing everything into one string.
 * 401 -> bad credentials, 403 -> role not allowed, 5xx -> server fault,
 * anything that is not an ApiError is a network/CORS failure.
 */
function describeAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Invalid email or password.';
    if (err.status === 403) return 'This account does not have Super Admin permission.';
    if (err.status >= 500) return 'The server encountered an error. Please try again.';
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/auth/super-admin/login', {
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
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Super admin sign in</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Full platform control: admins, licenses, catalog and payments.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="superadmin@example.com"
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
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth loading={loading}>
          Sign in
        </Button>
      </form>
    </Card>
  );
}