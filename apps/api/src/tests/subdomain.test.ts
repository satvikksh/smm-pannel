import { describe, expect, it } from 'vitest';
import { License, User } from '@smm/database';
import {
  buildSubdomainHost,
  isValidSubdomainSlug,
  slugifySubdomainSlug,
  subdomainSlugFromHost,
} from '@smm/types';
import {
  testApp,
  loginSuperAdmin,
  createAdminViaApi,
  loginAdmin,
  PW,
  type TestAgent,
} from './helpers';

const ROOT_DOMAIN = 'localhost';

let phoneSeq = 8_000_000_000;
function nextPhone(): string {
  phoneSeq += 1;
  return `+1${phoneSeq}`;
}

interface NamedAdmin {
  adminId: string;
  slug: string;
  host: string;
  email: string;
  password: string;
  licenseKey: string;
  licenseId: string;
}

async function createAdminNamed(t: TestAgent, name: string, email: string): Promise<NamedAdmin> {
  const password = `${PW}Admin`;
  const res = await t.agent.post('/api/v1/super-admin/admins').send({
    name,
    email,
    phone: nextPhone(),
    password,
    confirmPassword: password,
    licenseDurationDays: 365,
    maxUsers: 10,
  });
  if (res.status >= 400) {
    throw new Error(`createAdminNamed failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return {
    adminId: res.body.data.admin.id,
    slug: res.body.data.admin.subdomainSlug,
    host: res.body.data.admin.subdomain,
    email,
    password,
    licenseKey: res.body.data.license.licenseKey,
    licenseId: res.body.data.license.id,
  };
}

function loginAt(
  t: TestAgent,
  email: string,
  password: string,
  licenseKey: string,
  slug?: string,
) {
  const req = t.agent.post('/api/v1/auth/admin/login');
  if (slug) req.set('x-admin-subdomain', slug);
  return req.send({ email, password, licenseKey });
}

function resolveHost(t: TestAgent, host: string) {
  return t.agent.get(`/api/v1/tenant/resolve?host=${encodeURIComponent(host)}`);
}

describe('subdomain helpers', () => {
  it('slugifies admin names into safe subdomain labels', () => {
    expect(slugifySubdomainSlug('Ram Kumar')).toBe('ram-kumar');
    expect(slugifySubdomainSlug('  Ram   Kumar  ')).toBe('ram-kumar');
    expect(slugifySubdomainSlug('Ram_Kumar @/:')).toBe('ram-kumar');
    expect(slugifySubdomainSlug('RAM')).toBe('ram');
  });

  it('validates slugs and extracts them from hosts', () => {
    expect(isValidSubdomainSlug('ram-kumar')).toBe(true);
    expect(isValidSubdomainSlug('-ram')).toBe(false);
    expect(isValidSubdomainSlug('ram_kumar')).toBe(false);
    expect(isValidSubdomainSlug('')).toBe(false);

    expect(subdomainSlugFromHost('ram-kumar.localhost:3001', ROOT_DOMAIN)).toBe('ram-kumar');
    expect(subdomainSlugFromHost('ram-kumar.localhost', ROOT_DOMAIN)).toBe('ram-kumar');
    expect(subdomainSlugFromHost('localhost:3001', ROOT_DOMAIN)).toBeNull();
    expect(subdomainSlugFromHost('smmpannel.com', ROOT_DOMAIN)).toBeNull();
    expect(subdomainSlugFromHost('ram-kumar.evil.com', ROOT_DOMAIN)).toBeNull();
    expect(buildSubdomainHost('ram-kumar', 'smmpannel.com')).toBe('ram-kumar.smmpannel.com');
  });
});

describe('admin subdomain provisioning', () => {
  it('creates a unique subdomain from the admin name and returns it', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminNamed(t, 'Alice Wonder', 'sub_alice@example.test');

    expect(admin.slug).toBe('alice-wonder');
    expect(admin.host).toBe('alice-wonder.localhost');

    const detail = await t.agent.get(`/api/v1/super-admin/admins/${admin.adminId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.admin.subdomainSlug).toBe('alice-wonder');
    expect(detail.body.data.admin.subdomain).toBe('alice-wonder.localhost');
    expect(detail.body.data.admin.subdomainStatus).toBe('active');
    expect(detail.body.data.license.adminSubdomain).toBe('alice-wonder.localhost');
  });

  it('never reuses a slug: second "Ram Kumar" becomes ram-kumar-2', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const first = await createAdminNamed(t, 'Ram Kumar', 'sub_ram1@example.test');
    const second = await createAdminNamed(t, 'Ram Kumar', 'sub_ram2@example.test');

    expect(first.slug).toBe('ram-kumar');
    expect(second.slug).toBe('ram-kumar-2');
    expect(second.host).toBe('ram-kumar-2.localhost');
  });

  it('provisions a subdomain when a license is issued to an admin that lacks one', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'sub_provision@example.test');

    await License.deleteOne({ _id: admin.licenseId });
    await User.updateOne(
      { _id: admin.adminId },
      {
        $set: {
          licenseId: null,
          subdomainSlug: null,
          subdomain: null,
          subdomainStatus: null,
          subdomainCreatedAt: null,
        },
      },
    );

    const res = await t.agent
      .post('/api/v1/super-admin/licenses')
      .send({ adminUserId: admin.adminId, durationDays: 30, maxUsers: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.license.adminSubdomain).toMatch(/\.localhost$/);

    const stored = await User.findById(admin.adminId).lean();
    expect(stored?.subdomainSlug).toBeTruthy();
    expect(stored?.subdomainStatus).toBe('active');
  });

  it('disables, enables and regenerates the panel URL', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminNamed(t, 'Regen Tester', 'sub_regen@example.test');

    const disabled = await t.agent
      .patch(`/api/v1/super-admin/admins/${admin.adminId}/subdomain`)
      .send({ action: 'disable' });
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.admin.subdomainStatus).toBe('disabled');

    const unavailable = await resolveHost(t, admin.host);
    expect(unavailable.status).toBe(200);
    expect(unavailable.body.data.found).toBe(true);
    expect(unavailable.body.data.available).toBe(false);

    // A disabled panel must not accept sign-ins even with valid credentials.
    const blocked = await loginAt(t, admin.email, admin.password, admin.licenseKey, admin.slug);
    expect(blocked.status).toBe(403);

    const enabled = await t.agent
      .patch(`/api/v1/super-admin/admins/${admin.adminId}/subdomain`)
      .send({ action: 'enable' });
    expect(enabled.status).toBe(200);
    expect(enabled.body.data.admin.subdomainStatus).toBe('active');

    const regenerated = await t.agent
      .patch(`/api/v1/super-admin/admins/${admin.adminId}/subdomain`)
      .send({ action: 'regenerate' });
    expect(regenerated.status).toBe(200);
    expect(regenerated.body.data.admin.subdomainSlug).not.toBe(admin.slug);
    expect(regenerated.body.data.admin.subdomainStatus).toBe('active');

    const oldHost = await resolveHost(t, admin.host);
    expect(oldHost.body.data.found).toBe(false);
  });
});

