'use client';

import { useState } from 'react';
import { Icons, useToast } from '@smm/ui';

export function CopyButton({
  value,
  label = 'Copy panel URL',
}: {
  value: string;
  label?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Panel URL copied.');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Unable to copy to clipboard.');
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
    >
      {copied ? (
        <Icons.Success className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Icons.Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
