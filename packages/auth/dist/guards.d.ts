import type { NextFunction, Request, Response } from 'express';
import { type Role } from '@smm/types';
/**
 * Guard factory. `role` is the ONLY role permitted on the guarded route group.
 * The role is validated against the database; nothing is trusted from the client.
 *
 * For `admin` this also fails closed when the license is missing / expired /
 * suspended / revoked, so every protected admin route is licensed server-side.
 */
export declare function requireRole(role: Role): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Session-only guard: authenticates the role and account but does NOT require a
 * valid license. Used exclusively for the license status/activation routes so an
 * admin can recover access without a licensed session.
 */
export declare function requireRoleSession(role: Role): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function requireSuperAdmin(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function requireAdmin(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function requireUser(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Guard that accepts ANY of the given roles. Used where multiple roles share
 * management rights (e.g. the global User Panel theme can be changed by a
 * Super Admin or an Admin). Identity is still validated against the database.
 */
export declare function requireAnyRole(roles: Role[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** Admin session without a license requirement (status/activation routes). */
export declare function requireAdminSession(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** Ensures the request is super-admin; used on the super admin root router. */
export declare function assertUserRole(user: {
    role: Role;
}, role: Role): Promise<void>;
