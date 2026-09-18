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
import type { License, LicenseStatus, Paginated, SafeUser } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { CopyButton } from '@/components/copy-button';
import { formatDateShort } from '@/lib/format';

type LicenseRow = License & { adminUserName?: string; adminUserEmail?: string };

const STATUSES: LicenseStatus[] = ['active', 'suspended', 'expired', 'revoked'];

export default function LicensesPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const licenses = useApi<Paginated<LicenseRow>>(
    `/super-admin/licenses?page=${page}&limit=10&search=${encodeURIComponent(search)}${
      status ? `&status=${status}` : ''
    }`,
  );
  const admins = useApi<Paginated<SafeUser>>('/super-admin/admins?page=1&limit=100');

  const [form, setForm] = useState({ adminUserId: '', durationDays: '365', maxUsers: '0' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function updateStatus(license: LicenseRow, next: LicenseStatus) {
    setBusy(license.id);
    try {
      await api(`/super-admin/licenses/${license.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: next,
          reason: `Marked ${next} from the licenses list`,
        }),
      });
      toast.success(`License ${next}.`);
      licenses.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update license.');
    } finally {
      setBusy(null);
    }
  }

  async function createLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api('/super-admin/licenses', {
        method: 'POST',
        body: JSON.stringify({
          adminUserId: form.adminUserId,
          durationDays: Number(form.durationDays),
          maxUsers: Number(form.maxUsers),
        }),
      });
      toast.success('License issued.');
      setOpen(false);
      setForm({ adminUserId: '', durationDays: '365', maxUsers: '0' });
      licenses.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to issue license.');
    } finally {
      setSaving(false);
    }
  }

  const items = licenses.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Licenses"
        subtitle="Issue, suspend and renew admin licenses."
        action={
          <Button icon={<Icons.Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Issue license
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
            placeholder="Search by license key or admin…"
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

      {licenses.loading ? (
        <LoadingState label="Loading licenses…" />
      ) : licenses.error ? (
        <ErrorState message={licenses.error} onRetry={licenses.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No licenses found"
            description="Issue a license to an existing admin."
            action={<Button onClick={() => setOpen(true)}>Issue license</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden lg:block">
            <Table>
              <THead>
                <Th>License key</Th>
                <Th>Admin</Th>
                <Th>Panel URL</Th>
                <Th>Status</Th>
                <Th>Expires</Th>
                <Th>Max users</Th>
                <Th>Actions</Th>
              </THead>
              <TBody>
                {items.map((license) => (
                  <Tr key={license.id}>
                    <Td>
                      <Link
                        href={`/licenses/${license.id}`}
                        className="font-mono text-xs font-semibold text-zinc-800 hover:text-indigo-600 dark:text-zinc-100"
                      >
                        {license.licenseKey}
                      </Link>
                    </Td>
                    <Td>
                      <p className="text-sm text-zinc-800 dark:text-zinc-100">
                        {license.adminUserName || '—'}
                      </p>
                      <p className="text-xs text-zinc-500">{license.adminUserEmail || ''}</p>
                    </Td>
                    <Td>
                      {license.adminSubdomain ? (
                        <div className="flex items-center gap-2">
                          <span className="max-w-[190px] truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            {license.adminSubdomain}
                          </span>
                          <CopyButton value={license.adminSubdomain} />
                        </div>
                      ) : (
                        <Badge>not provisioned</Badge>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={license.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-zinc-500">{formatDateShort(license.expiresAt)}</Td>
                    <Td className="text-zinc-500">{license.maxUsers || 'Unlimited'}</Td>
                    <Td>
                      <div className="w-32">
                        <Select
                          value={license.status}
                          disabled={busy === license.id}
                          onChange={(e) => updateStatus(license, e.target.value as LicenseStatus)}
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
          <ul className="divide-y divide-zinc-100 lg:hidden dark:divide-zinc-800">
            {items.map((license) => (
              <li key={license.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/licenses/${license.id}`}
                      className="block truncate font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-100"
                    >
                      {license.licenseKey}
                    </Link>
                    <p className="truncate text-xs text-zinc-500">{license.adminUserEmail || 'Unassigned'}</p>
                    {license.adminSubdomain ? (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-indigo-500">
                        <Icons.Subdomain className="h-3 w-3 shrink-0" />
                        {license.adminSubdomain}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge status={license.status} />
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <Pagination page={licenses.data?.page ?? 1} totalPages={licenses.data?.totalPages ?? 1} onPage={setPage} />
          </div>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Issue license"
        description="The admin must not already hold an active license."
      >
        <form className="space-y-4" onSubmit={createLicense}>
          <Field label="Admin" htmlFor="license-admin">
            <Select
              id="license-admin"
              value={form.adminUserId}
              onChange={(e) => setForm((f) => ({ ...f, adminUserId: e.target.value }))}
              required
            >
              <option value="">Select an admin…</option>
              {(admins.data?.items ?? []).map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} · {admin.email}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Duration" htmlFor="license-duration">
              <Select
                id="license-duration"
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
              >
                {[30, 90, 180, 365].map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Max users" htmlFor="license-max-users" hint="0 means unlimited.">
              <Input
                id="license-max-users"
                type="number"
                min="0"
                value={form.maxUsers}
                onChange={(e) => setForm((f) => ({ ...f, maxUsers: e.target.value }))}
              />
            </Field>
          </div>
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              Issue license
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}