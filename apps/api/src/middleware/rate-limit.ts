import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Test-only helper: clear in-memory rate limit buckets between suites. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Minimal in-memory rate limiter for auth endpoints (per IP). */
export function rateLimitAuth({ max = 10, windowMs = 60_000 } = {}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${req.ip ?? 'unknown'}:${req.originalUrl.split('?')[0]}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      _res.setHeader('Retry-After', String(retryAfter));
      const err = new Error(`Too many attempts. Try again in ${retryAfter}s.`);
      (err as Error & { statusCode?: number }).statusCode = 429;
      next(err);
      return;
    }
    next();
  };
}