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
      '[user] NEXT_PUBLIC_API_URL is not configured. Set it in the User panel Vercel ' +
        'project environment (e.g. https://api.smmpanel.vercel.app).',
    );
  }
  return 'http://localhost:4000';
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBase();

export const ROLE = 'user';

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
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (res.status === 401 && retryOn401) {
    await fetch(`${API_BASE}/api/v1/auth/${ROLE}/refresh`, {
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
