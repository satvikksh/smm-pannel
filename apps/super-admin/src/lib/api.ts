/**
 * API origin used by the browser on every request.
 *
 * Production is deliberately same-origin: the panel calls `/api/v1/...` on its
 * own domain and `next.config.mjs` rewrites those paths to the API host.
 * Because `vercel.app` is a public suffix, the panel and the API live on
 * different *sites*; proxying API traffic through the panel origin keeps the
 * HttpOnly session cookies first-party, so browsers with third-party cookie
 * blocking (the Chrome/Safari default) still store and send them.
 *
 *   - Local development (`next dev`) uses `NEXT_PUBLIC_API_URL`, falling back
 *     to http://localhost:4000. `NEXT_PUBLIC_API_BASE_URL` is kept as a legacy
 *     alias.
 */

export const ROLE = 'super-admin';

const DEV_API_BASE = 'http://localhost:4000';

function apiBaseFromEnv(): string {
  if (process.env.NODE_ENV === 'production') return '';
  const fromEnv = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  return (fromEnv ?? DEV_API_BASE).replace(/\/+$/, '');
}

const API_BASE = apiBaseFromEnv();

/**
 * Resolve the API origin. An empty string means the current origin: production
 * requests go to `/api/v1/...` on the panel and are proxied by the rewrite in
 * `next.config.mjs`.
 */
export function getApiBase(): string {
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
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'request_failed',
      json?.error?.message ?? `Request failed (${res.status})`,
      json?.error?.details,
    );
  }
  return json?.data as T;
}