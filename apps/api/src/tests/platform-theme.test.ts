import { describe, expect, it } from 'vitest';
import { AuditLog, PlatformSetting } from '@smm/database';
import { AUDIT_ACTIONS } from '@smm/types';
import {
  testApp,
  loginAdmin,
  loginSuperAdmin,
  createAdminViaApi,
} from './helpers';

describe('public platform theme endpoint', () => {
  it('returns the default platform theme without authentication', async () => {
    const t = testApp();
    const res = await t.agent.get('/api/v1/theme').expect(200);
    expect(res.body.data.theme).toBe('modern-light');
  });

  it('reflects the theme chosen by the super admin', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    await sa.agent.patch('/api/v1/super-admin/platform-theme').send({ theme: 'ocean-aurora' }).expect(200);

    const t = testApp();
    const res = await t.agent.get('/api/v1/theme').expect(200);
    expect(res.body.data.theme).toBe('ocean-aurora');
    expect(res.body.data.updatedAt).toBeTruthy();
  });
});

describe('super admin platform theme control', () => {
  it('persists, rolls out to every admin panel + user panel default, and audits', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const adminA = await createAdminViaApi(sa);
    const adminB = await createAdminViaApi(sa);

    const before = await sa.agent.get('/api/v1/super-admin/platform-theme').expect(200);
    const previousTheme: string = before.body.data.theme;

    const res = await sa.agent.patch('/api/v1/super-admin/platform-theme').send({ theme: 'vibrant-neon' }).expect(200);
    expect(res.body.data.theme).toBe('vibrant-neon');

    const stored = await PlatformSetting.findOne({ key: 'platformTheme' }).lean();
    expect(stored).toMatchObject({ value: 'vibrant-neon' });

    for (const admin of [adminA, adminB]) {
      const t = testApp();
      await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
      const adminTheme = await t.agent.get('/api/v1/admin/theme').expect(200);
      expect(adminTheme.body.data.theme).toBe('vibrant-neon');
      const userTheme = await t.agent.get('/api/v1/admin/user-theme').expect(200);
      expect(userTheme.body.data.theme).toBe('vibrant-neon');
    }

    const entry = await AuditLog.findOne({ action: AUDIT_ACTIONS.SUPER_ADMIN_CHANGED_PLATFORM_THEME })
      .sort({ createdAt: -1 })
      .lean();
    expect(entry).toBeTruthy();
    expect(entry).toMatchObject({ actorRole: 'super_admin', targetType: 'settings', targetId: 'platform' });
    expect(entry!.metadata).toMatchObject({ previousTheme, newTheme: 'vibrant-neon' });
  });

  it('rollout does not clobber an admin panel theme restricted by the super admin', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);

    // Lock this tenant to modern-light only.
    await sa.agent
      .patch(`/api/v1/super-admin/admin-themes/${admin.adminId}`)
      .send({ theme: 'modern-light', enabledThemes: ['modern-light'], defaultTheme: 'modern-light' })
      .expect(200);

    // Global rollout to a theme the tenant does not enable is stored for user
    // panels, but resolution still falls back to the tenant default.
    await sa.agent.patch('/api/v1/super-admin/platform-theme').send({ theme: 'sunset-tropical' }).expect(200);

    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    const adminTheme = await t.agent.get('/api/v1/admin/theme').expect(200);
    expect(adminTheme.body.data.theme).toBe('sunset-tropical');
    expect(adminTheme.body.data.enabledThemes).toEqual(['modern-light']);
  });

  it('rejects an unknown theme with 422', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const res = await sa.agent.patch('/api/v1/super-admin/platform-theme').send({ theme: 'neon' });
    expect(res.status).toBe(422);
  });

  it('requires super admin authentication', async () => {
    const t = testApp();
    await t.agent.get('/api/v1/super-admin/platform-theme').expect(401);
  });
});

describe('admin panel theme changes', () => {
  it('main admin can change the tenant admin panel theme and it is audited', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);

    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);

    const before = await t.agent.get('/api/v1/admin/theme').expect(200);
    expect(before.body.data.theme).toBe('modern-light');

    const res = await t.agent.patch('/api/v1/admin/theme').send({ theme: 'vibrant-neon' }).expect(200);
    expect(res.body.data.theme).toBe('vibrant-neon');

    const after = await t.agent.get('/api/v1/admin/theme').expect(200);
    expect(after.body.data.theme).toBe('vibrant-neon');

    const entry = await AuditLog.findOne({ action: AUDIT_ACTIONS.ADMIN_CHANGED_PANEL_THEME })
      .sort({ createdAt: -1 })
      .lean();
    expect(entry).toBeTruthy();
    expect(entry).toMatchObject({ actorRole: 'admin', targetType: 'admin' });
    expect(entry!.metadata).toMatchObject({ previousTheme: 'modern-light', newTheme: 'vibrant-neon' });
  });

  it('cannot activate a theme the super admin disabled for the tenant', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const admin = await createAdminViaApi(sa);
    await sa.agent
      .patch(`/api/v1/super-admin/admin-themes/${admin.adminId}`)
      .send({ theme: 'modern-light', enabledThemes: ['modern-dark'], defaultTheme: 'modern-dark' })
      .expect(200);

    const t = testApp();
    await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    await t.agent.patch('/api/v1/admin/theme').send({ theme: 'ocean-aurora' }).expect(422);

    const ok = await t.agent.patch('/api/v1/admin/theme').send({ theme: 'modern-dark' }).expect(200);
    expect(ok.body.data.theme).toBe('modern-dark');
  });

  it('sub admin cannot change the admin panel theme', async () => {
    const sa = testApp();
    await loginSuperAdmin(sa);
    const main = await createAdminViaApi(sa);

    const subEmail = `sub_theme_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.test`;
    const subPhone = `+1202${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
    const t = testApp();
    await loginAdmin(t, main.email, main.password, main.licenseKey);
    const created = await t.agent
      .post('/api/v1/admin/sub-admins')
      .send({
        name: 'Sub Theme Admin',
        email: subEmail,
        phone: subPhone,
        password: 'SubPass#2024!',
        confirmPassword: 'SubPass#2024!',
        adminScopes: [],
      })
      .expect(201);

    const subId = created.body.data.admin.id as string;
    const sub = testApp();
    await loginAdmin(sub, subEmail, 'SubPass#2024!', main.licenseKey);

    const get = await sub.agent.get('/api/v1/admin/theme').expect(200);
    expect(get.body.data.theme).toBe('modern-light');

    const res = await sub.agent.patch('/api/v1/admin/theme').send({ theme: 'modern-dark' });
    expect(res.status).toBe(403);
  });

  it('requires an authenticated admin', async () => {
    const t = testApp();
    await t.agent.patch('/api/v1/admin/theme').send({ theme: 'modern-dark' }).expect(401);
  });
});