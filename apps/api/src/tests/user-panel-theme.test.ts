import { describe, expect, it } from 'vitest';
import { AuditLog, User, UserThemeSettings, UserThemePreference } from '@smm/database';
import { ADMIN_SCOPES, AUDIT_ACTIONS } from '@smm/types';
import {
  testApp,
  registerUser,
  loginUser,
  loginAdmin,
  loginSuperAdmin,
  createAdminViaApi,
  PW,
  type TestAgent,
} from './helpers';

function superAdminSetsAdminThemes(
  sa: TestAgent,
  adminId: string,
  body: { theme: string; enabledThemes: string[]; defaultTheme: string },
) {
  return sa.agent.patch(`/api/v1/super-admin/admin-themes/${adminId}`).send(body);
}

describe('super admin admin-theme control', () => {
  it('defaults an admin to modern-light with all themes enabled', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);

    const res = await sa.agent.get('/api/v1/super-admin/admin-themes').expect(200);
    const found = res.body.data.items.find((item: { id: string }) => item.id === admin.adminId);
    expect(found).toBeTruthy();
    expect(found.adminTheme).toMatchObject({ theme: 'modern-light' });
    expect(found.adminTheme.enabledThemes).toContain('modern-dark');
    expect(found.userPanel).toMatchObject({ theme: 'modern-light', allowUserOverride: false });
  });

  it('super admin can change the admin panel theme and restrict user panel themes', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);

    await superAdminSetsAdminThemes(sa, admin.adminId, {
      theme: 'modern-dark',
      enabledThemes: ['modern-dark'],
      defaultTheme: 'modern-dark',
    }).expect(200);

    const res = await sa.agent.get(`/api/v1/super-admin/admin-themes/${admin.adminId}`).expect(200);
    expect(res.body.data.adminTheme).toMatchObject({ theme: 'modern-dark' });
    expect(res.body.data.adminTheme.enabledThemes).toEqual(['modern-dark']);

    const entry = await AuditLog.findOne({ action: AUDIT_ACTIONS.SUPER_ADMIN_CHANGED_ADMIN_THEME })
      .sort({ createdAt: -1 })
      .lean();
    expect(entry).toBeTruthy();
    expect(entry).toMatchObject({ actorRole: 'super_admin', targetType: 'admin', targetId: admin.adminId });
    expect(entry!.metadata).toMatchObject({ previousTheme: 'modern-light', newTheme: 'modern-dark' });
  });

  it('rejects an unknown admin id', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const res = await superAdminSetsAdminThemes(sa, 'ffffffffffffffffffffffff', {
      theme: 'modern-dark',
      enabledThemes: ['modern-dark'],
      defaultTheme: 'modern-dark',
    });
    expect(res.status).toBe(404);
  });

  it('rejects an unknown theme value with 422', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);
    const res = await sa.agent
      .patch(`/api/v1/super-admin/admin-themes/${admin.adminId}`)
      .send({ theme: 'neon', enabledThemes: ['modern-light'], defaultTheme: 'modern-light' });
    expect(res.status).toBe(422);
  });

  it('requires super admin authentication', async () => {
    const t = testApp();
    const res = await t.agent.get('/api/v1/super-admin/admin-themes');
    expect(res.status).toBe(401);
  });
});

