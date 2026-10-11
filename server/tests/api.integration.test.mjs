// API integracijski testovi — DALLI REST /api/v1 (+admin)
// Pokretanje: node scripts/run-api-tests.mjs  (spawnuje test server na :3100, dalli_test baza)
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const ORIGIN = 'http://localhost:5173'; // dozvoljen (FRONTEND_URL)
const prisma = new PrismaClient();

const PASSWORD = 'Dalli!Dev2026';

function collectCookies(res) {
  const set = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  return set.map(c => c.split(';')[0]).join('; ');
}
const merge = (a, b) => [a, b].filter(Boolean).join('; ');

async function req(pathname, { method = 'GET', body, origin, jar = '', headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (origin) h.origin = origin;
  if (jar) h.cookie = jar;
  const res = await fetch(BASE + pathname, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  return { res, json, text };
}

async function login(email, password = PASSWORD, fp = 'testfp') {
  const r = await req('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password, deviceFingerprint: fp },
    origin: ORIGIN,
  });
  return { jar: collectCookies(r.res), ...r };
}

describe('A. Health & public', () => {
  it('health: ok, db up, memory cache', async () => {
    const { res, json } = await req('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(json.status, 'ok');
    assert.equal(json.db, 'up');
    assert.equal(json.cache, 'memory');
    assert.ok(typeof json.version === 'string');
  });

  it('payment-methods: default set (4)', async () => {
    const { json } = await req('/api/v1/payment-methods');
    const names = (json.methods || []).map(m => m.method);
    assert.deepEqual(names, ['card', 'crypto', 'bank_transfer', 'cod']);
  });

  it('products: list published', async () => {
    const { json } = await req('/api/v1/products?limit=3');
    assert.ok(Array.isArray(json.products) && json.products.length > 0);
    assert.ok(json.products[0].sku);
  });

  it('products/:slug: detail with sizes+inventory', async () => {
    const { res, json } = await req('/api/v1/products/osnovna-majica');
    assert.equal(res.status, 200);
    assert.equal(json.product.slug, 'osnovna-majica');
    assert.ok(json.product.sizes.some(s => s.name === 'S' && s.inventory));
  });

  it('search: returns hits for "majica"', async () => {
    const { json } = await req('/api/v1/search?q=majica');
    assert.ok(Array.isArray(json.products) && json.products.length > 0);
  });

  it('collections: non-empty', async () => {
    const { json } = await req('/api/v1/collections');
    assert.ok(Array.isArray(json.collections) && json.collections.length > 0);
  });

  it('sitemap-products: 200', async () => {
    const { res } = await req('/api/v1/sitemap-products');
    assert.equal(res.status, 200);
  });

  it('unknown route: 404 json', async () => {
    const { res, json } = await req('/api/v1/nonexistent-route');
    assert.equal(res.status, 404);
    assert.ok(json.error);
  });
});

describe('B. Auth, sessions, refresh, CSRF, register', () => {
  let owner = { jar: '' };

  it('login owner: cookies + me', async () => {
    const r = await login('owner@dalli.rs');
    assert.equal(r.res.status, 200);
    assert.ok(r.jar.includes('access_token='));
    assert.ok(r.jar.includes('refresh_token='));
    assert.ok(r.jar.includes('csrf_token='));
    owner.jar = r.jar;

    const me = await req('/api/v1/auth/me', { jar: owner.jar });
    assert.equal(me.res.status, 200);
    assert.equal(me.json.user.email, 'owner@dalli.rs');
    assert.ok(me.json.roles.includes('owner'));
    assert.ok(me.json.sessionId);
  });

  it('login wrong password: 401', async () => {
    const r = await req('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'owner@dalli.rs', password: 'wrong-password-xx', deviceFingerprint: 'x' },
      origin: ORIGIN,
    });
    assert.equal(r.res.status, 401);
  });

  it('refresh rotation: new token issued, old rejected', async () => {
    const old = owner.jar;
    const r1 = await req('/api/v1/auth/refresh', {
      method: 'POST',
      body: { deviceFingerprint: 'testfp' },
      jar: old,
      origin: ORIGIN,
    });
    assert.equal(r1.res.status, 200);
    assert.ok(r1.json.success);
    const newJar = merge(old, collectCookies(r1.res));
    assert.notEqual(newJar, old);

    const r2 = await req('/api/v1/auth/refresh', {
      method: 'POST',
      body: { deviceFingerprint: 'testfp' },
      jar: old,
      origin: ORIGIN,
    });
    assert.equal(r2.res.status, 401);
    assert.equal(r2.json.code, 'reuse_detected');

    // reuse-detection = odmah revokuje i celu sesiju -> novi login za naredne testove
    const fresh = await login('owner@dalli.rs');
    assert.equal(fresh.res.status, 200);
    owner.jar = fresh.jar;
  });

  it('sessions: lists current session', async () => {
    const { json } = await req('/api/v1/auth/sessions', { jar: owner.jar });
    assert.ok(Array.isArray(json.sessions) && json.sessions.length > 0);
    assert.ok(json.sessions.some(s => s.id === json.currentSessionId));
  });

  it('devices: empty list', async () => {
    const { res, json } = await req('/api/v1/auth/devices', { jar: owner.jar });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(json.devices));
  });

  it('webauthn: credentials GET ok, login options 501', async () => {
    const c = await req('/api/v1/auth/webauthn/credentials', { jar: owner.jar });
    assert.equal(c.res.status, 200);
    assert.ok(Array.isArray(c.json.credentials));
    const o = await req('/api/v1/auth/webauthn/login/options', { method: 'POST' });
    assert.equal(o.res.status, 501);
  });

  it('register new customer + duplicate 409', async () => {
    const email = `customer-${Date.now()}@test.rs`;
    const r = await req('/api/v1/auth/register', {
      method: 'POST',
      origin: ORIGIN,
      body: {
        email,
        password: 'TestPassword1',
        firstName: 'Test',
        lastName: 'Kupac',
        deviceFingerprint: 'regfp',
      },
    });
    assert.equal(r.res.status, 201);
    assert.equal(r.json.user.email, email);
    const cjar = collectCookies(r.res);
    const me = await req('/api/v1/auth/me', { jar: cjar });
    assert.equal(me.json.user.email, email);
    assert.ok(me.json.roles.includes('customer'));

    const dup = await req('/api/v1/auth/register', {
      method: 'POST',
      origin: ORIGIN,
      body: { email, password: 'TestPassword1', deviceFingerprint: 'regfp' },
    });
    assert.equal(dup.res.status, 409);
  });

  it('CSRF: evil origin 403, allowed origin ok', async () => {
    const r = await login('owner@dalli.rs'); // fresh jar
    const evil = await req('/api/v1/auth/logout', {
      method: 'POST',
      jar: r.jar,
      origin: 'http://evil.example',
    });
    assert.equal(evil.res.status, 403);
    assert.ok(
      ['csrf_origin_blocked', 'cors_blocked'].includes(evil.json.code),
      `code=${evil.json.code}`
    );

    const ok = await req('/api/v1/auth/logout', { method: 'POST', jar: r.jar, origin: ORIGIN });
    assert.equal(ok.res.status, 200);
  });

  it('logout-all revokes session', async () => {
    const r = await login('owner@dalli.rs');
    const out = await req('/api/v1/auth/logout-all', {
      method: 'POST',
      jar: r.jar,
      origin: ORIGIN,
    });
    assert.equal(out.res.status, 200);
    const me = await req('/api/v1/auth/me', { jar: collectCookies(out.res) || r.jar });
    assert.equal(me.res.status, 401);
  });
});

