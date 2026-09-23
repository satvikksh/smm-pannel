'use client';

import { useCallback, useEffect, useState } from 'react';
import { PANEL_THEMES, PANEL_THEME_DESCRIPTIONS, PANEL_THEME_LABELS, type PanelTheme } from '@smm/types';
import { Badge } from './badge';
import { Button } from './primitives';
import { Card, CardHeader } from './card';
import { LoadingState } from './feedback';
import { useToast } from './toast';
import { ThemePreviewCard } from './theme-preview';

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

interface UserThemePayload {
  theme: PanelTheme;
  allowUserOverride: boolean;
  overrideApplied: boolean;
  source: 'tenant' | 'override' | 'default';
  availableThemes: PanelTheme[];
  updatedAt: string | null;
}

/**
 * Per-user theme override card for the User Panel settings page. Only rendered
 * when the tenant's `allowUserOverride` is `true`. After saving, calls
 * `onThemeChanged()` so the provider can refetch and apply the updated theme.
 */
export function UserThemeOverrideSettings({
  request,
  onThemeChanged,
}: {
  request: RequestFn;
  onThemeChanged?: () => void;
}) {
  const toast = useToast();
  const [current, setCurrent] = useState<PanelTheme | null>(null);
  const [allowOverride, setAllowOverride] = useState(true);
  const [availableThemes, setAvailableThemes] = useState<PanelTheme[]>([...PANEL_THEMES]);
  const [source, setSource] = useState<'tenant' | 'override' | 'default'>('tenant');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<PanelTheme | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await request<UserThemePayload>('/user/theme');
        if (!active) return;
        setAllowOverride(data.allowUserOverride);
        setCurrent(PANEL_THEMES.includes(data.theme as PanelTheme) ? (data.theme as PanelTheme) : null);
        setSource(data.source);
        setAvailableThemes(PANEL_THEMES.filter((t) => data.availableThemes.includes(t)));
      } catch {
        if (!active) return;
        setError('Unable to load theme settings.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [request]);

  const activate = useCallback(
    async (theme: PanelTheme) => {
      if (!allowOverride) return;
      setError(null);
      setSaving(theme);
      try {
        const data = await request<UserThemePayload>('/user/theme', {
          method: 'PATCH',
          body: JSON.stringify({ theme }),
        });
        setCurrent(PANEL_THEMES.includes(data.theme as PanelTheme) ? (data.theme as PanelTheme) : theme);
        setSource(data.source);
        toast.success('Theme updated.');
        onThemeChanged?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update the theme.');
      } finally {
        setSaving(null);
      }
    },
    [allowOverride, request, toast, onThemeChanged],
  );

  if (loading) return <LoadingState label="Loading theme…" />;

  if (!allowOverride) {
    return (
      <Card>
        <CardHeader
          title="Theme"
          subtitle="Your administrator manages the panel theme for everyone in your team."
        />
        <p className="text-sm text-muted-foreground">
          Personal theme overrides are not currently enabled. Your administrator has set the theme to{' '}
          <Badge>{current ? PANEL_THEME_LABELS[current] : '—'}</Badge>.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Theme"
        subtitle="Choose the look you prefer for the panel. Your choice is saved per browser."
      />
      {error ? (
        <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableThemes.map((theme) => {
          const isActive = current === theme && source === 'override';
          return (
            <div key={theme} className="flex flex-col gap-2">
              <ThemePreviewCard theme={theme} />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {PANEL_THEME_LABELS[theme]}
                    {isActive ? <Badge>Active</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isActive ? 'Your personal choice' : PANEL_THEME_DESCRIPTIONS[theme]}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={isActive ? 'outline' : 'primary'}
                fullWidth
                disabled={isActive || saving !== null}
                loading={saving === theme}
                onClick={() => void activate(theme)}
              >
                {isActive ? 'Active' : 'Select'}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}