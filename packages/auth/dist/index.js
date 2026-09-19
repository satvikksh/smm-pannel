// src/context.ts
function ipFrom(req) {
  const raw = req.headers["x-forwarded-for"];
  if (typeof raw === "string" && raw.length > 0) {
    return raw.split(",")[0]?.trim() ?? "";
  }
  return req.ip ?? req.socket?.remoteAddress ?? "";
}

// src/guards.ts
import { ApiError as ApiError4 } from "@smm/types";

// src/session.ts
import { getEnvironment as getEnvironment2 } from "@smm/config";
import { License, Session, User as User3 } from "@smm/database";
import {
  buildCookieOptions,
  cookieNamesFor,
  generateOpaqueToken,
  hashToken,
  signAccessToken,
  verifyAccessToken
} from "@smm/security";
import { ApiError as ApiError3 } from "@smm/types";

// src/serialize.ts
function toSafeUser(u) {
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
    authProvider: u.authProvider ?? "local",
    profileImage: u.profileImage ?? null,
    emailVerified: u.emailVerified ?? false,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString()
  };
}
function toLicense(l, adminName, adminEmail, adminSubdomain) {
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
    updatedAt: l.updatedAt.toISOString()
  };
}
function licenseError(license) {
  if (license.status === "revoked") {
    return { status: "revoked", message: "License has been revoked." };
  }
  if (license.status === "suspended") {
    return { status: "suspended", message: "License is suspended." };
  }
  if (license.status === "expired") {
    return { status: "expired", message: "License has expired." };
  }
  if (license.status !== "active") {
    return { status: license.status, message: "License is not active." };
  }
  if (license.expiresAt.getTime() <= Date.now()) {
    return { status: "expired", message: "License has expired." };
  }
  return null;
}
function licenseState(license) {
  if (!license) {
    return { valid: false, status: "missing", reason: "No license is assigned to this account." };
  }
  const err = licenseError(license);
  return { valid: !err, status: license.status, reason: err?.message ?? null };
}
function adminLicenseVerdict(user, license) {
  if (!license) {
    return { valid: false, reason: "No license is assigned to this account." };
  }
  if (!user.licenseId || String(user.licenseId) !== String(license._id)) {
    return {
      valid: false,
      reason: "Your license has not been activated on this account yet. Enter your license key to activate it."
    };
  }
  const err = licenseError(license);
  return { valid: !err, reason: err?.message ?? null };
}
function accountError(status) {
  if (status === "suspended") return "This account is suspended.";
  if (status === "inactive") return "This account is not active yet.";
  if (status === "deleted") return "This account no longer exists.";
  return null;
}

// src/subdomain.ts
import { getEnvironment } from "@smm/config";
import { User } from "@smm/database";
import {
  ApiError,
  buildSubdomainHost,
  isValidSubdomainSlug,
  slugifySubdomainSlug,
  subdomainSlugFromHost
} from "@smm/types";
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function generateUniqueSubdomainSlug(base) {
  const candidate = slugifySubdomainSlug(base) || "admin";
  const escaped = escapeRegExp(candidate);
  const existing = await User.find(
    { role: "admin", subdomainSlug: { $regex: `^${escaped}(-[0-9]+)?$` } },
    { subdomainSlug: 1 }
  ).lean();
  const taken = new Set(existing.map((u) => u.subdomainSlug));
  if (!taken.has(candidate)) return candidate;
  let n = 2;
  while (taken.has(`${candidate}-${n}`)) n += 1;
  return `${candidate}-${n}`;
}
async function buildSubdomainAssignment(adminName) {
  const env = getEnvironment();
  const slug = await generateUniqueSubdomainSlug(adminName);
  return {
    subdomainSlug: slug,
    subdomain: buildSubdomainHost(slug, env.rootDomain),
    subdomainStatus: "active",
    subdomainCreatedAt: /* @__PURE__ */ new Date()
  };
}
function subdomainHostForSlug(slug) {
  return buildSubdomainHost(slug, getEnvironment().rootDomain);
}
function assertAdminSubdomainMatches(admin, requestedSlug) {
  if (!requestedSlug) return;
  if (!admin.subdomainSlug || admin.subdomainSlug !== requestedSlug) {
    throw ApiError.forbidden(
      "This Admin panel belongs to a different account. Sign in with the admin account that owns this panel URL."
    );
  }
  if (admin.subdomainStatus === "disabled") {
    throw ApiError.forbidden("This Admin panel is currently unavailable.");
  }
}

