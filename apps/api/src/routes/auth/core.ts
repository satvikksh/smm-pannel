import type { Request, Response } from 'express';
import { License, User, type LicenseRecord, type UserRecord } from '@smm/database';
import { verifyPassword } from '@smm/security';
import { ApiError, ROLES, type Role } from '@smm/types';
import {
  adminLicenseVerdict,
  assertAccountAccess,
  assertAdminSubdomainMatches,
  licenseError,
  assertUserCanAuthenticate,
  authorizeSession,
  ensureSuperAdminUser,
  isSuperAdminEmail,
  issueSession,
  refreshSession,
  requestedAdminSubdomain,
  resolveTenantAdminUser,
  revokeSession,
  verifySuperAdminCredentials,
  toSafeUser,
  toLicense,
  writeAuditLog,
  ipFrom,
} from '@smm/auth';

async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const user = await User.findOne({ email }).lean();
  return (user as UserRecord | null) ?? null;
}

/**
 * Validate an admin at sign-in and bind their tenant license to the account.
 * Fails closed with a specific, non-leaky message for every failure mode: no
 * license assigned, or a lapsed/suspended/revoked license. On success the
 * admin's `licenseId` is persisted so licensed routes unlock for the whole
 * session.
 *
 * The licenseKey is no longer typed by the admin: the license assigned to the
 * account (the tenant Main Admin's license) is detected directly from the
 * database. Sub Admins authenticate on their tenant's panel and inherit the
 * tenant license of their `parentAdminId`; the binding is copied onto the
 * signing-in account so `adminLicenseVerdict` holds for Sub Admins too.
 */
async function assertAdminLicenseAtLogin(
  user: UserRecord,
  requestedSubdomainSlug: string | null,
): Promise<LicenseRecord> {
  const tenantAdmin = await resolveTenantAdminUser(user);

  // The subdomain, when present, must belong to the tenant signing in.
  assertAdminSubdomainMatches(tenantAdmin, requestedSubdomainSlug);

  const license = await License.findOne({ adminUserId: tenantAdmin._id }).lean();
  if (!license) {
    throw ApiError.licenseInvalid('No license is assigned to this admin. Please contact the Super Admin.');
  }

  const err = licenseError(license);
  if (err) {
    throw ApiError.licenseInvalid(err.message);
  }

  if (!user.licenseId || String(user.licenseId) !== String(license._id)) {
    await User.updateOne({ _id: user._id }, { $set: { licenseId: license._id } });
  }
  user.licenseId = license._id;
  return license;
}

export async function doLogin(
  role: Role,
  body: { email: string; password: string },
  requestedSubdomainSlug: string | null = null,
): Promise<{
  user: UserRecord;
  license: LicenseRecord | null;
}> {
  const email = body.email.trim().toLowerCase();

  // The Super Admin portal authenticates against the server-side environment
  // only. No database user is required for the initial login: the identity is
  // created/reconciled from the environment when missing or changed.
  if (role === ROLES.SUPER_ADMIN) {
    if (!verifySuperAdminCredentials(body.email, body.password)) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    const user = await ensureSuperAdminUser();
    const license = await assertUserCanAuthenticate(user, role);
    return { user, license };
  }

  // Every other portal (Admin, User) must never accept the platform Super Admin
  // credentials, even if an account with the same email exists.
  if (isSuperAdminEmail(email)) {
    throw role === ROLES.ADMIN
      ? ApiError.forbidden('Only admin accounts can use this login.')
      : ApiError.unauthorized('Invalid email or password');
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const passwordOk = await verifyPassword(body.password, user.passwordHash);
  if (!passwordOk) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.role !== role) {
    throw role === ROLES.ADMIN
      ? ApiError.forbidden('Only admin accounts can use this login.')
      : ApiError.unauthorized('Invalid email or password');
  }

  // Blocks pending/rejected/suspended/inactive/deleted accounts with the exact
  // server message (a rejected admin is told the reason kept by the Super Admin).
  await assertAccountAccess(user, role);

  // The ADMIN portal requires a valid, active license assigned to the account.
  // No session is issued unless the tenant license is verified and bound. An
  // approved-but-unlicensed admin is told the license is missing and must be
  // issued by the Super Admin. The User portal has no license concept.
  if (role === ROLES.ADMIN) {
    const license = await assertAdminLicenseAtLogin(user, requestedSubdomainSlug);
    return { user, license };
  }
  return { user, license: null };
}

/**
 * Shape the login / session-restoration payload. `licenseValid` is computed from
 * the database on the server; the client only renders it.
 */
function sessionPayload(role: Role, user: UserRecord, license: LicenseRecord | null) {
  if (role !== ROLES.ADMIN) {
    return { user: toSafeUser(user), license: null, licenseValid: true, licenseReason: null };
  }
  const verdict = adminLicenseVerdict(user, license);
  return {
    user: toSafeUser(user),
    license: license ? toLicense(license) : null,
    licenseValid: verdict.valid,
    licenseReason: verdict.reason,
  };
}

export function meHandler(role: Role) {
  return async (req: Request, res: Response): Promise<void> => {
    const identity = await authorizeSession(req, role);
    res.json({ data: sessionPayload(role, identity.user, identity.license) });
  };
}

export function loginHandler(role: Role, auditAction?: string) {
  return async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { email: string; password: string };
    const { user, license } = await doLogin(role, body, requestedAdminSubdomain(req));
    await issueSession(user, role, res);
    if (auditAction) {
      await writeAuditLog({
        actorId: String(user._id),
        actorName: user.name,
        actorRole: role,
        action: auditAction,
        ip: ipFrom(req),
      });
    }
    res.json({ data: sessionPayload(role, user, license) });
  };
}

export function refreshHandler(role: Role) {
  return async (req: Request, res: Response): Promise<void> => {
    const user = await refreshSession(role, req, res);
    res.json({ data: { user: toSafeUser(user) } });
  };
}

export function logoutHandler(role: Role) {
  return async (req: Request, res: Response): Promise<void> => {
    await revokeSession(role, req, res);
    res.json({ data: { message: 'Signed out' } });
  };
}