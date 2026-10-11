/**
 * Netlify Function - Analytics & Reporting
 * Real, persisted analytics backed by Netlify Blobs.
 *
 * Storefront (public, mapped by redirect from /api/analytics/track):
 *   POST /api/analytics/track              -> record a single client event
 *
 * Admin (mapped by redirect from /api/v1/admin/analytics):
 *   GET  /stats?period=                    -> metrics bundle (orders, customers, sessions, adSpend)
 *   GET  /revenue-chart?period=            -> [{ date, value }]
 *   GET  /orders-chart?period=             -> [{ date, value }]
 *   GET  /traffic-sources?period=          -> [{ source, count }]
 *   GET  /device-breakdown?period=         -> [{ device, count }]
 *   GET  /conversion-funnel?period=        -> [{ step, label, count }]
 *   GET  /finance?period=                  -> P&L + monthly + cogs + expenses
 *   GET  /accounting?period=&from=&to=     -> { transactions }
 *   GET  /adspend                          -> { entries, total, byNetwork }
 *   POST /adspend                          -> add entry { date, network, amount, note }
 *   DELETE /adspend/:id                    -> remove entry
 *
 * Nothing here is fabricated: every number is derived from real orders in the
 * `orders` store and real client events persisted by the storefront tracker.
 */

import { getStore } from '@netlify/blobs';

const ORDERS_STORE = 'orders';
const ORDERS_KEY = 'orders';

const ANALYTICS_STORE = 'analytics';
const EVENTS_KEY = 'events';
const ADSPEND_KEY = 'adspend';
const SETTINGS_KEY = 'settings';

const MAX_EVENTS = 20000;
const MAX_ADSPEND = 5000;

const DEFAULT_SETTINGS = {
  cogsRatio: 0.4, // estimated cost of goods sold ratio when real cost data is unavailable
  vatRate: 0.18, // Serbian standard VAT
};

const OWNER_ROLES = ['vlasnik', 'owner', 'super_admin', 'superadmin', 'founder', 'root'];

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

const NON_REVENUE_STATUSES = ['cancelled', 'returned', 'refunded'];

// ---- infrastructure ------------------------------------------------------

function storeOptions(name) {
  const options = { name };
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
    options.siteID = process.env.NETLIFY_SITE_ID;
    options.token = process.env.NETLIFY_AUTH_TOKEN;
  }
  return options;
}

function getAnalyticsStore() {
  return getStore(storeOptions(ANALYTICS_STORE));
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

async function readJson(store, key, fallback) {
  try {
    const value = await store.get(key, { type: 'json' });
    if (value !== null && value !== undefined) return value;
  } catch (err) {
    if (err && err.message && !/404|not found/i.test(err.message)) {
      console.warn('[Analytics] Read failed:', err.message);
    }
  }
  return fallback;
}

function readOrders() {
  return readJson(getStore(storeOptions(ORDERS_STORE)), ORDERS_KEY, []);
}

function readEvents(store) {
  return readJson(store, EVENTS_KEY, []);
}

function readAdSpend(store) {
  return readJson(store, ADSPEND_KEY, []);
}

async function readSettings(store) {
  const value = await readJson(store, SETTINGS_KEY, null);
  return { ...DEFAULT_SETTINGS, ...(value && typeof value === 'object' ? value : {}) };
}

// ---- generic helpers -----------------------------------------------------

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value) {
  return Math.round(value);
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
  const role = String(headers['x-admin-role'] || params.role || '').toLowerCase();
  const name = headers['x-admin-name'] || headers['x-admin-email'] || 'Nepoznat admin';
  return { role, name: String(name), owner: OWNER_ROLES.includes(role) };
}

function periodToRange(period, from, to) {
  const now = new Date();
  const toDate = to ? new Date(to) : now;
  let days;
  switch (String(period || '30d').toLowerCase()) {
    case 'today':
      days = 1;
      break;
    case '7d':
    case 'week':
      days = 7;
      break;
    case '90d':
    case 'quarter':
      days = 90;
      break;
    case '1y':
    case '365d':
    case 'year':
      days = 365;
      break;
    case 'all':
      days = 3650;
      break;
    default:
      days = 30;
      break;
  }
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - days * 86400000);
  fromDate.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(23, 59, 59, 999);
  return { from: fromDate, to: end, days };
}

