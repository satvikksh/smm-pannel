import { describe, expect, it } from 'vitest';
import { AuditLog, License, User } from '@smm/database';
import {
  testApp,
  loginSuperAdmin,
  loginAdmin,
  SUPER_ADMIN_EMAIL,
  PW,
  type TestAgent,
} from './helpers';

function registerAdmin(t: TestAgent, overrides: { email?: string; phone?: string } = {}, password = `${PW}App`) {
  return t.agent.post('/api/v1/auth/admin/register').send({
    name: 'Applicant Admin',
    email: overrides.email ?? `req_${Date.now()}@example.test`,
    phone: overrides.phone ?? `+1${Math.floor(1e9 + Math.random() * 9e8).toString()}`,
    password,
    confirmPassword: password,
  });
}

describe('admin self-registration & approval workflow', () => {
  it('creates a pending admin, issues no session, and records the audit', async () => {
    const t = testApp();
    const res = await registerAdmin(t, { email: 'req_new@example.test' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.status).toBe('pending');
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.message).toMatch(/submitted for approval/i);

    const db = await User.findOne({ email: 'req_new@example.test' }).lean();
    expect(db!.status).toBe('pending');
    expect(db!.approvedBy).toBeNull();
    expect(db!.approvedAt).toBeNull();
    expect(db!.rejectionReason).toBeNull();

    // No session was issued: the applicant may not authenticate yet.
    expect((await t.agent.get('/api/v1/auth/admin/me')).status).toBe(401);
    expect((await loginAdmin(t, 'req_new@example.test', `${PW}App`)).status).toBe(403);
  });

  it('rejects duplicate email and duplicate phone (409)', async () => {
    const t = testApp();
    const first = await registerAdmin(t, { email: 'req_dup@example.test' });
    expect(first.status).toBe(201);

    const dupEmail = await registerAdmin(t, { email: 'req_dup@example.test' });
    expect(dupEmail.status).toBe(409);
    expect(dupEmail.body.error.code).toBe('CONFLICT');

    const dupPhone = await registerAdmin(t, { email: 'req_other@example.test', phone: first.body.data.user.phone });
    expect(dupPhone.status).toBe(409);
    expect(dupPhone.body.error.code).toBe('CONFLICT');
  });

  it('rejects an application using the platform Super Admin email (403)', async () => {
    const t = testApp();
    const res = await registerAdmin(t, { email: SUPER_ADMIN_EMAIL });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/cannot be used/i);
    expect(await User.countDocuments({ email: SUPER_ADMIN_EMAIL, role: 'admin' })).toBe(0);
  });

  it('validates the registration payload (400)', async () => {
    const t = testApp();
    const res = await registerAdmin(t, { email: 'bad' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists pending requests and reports counts for the Super Admin badge', async () => {
    const t = testApp();
    await loginSuperAdmin(t);

    const before = await t.agent.get('/api/v1/super-admin/admin-requests/count');
    expect(before.status).toBe(200);

    await registerAdmin(t, { email: 'req_list@example.test' });

    const count = await t.agent.get('/api/v1/super-admin/admin-requests/count');
    expect(count.status).toBe(200);
    expect(count.body.data.pending).toBeGreaterThanOrEqual(before.body.data.pending + 1);

    const list = await t.agent.get('/api/v1/super-admin/admin-requests?status=pending');
    expect(list.status).toBe(200);
    const found = list.body.data.items.find((i: { email: string }) => i.email === 'req_list@example.test');
    expect(found).toBeTruthy();
    expect(found.status).toBe('pending');

    const detail = await t.agent.get(`/api/v1/super-admin/admin-requests/${found.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.request.email).toBe('req_list@example.test');
  });

  it('approves without a license: admin becomes active but cannot log in until licensed', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const email = 'req_approved_nolic@example.test';
    await registerAdmin(t, { email });

    const list = await t.agent.get('/api/v1/super-admin/admin-requests?search=req_approved_nolic');
    const id = list.body.data.items[0].id;

    const approve = await t.agent.post(`/api/v1/super-admin/admin-requests/${id}/approve`).send({});
    expect(approve.status).toBe(200);
    expect(approve.body.data.admin.status).toBe('active');
    expect(approve.body.data.license).toBeNull();
    expect(approve.body.data.message).toMatch(/without a license/i);

    const db = await User.findOne({ email }).lean();
    expect(db!.status).toBe('active');
    expect(db!.approvedAt).toBeTruthy();
    expect(db!.approvedBy).toBeTruthy();
    expect(db!.approvedBy).not.toBe(String(db!._id)); // reviewer is the Super Admin, not the applicant

    // Active but unlicensed: the auto-detection reports the missing license.
    const blocked = await loginAdmin(t, email, `${PW}App`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('LICENSE_INVALID');
    expect(blocked.body.error.message).toMatch(/No license is assigned to this admin/i);
  });

  it('rejects a pending request with a reason that is surfaced at the rejected login', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const email = 'req_rejected@example.test';
    await registerAdmin(t, { email });

    const list = await t.agent.get('/api/v1/super-admin/admin-requests?search=req_rejected');
    const id = list.body.data.items[0].id;

    const reject = await t.agent.post(`/api/v1/super-admin/admin-requests/${id}/reject`).send({ reason: 'Missing business documentation.' });
    expect(reject.status).toBe(200);
    expect(reject.body.data.admin.status).toBe('rejected');

    const db = await User.findOne({ email }).lean();
    expect(db!.status).toBe('rejected');
    expect(db!.rejectionReason).toBe('Missing business documentation.');

    const login = await loginAdmin(t, email, `${PW}App`);
    expect(login.status).toBe(403);
    expect(login.body.error.message).toMatch(/Missing business documentation/);

    // The decision is recorded for the Super Admin: reviewer + reason.
    const detail = await t.agent.get(`/api/v1/super-admin/admin-requests/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.request.reviewedBy.name).toBe('Super Admin');
    expect(detail.body.data.request.rejectionReason).toBe('Missing business documentation.');

    // A rejected request disappears from the pending list.
    const pending = await t.agent.get('/api/v1/super-admin/admin-requests?status=pending');
    expect(pending.body.data.items.find((i: { email: string }) => i.email === email)).toBeUndefined();
  });

  it('approves with a license: admin is active, licensed, subdomain assigned, and login needs no key', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const email = 'req_approved_lic@example.test';
    await registerAdmin(t, { email });

    const list = await t.agent.get('/api/v1/super-admin/admin-requests?search=req_approved_lic');
    const id = list.body.data.items[0].id;

    const approve = await t.agent
      .post(`/api/v1/super-admin/admin-requests/${id}/approve`)
      .send({ licenseDurationDays: 365, maxUsers: 50 });
    expect(approve.status).toBe(200);
    expect(approve.body.data.admin.status).toBe('active');
    expect(approve.body.data.license).toBeTruthy();
    expect(approve.body.data.license.status).toBe('active');

    const db = await User.findOne({ email }).lean();
    expect(db!.subdomainSlug).toBeTruthy();
    expect(String(db!.licenseId)).toBe(approve.body.data.license.id);

    expect(await License.countDocuments({ adminUserId: db!._id, status: 'active' })).toBe(1);

    // Full admin sign-in with NO key: license auto-detected from the account.
    const login = await loginAdmin(t, email, `${PW}App`);
    expect(login.status).toBe(200);
    expect(login.body.data.licenseValid).toBe(true);
    expect((await t.agent.get('/api/v1/admin/users')).status).toBe(200);
  });

  it('preserves an existing license when approving — never creates a second one (regression for the 500)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const email = 'req_has_license@example.test';
    await registerAdmin(t, { email });
    const id = (await t.agent.get('/api/v1/super-admin/admin-requests?search=req_has_license')).body.data.items[0]
      .id;
    const admin = await User.findOne({ email }).lean();

    // Simulate an earlier flow that allocated a license but left the account
    // pending (exactly what the live `rup@gmail.com` record looked like).
    const seeded = await License.create({
      licenseKey: 'SMM-PRESERVE-0001',
      adminUserId: admin!._id,
      status: 'active',
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdBy: admin!._id,
      maxUsers: 25,
      metadata: { seeded: true },
      history: [],
    });
    const originalExpiry = new Date(seeded.expiresAt).getTime();

    const approve = await t.agent
      .post(`/api/v1/super-admin/admin-requests/${id}/approve`)
      .send({ licenseDurationDays: 365, maxUsers: 100 });
    expect(approve.status).toBe(200);
    expect(approve.body.data.admin.status).toBe('active');
    expect(approve.body.data.license.id).toBe(String(seeded._id));
    expect(approve.body.data.message).toMatch(/preserved/i);

    // Exactly one license remains, untouched — neither replaced nor duplicated.
    const db = await User.findOne({ email }).lean();
    expect(String(db!.licenseId)).toBe(String(seeded._id));
    const live = await License.findById(seeded._id).lean();
    expect(live!.status).toBe('active');
    expect(live!.maxUsers).toBe(25);
    expect(new Date(live!.expiresAt).getTime()).toBe(originalExpiry);
    expect(await License.countDocuments({ adminUserId: admin!._id })).toBe(1);

    // The admin signs in with NO key using the preserved license.
    const login = await loginAdmin(t, email, `${PW}App`);
    expect(login.status).toBe(200);
    expect(login.body.data.licenseValid).toBe(true);
  });

  it('is 404 for approving/rejecting an application twice or one that does not exist', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const email = 'req_twice@example.test';
    await registerAdmin(t, { email });
    const id = (await t.agent.get('/api/v1/super-admin/admin-requests?search=req_twice')).body.data.items[0].id;

    expect((await t.agent.post(`/api/v1/super-admin/admin-requests/${id}/reject`).send({ reason: 'No' })).status).toBe(200);
    expect((await t.agent.post(`/api/v1/super-admin/admin-requests/${id}/approve`).send({})).status).toBe(404);
    expect((await t.agent.post(`/api/v1/super-admin/admin-requests/${id}/reject`).send({ reason: 'No' })).status).toBe(404);
    // A well-formed but unknown id → 404 (an invalid id trips a CastError → 400).
    expect((await t.agent.post(`/api/v1/super-admin/admin-requests/${'0'.repeat(24)}/approve`).send({})).status).toBe(404);
  });

  it('records audit entries for register/approve/reject with the reviewer', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const email = 'req_audit@example.test';
    await registerAdmin(t, { email });
    const id = (await t.agent.get('/api/v1/super-admin/admin-requests?search=req_audit')).body.data.items[0].id;

    await t.agent.post(`/api/v1/super-admin/admin-requests/${id}/reject`).send({ reason: 'Policy violation' });
    const reqId = (await User.findOne({ email }).lean())?._id;
    const log = await AuditLog.findOne({ action: 'admin.reject', targetId: String(reqId) }).lean();

    expect(log).toBeTruthy();
    expect(log!.actorRole).toBe('super_admin');
    expect((log!.metadata as Record<string, unknown>).reason).toBe('Policy violation');
    expect(log!.actorId).not.toBe(String(reqId)); // reviewer, not the applicant
  });

  it('requires the Super Admin role for the admin-requests endpoints (401 without login)', async () => {
    const t = testApp();
    const res = await t.agent.get('/api/v1/super-admin/admin-requests');
    expect(res.status).toBe(401);
  });

  it('surfaces an approved request as `approved` (requestStatus) and `active` (account) and filters consistently', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const email = 'req_filter_approved@example.test';
    await registerAdmin(t, { email });
    const id = (await t.agent.get('/api/v1/super-admin/admin-requests?search=req_filter_approved')).body.data
      .items[0].id;

    expect((await t.agent.get('/api/v1/super-admin/admin-requests?status=approved&search=req_filter_approved')).body.data.items.length).toBe(0);

    const approve = await t.agent
      .post(`/api/v1/super-admin/admin-requests/${id}/approve`)
      .send({ licenseDurationDays: 365, maxUsers: 10 });
    expect(approve.status).toBe(200);
    expect(approve.body.data.admin.status).toBe('active');

    // The approved request is returned under the `approved` filter with the
    // request-level label, while the stored account status is `active`.
    const approved = await t.agent.get('/api/v1/super-admin/admin-requests?status=approved&search=req_filter_approved');
    expect(approved.status).toBe(200);
    expect(approved.body.data.items).toHaveLength(1);
    const item = approved.body.data.items[0];
    expect(item.id).toBe(id);
    expect(item.requestStatus).toBe('approved');
    expect(item.status).toBe('active');
    expect(item.license).toBeTruthy();
    expect(item.license.status).toBe('active');

    // Default list (all statuses) also includes it.
    const all = await t.agent.get('/api/v1/super-admin/admin-requests?search=req_filter_approved');
    expect(all.body.data.items[0].requestStatus).toBe('approved');

    // It no longer appears under `pending`.
    const pending = await t.agent.get('/api/v1/super-admin/admin-requests?status=pending&search=req_filter_approved');
    expect(pending.body.data.items.find((i: { email: string }) => i.email === email)).toBeUndefined();

    // Detail endpoint resolves the approved request too.
    const detail = await t.agent.get(`/api/v1/super-admin/admin-requests/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.request.requestStatus).toBe('approved');
  });

  it('rejects an unknown request status filter with 422 (never silently ignores it)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const res = await t.agent.get('/api/v1/super-admin/admin-requests?status=active');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});