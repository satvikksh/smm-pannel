'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
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
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@smm/ui';
import type { LicenseStatus, Paginated, SafeUser } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { CopyButton } from '@/components/copy-button';
import { formatDateShort } from '@/lib/format';

type AdminRow = SafeUser & { license: { status: LicenseStatus; licenseKey: string } | null };

const STATUSES = ['active', 'suspended', 'inactive'];
const DURATIONS = [30, 90, 180, 365];

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  licenseDurationDays: '365',
  maxUsers: '0',
};

export default function AdminsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const admins = useApi<Paginated<AdminRow>>(
    `/super-admin/admins?page=${page}&limit=10&search=${encodeURIComponent(search)}${
      status ? `&status=${status}` : ''
    }`,
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function changeStatus(admin: AdminRow, next: string) {
    setUpdating(admin.id);
    try {
      await api(`/super-admin/admins/${admin.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(`Admin marked ${next}.`);
      admins.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update admin.');
    } finally {
      setUpdating(null);
    }
  }

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api('/super-admin/admins', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          licenseDurationDays: Number(form.licenseDurationDays),
          maxUsers: Number(form.maxUsers),
        }),
      });
      toast.success('Admin created with a license.');
      setOpen(false);
      setForm(EMPTY_FORM);
      admins.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create admin.');
    } finally {
      setSaving(false);
    }
  }

  const items = admins.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Admins"
        subtitle="Create admins and manage their licenses."
        action={
          <Button
            icon={<Icons.Plus className="h-4 w-4" />}
            onClick={() => {
              setForm(EMPTY_FORM);
              setError(null);
              setOpen(true);
            }}
          >
            New admin
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
        <div className="sm:w-44">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" icon={<Icons.Search className="h-4 w-4" />}>
          Search
        </Button>
      </form>

      {admins.loading ? (
        <LoadingState label="Loading admins…" />
      ) : admins.error ? (
        <ErrorState message={admins.error} onRetry={admins.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No admins yet"
            description="Create your first admin to get started."
            action={<Button onClick={() => setOpen(true)}>New admin</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden lg:block">
            <Table>
              <THead>
                <Th>Admin</Th>
                <Th>Phone</Th>
                <Th>Panel URL</Th>
                <Th>License</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th>Update</Th>
              </THead>
              <TBody>
                {items.map((admin) => (
                  <Tr key={admin.id}>
                    <Td>
                      <Link
                        href={`/admins/${admin.id}`}
                        className="font-semibold text-foreground hover:text-primary text-foreground"
                      >
                        {admin.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </Td>
                    <Td className="text-muted-foreground">{admin.phone}</Td>
                    <Td>
                      {admin.subdomain ? (
                        <div className="flex items-center gap-2">
                          <span className="max-w-[180px] truncate text-xs font-medium text-foreground">
                            {admin.subdomain}
                          </span>
                          <CopyButton value={admin.subdomain} />
                          {admin.subdomainStatus === 'disabled' ? (
                            <span className="text-[10px] font-semibold uppercase text-amber-600">
                              disabled
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <Badge>not provisioned</Badge>
                      )}
                    </Td>
                    <Td>
                      {admin.license ? (
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={admin.license.status} />
                          <span className="font-mono text-[11px] text-muted-foreground">{admin.license.licenseKey}</span>
                        </div>
                      ) : (
                        <Badge>none</Badge>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={admin.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDateShort(admin.createdAt)}</Td>
                    <Td>
                      <div className="w-36">
                        <Select
                          value={admin.status}
                          disabled={updating === admin.id}
                          onChange={(e) => changeStatus(admin, e.target.value)}
                          className="py-1.5 text-xs"
                        >
                          {STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <ul className="divide-y divide-border lg:hidden dark:divide-border">
            {items.map((admin) => (
              <li key={admin.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admins/${admin.id}`}
                      className="block truncate text-sm font-semibold text-foreground"
                    >
                      {admin.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                    {admin.subdomain ? (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-primary">
                        <Icons.Subdomain className="h-3 w-3 shrink-0" />
                        {admin.subdomain}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={admin.status} />
                    {admin.license ? <StatusBadge status={admin.license.status} /> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination page={admins.data?.page ?? 1} totalPages={admins.data?.totalPages ?? 1} onPage={setPage} />
          </div>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create admin"
        description="An active license is issued automatically."
        size="lg"
      >
        <form className="space-y-4" onSubmit={createAdmin}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="admin-name">
              <Input
                id="admin-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Phone" htmlFor="admin-phone">
              <Input
                id="admin-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </Field>
          </div>
          <Field label="Email" htmlFor="admin-email">
            <Input
              id="admin-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" htmlFor="admin-password" hint="At least 8 characters.">
              <Input
                id="admin-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </Field>
            <Field label="Confirm password" htmlFor="admin-confirm">
              <Input
                id="admin-confirm"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                required
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="License duration" htmlFor="admin-duration">
              <Select
                id="admin-duration"
                value={form.licenseDurationDays}
                onChange={(e) => setForm((f) => ({ ...f, licenseDurationDays: e.target.value }))}
              >
                {DURATIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Max users" htmlFor="admin-max-users" hint="0 means unlimited.">
              <Input
                id="admin-max-users"
                type="number"
                min="0"
                value={form.maxUsers}
                onChange={(e) => setForm((f) => ({ ...f, maxUsers: e.target.value }))}
              />
            </Field>
          </div>
          {error ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              Create admin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}