function inRange(dateStr, range) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d >= range.from && d <= range.to;
}

function dayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function monthKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildDailySeries(range, valueFor) {
  const series = [];
  const cursor = new Date(range.from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(range.to);
  end.setHours(0, 0, 0, 0);
  let guard = 0;
  while (cursor <= end && guard < 4000) {
    series.push({ date: dayKey(cursor), value: valueFor(dayKey(cursor)) });
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return series;
}

// ---- order shaping -------------------------------------------------------

function isRevenueOrder(order) {
  if (!order || order.trashed) return false;
  return !NON_REVENUE_STATUSES.includes(order.status);
}

function toAnalyticsOrder(order) {
  const c = order.customer || {};
  return {
    id: order.orderNumber,
    date: order.createdAt,
    total: round(toNumber(order.total)),
    subtotal: round(toNumber(order.subtotal)),
    shipping: round(toNumber(order.shipping)),
    status: ADMIN_STATUS[order.status] || order.status,
    rawStatus: order.status,
    payment: ADMIN_PAYMENT[order.paymentMethod] || order.paymentMethod,
    items: (order.items || []).map(i => ({
      productId: i.productId ?? null,
      name: i.name,
      qty: i.qty,
      price: round(toNumber(i.price)),
      revenue: round(toNumber(i.price) * toNumber(i.qty, 1)),
    })),
    customer: {
      id: c.email || order.userId || c.name || order.orderNumber,
      name: c.name || c.email,
      email: c.email,
      phone: c.phone || '',
    },
  };
}

function aggregateCustomers(orders) {
  const map = new Map();
  for (const o of orders) {
    const key = o.customer.id;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        email: o.customer.email || '',
        name: o.customer.name || '',
        orderCount: 0,
        totalSpent: 0,
        status: 'active',
      });
    }
    const c = map.get(key);
    c.orderCount += 1;
    c.totalSpent += o.total;
  }
  return Array.from(map.values());
}

function ordersInRange(orders, range) {
  return orders.filter(o => !o.trashed && inRange(o.createdAt, range)).map(toAnalyticsOrder);
}

function revenueOrdersInRange(orders, range) {
  return orders.filter(o => isRevenueOrder(o) && inRange(o.createdAt, range)).map(toAnalyticsOrder);
}

function eventsInRange(events, range) {
  return events.filter(e => inRange(e.t, range));
}

function countEvents(events, name) {
  return events.filter(e => e.e === name).length;
}

// ---- report builders -----------------------------------------------------

function buildStats(orders, events, adspend, range) {
  const all = ordersInRange(orders, range);
  const revenueOrders = all.filter(o => !NON_REVENUE_STATUSES.includes(o.rawStatus));
  const customers = aggregateCustomers(revenueOrders);
  const pageviews = eventsInRange(events, range).filter(e => e.e === 'page_view');
  const sessions = pageviews.length ? new Set(pageviews.map(e => e.vid || e.t)).size : 0;
  const adSpend = adspend
    .filter(a => inRange(a.date, range))
    .reduce((sum, a) => sum + toNumber(a.amount), 0);

  return {
    orders: all,
    customers,
    sessions,
    adSpend: round(adSpend),
    marketingBudget: round(adSpend),
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days: range.days,
    },
  };
}

function buildRevenueChart(orders, range) {
  const revenue = revenueOrdersInRange(orders, range);
  const byDay = new Map();
  for (const o of revenue) {
    const k = dayKey(o.date);
    byDay.set(k, (byDay.get(k) || 0) + o.total);
  }
  return buildDailySeries(range, key => round(byDay.get(key) || 0));
}

function buildOrdersChart(orders, range) {
  const all = ordersInRange(orders, range);
  const byDay = new Map();
  for (const o of all) {
    const k = dayKey(o.date);
    byDay.set(k, (byDay.get(k) || 0) + 1);
  }
  return buildDailySeries(range, key => byDay.get(key) || 0);
}