// src/tenant.ts
import { ApiError as ApiError2, hasAdminScope } from "@smm/types";
import { User as User2 } from "@smm/database";
function tenantAdminIdOf(user) {
  if (user.role === "admin") {
    return user.parentAdminId ? String(user.parentAdminId) : String(user._id);
  }
  return user.adminId ? String(user.adminId) : null;
}
function isSubAdmin(user) {
  return user.role === "admin" && Boolean(user.parentAdminId);
}
async function resolveTenantAdminUser(user) {
  if (!isSubAdmin(user)) return user;
  const parent = await User2.findById(user.parentAdminId).lean();
  if (!parent || parent.role !== "admin") {
    return user;
  }
  return parent ?? user;
}
function assertMainAdmin(user) {
  if (isSubAdmin(user)) {
    throw ApiError2.forbidden("Only the main admin can perform this action.");
  }
}
function assertAdminScope(user, scope) {
  if (isSubAdmin(user)) {
    if (!hasAdminScope(user.adminScopes, scope)) {
      throw ApiError2.forbidden("This account is not allowed to perform this action.");
    }
  }
}

// src/session.ts
function cookieOptions(env) {
  return buildCookieOptions({ nodeEnv: env.nodeEnv, apiBaseUrl: env.apiBaseUrl });
}
async function loadLicenseForAdmin(user) {
  const tenantAdminId = tenantAdminIdOf({ ...user, role: "admin" });
  if (!tenantAdminId) return null;
  return License.findOne({ adminUserId: tenantAdminId }).lean();
}
function setSessionCookies(res, role, accessToken, refreshToken, env) {
  const names = cookieNamesFor(role);
  const opts = cookieOptions(env);
  res.cookie(names.access, accessToken, { ...opts, maxAge: 15 * 60 * 1e3 });
  res.cookie(names.refresh, refreshToken, {
    ...opts,
    maxAge: env.jwtRefreshTtlDays * 24 * 60 * 60 * 1e3
  });
}
function clearSessionCookies(res, role, env) {
  const names = cookieNamesFor(role);
  const opts = cookieOptions(env);
  res.clearCookie(names.access, opts);
  res.clearCookie(names.refresh, opts);
}
async function createTokens(user, role, env) {
  const refreshToken = generateOpaqueToken(48);
  const expiresAt = new Date(Date.now() + env.jwtRefreshTtlDays * 24 * 60 * 60 * 1e3);
  const session = await Session.create({
    tokenHash: hashToken(refreshToken),
    userId: user._id,
    role,
    expiresAt
  });
  const accessToken = signAccessToken({
    sub: String(user._id),
    role,
    jti: String(session._id),
    secret: env.jwtAccessSecret,
    expiresIn: env.jwtAccessTtl
  });
  return { accessToken, refreshToken, sessionId: String(session._id) };
}
async function findUserById(userId) {
  const user = await User3.findById(userId).lean();
  return user ?? null;
}
function readRefreshCookie(req, role) {
  const names = cookieNamesFor(role);
  const cookies = req.cookies;
  return cookies[names.refresh];
}
function readAccessCookie(req, role) {
  const names = cookieNamesFor(role);
  const cookies = req.cookies;
  return cookies[names.access];
}
function requestedAdminSubdomain(req) {
  const raw = req.headers["x-admin-subdomain"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = typeof value === "string" ? value.trim().toLowerCase() : "";
  return trimmed.length > 0 ? trimmed : null;
}
async function issueSession(user, role, res) {
  const env = toEnv();
  const { accessToken, refreshToken } = await createTokens(user, role, env);
  setSessionCookies(res, role, accessToken, refreshToken, env);
}
async function assertAccountAccess(user, role) {
  const blocked = accountError(user.status);
  if (blocked) throw ApiError3.forbidden(blocked);
  if (user.role !== role) {
    throw ApiError3.forbidden("This account is not allowed to use this portal.");
  }
}
async function assertUserCanAuthenticate(user, role) {
  await assertAccountAccess(user, role);
  if (role === "admin") {
    const license = await loadLicenseForAdmin(user);
    const verdict = adminLicenseVerdict(user, license);
    if (!verdict.valid) throw ApiError3.licenseInvalid(verdict.reason ?? "Your license is invalid.");
    return license;
  }
  return null;
}
async function refreshSession(role, req, res) {
  const env = toEnv();
  const refreshToken = readRefreshCookie(req, role);
  if (!refreshToken) throw ApiError3.unauthorized("No refresh token provided");
  const session = await Session.findOne({
    tokenHash: hashToken(refreshToken),
    role,
    revokedAt: null,
    expiresAt: { $gt: /* @__PURE__ */ new Date() }
  }).lean();
  if (!session) {
    clearSessionCookies(res, role, env);
    throw ApiError3.unauthorized("Session has expired. Please login again.");
  }
  const user = await findUserById(String(session.userId));
  if (!user) {
    clearSessionCookies(res, role, env);
    throw ApiError3.unauthorized("Account not found");
  }
  await assertAccountAccess(user, role);
  await Session.updateOne({ _id: session._id }, { $set: { revokedAt: /* @__PURE__ */ new Date() } });
  await issueSession(user, role, res);
  return user;
}
async function resolveSessionUser(role, req) {
  const accessToken = readAccessCookie(req, role);
  if (!accessToken) return null;
  const env = toEnv();
  let claims;
  try {
    claims = verifyAccessToken(accessToken, env.jwtAccessSecret);
  } catch {
    return null;
  }
  if (claims.role !== role) return null;
  const user = await findUserById(claims.sub);
  if (!user) return null;
  if (user.role !== role || user.status !== "active") return null;
  const license = role === "admin" ? await loadLicenseForAdmin(user) : null;
  return { user, license };
}
async function revokeSession(role, req, res) {
  const env = toEnv();
  const refreshToken = readRefreshCookie(req, role);
  if (refreshToken) {
    await Session.updateOne(
      { tokenHash: hashToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: /* @__PURE__ */ new Date() } }
    );
  }
  clearSessionCookies(res, role, env);
}
async function authorizeSession(req, role) {
  const env = toEnv();
  const accessToken = readAccessCookie(req, role);
  if (!accessToken) throw ApiError3.unauthorized("Authentication required");
  let claims;
  try {
    claims = verifyAccessToken(accessToken, env.jwtAccessSecret);
  } catch {
    throw ApiError3.unauthorized("Your session has expired. Please login again.");
  }
  if (claims.role !== role) {
    throw ApiError3.forbidden("This session is not valid for this portal.");
  }
  const user = await findUserById(claims.sub);
  if (!user) throw ApiError3.unauthorized("Account not found");
  if (user.role !== role) {
    throw ApiError3.forbidden("This account is not allowed to use this portal.");
  }
  const blocked = accountError(user.status);
  if (blocked) throw ApiError3.forbidden(blocked);
  if (role === "admin") {
    const tenantAdmin = await resolveTenantAdminUser(user);
    assertAdminSubdomainMatches(tenantAdmin, requestedAdminSubdomain(req));
    const license = await loadLicenseForAdmin(user);
    return { user, license };
  }
  return { user, license: null };
}
async function authorize(req, role) {
  const identity = await authorizeSession(req, role);
  if (role === "admin") {
    const verdict = adminLicenseVerdict(identity.user, identity.license);
    if (!verdict.valid) throw ApiError3.licenseInvalid(verdict.reason ?? "Your license is invalid.");
  }
  return identity;
}
function toEnv() {
  return getEnvironment2();
}

