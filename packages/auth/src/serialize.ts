import type { Types } from 'mongoose';
import type { LicenseRecord, UserRecord } from '@smm/database';
import type {
  AccountStatus,
  License,
  LicenseStatus,
  SafeUser,
  SubdomainStatus,
} from '@smm/types';

export function toSafeUser(u: UserRecord): SafeUser {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    licenseId: u.licenseId ? String(u.licenseId) : null,
    subdomainSlug: u.subdomainSlug ?? null,
    subdomain: u.subdomain ?? null,
    subdomainStatus: u.subdomainStatus ?? null,
    subdomainCreatedAt: u.subdomainCreatedAt ? u.subdomainCreatedAt.toISOString() : null,
    adminId: u.adminId ? String(u.adminId) : null,
    assignedTo: u.assignedTo ? String(u.assignedTo) : null,
    parentAdminId: u.parentAdminId ? String(u.parentAdminId) : null,
    adminScopes: u.adminScopes ?? [],
    googleId: u.googleId ?? null,
    authProvider: u.authProvider ?? 'local',
    profileImage: u.profileImage ?? null,
    emailVerified: u.emailVerified ?? false,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export interface LicenseAdminSubdomain {
  subdomainSlug?: string | null;
  subdomain?: string | null;
  subdomainStatus?: SubdomainStatus | null;
}

export function toLicense(
  l: LicenseRecord,
  adminName?: string,
  adminEmail?: string,
  adminSubdomain?: LicenseAdminSubdomain,
): License {
  return {
    id: String(l._id),
    licenseKey: l.licenseKey,
    adminUserId: String(l.adminUserId),
    adminUserName: adminName,
    adminUserEmail: adminEmail,
    adminSubdomainSlug: adminSubdomain?.subdomainSlug ?? null,
    adminSubdomain: adminSubdomain?.subdomain ?? null,
    adminSubdomainStatus: adminSubdomain?.subdomainStatus ?? null,
    status: l.status,
    issuedAt: l.issuedAt.toISOString(),
    expiresAt: l.expiresAt.toISOString(),
    maxUsers: l.maxUsers,
    metadata: l.metadata,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

/**
 * Reject a license whose state forbids Admin access. Fails closed: anything
 * that is not an approved, unexpired `active` license is treated as invalid.
 */
export function licenseError(license: LicenseRecord): { status: LicenseStatus; message: string } | null {
  if (license.status === 'revoked') {
    return { status: 'revoked', message: 'License has been revoked.' };
  }
  if (license.status === 'suspended') {
    return { status: 'suspended', message: 'License is suspended.' };
  }
  if (license.status === 'expired') {
    return { status: 'expired', message: 'License has expired.' };
  }
  if (license.status !== 'active') {
    return { status: license.status, message: 'License is not active.' };
  }
  if (license.expiresAt.getTime() <= Date.now()) {
    return { status: 'expired', message: 'License has expired.' };
  }
  return null;
}

/** Server-side verdict describing whether an admin may access licensed pages. */
export function licenseState(license: LicenseRecord | null): {
  valid: boolean;
  status: LicenseStatus | 'missing';
  reason: string | null;
} {
  if (!license) {
    return { valid: false, status: 'missing', reason: 'No license is assigned to this account.' };
  }
  const err = licenseError(license);
  return { valid: !err, status: license.status, reason: err?.message ?? null };
}

/**
 * Full admin license verdict including the activation binding. A license only
 * unlocks an admin once BOTH hold:
 *   1. the license is assigned to that admin (`adminUserId`), and
 *   2. the admin has activated it on their account (`user.licenseId` matches).
 * The binding is held in the database, so it survives refreshes/restarts and is
 * never trusted from the client.
 */
export function adminLicenseVerdict(
  user: Pick<UserRecord, 'licenseId'>,
  license: LicenseRecord | null,
): { valid: boolean; reason: string | null } {
  if (!license) {
    return { valid: false, reason: 'No license is assigned to this account.' };
  }
  if (!user.licenseId || String(user.licenseId) !== String(license._id)) {
    return {
      valid: false,
      reason: 'Your license has not been activated on this account yet. Enter your license key to activate it.',
    };
  }
  const err = licenseError(license);
  return { valid: !err, reason: err?.message ?? null };
}

export function accountError(status: AccountStatus): string | null {
  if (status === 'suspended') return 'This account is suspended.';
  if (status === 'inactive') return 'This account is not active yet.';
  if (status === 'deleted') return 'This account no longer exists.';
  return null;
}

export function objectIdEquals(a: Types.ObjectId, b: string): boolean {
  return String(a) === b;
}