function buildTrafficSources(events, range) {
  const map = new Map();
  for (const e of eventsInRange(events, range)) {
    if (e.e !== 'page_view') continue;
    const source = e.s || e.r || 'direct';
    map.set(source, (map.get(source) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

function buildDeviceBreakdown(events, range) {
  const map = new Map();
  for (const e of eventsInRange(events, range)) {
    if (e.e !== 'page_view') continue;
    const device = e.d || 'desktop';
    map.set(device, (map.get(device) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);
}

function buildConversionFunnel(orders, events, range) {
  const ev = eventsInRange(events, range);
  const steps = [
    ['page_view', 'Poseta'],
    ['product_view', 'Pregled proizvoda'],
    ['add_to_cart', 'Dodavanje u korpu'],
    ['checkout_start', 'Započeta kupovina'],
  ];
  const funnel = steps.map(([step, label]) => ({
    step,
    label,
    count: countEvents(ev, step),
  }));
  funnel.push({
    step: 'purchase',
    label: 'Kupovina',
    count: revenueOrdersInRange(orders, range).length,
  });
  return funnel;
}

function buildFinance(orders, adspend, settings, range) {
  const revenue = revenueOrdersInRange(orders, range);
  const totalRevenue = revenue.reduce((sum, o) => sum + o.total, 0);
  const estimatedCogs = round(totalRevenue * settings.cogsRatio);
  const grossProfit = totalRevenue - estimatedCogs;

  const spendEntries = adspend.filter(a => inRange(a.date, range));
  const adSpend = round(spendEntries.reduce((sum, a) => sum + toNumber(a.amount), 0));
  const totalExpenses = adSpend;
  const netProfit = grossProfit - totalExpenses;

  const monthlyMap = new Map();
  for (const o of revenue) {
    const k = monthKey(o.date);
    if (!monthlyMap.has(k)) monthlyMap.set(k, { revenue: 0, orders: 0 });
    monthlyMap.get(k).revenue += o.total;
    monthlyMap.get(k).orders += 1;
  }
  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, data]) => {
      const mAdSpend = round(
        adSpendEntriesFor(spendEntries, month).reduce((sum, a) => sum + toNumber(a.amount), 0)
      );
      const mCogs = round(data.revenue * DEFAULT_SETTINGS.cogsRatio);
      const mGross = round(data.revenue - mCogs);
      const mNet = round(mGross - mAdSpend);
      return {
        month,
        revenue: round(data.revenue),
        orders: data.orders,
        cogs: mCogs,
        expenses: mAdSpend,
        gross: mGross,
        net: mNet,
        margin: data.revenue > 0 ? Number(((mNet / data.revenue) * 100).toFixed(1)) : 0,
      };
    });

  const expenseMap = new Map();
  for (const a of spendEntries) {
    const network = a.network || 'ostalo';
    expenseMap.set(network, (expenseMap.get(network) || 0) + toNumber(a.amount));
  }
  const expenses = Array.from(expenseMap.entries())
    .map(([category, amount]) => ({ category, amount: round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .map(e => ({
      ...e,
      pct: totalExpenses > 0 ? Number(((e.amount / totalExpenses) * 100).toFixed(1)) : 0,
    }));

  const productMap = new Map();
  for (const o of revenue) {
    for (const item of o.items) {
      const key = item.name;
      if (!productMap.has(key)) productMap.set(key, { product: key, revenue: 0, units: 0 });
      const p = productMap.get(key);
      p.revenue += item.revenue;
      p.units += item.qty;
    }
  }
  const cogs = Array.from(productMap.values())
    .map(p => {
      const pcogs = round(p.revenue * DEFAULT_SETTINGS.cogsRatio);
      const margin =
        p.revenue > 0 ? Number((((p.revenue - pcogs) / p.revenue) * 100).toFixed(1)) : 0;
      return { product: p.product, revenue: round(p.revenue), cogs: pcogs, margin, units: p.units };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    summary: {
      revenue: round(totalRevenue),
      orders: revenue.length,
      cogs: round(totalRevenue * DEFAULT_SETTINGS.cogsRatio),
      grossProfit: round(grossProfit),
      grossMargin: totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0,
      adSpend,
      otherCosts: 0,
      totalExpenses,
      netProfit: round(netProfit),
      netMargin: totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0,
      aov: revenue.length > 0 ? round(totalRevenue / revenue.length) : 0,
      cogsRatio: DEFAULT_SETTINGS.cogsRatio,
      vatRate: DEFAULT_SETTINGS.vatRate,
    },
    monthly,
    expenses,
    cogs,
    series: buildRevenueChart(orders, range),
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days: range.days,
    },
  };
}

function adSpendEntriesFor(entries, month) {
  return entries.filter(a => monthKey(a.date) === month);
}

function buildTransactions(orders, adspend, settings, range) {
  const transactions = [];
  const scoped = orders.filter(o => !o.trashed && inRange(o.createdAt, range));

  for (const o of scoped) {
    const a = toAnalyticsOrder(o);
    const isCard = o.paymentMethod === 'card';
    const fees = isCard ? round(a.total * 0.029 + 30) : 0;
    const tax = round(a.total * (settings.vatRate / (1 + settings.vatRate)));
    const refunded = NON_REVENUE_STATUSES.includes(o.status);
    transactions.push({
      date: dayKey(o.createdAt),
      orderId: a.id,
      type: 'sale',
      status: refunded ? 'refunded' : 'completed',
      amount: a.total,
      netAmount: a.total - fees,
      paymentMethod: a.payment,
      customer: a.customer.name || a.customer.email || 'Kupac',
      fees,
      tax,
    });
    if (refunded) {
      transactions.push({
        date: dayKey(o.createdAt),
        orderId: a.id,
        type: 'refund',
        status: 'completed',
        amount: -a.total,
        netAmount: -a.total,
        paymentMethod: a.payment,
        customer: a.customer.name || a.customer.email || 'Kupac',
        fees: 0,
        tax: -tax,
      });
    }
  }

  for (const entry of adspend.filter(a => inRange(a.date, range))) {
    transactions.push({
      date: dayKey(entry.date),
      orderId: entry.id,
      type: 'fee',
      status: 'completed',
      amount: -round(toNumber(entry.amount)),
      netAmount: -round(toNumber(entry.amount)),
      paymentMethod: 'bank_transfer',
      customer: `Marketing: ${entry.network || 'ostalo'}`,
      fees: 0,
      tax: 0,
    });
  }

  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));
  return transactions;
}

// ---- handlers ------------------------------------------------------------

async function handleTrack(event, store) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return jsonResponse(400, { success: false, error: 'Neispravan JSON' });
  }
  const name = String(body.event || body.e || '').slice(0, 80);
  if (!name) return jsonResponse(400, { success: false, error: 'Nedostaje naziv događaja' });

  const entry = {
    e: name,
    t: new Date().toISOString(),
    p: body.path ? String(body.path).slice(0, 300) : null,
    r: body.referrer ? String(body.referrer).slice(0, 300) : null,
    s: body.source ? String(body.source).slice(0, 80) : null,
    d: body.device === 'mobile' ? 'mobile' : 'desktop',
    vid: body.vid || body.sessionId ? String(body.vid || body.sessionId).slice(0, 80) : null,
    pid: body.productId !== undefined ? String(body.productId).slice(0, 120) : null,
    q: body.query ? String(body.query).slice(0, 200) : null,
    v: toNumber(body.value, 0),
  };

  const events = await readEvents(store);
  events.unshift(entry);
  await store.setJSON(EVENTS_KEY, events.slice(0, MAX_EVENTS));
  return jsonResponse(202, { success: true });
}

async function handleStats(store, range) {
  const [orders, events, adspend] = await Promise.all([
    readOrders(),
    readEvents(store),
    readAdSpend(store),
  ]);
  return jsonResponse(200, buildStats(orders, events, adspend, range));
}

async function handleRevenueChart(store, range) {
  const orders = await readOrders();
  return jsonResponse(200, buildRevenueChart(orders, range));
}

async function handleOrdersChart(store, range) {
  const orders = await readOrders();
  return jsonResponse(200, buildOrdersChart(orders, range));
}

async function handleTrafficSources(store, range) {
  const events = await readEvents(store);
  return jsonResponse(200, buildTrafficSources(events, range));
}

async function handleDeviceBreakdown(store, range) {
  const events = await readEvents(store);
  return jsonResponse(200, buildDeviceBreakdown(events, range));
}

async function handleConversionFunnel(store, range) {
  const [orders, events] = await Promise.all([readOrders(), readEvents(store)]);
  return jsonResponse(200, buildConversionFunnel(orders, events, range));
}

async function handleFinance(store, range) {
  const [orders, adspend, settings] = await Promise.all([
    readOrders(),
    readAdSpend(store),
    readSettings(store),
  ]);
  return jsonResponse(200, buildFinance(orders, adspend, settings, range));
}

async function handleAccounting(store, range) {
  const [orders, adspend, settings] = await Promise.all([
    readOrders(),
    readAdSpend(store),
    readSettings(store),
  ]);
  return jsonResponse(200, { transactions: buildTransactions(orders, adspend, settings, range) });
}

async function handleAdSpendGet(store) {
  const entries = (await readAdSpend(store)).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const byNetwork = new Map();
  for (const e of entries) {
    const net = e.network || 'ostalo';
    byNetwork.set(net, (byNetwork.get(net) || 0) + toNumber(e.amount));
  }
  return jsonResponse(200, {
    entries,
    total: round(entries.reduce((sum, e) => sum + toNumber(e.amount), 0)),
    byNetwork: Array.from(byNetwork.entries()).map(([network, amount]) => ({
      network,
      amount: round(amount),
    })),
  });
}

async function handleAdSpendAdd(event, store) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return jsonResponse(400, { success: false, error: 'Neispravan JSON' });
  }
  const amount = toNumber(body.amount, NaN);
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponse(400, { success: false, error: 'Iznos troška mora biti pozitivan broj' });
  }
  const entry = {
    id: `ads-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: body.date || new Date().toISOString().slice(0, 10),
    network: String(body.network || 'ostalo').slice(0, 60),
    amount: round(amount),
    note: body.note ? String(body.note).slice(0, 300) : '',
    createdAt: new Date().toISOString(),
  };
  const entries = await readAdSpend(store);
  entries.unshift(entry);
  await store.setJSON(ADSPEND_KEY, entries.slice(0, MAX_ADSPEND));
  return jsonResponse(201, { success: true, entry });
}

async function handleAdSpendDelete(store, id) {
  const entries = await readAdSpend(store);
  const next = entries.filter(e => e.id !== id);
  if (next.length === entries.length) {
    return jsonResponse(404, { success: false, error: 'Trošak nije pronađen' });
  }
  await store.setJSON(ADSPEND_KEY, next);
  return jsonResponse(200, { success: true });
}

// ---- dispatch ------------------------------------------------------------

function parseSegments(event) {
  const path = event.path || '';
  const idx = path.lastIndexOf('analytics');
  const rest = idx === -1 ? '' : path.slice(idx + 'analytics'.length);
  return rest.split('/').filter(Boolean);
}

export default async function handler(event) {
  const method = event.httpMethod || 'GET';
  const params = event.queryStringParameters || {};
  const segments = parseSegments(event);
  const isAdmin = (event.path || '').includes('/v1/admin');

  try {
    const store = getAnalyticsStore();

    if (!isAdmin) {
      if (method === 'POST' && segments[0] === 'track') {
        return handleTrack(event, store);
      }
      return jsonResponse(404, { success: false, error: 'Not found' });
    }

    const range = periodToRange(params.period, params.from, params.to);

    if (segments[0] === 'adspend') {
      if (segments.length === 2 && method === 'DELETE') {
        const actor = getActor(event);
        if (!actor.owner) {
          return jsonResponse(403, {
            success: false,
            error: 'Samo vlasnik može da menja troškove.',
          });
        }
        return handleAdSpendDelete(store, segments[1]);
      }
      if (method === 'POST') {
        const actor = getActor(event);
        if (!actor.owner) {
          return jsonResponse(403, {
            success: false,
            error: 'Samo vlasnik može da menja troškove.',
          });
        }
        return handleAdSpendAdd(event, store);
      }
      return handleAdSpendGet(store);
    }

    switch (segments[0]) {
      case 'stats':
        return handleStats(store, range);
      case 'revenue-chart':
        return handleRevenueChart(store, range);
      case 'orders-chart':
        return handleOrdersChart(store, range);
      case 'traffic-sources':
        return handleTrafficSources(store, range);
      case 'device-breakdown':
        return handleDeviceBreakdown(store, range);
      case 'conversion-funnel':
        return handleConversionFunnel(store, range);
      case 'finance':
        return handleFinance(store, range);
      case 'accounting':
        return handleAccounting(store, range);
      default:
        return jsonResponse(404, { success: false, error: 'Not found' });
    }
  } catch (err) {
    console.error('[Analytics] Error:', err);
    return jsonResponse(500, { success: false, error: err.message });
  }
}

export { buildFinance, buildStats, buildTransactions, DEFAULT_SETTINGS, periodToRange };
