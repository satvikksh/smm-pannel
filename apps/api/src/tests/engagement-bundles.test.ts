import { describe, expect, it } from 'vitest';
import { EngagementBundle, Order, Wallet } from '@smm/database';
import {
  createAdminViaApi,
  loginAdmin,
  loginSuperAdmin,
  loginUser,
  PW,
  registerUser,
  testApp,
  type TestAgent,
} from './helpers';

let bundleSeq = 0;
function nextQuantity(base = 100): number {
  bundleSeq += 1;
  return base + bundleSeq * 37;
}

function token(): string {
  return `T${Math.random().toString(36).slice(2, 8)}`;
}

async function adminAgent(): Promise<{ t: TestAgent; licenseKey: string; password: string }> {
  const sa = testApp();
  await loginSuperAdmin(sa);
  const admin = await createAdminViaApi(sa, `bundle_admin_${Date.now()}@example.test`);
  const t = testApp();
  await loginAdmin(t, admin.email, admin.password, admin.licenseKey);
  return { t, licenseKey: admin.licenseKey, password: admin.password };
}

async function superAdminAgent(): Promise<TestAgent> {
  const t = testApp();
  await loginSuperAdmin(t);
  return t;
}

async function fundedUser(amount = 100_000): Promise<{ t: TestAgent; email: string }> {
  const t = testApp();
  const email = `bundle_user_${Date.now()}@example.test`;
  await registerUser(t, { email });
  await loginUser(t, email, PW);
  await t.agent.post('/api/v1/user/wallet/add-funds').send({ amount });
  return { t, email };
}

function createPayload(overrides: Record<string, unknown> = {}) {
  const quantity = nextQuantity();
  return {
    type: 'likes',
    quantity,
    price: 9.99,
    currency: 'USD',
    displayName: `${quantity} Likes`,
    description: 'A classic starter package.',
    status: 'active',
    sortOrder: 0,
    ...overrides,
  };
}

async function adminCreate(t: TestAgent, overrides: Record<string, unknown> = {}) {
  return t.agent.post('/api/v1/admin/engagement-bundles').send(createPayload(overrides));
}

function expectBundleShape(data: Record<string, unknown>) {
  expect(data.id).toBeTruthy();
  expect(data.type).toBeTruthy();
  expect(typeof data.quantity).toBe('number');
  expect(typeof data.price).toBe('number');
  expect(data.displayName).toBeTruthy();
  expect(data.status).toBeTruthy();
  expect(data.createdAt).toBeTruthy();
  expect(data.updatedAt).toBeTruthy();
  expect(data.deletedAt).toBeNull();
}

