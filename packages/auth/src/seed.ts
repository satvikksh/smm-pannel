import { getEnvironment } from '@smm/config';
import { User, Wallet, type UserRecord } from '@smm/database';
import { hashPassword, verifyPassword } from '@smm/security';
import { ROLES, ApiError } from '@smm/types';

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
export async function ensureSuperAdminUser(
  email: string = getEnvironment().superAdminEmail,
  password: string = getEnvironment().superAdminPassword,
): Promise<UserRecord> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw ApiError.badRequest('Unable to determine Super Admin credentials from environment.');
  }

  const existing = (await User.findOne({ role: ROLES.SUPER_ADMIN }).lean()) as UserRecord | null;

  if (!existing) {
    const passwordHash = await hashPassword(password);
    const created = new User({
      name: 'Super Admin',
      email: normalizedEmail,
      phone: '+0000000000',
      passwordHash,
      role: ROLES.SUPER_ADMIN,
      status: 'active',
    });
    await created.save();

    await Wallet.updateOne(
      { userId: created._id },
      { $setOnInsert: { userId: created._id, balance: 0, totalDeposited: 0, totalSpent: 0 } },
      { upsert: true },
    );

    return created.toObject() as UserRecord;
  }

  const patch: Partial<Pick<UserRecord, 'email' | 'passwordHash' | 'status'>> = {};
  if (existing.email !== normalizedEmail) {
    patch.email = normalizedEmail;
  }
  if (!(await verifyPassword(password, existing.passwordHash))) {
    patch.passwordHash = await hashPassword(password);
  }
  if (existing.status !== 'active') {
    patch.status = 'active';
  }

  if (Object.keys(patch).length > 0) {
    await User.updateOne({ _id: existing._id }, { $set: patch });
    Object.assign(existing, patch);
  }

  return existing;
}

/**
 * Idempotent boot-time seed. Reads the ROOT environment credentials, hashes the
 * password, and creates/reconciles the Super Admin without ever printing it.
 */
export async function seedSuperAdmin(superAdminEmail: string, superAdminPassword: string): Promise<void> {
  await ensureSuperAdminUser(superAdminEmail, superAdminPassword);
}
