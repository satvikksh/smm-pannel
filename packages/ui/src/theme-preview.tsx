'use client';

import { PANEL_THEME_LABELS, type PanelTheme } from '@smm/types';

/**
 * Renders a miniature preview of one panel theme inside a scoped wrapper so the
 * token palette renders faithfully regardless of the surrounding app theme. The
 * `attribute` selects which scope drives it (`data-user-theme` for the user
 * panel, `data-admin-theme` for the admin panel).
 */
export function ThemePreviewCard({
  theme,
  attribute = 'data-user-theme',
}: {
  theme: PanelTheme;
  attribute?: 'data-user-theme' | 'data-admin-theme';
}) {
  const scope =
    attribute === 'data-user-theme' ? { 'data-user-theme': theme } : { 'data-admin-theme': theme };
  return (
    <div
      {...scope}
      className="rounded-2xl border border-border bg-background p-4"
      aria-hidden="true"
    >
      <div className="rounded-xl bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]" />
          <span className="h-2 w-24 rounded-full bg-muted" />
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted" />
        <div className="mt-1.5 h-2 w-2/3 rounded-full bg-muted" />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]">
              {PANEL_THEME_LABELS[theme]}
            </span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </span>
        </div>
      </div>
    </div>
  );
}