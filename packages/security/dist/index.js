// src/password.ts
import bcrypt from "bcryptjs";
var SALT_ROUNDS = 12;
async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// src/tokens.ts
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
function signAccessToken(payload) {
  const claims = { sub: payload.sub, role: payload.role, jti: payload.jti, type: "access" };
  return jwt.sign(claims, payload.secret, {
    expiresIn: payload.expiresIn,
    audience: "smm-panel",
    issuer: "smm-panel-api"
  });
}
function verifyAccessToken(token, secret) {
  const decoded = jwt.verify(token, secret, { audience: "smm-panel", issuer: "smm-panel-api" });
  if (decoded.type !== "access") {
    throw new jwt.JsonWebTokenError("Not an access token");
  }
  return {
    sub: String(decoded.sub ?? ""),
    role: String(decoded.role ?? ""),
    jti: String(decoded.jti ?? ""),
    type: "access"
  };
}
function generateOpaqueToken(bytes = 48) {
  return randomBytes(bytes).toString("base64url");
}
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function generateSessionId() {
  return randomBytes(24).toString("hex");
}

// src/keys.ts
import { randomBytes as randomBytes2 } from "node:crypto";
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function block(length = 4) {
  const bytes = randomBytes2(length);
  let out = "";
  for (const b of bytes) {
    out += ALPHABET[b % ALPHABET.length];
  }
  return out;
}
function generateLicenseKey() {
  return `SMM-${block()}-${block()}-${block()}-${block()}`;
}
function generateReference() {
  return randomBytes2(9).toString("hex").toUpperCase();
}

// src/cookies.ts
var COOKIE_NAMES = {
  super_admin: { access: "smm_sa_access", refresh: "smm_sa_refresh" },
  admin: { access: "smm_ad_access", refresh: "smm_ad_refresh" },
  user: { access: "smm_us_access", refresh: "smm_us_refresh" }
};
function cookieNamesFor(role) {
  return COOKIE_NAMES[role];
}
function buildCookieOptions(env) {
  const isHttps = env.apiBaseUrl.startsWith("https://");
  const secure = env.nodeEnv === "production" || isHttps;
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/"
  };
}
var ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1e3;
export {
  ACCESS_COOKIE_MAX_AGE,
  COOKIE_NAMES,
  buildCookieOptions,
  cookieNamesFor,
  generateLicenseKey,
  generateOpaqueToken,
  generateReference,
  generateSessionId,
  hashPassword,
  hashToken,
  jwt,
  signAccessToken,
  verifyAccessToken,
  verifyPassword
};
