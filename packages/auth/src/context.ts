import type { Request } from 'express';
import type { LicenseRecord, UserRecord } from '@smm/database';
import type { Role } from '@smm/types';

export interface AuthContext {
  user: UserRecord;
  role: Role;
  license: LicenseRecord | null;
}

export interface AuthedRequest extends Request {
  ctx: AuthContext;
}

declare global {
  namespace Express {
    interface Request {
      ctx: AuthContext;
    }
  }
}

export type { Request };

export function ipFrom(req: Request): string {
  const raw = req.headers['x-forwarded-for'];
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split(',')[0]?.trim() ?? '';
  }
  return req.ip ?? req.socket?.remoteAddress ?? '';
}