import { timingSafeEqual, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { getEnvironment } from '@smm/config';
import { User, type UserRecord } from '@smm/database';
import { AUTH_PROVIDERS, ApiError, AUDIT_ACTIONS, ROLES } from '@smm/types';
import { ipFrom, issueSession, writeAuditLog } from '@smm/auth';
import { rateLimitAuth } from '../../middleware/rate-limit';
import {
  GoogleOAuthError,
  decodeGoogleIdToken,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  validateGoogleIdentity,
  type GoogleUserInfo,
} from './google-client';

/**
 * Google OAuth for the ADMIN panel (mounted at /api/auth/admin).
 *
 * The OAuth dance runs through the Admin panel origin so the OAuth state
 * cookies AND the session cookies that get issued stay first-party to the panel
 * (Vercel domains are distinct sites; see the cross-site session work in the
 * panels). The flow:
 *
 *   1. GET /admin/google  (Admin panel origin, rewritten to the API) starts the
 *      flow: sets an HttpOnly state cookie on the panel, redirects to Google
 *      with `redirect_uri` = the Admin panel's own callback URL.
 *   2. GET /admin/google/callback  (Admin panel origin, rewritten to the API)
 *      Google returns here; the API validates state, swaps the code, verifies
 *      the identity server-side, then resolves the ADMIN account.
 *
 * Admin accounts respect the approval workflow:
 *   - a brand-new Google identity creates a `pending` admin (GOOGLE provider)
 *     — it is NOT signed in, and redirected to the "registration pending"
 *     notice until the Super Admin approves it;
 *   - an existing `pending` / `rejected` / blocked admin is never signed in;
 *   - only an `active`, licensed admin gets a session (referenced by their
 *     account license, checked at /me).
 *
 * Local admin accounts can link a Google identity (authProvider local/google);
 * their role and privileges are never changed. User accounts are never touched.
 */
type Env = ReturnType<typeof getEnvironment>;

const STATE_COOKIE = 'smm_google_oauth_admin_state';
const REDIRECT_COOKIE = 'smm_google_oauth_admin_redirect';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

type Decision =
  | { kind: 'login'; user: UserRecord }
  | { kind: 'link'; user: UserRecord }
  | { kind: 'register-pending'; user: UserRecord }
  | { kind: 'pending' }
  | { kind: 'rejected' }
  | { kind: 'blocked' };

function oauthCookieOptions(env: Env): Record<string, unknown> {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: STATE_MAX_AGE_MS,
  };
}

function setOauthCookies(res: Response, env: Env, state: string, redirectPath: string): void {
  res.cookie(STATE_COOKIE, state, oauthCookieOptions(env));
  res.cookie(REDIRECT_COOKIE, redirectPath, oauthCookieOptions(env));
}

function clearOauthCookies(res: Response, env: Env): void {
  const opts = oauthCookieOptions(env);
  res.clearCookie(STATE_COOKIE, opts);
  res.clearCookie(REDIRECT_COOKIE, opts);
}

