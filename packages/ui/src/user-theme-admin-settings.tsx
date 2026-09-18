'use client';

import { useCallback, useEffect, useState } from 'react';
import { PANEL_THEMES, PANEL_THEME_LABELS, type PanelTheme } from '@smm/types';
import { Badge } from './badge';
import { Button } from './primitives';
import { Card, CardHeader } from './card';
import { LoadingState } from './feedback';
import { useToast } from './toast';
import { ThemePreviewCard } from './theme-preview';

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

interface UserThemeSettingsPayload {
  theme: PanelTheme;
  allowUserOverride: boolean;
  defaultTheme: PanelTheme;
  enabledThemes: PanelTheme[];
  updatedAt: string | null;
}

/**
 * Tenant User Panel theme manager for the Admin Panel. Reads the Main Admin's
 * `UserThemeSettings` (GET /admin/user-theme) and persists theme + the
 * user-override flag (PATCH /admin/user-theme). Only the themes enabled by the
 * Super Admin (`enabledThemes`) can be activated.
 */
export function UserThemeAdminSettings({ request }: { request: RequestFn }) {
  const toast = useToast();
  const [current, setCurrent] = useState<PanelTheme | null>(null);
  const [allowOverride, setAllowOverride] = useState(false);
  const [enabledThemes, setEnabledThemes] = useState<PanelTheme[]>([...PANEL_THEMES]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await request<UserThemeSettingsPayload>('/admin/user-theme');
        if (!active) return;
        setCurrent(PANEL_THEMES.includes(data.theme as PanelTheme) ? (data.theme as PanelTheme) : null);
        setAllowOverride(data.allowUserOverride);
        setEnabledThemes(PANEL_THEMES.filter((t) => data.enabledThemes.includes(t)));
      } catch {
        if (!active) return;
        setError('Unable to load the current user panel theme.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [request]);

  const save = useCallback(
    async (nextTheme: PanelTheme, nextAllowOverride: boolean) => {
      if (!current) return;
      setError(null);
      setSaving(true);
      try {
        const data = await request<UserThemeSettingsPayload>('/admin/user-theme', {
          method: 'PATCH',
          body: JSON.stringify({ theme: nextTheme, allowUserOverride: nextAllowOverride }),
        });
        setCurrent(PANEL_THEMES.includes(data.theme as PanelTheme) ? (data.theme as PanelTheme) : nextTheme);
        setAllowOverride(data.allowUserOverride);
        toast.success('User panel theme updated.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update the user panel theme.');
      } finally {
        setSaving(false);
      }
    },
    [current, request, toast],
  );

  if (loading) return <LoadingState label="Loading theme…" />;

  return (
    <Card>
      <CardHeader
        title="User panel theme"
        subtitle="Choose the look your customers see in their panel. This only affects users of your tenant."
      />
      {error ? (
        <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enabledThemes.map((theme) => {
          const isActive = current === theme;
          return (
            <div key={theme} className="flex flex-col gap-2">
              <ThemePreviewCard theme={theme} />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {PANEL_THEME_LABELS[theme]}
                    {isActive ? <Badge>Active</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{allowedDescription(theme)}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={isActive ? 'outline' : 'primary'}
                fullWidth
                disabled={isActive || saving}
                loading={saving && current !== theme}
                onClick={() => void save(theme, allowOverride)}
              >
                {isActive ? 'Active' : 'Activate'}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <label className="flex max-w-xl items-start gap-3">
          <input
            type="checkbox"
            checked={allowOverride}
            onChange={(e) => {
              setAllowOverride(e.target.checked);
              if (current) void save(current, e.target.checked);
            }}
            className="mt-1 h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">Allow users to override this theme</span>
            <span className="block text-xs text-muted-foreground">
              When enabled, each of your users can pick their own theme from My Settings. Off by default.
            </span>
          </span>
        </label>
      </div>
    </Card>
  );
}

function allowedDescription(theme: PanelTheme): string {
  switch (theme) {
    case 'modern-light':
      return 'Clean light interface';
    case 'modern-dark':
      return 'Premium navy dark mode';
    case 'premium-gradient':
      return 'Vibrant gradient colors';
  }
}