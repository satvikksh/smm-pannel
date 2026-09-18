import type { AuthSessionState, LicenseState } from '@smm/types';
import { currentSubdomainSlug } from './subdomain';

/**
 * API origin used by the browser on every request, resolved from
 * `NEXT_PUBLIC_API_URL` (e.g. `https://smm-pannel-api.vercel.app` in production,
 * `http://localhost:4000` in local dev). `NEXT_PUBLIC_API_BASE_URL` is kept as
 * a legacy alias.
 *
 * Resolution is deliberately lazy:
 *
 *   - The value is only read at the moment a request is actually made from a
 *     client effect / event handler — never during static prerendering — so a
 *     production build succeeds even before the environment variable is wired
 *     into the Vercel project.
 *   - A production request made without a configured URL fails loudly with
 *     installation instructions instead of silently dialing localhost.
 *   - Local development (`next dev`) falls back to http://localhost:4000.
 */

export const ROLE = 'admin';

export type { AuthSessionState, LicenseState };

export const LICENSE_PATH = '/login';

const DEV_API_BASE = 'http://localhost:4000';

function apiBaseFromEnv(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') return '';
  return DEV_API_BASE;
}

/** Exported for server components (e.g. the theme provider's apiBase prop). */
export const API_BASE = apiBaseFromEnv();

/** Resolve the configured API origin, failing loudly when one is missing. */
export function getApiBase(): string {
  if (!API_BASE) {
    throw new Error(
      '[admin] NEXT_PUBLIC_API_URL is not configured.\n' +
        'Add it to the Admin panel Vercel project (Vercel → Admin project → ' +
        'Settings → Environment Variables):\n' +
        'NEXT_PUBLIC_API_URL=https://smm-pannel-api.vercel.app',
    );
  }
  return API_BASE;
}

interface ErrorEnvelope {
  code?: string;
  message?: string;
  details?: unknown;
}

interface SuccessEnvelope<T> {
  data?: T;
  error?: ErrorEnvelope;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path: string, init: RequestInit, retryOn401: boolean): Promise<Response> {
  const base = getApiBase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  // Tell the API which tenant subdomain this panel is served from, so it can
  // reject a session that does not own the panel. Absent on apex/localhost.
  const subdomain = currentSubdomainSlug();
  if (subdomain && !headers.has('x-admin-subdomain')) {
    headers.set('x-admin-subdomain', subdomain);
  }
  const method = init.method ?? 'GET';
  const url = `${base}/api/v1${path}`;
  // Safe diagnostic: the API base is non-secret public configuration, and only
  // the method / path / status are logged — never credentials, cookies or tokens.
  console.debug(`[api] ${method} ${url}`);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    console.debug(`[api] ${method} ${url} -> network/cors failure`);
    throw err;
  }
  console.debug(`[api] ${method} ${url} -> ${res.status} ${res.statusText}`);
  if (res.status === 401 && retryOn401) {
    await fetch(`${base}/api/v1/auth/${ROLE}/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: subdomain ? { 'x-admin-subdomain': subdomain } : undefined,
    }).catch(() => undefined);
    return request(path, init, false);
  }
  return res;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await request(path, init, true);
  const text = await res.text().catch(() => '');
  let json: SuccessEnvelope<T> | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as SuccessEnvelope<T>;
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    const code = json?.error?.code ?? 'request_failed';
    // A protected call rejected for licensing means the license lapsed while
    // signed in. Bounce back to the login page with the server-provided reason
    // (but never for the license/auth endpoints themselves, which surface the
    // error inline).
    if (
      res.status === 403 &&
      code === 'LICENSE_INVALID' &&
      !path.startsWith('/admin/license') &&
      !path.startsWith('/auth/') &&
      typeof window !== 'undefined'
    ) {
      const message = json?.error?.message ?? 'Your license is no longer valid.';
      window.location.replace(`${LICENSE_PATH}?licenseError=${encodeURIComponent(message)}`);
    }
    throw new ApiError(
      res.status,
      code,
      json?.error?.message ?? `Request failed (${res.status})`,
      json?.error?.details,
    );
  }
  return json?.data as T;
}