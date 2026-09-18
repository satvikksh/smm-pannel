import { describe, expect, it } from 'vitest';
import { License, User } from '@smm/database';
import {
  testApp,
  loginSuperAdmin,
  createAdminViaApi,
  loginAdmin,
  loginUser,
  registerUser,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  PW,
  type TestAgent,
} from './helpers';

/** Create an admin through the Super Admin API, then strip its license. */
async function createUnlicensedAdmin(t: TestAgent, email: string) {
  const admin = await createAdminViaApi(t, email);
  await License.deleteOne({ _id: admin.licenseId });
  await User.updateOne({ _id: admin.adminId }, { $set: { licenseId: null } });
  return admin;
}

describe('admin license login gate (§23, §24)', () => {
  it('creates an admin with an active license; the key unlocks login and licensed routes', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'lc_create@example.test');
    expect(admin.licenseKey).toMatch(/^SMM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const list = await t.agent.get('/api/v1/super-admin/licenses');
    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBeGreaterThanOrEqual(1);

    const login = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(login.status).toBe(200);
    expect(login.body.data.licenseValid).toBe(true);
    expect(login.body.data.license.status).toBe('active');
    expect(login.body.data.license.id).toBe(admin.licenseId);

    const me = await t.agent.get('/api/v1/auth/admin/me');
    expect(me.status).toBe(200);
    expect(me.body.data.licenseValid).toBe(true);

    expect((await t.agent.get('/api/v1/admin/users')).status).toBe(200);
  });

  it('binds the license key to the account on login (no separate activation needed)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'lc_bind@example.test');
    await User.updateOne({ _id: admin.adminId }, { $set: { licenseId: null } });

    const login = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(login.status).toBe(200);
    expect(login.body.data.licenseValid).toBe(true);

    const linked = await User.findById(admin.adminId).lean();
    expect(String(linked?.licenseId)).toBe(admin.licenseId);
    expect((await t.agent.get('/api/v1/admin/users')).status).toBe(200);
  });

  it('rejects login when no license is assigned to the admin (403)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createUnlicensedAdmin(t, 'lc_none@example.test');

    const login = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('LICENSE_INVALID');
    expect(login.body.error.message).toMatch(/No license is assigned to this admin/i);
  });

  it('rejects an unrecognised license key at login (403)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'lc_bogus@example.test');

    const login = await loginAdmin(t, admin.email, admin.password, 'SMM-0000-0000-0000-0000');
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('LICENSE_INVALID');
    expect(login.body.error.message).toMatch(/Invalid license key/i);
  });

  it("rejects another admin's license key at login (403, no cross-admin reuse)", async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const owner = await createAdminViaApi(t, 'lc_owner@example.test');
    const thief = await createAdminViaApi(t, 'lc_thief@example.test');

    const login = await loginAdmin(t, thief.email, thief.password, owner.licenseKey);
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('LICENSE_INVALID');
    expect(login.body.error.message).toMatch(/not assigned to this admin/i);
  });

  it('rejects an expired license at login (403)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'lc_expire@example.test');
    await License.updateOne(
      { _id: admin.licenseId },
      { $set: { status: 'expired', expiresAt: new Date(Date.now() - 1000) } },
    );

    const login = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('LICENSE_INVALID');
    expect(login.body.error.message).toMatch(/expired/i);
  });

  it('rejects a suspended license at login (403)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'lc_suspend@example.test');

    const suspend = await t.agent
      .patch(`/api/v1/super-admin/licenses/${admin.licenseId}/status`)
      .send({ status: 'suspended', reason: 'Test suspension' });
    expect(suspend.status).toBe(200);

    const login = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('LICENSE_INVALID');
    expect(login.body.error.message).toMatch(/suspended/i);
  });

  it('rejects a revoked license at login (403)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'lc_revoke@example.test');

    const revoke = await t.agent
      .patch(`/api/v1/super-admin/licenses/${admin.licenseId}/status`)
      .send({ status: 'revoked', reason: 'Test revocation' });
    expect(revoke.status).toBe(200);

    const login = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('LICENSE_INVALID');
    expect(login.body.error.message).toMatch(/revoked/i);
  });

  it('does not create a session when the license is rejected', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'lc_nosession@example.test');

    expect((await loginAdmin(t, admin.email, admin.password, 'SMM-0000-0000-0000-0000')).status).toBe(403);

    const me = await t.agent.get('/api/v1/auth/admin/me');
    expect(me.status).toBe(401);
    const protectedRoute = await t.agent.get('/api/v1/admin/users');
    expect([401, 403]).toContain(protectedRoute.status);
  });

  it('a suspended admin account is blocked even with a valid license (403)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'lc_admin_susp@example.test');

    await User.updateOne({ _id: admin.adminId }, { $set: { status: 'suspended' } });

    const relogin = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(relogin.status).toBe(403);

    const superCheck = await t.agent
      .patch(`/api/v1/super-admin/admins/${admin.adminId}/status`)
      .send({ status: 'active' });
    expect(superCheck.status).toBe(200);
    expect((await loginAdmin(t, admin.email, admin.password, admin.licenseKey)).status).toBe(200);
  });

  it('renewing a suspended license restores login access', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'lc_renew@example.test');

    await t.agent.patch(`/api/v1/super-admin/licenses/${admin.licenseId}/status`).send({ status: 'suspended' });
    const blocked = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(blocked.status).toBe(403);

    const renew = await t.agent
      .post(`/api/v1/super-admin/licenses/${admin.licenseId}/renew`)
      .send({ durationDays: 90 });
    expect(renew.status).toBe(200);
    expect(renew.body.data.license.status).toBe('active');

    const relogin = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(relogin.status).toBe(200);
    expect(relogin.body.data.licenseValid).toBe(true);
    expect((await t.agent.get('/api/v1/admin/users')).status).toBe(200);
  });

  it('a normal user cannot authenticate as an admin (403)', async () => {
    const t = testApp();
    await registerUser(t, { email: 'lc_ghost@example.test' });
    await loginUser(t, 'lc_ghost@example.test', PW);
    const res = await t.agent
      .post('/api/v1/auth/admin/login')
      .send({ email: 'lc_ghost@example.test', password: PW, licenseKey: 'SMM-0000-0000-0000-0000' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Only admin accounts/i);
  });

  it('rejects the Super Admin environment credentials on the admin portal (403)', async () => {
    const t = testApp();
    const res = await loginAdmin(t, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, 'SMM-0000-0000-0000-0000');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Only admin accounts/i);
  });
});
