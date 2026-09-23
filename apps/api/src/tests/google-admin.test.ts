import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AuditLog, User } from '@smm/database';
import {
  testApp,
  registerUser,
  loginUser,
  loginSuperAdmin,
  createAdminViaApi,
  PW,
} from './helpers';

/**
 * Google OAuth exclusive to the ADMIN panel (mounted at /api/auth/admin).
 *
 * Same stub technique as google-auth.test.ts: the router exchanges the code and
 * fetches userinfo through `globalThis.fetch`, which the test swaps for a fake
 * Google endpoint. Account resolution, approval gating, session issuance, audit
 * and redirects run exactly as in production. The OAuth dance and the resulting
 * session are first-party to the Admin panel origin (localhost:3001 in tests).
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
}

let scenario: GoogleScenario | null = null;
let originalFetch: typeof fetch;

function b64url(input: unknown): string {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function makeIdToken(s: GoogleScenario): string {
  const payload = {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    azp: CLIENT_ID,
    sub: s.sub,
    email: s.email,
    email_verified: s.emailVerified !== false,
  };
  return `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(payload)}.sig`;
}

async function stubFetch(input: string | URL | Request, _init?: RequestInit): Promise<Response> {
  const s = scenario!;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url === TOKEN_URL) {
    return new Response(
      JSON.stringify({ access_token: 'at', token_type: 'Bearer', id_token: makeIdToken(s) }),
      { status: s.tokenStatus ?? 200, headers: { 'content-type': 'application/json' } },
    );
  }

  if (url === USERINFO_URL) {
    return new Response(
      JSON.stringify({
        sub: s.sub,
        name: 'Google Admin',
        picture: 'https://example.test/avatar.png',
        email: s.email,
        email_verified: s.emailVerified !== false,
        iss: 'https://accounts.google.com',
        aud: CLIENT_ID,
        azp: CLIENT_ID,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  throw new Error(`Unexpected fetch in google admin test: ${url}`);
}

async function startAdminOAuth(agent: Agent): Promise<string> {
  const res = await agent.get('/api/auth/admin/google').redirects(0);
  expect(res.status).toBe(302);
  const location = res.headers.location as string;
  expect(location).toContain('accounts.google.com');
  const url = new URL(location);
  expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3001/api/auth/admin/google/callback');
  const state = url.searchParams.get('state')!;
  expect(state.length).toBeGreaterThan(40);
  return state;
}

async function adminCallback(agent: Agent, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return agent.get(`/api/auth/admin/google/callback${qs ? `?${qs}` : ''}`).redirects(0);
}

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  process.env.GOOGLE_CLIENT_SECRET = CLIENT_SECRET;
  process.env.GOOGLE_ADMIN_REDIRECT_URI = 'http://localhost:3001/api/auth/admin/google/callback';
  originalFetch = globalThis.fetch;
  globalThis.fetch = stubFetch as typeof fetch;
});

afterAll(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_ADMIN_REDIRECT_URI;
  globalThis.fetch = originalFetch;
});

describe('Google OAuth — admin panel (approval workflow)', () => {
  it('creates a PENDING admin from a new Google identity and issues NO session', async () => {
    const t = testApp();
    installScenario({ sub: 'ga1', email: 'new.google.admin@example.test' });

    const state = await startAdminOAuth(t.agent);
    const res = await adminCallback(t.agent, { code: 'one-time-code', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3001/login?google_error=pending');

    const db = await User.findOne({ email: 'new.google.admin@example.test' }).lean();
    expect(db).toBeTruthy();
    expect(db!.role).toBe('admin');
    expect(db!.status).toBe('pending');
    expect(db!.authProvider).toBe('google');
    expect(db!.googleId).toBe('ga1');
    expect(db!.emailVerified).toBe(true);
    expect(db!.passwordHash).toBe('');
    expect(db!.profileImage).toBe('https://example.test/avatar.png');

    // No session, no licensed area access.
    expect((await t.agent.get('/api/v1/auth/admin/me')).status).toBe(401);

    expect(await AuditLog.findOne({ action: 'admin.google.register' }).lean()).toBeTruthy();
  });

  it('an unapproved (pending) admin is never signed in again by Google', async () => {
    const t = testApp();
    installScenario({ sub: 'ga2', email: 'still.pending@example.test' });
    let state = await startAdminOAuth(t.agent);
    await adminCallback(t.agent, { code: 'c', state });

    installScenario({ sub: 'ga2', email: 'still.pending@example.test' });
    state = await startAdminOAuth(t.agent);
    const res = await adminCallback(t.agent, { code: 'c2', state });

    expect(res.headers.location).toBe('http://localhost:3001/login?google_error=pending');
    expect(await User.countDocuments({ googleId: 'ga2' })).toBe(1);
    // Still no session has ever been issued.
    expect((await t.agent.get('/api/v1/auth/admin/me')).status).toBe(401);
  });

  it('signs in an approved admin Google identity with a session (auto-detected license)', async () => {
    const t = testApp();
    installScenario({ sub: 'ga3', email: 'approved.google@example.test' });
    let state = await startAdminOAuth(t.agent);
    await adminCallback(t.agent, { code: 'c', state });

    // Approve the pending application WITH a license (the same Super Admin that
    // approves any registration).
    await loginSuperAdmin(t);
    const id = String((await User.findOne({ email: 'approved.google@example.test' }).lean())!._id);
    const approve = await t.agent
      .post(`/api/v1/super-admin/admin-requests/${id}/approve`)
      .send({ licenseDurationDays: 365, maxUsers: 100 });
    expect(approve.status).toBe(200);

    installScenario({ sub: 'ga3', email: 'approved.google@example.test' });
    state = await startAdminOAuth(t.agent);
    const res = await adminCallback(t.agent, { code: 'c2', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3001/dashboard');

    const me = await t.agent.get('/api/v1/auth/admin/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.status).toBe('active');
    expect(me.body.data.licenseValid).toBe(true);
    expect((await t.agent.get('/api/v1/admin/users')).status).toBe(200);
  });

  it('links an existing local admin to Google and keeps password login + license', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'link.admin@example.test');
    expect((await t.agent.post('/api/v1/auth/admin/login').send({ email: admin.email, password: `${PW}Admin` })).status).toBe(200);

    installScenario({ sub: 'ga4', email: admin.email });
    const state = await startAdminOAuth(t.agent);
    const res = await adminCallback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3001/dashboard');

    const db = await User.findOne({ email: admin.email }).lean();
    expect(db!.authProvider).toBe('local/google');
    expect(db!.googleId).toBe('ga4');
    expect(db!.role).toBe('admin');

    // The account still accepts its own password, role never changed.
    expect((await t.agent.post('/api/v1/auth/admin/login').send({ email: admin.email, password: `${PW}Admin` })).status).toBe(200);
    expect(await AuditLog.findOne({ action: 'admin.google.link' }).lean()).toBeTruthy();
  });

  it('refuses to link or create USER accounts via the admin Google flow (role-safe)', async () => {
    const t = testApp();
    const email = 'plain-user@example.test';
    await registerUser(t, { email });
    expect((await loginUser(t, email, PW)).status).toBe(200);

    installScenario({ sub: 'ga5', email });
    const state = await startAdminOAuth(t.agent);
    const res = await adminCallback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3001/login?google_error=role');

    const db = await User.findOne({ email }).lean();
    expect(db!.role).toBe('user');
    expect(db!.googleId).toBeNull();
    expect(db!.authProvider).toBe('local');
  });

  it('never creates an admin for the platform Super Admin email', async () => {
    const t = testApp();
    installScenario({ sub: 'ga6', email: process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@localhost.test' });
    const state = await startAdminOAuth(t.agent);
    const res = await adminCallback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3001/login?google_error=role');
    expect(await User.countDocuments({ googleId: 'ga6' })).toBe(0);
  });

  it('redirects a rejected admin to the rejection notice and never signs them in', async () => {
    const t = testApp();
    const email = 'rejected.google@example.test';
    installScenario({ sub: 'ga7', email });
    let state = await startAdminOAuth(t.agent);
    await adminCallback(t.agent, { code: 'c', state });

    await loginSuperAdmin(t);
    const id = String((await User.findOne({ email }).lean())!._id);
    await t.agent.post(`/api/v1/super-admin/admin-requests/${id}/reject`).send({ reason: 'Not a fit' });

    installScenario({ sub: 'ga7', email });
    state = await startAdminOAuth(t.agent);
    const res = await adminCallback(t.agent, { code: 'c2', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3001/login?google_error=rejected');
    expect((await t.agent.get('/api/v1/auth/admin/me')).status).toBe(401);
  });

  it('suspended status during Google sign-in maps to a blocked redirect and no session', async () => {
    const t = testApp();
    const email = 'suspended.admin@example.test';
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, email);
    await User.updateOne({ _id: admin.adminId }, { $set: { status: 'suspended' } });

    installScenario({ sub: 'ga8', email });
    const state = await startAdminOAuth(t.agent);
    const res = await adminCallback(t.agent, { code: 'c', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3001/login?google_error=blocked');
    expect((await t.agent.get('/api/v1/auth/admin/me')).status).toBe(401);
  });

  it('rejects a callback with a forged state (CSRF)', async () => {
    const t = testApp();
    const res = await adminCallback(t.agent, { code: 'c', state: 'forged-state' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_error=failed');
  });

  it('maps a cancelled flow (access_denied) to google_error=cancelled', async () => {
    const t = testApp();
    const res = await adminCallback(t.agent, { error: 'access_denied' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3001/login?google_error=cancelled');
  });

  it('fails closed when the code is unusable and creates no account', async () => {
    const t = testApp();
    installScenario({ sub: 'ga9', email: 'used.code.admin@example.test', tokenStatus: 400 });
    const state = await startAdminOAuth(t.agent);
    const res = await adminCallback(t.agent, { code: 'used-code', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_error=failed');
    expect(await User.countDocuments({ googleId: 'ga9' })).toBe(0);
  });
});

function installScenario(s: GoogleScenario): void {
  scenario = s;
}