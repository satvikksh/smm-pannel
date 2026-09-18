'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Icons,
  Input,
  LoadingState,
  Modal,
  Select,
  StatusBadge,
  useToast,
} from '@smm/ui';
import type { AuditLog, License, SafeUser } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import { CopyButton } from '@/components/copy-button';
import { formatDate, formatDateShort } from '@/lib/format';

interface LicenseHistoryEntry {
  status: string;
  at: string;
  by?: string;
  reason?: string;
}

type LicenseDetail = License & { history: LicenseHistoryEntry[] };

interface AdminDetail {
  admin: SafeUser;
  license: LicenseDetail | null;
  recentActivity: AuditLog[];
}

const STATUSES = ['active', 'suspended', 'inactive'];

export default function AdminDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const detail = useApi<AdminDetail>(`/super-admin/admins/${params.id}`);

  const [savingStatus, setSavingStatus] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDays, setRenewDays] = useState('365');
  const [savingRenew, setSavingRenew] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [subdomainBusy, setSubdomainBusy] = useState(false);

  const reload = useCallback(() => detail.reload(), [detail]);

  async function updateSubdomain(action: 'disable' | 'enable' | 'regenerate') {
    setSubdomainBusy(true);
    try {
      await api(`/super-admin/admins/${params.id}/subdomain`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      toast.success(
        action === 'regenerate'
          ? 'Panel URL regenerated.'
          : action === 'disable'
            ? 'Panel URL disabled.'
            : 'Panel URL enabled.',
      );
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update the panel URL.');
    } finally {
      setSubdomainBusy(false);
    }
  }

  async function changeStatus(next: string) {
    setSavingStatus(true);
    try {
      await api(`/super-admin/admins/${params.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(`Admin marked ${next}.`);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update status.');
    } finally {
      setSavingStatus(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api(`/super-admin/admins/${params.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword }),
      });
      toast.success('Password reset.');
      setPasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      reload();
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Unable to reset password.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function renewLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail.data?.license) return;
    setSavingRenew(true);
    try {
      await api(`/super-admin/licenses/${detail.data.license.id}/renew`, {
        method: 'POST',
        body: JSON.stringify({ durationDays: Number(renewDays) }),
      });
      toast.success('License renewed.');
      setRenewOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to renew license.');
    } finally {
      setSavingRenew(false);
    }
  }

  async function removeAdmin() {
    setDeleting(true);
    try {
      await api(`/super-admin/admins/${params.id}`, { method: 'DELETE' });
      toast.success('Admin deleted.');
      router.replace('/admins');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete admin.');
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (detail.loading) return <LoadingState label="Loading admin…" />;
  if (detail.error || !detail.data) {
    return <ErrorState message={detail.error ?? 'Admin not found.'} onRetry={reload} />;
  }

  const { admin, license, recentActivity } = detail.data;

  return (
    <div>
      <PageHeader
        title={admin.name}
        subtitle={admin.email}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={admin.status} />
            <Link href="/admins">
              <Button variant="outline" size="sm" icon={<Icons.ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Account details" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Email</dt>
              <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{admin.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Phone</dt>
              <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{admin.phone}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Panel URL</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                {admin.subdomain ? (
                  <>
                    <a
                      href={`https://${admin.subdomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {admin.subdomain}
                    </a>
                    <CopyButton value={admin.subdomain} />
                    <StatusBadge status={admin.subdomainStatus ?? 'inactive'} />
                  </>
                ) : (
                  <Badge>not provisioned</Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Role</dt>
              <dd className="mt-1">
                <Badge>{admin.role.replace(/_/g, ' ')}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Joined</dt>
              <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{formatDate(admin.createdAt)}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className="w-full sm:max-w-xs">
              <Field label="Account status" htmlFor="admin-status">
                <Select
                  id="admin-status"
                  value={admin.status}
                  disabled={savingStatus}
                  onChange={(e) => changeStatus(e.target.value)}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Panel URL controls
            </p>
            <div className="flex flex-wrap gap-2">
              {admin.subdomain ? (
                admin.subdomainStatus === 'disabled' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Icons.Play className="h-4 w-4" />}
                    disabled={subdomainBusy}
                    onClick={() => updateSubdomain('enable')}
                  >
                    Enable
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Icons.Pause className="h-4 w-4" />}
                    disabled={subdomainBusy}
                    onClick={() => updateSubdomain('disable')}
                  >
                    Disable
                  </Button>
                )
              ) : null}
              <Button
                size="sm"
                variant="outline"
                icon={<Icons.Refresh className="h-4 w-4" />}
                disabled={subdomainBusy}
                onClick={() => updateSubdomain('regenerate')}
              >
                Regenerate
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon={<Icons.License className="h-4 w-4" />}
              onClick={() => setPasswordOpen(true)}
            >
              Reset password
            </Button>
            <Button
              variant="danger"
              icon={<Icons.Trash className="h-4 w-4" />}
              loading={deleting}
              onClick={() => setDeleteOpen(true)}
            >
              Delete admin
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="License"
            action={
              license ? (
                <Button size="sm" variant="outline" onClick={() => setRenewOpen(true)}>
                  Renew
                </Button>
              ) : undefined
            }
          />
          {license ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={license.status} />
                <span className="font-mono text-xs text-zinc-400">{license.licenseKey}</span>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Issued</dt>
                  <dd className="text-zinc-800 dark:text-zinc-100">{formatDateShort(license.issuedAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Expires</dt>
                  <dd className="text-zinc-800 dark:text-zinc-100">{formatDateShort(license.expiresAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Max users</dt>
                  <dd className="text-zinc-800 dark:text-zinc-100">{license.maxUsers || 'Unlimited'}</dd>
                </div>
              </dl>
              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">History</p>
                <ul className="space-y-2">
                  {license.history.map((entry, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs">
                      <StatusBadge status={entry.status} />
                      <div>
                        <p className="text-zinc-700 dark:text-zinc-200">{entry.reason || 'Status updated'}</p>
                        <p className="text-zinc-400">{formatDate(entry.at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <EmptyState title="No license" description="This admin has no license attached." />
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Recent activity" />
          {recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity recorded for this admin.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-800 dark:text-zinc-100">
                      {item.action.replace(/_/g, ' ').toLowerCase()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatDate(item.createdAt)} · {item.ip || 'unknown IP'}
                    </p>
                  </div>
                  <StatusBadge status={item.result === 'success' ? 'completed' : 'failed'} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Reset password">
        <form className="space-y-4" onSubmit={resetPassword}>
          <Field label="New password" htmlFor="reset-password">
            <Input
              id="reset-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="Confirm password" htmlFor="reset-confirm">
            <Input
              id="reset-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Field>
          {passwordError ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {passwordError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={savingPassword}>
              Reset password
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="Renew license">
        <form className="space-y-4" onSubmit={renewLicense}>
          <div className="w-full sm:max-w-xs">
            <Field label="Extension" htmlFor="renew-days">
              <Select id="renew-days" value={renewDays} onChange={(e) => setRenewDays(e.target.value)}>
                {[30, 90, 180, 365].map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setRenewOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={savingRenew}>
              Renew
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={removeAdmin}
        title="Delete admin?"
        message="The admin account is disabled and its license revoked. This cannot be undone."
        confirmLabel="Delete admin"
        loading={deleting}
      />
    </div>
  );
}