// src/guards.ts
function requireRole(role) {
  return async (req, res, next) => {
    try {
      const identity = await authorize(req, role);
      req.ctx = { user: identity.user, role, license: identity.license };
      next();
    } catch (err) {
      next(err);
    }
  };
}
function requireRoleSession(role) {
  return async (req, res, next) => {
    try {
      const identity = await authorizeSession(req, role);
      req.ctx = { user: identity.user, role, license: identity.license };
      next();
    } catch (err) {
      next(err);
    }
  };
}
function requireSuperAdmin() {
  return requireRole("super_admin");
}
function requireAdmin() {
  return requireRole("admin");
}
function requireUser() {
  return requireRole("user");
}
function requireAnyRole(roles) {
  return async (req, res, next) => {
    try {
      let lastError = ApiError4.forbidden(
        "This account is not allowed to perform this action."
      );
      for (const role of roles) {
        try {
          const identity = await authorize(req, role);
          req.ctx = { user: identity.user, role, license: identity.license };
          next();
          return;
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError;
    } catch (err) {
      next(err);
    }
  };
}
function requireAdminSession() {
  return requireRoleSession("admin");
}

// src/seed.ts
import { getEnvironment as getEnvironment3 } from "@smm/config";
import { User as User4, Wallet } from "@smm/database";
import { hashPassword, verifyPassword } from "@smm/security";
import { ROLES, ApiError as ApiError5 } from "@smm/types";
async function ensureSuperAdminUser(email = getEnvironment3().superAdminEmail, password = getEnvironment3().superAdminPassword) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw ApiError5.badRequest("Unable to determine Super Admin credentials from environment.");
  }
  const existing = await User4.findOne({ role: ROLES.SUPER_ADMIN }).lean();
  if (!existing) {
    const passwordHash = await hashPassword(password);
    const created = new User4({
      name: "Super Admin",
      email: normalizedEmail,
      phone: "+0000000000",
      passwordHash,
      role: ROLES.SUPER_ADMIN,
      status: "active"
    });
    await created.save();
    await Wallet.updateOne(
      { userId: created._id },
      { $setOnInsert: { userId: created._id, balance: 0, totalDeposited: 0, totalSpent: 0 } },
      { upsert: true }
    );
    return created.toObject();
  }
  const patch = {};
  if (existing.email !== normalizedEmail) {
    patch.email = normalizedEmail;
  }
  if (!await verifyPassword(password, existing.passwordHash)) {
    patch.passwordHash = await hashPassword(password);
  }
  if (existing.status !== "active") {
    patch.status = "active";
  }
  if (Object.keys(patch).length > 0) {
    await User4.updateOne({ _id: existing._id }, { $set: patch });
    Object.assign(existing, patch);
  }
  return existing;
}
async function seedSuperAdmin(superAdminEmail, superAdminPassword) {
  await ensureSuperAdminUser(superAdminEmail, superAdminPassword);
}

