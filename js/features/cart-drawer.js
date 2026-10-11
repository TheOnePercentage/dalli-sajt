import { cartSignal, updateCartQty, removeFromCart, getCartTotals, subscribeToCart } from '../state/cart.js';
import { userSignal, subscribeToUser } from '../state/user.js';
import { $, $$, show, hide, formatPrice, on } from '../core/dom.js';
import { emit, DOM_EVENTS } from '../core/events.js';

let cartDrawerEl = null;
let isInitialized = false;

const initElements = () => {
  cartDrawerEl = $('#cartDrawer');
  if (!cartDrawerEl) return false;
  return true;
};

const renderTotals = (cart, user) => {
  const { subtotal, shipping, cryptoDiscount, total, itemCount, freeShippingRemaining } = getCartTotals(user?.cryptoWallet);

  const countEl = $('#cartCount');
  const itemCountEl = $('#cartItemCount');
  const subtotalEl = $('#cartSubtotal');
  const shippingEl = $('#cartShipping');
  const cryptoRow = $('#cartCryptoDiscount');
  const cryptoAmountEl = $('#cartCryptoAmount');
  const totalEl = $('#cartTotal');
  const freeShippingEl = $('#cartFreeShippingRemaining');
  const checkoutCryptoBtn = $('#checkoutCryptoBtn');

  if (countEl) countEl.textContent = itemCount;
  if (itemCountEl) itemCountEl.textContent = itemCount;
  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Besplatno' : formatPrice(shipping);
  if (cryptoRow) cryptoRow.style.display = cryptoDiscount > 0 ? 'flex' : 'none';
  if (cryptoAmountEl) cryptoAmountEl.textContent = `-${formatPrice(cryptoDiscount)}`;
  if (totalEl) totalEl.textContent = formatPrice(total);
  if (freeShippingEl) freeShippingEl.textContent = formatPrice(freeShippingRemaining);
  if (checkoutCryptoBtn) checkoutCryptoBtn.style.display = user?.cryptoWallet ? 'block' : 'none';
};

const renderEmptyState = (cart) => {
  const emptyEl = $('#cartEmpty');
  const itemsEl = $('#cartItems');
  const summaryEl = $('#cartSummary');
  if (emptyEl && itemsEl && summaryEl) {
    if (cart.length === 0) {
      show(emptyEl);
      hide(itemsEl);
      hide(summaryEl);
    } else {
      hide(emptyEl);
      show(itemsEl);
      show(summaryEl);
    }
  }
};

const renderItems = (cart) => {
  const container = $('#cartItems');
  if (!container) return;

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}" data-variant="${item.variantId || ''}">
      <img class="cart-item__image" src="${item.image}" alt="${item.name}" loading="lazy" width="64" height="64">
      <div class="cart-item__info">
        <span class="cart-item__name">${item.name}</span>
        <div class="cart-item__meta">
          ${item.color ? `<span>${item.color}</span>` : ''}
          ${item.size ? `<span>${item.size}</span>` : ''}
          <span>${formatPrice(item.price * item.qty)}</span>
        </div>
      </div>
      <div class="cart-item__qty">
        <button class="cart-item__qty-btn" data-action="decrease" aria-label="Smanji količinu">−</button>
        <span class="cart-item__qty-value">${item.qty}</span>
        <button class="cart-item__qty-btn" data-action="increase" aria-label="Povećaj količinu">+</button>
      </div>
      <button class="cart-item__remove" data-action="remove" aria-label="Ukloni iz korpe">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
};

const recalcCart = () => {
  const cart = cartSignal.get();
  const user = userSignal.get();

  renderTotals(cart, user);
  renderEmptyState(cart);
  if (cart.length > 0) {
    renderItems(cart);
  }
};

const bindEvents = () => {
  if (!cartDrawerEl) return;

  // Quantity buttons & remove
  on(cartDrawerEl, 'click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const item = btn.closest('.cart-item');
    if (!item) return;
    const variantId = item.dataset.variant;

    switch (btn.dataset.action) {
      case 'increase': updateCartQty(variantId, 1); break;
      case 'decrease': updateCartQty(variantId, -1); break;
      case 'remove': removeFromCart(variantId); break;
    }
  });
};

export const initCartDrawer = () => {
  if (isInitialized) return;

  if (!initElements()) return;

  // Subscribe to cart changes
  subscribeToCart(recalcCart);

  // Subscribe to user changes (for crypto discount)
  subscribeToUser(recalcCart);

  // Bind events
  bindEvents();

  // Initial render
  recalcCart();

  isInitialized = true;

  return { recalcCart };
};

export const refreshCartDrawer = () => {
  recalcCart();
};

if (typeof window !== 'undefined') {
  window.DALLI_CartDrawer = { initCartDrawer, refreshCartDrawer };
}