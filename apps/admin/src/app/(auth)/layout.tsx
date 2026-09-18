import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-base font-black text-white">
          SM
        </span>
        <span className="leading-tight">
          <span className="block text-lg font-bold text-zinc-900 dark:text-zinc-50">SMM Panel</span>
          <span className="block text-xs font-semibold uppercase tracking-wide text-indigo-500">Admin Panel</span>
        </span>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-6 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} SMM Panel. All rights reserved.
      </p>
    </div>
  );
}
