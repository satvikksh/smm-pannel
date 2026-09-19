import type { Types } from 'mongoose';
import type { LicenseRecord, UserRecord } from '@smm/database';
import type { AccountStatus, License, LicenseStatus, SafeUser, SubdomainStatus } from '@smm/types';
export declare function toSafeUser(u: UserRecord): SafeUser;
export interface LicenseAdminSubdomain {
    subdomainSlug?: string | null;
    subdomain?: string | null;
    subdomainStatus?: SubdomainStatus | null;
}
export declare function toLicense(l: LicenseRecord, adminName?: string, adminEmail?: string, adminSubdomain?: LicenseAdminSubdomain): License;
/**
 * Reject a license whose state forbids Admin access. Fails closed: anything
 * that is not an approved, unexpired `active` license is treated as invalid.
 */
export declare function licenseError(license: LicenseRecord): {
    status: LicenseStatus;
    message: string;
} | null;
/** Server-side verdict describing whether an admin may access licensed pages. */
export declare function licenseState(license: LicenseRecord | null): {
    valid: boolean;
    status: LicenseStatus | 'missing';
    reason: string | null;
};
/**
 * Full admin license verdict including the activation binding. A license only
 * unlocks an admin once BOTH hold:
 *   1. the license is assigned to that admin (`adminUserId`), and
 *   2. the admin has activated it on their account (`user.licenseId` matches).
 * The binding is held in the database, so it survives refreshes/restarts and is
 * never trusted from the client.
 */
export declare function adminLicenseVerdict(user: Pick<UserRecord, 'licenseId'>, license: LicenseRecord | null): {
    valid: boolean;
    reason: string | null;
};
export declare function accountError(status: AccountStatus): string | null;
export declare function objectIdEquals(a: Types.ObjectId, b: string): boolean;
