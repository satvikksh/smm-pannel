import type { Role } from '@smm/types';

/** Cookie names are role-scoped so each application owns its own session. */
export const COOKIE_NAMES: Record<Role, { access: string; refresh: string }> = {
  super_admin: { access: 'smm_sa_access', refresh: 'smm_sa_refresh' },
  admin: { access: 'smm_ad_access', refresh: 'smm_ad_refresh' },
  user: { access: 'smm_us_access', refresh: 'smm_us_refresh' },
};

export function cookieNamesFor(role: Role): { access: string; refresh: string } {
  return COOKIE_NAMES[role];
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  domain?: string;
}

export function buildCookieOptions(env: { nodeEnv: string; apiBaseUrl: string }): CookieOptions {
  const secure = env.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };
}

export const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes