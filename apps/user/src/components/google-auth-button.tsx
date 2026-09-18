'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Icons } from '@smm/ui';
import { getApiBase } from '@/lib/api';

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  cancelled: 'Google sign-in was cancelled.',
  failed: 'Unable to sign in with Google. Please try again.',
  role: 'Google login is available only for user accounts.',
  conflict: 'An account with this email already exists. Please use the available login method.',
  unavailable: 'Google sign-in is not configured on this server.',
};

/**
 * "Continue with Google" button for the User panel. The back end lives at the
 * configured API origin (`getApiBase()`, from NEXT_PUBLIC_API_URL) and OAuth
 * runs entirely through the API (`/api/auth/google`), so the Google client
 * secret never reaches the browser.
 *
 * The redirect target (`?google_error=...`) is read on mount so a failed or
 * cancelled flow shows the right message, then tidied from the address bar.
 */
export function GoogleAuthButton({ redirect = '/login' }: { redirect?: '/login' | '/register' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('google_error');
    if (!code) return;
    setError(GOOGLE_ERROR_MESSAGES[code] ?? 'Unable to sign in with Google. Please try again.');
    const url = new URL(window.location.href);
    url.searchParams.delete('google_error');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const start = useCallback(async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const base = getApiBase();
      // Reachability probe. A failed fetch means the API (and therefore OAuth)
      // is unreachable; the browser is only pointed at Google once the API is
      // confirmed to be alive and can set the state cookie.
      await fetch(`${base}/health`, { method: 'HEAD', credentials: 'include' });
      window.location.assign(`${base}/api/auth/google?redirect=${encodeURIComponent(redirect)}`);
    } catch {
      setError('Unable to connect to authentication server.');
      setBusy(false);
    }
  }, [busy, redirect]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or continue with</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {error ? (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        fullWidth
        loading={busy}
        disabled={busy}
        icon={<Icons.Google className="h-4 w-4" />}
        onClick={start}
      >
        {busy ? 'Connecting to Google…' : 'Continue with Google'}
      </Button>
    </div>
  );
}