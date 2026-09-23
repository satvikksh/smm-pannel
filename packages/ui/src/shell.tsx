'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Icons } from './icons';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: string[];
  exact?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

interface ShellProps {
  appName: string;
  roleLabel: string;
  user: { name: string; email: string; role: string };
  subdomain?: string | null;
  navSections: NavSection[];
  bottomNav: NavItem[];
  children: ReactNode;
  onLogout: () => Promise<void> | void;
  /** Optional theme toggle. If omitted the header shows no toggle (web panel). */
  themeToggle?: ReactNode;
  /** Optional badge counts keyed by nav item `href` (e.g. pending requests). */
  navBadges?: Record<string, number>;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  const prefixes = item.matchPrefix ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`));
}

function Brand({
  appName,
  roleLabel,
  subdomain,
}: {
  appName: string;
  roleLabel: string;
  subdomain?: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-[var(--primary-glow)]">
        SM
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-foreground">{appName}</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-primary">{roleLabel}</p>
        {subdomain ? (
          <p className="max-w-[170px] truncate text-[10px] font-medium text-muted-foreground">
            {subdomain}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function NavBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary-foreground">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function navCount(badges: Record<string, number> | undefined, href: string): number {
  return badges && badges[href] ? badges[href] : 0;
}

export function AppShell({
  appName,
  roleLabel,
  user,
  subdomain,
  navSections,
  bottomNav,
  children,
  onLogout,
  themeToggle,
  navBadges,
}: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
      setDrawerOpen(false);
      router.push('/login');
      router.refresh();
    }
  }

  const sidebarNav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
      {navSections.map((section, si) => (
        <div key={si}>
          {section.label ? (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
          ) : null}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                  {navCount(navBadges, item.href) > 0 ? (
                    <NavBadge count={navCount(navBadges, item.href)} />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const userMenu = (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5 text-card-foreground"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {user.name
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-tight text-foreground">{user.name}</p>
          <p className="text-[11px] leading-tight text-muted-foreground">{user.email}</p>
        </div>
        <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {menuOpen ? (
        <>
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40" />
          <div className="theme-anim-dropdown absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{user.role.replace(/_/g, ' ')}</p>
              {subdomain ? (
                <p className="mt-1 truncate text-[11px] font-medium text-primary">{subdomain}</p>
              ) : null}
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                router.push('/profile');
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
            >
              <Icons.Profile className="h-4 w-4" /> Profile
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
            >
              <Icons.Logout className="h-4 w-4" /> {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      {/* Per-theme decorative backdrop (top glow) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[380px]"
        style={{ backgroundImage: 'var(--app-backdrop)' }}
      />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border p-4">
          <Brand appName={appName} roleLabel={roleLabel} subdomain={subdomain} />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden pt-4">{sidebarNav}</div>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Icons.Logout className="h-[18px] w-[18px]" />
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="theme-anim-fade absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside className="theme-anim-drawer absolute inset-y-0 left-0 flex w-[280px] flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex items-center justify-between border-b border-sidebar-border p-4">
              <Brand appName={appName} roleLabel={roleLabel} subdomain={subdomain} />
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <Icons.Close className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden pt-4">{sidebarNav}</div>
            <div className="border-t border-sidebar-border p-3">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                <Icons.Logout className="h-[18px] w-[18px]" />
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Main column */}
      <div className="relative z-10 lg:pl-64">
        {/* Mobile sticky header */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-navbar px-4 py-3 backdrop-blur lg:hidden">
          <button
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-xl border border-border bg-card p-2 text-foreground"
          >
            <Icons.Menu className="h-5 w-5" />
          </button>
          <Brand appName={appName} roleLabel={roleLabel} subdomain={subdomain} />
          <div className="flex items-center gap-2">{themeToggle}</div>
        </header>

        {/* Desktop header */}
        <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-border bg-navbar px-6 py-3 backdrop-blur lg:flex">
          <h1 className="text-lg font-bold text-foreground">{appName}</h1>
          <div className="flex items-center gap-2">
            {themeToggle}
            {userMenu}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:pb-8 lg:pt-8">{children}</main>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-navbar backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-stretch">
            {bottomNav.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                  {navCount(navBadges, item.href) > 0 ? <NavBadge count={navCount(navBadges, item.href)} /> : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export { Icons };