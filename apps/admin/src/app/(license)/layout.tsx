import type { ReactNode } from 'react';

export default function LicenseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]">
          SM
        </span>
        <span className="leading-tight">
          <span className="block text-lg font-bold text-foreground">SMM Panel</span>
          <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
            License activation
          </span>
        </span>
      </div>
      <div className="w-full max-w-lg">{children}</div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SMM Panel. All rights reserved.
      </p>
    </div>
  );
}