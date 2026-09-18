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
import { api, ROLE } from '@/lib/api';

const SessionContext = createContext<SafeUser | null>(null);

export function useSession(): SafeUser | null {
  return useContext(SessionContext);
}

function AuthGate({ loginPath, children }: { loginPath: string; children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authed' | 'anon'>('loading');
  const [user, setUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<{ user: SafeUser }>(`/auth/${ROLE}/me`);
        if (!active) return;
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
  }, [router, loginPath]);

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
    label: 'Menu',
    items: [
      { href: '/', label: 'Dashboard', icon: Icons.Dashboard, exact: true },
      { href: '/services', label: 'Services', icon: Icons.Services },
      { href: '/orders', label: 'Orders', icon: Icons.Orders },
      { href: '/wallet', label: 'Wallet', icon: Icons.Wallet },
      { href: '/settings', label: 'Settings', icon: Icons.Settings },
    ],
  },
];

const bottomNav: NavItem[] = [
  { href: '/', label: 'Home', icon: Icons.Dashboard, exact: true },
  { href: '/services', label: 'Services', icon: Icons.Services },
  { href: '/orders', label: 'Orders', icon: Icons.Orders },
  { href: '/wallet', label: 'Wallet', icon: Icons.Wallet },
];

function ShellFrame({ children }: { children: ReactNode }) {
  const user = useSession();
  if (!user) return null;
  return (
    <AppShell
      appName="SMM Panel"
      roleLabel="User Panel"
      user={user}
      navSections={navSections}
      bottomNav={bottomNav}
      onLogout={() => api(`/auth/${ROLE}/logout`, { method: 'POST' })}
    >
      {children}
    </AppShell>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <AuthGate loginPath="/login">
      <ShellFrame>{children}</ShellFrame>
    </AuthGate>
  );
}
