/* eslint-disable no-console */
import { getEnvironment } from '@smm/config';
import { seedSuperAdmin as seed } from '@smm/auth';

/**
 * Required by spec §23: apps/api/src/seed/super-admin.ts
 * - reads SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD from the ROOT env
 * - hashes the password
 * - creates the Super Admin only if missing (idempotent)
 * - never prints or exposes the password
 */
export async function seedSuperAdmin(): Promise<void> {
  const env = getEnvironment();
  await seed(env.superAdminEmail, env.superAdminPassword);
  console.info(`[seed] Super Admin ready (${env.superAdminEmail}) — duplicate creation skipped when present.`);
}