import { timingSafeEqual, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { getEnvironment } from '@smm/config';
import { User, Wallet, type UserRecord } from '@smm/database';
import { AUTH_PROVIDERS, ACCOUNT_STATUSES, ApiError, AUDIT_ACTIONS, ROLES, type Role } from '@smm/types';
import { assertAccountAccess, ipFrom, issueSession, writeAuditLog } from '@smm/auth';
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
 * Google OAuth for the USER panel ONLY (mounted at /api/auth).
 *
 *  - GET /google            start the OAuth flow (sets a state cookie, redirects
 *                           the browser to Google).
 *  - GET /google/callback   Google returns here; the API validates the state,
 *                           exchanges the code, verifies the identity, finds or
 *                           creates the USER account, issues the standard user
 *                           session and redirects to the User panel dashboard.
 *
 * Admins and Super Admins are never linked or created through Google. The role
 * is always assigned server-side and an email that belongs to an admin /
 * super-admin account is rejected.
 */

type Env = ReturnType<typeof getEnvironment>;

const STATE_COOKIE = 'smm_google_oauth_state';
const REDIRECT_COOKIE = 'smm_google_oauth_redirect';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

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
  return Boolean(env.googleClientId && env.googleClientSecret && env.googleRedirectUri);
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * The only paths a Google flow may return to. Kept to the user panel's own
 * pages; the destination host is always the configured user app URL.
 */
function sanitizeRedirectPath(raw: unknown): '/login' | '/register' | '/' {
  if (typeof raw !== 'string') return '/login';
  const value = (raw.trim().split(/[?#]/)[0] ?? '').toLowerCase();
  if (value === '/register') return '/register';
  if (value === '/') return '/';
  return '/login';
}

function buildErrorUrl(env: Env, redirectPath: string, kind: string): string {
  return `${stripTrailingSlash(env.userAppUrl)}${redirectPath}?google_error=${encodeURIComponent(kind)}`;
}

function sendErrorRedirect(res: Response, env: Env, redirectPath: string, kind: 'cancelled' | 'failed' | 'unavailable' | 'role'): void {
  res.redirect(302, buildErrorUrl(env, redirectPath, kind));
}

const ROLE_ERROR = 'Google login is available only for user accounts.';

function assertUserRole(user: { role: Role }): void {
  if (user.role !== ROLES.USER) {
    throw ApiError.forbidden(ROLE_ERROR);
  }
}

/**
 * Resolve the destination user account for a verified Google identity.
 * Returns `user` plus the kind of resolution so the exact audit action can be
 * recorded:
 *   - login:    an existing Google-created user.
 *   - link:     an existing email/password user safely linked to Google.
 *   - register: a brand-new Google user (role always `user`).
 */
async function resolveGoogleAccount(
  profile: GoogleUserInfo,
  env: Env,
): Promise<{ user: UserRecord; kind: 'login' | 'link' | 'register' }> {
  // A platform Super Admin email must never become a user account, even if the
  // guarded role on the DB row were somehow missing.
  if (profile.email === env.superAdminEmail.trim().toLowerCase()) {
    throw ApiError.forbidden(ROLE_ERROR);
  }

  const byGoogleId = await User.findOne({ googleId: profile.sub }).lean();
  if (byGoogleId) {
    assertUserRole(byGoogleId);
    await assertAccountAccess(byGoogleId, ROLES.USER);
    return { user: byGoogleId as UserRecord, kind: 'login' };
  }

  const byEmail = await User.findOne({ email: profile.email }).lean();
  if (byEmail) {
    // Never link an Admin or Super Admin account to Google, and never change
    // their role or privileges. Blocked accounts are rejected before any
    // identity is written.
    assertUserRole(byEmail);
    await assertAccountAccess(byEmail, ROLES.USER);
    const linked = await linkGoogleIdentity(byEmail, profile);
    return { user: linked as UserRecord, kind: 'link' };
  }

  const user = await createGoogleUser(profile);
  return { user, kind: 'register' };
}

async function linkGoogleIdentity(
  existing: { _id: unknown; authProvider?: string | null; profileImage?: string | null },
  profile: GoogleUserInfo,
) {
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
  return updated!;
}

async function createGoogleUser(profile: GoogleUserInfo) {
  const fallbackName = profile.email.split('@')[0] || 'Google User';
  const user = new User({
    name: profile.name ?? fallbackName,
    email: profile.email,
    phone: '',
    passwordHash: '',
    role: ROLES.USER,
    status: ACCOUNT_STATUSES.ACTIVE,
    authProvider: AUTH_PROVIDERS.GOOGLE,
    googleId: profile.sub,
    profileImage: profile.picture ?? null,
    emailVerified: true,
  });
  await user.save();
  // The app's standard registration also provisions an empty wallet (balance 0).
  await Wallet.create({
    userId: user._id,
    balance: 0,
    totalDeposited: 0,
    totalSpent: 0,
  });
  return user;
}

export function googleAuthRouter(): Router {
  const router = Router();

  router.get('/google', rateLimitAuth({ max: 20 }), (req: Request, res: Response) => {
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
    authUrl.searchParams.set('redirect_uri', env.googleRedirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    res.redirect(302, authUrl.toString());
  });

  router.get(
    '/google/callback',
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

      // User cancelled / Google refused.
      if (error) {
        const kind = error === 'access_denied' ? 'cancelled' : 'failed';
        sendErrorRedirect(res, env, redirectPath, kind);
        return;
      }

      // State must be present, match the stored value exactly, and the code must
      // be present. Otherwise the callback is forged or replayed.
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
          redirectUri: env.googleRedirectUri,
        });

        // Validate issuer + audience from the id_token...
        if (!token.id_token) {
          throw new GoogleOAuthError('Google did not issue an id_token.');
        }
        const idTokenClaims = decodeGoogleIdToken(token.id_token);
        validateGoogleIdentity(idTokenClaims, env.googleClientId, { requireIssuer: true });

        // ...and audience/authorized-party from the protected userinfo endpoint
        // for the same access token. Identity values come from userinfo only.
        const { profile, claims } = await fetchGoogleUserInfo(token.access_token);
        validateGoogleIdentity(claims, env.googleClientId);
        if (idTokenClaims.sub !== profile.sub) {
          throw new GoogleOAuthError('Google identity did not match across responses.');
        }
        if (!profile.email_verified) {
          throw new GoogleOAuthError('The Google account email is not verified.');
        }

        const { user, kind } = await resolveGoogleAccount(profile, env);

        await issueSession(user, ROLES.USER, res);

        const action =
          kind === 'register'
            ? AUDIT_ACTIONS.USER_GOOGLE_REGISTER
            : kind === 'link'
              ? AUDIT_ACTIONS.USER_GOOGLE_LINK
              : AUDIT_ACTIONS.USER_GOOGLE_LOGIN;
        await writeAuditLog({
          actorId: String(user._id),
          actorName: user.name,
          actorRole: ROLES.USER,
          action,
          targetType: 'user',
          targetId: String(user._id),
          targetLabel: user.email,
          ip: ipFrom(req),
          metadata: { provider: 'google', googleId: profile.sub },
        });

        res.redirect(302, `${stripTrailingSlash(env.userAppUrl)}/dashboard`);
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