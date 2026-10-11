/**
 * Netlify Function - Orders
 * Real, persisted order store backed by Netlify Blobs (store `orders`, key `orders`).
 * Serves BOTH the customer-facing storefront API and the admin API:
 *
 *   Storefront (mapped by redirect from /api/orders):
 *     POST   /api/orders                       -> create order
 *     GET    /api/orders?page&limit&userId...  -> { orders, pagination }
 *     POST   /api/orders/reorder               -> { success, orderId, items }
 *     POST   /api/orders/:id/cancel-return     -> cancel / return
 *
 *   Admin (mapped by redirect from /api/v1/admin/orders):
 *     GET    /api/v1/admin/orders              -> [ admin-shaped orders ]
 *     GET    /api/v1/admin/orders?trash=1      -> [ trashed orders ]
 *     GET    /api/v1/admin/orders/:id          -> admin-shaped order
 *     PATCH  /api/v1/admin/orders/:id/status   -> update status (+notes)
 *     DELETE /api/v1/admin/orders/:id          -> owner: hard delete | admin: move to trash
 *     POST   /api/v1/admin/orders/:id/restore  -> restore from trash
 *     POST   /api/v1/admin/orders/:id/purge    -> permanently delete (admin purge -> owner notification)
 *     GET    /api/v1/admin/orders/notifications -> OWNER ONLY: admin deletion log
 *     POST   /api/v1/admin/orders/notifications/read -> mark owner notifications read
 *
 * No orders are ever fabricated here: every record is created from a real
 * checkout submission (or an explicit owner action).
 */

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'orders';
const ORDERS_KEY = 'orders';
const NOTIFICATIONS_KEY = 'notifications';
const MAX_ORDERS = 2000;
const MAX_NOTIFICATIONS = 500;

const OWNER_ROLES = ['vlasnik', 'owner', 'super_admin', 'superadmin', 'founder', 'root'];

const STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
];

function getOrdersStore() {
  const options = { name: STORE_NAME };
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
    options.siteID = process.env.NETLIFY_SITE_ID;
    options.token = process.env.NETLIFY_AUTH_TOKEN;
  }
  return getStore(options);
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

async function loadOrders(store) {
  try {
    const orders = await store.get(ORDERS_KEY, { type: 'json' });
    if (Array.isArray(orders)) return orders;
  } catch (err) {
    if (err && err.message && !/404|not found/i.test(err.message)) {
      console.warn('[Orders] Read failed:', err.message);
    }
  }
  return [];
}

function orderNumber() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += Math.floor(Math.random() * 36)
      .toString(36)
      .toUpperCase();
  }
  return `DAL-${ymd}-${rand}`;
}

function normalizePaymentMethod(method) {
  const m = String(method || '').toLowerCase();
  if (['card', 'crypto', 'cod', 'bank_transfer', 'bank-transfer'].includes(m)) {
    return m === 'bank-transfer' ? 'bank_transfer' : m;
  }
  return 'cod';
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const price = toNumber(raw.price, 0);
  const qty = Math.max(1, parseInt(raw.qty ?? raw.quantity, 10) || 1);
  return {
    productId: raw.productId ?? raw.id ?? null,
    variantId: raw.variantId ?? null,
    name: String(raw.name || 'Proizvod').slice(0, 200),
    color: raw.color || null,
    size: raw.size || null,
    price,
    qty,
    image: raw.image || null,
    totalPrice: Math.round(price * qty),
  };
}

