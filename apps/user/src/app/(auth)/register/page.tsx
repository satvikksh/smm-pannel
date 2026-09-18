'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input, useToast } from '@smm/ui';
import { ApiError, api } from '@/lib/api';
import { GoogleAuthButton } from '@/components/google-auth-button';

interface FieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await api('/auth/user/register', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Account created. Welcome!');
      router.replace('/');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.details && typeof err.details === 'object') {
          const raw = err.details as Record<string, string[] | string>;
          const next: FieldErrors = {};
          for (const key of Object.keys(raw)) {
            const value = raw[key];
            if (key in form) {
              next[key as keyof FieldErrors] = Array.isArray(value) ? value[0] : value;
            }
          }
          setFieldErrors(next);
        }
      } else {
        setError('Unable to create your account right now.');
      }
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1 className="text-xl font-bold text-foreground">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start ordering services in seconds.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Field label="Full name" htmlFor="name" error={fieldErrors.name}>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            error={Boolean(fieldErrors.name)}
            placeholder="Jane Doe"
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Email" htmlFor="email" error={fieldErrors.email}>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={Boolean(fieldErrors.email)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Phone" htmlFor="phone" error={fieldErrors.phone}>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            error={Boolean(fieldErrors.phone)}
            placeholder="+1 555 000 1234"
            autoComplete="tel"
            required
          />
        </Field>
        <Field label="Password" htmlFor="password" error={fieldErrors.password} hint="At least 8 characters.">
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            error={Boolean(fieldErrors.password)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={fieldErrors.confirmPassword}>
          <Input
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            error={Boolean(fieldErrors.confirmPassword)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </Field>

        {error ? (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
        ) : null}

        <Button type="submit" fullWidth loading={loading}>
          Create account
        </Button>
      </form>

      <div className="mt-5">
        <GoogleAuthButton redirect="/register" />
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
