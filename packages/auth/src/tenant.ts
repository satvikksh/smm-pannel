import { ApiError, hasAdminScope, type AdminScope } from '@smm/types';
import { User, type UserRecord } from '@smm/database';

/**
 * The Main Admin that owns the tenant a given account belongs to.
 *  - Main Admin (role=admin, no parent) → themselves.
 *  - Sub Admin (role=admin with parentAdminId) → their parent Main Admin.
 *  - User account → their `adminId` (the owning Main Admin), if set.
 */
export function tenantAdminIdOf(user: Pick<UserRecord, '_id' | 'parentAdminId' | 'adminId' | 'role'>): string | null {
  if (user.role === 'admin') {
    return user.parentAdminId ? String(user.parentAdminId) : String(user._id);
  }
  return user.adminId ? String(user.adminId) : null;
}

/** True when the account is a Sub Admin (admin role scoped under a Main Admin). */
export function isSubAdmin(user: Pick<UserRecord, 'role' | 'parentAdminId'>): boolean {
  return user.role === 'admin' && Boolean(user.parentAdminId);
}

/** Resolve the tenant's Main Admin user record (fetching the parent row for Sub Admins). */
export async function resolveTenantAdminUser(user: UserRecord): Promise<UserRecord> {
  if (!isSubAdmin(user)) return user;
  const parent = await User.findById(user.parentAdminId).lean();
  if (!parent || parent.role !== 'admin') {
    return user;
  }
  return (parent as UserRecord | null) ?? user;
}

/** Fails closed unless `user` is the tenant's Main Admin (not a Sub Admin). */
export function assertMainAdmin(user: Pick<UserRecord, 'role' | 'parentAdminId'>): void {
  if (isSubAdmin(user)) {
    throw ApiError.forbidden('Only the main admin can perform this action.');
  }
}

/**
 * Permission gate for Sub Admins. The Main Admin always passes; a Sub Admin
 * only passes when the requested `scope` is granted on their account.
 */
export function assertAdminScope(user: Pick<UserRecord, 'role' | 'parentAdminId' | 'adminScopes'>, scope: AdminScope): void {
  if (isSubAdmin(user)) {
    if (!hasAdminScope(user.adminScopes, scope)) {
      throw ApiError.forbidden('This account is not allowed to perform this action.');
    }
  }
}