describe('C. RBAC enforcement', () => {
  let editor = { jar: '' };

  it('editor login', async () => {
    const r = await login('editor@dalli.rs', PASSWORD, 'edfp');
    assert.equal(r.res.status, 200);
    editor.jar = r.jar;
  });

  it('editor: read products allowed', async () => {
    const { res, json } = await req('/api/v1/admin/products?limit=1', { jar: editor.jar });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(json.products));
  });

  it('editor: delete product 403', async () => {
    const { res, json } = await req('/api/v1/admin/products/1', {
      method: 'DELETE',
      jar: editor.jar,
      origin: ORIGIN,
    });
    assert.equal(res.status, 403);
    assert.ok(json.error);
  });

  it('editor: create user 403 (users.write denied)', async () => {
    const { res } = await req('/api/v1/admin/users', {
      method: 'POST',
      jar: editor.jar,
      origin: ORIGIN,
      body: { email: 'nobody@dalli.rs', password: 'SomePass1', roleId: 'editor' },
    });
    assert.equal(res.status, 403);
  });

  it('owner: orders list 200', async () => {
    const r = await login('owner@dalli.rs');
    const { res } = await req('/api/v1/admin/orders?limit=1', { jar: r.jar });
    assert.equal(res.status, 200);
  });
});

describe('D. Checkout + stock + audit + payment rules', () => {
  let ownerJar = '';
  let stockBefore = null;

  it('owner login (for admin asserts)', async () => {
    const r = await login('owner@dalli.rs');
    assert.equal(r.res.status, 200);
    ownerJar = r.jar;
  });

  it('cod checkout: order + stock decrement + movement + audit', async () => {
    const inv = await prisma.inventory.findFirst({
      where: {
        productSize: { productId: 1, name: 'S' },
      },
    });
    assert.ok(inv, 'inventory za osnovna-majica S postoji');
    stockBefore = inv.quantity;

    const shippingAddress = {
      firstName: 'Test',
      lastName: 'Buyer',
      address1: 'Ul 1',
      city: 'Beograd',
      postalCode: '11000',
      country: 'RS',
      email: 'buyer@example.com',
    };
    const r = await req('/api/v1/checkout', {
      method: 'POST',
      origin: ORIGIN,
      body: {
        items: [{ productId: 1, quantity: 1, size: 'S' }],
        shippingAddress,
        paymentMethod: 'cod',
      },
    });
    assert.equal(r.res.status, 201);
    assert.equal(r.json.order.status, 'confirmed');
    assert.ok(r.json.order.orderNumber.startsWith('DAL-'));
    assert.ok(r.json.order.total > 0);
    assert.equal(r.json.payment.method, 'cod');
    assert.equal(r.json.payment.status, 'pending');

    const after = await prisma.inventory.findUnique({ where: { id: inv.id } });
    assert.equal(after.quantity, stockBefore - 1);

    const mov = await prisma.inventoryMovement.findFirst({
      where: { inventoryId: inv.id, reason: 'order', orderId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(mov, 'movement kreiran sa orderId');
    assert.equal(mov.delta, -1);

    const audit = await prisma.auditLog.findFirst({
      where: { eventType: 'ORDER_CREATED' },
      orderBy: { timestamp: 'desc' },
    });
    assert.ok(audit, 'ORDER_CREATED audit zapis');
    assert.equal(audit.metadata.orderNumber, r.json.order.orderNumber);
  });

  it('checkout validations: empty cart / bad method / bad size', async () => {
    const addr = { address1: 'x', city: 'y', postalCode: '11000' };
    let r = await req('/api/v1/checkout', {
      method: 'POST',
      origin: ORIGIN,
      body: { items: [], shippingAddress: addr, paymentMethod: 'cod' },
    });
    assert.equal(r.res.status, 400);

    r = await req('/api/v1/checkout', {
      method: 'POST',
      origin: ORIGIN,
      body: {
        items: [{ productId: 1, quantity: 1, size: 'S' }],
        shippingAddress: addr,
        paymentMethod: 'paypal',
      },
    });
    assert.equal(r.res.status, 400);

    r = await req('/api/v1/checkout', {
      method: 'POST',
      origin: ORIGIN,
      body: {
        items: [{ productId: 1, quantity: 1, size: 'ZZ9' }],
        shippingAddress: addr,
        paymentMethod: 'cod',
      },
    });
    assert.equal(r.res.status, 400);
  });

  it('crypto checkout: quote created', async () => {
    const r = await req('/api/v1/checkout', {
      method: 'POST',
      origin: ORIGIN,
      body: {
        items: [{ productId: 4, quantity: 1, size: 'S' }],
        shippingAddress: {
          firstName: 'A',
          lastName: 'B',
          address1: 'ul',
          city: 'BG',
          postalCode: '11000',
          country: 'RS',
        },
        paymentMethod: 'crypto',
        cryptoCurrency: 'BTC',
      },
    });
    assert.equal(r.res.status, 201);
    assert.equal(r.json.payment.method, 'crypto');

    const ct = await prisma.cryptoTransaction.findUnique({
      where: { paymentId: r.json.payment.id },
    });
    assert.ok(ct, 'cryptoTransaction postoji');
    assert.equal(ct.currency, 'BTC');
    assert.ok(ct.walletAddress);
    assert.ok(ct.expiresAt > new Date());
    assert.equal(ct.requiredConfirmations, 3);
  });

  it('order lookup: matches by email, wrong email 404', async () => {
    const order = await prisma.order.findFirst({
      where: { paymentMethod: 'cod' },
      orderBy: { createdAt: 'desc' },
    });
    const ok = await req('/api/v1/orders/lookup', {
      method: 'POST',
      origin: ORIGIN,
      body: { orderNumber: order.orderNumber, email: 'buyer@example.com' },
    });
    assert.equal(ok.res.status, 200);
    assert.equal(ok.json.order.orderNumber, order.orderNumber);

    const bad = await req('/api/v1/orders/lookup', {
      method: 'POST',
      origin: ORIGIN,
      body: { orderNumber: order.orderNumber, email: 'nobody@example.com' },
    });
    assert.equal(bad.res.status, 404);
  });

  it('payment rule: crypto-only blocks cod, allows crypto', async () => {
    const created = await req('/api/v1/admin/payment-rules', {
      method: 'POST',
      origin: ORIGIN,
      jar: ownerJar,
      body: { method: 'crypto', enabled: true, sortOrder: 1, minOrderTotal: 0 },
    });
    assert.equal(created.res.status, 201);
    const ruleId = created.json.rule.id;
    assert.ok(ruleId);

    const body = {
      items: [{ productId: 1, quantity: 1, size: 'S' }],
      shippingAddress: {
        firstName: 'A',
        lastName: 'B',
        address1: 'ul',
        city: 'BG',
        postalCode: '11000',
        country: 'RS',
      },
      paymentMethod: 'cod',
    };
    const blocked = await req('/api/v1/checkout', { method: 'POST', origin: ORIGIN, body });
    assert.equal(blocked.res.status, 400);
    assert.equal(blocked.json.error, 'Payment method cod is not available');

    const crypt = await req('/api/v1/checkout', {
      method: 'POST',
      origin: ORIGIN,
      body: { ...body, paymentMethod: 'crypto' },
    });
    assert.equal(crypt.res.status, 201);

    const disable = await req(`/api/v1/admin/payment-rules/${ruleId}`, {
      method: 'PUT',
      origin: ORIGIN,
      jar: ownerJar,
      body: { enabled: false },
    });
    assert.equal(disable.res.status, 200);

    const def = await req('/api/v1/payment-methods');
    assert.equal((def.json.methods || []).length, 4);
  });
});

describe('F. Order lifecycle, webhook, refunds, audit', () => {
  let owner = { jar: '' };
  const addr = {
    firstName: 'A',
    lastName: 'B',
    address1: 'ul',
    city: 'BG',
    postalCode: '11000',
    country: 'RS',
    email: 'buyer@example.com',
  };

  async function codOrder(productId = 1, size = 'S') {
    const r = await req('/api/v1/checkout', {
      method: 'POST',
      origin: ORIGIN,
      body: {
        items: [{ productId, quantity: 1, size }],
        shippingAddress: addr,
        paymentMethod: 'cod',
      },
    });
    assert.equal(r.res.status, 201);
    return r.json;
  }
  async function cryptoOrder() {
    const r = await req('/api/v1/checkout', {
      method: 'POST',
      origin: ORIGIN,
      body: {
        items: [{ productId: 4, quantity: 1, size: 'S' }],
        shippingAddress: addr,
        paymentMethod: 'crypto',
        cryptoCurrency: 'BTC',
      },
    });
    assert.equal(r.res.status, 201);
    return r.json;
  }

  it('owner login (admin)', async () => {
    const r = await login('owner@dalli.rs');
    assert.equal(r.res.status, 200);
    owner.jar = r.jar;
  });

  it('mock payment confirm: COD payment → completed + order paid', async () => {
    const ord = await codOrder();
    assert.equal(ord.payment.status, 'pending');

    const conf = await req(`/api/v1/payments/${ord.payment.id}/confirm`, { method: 'POST' });
    assert.equal(conf.res.status, 200);
    assert.equal(conf.json.payment.status, 'completed');
    assert.ok(conf.json.payment.paidAt);

    const db = await prisma.order.findUnique({ where: { id: ord.order.id } });
    assert.equal(db.paymentStatus, 'paid');
    assert.equal(db.status, 'confirmed');

    const audit = await prisma.auditLog.findFirst({
      where: {
        eventType: 'PAYMENT_COMPLETED',
        metadata: { path: ['paymentId'], equals: ord.payment.id },
      },
    });
    assert.ok(audit, 'PAYMENT_COMPLETED audit zapis');

    const again = await req(`/api/v1/payments/${ord.payment.id}/confirm`, { method: 'POST' });
    assert.equal(again.res.status, 409);
  });

  it('webhook: idempotent completion + crypto tx update', async () => {
    const ord = await cryptoOrder();
    const ev = `evt-${Date.now()}`;
    const body = {
      gatewayEventId: ev,
      status: 'completed',
      paymentId: ord.payment.id,
      cryptoTxHash: '0xTEST',
      confirmations: 3,
    };

    const h = await req('/api/v1/payments/webhook/mock_crypto', {
      method: 'POST',
      origin: ORIGIN,
      body,
    });
    assert.equal(h.res.status, 200);
    assert.equal(h.json.received, true);
    assert.equal(h.json.status, 'completed');
    assert.ok(!h.json.duplicate, 'prvi put nije duplicate');

    const dup = await req('/api/v1/payments/webhook/mock_crypto', {
      method: 'POST',
      origin: ORIGIN,
      body,
    });
    assert.equal(dup.res.status, 200);
    assert.equal(dup.json.duplicate, true);

    const db = await prisma.order.findUnique({ where: { id: ord.order.id } });
    assert.equal(db.paymentStatus, 'paid');
    const ct = await prisma.cryptoTransaction.findUnique({ where: { paymentId: ord.payment.id } });
    assert.equal(ct.txHash, '0xTEST');
    assert.equal(ct.confirmations, 3);
  });

  it('webhook failed: restores stock + cancel movement', async () => {
    const inv = await prisma.inventory.findFirst({
      where: { productSize: { productId: 1, name: 'S' } },
    });
    const before = inv.quantity;
    const ord = await codOrder();
    const mid = await prisma.inventory.findUnique({ where: { id: inv.id } });
    assert.equal(mid.quantity, before - 1);

    const body = {
      gatewayEventId: `evt-fail-${Date.now()}`,
      status: 'failed',
      paymentId: ord.payment.id,
    };
    const h = await req('/api/v1/payments/webhook/mock_crypto', {
      method: 'POST',
      origin: ORIGIN,
      body,
    });
    assert.equal(h.res.status, 200);
    assert.equal(h.json.status, 'failed');

    const after = await prisma.inventory.findUnique({ where: { id: inv.id } });
    assert.equal(after.quantity, before, 'stock vracen posle failed placanja');
    const mov = await prisma.inventoryMovement.findFirst({
      where: { inventoryId: inv.id, reason: 'cancel', note: 'payment failed' },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(mov, 'cancel movement kreiran');
    assert.equal(mov.delta, 1);
    const db = await prisma.order.findUnique({ where: { id: ord.order.id } });
    assert.equal(db.paymentStatus, 'failed');
  });

  it('admin: order status shipped/delivered + history + audit filter', async () => {
    const ord = await codOrder();

    const shipped = await req(`/api/v1/admin/orders/${ord.order.id}/status`, {
      method: 'PATCH',
      origin: ORIGIN,
      jar: owner.jar,
      body: { status: 'shipped' },
    });
    assert.equal(shipped.res.status, 200);
    assert.equal(shipped.json.order.status, 'shipped');
    assert.ok(shipped.json.order.shippedAt);

    const delivered = await req(`/api/v1/admin/orders/${ord.order.id}/status`, {
      method: 'PATCH',
      origin: ORIGIN,
      jar: owner.jar,
      body: { status: 'delivered' },
    });
    assert.equal(delivered.res.status, 200);
    assert.ok(delivered.json.order.deliveredAt);

    const detail = await req(`/api/v1/admin/orders/${ord.order.id}`, { jar: owner.jar });
    assert.equal(detail.res.status, 200);
    const statuses = detail.json.order.statusHistory.map(s => s.toStatus);
    assert.ok(statuses.includes('shipped') && statuses.includes('delivered'));

    const audit = await req(`/api/v1/admin/audit-logs?eventType=ORDER_STATUS_CHANGED&limit=20`, {
      jar: owner.jar,
    });
    assert.equal(audit.res.status, 200);
    assert.ok(audit.json.count > 0);
    assert.ok(
      audit.json.logs.every(l => l.eventType === 'ORDER_STATUS_CHANGED'),
      'filter primenjen (STEP 13 fix)'
    );
  });

  it('admin: orders export CSV', async () => {
    const { res, text } = await req('/api/v1/admin/orders/export', { jar: owner.jar });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/csv/);
    const lines = text.split('\n');
    assert.ok(lines[0].startsWith('orderNumber,date,email,status,paymentStatus'));
    assert.ok(lines.length >= 2);
  });

  it('admin: payments list + refund (409 on second)', async () => {
    const ord = await codOrder();
    await req(`/api/v1/payments/${ord.payment.id}/confirm`, { method: 'POST' });

    const list = await req('/api/v1/admin/payments', { jar: owner.jar });
    assert.equal(list.res.status, 200);
    assert.ok(list.json.count > 0);
    assert.ok(list.json.payments.some(p => p.id === ord.payment.id));

    const ref = await req(`/api/v1/admin/payments/${ord.payment.id}/refund`, {
      method: 'POST',
      origin: ORIGIN,
      jar: owner.jar,
      body: {},
    });
    assert.equal(ref.res.status, 200);
    assert.equal(ref.json.payment.status, 'refunded');
    assert.equal(ref.json.payment.refundedAmount, ord.payment.amount);

    const ref2 = await req(`/api/v1/admin/payments/${ord.payment.id}/refund`, {
      method: 'POST',
      origin: ORIGIN,
      jar: owner.jar,
      body: {},
    });
    assert.equal(ref2.res.status, 409);
  });
});

describe('E. Lockout + rate limit (poslednji)', () => {
  it('login lockout: 5 fails -> 423 email_locked', async () => {
    const email = 'locktest@dalli.rs';
    const pw = 'WrongPass1';
    for (let i = 0; i < 5; i++) {
      const r = await req('/api/v1/auth/login', {
        method: 'POST',
        origin: ORIGIN,
        body: { email, password: pw, deviceFingerprint: 'lp' },
      });
      assert.equal(r.res.status, 401);
    }
    const locked = await req('/api/v1/auth/login', {
      method: 'POST',
      origin: ORIGIN,
      body: { email, password: pw, deviceFingerprint: 'lp' },
    });
    assert.equal(locked.res.status, 423);
    assert.equal(locked.json.code, 'email_locked');
    assert.equal(locked.res.headers.get('retry-after'), '900');
  });

  it('rate limit: burst triggers 429 (mora biti poslednji test)', async () => {
    let sawOk = 0;
    let saw429 = 0;
    let limitHeader = null;
    for (let i = 0; i < 250; i++) {
      const r = await fetch(`${BASE}/api/v1/health`);
      if (i === 0) limitHeader = r.headers.get('x-ratelimit-limit');
      if (r.status === 200) sawOk++;
      else if (r.status === 429) {
        saw429++;
        const j = await r.json();
        assert.equal(j.code, 'rate_limited');
        break; // cilj je da vidimo makar jednu 429
      }
    }
    assert.equal(limitHeader, '120');
    assert.ok(saw429 >= 1, `ocekivana bar jedna 429 (200=${sawOk}, 429=${saw429})`);
    assert.ok(sawOk >= 1, 'ali mora i neki prolaz pre limita');
  });
});

process.on('exit', () => prisma.$disconnect());