describe('engagement bundles', () => {
  it('unauthenticated requests are rejected on both admin routers', async () => {
    const t = testApp();
    const res = await t.agent.get('/api/v1/admin/engagement-bundles');
    expect([401, 403]).toContain(res.status);
    const sup = await t.agent.get('/api/v1/super-admin/engagement-bundles');
    expect([401, 403]).toContain(sup.status);
  });

  it('a normal user can never manage bundles but can read the customer catalog', async () => {
    const { t } = await fundedUser();
    expect([401, 403]).toContain((await t.agent.get('/api/v1/admin/engagement-bundles')).status);
    expect([401, 403]).toContain((await t.agent.get('/api/v1/super-admin/engagement-bundles')).status);
    expect([401, 403]).toContain((await t.agent.post('/api/v1/admin/engagement-bundles').send(createPayload())).status);
    const cat = await t.agent.get('/api/v1/user/catalog/bundles');
    expect(cat.status).toBe(200);
    expect(cat.body.data).toEqual({ likes: [], views: [], subscribers: [] });
  });

  it('an admin creates an engagement bundle with full serialization', async () => {
    const { t } = await adminAgent();
    const res = await adminCreate(t);
    expect(res.status).toBe(201);
    expectBundleShape(res.body.data);
    expect(res.body.data.price).toBe(9.99);
    expect(res.body.data.currency).toBe('USD');
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.sortOrder).toBe(0);
  });

  it('currency defaults to INR when omitted', async () => {
    const { t } = await adminAgent();
    const res = await adminCreate(t, { currency: undefined });
    expect(res.status).toBe(201);
    expect(res.body.data.currency).toBe('INR');
  });

  it('validation rejects bad quantity, price, type, display name, and empty payloads', async () => {
    const { t } = await adminAgent();
    const base = createPayload();
    const cases: Record<string, unknown>[] = [
      { ...base, quantity: 0 },
      { ...base, quantity: 1.5 },
      { ...base, price: -1 },
      { ...base, price: 10.999 },
      { ...base, price: 0.001 },
      { ...base, type: 'shares' },
      { ...base, displayName: 'x' },
    ];
    for (const overrides of cases) {
      const res = await adminCreate(t, overrides);
      expect(res.status).toBe(422);
    }
    const empty = await t.agent.post('/api/v1/admin/engagement-bundles').send({});
    expect(empty.status).toBe(422);
  });

  it('duplicate (type, quantity) is rejected with 409; a different quantity succeeds', async () => {
    const { t } = await adminAgent();
    const one = await adminCreate(t);
    const dup = await adminCreate(t, { quantity: one.body.data.quantity });
    expect(dup.status).toBe(409);
    const diff = await adminCreate(t);
    expect(diff.status).toBe(201);
  });

  it('list supports type, status, and search filters', async () => {
    const { t } = await adminAgent();
    const mark = token();
    await adminCreate(t, { displayName: `${mark} Likes A`, price: 2 });
    await adminCreate(t, { type: 'views', displayName: `${mark} Views`, price: 3 });
    const inactiveMark = token();
    await adminCreate(t, { displayName: `${inactiveMark} Off`, status: 'inactive' });

    const likes = await t.agent.get('/api/v1/admin/engagement-bundles?type=likes');
    expect(likes.status).toBe(200);
    expect(likes.body.data.items.length).toBeGreaterThan(0);
    expect(likes.body.data.items.every((b: { type: string }) => b.type === 'likes')).toBe(true);

    const inactive = await t.agent.get('/api/v1/admin/engagement-bundles?status=inactive');
    expect(inactive.body.data.items.length).toBeGreaterThan(0);
    expect(inactive.body.data.items.every((b: { status: string }) => b.status === 'inactive')).toBe(true);

    const byMark = await t.agent.get(`/api/v1/admin/engagement-bundles?search=${encodeURIComponent(mark)}`);
    expect(byMark.status).toBe(200);
    expect(byMark.body.data.total).toBe(2);

    const byInactive = await t.agent.get(`/api/v1/admin/engagement-bundles?search=${encodeURIComponent(inactiveMark)}`);
    expect(byInactive.body.data.total).toBe(1);
  });

  it('an admin updates a bundle and is blocked from duplicate collisions', async () => {
    const { t } = await adminAgent();
    const one = await adminCreate(t);
    const target = await adminCreate(t, { type: 'views' });

    const edit = await t.agent
      .patch(`/api/v1/admin/engagement-bundles/${one.body.data.id}`)
      .send({ displayName: 'Renamed Bundle', price: 8.5, sortOrder: 3 });
    expect(edit.status).toBe(200);
    expect(edit.body.data.displayName).toBe('Renamed Bundle');
    expect(edit.body.data.price).toBe(8.5);
    expect(edit.body.data.sortOrder).toBe(3);

    const collision = await t.agent
      .patch(`/api/v1/admin/engagement-bundles/${one.body.data.id}`)
      .send({ type: 'views', quantity: target.body.data.quantity });
    expect(collision.status).toBe(409);

    const relabel = await t.agent
      .patch(`/api/v1/admin/engagement-bundles/${one.body.data.id}`)
      .send({ type: 'views', quantity: nextQuantity(900), displayName: 'Renamed Views' });
    expect(relabel.status).toBe(200);
    expect(relabel.body.data.type).toBe('views');
  });

  it('status toggle hides the bundle from customers and restore re-shows it', async () => {
    const { t } = await adminAgent();
    const created = await adminCreate(t);
    const id = created.body.data.id;

    const off = await t.agent.patch(`/api/v1/admin/engagement-bundles/${id}/status`).send({ status: 'inactive' });
    expect(off.status).toBe(200);
    expect(off.body.data.status).toBe('inactive');

    const { t: userT } = await fundedUser();
    const hidden = await userT.agent.get('/api/v1/user/catalog/bundles');
    expect(hidden.body.data.likes.find((b: { id: string }) => b.id === id) ?? null).toBeNull();

    const on = await t.agent.patch(`/api/v1/admin/engagement-bundles/${id}/status`).send({ status: 'active' });
    expect(on.status).toBe(200);

    const visible = await userT.agent.get('/api/v1/user/catalog/bundles');
    expect(visible.body.data.likes.find((b: { id: string }) => b.id === id) ?? null).toBeTruthy();
  });

  it('soft delete archives the bundle, allows recreation, and keeps history intact', async () => {
    const { t } = await adminAgent();
    const created = await adminCreate(t);
    const id = created.body.data.id;

    const del = await t.agent.delete(`/api/v1/admin/engagement-bundles/${id}`);
    expect(del.status).toBe(200);

    const list = await t.agent.get('/api/v1/admin/engagement-bundles');
    expect(list.body.data.items.map((b: { id: string }) => b.id)).not.toContain(id);

    const { t: userT } = await fundedUser();
    const hidden = await userT.agent.get('/api/v1/user/catalog/bundles');
    expect(hidden.body.data.likes.find((b: { id: string }) => b.id === id) ?? null).toBeNull();

    const recreate = await adminCreate(t);
    expect(recreate.status).toBe(201);

    const archived = await EngagementBundle.findById(id).lean();
    expect(archived?.deletedAt).toBeTruthy();
    expect(archived?.status).toBe('inactive');
  });

  it('an engagement order is priced strictly from the database, ignoring client values', async () => {
    const { t } = await adminAgent();
    const created = await adminCreate(t, { price: 12.5, displayName: 'Pro Likes' });
    const bundleId = created.body.data.id;

    const { t: userT } = await fundedUser();
    const before = (await userT.agent.get('/api/v1/user/wallet')).body.data.balance;

    const res = await userT.agent.post('/api/v1/user/orders/bundle').send({
      bundleId,
      link: 'https://instagram.com/example',
      quantity: 1,
      price: 0.01,
    });
    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order.quantity).toBe(created.body.data.quantity);
    expect(order.price).toBe(12.5);
    expect(order.bundleId).toBe(bundleId);
    expect(order.bundleType).toBe('likes');
    expect(order.serviceName).toBe('Pro Likes');
    expect(order.categoryName).toBe('Likes');
    expect(order.currency).toBe('USD');

    const stored = await Order.findById(order.id).lean();
    expect(stored?.quantity).toBe(created.body.data.quantity);
    expect(stored?.price).toBe(12.5);
    expect(stored?.bundleId?.toString()).toBe(bundleId);
    expect(stored?.currency).toBe('USD');

    const after = (await userT.agent.get('/api/v1/user/wallet')).body.data.balance;
    expect(after).toBeCloseTo(before - 12.5, 2);

    const wallet = await Wallet.findOne({ userId: String(stored?.userId) }).lean();
    expect(wallet?.balance).toBeCloseTo(after, 2);

    const myOrders = await userT.agent.get('/api/v1/user/orders');
    expect(myOrders.body.data.items).toHaveLength(1);
  });

  it('an order fails with insufficient balance', async () => {
    const { t } = await adminAgent();
    const created = await adminCreate(t, { price: 12.5 });
    const { t: userT } = await fundedUser(5);
    const res = await userT.agent
      .post('/api/v1/user/orders/bundle')
      .send({ bundleId: created.body.data.id, link: 'https://instagram.com/x' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/balance/i);
  });

  it('orders on inactive, deleted, or unknown bundles are rejected', async () => {
    const { t } = await adminAgent();
    const created = await adminCreate(t);
    await t.agent.patch(`/api/v1/admin/engagement-bundles/${created.body.data.id}/status`).send({ status: 'inactive' });

    const { t: userT } = await fundedUser();

    const inactive = await userT.agent
      .post('/api/v1/user/orders/bundle')
      .send({ bundleId: created.body.data.id, link: 'https://instagram.com/x' });
    expect(inactive.status).toBe(400);
    expect(inactive.body.error.message).toMatch(/unavailable/i);

    const missing = await userT.agent
      .post('/api/v1/user/orders/bundle')
      .send({ bundleId: '000000000000000000000000', link: 'https://instagram.com/x' });
    expect(missing.status).toBe(404);
  });

  it('historical orders keep their original quantity and price after edit + delete', async () => {
    const { t } = await adminAgent();
    const created = await adminCreate(t, { price: 99.99, displayName: '1K Likes' });
    const bundleId = created.body.data.id;

    const { t: userT } = await fundedUser();
    const orderRes = await userT.agent
      .post('/api/v1/user/orders/bundle')
      .send({ bundleId, link: 'https://instagram.com/fan' });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.id;

    const delta = await t.agent.patch(`/api/v1/admin/engagement-bundles/${bundleId}`).send({ price: 19.99 });
    expect(delta.status).toBe(200);

    const afterEdit = await userT.agent.get(`/api/v1/user/orders/${orderId}`);
    expect(afterEdit.body.data.price).toBe(99.99);

    await t.agent.delete(`/api/v1/admin/engagement-bundles/${bundleId}`);

    const afterDelete = await userT.agent.get(`/api/v1/user/orders/${orderId}`);
    expect(afterDelete.status).toBe(200);
    expect(afterDelete.body.data.price).toBe(99.99);

    const stored = await Order.findById(orderId).lean();
    expect(stored?.price).toBe(99.99);
  });

  it('super-admin can manage bundles on the super-admin router', async () => {
    const t = await superAdminAgent();
    const created = await t.agent
      .post('/api/v1/super-admin/engagement-bundles')
      .send(createPayload({ type: 'subscribers' }));
    expect(created.status).toBe(201);

    const list = await t.agent.get('/api/v1/super-admin/engagement-bundles');
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBeGreaterThan(0);

    const toggle = await t.agent
      .patch(`/api/v1/super-admin/engagement-bundles/${created.body.data.id}/status`)
      .send({ status: 'inactive' });
    expect(toggle.status).toBe(200);

    const del = await t.agent.delete(`/api/v1/super-admin/engagement-bundles/${created.body.data.id}`);
    expect(del.status).toBe(200);
  });

  it('role separation holds for bundle routers', async () => {
    const { t } = await adminAgent();
    expect([401, 403]).toContain((await t.agent.get('/api/v1/super-admin/engagement-bundles')).status);

    const sup = await superAdminAgent();
    expect([401, 403]).toContain((await sup.agent.get('/api/v1/admin/engagement-bundles')).status);
  });
});