'use client';

import { useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Icons,
  Input,
  LoadingState,
  Modal,
  Pagination,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@smm/ui';
import type { AdminScope, Paginated, SafeUser } from '@smm/types';
import { ADMIN_SCOPES } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { formatDateShort } from '@/lib/format';

const SCOPE_OPTIONS: { value: AdminScope; label: string; hint: string }[] = [
  { value: ADMIN_SCOPES.MANAGE_USERS, label: 'Manage users', hint: 'Create, claim and change user statuses.' },
  { value: ADMIN_SCOPES.MANAGE_USER_THEME, label: 'Manage user theme', hint: 'Set themes for assigned users.' },
  { value: ADMIN_SCOPES.VIEW_USERS, label: 'View users', hint: 'Browse users of the panel.' },
  { value: ADMIN_SCOPES.VIEW_ORDERS, label: 'View orders', hint: 'Browse and update orders.' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  scopes: [] as AdminScope[],
};

function scopesLabel(scopes?: string[]): string {
  if (!scopes || scopes.length === 0) return 'No scopes';
  const map = SCOPE_OPTIONS.reduce<Record<string, string>>((acc, opt) => {
    acc[opt.value] = opt.label;
    return acc;
  }, {});
  return scopes.map((s) => map[s] ?? s).join(', ');
}

export default function SubAdminsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const subs = useApi<Paginated<SafeUser>>(
    `/admin/sub-admins?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<SafeUser | null>(null);
  const [editScopes, setEditScopes] = useState<AdminScope[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SafeUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  function toggleScope(scopes: AdminScope[], value: AdminScope): AdminScope[] {
    return scopes.includes(value) ? scopes.filter((s) => s !== value) : [...scopes, value];
  }

  async function createSub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api('/admin/sub-admins', {
        method: 'POST',
        body: JSON.stringify({ ...form, confirmPassword: undefined, adminScopes: form.scopes }),
      });
      toast.success('Sub-admin created.');
      setOpen(false);
      setForm(EMPTY_FORM);
      setPage(1);
      subs.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create sub-admin.');
    } finally {
      setSaving(false);
    }
  }

  async function saveScopes() {
    if (!editTarget) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await api(`/admin/sub-admins/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ adminScopes: editScopes }),
      });
      toast.success('Permissions updated.');
      setEditTarget(null);
      subs.reload();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Unable to update permissions.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/admin/sub-admins/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Sub-admin deleted.');
      setDeleteTarget(null);
      subs.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete sub-admin.');
    } finally {
      setDeleting(false);
    }
  }

  const items = subs.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Sub-admins"
        subtitle="Team members who can manage parts of your panel."
        action={
          <Button
            icon={<Icons.Plus className="h-4 w-4" />}
            onClick={() => {
              setForm(EMPTY_FORM);
              setError(null);
              setOpen(true);
            }}
          >
            New sub-admin
          </Button>
        }
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

      {subs.loading ? (
        <LoadingState label="Loading sub-admins…" />
      ) : subs.error ? (
        <ErrorState message={subs.error} onRetry={subs.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No sub-admins yet"
            description="Create a sub-admin to delegate user and order management."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden md:block">
            <Table>
              <THead>
                <Th>Sub-admin</Th>
                <Th>Scopes</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {items.map((sub) => (
                  <Tr key={sub.id}>
                    <Td>
                      <p className="font-semibold text-foreground">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">{sub.email}</p>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {(sub.adminScopes ?? []).map((scope) => (
                          <Badge key={scope}>{scope.replace(/_/g, ' ')}</Badge>
                        ))}
                        {!sub.adminScopes || sub.adminScopes.length === 0 ? <Badge>no scopes</Badge> : null}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDateShort(sub.createdAt)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Icons.Edit className="h-4 w-4" />}
                          onClick={() => {
                            setEditScopes([...(sub.adminScopes ?? [])]);
                            setEditError(null);
                            setEditTarget(sub);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Icons.Trash className="h-4 w-4" />}
                          onClick={() => setDeleteTarget(sub)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y divide-border md:hidden dark:divide-border">
            {items.map((sub) => (
              <li key={sub.id} className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{sub.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{sub.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditScopes([...(sub.adminScopes ?? [])]);
                        setEditError(null);
                        setEditTarget(sub);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(sub)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{scopesLabel(sub.adminScopes)}</p>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination page={subs.data?.page ?? 1} totalPages={subs.data?.totalPages ?? 1} onPage={setPage} />
          </div>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create sub-admin"
        description="They log in on your panel URL using your license key."
        size="lg"
      >
        <form className="space-y-4" onSubmit={createSub}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="sub-name">
              <Input
                id="sub-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Phone" htmlFor="sub-phone">
              <Input
                id="sub-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </Field>
          </div>
          <Field label="Email" htmlFor="sub-email">
            <Input
              id="sub-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" htmlFor="sub-password" hint="At least 8 characters.">
              <Input
                id="sub-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </Field>
            <Field label="Confirm password" htmlFor="sub-confirm">
              <Input
                id="sub-confirm"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                required
              />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Permissions</p>
            <div className="space-y-2">
              {SCOPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={form.scopes.includes(option.value)}
                    onChange={() => setForm((f) => ({ ...f, scopes: toggleScope(f.scopes, option.value) }))}
                    className="mt-0.5 h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          {error ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              Create sub-admin
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit permissions"
        description={editTarget ? `Manage what ${editTarget.name} can do.` : undefined}
      >
        <div className="space-y-2">
          {SCOPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <input
                type="checkbox"
                checked={editScopes.includes(option.value)}
                onChange={() => setEditScopes((scopes) => toggleScope(scopes, option.value))}
                className="mt-0.5 h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {editError ? (
          <p className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{editError}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={savingEdit}>
            Cancel
          </Button>
          <Button onClick={() => void saveScopes()} loading={savingEdit}>
            Save permissions
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete sub-admin"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.name} from your panel? Their access is revoked immediately.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}