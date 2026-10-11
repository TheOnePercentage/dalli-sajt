import { describe, it, expect, beforeEach, vi } from 'vitest';

const memory = new Map();

vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    get: async (key, opts) => {
      const raw = memory.get(key);
      if (raw === undefined) return null;
      if (opts && opts.type === 'json') return JSON.parse(raw);
      return raw;
    },
    setJSON: async (key, value) => {
      memory.set(key, JSON.stringify(value));
    },
  }),
}));

const { default: handler } = await import('../../../netlify/functions/orders.js');

const event = (over = {}) => ({
  httpMethod: 'GET',
  path: '/api/orders',
  queryStringParameters: {},
  headers: {},
  body: null,
  ...over,
});

const parse = res => JSON.parse(res.body);

const validPayload = {
  userId: 'user_test_1',
  customer: {
    firstName: 'Test',
    lastName: 'Kupac',
    email: 'test.kupac@example.com',
    phone: '+381 60 000 0000',
  },
  shippingAddress: {
    address: 'Knez Mihailova 1',
    city: 'Beograd',
    postalCode: '11000',
    country: 'RS',
  },
  payment: { method: 'cod' },
  items: [
    {
      productId: 'prod_1',
      variantId: 'var_1',
      name: 'Osnovna Majica',
      color: 'Crna',
      size: 'M',
      price: 1290,
      qty: 2,
    },
  ],
  totals: { subtotal: 2580, shipping: 290, discount: 0 },
};

