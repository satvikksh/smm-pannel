import type { ReactNode } from 'react';

export default function PanelStatusLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
