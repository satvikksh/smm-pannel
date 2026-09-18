const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export const ROLE = 'super-admin';

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