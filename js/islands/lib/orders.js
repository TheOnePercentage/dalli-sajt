/**
 * orders.js — pure logika za statistiku narudžbina.
 *
 * Vanilla app.jsx čuva narudžbine u localStorage 'dalli_orders' (niz objekata
 * sa userId, orderNumber, status, createdAt, items[], totals, paymentMethod,
 * shippingMethod). Islands samo čitaju to stanje — bez duplikacije logike.
 */

export const ORDERS_KEY = 'dalli_orders';

export const ORDER_STATUS_LABELS = {
  pending: 'Na čekanju',
  confirmed: 'Potvrđena',
  processing: 'U obradi',
  shipped: 'Poslata',
  delivered: 'Isporučena',
  cancelled: 'Otkazana',
  returned: 'Vraćena',
};

export const ORDER_STATUS_COLORS = {
  pending: '#D97706',
  confirmed: '#2563eb',
  processing: '#6B7280',
  shipped: '#7c3aed',
  delivered: '#16a34a',
  cancelled: '#dc2626',
  returned: '#334155',
};

export const PAYMENT_METHOD_LABELS = {
  cod: 'Plaćanje pouzećem',
  'bank-transfer': 'Bankovna transakcija',
  card: 'Kartično plaćanje',
  crypto: 'Kripto plaćanje',
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'processing', 'shipped'];

export function readOrders() {
  try {
    return JSON.parse(window.localStorage.getItem(ORDERS_KEY) || '[]');
  } catch (err) {
    console.warn('[islands] neispravan dalli_orders:', err);
    return [];
  }
}

export function orderStats(orders = [], userId) {
  const own = orders.filter(o => !userId || o.userId === userId);
  const totalSpent = own.reduce(
    (sum, order) => sum + Number((order.totals && order.totals.total) || 0),
    0
  );
  const sorted = [...own].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
  const lastOrder = sorted[0] || null;
  const active = own.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
  return { count: own.length, totalSpent, lastOrder, active };
}

function toTime(iso) {
  const t = new Date(iso || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function orderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || status || '—';
}

export function formatOrderDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getPaymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '—';
}

export function canCancelOrder(status) {
  return status === 'pending' || status === 'confirmed';
}

export function canReorderOrder(status) {
  return status === 'delivered';
}

/** Upisuje novi niz porudžbina u localStorage (isti ugovor kao vanilla). */
export function saveOrders(orders) {
  window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

/**
 * Vraća novi niz sa izmenjenim statusom porudžbine (bez mutacije ulaza).
 * Return: { orders, order, changed }.
 */
export function updateOrderStatus(orders, orderId, status) {
  let changed = false;
  let updated = null;
  const next = orders.map(order => {
    if (order.id !== orderId && order.orderNumber !== orderId) return order;
    updated = { ...order, status, updatedAt: new Date().toISOString() };
    changed = true;
    return updated;
  });
  return { orders: next, order: updated, changed };
}

/** Normira stavke porudžbine za ponovno dodavanje u korpu. */
export function buildReorderItems(order) {
  return (order.items || []).map(item => {
    const id = item.productId ?? item.id;
    const size = item.size || 'M';
    const color = item.color || null;
    return {
      product: {
        id,
        name: item.name || 'Proizvod',
        price: Number(item.price) || 0,
        image: item.image,
      },
      variant: { ...(color ? { color } : {}), size, price: Number(item.price) || 0 },
      qty: Number(item.qty) || 1,
    };
  });
}
