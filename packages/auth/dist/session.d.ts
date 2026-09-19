import type { Response, Request } from 'express';
import { getEnvironment } from '@smm/config';
import { type LicenseRecord, type UserRecord } from '@smm/database';
import { type Role } from '@smm/types';
import { accountError, licenseError, toSafeUser } from './serialize';
export type Env = ReturnType<typeof getEnvironment>;
/**
 * Load the license governing an admin's access. Sub Admins inherit the license
 * of their tenant's Main Admin (`parentAdminId`), so a Sub Admin never needs a
 * license of their own. The binding check still happens against the caller's
 * `user.licenseId`, which the login flow sets to the shared license.
 */
export declare function loadLicenseForAdmin(user: Pick<UserRecord, '_id' | 'parentAdminId'>): Promise<LicenseRecord | null>;
export declare function clearSessionCookies(res: Response, role: Role, env: Env): void;
/**
 * The admin panel forwards the subdomain it is being served from (e.g.
 * `ram-kumar`) via `x-admin-subdomain`. Present only for real subdomain hosts;
 * apex/localhost dev access sends nothing.
 */
export declare function requestedAdminSubdomain(req: Request): string | null;
/** Issue a full session (access + refresh cookies) for `user` on the role scope. */
export declare function issueSession(user: UserRecord, role: Role, res: Response): Promise<void>;
/**
 * Validate that an account may use a portal right now (status + role only).
 * License is deliberately NOT checked here: an admin must be able to hold a
 * session in order to activate/renew a license on the /license page.
 */
export declare function assertAccountAccess(user: UserRecord, role: Role): Promise<void>;
/**
 * Validate that an account may authenticate AND is licensed (status + role +
 * license). Used on flows that must be fully licensed before proceeding.
 */
export declare function assertUserCanAuthenticate(user: UserRecord, role: Role): Promise<LicenseRecord | null>;
/**
 * Rotate the refresh token and issue a fresh session. Returns the user.
 * Also performs account + license validation on every refresh.
 */
export declare function refreshSession(role: Role, req: Request, res: Response): Promise<UserRecord>;
/**
 * Resolve the current authenticated account for a role, or null. Resolves the
 * session and account status only — the license (which may be missing or
 * invalid) is returned so callers can render the correct state.
 */
export declare function resolveSessionUser(role: Role, req: Request): Promise<{
    user: UserRecord;
    license: LicenseRecord | null;
} | null>;
/** Clear cookies + revoke the DB session if a refresh token is present. */
export declare function revokeSession(role: Role, req: Request, res: Response): Promise<void>;
export interface AuthorizedIdentity {
    user: UserRecord;
    license: LicenseRecord | null;
}
/**
 * Session-only per-request authorization: valid access token -> DB user ->
 * role -> account status. The license is loaded but NOT enforced, so this is
 * safe for license activation/status routes. Throws ApiError on every failure.
 */
export declare function authorizeSession(req: Request, role: Role): Promise<AuthorizedIdentity>;
/**
 * Full per-request authorization for licensed portals: session checks plus a
 * mandatory, fail-closed license check. This is what protects admin data.
 */
export declare function authorize(req: Request, role: Role): Promise<AuthorizedIdentity>;
export declare function toEnv(): Env;
export { toSafeUser, accountError, licenseError };
