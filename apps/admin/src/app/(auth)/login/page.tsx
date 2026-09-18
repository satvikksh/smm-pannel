'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Icons, Input } from '@smm/ui';
import { ApiError, api, type AuthSessionState } from '@/lib/api';
import { currentPanelHost } from '@/lib/subdomain';

function describeAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status >= 500) return 'The server encountered an error. Please try again.';
    // 4xx messages come from the server and are specific to the failure
    // (invalid credentials, missing license, invalid/expired/suspended key).
    return err.message;
  }
  return 'Cannot connect to the API server. Check your connection and try again.';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [showLicenseKey, setShowLicenseKey] = useState(false);
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
      // The server validates the credentials AND the license key before any
      // session is created. There is no client-side bypass.
      await api<AuthSessionState>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, licenseKey }),
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
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Admin sign in</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Manage users, orders and the service catalog. Your license key is required.
      </p>
      {panelHost ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
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
        <Field label="License key" htmlFor="licenseKey">
          <div className="relative">
            <Input
              id="licenseKey"
              type={showLicenseKey ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              required
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="SMM-XXXX-XXXX-XXXX-XXXX"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowLicenseKey((v) => !v)}
              aria-label={showLicenseKey ? 'Hide license key' : 'Show license key'}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              {showLicenseKey ? <Icons.EyeOff className="h-4 w-4" /> : <Icons.Eye className="h-4 w-4" />}
            </button>
          </div>
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
