'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Icons,
  Input,
  LoadingState,
  Select,
  useToast,
} from '@smm/ui';
import type { PlatformSettings } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/components/shell';
import { PageHeader } from '@/components/page-header';

interface FormState {
  siteName: string;
  currency: string;
  minDeposit: string;
  supportEmail: string;
  youtubeLink: string;
  telegramLink: string;
  registrationEnabled: boolean;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'NGN', 'BRL'];

export default function SettingsPage() {
  const toast = useToast();
  const session = useSession();
  const data = useApi<PlatformSettings>('/super-admin/settings');

  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data.data) return;
    setForm({
      siteName: data.data.siteName,
      currency: data.data.currency,
      minDeposit: String(data.data.minDeposit),
      supportEmail: data.data.supportEmail,
      youtubeLink: data.data.youtubeLink,
      telegramLink: data.data.telegramLink,
      registrationEnabled: data.data.registrationEnabled,
    });
  }, [data.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setError(null);
    setSaving(true);
    try {
      await api('/super-admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          siteName: form.siteName,
          currency: form.currency,
          minDeposit: Number(form.minDeposit),
          supportEmail: form.supportEmail,
          youtubeLink: form.youtubeLink,
          telegramLink: form.telegramLink,
          registrationEnabled: form.registrationEnabled,
        }),
      });
      toast.success('Settings saved.');
      data.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (data.loading) return <LoadingState label="Loading settings…" />;
  if (data.error || !data.data || !form) {
    return <ErrorState message={data.error ?? 'Unable to load settings.'} onRetry={data.reload} />;
  }

  return (
    <div>
      <PageHeader title="Platform settings" subtitle="Global configuration for every portal." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="General" subtitle="Applied platform-wide" />
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Site name" htmlFor="settings-site-name">
                <Input
                  id="settings-site-name"
                  value={form.siteName}
                  onChange={(e) => setForm((f) => (f ? { ...f, siteName: e.target.value } : f))}
                  required
                />
              </Field>
              <Field label="Currency" htmlFor="settings-currency">
                <Select
                  id="settings-currency"
                  value={form.currency}
                  onChange={(e) => setForm((f) => (f ? { ...f, currency: e.target.value } : f))}
                >
                  {[...new Set([form.currency, ...CURRENCIES])].filter(Boolean).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum deposit" htmlFor="settings-min-deposit">
                <Input
                  id="settings-min-deposit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minDeposit}
                  onChange={(e) => setForm((f) => (f ? { ...f, minDeposit: e.target.value } : f))}
                  required
                />
              </Field>
              <Field label="Support email" htmlFor="settings-support-email">
                <Input
                  id="settings-support-email"
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setForm((f) => (f ? { ...f, supportEmail: e.target.value } : f))}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="YouTube link" htmlFor="settings-youtube">
                <Input
                  id="settings-youtube"
                  value={form.youtubeLink}
                  onChange={(e) => setForm((f) => (f ? { ...f, youtubeLink: e.target.value } : f))}
                />
              </Field>
              <Field label="Telegram link" htmlFor="settings-telegram">
                <Input
                  id="settings-telegram"
                  value={form.telegramLink}
                  onChange={(e) => setForm((f) => (f ? { ...f, telegramLink: e.target.value } : f))}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.registrationEnabled}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, registrationEnabled: e.target.checked } : f))
                }
                className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
              />
              Allow new customer registrations
            </label>
            {error ? (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
            ) : null}
            <Button type="submit" loading={saving} icon={<Icons.Success className="h-4 w-4" />}>
              Save settings
            </Button>
          </form>
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
                <dd className="truncate font-medium text-foreground">{session?.email}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Role</dt>
                <dd>
                  <Badge>{session?.role.replace(/_/g, ' ') ?? 'super admin'}</Badge>
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Last updated" />
            <p className="text-sm text-muted-foreground">
              {new Date(data.data.updatedAt).toLocaleString()}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}