describe('tenant user panel theme control', () => {
  it('main admin sees defaults and can activate an allowed theme (audited)', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);

    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);

    const get = await t.agent.get('/api/v1/admin/user-theme').expect(200);
    expect(get.body.data).toMatchObject({ theme: 'modern-light', allowUserOverride: false });

    const res = await t.agent
      .patch('/api/v1/admin/user-theme')
      .send({ theme: 'modern-dark', allowUserOverride: true })
      .expect(200);
    expect(res.body.data).toMatchObject({ theme: 'modern-dark', allowUserOverride: true });

    const entry = await AuditLog.findOne({ action: AUDIT_ACTIONS.ADMIN_CHANGED_USER_THEME })
      .sort({ createdAt: -1 })
      .lean();
    expect(entry).toBeTruthy();
    expect(entry).toMatchObject({ actorRole: 'admin', targetType: 'admin' });
    expect(entry!.metadata).toMatchObject({ newTheme: 'modern-dark', newAllowUserOverride: true });
  });

  it('main admin cannot activate a theme disabled by the super admin', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);
    await superAdminSetsAdminThemes(sa, admin.adminId, {
      theme: 'modern-light',
      enabledThemes: ['modern-dark'],
      defaultTheme: 'modern-dark',
    }).expect(200);

    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    await t.agent.patch('/api/v1/admin/user-theme').send({ theme: 'modern-light', allowUserOverride: true }).expect(422);
    const ok = await t.agent
      .patch('/api/v1/admin/user-theme')
      .send({ theme: 'modern-dark', allowUserOverride: true })
      .expect(200);
    expect(ok.body.data.theme).toBe('modern-dark');
  });
});

describe('admin panel theme endpoint', () => {
  it('returns the admin panel theme for the tenant', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);

    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    const res = await t.agent.get('/api/v1/admin/theme').expect(200);
    expect(res.body.data).toMatchObject({ theme: 'modern-light' });

    await superAdminSetsAdminThemes(sa, admin.adminId, {
      theme: 'premium-gradient',
      enabledThemes: ['modern-light', 'modern-dark'],
      defaultTheme: 'modern-light',
    }).expect(200);
    const res2 = await t.agent.get('/api/v1/admin/theme').expect(200);
    expect(res2.body.data.theme).toBe('premium-gradient');
  });
});

describe('tenant user resolution and overrides', () => {
  async function claimUserInto(sa: TestAgent, admin: { email: string; password: string; licenseKey: string }, userEmail: string) {
    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    await t.agent.post('/api/v1/admin/users/claim').send({ email: userEmail }).expect(200);
    return t;
  }

  it('an unassigned user gets the default theme; a tenant user gets the tenant theme', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);
    await superAdminSetsAdminThemes(sa, admin.adminId, {
      theme: 'modern-light',
      enabledThemes: ['modern-dark'],
      defaultTheme: 'modern-dark',
    }).expect(200);

    const guestT = testApp();
    await registerUser(guestT, { email: 'guest_resolve@example.test' });
    await loginUser(guestT, 'guest_resolve@example.test', PW);
    const guest = await guestT.agent.get('/api/v1/user/theme').expect(200);
    expect(guest.body.data).toMatchObject({ theme: 'modern-light', source: 'default', allowUserOverride: false });

    const owner = testApp();
    await registerUser(owner, { email: 'owned_resolve@example.test' });
    await loginUser(owner, 'owned_resolve@example.test', PW);
    await claimUserInto(sa, admin, 'owned_resolve@example.test');

    const owned = await owner.agent.get('/api/v1/user/theme').expect(200);
    expect(owned.body.data).toMatchObject({ theme: 'modern-dark', source: 'tenant', allowUserOverride: false });
    expect(owned.body.data.availableThemes).toEqual(['modern-dark']);
  });

  it('a user can set an override only when their admin allows it, and it is audited', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);

    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    await t.agent.patch('/api/v1/admin/user-theme').send({ theme: 'modern-light', allowUserOverride: true }).expect(200);

    const u = testApp();
    await registerUser(u, { email: 'override_user@example.test' });
    await loginUser(u, 'override_user@example.test', PW);
    await claimUserInto(sa, admin, 'override_user@example.test');

    const res = await u.agent.patch('/api/v1/user/theme').send({ theme: 'modern-dark' }).expect(200);
    expect(res.body.data).toMatchObject({ overrideApplied: true, source: 'override', theme: 'modern-dark' });

    const stored = await u.agent.get('/api/v1/user/theme').expect(200);
    expect(stored.body.data).toMatchObject({ theme: 'modern-dark', overrideApplied: true, source: 'override' });

    const pref = await UserThemePreference.findOne({ userId: { $ne: null } })
      .sort({ updatedAt: -1 })
      .lean();
    expect(pref).toBeTruthy();

    const entry = await AuditLog.findOne({ action: AUDIT_ACTIONS.USER_THEME_OVERRIDE_CHANGED })
      .sort({ createdAt: -1 })
      .lean();
    expect(entry).toBeTruthy();
    expect(entry!.metadata).toMatchObject({ theme: 'modern-dark' });
  });

  it('a user cannot override when the admin disables overrides', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);

    const u = testApp();
    await registerUser(u, { email: 'no_override@example.test' });
    await loginUser(u, 'no_override@example.test', PW);
    await claimUserInto(sa, admin, 'no_override@example.test');

    const res = await u.agent.patch('/api/v1/user/theme').send({ theme: 'modern-dark' });
    expect(res.status).toBe(403);
  });

  it('a user with no tenant cannot override', async () => {
    const t = testApp();
    await registerUser(t, { email: 'orphan_override@example.test' });
    await loginUser(t, 'orphan_override@example.test', PW);
    const res = await t.agent.patch('/api/v1/user/theme').send({ theme: 'modern-dark' });
    expect(res.status).toBe(403);
  });

  it('persists the tenant theme in the database', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);

    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    await t.agent.patch('/api/v1/admin/user-theme').send({ theme: 'premium-gradient', allowUserOverride: false }).expect(200);

    const stored = await UserThemeSettings.findOne({ _id: admin.adminId }).lean();
    expect(stored).toMatchObject({ theme: 'premium-gradient', allowUserOverride: false });
  });
});

