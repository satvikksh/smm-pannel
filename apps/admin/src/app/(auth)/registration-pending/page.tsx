'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Icons } from '@smm/ui';
import { currentPanelHost } from '@/lib/subdomain';

export default function RegistrationPendingPage() {
  const [panelHost, setPanelHost] = useState<string | null>(null);

  useEffect(() => {
    setPanelHost(currentPanelHost());
  }, []);

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Icons.Clock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Registration pending approval
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your admin account was created and is waiting for a super admin to
            review it. You will be able to sign in once it is approved and your
            license has been issued.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Icons.Success className="h-4 w-4 text-emerald-500" />
          What happens next
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>A super admin reviews your registration.</li>
          <li>Once approved, your license is issued automatically.</li>
          <li>Return to this panel host and sign in with your email and password.</li>
        </ul>
      </div>

      {panelHost ? (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Icons.Subdomain className="h-3.5 w-3.5" />
          {panelHost}
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already a member?{' '}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
