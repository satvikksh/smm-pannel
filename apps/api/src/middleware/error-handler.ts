import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ApiError } from '@smm/types';

function zodDetails(err: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? 'body');
    const list = details[key] ?? (details[key] = []);
    list.push(issue.message);
  }
  return details;
}

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: zodDetails(err),
      },
    });
    return;
  }

  if (err instanceof MongoServerError && err.code === 11000) {
    const target = Object.keys(err.keyPattern ?? {}).join(', ');
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: `An account or license with this information already exists (${target}).`,
      },
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: `Invalid identifier: ${err.value}` },
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [key, e] of Object.entries(err.errors)) {
      details[key] = [e.message];
    }
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
    });
    return;
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    (err as { statusCode?: number }).statusCode === 429
  ) {
    const message = err instanceof Error ? err.message : 'Too many attempts. Please try again later.';
    res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    return;
  }

  console.error(`[api] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Server error. Please try again.' },
  });
}