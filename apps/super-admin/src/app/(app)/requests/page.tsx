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
import {
  ADMIN_REQUEST_STATUSES,
  type AdminRequestStatus,
  type LicenseStatus,
  type Paginated,
  type SafeUser,
} from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { CopyButton } from '@/components/copy-button';
import { formatDateShort } from '@/lib/format';

type RequestRow = SafeUser & {
  requestStatus: AdminRequestStatus;
  license: { status: LicenseStatus; licenseKey: string } | null;
};

/**
 * Approval is the existing admin-requests contract: a fresh active license is
 * issued for the tenant and the account is activated in one atomic step (see
 * POST /super-admin/admin-requests/:id/approve). The body MUST be a JSON
 * object — sending no body makes Express leave `req.body` undefined and the
 * backend rejects the request with 422 "Validation failed".
 */
const APPROVE_LICENSE_DURATION_DAYS = 365;
const APPROVE_MAX_USERS = 0;

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

/** Surface the real server validation message (message + field details). */
function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return 'Session expired. Please sign in again.';
    }
    const details = err.details as Record<string, string[]> | undefined;
    const fields = details
      ? Object.entries(details)
          .map(([key, msgs]) => `${key}: ${(msgs ?? []).join('; ')}`)
          .join(' · ')
      : '';
    return fields ? `${err.message} (${fields})` : err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default function RequestsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<RequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const requests = useApi<Paginated<RequestRow>>(
    `/super-admin/admin-requests?page=${page}&limit=10&search=${encodeURIComponent(search)}${
      status ? `&status=${status}` : ''
    }`,
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function approve(admin: RequestRow): Promise<boolean> {
    setUpdating(admin.id);
    try {
      const data = await api<{ message?: string }>(
        `/super-admin/admin-requests/${admin.id}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({
            licenseDurationDays: APPROVE_LICENSE_DURATION_DAYS,
            maxUsers: APPROVE_MAX_USERS,
          }),
        },
      );
      toast.success(data?.message ?? 'Request approved. Admin is now active.');
      requests.reload();
      return true;
    } catch (err) {
      toast.error(describeError(err, 'Unable to approve this request.'));
      return false;
    } finally {
      setUpdating(null);
    }
  }

  function reject(admin: RequestRow) {
    setRejectTarget(admin);
    setRejectReason('');
    setRejectError(null);
  }

  async function submitReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectTarget) return;
    setRejectError(null);
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError('Please provide a reason for rejecting this request.');
      return;
    }
    setRejecting(true);
    setUpdating(rejectTarget.id);
    try {
      const data = await api<{ message?: string }>(
        `/super-admin/admin-requests/${rejectTarget.id}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        },
      );
      toast.success(data?.message ?? 'Request rejected.');
      setRejectTarget(null);
      requests.reload();
    } catch (err) {
      setRejectError(describeError(err, 'Unable to reject this request.'));
    } finally {
      setRejecting(false);
      setUpdating(null);
    }
  }

  /**
   * Single status control driving the whole request lifecycle:
   *   pending  -> approved  → approve endpoint (activates + issues a license)
   *   pending  -> rejected  → reject endpoint (reason required)
   * A request that has already been decided is left untouched here — review it
   * from the Admins page instead of hitting endpoints that only accept pending
   * applications.
   */
  async function changeStatus(admin: RequestRow, next: string) {
    if (next === admin.requestStatus) return;
    if (admin.requestStatus !== 'pending') {
      toast.error('This request has already been decided. Manage it from the Admins page.');
      return;
    }
    if (next === 'approved') {
      await approve(admin);
      return;
    }
    if (next === 'rejected') {
      reject(admin);
      return;
    }
    toast.error('Unable to change the request status.');
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
      requests.reload();
    } catch (err) {
      setError(describeError(err, 'Unable to create admin.'));
    } finally {
      setSaving(false);
    }
  }

  const items = requests.data?.items ?? [];

  return (
    <div className="min-w-0">
      <PageHeader
        title="Requests"
        subtitle="Review registration requests and approve new admin accounts."
        action={
          <div className="w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto"
              icon={<Icons.Plus className="h-4 w-4" />}
              onClick={() => {
                setForm(EMPTY_FORM);
                setError(null);
                setOpen(true);
              }}
            >
              New admin
            </Button>
          </div>
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
            placeholder="Search requests…"
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
            {ADMIN_REQUEST_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" className="w-full sm:w-auto" icon={<Icons.Search className="h-4 w-4" />}>
          Search
        </Button>
      </form>

      {requests.loading ? (
        <LoadingState label="Loading requests…" />
      ) : requests.error ? (
        <ErrorState message={requests.error} onRetry={requests.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No requests"
            description={status ? `No ${status} registration requests found.` : 'Registration requests will appear here.'}
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
                      <StatusBadge status={admin.requestStatus} />
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDateShort(admin.createdAt)}</Td>
                    <Td>
                      <div className="w-36">
                        <Select
                          value={admin.requestStatus}
                          disabled={updating === admin.id}
                          onChange={(e) => changeStatus(admin, e.target.value)}
                          className="py-1.5 text-xs"
                        >
                          {ADMIN_REQUEST_STATUSES.map((value) => (
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

          <ul className="flex flex-col gap-3 p-3 lg:hidden sm:p-4">
            {items.map((admin) => (
              <li
                key={admin.id}
                className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admins/${admin.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:text-primary text-foreground"
                    >
                      {admin.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{admin.phone}</p>
                  </div>
                </div>

                {admin.subdomain ? (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-primary">
                    <Icons.Subdomain className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{admin.subdomain}</span>
                    <CopyButton value={admin.subdomain} />
                  </p>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">License</p>
                    {admin.license ? (
                      <div className="mt-1.5 flex flex-col items-start gap-1">
                        <StatusBadge status={admin.license.status} />
                        <span className="max-w-full truncate font-mono text-xs text-muted-foreground">
                          {admin.license.licenseKey}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-1.5">
                        <Badge>none</Badge>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Joined</p>
                    <p className="mt-1.5 text-sm text-foreground">
                      {formatDateShort(admin.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <StatusBadge status={admin.requestStatus} />
                </div>

                <div className="mt-3">
                  <label className="sr-only" htmlFor={`status-${admin.id}`}>
                    Update status for {admin.name}
                  </label>
                  <Select
                    id={`status-${admin.id}`}
                    value={admin.requestStatus}
                    disabled={updating === admin.id}
                    onChange={(e) => changeStatus(admin, e.target.value)}
                    className="h-11 w-full text-sm"
                  >
                    {ADMIN_REQUEST_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 pb-4">
            <Pagination page={requests.data?.page ?? 1} totalPages={requests.data?.totalPages ?? 1} onPage={setPage} />
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

      <Modal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Reject request"
        description={
          rejectTarget
            ? `Reject the application from ${rejectTarget.email}. The applicant will not be able to sign in.`
            : undefined
        }
        size="sm"
      >
        <form className="space-y-4" onSubmit={submitReject}>
          <Field
            label="Reason"
            htmlFor="reject-reason"
            hint="Shown to the applicant if they try to sign in."
          >
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              required
            />
          </Field>
          {rejectError ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {rejectError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setRejectTarget(null)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" fullWidth loading={rejecting}>
              Reject request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}