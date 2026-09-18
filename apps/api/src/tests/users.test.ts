import { describe, expect, it } from 'vitest';
import { testApp, registerUser, loginUser, PW } from './helpers';

describe('user wallet & orders (§17, §22)', () => {
  it('a new user starts with an empty wallet', async () => {
    const t = testApp();
    await registerUser(t, { email: 'w_start@example.test' });
    await loginUser(t, 'w_start@example.test', PW);
    const wallet = await t.agent.get('/api/v1/user/wallet');
    expect(wallet.status).toBe(200);
    expect(wallet.body.data.balance).toBe(0);
    expect(wallet.body.data.totalDeposited).toBe(0);
  });

  it('add-funds credits the wallet and records a transaction', async () => {
    const t = testApp();
    await registerUser(t, { email: 'w_fund@example.test' });
    await loginUser(t, 'w_fund@example.test', PW);

    const res = await t.agent.post('/api/v1/user/wallet/add-funds').send({ amount: 100 });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('credit');
    expect(res.body.data.amount).toBe(100);

    const wallet = await t.agent.get('/api/v1/user/wallet');
    expect(wallet.body.data.balance).toBe(100);
    expect(wallet.body.data.totalDeposited).toBe(100);

    const txns = await t.agent.get('/api/v1/user/wallet/transactions');
    expect(txns.status).toBe(200);
    expect(txns.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('cannot create an order beyond the wallet balance (400)', async () => {
    const t = testApp();
    await registerUser(t, { email: 'w_poor@example.test' });
    await loginUser(t, 'w_poor@example.test', PW);

    const services = await t.agent.get('/api/v1/user/catalog/services');
    expect(services.status).toBe(200);
    const svc = services.body.data[0];
    const res = await t.agent.post('/api/v1/user/orders').send({
      serviceId: svc.id,
      link: 'https://example.test/order-1',
      quantity: svc.minOrder,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('creates an order, debits balance, and lists it', async () => {
    const t = testApp();
    await registerUser(t, { email: 'w_rich@example.test' });
    await loginUser(t, 'w_rich@example.test', PW);
    await t.agent.post('/api/v1/user/wallet/add-funds').send({ amount: 500 });

    const services = await t.agent.get('/api/v1/user/catalog/services');
    const svc = services.body.data[0];
    const price = Number((svc.minOrder * svc.price).toFixed(2));
    expect(price).toBeLessThan(500);

    const created = await t.agent.post('/api/v1/user/orders').send({
      serviceId: svc.id,
      link: 'https://example.test/order-2',
      quantity: svc.minOrder,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('pending');

    const wallet = await t.agent.get('/api/v1/user/wallet');
    expect(wallet.body.data.balance).toBe(Number((500 - price).toFixed(2)));

    const orders = await t.agent.get('/api/v1/user/orders');
    expect(orders.status).toBe(200);
    const mine = orders.body.data.items.find((o: { serviceId: string }) => o.serviceId === svc.id);
    expect(mine).toBeTruthy();
    expect(mine.price).toBe(price);

    const detail = await t.agent.get(`/api/v1/user/orders/${created.body.data.id}`);
    expect(detail.status).toBe(200);
  });
});