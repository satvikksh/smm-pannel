'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Icons, Input } from '@smm/ui';
import { ApiError, api } from '@/lib/api';
import { currentPanelHost } from '@/lib/subdomain';
import { GoogleAuthButton } from '@/components/google-auth-button';

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status >= 500) return 'The server hit an error. Please try again.';
    if (err.status === 409) return 'That email is already registered. Try signing in instead.';
    return err.message;
  }
  return 'Cannot reach the API server. Check your connection and try again.';
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [panelHost, setPanelHost] = useState<string | null>(null);

  useEffect(() => {
    setPanelHost(currentPanelHost());
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api<{ user: never; message: string }>('/auth/admin/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password, confirmPassword: confirm }),
      });
      // The account is created in a "pending" state and must be approved by a
      // super admin before it can sign in. No session is issued here.
      router.replace('/registration-pending');
      router.refresh();
    } catch (err) {
      setError(describeError(err));
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1 className="text-xl font-bold text-foreground">Create admin account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Register your admin panel. A super admin approves your account and issues
        your license before you can sign in.
      </p>
      {panelHost ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Icons.Subdomain className="h-3.5 w-3.5" />
          {panelHost}
        </p>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Field label="Full name" htmlFor="register-name">
          <Input
            id="register-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Email" htmlFor="register-email">
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Phone" htmlFor="register-phone" hint="Used if the super admin needs to reach you.">
          <Input
            id="register-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" htmlFor="register-password" hint="At least 8 characters.">
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="Confirm password" htmlFor="register-confirm">
          <Input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>

        {error ? (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth loading={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>

        <GoogleAuthButton />

        <p className="text-center text-sm text-muted-foreground">
          Already registered?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </Card>
  );
}
