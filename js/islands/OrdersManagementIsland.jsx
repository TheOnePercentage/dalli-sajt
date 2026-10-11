/**
 * OrdersManagementIsland — upravljanje narudžbinama u profilu (React island).
 *
 * Lista narudžbina trenutnog korisnika (dalja istorija + aktivne) sa akcijama:
 *  - detalji (expand), 
 *  - otkazivanje (pending/confirmed),
 *  - ponovna kupovina (delivered → addToCart).
 *
 * Tragovi ugovora kao i vanilla app.jsx/orders.html: statusi i akcije se
 * upisuju u localStorage 'dalli_orders' (isti ključ koji čitaju orderStats i
 * useOrders). Mount: <div data-island="orders-management" data-props="{}"></div>
 */

import { useState } from 'react';

import { addToCart } from '../state/cart.js';
import {
  ORDER_STATUS_COLORS,
  buildReorderItems,
  canCancelOrder,
  canReorderOrder,
  formatOrderDate,
  getPaymentMethodLabel,
  orderStatusLabel,
  readOrders,
  saveOrders,
  updateOrderStatus,
} from './lib/orders.js';
import { useOrders, useUser } from './useStore.js';

const cardStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  marginBottom: 'var(--space-4)',
  overflow: 'hidden',
};

export default function OrdersManagementIsland() {
  const user = useUser();
  const orders = useOrders();
  const [expandedId, setExpandedId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [notice, setNotice] = useState(null);

  const own = orders.filter(o => !user || o.userId === user.id).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const persist = (orderId, status) => {
    const current = readOrders();
    const next = updateOrderStatus(current, orderId, status);
    if (next.changed) saveOrders(next.orders);
  };

  const onReorder = (orderId, e) => {
    e.stopPropagation();
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) return;
    const reordered = buildReorderItems(order);
    reordered.forEach(entry => addToCart(entry.product, entry.variant, entry.qty));
    setNotice(`${reordered.length} artikal/a dodato u korpu.`);
  };

  const onCancel = (orderId, e) => {
    e.stopPropagation();
    if (confirmCancelId === orderId) {
      persist(orderId, 'cancelled');
      setConfirmCancelId(null);
      setNotice('Narudžbina je otkazana.');
    } else {
      setConfirmCancelId(orderId);
    }
  };

  if (!user) {
    return (
      <section className="island orders-management" data-region="orders-management" style={cardStyle}>
        <div style={{ padding: 'var(--space-6)', fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>
          Prijavite se da biste videli svoje narudžbine.
        </div>
      </section>
    );
  }

  return (
    <section className="island orders-management" data-region="orders-management">
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-6)' }}>
        Moje narudžbine
      </h2>

      {notice && (
        <div
          role="status"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-btn)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--fs-sm)',
            background: 'rgba(22,163,74,0.1)',
            color: '#166534',
            border: '1px solid #86efac',
          }}
        >
          {notice}
        </div>
      )}

      {own.length === 0 && (
        <div style={cardStyle}>
          <div style={{ padding: 'var(--space-8)', fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Još nemate narudžbina.
          </div>
        </div>
      )}

      {own.map(order => {
        const isExpanded = expandedId === order.id;
        const items = order.items || [];
        const totals = order.totals || {};
        const statusColor = ORDER_STATUS_COLORS[order.status] || 'var(--color-border)';
        const confirm = confirmCancelId === order.id;
        return (
          <article key={order.id} style={cardStyle}>
            <header
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-5) var(--space-6)',
                cursor: 'pointer',
                flexWrap: 'wrap',
              }}
              role="button"
              tabIndex={0}
            >
              <div>
                <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>
                  Narudžbina #{order.orderNumber || order.id}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {formatOrderDate(order.createdAt)} · {items.length} artikal/a
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span style={{ background: statusColor, color: '#fff', borderRadius: 'var(--radius-full)', padding: '2px var(--space-3)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)' }}>
                  {orderStatusLabel(order.status)}
                </span>
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{formatRSD(totals.total)}</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--fs-sm)' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </header>

            {isExpanded && (
              <div style={{ padding: 'var(--space-2) var(--space-6) var(--space-6)', borderTop: '1px solid var(--color-divider)' }}>
                <div style={{ display: 'grid', gap: 'var(--space-2)', padding: 'var(--space-4) 0' }}>
                  {items.map((item, i) => (
                    <div key={`${item.variantId}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', fontSize: 'var(--fs-sm)' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {item.name} {item.size ? `· ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''} × {item.qty}
                      </span>
                      <span style={{ whiteSpace: 'nowrap' }}>{formatRSD(Number(item.price) * Number(item.qty))}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-1)', fontSize: 'var(--fs-xs)', color: 'var(--color-text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Plaćanje</span>
                    <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
                  </div>
                  {order.shippingMethod && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Dostava</span>
                      <span>{order.shippingMethod}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ukupno</span>
                    <span style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--color-text)' }}>{formatRSD(totals.total)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {canReorderOrder(order.status) && (
                    <button type="button" onClick={e => onReorder(order.id, e)} style={actionBtn('primary')}>
                      Ponovi kupovinu
                    </button>
                  )}
                  {canCancelOrder(order.status) && confirm ? (
                    <button type="button" onClick={e => onCancel(order.id, e)} style={{ ...actionBtn('danger'), fontWeight: 'var(--fw-bold)' }}>
                      Potvrdi otkazivanje?
                    </button>
                  ) : (
                    canCancelOrder(order.status) && (
                      <button type="button" onClick={e => onCancel(order.id, e)} style={actionBtn('danger')}>
                        Otkaži narudžbinu
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function actionBtn(kind) {
  const base = {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-btn)',
    padding: 'var(--space-3) var(--space-5)',
    cursor: 'pointer',
    fontSize: 'var(--fs-sm)',
    fontFamily: 'inherit',
  };
  if (kind === 'primary')
    return { ...base, background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 'var(--fw-semibold)' };
  if (kind === 'danger')
    return { ...base, color: '#dc2626', borderColor: 'rgba(220,38,38,0.4)' };
  return base;
}

function formatRSD(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0 RSD';
  return `${n.toLocaleString('sr-RS')} RSD`;
}