import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AuditLog, User, Wallet } from '@smm/database';
import {
  testApp,
  registerUser,
  loginUser,
  loginSuperAdmin,
  createAdminViaApi,
  SUPER_ADMIN_EMAIL,
  PW,
} from './helpers';

/**
 * Google OAuth (user panel) tests.
 *
 * The API never calls the real Google endpoints under test: the router calls
 * `exchangeGoogleCode` / `fetchGoogleUserInfo` through `globalThis.fetch`, so a
 * test installs a stubbed responder that emulates Google's token + userinfo
 * endpoints for a chosen identity. Every other part of the flow (state cookie,
 * callback validation, account resolution, session issuance, audit, redirects)
 * runs exactly as in production.
 */

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const CLIENT_SECRET = 'test-client-secret';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

type Agent = ReturnType<typeof request.agent>;

interface GoogleScenario {
  sub: string;
  email: string;
  emailVerified?: boolean;
  tokenStatus?: number;
  userinfoSub?: string;
  idTokenIss?: string;
  idTokenAud?: unknown;
  userinfoAud?: unknown;
}

let scenario: GoogleScenario | null = null;
let originalFetch: typeof fetch;

function b64url(input: unknown): string {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function makeIdToken(s: GoogleScenario): string {
  const payload = {
    iss: s.idTokenIss ?? 'https://accounts.google.com',
    aud: s.idTokenAud ?? CLIENT_ID,
    azp: CLIENT_ID,
    sub: s.userinfoSub ?? s.sub,
    email: s.email,
    email_verified: s.emailVerified !== false,
  };
  return `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(payload)}.sig`;
}

function installGoogleResponder(s: GoogleScenario): void {
  scenario = s;
}

async function stubFetch(input: string | URL | Request, _init?: RequestInit): Promise<Response> {
  const s = scenario!;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url === TOKEN_URL) {
    const body = JSON.stringify({
      access_token: 'at',
      token_type: 'Bearer',
      id_token: makeIdToken(s),
    });
    return new Response(body, {
      status: s.tokenStatus ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (url === USERINFO_URL) {
    const body = JSON.stringify({
      sub: s.userinfoSub ?? s.sub,
      email: s.email,
      email_verified: s.emailVerified !== false,
      iss: 'https://accounts.google.com',
      aud: s.userinfoAud ?? CLIENT_ID,
      azp: CLIENT_ID,
    });
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  throw new Error(`Unexpected fetch in google test: ${url}`);
}

/** Start the OAuth flow like the browser would and return the state value. */
async function startOAuth(agent: Agent, redirect?: string): Promise<string> {
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
  const res = await agent.get(`/api/auth/google${query}`).redirects(0);
  expect(res.status).toBe(302);
  const location = res.headers.location as string;
  expect(location).toContain('accounts.google.com');
  const state = new URL(location).searchParams.get('state')!;
  expect(state.length).toBeGreaterThan(40);
  return state;
}

/** Hit the callback the way Google would (state cookie comes from the agent jar). */
async function callback(agent: Agent, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return agent.get(`/api/auth/google/callback${qs ? `?${qs}` : ''}`).redirects(0);
}

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  process.env.GOOGLE_CLIENT_SECRET = CLIENT_SECRET;
  process.env.GOOGLE_REDIRECT_URI = `http://localhost:4000/api/auth/google/callback`;
  originalFetch = globalThis.fetch;
  globalThis.fetch = stubFetch as typeof fetch;
});

afterAll(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REDIRECT_URI;
  globalThis.fetch = originalFetch;
});

describe('Google OAuth — user panel (§25)', () => {
  it('creates a brand-new Google user (role user, wallet 0, provider google)', async () => {
    const t = testApp();
    installGoogleResponder({ sub: 'g1', email: 'new.google@example.test' });

    const state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'one-time-code', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/dashboard');

    // A real session cookie was issued and works.
    const me = await t.agent.get('/api/v1/auth/user/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('new.google@example.test');
    expect(me.body.data.user.role).toBe('user');
    expect(me.body.data.user.authProvider).toBe('google');
    expect(me.body.data.user.googleId).toBe('g1');
    expect(me.body.data.user.emailVerified).toBe(true);
    expect(me.body.data.user.phone).toBe('');

    const db = await User.findOne({ email: 'new.google@example.test' }).lean();
    expect(db!.role).toBe('user');
    expect(db!.authProvider).toBe('google');
    expect(db!.googleId).toBe('g1');
    expect(db!.passwordHash).toBe('');

    const wallet = await Wallet.findOne({ userId: (db as { _id: unknown })._id }).lean();
    expect(wallet!.balance).toBe(0);

    const audit = await AuditLog.findOne({ action: 'user.google.register' }).lean();
    expect(audit!.actorRole).toBe('user');
    expect((audit!.metadata as Record<string, unknown>).googleId).toBe('g1');
  });

  it('logs an existing Google user in without duplicating the account', async () => {
    const t = testApp();
    installGoogleResponder({ sub: 'g2', email: 'repeat.google@example.test' });
    let state = await startOAuth(t.agent);
    await callback(t.agent, { code: 'c', state });

    installGoogleResponder({ sub: 'g2', email: 'repeat.google@example.test' });
    state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'c2', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/dashboard');

    expect(await User.countDocuments({ googleId: 'g2' })).toBe(1);
    const audit = await AuditLog.countDocuments({ action: 'user.google.login' });
    expect(audit).toBeGreaterThanOrEqual(1);
  });

  it('links a local email/password account to Google and keeps the password', async () => {
    const t = testApp();
    const email = 'link.me@example.test';
    await registerUser(t, { email });
    expect((await loginUser(t, email, PW)).status).toBe(200);

    installGoogleResponder({ sub: 'g3', email });
    const state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/dashboard');

    const db = await User.findOne({ email }).lean();
    expect(db!.authProvider).toBe('local/google');
    expect(db!.googleId).toBe('g3');

    // Password login still works after linking.
    expect((await loginUser(t, email, PW)).status).toBe(200);

    expect(await AuditLog.findOne({ action: 'user.google.link' }).lean()).toBeTruthy();
  });

  it('refuses to link or create Admin accounts via Google', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'pam.admin@example.test');

    installGoogleResponder({ sub: 'g4', email: admin.email });
    const state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/login?google_error=role');

    const db = await User.findOne({ email: admin.email }).lean();
    expect(db!.role).toBe('admin');
    expect(db!.googleId).toBeNull();
    expect(db!.authProvider).toBe('local');
    expect(db!.emailVerified).toBe(false);
  });

  it('never creates a user account for the platform Super Admin email', async () => {
    const t = testApp();
    installGoogleResponder({ sub: 'g5', email: SUPER_ADMIN_EMAIL });
    const state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/login?google_error=role');
    expect(await User.countDocuments({ googleId: 'g5' })).toBe(0);
  });

  it('rejects a callback with a forged state (CSRF)', async () => {
    const t = testApp();
    const res = await callback(t.agent, { code: 'c', state: 'forged-state' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_error=failed');
  });

  it('maps a cancelled flow (access_denied) to google_error=cancelled', async () => {
    const t = testApp();
    const res = await callback(t.agent, { error: 'access_denied' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/login?google_error=cancelled');
  });

  it('requires a verified Google email', async () => {
    const t = testApp();
    installGoogleResponder({ sub: 'g6', email: 'unverified@example.test', emailVerified: false });
    const state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_error=failed');
    expect(await User.countDocuments({ googleId: 'g6' })).toBe(0);
  });

  it('rejects an id_token issued for a different audience', async () => {
    const t = testApp();
    installGoogleResponder({
      sub: 'g7',
      email: 'bad.aud@example.test',
      idTokenAud: 'another-client.apps.googleusercontent.com',
    });
    const state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_error=failed');
    expect(await User.countDocuments({ googleId: 'g7' })).toBe(0);
  });

  it('rejects an id_token with an unexpected issuer', async () => {
    const t = testApp();
    installGoogleResponder({
      sub: 'g8',
      email: 'bad.iss@example.test',
      idTokenIss: 'https://evil.example.com',
    });
    const state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_error=failed');
    expect(await User.countDocuments({ googleId: 'g8' })).toBe(0);
  });

  it('fails closed when Google declares the code unusable', async () => {
    const t = testApp();
    installGoogleResponder({ sub: 'g9', email: 'used.code@example.test', tokenStatus: 400 });
    const state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'used-code', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_error=failed');
    expect(await User.countDocuments({ googleId: 'g9' })).toBe(0);
  });

  it('refuses to sign in a suspended account even with a valid Google identity', async () => {
    const t = testApp();
    const email = 'suspended@example.test';
    await registerUser(t, { email });
    await User.updateOne({ email }, { $set: { status: 'suspended' } });

    installGoogleResponder({ sub: 'g10', email });
    const state = await startOAuth(t.agent);
    const res = await callback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_error=failed');

    const db = await User.findOne({ email }).lean();
    expect(db!.googleId).toBeNull();
    expect(db!.authProvider).toBe('local');
  });

  it('sanitizes the return path and always keeps the destination host local', async () => {
    const t = testApp();
    installGoogleResponder({ sub: 'g11', email: 'host.safe@example.test' });

    // Hostile redirect value: `//evil.com/` -> sanitized back to /login, and the
    // final redirect host is always the configured user app.
    await startOAuth(t.agent, '//evil.com/');
    const err = await callback(t.agent, { error: 'access_denied' });
    expect(err.headers.location).toBe('http://localhost:3000/login?google_error=cancelled');
  });

  it('fails closed when Google OAuth is not configured', async () => {
    const t = testApp();
    installGoogleResponder({ sub: 'g12', email: 'nope@example.test' });
    delete process.env.GOOGLE_CLIENT_SECRET;

    const res = await t.agent.get('/api/auth/google?redirect=/login').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/login?google_error=unavailable');

    process.env.GOOGLE_CLIENT_SECRET = CLIENT_SECRET;
    expect(await User.countDocuments({ googleId: 'g12' })).toBe(0);
  });

  it('issues a real DB session usable across (then revoked by) account status', async () => {
    const t = testApp();
    installGoogleResponder({ sub: 'g13', email: 'session.google@example.test' });
    const state = await startOAuth(t.agent);
    await callback(t.agent, { code: 'c', state });

    expect((await t.agent.get('/api/v1/auth/user/me')).status).toBe(200);

    await User.updateOne(
      { email: 'session.google@example.test' },
      { $set: { status: 'suspended' } },
    );
    expect((await t.agent.get('/api/v1/auth/user/me')).status).toBe(403);
  });
});