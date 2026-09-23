import type { Response, Request } from 'express';
import { getEnvironment } from '@smm/config';
import { License, Session, User, type LicenseRecord, type UserRecord } from '@smm/database';
import {
  buildCookieOptions,
  cookieNamesFor,
  generateOpaqueToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from '@smm/security';
import { ApiError, type Role } from '@smm/types';
import { accountError, adminLicenseVerdict, licenseError, toSafeUser } from './serialize';
import { assertAdminSubdomainMatches } from './subdomain';
import { resolveTenantAdminUser, tenantAdminIdOf } from './tenant';

export type Env = ReturnType<typeof getEnvironment>;

function cookieOptions(env: Env) {
  return buildCookieOptions({ nodeEnv: env.nodeEnv, apiBaseUrl: env.apiBaseUrl });
}

/**
 * Load the license governing an admin's access. Sub Admins inherit the license
 * of their tenant's Main Admin (`parentAdminId`), so a Sub Admin never needs a
 * license of their own. The binding check still happens against the caller's
 * `user.licenseId`, which the login flow sets to the shared license.
 */
export async function loadLicenseForAdmin(user: Pick<UserRecord, '_id' | 'parentAdminId'>): Promise<LicenseRecord | null> {
  const tenantAdminId = tenantAdminIdOf({ ...user, role: 'admin' });
  if (!tenantAdminId) return null;
  return License.findOne({ adminUserId: tenantAdminId }).lean();
}

function setSessionCookies(
  res: Response,
  role: Role,
  accessToken: string,
  refreshToken: string,
  env: Env,
): void {
  const names = cookieNamesFor(role);
  const opts = cookieOptions(env);
  res.cookie(names.access, accessToken, { ...opts, maxAge: 15 * 60 * 1000 });
  res.cookie(names.refresh, refreshToken, {
    ...opts,
    maxAge: env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookies(res: Response, role: Role, env: Env): void {
  const names = cookieNamesFor(role);
  const opts = cookieOptions(env);
  res.clearCookie(names.access, opts);
  res.clearCookie(names.refresh, opts);
}

interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

async function createTokens(user: UserRecord, role: Role, env: Env): Promise<TokenBundle> {
  const refreshToken = generateOpaqueToken(48);
  const expiresAt = new Date(Date.now() + env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000);
  const session = await Session.create({
    tokenHash: hashToken(refreshToken),
    userId: user._id,
    role,
    expiresAt,
  });
  const accessToken = signAccessToken({
    sub: String(user._id),
    role,
    jti: String(session._id),
    secret: env.jwtAccessSecret,
    expiresIn: env.jwtAccessTtl,
  });
  return { accessToken, refreshToken, sessionId: String(session._id) };
}

async function findUserById(userId: string): Promise<UserRecord | null> {
  const user = await User.findById(userId).lean();
  return (user as UserRecord | null) ?? null;
}

function readRefreshCookie(req: Request, role: Role): string | undefined {
  const names = cookieNamesFor(role);
  const cookies = req.cookies as Record<string, string | undefined>;
  return cookies[names.refresh];
}

function readAccessCookie(req: Request, role: Role): string | undefined {
  const names = cookieNamesFor(role);
  const cookies = req.cookies as Record<string, string | undefined>;
  return cookies[names.access];
}

/**
 * The admin panel forwards the subdomain it is being served from (e.g.
 * `ram-kumar`) via `x-admin-subdomain`. Present only for real subdomain hosts;
 * apex/localhost dev access sends nothing.
 */
export function requestedAdminSubdomain(req: Request): string | null {
  const raw = req.headers['x-admin-subdomain'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return trimmed.length > 0 ? trimmed : null;
}

/** Issue a full session (access + refresh cookies) for `user` on the role scope. */
export async function issueSession(user: UserRecord, role: Role, res: Response): Promise<void> {
  const env = toEnv();
  const { accessToken, refreshToken } = await createTokens(user, role, env);
  setSessionCookies(res, role, accessToken, refreshToken, env);
}

/**
 * Validate that an account may use a portal right now (status + role only).
 * License is deliberately NOT checked here: an admin must be able to hold a
 * session in order to activate/renew a license on the /license page.
 */
export async function assertAccountAccess(user: UserRecord, role: Role): Promise<void> {
  const blocked = accountError(user.status, user.rejectionReason);
  if (blocked) throw ApiError.forbidden(blocked);
  if (user.role !== role) {
    throw ApiError.forbidden('This account is not allowed to use this portal.');
  }
}

/**
 * Validate that an account may authenticate AND is licensed (status + role +
 * license). Used on flows that must be fully licensed before proceeding.
 */
export async function assertUserCanAuthenticate(user: UserRecord, role: Role): Promise<LicenseRecord | null> {
  await assertAccountAccess(user, role);
  if (role === 'admin') {
    const license = await loadLicenseForAdmin(user);
    const verdict = adminLicenseVerdict(user, license);
    if (!verdict.valid) throw ApiError.licenseInvalid(verdict.reason ?? 'Your license is invalid.');
    return license;
  }
  return null;
}

/**
 * Rotate the refresh token and issue a fresh session. Returns the user.
 * Also performs account + license validation on every refresh.
 */
export async function refreshSession(role: Role, req: Request, res: Response): Promise<UserRecord> {
  const env = toEnv();
  const refreshToken = readRefreshCookie(req, role);
  if (!refreshToken) throw ApiError.unauthorized('No refresh token provided');

  const session = await Session.findOne({
    tokenHash: hashToken(refreshToken),
    role,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) {
    clearSessionCookies(res, role, env);
    throw ApiError.unauthorized('Session has expired. Please login again.');
  }

  const user = await findUserById(String(session.userId));
  if (!user) {
    clearSessionCookies(res, role, env);
    throw ApiError.unauthorized('Account not found');
  }

  // Account/role only. A license that lapsed while the admin was signed in
  // must NOT force a re-login; the license guard on protected routes handles
  // that and the UI redirects to /license.
  await assertAccountAccess(user, role);

  // Rotate: revoke old session, issue a brand new one.
  await Session.updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } });
  await issueSession(user, role, res);
  return user;
}

/**
 * Resolve the current authenticated account for a role, or null. Resolves the
 * session and account status only — the license (which may be missing or
 * invalid) is returned so callers can render the correct state.
 */
export async function resolveSessionUser(
  role: Role,
  req: Request,
): Promise<{ user: UserRecord; license: LicenseRecord | null } | null> {
  const accessToken = readAccessCookie(req, role);
  if (!accessToken) return null;
  const env = toEnv();
  let claims: { sub: string; role: string };
  try {
    claims = verifyAccessToken(accessToken, env.jwtAccessSecret);
  } catch {
    return null;
  }
  if (claims.role !== role) return null;
  const user = await findUserById(claims.sub);
  if (!user) return null;
  if (user.role !== role || user.status !== 'active') return null;
  const license = role === 'admin' ? await loadLicenseForAdmin(user) : null;
  return { user, license };
}

/** Clear cookies + revoke the DB session if a refresh token is present. */
export async function revokeSession(role: Role, req: Request, res: Response): Promise<void> {
  const env = toEnv();
  const refreshToken = readRefreshCookie(req, role);
  if (refreshToken) {
    await Session.updateOne(
      { tokenHash: hashToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
  clearSessionCookies(res, role, env);
}

export interface AuthorizedIdentity {
  user: UserRecord;
  license: LicenseRecord | null;
}

/**
 * Session-only per-request authorization: valid access token -> DB user ->
 * role -> account status. The license is loaded but NOT enforced, so this is
 * safe for license activation/status routes. Throws ApiError on every failure.
 */
export async function authorizeSession(req: Request, role: Role): Promise<AuthorizedIdentity> {
  const env = toEnv();
  const accessToken = readAccessCookie(req, role);
  if (!accessToken) throw ApiError.unauthorized('Authentication required');

  let claims: { sub: string; role: string; jti: string };
  try {
    claims = verifyAccessToken(accessToken, env.jwtAccessSecret);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please login again.');
  }
  if (claims.role !== role) {
    throw ApiError.forbidden('This session is not valid for this portal.');
  }

  const user = await findUserById(claims.sub);
  if (!user) throw ApiError.unauthorized('Account not found');
  if (user.role !== role) {
    throw ApiError.forbidden('This account is not allowed to use this portal.');
  }

  const blocked = accountError(user.status, user.rejectionReason);
  if (blocked) throw ApiError.forbidden(blocked);

  // Tenant isolation: when the admin panel is served from a subdomain, the
  // session must belong to that exact tenant. The hostname is never authority
  // on its own — the slug is matched against the Main Admin of the tenant
  // (Sub Admins authenticate on their parent Main Admin's panel URL).
  if (role === 'admin') {
    const tenantAdmin = await resolveTenantAdminUser(user);
    assertAdminSubdomainMatches(tenantAdmin, requestedAdminSubdomain(req));
    const license = await loadLicenseForAdmin(user);
    return { user, license };
  }
  return { user, license: null };
}

/**
 * Full per-request authorization for licensed portals: session checks plus a
 * mandatory, fail-closed license check. This is what protects admin data.
 */
export async function authorize(req: Request, role: Role): Promise<AuthorizedIdentity> {
  const identity = await authorizeSession(req, role);
  if (role === 'admin') {
    const verdict = adminLicenseVerdict(identity.user, identity.license);
    if (!verdict.valid) throw ApiError.licenseInvalid(verdict.reason ?? 'Your license is invalid.');
  }
  return identity;
}

export function toEnv(): Env {
  return getEnvironment();
}

export { toSafeUser, accountError, licenseError };