function buildOrder(body) {
  const items = (Array.isArray(body.items) ? body.items : []).map(normalizeItem).filter(Boolean);
  if (!items.length) {
    return { error: 'Porudžbina mora sadržati najmanje jednu stavku' };
  }

  const customer = body.customer && typeof body.customer === 'object' ? body.customer : {};
  const shippingRaw = body.shippingAddress || body.shipping || {};
  const address = shippingRaw.address || shippingRaw.address1 || '';
  const city = shippingRaw.city || '';
  const postalCode = shippingRaw.postalCode || '';

  if (!address || !city || !postalCode) {
    return { error: 'Kompletna adresa dostave je obavezna' };
  }
  if (!customer.email) {
    return { error: 'E-mail kupca je obavezan' };
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totals = body.totals && typeof body.totals === 'object' ? body.totals : {};
  const shipping = Math.max(0, toNumber(totals.shipping ?? body.shipping, 0));
  const discount = Math.max(0, toNumber(totals.discount ?? body.discount, 0));
  const cryptoDiscount = Math.max(0, toNumber(totals.cryptoDiscount, 0));
  const total = Math.max(0, subtotal - discount - cryptoDiscount + shipping);

  const now = new Date().toISOString();
  const payment = body.payment && typeof body.payment === 'object' ? body.payment : {};
  const number = orderNumber();

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
    customer.name ||
    customer.email;

  return {
    order: {
      id: number,
      orderNumber: number,
      userId: body.userId || customer.userId || null,
      status: 'pending',
      customer: {
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        name,
        email: String(customer.email),
        phone: customer.phone || '',
        marketingConsent: !!customer.marketingConsent,
      },
      shippingAddress: {
        address,
        city,
        postalCode,
        country: shippingRaw.country || 'RS',
        instructions: shippingRaw.instructions || '',
      },
      paymentMethod: normalizePaymentMethod(payment.method || body.paymentMethod),
      paymentMeta: payment.cardNumber ? { last4: String(payment.cardNumber).slice(-4) } : null,
      items,
      totals: { subtotal, shipping, discount, cryptoDiscount, total },
      subtotal,
      shipping,
      total,
      currency: body.currency || 'RSD',
      promoCode: body.promoCode || null,
      notes: body.notes || body.customerNotes || '',
      statusHistory: [{ from: null, to: 'pending', at: now, note: 'Porudžbina kreirana' }],
      createdAt: now,
      updatedAt: now,
      trackingNumber: null,
    },
  };
}

// ---- shape mappers -------------------------------------------------------

function toStorefront(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    total: order.total,
    currency: order.currency || 'RSD',
    trackingNumber: order.trackingNumber || null,
    items: (order.items || []).map(i => ({
      name: i.name,
      price: i.price,
      qty: i.qty,
      image: i.image,
      color: i.color,
      size: i.size,
    })),
  };
}

const ADMIN_STATUS = {
  pending: 'new',
  confirmed: 'confirmed',
  processing: 'processing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  returned: 'cancelled',
  refunded: 'cancelled',
};

const ADMIN_PAYMENT = {
  cod: 'cod',
  bank_transfer: 'bank',
  card: 'card',
  crypto: 'crypto',
};

