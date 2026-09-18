import { describe, expect, it } from 'vitest';
import { testApp, registerUser, loginUser, loginAdmin, loginSuperAdmin, createAdminViaApi, PW } from './helpers';

describe('role separation (§24)', () => {
  it('a user cannot reach admin or super-admin portals', async () => {
    const t = testApp();
    await registerUser(t, { email: 'sep_user@example.test' });
    await loginUser(t, 'sep_user@example.test', PW);

    const adminRoot = await t.agent.get('/api/v1/admin/users');
    expect([401, 403]).toContain(adminRoot.status);

    const superRoot = await t.agent.get('/api/v1/super-admin/admins');
    expect([401, 403]).toContain(superRoot.status);
  });

  it('an admin cannot reach super-admin portals (403)', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa, 'sep_admin@example.test');

    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);

    const res = await t.agent.get('/api/v1/super-admin/licenses');
    expect([401, 403]).toContain(res.status);

    const userSide = await t.agent.get('/api/v1/user/catalog/services');
    expect([401, 403]).toContain(userSide.status);
  });

  it('super-admin tokens are rejected on admin + user portals (403)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);

    const adminRes = await t.agent.get('/api/v1/admin/users');
    expect([401, 403]).toContain(adminRes.status);

    const userRes = await t.agent.get('/api/v1/user/catalog/services');
    expect([401, 403]).toContain(userRes.status);
  });

  it('guards fail closed for completely unknown routes on protected routers (404)', async () => {
    const t = testApp();
    const res = await t.agent.get('/api/v1/admin/definitely-not-a-route');
    expect([401, 403, 404]).toContain(res.status);
  });
});