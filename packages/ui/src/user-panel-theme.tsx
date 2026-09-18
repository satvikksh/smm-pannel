'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type PanelTheme = 'modern-light' | 'modern-dark' | 'premium-gradient';

const VALID_THEMES: readonly PanelTheme[] = ['modern-light', 'modern-dark', 'premium-gradient'];

export const DEFAULT_PANEL_THEME: PanelTheme = 'modern-light';

export function isPanelTheme(value: unknown): value is PanelTheme {
  return typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);
}

export function isThemeDark(theme: PanelTheme): boolean {
  return theme === 'modern-dark';
}

export function applyThemeToElement(theme: PanelTheme, attribute: string): void {
  const root = document.documentElement;
  root.setAttribute(attribute, theme);
  root.classList.toggle('dark', isThemeDark(theme));
}

function saveTheme(theme: PanelTheme, storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // storage unavailable — theme still applies for this session
  }
}

export interface PanelThemeContextValue {
  theme: PanelTheme;
  setTheme: (theme: PanelTheme) => void;
  reload: () => Promise<PanelTheme>;
}

/* -------------------------------------------------------------------------- */
/*  User Panel (web) — authenticated `/api/v1/user/theme`                      */
/* -------------------------------------------------------------------------- */

const USER_ATTRIBUTE = 'data-user-theme';
const USER_STORAGE_KEY = 'smm-user-panel-theme';

export async function fetchUserPanelTheme(apiBase: string): Promise<PanelTheme> {
  try {
    const res = await fetch(`${apiBase}/api/v1/user/theme`, { cache: 'no-store', credentials: 'omit' });
    if (!res.ok) return DEFAULT_PANEL_THEME;
    const body = (await res.json()) as { data?: { theme?: unknown } };
    const theme = body?.data?.theme;
    return isPanelTheme(theme) ? theme : DEFAULT_PANEL_THEME;
  } catch {
    return DEFAULT_PANEL_THEME;
  }
}

export function applyUserPanelTheme(theme: PanelTheme): void {
  applyThemeToElement(theme, USER_ATTRIBUTE);
  saveTheme(theme, USER_STORAGE_KEY);
}

const UserPanelCtx = createContext<PanelThemeContextValue | null>(null);

export function UserPanelThemeProvider({
  apiBase,
  children,
}: {
  apiBase: string;
  children: ReactNode;
}) {
  const apiBaseRef = useRef(apiBase);
  apiBaseRef.current = apiBase;
  const [theme, setThemeState] = useState<PanelTheme>(DEFAULT_PANEL_THEME);

  const apply = useCallback((next: PanelTheme) => {
    applyThemeToElement(next, USER_ATTRIBUTE);
    saveTheme(next, USER_STORAGE_KEY);
    setThemeState(next);
  }, []);

  const reload = useCallback(async (): Promise<PanelTheme> => {
    const next = await fetchUserPanelTheme(apiBaseRef.current);
    apply(next);
    return next;
  }, [apply]);

  const setTheme = useCallback((next: PanelTheme) => {
    if (!isPanelTheme(next)) return;
    apply(next);
  }, [apply]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    window.addEventListener('focus', onVisibility);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onVisibility);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reload]);

  return (
    <UserPanelCtx.Provider value={{ theme, setTheme, reload }}>
      {children}
    </UserPanelCtx.Provider>
  );
}

export function useUserPanelTheme(): PanelThemeContextValue {
  const ctx = useContext(UserPanelCtx);
  if (!ctx) throw new Error('useUserPanelTheme must be used within <UserPanelThemeProvider>');
  return ctx;
}

/**
 * Inline script injected into <head> that applies the stored theme before
 * first paint (defaults to Modern Light when nothing is stored yet), so
 * there is no flash of the wrong theme.
 */
