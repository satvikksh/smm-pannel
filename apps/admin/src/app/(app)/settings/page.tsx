'use client';

import {
  Badge,
  Card,
  CardHeader,
  ErrorState,
  Icons,
  LoadingState,
} from '@smm/ui';
import type { PaymentMethod, PlatformSettings } from '@smm/types';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/components/shell';
import { PageHeader } from '@/components/page-header';
import { formatMoney } from '@/lib/format';

interface SettingsPayload {
  settings: PlatformSettings;
  paymentMethods: PaymentMethod[];
}

export default function SettingsPage() {
  const session = useSession();
  const data = useApi<SettingsPayload>('/admin/settings');

  if (data.loading) return <LoadingState label="Loading settings…" />;
  if (data.error || !data.data) {
    return <ErrorState message={data.error ?? 'Unable to load settings.'} onRetry={data.reload} />;
  }

  const { settings, paymentMethods } = data.data;

  const rows: { label: string; value: string }[] = [
    { label: 'Site name', value: settings.siteName },
    { label: 'Currency', value: settings.currency },
    { label: 'Minimum deposit', value: formatMoney(settings.minDeposit, settings.currency) },
    { label: 'Registration', value: settings.registrationEnabled ? 'Enabled' : 'Disabled' },
    { label: 'Support email', value: settings.supportEmail || '—' },
    { label: 'Updated at', value: new Date(settings.updatedAt).toLocaleString() },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform configuration and your account." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Platform settings" subtitle="Managed by the super admin" />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0"
              >
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-semibold text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {settings.telegramLink ? (
              <a
                href={settings.telegramLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-foreground hover:text-primary"
              >
                <Icons.Telegram className="h-4 w-4" /> Telegram
              </a>
            ) : null}
            {settings.youtubeLink ? (
              <a
                href={settings.youtubeLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-foreground hover:text-primary"
              >
                <Icons.YouTube className="h-4 w-4" /> YouTube
              </a>
            ) : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Your account" />
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium text-foreground">{session?.name}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium text-foreground">{session?.email}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Role</dt>
                <dd>
                  <Badge>{session?.role ?? 'admin'}</Badge>
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Payment methods" />
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground">None configured.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {paymentMethods.map((method) => (
                  <li key={method.id} className="flex items-center justify-between gap-2">
                    <span className="text-foreground">{method.name}</span>
                    <Badge>{method.enabled ? 'enabled' : 'disabled'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}