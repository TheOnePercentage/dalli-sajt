/**
 * OrdersTabIsland — Tab za narudžbine (lista, reorder, praćenje)
 * Mount: <div data-island="orders-tab" data-props="{}"></div>
 */

import { useState, useEffect } from 'react';
import { useUser } from './useStore.js';
import { readOrders, orderStats, formatOrderDate, orderStatusLabel } from './lib/orders.js';
import { formatPrice } from '../utils/format.js';

const ORDER_STATUSES = {
  pending: { label: 'Na čekanju', color: 'var(--color-warning)', icon: '⏳' },
  confirmed: { label: 'Potvrđena', color: 'var(--color-info)', icon: '✅' },
  processing: { label: 'U obradi', color: 'var(--color-info)', icon: '🔄' },
  shipped: { label: 'Poslata', color: 'var(--color-primary)', icon: '📦' },
  delivered: { label: 'Isporučena', color: 'var(--color-success)', icon: '✅' },
  cancelled: { label: 'Otkazana', color: 'var(--color-error)', icon: '❌' },
  refunded: { label: 'Povraćeno', color: 'var(--color-warning)', icon: '↩️' }
};

export default function OrdersTabIsland() {
  const user = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  useEffect(() => {
    if (!user) return;
    loadOrders();
  }, [user, filter, page]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const allOrders = readOrders().filter(o => o.userId === user.id);
      const filtered = allOrders.filter(order => {
        if (filter.status && order.status !== filter.status) return false;
        if (filter.search) {
          const s = filter.search.toLowerCase();
          return order.orderNumber?.toString().includes(s) ||
            order.items?.some(i => i.name.toLowerCase().includes(s));
        }
        return true;
      });

      const sorted = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const start = (page - 1) * LIMIT;
      const paginated = sorted.slice(start, start + LIMIT);

      setOrders(paginated);
      setHasMore(start + LIMIT < sorted.length);
    } catch (err) {
      console.error('Load orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('sr-RS', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => Number(amount || 0).toLocaleString('sr-RS');

  const handleReorder = async (orderId) => {
    try {
      // TODO: Implement reorder via API
      window.showToast?.('Funkcionalnost u razvoju', 'info');
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  const handleTrack = (order) => {
    if (order.trackingNumber) {
      window.open(`/pratiti-posiljku.html?tracking=${order.trackingNumber}`, '_blank');
    }
  };

  if (!user) {
    return (
      <section style={{ padding: 'var(--space-8)', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-3)' }}>
          Narudžbine
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Prijavite se da biste videli svoje narudžbine.
        </p>
        <button className="btn btn-primary" data-action="login">Prijavi se</button>
      </section>
    );
  }

  return (
    <section data-region="orders" style={{ marginBottom: 'var(--space-8)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-light)' }}>
          Moje narudžbine
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <select
            value={filter.status}
            onChange={e => { setFilter({...filter, status: e.target.value}); setPage(1); }}
            style={{ padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 'var(--fs-sm)' }}
          >
            <option value="">Svi statusi</option>
            <option value="pending">Na čekanju</option>
            <option value="confirmed">Potvrđena</option>
            <option value="processing">U obradi</option>
            <option value="shipped">Poslata</option>
            <option value="delivered">Isporučena</option>
            <option value="cancelled">Otkazana</option>
            <option value="refunded">Povraćeno</option>
          </select>
          <input
            type="search"
            placeholder="Pretraži narudžbine..."
            value={filter.search}
            onChange={e => { setFilter({...filter, search: e.target.value}); setPage(1); }}
            style={{ padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-sm)', width: '200px' }}
          />
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-text-tertiary)', margin: '0 auto var(--space-4)' }} aria-hidden="true">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-light)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
            Nemate narudžbina
          </h3>
          <p style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-6)' }}>
            Vaša istorija narudžbina je prazna. Počnite kupovinu i vaša prva narudžbina će se pojaviti ovde.
          </p>
          <a href="/proizvodi.html" className="btn btn-primary" style={{ display: 'inline-flex' }}>Počnite kupovinu</a>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {orders.map(order => {
              const statusInfo = ORDER_STATUSES[order.status] || { label: order.status, color: 'var(--color-text-tertiary)', icon: '❓' };
              const itemsHtml = order.items?.slice(0, 3).map(item => `
                <div class="order-item__mini" style="display: flex; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-divider);">
                  <img src="${item.image || '/images/placeholder.svg'}" alt="${item.name}" width="50" height="64" style="object-fit: cover; border-radius: var(--radius-md);" loading="lazy">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: var(--fw-medium); color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                    <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary);">x${item.qty} • ${item.color || ''} ${item.size || ''}</div>
                  </div>
                  <div style="text-align: right; font-weight: var(--fw-semibold); color: var(--color-text);">${item.price * item.qty} RSD</div>
                </div>
              `).join('');

              const canReorder = ['delivered', 'cancelled'].includes(order.status);
              const canTrack = ['confirmed', 'processing', 'shipped'].includes(order.status);

              return (
                <article key={order.id} className="order-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
                  <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'spaceBetween', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-divider)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>#{order.orderNumber || order.id}</span>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>{new Date(order.createdAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-full)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', background: `${statusInfo.color}15`, color: statusInfo.color }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>Ukupno</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-bold)', color: 'var(--color-primary)' }}>{formatCurrency(order.total)} RSD</div>
                    </div>
                  </header>

                  <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-divider)', maxHeight: 200, overflowY: 'auto' }}>
                    {order.items?.slice(0, 3).map(item => (
                      <div key={item.id} className="order-item__mini" style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-divider)' }}>
                        <img src={item.image || '/images/placeholder.svg'} alt={item.name} width="50" height="64" style={{ objectFit: 'cover', borderRadius: 'var(--radius-md)', loading: 'lazy' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>x${item.qty} • ${item.color || ''} ${item.size || ''}</div>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 'var(--fw-semibold)', color: 'var(--color-text)' }}>{formatCurrency(item.price * item.qty)}</div>
                      </div>
                    ))}
                    {order.items && order.items.length > 3 && (
                      <div style={{ padding: 'var(--space-2)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                        + {order.items.length - 3} proizvoda više
                      </div>
                    )}
                  </div>

                  <footer style={{ padding: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {order.trackingNumber && (
                      <a href={`/pratiti-posiljku.html?tracking=${order.trackingNumber}`} className="btn btn-secondary" style={{ fontSize: 'var(--fs-sm)' }} data-track="order_track">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 'var(--space-1)' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Prati pošiljku
                      </a>
                    )}
                    {order.trackingNumber && (
                      <button className="btn btn-secondary" data-action="track-order" data-order-id={order.id} style={{ fontSize: 'var(--fs-sm)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 'var(--space-1)' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Detalji praćenja
                      </button>
                    )}
                    <button className="btn btn-primary" data-action="reorder" data-order-id={order.id} disabled={!['delivered', 'cancelled'].includes(order.status)} style={{ fontSize: 'var(--fs-sm)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 'var(--space-1)' }}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>Naruči ponovo</button>
                    <button className="btn btn-secondary" data-action="view-order" data-order-id={order.id} style={{ fontSize: 'var(--fs-sm)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8"/></svg>Detalji</button>
                    {order.status === 'cancelled' && <button className="btn btn-secondary" data-action="cancel-order" data-order-id={order.id} style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-error)' }}>Otkazivanje povratka</button>}
                  </footer>
                </article>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
            <button className="btn btn-secondary btn-lg" data-action="load-more" style={{ width: '100%', padding: 'var(--space-3) var(--space-8)' }}>Učitaj više</button>
          </div>
        </>
      )}
    </section>
  );
}