'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Icons,
  Input,
  LoadingState,
  Modal,
  Pagination,
  Select,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  ThemePreviewCard,
  useToast,
} from '@smm/ui';
import type { PanelTheme, SafeUser } from '@smm/types';
import { PANEL_THEMES, PANEL_THEME_LABELS } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';

interface AdminThemeRow extends SafeUser {
  adminTheme: {
    theme: PanelTheme;
    enabledThemes: PanelTheme[];
    defaultTheme: PanelTheme;
    updatedAt: string | null;
  };
  userPanel: { theme: PanelTheme; allowUserOverride: boolean };
}

interface ThemeEditorState {
  admin: AdminThemeRow;
  theme: PanelTheme;
  enabledThemes: PanelTheme[];
  defaultTheme: PanelTheme;
}

export default function AdminThemesPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<ThemeEditorState | null>(null);

  const rows = useApi<{ items: AdminThemeRow[]; total: number; page: number; totalPages: number }>(
    `/super-admin/admin-themes?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
  );

  function openEditor(admin: AdminThemeRow) {
    setError(null);
    setEditor({
      admin,
      theme: admin.adminTheme.theme,
      enabledThemes: [...admin.adminTheme.enabledThemes],
      defaultTheme: admin.adminTheme.defaultTheme,
    });
  }

  async function saveEditor() {
    if (!editor) return;
    setError(null);
    setSaving(true);
    try {
      await api(`/super-admin/admin-themes/${editor.admin.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          theme: editor.theme,
          enabledThemes: editor.enabledThemes,
          defaultTheme: editor.defaultTheme,
        }),
      });
      toast.success(`Saved themes for ${editor.admin.name}.`);
      setEditor(null);
      rows.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save themes.');
    } finally {
      setSaving(false);
    }
  }

  function toggleEnabled(theme: PanelTheme) {
    if (!editor) return;
    setEditor((e) => {
      if (!e) return e;
      const next = e.enabledThemes.includes(theme)
        ? e.enabledThemes.filter((t) => t !== theme)
        : [...e.enabledThemes, theme];
      return { ...e, enabledThemes: next };
    });
  }

  const items = rows.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Admin themes"
        subtitle="Set each admin's panel theme and the user panel themes they may offer."
      />

      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput);
          setPage(1);
        }}
      >
        <div className="flex-1">
          <Input
            placeholder="Search by name, email or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" icon={<Icons.Search className="h-4 w-4" />}>
          Search
        </Button>
      </form>

      {rows.loading ? (
        <LoadingState label="Loading admins…" />
      ) : rows.error ? (
        <ErrorState message={rows.error} onRetry={rows.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="No admins yet" description="Admins appear here once they are created." />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden lg:block">
            <Table>
              <THead>
                <Th>Admin</Th>
                <Th>Admin panel theme</Th>
                <Th>User panel themes</Th>
                <Th>User override</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {items.map((admin) => (
                  <Tr key={admin.id}>
                    <Td>
                      <p className="font-semibold text-foreground">{admin.name}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </Td>
                    <Td>
                      <Badge>{PANEL_THEME_LABELS[admin.adminTheme.theme] ?? admin.adminTheme.theme}</Badge>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {admin.adminTheme.enabledThemes.map((theme) => (
                          <Badge key={theme}>{PANEL_THEME_LABELS[theme] ?? theme}</Badge>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <Badge>{admin.userPanel.allowUserOverride ? 'enabled' : 'disabled'}</Badge>
                    </Td>
                    <Td>
                      <Button variant="outline" size="sm" icon={<Icons.Edit className="h-4 w-4" />} onClick={() => openEditor(admin)}>
                        Edit
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>

          <ul className="divide-y divide-border lg:hidden dark:divide-border">
            {items.map((admin) => (
              <li key={admin.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{admin.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEditor(admin)}>
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                  <Badge>Panel: {PANEL_THEME_LABELS[admin.adminTheme.theme] ?? admin.adminTheme.theme}</Badge>
                  <Badge>Override: {admin.userPanel.allowUserOverride ? 'enabled' : 'disabled'}</Badge>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 pb-4">
            <Pagination page={rows.data?.page ?? 1} totalPages={rows.data?.totalPages ?? 1} onPage={setPage} />
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor ? `Themes — ${editor.admin.name}` : 'Themes'}
        size="lg"
      >
        {editor ? (
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Admin panel theme</p>
              <div data-admin-theme={editor.theme} className="rounded-2xl border border-border p-3">
                <ThemePreviewCard theme={editor.theme} />
              </div>
              <Field label="Theme" htmlFor="admin-panel-theme">
                <Select
                  id="admin-panel-theme"
                  value={editor.theme}
                  onChange={(e) => setEditor((ed) => (ed ? { ...ed, theme: e.target.value as PanelTheme } : ed))}
                >
                  {PANEL_THEMES.map((theme) => (
                    <option key={theme} value={theme}>
                      {PANEL_THEME_LABELS[theme]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">User panel themes this admin may activate</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {PANEL_THEMES.map((theme) => {
                  const active = editor.enabledThemes.includes(theme);
                  return (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => toggleEnabled(theme)}
                      className={`cursor-pointer rounded-2xl border-2 p-2 text-left transition ${
                        active ? 'border-ring ring-1 ring-ring' : 'border-border hover:border-muted-foreground'
                      }`}
                      aria-pressed={active}
                    >
                      <div data-admin-theme={theme} className="overflow-hidden rounded-xl">
                        <ThemePreviewCard theme={theme} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 px-1">
                        <span className="text-xs font-semibold text-foreground">
                          {PANEL_THEME_LABELS[theme]}
                        </span>
                        {active ? (
                          <Badge>on</Badge>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">off</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                A theme must be enabled before the admin can select it or their users can activate it.
                Default: {PANEL_THEME_LABELS[editor.defaultTheme] ?? editor.defaultTheme}.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default user panel theme" htmlFor="user-default-theme" hint="Used when the admin hasn't picked one.">
                <Select
                  id="user-default-theme"
                  value={editor.defaultTheme}
                  onChange={(e) => setEditor((ed) => (ed ? { ...ed, defaultTheme: e.target.value as PanelTheme } : ed))}
                >
                  {PANEL_THEMES.map((theme) => (
                    <option key={theme} value={theme}>
                      {PANEL_THEME_LABELS[theme]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {error ? (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditor(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void saveEditor()} loading={saving}>
                Save themes
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}