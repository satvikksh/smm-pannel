import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../app';

export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@localhost.test';
export const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? 'Sa$ecret!2026#Super';

const PW = 'StrongPass!2026';

export interface TestAgent {
  app: Express;
  agent: ReturnType<typeof request.agent>;
}

export function testApp(): TestAgent {
  const app = createApp();
  return { app, agent: request.agent(app) };
}

let phoneSeq = 1_000_000_000;
function nextPhone(): string {
  phoneSeq += 1;
  return `+1${phoneSeq}`;
}

export async function registerUser(
  t: TestAgent,
  overrides: { name?: string; email?: string; phone?: string; password?: string } = {},
): Promise<{ status: number; body: import('supertest').Response['body'] }> {
  const payload = {
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? `user_${Date.now()}@example.test`,
    phone: overrides.phone ?? nextPhone(),
    password: overrides.password ?? PW,
    confirmPassword: overrides.password ?? PW,
  };
  const reg = await t.agent
    .post('/api/v1/auth/user/register')
    .send(payload)
    .expect((r) => {
      if (r.status >= 500) {
        throw new Error(`register failed (${r.status}): ${JSON.stringify(r.body)}\npayload: ${JSON.stringify(payload)}`);
      }
    });
  return { status: reg.status, body: reg.body };
}

export async function loginUser(t: TestAgent, email: string, password: string): Promise<request.Response> {
  return t.agent.post('/api/v1/auth/user/login').send({ email, password });
}

export async function loginAdmin(
  t: TestAgent,
  email: string,
  password: string,
  _licenseKey = '',
): Promise<request.Response> {
  // Admin login no longer accepts a license key: the license assigned to the
  // account is detected server-side. The parameter is kept (and ignored) so
  // legacy call sites stay valid, and zod strips any stray field anyway.
  void _licenseKey;
  return t.agent.post('/api/v1/auth/admin/login').send({ email, password });
}

export async function loginSuperAdmin(t: TestAgent): Promise<request.Response> {
  return t.agent
    .post('/api/v1/auth/super-admin/login')
    .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD });
}

export interface CreatedAdmin {
  email: string;
  password: string;
  licenseKey: string;
  licenseId: string;
  adminId: string;
}

export async function createAdminViaApi(t: TestAgent, email?: string): Promise<CreatedAdmin> {
  const password = `${PW}Admin`;
  const payload = {
    name: 'Panel Admin',
    email: email ?? `admin_${Date.now()}@example.test`,
    phone: nextPhone(),
    password,
    confirmPassword: password,
    licenseDurationDays: 365,
    maxUsers: 100,
  };
  const res = await t.agent.post('/api/v1/super-admin/admins').send(payload);
  if (res.status >= 400) {
    throw new Error(`createAdminViaApi failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return {
    email: payload.email,
    password,
    licenseKey: res.body.data.license.licenseKey,
    licenseId: res.body.data.license.id,
    adminId: res.body.data.admin.id,
  };
}

export { PW };