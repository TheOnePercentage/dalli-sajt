import { $, $$, show, hide, on, formatPrice } from '../../core/dom.js';
import { userSignal, subscribeToUser, getUser } from '../../state/user.js';
import { trackEvent } from '../../features/analytics.js';

let isInitialized = false;

const renderWishlist = (items) => {
  const container = $('#wishlistGrid');
  const emptyState = $('#wishlistEmpty');
  const countEl = $('#wishlistCount');

  if (!items || items.length === 0) {
    if (container) container.innerHTML = '';
    if (emptyState) show(emptyState);
    return;
  }

  if (emptyState) hide(emptyState);

  if (container) {
    container.innerHTML = items.map(item => `
      <article class="wishlist-item animate-reveal" data-product-id="${item.id}" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); overflow: hidden; transition: box-shadow var(--duration-normal) var(--ease-out);" role="listitem">
        <div class="wishlist-item__media" style="position: relative; aspect-ratio: 4/5; overflow: hidden; background: var(--color-bg-subtle);">
          <img class="wishlist-item__image" src="${item.images?.main640 || item.images?.main}" alt="${item.name}" loading="lazy" width="400" height="500" decoding="async" style="width: 100%; height: 100%; object-fit: cover; transition: transform var(--duration-slow) var(--ease-out);">
          ${item.images?.badge ? `<div class="wishlist-item__badge" style="position: absolute; top: var(--space-3); left: var(--space-3); padding: var(--space-1) var(--space-2); background: var(--color-primary); color: var(--color-text-inverse); border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--fw-semibold);">${item.images.badge}</div>` : ''}
          <button class="wishlist-item__remove" data-action="remove-wishlist" data-product-id="${item.id}" aria-label="Ukloni ${item.name} sa liste želja" style="position: absolute; top: var(--space-3); right: var(--space-3); width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background var(--duration-fast);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="wishlist-item__content" style="padding: var(--space-4);">
          <div class="wishlist-item__header" style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--space-2);">
            <span class="wishlist-item__category" style="font-size: var(--text-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">${item.categoryName || item.category}</span>
            <div class="wishlist-item__actions" style="display: flex; gap: var(--space-2);">
              <button class="btn btn-sm btn-secondary" data-action="move-to-cart" data-product-id="${item.id}" aria-label="Premesti u korpu" style="font-size: var(--fs-xs);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: var(--space-1);"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>U korpu</button>
              <button class="wishlist-item__share" data-action="share-wishlist" data-product-id="${item.id}" aria-label="Podeli" style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-surface); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51a5 5 0 0 1 0 7.07"/><path d="M15.49 13.51a5 5 0 0 1-7.07 0"/></svg>
              </button>
            </div>
          </div>
          <h3 class="wishlist-item__name" style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-medium); color: var(--color-text); margin-bottom: var(--space-1); line-height: 1.3;">${item.name}</h3>
          <div class="wishlist-item__meta" style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); font-size: var(--text-xs); color: var(--color-text-tertiary);">
            ${item.color ? `<span>${item.color}</span>` : ''}
            ${item.size ? `<span>${item.size}</span>` : ''}
            <span>${item.categoryName || item.category}</span>
          </div>
          <div class="wishlist-item__price-row" style="display: flex; align-items: baseline; justify-content: space-between; margin-top: var(--space-3);">
            <div class="wishlist-item__price" style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--fw-medium); color: var(--color-text);">
              ${item.salePrice ? `<span style="text-decoration: line-through; color: var(--color-text-tertiary); font-size: var(--text-sm); margin-right: var(--space-2);">${formatPrice(item.price)} RSD</span>` : ''}
              <span style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--fw-bold); color: var(--color-primary);">${formatPrice(item.salePrice || item.price)} RSD</span>
            </div>
            <button class="btn btn-primary btn-sm" data-action="quick-add-wishlist" data-product-id="${item.id}" style="min-width: 100px;">U korpu</button>
          </div>
        </div>
      </article>
    `).join('');

    // Bind events
    container.querySelectorAll('[data-action="remove-wishlist"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeFromWishlist(btn.dataset.productId);
      });
    });
    container.querySelectorAll('[data-action="move-to-cart"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        moveToCart(btn.dataset.productId);
      });
    });
    container.querySelectorAll('[data-action="share-wishlist"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        shareProduct(btn.dataset.productId);
      });
    });
    container.querySelectorAll('[data-action="quick-add-wishlist"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(btn.dataset.productId);
      });
    });
  }
};