function readOauthCookie(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined>;
  const value = cookies[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function timingSafeStringsEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function googleConfigured(env: Env): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret && env.googleAdminRedirectUri);
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Only Admin panel pages may be returned to; the host is always the panel URL. */
function sanitizeRedirectPath(raw: unknown): '/login' | '/register' | '/' {
  if (typeof raw !== 'string') return '/login';
  const value = (raw.trim().split(/[?#]/)[0] ?? '').toLowerCase();
  if (value === '/register') return '/register';
  if (value === '/') return '/';
  return '/login';
}

function buildErrorUrl(env: Env, redirectPath: string, kind: string): string {
  return `${stripTrailingSlash(env.adminAppUrl)}${redirectPath}?google_error=${encodeURIComponent(kind)}`;
}

function sendErrorRedirect(res: Response, env: Env, redirectPath: string, kind: string): void {
  res.redirect(302, buildErrorUrl(env, redirectPath, kind));
}

const ROLE_ERROR = 'Google login is available only for admin accounts.';

function assertAdminRole(user: { role: string }): void {
  if (user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden(ROLE_ERROR);
  }
}

/** Decision for an account whose approval/status forbids signing in right now. */
function blockedDecision(status: string): Decision {
  if (status === 'pending') return { kind: 'pending' };
  if (status === 'rejected') return { kind: 'rejected' };
  return { kind: 'blocked' };
}

/**
 * Resolve the destination ADMIN account for a verified Google identity:
 *   - login:           an existing, approved, Google-created admin.
 *   - link:            an existing local admin safely linked to Google.
 *   - register-pending a brand-new admin (approval required, no session).
 *   - pending/rejected a matching admin whose application was not approved.
 *   - blocked          any other non-active admin.
 */
async function resolveGoogleAdmin(profile: GoogleUserInfo, env: Env): Promise<Decision> {
  // A platform Super Admin email must never become an admin registration.
  if (profile.email === env.superAdminEmail.trim().toLowerCase()) {
    throw ApiError.forbidden(ROLE_ERROR);
  }

  const byGoogleId = await User.findOne({ googleId: profile.sub }).lean();
  if (byGoogleId) {
    assertAdminRole(byGoogleId);
    if (byGoogleId.status !== 'active') return blockedDecision(byGoogleId.status);
    return { user: byGoogleId as UserRecord, kind: 'login' };
  }

  const byEmail = await User.findOne({ email: profile.email }).lean();
  if (byEmail) {
    // Never link a user / super-admin account to the admin role, and never
    // change an existing admin's role or privileges.
    assertAdminRole(byEmail);
    if (byEmail.status !== 'active') return blockedDecision(byEmail.status);
    const linked = await linkGoogleIdentity(byEmail, profile);
    return { user: linked as UserRecord, kind: 'link' };
  }

  const user = await createPendingGoogleAdmin(profile);
  return { user, kind: 'register-pending' };
}

async function linkGoogleIdentity(
  existing: UserRecord,
  profile: GoogleUserInfo,
): Promise<UserRecord | null> {
  const wasLocal = !existing.authProvider || existing.authProvider === AUTH_PROVIDERS.LOCAL;
  const authProvider = wasLocal ? AUTH_PROVIDERS.LOCAL_GOOGLE : existing.authProvider;
  const profileImage =
    typeof existing.profileImage === 'string' && existing.profileImage.length > 0
      ? existing.profileImage
      : (profile.picture ?? null);
  await User.updateOne(
    { _id: existing._id },
    {
      $set: {
        googleId: profile.sub,
        authProvider,
        profileImage,
        emailVerified: true,
      },
    },
  );
  const updated = await User.findById(existing._id).lean();
  return (updated as UserRecord | null) ?? null;
}

async function createPendingGoogleAdmin(profile: GoogleUserInfo): Promise<UserRecord> {
  const fallbackName = profile.email.split('@')[0] || 'Admin';
  const user = new User({
    name: profile.name ?? fallbackName,
    email: profile.email,
    phone: '',
    passwordHash: '',
    role: ROLES.ADMIN,
    status: 'pending',
    authProvider: AUTH_PROVIDERS.GOOGLE,
    googleId: profile.sub,
    profileImage: profile.picture ?? null,
    emailVerified: true,
  });
  await user.save();
  return user;
}

export function adminGoogleAuthRouter(): Router {
  const router = Router();

  router.get('/admin/google', rateLimitAuth({ max: 20 }), (req: Request, res: Response) => {
    const env = getEnvironment();
    const redirectPath = sanitizeRedirectPath(req.query.redirect);
    if (!googleConfigured(env)) {
      sendErrorRedirect(res, env, redirectPath, 'unavailable');
      return;
    }

    const state = randomBytes(32).toString('base64url');
    setOauthCookies(res, env, state, redirectPath);

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', env.googleClientId);
    authUrl.searchParams.set('redirect_uri', env.googleAdminRedirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    res.redirect(302, authUrl.toString());
  });

  router.get(
    '/admin/google/callback',
    rateLimitAuth({ max: 30 }),
    async (req: Request, res: Response): Promise<void> => {
      const env = getEnvironment();
      const query = req.query as Record<string, unknown>;
      const error = typeof query.error === 'string' ? query.error : undefined;
      const code = typeof query.code === 'string' ? query.code : undefined;
      const state = typeof query.state === 'string' ? query.state : undefined;

      const storedState = readOauthCookie(req, STATE_COOKIE);
      const redirectPath = sanitizeRedirectPath(readOauthCookie(req, REDIRECT_COOKIE) ?? '/login');
      clearOauthCookies(res, env);

      if (error) {
        const kind = error === 'access_denied' ? 'cancelled' : 'failed';
        sendErrorRedirect(res, env, redirectPath, kind);
        return;
      }

      // State must match and the code must be present (CSRF / replay guard).
      if (!storedState || !state || !timingSafeStringsEqual(storedState, state) || !code) {
        sendErrorRedirect(res, env, redirectPath, 'failed');
        return;
      }

      try {
        if (!googleConfigured(env)) {
          sendErrorRedirect(res, env, redirectPath, 'unavailable');
          return;
        }

        const token = await exchangeGoogleCode({
          code,
          clientId: env.googleClientId,
          clientSecret: env.googleClientSecret,
          redirectUri: env.googleAdminRedirectUri,
        });

        if (!token.id_token) {
          throw new GoogleOAuthError('Google did not issue an id_token.');
        }
        const idTokenClaims = decodeGoogleIdToken(token.id_token);
        validateGoogleIdentity(idTokenClaims, env.googleClientId, { requireIssuer: true });

        const { profile, claims } = await fetchGoogleUserInfo(token.access_token);
        validateGoogleIdentity(claims, env.googleClientId);
        if (idTokenClaims.sub !== profile.sub) {
          throw new GoogleOAuthError('Google identity did not match across responses.');
        }
        if (!profile.email_verified) {
          throw new GoogleOAuthError('The Google account email is not verified.');
        }

        const resolved = await resolveGoogleAdmin(profile, env);

        if (resolved.kind === 'pending') {
          sendErrorRedirect(res, env, '/login', 'pending');
          return;
        }
        if (resolved.kind === 'rejected') {
          sendErrorRedirect(res, env, '/login', 'rejected');
          return;
        }
        if (resolved.kind === 'blocked') {
          sendErrorRedirect(res, env, '/login', 'blocked');
          return;
        }

        const { user, kind } = resolved;

        if (kind === 'register-pending') {
          await writeAuditLog({
            actorId: String(user._id),
            actorName: user.name,
            actorRole: ROLES.ADMIN,
            action: AUDIT_ACTIONS.ADMIN_GOOGLE_REGISTER,
            targetType: 'admin',
            targetId: String(user._id),
            targetLabel: user.email,
            ip: ipFrom(req),
            metadata: { provider: 'google', googleId: profile.sub },
          });
          sendErrorRedirect(res, env, '/login', 'pending');
          return;
        }

        await issueSession(user, ROLES.ADMIN, res);

        const action =
          kind === 'link'
            ? AUDIT_ACTIONS.ADMIN_GOOGLE_LINK
            : AUDIT_ACTIONS.ADMIN_GOOGLE_LOGIN;
        await writeAuditLog({
          actorId: String(user._id),
          actorName: user.name,
          actorRole: ROLES.ADMIN,
          action,
          targetType: 'admin',
          targetId: String(user._id),
          targetLabel: user.email,
          ip: ipFrom(req),
          metadata: { provider: 'google', googleId: profile.sub },
        });

        res.redirect(302, `${stripTrailingSlash(env.adminAppUrl)}/dashboard`);
      } catch (err) {
        if (err instanceof ApiError && err.message === ROLE_ERROR) {
          sendErrorRedirect(res, env, redirectPath, 'role');
          return;
        }
        sendErrorRedirect(res, env, redirectPath, 'failed');
      }
    },
  );

  return router;
}