describe('tenant isolation', () => {
  it('admins only see their own tenant users', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const adminA = await createAdminViaApi(sa);
    const adminB = await createAdminViaApi(sa);

    const a = testApp();
    await loginAdmin(a, adminA.email, adminA.password, adminA.licenseKey);
    await a.agent.post('/api/v1/admin/users').send({
      name: 'Tenant A User',
      email: 'tenant_a@example.test',
      phone: '+12025550111',
      password: PW,
      confirmPassword: PW,
    }).expect(201);

    const b = testApp();
    await loginAdmin(b, adminB.email, adminB.password, adminB.licenseKey);
    const res = await b.agent.get('/api/v1/admin/users').expect(200);
    expect(res.body.data.total).toBe(0);

    const resA = await a.agent.get('/api/v1/admin/users').expect(200);
    expect(resA.body.data.total).toBe(1);
    expect(resA.body.data.items[0].email).toBe('tenant_a@example.test');
  });

  it('an admin cannot change the status of a user from another tenant', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const adminA = await createAdminViaApi(sa);

    const a = testApp();
    await loginAdmin(a, adminA.email, adminA.password, adminA.licenseKey);
    const created = await a.agent.post('/api/v1/admin/users').send({
      name: 'Tenant A User',
      email: 'stranger@example.test',
      phone: '+12025550112',
      password: PW,
      confirmPassword: PW,
    }).expect(201);
    const userId = created.body.data.user.id;

    const adminB = await createAdminViaApi(sa);
    const b = testApp();
    await loginAdmin(b, adminB.email, adminB.password, adminB.licenseKey);
    const res = await b.agent.patch(`/api/v1/admin/users/${userId}/status`).send({ status: 'suspended' });
    expect(res.status).toBe(404);
  });
});

