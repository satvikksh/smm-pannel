import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { jwt } from '@smm/security';
import { User } from '@smm/database';
import {
  testApp,
  registerUser,
  loginUser,
  loginAdmin,
  loginSuperAdmin,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  PW,
} from './helpers';

describe('auth flows (§24)', () => {
  it('registers a user, creates a wallet, and logs in', async () => {
    const t = testApp();
    const { status, body } = await registerUser(t, { email: 'wallet@example.test' });
    expect(status).toBe(201);
    expect(body.data.user.email).toBe('wallet@example.test');
    expect(body.data.user.role).toBe('user');
    expect(body.data.wallet.balance).toBe(0);

    const login = await loginUser(t, 'wallet@example.test', PW);
    expect(login.status).toBe(200);
    expect(login.body.data.user.status).toBe('active');

    const me = await t.agent.get('/api/v1/auth/user/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('wallet@example.test');

    const profile = await t.agent.patch('/api/v1/auth/user/me').send({ name: 'Renamed' });
    expect(profile.status).toBe(200);
    expect(profile.body.data.user.name).toBe('Renamed');

    const pass = await t.agent.post('/api/v1/auth/user/me/password').send({
      currentPassword: PW,
      newPassword: 'Changed!2026',
      confirmPassword: 'Changed!2026',
    });
    expect(pass.status).toBe(200);
  });

  it('rejects a duplicate email at registration (409)', async () => {
    const t = testApp();
    await registerUser(t, { email: 'dupe@example.test' });
    const second = await registerUser(t, { email: 'dupe@example.test' });
    expect(second.status).toBe(409);
  });

  it('rejects wrong credentials (401)', async () => {
    const t = testApp();
    const res = await loginUser(t, 'ghost@example.test', 'wrongpassword');
    expect(res.status).toBe(401);
  });

  it('rejects super-admin credentials on the user portal (401)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const res = await t.agent
      .post('/api/v1/auth/user/login')
      .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rejects super-admin credentials on the admin portal (403)', async () => {
    const t = testApp();
    const res = await loginAdmin(t, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, 'SMM-0000-0000-0000-0000');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Only admin accounts/i);
  });

  it('authenticates the Super Admin from environment credentials', async () => {
    const t = testApp();
    const res = await loginSuperAdmin(t);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('super_admin');

    const me = await t.agent.get('/api/v1/auth/super-admin/me');
    expect(me.status).toBe(200);
  });

  it('rejects a wrong Super Admin password (401)', async () => {
    const t = testApp();
    const res = await t.agent
      .post('/api/v1/auth/super-admin/login')
      .send({ email: SUPER_ADMIN_EMAIL, password: 'definitely-not-the-password' });
    expect(res.status).toBe(401);
  });

  it('recreates the Super Admin identity from env when no DB user exists', async () => {
    await User.deleteMany({ role: 'super_admin' });
    const t = testApp();
    const res = await loginSuperAdmin(t);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('super_admin');
    expect(await User.countDocuments({ role: 'super_admin' })).toBe(1);
  });

  it('refreshes and logs out the Super Admin session', async () => {
    const t = testApp();
    await loginSuperAdmin(t);

    const refresh = await t.agent.post('/api/v1/auth/super-admin/refresh');
    expect(refresh.status).toBe(200);

    const out = await t.agent.post('/api/v1/auth/super-admin/logout');
    expect(out.status).toBe(200);

    const after = await t.agent.post('/api/v1/auth/super-admin/refresh');
    expect(after.status).toBe(401);
  });

  it('rotates the session on refresh', async () => {
    const t = testApp();
    await registerUser(t, { email: 'refreshme@example.test' });
    const refresh = await t.agent.post('/api/v1/auth/user/refresh');
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.user.email).toBe('refreshme@example.test');
    const me = await t.agent.get('/api/v1/auth/user/me');
    expect(me.status).toBe(200);
  });

  it('requires an access token for /me (401)', async () => {
    const t = testApp();
    const res = await request(t.app).get('/api/v1/auth/user/me');
    expect(res.status).toBe(401);
  });

  it('rejects an expired access token (401)', async () => {
    const t = testApp();
    const { body } = await registerUser(t, { email: 'expired@example.test' });
    const expired = jwt.sign(
      { sub: body.data.user.id, role: 'user', type: 'access' },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: '-1m', audience: 'smm-panel', issuer: 'smm-panel-api' },
    );
    const res = await request(t.app).get('/api/v1/auth/user/me').set('Cookie', `smm_us_access=${expired}`);
    expect(res.status).toBe(401);
  });

  it('rejects a forged token with wrong role claim (403)', async () => {
    const t = testApp();
    const { body } = await registerUser(t, { email: 'forged@example.test' });
    const forged = jwt.sign(
      { sub: body.data.user.id, role: 'admin', type: 'access' },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: '5m', audience: 'smm-panel', issuer: 'smm-panel-api' },
    );
    const res = await request(t.app).get('/api/v1/auth/user/me').set('Cookie', `smm_us_access=${forged}`);
    expect(res.status).toBe(403);
  });

  it('logs out and invalidates the refresh session', async () => {
    const t = testApp();
    await registerUser(t, { email: 'logout@example.test' });
    const out = await t.agent.post('/api/v1/auth/user/logout');
    expect(out.status).toBe(200);
    const refresh = await t.agent.post('/api/v1/auth/user/refresh');
    expect(refresh.status).toBe(401);
  });
});