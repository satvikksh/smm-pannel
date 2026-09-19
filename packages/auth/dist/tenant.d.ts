import { type AdminScope } from '@smm/types';
import { type UserRecord } from '@smm/database';
/**
 * The Main Admin that owns the tenant a given account belongs to.
 *  - Main Admin (role=admin, no parent) → themselves.
 *  - Sub Admin (role=admin with parentAdminId) → their parent Main Admin.
 *  - User account → their `adminId` (the owning Main Admin), if set.
 */
export declare function tenantAdminIdOf(user: Pick<UserRecord, '_id' | 'parentAdminId' | 'adminId' | 'role'>): string | null;
/** True when the account is a Sub Admin (admin role scoped under a Main Admin). */
export declare function isSubAdmin(user: Pick<UserRecord, 'role' | 'parentAdminId'>): boolean;
/** Resolve the tenant's Main Admin user record (fetching the parent row for Sub Admins). */
export declare function resolveTenantAdminUser(user: UserRecord): Promise<UserRecord>;
/** Fails closed unless `user` is the tenant's Main Admin (not a Sub Admin). */
export declare function assertMainAdmin(user: Pick<UserRecord, 'role' | 'parentAdminId'>): void;
/**
 * Permission gate for Sub Admins. The Main Admin always passes; a Sub Admin
 * only passes when the requested `scope` is granted on their account.
 */
export declare function assertAdminScope(user: Pick<UserRecord, 'role' | 'parentAdminId' | 'adminScopes'>, scope: AdminScope): void;
