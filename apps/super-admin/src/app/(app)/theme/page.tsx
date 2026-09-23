'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  LoadingState,
  ThemePreviewCard,
  useAdminPanelTheme,
  useToast,
} from '@smm/ui';
import {
  DEFAULT_PANEL_THEME,
  PANEL_THEME_DESCRIPTIONS,
  PANEL_THEME_LABELS,
  PANEL_THEME_SWATCHES,
  PREMIUM_PANEL_THEMES,
  PANEL_THEMES,
  type PanelTheme,
} from '@smm/types';
import { ApiError, api } from '@/lib/api';

const PREMIUM_SWATCH_NAMES: Record<string, string> = {
  'vibrant-neon': 'Purple • Pink • Cyan',
  'sunset-tropical': 'Orange • Pink • Yellow',
  'ocean-aurora': 'Cyan • Blue • Purple',
};

const BASE_THEMES: PanelTheme[] = PANEL_THEMES.filter((t) => !PREMIUM_PANEL_THEMES.includes(t));

function ThemeVisual({ theme }: { theme: PanelTheme }) {
  return (
    <div data-admin-theme={theme} className="pointer-events-none overflow-hidden rounded-2xl border border-border-strong bg-background p-4">
      <div className="h-14 rounded-xl shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]" />
      <div className="mt-3 space-y-2 rounded-xl border border-border-strong bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]" />
          <span className="h-2 w-20 rounded-full bg-muted" />
          <span className="ml-auto h-4 w-12 rounded-md shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]" />
        </div>
        <div className="h-2 w-full rounded-full bg-muted" />
        <div className="h-2 w-2/3 rounded-full bg-muted" />
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <span className="h-6 rounded-lg [background-image:var(--secondary-gradient)]" />
          <span className="h-6 rounded-lg [background-image:var(--accent-gradient)]" />
          <span className="h-6 rounded-lg shadow-[var(--primary-glow)] [background-image:var(--primary-gradient)]" />
        </div>
      </div>
    </div>
  );
}

function SwatchRow({ theme }: { theme: PanelTheme }) {
  const colors = PANEL_THEME_SWATCHES[theme] ?? [];
  return (
    <div className="flex items-center gap-2">
      {colors.map((c) => (
        <span key={c} className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
      ))}
      <span className="text-xs font-semibold text-muted-foreground">
        {PREMIUM_SWATCH_NAMES[theme] ?? PANEL_THEME_LABELS[theme]}
      </span>
    </div>
  );
}

export default function AppearancePage() {
  const toast = useToast();
  const { theme: activeTheme, setTheme } = useAdminPanelTheme();
  const [saving, setSaving] = useState<PanelTheme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedTheme, setLoadedTheme] = useState<PanelTheme>(DEFAULT_PANEL_THEME);
  const [loadingTheme, setLoadingTheme] = useState(true);

  useEffect(() => {
    let active = true;
    api<{ theme: PanelTheme }>('/super-admin/platform-theme')
      .then((data) => {
        if (!active) return;
        setLoadedTheme(data.theme);
      })
      .catch(() => {
        // provider keeps its own copy
      })
      .finally(() => {
        if (active) setLoadingTheme(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const apply = useCallback(
    async (theme: PanelTheme) => {
      setError(null);
      setSaving(theme);
      try {
        await api('/super-admin/platform-theme', {
          method: 'PATCH',
          body: JSON.stringify({ theme }),
        });
        setLoadedTheme(theme);
        setTheme(theme);
        toast.success(`Theme changed to ${PANEL_THEME_LABELS[theme]}.`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to apply the theme.');
      } finally {
        setSaving(null);
      }
    },
    [setTheme, toast],
  );

  if (loadingTheme) return <LoadingState label="Loading theme…" />;

  const selected = activeTheme ?? loadedTheme;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Appearance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the platform theme. It applies across the Super Admin panel, every admin panel and the user
          panels — instantly, on every page, and it survives refreshes and new logins.
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PREMIUM_PANEL_THEMES.map((theme) => {
          const active = selected === theme;
          return (
            <div
              key={theme}
              className={`flex flex-col gap-3 rounded-3xl border-2 p-3 transition-all duration-200 hover:-translate-y-1 ${
                active
                  ? 'border-ring shadow-[var(--accent-glow)]'
                  : 'border-border-strong bg-card hover:border-ring/70'
              }`}
            >
              <ThemeVisual theme={theme} />
              <div className="flex items-start justify-between gap-2 px-1">
                <div>
                  <p className="text-sm font-bold text-foreground">{PANEL_THEME_LABELS[theme]}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{PANEL_THEME_DESCRIPTIONS[theme]}</p>
                </div>
                {active ? (
                  <Badge>
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success" /> Active
                  </Badge>
                ) : null}
              </div>
              <SwatchRow theme={theme} />
              <Button
                variant={active ? 'outline' : 'primary'}
                fullWidth
                disabled={active || saving !== null}
                loading={saving === theme}
                onClick={() => void apply(theme)}
              >
                {active ? '✓ Active' : 'Apply theme'}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-10">
        <Card className="p-0">
          <div className="p-5 pb-2">
            <CardHeader
              title="Base themes"
              subtitle="Clean light/dark are still available as platform-wide choices for teams that prefer plain-neutral UIs."
            />
          </div>
          <ul className="divide-y divide-border">
            {BASE_THEMES.map((theme) => {
              const active = selected === theme;
              return (
                <li key={theme} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <ThemePreviewCard theme={theme} attribute="data-admin-theme" />
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                        {PANEL_THEME_LABELS[theme]}
                        {active ? <Badge>Active</Badge> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{PANEL_THEME_DESCRIPTIONS[theme]}</p>
                    </div>
                  </div>
                  <div className="shrink-0 sm:w-40">
                    <Button
                      variant={active ? 'outline' : 'secondary'}
                      fullWidth
                      size="sm"
                      disabled={active || saving !== null}
                      loading={saving === theme}
                      onClick={() => void apply(theme)}
                    >
                      {active ? 'Active' : 'Apply'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Changing the theme updates every admin panel and the default user-panel theme for all tenants. Individual
        admins and users with a personal theme override keep their choice.
      </p>
    </div>
  );
}