export function UserPanelThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('${USER_STORAGE_KEY}');var root=document.documentElement;function valid(v){return v==='modern-light'||v==='modern-dark'||v==='premium-gradient';}if(!valid(t))t=${JSON.stringify(
      DEFAULT_PANEL_THEME,
    )};root.setAttribute('${USER_ATTRIBUTE}',t);root.classList.toggle('dark',t==='modern-dark');}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

/* -------------------------------------------------------------------------- */
/*  Admin Panel — DB-driven via `/api/v1/admin/theme`                          */
/* -------------------------------------------------------------------------- */

const ADMIN_ATTRIBUTE = 'data-admin-theme';
const ADMIN_STORAGE_KEY = 'smm-admin-panel-theme';

async function fetchAdminPanelTheme(apiBase: string, requestInit?: RequestInit): Promise<PanelTheme> {
  try {
    const res = await fetch(`${apiBase}/api/v1/admin/theme`, {
      cache: 'no-store',
      credentials: 'include',
      ...requestInit,
    });
    if (!res.ok) return DEFAULT_PANEL_THEME;
    const body = (await res.json()) as { data?: { theme?: unknown } };
    const theme = body?.data?.theme;
    return isPanelTheme(theme) ? theme : DEFAULT_PANEL_THEME;
  } catch {
    return DEFAULT_PANEL_THEME;
  }
}

export function applyAdminPanelTheme(theme: PanelTheme): void {
  applyThemeToElement(theme, ADMIN_ATTRIBUTE);
  saveTheme(theme, ADMIN_STORAGE_KEY);
}

const AdminPanelCtx = createContext<PanelThemeContextValue | null>(null);

/**
 * DB-driven provider for the Admin Panel. The theme is the Main Admin's
 * `AdminThemeSettings.theme`, managed by the Super Admin. The toggle is
 * removed; the provider reads the server value on mount and on refocus.
 */
export function AdminPanelThemeProvider({
  apiBase,
  children,
  requestInit,
}: {
  apiBase: string;
  children: ReactNode;
  requestInit?: RequestInit;
}) {
  const apiBaseRef = useRef(apiBase);
  apiBaseRef.current = apiBase;
  const requestInitRef = useRef(requestInit);
  requestInitRef.current = requestInit;
  const [theme, setThemeState] = useState<PanelTheme>(DEFAULT_PANEL_THEME);

  const apply = useCallback((next: PanelTheme) => {
    applyThemeToElement(next, ADMIN_ATTRIBUTE);
    saveTheme(next, ADMIN_STORAGE_KEY);
    setThemeState(next);
  }, []);

  const reload = useCallback(async (): Promise<PanelTheme> => {
    const next = await fetchAdminPanelTheme(apiBaseRef.current, requestInitRef.current);
    apply(next);
    return next;
  }, [apply]);

  const setTheme = useCallback((next: PanelTheme) => {
    if (!isPanelTheme(next)) return;
    apply(next);
  }, [apply]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    window.addEventListener('focus', onVisibility);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onVisibility);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reload]);

  return (
    <AdminPanelCtx.Provider value={{ theme, setTheme, reload }}>
      {children}
    </AdminPanelCtx.Provider>
  );
}

export function useAdminPanelTheme(): PanelThemeContextValue {
  const ctx = useContext(AdminPanelCtx);
  if (!ctx) throw new Error('useAdminPanelTheme must be used within <AdminPanelThemeProvider>');
  return ctx;
}

/**
 * Inline script injected in <head> that applies the stored Admin Panel theme
 * before first paint. The DB value always wins (via provider on mount); this
 * script prevents an FOUC of the wrong color scheme.
 */
export function AdminPanelThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('${ADMIN_STORAGE_KEY}');var root=document.documentElement;function valid(v){return v==='modern-light'||v==='modern-dark'||v==='premium-gradient';}if(!valid(t))t=${JSON.stringify(
      DEFAULT_PANEL_THEME,
    )};root.setAttribute('${ADMIN_ATTRIBUTE}',t);root.classList.toggle('dark',t==='modern-dark');}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}