'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  UserThemeOverrideSettings,
  useUserPanelTheme,
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Icons,
  Input,
  LoadingState,
  useToast,
} from '@smm/ui';
import type { PlatformSettings, SafeUser, Wallet } from '@smm/types';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/components/shell';
import { PageHeader } from '@/components/page-header';
import { formatMoney } from '@/lib/format';

export default function SettingsPage() {
  const toast = useToast();
  const session = useSession();
  const { reload: reloadTheme } = useUserPanelTheme();
  const me = useApi<{ user: SafeUser; wallet?: Wallet }>('/auth/user/me');
  const settings = useApi<{ settings: PlatformSettings }>('/user/settings');

  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (me.data?.user) {
      setProfile({ name: me.data.user.name, phone: me.data.user.phone });
    }
  }, [me.data]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setSavingProfile(true);
    try {
      await api('/auth/user/me', { method: 'PATCH', body: JSON.stringify(profile) });
      toast.success('Profile updated.');
      me.reload();
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setSavingPassword(true);
    try {
      await api('/auth/user/me/password', { method: 'POST', body: JSON.stringify(passwords) });
      toast.success('Password changed.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Unable to change password.');
    } finally {
      setSavingPassword(false);
    }
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value).then(() => toast.info('Copied to clipboard.'));
  }

  if (me.loading) return <LoadingState label="Loading settings…" />;
  if (me.error) return <ErrorState message={me.error} onRetry={me.reload} />;

  const user = me.data?.user;
  const wallet = me.data?.wallet;
  const publicSettings = settings.data?.settings;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile, security and support links." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Profile" subtitle="Your personal information" />
            <form className="space-y-4" onSubmit={saveProfile}>
              <Field label="Full name" htmlFor="profile-name">
                <Input
                  id="profile-name"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Email" htmlFor="profile-email" hint="Email cannot be changed.">
                <Input id="profile-email" value={user?.email ?? ''} disabled />
              </Field>
              <Field label="Phone" htmlFor="profile-phone">
                <Input
                  id="profile-phone"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  required
                />
              </Field>
              {profileError ? (
                <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{profileError}</p>
              ) : null}
              <Button type="submit" loading={savingProfile}>
                Save changes
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Security" subtitle="Change your password" />
            <form className="space-y-4" onSubmit={changePassword}>
              <Field label="Current password" htmlFor="current-password">
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                  required
                />
              </Field>
              <Field label="New password" htmlFor="new-password" hint="At least 8 characters.">
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Confirm new password" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </Field>
              {passwordError ? (
                <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{passwordError}</p>
              ) : null}
              <Button type="submit" variant="secondary" loading={savingPassword}>
                Update password
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Account" />
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Role</dt>
                <dd>
                  <StatusRoleBadge role={user?.role ?? session?.role ?? 'user'} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Balance</dt>
                <dd className="font-semibold text-foreground">
                  {wallet ? formatMoney(wallet.balance, wallet.currency) : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="font-medium text-foreground">
                  {user ? new Date(user.createdAt).toLocaleDateString() : '—'}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Support" subtitle={publicSettings?.siteName ?? 'SMM Panel'} />
            <div className="space-y-3 text-sm">
              {publicSettings?.supportEmail ? (
                <button
                  onClick={() => copy(publicSettings.supportEmail)}
                  className="flex w-full items-center justify-between gap-2 text-left text-foreground hover:text-primary"
                >
                  <span className="flex items-center gap-2">
                    <Icons.Profile className="h-4 w-4" /> Support email
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{publicSettings.supportEmail}</span>
                </button>
              ) : null}
              {publicSettings?.telegramLink ? (
                <a
                  href={publicSettings.telegramLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-foreground hover:text-primary"
                >
                  <Icons.Telegram className="h-4 w-4" /> Telegram
                </a>
              ) : null}
              {publicSettings?.youtubeLink ? (
                <a
                  href={publicSettings.youtubeLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-foreground hover:text-primary"
                >
                  <Icons.YouTube className="h-4 w-4" /> YouTube
                </a>
              ) : null}
              {!publicSettings?.supportEmail && !publicSettings?.telegramLink && !publicSettings?.youtubeLink ? (
                <p className="text-sm text-muted-foreground">No support links configured.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <UserThemeOverrideSettings request={api} onThemeChanged={() => void reloadTheme()} />
      </div>
    </div>
  );
}

function StatusRoleBadge({ role }: { role: string }) {
  return <Badge>{role.replace(/_/g, ' ')}</Badge>;
}
