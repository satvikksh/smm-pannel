'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppShell,
  Icons,
  LoadingState,
  useTheme,
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
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Icons.Dashboard, exact: true },
      { href: '/audit-logs', label: 'Audit logs', icon: Icons.Audit },
      { href: '/settings', label: 'Platform settings', icon: Icons.Settings },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/admins', label: 'Admins', icon: Icons.Shield },
      { href: '/admin-themes', label: 'Admin themes', icon: Icons.Palette },
      { href: '/licenses', label: 'Licenses', icon: Icons.License },
      { href: '/users', label: 'Users', icon: Icons.Users },
      { href: '/orders', label: 'Orders', icon: Icons.Orders },
    ],
  },
  {
    label: 'Catalog & payments',
    items: [
      { href: '/services', label: 'Services', icon: Icons.Services },
      { href: '/categories', label: 'Categories', icon: Icons.Categories },
      { href: '/payments', label: 'Payment methods', icon: Icons.Payments },
    ],
  },
];

const bottomNav: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Icons.Dashboard, exact: true },
  { href: '/admins', label: 'Admins', icon: Icons.Shield },
  { href: '/licenses', label: 'Licenses', icon: Icons.License },
  { href: '/settings', label: 'Settings', icon: Icons.Settings },
];

function ShellFrame({ children }: { children: ReactNode }) {
  const user = useSession();
  const { theme, toggle } = useTheme();
  if (!user) return null;
  const themeToggle = (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {theme === 'dark' ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
    </button>
  );
  return (
    <AppShell
      appName="SMM Panel"
      roleLabel="Super Admin"
      user={user}
      navSections={navSections}
      bottomNav={bottomNav}
      themeToggle={themeToggle}
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