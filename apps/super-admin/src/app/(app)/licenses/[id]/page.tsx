'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Icons,
  LoadingState,
  Modal,
  Select,
  StatusBadge,
  useToast,
} from '@smm/ui';
import type { License, LicenseStatus } from '@smm/types';
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

const STATUSES: LicenseStatus[] = ['active', 'suspended', 'expired', 'revoked'];

export default function LicenseDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const detail = useApi<{ license: LicenseDetail }>(`/super-admin/licenses/${params.id}`);
  const [saving, setSaving] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDays, setRenewDays] = useState('365');
  const [renewing, setRenewing] = useState(false);
  const [subdomainBusy, setSubdomainBusy] = useState(false);

  const reload = useCallback(() => detail.reload(), [detail]);

  async function updateSubdomain(action: 'disable' | 'enable' | 'regenerate') {
    setSubdomainBusy(true);
    try {
      await api(`/super-admin/admins/${license.adminUserId}/subdomain`, {
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

  async function updateStatus(next: LicenseStatus) {
    setSaving(true);
    try {
      await api(`/super-admin/licenses/${params.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next, reason: `Marked ${next} by super admin` }),
      });
      toast.success(`License ${next}.`);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update license.');
    } finally {
      setSaving(false);
    }
  }

  async function renew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRenewing(true);
    try {
      await api(`/super-admin/licenses/${params.id}/renew`, {
        method: 'POST',
        body: JSON.stringify({ durationDays: Number(renewDays) }),
      });
      toast.success('License renewed.');
      setRenewOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to renew license.');
    } finally {
      setRenewing(false);
    }
  }

  if (detail.loading) return <LoadingState label="Loading license…" />;
  if (detail.error || !detail.data) {
    return <ErrorState message={detail.error ?? 'License not found.'} onRetry={reload} />;
  }

  const { license } = detail.data;

  return (
    <div>
      <PageHeader
        title={license.licenseKey}
        subtitle={license.adminUserName ? `Issued to ${license.adminUserName}` : 'Unassigned license'}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={license.status} />
            <Link href="/licenses">
              <Button variant="outline" size="sm" icon={<Icons.ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="License details" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Admin</dt>
              <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                {license.adminUserName ? (
                  <Link
                    href={`/admins/${license.adminUserId}`}
                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {license.adminUserName}
                  </Link>
                ) : (
                  '—'
                )}
                <span className="block text-xs text-zinc-500">{license.adminUserEmail || ''}</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Panel URL</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                {license.adminSubdomain ? (
                  <>
                    <a
                      href={`https://${license.adminSubdomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {license.adminSubdomain}
                    </a>
                    <CopyButton value={license.adminSubdomain} />
                    <StatusBadge status={license.adminSubdomainStatus ?? 'inactive'} />
                  </>
                ) : (
                  <Badge>not provisioned</Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Max users</dt>
              <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                {license.maxUsers || 'Unlimited'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Issued</dt>
              <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{formatDate(license.issuedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Expires</dt>
              <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{formatDate(license.expiresAt)}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className="w-full sm:max-w-xs">
              <Field label="Status" htmlFor="license-status">
                <Select
                  id="license-status"
                  value={license.status}
                  disabled={saving}
                  onChange={(e) => updateStatus(e.target.value as LicenseStatus)}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              className="mt-4"
              variant="outline"
              icon={<Icons.Refresh className="h-4 w-4" />}
              onClick={() => setRenewOpen(true)}
            >
              Renew license
            </Button>
          </div>

          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Panel URL controls
            </p>
            <div className="flex flex-wrap gap-2">
              {license.adminSubdomain ? (
                license.adminSubdomainStatus === 'disabled' ? (
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
        </Card>

        <Card>
          <CardHeader title="History" />
          <ul className="space-y-3">
            {license.history.map((entry, index) => (
              <li key={index} className="flex items-start gap-2">
                <StatusBadge status={entry.status} />
                <div className="text-xs">
                  <p className="text-zinc-700 dark:text-zinc-200">{entry.reason || 'Status updated'}</p>
                  <p className="text-zinc-400">{formatDateShort(entry.at)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <Badge>Key {license.licenseKey.slice(0, 4)}••••</Badge>
          </div>
        </Card>
      </div>

      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="Renew license">
        <form className="space-y-4" onSubmit={renew}>
          <div className="w-full sm:max-w-xs">
            <Field label="Extension" htmlFor="license-renew-days">
              <Select
                id="license-renew-days"
                value={renewDays}
                onChange={(e) => setRenewDays(e.target.value)}
              >
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
            <Button type="submit" fullWidth loading={renewing}>
              Renew
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}