// src/super-admin.ts
import { createHash, timingSafeEqual } from "node:crypto";
import { getEnvironment as getEnvironment4 } from "@smm/config";
function constantTimeEqual(a, b) {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}
function verifySuperAdminCredentials(email, password) {
  const expectedEmail = getEnvironment4().superAdminEmail.trim().toLowerCase();
  const expectedPassword = getEnvironment4().superAdminPassword;
  const emailOk = constantTimeEqual(email.trim().toLowerCase(), expectedEmail);
  const passwordOk = constantTimeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}
function isSuperAdminEmail(email) {
  const expectedEmail = getEnvironment4().superAdminEmail.trim().toLowerCase();
  return constantTimeEqual(email.trim().toLowerCase(), expectedEmail);
}

// src/audit.ts
import { AuditLog } from "@smm/database";
async function writeAuditLog(entry) {
  await AuditLog.create({
    actorId: entry.actorId ?? null,
    actorName: entry.actorName ?? "",
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType ?? "",
    targetId: entry.targetId ?? "",
    targetLabel: entry.targetLabel ?? "",
    result: entry.result ?? "success",
    ip: entry.ip ?? "",
    metadata: entry.metadata ?? {}
  });
}
export {
  accountError,
  adminLicenseVerdict,
  assertAccountAccess,
  assertAdminScope,
  assertAdminSubdomainMatches,
  assertMainAdmin,
  assertUserCanAuthenticate,
  authorize,
  authorizeSession,
  buildSubdomainAssignment,
  clearSessionCookies,
  ensureSuperAdminUser,
  generateUniqueSubdomainSlug,
  ipFrom,
  isSubAdmin,
  isSuperAdminEmail,
  isValidSubdomainSlug,
  issueSession,
  licenseError,
  licenseState,
  loadLicenseForAdmin,
  refreshSession,
  requestedAdminSubdomain,
  requireAdmin,
  requireAdminSession,
  requireAnyRole,
  requireRole,
  requireRoleSession,
  requireSuperAdmin,
  requireUser,
  resolveSessionUser,
  resolveTenantAdminUser,
  revokeSession,
  seedSuperAdmin,
  subdomainHostForSlug,
  subdomainSlugFromHost,
  tenantAdminIdOf,
  toEnv,
  toLicense,
  toSafeUser,
  verifySuperAdminCredentials,
  writeAuditLog
};