describe('sub admins (partial admins)', () => {
  async function setup(opts: { scopes?: string[] } = {}) {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const main = await createAdminViaApi(sa);

    const subEmail = `partial_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.test`;
    const subPhone = `+1202${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
    const t = testApp();
    await loginAdmin(t, main.email, main.password, main.licenseKey);
    const created = await t.agent
      .post('/api/v1/admin/sub-admins')
      .send({
        name: 'Partial Admin',
        email: subEmail,
        phone: subPhone,
        password: PW,
        confirmPassword: PW,
        adminScopes: opts.scopes ?? [ADMIN_SCOPES.MANAGE_USER_THEME, ADMIN_SCOPES.VIEW_USERS],
      })
      .expect(201);
    const subId = created.body.data.admin.id as string;

    const sub = testApp();
    const subLogin = await loginAdmin(sub, subEmail, PW, main.licenseKey);
    expect(subLogin.status).toBe(200);
    return { sa, main, t, subId, sub, subEmail };
  }

  it('a main admin can create a sub admin and list them', async () => {
    const { t, subEmail } = await setup();
    const res = await t.agent.get('/api/v1/admin/sub-admins').expect(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].email).toBe(subEmail);
  });

  it('only the main admin can manage sub admins', async () => {
    const { sub } = await setup();
    const res = await sub.agent.get('/api/v1/admin/sub-admins');
    expect(res.status).toBe(403);
  });

  it('a sub admin can update the theme for an assigned user (audited as partial)', async () => {
    const { main, t, subId, sub } = await setup({
      scopes: [ADMIN_SCOPES.MANAGE_USER_THEME, ADMIN_SCOPES.MANAGE_USERS],
    });

    await t
      .agent
      .patch('/api/v1/admin/user-theme')
      .send({ theme: 'modern-light', allowUserOverride: false })
      .expect(200);

    // The sub admin creates the user, so that user is assigned to them.
    const user = await sub.agent
      .post('/api/v1/admin/users')
      .send({
        name: 'Assigned User',
        email: 'assigned@example.test',
        phone: '+12025550114',
        password: PW,
        confirmPassword: PW,
      })
      .expect(201);
    const userId = user.body.data.user.id as string;
    expect(user.body.data.user.assignedTo).toBe(subId);

    const res = await sub.agent
      .post('/api/v1/admin/user-theme/overrides')
      .send({ userId, theme: 'modern-dark' })
      .expect(200);
    expect(res.body.data).toMatchObject({ userId, theme: 'modern-dark' });

    const entry = await AuditLog.findOne({ action: AUDIT_ACTIONS.PARTIAL_ADMIN_CHANGED_USER_THEME })
      .sort({ createdAt: -1 })
      .lean();
    expect(entry).toBeTruthy();
    expect(entry!.metadata).toMatchObject({ theme: 'modern-dark' });

    const stored = await UserThemePreference.findOne({ userId }).lean();
    expect(stored).toMatchObject({ theme: 'modern-dark' });

    const row = await User.findById(userId).lean();
    expect(String(row!.adminId)).toBe(main.adminId);
    expect(String(row!.assignedTo)).toBe(subId);
  });

  it('a sub admin cannot touch users not assigned to them', async () => {
    const { t, sub } = await setup();

    const user = await t.agent
      .post('/api/v1/admin/users')
      .send({
        name: 'Unowned User',
        email: 'unowned@example.test',
        phone: '+12025550115',
        password: PW,
        confirmPassword: PW,
      })
      .expect(201);
    const userId = user.body.data.user.id as string;

    // Created by the main admin, so the sub admin is not the assignee → blocked.
    const res = await sub.agent
      .post('/api/v1/admin/user-theme/overrides')
      .send({ userId, theme: 'modern-dark' });
    expect([403, 404]).toContain(res.status);
  });

  it('a sub admin without viewUsers cannot list users', async () => {
    const { sub } = await setup({ scopes: [ADMIN_SCOPES.MANAGE_USER_THEME] });
    const res = await sub.agent.get('/api/v1/admin/users');
    expect(res.status).toBe(403);
  });

  it('a sub admin with access cannot list another tenant', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const other = await createAdminViaApi(sa);
    const otherAdmin = testApp();
    await loginAdmin(otherAdmin, other.email, other.password, other.licenseKey);
    const canary = await otherAdmin.agent.post('/api/v1/admin/users').send({
      name: 'Other Tenant User',
      email: 'other_tenant@example.test',
      phone: '+12025550116',
      password: PW,
      confirmPassword: PW,
    }).expect(201);
    const canaryId = canary.body.data.user.id as string;

    const { sub } = await setup({ scopes: [ADMIN_SCOPES.VIEW_USERS] });
    const list = await sub.agent.get('/api/v1/admin/users').expect(200);
    expect(list.body.data.total).toBe(0);
    expect(list.body.data.items.length).toBe(0);
    await sub.agent.get(`/api/v1/admin/users/${canaryId}`).expect(404);
  });
});