const initWishlistFilters = () => {
  const filterTabs = document.querySelectorAll('.wishlist-filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;
      document.querySelectorAll('.wishlist-filter-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.wishlist-panel').forEach(p => p.hidden = p.dataset.filter !== filter);
      trackEvent('wishlist_filter', { filter });
    });
  });
};

const initShare = () => {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="share-wishlist"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    
    const productId = btn.dataset.productId;
    const url = `${window.location.origin}/proizvod.html?id=${productId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'DALLI proizvod', url });
        trackEvent('wishlist_share', { method: 'native' });
      } catch (err) {
        if (err.name !== 'AbortError') {
          fallbackCopy(url);
        }
      }
    } else {
      fallbackCopy(url);
    }
  });

  function fallbackCopy(text) {
    navigator.clipboard.writeText(text).then(() => {
      window.showToast?.('Link kopiran u clipboard', 'success');
      trackEvent('wishlist_share', { method: 'clipboard' });
    }).catch(() => {
      window.showToast?.('Greška pri kopiranju', 'error');
    });
  }
};

const removeFromWishlist = async (productId) => {
  try {
    const response = await fetch('/api/wishlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });
    if (response.ok) {
      const item = document.querySelector(`[data-product-id="${productId}"]`);
      if (item) {
        item.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
          item.remove();
          checkEmptyWishlist();
        }, 300);
      }
      trackEvent('wishlist_remove', { productId });
      window.showToast?.('Uklonjeno sa liste želja', 'info');
    }
  } catch (err) {
    console.error('Remove wishlist error:', err);
    window.showToast?.('Greška pri uklanjanju', 'error');
  }
};

const moveToCart = async (productId) => {
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, qty: 1 })
    });
    if (response.ok) {
      window.showToast?.('Dodato u korpu', 'success');
      trackEvent('wishlist_move_to_cart', { productId });
      // Optionally remove from wishlist
      // removeFromWishlist(productId);
    }
  } catch (err) {
    console.error('Move to cart error:', err);
    window.showToast?.('Greška', 'error');
  }
};

const shareProduct = (productId) => {
  const url = `${window.location.origin}/proizvod.html?id=${productId}`;
  if (navigator.share) {
    navigator.share({ title: 'DALLI proizvod', url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => {
      window.showToast?.('Link kopiran', 'success');
    });
  }
  trackEvent('wishlist_share', { productId });
};

const addToCart = async (productId) => {
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, qty: 1 })
    });
    if (response.ok) {
      window.showToast?.('Dodato u korpu', 'success');
      trackEvent('wishlist_add_to_cart', { productId });
    }
  } catch (err) {
    window.showToast?.('Greška', 'error');
  }
};

const checkEmptyWishlist = () => {
  const grid = document.getElementById('wishlistGrid');
  const empty = document.getElementById('wishlistEmpty');
  if (grid && grid.children.length === 0 && empty) {
    empty.hidden = false;
  }
};

const loadWishlist = async () => {
  const container = document.getElementById('wishlistGrid');
  const emptyState = document.getElementById('wishlistEmpty');
  const countEl = document.getElementById('wishlistCount');

  try {
    // Show loading
    const grid = document.getElementById('wishlistGrid');
    if (grid) {
      grid.innerHTML = '<div class="loading-spinner" style="text-align: center; padding: var(--space-12);"><div class="spinner" style="width: 40px; height: 40px; border: 3px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div></div>';
    }

    // TODO: Replace with actual API call
    const response = await fetch('/api/wishlist');
    if (!response.ok) throw new Error('Greška pri učitavanju');
    const data = await response.json();
    const items = data.items || data.wishlist || [];

    if (countEl) countEl.textContent = items.length;

    if (items.length === 0) {
      if (grid) grid.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
    } else {
      if (emptyState) emptyState.hidden = true;
      renderWishlist(items);
    }
  } catch (err) {
    console.error('Load wishlist error:', err);
    const grid = document.getElementById('wishlistGrid');
    if (grid) grid.innerHTML = '<div class="error-message" style="text-align: center; padding: var(--space-8); color: var(--color-error);">Greška pri učitavanju liste želja.</div>';
  }
};

const init = () => {
  if (isInitialized) return;

  subscribeToUser((user) => {
    if (!user) {
      window.location.href = '/prijava.html?redirect=/wishlist.html';
      return;
    }
    loadWishlist();
  });

  loadWishlist();
  initWishlistFilters();
  initShare();

  isInitialized = true;
  console.log('[Wishlist] Initialized');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, loadWishlist };

if (typeof window !== 'undefined') {
  window.DALLI_Wishlist = { init, loadWishlist };
}