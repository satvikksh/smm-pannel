import type { AuthSessionState, LicenseState } from '@smm/types';
import { currentSubdomainSlug } from './subdomain';

/**
 * API origin used by the browser on every request. Intended to be set via
 * `NEXT_PUBLIC_API_URL` (e.g. `https://api.smmpanel.vercel.app`, or
 * `http://localhost:4000` in local dev). `NEXT_PUBLIC_API_BASE_URL` is kept as
 * a legacy alias. A production build without the API URL fails loudly instead
 * of silently dialing localhost.
 */
function defaultApiBase(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[admin] NEXT_PUBLIC_API_URL is not configured. Set it in the Admin panel Vercel ' +
        'project environment (e.g. https://api.smmpanel.vercel.app).',
    );
  }
  return 'http://localhost:4000';
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBase();

export const ROLE = 'admin';

export type { AuthSessionState, LicenseState };

export const LICENSE_PATH = '/login';

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
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (res.status === 401 && retryOn401) {
    await fetch(`${API_BASE}/api/v1/auth/${ROLE}/refresh`, {
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