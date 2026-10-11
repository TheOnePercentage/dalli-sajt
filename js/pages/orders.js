import { $, $$, show, hide, on, delegate, formatPrice } from '../../core/dom.js';
import { userSignal, subscribeToUser, getUser } from '../../state/user.js';
import { trackEvent } from '../../features/analytics.js';

let isInitialized = false;

const ORDER_STATUSES = {
  pending: { label: 'Na čekanju', color: 'var(--color-warning)', icon: '⏳' },
  confirmed: { label: 'Potvrđena', color: 'var(--color-info)', icon: '✅' },
  processing: { label: 'U obradi', color: 'var(--color-info)', icon: '🔄' },
  shipped: { label: 'Poslata', color: 'var(--color-primary)', icon: '📦' },
  delivered: { label: 'Isporučena', color: 'var(--color-success)', icon: '✅' },
  cancelled: { label: 'Otkazana', color: 'var(--color-error)', icon: '❌' },
  refunded: { label: 'Povraćeno', color: 'var(--color-warning)', icon: '↩️' }
};

const STATUS_ORDER = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const renderOrders = (orders) => {
  const container = $('#ordersList');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: var(--space-12);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-tertiary); margin: 0 auto var(--space-4);" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="23,4 23,10 17,10"/></svg>
        <h3 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--fw-light); color: var(--color-text); margin-bottom: var(--space-2);">Nemate narudžbina</h3>
        <p style="color: var(--color-text-tertiary); margin-bottom: var(--space-6);">Vaša istorija narudžbina je prazna. Počnite kupovinu i vaša prva narudžbina će se pojaviti ovde.</p>
        <a href="/proizvodi.html" class="btn btn-primary" style="display: inline-flex;">Počnite kupovinu</a>
      `;
    return;
  }

  const html = orders.map(order => {
    const statusInfo = ORDER_STATUSES[order.status] || { label: order.status, color: 'var(--color-text-tertiary)', icon: '❓' };
    const itemsHtml = order.items?.slice(0, 3).map(item => `
      <div class="order-item__mini" style="display: flex; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-divider);">
        <img src="${item.image || '/images/placeholder.svg'}" alt="${item.name}" width="50" height="64" style="object-fit: cover; border-radius: var(--radius-md);" loading="lazy">
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: var(--fw-medium); color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
          <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary);">x${item.qty} • ${item.color || ''} ${item.size || ''}</div>
        </div>
        <div style="text-align: right; font-weight: var(--fw-semibold); color: var(--color-text);">${formatPrice(item.price * item.qty)}</div>
      </div>
    `).join('');

    const canReorder = ['delivered', 'cancelled'].includes(order.status);
    const canTrack = ['confirmed', 'processing', 'shipped'].includes(order.status);

    return `
      <article class="order-card" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); overflow: hidden; margin-bottom: var(--space-4);">
        <header class="order-card__header" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); border-bottom: 1px solid var(--color-divider); flex-wrap: wrap; gap: var(--space-3);">
          <div class="order-card__meta" style="display: flex; flex-direction: column; gap: var(--space-1);">
            <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
              <span class="order-card__number" style="font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--fw-medium); color: var(--color-text);">#${order.orderNumber || order.id}</span>
              <span class="order-card__date" style="font-size: var(--text-sm); color: var(--color-text-tertiary);">${formatDate(order.createdAt)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span class="order-card__status" style="display: inline-flex; align-items: center; gap: var(--space-1); padding: var(--space-1) var(--space-2); border-radius: var(--radius-full); font-size: var(--fs-xs); font-weight: var(--fw-semibold); text-transform: uppercase; background: ${statusInfo.color}15; color: ${statusInfo.color};">
                ${statusInfo.icon} ${statusInfo.label}
              </span>
            </div>
          </div>
          <div class="order-card__total" style="text-align: right;">
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary);">Ukupno</div>
            <div style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--fw-bold); color: var(--color-primary);">${formatPrice(order.total)} RSD</div>
          </div>
        </header>

        <div class="order-card__items" style="padding: var(--space-4); border-bottom: 1px solid var(--color-divider); max-height: 200px; overflow-y: auto;">
          ${itemsHtml}
          ${order.items && order.items.length > 3 ? `<div style="padding: var(--space-2); text-align: center; color: var(--color-text-tertiary); font-size: var(--text-sm);">+ ${order.items.length - 3} proizvoda više</div>` : ''}
        </div>

        <footer class="order-card__actions" style="padding: var(--space-4); display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; justify-content: flex-end;">
          ${order.trackingNumber ? `<a href="/pratiti-posiljku.html?tracking=${order.trackingNumber}" class="btn btn-secondary" style="font-size: var(--fs-sm);" data-track="order_track"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: var(--space-1);"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Prati pošiljku</a>` : ''}
          ${order.trackingNumber ? `<button class="btn btn-secondary" data-action="track-order" data-order-id="${order.id}" style="font-size: var(--fs-sm);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: var(--space-1);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Detalji praćenja</button>` : ''}
          <button class="btn btn-primary" data-action="reorder" data-order-id="${order.id}" ${!['delivered', 'cancelled'].includes(order.status) ? 'disabled' : ''} style="font-size: var(--fs-sm);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: var(--space-1);"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>Naruči ponovo</button>
          <button class="btn btn-secondary" data-action="view-order" data-order-id="${order.id}" style="font-size: var(--fs-sm);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8"/></svg>Detalji</button>
          ${order.status === 'cancelled' ? '<button class="btn btn-secondary" data-action="cancel-order" data-order-id="${order.id}" style="font-size: var(--fs-sm); color: var(--color-error);">Otkazivanje povratka</button>' : ''}
        </footer>
      </article>
    `;
  }).join('');

  container.innerHTML = html;

  // Bind events
  container.querySelectorAll('[data-action="reorder"]').forEach(btn => {
    btn.addEventListener('click', () => reorder(btn.dataset.orderId));
  });
  container.querySelectorAll('[data-action="view-order"]').forEach(btn => {
    btn.addEventListener('click', () => viewOrderDetails(btn.dataset.orderId));
  });
  container.querySelectorAll('[data-action="track-order"]').forEach(btn => {
    btn.addEventListener('click', () => trackOrder(btn.dataset.orderId));
  });
  container.querySelectorAll('[data-action="cancel-order"]').forEach(btn => {
    btn.addEventListener('click', () => cancelReturn(btn.dataset.orderId));
  });
};

const filterOrders = (orders, { status, search, dateFrom, dateTo }) => {
  return orders.filter(order => {
    if (status && order.status !== status) return false;
    if (search) {
      const s = search.toLowerCase();
      const match = order.orderNumber?.toString().includes(s) || 
        order.items?.some(i => i.name.toLowerCase().includes(search.toLowerCase()));
      if (!match) return false;
    }
    if (dateFrom && new Date(order.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(order.createdAt) > new Date(dateTo)) return false;
    return true;
  });
};

const init = () => {
  // Subscribe to user
  subscribeToUser((user) => {
    if (!user) {
      window.location.href = '/prijava.html?redirect=/narudzbine.html';
      return;
    }
    
    // Load orders from API
    loadOrders();
  });

  // Initial load
  loadOrders();

  // Filter form
  const filterForm = document.getElementById('ordersFilterForm');
  if (filterForm) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(filterForm);
      const params = new URLSearchParams();
      for (const [key, value] of formData) {
        if (value) params.set(key, value);
      }
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      loadOrders();
    });

    // Clear filters
    const clearBtn = filterForm.querySelector('[data-action="clear-filters"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        filterForm.reset();
        window.history.replaceState({}, '', window.location.pathname);
        loadOrders();
      });
    }
  }

  // Load more / pagination
  const loadMoreBtn = document.getElementById('loadMoreOrders');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => loadMoreOrders());
  }
};

const loadOrders = async (page = 1) => {
  const container = document.getElementById('ordersList');
  if (!container) return;

  // Show loading
  container.innerHTML = '<div class="loading-spinner" style="text-align: center; padding: var(--space-12);"><div class="spinner" style="width: 40px; height: 40px; border: 3px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div></div>';

  try {
    // TODO: Replace with actual API call
    const response = await fetch(`/api/orders?page=${page}&limit=10${getFilterParams()}`);
    if (!response.ok) throw new Error('Greška pri učitavanju');
    const data = await response.json();
    
    if (data.orders?.length === 0) {
      document.getElementById('ordersList').innerHTML = '<div class="empty-state">Nema narudžbina za izabrane filtere.</div>';
      return;
    }

    renderOrders(data.orders);
    updatePagination(data.pagination);
  } catch (err) {
    console.error('Load orders error:', err);
    document.getElementById('ordersList').innerHTML = '<div class="error-message">Greška pri učitavanju narudžbina.</div>';
  }
};

const loadMoreOrders = async () => {
  // Implementation for pagination
};

const reorder = async (orderId) => {
  try {
    const response = await fetch('/api/orders/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
    const data = await response.json();
    if (data.cartId) {
      window.location.href = '/checkout.html?reorder=' + orderId;
    }
  } catch (err) {
    console.error('Reorder error:', err);
    window.showToast?.('Greška pri ponovnoj narudžbini', 'error');
  }
};

const viewOrderDetails = (orderId) => {
  window.location.href = `/narudzbina-detalji.html?id=${orderId}`;
};

const trackOrder = (orderId) => {
  window.location.href = `/pratiti-posiljku.html?id=${orderId}`;
};

const cancelReturn = async (orderId) => {
  if (!confirm('Da li ste sigurni da želite da otkazate povratak?')) return;
  try {
    const response = await fetch(`/api/orders/${orderId}/cancel-return`, { method: 'POST' });
    if (response.ok) {
      window.showToast?.('Povratak otkazan', 'success');
      loadOrders();
    }
  } catch (err) {
    window.showToast?.('Greška', 'error');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init };

if (typeof window !== 'undefined') {
  window.DALLI_Orders = { init };
}