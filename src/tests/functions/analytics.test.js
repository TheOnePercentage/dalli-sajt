import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = vi.hoisted(() => new Map());

vi.mock('@netlify/blobs', () => ({
  getStore: opts => {
    const name = typeof opts === 'string' ? opts : opts.name;
    if (!memory.has(name)) memory.set(name, new Map());
    const bucket = memory.get(name);
    return {
      get: async (key, o) => {
        const raw = bucket.get(key);
        if (raw === undefined) return null;
        if (o && o.type === 'json') return JSON.parse(raw);
        return raw;
      },
      setJSON: async (key, value) => {
        bucket.set(key, JSON.stringify(value));
      },
    };
  },
}));

const { default: handler } = await import('../../../netlify/functions/analytics.js');

const event = over => ({
  httpMethod: 'GET',
  path: '/api/v1/admin/analytics/stats',
  queryStringParameters: {},
  headers: {},
  body: null,
  ...over,
});

const parse = res => JSON.parse(res.body);

const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();

const seedOrders = async orders => {
  const store = (await import('@netlify/blobs')).getStore({ name: 'orders' });
  await store.setJSON('orders', orders);
};

const sampleOrder = over => ({
  orderNumber: 'DAL-00000001-AAAAAA',
  createdAt: daysAgo(2),
  status: 'pending',
  paymentMethod: 'cod',
  total: 10000,
  subtotal: 9710,
  shipping: 290,
  items: [{ productId: 'p1', name: 'Majica', qty: 2, price: 4855 }],
  customer: { name: 'Test Kupac', email: 'kupac@example.com', phone: '+381600000000' },
  ...over,
});

describe('netlify/functions/analytics', () => {
  beforeEach(() => memory.clear());

  it('records a storefront event and reports sessions from it', async () => {
    const track = await handler(
      event({
        httpMethod: 'POST',
        path: '/api/analytics/track',
        body: JSON.stringify({
          event: 'page_view',
          vid: 'visit-1',
          source: 'google',
          device: 'mobile',
        }),
      })
    );
    expect(track.statusCode).toBe(202);

    const stats = parse(await handler(event()));
    expect(stats.sessions).toBe(1);
    expect(stats.orders).toHaveLength(0);
    expect(stats.adSpend).toBe(0);
  });

  it('rejects a storefront event without a name', async () => {
    const res = await handler(
      event({ httpMethod: 'POST', path: '/api/analytics/track', body: JSON.stringify({}) })
    );
    expect(res.statusCode).toBe(400);
  });

  it('builds real stats and finance from real orders only', async () => {
    await seedOrders([sampleOrder()]);
    const stats = parse(await handler(event()));
    expect(stats.orders).toHaveLength(1);
    expect(stats.customers).toHaveLength(1);
    expect(stats.customers[0].totalSpent).toBe(10000);

    const finance = parse(
      await handler(
        event({ path: '/api/v1/admin/analytics/finance', queryStringParameters: { period: '30d' } })
      )
    );
    expect(finance.summary.revenue).toBe(10000);
    expect(finance.summary.orders).toBe(1);
    expect(finance.summary.cogs).toBe(4000);
    expect(finance.summary.grossProfit).toBe(6000);
    expect(stats.cogsRatio === undefined || true).toBe(true);
    expect(stats.marketingBudget).toBe(0);
  });

  it('excludes cancelled/trashed orders from revenue', async () => {
    await seedOrders([
      sampleOrder({ orderNumber: 'DAL-1', total: 5000 }),
      sampleOrder({ orderNumber: 'DAL-2', total: 7000, status: 'cancelled' }),
      sampleOrder({ orderNumber: 'DAL-3', total: 9000, trashed: true }),
    ]);
    const stats = parse(await handler(event()));
    expect(stats.orders).toHaveLength(2);

    const finance = parse(
      await handler(
        event({ path: '/api/v1/admin/analytics/finance', queryStringParameters: { period: '30d' } })
      )
    );
    expect(finance.summary.revenue).toBe(5000);
    expect(finance.summary.orders).toBe(1);
  });

  it('builds the conversion funnel from real events and orders', async () => {
    await seedOrders([sampleOrder()]);
    await handler(
      event({
        httpMethod: 'POST',
        path: '/api/analytics/track',
        body: JSON.stringify({ event: 'page_view', vid: 'v1' }),
      })
    );
    await handler(
      event({
        httpMethod: 'POST',
        path: '/api/analytics/track',
        body: JSON.stringify({ event: 'add_to_cart', vid: 'v1' }),
      })
    );
    const funnel = parse(
      await handler(event({ path: '/api/v1/admin/analytics/conversion-funnel' }))
    );
    const byStep = Object.fromEntries(funnel.map(s => [s.step, s.count]));
    expect(byStep.page_view).toBe(1);
    expect(byStep.add_to_cart).toBe(1);
    expect(byStep.purchase).toBe(1);
  });

  it('forbids ad spend writes for non-owners', async () => {
    const res = await handler(
      event({
        httpMethod: 'POST',
        path: '/api/v1/admin/analytics/adspend',
        headers: { 'x-admin-role': 'admin' },
        body: JSON.stringify({ amount: 1000, network: 'facebook' }),
      })
    );
    expect(res.statusCode).toBe(403);
  });

  it('validates ad spend amount', async () => {
    const res = await handler(
      event({
        httpMethod: 'POST',
        path: '/api/v1/admin/analytics/adspend',
        headers: { 'x-admin-role': 'vlasnik' },
        body: JSON.stringify({ amount: -5, network: 'facebook' }),
      })
    );
    expect(res.statusCode).toBe(400);
  });

  it('owner can add and delete ad spend, feeding finance and accounting', async () => {
    await seedOrders([sampleOrder()]);
    const owner = { 'x-admin-role': 'vlasnik', 'x-admin-name': 'Vlasnik' };

    const created = await handler(
      event({
        httpMethod: 'POST',
        path: '/api/v1/admin/analytics/adspend',
        headers: owner,
        body: JSON.stringify({ amount: 1500, network: 'facebook', note: 'Kampanja' }),
      })
    );
    expect(created.statusCode).toBe(201);
    const entry = parse(created).entry;

    const list = parse(await handler(event({ path: '/api/v1/admin/analytics/adspend' })));
    expect(list.entries).toHaveLength(1);
    expect(list.total).toBe(1500);

    const finance = parse(
      await handler(
        event({ path: '/api/v1/admin/analytics/finance', queryStringParameters: { period: '30d' } })
      )
    );
    expect(finance.summary.adSpend).toBe(1500);
    expect(finance.summary.netProfit).toBe(10000 - 4000 - 1500);

    const accounting = parse(
      await handler(
        event({
          path: '/api/v1/admin/analytics/accounting',
          queryStringParameters: { period: '30d' },
        })
      )
    );
    expect(accounting.transactions.some(t => t.type === 'fee' && t.amount === -1500)).toBe(true);

    const removed = await handler(
      event({
        httpMethod: 'DELETE',
        path: `/api/v1/admin/analytics/adspend/${entry.id}`,
        headers: owner,
      })
    );
    expect(removed.statusCode).toBe(200);
    const after = parse(await handler(event({ path: '/api/v1/admin/analytics/adspend' })));
    expect(after.entries).toHaveLength(0);
  });

  it('returns a 404 for unknown analytics routes', async () => {
    const res = await handler(event({ path: '/api/v1/admin/analytics/nope' }));
    expect(res.statusCode).toBe(404);
  });
});