function toAdmin(order) {
  const c = order.customer || {};
  const a = order.shippingAddress || {};
  return {
    id: order.orderNumber,
    date: order.createdAt,
    customer: {
      name: c.name || c.email,
      email: c.email,
      phone: c.phone,
      address: a.address,
      city: a.city,
      postalCode: a.postalCode,
    },
    items: (order.items || []).map(i => ({ name: i.name, price: i.price, qty: i.qty })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    payment: ADMIN_PAYMENT[order.paymentMethod] || order.paymentMethod,
    status: ADMIN_STATUS[order.status] || order.status,
    notes: order.notes || '',
    trashed: !!order.trashed,
    trashedAt: order.trashedAt || null,
    trashedBy: order.trashedBy || null,
    trashedByName: order.trashedByName || null,
    _raw: order,
  };
}

// ---- routes --------------------------------------------------------------

function parseSegments(event) {
  const path = event.path || '';
  const idx = path.lastIndexOf('orders');
  const rest = idx === -1 ? '' : path.slice(idx + 'orders'.length);
  return rest.split('/').filter(Boolean);
}

function isAdmin(event) {
  const path = event.path || '';
  if (path.includes('/v1/admin')) return true;
  const params = event.queryStringParameters || {};
  return params.scope === 'admin' || params.surface === 'admin';
}

function lowerHeaders(event) {
  const out = {};
  const h = event.headers || {};
  for (const key of Object.keys(h)) out[String(key).toLowerCase()] = h[key];
  return out;
}

function getActor(event) {
  const headers = lowerHeaders(event);
  const params = event.queryStringParameters || {};
  const role = String(
    headers['x-admin-role'] || params.role || params.adminRole || ''
  ).toLowerCase();
  const name =
    headers['x-admin-name'] ||
    headers['x-admin-email'] ||
    params.actor ||
    params.adminName ||
    'Nepoznat admin';
  const id = headers['x-admin-id'] || params.adminId || name;
  const owner = OWNER_ROLES.includes(role);
  return { id, name: String(name), role, owner };
}

async function loadNotifications(store) {
  try {
    const list = await store.get(NOTIFICATIONS_KEY, { type: 'json' });
    if (Array.isArray(list)) return list;
  } catch (err) {
    if (err && err.message && !/404|not found/i.test(err.message)) {
      console.warn('[Orders] Notifications read failed:', err.message);
    }
  }
  return [];
}

function orderLabel(order) {
  return {
    orderNumber: order.orderNumber,
    customerName: order.customer?.name || order.customer?.email || 'Nepoznat kupac',
    customerEmail: order.customer?.email || '',
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
  };
}

async function pushNotification(store, entry) {
  const list = await loadNotifications(store);
  list.unshift(entry);
  await store.setJSON(NOTIFICATIONS_KEY, list.slice(0, MAX_NOTIFICATIONS));
}

function listOrders(orders, event) {
  const params = event.queryStringParameters || {};
  let list = orders.slice();

  if (params.userId) {
    list = list.filter(o => o.userId && String(o.userId) === String(params.userId));
  }
  if (params.status && params.status !== 'all') {
    const wanted = params.status === 'new' ? 'pending' : params.status;
    list = list.filter(o => o.status === wanted);
  }
  if (params.search) {
    const s = String(params.search).toLowerCase();
    list = list.filter(o => {
      const inItems = (o.items || []).some(i => String(i.name).toLowerCase().includes(s));
      return (
        String(o.orderNumber).toLowerCase().includes(s) ||
        String(o.customer?.name || '')
          .toLowerCase()
          .includes(s) ||
        String(o.customer?.email || '')
          .toLowerCase()
          .includes(s) ||
        inItems
      );
    });
  }
  if (params.dateFrom) {
    list = list.filter(o => new Date(o.createdAt) >= new Date(params.dateFrom));
  }
  if (params.dateTo) {
    const end = new Date(params.dateTo);
    end.setHours(23, 59, 59, 999);
    list = list.filter(o => new Date(o.createdAt) <= end);
  }

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

async function handleCreate(event, store) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return jsonResponse(400, { success: false, error: 'Neispravan JSON' });
  }

  const built = buildOrder(body);
  if (built.error) return jsonResponse(400, { success: false, error: built.error });

  const orders = await loadOrders(store);
  orders.unshift(built.order);
  await store.setJSON(ORDERS_KEY, orders.slice(0, MAX_ORDERS));

  return jsonResponse(201, {
    success: true,
    orderNumber: built.order.orderNumber,
    order: toStorefront(built.order),
  });
}

async function handleReorder(event, store) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return jsonResponse(400, { success: false, error: 'Neispravan JSON' });
  }
  const orders = await loadOrders(store);
  const order = orders.find(o => o.id === body.orderId || o.orderNumber === body.orderId);
  if (!order) return jsonResponse(404, { success: false, error: 'Porudžbina nije pronađena' });
  return jsonResponse(200, { success: true, orderId: order.id, items: order.items });
}

