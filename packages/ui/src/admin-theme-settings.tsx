'use client';

import { useCallback, useEffect, useState } from 'react';
import { isPanelTheme, PANEL_THEMES, PANEL_THEME_DESCRIPTIONS, PANEL_THEME_LABELS, type PanelTheme } from '@smm/types';
import { Badge } from './badge';
import { Button } from './primitives';
import { Card, CardHeader } from './card';
import { LoadingState } from './feedback';
import { useToast } from './toast';
import { ThemePreviewCard } from './theme-preview';
import { useAdminPanelTheme } from './user-panel-theme';

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

interface AdminThemeSettingsPayload {
  theme: PanelTheme;
  enabledThemes: PanelTheme[];
  defaultTheme: PanelTheme;
  updatedAt: string | null;
}

/**
 * Admin Panel theme manager for the Admin Panel. Reads the tenant-wide
 * `AdminThemeSettings` (GET /admin/theme) and, for the Main Admin, persists a
 * new selection (PATCH /admin/theme). Sub Admins inherit their Main Admin's
 * theme, so they see this read-only. The theme is then applied instantly
 * through the panel provider.
 */
export function AdminPanelThemeSettings({
  request,
  readOnly = false,
}: {
  request: RequestFn;
  readOnly?: boolean;
}) {
  const toast = useToast();
  const { setTheme } = useAdminPanelTheme();
  const [current, setCurrent] = useState<PanelTheme | null>(null);
  const [enabledThemes, setEnabledThemes] = useState<PanelTheme[]>([...PANEL_THEMES]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await request<AdminThemeSettingsPayload>('/admin/theme');
        if (!active) return;
        setCurrent(isPanelTheme(data.theme) ? data.theme : null);
        setEnabledThemes(
          (Array.isArray(data.enabledThemes) ? data.enabledThemes : []).filter((t) => isPanelTheme(t)),
        );
      } catch {
        if (!active) return;
        setError('Unable to load the current admin panel theme.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [request]);

  const save = useCallback(
    async (nextTheme: PanelTheme) => {
      setError(null);
      setSaving(true);
      try {
        await request('/admin/theme', {
          method: 'PATCH',
          body: JSON.stringify({ theme: nextTheme }),
        });
        setCurrent(nextTheme);
        setTheme(nextTheme);
        toast.success('Admin panel theme updated.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update the admin panel theme.');
      } finally {
        setSaving(false);
      }
    },
    [request, setTheme, toast],
  );

  if (loading) return <LoadingState label="Loading admin panel theme…" />;

  return (
    <Card>
      <CardHeader
        title="Admin panel theme"
        subtitle={
          readOnly
            ? 'Your Main Admin picks this theme; you inherit it. Choose the user panel theme below for your customers.'
            : 'Choose how this admin panel itself looks. Base themes plus the premium sets approved by the Super Admin.'
        }
      />
      {error ? (
        <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enabledThemes.map((theme) => {
          const isActive = current === theme;
          return (
            <div key={theme} className="flex flex-col gap-2">
              <ThemePreviewCard theme={theme} attribute="data-admin-theme" />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {PANEL_THEME_LABELS[theme]}
                    {isActive ? <Badge>Active</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{PANEL_THEME_DESCRIPTIONS[theme]}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={isActive ? 'outline' : 'primary'}
                fullWidth
                disabled={readOnly || isActive || saving}
                loading={saving && current !== theme}
                onClick={() => void save(theme)}
              >
                {isActive ? 'Active' : readOnly ? '—' : 'Activate'}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}