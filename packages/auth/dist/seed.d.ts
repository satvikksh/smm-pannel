import { type UserRecord } from '@smm/database';
/**
 * Ensure a database identity exists for the configured Super Admin and that it
 * is reconciled with the environment (the single source of truth).
 *
 * - Login does NOT require a pre-existing Super Admin row: it is created from
 *   the environment on first use.
 * - If the environment email/password changes, the stored identity is updated
 *   so sessions, audit logs and refresh-token lookups keep working.
 * - The plaintext password is never logged or returned.
 */
export declare function ensureSuperAdminUser(email?: string, password?: string): Promise<UserRecord>;
/**
 * Idempotent boot-time seed. Reads the ROOT environment credentials, hashes the
 * password, and creates/reconciles the Super Admin without ever printing it.
 */
export declare function seedSuperAdmin(superAdminEmail: string, superAdminPassword: string): Promise<void>;