describe('tenant resolution endpoint', () => {
  it('reports unknown subdomains, available panels and license failures', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminNamed(t, 'Resolve Tester', 'sub_resolve@example.test');

    const unknown = await resolveHost(t, 'does-not-exist.localhost');
    expect(unknown.status).toBe(200);
    expect(unknown.body.data.found).toBe(false);
    expect(unknown.body.data.reason).toBe('Admin panel not found.');

    const available = await resolveHost(t, admin.host);
    expect(available.body.data.found).toBe(true);
    expect(available.body.data.available).toBe(true);
    expect(available.body.data.subdomain).toBe(admin.host);

    await License.updateOne(
      { _id: admin.licenseId },
      { $set: { status: 'expired', expiresAt: new Date(Date.now() - 1000) } },
    );
    const expired = await resolveHost(t, admin.host);
    expect(expired.body.data.available).toBe(false);
    expect(expired.body.data.reason).toBe('This Admin panel is currently unavailable.');
    expect(expired.body.data.detail).toBe('License expired.');

    await License.updateOne({ _id: admin.licenseId }, { $set: { status: 'suspended' } });
    const suspended = await resolveHost(t, admin.host);
    expect(suspended.body.data.available).toBe(false);
    expect(suspended.body.data.detail).toBe('License suspended.');

    await License.updateOne({ _id: admin.licenseId }, { $set: { status: 'revoked' } });
    const revoked = await resolveHost(t, admin.host);
    expect(revoked.body.data.available).toBe(false);
    expect(revoked.body.data.detail).toBe('License revoked.');
  });
});

describe('tenant isolation', () => {
  it('rejects cross-tenant logins and cross-tenant sessions', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const alice = await createAdminNamed(t, 'Isolation Alice', 'iso_alice@example.test');
    const bob = await createAdminNamed(t, 'Isolation Bob', 'iso_bob@example.test');

    // Alice cannot sign in on Bob's panel URL.
    const stolenPanel = await loginAt(t, alice.email, alice.password, alice.licenseKey, bob.slug);
    expect(stolenPanel.status).toBe(403);

    // Alice signs in on her own panel URL.
    const ownPanel = await loginAt(t, alice.email, alice.password, alice.licenseKey, alice.slug);
    expect(ownPanel.status).toBe(200);

    // Her session is rejected the moment it is presented as Bob's tenant.
    const crossTenant = await t.agent
      .get('/api/v1/admin/users')
      .set('x-admin-subdomain', bob.slug);
    expect(crossTenant.status).toBe(403);

    // The same session is accepted on Alice's tenant.
    const ownTenant = await t.agent
      .get('/api/v1/admin/users')
      .set('x-admin-subdomain', alice.slug);
    expect(ownTenant.status).toBe(200);
  });

  it('keeps apex/localhost access working (no subdomain header)', async () => {
    const t = testApp();
    await loginSuperAdmin(t);
    const admin = await createAdminViaApi(t, 'sub_apex@example.test');

    const login = await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
    expect(login.status).toBe(200);
    expect((await t.agent.get('/api/v1/admin/users')).status).toBe(200);
  });
});
