import { cartSignal, updateCartQty, removeFromCart, getCartTotals, subscribeToCart } from '../state/cart.js';
import { userSignal, subscribeToUser } from '../state/user.js';
import { $, $$, show, hide, formatPrice, on, delegate } from '../core/dom.js';
import { trackEvent } from '../features/analytics.js';

let isInitialized = false;
let promoApplied = false;
let promoDiscount = 0;

const PROMO_CODES = {
  'WELCOME10': { type: 'percent', value: 10, description: 'Dobrodošli popust 10%' },
  'SAVE20': { type: 'percent', value: 20, description: 'Sezonski popust 20%' },
  'FREESHIP': { type: 'shipping', value: 0, description: 'Besplatna dostava' }
};

const initElements = () => {
  return {
    cartItems: $('#cartItems'),
    cartEmpty: $('#cartEmpty'),
    cartSummary: $('#cartSummary'),
    summaryItems: $('#summaryItems'),
    summaryItemCount: $('#summaryItemCount'),
    summarySubtotal: $('#summarySubtotal'),
    summaryShipping: $('#summaryShipping'),
    summaryDiscountRow: $('#summaryDiscountRow'),
    summaryDiscount: $('#summaryDiscount'),
    summaryTotal: $('#summaryTotal'),
    promoCode: $('#promoCode'),
    applyPromo: $('#applyPromo'),
    checkoutBtnPage: $('#checkoutBtnPage'),
    checkoutBtnSidebar: $('#checkoutBtnSidebar'),
    continueShopping: $('.btn-secondary[data-i18n="cart.continueShopping"]'),
    checkoutCryptoBtn: $('#checkoutCryptoBtn'),
    cartDrawerItems: $('#cartDrawer #cartItems'),
    cartDrawerEmpty: $('#cartDrawer #cartEmpty'),
    cartDrawerSummary: $('#cartDrawer #cartSummary')
  };
};

const renderCartItems = (cart) => {
  const els = initElements();
  const containers = [els.cartItems, els.cartDrawerItems].filter(Boolean);
  
  containers.forEach(container => {
    if (!container) return;
    
    if (cart.length === 0) return;
    
    container.innerHTML = cart.map(item => `
      <article class="cart-item" data-variant-id="${item.variantId}" role="listitem">
        <img class="cart-item__image" src="${item.image}" alt="${item.name}" loading="lazy" width="80" height="80">
        <div class="cart-item__details">
          <h3 class="cart-item__name">${item.name}</h3>
          <div class="cart-item__meta">
            ${item.color ? `<span class="cart-item__color">${item.color}</span>` : ''}
            ${item.size ? `<span class="cart-item__size">${item.size}</span>` : ''}
          </div>
          <div class="cart-item__price">${formatPrice(item.price * item.qty)}</div>
        </div>
        <div class="cart-item__quantity">
          <button class="cart-item__qty-btn" data-action="decrease" aria-label="Smanji količinu">−</button>
          <span class="cart-item__qty-value">${item.qty}</span>
          <button class="cart-item__qty-btn" data-action="increase" aria-label="Povećaj količinu">+</button>
        </div>
        <button class="cart-item__remove" data-action="remove" aria-label="Ukloni ${item.name} iz korpe">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </article>
    `).join('');
  });
};

const renderSummaryItems = (cart) => {
  const els = initElements();
  if (!els.summaryItems) return;

  if (cart.length === 0) {
    els.summaryItems.innerHTML = '';
    return;
  }

  els.summaryItems.innerHTML = cart.map(item => `
    <div class="summary-item" role="listitem">
      <div class="summary-item__info">
        <span class="summary-item__name">${item.name}</span>
        <div class="summary-item__meta">
          ${item.color ? `<span>${item.color}</span>` : ''}
          ${item.size ? `<span>${item.size}</span>` : ''}
          <span class="summary-item__qty">x${item.qty}</span>
        </div>
      </div>
      <span class="summary-item__price">${formatPrice(item.price * item.qty)}</span>
    </div>
  `).join('');
};

