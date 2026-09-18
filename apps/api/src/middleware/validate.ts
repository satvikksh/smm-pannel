import type { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { ApiError } from '@smm/types';

/** Validate the JSON body against a zod schema; assigns the parsed result back to req.body. */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'body');
        const list = details[key] ?? (details[key] = []);
        list.push(issue.message);
      }
      next(ApiError.validation('Validation failed', details));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

/** Validate query parameters; assigns the parsed result via res.locals.query. */
export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'query');
        const list = details[key] ?? (details[key] = []);
        list.push(issue.message);
      }
      next(ApiError.validation('Invalid query parameters', details));
      return;
    }
    res.locals.query = parsed.data;
    next();
  };
}