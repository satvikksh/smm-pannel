'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppShell,
  Icons,
  LoadingState,
  type NavItem,
  type NavSection,
} from '@smm/ui';
import type { SafeUser } from '@smm/types';
import { api, ROLE, type AuthSessionState } from '@/lib/api';

const SessionContext = createContext<SafeUser | null>(null);

export function useSession(): SafeUser | null {
  return useContext(SessionContext);
}

function AuthGate({
  loginPath,
  licensePath,
  requireLicense,
  children,
}: {
  loginPath: string;
  licensePath: string;
  requireLicense: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authed' | 'anon'>('loading');
  const [user, setUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<AuthSessionState>(`/auth/${ROLE}/me`);
        if (!active) return;
        // Authenticated but not licensed: the server has already rejected every
        // licensed route, so send the admin to activate/renew their license.
        if (requireLicense && !data.licenseValid) {
          setStatus('anon');
          router.replace(licensePath);
          return;
        }
        setUser(data.user);
        setStatus('authed');
      } catch {
        if (!active) return;
        setStatus('anon');
        router.replace(loginPath);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, loginPath, licensePath, requireLicense]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }
  if (status === 'anon' || !user) return null;

  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Icons.Dashboard, exact: true },
      { href: '/wallet', label: 'Wallet overview', icon: Icons.Wallet },
      { href: '/settings', label: 'Settings', icon: Icons.Settings },
    ],
  },
  {
    label: 'Manage',
    items: [
      { href: '/users', label: 'Users', icon: Icons.Users },
      { href: '/sub-admins', label: 'Sub-admins', icon: Icons.Profile },
      { href: '/orders', label: 'Orders', icon: Icons.Orders },
      { href: '/services', label: 'Services', icon: Icons.Services },
      { href: '/categories', label: 'Categories', icon: Icons.Categories },
      { href: '/theme', label: 'Theme', icon: Icons.Palette },
    ],
  },
];

const bottomNav: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Icons.Dashboard, exact: true },
  { href: '/users', label: 'Users', icon: Icons.Users },
  { href: '/orders', label: 'Orders', icon: Icons.Orders },
  { href: '/settings', label: 'Settings', icon: Icons.Settings },
];

function ShellFrame({ children }: { children: ReactNode }) {
  const user = useSession();
  if (!user) return null;
  return (
    <AppShell
      appName="SMM Panel"
      roleLabel="Admin Panel"
      user={user}
      subdomain={user.subdomain}
      navSections={navSections}
      bottomNav={bottomNav}
      onLogout={() => api(`/auth/${ROLE}/logout`, { method: 'POST' })}
    >
      {children}
    </AppShell>
  );
}

export function PortalShell({
  children,
  requireLicense = false,
}: {
  children: ReactNode;
  requireLicense?: boolean;
}) {
  return (
    <AuthGate loginPath="/login" licensePath="/login" requireLicense={requireLicense}>
      <ShellFrame>{children}</ShellFrame>
    </AuthGate>
  );
}