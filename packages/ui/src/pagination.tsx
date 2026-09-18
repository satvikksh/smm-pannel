'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground disabled:opacity-40"
      >
        <ArrowLeft className="h-4 w-4" />
        Prev
      </button>
      <div className="flex items-center gap-1">
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`h-9 w-9 rounded-xl text-sm font-semibold ${
              p === page
                ? 'bg-primary text-primary-foreground shadow-[var(--primary-glow)]'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground disabled:opacity-40"
      >
        Next
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}