async function handleStatus(event, store, id) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return jsonResponse(400, { success: false, error: 'Neispravan JSON' });
  }
  const next = body.status === 'new' ? 'pending' : body.status;
  if (next && !STATUSES.includes(next)) {
    return jsonResponse(400, { success: false, error: 'Nepoznat status' });
  }

  const orders = await loadOrders(store);
  const idx = orders.findIndex(o => o.id === id || o.orderNumber === id);
  if (idx === -1) return jsonResponse(404, { success: false, error: 'Porudžbina nije pronađena' });

  const order = orders[idx];
  const now = new Date().toISOString();
  if (next && next !== order.status) {
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ from: order.status, to: next, at: now, note: body.notes || '' });
    order.status = next;
  }
  if (typeof body.notes === 'string') order.notes = body.notes;
  order.updatedAt = now;

  orders[idx] = order;
  await store.setJSON(ORDERS_KEY, orders);
  return jsonResponse(200, { success: true, order: toAdmin(order) });
}

async function handleDelete(event, store, id) {
  const actor = getActor(event);
  const orders = await loadOrders(store);
  const idx = orders.findIndex(o => o.id === id || o.orderNumber === id);
  if (idx === -1) return jsonResponse(404, { success: false, error: 'Porudžbina nije pronađena' });

  const order = orders[idx];

  if (actor.owner) {
    // Owner removal is permanent and never enters the trash.
    orders.splice(idx, 1);
    await store.setJSON(ORDERS_KEY, orders);
    return jsonResponse(200, { success: true, mode: 'hard', orderNumber: order.orderNumber });
  }

  // Any non-owner admin moves the order to the trash (recoverable).
  if (!order.trashed) {
    order.trashed = true;
    order.trashedAt = new Date().toISOString();
    order.trashedBy = actor.id;
    order.trashedByName = actor.name;
    order.updatedAt = order.trashedAt;
    orders[idx] = order;
    await store.setJSON(ORDERS_KEY, orders);
  }
  return jsonResponse(200, { success: true, mode: 'trash', order: toAdmin(order) });
}

async function handleRestore(event, store, id) {
  const orders = await loadOrders(store);
  const idx = orders.findIndex(o => o.id === id || o.orderNumber === id);
  if (idx === -1) return jsonResponse(404, { success: false, error: 'Porudžbina nije pronađena' });

  const order = orders[idx];
  order.trashed = false;
  order.trashedAt = null;
  order.trashedBy = null;
  order.trashedByName = null;
  order.updatedAt = new Date().toISOString();
  orders[idx] = order;
  await store.setJSON(ORDERS_KEY, orders);
  return jsonResponse(200, { success: true, order: toAdmin(order) });
}

