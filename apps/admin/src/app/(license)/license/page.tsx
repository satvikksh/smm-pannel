'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input, LoadingState, StatusBadge } from '@smm/ui';
import { ApiError, api, ROLE, type AuthSessionState, type LicenseState } from '@/lib/api';
import { formatDateShort } from '@/lib/format';

export default function LicensePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'anon'>('loading');
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await api<AuthSessionState>(`/auth/${ROLE}/me`);
        if (!active) return;
        if (session.licenseValid) {
          router.replace('/dashboard');
          return;
        }
        const state = await api<LicenseState>('/admin/license');
        if (!active) return;
        setLicense(state);
        setStatus('ready');
      } catch {
        if (!active) return;
        setStatus('anon');
        router.replace('/login');
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api('/admin/license/activate', {
        method: 'POST',
        body: JSON.stringify({ licenseKey }),
      });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to validate the license key.');
      setSaving(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await api(`/auth/${ROLE}/logout`, { method: 'POST' });
    } catch {
      // Ignore — we clear the client view regardless.
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  if (status !== 'ready') {
    return (
      <div className="flex justify-center py-10">
        <LoadingState label="Checking your license…" />
      </div>
    );
  }

  const current = license?.license ?? null;

  return (
    <Card>
      <h1 className="text-xl font-bold text-foreground">Activate your license</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your account is signed in, but an active license is required to use the Admin panel. Enter the
        license key issued by the platform Super Admin.
      </p>

      {current ? (
        <div className="mt-5 rounded-xl border border-border p-4 border-border">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current license</span>
            <StatusBadge status={current.status} />
          </div>
          <p className="mt-2 font-mono text-xs text-foreground">{current.licenseKey}</p>
          <p className="mt-1 text-xs text-muted-foreground">Expires {formatDateShort(current.expiresAt)}</p>
          {license?.reason ? (
            <p className="mt-2 text-sm font-medium text-danger">{license.reason}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          {license?.reason ?? 'No license is assigned to this account yet.'}
        </p>
      )}

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <Field label="License key" htmlFor="license-key" hint="Format: SMM-XXXX-XXXX-XXXX-XXXX">
          <Input
            id="license-key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="SMM-XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </Field>

        {error ? (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth loading={saving}>
          Validate & activate
        </Button>
      </form>

      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="mt-4 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {signingOut ? 'Signing out…' : 'Sign in with a different account'}
      </button>
    </Card>
  );
}