const updateTotals = (cart, user) => {
  const els = initElements();
  const { subtotal, shipping, cryptoDiscount, total, itemCount, freeShippingRemaining } = getCartTotals(user?.cryptoWallet);

  // Apply promo discount if any
  let finalTotal = total;
  let finalCryptoDiscount = cryptoDiscount;
  
  if (promoApplied) {
    if (promoDiscount.type === 'percent') {
      finalCryptoDiscount += subtotal * (promoDiscount.value / 100);
    } else if (promoDiscount.type === 'shipping') {
      // Free shipping handled by setting shipping to 0 in getCartTotals if we track it
    }
    finalTotal = subtotal + shipping - finalCryptoDiscount;
  }

  // Page summary
  if (els.summaryItemCount) els.summaryItemCount.textContent = itemCount;
  if (els.summarySubtotal) els.summarySubtotal.textContent = formatPrice(subtotal);
  if (els.summaryShipping) els.summaryShipping.textContent = shipping === 0 ? 'Besplatno' : formatPrice(shipping);
  if (els.summaryTotal) els.summaryTotal.textContent = formatPrice(finalTotal);

  // Drawer summary
  const drawerItemCount = $('#cartDrawerCount');
  const drawerSubtotal = $('#cartSubtotal');
  const drawerShipping = $('#cartShipping');
  const drawerCryptoDiscount = $('#cartCryptoDiscount');
  const drawerCryptoAmount = $('#cartCryptoAmount');
  const drawerTotal = $('#cartTotal');
  const drawerFreeShippingRemaining = $('#cartFreeShippingRemaining');
  const drawerCheckoutCryptoBtn = $('#checkoutCryptoBtn');

  if (drawerItemCount) drawerItemCount.textContent = itemCount;
  if (drawerSubtotal) drawerSubtotal.textContent = formatPrice(subtotal);
  if (drawerShipping) drawerShipping.textContent = shipping === 0 ? 'Besplatno' : formatPrice(shipping);
  if (drawerTotal) drawerTotal.textContent = formatPrice(finalTotal);

  // Crypto discount
  const showCrypto = finalCryptoDiscount > 0;
  if (els.summaryDiscountRow) els.summaryDiscountRow.classList.toggle('hidden', !showCrypto);
  if (drawerCryptoDiscount) drawerCryptoDiscount.style.display = showCrypto ? 'flex' : 'none';
  if (els.summaryDiscount) els.summaryDiscount.textContent = `-${formatPrice(finalCryptoDiscount)}`;
  if (drawerCryptoAmount) drawerCryptoAmount.textContent = `-${formatPrice(finalCryptoDiscount)}`;
  if (drawerCheckoutCryptoBtn) drawerCheckoutCryptoBtn.style.display = user?.cryptoWallet ? 'block' : 'none';

  // Free shipping remaining
  if (els.summaryFreeShippingRemaining || drawerFreeShippingRemaining) {
    const remaining = Math.max(0, 5000 - subtotal);
    const note = $('#cartFreeShippingNote');
    if (note) {
      if (remaining > 0) {
        show(note);
        if (drawerFreeShippingRemaining) drawerFreeShippingRemaining.textContent = formatPrice(remaining);
      } else {
        hide(note);
      }
    }
  }
};

const updateEmptyState = (cart) => {
  const els = initElements();
  const drawerEmpty = $('#cartDrawer #cartEmpty');
  const drawerItems = $('#cartDrawer #cartItems');
  const drawerSummary = $('#cartDrawer #cartSummary');

  const isEmpty = cart.length === 0;

  if (els.cartEmpty) isEmpty ? show(els.cartEmpty) : hide(els.cartEmpty);
  if (els.cartItems) isEmpty ? hide(els.cartItems) : show(els.cartItems);
  if (els.cartSummary) isEmpty ? hide(els.cartSummary) : show(els.cartSummary);
  if (drawerEmpty) isEmpty ? show(drawerEmpty) : hide(drawerEmpty);
  if (drawerItems) isEmpty ? hide(drawerItems) : show(drawerItems);
  if (drawerSummary) isEmpty ? hide(drawerSummary) : show(drawerSummary);
};