async function handlePurge(event, store, id) {
  const actor = getActor(event);
  const orders = await loadOrders(store);
  const idx = orders.findIndex(o => o.id === id || o.orderNumber === id);
  if (idx === -1) return jsonResponse(404, { success: false, error: 'Porudžbina nije pronađena' });

  const order = orders[idx];

  // When a non-owner admin permanently deletes from the trash, the owner keeps
  // an audit notification (the admin never sees this entry).
  if (!actor.owner) {
    await pushNotification(store, {
      id: `ntf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'order_purged',
      read: false,
      at: new Date().toISOString(),
      deletedBy: { id: actor.id, name: actor.name, role: actor.role },
      order: orderLabel(order),
      message: `${actor.name} je trajno obrisao porudžbinu ${order.orderNumber} kupca ${
        order.customer?.name || order.customer?.email || 'nepoznat'
      }.`,
    });
  }

  orders.splice(idx, 1);
  await store.setJSON(ORDERS_KEY, orders);
  return jsonResponse(200, { success: true, mode: 'purge', orderNumber: order.orderNumber });
}

async function handleNotificationsGet(event, store) {
  const actor = getActor(event);
  if (!actor.owner) {
    return jsonResponse(403, {
      success: false,
      error: 'Samo vlasnik može da vidi obaveštenja o brisanju.',
      notifications: [],
    });
  }
  const notifications = await loadNotifications(store);
  return jsonResponse(200, {
    success: true,
    unread: notifications.filter(n => !n.read).length,
    notifications,
  });
}

async function handleNotificationsRead(event, store) {
  const actor = getActor(event);
  if (!actor.owner) {
    return jsonResponse(403, { success: false, error: 'Samo vlasnik može da označi obaveštenja.' });
  }
  const notifications = await loadNotifications(store);
  notifications.forEach(n => {
    n.read = true;
  });
  await store.setJSON(NOTIFICATIONS_KEY, notifications);
  return jsonResponse(200, { success: true });
}

async function handleCancel(event, store, id) {
  const orders = await loadOrders(store);
  const idx = orders.findIndex(o => o.id === id || o.orderNumber === id);
  if (idx === -1) return jsonResponse(404, { success: false, error: 'Porudžbina nije pronađena' });
  const order = orders[idx];
  const now = new Date().toISOString();
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    from: order.status,
    to: 'cancelled',
    at: now,
    note: 'Otkazano od strane kupca',
  });
  order.status = 'cancelled';
  order.updatedAt = now;
  orders[idx] = order;
  await store.setJSON(ORDERS_KEY, orders);
  return jsonResponse(200, { success: true, order: toStorefront(order) });
}

export default async function handler(event) {
  const method = event.httpMethod || 'GET';
  const admin = isAdmin(event);
  const segments = parseSegments(event);

  try {
    const store = getOrdersStore();

    // Owner-only notification feed (must precede single-order read)
    if (method === 'GET' && segments.length === 1 && segments[0] === 'notifications') {
      return handleNotificationsGet(event, store);
    }

    // Mark owner notifications as read
    if (method === 'POST' && segments[0] === 'notifications' && segments[1] === 'read') {
      return handleNotificationsRead(event, store);
    }

    // Admin write: /:id/status
    if (
      segments.length === 2 &&
      segments[1] === 'status' &&
      (method === 'PATCH' || method === 'PUT')
    ) {
      return handleStatus(event, store, segments[0]);
    }

    // Restore from trash
    if (method === 'POST' && segments.length === 2 && segments[1] === 'restore') {
      return handleRestore(event, store, segments[0]);
    }

    // Permanently delete from trash
    if (method === 'POST' && segments.length === 2 && segments[1] === 'purge') {
      return handlePurge(event, store, segments[0]);
    }

    // Delete: owner = hard delete, admin = move to trash
    if (method === 'DELETE' && segments.length === 1) {
      return handleDelete(event, store, segments[0]);
    }

    // Reorder
    if (method === 'POST' && segments[0] === 'reorder') {
      return handleReorder(event, store);
    }

    // Cancel / return: /:id/cancel-return
    if (
      method === 'POST' &&
      segments.length === 2 &&
      /cancel-return|cancel|return/.test(segments[1])
    ) {
      return handleCancel(event, store, segments[0]);
    }

    // Create
    if (method === 'POST' && segments.length === 0) {
      return handleCreate(event, store);
    }

    // Read
    if (method === 'GET') {
      const orders = await loadOrders(store);

      // Single order
      if (segments.length === 1) {
        const order = orders.find(o => o.id === segments[0] || o.orderNumber === segments[0]);
        if (!order)
          return jsonResponse(404, { success: false, error: 'Porudžbina nije pronađena' });
        return jsonResponse(200, {
          success: true,
          order: admin ? toAdmin(order) : toStorefront(order),
        });
      }

      const list = listOrders(orders, event);

      if (admin) {
        // Admin filters/paginates client-side; return the full matching list.
        const params = event.queryStringParameters || {};
        const wantTrash =
          params.trash === '1' || params.trash === 'true' || params.filter === 'trash';
        const scoped = list.filter(o => (wantTrash ? !!o.trashed : !o.trashed));
        return jsonResponse(200, scoped.map(toAdmin));
      }

      // Storefront never sees trashed orders.
      const visible = list.filter(o => !o.trashed);
      const params = event.queryStringParameters || {};
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 10));
      const start = (page - 1) * limit;
      const paged = visible.slice(start, start + limit);

      return jsonResponse(200, {
        success: true,
        orders: paged.map(toStorefront),
        pagination: {
          page,
          limit,
          total: visible.length,
          pages: Math.ceil(visible.length / limit) || 1,
        },
      });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[Orders] Error:', err);
    return jsonResponse(500, { success: false, error: err.message });
  }
}
