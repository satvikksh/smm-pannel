import type { NextFunction, Request, Response } from 'express';
import { ApiError, type Role } from '@smm/types';
import { authorize, authorizeSession } from './session';

/**
 * Guard factory. `role` is the ONLY role permitted on the guarded route group.
 * The role is validated against the database; nothing is trusted from the client.
 *
 * For `admin` this also fails closed when the license is missing / expired /
 * suspended / revoked, so every protected admin route is licensed server-side.
 */
export function requireRole(role: Role) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identity = await authorize(req, role);
      req.ctx = { user: identity.user, role, license: identity.license };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Session-only guard: authenticates the role and account but does NOT require a
 * valid license. Used exclusively for the license status/activation routes so an
 * admin can recover access without a licensed session.
 */
export function requireRoleSession(role: Role) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identity = await authorizeSession(req, role);
      req.ctx = { user: identity.user, role, license: identity.license };
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireSuperAdmin() {
  return requireRole('super_admin');
}
export function requireAdmin() {
  return requireRole('admin');
}
export function requireUser() {
  return requireRole('user');
}

/**
 * Guard that accepts ANY of the given roles. Used where multiple roles share
 * management rights (e.g. the global User Panel theme can be changed by a
 * Super Admin or an Admin). Identity is still validated against the database.
 */
export function requireAnyRole(roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let lastError: unknown = ApiError.forbidden(
        'This account is not allowed to perform this action.',
      );
      for (const role of roles) {
        try {
          const identity = await authorize(req, role);
          req.ctx = { user: identity.user, role, license: identity.license };
          next();
          return;
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError;
    } catch (err) {
      next(err);
    }
  };
}

/** Admin session without a license requirement (status/activation routes). */
export function requireAdminSession() {
  return requireRoleSession('admin');
}

/** Ensures the request is super-admin; used on the super admin root router. */
export async function assertUserRole(user: { role: Role }, role: Role): Promise<void> {
  if (user.role !== role) {
    throw ApiError.forbidden('This account is not allowed to perform this action.');
  }
}