describe('netlify/functions/orders', () => {
  beforeEach(() => memory.clear());

  it('rejects an order without items', async () => {
    const res = await handler(
      event({ httpMethod: 'POST', body: JSON.stringify({ ...validPayload, items: [] }) })
    );
    expect(res.statusCode).toBe(400);
    expect(parse(res).success).toBe(false);
  });

  it('rejects an order without a complete address', async () => {
    const res = await handler(
      event({
        httpMethod: 'POST',
        body: JSON.stringify({ ...validPayload, shippingAddress: { city: 'Beograd' } }),
      })
    );
    expect(res.statusCode).toBe(400);
  });

  it('creates one real order and returns a storefront shape', async () => {
    const res = await handler(
      event({ httpMethod: 'POST', body: JSON.stringify(validPayload) })
    );
    expect(res.statusCode).toBe(201);
    const data = parse(res);
    expect(data.success).toBe(true);
    expect(data.orderNumber).toMatch(/^DAL-\d{8}-[A-Z0-9]{6}$/);
    expect(data.order.total).toBe(2580 + 290);
    expect(data.order.items).toHaveLength(1);
    expect(memory.get('orders')).toBeTruthy();
  });

  it('lists the created order for the admin surface', async () => {
    await handler(event({ httpMethod: 'POST', body: JSON.stringify(validPayload) }));
    const res = await handler(event({ httpMethod: 'GET', path: '/api/v1/admin/orders' }));
    expect(res.statusCode).toBe(200);
    const list = parse(res);
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('new');
    expect(list[0].payment).toBe('cod');
  });

  it('updates status via the admin PATCH route and records history', async () => {
    const created = parse(
      await handler(event({ httpMethod: 'POST', body: JSON.stringify(validPayload) }))
    );
    const id = created.orderNumber;
    const res = await handler(
      event({
        httpMethod: 'PATCH',
        path: `/api/v1/admin/orders/${id}/status`,
        body: JSON.stringify({ status: 'shipped', notes: 'Poslato danas' }),
      })
    );
    expect(res.statusCode).toBe(200);
    const data = parse(res);
    expect(data.success).toBe(true);
    expect(data.order.status).toBe('shipped');

    const stored = JSON.parse(memory.get('orders'));
    expect(stored[0].status).toBe('shipped');
    expect(stored[0].statusHistory.at(-1).to).toBe('shipped');
  });

  it('returns a single order by id', async () => {
    const created = parse(
      await handler(event({ httpMethod: 'POST', body: JSON.stringify(validPayload) }))
    );
    const id = created.orderNumber;
    const res = await handler(
      event({ httpMethod: 'GET', path: `/api/v1/admin/orders/${id}` })
    );
    expect(res.statusCode).toBe(200);
    expect(parse(res).order.id).toBe(id);
  });

  const createOrder = async () =>
    parse(await handler(event({ httpMethod: 'POST', body: JSON.stringify(validPayload) })))
      .orderNumber;

  const adminEvent = (over = {}) =>
    event({
      path: '/api/v1/admin/orders',
      headers: { 'x-admin-role': 'admin', 'x-admin-name': 'Marko Admin' },
      ...over,
    });

  const ownerEvent = (over = {}) =>
    event({
      path: '/api/v1/admin/orders',
      headers: { 'x-admin-role': 'vlasnik', 'x-admin-name': 'Vlasnik' },
      ...over,
    });

  it('non-owner delete moves the order to trash (not permanent)', async () => {
    const id = await createOrder();
    const res = await handler(
      adminEvent({ httpMethod: 'DELETE', path: `/api/v1/admin/orders/${id}` })
    );
    expect(res.statusCode).toBe(200);
    expect(parse(res).mode).toBe('trash');

    // Gone from the active list ...
    const active = parse(await handler(adminEvent({ httpMethod: 'GET' })));
    expect(active).toHaveLength(0);

    // ... but visible in the trash.
    const trash = parse(
      await handler(adminEvent({ httpMethod: 'GET', queryStringParameters: { trash: '1' } }))
    );
    expect(trash).toHaveLength(1);
    expect(trash[0].id).toBe(id);
    expect(trash[0].trashedByName).toBe('Marko Admin');
    expect(trash[0]._raw.trashed).toBe(true);
  });

  it('restores a trashed order back to the active list', async () => {
    const id = await createOrder();
    await handler(adminEvent({ httpMethod: 'DELETE', path: `/api/v1/admin/orders/${id}` }));
    const res = await handler(
      adminEvent({ httpMethod: 'POST', path: `/api/v1/admin/orders/${id}/restore` })
    );
    expect(res.statusCode).toBe(200);
    const active = parse(await handler(adminEvent({ httpMethod: 'GET' })));
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(id);
  });

  it('admin purge removes the order and creates an owner-only notification', async () => {
    const id = await createOrder();
    await handler(adminEvent({ httpMethod: 'DELETE', path: `/api/v1/admin/orders/${id}` }));
    const purge = await handler(
      adminEvent({ httpMethod: 'POST', path: `/api/v1/admin/orders/${id}/purge` })
    );
    expect(parse(purge).mode).toBe('purge');
    expect(parse(await handler(adminEvent({ httpMethod: 'GET' })))).toHaveLength(0);

    // Owner sees the notification ...
    const ownerFeed = parse(
      await handler(ownerEvent({ httpMethod: 'GET', path: '/api/v1/admin/orders/notifications' }))
    );
    expect(ownerFeed.unread).toBe(1);
    expect(ownerFeed.notifications).toHaveLength(1);
    expect(ownerFeed.notifications[0].type).toBe('order_purged');
    expect(ownerFeed.notifications[0].deletedBy.name).toBe('Marko Admin');
    expect(ownerFeed.notifications[0].order.orderNumber).toBe(id);
  });

  it('purge notifications are hidden from non-owner admins', async () => {
    const id = await createOrder();
    await handler(adminEvent({ httpMethod: 'DELETE', path: `/api/v1/admin/orders/${id}` }));
    await handler(adminEvent({ httpMethod: 'POST', path: `/api/v1/admin/orders/${id}/purge` }));
    const res = await handler(
      adminEvent({ httpMethod: 'GET', path: '/api/v1/admin/orders/notifications' })
    );
    expect(res.statusCode).toBe(403);
    expect(parse(res).notifications).toEqual([]);
  });

  it('owner delete is permanent and never enters the trash', async () => {
    const id = await createOrder();
    const res = await handler(
      ownerEvent({ httpMethod: 'DELETE', path: `/api/v1/admin/orders/${id}` })
    );
    expect(res.statusCode).toBe(200);
    expect(parse(res).mode).toBe('hard');
    const active = parse(await handler(ownerEvent({ httpMethod: 'GET' })));
    expect(active).toHaveLength(0);
    const trash = parse(
      await handler(adminEvent({ httpMethod: 'GET', queryStringParameters: { trash: '1' } }))
    );
    expect(trash).toHaveLength(0);
  });

  it('storefront list never returns trashed orders', async () => {
    const id = await createOrder();
    await handler(adminEvent({ httpMethod: 'DELETE', path: `/api/v1/admin/orders/${id}` }));
    const res = await handler(event({ httpMethod: 'GET', path: '/api/orders' }));
    const data = parse(res);
    expect(data.orders).toHaveLength(0);
    expect(data.pagination.total).toBe(0);
  });
});