const recalcCart = () => {
  const cart = cartSignal.get();
  const user = userSignal.get();

  updateEmptyState(cart);
  renderCartItems(cart);
  renderSummaryItems(cart);
  updateTotals(cart, user);
};

const applyPromoCode = (code) => {
  const normalized = code.trim().toUpperCase();
  const promo = PROMO_CODES[normalized];

  if (!promo) {
    window.showToast?.('Nevažeći promo kod', 'error');
    return false;
  }

  promoApplied = true;
  promoDiscount = promo;

  window.showToast?.(`Primijenjen: ${promo.description}`, 'success');
  recalcCart();
  trackEvent('promo_apply', { code: normalized, type: promo.type, value: promo.value });
  return true;
};

const removePromoCode = () => {
  if (!promoApplied) return;
  
  promoApplied = false;
  promoDiscount = 0;
  
  const els = initElements();
  if (els.promoCode) els.promoCode.value = '';
  
  recalcCart();
  window.showToast?.('Promo kod uklonjen', 'info');
  trackEvent('promo_remove');
};

const bindEvents = () => {
  const els = initElements();

  // Quantity & remove buttons (page + drawer)
  const handleCartAction = (e, container) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const item = btn.closest('.cart-item');
    if (!item) return;
    const variantId = item.dataset.variantId;

    switch (btn.dataset.action) {
      case 'increase': updateCartQty(variantId, 1); break;
      case 'decrease': updateCartQty(variantId, -1); break;
      case 'remove': removeFromCart(variantId); break;
    }
  };

  if (els.cartItems) on(els.cartItems, 'click', handleCartAction);
  if (els.cartDrawerItems) on(els.cartDrawerItems, 'click', handleCartAction);

  // Promo code
  if (els.applyPromo) {
    on(els.applyPromo, 'click', () => {
      if (els.promoCode?.value?.trim()) {
        applyPromoCode(els.promoCode.value);
      }
    });
    if (els.promoCode) {
      on(els.promoCode, 'keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (els.promoCode.value?.trim()) applyPromoCode(els.promoCode.value);
        }
      });
    }
  }

  // Checkout buttons
  const navigateToCheckout = () => {
    const cart = cartSignal.get();
    if (cart.length === 0) {
      window.showToast?.('Vaša korpa je prazna', 'warning');
      return;
    }
    trackEvent('checkout_start', { item_count: cart.length });
    window.location.href = '/checkout.html';
  };

  if (els.checkoutBtnPage) on(els.checkoutBtnPage, 'click', navigateToCheckout);
  if (els.checkoutBtnSidebar) on(els.checkoutBtnSidebar, 'click', navigateToCheckout);
  if (els.checkoutCryptoBtn) on(els.checkoutCryptoBtn, 'click', navigateToCheckout);

  // Continue shopping
  if (els.continueShopping) {
    on(els.continueShopping, 'click', (e) => {
      e.preventDefault();
      trackEvent('continue_shopping');
      window.location.href = '/proizvodi.html';
    });
  }

  // Promo remove on input clear
  if (els.promoCode) {
    on(els.promoCode, 'input', () => {
      if (!els.promoCode.value.trim() && promoApplied) {
        removePromoCode();
      }
    });
  }
};

export const initCartPage = () => {
  if (isInitialized) return;

  // Subscribe to cart changes
  subscribeToCart(recalcCart);
  subscribeToUser(recalcCart);

  // Bind events
  bindEvents();

  // Initial render
  recalcCart();

  isInitialized = true;
  console.log('[CartPage] Initialized');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCartPage);
} else {
  initCartPage();
}

export { recalcCart, initCartPage as init };

if (typeof window !== 'undefined') {
  window.DALLI_CartPage = { initCartPage, recalcCart };
}