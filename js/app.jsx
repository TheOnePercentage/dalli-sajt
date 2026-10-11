/**
 * DALLI - Main Application Entry Point
 * Mobile-first, vanilla ES modules
 * Loaded with defer in index.html
 */

import './lqip-moderation-errorboundary.js';
import { generateLQIP } from './lqip-moderation-errorboundary.js';
import { isCryptoShippingFree } from './state/cart.js';
import { getCryptoDiscountRateSync } from './services/payment-incentives.js';
import { installProductVisibilityInterceptor } from './services/product-visibility.js';
import './components/Logo.js'; // Logo system auto-initializes

installProductVisibilityInterceptor();

// ============================================================
// I18N INTEGRATION
// ============================================================
// Global t() helper for use in JSX/components
window.t = (key, params) => window.I18n?.t?.(key, params) ?? key;

// Format helpers
window.formatCurrency = (amount, currency) => window.I18n?.formatCurrency?.(amount, currency) ?? `${amount} RSD`;
window.formatDate = (date) => window.I18n?.formatDate?.(date) ?? I18n.formatDate(date);
window.formatNumber = (num) => window.I18n?.formatNumber?.(num) ?? num.toString();

// Locale change handler - re-renders current section
if (window.I18n) {
  window.I18n.onLocaleChange((locale) => {
    if (window.app && window.app.currentSection && window.app.currentSection.render) {
      window.app.currentSection.render();
    }
    // Re-render header/nav if they exist
    if (window.app && window.app.sidebar) {
      window.app.sidebar.render();
    }
    if (window.app && window.app.pageHeader) {
      window.app.pageHeader.render();
    }
  });
}

// ============================================================
// STATE MANAGEMENT (Signals-based, lightweight)
// ============================================================
const createSignal = (initial) => {
  let value = initial;
  const subscribers = new Set();
  return {
    get: () => value,
    set: (newVal) => {
      value = typeof newVal === 'function' ? newVal(value) : newVal;
      subscribers.forEach(fn => fn(value));
    },
    subscribe: (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); }
  };
};

// Aggressively clear localStorage quota BEFORE creating signals
// Use synchronous loop to ensure quota is freed
(function clearQuotaAggressively() {
  try {
    localStorage.setItem('__quota_test__', 'x');
    localStorage.removeItem('__quota_test__');
    return; // quota OK
  } catch (e) {
    // Quota exceeded - clear ALL dalli_ keys
    Object.keys(localStorage)
      .filter(k => k.startsWith('dalli_'))
      .forEach(k => localStorage.removeItem(k));
    console.log('[localStorage] Cleared all dalli_ keys for quota');
  }
})();

// Persist state changes (safe) - with in-memory fallback
let memoryFallback = {};
const safeSetItem = (key, value) => {
  try { 
    localStorage.setItem(key, value); 
    memoryFallback[key] = value;
  } catch (e) {
    memoryFallback[key] = value; // silent memory fallback
  }
};

const safeGetItem = (key, defaultValue = null) => {
  if (memoryFallback[key] !== undefined) return memoryFallback[key];
  try { 
    const value = localStorage.getItem(key);
    if (value !== null) {
      memoryFallback[key] = value;
      return value;
    }
    return defaultValue;
  } catch { 
    return memoryFallback[key] ?? defaultValue; 
  }
};

// Global state
const state = {
  theme: createSignal(safeGetItem('dalli_theme') || 'system'),
  cart: createSignal(JSON.parse(safeGetItem('dalli_cart') || '[]')),
  user: createSignal(JSON.parse(safeGetItem('dalli_user') || 'null')),
  language: createSignal(safeGetItem('dalli_lang') || 'sr'),
  currency: createSignal(safeGetItem('dalli_currency') || 'RSD'),
  drawers: {
    search: createSignal(false),
    menu: createSignal(false),
    cart: createSignal(false),
    user: createSignal(false)
  },
  modals: {
    auth: createSignal(false),
    profile: createSignal(false)
  },
  authMode: createSignal('login'),
  notifications: createSignal([]),
  products: createSignal([]),
  categories: createSignal({}),
  loyalty: createSignal(null),
  personalization: createSignal(null)
};

Object.entries(state).forEach(([key, signal]) => {
  if (signal.subscribe) {
    signal.subscribe((val) => {
      if (key !== 'drawers' && key !== 'modals' && key !== 'authMode' && key !== 'notifications') {
        safeSetItem(`dalli_${key}`, JSON.stringify(val));
      }
    });
  }
});

// ============================================================
// DOM UTILITIES
// ============================================================
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const toggleClass = (el, cls, force) => el?.classList.toggle(cls, force);
const addClass = (el, cls) => el?.classList.add(cls);
const removeClass = (el, cls) => el?.classList.remove(cls);
const hasClass = (el, cls) => el?.classList.contains(cls);

const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');
const toggle = (el) => el?.classList.toggle('hidden');

const setAttr = (el, attrs) => { Object.entries(attrs).forEach(([k, v]) => el?.setAttribute(k, v)); };

// ============================================================
// DRAWER MANAGEMENT
// ============================================================
const drawers = {
  search: $('#searchDrawer'),
  menu: $('#mobileDrawer'),
  cart: $('#cartDrawer'),
  filter: $('#filterDrawer'),
  user: null // user dropdown handled separately
};

const openDrawer = (name) => {
  const drawer = drawers[name];
  if (!drawer) return;
  drawer.classList.add('open');
  document.body.style.overflow = 'hidden';
  state.drawers[name].set(true);
  // Focus first focusable element
  setTimeout(() => {
    const focusable = drawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
  }, 50);
};

const closeDrawer = (name) => {
  const drawer = drawers[name];
  if (!drawer) return;
  drawer.classList.remove('open');
  document.body.style.overflow = '';
  state.drawers[name].set(false);
};

const closeAllDrawers = () => Object.keys(drawers).forEach(closeDrawer);

const toggleDrawer = (name) => state.drawers[name].get() ? closeDrawer(name) : openDrawer(name);

// Drawer event delegation
document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]');
  if (!action) return;

  const { action: act } = action.dataset;

  switch (act) {
    case 'search': toggleDrawer('search'); break;
    case 'menu': toggleDrawer('menu'); break;
    case 'cart': toggleDrawer('cart'); break;
    case 'filter': toggleDrawer('filter'); break;
    case 'user-menu':
      const dropdown = $('#userDropdown');
      if (dropdown) toggleClass(dropdown, 'hidden');
      break;
    case 'profile': openModal('profile'); closeAllDrawers(); break;
    case 'orders': window.location.href = '/orders.html'; break;
    case 'wishlist': showToast(t('header.wishlistComingSoon'), 'info'); break;
    case 'crypto-wallet': showToast(t('header.cryptoWalletComingSoon'), 'info'); break;
    case 'logout': logoutUser(); break;
    case 'close-drawer': closeAllDrawers(); break;
    case 'close-modal': closeAllModals(); break;
    case 'auth': openModal('auth'); break;
    case 'profile': openModal('profile'); closeAllDrawers(); break;
    case 'logout': logoutUser(); break;
    case 'theme-toggle': toggleTheme(); break;
    case 'language':
    case 'currency': openDrawer('menu'); break;
    case 'checkout': goToCheckout(); break;
    default:
      if (act.startsWith('drawer-')) return;
  }
});

// Close drawers on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllDrawers();
});

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const dropdown = $('#userDropdown');
  const trigger = $('#userMenuTrigger');
  if (dropdown && trigger && !dropdown.contains(e.target) && !trigger.contains(e.target)) {
    hide(dropdown);
  }
});

// ============================================================
// GLOBAL ANALYTICS TRACKER (data-track attributes)
// ============================================================
document.addEventListener('click', (e) => {
  const trackedEl = e.target.closest('[data-track]');
  if (!trackedEl) return;

  const trackName = trackedEl.dataset.track;
  const payload = {
    event: trackName,
    element: trackedEl.tagName.toLowerCase(),
    href: trackedEl.href || null,
    text: trackedEl.textContent?.trim().slice(0, 50) || null,
    timestamp: Date.now(),
    device: window.innerWidth < 768 ? 'mobile' : 'desktop'
  };

  if (window.dataLayer) window.dataLayer.push(payload);
  if (window.gtag) window.gtag('event', trackName, payload);
  console.log('[Analytics] Track:', payload);
});

// ============================================================
// MODAL MANAGEMENT
// ============================================================
const modals = {
  auth: $('#authModal'),
  profile: $('#profileModal')
};

const openModal = (name) => {
  const modal = modals[name];
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  state.modals[name].set(true);
  // Focus first input
  setTimeout(() => {
    const input = modal.querySelector('input, button, [href]');
    input?.focus();
  }, 50);
};

const closeModal = (name) => {
  const modal = modals[name];
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  state.modals[name].set(false);
};

const closeAllModals = () => Object.keys(modals).forEach(closeModal);

const switchAuthMode = (mode) => {
  state.authMode.set(mode);
  const loginForm = $('#loginForm');
  const registerForm = $('#registerForm');
  const title = $('#authModalTitle');
  if (mode === 'register') {
    hide(loginForm);
    show(registerForm);
    title.textContent = t('auth.register');
  } else {
    show(loginForm);
    hide(registerForm);
    title.textContent = t('auth.login');
  }
};

document.addEventListener('click', (e) => {
  if (e.target.matches('[onclick*="switchAuthMode"]') || e.target.closest('[onclick*="switchAuthMode"]')) return;
  if (e.target.matches('[onclick*="togglePassword"]') || e.target.closest('[onclick*="togglePassword"]')) return;
});

// Auth form switching
$$('.auth-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const mode = link.textContent.includes('Registrujte') ? 'register' : 'login';
    switchAuthMode(mode);
  });
});

// ============================================================
// THEME MANAGEMENT
// ============================================================
const updateThemeUI = (theme) => {
  // Update desktop theme toggle icon
  const themeToggle = $('#themeToggle');
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }
  
  // Update mobile theme value display
  const mobileThemeValue = $('#mobileThemeValue');
  if (mobileThemeValue) {
    const labels = { system: 'Sistem', light: 'Svetla', dark: 'Tamna' };
    mobileThemeValue.textContent = t('common.theme.' + theme) || t('common.theme.system');
  }
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);
  safeSetItem('dalli_theme', theme);
  state.theme.set(theme);
  updateThemeUI(theme);
};

const toggleTheme = () => {
  const current = state.theme.get();
  const next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
  applyTheme(next);
};

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (state.theme.get() === 'system') applyTheme('system');
});

// Initialize theme UI on load
updateThemeUI(state.theme.get());

// ============================================================
// CART MANAGEMENT
// ============================================================
const CART_STORAGE_KEY = 'dalli_cart';
const FREE_SHIPPING_THRESHOLD = 5000;
// Live rate resolved from the Experience Center (Payment Incentives);
// falls back to the configured default when unavailable.
const getCryptoRate = () => getCryptoDiscountRateSync();

const recalcCart = () => {
  const cart = state.cart.get();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const cryptoWallet = state.user.get()?.cryptoWallet;
  const freeCryptoShipping = cryptoWallet && isCryptoShippingFree();
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || freeCryptoShipping ? 0 : 290; // 290 RSD shipping
  const cryptoDiscount = cryptoWallet ? subtotal * getCryptoRate() : 0;
  const total = subtotal + shipping - cryptoDiscount;

  // Update DOM
  const countEl = $('#cartCount');
  const itemCountEl = $('#cartItemCount');
  const subtotalEl = $('#cartSubtotal');
  const shippingEl = $('#cartShipping');
  const cryptoRow = $('#cartCryptoDiscount');
  const cryptoAmountEl = $('#cartCryptoAmount');
  const totalEl = $('#cartTotal');
  const freeShippingEl = $('#cartFreeShippingRemaining');
  const checkoutCryptoBtn = $('#checkoutCryptoBtn');

  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  if (countEl) countEl.textContent = itemCount;
  if (itemCountEl) itemCountEl.textContent = itemCount;
  if (subtotalEl) subtotalEl.textContent = t('cart.subtotal', { amount: subtotal.I18n.formatNumber });
  if (shippingEl) shippingEl.textContent = shipping === 0 ? t('cart.freeShipping') : t('cart.shippingCost', { amount: shipping.I18n.formatNumber });
  if (cryptoRow) cryptoRow.style.display = cryptoDiscount > 0 ? 'flex' : 'none';
  if (cryptoAmountEl) cryptoAmountEl.textContent = t('cart.cryptoDiscount', { amount: cryptoDiscount.I18n.formatNumber });
  if (totalEl) totalEl.textContent = t('cart.total', { amount: total.I18n.formatNumber });
  if (freeShippingEl) freeShippingEl.textContent = t('cart.freeShippingRemaining', { amount: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal).I18n.formatNumber });
  if (checkoutCryptoBtn) checkoutCryptoBtn.style.display = state.user.get()?.cryptoWallet ? 'block' : 'none';

  // Empty state
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
      renderCartItems();
    }
  }
};

const renderCartItems = () => {
  const container = $('#cartItems');
  const cart = state.cart.get();
  if (!container) return;

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}" data-variant="${item.variantId || ''}">
      <div class="cart-item__media">
        <img class="cart-item__image" src="${item.image}" alt="${item.name}" loading="lazy" width="144" height="180" decoding="async">
      </div>
      <div class="cart-item__info">
        <span class="cart-item__name">${item.name}</span>
        <div class="cart-item__meta">
          ${item.color ? `<span>${item.color}</span>` : ''}
          ${item.size ? `<span>${item.size}</span>` : ''}
        </div>
        <div class="cart-item__price-row">
          <span class="cart-item__price">${(item.price * item.qty).I18n.formatNumber} RSD</span>
          <div class="cart-item__qty">
            <button class="cart-item__qty-btn" data-action="decrease" aria-label="Smanji količinu" data-variant-id="${item.variantId}">−</button>
            <span class="cart-item__qty-value">${item.qty}</span>
            <button class="cart-item__qty-btn" data-action="increase" aria-label="Povećaj količinu" data-variant-id="${item.variantId}">+</button>
          </div>
        </div>
      </div>
      <div class="cart-item__actions">
        <button class="cart-item__save-later" data-action="save-later" data-variant-id="${item.variantId}" aria-label="Sačuvaj za kasnije">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          <span>Za kasnije</span>
        </button>
        <button class="cart-item__remove" data-action="remove" data-variant-id="${item.variantId}" aria-label="Ukloni ${item.name} iz korpe">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>Ukloni</span>
        </button>
      </div>
    </div>
  `).join('');
};

const addToCart = (product, variant, qty = 1) => {
  const cart = state.cart.get();
  const variantId = `${product.id}-${variant.color}-${variant.size}`;
  const existing = cart.find(item => item.variantId === variantId);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      variantId,
      name: product.name,
      image: variant.image || product.images?.main || '/images/placeholder.jpg',
      price: variant.price || product.price,
      color: variant.color,
      size: variant.size,
      qty,
      cryptoEligible: true
    });
  }
  state.cart.set([...cart]);
  recalcCart();
  openDrawer('cart');
  showToast(t('cart.addedToCart', { productName: product.name }), 'success');
};

const updateCartQty = (variantId, delta) => {
  const cart = state.cart.get();
  const item = cart.find(item => item.variantId === variantId);
  if (!item) return;

  item.qty = Math.max(1, item.qty + delta);
  if (item.qty <= 0) {
    const idx = cart.indexOf(item);
    cart.splice(idx, 1);
  }
  state.cart.set([...cart]);
  recalcCart();
};

const removeFromCart = (variantId) => {
  const cart = state.cart.get().filter(item => item.variantId !== variantId);
  state.cart.set(cart);
  recalcCart();
};

// Cart event delegation
$('#cartItems')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const variantId = btn.dataset.variantId || (btn.closest('.cart-item')?.dataset.variant || '');
  if (!variantId) return;

  switch (btn.dataset.action) {
    case 'increase': updateCartQty(variantId, 1); break;
    case 'decrease': updateCartQty(variantId, -1); break;
    case 'remove': removeFromCart(variantId); break;
    case 'save-later': saveForLater(variantId); break;
  }
});

// Save for later / Wishlist transfer
const saveForLater = (variantId) => {
  const cart = state.cart.get();
  const item = cart.find(i => i.variantId === variantId);
  if (!item) return;
  
  // Add to wishlist
  const wishlist = JSON.parse(localStorage.getItem('dalli_wishlist') || '[]');
  const exists = wishlist.some(w => w.variantId === variantId);
  if (!exists) {
    wishlist.push({
      id: item.id,
      variantId: item.variantId,
      name: item.name,
      image: item.image,
      price: item.price,
      color: item.color,
      size: item.size,
      savedAt: new Date().toISOString()
    });
    safeSetItem('dalli_wishlist', JSON.stringify(wishlist));
  }
  
  // Remove from cart
  removeFromCart(variantId);
  showToast(t('cart.itemSaved', { productName: item.name }), 'info');
};

// ============================================================
// USER / AUTH MANAGEMENT
// ============================================================
const loginUser = (email, password, remember) => {
  // TODO: Replace with actual API call
  // For now, mock successful login
  const user = {
    id: 'usr_001',
    email,
    name: email.split('@')[0],
    firstName: 'Korisnik',
    lastName: '',
    role: 'customer',
    cryptoWallet: false,
    discount: 10,
    loyalty: {
      tier: 'member',
      points: 0,
      totalSpentRSD: 0,
      ordersCount: 0,
      joinedAt: new Date().toISOString(),
      lastOrderAt: null,
      milestones: []
    },
    wishlist: [],
    savedAddresses: [],
    savedSizes: {},
    preferences: {
      categories: [],
      styles: [],
      newsletter: true,
      sms: false,
      personalization: {
        enabled: true,
        trackViews: true,
        trackWishlist: true,
        trackPurchases: true,
        trackCategories: true,
        shareDataForRecommendations: true
      }
    },
    notifications: {
      backInStock: true,
      priceDrop: true,
      newCollection: true,
      memberAnnouncement: true,
      tierUpgrade: true,
      pointsExpiring: true,
      birthday: true
    },
    createdAt: new Date().toISOString()
  };
  state.user.set(user);
  safeSetItem('dalli_user', JSON.stringify(user));
  updateUserUI(user);
  closeAllModals();
  closeAllDrawers();
  // Sync guest wishlist to account
  syncWishlistToAccount(user);
  showToast(t('auth.loginSuccess'), 'success');
  recalcCart();
  return Promise.resolve(user);
};

const registerUser = (data) => {
  // TODO: Replace with actual API call
  const user = {
    id: 'usr_' + Date.now(),
    email: data.email,
    name: `${data.firstName} ${data.lastName}`,
    firstName: data.firstName,
    lastName: data.lastName,
    username: data.username,
    phone: data.phone,
    role: 'customer',
    cryptoWallet: false,
    discount: 10,
    loyalty: {
      tier: 'member',
      points: 0,
      totalSpentRSD: 0,
      ordersCount: 0,
      joinedAt: new Date().toISOString(),
      lastOrderAt: null,
      milestones: []
    },
    wishlist: [],
    savedAddresses: [],
    savedSizes: {},
    preferences: {
      categories: [],
      styles: [],
      newsletter: true,
      sms: false,
      personalization: {
        enabled: true,
        trackViews: true,
        trackWishlist: true,
        trackPurchases: true,
        trackCategories: true,
        shareDataForRecommendations: true
      }
    },
    notifications: {
      backInStock: true,
      priceDrop: true,
      newCollection: true,
      memberAnnouncement: true,
      tierUpgrade: true,
      pointsExpiring: true,
      birthday: true
    },
    createdAt: new Date().toISOString()
  };
  state.user.set(user);
  safeSetItem('dalli_user', JSON.stringify(user));
  updateUserUI(user);
  closeAllModals();
  closeAllDrawers();
  showToast(t('auth.registerSuccess'), 'success');
  recalcCart();
  return Promise.resolve(user);
  // Email: Send welcome email
  window.EmailService?.triggerWelcome?.(user);
};

const logoutUser = () => {
  state.user.set(null);
  localStorage.removeItem('dalli_user');
  updateUserUI(null);
  closeAllDrawers();
  showToast(t('auth.logoutSuccess'), 'info');
};

const updateUserUI = (user) => {
  const loggedOut = $('#userLoggedOut');
  const loggedIn = $('#userLoggedIn');
  const nameEl = $('#userName');
  const dropdownName = $('#dropdownName');
  const dropdownEmail = $('#dropdownEmail');
  const dropdownAvatar = $('#dropdownAvatar');
  const cryptoBadge = $('#cryptoBadge');
  const authBtn = $('#authBtn');
  // Loyalty elements (legacy - for profile page)
  const loyaltyTierEl = $('#loyaltyTier');
  const loyaltyPointsEl = $('#loyaltyPoints');
  const loyaltyProgressEl = $('#loyaltyProgress');
  const loyaltyNextTierEl = $('#loyaltyNextTier');
  // Loyalty elements (dropdown)
  const loyaltyProgressContainer = $('#loyaltyProgressContainer');
  const loyaltyTierNameEl = $('#loyaltyTierName');
  const loyaltyProgressFill = $('#loyaltyProgressFill');
  const loyaltyRemainingEl = $('#loyaltyRemaining');

  if (user) {
    hide(loggedOut);
    show(loggedIn);
    if (nameEl) nameEl.textContent = user.name || user.email?.split('@')[0];
    if (dropdownName) dropdownName.textContent = user.name || user.email?.split('@')[0];
    if (dropdownEmail) dropdownEmail.textContent = user.email;
    if (dropdownAvatar) dropdownAvatar.textContent = (user.name || 'U')[0].toUpperCase();
    if (cryptoBadge) cryptoBadge.style.display = user.cryptoWallet ? 'inline-flex' : 'none';
    if (authBtn) authBtn.setAttribute('aria-label', 'Korisnički meni');

    // Loyalty UI updates (legacy - for profile page)
    if (user.loyalty) {
      const tier = user.loyalty.tier || 'member';
      const points = user.loyalty.points || 0;
      const totalSpent = user.loyalty.totalSpentRSD || 0;
      const ordersCount = user.loyalty.ordersCount || 0;
      
      // Tier labels in Serbian
      const tierLabels = {
        member: 'Član',
        silver: 'Srebro',
        gold: 'Zlato',
        black: 'Crno'
      };
      
      const loyaltyTierEl = $('#loyaltyTier');
      const loyaltyPointsEl = $('#loyaltyPoints');
      if (loyaltyTierEl) loyaltyTierEl.textContent = t('loyalty.tier.' + tier) || tier;
      if (loyaltyPointsEl) loyaltyPointsEl.textContent = user.loyalty.points.I18n.formatNumber;
      
      // Progress to next tier (legacy)
      if (loyaltyProgressEl && loyaltyNextTierEl) {
        const tiers = [
          { id: 'member', minSpent: 0 },
          { id: 'silver', minSpent: 100000 },
          { id: 'gold', minSpent: 500000 },
          { id: 'black', minSpent: 1000000 }
        ];
        const nextTier = tiers.find(t => t.minSpent > user.loyalty.totalSpentRSD);
        
        if (nextTier && loyaltyProgressEl && loyaltyNextTierEl) {
          const progress = Math.min((user.loyalty.totalSpentRSD / nextTier.minSpent) * 100, 100);
          loyaltyProgressEl.style.width = progress + '%';
          loyaltyNextTierEl.textContent = nextTier.id === 'silver' ? 'Srebro' : nextTier.id === 'gold' ? 'Zlato' : 'Crno';
        }
      }
    }

    // Loyalty Progress Indicator (dropdown)
    if (user.loyalty && loyaltyProgressContainer) {
      const tier = user.loyalty.tier || 'member';
      const totalSpent = user.loyalty.totalSpentRSD || 0;
      
      const tierLabels = {
        member: 'Član',
        silver: 'Srebro',
        gold: 'Zlato',
        black: 'Crno'
      };
      
      // Use LoyaltyUtils for progress calculation
      const progress = window.LoyaltyUtils?.getProgressToNextTier?.(user) || { percent: 0, current: totalSpent, target: 0, nextTier: 'silver' };
      
      // Show container
      loyaltyProgressContainer.classList.remove('hidden');
      loyaltyProgressContainer.dataset.tier = tier;
      
      // Update tier name
      if (loyaltyTierNameEl) {
        loyaltyTierNameEl.textContent = t('loyalty.tier.' + tier) || tier;
      }
      
      // Update progress bar
      if (loyaltyProgressFill) {
        loyaltyProgressFill.style.width = progress.percent + '%';
        loyaltyProgressFill.setAttribute('aria-valuenow', Math.round(progress.percent));
      }
      
      // Update next tier
      if (loyaltyNextTierEl && progress.nextTier) {
        loyaltyNextTierEl.textContent = t('loyalty.tier.' + progress.nextTier) || progress.nextTier;
      }
      
      // Update remaining amount
      if (loyaltyRemainingEl && progress.target > progress.current) {
        const remaining = progress.target - progress.current;
        loyaltyRemainingEl.textContent = `(${remaining.I18n.formatNumber} RSD)`;
      } else if (loyaltyRemainingEl) {
        loyaltyRemainingEl.textContent = '';
      }
    } else if (loyaltyProgressContainer) {
      // Hide if no loyalty data
      loyaltyProgressContainer.classList.add('hidden');
    }

    if (cryptoBadge) cryptoBadge.style.display = user.cryptoWallet ? 'inline-flex' : 'none';
    if (authBtn) authBtn.setAttribute('aria-label', 'Korisnički meni');
  } else {
    show(loggedOut);
    hide(loggedIn);
    if (authBtn) authBtn.setAttribute('aria-label', 'Prijava ili registracija');
    // Hide loyalty progress when logged out
    if (loyaltyProgressContainer) loyaltyProgressContainer.classList.add('hidden');
  }

  // Update profile page loyalty display (if on profile page)
  updateProfileLoyaltyUI(user);
};

// Profile page loyalty UI update
const updateProfileLoyaltyUI = (user) => {
  const loyaltyProfile = $('#loyaltyProfile');
  const loyaltyTierBadge = $('#loyaltyTierBadge');
  const loyaltyTierName = $('#loyaltyTierName');
  const loyaltyPoints = $('#loyaltyPoints');
  const loyaltyProgressLabel = $('#loyaltyProgressLabel');
  const loyaltyProgressPercent = $('#loyaltyProgressPercent');
  const loyaltyProgressFill = $('#loyaltyProgressFill');
  const loyaltySpent = $('#loyaltySpent');
  const loyaltyRemaining = $('#loyaltyRemaining');
  const loyaltyBenefits = $('#loyaltyBenefits');
  const profileName = $('#profileName');
  const profileEmail = $('#profileEmail');

  if (user && user.loyalty && loyaltyProfile) {
    const tier = user.loyalty.tier || 'member';
    const points = user.loyalty.points || 0;
    const totalSpent = user.loyalty.totalSpentRSD || 0;
    
    const tierLabels = {
      member: 'Član',
      silver: 'Srebro',
      gold: 'Zlato',
      black: 'Crno'
    };
    
    const tierGradients = {
      member: 'linear-gradient(135deg, #6B7280, #4B5563)',
      silver: 'linear-gradient(135deg, #9CA3AF, #6B7280)',
      gold: 'linear-gradient(135deg, #F59E0B, #D97706)',
      black: 'linear-gradient(135deg, #111827, #374151)'
    };

    // Use LoyaltyUtils for progress
    const progress = window.LoyaltyUtils?.getProgressToNextTier?.(user) || { percent: 0, current: totalSpent, target: 0, nextTier: 'silver' };
    const benefits = window.LoyaltyUtils?.getBenefitsForTier?.(tier) || [];

    // Show loyalty profile section
    loyaltyProfile.classList.remove('hidden');

    // Update tier badge
    if (loyaltyTierBadge) {
      loyaltyTierBadge.textContent = t('loyalty.tier.' + tier)?.toUpperCase() || tier.toUpperCase();
      loyaltyTierBadge.style.background = tierGradients[tier] || tierGradients.member;
    }

    // Update tier name
    if (loyaltyTierName) {
      loyaltyTierName.textContent = t('loyalty.tier.' + tier) || tier;
    }

    // Update points
    if (loyaltyPoints) {
      loyaltyPoints.textContent = points.I18n.formatNumber;
    }

    // Update progress
    if (loyaltyProgressLabel && progress.nextTier) {
      loyaltyProgressLabel.textContent = t('loyalty.progress', { tier: t('loyalty.tier.' + progress.nextTier) || progress.nextTier });
    }
    if (loyaltyProgressPercent) {
      loyaltyProgressPercent.textContent = t('loyalty.progressPercent', { percent: Math.round(progress.percent) });
    }
    if (loyaltyProgressFill) {
      loyaltyProgressFill.style.width = progress.percent + '%';
      loyaltyProgressFill.style.background = tierGradients[tier] || tierGradients.member;
    }
    if (loyaltySpent) {
      loyaltySpent.textContent = t('loyalty.spent', { amount: totalSpent.I18n.formatNumber });
    }
    if (loyaltyRemaining && progress.target > progress.current) {
      const remaining = progress.target - progress.current;
      loyaltyRemaining.textContent = t('loyalty.remaining', { amount: remaining.I18n.formatNumber, tier: t('loyalty.tier.' + progress.nextTier) || progress.nextTier });
    } else if (loyaltyRemaining) {
      loyaltyRemaining.textContent = t('loyalty.maxTierReached');
    }

    // Update benefits
    if (loyaltyBenefits) {
      loyaltyBenefits.innerHTML = benefits.map(b => `
        <li style="display: flex; align-items: center; gap: var(--space-2);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-success); flex-shrink: 0;"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${b.label || b.id}</span>
        </li>
      `).join('');
    }

    // Update profile header name/email
    if (profileName) profileName.textContent = user.name || user.email?.split('@')[0] || 'Korisnik';
    if (profileEmail) profileEmail.textContent = user.email || '';

  } else if (loyaltyProfile) {
    // Hide if not logged in or no loyalty data
    loyaltyProfile.classList.add('hidden');
  }
    // Analytics: Track loyalty profile views
    window.LoyaltyAnalytics?.trackTierView?.(tier);
    window.LoyaltyAnalytics?.trackProgressView?.(user);
    window.LoyaltyAnalytics?.trackBenefitsView?.(tier);

};

// Orders History Renderer
const renderOrdersHistory = () => {
  const ordersList = $('#ordersList');
  const ordersEmpty = $('#ordersEmpty');
  const ordersLoading = $('#ordersLoading');
  
  if (!ordersList) return; // Not on orders page
  
  const user = state.user.get();
  
  // Show loading
  if (ordersLoading) ordersLoading.classList.remove('hidden');
  if (ordersList) ordersList.classList.add('hidden');
  if (ordersEmpty) ordersEmpty.classList.add('hidden');
  
  // Get orders from localStorage (mock for now - would be API in production)
  const ordersData = JSON.parse(safeGetItem('dalli_orders') || '[]');
  
  // Simulate async load
  setTimeout(() => {
    if (ordersLoading) ordersLoading.classList.add('hidden');
    
    if (!user) {
      if (ordersEmpty) ordersEmpty.classList.remove('hidden');
      return;
    }
    
    // Filter orders for current user (in production this would be server-side)
    const userOrders = ordersData.filter(o => o.userId === user.id);
    
    if (userOrders.length === 0) {
      if (ordersEmpty) ordersEmpty.classList.remove('hidden');
      return;
    }
    
    // Sort by date descending
    userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Render orders
    ordersList.innerHTML = userOrders.map(order => {
      const statusLabels = {
        'pending': 'Na čekanju',
        'confirmed': 'Potvrđena',
        'processing': 'U obradi',
        'shipped': 'Poslata',
        'delivered': 'Isporučena',
        'cancelled': 'Otkazana',
        'returned': 'Vraćena'
      };
      
      const statusColors = {
        'pending': 'var(--color-warning)',
        'confirmed': 'var(--color-info)',
        'processing': 'var(--color-primary)',
        'shipped': 'var(--color-primary)',
        'delivered': 'var(--color-success)',
        'cancelled': 'var(--color-error)',
        'returned': 'var(--color-text-tertiary)'
      };
      
      const itemsHtml = order.items.map(item => `
        <div class="order-item" style="display: flex; gap: var(--space-3); padding: var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn);">
          <img src="${item.image}" alt="${item.name}" width="60" height="75" style="object-fit: cover; border-radius: var(--radius-btn); flex-shrink: 0;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: var(--fw-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
            <div style="font-size: var(--fs-sm); color: var(--color-text-secondary);">${item.color || ''} ${item.size ? `• ${item.size}` : ''} × ${item.qty}</div>
            <div style="font-weight: var(--fw-semibold); margin-top: var(--space-1);">${(item.price * item.qty).I18n.formatNumber} RSD</div>
          </div>
        </div>
      `).join('');
      
      return `
        <article class="order-card" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); overflow: hidden;">
          <header class="order-card__header" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; padding: var(--space-5); border-bottom: 1px solid var(--color-divider); gap: var(--space-3);">
            <div>
              <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-1);">
                <span style="font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--color-text-secondary);">${order.orderNumber}</span>
                <span class="order-status" style="padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); font-size: var(--fs-xs); font-weight: var(--fw-semibold); text-transform: uppercase; background: ${statusColors[order.status] || 'var(--color-border)'}15; color: ${statusColors[order.status] || 'var(--color-text)'};">
                  ${statusLabels[order.status] || order.status}
                </span>
              </div>
              <div style="font-size: var(--fs-sm); color: var(--color-text-secondary);">
                <time datetime="${order.createdAt}">${I18n.formatDate(order.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            </div>
            <div style="text-align: right; min-width: 120px;">
              <div style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--fw-medium); color: var(--color-text);">${t('orders.total', { amount: order.totals.total.I18n.formatNumber })}</div>
              <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary);">Ukupno</div>
            </div>
          </header>
          
          <div class="order-card__items" style="padding: var(--space-4);">
            ${itemsHtml}
          </div>
          
          <footer class="order-card__footer" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; padding: var(--space-4); border-top: 1px solid var(--color-divider); gap: var(--space-3); background: var(--color-bg);">
            <div style="font-size: var(--fs-sm); color: var(--color-text-secondary);">
              <div>Način plaćanja: <span style="color: var(--color-text); font-weight: var(--fw-medium);">${getPaymentMethodLabel(order.paymentMethod)}</span></div>
              <div>Dostava: <span style="color: var(--color-text); font-weight: var(--fw-medium);">${order.shippingMethod || 'Standardna'}</span></div>
            </div>
            <div style="display: flex; gap: var(--space-2);">
              <button class="btn btn-ghost btn-sm" data-action="order-detail" data-order-id="${order.id}" style="font-size: var(--fs-sm);">Detalji</button>
              ${order.status === 'delivered' ? `
                <button class="btn btn-outline btn-sm" data-action="reorder" data-order-id="${order.id}" style="font-size: var(--fs-sm);">${t("orders.reorder")}</button>
              ` : ''}
              ${['pending', 'confirmed'].includes(order.status) ? `
                <button class="btn btn-danger btn-sm" data-action="cancel-order" data-order-id="${order.id}" style="font-size: var(--fs-sm);">${t("orders.cancel")}</button>
              ` : ''}
            </div>
          </footer>
        </article>
      `;
    }).join('');
    
    // Show orders list
    ordersList.classList.remove('hidden');
    
    // Add event listeners for order actions
    $$('#ordersList [data-action="order-detail"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        showOrderDetail(orderId, userOrders.find(o => o.id === orderId));
      });
    });
    
    $$('#ordersList [data-action="reorder"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        reorderItems(orderId, userOrders.find(o => o.id === orderId));
      });
    });
    
    $$('#ordersList [data-action="cancel-order"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.dataset.orderId;
        cancelOrder(orderId);
      });
    });
    
  }, 300); // Simulated delay
};

// Helper functions
const getPaymentMethodLabel = (method) => {
  const labels = {
    'cod': 'Plaćanje pri preuzimanju',
    'bank-transfer': 'Bankovni prenos',
    'card': 'Kreditna / Debitna kartica',
    'crypto': 'Kripto plaćanje'
  };
  return labels[method] || method;
};

const showOrderDetail = (orderId, order) => {
  // Could open a modal or navigate to detail page
  const itemsText = order.items.map(i => `${i.name} (${i.color || ''} ${i.size ? i.size : ''}) × ${i.qty}`).join('\n');
  alert(t('orders.orderNumber', { orderNumber: order.orderNumber }) + '\n' + t('orders.date', { date: I18n.formatDate(order.createdAt) }) + '\n' + t('orders.status', { status: order.status }) + '\n\n' + t('orders.items') + '\n' + itemsText + '\n\n' + t('orders.total', { amount: order.totals.total.I18n.formatNumber }));
};

const reorderItems = (orderId, order) => {
  const cart = state.cart.get();
  let added = 0;
  order.items.forEach(item => {
    const existing = cart.find(c => c.variantId === item.variantId);
    if (existing) {
      existing.qty += item.qty;
    } else {
      cart.push({ ...item, variantId: item.variantId });
    }
    added++;
  });
  state.cart.set(cart);
  safeSetItem('dalli_cart', JSON.stringify(cart));
  recalcCart();
  showToast(t('cart.itemsReordered', { count: added }), 'success');
  // Optionally navigate to cart
  // window.location.href = '/cart.html';
};

const cancelOrder = (orderId) => {
  if (!confirm(t('orders.confirmCancel'))) return;
  
  const ordersData = JSON.parse(safeGetItem('dalli_orders') || '[]');
  const orderIndex = ordersData.findIndex(o => o.id === orderId);
  if (orderIndex !== -1) {
    ordersData[orderIndex].status = 'cancelled';
    ordersData[orderIndex].cancelledAt = new Date().toISOString();
    safeSetItem('dalli_orders', JSON.stringify(ordersData));
    renderOrdersHistory();
    showToast(t('orders.cancelled'), 'success');
    
    // Track event
    trackEvent('order_cancelled', { order_id: orderId });
  }
};

// Initialize orders page on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('orders.html')) {
      renderOrdersHistory();
    }
  });
} else {
  if (window.location.pathname.includes('orders.html')) {
    renderOrdersHistory();
  }
}

// Listen for order placement to add to history
const trackOrderPlacement = (orderData) => {
  const user = state.user.get();
  if (!user) return;
  
  const ordersData = JSON.parse(safeGetItem('dalli_orders') || '[]');
  ordersData.push({
    id: 'ord_' + Date.now(),
    userId: user.id,
    orderNumber: orderData.orderNumber,
    items: orderData.items.map(item => ({
      variantId: item.variantId,
      name: item.name,
      color: item.color,
      size: item.size,
      price: item.price,
      qty: item.qty,
      image: item.image
    })),
    totals: orderData.totals,
    paymentMethod: orderData.paymentMethod,
    shippingMethod: orderData.shippingMethod,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  });
  safeSetItem('dalli_orders', JSON.stringify(ordersData));
  
  // Track purchased products for collaborative filtering
  const purchasedData = JSON.parse(safeGetItem('dalli_purchased_products') || '[]');
  orderData.items.forEach(item => {
    const existing = purchasedData.find(p => p.variantId === item.variantId);
    if (existing) {
      existing.qty += item.qty;
      existing.lastPurchasedAt = new Date().toISOString();
      existing.totalQty = (existing.totalQty || item.qty) + item.qty;
    } else {
      purchasedData.unshift({
        variantId: item.variantId,
        productId: item.productId || item.id,
        name: item.name,
        color: item.color,
        size: item.size,
        price: item.price,
        qty: item.qty,
        image: item.image,
        category: getProductCategory(item.variantId),
        purchasedAt: new Date().toISOString(),
        totalQty: item.qty,
        orderNumber: orderData.orderNumber
      });
    }
  });
  safeSetItem('dalli_purchased_products', JSON.stringify(purchasedData.slice(0, 100)));
  
  // If on orders page, refresh
  if (window.location.pathname.includes('orders.html')) {
    renderOrdersHistory();
  }
};

// Best-effort sync of a REAL placed order to the server-backed order store
// (/api/orders -> Netlify Blobs). Never blocks or changes the checkout UX.
const syncOrderToServer = (orderData) => {
  if (!orderData || !Array.isArray(orderData.items) || !orderData.items.length) return Promise.resolve();
  if (orderData._synced) return Promise.resolve();
  const user = state.user.get();
  const payload = {
    userId: user?.id || orderData.userId || null,
    customer: orderData.customer || {},
    shippingAddress: orderData.shipping || {},
    payment: orderData.payment || { method: orderData.paymentMethod || 'cod' },
    paymentMethod: orderData.paymentMethod || orderData.payment?.method || 'cod',
    items: orderData.items.map(item => ({
      productId: item.productId || item.id,
      variantId: item.variantId,
      name: item.name,
      color: item.color,
      size: item.size,
      price: item.price,
      qty: item.qty,
      image: item.image
    })),
    totals: orderData.totals || {},
    currency: orderData.currency || 'RSD',
    promoCode: orderData.promoCode || null,
    notes: orderData.notes || orderData.customerNotes || ''
  };
  orderData._synced = true;
  return fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) console.warn('[Checkout] syncOrderToServer', res.status, res.statusText);
      return res;
    })
    .catch(err => console.warn('[Checkout] syncOrderToServer failed', err));
};

// ============================================================
// WISHLIST MANAGEMENT
// ============================================================

// Get wishlist from localStorage (guest) or user account (logged in)
const getWishlist = () => {
  const user = state.user.get();
  if (user?.wishlist?.length) {
    return user.wishlist;
  }
  return JSON.parse(safeGetItem('dalli_wishlist') || '[]');
};

// Save wishlist to localStorage (guest) or user account (logged in)
const saveWishlist = (wishlist) => {
  const user = state.user.get();
  if (user) {
    const updatedUser = { ...user, wishlist };
    state.user.set(updatedUser);
    safeSetItem('dalli_user', JSON.stringify(updatedUser));
  } else {
    safeSetItem('dalli_wishlist', JSON.stringify(wishlist));
  }
};

// Sync guest wishlist to user account on login
const syncWishlistToAccount = (user) => {
  const guestWishlist = JSON.parse(safeGetItem('dalli_wishlist') || '[]');
  if (guestWishlist.length === 0) return;
  
  const userWishlist = user.wishlist || [];
  const merged = [...userWishlist];
  
  guestWishlist.forEach(item => {
    if (!merged.some(w => w.variantId === item.variantId)) {
      merged.push(item);
    }
  });
  
  if (merged.length > userWishlist.length) {
    const updatedUser = { ...user, wishlist: merged };
    state.user.set(updatedUser);
    safeSetItem('dalli_user', JSON.stringify(updatedUser));
    showToast(t('cart.wishlistSynced', { count: merged.length - userWishlist.length }), 'success');
  }
  
  // Clear guest wishlist
  safeSetItem('dalli_wishlist', JSON.stringify([]));
};

// Add/remove from wishlist
const toggleWishlist = (product, variant) => {
  const user = state.user.get();
  const wishlist = getWishlist();
  const variantId = `${product.id}-${variant.color}-${variant.size}`;
  
  const existingIndex = wishlist.findIndex(w => w.variantId === variantId);
  
  if (existingIndex >= 0) {
    // Remove
    wishlist.splice(existingIndex, 1);
    saveWishlist(wishlist);
    showToast(t('wishlist.removed'), 'info');
    window.LoyaltyAnalytics?.trackWishlistRemove?.(product.id, variantId);
  } else {
    // Add
    wishlist.push({
      id: product.id,
      variantId,
      name: product.name,
      image: variant.image || product.images?.main || '/images/placeholder.jpg',
      price: variant.price || product.price,
      color: variant.color,
      size: variant.size,
      savedAt: new Date().toISOString()
    });
    saveWishlist(wishlist);
    showToast(t('wishlist.added'), 'success');
    window.LoyaltyAnalytics?.trackWishlistAdd?.(product.id, variantId, 'product_card');
    
    // Update category affinity from wishlist (stronger signal than view)
    if (product.category) {
      try {
        const prefs = JSON.parse(localStorage.getItem('dalli_category_preferences') || '{}');
        prefs[product.category] = (prefs[product.category] || 0) + 3; // Wishlist = stronger signal (weight 3 vs view weight 1)
        localStorage.setItem('dalli_category_preferences', JSON.stringify(prefs));
      } catch (e) {
        console.warn('[Wishlist] Category affinity update failed:', e);
      }
    }
  }
  
  // Update UI
  updateWishlistUI();
  
  // Update button states
  $$(`[data-action="wishlist"][data-product-id="${product.id}"]`).forEach(btn => {
    const btnVariantId = btn.dataset.variantId || variantId;
    const isInWishlist = wishlist.some(w => w.variantId === btnVariantId);
    btn.classList.toggle('active', isInWishlist);
    btn.setAttribute('aria-pressed', isInWishlist);
  });
};

// Check if item is in wishlist
const isInWishlist = (variantId) => {
  const wishlist = getWishlist();
  return wishlist.some(w => w.variantId === variantId);
};

// Render wishlist page
const renderWishlist = () => {
  const wishlistGrid = $('#wishlistGrid');
  const wishlistEmpty = $('#wishlistEmpty');
  const wishlistLoading = $('#wishlistLoading');
  const wishlistCount = $('#wishlistCount');
  const wishlistSyncPrompt = $('#wishlistSyncPrompt');
  
  if (!wishlistGrid) return; // Not on wishlist page
  
  const user = state.user.get();
  
  // Show loading
  if (wishlistLoading) wishlistLoading.classList.remove('hidden');
  if (wishlistGrid) wishlistGrid.classList.add('hidden');
  if (wishlistEmpty) wishlistEmpty.classList.add('hidden');
  if (wishlistSyncPrompt) wishlistSyncPrompt.classList.add('hidden');
  
  setTimeout(() => {
    if (wishlistLoading) wishlistLoading.classList.add('hidden');
    
    const wishlist = getWishlist();
    
    // Update count
    if (wishlistCount) {
      wishlistCount.textContent = `${wishlist.length} ${wishlist.length === 1 ? t('common.product') : wishlist.length < 5 ? t('common.products2-4') : t('common.products5+')}`;
    }
    
    if (wishlist.length === 0) {
      if (wishlistEmpty) wishlistEmpty.classList.remove('hidden');
      // Show sync prompt if logged in but no wishlist
      if (user && wishlistSyncPrompt) wishlistSyncPrompt.classList.remove('hidden');
      return;
    }
    
    // Show sync prompt if logged in
    if (user && wishlistSyncPrompt) wishlistSyncPrompt.classList.remove('hidden');
    
    // Render wishlist items
    const products = state.products.get();
    
    wishlistGrid.innerHTML = wishlist.map(item => {
      const product = products.find(p => p.id === item.id);
      const inStock = product ? product.sizes?.some(s => s.size === item.size && s.available) : true;
      
      return `
        <article class="product-card wishlist-item" data-product-id="${item.id}" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); overflow: hidden; transition: box-shadow var(--duration-normal);">
          <div class="product-card__image-wrapper" style="position: relative; aspect-ratio: 3/4; overflow: hidden; background: var(--color-bg);">
            <img src="${item.image}" alt="${item.name}" class="product-card__image" loading="lazy" width="300" height="400" style="width: 100%; height: 100%; object-fit: cover; transition: transform var(--duration-slow);">
            <button class="product-card__wishlist active" data-action="wishlist" data-product-id="${item.id}" data-variant-id="${item.variantId}" aria-label="Ukloni ${item.name} sa liste želja" aria-pressed="true" style="position: absolute; top: var(--space-3); right: var(--space-3); width: 40px; height: 40px; border-radius: 50%; background: var(--color-surface); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-md); z-index: 2; color: var(--color-error);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            ${!inStock ? '<span class="product-card__badge" style="position: absolute; top: var(--space-3); left: var(--space-3); background: var(--color-error); color: white; padding: var(--space-1) var(--space-2); border-radius: var(--radius-btn); font-size: var(--fs-xs); font-weight: var(--fw-semibold);">Rasprodato</span>' : ''}
          </div>
          <div class="product-card__content" style="padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2);">
            <div class="product-card__meta" style="display: flex; flex-wrap: wrap; gap: var(--space-2); font-size: var(--fs-xs); color: var(--color-text-tertiary);">
              <span>${item.color || ''}</span>
              <span>•</span>
              <span>${item.size || ''}</span>
            </div>
            <h3 class="product-card__name" style="font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--fw-light); line-height: 1.3; color: var(--color-text);">${item.name}</h3>
            <div class="product-card__price" style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-medium); color: var(--color-primary);">${item.price.I18n.formatNumber} RSD</div>
            <div class="product-card__actions" style="display: flex; gap: var(--space-2); margin-top: auto;">
              <button class="btn btn-primary flex-1" data-action="add-to-cart-wishlist" data-variant-id="${item.variantId}" ${!inStock ? 'disabled' : ''} style="font-size: var(--fs-sm);">
                ${inStock ? 'Dodaj u korpu' : 'Rasprodato'}
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
    
    // Show grid
    wishlistGrid.classList.remove('hidden');
    
    // Apply responsive grid
    if (window.innerWidth >= 480) {
      wishlistGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    }
    if (window.innerWidth >= 768) {
      wishlistGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    }
    if (window.innerWidth >= 1024) {
      wishlistGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    }
    
    // Add event listeners
    $$('#wishlistGrid [data-action="wishlist"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const productId = parseInt(btn.dataset.productId);
        const variantId = btn.dataset.variantId;
        const wishlist = getWishlist();
        const item = wishlist.find(w => w.variantId === variantId);
        if (item) {
          const products = state.products.get();
          const product = products.find(p => p.id === productId);
          const variant = product?.variants?.find(v => `${product.id}-${v.color}-${v.size}` === variantId);
          if (product && variant) {
            toggleWishlist(product, variant);
          }
        }
      });
    });
    
    $$('#wishlistGrid [data-action="add-to-cart-wishlist"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const variantId = btn.dataset.variantId;
        const wishlist = getWishlist();
        const item = wishlist.find(w => w.variantId === variantId);
        if (item) {
          const products = state.products.get();
          const product = products.find(p => p.id === item.id);
          const variant = product?.variants?.find(v => `${product.id}-${v.color}-${v.size}` === variantId);
          if (product && variant) {
            addToCart(product, variant, 1);
            // Optionally remove from wishlist after adding to cart
            // toggleWishlist(product, variant);
          }
        }

    // Analytics: Track wishlist view
    window.LoyaltyAnalytics?.trackWishlistView?.(getWishlist().length);
      });
    });
    
  }, 200);
};

// Update wishlist button states across all pages
const updateWishlistUI = () => {
  const wishlist = getWishlist();
  $$('[data-action="wishlist"]').forEach(btn => {
    const variantId = btn.dataset.variantId || (btn.dataset.productId ? `${btn.dataset.productId}-${btn.dataset.color}-${btn.dataset.size}` : null);
    if (variantId) {
      const isActive = wishlist.some(w => w.variantId === variantId);
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    }
  });
};

// Initialize wishlist page on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('wishlist.html')) {
      renderWishlist();
    }
    // Update wishlist button states on all pages
    updateWishlistUI();
  });
} else {
  if (window.location.pathname.includes('wishlist.html')) {
    renderWishlist();
}
updateWishlistUI();
}

// ============================================================
// LOYALTY ANALYTICS
// ============================================================

const LoyaltyAnalytics = {
  // Track loyalty program participation
  trackTierView: (tierId) => {
    trackEvent('loyalty_tier_view', { tier: tierId });
  },

  trackProgressView: (user) => {
    const progress = window.LoyaltyUtils?.getProgressToNextTier?.(user);
    trackEvent('loyalty_progress_view', { 
      currentTier: user?.loyalty?.tier || 'member',
      progressPercent: progress?.percent || 0,
      nextTier: progress?.nextTier
    });
  },

  trackBenefitsView: (tierId) => {
    trackEvent('loyalty_benefits_view', { tier: tierId });
  },

  // Points tracking
  trackPointsEarned: (points, source, amountRSD) => {
    trackEvent('points_earned', { 
      points, 
      source, // 'purchase', 'review', 'referral', 'birthday', 'milestone'
      amountRSD 
    });
  },

  trackPointsRedeemed: (points, valueRSD, orderId) => {
    trackEvent('points_redeemed', { 
      points, 
      valueRSD, 
      orderId 
    });
  },

  trackPointsExpiring: (points, daysUntilExpiry) => {
    trackEvent('points_expiring', { points, daysUntilExpiry });
  },

  // Tier progression
  trackTierUpgraded: (oldTier, newTier, totalSpent) => {
    trackEvent('tier_upgraded', { 
      oldTier, 
      newTier, 
      totalSpent 
    });
    // Show celebration toast
    showToast(`🎉 Čestitamo! Dostigli ste nivo ${t('loyalty.tier.' + newTier) || newTier}!`, 'success');
  },

  // Wishlist analytics
  trackWishlistAdd: (productId, variantId, source) => {
    trackEvent('wishlist_add', { productId, variantId, source }); // source: 'product_card', 'product_page', 'search', 'category'
  },

  trackWishlistRemove: (productId, variantId) => {
    trackEvent('wishlist_remove', { productId, variantId });
  },

  trackWishlistView: (count) => {
    trackEvent('wishlist_view', { itemsCount: count });
  },

  // Member product interactions
  trackMemberProductView: (productId, flagType, userTier) => {
    trackEvent('member_product_view', { productId, flagType, userTier });
  },

  trackEarlyAccessProductView: (productId, userTier, hoursEarly) => {
    trackEvent('early_access_product_view', { productId, userTier, hoursEarly });
  },

  trackLimitedReleaseProductView: (productId, userTier) => {
    trackEvent('limited_release_product_view', { productId, userTier });
  },

  // Member purchases
  trackMemberPurchase: (orderData, userTier, loyaltyDiscount, pointsEarned) => {
    trackEvent('member_purchase', { 
      orderId: orderData.orderNumber,
      total: orderData.totals.total,
      userTier,
      loyaltyDiscount,
      pointsEarned,
      items: orderData.items.length
    });
  },

  // Repeat purchase tracking
  trackRepeatPurchase: (user, orderCount, daysSinceLastOrder) => {
    trackEvent('repeat_purchase', { 
      userId: user.id,
      orderCount,
      daysSinceLastOrder,
      tier: user.loyalty?.tier
    });
  },

  // Notification tracking
  trackNotificationSubscribe: (type) => {
    trackEvent('notification_subscribe', { type });
  },

  trackNotificationOpen: (type, notificationId) => {
    trackEvent('notification_open', { type, notificationId });
  },

  // Profile data tracking
  trackProfileSizesSaved: (categories) => {
    trackEvent('profile_saved_sizes', { categories });
  },

  trackProfileAddressesSaved: (count) => {
    trackEvent('profile_saved_addresses', { count });
  },

  trackPreferencesUpdated: (prefs) => {
    trackEvent('profile_preferences_updated', prefs);
  },

  // Milestone tracking
  trackMilestoneReached: (milestone, reward) => {
    trackEvent('loyalty_milestone_reached', { milestone, reward });
  },

  // Referral tracking (future)
  trackReferralSent: (referrerId, channel) => {
    trackEvent('referral_sent', { referrerId, channel });
  },

  trackReferralCompleted: (referrerId, refereeId) => {
    trackEvent('referral_completed', { referrerId, refereeId });
  },

  // ============================================================
  // FUTURE HOOKS (Crypto, VIP, AI Stylist, Exclusive Drops)
  // ============================================================

  // Crypto Rewards
  trackCryptoRewardClaimed: (userId, tokenAmount, tokenType, trigger) => {
    trackEvent('crypto_reward_claimed', { userId, tokenAmount, tokenType, trigger });
  },

  trackTierBadgeNFTMinted: (userId, tier, tokenId, contractAddress) => {
    trackEvent('tier_badge_nft_minted', { userId, tier, tokenId, contractAddress });
  },

  trackReferralTokensRewarded: (referrerId, refereeId, tokenAmount) => {
    trackEvent('referral_tokens_rewarded', { referrerId, refereeId, tokenAmount });
  },

  // VIP Experiences
  trackVipExperienceUnlocked: (userId, experienceId, tier) => {
    trackEvent('vip_experience_unlocked', { userId, experienceId, tier });
  },

  trackVipExperienceBooked: (userId, experienceId, bookingDate, tier) => {
    trackEvent('vip_experience_booked', { userId, experienceId, bookingDate, tier });
  },

  trackVipInvitationSent: (userId, experienceId, occasion) => {
    trackEvent('vip_invitation_sent', { userId, experienceId, occasion });
  },

  // AI Personal Stylist
  trackAIStylistSessionStarted: (userId, tier, sessionType) => {
    trackEvent('ai_stylist_session_started', { userId, tier, sessionType });
  },

  trackAIStylistRecommendationViewed: (userId, recommendationId, category, accepted) => {
    trackEvent('ai_stylist_recommendation_viewed', { userId, recommendationId, category, accepted });
  },

  trackAIStylistOutfitSaved: (userId, outfitId, items) => {
    trackEvent('ai_stylist_outfit_saved', { userId, outfitId, items });
  },

  trackStyleProfileRefreshed: (userId, dataSources) => {
    trackEvent('style_profile_refreshed', { userId, dataSources });
  },

  // Exclusive Drops
  trackExclusiveDropInterest: (userId, dropId, mechanism) => {
    trackEvent('exclusive_drop_interest', { userId, dropId, mechanism });
  },

  trackExclusiveDropAllowlistJoined: (userId, dropId, tier) => {
    trackEvent('exclusive_drop_allowlist_joined', { userId, dropId, tier });
  },

  trackExclusiveDropRaffleEntry: (userId, dropId, entries, tier) => {
    trackEvent('exclusive_drop_raffle_entry', { userId, dropId, entries, tier });
  },

  trackExclusiveDropPurchase: (userId, dropId, productId, mechanism, tier) => {
    trackEvent('exclusive_drop_purchase', { userId, dropId, productId, mechanism, tier });
  },

  trackExclusiveDropRarityRevealed: (dropId, rarityStats) => {
    trackEvent('exclusive_drop_rarity_revealed', { dropId, rarityStats });
  }
};

// Global trackEvent wrapper for loyalty events
window.LoyaltyAnalytics = LoyaltyAnalytics;

// ============================================================
// LOYALTY FUTURE HOOKS (Architecture for Crypto, VIP, AI, Drops)
// ============================================================

const LoyaltyFutureHooks = {
  // Configuration loaded from loyalty.json futureHooks
  config: null,

  async loadConfig() {
    try {
      const res = await fetch('/data/loyalty.json');
      const data = await res.json();
      this.config = data.futureHooks || {};
      console.log('[LoyaltyFutureHooks] Config loaded:', Object.keys(this.config));
    } catch (e) {
      console.warn('[LoyaltyFutureHooks] Config load failed:', e.message);
      this.config = {};
    }
  },

  // Check if a future feature is enabled
  isEnabled(feature) {
    return this.config[feature]?.enabled === true;
  },

  // Get tier-specific config for a feature
  getTierConfig(feature, tier) {
    const featureConfig = this.config[feature];
    if (!featureConfig) return null;
    if (featureConfig.tiers && !featureConfig.tiers.includes(tier)) return null;
    return featureConfig;
  },

  // ============================================================
  // CRYPTO REWARDS HOOKS
  // ============================================================
  
  // Called when user earns points - can mint loyalty tokens
  async onPointsEarned(user, points, source, amountRSD) {
    if (!this.isEnabled('cryptoRewards')) return;
    const tier = user.loyalty?.tier || 'member';
    // TODO: Integrate with wallet provider (MetaMask, WalletConnect)
    // await mintLoyaltyTokens(user.walletAddress, points, source);
    window.LoyaltyAnalytics?.trackCryptoRewardClaimed?.(user.id, points, 'LOYALTY', source);
  },

  // Called on tier upgrade - can airdrop tier badge NFT
  async onTierUpgrade(user, oldTier, newTier) {
    if (!this.isEnabled('cryptoRewards')) return;
    // TODO: Mint ERC-1155 tier badge NFT
    // await mintTierBadgeNFT(user.walletAddress, newTier);
    window.LoyaltyAnalytics?.trackTierBadgeNFTMinted?.(user.id, newTier, 'TBD', 'TBD');
  },

  // Called on referral completion
  async onReferralCompleted(referrer, referee) {
    if (!this.isEnabled('cryptoRewards')) return;
    // TODO: Reward referral tokens
    window.LoyaltyAnalytics?.trackReferralTokensRewarded?.(referrer.id, referee.id, 100);
  },

  // ============================================================
  // VIP EXPERIENCES HOOKS
  // ============================================================

  // Called on tier upgrade - unlock VIP experiences
  async onVipTierUpgrade(user, newTier) {
    if (!this.isEnabled('vipExperiences')) return;
    const experiences = this.getTierConfig('vipExperiences', newTier)?.types || [];
    experiences.forEach(exp => {
      window.LoyaltyAnalytics?.trackVipExperienceUnlocked?.(user.id, exp.id, newTier);
    });
  },

  // Called on member anniversary
  async onAnniversary(user) {
    if (!this.isEnabled('vipExperiences')) return;
    const tier = user.loyalty?.tier || 'member';
    if (['gold', 'black'].includes(tier)) {
      window.LoyaltyAnalytics?.trackVipInvitationSent?.(user.id, 'anniversary_experience', 'anniversary');
    }
  },

  // ============================================================
  // AI PERSONAL STYLIST HOOKS
  // ============================================================

  // Refresh style profile when user data changes
  async refreshStyleProfile(user) {
    if (!this.isEnabled('aiPersonalStylist')) return;
    const dataSources = ['purchase_history', 'wishlist', 'saved_sizes', 'style_preferences', 'browsing_behavior', 'returns_data'];
    // TODO: Call AI service to update user's style embedding
    window.LoyaltyAnalytics?.trackStyleProfileRefreshed?.(user.id, dataSources);
  },

  // Start AI stylist session
  async startStylistSession(user, sessionType) {
    if (!this.isEnabled('aiPersonalStylist')) return;
    const tier = user.loyalty?.tier || 'member';
    const features = this.getTierConfig('aiPersonalStylist', tier)?.features || {};
    // TODO: Initialize AI stylist with user's style profile
    window.LoyaltyAnalytics?.trackAIStylistSessionStarted?.(user.id, tier, sessionType);
    return { sessionId: 'session_' + Date.now(), features };
  },

  // ============================================================
  // EXCLUSIVE DROPS HOOKS
  // ============================================================

  // Check if user can access a drop mechanism
  canAccessDropMechanism(drop, user, mechanism) {
    if (!this.isEnabled('exclusiveDrops')) return false;
    const mechanics = this.config.exclusiveDrops?.mechanics?.[mechanism];
    if (!mechanics) return false;
    const tier = user.loyalty?.tier || 'member';
    return mechanics.tiers?.includes(tier) || false;
  },

  // Register interest for allowlist
  async registerDropInterest(user, dropId, mechanism) {
    if (!this.canAccessDropMechanism({ id: dropId }, user, mechanism)) return false;
    // TODO: Add to allowlist/raffle
    window.LoyaltyAnalytics?.trackExclusiveDropInterest?.(user.id, dropId, mechanism);
    if (mechanism === 'allowlist') {
      window.LoyaltyAnalytics?.trackExclusiveDropAllowlistJoined?.(user.id, dropId, user.loyalty?.tier);
    } else if (mechanism === 'raffle') {
      const entries = this.config.exclusiveDrops?.mechanics?.raffle?.entriesPerTier?.[user.loyalty?.tier] || 1;
      window.LoyaltyAnalytics?.trackExclusiveDropRaffleEntry?.(user.id, dropId, entries, user.loyalty?.tier);
    }
    return true;
  },

  // Process drop purchase
  async processDropPurchase(user, dropId, productId, mechanism) {
    if (!this.canAccessDropMechanism({ id: dropId }, user, mechanism)) return false;
    // TODO: Process purchase with maxPerCustomer limits
    window.LoyaltyAnalytics?.trackExclusiveDropPurchase?.(user.id, dropId, productId, mechanism, user.loyalty?.tier);
    return true;
  },

  // Initialize all hooks (call on app init)
  async init() {
    await this.loadConfig();
    
    // Subscribe to loyalty events
    state.user.subscribe((user) => {
      if (!user) return;
      
      // Check for tier upgrades (would need previous state comparison)
      // This is a simplified version - in production compare with stored previous tier
    });
    
    console.log('[LoyaltyFutureHooks] Initialized with features:', Object.keys(this.config).filter(k => this.config[k]?.enabled));
  }
};

window.LoyaltyFutureHooks = LoyaltyFutureHooks;

// Auto-init LoyaltyFutureHooks
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await LoyaltyFutureHooks.loadConfig();
    LoyaltyFutureHooks.init?.();
  });
} else {
  LoyaltyFutureHooks.loadConfig().then(() => LoyaltyFutureHooks.init?.());
}

// ============================================================
// LOYALTY HOOKS INTEGRATION
// Call future hooks from loyalty events
// ============================================================

// Override/update the tier upgrade logic to call future hooks
const originalUpdateLoyaltyAfterPurchase = (() => {
  // We'll integrate hooks where tier upgrades happen
})();

// Export for use in order completion
window.LoyaltyFutureHooksIntegration = {
  // Call when points are earned
  async onPointsEarned(user, points, source, amountRSD) {
    await LoyaltyFutureHooks.onPointsEarned?.(user, points, source, amountRSD);
  },
  
  // Call when tier upgrades
  async onTierUpgrade(user, oldTier, newTier) {
    await LoyaltyFutureHooks.onTierUpgrade?.(user, oldTier, newTier);
    await LoyaltyFutureHooks.onVipTierUpgrade?.(user, newTier);
  },
  
  // Call when referral completes
  async onReferralCompleted(referrer, referee) {
    await LoyaltyFutureHooks.onReferralCompleted?.(referrer, referee);
  },
  
  // Call on member anniversary
  async onAnniversary(user) {
    await LoyaltyFutureHooks.onAnniversary?.(user);
  }
};


// ============================================================
// ADDRESS MANAGEMENT
// ============================================================

const getAddresses = () => {
  const user = state.user.get();
  if (user?.savedAddresses?.length) {
    return user.savedAddresses;
  }
  return JSON.parse(safeGetItem('dalli_addresses') || '[]');
};

const saveAddresses = (addresses) => {
  const user = state.user.get();
  if (user) {
    const updatedUser = { ...user, savedAddresses: addresses };
    state.user.set(updatedUser);
    safeSetItem('dalli_user', JSON.stringify(updatedUser));
  } else {
    safeSetItem('dalli_addresses', JSON.stringify(addresses));
  }
}
  // Analytics: Track profile addresses saved

const addAddress = (address) => {
  const addresses = getAddresses();
  const newAddress = {
    id: 'addr_' + Date.now(),
    ...address,
    createdAt: new Date().toISOString()
  };
  
  // If this is default, remove default from others
  if (newAddress.isDefault) {
    addresses.forEach(a => a.isDefault = false);
  }
  
  // If first address, make it default
  if (addresses.length === 0) {
    newAddress.isDefault = true;
  }
  
  addresses.push(newAddress);
  saveAddresses(addresses);
  return newAddress;
};

const updateAddress = (addressId, updates) => {
  const addresses = getAddresses();
  const index = addresses.findIndex(a => a.id === addressId);
  if (index === -1) return null;
  
  // If setting as default, remove default from others
  if (updates.isDefault) {
    addresses.forEach(a => a.isDefault = false);
  }
  
  addresses[index] = { ...addresses[index], ...updates };
  saveAddresses(addresses);
  return addresses[index];
};

const deleteAddress = (addressId) => {
  const addresses = getAddresses();
  const filtered = addresses.filter(a => a.id !== addressId);
  const deleted = addresses.find(a => a.id === addressId);
  const wasDefault = deleted?.isDefault;
  
  // If deleted was default, make first remaining default
  if (wasDefault && filtered.length > 0) {
    filtered[0].isDefault = true;
  }
  
  saveAddresses(filtered);
  return wasDefault;
};

const getDefaultAddress = (type = 'shipping') => {
  const addresses = getAddresses();
  return addresses.find(a => a.isDefault && (a.type === type || a.type === 'both')) || addresses[0];
};

// Render addresses in settings page
const renderAddresses = () => {
  const addressesList = $('#addressesList');
  const addressesEmpty = $('#addressesEmpty');
  if (!addressesList) return;
  
  const addresses = getAddresses();
  
  if (addresses.length === 0) {
    addressesList.classList.add('hidden');
    if (addressesEmpty) addressesEmpty.classList.remove('hidden');
    return;
  }
  
  if (addressesEmpty) addressesEmpty.classList.add('hidden');
  addressesList.classList.remove('hidden');
  
  addressesList.innerHTML = addresses.map(addr => `
    <article class="address-card" data-address-id="${addr.id}" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: var(--space-5); position: relative; ${addr.isDefault ? 'border-color: var(--color-primary);' : ''}">
      ${addr.isDefault ? '<span class="address-badge" style="position: absolute; top: var(--space-3); right: var(--space-3); background: var(--color-primary); color: white; padding: var(--space-1) var(--space-2); border-radius: var(--radius-btn); font-size: var(--fs-xs); font-weight: var(--fw-semibold);">${t("addresses.default")}</span>' : ''}
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
        <div>
          <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
            <span style="font-weight: var(--fw-semibold);">${addr.name}</span>
            <span style="background: var(--color-bg); color: var(--color-text-secondary); padding: var(--space-1) var(--space-2); border-radius: var(--radius-btn); font-size: var(--fs-xs); text-transform: capitalize;">${addr.type}</span>
          </div>
          <div style="color: var(--color-text-secondary); font-size: var(--fs-sm); line-height: 1.6;">
            ${addr.firstName} ${addr.lastName}<br>
            ${addr.street}<br>
            ${addr.postalCode} ${addr.city}, ${addr.country === 'RS' ? 'Srbija' : addr.country}<br>
            Tel: ${addr.phone}
            ${addr.instructions ? `<br><em style="color: var(--color-text-tertiary);">Napomena: ${addr.instructions}</em>` : ''}
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          <button class="btn btn-ghost btn-sm" data-action="edit-address" data-address-id="${addr.id}" style="font-size: var(--fs-xs);">Izmeni</button>
          <button class="btn btn-danger btn-sm" data-action="delete-address" data-address-id="${addr.id}" style="font-size: var(--fs-xs);">Obriši</button>
          ${!addr.isDefault ? `<button class="btn btn-outline btn-sm" data-action="set-default-address" data-address-id="${addr.id}" data-type="${addr.type}" style="font-size: var(--fs-xs);">${t('addresses.setDefaultBtn')}</button>` : ''}
        </div>
      </div>
    </article>
  `).join('');
  
  // Event listeners
  $$('#addressesList [data-action="edit-address"]').forEach(btn => {
    btn.addEventListener('click', (e) => openAddressModal(e.currentTarget.dataset.addressId));
  });
  
  $$('#addressesList [data-action="delete-address"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm(t('addresses.confirmDelete'))) {
        deleteAddress(e.currentTarget.dataset.addressId);
        renderAddresses();
        showToast(t('addresses.deleted'), 'success');
      }
    });
  });
  
  $$('#addressesList [data-action="set-default-address"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.addressId;
      const type = e.currentTarget.dataset.type;
      updateAddress(id, { isDefault: true });
      renderAddresses();
      showToast(t('addresses.setDefault'), 'success');
    });
  });
};

// Address Modal
const openAddressModal = (addressId = null) => {
  const modal = $('#addressModal');
  const form = $('#addressForm');
  const title = $('#addressModalTitle');
  
  if (!modal || !form) return;
  
  form.reset();
  $('#addressId').value = '';
  
  if (addressId) {
    const addresses = getAddresses();
    const addr = addresses.find(a => a.id === addressId);
    if (!addr) return;
    
    title.textContent = 'Izmeni adresu';
    $('#addressId').value = addr.id;
    $('#addressType').value = addr.type;
    $('#addressName').value = addr.name;
    $('#addressFirstName').value = addr.firstName;
    $('#addressLastName').value = addr.lastName;
    $('#addressPhone').value = addr.phone;
    $('#addressStreet').value = addr.street;
    $('#addressCity').value = addr.city;
    $('#addressPostalCode').value = addr.postalCode;
    $('#addressCountry').value = addr.country;
    $('#addressInstructions').value = addr.instructions || '';
    $('#addressDefault').checked = addr.isDefault || false;
  } else {
    title.textContent = 'Dodaj adresu';
    // Pre-fill with user data if available
    const user = state.user.get();
    if (user) {
      $('#addressFirstName').value = user.firstName || '';
      $('#addressLastName').value = user.lastName || '';
      $('#addressPhone').value = user.phone || '';
    }
  }
  
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

const closeAddressModal = () => {
  const modal = $('#addressModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

// Address form submit
$('#addressForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const addressId = formData.get('addressId');
  
  const address = {
    type: formData.get('addressType'),
    name: formData.get('addressName'),
    firstName: formData.get('addressFirstName'),
    lastName: formData.get('addressLastName'),
    phone: formData.get('addressPhone'),
    street: formData.get('addressStreet'),
    city: formData.get('addressCity'),
    postalCode: formData.get('addressPostalCode'),
    country: formData.get('addressCountry'),
    instructions: formData.get('addressInstructions'),
    isDefault: formData.get('addressDefault') === 'on'
  };
  
  if (addressId) {
    updateAddress(addressId, address);
    showToast(t('addresses.updated'), 'success');
  } else {
    addAddress(address);
    showToast(t('addresses.added'), 'success');
  }
  
  closeAddressModal();
  renderAddresses();
});

// ============================================================
// SIZE MANAGEMENT
// ============================================================

const getSizes = () => {
  const user = state.user.get();
  if (user?.savedSizes && Object.keys(user.savedSizes).length) {
    return user.savedSizes;
  }
  return JSON.parse(safeGetItem('dalli_sizes') || '{}');
};

const saveSizes = (sizes) => {
  const user = state.user.get();
  if (user) {
    const updatedUser = { ...user, savedSizes: sizes };
    state.user.set(updatedUser);
    safeSetItem('dalli_user', JSON.stringify(updatedUser));
  } else {
    safeSetItem('dalli_sizes', JSON.stringify(sizes));
  }
}
  // Analytics: Track profile sizes saved
  const categories = Object.keys(sizes);
  window.LoyaltyAnalytics?.trackProfileSizesSaved?.(categories);;

const addSize = (category, sizeValue, fit = 'regular', isDefault = false) => {
  const sizes = getSizes();
  
  if (!sizes[category]) {
    sizes[category] = [];
  }
  
  // Remove existing same size
  sizes[category] = sizes[category].filter(s => s.value !== sizeValue);
  
  // If setting as default, remove default from others in category
  if (isDefault) {
    sizes[category].forEach(s => s.isDefault = false);
  }
  
  // If first size in category, make it default
  if (sizes[category].length === 0) {
    isDefault = true;
  }
  
  sizes[category].unshift({
    id: 'sz_' + Date.now(),
    value: sizeValue,
    fit,
    isDefault,
    createdAt: new Date().toISOString()
  });
  
  saveSizes(sizes);
  return sizes[category][0];
};

const updateSize = (category, sizeId, updates) => {
  const sizes = getSizes();
  if (!sizes[category]) return null;
  
  const index = sizes[category].findIndex(s => s.id === sizeId);
  if (index === -1) return null;
  
  // If setting as default, remove default from others
  if (updates.isDefault) {
    sizes[category].forEach(s => s.isDefault = false);
  }
  
  sizes[category][index] = { ...sizes[category][index], ...updates };
  saveSizes(sizes);
  return sizes[category][index];
};

const deleteSize = (category, sizeId) => {
  const sizes = getSizes();
  if (!sizes[category]) return false;
  
  const wasDefault = sizes[category].find(s => s.id === sizeId)?.isDefault;
  sizes[category] = sizes[category].filter(s => s.id !== sizeId);
  
  // If deleted was default, make first remaining default
  if (wasDefault && sizes[category].length > 0) {
    sizes[category][0].isDefault = true;
  }
  
  saveSizes(sizes);
  return true;
};

const getDefaultSize = (category) => {
  const sizes = getSizes();
  return sizes[category]?.find(s => s.isDefault) || sizes[category]?.[0];
};

// Render sizes in settings page
const renderSizes = () => {
  const sizesList = $('#sizesList');
  const sizesEmpty = $('#sizesEmpty');
  if (!sizesList) return;
  
  const sizes = getSizes();
  const categories = [
    { key: 'tops', label: 'Majice / Košulje / Trenerke' },
    { key: 'bottoms', label: 'Pantalone / Šorts' },
    { key: 'outerwear', label: 'Jakne / Duks' },
    { key: 'shoes', label: 'Obuća' }
  ];
  
  const hasSizes = Object.keys(sizes).some(cat => sizes[cat]?.length > 0);
  
  if (!hasSizes) {
    sizesList.classList.add('hidden');
    if (sizesEmpty) sizesEmpty.classList.remove('hidden');
    return;
  }
  
  if (sizesEmpty) sizesEmpty.classList.add('hidden');
  sizesList.classList.remove('hidden');
  
  sizesList.innerHTML = categories.map(cat => {
    const catSizes = sizes[cat.key] || [];
    if (catSizes.length === 0) return '';
    
    return `
      <div class="size-category" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); overflow: hidden;">
        <div style="padding: var(--space-4); background: var(--color-bg); border-bottom: 1px solid var(--color-divider); display: flex; justify-content: space-between; align-items: center;">
          <h4 style="font-weight: var(--fw-semibold);">${cat.label}</h4>
          <button class="btn btn-ghost btn-sm" data-action="add-size" data-category="${cat.key}" style="font-size: var(--fs-xs);">${t("sizes.add")}</button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-4);">
          ${catSizes.map(s => `
            <span class="size-chip ${s.isDefault ? 'default' : ''}" data-size-id="${s.id}" data-category="${cat.key}" style="display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: ${s.isDefault ? 'var(--color-primary-light)' : 'var(--color-bg)'}; border: 1px solid ${s.isDefault ? 'var(--color-primary)' : 'var(--color-border)'}; border-radius: var(--radius-btn); font-size: var(--fs-sm); font-weight: ${s.isDefault ? 'var(--fw-semibold)' : 'var(--fw-medium)'}; color: ${s.isDefault ? 'var(--color-primary)' : 'var(--color-text)'};">
              ${s.value}
              ${s.fit !== 'regular' ? `<span style="font-size: var(--fs-xs); text-transform: capitalize; opacity: 0.8;">(${s.fit})</span>` : ''}
              ${s.isDefault ? '<span style="font-size: var(--fs-xs);">✓</span>' : ''}
              <button class="size-chip__delete" data-action="delete-size" data-size-id="${s.id}" data-category="${cat.key}" aria-label="${t('notifications.delete')}" style="margin-left: var(--space-1); padding: 0; background: none; border: none; color: inherit; opacity: 0.5; cursor: pointer; line-height: 1;">×</button>
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Event listeners
  $$('#sizesList [data-action="add-size"]').forEach(btn => {
    btn.addEventListener('click', (e) => openSizeModal(e.currentTarget.dataset.category));
  });
  
  $$('#sizesList [data-action="delete-size"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(t('sizes.confirmDelete'))) {
        deleteSize(e.currentTarget.dataset.category, e.currentTarget.dataset.sizeId);
        renderSizes();
        showToast(t('sizes.deleted'), 'success');
      }
    });
  });
  
  // Click on size chip to set as default
  $$('#sizesList .size-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      if (e.target.classList.contains('size-chip__delete')) return;
      const sizeId = chip.dataset.sizeId;
      const category = chip.dataset.category;
      updateSize(category, sizeId, { isDefault: true });
      renderSizes();
      showToast(t('sizes.setDefault'), 'success');
    });
  });
};

// Size Modal
const openSizeModal = (category = null) => {
  const modal = $('#sizeModal');
  const form = $('#sizeForm');
  const title = $('#sizeModalTitle');
  
  if (!modal || !form) return;
  
  form.reset();
  $('#sizeCategory').value = '';
  
  if (category) {
    title.textContent = 'Dodaj veličinu';
    $('#sizeCategory').value = category;
    $('#sizeCategorySelect').value = category;
    $('#sizeCategorySelect').disabled = true;
  } else {
    title.textContent = 'Dodaj veličinu';
    $('#sizeCategorySelect').disabled = false;
  }
  
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

const closeSizeModal = () => {
  const modal = $('#sizeModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    $('#sizeCategorySelect').disabled = false;
  }
};

// Size form submit
$('#sizeForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const category = formData.get('sizeCategorySelect');
  const value = formData.get('sizeValue');
  const fit = formData.get('sizeFit');
  const isDefault = formData.get('sizeDefault') === 'on';
  
  addSize(category, value, fit, isDefault);
  closeSizeModal();
  renderSizes();
  showToast(t('sizes.saved'), 'success');
});

// ============================================================
// SETTINGS PAGE INIT
// ============================================================

const initSettingsPage = () => {
  if (!window.location.pathname.includes('settings.html')) return;
  
  // Tab switching
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      $$('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      $$('.tab-panel').forEach(p => p.classList.add('hidden'));
      
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      $('#tab-' + tab)?.classList.remove('hidden');
      
      // Render tab content
      if (tab === 'addresses') renderAddresses();
      else if (tab === 'sizes') renderSizes();
      else if (tab === 'preferences') renderPreferences();
      else if (tab === 'notifications') renderNotificationPrefs();
    });
  });
  
  // Add address button
  $$('[data-action="add-address"]').forEach(btn => {
    btn.addEventListener('click', () => openAddressModal());
  });
  
  // Close modal handlers
  $$('#addressModal [data-action="close-modal"], #sizeModal [data-action="close-modal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAddressModal();
      closeSizeModal();
    });
  });
  
  // Close modal on backdrop click
  $$('#addressModal .modal__backdrop, #sizeModal .modal__backdrop').forEach(bg => {
    bg.addEventListener('click', () => {
      closeAddressModal();
      closeSizeModal();
    });
  });
  
  // Initial render of first tab
  renderAddresses();
  
  // Load preferences
  loadPreferences();
};

// Preferences rendering
const renderPreferences = () => {
  const user = state.user.get();
  if (!user) return;
  
  const categories = [
    { key: 'majice', label: 'Majice' },
    { key: 'trenerke', label: 'Trenerke' },
    { key: 'dukseri', label: 'Duksevi' },
    { key: 'ostalo', label: 'Ostalo' }
  ];
  
  const styles = [
    { key: 'casual', label: 'Casual' },
    { key: 'minimalist', label: 'Minimalist' },
    { key: 'streetwear', label: 'Streetwear' },
    { key: 'classic', label: 'Classic' },
    { key: 'sporty', label: 'Sporty' }
  ];
  
  // Category preferences
  const categoryPrefs = $('#categoryPrefs');
  if (categoryPrefs) {
    const userCats = user.preferences?.categories || [];
    categoryPrefs.innerHTML = categories.map(cat => `
      <label style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); cursor: pointer; border: 1px solid var(--color-border);">
        <input type="checkbox" value="${cat.key}" ${userCats.includes(cat.key) ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-primary);" onchange="updateCategoryPrefs()">
        <span style="font-size: var(--fs-sm);">${cat.label}</span>
      </label>
    `).join('');
  }
  
  // Style preferences
  const stylePrefs = $('#stylePrefs');
  if (stylePrefs) {
    const userStyles = user.preferences?.styles || [];
    stylePrefs.innerHTML = styles.map(style => `
      <label style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); cursor: pointer; border: 1px solid var(--color-border);">
        <input type="checkbox" value="${style.key}" ${userStyles.includes(style.key) ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-primary);" onchange="updateStylePrefs()">
        <span style="font-size: var(--fs-sm);">${style.label}</span>
      </label>
    `).join('');
  }
  
  // Communication prefs
  $('#prefNewsletter')?.addEventListener('change', (e) => updateCommunicationPref('newsletter', e.target.checked));
  $('#prefSms')?.addEventListener('change', (e) => updateCommunicationPref('sms', e.target.checked));
  
  // Personalization prefs
  const personalizationPrefs = $('#personalizationPrefs');
  if (personalizationPrefs) {
    const pers = user.preferences?.personalization || {
      enabled: true,
      trackViews: true,
      trackWishlist: true,
      trackPurchases: true,
      trackCategories: true,
      shareDataForRecommendations: true
    };
    personalizationPrefs.innerHTML = `
      <div style="margin-bottom: var(--space-4);">
        <label style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); cursor: pointer; border: 1px solid var(--color-border);">
          <input type="checkbox" id="prefPersonalizationEnabled" ${pers.enabled ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--color-primary);">
          <div>
            <strong style="font-size: var(--fs-sm);">Omogući personalizaciju</strong>
            <div style="font-size: var(--fs-xs); color: var(--color-text-secondary); margin-top: var(--space-1);">Prikazuj preporuke na osnovu vašeg ponašanja</div>
          </div>
        </label>
      </div>
      <div style="display: grid; gap: var(--space-2); ${!pers.enabled ? 'opacity: 0.5; pointer-events: none;' : ''}">
        <label style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); cursor: pointer; border: 1px solid var(--color-border);">
          <input type="checkbox" value="trackViews" ${pers.trackViews ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-primary);" onchange="updatePersonalizationPref('trackViews', this.checked)">
          <span style="font-size: var(--fs-sm);">Prati pregledane proizvode</span>
        </label>
        <label style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); cursor: pointer; border: 1px solid var(--color-border);">
          <input type="checkbox" value="trackWishlist" ${pers.trackWishlist ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-primary);" onchange="updatePersonalizationPref('trackWishlist', this.checked)">
          <span style="font-size: var(--fs-sm);">Prati listu želja</span>
        </label>
        <label style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); cursor: pointer; border: 1px solid var(--color-border);">
          <input type="checkbox" value="trackPurchases" ${pers.trackPurchases ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-primary);" onchange="updatePersonalizationPref('trackPurchases', this.checked)">
          <span style="font-size: var(--fs-sm);">Prati kupovine</span>
        </label>
        <label style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); cursor: pointer; border: 1px solid var(--color-border);">
          <input type="checkbox" value="trackCategories" ${pers.trackCategories ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-primary);" onchange="updatePersonalizationPref('trackCategories', this.checked)">
          <span style="font-size: var(--fs-sm);">Prati interesovanja po kategorijama</span>
        </label>
        <label style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); cursor: pointer; border: 1px solid var(--color-border);">
          <input type="checkbox" value="shareDataForRecommendations" ${pers.shareDataForRecommendations ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-primary);" onchange="updatePersonalizationPref('shareDataForRecommendations', this.checked)">
          <span style="font-size: var(--fs-sm);">Dozvoli korišćenje podataka za preporuke</span>
        </label>
      </div>
    `;
    
    // Add master toggle listener
    $('#prefPersonalizationEnabled')?.addEventListener('change', (e) => {
      updatePersonalizationPref('enabled', e.target.checked);
      // Re-render to update disabled state of sub-options
      renderPreferences();
    });
  }
  
  // Set initial values
  if (user.preferences?.newsletter !== undefined) $('#prefNewsletter').checked = user.preferences.newsletter;
  if (user.preferences?.sms !== undefined) $('#prefSms').checked = user.preferences.sms;
};

window.updateCategoryPrefs = () => {
  const user = state.user.get();
  if (!user) return;
  const checked = $$('#categoryPrefs input:checked').map(c => c.value);
  const updatedUser = { ...user, preferences: { ...user.preferences, categories: checked } };
  state.user.set(updatedUser);
  safeSetItem('dalli_user', JSON.stringify(updatedUser));
}
  // Analytics: Track preferences updated
  window.LoyaltyAnalytics?.trackPreferencesUpdated?.({ categories: checked });;

window.updateStylePrefs = () => {
  const user = state.user.get();
  if (!user) return;
  const checked = $$('#stylePrefs input:checked').map(c => c.value);
  const updatedUser = { ...user, preferences: { ...user.preferences, styles: checked } };
  state.user.set(updatedUser);
  safeSetItem('dalli_user', JSON.stringify(updatedUser));
}
  // Analytics: Track preferences updated
  window.LoyaltyAnalytics?.trackPreferencesUpdated?.({ styles: checked });;

const updateCommunicationPref = (key, value) => {
  const user = state.user.get();
  if (!user) return;
  const updatedUser = { ...user, preferences: { ...user.preferences, [key]: value } };
  state.user.set(updatedUser);
  safeSetItem('dalli_user', JSON.stringify(updatedUser));
}
  // Analytics: Track preferences updated
  window.LoyaltyAnalytics?.trackPreferencesUpdated?.({ [key]: value });;

const updatePersonalizationPref = (key, value) => {
  const user = state.user.get();
  if (!user) return;
  const personalization = { ...user.preferences?.personalization, [key]: value };
  // If master toggle is off, disable all sub-options
  // Analytics: Track preferences updated
  window.LoyaltyAnalytics?.trackPreferencesUpdated?.({ personalization: { [key]: value } });
  if (key === 'enabled' && value === false) {
    personalization.trackViews = false;
    personalization.trackWishlist = false;
    personalization.trackPurchases = false;
    personalization.trackCategories = false;
    personalization.shareDataForRecommendations = false;
  }
  const updatedUser = { ...user, preferences: { ...user.preferences, personalization } };
  state.user.set(updatedUser);
  safeSetItem('dalli_user', JSON.stringify(updatedUser));
};

window.updatePersonalizationPref = updatePersonalizationPref;

// Notification preferences rendering
const renderNotificationPrefs = () => {
  const notificationPrefs = $('#notificationPrefs');
  if (!notificationPrefs) return;
  
  const user = state.user.get();
  const notifs = user?.notifications || {
    backInStock: true,
    priceDrop: true,
    newCollection: true,
    memberAnnouncement: true,
    tierUpgrade: true,
    pointsExpiring: true,
    birthday: true
  };
  
  const notificationOptions = [
    { key: 'backInStock', label: 'Povratak na stanje', desc: 'Obaveštite me kada proizvod vrati na stanje' },
    { key: 'priceDrop', label: 'Pad cene', desc: 'Obaveštite me kada cena padne' },
    { key: 'newCollection', label: 'Nova kolekcija', desc: 'Obaveštite me o novim kolekcijama' },
    { key: 'memberAnnouncement', label: 'Članarske najave', desc: 'Ekskluzivne najave samo za članove' },
    { key: 'tierUpgrade', label: 'Penjanje nivoa', desc: 'Čestitka pri penjanju nivoa lojalnosti' },
    { key: 'pointsExpiring', label: 'Poeni ističu', desc: 'Podsetnik 30 dana pre isteka poena' },
    { key: 'birthday', label: 'Rođendan', desc: 'Specijalna ponuda za rođendan' }
  ];
  
  notificationPrefs.innerHTML = notificationOptions.map(n => `
    <label style="display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); cursor: pointer;">
      <input type="checkbox" data-notif-key="${n.key}" ${notifs[n.key] ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--color-primary); margin-top: 2px; flex-shrink: 0;" onchange="updateNotificationPref('${n.key}', this.checked)">
      <div>
        <div style="font-weight: var(--fw-medium);">${n.label}</div>
        <div style="font-size: var(--fs-xs); color: var(--color-text-secondary);">${n.desc}</div>
      </div>
    </label>
  `).join('');
};

window.updateNotificationPref = (key, value) => {
  const user = state.user.get();
  if (!user) return;
  const updatedUser = { 
    ...user, 
    notifications: { ...user.notifications, [key]: value } 
  };
  state.user.set(updatedUser);
  safeSetItem('dalli_user', JSON.stringify(updatedUser));
}
  // Analytics: Track notification subscription changes
  if (value) {
    window.LoyaltyAnalytics?.trackNotificationSubscribe?.(key);
  };

// Load preferences from user
const loadPreferences = () => {
  const user = state.user.get();
  if (user) {
    // Notification prefs will be loaded when tab is clicked
  }
};

// Initialize settings page on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}

// Auth form handlers
$('#loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#loginEmail').value;
  const password = $('#loginPassword').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Prijavljivanje...';
  try {
    await loginUser(email, password);
    e.target.reset();
  } catch (err) {
    showToast(t('auth.invalidCredentials'), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Prijavi se';
  }
});

$('#registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    firstName: $('#regFirstName').value,
    lastName: $('#regLastName').value,
    username: $('#regUsername').value,
    email: $('#regEmail').value,
    phone: $('#regPhone').value,
    password: $('#regPassword').value,
    confirmPassword: $('#regConfirmPassword').value
  };
  if (data.password !== data.confirmPassword) {
    showToast(t('auth.passwordsMismatch'), 'error');
    return;
  }
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Registracija...';
  try {
    await registerUser(data);
    e.target.reset();
  } catch (err) {
    showToast(t('auth.registerError'), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Registruj se';
  }
});

// Password toggle
window.togglePassword = (inputId, btn) => {
  const input = document.getElementById(inputId);
  if (!input) return;
  const type = input.type === 'password' ? 'text' : 'password';
  input.type = type;
  btn.setAttribute('aria-pressed', type === 'text');
  btn.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '🙈';
};

window.openAuthModal = (mode) => {
  switchAuthMode(mode);
  openModal('auth');
};

window.closeModal = (name) => closeModal(name);

window.saveProfile = () => {
  // TODO: Save profile to API
  showToast(t('profile.saved'), 'success');
};

window.goToCheckout = () => {
  closeAllDrawers();
  window.location.href = '/checkout.html';
};

// ============================================================
// CHECKOUT — Multi-Step Luxury Experience
// ============================================================
const Checkout = (() => {
  let currentStep = 1;
  const totalSteps = 4;
  const formData = {};
  
  const init = () => {
    // Only run on checkout page
    if (!document.getElementById('checkoutForm')) return;
    
    bindEvents();
    loadCartSummary();
    updateProgress();
    
    // Analytics: begin_checkout
    trackEvent('begin_checkout', { 
      currency: 'RSD',
      value: getCartTotal(),
      items: getCartItemsForAnalytics()
    });
  };
    
    // Track abandoned cart - if user leaves checkout without completing
    let checkoutAbandonedTimer = null;
    const startAbandonedTimer = () => {
      clearTimeout(checkoutAbandonedTimer);
      checkoutAbandonedTimer = setTimeout(() => {
        const cart = state.cart.get();
        if (cart.length > 0 && !window.location.href.includes('/checkout.html')) {
          // User left checkout page with items in cart
          window.EmailService?.triggerAbandonedCart?.(cart);
        }
      }, 30 * 60 * 1000); // 30 minutes
    };
    
    // Start timer on page unload
    window.addEventListener('beforeunload', startAbandonedTimer);
    // Clear timer if order completes (handled in placeOrder)
    window.clearCheckoutAbandonedTimer = () => clearTimeout(checkoutAbandonedTimer);
  
  const bindEvents = () => {
    // Step navigation
    $$('[data-action="next-step"]').forEach(btn => {
      btn.addEventListener('click', () => validateAndNext());
    });
    $$('[data-action="prev-step"]').forEach(btn => {
      btn.addEventListener('click', () => prevStep());
    });
    
    // Payment method selection
    $$('.payment-option input[name="paymentMethod"]').forEach(input => {
      input.addEventListener('change', handlePaymentChange);
    });
    
    // Form submission
    $('#checkoutForm')?.addEventListener('submit', handleSubmit);
    
    // Promo code
    $('#applyPromo')?.addEventListener('click', applyPromoCode);
    
    // Real-time review update
    $('#checkoutForm')?.addEventListener('input', debounce(updateReviewStep, 300));
    $('#checkoutForm')?.addEventListener('change', updateReviewStep);
  };
  
  const validateAndNext = () => {
    const stepEl = $(`.checkout-step[data-step="${currentStep}"]`);
    if (!stepEl) return;
    
    const inputs = stepEl.querySelectorAll('input[required], select[required], textarea[required]');
    let valid = true;
    
    inputs.forEach(input => {
      if (!input.checkValidity()) {
        input.reportValidity();
        valid = false;
      }
    });
    
    if (valid) {
      saveStepData();
      nextStep();
    }
  };
  
  const saveStepData = () => {
    const stepEl = $(`.checkout-step[data-step="${currentStep}"]`);
    if (!stepEl) return;
    
    const inputs = stepEl.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.name) formData[input.name] = input.value;
    });
    
    // Special handling for payment method
    const paymentMethod = stepEl.querySelector('input[name="paymentMethod"]:checked');
    if (paymentMethod) formData.paymentMethod = paymentMethod.value;
  };
  
  const nextStep = () => {
    if (currentStep < totalSteps) {
      currentStep++;
      showStep(currentStep);
      updateProgress();
      updateReviewStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
      updateProgress();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const showStep = (step) => {
    $$('.checkout-step').forEach(el => el.classList.remove('active'));
    $(`.checkout-step[data-step="${step}"]`)?.classList.add('active');
    
    // Update progress indicator
    $$('.checkout-progress__step').forEach((el, i) => {
      el.classList.toggle('active', i + 1 <= step);
    });
    
    // Show/hide prev button
    $$('[data-action="prev-step"]').forEach(btn => {
      btn.style.display = step === 1 ? 'none' : 'inline-flex';
    });
    
    // Update next/submit button text
    const nextBtn = $(`[data-action="next-step"]`);
    if (nextBtn) {
      nextBtn.textContent = step === totalSteps ? 'Potvrdite porudžbinu' : 'Nastavite';
    }
  };
  
  const updateProgress = () => {
    $$('.checkout-progress__step').forEach((el, i) => {
      el.classList.toggle('active', i + 1 <= currentStep);
    });
  };
  
  const handlePaymentChange = (e) => {
    const method = e.target.value;
    
    // Show/hide card fields
    $$('.payment-fields').forEach(field => field.classList.add('hidden'));
    $(`#${method}Fields`)?.classList.remove('hidden');
    
    formData.paymentMethod = method;
    
    // Analytics
    trackEvent('add_payment_info', { payment_method: method });
    updateReviewStep();
  };
  
  const updateReviewStep = () => {
    // Customer info
    const fullNameEl = $('#reviewCustomer [data-field="fullName"]');
    const emailEl = $('#reviewCustomer [data-field="email"]');
    const phoneEl = $('#reviewCustomer [data-field="phone"]');
    if (fullNameEl) fullNameEl.textContent = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || '—';
    if (emailEl) emailEl.textContent = formData.email || '—';
    if (phoneEl) phoneEl.textContent = formData.phone || '—';
    
    // Shipping address
    const addressParts = [
      formData.address,
      formData.postalCode,
      formData.city,
      formData.country
    ].filter(Boolean);
    const fullAddressEl = $('#reviewShipping [data-field="fullAddress"]');
    if (fullAddressEl) fullAddressEl.textContent = addressParts.join(', ') || '—';
    
    // Payment method
    const paymentLabels = {
      'cod': 'Plaćanje pri preuzimanju',
      'bank-transfer': 'Bankovni prenos',
      'card': 'Kreditna / Debitna kartica',
      'crypto': 'Kripto plaćanje'
    };
    const paymentMethodEl = $('#reviewPayment [data-field="paymentMethod"]');
    if (paymentMethodEl) paymentMethodEl.textContent = paymentLabels[formData.paymentMethod] || '—';
    
    // Order items
    renderReviewItems();
  };
  
  const renderReviewItems = () => {
    const container = $('#reviewItems');
    const cart = state.cart.get();
    if (!container || !cart.length) return;
    
    container.innerHTML = cart.map(item => `
      <div class="review-item-row" role="listitem">
        <div>
          <div class="review-item-row__name">${item.name}</div>
          <div class="review-item-row__meta">${item.color || ''} ${item.size ? `• ${item.size}` : ''} • x${item.qty}</div>
        </div>
        <div class="review-item-row__price">${(item.price * item.qty).I18n.formatNumber} RSD</div>
      </div>
    `).join('');
  };
  
  const loadCartSummary = () => {
    renderSummarySidebar();
    renderCartPageItems();
  };
  
  const renderSummarySidebar = () => {
    const cart = state.cart.get();
    const container = $('#summaryItems');
    if (!container) return;
    
    if (!cart.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-4);">Korpa je prazna</p>';
      return;
    }
    
    container.innerHTML = cart.map(item => `
      <div class="summary-item" role="listitem" data-variant="${item.variantId}">
        <img src="${item.image}" alt="${item.name}" class="summary-item__image" loading="lazy" width="64" height="80">
        <div class="summary-item__info">
          <span class="summary-item__name">${item.name}</span>
          <span class="summary-item__meta">${item.color || ''} ${item.size ? `• ${item.size}` : ''} × ${item.qty}</span>
        </div>
        <span class="summary-item__price">${(item.price * item.qty).I18n.formatNumber} RSD</span>
      </div>
    `).join('');
    
    updateSummaryTotals();
  };
  
  const renderCartPageItems = () => {
    const cart = state.cart.get();
    const container = $('#cartItems');
    if (!container) return;
    
    if (!cart.length) {
      $('#cartEmpty')?.classList.remove('hidden');
      $('#cartItems')?.classList.add('hidden');
      $('#cartSummary')?.classList.add('hidden');
      return;
    }
    
    $('#cartEmpty')?.classList.add('hidden');
    $('#cartItems')?.classList.remove('hidden');
    $('#cartSummary')?.classList.remove('hidden');
    
    // Use the same renderCartItems function
    if (typeof renderCartItems === 'function') renderCartItems();
  };
  
  const updateSummaryTotals = () => {
    const cart = state.cart.get();
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const user = state.user.get();
    const freeCryptoShipping = user?.cryptoWallet && isCryptoShippingFree();
    const shipping = subtotal >= 5000 || freeCryptoShipping ? 0 : 290;
    const cryptoDiscount = user?.cryptoWallet ? subtotal * getCryptoRate() : 0;
    const total = subtotal + shipping - cryptoDiscount;
    
    const subtotalEl = $('#summarySubtotal');
    const shippingEl = $('#summaryShipping');
    const totalEl = $('#summaryTotal');
    const itemCountEl = $('#summaryItemCount');
    if (subtotalEl) subtotalEl.textContent = t('cart.subtotal', { amount: subtotal.I18n.formatNumber });
    if (shippingEl) shippingEl.textContent = shipping === 0 ? t('cart.freeShipping') : t('cart.shippingCost', { amount: shipping.I18n.formatNumber });
    if (totalEl) totalEl.textContent = t('cart.total', { amount: total.I18n.formatNumber });
    if (itemCountEl) itemCountEl.textContent = itemCount;
    
    const discountRow = $('#summaryDiscountRow');
    const discountAmount = $('#summaryDiscount');
    if (discountRow && discountAmount) {
      if (cryptoDiscount > 0) {
        discountAmount.textContent = `-${cryptoDiscount.I18n.formatNumber} RSD`;
        discountRow.classList.remove('hidden');
      } else {
        discountRow.classList.add('hidden');
      }
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final validation
    const termsAccepted = $('#termsAccepted')?.checked;
    if (!termsAccepted) {
      showToast(t('auth.acceptTerms'), 'error');
      $('#termsAccepted')?.focus();
      return;
    }
    
    const btn = $('#placeOrderBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; margin-right: var(--space-2);"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg> Obrađujemo...';
    }
    
    try {
      const paymentMethod = formData.paymentMethod;
      const isCrypto = paymentMethod === 'crypto';
      
      // For crypto payments, we need to handle differently
      if (isCrypto) {
        // Get crypto details from form
        const cryptoCurrency = $('#cryptoCurrency')?.value;
        const cryptoAmountRSD = parseFloat($('#cryptoAmountRSDInput')?.value || '0');
        const cryptoAmountCrypto = parseFloat($('#cryptoAmountCryptoInput')?.value || '0');
        const cryptoExchangeRate = parseFloat($('#cryptoExchangeRateInput')?.value || '0');
        const cryptoWalletAddress = $('#cryptoWalletAddressInput')?.value;
        
        if (!cryptoCurrency || !cryptoAmountRSD || !cryptoExchangeRate) {
          showToast(t('checkout.selectCrypto'), 'error');
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Potvrdite porudžbinu';
          }
          return;
        }
        
        // Initiate crypto payment flow
        const cryptoPath = './modules/crypto-payment/CryptoPaymentLoader.js';
        const cryptoPaymentModule = await import(cryptoPath);
        const cryptoPayment = await cryptoPaymentModule.createCryptoPayment({
          orderNumber: 'DLL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(),
          totals: {
            subtotal: state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0),
            shipping: state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0) >= 5000 ? 0 : 290,
            discount: 0,
            total: (() => {
              const s = state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0);
              const sh = s >= 5000 ? 0 : 290;
              return s + sh;
            })()
          },
          items: state.cart.get().map(item => ({
            productId: item.id,
            variantId: item.variantId,
            name: item.name,
            color: item.color,
            size: item.size,
            qty: item.qty,
            price: item.price
          })),
          customer: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            marketingConsent: formData.marketingConsent || false
          },
          shipping: {
            address: formData.address,
            city: formData.city,
            postalCode: formData.postalCode,
            country: formData.country,
            instructions: formData.deliveryInstructions
          },
          paymentMethod: 'crypto',
          cryptoDetails: {
            currency: cryptoCurrency,
            amountRSD: cryptoAmountRSD,
            amountCrypto: parseFloat($('#cryptoAmountCryptoInput')?.value || '0'),
            exchangeRate: cryptoExchangeRate,
            walletAddress: $('#cryptoWalletAddress')?.textContent,
            cryptoWalletAddress: cryptoWalletAddress
          }
        });
        
        // Open crypto payment modal
        const result = await cryptoPayment.open();
        
        if (result.success) {
          // Payment confirmed, create order
          const orderData = {
            customer: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone,
              marketingConsent: formData.marketingConsent || false
            },
            shipping: {
              address: formData.address,
              city: formData.city,
              postalCode: formData.postalCode,
              country: formData.country,
              instructions: formData.deliveryInstructions
            },
            payment: {
              method: 'crypto',
              crypto: {
                currency: cryptoCurrency,
                amountRSD: cryptoAmountRSD,
                amountCrypto: parseFloat($('#cryptoAmountCryptoInput')?.value || '0'),
                exchangeRate: cryptoExchangeRate,
                walletAddress: $('#cryptoWalletAddress')?.textContent,
                transactionId: result.payment?.transactionId,
                confirmations: result.payment?.confirmations,
                confirmedAt: result.payment?.confirmedAt,
                discountApplied: true,
                discountRate: getCryptoRate(),
                discountAmountRSD: state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0) * getCryptoRate()
              }
            },
            items: state.cart.get().map(item => ({
              productId: item.id,
              variantId: item.variantId,
              name: item.name,
              color: item.color,
              size: item.size,
              qty: item.qty,
              price: item.price
            })),
            totals: {
              subtotal: state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0),
              shipping: state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0) >= 5000 ? 0 : 290,
              discount: state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0) * getCryptoRate(),
              total: (() => {
                const s = state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0);
                const sh = s >= 5000 ? 0 : 290;
                const d = s * getCryptoRate();
                return s + sh - d;
              })()
            },
            createdAt: new Date().toISOString(),
            orderNumber: 'DLL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(),
            paymentMethod: 'crypto',
            cryptoDetails: {
              currency: cryptoCurrency,
              amountRSD: cryptoAmountRSD,
              amountCrypto: parseFloat($('#cryptoAmountCryptoInput')?.value || '0'),
              exchangeRate: cryptoExchangeRate,
              walletAddress: $('#cryptoWalletAddress')?.textContent,
              transactionId: result.payment?.transactionId,
              confirmations: result.payment?.confirmations,
              confirmedAt: result.payment?.confirmedAt,
              discountApplied: true,
              discountRate: getCryptoRate(),
              discountAmountRSD: state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0) * getCryptoRate()
            }
}
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Save order to localStorage (orders history)
          const orders = JSON.parse(localStorage.getItem('dalli_orders') || '[]');
          orders.unshift(orderData);
          safeSetItem('dalli_orders', JSON.stringify(orders.slice(0, 50)));
          
          // Clear cart
          state.cart.set([]);
          localStorage.removeItem('dalli_cart');
          recalcCart();
          
// Analytics: purchase
      trackEvent('purchase', {
        transaction_id: orderData.orderNumber,
        value: orderData.totals.total,
        currency: 'RSD',
        payment_method: formData.paymentMethod,
        items: orderData.items.map(item => ({
          item_id: item.variantId,
          item_name: item.name,
          price: item.price,
          quantity: item.qty
        }))
      });
      
// Clear abandoned cart timer since order completed
      window.clearCheckoutAbandonedTimer?.();

// Update loyalty after successful purchase
      const user = state.user.get();
      if (user && user.loyalty) {
        const orderTotal = orderData.totals.total;
        const earnedPoints = Math.floor(orderData.totals.total / 100);
        const newTotalSpent = user.loyalty.totalSpentRSD + orderData.totals.total;
        const newPoints = user.loyalty.points + Math.floor(orderData.totals.total / 100);
        const newOrdersCount = (user.loyalty.ordersCount || 0) + 1;
        
        // Check for tier upgrade
        const tiers = [
          { id: 'member', minSpent: 0, label: 'Član' },
          { id: 'silver', minSpent: 100000, label: 'Srebro' },
          { id: 'gold', minSpent: 500000, label: 'Zlato' },
          { id: 'black', minSpent: 1000000, label: 'Crno' }
        ];
        
        const newTier = tiers.find(t => t.minSpent <= newTotalSpent).slice(-1)[0];
        const tierUpgraded = newTier.id !== user.loyalty.tier;
        if (tierUpgraded) {
          showToast(`Čestitamo! Dostigli ste nivo ${t('loyalty.tier.' + newTier.id) || newTier.id}!`, 'success');
          window.LoyaltyAnalytics?.trackTierUpgraded?.(user.loyalty.tier, newTier.id, newTotalSpent);
        }
        
        // Future hooks: Call on tier upgrade
        window.LoyaltyFutureHooksIntegration?.onTierUpgrade?.(user, user.loyalty.tier, newTier.id);
        
        const updatedLoyalty = {
          ...user.loyalty,
          points: user.loyalty.points + Math.floor(orderData.totals.total / 100),
          totalSpentRSD: newTotalSpent,
          ordersCount: newOrdersCount,
          lastOrderAt: new Date().toISOString(),
          tier: newTier.id
        };
        
        const updatedUser = { ...user, loyalty: updatedLoyalty };
        state.user.set(updatedUser);
        safeSetItem('dalli_user', JSON.stringify(updatedUser));
        updateUserUI(updatedUser);
        
        // Loyalty analytics
        window.LoyaltyAnalytics?.trackPointsEarned?.(earnedPoints, 'purchase', orderTotal);
        window.LoyaltyAnalytics?.trackMemberPurchase?.(orderData, newTier.id, 0, earnedPoints);
        if (newOrdersCount > 1) {
          const daysSinceLastOrder = user.loyalty.lastOrderAt ? Math.floor((Date.now() - new Date(user.loyalty.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          window.LoyaltyAnalytics?.trackRepeatPurchase?.(updatedUser, newOrdersCount, daysSinceLastOrder);
        }
      }
      
      // Analytics: purchase
      
      // Email: Send order confirmation
      window.EmailService?.triggerOrderConfirmed?.(orderData);
      trackEvent('purchase', {
        transaction_id: orderData.orderNumber,
        value: orderData.totals.total,
        currency: 'RSD',
        payment_method: formData.paymentMethod,
        items: orderData.items.map(item => ({
          item_id: item.variantId,
          item_name: item.name,
          price: item.price,
          quantity: item.qty
        }))
      });
      
      // Track order placement for order history
      trackOrderPlacement(orderData);
      syncOrderToServer(orderData);
      
      // Show success
      showOrderSuccess(orderData.orderNumber);
      return;
        } else {
          // Payment cancelled or failed
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Potvrdite porudžbinu';
          }
          return;
        }
      }
      
      // Standard payment methods (cod, bank-transfer, card)
      const orderData = {
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          marketingConsent: formData.marketingConsent || false
        },
        shipping: {
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
          instructions: formData.deliveryInstructions
        },
        payment: {
          method: formData.paymentMethod,
          card: formData.paymentMethod === 'card' ? {
            last4: formData.cardNumber?.slice(-4),
            expiry: formData.cardExpiry,
            name: formData.cardName
          } : null
        },
        items: state.cart.get().map(item => ({
          productId: item.id,
          variantId: item.variantId,
          name: item.name,
          color: item.color,
          size: item.size,
          qty: item.qty,
          price: item.price
        })),
        totals: {
          subtotal: state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0),
          shipping: state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0) >= 5000 ? 0 : 290,
          discount: formData.paymentMethod === 'crypto' ? state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0) * getCryptoRate() : 0,
          total: (() => {
            const s = state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0);
            const sh = s >= 5000 ? 0 : 290;
            const d = formData.paymentMethod === 'crypto' ? s * getCryptoRate() : 0;
            return s + sh - d;
          })()
        },
        createdAt: new Date().toISOString(),
        orderNumber: 'DLL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Save order to localStorage (orders history)
      const orders = JSON.parse(localStorage.getItem('dalli_orders') || '[]');
      orders.unshift(orderData);
      safeSetItem('dalli_orders', JSON.stringify(orders.slice(0, 50)));
      
      // Clear cart
      state.cart.set([]);
      localStorage.removeItem('dalli_cart');
      recalcCart();
      
      // Analytics: purchase
      trackEvent('purchase', {
        transaction_id: orderData.orderNumber,
        value: orderData.totals.total,
        currency: 'RSD',
        payment_method: formData.paymentMethod,
        items: orderData.items.map(item => ({
          item_id: item.variantId,
          item_name: item.name,
          price: item.price,
          quantity: item.qty
        }))
      });
      
      // Track order placement for order history
      trackOrderPlacement(orderData);
      syncOrderToServer(orderData);
      
      // Show success
      showOrderSuccess(orderData.orderNumber);
      
    } catch (err) {
      console.error('Checkout error:', err);
      showToast(t('errors.generic'), 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Potvrdite porudžbinu';
      }
    }
  };
  
  const showOrderSuccess = (orderNumber) => {
    const formWrapper = $('.checkout-form-wrapper');
    if (!formWrapper) return;
    
    formWrapper.innerHTML = `
      <div class="order-success" style="text-align: center; padding: var(--space-12) var(--space-6);">
        <div class="order-success__icon" aria-hidden="true" style="width: 80px; height: 80px; margin: 0 auto var(--space-6); background: var(--color-success-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-success);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 class="order-success__title" style="font-family: var(--font-display); font-size: var(--text-h2); font-weight: 400; color: var(--color-charcoal); margin-bottom: var(--space-2);">Porudžbina potvrđena</h2>
        <p class="order-success__number" style="font-family: var(--font-display); font-size: var(--text-lg); color: var(--color-bronze); margin-bottom: var(--space-4); font-variant-numeric: tabular-nums;">${orderNumber}</p>
        <p class="order-success__desc" style="color: var(--color-stone-text); margin-bottom: var(--space-6); max-width: 400px; margin-left: auto; margin-right: auto;">Hvala vam na poverenju. Potvrda porudžbine je poslata na vaš email. Pratićete status isporuke putem SMS-a.</p>
        <div class="order-success__actions" style="display: flex; flex-direction: column; gap: var(--space-3); max-width: 300px; margin: 0 auto;">
          <a href="/proizvodi.html" class="btn btn-primary">Nastavite kupovinu</a>
          <a href="/nalog.html" class="btn btn-secondary">Pogledajte porudžbine</a>
        </div>
      </div>
    `;
    
    // Hide summary sidebar on mobile
    $('.checkout-summary')?.classList.add('hidden');
  };
  
  const applyPromoCode = () => {
    const code = $('#promoCode')?.value?.trim().toUpperCase();
    if (!code) return;
    
    // Mock promo validation
    const validCodes = { 'WELCOME10': 10, 'NEW15': 15, 'VIP20': 20 };
    if (validCodes[code]) {
      formData.promoCode = code;
      formData.promoDiscount = validCodes[code];
      showToast(`Promo kod "${code}" primenjen — ${validCodes[code]}% popust!`, 'success');
      updateSummaryTotals();
      updateReviewStep();
    } else {
      showToast(t('promo.invalid'), 'error');
    }
  };
  
  const getCartTotal = () => {
    return state.cart.get().reduce((sum, item) => sum + item.price * item.qty, 0);
  };
  
  const getCartItemsForAnalytics = () => {
    return state.cart.get().map(item => ({
      item_id: item.variantId,
      item_name: item.name,
      price: item.price,
      quantity: item.qty
    }));
  };
  
  // Debounce helper
  function debounce(fn, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  
  // Public API
  return { init };
})();

// Initialize checkout on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Checkout.init());
} else {
  Checkout.init();
}

// ============================================================
// CMS AUTOMATION ENGINE
// ============================================================
const CMS = (() => {
  let config = null;
  let searchIndex = [];
  let sitemapUrls = [];
  let initialized = false;

  const init = async () => {
    if (initialized) return;
    try {
      const res = await fetch('/data/products.json');
      if (!res.ok) throw new Error('Failed to load CMS config');
      const data = await res.json();
      config = data.cms || {};
      buildSearchIndex(data.products || []);
      buildSitemap(data.products || []);
      initialized = true;
      console.log('[CMS] Automation engine initialized');
    } catch (err) {
      console.error('[CMS] Init failed:', err);
    }
  };

  const buildSearchIndex = (products) => {
    if (!config?.searchIndex?.enabled) return;
    searchIndex = products
      .filter(p => p.cms?.status === 'published')
      .map(p => ({
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        category: p.category,
        gender: p.gender,
        shortDescription: p.shortDescription,
        colors: p.colors?.map(c => c.name) || [],
        sizes: p.sizes?.map(s => s.size) || [],
        searchKeywords: p.cms?.searchKeywords || [],
        price: p.price,
        featured: p.cms?.featured,
        bestseller: p.cms?.bestseller,
        newArrival: p.cms?.newArrival,
        salesCount: p.cms?.salesCount || 0,
        viewCount: p.cms?.viewCount || 0,
        _boost: calculateBoost(p)
      }));
    console.log('[CMS] Search index built:', searchIndex.length, 'products');
  };

  const calculateBoost = (product) => {
    const weights = config?.recommendations?.weights || { cartAddCount: 0.4, salesCount: 0.3, viewCount: 0.2, categoryMatch: 0.1 };
    const cms = product.cms || {};
    return (
      (cms.cartAddCount || 0) * weights.cartAddCount +
      (cms.salesCount || 0) * weights.salesCount +
      (cms.viewCount || 0) * weights.viewCount
    );
  };

  const buildSitemap = (products) => {
    if (!config?.sitemap?.enabled) return;
    sitemapUrls = products
      .filter(p => p.cms?.status === 'published')
      .map(p => ({
        url: `https://dalli.rs/proizvod-${p.slug}.html`,
        lastmod: p.cms?.updatedAt || p.cms?.publishedAt,
        changefreq: config.sitemap.changefreq,
        priority: config.sitemap.priority,
        images: p.images?.gallery?.concat(p.images?.main).filter(Boolean) || []
      }));
    console.log('[CMS] Sitemap built:', sitemapUrls.length, 'URLs');
  };

  // Search API
  const search = (query, options = {}) => {
    if (!query || query.length < 2) return [];
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const results = searchIndex
      .map(item => {
        let score = 0;
        const boostFields = config?.searchIndex?.boostFields || { name: 3, category: 2, sku: 1 };
        const searchable = `${item.name} ${item.category} ${item.sku} ${item.shortDescription} ${item.colors.join(' ')} ${item.sizes.join(' ')} ${item.searchKeywords.join(' ')}`.toLowerCase();
        
        terms.forEach(term => {
          if (item.name.toLowerCase().includes(term)) score += (boostFields.name || 1);
          if (item.category.toLowerCase().includes(term)) score += (boostFields.category || 1);
          if (item.sku.toLowerCase().includes(term)) score += (boostFields.sku || 1);
          if (searchable.includes(term)) score += 0.5;
        });
        return { ...item, score: score * (item._boost + 1) };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 20);
    return results;
  };

  // Recommendations
  const getRecommendations = (contextProductId, options = {}) => {
    if (!config?.recommendations?.enabled) return [];
    const products = state.products.get();
    const context = products.find(p => p.id === contextProductId);
    if (!context) return [];

    const candidates = products
      .filter(p => p.id !== contextProductId && p.cms?.status === 'published')
      .map(p => {
        const cms = p.cms || {};
        let score = 0;
        
        // Content-based: category match
        if (p.category === context.category) score += (config.recommendations.weights.categoryMatch || 0);
        if (p.gender === context.gender) score += (config.recommendations.weights.categoryMatch || 0) * 0.5;
        
        // Collaborative: users who bought X also bought Y
        score += (cms.cartAddCount || 0) * (config.recommendations.weights.cartAddCount || 0);
        score += (cms.salesCount || 0) * (config.recommendations.weights.salesCount || 0);
        score += (cms.viewCount || 0) * (config.recommendations.weights.viewCount || 0);
        
        // Trending boost
        const daysSincePublish = (Date.now() - new Date(cms.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePublish < 30) score *= 1.2;
        
        return { ...p, _recommendScore: score };
      })
      .sort((a, b) => b._recommendScore - a._recommendScore)
      .slice(0, options.limit || 4);
    return candidates;
  };

  // SEO Automation
  const generateSlug = (name) => {
    if (!config?.autoSlug?.enabled) return name.toLowerCase().replace(/\s+/g, '-');
    let slug = name.toLowerCase();
    if (config.autoSlug.removeDiacritics) {
      slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/č/g, 'c').replace(/ć/g, 'c')
        .replace(/đ/g, 'dj').replace(/š/g, 's')
        .replace(/ž/g, 'z').replace(/lj/g, 'lj')
        .replace(/nj/g, 'nj');
    }
    slug = slug.replace(/[^a-z0-9]+/g, config.autoSlug.separator || '-')
      .replace(new RegExp(`^${config.autoSlug.separator}|${config.autoSlug.separator}$`, 'g'), '');
    return slug;
  };

  const generateSeo = (product) => {
    if (!config?.autoSeo?.enabled) return product.seo || {};
    const tpl = config.autoSeo;
    const price = product.price.I18n.formatNumber;
    return {
      metaTitle: tpl.metaTitleTemplate
        .replace('{name}', product.name)
        .replace('{shortDescription}', product.shortDescription)
        .replace('{price}', price),
      metaDescription: tpl.metaDescriptionTemplate
        .replace('{name}', product.name)
        .replace('{shortDescription}', product.shortDescription)
        .replace('{price}', price),
      ogTitle: tpl.ogTitleTemplate.replace('{name}', product.name),
      ogDescription: tpl.ogDescriptionTemplate
        .replace('{name}', product.name)
        .replace('{shortDescription}', product.shortDescription)
        .replace('{price}', price),
      ogImage: product.images?.ogImage || tpl.ogImageFallback,
      canonicalUrl: `https://dalli.rs/proizvod-${product.slug}.html`
    };
  };

  const generateSchema = (product) => {
    if (!config?.autoSchema?.enabled) return product.structuredData || {};
    const inventory = product.inventory || {};
    const availabilityMap = config.autoSchema.availabilityMapping;
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: [product.images?.main, product.images?.ogImage].filter(Boolean),
      sku: product.sku,
      brand: { '@type': 'Brand', name: config.autoSchema.brand },
      offers: {
        '@type': 'Offer',
        url: `https://dalli.rs/proizvod-${product.slug}.html`,
        priceCurrency: config.autoSchema.currency,
        price: product.price,
        availability: availabilityMap[inventory.status] || availabilityMap.in_stock,
        seller: { '@type': 'Organization', name: config.autoSchema.brand }
      },
      description: product.shortDescription,
      mpn: product.structuredData?.mpn,
      gtin: product.structuredData?.gtin
    };
  };

  // Public API
  return {
    init,
    search,
    getRecommendations,
    generateSlug,
    generateSeo,
    generateSchema,
    getSearchIndex: () => searchIndex,
    getSitemapUrls: () => sitemapUrls,
    getConfig: () => config
  };
})();

// Enhanced product loader with CMS integration
let loadProducts = async () => {
  try {
    const res = await fetch('/data/products.json');
    if (!res.ok) throw new Error('Failed to load products');
    const data = await res.json();
    
    // Initialize CMS automation
    await CMS.init();
    
    // Set products with CMS enrichment
    const enrichedProducts = (data.products || []).map(p => ({
      ...p,
      _seo: CMS.generateSeo(p),
      _schema: CMS.generateSchema(p)
    }));
    state.products.set(enrichedProducts);
    
    renderFeaturedProducts();
    renderCategoryCounts();
  } catch (err) {
    console.error('Failed to load products:', err);
  }
};

const renderFeaturedProducts = () => {
  const products = state.products.get().filter(p => p.cms?.status === 'published');
  if (!products.length) return;

  const cmsConfig = CMS.getConfig();
  const featuredLimit = cmsConfig?.homepage?.featuredLimit || 8;
  const newArrivalsLimit = cmsConfig?.homepage?.newArrivalsLimit || 8;
  const bestSellersLimit = cmsConfig?.homepage?.bestSellersLimit || 8;

  const favorites = products.filter(p => p.cms?.featured).slice(0, featuredLimit);
  const bestsellers = [...products]
    .filter(p => p.cms?.bestseller)
    .sort((a, b) => (b.cms?.salesCount || 0) - (a.cms?.salesCount || 0))
    .slice(0, bestSellersLimit);
  const newArrivals = [...products]
    .filter(p => p.cms?.newArrival)
    .sort((a, b) => new Date(b.cms?.publishedAt) - new Date(a.cms?.publishedAt))
    .slice(0, newArrivalsLimit);

  renderProductGrid('featuredProductsFavorites', favorites);
  renderProductGrid('featuredProductsBestsellers', bestsellers);
  renderProductGrid('featuredProductsNew', newArrivals);
};

const renderProductGrid = (containerId, products) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = products.map(product => {
    const variant = product.variants?.[0] || { color: product.colors?.[0]?.name, size: product.sizes?.[0]?.size, price: product.price, image: product.images?.main };
    const salePrice = product.salePrice && product.salePrice < product.price ? product.salePrice : null;
    const hasSale = !!salePrice;

    // CMS badge logic - only show relevant badges
    let badge = null;
    let badgeLabel = '';
    if (product.cms?.newArrival) { badge = 'new'; badgeLabel = 'Novo'; }
    else if (product.cms?.bestseller && product.cms?.salesCount > 100) { badge = 'bestseller'; badgeLabel = 'Bestseller'; }
    else if (product.cms?.featured) { badge = 'limited'; badgeLabel = 'Izabrano'; }

    // Virtual Try-On eligibility
    const isVtoEligible = product.cms?.virtualTryOn?.eligible === true;
    
    // 360° Viewer eligibility
    const isV360Eligible = product.cms?.product360?.enabled === true && 
                            product.cms?.product360?.images?.length >= 24;

    // CMS image management - CMS images replace placeholders automatically
    const imageSrc = variant.image || product.images?.main || (product.images?.gallery?.[0]) || null;

    return `
      <article class="product-card" data-product-id="${product.id}" role="listitem" data-slug="${product.slug}">
        <div class="product-card__media">
          ${imageSrc ? 
            `<img class="product-card__image" src="${imageSrc}" alt="${product.altText || product.name}" loading="lazy" width="400" height="500" decoding="async">` :
            `<div class="product-card__placeholder" style="width:100%;height:100%;background:var(--color-bg-subtle);display:flex;align-items:center;justify-content:center;color:var(--color-text-tertiary);">Slika uskoro</div>`
          }
          ${badge ? `<div class="product-card__badges"><span class="badge badge--${badge}">${badgeLabel}</span></div>` : ''}
          <button class="product-card__wishlist" data-action="wishlist" data-product-id="${product.id}" aria-label="Dodaj ${product.name} na listu želja" aria-pressed="false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button class="product-card__quick-add" data-action="quick-add" data-product-id="${product.id}" data-variant-id="${product.id}-${variant.color}-${variant.size}" aria-label="Brzo dodaj ${product.name} u korpu">Dodaj u korpu</button>
          ${isVtoEligible ? `
            <button class="product-card__vto" data-action="virtual-tryon" data-product-id="${product.id}" aria-label="Probaj na sebi: ${product.name}" title="Probaj na sebi">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span class="product-card__vto-label">Probaj na sebi</span>
            </button>
          ` : ''}
          ${isV360Eligible ? `
            <button class="product-card__v360" data-action="view-360" data-product-id="${product.id}" aria-label="Pregledaj 360°: ${product.name}" title="Pregledaj 360°">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
              <span class="product-card__v360-label">360°</span>
            </button>
          ` : ''}
        </div>
        <div class="product-card__content">
          <h3 class="product-card__name">${product.name}</h3>
          <div class="product-card__rating">
            <span class="product-card__stars" aria-label="Ocena ${product.rating || 4.5} od 5">${'★'.repeat(Math.floor(product.rating || 4.5))}${'☆'.repeat(5 - Math.floor(product.rating || 4.5))}</span>
            <span class="product-card__reviews">(${product.reviews || 0})</span>
          </div>
          <div class="product-card__price-row">
            <span class="product-card__price">${(variant.price || product.price).I18n.formatNumber} RSD</span>
            ${hasSale ? `<span class="product-card__old-price">${product.price.I18n.formatNumber} RSD</span>` : ''}
          </div>
          <p class="product-card__installment">ili ${Math.ceil((variant.price || product.price) / 3)} RSD x 3 rate bez kamate</p>
        </div>
      </article>
    `;
  });
};

const renderCategoryCounts = () => {
  const products = state.products.get().filter(p => p.cms?.status === 'published');
  const counts = {
    muski: products.filter(p => p.gender === 'muski').length,
    zenski: products.filter(p => p.gender === 'zenski').length,
    dukseri: products.filter(p => p.category === 'dukseri').length,
    bestseller: products.filter(p => p.cms?.bestseller).length
  };
  Object.entries(counts).forEach(([key, count]) => {
    const el = document.getElementById(`catCount${key.charAt(0).toUpperCase() + key.slice(1)}`);
    if (el) el.textContent = count;
  });
};

// ============================================================
// CATEGORY PAGE AUTOMATION — Dynamic product rendering per category
// ============================================================
const CategoryPage = (() => {
  let currentCategory = null;
  let currentPage = 1;
  const productsPerPage = 24;

  const init = () => {
    // Detect category from URL or data attribute
    const categoryEl = $('[data-category-page]');
    if (!categoryEl) return;

    currentCategory = categoryEl.dataset.categoryPage;
    currentPage = 1;
    renderCategoryPage();
    bindPagination();
    
    // Track category view
    trackEvent('view_category', { category: currentCategory });
  };

const renderCategoryPage = () => {
    const user = state.user.get();
    let products = state.products.get().filter(p => 
      p.cms?.status === 'published' && 
      (p.category === currentCategory || p.gender === currentCategory)
    );
    
    // Apply loyalty-based filtering
    products = products.filter(p => window.LoyaltyUtils?.isProductAccessible?.(p, user) !== false);
    
    const container = $('#categoryProductsGrid');
    const countEl = $('#categoryProductsCount');
    const emptyEl = $('#categoryEmpty');

    if (countEl) countEl.textContent = products.length;

    if (!products.length) {
      if (container) container.classList.add('hidden');
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    if (container) container.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');

    // Pagination
    const start = (currentPage - 1) * productsPerPage;
    const paginated = products.slice(start, start + productsPerPage);
    const hasMore = start + productsPerPage < products.length;

    if (container) {
      container.innerHTML = paginated.map(product => renderProductCardHTML(product)).join('');
    }

    // Update pagination controls
    const paginationEl = $('#categoryPagination');
    if (paginationEl) {
      paginationEl.innerHTML = `
        <button class="btn btn-secondary" data-action="prev-page" ${currentPage === 1 ? 'disabled' : ''}>${t("common.pagination.prev")}</button>
        <span class="pagination-info">Strana ${currentPage} od ${Math.ceil(products.length / productsPerPage)}</span>
        <button class="btn btn-secondary" data-action="next-page" ${!hasMore ? 'disabled' : ''}>${t("common.pagination.next")}</button>
      `;
    }
  };

  const bindPagination = () => {
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="prev-page"]') && currentPage > 1) {
        currentPage--;
        renderCategoryPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (e.target.matches('[data-action="next-page"]')) {
        currentPage++;
        renderCategoryPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  const renderProductCardHTML = (product) => {
    const variant = product.variants?.[0] || { color: product.colors?.[0]?.name, size: product.sizes?.[0]?.size, price: product.price, image: product.images?.main };
    const salePrice = product.salePrice && product.salePrice < product.price ? product.salePrice : null;
    const hasSale = !!salePrice;

    let badge = null;
    let badgeLabel = '';
    if (product.cms?.newArrival) { badge = 'new'; badgeLabel = 'Novo'; }
    else if (product.cms?.bestseller && product.cms?.salesCount > 100) { badge = 'bestseller'; badgeLabel = 'Bestseller'; }
    else if (product.cms?.featured) { badge = 'limited'; badgeLabel = 'Izabrano'; }

    // Loyalty flags
    const loyaltyFlags = product.loyalty || { memberOnly: false, earlyAccess: false, limitedRelease: false, tierRequired: 'member', pointsMultiplier: 1 };
    const loyaltyBadge = loyaltyFlags.memberOnly ? 'member-only' : (loyaltyFlags.earlyAccess ? 'early-access' : (loyaltyFlags.limitedRelease ? 'limited-release' : null));
    const loyaltyBadgeLabel = loyaltyFlags.memberOnly ? 'Samo za članove' : (loyaltyFlags.earlyAccess ? 'Rani pristup' : (loyaltyFlags.limitedRelease ? 'Limited Release' : ''));

    // Virtual Try-On eligibility
    const isVtoEligible = product.cms?.virtualTryOn?.eligible === true;

    // Member pricing
    const user = state.user.get();
    const memberMultiplier = window.LoyaltyUtils?.getPointsMultiplier?.(product, user) || 1;
    const memberDiscount = user?.loyalty ? {
      silver: 0.05,
      gold: 0.10,
      black: 0.15
    }[user.loyalty.tier] || 0 : 0;
    const basePrice = variant.price || product.price;
    const memberPrice = memberDiscount > 0 ? Math.round(basePrice * (1 - memberDiscount)) : basePrice;
    const showMemberPrice = memberDiscount > 0 && user?.loyalty;

    const imageSrc = variant.image || product.images?.main || (product.images?.gallery?.[0]) || null;

    return `
      <article class="product-card" data-product-id="${product.id}" role="listitem" data-slug="${product.slug}" ${loyaltyFlags.memberOnly ? 'data-member-only="true"' : ''} ${loyaltyFlags.earlyAccess ? 'data-early-access="true"' : ''} ${loyaltyFlags.limitedRelease ? 'data-limited-release="true"' : ''}>
        <div class="product-card__media">
          ${imageSrc ? 
            `<img class="product-card__image" src="${imageSrc}" alt="${product.altText || product.name}" loading="lazy" width="400" height="500" decoding="async">` :
            `<div class="product-card__placeholder" style="width:100%;height:100%;background:var(--color-bg-subtle);display:flex;align-items:center;justify-content:center;color:var(--color-text-tertiary);">Slika uskoro</div>`
          }
          ${badge ? `<div class="product-card__badges"><span class="badge badge--${badge}">${badgeLabel}</span></div>` : ''}
          ${loyaltyBadge ? `<div class="product-card__loyalty-badges"><span class="badge badge--loyalty badge--${loyaltyBadge}">${loyaltyBadgeLabel}</span></div>` : ''}
          <button class="product-card__wishlist" data-action="wishlist" data-product-id="${product.id}" aria-label="Dodaj ${product.name} na listu želja" aria-pressed="false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button class="product-card__quick-add" data-action="quick-add" data-product-id="${product.id}" data-variant-id="${product.id}-${variant.color}-${variant.size}" aria-label="Brzo dodaj ${product.name} u korpu">Dodaj u korpu</button>
          ${isVtoEligible ? `
            <button class="product-card__vto" data-action="virtual-tryon" data-product-id="${product.id}" aria-label="Probaj na sebi: ${product.name}" title="Probaj na sebi">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span class="product-card__vto-label">Probaj na sebi</span>
            </button>
          ` : ''}
        </div>
        <div class="product-card__content">
          <h3 class="product-card__name">${product.name}</h3>
          <div class="product-card__rating">
            <span class="product-card__stars" aria-label="Ocena ${product.rating || 4.5} od 5">${'★'.repeat(Math.floor(product.rating || 4.5))}${'☆'.repeat(5 - Math.floor(product.rating || 4.5))}</span>
            <span class="product-card__reviews">(${product.reviews || 0})</span>
          </div>
          <div class="product-card__price-row">
            ${showMemberPrice ? `
              <span class="product-card__price product-card__price--member">${memberPrice.I18n.formatNumber} RSD</span>
              <span class="product-card__old-price">${basePrice.I18n.formatNumber} RSD</span>
              <span class="product-card__member-badge" style="font-size: var(--fs-xs); background: var(--color-primary-light); color: var(--color-primary); padding: 2px 6px; border-radius: var(--radius-btn); margin-left: var(--space-2);">${t('loyalty.tier.' + user.loyalty.tier) || user.loyalty.tier} popust</span>
            ` : `
              <span class="product-card__price">${basePrice.I18n.formatNumber} RSD</span>
              ${hasSale ? `<span class="product-card__old-price">${product.price.I18n.formatNumber} RSD</span>` : ''}
            `}
          </div>
          <p class="product-card__installment">ili ${Math.ceil((showMemberPrice ? memberPrice : basePrice) / 3)} RSD x 3 rate bez kamate</p>
        </div>
      </article>
    `;
  };

  return { init };
})();

// ============================================================
// LUXURY SEARCH EXPERIENCE — Fullscreen Modal, Instant Results
// ============================================================
const Search = (() => {
  let debounceTimer = null;
  const MIN_QUERY_LENGTH = 2;
  const MAX_RECENT = 8;
  const RECENT_STORAGE_KEY = 'dalli_recent_searches';
  let searchModal = null;
  let searchInput = null;
  let selectedIndex = -1;
  let currentResults = [];

  const init = () => {
    searchModal = $('#searchModal');
    searchInput = $('#searchModalInput');
    if (!searchModal || !searchInput) return;

    bindEvents();
    showInitialState();
    
    console.log('[Search] Luxury search experience initialized');
  };

  const bindEvents = () => {
    // Open search from header button
    $$('[data-action="search"]').forEach(btn => {
      btn.addEventListener('click', openSearch);
    });

    // Close search
    $$('[data-action="close-search"]').forEach(btn => {
      btn.addEventListener('click', closeSearch);
    });

    // Backdrop click
    searchModal.querySelector('.search-modal__backdrop')?.addEventListener('click', closeSearch);

    // Input handling
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length >= MIN_QUERY_LENGTH) {
          performSearch(query);
        } else {
          showInitialState();
        }
      }, 100);
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleGlobalKeydown);

    // Close on Escape
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearch();
    });

    // Result click delegation
    searchModal.addEventListener('click', (e) => {
      const resultItem = e.target.closest('.search-result-card, .search-result-category, .search-suggestion, .search-recent-item, .search-trending-item, .search-category-item, .search-empty__popular-item');
      if (!resultItem) return;

      // Track click
      const productSlug = resultItem.dataset.product || resultItem.dataset.slug;
      if (productSlug) trackEvent('search_result_click', { product_slug: productSlug });
    });

    // Clear recent searches
    searchModal.querySelector('[data-action="clear-recent"]')?.addEventListener('click', clearRecentSearches);

    // Prevent form submission
    searchModal.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault());
  };

  const handleGlobalKeydown = (e) => {
    // Open with '/' key (when not typing in input)
    if (e.key === '/' && document.activeElement !== searchInput && !searchModal.classList.contains('open')) {
      e.preventDefault();
      openSearch();
    }
  };

  const handleKeydown = (e) => {
    if (!searchModal.classList.contains('open')) return;

    const resultsContainer = searchModal.querySelector('#searchResults');
    const isResultsVisible = !resultsContainer.classList.contains('hidden');
    const focusableItems = getFocusableItems();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (isResultsVisible) {
          selectedIndex = Math.min(selectedIndex + 1, focusableItems.length - 1);
          focusableItems[selectedIndex]?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isResultsVisible) {
          selectedIndex = Math.max(selectedIndex - 1, 0);
          focusableItems[selectedIndex]?.focus();
        }
        break;
      case 'Enter':
        if (selectedIndex >= 0 && focusableItems[selectedIndex]) {
          e.preventDefault();
          focusableItems[selectedIndex].click();
        }
        break;
      case 'Escape':
        closeSearch();
        break;
    }
  };

  const getFocusableItems = () => {
    const resultsContainer = searchModal.querySelector('#searchResults');
    if (resultsContainer.classList.contains('hidden')) return [];
    return Array.from(resultsContainer.querySelectorAll(
      '.search-result-card, .search-result-category, .search-suggestion, .search-empty__popular-item'
    ));
  };

  const openSearch = () => {
    searchModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    searchInput.value = '';
    searchInput.focus();
    selectedIndex = -1;
    showInitialState();
    
    // Track search open
    trackEvent('search_open', {});
  };

  const closeSearch = () => {
    searchModal.classList.remove('open');
    document.body.style.overflow = '';
    searchInput.value = '';
    searchInput.blur();
    selectedIndex = -1;
    showInitialState();
  };

  const showInitialState = () => {
    const initial = searchModal.querySelector('#searchInitial');
    const results = searchModal.querySelector('#searchResults');
    initial.classList.remove('hidden');
    results.classList.add('hidden');
    selectedIndex = -1;
    renderRecentSearches();
    renderTrendingSearches();
    renderCategoryPills();
  };

  const performSearch = (query) => {
    const initial = searchModal.querySelector('#searchInitial');
    const results = searchModal.querySelector('#searchResults');
    initial.classList.add('hidden');
    results.classList.remove('hidden');
    selectedIndex = -1;

    const searchResults = CMS.search(query, { limit: 20 });
    currentResults = searchResults;

    // Update header
    const countEl = searchModal.querySelector('#searchResultsCount');
    const queryEl = searchModal.querySelector('#searchResultsQuery');
    if (countEl) countEl.textContent = `${searchResults.length} rezultata`;
    if (queryEl) queryEl.textContent = `„${query}“`;

    // Render sections
    renderProductResults(searchResults);
    renderCategoryResults(searchResults);
    renderSuggestions(searchResults, query);

    // Handle empty state
    const emptyEl = searchModal.querySelector('#searchEmpty');
    const productsGrid = searchModal.querySelector('#searchProductsGrid');
    const categoriesList = searchModal.querySelector('#searchResultsCategories');
    const suggestionsList = searchModal.querySelector('#searchResultsSuggestions');

    if (!searchResults.length) {
      productsGrid.innerHTML = '';
      categoriesList.innerHTML = '';
      suggestionsList.innerHTML = '';
      emptyEl.classList.remove('hidden');
      renderEmptyState(query);
    } else {
      emptyEl.classList.add('hidden');
    }

    // Track search
    trackEvent('search', { search_term: query, results_count: searchResults.length });
    addRecentSearch(query);
    renderRecentSearches();
  };

  const renderProductResults = (results) => {
    const container = searchModal.querySelector('#searchProductsGrid');
    if (!container) return;

    const productResults = results.slice(0, 12);
    if (!productResults.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = productResults.map(item => {
      const imageSrc = item.colors?.[0] ? `/images/products/${item.slug}.svg` : null;
      return `
        <a href="/proizvod-${item.slug}.html" 
           class="search-result-card" 
           role="listitem"
           data-product="${item.slug}"
           data-slug="${item.slug}"
           data-track="search_result_click"
           tabindex="0">
          <div class="search-result-card__media">
            ${imageSrc ? 
              `<img class="search-result-card__image" src="${imageSrc}" alt="${item.name}" loading="lazy" width="320" height="400" decoding="async">` :
              `<div class="search-result-card__placeholder" style="width:100%;height:100%;background:var(--color-bg-subtle);display:flex;align-items:center;justify-content:center;color:var(--color-text-tertiary);">Slika uskoro</div>`
            }
          </div>
          <div class="search-result-card__content">
            <h4 class="search-result-card__name">${item.name}</h4>
            <div class="search-result-card__meta">
              <span class="search-result-card__category">${item.category}</span>
            </div>
            <span class="search-result-card__price">${item.price.I18n.formatNumber} RSD</span>
          </div>
        </a>
      `;
    }).join('');
  };

  const renderCategoryResults = (results) => {
    const container = searchModal.querySelector('#searchResultsCategories');
    if (!container) return;

    // Extract unique categories from results
    const categories = [...new Set(results.map(r => r.category))].slice(0, 6);
    if (!categories.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = categories.map(cat => `
      <a href="/${cat === 'muski' ? 'muska-garderoba' : cat === 'zenski' ? 'zenska-garderoba' : cat === 'dukseri' ? 'dukseri' : cat === 'trenerke' ? 'dukseri' : cat === 'majice' ? 'muska-garderoba.html#majice' : 'products.html'}.html" 
         class="search-result-category" 
         data-category="${cat}"
         tabindex="0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          ${cat === 'dukseri' ? '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' : cat === 'trenerke' ? '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' : cat === 'majice' ? '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' : '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/>'}
        </svg>
        ${cat === 'muski' ? 'Muška Garderoba' : cat === 'zenski' ? 'Ženska Garderoba' : cat.charAt(0).toUpperCase() + cat.slice(1)}
      </a>
    `).join('');
  };

  const renderSuggestions = (results, query) => {
    const container = searchModal.querySelector('#searchResultsSuggestions');
    if (!container) return;

    // Generate smart suggestions based on query + results
    const suggestions = generateSuggestions(query, results).slice(0, 6);
    if (!suggestions.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = suggestions.map(suggestion => `
      <button class="search-suggestion" 
              data-suggestion="${suggestion}"
              tabindex="0"
              type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        ${suggestion}
      </button>
    `).join('');
  };

  const generateSuggestions = (query, results) => {
    const suggestions = new Set();
    const lowerQuery = query.toLowerCase();

    // Category-based suggestions
    const categories = [...new Set(results.map(r => r.category))];
    categories.forEach(cat => {
      if (cat.includes(lowerQuery) || lowerQuery.includes(cat.slice(0, 3))) {
        suggestions.add(cat.charAt(0).toUpperCase() + cat.slice(1));
        suggestions.add(`${cat.charAt(0).toUpperCase() + cat.slice(1)} ${query}`);
      }
    });

    // Product-based suggestions
    results.slice(0, 5).forEach(r => {
      if (r.name.toLowerCase().includes(lowerQuery)) {
        suggestions.add(r.name);
      }
    });

    // Gender-based
    if (lowerQuery.includes('mušk') || lowerQuery.includes('mus')) suggestions.add('Muška Garderoba');
    if (lowerQuery.includes('žen') || lowerQuery.includes('zen')) suggestions.add('Ženska Garderoba');

    // Product type
    if (lowerQuery.includes('duk') || lowerQuery.includes('hood')) suggestions.add('Duksevi');
    if (lowerQuery.includes('tren')) suggestions.add('Trenerke');
    if (lowerQuery.includes('maj')) suggestions.add('Majice');

    return Array.from(suggestions).filter(s => s.toLowerCase() !== query.toLowerCase()).slice(0, 8);
  };

  const renderEmptyState = (query) => {
    const emptyQuery = searchModal.querySelector('#searchEmptyQuery');
    if (emptyQuery) emptyQuery.textContent = query;

    // Suggestions
    const suggestionsContainer = searchModal.querySelector('#searchEmptySuggestions');
    const suggestions = generateSuggestions(query, []).slice(0, 5);
    if (suggestionsContainer) {
      suggestionsContainer.innerHTML = suggestions.map(s => `
        <button class="search-suggestion" data-suggestion="${s}" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          ${s}
        </button>
      `).join('');
    }

    // Popular products
    const popularContainer = searchModal.querySelector('#searchEmptyPopularGrid');
    if (popularContainer) {
      const products = state.products.get()
        .filter(p => p.cms?.status === 'published')
        .sort((a, b) => (b.cms?.salesCount || 0) - (a.cms?.salesCount || 0))
        .slice(0, 4);
      
      popularContainer.innerHTML = products.map(p => `
        <a href="/proizvod-${p.slug}.html" class="search-empty__popular-item" data-track="search_empty_popular_click" data-product="${p.slug}">
          <div class="search-empty__popular-media">
            <img src="${p.images?.main || p.images?.gallery?.[0] || '/images/placeholder.svg'}" alt="${p.name}" loading="lazy" width="280" height="350" decoding="async">
          </div>
          <div class="search-empty__popular-content">
            <span class="search-empty__popular-name">${p.name}</span>
            <span class="search-empty__popular-price">${p.price.I18n.formatNumber} RSD</span>
          </div>
        </a>
      `).join('');
    }
  };

  const renderRecentSearches = () => {
    const container = searchModal.querySelector('#searchRecentList');
    const emptyEl = searchModal.querySelector('#searchRecentEmpty');
    if (!container) return;

    const recent = getRecentSearches();
    if (!recent.length) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    container.innerHTML = recent.map(term => `
      <button class="search-recent-item" data-recent="${term}" type="button" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        ${term}
      </button>
    `).join('');
  };

  const renderTrendingSearches = () => {
    const container = searchModal.querySelector('#searchTrendingList');
    if (!container) return;

    // Get trending from CMS config or top products
    const trending = getTrendingSearches();
    container.innerHTML = trending.map(term => `
      <button class="search-trending-item" data-trending="${term}" type="button" tabindex="0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polyline points="23 4 23 10 17 10"/></svg>
        ${term}
      </button>
    `).join('');
  };

  const getTrendingSearches = () => {
    const config = CMS.getConfig();
    if (config?.cms?.trendingSearches) return config.cms.trendingSearches;
    
    // Fallback: derive from top products
    const products = state.products.get().filter(p => p.cms?.status === 'published');
    const topCategories = [...new Set(products
      .sort((a, b) => (b.cms?.salesCount || 0) - (a.cms?.salesCount || 0))
      .slice(0, 10)
      .map(p => p.category))];
    
    return [
      'Duksevi', 'Trenerke', 'Majice', 'Muška Garderoba', 'Ženska Garderoba',
      ...topCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1))
    ].slice(0, 8);
  };

  const renderCategoryPills = () => {
    const container = searchModal.querySelector('#searchCategoriesList');
    if (!container) return;

    const categories = [
      { key: 'muski', label: 'Muška Garderoba', icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
      { key: 'zenski', label: 'Ženska Garderoba', icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
      { key: 'dukseri', label: 'Duksevi', icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
      { key: 'trenerke', label: 'Trenerke', icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
      { key: 'majice', label: 'Majice', icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/>' },
      { key: 'ostalo', label: 'Aksesoriji', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' }
    ];

    container.innerHTML = categories.map(cat => `
      <a href="/${cat.key === 'majice' ? 'muska-garderoba.html#majice' : cat.key === 'trenerke' ? 'dukseri' : cat.key === 'ostalo' ? 'products.html' : `${cat.key}-garderoba.html`}" 
         class="search-category-item" 
         data-category="${cat.key}"
         tabindex="0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${cat.icon}</svg>
        ${cat.label}
      </a>
    `).join('');
  };

  const getRecentSearches = () => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]').slice(0, MAX_RECENT);
    } catch { return []; }
  };

  const addRecentSearch = (query) => {
    const recent = getRecentSearches();
    const filtered = recent.filter(t => t.toLowerCase() !== query.toLowerCase());
    filtered.unshift(query);
    safeSetItem(RECENT_STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  };

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_STORAGE_KEY);
    renderRecentSearches();
  };

  return { init };
})();

// ============================================================
// INVENTORY SYNC — Real-time inventory across all touchpoints
// ============================================================
const InventorySync = (() => {
  const init = () => {
    // Listen for cart changes to update inventory display
    state.cart.subscribe(() => updateInventoryDisplay());
    
    // Initial update
    updateInventoryDisplay();
  };

  const updateInventoryDisplay = () => {
    const cart = state.cart.get();
    const products = state.products.get();
    
    cart.forEach(cartItem => {
      const product = products.find(p => p.id === cartItem.id);
      if (!product) return;

      // Update product inventory
      const variant = product.sizes?.find(s => s.size === cartItem.size);
      if (variant) {
        variant.stock = Math.max(0, (variant.stock || 0) - cartItem.qty);
        variant.available = variant.stock > 0;
      }

      // Update total inventory
      product.inventory.totalStock = Math.max(0, (product.inventory.totalStock || 0) - cartItem.qty);
      if (product.inventory.totalStock <= product.inventory.lowStockThreshold) {
        product.inventory.status = 'low_stock';
      }
      if (product.inventory.totalStock === 0) {
        product.inventory.status = 'out_of_stock';
      }
    });

    // Update UI elements
    updateInventoryBadges();
    updateAddToCartButtons();
  };

  const updateInventoryBadges = () => {
    const products = state.products.get();
    
    $$('.product-card').forEach(card => {
      const productId = parseInt(card.dataset.productId);
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const status = product.inventory?.status;
      const badgeEl = card.querySelector('.product-card__inventory-badge');
      
      if (status === 'out_of_stock') {
        if (!badgeEl) {
          const badge = document.createElement('span');
          badge.className = 'badge badge--out-of-stock product-card__inventory-badge';
          badge.textContent = 'Rasprodato';
          card.querySelector('.product-card__media')?.appendChild(badge);
        }
        card.classList.add('product-card--out-of-stock');
      } else if (status === 'low_stock') {
        if (!badgeEl) {
          const badge = document.createElement('span');
          badge.className = 'badge badge--low-stock product-card__inventory-badge';
          badge.textContent = `t("product.stockRemaining", { count: product.inventory.totalStock })`;
          card.querySelector('.product-card__media')?.appendChild(badge);
        }
      } else {
        if (badgeEl) badgeEl.remove();
        card.classList.remove('product-card--out-of-stock');
      }
    });
  };

  const updateAddToCartButtons = () => {
    const products = state.products.get();
    
    $$('[data-action="quick-add"]').forEach(btn => {
      const productId = parseInt(btn.dataset.productId);
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const isOutOfStock = product.inventory?.status === 'out_of_stock';
      btn.disabled = isOutOfStock;
      btn.textContent = isOutOfStock ? 'Rasprodato' : 'Dodaj u korpu';
      btn.setAttribute('aria-disabled', isOutOfStock);
    });
  };

  return { init };
})();

// Initialize all automation modules
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CategoryPage.init();
    Search.init();
    InventorySync.init();
  });
} else {
  CategoryPage.init();
  Search.init();
  InventorySync.init();
}

// ============================================================
// FEATURED PRODUCTS TABS MODULE — Keyboard, ARIA, URL Sync, Analytics
// ============================================================
const FeaturedTabs = (() => {
  let tabsContainer = null;
  let tabs = [];
  let panels = [];
  let activeTab = 'favorites';
  let reducedMotion = false;
  let config = null;

  const TAB_CONFIG = {
    favorites: { label: 'Naši Favoriti', panelId: 'panel-favorites' },
    bestsellers: { label: 'Bestsellery', panelId: 'panel-bestsellers' },
    new: { label: 'Novo u Ponudi', panelId: 'panel-new' }
  };

  const init = async () => {
    tabsContainer = $('#featuredTabs');
    if (!tabsContainer) return;

    tabs = $$('.tab-btn', tabsContainer);
    panels = $$('.tab-panel', document);
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Load dynamic config for tab settings
    await loadConfig();

    // Restore active tab from URL or default
    activeTab = getTabFromURL() || 'favorites';
    activateTab(activeTab, false); // Don't push to history on init

    // Event listeners
    initTabListeners();
    initKeyboardNav();
    initHashListener();

    console.log('[FeaturedTabs] Initialized', { activeTab, tabs: tabs.length });
  };

  const loadConfig = async () => {
    try {
      const response = await fetch('/data/featured-config.json', { credentials: 'same-origin' });
      if (response.ok) {
        config = await response.json();
      }
    } catch (e) {
      console.warn('[FeaturedTabs] Config load failed:', e);
    }
  };

  const getTabFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return tab && TAB_CONFIG[tab] ? tab : null;
  };

  const updateURL = (tabId, push = true) => {
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    if (push) {
      window.history.pushState({ tab: tabId }, '', url);
    } else {
      window.history.replaceState({ tab: tabId }, '', url);
    }
  };

  const activateTab = (tabId, pushHistory = true) => {
    if (!TAB_CONFIG[tabId]) return false;

    const previousTab = activeTab;
    activeTab = tabId;

    // Update tab buttons
    tabs.forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Update panels with animation
    panels.forEach(panel => {
      const isActive = panel.id === TAB_CONFIG[tabId].panelId;
      if (isActive) {
        panel.hidden = false;
        // Force reflow for animation
        panel.offsetHeight;
        requestAnimationFrame(() => {
          panel.classList.add('active');
        });
      } else {
        panel.classList.remove('active');
        // Wait for animation to complete before hiding
        if (!reducedMotion) {
          setTimeout(() => {
            if (!panel.classList.contains('active')) panel.hidden = true;
          }, 300);
        } else {
          panel.hidden = true;
        }
      }
    });

    // Update URL
    updateURL(tabId, pushHistory);

    // Analytics
    if (previousTab !== tabId) {
      trackTabSwitch(previousTab, tabId);
    }

    // Trigger stagger reveal for newly visible cards
    const activePanel = document.getElementById(TAB_CONFIG[tabId].panelId);
    if (activePanel) {
      staggerRevealCards(activePanel);
    }

    return true;
  };

  const staggerRevealCards = (panel) => {
    if (reducedMotion) {
      $$('.product-card', panel).forEach(card => card.classList.add('product-card--revealed'));
      return;
    }

    const cards = $$('.product-card:not(.product-card--revealed)', panel);
    cards.forEach((card, index) => {
      card.style.animationDelay = `${(config?.settings?.staggerDelay || 50) * index}ms`;
      card.classList.add('animate-reveal');
      // Mark as revealed after animation
      setTimeout(() => card.classList.add('product-card--revealed'), 
        (config?.settings?.staggerDelay || 50) * index + 400);
    });
  };

  const initTabListeners = () => {
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab, true);
      });
    });
  };

  const initKeyboardNav = () => {
    tabsContainer.addEventListener('keydown', (e) => {
      const focusedBtn = tabsContainer.querySelector('.tab-btn:focus, .tab-btn[aria-selected="true"]');
      if (!focusedBtn) return;

      const currentIndex = tabs.findIndex(btn => btn === focusedBtn);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
      }

      if (nextIndex !== currentIndex) {
        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex].dataset.tab, true);
      }
    });
  };

  const initHashListener = () => {
    window.addEventListener('popstate', (e) => {
      const tab = getTabFromURL();
      if (tab && tab !== activeTab) {
        activateTab(tab, false); // Don't push to history
      }
    });
  };

  const trackTabSwitch = (fromTab, toTab) => {
    const payload = {
      event: 'featured_tab_switch',
      from_tab: fromTab,
      to_tab: toTab,
      from_label: TAB_CONFIG[fromTab]?.label,
      to_label: TAB_CONFIG[toTab]?.label,
      section: 'featured_products',
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      timestamp: Date.now()
    };

    if (window.dataLayer) window.dataLayer.push(payload);
    if (window.gtag) window.gtag('event', 'featured_tab_switch', payload);
    console.log('[FeaturedTabs] Track:', payload);
  };

  // Reduced motion listener
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', (e) => {
    reducedMotion = e.matches;
  });

  return { init, activateTab, getActiveTab: () => activeTab };
})();

// Initialize FeaturedTabs on DOM ready
(() => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", FeaturedTabs.init);
  } else {
    FeaturedTabs.init();
  }
})();

// Export
window.FeaturedTabs = FeaturedTabs;

// ====================Tabs;

// ====================Tabs;

// ====================Tabs;

// ====================Tabs;

// ============================================================
// FEATURED PRODUCTS MICRO-INTERACTIONS MODULE
// Price counter, parallax scroll, hover effects, analytics
// ============================================================
const FeaturedMicro = (() => {
  let sectionEl = null;
  let cards = [];
  let reducedMotion = false;
  let parallaxEnabled = false;
  let scrollHandler = null;
  let resizeHandler = null;
  let pricesAnimated = new Set();
  let hoverTimers = new Map();

  const init = () => {
    sectionEl = $('#featured');
    if (!sectionEl) return;

    cards = $$('.product-card', sectionEl);
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    parallaxEnabled = !reducedMotion && window.innerWidth >= 768;

    if (cards.length === 0) return;

    // Animate prices on entrance
    initPriceCounters();

    // Scroll parallax (desktop only)
    if (parallaxEnabled) {
      initParallax();
    }

    // Hover micro-interactions
    initHoverEffects();

    // Click/focus ripple (CSS handles most, but track analytics)
    initInteractionTracking();

    // Resize handler
    resizeHandler = debounce(handleResize, 150);
    window.addEventListener('resize', resizeHandler, { passive: true });

    // Reduced motion listener
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', (e) => {
      reducedMotion = e.matches;
      if (reducedMotion) disableParallax();
      else if (window.innerWidth >= 768) enableParallax();
    });

    console.log('[FeaturedMicro] Initialized', { cards: cards.length, parallaxEnabled });
  };

  const initPriceCounters = () => {
    if (reducedMotion) {
      // Just show final prices
      $$('.product-card__price[data-price]', sectionEl).forEach(el => {
        const price = parseInt(el.dataset.price, 10);
        el.textContent = formatPrice(price);
      });
      return;
    }

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const priceEl = entry.target;
          const price = parseInt(priceEl.dataset.price, 10);
          const id = priceEl.id || `price-${Math.random()}`;
          
          if (!pricesAnimated.has(id)) {
            pricesAnimated.add(id);
            animatePriceCounter(priceEl, price);
          }
          counterObserver.unobserve(priceEl);
        }
      });
    }, { threshold: 0.5, rootMargin: '0px 0px -50px 0px' });

    $$('.product-card__price[data-price]', sectionEl).forEach(el => counterObserver.observe(el));
  };

  const animatePriceCounter = (el, target) => {
    const start = 0;
    const duration = 800;
    const startTime = performance.now();
    const easing = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic

    el.classList.add('product-card__price--animating');

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easing(progress);
      const current = Math.floor(start + (target - start) * eased);
      el.textContent = formatPrice(current);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatPrice(target);
        el.classList.remove('product-card__price--animating');
      }
    };

    requestAnimationFrame(tick);
  };

  const formatPrice = (num) => {
    try {
      return new Intl.NumberFormat('sr-RS').format(num) + ' RSD';
    } catch {
      return I18n.formatCurrency(num);
    }
  };

  const initParallax = () => {
    if (!parallaxEnabled) return;

    let ticking = false;
    const PARALLAX_SPEED = 0.15;

    const updateParallax = () => {
      const sectionRect = sectionEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      if (sectionRect.bottom < 0 || sectionRect.top > viewportHeight) {
        ticking = false;
        return;
      }

      const scrollProgress = Math.max(0, Math.min(1, 
        (viewportHeight - sectionRect.top) / (sectionRect.height + viewportHeight)
      ));

      cards.forEach((card, index) => {
        const media = $('.product-card__image', card);
        const overlay = $('.product-card__parallax-overlay', card);
        const badges = $$('.product-card__badges .badge', card);
        
        if (!media) return;

        const staggerOffset = index * 0.03;
        const cardProgress = Math.max(0, Math.min(1, scrollProgress + staggerOffset));
        const translateY = cardProgress * PARALLAX_SPEED * 60;
        const overlayOpacity = Math.min(0.4, cardProgress * 0.6);
        const badgeFloat = cardProgress * -8; // px upward

        media.style.transform = `translate3d(0, ${translateY}px, 0) scale(1)`;
        
        if (overlay) {
          overlay.style.opacity = overlayOpacity;
          overlay.classList.add('product-card__parallax-overlay--active');
        }

        badges.forEach(badge => {
          badge.style.transform = `translateY(${badgeFloat}px)`;
        });

      });
    ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    scrollHandler = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  const disableParallax = () => {
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
      scrollHandler = null;
    }
    cards.forEach(card => {
      const media = $('.product-card__image', card);
      const overlay = $('.product-card__parallax-overlay', card);
      const badges = $$('.product-card__badges .badge', card);
      if (media) media.style.transform = '';
      if (overlay) { overlay.style.opacity = ''; overlay.classList.remove('product-card__parallax-overlay--active'); }
      badges.forEach(badge => badge.style.transform = '');
    });
    parallaxEnabled = false;
  };

  const enableParallax = () => {
    if (window.innerWidth >= 768) {
      initParallax();
      parallaxEnabled = true;
    }
  };

  const initHoverEffects = () => {
    cards.forEach((card, index) => {
      // Track hover dwell time for analytics
      let hoverStart = 0;
      let hoverTimer = null;

      card.addEventListener('mouseenter', () => {
        hoverStart = performance.now();
        hoverTimer = setTimeout(() => {
          trackEvent('product_card_hover_dwell', {
            product_id: card.dataset.productId,
            position: index + 1,
            dwell: Math.round(performance.now() - hoverStart)
          });
        }, 300);
      });

      card.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
      });

      // Quick-add click tracking
      const quickAdd = $('.product-card__quick-add', card);
      if (quickAdd) {
        quickAdd.addEventListener('click', (e) => {
          e.stopPropagation();
          trackEvent('product_quick_add', {
            product_id: card.dataset.productId,
            position: index + 1,
            variant_id: quickAdd.dataset.variantId
          });
        });
      }

      // Wishlist tracking
      const wishlist = $('.product-card__wishlist', card);
      if (wishlist) {
        wishlist.addEventListener('click', (e) => {
          e.stopPropagation();
          const isActive = wishlist.classList.contains('active');
          trackEvent(isActive ? 'wishlist_add' : 'wishlist_remove', {
            product_id: card.dataset.productId,
            position: index + 1
          });
        });
      }

      // Focus tracking (keyboard nav)
      card.addEventListener('focusin', () => {
        trackEvent('product_card_focus', {
          product_id: card.dataset.productId,
          position: index + 1
        });
      });
    });

  };  // end initHoverEffects

  const initInteractionTracking = () => {
    // Card click tracking (excluding buttons)
    cards.forEach((card, index) => {
      card.addEventListener('click', (e) => {
        // Ignore clicks on buttons
        if (e.target.closest('button, a')) return;
        
        trackEvent('product_card_click', {
          product_id: card.dataset.productId,
          position: index + 1,
          ab_variant: card.dataset.abVariant || 'control'
        });
      });
    });

  };  // end initInteractionTracking

  const trackEvent = (eventName, data) => {
    const payload = {
      event: eventName,
      section: 'featured_products',
      tab: window.FeaturedTabs?.getActiveTab?.() || 'favorites',
      timestamp: Date.now(),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      ...data
    };

    if (window.dataLayer) window.dataLayer.push(payload);
    if (window.gtag) window.gtag('event', eventName, payload);
    console.log('[FeaturedMicro] Track:', payload);
  };

  const handleResize = () => {
    const wasParallax = parallaxEnabled;
    parallaxEnabled = !reducedMotion && window.innerWidth >= 768;

    if (wasParallax && !parallaxEnabled) disableParallax();
    else if (!wasParallax && parallaxEnabled) enableParallax();
  };

  const debounce = (fn, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  };

  const cleanup = () => {
    disableParallax();
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  };

  return { init, cleanup };
})();

// Initialize FeaturedMicro on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FeaturedMicro.init);
} else {
  FeaturedMicro.init();
}

// Export
window.FeaturedMicro = FeaturedMicro;

// ============================================================
// FEATURED PRODUCTS RENDERER — Dynamic JSON-driven rendering
// Loads config + products, renders all tabs, API-ready
// ============================================================
const FeaturedProductsRenderer = (() => {
  let config = null;
  let products = null;
  let productMap = null;
  let isLoaded = false;
  let renderPromise = null;

  const CONFIG_URL = '/data/featured-config.json';
  const PRODUCTS_URL = '/data/products.json';

  // Default fallback data if JSON fails
  const FALLBACK_CONFIG = {
    tabs: [
      { id: 'favorites', label: 'Naši Favoriti', description: 'Izabrali smo najbolje za vas', products: [] },
      { id: 'bestsellers', label: 'Bestsellery', description: 'Najprodavaniji proizvodi', products: [] },
      { id: 'new', label: 'Novo u Ponudi', description: 'Najnoviji dodaci', products: [] }
    ],
    settings: { cardsPerPage: 8, staggerDelay: 50 }
  };

  const FALLBACK_PRODUCTS = [];

  // Main entry point - call on DOM ready
  const init = async () => {
    if (renderPromise) return renderPromise;
    
    renderPromise = (async () => {
      try {
        await loadData();
        renderAllTabs();
        enhanceExistingCards();
        setupMutationObserver();
        isLoaded = true;
        console.log('[FeaturedProductsRenderer] Initialized', { tabs: config.tabs.length, products: products.length });
      } catch (error) {
        console.error('[FeaturedProductsRenderer] Init failed:', error);
        // Try to use server-rendered cards as fallback
        enhanceExistingCards();
      }
    })();
    
    return renderPromise;
  };

  // Load both config and products in parallel
  const loadData = async () => {
    const [configRes, productsRes] = await Promise.all([
      fetch(CONFIG_URL, { credentials: 'same-origin' }).catch(() => null),
      fetch(PRODUCTS_URL, { credentials: 'same-origin' }).catch(() => null)
    ]);

    if (configRes?.ok) {
      config = await configRes.json();
    } else {
      console.warn('[FeaturedProductsRenderer] Config load failed, using fallback');
      config = FALLBACK_CONFIG;
    }

    if (productsRes?.ok) {
      const data = await productsRes.json();
      products = data.products || data || [];
    } else {
      console.warn('[FeaturedProductsRenderer] Products load failed, using fallback');
      products = FALLBACK_PRODUCTS;
    }

    // Build product lookup map
    productMap = new Map(products.map(p => [p.id, p]));
  };

  // Render all tab panels from config
  const renderAllTabs = () => {
    if (!config?.tabs?.length) return;

    config.tabs.forEach(tabConfig => {
      const panel = document.getElementById(`panel-${tabConfig.id}`);
      if (!panel) return;

      const grid = panel.querySelector('.product-grid');
      if (!grid) return;

      // Skip if already rendered (server-side)
      if (grid.children.length > 0 && grid.dataset.rendered === 'true') return;

      const tabProducts = resolveProducts(tabConfig.products);
      grid.innerHTML = renderProductCards(tabProducts, tabConfig.id);
      grid.dataset.rendered = 'true';
      grid.dataset.tab = tabConfig.id;
    });

    // Update tab labels/descriptions from config
    updateTabMetadata();
  };

  // Resolve product references to full product objects
  const resolveProducts = (productRefs) => {
    return productRefs
      .map(ref => {
        const product = productMap.get(ref.id);
        if (!product) return null;
        
        const variant = product.variants?.[ref.variant] || product.variants?.[0] || 
                       { color: product.colors?.[0]?.name, size: product.sizes?.[0]?.size, 
                         price: product.price, image: product.images?.main };
        
        return { ...product, selectedVariant: variant, ref };
      })
      .filter(Boolean)
      .slice(0, config?.settings?.cardsPerPage || 8);
  };

  // Render product cards HTML
  const renderProductCards = (tabProducts, tabId) => {
    return tabProducts.map((product, index) => {
      const variant = product.selectedVariant;
      const salePrice = product.salePrice && product.salePrice < product.price ? product.salePrice : null;
      const hasSale = !!salePrice;
      const displayPrice = salePrice || variant?.price || product.price;
      const originalPrice = hasSale ? product.price : null;
      const badge = getProductBadge(product, tabId);
      const installmentPrice = Math.ceil(displayPrice / 3);
      const delay = (config?.settings?.staggerDelay || 50) * (index + 1);
      const abVariant = product.ref?.abVariant || 'control';

      return `
        <article class="product-card animate-reveal" 
                 data-product-id="${product.id}" 
                 data-ab-variant="${abVariant}" 
                 style="animation-delay: ${delay}ms;" 
                 role="listitem">
          <div class="product-card__media">
            <picture>
              <source type="image/avif" srcset="${variant?.image?.replace('.jpg', '.avif') || product.images?.main?.replace('.jpg', '.avif') || '/images/placeholder.avif'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <source type="image/webp" srcset="${variant?.image?.replace('.jpg', '.svg') || product.images?.main?.replace('.jpg', '.svg') || '/images/placeholder.svg'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <div class="lqip-wrapper" style="aspect-ratio: 1;">
      <img 
        class="lqip-placeholder" 
        src="${generateLQIP(variant?.image || product.images?.main || '/images/placeholder.jpg')}" 
        alt="" 
        aria-hidden="true"
        style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(8px); transform: scale(1.1); transition: opacity 0.3s ease;"
      >
      <img 
        class="product-card__image" 
        src="${variant?.image || product.images?.main || '/images/placeholder.jpg'}" 
        alt="${escapeHtml(product.altText || product.name)}" 
        loading="lazy" width="400" height="400" decoding="async"
        style="background: ${getDominantColor(product)};"
        onload="this.style.opacity=1; this.previousElementSibling.style.opacity=0;"
      >
    </div>
            </picture>
            <div class="product-card__parallax-overlay"></div>
            ${badge ? `<div class="product-card__badges"><span class="badge badge-${badge.class}">${badge.label}</span></div>` : ''}
            <button class="product-card__wishlist" data-action="wishlist" data-product-id="${product.id}" aria-label="${escapeHtml("Dodaj " + product.name + " na listu želja")}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button class="product-card__quick-add" data-action="quick-add" data-product-id="${product.id}" data-variant-id="${product.id}-${variant?.color}-${variant?.size}" aria-label="${escapeHtml("Brzo dodaj " + product.name + " u korpu")}">Dodaj u korpu</button>
            <span class="product-card__ripple" aria-hidden="true"></span>
          </div>
          <div class="product-card__content">
            <span class="product-card__category">${escapeHtml(product.category || 'Garderoba')}</span>
            <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
            <div class="product-card__rating">
              <span class="product-card__stars">${'★'.repeat(Math.floor(product.rating || 4.5))}${'☆'.repeat(5 - Math.floor(product.rating || 4.5))}</span>
              <span>(${product.reviews || 0})</span>
            </div>
            <div class="product-card__price-row">
              <span class="product-card__price" data-price="${displayPrice}">${formatPrice(displayPrice)}</span>
              ${hasSale ? `<span class="product-card__old-price">${formatPrice(originalPrice)}</span>` : ''}
            </div>
            <p class="product-card__installment">ili ${installmentPrice.I18n.formatNumber} RSD x 3 rate bez kamate</p>
          </div>
        </article>
      `;
  });

  };  // end renderProductCards

  // Determine badge for product based on tab and product data
  const getProductBadge = (product, tabId) => {
    if (product.badge) {
      const badgeMap = { bestseller: 'warning', new: 'primary', sale: 'accent', hot: 'accent' };
      return { class: badgeMap[product.badge] || 'primary', label: product.badge === 'bestseller' ? 'Bestseller' : product.badge === 'new' ? 'Novo' : 'Akcija' };
    }
    // Tab-specific badges
    if (tabId === 'bestsellers') return { class: 'warning', label: 'Bestseller' };
    if (tabId === 'new') return { class: 'primary', label: 'Novo' };
    if (tabId === 'favorites' && product.featured) return { class: 'accent', label: 'Hit' };
    return null;
  };

  // Get dominant color for LQIP background
  const getDominantColor = (product) => {
    const colorMap = {
      'muski': '#1a1a2e', 'zenski': '#ec4899', 'dukseri': '#16a34a',
      'bestseller': '#f59e0b', 'trenerke': '#2563eb', 'majice': '#f5f5f5',
      'aksesoari': '#808080', 'merch': '#f59e0b'
    };
    return colorMap[product.category?.toLowerCase()] || colorMap[product.gender?.toLowerCase()] || '#1a1a2e';
  };

  // Format price with RSD
  const formatPrice = (num) => {
    try {
      return new Intl.NumberFormat('sr-RS').format(num) + ' RSD';
    } catch {
      return I18n.formatCurrency(num);
    }
  };

  // Escape HTML for safety
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  };

  // Update tab buttons metadata from config
  const updateTabMetadata = () => {
    const tabsContainer = $('#featuredTabs');
    if (!tabsContainer || !config?.tabs) return;

    config.tabs.forEach(tabConfig => {
      const btn = tabsContainer.querySelector(`[data-tab="${tabConfig.id}"]`);
      if (btn) {
        btn.textContent = tabConfig.label;
        btn.setAttribute('title', tabConfig.description);
      }
    });

    // Update section subtitle
    const activeTab = config.tabs.find(t => t.id === 'favorites') || config.tabs[0];
    const subtitle = document.querySelector('#featured .section-subtitle');
    if (subtitle && activeTab) {
      subtitle.textContent = activeTab.description;
    }
  };

  // Enhance existing server-rendered cards with dynamic data
  const enhanceExistingCards = () => {
    $$('.product-card[data-product-id]', document).forEach(card => {
      const productId = parseInt(card.dataset.productId, 10);
      const product = productMap?.get(productId);
      if (!product) return;

      // Update price with data-price attribute for animation
      const priceEl = card.querySelector('.product-card__price');
      const displayPrice = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;
      if (priceEl && !priceEl.dataset.price) {
        priceEl.dataset.price = displayPrice;
      }

      // Update installment price
      const installmentEl = card.querySelector('.product-card__installment');
      if (installmentEl) {
        installmentEl.textContent = `ili ${Math.ceil(displayPrice / 3).I18n.formatNumber} RSD x 3 rate bez kamate`;
      }
  });

  };  // end enhanceExistingCards

  // Watch for dynamically added cards (e.g., tab switch)
  const setupMutationObserver = () => {
    const tabPanels = document.getElementById('tabPanels');
    if (!tabPanels) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.matches?.('.product-card')) {
              enhanceExistingCards();
            }
          });
        }
      });
    });

    observer.observe(tabPanels, { childList: true, subtree: true });
  };

  // Public API for external use
  const refresh = async () => {
    isLoaded = false;
    renderPromise = null;
    await init();
  };

  const getConfig = () => config;
  const getProducts = () => products;
  const getProduct = (id) => productMap?.get(id);

  return { init, refresh, getConfig, getProducts, getProduct, isLoaded: () => isLoaded };
})();

// Initialize FeaturedProductsRenderer on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FeaturedProductsRenderer.init);
} else {
  FeaturedProductsRenderer.init();
}

// Export
window.FeaturedProductsRenderer = FeaturedProductsRenderer;

// ============================================================
// FEATURED PRODUCTS KEYBOARD/ARIA MODULE
// Roving tabindex, focus management, live regions, screen reader support
// ============================================================
const FeaturedKeyboard = (() => {
  let sectionEl = null;
  let tabsContainer = null;
  let tabPanels = null;
  let liveRegion = null;
  let activeTab = 'favorites';
  let lastFocusedElement = null;
  let reducedMotion = false;

  const GRID_NAV_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
  const TAB_NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

  const init = () => {
    sectionEl = $('#featured');
    if (!sectionEl) return;

    tabsContainer = $('#featuredTabs');
    tabPanels = $('#tabPanels');
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create live region for screen reader announcements
    createLiveRegion();

    // Initialize roving tabindex for all grids
    initRovingTabindex();

    // Initialize focus management
    initFocusManagement();

    // Initialize keyboard navigation
    initKeyboardNav();

    // Initialize focus trap for tab panels
    initFocusTrap();

    // Listen for tab changes from FeaturedTabs
    initTabChangeListener();

    // Reduced motion listener
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', (e) => {
      reducedMotion = e.matches;
    });

    console.log('[FeaturedKeyboard] Initialized');
  };

  const createLiveRegion = () => {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;';
    liveRegion.id = 'featured-live-region';
    sectionEl.insertBefore(liveRegion, sectionEl.firstChild);
  };

  const announce = (message) => {
    if (liveRegion) {
      liveRegion.textContent = '';
      liveRegion.offsetHeight;
      liveRegion.textContent = message;
    }
  };

  const initRovingTabindex = () => {
    if (!tabPanels) return;

    const panels = $$('.tab-panel', tabPanels);
    panels.forEach(panel => {
      const grid = panel.querySelector('.product-grid');
      if (!grid) return;

      const cards = $$('.product-card', grid);
      cards.forEach((card, index) => {
        card.setAttribute('tabindex', index === 0 ? '0' : '-1');
        card.setAttribute('role', 'listitem');
      });

      grid.setAttribute('role', 'list');
      grid.setAttribute('aria-label', panel.getAttribute('aria-label') || 'Proizvodi');
    });

  };  // end initRovingTabindex

  const updateRovingTabindex = (grid, activeIndex) => {
    const cards = $$('.product-card', grid);
    cards.forEach((card, index) => {
      card.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
    });

  };  // end updateRovingTabindex

  const getActiveGrid = () => {
    const activePanel = tabPanels?.querySelector('.tab-panel.active');
    return activePanel?.querySelector('.product-grid');
  };

  const getActiveCards = () => {
    const grid = getActiveGrid();
    return grid ? $$('.product-card', grid) : [];
  };

  const getGridDimensions = (grid) => {
    if (!grid) return { cols: 1, rows: 1 };
    const style = window.getComputedStyle(grid);
    const cols = parseInt(style.gridTemplateColumns?.split(' ').length) || 1;
    const cards = $$('.product-card', grid);
    const rows = Math.ceil(cards.length / cols);
    return { cols, rows, total: cards.length };
  };

  const initFocusManagement = () => {
    // Focus first card when tab becomes active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const panel = mutation.target;
          if (panel.classList.contains('tab-panel') && panel.classList.contains('active')) {
            setTimeout(() => {
              focusFirstCard(panel);
            }, reducedMotion ? 0 : 150);
          }
        }
      });
    });

    $$('.tab-panel', tabPanels).forEach(panel => {
      observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
    });

    // Also focus first card on initial load
    const initialActive = tabPanels?.querySelector('.tab-panel.active');
    if (initialActive) {
      setTimeout(() => focusFirstCard(initialActive), reducedMotion ? 0 : 150);
    }
  };

  const focusFirstCard = (panel) => {
    const grid = panel?.querySelector('.product-grid');
    if (!grid) return;

    const firstCard = grid.querySelector('.product-card[tabindex="0"]') || grid.querySelector('.product-card');
    if (firstCard) {
      firstCard.focus({ preventScroll: true });
      lastFocusedElement = firstCard;
    }
  };

  const initKeyboardNav = () => {
    // Grid navigation within active panel
    tabPanels?.addEventListener('keydown', (e) => {
      if (!GRID_NAV_KEYS.includes(e.key)) return;
      
      const grid = getActiveGrid();
      if (!grid) return;
      
      const cards = getActiveCards();
      if (cards.length === 0) return;

      const focusedCard = grid.querySelector('.product-card:focus, .product-card:focus-within');
      if (!focusedCard) return;

      const currentIndex = Array.from(cards).indexOf(focusedCard);
      if (currentIndex === -1) return;

      const { cols, rows, total } = getGridDimensions(grid);
      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = Math.min(currentIndex + 1, total - 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = Math.min(currentIndex + cols, total - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = Math.max(currentIndex - cols, 0);
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = total - 1;
          break;
        case 'PageDown':
          e.preventDefault();
          nextIndex = Math.min(currentIndex + cols * 2, total - 1);
          break;
        case 'PageUp':
          e.preventDefault();
          nextIndex = Math.max(currentIndex - cols * 2, 0);
          break;
      }

      if (nextIndex !== currentIndex) {
        const nextCard = cards[nextIndex];
        nextCard.focus({ preventScroll: true });
        updateRovingTabindex(grid, nextIndex);
        lastFocusedElement = nextCard;
      }
    });

    // Tab buttons navigation (enhance existing)
    tabsContainer?.addEventListener('keydown', (e) => {
      if (!TAB_NAV_KEYS.includes(e.key)) return;
      
      const tabs = $$('.tab-btn', tabsContainer);
      const focusedTab = tabsContainer.querySelector('.tab-btn:focus, .tab-btn[aria-selected="true"]');
      if (!focusedTab) return;

      const currentIndex = tabs.findIndex(btn => btn === focusedTab);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
      }

      if (nextIndex !== currentIndex) {
        tabs[nextIndex].focus();
      }
    });

  };  // end initKeyboardNav

  const initFocusTrap = () => {
    tabPanels?.addEventListener('focusin', (e) => {
      const panel = e.target.closest('.tab-panel');
      if (panel && panel.classList.contains('active')) {
        lastFocusedElement = e.target;
      }
    });

    tabPanels?.addEventListener('focusout', (e) => {
      const panel = e.target.closest('.tab-panel');
      if (panel && panel.classList.contains('active')) {
        lastFocusedElement = e.relatedTarget?.closest('.product-card') || lastFocusedElement;
      }
    });

  };  // end initFocusTrap

  const initTabChangeListener = () => {
    // Listen for tab changes from FeaturedTabs
    if (window.FeaturedTabs) {
      const originalActivateTab = window.FeaturedTabs.activateTab;
      if (originalActivateTab) {
        window.FeaturedTabs.activateTab = function(tabId, pushHistory = true) {
          const previousTab = this.getActiveTab?.() || activeTab;
          const result = originalActivateTab.call(this, tabId, pushHistory);
          
          if (result && tabId !== previousTab) {
            activeTab = tabId;
            announceTabChange(tabId);
            
            const panel = document.getElementById(`panel-${tabId}`);
            if (panel) {
              setTimeout(() => focusFirstCard(panel), reducedMotion ? 0 : 150);
            }
          }
          
          return result;
        };
      }
    }
  };

  const announceTabChange = (tabId) => {
    const tabConfig = {
      favorites: 'Na\u0161i Favoriti, prikazano 8 proizvoda',
      bestsellers: 'Bestsellery, prikazano 8 najprodavanijih proizvoda',
      new: 'Novo u Ponudi, prikazano 8 najnovijih proizvoda'
    };
    announce(tabConfig[tabId] || `Preba\u010deno na tab ${tabId}`);
  };

  // Public API
  const focusLastKnown = () => {
    if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
      lastFocusedElement.focus({ preventScroll: true });
    } else {
      focusFirstCard(tabPanels?.querySelector('.tab-panel.active'));
    }
  };

  const cleanup = () => {
    if (liveRegion && liveRegion.parentNode) {
      liveRegion.parentNode.removeChild(liveRegion);
    }
  };

  return { init, announce, focusLastKnown, cleanup };
})();

// Initialize FeaturedKeyboard on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FeaturedKeyboard.init);
} else {
  FeaturedKeyboard.init();
}

// Export
window.FeaturedKeyboard = FeaturedKeyboard;

// ============================================================
// FILTER PANEL MODULE - Faceted search, URL sync, real-time filtering
// ============================================================
const FilterPanel = (() => {
  let drawerEl = null;
  let panelEl = null;
  let formEl = null;
  let chipsBarEl = null;
  let resultsCountEl = null;
  let filterBtnEl = null;
  let filterCountEl = null;
  let activeFacets = new Map(); // facetName -> Set(values)
  let products = [];
  let filteredProducts = [];
  let reducedMotion = false;
  let isDesktop = false;
  let debounceTimer = null;
  let currentSort = 'featured';
  let currentPage = 1;
  const PAGE_SIZE = 24;

  // Facet definitions with metadata
  const FACETS = {
    category: { label: 'Kategorija', type: 'checkbox', multi: true },
    gender: { label: 'Pol', type: 'checkbox', multi: true },
    price: { label: 'Cena', type: 'range', multi: false },
    color: { label: 'Boja', type: 'color', multi: true },
    size: { label: 'Veličina', type: 'checkbox', multi: true },
    badge: { label: 'Oznake', type: 'checkbox', multi: true }
  };

  const init = async () => {
    drawerEl = $('#filterDrawer');
    if (!drawerEl) return;

    panelEl = $('.filter-panel', drawerEl);
    formEl = $('#filterForm');
    chipsBarEl = $('#filterChipsBar');
    resultsCountEl = $('#filterResultsCount');
    filterBtnEl = $('#filterBtn');
    filterCountEl = $('#filterCount');

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isDesktop = window.innerWidth >= 1024;

    // Load products data
    await loadProducts();

    // Restore filters from URL
    restoreFiltersFromURL();

    // Initialize UI
    initFacetToggles();
    initPriceSlider();
    initFormHandlers();
    initChipsBar();
    initFilterButton();
    initDrawerIntegration();
    initResizeHandler();

    // Initial filter application
    applyFilters();

    console.log('[FilterPanel] Initialized', { products: products.length, facets: Object.keys(FACETS).length });
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/data/products.json', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        products = data.products || data || [];
        // Ensure each product has required fields
        products.forEach(p => {
          p.price = p.price || 0;
          p.salePrice = p.salePrice || null;
          p.category = p.category || 'bestseller';
          p.gender = p.gender || 'unisex';
          p.colors = p.colors || [];
          p.sizes = p.sizes || [];
          p.badge = p.badge || null;
        });
      }
    } catch (e) {
      console.warn('[FilterPanel] Failed to load products:', e);
      products = [];
    }
  };

  const restoreFiltersFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    
    // Parse each facet from URL
    Object.keys(FACETS).forEach(facet => {
      const values = params.getAll(facet);
      if (values.length > 0) {
        activeFacets.set(facet, new Set(values));
        // Check checkboxes
        values.forEach(val => {
          const checkbox = formEl?.querySelector(`input[name="${facet}"][value="${val}"]`);
          if (checkbox) checkbox.checked = true;
        });
      }
    });

    // Price range
    const priceMin = params.get('priceMin');
    const priceMax = params.get('priceMax');
    if (priceMin) {
      activeFacets.set('price', new Set([`${priceMin}-${priceMax || '10000'}`]));
      const minInput = formEl?.querySelector('#priceMin');
      const maxInput = formEl?.querySelector('#priceMax');
      if (minInput) minInput.value = priceMin;
      if (maxInput) maxInput.value = priceMax || '10000';
      updatePriceSlider(priceMin, priceMax || '10000');
    }

    // Sort
    const sort = params.get('sort');
    if (sort) {
      currentSort = sort;
      const sortSelect = document.querySelector('#sortSelect');
      if (sortSelect) sortSelect.value = sort;
    }

    // Update UI
    updateChipsBar();
    updateFilterCount();
    updateFacetToggles();
  };

  const initFacetToggles = () => {
    $$('.filter-facet__toggle', formEl).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const facet = btn.dataset.facetToggle;
        const options = $('#facet-' + facet);
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        
        btn.setAttribute('aria-expanded', !isExpanded);
        options?.classList.toggle('hidden', isExpanded);
        
        // Analytics
        trackEvent('filter_facet_toggle', { facet, expanded: !isExpanded });
      });
    });

  };  // end

  const updateFacetToggles = () => {
    $$('.filter-facet__toggle', formEl).forEach(btn => {
      const facet = btn.dataset.facetToggle;
      const options = $('#facet-' + facet);
      const hasActive = activeFacets.has(facet) && activeFacets.get(facet).size > 0;
      // Could add visual indicator for active facets
    });

  };  // end

  const initPriceSlider = () => {
    const slider = $('.filter-price-slider', formEl);
    const minThumb = $('.filter-price-slider__thumb[data-thumb="min"]', slider);
    const maxThumb = $('.filter-price-slider__thumb[data-thumb="max"]', slider);
    const range = $('.filter-price-slider__range', slider);
    const minInput = $('#priceMin', formEl);
    const maxInput = $('#priceMax', formEl);

    if (!slider || !minThumb || !maxThumb) return;

    let activeThumb = null;

    const updateSlider = () => {
      const min = parseInt(minInput.value) || 0;
      const max = parseInt(maxInput.value) || 10000;
      const minPct = (min / 10000) * 100;
      const maxPct = (max / 10000) * 100;
      
      minThumb.style.left = `${minPct}%`;
      maxThumb.style.left = `${maxPct}%`;
      range.style.left = `${minPct}%`;
      range.style.right = `${100 - maxPct}%`;
    };

    const startDrag = (e, thumb) => {
      activeThumb = thumb;
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      e.preventDefault();
    };

    const onDrag = (e) => {
      if (!activeThumb) return;
      
      const rect = slider.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const value = Math.round((pct / 100) * 10000);
      
      if (activeThumb === minThumb) {
        const maxVal = parseInt(maxInput.value) || 10000;
        minInput.value = Math.min(value, maxVal - 100);
      } else {
        const minVal = parseInt(minInput.value) || 0;
        maxInput.value = Math.max(value, minVal + 100);
      }
      
      updateSlider();
      updatePriceInputs();
    };

    const stopDrag = () => {
      activeThumb = null;
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      applyFilters();
    };

    minThumb.addEventListener('mousedown', (e) => startDrag(e, minThumb));
    maxThumb.addEventListener('mousedown', (e) => startDrag(e, maxThumb));

    // Touch support
    minThumb.addEventListener('touchstart', (e) => startDrag(e, minThumb), { passive: true });
    maxThumb.addEventListener('touchstart', (e) => startDrag(e, maxThumb), { passive: true });

    // Input sync
    [minInput, maxInput].forEach(input => {
      input.addEventListener('input', () => {
        updateSlider();
        updatePriceInputs();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 300);
      });
      input.addEventListener('change', applyFilters);
    });

    // Price presets
    $$('.filter-price-preset', formEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const min = parseInt(btn.dataset.min);
        const max = parseInt(btn.dataset.max);
        minInput.value = min;
        maxInput.value = max;
        updateSlider();
        updatePriceInputs();
        applyFilters();
        
        // Update active state
        $$('.filter-price-preset', formEl).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    updateSlider();
  };

  const updatePriceInputs = () => {
    const minInput = $('#priceMin', formEl);
    const maxInput = $('#priceMax', formEl);
    const slider = $('.filter-price-slider', formEl);
    const minThumb = $('.filter-price-slider__thumb[data-thumb="min"]', slider);
    const maxThumb = $('.filter-price-slider__thumb[data-thumb="max"]', slider);
    const range = $('.filter-price-slider__range', slider);

    if (!minInput || !maxInput) return;

    const min = parseInt(minInput.value) || 0;
    const max = parseInt(maxInput.value) || 10000;
    const minPct = (min / 10000) * 100;
    const maxPct = (max / 10000) * 100;

    if (minThumb) minThumb.style.left = `${minPct}%`;
    if (maxThumb) maxThumb.style.left = `${maxPct}%`;
    const rangeEl = $('.filter-price-slider__range', formEl);
    if (rangeEl) {
      rangeEl.style.left = `${minPct}%`;
      rangeEl.style.right = `${100 - maxPct}%`;
    }
  };

  const updatePriceSlider = (min, max) => {
    const minInput = $('#priceMin', formEl);
    const maxInput = $('#priceMax', formEl);
    if (minInput) minInput.value = min;
    if (maxInput) maxInput.value = max;
    updatePriceInputs();
  };

  const initFormHandlers = () => {
    // Checkbox changes
    $$('input[type="checkbox"]', formEl).forEach(cb => {
      cb.addEventListener('change', () => {
        const facet = cb.name;
        const value = cb.value;
        
        if (!activeFacets.has(facet)) activeFacets.set(facet, new Set());
        
        if (cb.checked) {
          activeFacets.get(facet).add(value);
        } else {
          activeFacets.get(facet).delete(value);
          if (activeFacets.get(facet).size === 0) {
            activeFacets.delete(facet);
          }
        }

        updateChipsBar();
        updateFilterCount();
        updateURL();
        
        // Debounced apply for checkboxes
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 150);
        
        trackEvent('filter_facet_change', { facet, value, checked: cb.checked });
      });
    });

    // Clear all filters
    $('#clearFiltersBtn', formEl)?.addEventListener('click', clearAllFilters);
    $('#resetFiltersBtn', formEl)?.addEventListener('click', clearAllFilters);

    // Apply button
    formEl?.addEventListener('submit', (e) => {
      e.preventDefault();
      applyFilters();
    });

    // Apply on Enter in price inputs
    $$('#priceMin, #priceMax', formEl).forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyFilters();
        }
      });
    });

    // Sort dropdown
    const sortSelect = $('#sortSelect', formEl);
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        updateURL();
        applyFilters();
        trackEvent('filter_sort_change', { sort: currentSort });
      });
      
      // Restore sort from URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlSort = urlParams.get('sort');
      if (urlSort && ['featured', 'price-asc', 'price-desc', 'newest', 'rating', 'bestselling'].includes(urlSort)) {
        currentSort = urlSort;
        sortSelect.value = currentSort;
      }
    }

    // Filter Presets
    const presetSelect = $('#presetSelect', formEl);
    const savePresetBtn = $('#savePresetBtn', formEl);
    const loadPresetBtn = $('#loadPresetBtn', formEl);
    const deletePresetBtn = $('#deletePresetBtn', formEl);
    const PRESET_STORAGE_KEY = 'dalli_filter_presets';

    const loadPresets = () => {
      try {
        const stored = localStorage.getItem('dalli_filter_presets');
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        console.warn('[FilterPanel] Failed to load presets:', e);
        return {};
      }
    };

    const savePresets = (presets) => {
      try {
        localStorage.setItem('dalli_filter_presets', JSON.stringify(presets));
      } catch (e) {
        console.warn('[FilterPanel] Failed to save presets:', e);
      }
    };

    const renderPresets = () => {
      if (!presetSelect) return;
      const presets = loadPresets();
      const currentValue = presetSelect.value;
      
      presetSelect.innerHTML = '<option value="">-- Izaberi preset --</option>';
      Object.keys(presets).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        presetSelect.appendChild(option);
      });
      
      if (presets[currentValue]) {
        presetSelect.value = currentValue;
      }
      
      const hasPresets = Object.keys(presets).length > 0;
      if (loadPresetBtn) loadPresetBtn.style.display = hasPresets ? 'inline-flex' : 'none';
      if (deletePresetBtn) deletePresetBtn.style.display = hasPresets ? 'inline-flex' : 'none';
      presetSelect.disabled = !hasPresets;
    };

    // Save preset
    if (savePresetBtn) {
      savePresetBtn.addEventListener('click', () => {
        const name = prompt('Unesite ime za preset:');
        if (!name || !name.trim()) return;
        
        const presets = loadPresets();
        if (presets[name.trim()]) {
          if (!confirm(`Preset "${name.trim()}" već postoji. Prepisati?`)) return;
        }
        
        // Save current filter state
        const currentFilters = {};
        activeFacets.forEach((values, facet) => {
          if (values.size > 0) currentFilters[facet] = Array.from(values);
        });
        
        if (activeFacets.has('price')) {
          const range = Array.from(activeFacets.get('price'))[0];
          currentFilters.price = range;
        }
        currentFilters.sort = currentSort;
        
        presets[name.trim()] = currentFilters;
        savePresets(presets);
        renderPresets();
        trackEvent('filter_preset_save', { name: name.trim() });
      });
    }

    // Load preset
    if (loadPresetBtn) {
      loadPresetBtn.addEventListener('click', () => {
        const name = presetSelect.value;
        if (!name) return;
        
        const presets = loadPresets();
        const preset = presets[name];
        if (!preset) return;
        
        // Apply preset filters
        activeFacets.clear();
        Object.entries(preset).forEach(([key, values]) => {
          if (key === 'price') {
            activeFacets.set('price', new Set([values]));
          } else if (key === 'sort') {
            currentSort = values;
          } else if (Array.isArray(values) && values.length > 0) {
            activeFacets.set(key, new Set(values));
          }
        });
        
        // Update UI
        $$('input[type="checkbox"]', formEl).forEach(cb => cb.checked = false);
        activeFacets.forEach((values, facet) => {
          values.forEach(v => {
            const cb = formEl.querySelector(`input[name="${facet}"][value="${v}"]`);
            if (cb) cb.checked = true;
          });
        });
        
        // Update price inputs
        if (preset.price) {
          const [min, max] = preset.price.split('-');
          const minInput = $('#priceMin', formEl);
          const maxInput = $('#priceMax', formEl);
          if (minInput) minInput.value = min;
          if (maxInput) maxInput.value = max;
          updatePriceInputs();
        }
        
        // Update sort
        currentSort = preset.sort || 'featured';
        const sortSelect = $('#sortSelect', formEl);
        if (sortSelect) sortSelect.value = currentSort;
        
        // Update price presets active state
        $$('.filter-price-preset', formEl).forEach(b => b.classList.remove('active'));
        
        updateChipsBar();
        updateFilterCount();
        updateURL();
        renderPresets();
        applyFilters();
        
        trackEvent('filter_preset_load', { name });
      });
    }

    // Delete preset
    if (deletePresetBtn) {
      deletePresetBtn.addEventListener('click', () => {
        const name = presetSelect.value;
        if (!name) return;
        if (!confirm(t('common.presetDelete', { name: name }))) return;
        
        const presets = loadPresets();
        delete presets[name];
        savePresets(presets);
        renderPresets();
        trackEvent('filter_preset_delete', { name });
      });
    }

    // Initialize presets
    renderPresets();
  };

  const initChipsBar = () => {
    // Chips bar updates automatically via updateChipsBar
  };

  const updateChipsBar = () => {
    if (!chipsBarEl) return;
    const clearBtn = $('#clearFiltersBtn', formEl);
    if (!clearBtn) return;

    const chips = [];
    activeFacets.forEach((values, facet) => {
      const facetConfig = FACETS[facet];
      values.forEach(value => {
        const label = getFacetValueLabel(facet, value);
        chips.push({ facet, value, label, facetConfig });
      });
    });

    if (chips.length === 0) {
      chipsBarEl.style.display = 'none';
      clearBtn.style.display = 'none';
    } else {
      chipsBarEl.style.display = 'flex';
      clearBtn.style.display = 'block';
      
      chipsBarEl.innerHTML = chips.map(chip => `
        <span class="filter-chip" data-facet="${chip.facet}" data-value="${chip.value}">
          ${escapeHtml(chip.label)}
          <button type="button" class="filter-chip__remove" aria-label="Ukloni ${chip.label}" data-facet="${chip.facet}" data-value="${chip.value}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </span>
      `).join('');

      // Add click handlers for chip removal
      $$('.filter-chip__remove', chipsBarEl).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const facet = btn.dataset.facet;
          const value = btn.dataset.value;
          removeFacetValue(facet, value);
        });
      });
    }
  };

  const removeFacetValue = (facet, value) => {
    if (activeFacets.has(facet)) {
      activeFacets.get(facet).delete(value);
      if (activeFacets.get(facet).size === 0) {
        activeFacets.delete(facet);
      }
    }

    // Uncheck checkbox
    const cb = formEl?.querySelector(`input[name="${facet}"][value="${value}"]`);
    if (cb) cb.checked = false;

    updateChipsBar();
    updateFilterCount();
    updateURL();
    applyFilters();
    
    trackEvent('filter_chip_remove', { facet, value });
  };

  const clearAllFilters = () => {
    activeFacets.clear();
    
    // Uncheck all checkboxes
    $$('input[type="checkbox"]', formEl).forEach(cb => cb.checked = false);
    
    // Reset price
    const minInput = $('#priceMin', formEl);
    const maxInput = $('#priceMax', formEl);
    if (minInput) minInput.value = '0';
    if (maxInput) maxInput.value = '10000';
    updatePriceInputs();

    // Reset price presets
    $$('.filter-price-preset', formEl).forEach(b => b.classList.remove('active'));

    updateChipsBar();
    updateFilterCount();
    updateURL();
    applyFilters();
    
    trackEvent('filter_clear_all', {});
  };

  const applyFilters = () => {
    // Filter products
    filteredProducts = products.filter(product => {
      // Category filter
      if (activeFacets.has('category') && !activeFacets.get('category').has(product.category)) return false;
      
      // Gender filter
      if (activeFacets.has('gender') && !activeFacets.get('gender').has(product.gender)) return false;
      
      // Price filter
      if (activeFacets.has('price')) {
        const priceRange = Array.from(activeFacets.get('price'))[0];
        const [min, max] = priceRange.split('-').map(Number);
        const price = product.salePrice || product.price;
        if (price < min || price > max) return false;
      }
      
      // Color filter
      if (activeFacets.has('color')) {
        const productColors = product.colors?.map(c => c.name?.toLowerCase()) || [];
        const hasColor = Array.from(activeFacets.get('color')).some(c => productColors.includes(c.toLowerCase()));
        if (!hasColor) return false;
      }
      
      // Size filter
      if (activeFacets.has('size')) {
        const productSizes = product.sizes?.map(s => s.size) || [];
        const hasSize = Array.from(activeFacets.get('size')).some(s => productSizes.includes(s));
        if (!hasSize) return false;
      }
      
      // Badge filter
      if (activeFacets.has('badge')) {
        const badge = product.badge || null;
        if (!badge || !activeFacets.get('badge').has(badge)) return false;
      }
      
      return true;
    });

    // Sort
    filteredProducts = sortProducts(filteredProducts, currentSort);

    // Render results
    renderResults();

    // Update count
    updateFilterCount();

    // Analytics
    trackEvent('filter_apply', { 
      activeFacets: Object.fromEntries(activeFacets),
      resultCount: filteredProducts.length 
    });

  };  // end

  const sortProducts = (products, sort) => {
    const sorted = [...products];
    switch (sort) {
      case 'price-asc':
        return sorted.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
      case 'price-desc':
        return sorted.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'bestselling':
      default:
        return sorted.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
    }
  };

  const renderResults = () => {
    // This would integrate with the existing product grid rendering
    // For now, we'll trigger a custom event that the product renderer can listen to
    const event = new CustomEvent('filterResultsUpdated', { 
      detail: { products: filteredProducts, page: 1, total: filteredProducts.length }
    });
    document.dispatchEvent(event);

    // Also update the visible product grids if they exist
    $$('.product-grid[id^="featuredProducts"]').forEach(grid => {
      if (grid.closest('.tab-panel.active')) {
        // Re-render would happen here via the existing renderProductGrid
        // For now, we'll just update the count
      }
    });

  };  // end

  const updateFilterCount = () => {
    const count = filteredProducts.length || products.length;
    if (resultsCountEl) resultsCountEl.textContent = count;
    if (filterCountEl) {
      filterCountEl.textContent = getTotalActiveFilters();
      filterCountEl.style.display = getTotalActiveFilters() > 0 ? 'flex' : 'none';
    }
    if (filterBtnEl) {
      filterBtnEl.setAttribute('aria-expanded', getTotalActiveFilters() > 0 ? 'true' : 'false');
    }
  };

  const getTotalActiveFilters = () => {
    let count = 0;
    activeFacets.forEach(values => count += values.size);
    return count;
  };

  const getFacetValueLabel = (facet, value) => {
    const facetConfig = FACETS[facet];
    if (facet === 'price') {
      const [min, max] = value.split('-').map(Number);
      if (min === 0 && max >= 10000) return 'Sve cene';
      if (max >= 10000) return `${min.I18n.formatNumber}+ RSD`;
      return `${min.I18n.formatNumber} - ${max.I18n.formatNumber} RSD`;
    }
    if (facet === 'color') {
      const colorNames = { crna: 'Crna', bela: 'Bela', siva: 'Siva', plava: 'Plava', crvena: 'Crvena', zelena: 'Zelena', braon: 'Braon', roza: 'Roza' };
      return colorNames[value] || value;
    }
    if (facet === 'badge') {
      const badgeNames = { bestseller: 'Bestseller', new: 'Novo', sale: 'Akcija', hot: 'Hit' };
      return badgeNames[value] || value;
    }
    return value;
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    
    activeFacets.forEach((values, facet) => {
      if (facet !== 'price') {
        values.forEach(v => params.append(facet, v));
      }
    });
    
    // Price range
    if (activeFacets.has('price')) {
      const range = Array.from(activeFacets.get('price'))[0];
      const [min, max] = range.split('-');
      if (min !== '0') params.set('priceMin', min);
      if (max !== '10000') params.set('priceMax', max);
    }
    
    if (currentSort !== 'featured') params.set('sort', currentSort);
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  const initFilterButton = () => {
    if (!filterBtnEl) return;
    
    filterBtnEl.addEventListener('click', () => {
      if (drawerEl) {
        drawerEl.classList.toggle('open');
        const isOpen = drawerEl.classList.contains('open');
        filterBtnEl.setAttribute('aria-expanded', isOpen);
        
        if (isOpen) {
          document.body.style.overflow = 'hidden';
          // Focus first focusable
          setTimeout(() => {
            const focusable = drawerEl.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            focusable?.focus();
          }, 50);
        } else {
          document.body.style.overflow = '';
        }
      }
    });

  };  // end

  const initDrawerIntegration = () => {
    // Integrate with existing drawer system
    const originalOpenDrawer = window.openDrawer;
    const originalCloseDrawer = window.closeDrawer;
    
    // Close filter drawer when other drawers open
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="search"], [data-action="menu"], [data-action="cart"], [data-action="user-menu"]')) {
        closeFilterDrawer();
      }
    });

  };  // end

  const closeFilterDrawer = () => {
    if (drawerEl && drawerEl.classList.contains('open')) {
      drawerEl.classList.remove('open');
      if (filterBtnEl) filterBtnEl.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  };

  const initResizeHandler = () => {
    window.addEventListener('resize', debounce(() => {
      isDesktop = window.innerWidth >= 1024;
    }, 150));
  };

  const debounce = (fn, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  };

  const trackEvent = (eventName, data) => {
    const payload = {
      event: eventName,
      section: 'filter_panel',
      timestamp: Date.now(),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      ...data
    };
    if (window.dataLayer) window.dataLayer.push(payload);
    if (window.gtag) window.gtag('event', eventName, payload);
    console.log('[FilterPanel] Track:', payload);
  };

  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  };

  // Public API
  const getFilteredProducts = () => filteredProducts;
  const getActiveFacets = () => Object.fromEntries(activeFacets);
  const setFilters = (facets) => {
    activeFacets.clear();
    Object.entries(facets).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        activeFacets.set(key, new Set(values));
      }
    });
    updateChipsBar();
    updateFilterCount();
    updateURL();
    applyFilters();
  };

  return { init, getFilteredProducts, getActiveFacets, setFilters, close: closeFilterDrawer };
})();

// Initialize FilterPanel on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FilterPanel.init);
} else {
  FilterPanel.init();
}

// Export
window.FilterPanel = FilterPanel;

// ============================================================
// PRODUCT HELPERS (Global)
// ============================================================
const getProductCategory = (productId) => {
  const products = state.products.get();
  const product = products.find(p => p.id === productId);
  return product?.category || 'unknown';
};

const getProductById = (productId) => {
  const products = state.products.get();
  return products.find(p => p.id === productId);
};

const getProductByVariantId = (variantId) => {
  const products = state.products.get();
  for (const p of products) {
    const variant = p.variants?.find(v => `${p.id}-${v.color}-${v.size}` === variantId);
    if (variant) return p;
  }
  return null;
};

// ============================================================
// VIEW TRACKING MODULE
// Tracks product views with debounce, min duration, batch flush
// Respects personalization privacy settings
// ============================================================
const ViewTracking = (() => {
  let viewBuffer = [];
  let flushTimer = null;
  let currentView = null;
  let viewStartTime = 0;
  let debounceTimer = null;

  const STORAGE_KEY = 'dalli_viewed_products';
  const MAX_VIEWS = 200;
  const MIN_VIEW_DURATION = 500; // ms
  const DEBOUNCE_MS = 1000;
  const FLUSH_INTERVAL = 5000;
  const BATCH_SIZE = 20;

  const init = () => {
    // Listen for product page views
    document.addEventListener('click', (e) => {
      const productLink = e.target.closest('[data-product-id][href]');
      if (productLink) {
        const productId = parseInt(productLink.dataset.productId);
        if (productId) trackView(productId, 'click');
      }
    });

    // Track view when product card enters viewport (for category/homepage)
    if ('IntersectionObserver' in window) {
      const viewObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const card = entry.target;
            const productId = parseInt(card.dataset.productId);
            if (productId) trackView(productId, 'impression');
            viewObserver.unobserve(card);
          }
        });
      }, { threshold: 0.5, rootMargin: '0px 0px -50px 0px' });

      // Observe product cards
      $$('[data-product-id]').forEach(card => viewObserver.observe(card));
    }

    // Track product page view (if on product page)
    const productPage = document.querySelector('[data-product-page][data-product-id]');
    if (productPage) {
      const productId = parseInt(productPage.dataset.productId);
      if (productId) {
        viewStartTime = Date.now();
        currentView = productId;
        // Track after minimum duration
        setTimeout(() => {
          if (currentView === productId && Date.now() - viewStartTime >= MIN_VIEW_DURATION) {
            trackView(productId, 'page_view');
          }
        }, MIN_VIEW_DURATION);
      }
    }

    // Track member/early access/limited release product views
    if (productPage && productId) {
      const product = state.products.get?.().find(p => p.id === productId);
      const loyaltyFlags = product?.loyalty || { memberOnly: false, earlyAccess: false, limitedRelease: false };
      const user = state.user.get();
      const userTier = user?.loyalty?.tier || 'member';
      
      if (loyaltyFlags.memberOnly) {
        window.LoyaltyAnalytics?.trackMemberProductView?.(productId, 'member_only', userTier);
      }
      if (loyaltyFlags.earlyAccess) {
        // Calculate hours early (placeholder - would need actual launch time)
        window.LoyaltyAnalytics?.trackEarlyAccessProductView?.(productId, userTier, 48);
      }
      if (loyaltyFlags.limitedRelease) {
        window.LoyaltyAnalytics?.trackLimitedReleaseProductView?.(productId, userTier);
      }
      
      // Register Virtual Try-On if eligible
      if (product?.cms?.virtualTryOn?.eligible) {
        import('./modules/VirtualTryOnLoader.js').then(module => {
          module.registerProductPageForVTO?.(product);
        }).catch(err => console.warn('[VTO] Registration failed:', err));
      }
      
      // Register 360° Viewer if eligible
      if (product?.cms?.product360?.enabled) {
        import('./modules/product360/Product360Loader.js').then(module => {
          module.registerProductPageFor360?.(product);
        }).catch(err => console.warn('[360] Registration failed:', err));
      }
    }

    // Periodic flush
    flushTimer = setInterval(flush, FLUSH_INTERVAL);

    // Flush on page unload
    window.addEventListener('beforeunload', flush);

    console.log('[ViewTracking] Initialized');
  };

  const trackView = (productId, source) => {
    // Check personalization consent
    const user = state.user.get();
    const personalization = user?.preferences?.personalization || {};
    if (!personalization.enabled || !personalization.trackViews) return;

    // Clear debounce timer
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const view = {
        productId,
        source, // 'click', 'impression', 'page_view'
        timestamp: Date.now(),
        category: getProductCategory(productId)
      };

      viewBuffer.push(view);

      // Update category affinity
      updateCategoryAffinity(view.category);

      // Batch flush if buffer full
      if (viewBuffer.length >= BATCH_SIZE) {
        flush();
      }
    }, DEBOUNCE_MS);
  };

  const updateCategoryAffinity = (category) => {
    if (!category) return;
    try {
      const prefs = JSON.parse(localStorage.getItem('dalli_category_preferences') || '{}');
      prefs[category] = (prefs[category] || 0) + 1;
      localStorage.setItem('dalli_category_preferences', JSON.stringify(prefs));
    } catch (e) {
      console.warn('[ViewTracking] Category affinity update failed:', e);
    }
  };

  const flush = () => {
    if (viewBuffer.length === 0) return;

    try {
      // Get existing views
      const existing = JSON.parse(localStorage.getItem('dalli_viewed_products') || '[]');
      
      // Merge new views (deduplicate by productId, keep latest)
      const merged = [...existing, ...viewBuffer];
      const deduped = Object.values(
        merged.reduce((acc, view) => {
          if (!acc[view.productId] || view.timestamp > acc[view.productId].timestamp) {
            acc[view.productId] = view;
          }
          return acc;
        }, {})
      ).sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_VIEWS);

      localStorage.setItem('dalli_viewed_products', JSON.stringify(deduped));
      viewBuffer = [];

      // Sync to user account if logged in
      syncToAccount(deduped);
    } catch (e) {
      console.warn('[ViewTracking] Flush failed:', e);
    }
  };

  const syncToAccount = (views) => {
    const user = state.user.get();
    if (!user) return;
    
    const updatedUser = {
      ...user,
      viewedProducts: views
    };
    state.user.set(updatedUser);
    safeSetItem('dalli_user', JSON.stringify(updatedUser));
  };

  const getRecentViews = (limit = 10) => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').slice(0, limit);
    } catch {
      return [];
    }
  };

  const clearViews = () => {
    viewBuffer = [];
    localStorage.removeItem(STORAGE_KEY);
    const user = state.user.get();
    if (user) {
      const updatedUser = { ...user, viewedProducts: [] };
      state.user.set(updatedUser);
      safeSetItem('dalli_user', JSON.stringify(updatedUser));
    }
  };

  // Public API
  return { init, trackView, flush, getRecentViews, clearViews };
})();

window.ViewTracking = ViewTracking;

// ============================================================
// SIZE MEMORY MODULE (Step 4)
// Auto-select preferred size, show fit preference, availability alerts
// ============================================================
const SizeMemory = (() => {
  let currentProductId = null;
  let currentVariantId = null;
  let sizeObserver = null;

  const init = () => {
    // Initialize on product page
    const productPage = document.querySelector('[data-product-page][data-product-id]');
    if (!productPage) return;
    
    currentProductId = parseInt(productPage.dataset.productId);
    if (!currentProductId) return;
    
    // Wait for size buttons to be rendered
    waitForSizeButtons().then(() => {
      applySizeMemory();
      initSizeSelectionPersistence();
      showFitPreferenceBadge();
      checkPreferredSizeAvailability();
    });
    
    console.log('[SizeMemory] Initialized for product:', currentProductId);
  };

  const waitForSizeButtons = () => {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const sizeButtons = document.querySelectorAll('.size-btn:not(.unavailable)');
        if (sizeButtons.length > 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Fallback timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  };

  const getPreferredSize = (category) => {
    const user = state.user.get();
    if (!user?.savedSizes?.[category]?.length) return null;
    
    // Find default size for category
    const defaultSize = user.savedSizes[category].find(s => s.isDefault);
    if (defaultSize) return defaultSize.value;
    
    // Return first saved size
    return user.savedSizes[category][0]?.value || null;
  };

  const getFitPreference = (category) => {
    const user = state.user.get();
    const sizeEntry = user?.savedSizes?.[category]?.find(s => s.isDefault);
    return sizeEntry?.fit || 'regular';
  };

  const applySizeMemory = () => {
    const user = state.user.get();
    if (!user?.savedSizes) return;
    
    const product = getProductById(currentProductId);
    if (!product) return;
    
    const category = product.category?.toLowerCase();
    if (!category) return;
    
    const preferredSize = getPreferredSize(category);
    if (!preferredSize) return;
    
    // Find and click the preferred size button
    const sizeButtons = document.querySelectorAll('.size-btn[data-size]');
    sizeButtons.forEach(btn => {
      if (btn.dataset.size === preferredSize && !btn.classList.contains('unavailable')) {
        // Simulate click to select
        btn.click();
        currentVariantId = `${currentProductId}-${btn.dataset.color}-${preferredSize}`;
        
        // Show notification
        showToast(`t("product.sizeAutoSelected", { size: preferredSize })`, 'info');
      }
    });
  };

  const initSizeSelectionPersistence = () => {
    // Listen for size button clicks
    document.addEventListener('click', (e) => {
      const sizeBtn = e.target.closest('.size-btn:not(.unavailable)');
      if (!sizeBtn) return;
      
      const size = sizeBtn.dataset.size;
      if (!size) return;
      
      const product = getProductById(currentProductId);
      if (!product) return;
      
      const category = product.category?.toLowerCase();
      if (!category) return;
      
      // Save as default for this category
      saveSizePreference(category, sizeBtn.dataset.size, getFitPreference(category));
    });
  };

  const saveSizePreference = (category, sizeValue, fit) => {
    const user = state.user.get();
    if (!user) return;
    
    if (!user.savedSizes) user.savedSizes = {};
    if (!user.savedSizes[category]) user.savedSizes[category] = [];
    
    // Remove existing size entry
    user.savedSizes[category] = user.savedSizes[category].filter(s => s.value !== sizeValue);
    
    // Add as default
    user.savedSizes[category].unshift({
      id: 'sz_' + Date.now(),
      value: sizeValue,
      fit: fit || 'regular',
      isDefault: true,
      createdAt: new Date().toISOString()
    });
    
    // Remove default from others
    user.savedSizes[category].forEach((s, i) => {
      if (i > 0) s.isDefault = false;
    });
    
    state.user.set(user);
    safeSetItem('dalli_user', JSON.stringify(user));
  };

  const showFitPreferenceBadge = () => {
    const product = getProductById(currentProductId);
    if (!product) return;
    
    const category = product.category?.toLowerCase();
    if (!category) return;
    
    const fit = getFitPreference(category);
    if (!fit) return;
    
    const fitLabels = {
      'regular': 'Regular fit',
      'slim': 'Slim fit',
      'oversized': 'Oversized fit'
    };
    
    const badgeContainer = document.querySelector('.product-variants .fit-preference-badge');
    if (!badgeContainer) return;
    
    badgeContainer.innerHTML = `
      <span class="fit-badge" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: var(--color-primary-light); color: var(--color-primary); border-radius: var(--radius-btn); font-size: var(--fs-xs); font-weight: 600;">
        📏 ${fitLabels[fit] || fit}
      </span>
    `;
  };

  const checkPreferredSizeAvailability = () => {
    const product = getProductById(currentProductId);
    if (!product) return;
    
    const category = product.category?.toLowerCase();
    if (!category) return;
    
    const preferredSize = getPreferredSize(category);
    if (!preferredSize) return;
    
    // Find the size button
    const sizeBtn = document.querySelector(`.size-btn[data-size="${preferredSize}"]`);
    if (!sizeBtn) return;
    
    if (sizeBtn.classList.contains('unavailable')) {
      // Show alert that preferred size is out of stock
      const alertEl = document.createElement('div');
      alertEl.className = 'size-availability-alert';
      alertEl.style.cssText = 'margin-top: 8px; padding: 8px 12px; background: var(--color-warning-100); color: var(--color-warning-700); border-radius: var(--radius-btn); font-size: var(--fs-sm); display: flex; align-items: center; gap: 8px;';
      alertEl.innerHTML = `
        <span>⚠️ t("product.sizeNotInStock", { size: preferredSize })</span>
        <button class="btn btn-ghost btn-sm" onclick="notifyWhenAvailable('${currentProductId}', '${preferredSize}')" style="margin-left: 8px;">Obavesti me</button>
      `;
      
      const sizeContainer = document.querySelector('.size-options');
      if (sizeContainer) {
        sizeContainer.parentNode.insertBefore(alertEl, sizeContainer.nextSibling);
      }
    }
  };

  // Global function for notify when available
  window.notifyWhenAvailable = (productId, size) => {
    const user = state.user.get();
    if (!user) {
      showToast(t('notifications.needLogin'), 'warning');
      return;
    }
    
    // Save notification preference
    const notifications = user.notifications || {};
    notifications.backInStock = true;
    // Could save specific product+size preference here
    
    state.user.set(user);
    safeSetItem('dalli_user', JSON.stringify(user));
    
    showToast('Obaveštavanje postavljeno za veličinu ' + size, 'success');
  };

  return { init };
})();

window.SizeMemory = SizeMemory;

// ============================================================
// NOTIFICATION CENTER (Step 6) - Simplified
// In-app notifications, push notifications, background monitoring
// ============================================================
const NotificationCenter = {
  notificationsDrawer: null,
  notificationsContent: null,
  notificationsList: null,
  notificationsCount: null,
  notificationsBtn: null,
  unreadCount: 0,
  allNotifications: [],
  isInitialized: false,
  monitoringInterval: null,
  currentPage: 0,
  PAGE_SIZE: 20,

  init() {
    this.notificationsDrawer = $('#notificationsDrawer');
    this.notificationsContent = $('#notificationsContent');
    this.notificationsList = $('#notificationsList');
    this.notificationsCount = $('#notificationsCount');
    this.notificationsBtn = $('#notificationsBtn');
    
    if (!this.notificationsDrawer) return;
    
    $$('[data-action="notifications"]').forEach(btn => {
      btn.addEventListener('click', () => this.toggleDrawer());
    });
    
    $('#markAllReadBtn')?.addEventListener('click', () => this.markAllAsRead());
    $('#clearAllNotificationsBtn')?.addEventListener('click', () => this.clearAll());
    $('#loadMoreNotificationsBtn')?.addEventListener('click', () => this.loadMore());
    
    this.loadNotifications();
    this.startMonitoring();
    this.registerPush();
    this.isInitialized = true;
    console.log('[NotificationCenter] Initialized');
  },

  toggleDrawer() {
    if (!this.notificationsDrawer) return;
    const isOpen = this.notificationsDrawer.classList.toggle('open');
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) { this.loadNotifications(); }
  },

  async loadNotifications(page = 0) {
    if (!this.notificationsList) return;
    this.currentPage = page;
    
    if (page === 0) {
      this.allNotifications = this.getStored();
      this.unreadCount = this.allNotifications.filter(n => !n.read).length;
      this.updateBadge();
    }
    
    const start = page * this.PAGE_SIZE;
    const pageItems = this.allNotifications.slice(start, start + this.PAGE_SIZE);
    
    if (page === 0) {
      this.notificationsList.innerHTML = '';
      this.notificationsList.classList.remove('hidden');
      $('#notificationsEmpty')?.classList.add('hidden');
    }
    
    if (pageItems.length === 0 && page === 0) {
      this.notificationsList.classList.add('hidden');
      $('#notificationsEmpty')?.classList.remove('hidden');
      $('#loadMoreNotificationsBtn')?.style.setProperty('display', 'none');
      return;
    }
    
    pageItems.forEach(n => this.notificationsList.appendChild(this.createElement(n)));
    
    const hasMore = start + this.PAGE_SIZE < this.allNotifications.length;
    $('#loadMoreNotificationsBtn')?.style.setProperty('display', hasMore ? 'block' : 'none');
    $('#markAllReadBtn')?.style.setProperty('display', this.unreadCount > 0 ? 'inline-flex' : 'none');
    $('#clearAllNotificationsBtn')?.style.setProperty('display', this.allNotifications.length > 0 ? 'inline-flex' : 'none');
  },

  loadMore() { this.loadNotifications(this.currentPage + 1); },

  getStored() { try { return JSON.parse(localStorage.getItem('dalli_notifications') || '[]'); } catch { return []; } },
  save(arr) { try { localStorage.setItem('dalli_notifications', JSON.stringify(arr)); } catch (e) { console.warn('[NC] Save failed:', e); } },

  create(n) {
    const arr = this.getStored();
    const notif = { id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), ...n, read: false, createdAt: Date.now() };
    arr.unshift(notif);
    if (arr.length > 500) arr.splice(500);
    this.save(arr);
    this.allNotifications = arr;
    return notif;
  },

  createElement(n) {
    const li = document.createElement('li');
    li.className = `notification-item ${n.read ? '' : 'unread'}`;
    li.dataset.notificationId = n.id;
    li.setAttribute('role', 'listitem');
    
    const icons = { back_in_stock: '📦', price_drop: '💰', new_collection: '✨', member_announcement: '👑', tier_upgrade: '🏆', points_expiring: '⏳', birthday: '🎂', system: '🔔' };
    const typeClass = `notification-item__icon--${n.type}`;
    const icon = icons[n.type] || '🔔';
    
    li.innerHTML = `
      <span class="notification-item__icon ${`notification-item__icon--${n.type}`}" aria-hidden="true">${icons[n.type] || '🔔'}</span>
      <div class="notification-item__content">
        <div class="notification-item__title">${escapeHtml(n.title)}</div>
        <div class="notification-item__message">${escapeHtml(n.message)}</div>
        <div class="notification-item__meta">
          <time class="notification-item__time" datetime="${new Date(n.createdAt).toISOString()}">${this.formatTime(n.createdAt)}</time>
          ${n.actionUrl ? `<button class="notification-item__action" data-action="open-notification" data-url="${n.actionUrl}">${n.actionLabel || 'Pogledaj'}</button>` : ''}
        </div>
      </div>
      <button class="notification-item__dismiss" aria-label="${t('notifications.delete')}" data-action="dismiss" data-id="${n.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    `;
    
    li.querySelector('[data-action="open-notification"]')?.addEventListener('click', e => {
      e.preventDefault(); this.markRead(n.id); if (n.actionUrl) window.location.href = n.actionUrl;
    });
    li.querySelector('[data-action="dismiss"]')?.addEventListener('click', e => { e.preventDefault(); this.dismiss(n.id); });
    return li;
  },

  formatTime(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return 'upravo sada';
    if (m < 60) return `pre ${m} min`;
    if (h < 24) return `pre ${h} h`;
    if (d < 7) return `pre ${d} d`;
    return I18n.formatDate(ts, { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  markRead(id) {
    const arr = this.getStored();
    const n = arr.find(x => x.id === id);
    if (n && !n.read) { n.read = true; this.save(arr); this.allNotifications = arr; this.unreadCount = Math.max(0, this.unreadCount - 1); this.updateBadge(); this.notificationsList?.querySelector(`[data-notification-id="${id}"]`)?.classList.remove('unread'); }
  },

  markAllRead() {
    const arr = this.getStored(); let changed = false;
    arr.forEach(n => { if (!n.read) { n.read = true; changed = true; } });
    if (changed) { this.save(arr); this.allNotifications = arr; this.unreadCount = 0; this.updateBadge(); $$('.notification-item.unread', this.notificationsList).forEach(el => el.classList.remove('unread')); $('#markAllReadBtn')?.style.setProperty('display', 'none'); }
  },

  dismiss(id) {
    let arr = this.getStored();
    const idx = arr.findIndex(x => x.id === id);
    if (idx < 0) return;
    if (!arr[idx].read) this.unreadCount = Math.max(0, this.unreadCount - 1);
    arr.splice(idx, 1);
    this.save(arr);
    this.allNotifications = arr;
    this.updateBadge();
    const el = this.notificationsList?.querySelector(`[data-notification-id="${id}"]`);
    if (el) el.remove();
    if (this.allNotifications.length === 0) {
      this.notificationsList?.classList.add('hidden');
      $('#notificationsEmpty')?.classList.remove('hidden');
      $('#loadMoreNotificationsBtn')?.style.setProperty('display', 'none');
      $('#markAllReadBtn')?.style.setProperty('display', 'none');
      $('#clearAllNotificationsBtn')?.style.setProperty('display', 'none');
    }
  },

  clearAll() {
    if (!confirm('Obrišete sva obaveštenja?')) return;
    localStorage.removeItem('dalli_notifications');
    this.allNotifications = []; this.unreadCount = 0; this.updateBadge();
    this.notificationsList?.classList.add('hidden'); $('#notificationsEmpty')?.classList.remove('hidden'); $('#loadMoreNotificationsBtn, #markAllReadBtn, #clearAllNotificationsBtn').forEach(el => el?.style.setProperty('display', 'none'));
  },

  updateBadge() {
    if (this.notificationsCount) {
      if (this.unreadCount > 0) { this.notificationsCount.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount; this.notificationsCount.style.display = 'flex'; }
      else this.notificationsCount.style.display = 'none';
    }
    this.notificationsBtn?.classList.toggle('has-unread', this.unreadCount > 0);
  },

  notify(n) {
    const notif = this.create(n);
    this.unreadCount++; this.updateBadge();
    if (this.notificationsDrawer?.classList.contains('open')) this.loadNotifications(0);
    this.playSound();
    return notif;
  },

  playSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.setValueAtTime(800, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2); g.gain.setValueAtTime(0.1, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.2); } catch(e) {} },

  startMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      if (!this.isInitialized) return;
      const u = state.user.get(); if (!u?.notifications) return;
      if (u.notifications.backInStock) await this.checkBackInStock();
      if (u.notifications.priceDrop) await this.checkPriceDrops();
      if (u.notifications.newCollection) await this.checkNewCollections();
      if (u.notifications.pointsExpiring) await this.checkPointsExpiring();
    }, 5 * 60 * 1000);
    setTimeout(() => { if (this.isInitialized) { const u = state.user.get(); if (u?.notifications?.backInStock) this.checkBackInStock(); if (u?.notifications?.priceDrop) this.checkPriceDrops(); if (u?.notifications?.newCollection) this.checkNewCollections(); if (u?.notifications?.pointsExpiring) this.checkPointsExpiring(); } }, 30000);
  },

  checkBackInStock() { checkBackInStockHelper(this); },

  checkPriceDrops() { checkPriceDropsHelper(this); },

  checkNewCollections() { checkNewCollectionsHelper(this); },

  checkPointsExpiring() { checkPointsExpiringHelper(this); },

  registerPush() { if (!('serviceWorker' in navigator) || !('PushManager' in window)) return; navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).catch(() => {}); },

  destroy() { if (this.monitoringInterval) clearInterval(this.monitoringInterval); }
};

window.NotificationCenter = NotificationCenter;


// ============================================================
// REVIEW DISPLAY MODULE (Phase 13 - Step 2: Review Display & Submission)
// ============================================================
const ReviewDisplay = {
  productId: null,
  containerEl: null,
  formEl: null,
  reviewsListEl: null,
  summaryEl: null,

  init(productIdOrEl) {
    if (typeof productIdOrEl === 'number') {
      this.productId = productIdOrEl;
    } else if (productIdOrEl && productIdOrEl.dataset) {
      this.productId = parseInt(productIdOrEl.dataset.productId);
      this.containerEl = productIdOrEl;
    } else {
      this.productId = productIdOrEl;
    }
    
    if (!this.productId) return;
    
    this.cacheElements();
    this.renderSummary();
    this.loadReviews();
    this.bindForm();
    
    console.log('[ReviewDisplay] Initialized for product:', this.productId);
  },

  cacheElements() {
    this.containerEl = $(`#productReviews[data-product-id="${this.productId}"]`) || $(`.product-reviews[data-product-id="${this.productId}"]`);
    if (!this.containerEl) return;
    
    this.reviewsListEl = $('.reviews-list', this.containerEl);
    this.summaryEl = $('.reviews-summary', this.containerEl);
    this.formEl = $('.review-form', this.containerEl);
  },

  async loadReviews() {
    if (!this.reviewsListEl) return;
    
    const reviews = window.ReviewSystem?.getProductReviews?.(this.productId, { 
      limit: 10,
      sortBy: 'helpful'
    }) || [];
    
    this.renderReviews(reviews);
  },

  renderSummary() {
    if (!this.summaryEl) return;
    
    const stats = window.ReviewSystem?.getReviewStats?.(this.productId) || { 
      averageRating: 0, totalReviews: 0, verifiedCount: 0, verifiedPercent: 0, distribution: {} 
    };
    
    this.summaryEl.innerHTML = `
      <div class="star-rating-summary" style="display: flex; gap: 2px;">
        ${[1,2,3,4,5].map(i => `<svg width="14" height="14" viewBox="0 0 24 24" fill="${i <= Math.round(stats.averageRating) ? 'currentColor' : 'none'}" style="color: var(--color-warning);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`).join('')}
      </div>
      <span class="reviews-count" style="color: var(--color-text-tertiary); font-size: var(--fs-sm);">(${t('product.reviews', { count: stats.totalReviews })})</span>
      <span class="avg-rating" style="color: var(--color-accent); font-weight: var(--fw-semibold); font-size: var(--text-xl);">${stats.averageRating}/5</span>
    `;
  },

  loadReviews() {
    if (!this.reviewsListEl) return;
    
    const reviews = window.ReviewSystem?.getProductReviews?.(this.productId, { 
      limit: 10,
      sortBy: 'helpful'
    }) || [];
    
    this.renderReviews(reviews);
  },

  renderReviews(reviews) {
    if (!this.reviewsListEl) return;
    
    if (!reviews.length) {
      this.reviewsListEl.innerHTML = `
        <div class="no-reviews" style="text-align: center; padding: var(--space-8); color: var(--color-text-tertiary);">
          <p>${t('product.noReviews')}</p>
        </div>
      `;
      return;
    }
    
    this.reviewsListEl.innerHTML = reviews.map(review => this.renderReviewCard(review)).join('');
    
    // Bind helpful vote buttons
    $$('.review-helpful-btn', this.reviewsListEl).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const reviewId = btn.dataset.reviewId;
        const helpful = btn.dataset.helpful === 'true';
        const result = window.ReviewSystem?.voteHelpful?.(reviewId, helpful);
        if (result?.success) {
          const helpfulEl = btn.closest('.review-item')?.querySelector('.review-helpful-count');
          const notHelpfulEl = btn.closest('.review-item')?.querySelector('.review-not-helpful-count');
          if (helpfulEl) helpfulEl.textContent = result.helpfulVotes;
          if (notHelpfulEl) notHelpfulEl.textContent = result.notHelpfulVotes;
        }
      });
    });
    
    // Bind photo click handlers
    $$('.review-photos img', this.reviewsListEl).forEach(img => {
      img.addEventListener('click', (e) => {
        const reviewId = e.target.dataset.reviewId;
        const photoIndex = parseInt(e.target.dataset.photoIndex);
        this.openPhotoModal(reviewId, photoIndex);
      });
    });
  },

  renderReviewCard(review) {
    const initials = review.userInitials || review.userName?.split(' ').map(n => n[0]).join('') || 'US';
    const date = I18n.formatDate(review.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const verifiedBadge = review.verifiedPurchase ? `<span class="verified-badge" style="color: var(--color-success); font-size: var(--fs-xs); font-weight: var(--fw-bold);">✓ Verifikovano</span>` : '';
    
    return `
      <article class="review-item" itemscope itemtype="https://schema.org/Review" data-review-id="${review.id}" style="margin-bottom: var(--space-3); padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-divider);">
        <meta itemprop="author" content="${escapeHtml(review.userName || review.userInitials)}">
        <meta itemprop="datePublished" content="${review.createdAt}">
        <meta itemprop="reviewRating" content="${review.rating}">
        
        <div class="review-header" style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2);">
          <div class="review-author" style="color: var(--color-text-tertiary); font-size: var(--fs-sm);">
            <span itemprop="author" style="color: var(--color-text); font-weight: var(--fw-medium);">${escapeHtml(review.userName || review.userInitials)}</span>
            ${review.verifiedPurchase ? '<span class="verified-badge" style="color: var(--color-success); font-size: var(--fs-xs); font-weight: var(--fw-bold);">✓ Verifikovano</span>' : ''}
          </div>
          <div class="review-date" style="color: var(--color-text-tertiary); font-size: var(--fs-xs);">
            <time itemprop="datePublished" datetime="${review.createdAt}">${I18n.formatDate(review.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric' })}</time>
          </div>
        </div>
        <div class="review-rating" style="font-size: var(--text-lg); font-weight: var(--fw-bold); color: var(--color-warning);">
          ${[1,2,3,4,5].map(i => `<svg width="14" height="14" viewBox="0 0 24 24" fill="${i <= review.rating ? 'currentColor' : 'none'}" style="color: var(--color-warning);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`).join('')}
          <span class="rating-value" style="margin-left: var(--space-1); color: var(--color-text-tertiary);">(${review.rating}/5)</span>
        </div>
        <h3 class="review-title" itemprop="name" style="font-size: var(--text-base); font-weight: var(--fw-medium); color: var(--color-text); margin-bottom: var(--space-1);">${escapeHtml(review.title)}</h3>
        <p class="review-text" itemprop="description" style="color: var(--color-text-secondary); font-size: var(--fs-sm); line-height: 1.5;">${escapeHtml(review.text)}</p>
        ${review.photos?.length ? `
          <div class="review-photos" style="display: flex; gap: var(--space-2); margin-top: var(--space-2); overflow-x: auto;">
            ${review.photos.map((photo, index) => `<img src="${photo}" alt="${escapeHtml(review.title)}" data-review-id="${review.id}" data-photo-index="${index}" style="width: 80px; height: 80px; object-fit: cover; border-radius: var(--radius-btn); cursor: pointer;" loading="lazy">`).join('')}
          </div>
        ` : ''}
        ${review.adminNote ? `<p class="review-admin-note" style="font-size: var(--fs-xs); color: var(--color-text-tertiary); margin-top: var(--space-1);">Admin: ${escapeHtml(review.adminNote)}</p>` : ''}
        <div class="review-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3); padding-top: var(--space-2); border-top: 1px solid var(--color-divider);">
          <button class="review-helpful-btn" data-review-id="${review.id}" data-helpful="true" class="btn btn-ghost btn-sm" style="font-size: var(--fs-xs);">
            👍 Korisno <span class="review-helpful-count">${review.helpfulVotes || 0}</span>
          </button>
          <button class="review-helpful-btn" data-review-id="${review.id}" data-helpful="false" class="btn btn-ghost btn-sm" style="font-size: var(--fs-xs);">
            👎 Nekorisno <span class="review-not-helpful-count">${review.notHelpfulVotes || 0}</span>
          </button>
        </div>
      </article>
    `;
  },

  bindForm() {
    if (!this.formEl) return;
    
    // Media upload handling
    const mediaInput = this.formEl.querySelector('#reviewMediaInput');
    const mediaPreview = this.formEl.querySelector('#reviewMediaPreview');
    let selectedFiles = [];
    
    if (mediaInput && mediaPreview) {
      mediaInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        const maxFiles = parseInt(mediaInput.dataset.maxFiles) || 5;
        const maxSize = (parseInt(mediaInput.dataset.maxSizeMb) || 10) * 1024 * 1024;
        
        // Filter valid files
        const validFiles = files.filter(file => {
          const validType = file.type.startsWith('image/') || file.type.startsWith('video/');
          const validSize = file.size <= maxSize;
          if (!validType) showToast(`Fajl ${file.name} nije podržan format.`, 'error');
          if (!validSize) showToast(t('common.error') + ': ' + file.name, 'error');
          return validType && validSize;
        });
        
        // Limit total files
        if (selectedFiles.length + validFiles.length > 5) {
          validFiles.splice(5 - selectedFiles.length);
          showToast('Maksimalno 5 fajlova.', 'warning');
        }
        
        selectedFiles.push(...validFiles);
        
        // Update preview
        this.updateMediaPreview(mediaPreview, selectedFiles, (index) => {
          selectedFiles.splice(index, 1);
          this.updateMediaPreview(mediaPreview, selectedFiles);
        });
      });
    }
    
    this.formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const ratingInput = this.formEl.querySelector('input[name="rating"]:checked');
      const titleInput = this.formEl.querySelector('input[name="reviewTitle"]');
      const textInput = this.formEl.querySelector('textarea[name="reviewText"]');
      
      if (!ratingInput || !titleInput?.value?.trim() || !textInput?.value?.trim()) {
        alert('Molimo popunite sva polja.');
        return;
      }
      
      const submitBtn = this.formEl.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Objavljivanje...';
      
      try {
        // Upload media first if any
        let mediaUrls = [];
        const mediaFiles = this.formEl.querySelector('#reviewMediaInput')?.files;
        if (mediaFiles && mediaFiles.length > 0) {
          try {
            mediaUrls = await window.ReviewSystem?.uploadReviewMedia?.('temp', Array.from(mediaFiles)) || [];
          } catch (e) {
            console.warn('[ReviewDisplay] Media upload failed:', e);
          }
        }
        
        const result = await window.ReviewSystem?.submitReview?.({
          productId: this.productId,
          variantId: this.getSelectedVariantId?.() || null,
          title: this.formEl.querySelector('input[name="reviewTitle"]')?.value?.trim(),
          text: this.formEl.querySelector('textarea[name="reviewText"]')?.value?.trim(),
          rating: parseInt(this.formEl.querySelector('input[name="rating"]:checked')?.value),
          photos: Array.from(this.formEl.querySelector('#reviewMediaInput')?.files || []).map((_, i) => `/images/reviews/temp_${Date.now()}_${i}.jpg`),
          videos: []
        });
        
        if (result?.success) {
          showToast('Recenzija je poslata na odobrenje!', 'success');
          this.formEl.reset();
          this.loadReviews();
        } else {
          alert(result?.error || 'Greška pri slanju recenzije');
        }
      } catch (e) {
        console.error('[ReviewDisplay] Submit failed:', e);
        alert('Greška pri slanju recenzije');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Objavi recenziju';
      }
    });
  },

  updateMediaPreview(container, files, onRemove) {
    const html = Array.from(files).map((file, index) => {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      const mediaTag = file.type.startsWith('video/')
        ? '<video src="' + url + '" style="width: 100%; height: 100%; object-fit: cover;" muted playsinline></video>'
        : '<img src="' + url + '" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">';
      return '<div class="media-preview-item" style="position: relative; width: 80px; height: 80px; border-radius: var(--radius-btn); overflow: hidden; border: 1px solid var(--color-border);">' +
        mediaTag +
        '<button type="button" class="media-remove-btn" data-index="' + index + '" style="position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px;">×</button>' +
      '</div>';
    }).join('');
    
    // Bind remove buttons
    container.querySelectorAll('.media-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        if (onRemove) onRemove(index);
      });
    });
  },

  // Photo modal for review photos
  openPhotoModal(reviewId, photoIndex) {
    const reviews = window.ReviewSystem?.getProductReviews?.(this.productId, { limit: 100 }) || [];
    const review = reviews.find(r => r.id === reviewId);
    if (!review || !review.photos?.length) return;
    
    const photos = review.photos;
    let currentIndex = photoIndex;
    
    const modal = document.createElement('div');
    modal.className = 'photo-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.95); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column;
    `;
    
    const updateModal = () => {
      const photos = review.photos;
      modal.innerHTML = `
        <button class="photo-modal-close" style="position: absolute; top: 20px; right: 20px; width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.1); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px; z-index: 10001;">×</button>
        <button class="photo-modal-prev" style="position: absolute; left: 20px; width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.1); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px; z-index: 10001;" ${currentIndex === 0 ? 'disabled' : ''}>‹</button>
        <div style="max-width: 90vw; max-height: 80vh; display: flex; align-items: center; justify-content: center;">
          ${photos[currentIndex].startsWith('video/') || photos[currentIndex].includes('.mp4') || photos[currentIndex].includes('.webm')
            ? `<video src="${photos[currentIndex]}" style="max-width: 90vw; max-height: 80vh;" controls autoplay muted></video>`
            : `<img src="${photos[currentIndex]}" alt="" style="max-width: 90vw; max-height: 80vh;">`
          }
        </div>
        <button class="photo-modal-next" style="position: absolute; right: 20px; width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.1); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px; z-index: 10001;" ${currentIndex === photos.length - 1 ? 'disabled' : ''}>›</button>
        <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: white; font-size: var(--fs-sm);">${currentIndex + 1} / ${photos.length}</div>
      `;
      
      modal.querySelector('.photo-modal-close').addEventListener('click', closeModal);
      modal.querySelector('.photo-modal-prev')?.addEventListener('click', () => { currentIndex = Math.max(0, currentIndex - 1); updateModal(); });
      modal.querySelector('.photo-modal-next')?.addEventListener('click', () => { currentIndex = Math.min(photos.length - 1, currentIndex + 1); updateModal(); });
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    };
    
    const closeModal = () => {
      document.removeEventListener('keydown', handleKeydown);
      modal.remove();
      document.body.style.overflow = '';
    };
    
    const handleKeydown = (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') { currentIndex = Math.max(0, currentIndex - 1); updateModal(); }
      if (e.key === 'ArrowRight') { currentIndex = Math.min(photos.length - 1, currentIndex + 1); updateModal(); }
    };
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeydown);
    updateModal();
  },
  
  getSelectedVariantId() {
    const sizeBtn = document.querySelector('.size-btn:not(.unavailable).selected') || document.querySelector('.size-btn:not(.unavailable)[aria-selected="true"]');
    const colorBtn = document.querySelector('.color-swatch.selected') || document.querySelector('.color-swatch[aria-selected="true"]');
    
    if (sizeBtn && colorBtn) {
      const product = state.products.get().find(p => p.id === this.productId);
      const variant = product?.variants?.find(v => `${product.id}-${v.color}-${v.size}` === `${sizeBtn.dataset.color}-${sizeBtn.dataset.size}`);
      return variant ? `${this.productId}-${variant.color}-${variant.size}` : null;
    }
    return null;
  }
};

window.ReviewDisplay = ReviewDisplay;

// ============================================================
// PRODUCT Q&A MODULE (Phase 13 - Step 4: Product Q&A)
// ============================================================
const QASystem = {
  questions: [],
  settings: null,
  productQuestionsCache: new Map(),

  async init() {
    try {
      const response = await fetch('/data/qa.json');
      if (response.ok) {
        const data = await response.json();
        this.questions = data.questions || [];
        this.settings = data.settings || {};
        this.buildProductCache();
        console.log('[QASystem] Initialized:', this.questions.length, 'questions');
      }
    } catch (e) {
      console.warn('[QASystem] Failed to load questions:', e);
    }
  },

  buildProductCache() {
    this.productQuestionsCache.clear();
    this.questions.forEach(q => {
      if (!this.productQuestionsCache.has(q.productId)) {
        this.productQuestionsCache.set(q.productId, []);
      }
      this.productQuestionsCache.get(q.productId).push(q);
    });
  },

  getProductQuestions(productId, options = {}) {
    const questions = this.productQuestionsCache.get(productId) || [];
    const { 
      status = 'approved', 
      sortBy = 'newest',
      limit = 10,
      offset = 0
    } = options;

    let filtered = questions.filter(q => q.status === status);
    
    // Sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'helpful':
      default:
        filtered.sort((a, b) => (b.helpfulVotes - b.notHelpfulVotes) - (a.helpfulVotes - a.notHelpfulVotes));
        break;
    }

    return filtered.slice(offset, offset + limit);
  },

  getQuestionStats(productId) {
    const questions = this.productQuestionsCache.get(productId) || [];
    const approved = questions.filter(q => q.status === 'approved');
    const answered = approved.filter(q => q.answer);
    
    return {
      totalQuestions: approved.length,
      answeredCount: answered.length,
      unansweredCount: approved.length - answered.length
    };
  },

  canUserAsk(userId, productId) {
    if (!this.settings?.requireVerifiedPurchaseToAsk) return { allowed: true };
    if (!this.settings?.requireLoginToAsk) return { allowed: true };
    
    const user = state.user.get();
    if (!user) return { allowed: false, reason: 'login_required' };
    
    // Check if already asked
    const existing = this.questions.find(q => q.userId === userId && q.productId === productId && q.status !== 'rejected');
    if (existing) {
      return { allowed: false, reason: 'already_asked' };
    }
    
    // Check verified purchase if required
    if (this.settings.requireVerifiedPurchaseToAsk) {
      const purchased = user.orders?.some(order => 
        order.items.some(item => item.productId === productId)
      ) || false;
      if (!purchased) {
        return { allowed: false, reason: 'verified_purchase_required' };
      }
    }
    
    return { allowed: true };
  },

  async submitQuestion(questionData) {
    const validation = this.canUserAsk(questionData.userId, questionData.productId);
    if (!validation.allowed) {
      return { success: false, error: validation.reason };
    }

    const { question } = questionData;
    if (!question || question.length < (this.settings?.minQuestionLength || 10)) {
      return { success: false, error: 'Pitanje je pre kratko' };
    }
    if (question.length > (this.settings?.maxQuestionLength || 500)) {
      return { success: false, error: 'Pitanje je pre dugačko' };
    }

    const user = state.user.get();
    const newQuestion = {
      id: 'qa_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      ...questionData,
      userName: user.name,
      userInitials: user.name?.split(' ').map(n => n[0]).join('') || 'US',
      verifiedPurchase: true,
      answer: '',
      status: this.settings?.requireAdminApproval ? 'pending' : 'approved',
      helpfulVotes: 0,
      notHelpfulVotes: 0,
      createdAt: new Date().toISOString(),
      answeredAt: null,
      answeredBy: null
    };

    this.questions.push(newQuestion);
    this.save();
    this.buildProductCache();

    trackEvent('question_submitted', { productId: questionData.productId });
    
    return { success: true, question: newQuestion };
  },

  save() {
    try {
      localStorage.setItem('dalli_qa', JSON.stringify({ questions: this.questions, settings: this.settings }));
    } catch (e) {
      console.warn('[QASystem] Save failed:', e);
    }
  },

  // Helpful votes for questions/answers
  voteHelpful(questionId, helpful) {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) return { success: false, error: 'Pitanje nije pronađeno' };

    const user = state.user.get();
    if (!user) return { success: false, error: 'Potrebna prijava' };

    const voteKey = `qa_vote_${questionId}`;
    const existingVote = localStorage.getItem(voteKey);
    
    if (existingVote) {
      return { success: false, error: 'Već ste glasali' };
    }

    if (helpful) {
      question.helpfulVotes++;
    } else {
      question.notHelpfulVotes++;
    }
    
    this.save();
    localStorage.setItem(voteKey, helpful ? 'helpful' : 'not_helpful');
    
    trackEvent('qa_vote', { questionId, helpful });
    return { success: true, helpfulVotes: question.helpfulVotes, notHelpfulVotes: question.notHelpfulVotes };
  },

  // Admin answer question
  async answerQuestion(questionId, answerData) {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) return { success: false, error: 'Pitanje nije pronađeno' };

    const { answer, answeredBy } = answerData;
    if (!answer || answer.length < 10) return { success: false, error: 'Odgovor je pre kratak' };
    if (answer.length > (this.settings?.answerMaxLength || 2000)) return { success: false, error: 'Odgovor je pre dugačak' };

    question.answer = answer;
    question.answeredAt = new Date().toISOString();
    question.answeredBy = answeredBy;
    question.status = 'approved';
    question.updatedAt = new Date().toISOString();

    this.save();
    trackEvent('qa_answered', { questionId });
    
    return { success: true, question };
  }
};

window.QASystem = QASystem;

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => QASystem.init());
} else {
  QASystem.init();
}

// ============================================================
// Q&A DISPLAY MODULE (Phase 13 - Step 4: Q&A Display)
// ============================================================
const QADisplay = {
  productId: null,
  containerEl: null,
  formEl: null,
  questionsListEl: null,
  formContainerEl: null,

  init(productIdOrEl) {
    if (typeof productIdOrEl === 'number') {
      this.productId = productIdOrEl;
    } else if (productIdOrEl && productIdOrEl.dataset) {
      this.productId = parseInt(productIdOrEl.dataset.productId);
      this.containerEl = productIdOrEl;
    } else {
      this.productId = productIdOrEl;
    }
    
    if (!this.productId) return;
    
    this.cacheElements();
    this.loadQuestions();
    this.bindForm();
    
    console.log('[QADisplay] Initialized for product:', this.productId);
  },

  cacheElements() {
    this.containerEl = $(`#productQA[data-product-id="${this.productId}"]`);
    if (!this.containerEl) return;
    
    this.questionsListEl = $('.qa-questions-list', this.containerEl);
    this.formContainerEl = $('.qa-form-container', this.containerEl);
    this.formEl = $('.qa-form', this.containerEl);
  },

  loadQuestions() {
    if (!this.questionsListEl) return;
    
    const questions = window.QASystem?.getProductQuestions?.(this.productId, { 
      limit: 10,
      sortBy: 'newest'
    }) || [];
    
    this.renderQuestions(questions);
  },

  renderQuestions(questions) {
    if (!this.questionsListEl) return;
    
    if (!questions.length) {
      this.questionsListEl.innerHTML = `
        <div class="qa-empty" style="text-align: center; padding: var(--space-8); color: var(--color-text-tertiary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: var(--space-3); opacity: 0.5;"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <h3 style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-light); margin-bottom: var(--space-2);">${t('product.noQuestions')}</h3>
          <p style="margin-bottom: var(--space-4); max-width: 400px; margin-left: auto; margin-right: auto;">${t('product.beFirstQuestion')}</p>
        </div>
      `;
      return;
    }
    
    this.questionsListEl.innerHTML = questions.map(q => this.renderQuestionCard(q)).join('');
    
    // Bind helpful vote buttons
    $$('.qa-helpful-btn', this.questionsListEl).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const questionId = btn.dataset.questionId;
        const helpful = btn.dataset.helpful === 'true';
        const result = window.QASystem?.voteHelpful?.(questionId, helpful);
        if (result?.success) {
          const helpfulEl = btn.closest('.qa-item')?.querySelector('.qa-helpful-count');
          const notHelpfulEl = btn.closest('.qa-item')?.querySelector('.qa-not-helpful-count');
          if (helpfulEl) helpfulEl.textContent = result.helpfulVotes;
          if (notHelpfulEl) notHelpfulEl.textContent = result.notHelpfulVotes;
        }
      });
    });
  },

  renderQuestionCard(q) {
    const initials = q.userInitials || q.userName?.split(' ').map(n => n[0]).join('') || 'US';
    const date = I18n.formatDate(q.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const verifiedBadge = q.verifiedPurchase ? `<span class="qa-verified-badge" style="color: var(--color-success); font-size: var(--fs-xs); font-weight: var(--fw-bold);">✓ Verifikovano kupovina</span>` : '';
    const hasAnswer = q.answer && q.answer.length > 0;
    
    return `
      <article class="qa-item" data-question-id="${q.id}" style="margin-bottom: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-divider);">
        <div class="qa-question" style="margin-bottom: var(--space-3);">
          <div class="qa-question-header" style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2);">
            <div class="qa-author" style="color: var(--color-text-tertiary); font-size: var(--fs-sm);">
              <span style="color: var(--color-text); font-weight: var(--fw-medium);">${escapeHtml(q.userName || q.userInitials)}</span>
              ${q.verifiedPurchase ? '<span class="qa-verified-badge" style="color: var(--color-success); font-size: var(--fs-xs); font-weight: var(--fw-bold);">✓ Verifikovana kupovina</span>' : ''}
            </div>
            <div class="qa-date" style="color: var(--color-text-tertiary); font-size: var(--fs-xs);">
              <time datetime="${q.createdAt}">${I18n.formatDate(q.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric' })}</time>
            </div>
          </div>
          <h3 class="qa-question-title" style="font-size: var(--text-base); font-weight: var(--fw-medium); color: var(--color-text); margin-bottom: var(--space-1);">${escapeHtml(q.question)}</h3>
          <div class="qa-question-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--color-divider);">
            <button class="qa-helpful-btn" data-question-id="${q.id}" data-helpful="true" class="btn btn-ghost btn-sm" style="font-size: var(--fs-xs);">
              👍 Korisno <span class="qa-helpful-count">${q.helpfulVotes || 0}</span>
            </button>
            <button class="qa-helpful-btn" data-question-id="${q.id}" data-helpful="false" class="btn btn-ghost btn-sm" style="font-size: var(--fs-xs);">
              👎 Nekorisno <span class="qa-not-helpful-count">${q.notHelpfulVotes || 0}</span>
            </button>
          </div>
        </div>
        ${q.answer ? `
          <div class="qa-answer" style="margin-top: var(--space-3); padding: var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); border-left: 3px solid var(--color-primary);">
            <div class="qa-answer-header" style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2);">
              <span class="qa-answer-label" style="font-size: var(--fs-xs); font-weight: var(--fw-bold); color: var(--color-primary); text-transform: uppercase;">Odgovor</span>
              <span class="qa-answer-date" style="font-size: var(--fs-xs); color: var(--color-text-tertiary);">${q.answeredAt ? I18n.formatDate(q.answeredAt, { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
            </div>
            <p class="qa-answer-text" style="color: var(--color-text-secondary); line-height: 1.6;">${escapeHtml(q.answer)}</p>
          </div>
        ` : `
          <div class="qa-no-answer" style="margin-top: var(--space-3); padding: var(--space-3); background: var(--color-bg); border-radius: var(--radius-btn); text-align: center; color: var(--color-text-tertiary); font-size: var(--fs-sm);">
            Još nema odgovora. Administrator će uskoro odgovoriti.
          </div>
        `}
      </article>
    `;
  }
};

// ============================================================
// COMMUNITY GALLERY (Phase 13 - Step 6)
// Customer photos wearing products with CMS moderation
// ============================================================
const CommunityGallery = {
  images: [],
  settings: {},
  productImagesCache: new Map(),
  moderationQueue: [],

  async init() {
    try {
      const response = await fetch('/data/community.json');
      if (response.ok) {
        const data = await response.json();
        this.images = data.images || [];
        this.settings = data.settings || {};
        this.moderationQueue = data.moderationQueue || [];
        this.buildProductCache();
        console.log('[CommunityGallery] Initialized:', this.images.length, 'approved images,', this.moderationQueue.length, 'pending');
      }
    } catch (e) {
      console.warn('[CommunityGallery] Failed to load community data:', e);
    }
  },

  buildProductCache() {
    this.productImagesCache.clear();
    this.images.forEach(img => {
      if (!this.productImagesCache.has(img.productId)) {
        this.productImagesCache.set(img.productId, []);
      }
      this.productImagesCache.get(img.productId).push(img);
    });
  },

  getProductImages(productId, options = {}) {
    const images = this.productImagesCache.get(productId) || [];
    const { 
      status = 'approved', 
      limit = 20,
      offset = 0
    } = options;

    let filtered = images.filter(i => i.status === status);
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered.slice(offset, offset + limit);
  },

  getAllImages(options = {}) {
    const { 
      status = 'approved', 
      limit = 50,
      offset = 0,
      featured = false
    } = options;

    let filtered = this.images.filter(i => i.status === status);
    if (featured) filtered = filtered.filter(i => i.featured === true);
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered.slice(offset, offset + limit);
  },

  getGalleryStats() {
    const approved = this.images.filter(i => i.status === 'approved');
    const pending = this.images.filter(i => i.status === 'pending');
    const rejected = this.images.filter(i => i.status === 'rejected');
    
    return {
      total: this.images.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      featured: approved.filter(i => i.featured).length,
      totalProducts: new Set(this.images.map(i => i.productId)).size
    };
  },

  // Customer submits image (requires verified purchase)
  async submitImage(imageData) {
    const validation = this.canUserSubmit(imageData.userId, imageData.productId);
    if (!validation.allowed) {
      return { success: false, error: validation.reason };
    }

    const { imageUrl, caption, taggedProducts = [], tags = [] } = imageData;

    if (!imageUrl) return { success: false, error: 'Slika je obavezna' };
    if (caption && caption.length > (this.settings?.maxCaptionLength || 300)) {
      return { success: false, error: 'Opis je predugačak' };
    }

    const user = state.user.get();
    const newImage = {
      id: 'cg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      ...imageData,
      userName: user.name,
      userInitials: user.name?.split(' ').map(n => n[0]).join('') || 'US',
      verifiedPurchase: true,
      taggedProducts: taggedProducts.filter(p => this.validateProductTag(p)),
      tags,
      helpfulVotes: 0,
      notHelpfulVotes: 0,
      status: this.settings?.autoApproveVerifiedPurchases ? 'approved' : 'pending',
      featured: false,
      adminNote: '',
      createdAt: new Date().toISOString(),
      moderatedAt: null,
      moderatedBy: null
    };

    this.images.push(newImage);
    if (newImage.status === 'pending') {
      this.moderationQueue.push(newImage.id);
    }
    this.save();
    this.buildProductCache();

    trackEvent('community_image_submitted', { productId: imageData.productId, hasTags: taggedProducts.length > 0 });

    return { success: true, image: newImage };
  },

  canUserSubmit(userId, productId) {
    if (!this.settings?.requireVerifiedPurchase) return { allowed: true };
    
    const user = state.user.get();
    if (!user) return { allowed: false, reason: 'login_required' };
    
    const purchased = user.orders?.some(order => 
      order.items.some(item => item.productId === productId)
    ) || false;
    
    if (!purchased) {
      return { allowed: false, reason: 'verified_purchase_required' };
    }

    return { allowed: true };
  },

  validateProductTag(tag) {
    return tag && tag.productId && tag.x >= 0 && tag.x <= 1 && tag.y >= 0 && tag.y <= 1;
  },

  // Vote helpful
  voteHelpful(imageId, helpful) {
    const image = this.images.find(i => i.id === imageId);
    if (!image) return { success: false, error: 'Slika nije pronađena' };

    const user = state.user.get();
    if (!user) return { success: false, error: 'Potrebna prijava' };

    const voteKey = 'community_vote_' + imageId;
    const existingVote = localStorage.getItem(voteKey);
    
    if (existingVote) {
      return { success: false, error: 'Već ste glasali' };
    }

    if (helpful) {
      image.helpfulVotes++;
    } else {
      image.notHelpfulVotes++;
    }
    
    this.save();
    localStorage.setItem(voteKey, helpful ? 'helpful' : 'not_helpful');
    
    trackEvent('community_image_vote', { imageId, helpful });
    return { success: true, helpfulVotes: image.helpfulVotes, notHelpfulVotes: image.notHelpfulVotes };
  },

  save() {
    try {
      localStorage.setItem('dalli_community', JSON.stringify({ 
        images: this.images, 
        settings: this.settings,
        moderationQueue: this.moderationQueue
      }));
    } catch (e) {
      console.warn('[CommunityGallery] Save failed:', e);
    }
  },

  // ============================================================
  // CMS MODERATION (Phase 13 - Step 11)
  // Admin tools: Approve, Reject, Feature
  // ============================================================
  
  // Admin: Get moderation queue
  getModerationQueue() {
    return this.moderationQueue.map(id => this.images.find(i => i.id === id)).filter(Boolean);
  },

  // Admin: Approve image
  approveImage(imageId, adminId) {
    const image = this.images.find(i => i.id === imageId);
    if (!image) return { success: false, error: 'Slika nije pronađena' };

    image.status = 'approved';
    image.moderatedAt = new Date().toISOString();
    image.moderatedBy = adminId;
    image.adminNote = '';
    
    // Remove from moderation queue
    this.moderationQueue = this.moderationQueue.filter(id => id !== imageId);
    
    this.save();
    this.buildProductCache();
    
    trackEvent('community_image_approved', { imageId, adminId });
    return { success: true, image };
  },

  // Admin: Reject image
  rejectImage(imageId, adminId, note) {
    const image = this.images.find(i => i.id === imageId);
    if (!image) return { success: false, error: 'Slika nije pronađena' };

    image.status = 'rejected';
    image.moderatedAt = new Date().toISOString();
    image.moderatedBy = adminId;
    image.adminNote = note || '';
    
    this.moderationQueue = this.moderationQueue.filter(id => id !== imageId);
    
    this.save();
    
    trackEvent('community_image_rejected', { imageId, adminId, reason: note });
    return { success: true, image };
  },

  // Admin: Feature/Unfeature image
  toggleFeature(imageId, adminId) {
    const image = this.images.find(i => i.id === imageId);
    if (!image) return { success: false, error: 'Slika nije pronađena' };
    if (image.status !== 'approved') return { success: false, error: 'Samo odobrene slike mogu biti featured' };

    image.featured = !image.featured;
    image.updatedAt = new Date().toISOString();
    
    this.save();
    
    trackEvent('community_image_featured', { imageId, adminId, featured: image.featured });
    return { success: true, image, featured: image.featured };
  },

  // Admin: Delete image
  deleteImage(imageId, adminId) {
    const index = this.images.findIndex(i => i.id === imageId);
    if (index === -1) return { success: false, error: 'Slika nije pronađena' };

    this.images.splice(index, 1);
    this.moderationQueue = this.moderationQueue.filter(id => id !== imageId);
    this.save();
    this.buildProductCache();
    
    trackEvent('community_image_deleted', { imageId, adminId });
    return { success: true };
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CommunityGallery.init());
} else {
  CommunityGallery.init();
}

window.CommunityGallery = CommunityGallery;

// ============================================================
// SOCIAL INTEGRATION (Phase 13 - Step 7)
// Instagram/TikTok inspiration - lightweight, no heavy feeds
// ============================================================
const SocialIntegration = {
  config: {
    instagram: {
      enabled: true,
      handle: '@dalliofficial',
      hashtag: '#DALLIstyle',
      embedUrl: 'https://www.instagram.com/dalliofficial/'
    },
    tiktok: {
      enabled: true,
      handle: '@dalliofficial',
      hashtag: '#DALLIstyle',
      embedUrl: 'https://www.tiktok.com/@dalliofficial'
    }
  },

  cache: {
    instagram: null,
    tiktok: null,
    lastFetch: 0
  },

  async init() {
    if (!this.config.instagram.enabled && !this.config.tiktok.enabled) return;
    
    // Add CSS for social widgets
    this.injectStyles();
    
    console.log('[SocialIntegration] Initialized');
  },

  injectStyles() {
    if (document.getElementById('social-integration-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'social-integration-styles';
    style.textContent = `
      .social-links { display: flex; gap: var(--space-3); margin-top: var(--space-4); }
      .social-link { 
        display: inline-flex; align-items: center; justify-content: center;
        width: 44px; height: 44px; border-radius: 50%;
        background: var(--color-bg); border: 1px solid var(--color-border);
        color: var(--color-text); text-decoration: none;
        transition: all var(--duration-fast);
      }
      .social-link:hover { 
        background: var(--color-primary); border-color: var(--color-primary);
        color: var(--color-text-inverse); transform: translateY(-2px);
      }
      .social-link svg { width: 20px; height: 20px; }
      .social-inspiration { 
        margin-top: var(--space-6); padding: var(--space-4);
        background: var(--color-bg); border-radius: var(--radius-card);
        border: 1px solid var(--color-border);
      }
      .social-inspiration h4 { 
        font-family: var(--font-display); font-size: var(--text-lg); 
        font-weight: var(--fw-light); margin-bottom: var(--space-3);
      }
      .social-inspiration-grid { 
        display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: var(--space-3); 
      }
      .social-inspiration-item { 
        aspect-ratio: 1; border-radius: var(--radius-btn); overflow: hidden;
        background: var(--color-bg-subtle); position: relative;
      }
      .social-inspiration-item img { 
        width: 100%; height: 100%; object-fit: cover; 
        transition: transform var(--duration-normal);
      }
      .social-inspiration-item:hover img { transform: scale(1.05); }
      .social-inspiration-overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity var(--duration-fast);
        color: white; font-size: var(--fs-sm); font-weight: var(--fw-medium);
      }
      .social-inspiration-item:hover .social-inspiration-overlay { opacity: 1; }
      .hashtag-badge { 
        display: inline-block; padding: var(--space-1) var(--space-2);
        background: var(--color-primary); color: white; border-radius: var(--radius-full);
        font-size: var(--fs-xs); font-weight: var(--fw-medium);
        margin-top: var(--space-2);
      }
    `;
    document.head.appendChild(style);
  },

  // Render social follow links (lightweight)
  renderFollowLinks(containerEl) {
    if (!containerEl) return;
    
    const links = [];
    if (this.config.instagram.enabled) {
      links.push(`
        <a href="${this.config.instagram.embedUrl}" target="_blank" rel="noopener noreferrer" 
           class="social-link" aria-label="Pratite nas na Instagram" title="Instagram">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
          </svg>
        </a>
      `);
    }
    if (this.config.tiktok.enabled) {
      links.push(`
        <a href="${this.config.tiktok.embedUrl}" target="_blank" rel="noopener noreferrer" 
           class="social-link" aria-label="Pratite nas na TikTok" title="TikTok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 8v7a5 5 0 0 1-4.22 4.95"/><path d="M6 8v7a5 5 0 0 0 4.22 4.95"/>
            <line x1="3.5" y1="12" x2="20.5" y2="12"/><line x1="12" y1="4" x2="12.01" y2="4"/>
          </svg>
        </a>
      `);
    }
    
    containerEl.innerHTML = `<div class="social-links">${links.join('')}</div>`;
  },

  // Render inspiration grid (lightweight - static placeholder images)
  renderInspirationGrid(containerEl, options = {}) {
    if (!containerEl) return;
    
    const { platform = 'instagram', limit = 6 } = options;
    const config = this.config[platform];
    if (!config?.enabled) return;
    
    // Placeholder inspiration images (in production: fetch from CMS or static curated set)
    const inspirationImages = this.getPlaceholderImages(platform, limit);
    
    containerEl.innerHTML = `
      <div class="social-inspiration">
        <h4>Inspiracija sa ${platform === 'instagram' ? 'Instagram' : 'TikTok'}</h4>
        <div class="social-inspiration-grid">
          ${inspirationImages.map(img => `
            <a href="${config.embedUrl}" target="_blank" rel="noopener noreferrer" 
               class="social-inspiration-item" style="background-image: url('${img}');">
              <span class="social-inspiration-overlay">Pogledaj na ${platform}</span>
            </a>
          `).join('')}
        </div>
        <span class="hashtag-badge">${config.hashtag}</span>
      </div>
    `;
  },

  getPlaceholderImages(platform, limit) {
    // Static curated images - no API calls, no heavy feeds
    // In production: replace with CMS-managed curated images
    const basePath = '/images/social-inspiration/';
    const images = [];
    for (let i = 1; i <= limit; i++) {
      images.push(`${basePath}${platform}-${i}.jpg`);
    }
    return images;
  },

  // Get hashtag for product tagging
  getHashtag(platform) {
    return this.config[platform]?.hashtag || '';
  },

  // Generate UGC campaign hashtag
  generateCampaignHashtag(campaignName) {
    return `#DALLI${campaignName.replace(/\s+/g, '')}`;
  },

  // Track social clicks (analytics)
  trackSocialClick(platform, action) {
    trackEvent('social_click', { platform, action });
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SocialIntegration.init());
} else {
  SocialIntegration.init();
}

window.SocialIntegration = SocialIntegration;

// ============================================================
// SHOP THE COMMUNITY (Phase 13 - Step 8)
// Tagged products in community images - click to view product
// ============================================================
const ShopTheCommunity = {
  // Render product tags on community image
  renderProductTags(imageEl, imageData) {
    if (!imageData.taggedProducts?.length) return;
    
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'shop-community-tags';
    tagsContainer.style.cssText = 'position: absolute; inset: 0; pointer-events: none;';
    
    imageData.taggedProducts.forEach((tag, index) => {
      const tagEl = document.createElement('button');
      tagEl.className = 'shop-community-tag';
      tagEl.type = 'button';
      tagEl.setAttribute('aria-label', `Proizvod: ${tag.productName || 'Proizvod #' + tag.productId}`);
      tagEl.style.cssText = `
        position: absolute; left: ${tag.x * 100}%; top: ${tag.y * 100}%;
        transform: translate(-50%, -50%);
        width: 40px; height: 40px; border-radius: 50%;
        background: var(--color-primary); border: 2px solid var(--color-bg);
        color: var(--color-text-inverse); cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2); pointer-events: auto;
        transition: transform var(--duration-fast), box-shadow var(--duration-fast);
        z-index: 10;
      `;
      tagEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
      
      tagEl.addEventListener('mouseenter', () => {
        tagEl.style.transform = 'translate(-50%, -50%) scale(1.15)';
        tagEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
        this.showProductTooltip(tagEl, tag);
      });
      tagEl.addEventListener('mouseleave', () => {
        tagEl.style.transform = 'translate(-50%, -50%) scale(1)';
        tagEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        this.hideProductTooltip();
      });
      tagEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.navigateToProduct(tag.productId);
      });
      
      tagsContainer.appendChild(tagEl);
    });
    
    imageEl.style.position = 'relative';
    imageEl.appendChild(tagsContainer);
    
    return tagsContainer;
  },

  // Show product tooltip on hover
  showProductTooltip(tagEl, tag) {
    this.hideProductTooltip();
    
    const product = state.products.get?.().find(p => p.id === tag.productId);
    if (!product) return;
    
    const tooltip = document.createElement('div');
    tooltip.id = 'shop-community-tooltip';
    tooltip.style.cssText = `
      position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
      margin-bottom: var(--space-2); padding: var(--space-3) var(--space-4);
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-btn); box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      min-width: 200px; max-width: 280px; z-index: 100;
      pointer-events: auto;
    `;
    tooltip.innerHTML = `
      <div style="display: flex; gap: var(--space-2); align-items: flex-start;">
        <img src="${product.images?.main || '/images/placeholder.jpg'}" alt="" 
             style="width: 56px; height: 56px; object-fit: cover; border-radius: var(--radius-btn); flex-shrink: 0;">
        <div style="flex: 1; min-width: 0;">
          <p style="font-weight: var(--fw-medium); color: var(--color-text); margin-bottom: var(--space-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${product.name}
          </p>
          <p style="font-size: var(--fs-sm); color: var(--color-primary); font-weight: var(--fw-semibold); margin-bottom: var(--space-2);">
            ${product.price?.I18n.formatNumber || '0'} RSD
          </p>
          <button class="btn btn-primary btn-sm" style="width: 100%;" 
                  onclick="ShopTheCommunity.navigateToProduct(${tag.productId}); document.getElementById('shop-community-tooltip')?.remove();">
            Pogledaj proizvod
          </button>
        </div>
      </div>
    `;
    
    tagEl.appendChild(tooltip);
  },

  hideProductTooltip() {
    const tooltip = document.getElementById('shop-community-tooltip');
    if (tooltip) tooltip.remove();
  },

  // Navigate to product page
  navigateToProduct(productId) {
    const product = state.products.get?.().find(p => p.id === productId);
    if (product?.slug) {
      window.location.href = `/proizvod-${product.slug}.html`;
    } else {
      window.location.href = `/proizvodi.html?id=${productId}`;
    }
    trackEvent('shop_community_click', { productId });
  },

  // Initialize product tags on all community images in a container
  initImageTags(containerEl) {
    if (!containerEl) return;
    
    const images = containerEl.querySelectorAll('[data-community-image]');
    images.forEach(imgEl => {
      const imageId = imgEl.dataset.communityImage;
      const imageData = window.CommunityGallery?.images?.find(i => i.id === imageId);
      if (imageData) {
        this.renderProductTags(imgEl, imageData);
      }
    });
  },

  // Create shoppable community image element
  createShoppableImage(imageData, options = {}) {
    const { width = '100%', aspectRatio = '1/1' } = options;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'shop-community-image-wrapper';
    wrapper.style.cssText = `position: relative; width: ${width}; aspect-ratio: ${aspectRatio}; border-radius: var(--radius-card); overflow: hidden;`;
    
    const img = document.createElement('img');
    img.src = imageData.imageUrl;
    img.alt = imageData.caption || 'Community photo';
    img.dataset.communityImage = imageData.id;
    img.loading = 'lazy';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    
    wrapper.appendChild(img);
    this.renderProductTags(wrapper, imageData);
    
    return wrapper;
  }
};

// Auto-init styles
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ShopTheCommunity.initStyles?.());
} else {
  ShopTheCommunity.initStyles?.();
}

window.ShopTheCommunity = ShopTheCommunity;

// ============================================================
// CMS MODERATION ADMIN UI (Phase 13 - Step 11.1)
// Admin page for reviewing pending community images & reviews
// ============================================================
const AdminModeration = {
  activeTab: 'images',
  filters: { status: 'pending', productId: '', search: '', dateFrom: '', dateTo: '' },
  selectedItems: new Set(),
  currentPage: 1,
  itemsPerPage: 20,

  async init() {
    // Only init on admin moderation page
    if (!document.getElementById('adminModeration')) return;
    
    this.cacheElements();
    this.bindEvents();
    this.loadQueue();
    console.log('[AdminModeration] Initialized');
  },

  cacheElements() {
    this.container = $('#adminModeration');
    this.tabs = {
      images: $('#modTabImages'),
      reviews: $('#modTabReviews'),
      questions: $('#modTabQuestions')
    };
    this.panels = {
      images: $('#modPanelImages'),
      reviews: $('#modPanelReviews'),
      questions: $('#modPanelQuestions')
    };
    this.queueTable = $('#modQueueTable');
    this.queueBody = $('#modQueueBody');
    this.pagination = $('#modPagination');
    this.bulkToolbar = $('#modBulkToolbar');
    this.bulkApprove = $('#modBulkApprove');
    this.bulkReject = $('#modBulkReject');
    this.bulkDelete = $('#modBulkDelete');
    this.selectAll = $('#modSelectAll');
    this.filterStatus = $('#modFilterStatus');
    this.filterProduct = $('#modFilterProduct');
    this.filterSearch = $('#modFilterSearch');
    this.filterDateFrom = $('#modFilterDateFrom');
    this.filterDateTo = $('#modFilterDateTo');
    this.applyFilters = $('#modApplyFilters');
    this.clearFilters = $('#modClearFilters');
    this.stats = {
      total: $('#modStatTotal'),
      pending: $('#modStatPending'),
      approved: $('#modStatApproved'),
      rejected: $('#modStatRejected')
    };
  },

  bindEvents() {
    // Tab switching
    Object.entries(this.tabs).forEach(([key, tab]) => {
      tab?.addEventListener('click', () => this.switchTab(key));
    });

    // Bulk actions
    this.bulkApprove?.addEventListener('click', () => this.bulkAction('approve'));
    this.bulkReject?.addEventListener('click', () => this.bulkAction('reject'));
    this.bulkDelete?.addEventListener('click', () => this.bulkAction('delete'));

    // Select all
    this.selectAll?.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));

    // Filters
    this.applyFilters?.addEventListener('click', () => this.applyFilterValues());
    this.clearFilters?.addEventListener('click', () => this.clearFilterValues());

    // Pagination
    this.pagination?.addEventListener('click', (e) => {
      const page = e.target.dataset.page;
      if (page) this.goToPage(parseInt(page));
    });
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.currentPage = 1;
    this.selectedItems.clear();
    
    Object.entries(this.tabs).forEach(([key, tabEl]) => {
      tabEl.classList.toggle('active', key === tab);
      this.panels[key].classList.toggle('hidden', key !== tab);
    });
    
    this.updateSelectAllState();
    this.loadQueue();
  },

  async loadQueue() {
    const data = this.getQueueData();
    const filtered = this.applyFiltersToData(data);
    this.renderStats(data);
    this.renderQueue(filtered);
  },

  getQueueData() {
    const images = window.CommunityGallery?.images || [];
    const reviews = window.ReviewSystem?.reviews || [];
    const questions = window.QASystem?.questions || [];

    switch (this.activeTab) {
      case 'images': return images;
      case 'reviews': return reviews;
      case 'questions': return questions;
      default: return [];
    }
  },

  applyFiltersToData(data) {
    let filtered = data;

    if (this.filters.status) {
      filtered = filtered.filter(item => item.status === this.filters.status);
    }
    if (this.filters.productId) {
      filtered = filtered.filter(item => item.productId == this.filters.productId);
    }
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.caption?.toLowerCase().includes(search)) ||
        (item.text?.toLowerCase().includes(search)) ||
        (item.question?.toLowerCase().includes(search)) ||
        (item.userName?.toLowerCase().includes(search))
      );
    }
    if (this.filters.dateFrom) {
      filtered = filtered.filter(item => new Date(item.createdAt) >= new Date(this.filters.dateFrom));
    }
    if (this.filters.dateTo) {
      filtered = filtered.filter(item => new Date(item.createdAt) <= new Date(this.filters.dateTo));
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return filtered;
  },

  renderStats(data) {
    const allItems = this.getQueueData();
    const stats = {
      total: allItems.length,
      pending: allItems.filter(i => i.status === 'pending').length,
      approved: allItems.filter(i => i.status === 'approved').length,
      rejected: allItems.filter(i => i.status === 'rejected').length
    };

    if (this.stats.total) this.stats.total.textContent = stats.total;
    if (this.stats.pending) this.stats.pending.textContent = stats.pending;
    if (this.stats.approved) this.stats.approved.textContent = stats.approved;
    if (this.stats.rejected) this.stats.rejected.textContent = stats.rejected;
  },

  renderQueue(items) {
    if (!this.queueBody) return;

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const pageItems = items.slice(start, end);

    if (!pageItems.length) {
      this.queueBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: var(--space-8); color: var(--color-text-tertiary);">
            Nema stavki za prikaz
          </td>
        </tr>
      `;
      this.renderPagination(items.length);
      return;
    }

    this.queueBody.innerHTML = pageItems.map(item => this.renderQueueRow(item)).join('');

    // Bind row checkboxes
    this.queueBody.querySelectorAll('.mod-row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => this.toggleItemSelection(e.target.dataset.id, e.target.checked));
    });

    // Bind action buttons
    this.queueBody.querySelectorAll('.mod-btn-approve').forEach(btn => {
      btn.addEventListener('click', () => this.singleAction(btn.dataset.id, 'approve'));
    });
    this.queueBody.querySelectorAll('.mod-btn-reject').forEach(btn => {
      btn.addEventListener('click', () => this.singleAction(btn.dataset.id, 'reject'));
    });
    this.queueBody.querySelectorAll('.mod-btn-feature').forEach(btn => {
      btn.addEventListener('click', () => this.singleAction(btn.dataset.id, 'feature'));
    });
    this.queueBody.querySelectorAll('.mod-btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this.singleAction(btn.dataset.id, 'delete'));
    });

    this.renderPagination(items.length);
  },

  renderQueueRow(item) {
    const date = I18n.formatDate(item.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); 
    const isSelected = this.selectedItems.has(item.id);
    const product = state.products.get?.().find(p => p.id === item.productId);
    const productName = product?.name || 'Proizvod #' + item.productId;

    const statusLabels = {
      pending: '<span class="status-badge status-pending">Na čekanju</span>',
      approved: '<span class="status-badge status-approved">Odobreno</span>',
      rejected: '<span class="status-badge status-rejected">Odbijeno</span>'
    };

    const canFeature = item.status === 'approved';
    const isFeatured = item.featured === true;

    return `
      <tr data-id="${item.id}" class="${isSelected ? 'selected' : ''}">
        <td style="width: 40px;">
          <input type="checkbox" class="mod-row-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
        </td>
        <td>
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="" style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-btn);">` : ''}
        </td>
        <td>
          <div style="font-weight: var(--fw-medium);">${item.userName || item.userInitials}</div>
          <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary);">${item.verifiedPurchase ? '✓ Verifikovano' : 'Neverifikovano'}</div>
        </td>
        <td>${escapeHtml(productName)}</td>
        <td>${statusLabels[item.status] || item.status}</td>
        <td>${date}</td>
        <td>
          <div class="mod-actions" style="display: flex; gap: var(--space-1);">
            <button class="mod-btn-approve btn btn-ghost btn-sm" data-id="${item.id}" ${item.status === 'approved' ? 'disabled' : ''} title="Odobri">
              ✓
            </button>
            <button class="mod-btn-reject btn btn-ghost btn-sm" data-id="${item.id}" ${item.status === 'rejected' ? 'disabled' : ''} title="Odbij">
              ✗
            </button>
            ${canFeature ? `
              <button class="mod-btn-feature btn btn-ghost btn-sm ${isFeatured ? 'active' : ''}" data-id="${item.id}" title="${isFeatured ? 't("admin.removeFeatured")' : 't("admin.setFeatured")'}">
                ★
              </button>
            ` : ''}
            <button class="mod-btn-delete btn btn-ghost btn-sm" data-id="${item.id}" title="Obriši">🗑</button>
          </div>
        </td>
      </tr>
    `;
  },

  renderPagination(totalItems) {
    if (!this.pagination) return;
    
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    if (totalPages <= 1) {
      this.pagination.innerHTML = '';
      return;
    }

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        html += `<button class="${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        html += '<span>...</span>';
      }
    }
    this.pagination.innerHTML = html;
  },

  // Selection
  toggleItemSelection(id, checked) {
    if (checked) this.selectedItems.add(id);
    else this.selectedItems.delete(id);
    this.updateSelectAllState();
    this.updateBulkToolbar();
  },

  toggleSelectAll(checked) {
    const checkboxes = this.queueBody?.querySelectorAll('.mod-row-checkbox') || [];
    checkboxes.forEach(cb => {
      cb.checked = checked;
      this.toggleItemSelection(cb.dataset.id, checked);
    });
  },

  updateSelectAllState() {
    const checkboxes = this.queueBody?.querySelectorAll('.mod-row-checkbox') || [];
    const checked = this.queueBody?.querySelectorAll('.mod-row-checkbox:checked') || [];
    if (this.selectAll) {
      this.selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
      this.selectAll.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
    }
  },

  updateBulkToolbar() {
    const count = this.selectedItems.size;
    if (this.bulkToolbar) {
      this.bulkToolbar.style.display = count > 0 ? 'flex' : 'none';
      const countEl = this.bulkToolbar.querySelector('.mod-selected-count'); if (countEl) countEl.textContent = count;
    }
  },

  // Single actions
  async singleAction(id, action) {
    const confirmMsg = {
      approve: 'Odobriti ovu stavku?',
      reject: 'Odbijeti ovu stavku?',
      feature: item.featured ? 'Ukloniti featured status?' : 'Postaviti kao featured?',
      delete: 'Obrisati ovu stavku? Ova akcija je ireverzibilna.'
    };
    const item = this.getItemById(id);
    if (!item) return;
    
    if (!confirm(confirmMsg[action].replace('item', item))) return;

    let result;
    switch (action) {
      case 'approve': result = window.CommunityGallery?.approveImage?.(id, 'admin'); break;
      case 'reject': 
        const reason = prompt('Razlog odbijanja (opciono):');
        result = window.CommunityGallery?.rejectImage?.(id, 'admin', reason); 
        break;
      case 'feature': result = window.CommunityGallery?.toggleFeature?.(id, 'admin'); break;
      case 'delete': result = window.CommunityGallery?.deleteImage?.(id, 'admin'); break;
    }

    if (result?.success) {
      showToast(t('success', { action }), 'success');
      this.loadQueue();
    } else {
      showToast(t('errors.generic', { error: result?.error }), 'error');
    }
  },

  // Bulk actions
  async bulkAction(action) {
    if (!this.selectedItems.size) return;
    
    const actionLabels = { approve: 'odobriti', reject: 'odbiti', delete: 'obrisati' };
    if (!confirm(`t("common.confirmBulkAction", { action: actionLabels[action], count: this.selectedItems.size })`)) return;

    let successCount = 0;
    for (const id of this.selectedItems) {
      let result;
      switch (action) {
        case 'approve': result = window.CommunityGallery?.approveImage?.(id, 'admin'); break;
        case 'reject': result = window.CommunityGallery?.rejectImage?.(id, 'admin', 'Bulk reject'); break;
        case 'delete': result = window.CommunityGallery?.deleteImage?.(id, 'admin'); break;
      }
      if (result?.success) successCount++;
    }

    this.selectedItems.clear();
    showToast(`Uspešno ${actionLabels[action]} ${successCount} stavki`, 'success');
    this.loadQueue();
  },

  getItemById(id) {
    const data = this.getQueueData();
    return data.find(i => i.id === id);
  },

  applyFilterValues() {
    this.filters = {
      status: this.filterStatus?.value || 'pending',
      productId: this.filterProduct?.value || '',
      search: this.filterSearch?.value || '',
      dateFrom: this.filterDateFrom?.value || '',
      dateTo: this.filterDateTo?.value || ''
    };
    this.currentPage = 1;
    this.loadQueue();
  },

  clearFilterValues() {
    this.filters = { status: 'pending', productId: '', search: '', dateFrom: '', dateTo: '' };
    if (this.filterStatus) this.filterStatus.value = 'pending';
    if (this.filterProduct) this.filterProduct.value = '';
    if (this.filterSearch) this.filterSearch.value = '';
    if (this.filterDateFrom) this.filterDateFrom.value = '';
    if (this.filterDateTo) this.filterDateTo.value = '';
    this.currentPage = 1;
    this.loadQueue();
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadQueue();
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdminModeration.init());
} else {
  AdminModeration.init();
}

window.AdminModeration = AdminModeration;

// ============================================================
// MODERATION SETTINGS (Phase 13 - Step 11.4)
// Admin configuration for moderation rules
// ============================================================
const ModerationSettings = {
  defaults: {
    // Auto-approval
    autoApproveVerifiedPurchases: false,
    autoApproveTrustedUsers: false,
    trustedUserMinOrders: 5,
    trustedUserMinRating: 4.5,

    // Requirements
    requireVerifiedPurchase: true,
    requireLoginToSubmit: true,
    requireMinCaptionLength: 10,
    maxCaptionLength: 300,

    // Media
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxImageSizeMB: 5,
    maxImagesPerSubmission: 5,
    allowVideos: false,
    maxVideoSizeMB: 20,
    maxVideoDurationSeconds: 60,

    // Moderation
    moderationRequired: true,
    moderationTimeoutHours: 48,
    escalationEnabled: true,

    // Notifications
    notifyAdminsOnNew: true,
    notifyUserOnDecision: true,
    notifyUserOnFeature: true,

    // Content rules
    blockedWords: [],
    minHelpfulVotesForFeature: 5,
    maxTagsPerImage: 5,

    // Permissions
    moderatorCanApprove: true,
    moderatorCanReject: true,
    moderatorCanFeature: false,
    moderatorCanDelete: false,
    moderatorCanChangeSettings: false
  },

  current: null,

  async init() {
    await this.load();
    this.bindSettingsForm();
    console.log('[ModerationSettings] Initialized');
  },

  async load() {
    try {
      const saved = localStorage.getItem('dalli_moderation_settings');
      if (saved) {
        this.current = { ...this.defaults, ...JSON.parse(saved) };
      } else {
        this.current = { ...this.defaults };
        await this.save();
      }
    } catch (e) {
      console.warn('[ModerationSettings] Load failed, using defaults:', e);
      this.current = { ...this.defaults };
    }
    this.applyToSystems();
  },

  applyToSystems() {
    // Apply to CommunityGallery
    if (window.CommunityGallery) {
      window.CommunityGallery.settings = {
        ...window.CommunityGallery.settings,
        autoApproveVerifiedPurchases: this.current.autoApproveVerifiedPurchases,
        requireVerifiedPurchase: this.current.requireVerifiedPurchase,
        requireLoginToSubmit: this.current.requireLoginToSubmit,
        maxCaptionLength: this.current.maxCaptionLength,
        allowedImageTypes: this.current.allowedImageTypes,
        maxImageSizeMB: this.current.maxImageSizeMB,
        allowVideos: this.current.allowVideos,
        maxVideoSizeMB: this.current.maxVideoSizeMB,
        maxVideoDurationSeconds: this.current.maxVideoDurationSeconds,
        moderationRequired: this.current.moderationRequired,
        maxTagsPerImage: this.current.maxTagsPerImage
      };
    }

    // Apply to ReviewSystem
    if (window.ReviewSystem) {
      window.ReviewSystem.settings = {
        ...window.ReviewSystem.settings,
        requireVerifiedPurchase: this.current.requireVerifiedPurchase,
        requireLoginToReview: this.current.requireLoginToSubmit,
        autoApproveVerifiedPurchases: this.current.autoApproveVerifiedPurchases,
        textMinLength: this.current.requireMinCaptionLength,
        textMaxLength: this.current.maxCaptionLength
      };
    }

    // Apply to QASystem
    if (window.QASystem) {
      window.QASystem.settings = {
        ...window.QASystem.settings,
        requireVerifiedPurchaseToAsk: this.current.requireVerifiedPurchase,
        requireLoginToAsk: this.current.requireLoginToSubmit,
        requireAdminApproval: this.current.moderationRequired
      };
    }
  },

  bindSettingsForm() {
    const form = $('#moderationSettingsForm');
    if (!form) return;

    // Populate form with current settings
    Object.entries(this.current).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox') input.checked = value;
        else if (input.type === 'number') input.value = value;
        else if (Array.isArray(value)) input.value = value.join(', ');
        else input.value = value;
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveFromForm(form);
    });

    // Reset to defaults
    const resetBtn = form.querySelector('[data-action="reset-defaults"]');
    resetBtn?.addEventListener('click', () => this.resetToDefaults(form));
  },

  saveFromForm(form) {
    const formData = new FormData(form);
    const newSettings = {};

    formData.forEach((value, key) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox') newSettings[key] = input.checked;
        else if (input.type === 'number') newSettings[key] = parseInt(value) || 0;
        else if (input.tagName === 'TEXTAREA' && key === 'blockedWords') {
          newSettings[key] = value.split(String.fromCharCode(10)).map(w => w.trim()).filter(Boolean);
        } else {
          newSettings[key] = value;
        }
      }
    });

    this.current = { ...this.defaults, ...newSettings };
    this.save();
    this.applyToSystems();
    showToast('Moderation settings saved', 'success');
  },

  async save() {
    try {
      localStorage.setItem('dalli_moderation_settings', JSON.stringify(this.current));
    } catch (e) {
      console.warn('[ModerationSettings] Save failed:', e);
    }
  },

  resetToDefaults(form) {
    if (!confirm('Vratiti sve podrazumevane vrednosti?')) return;
    this.current = { ...this.defaults };
    this.save();
    this.bindSettingsForm(); // Re-populate form
    this.applyToSystems();
    showToast('Settings reset to defaults', 'info');
  },

  get(key) {
    return this.current?.[key] ?? this.defaults[key];
  },

  set(key, value) {
    if (this.defaults.hasOwnProperty(key)) {
      this.current[key] = value;
      this.save();
      this.applyToSystems();
    }
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ModerationSettings.init());
} else {
  ModerationSettings.init();
}

window.ModerationSettings = ModerationSettings;


// ============================================================
// MODERATION HISTORY / AUDIT LOG (Phase 13 - Step 11.5)
// Audit trail for all moderation actions
// ============================================================
const ModerationHistory = {
  logs: [],
  maxLogs: 10000,

  async init() {
    await this.load();
    this.bindHistoryPage();
    console.log('[ModerationHistory] Initialized');
  },

  async load() {
    try {
      const saved = localStorage.getItem('dalli_moderation_history');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[ModerationHistory] Load failed:', e);
      this.logs = [];
    }
  },

  // Log a moderation action
  log(action, data) {
    const entry = {
      id: 'modlog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      action, // 'approve', 'reject', 'feature', 'unfeature', 'delete', 'bulk_approve', 'bulk_reject', 'bulk_delete', 'settings_change'
      ...data,
      timestamp: new Date().toISOString(),
      adminId: data.adminId || (state.user.get()?.id || 'unknown'),
      adminName: data.adminName || (state.user.get()?.name || 'Unknown'),
      ip: data.ip || 'local'
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) this.logs = this.logs.slice(0, this.maxLogs);
    this.save();

    // Track analytics
    trackEvent('moderation_action', { action, targetType: data.targetType, targetId: data.targetId });
  },

  save() {
    try {
      localStorage.setItem('dalli_moderation_history', JSON.stringify(this.logs));
    } catch (e) {
      console.warn('[ModerationHistory] Save failed:', e);
    }
  },

  // Get logs with filters
  getLogs(filters = {}) {
    let filtered = this.logs;

    if (filters.action) {
      filtered = filtered.filter(l => l.action === filters.action);
    }
    if (filters.adminId) {
      filtered = filtered.filter(l => l.adminId === filters.adminId);
    }
    if (filters.targetType) {
      filtered = filtered.filter(l => l.targetType === filters.targetType);
    }
    if (filters.targetId) {
      filtered = filtered.filter(l => l.targetId === filters.targetId);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filtered = filtered.filter(l => new Date(l.timestamp) <= new Date(filters.dateTo));
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(l => 
        l.adminName?.toLowerCase().includes(search) ||
        l.targetId?.toLowerCase().includes(search) ||
        l.reason?.toLowerCase().includes(search)
      );
    }

    return filtered;
  },

  // Get stats
  getStats(periodDays = 30) {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const recent = this.logs.filter(l => new Date(l.timestamp) >= since);

    const byAction = {};
    const byAdmin = {};

    recent.forEach(log => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byAdmin[log.adminId] = (byAdmin[log.adminId] || 0) + 1;
    });

    return {
      total: recent.length,
      byAction,
      byAdmin,
      topAdmin: Object.entries(byAdmin).sort((a, b) => b[1] - a[1])[0] || null
    };
  },

  bindHistoryPage() {
    const container = $('#moderationHistory');
    if (!container) return;

    this.renderHistory(container);
  },

  renderHistory(container) {
    const filters = this.getFiltersFromURL();
    const logs = this.getLogs(filters);
    const stats = this.getStats();

    container.innerHTML = `
      <div class="mod-history-header" style="margin-bottom: var(--space-6);">
        <h3 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--fw-light);">
          Moderation History
        </h3>
        <div class="mod-history-stats" style="display: flex; gap: var(--space-4); margin-top: var(--space-4);">
          <div class="stat-card" style="flex: 1; padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-2xl); font-weight: var(--fw-bold); color: var(--color-text);">${stats.total}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Total Actions (30d)</div>
          </div>
          <div class="stat-card" style="flex: 1; padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-2xl); font-weight: var(--fw-bold); color: var(--color-success);">${stats.byAction.approve || 0}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Approved</div>
          </div>
          <div class="stat-card" style="flex: 1; padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-2xl); font-weight: var(--fw-bold); color: var(--color-error);">${stats.byAction.reject || 0}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Rejected</div>
          </div>
          <div class="stat-card" style="flex: 1; padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-2xl); font-weight: var(--fw-bold); color: var(--color-warning);">${stats.byAction.feature || 0}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Featured</div>
          </div>
        </div>
      </div>

      <div class="mod-history-filters" style="display: flex; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-4); padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
        <select id="histFilterAction" style="padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-btn);">
          <option value="">All Actions</option>
          <option value="approve" ${filters.action === 'approve' ? 'selected' : ''}>Approve</option>
          <option value="reject" ${filters.action === 'reject' ? 'selected' : ''}>Reject</option>
          <option value="feature" ${filters.action === 'feature' ? 'selected' : ''}>Feature</option>
          <option value="unfeature" ${filters.action === 'unfeature' ? 'selected' : ''}>Unfeature</option>
          <option value="delete" ${filters.action === 'delete' ? 'selected' : ''}>Delete</option>
          <option value="bulk_approve" ${filters.action === 'bulk_approve' ? 'selected' : ''}>Bulk Approve</option>
          <option value="bulk_reject" ${filters.action === 'bulk_reject' ? 'selected' : ''}>Bulk Reject</option>
          <option value="bulk_delete" ${filters.action === 'bulk_delete' ? 'selected' : ''}>Bulk Delete</option>
        </select>
        <input type="text" id="histFilterSearch" placeholder="Search..." value="${filters.search || ''}" style="flex: 1; min-width: 200px; padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-btn);">
        <input type="date" id="histFilterDateFrom" value="${filters.dateFrom || ''}" style="padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-btn);">
        <input type="date" id="histFilterDateTo" value="${filters.dateTo || ''}" style="padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-btn);">
        <button id="histApplyFilters" class="btn btn-primary">Primeni</button>
        <button id="histClearFilters" class="btn btn-secondary">Očisti</button>
        <button id="histExportCSV" class="btn btn-secondary">Export CSV</button>
      </div>

      <div class="mod-history-table" style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--color-border);">
              <th style="text-align: left; padding: var(--space-3); font-weight: var(--fw-semibold);">Datum/Vreme</th>
              <th style="text-align: left; padding: var(--space-3); font-weight: var(--fw-semibold);">Akcija</th>
              <th style="text-align: left; padding: var(--space-3); font-weight: var(--fw-semibold);">Admin</th>
              <th style="text-align: left; padding: var(--space-3); font-weight: var(--fw-semibold);">Tip</th>
              <th style="text-align: left; padding: var(--space-3); font-weight: var(--fw-semibold);">ID Stavke</th>
              <th style="text-align: left; padding: var(--space-3); font-weight: var(--fw-semibold);">Razlog</th>
            </tr>
          </thead>
          <tbody id="histLogBody">
            ${logs.slice(0, 50).map(log => this.renderLogRow(log)).join('')}
          </tbody>
        </table>
      </div>

      <div class="mod-history-pagination" style="display: flex; justify-content: center; gap: var(--space-2); margin-top: var(--space-4);" id="histPagination">
        ${this.renderPagination(logs.length)}
      </div>
    `;

    this.bindHistoryEvents();
  },

  getFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
      action: params.get('action') || '',
      search: params.get('search') || '',
      dateFrom: params.get('dateFrom') || '',
      dateTo: params.get('dateTo') || ''
    };
  },

  renderLogRow(log) {
    const date = new Date(log.timestamp).toLocaleString('sr-RS', { 
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const actionLabels = {
      approve: '<span class="badge badge-success">Odobreno</span>',
      reject: '<span class="badge badge-error">Odbijeno</span>',
      feature: '<span class="badge badge-warning">Featured</span>',
      unfeature: '<span class="badge badge-info">Unfeatured</span>',
      delete: '<span class="badge badge-error">Obrisano</span>',
      bulk_approve: '<span class="badge badge-success">Bulk Odobreno</span>',
      bulk_reject: '<span class="badge badge-error">Bulk Odbijeno</span>',
      bulk_delete: '<span class="badge badge-error">Bulk Obrisano</span>',
      settings_change: '<span class="badge badge-info">Settings</span>'
    };

    const typeLabels = {
      image: 'Slika',
      review: 'Recenzija',
      question: 'Pitanje'
    };

    return `
      <tr style="border-bottom: 1px solid var(--color-divider);">
        <td style="padding: var(--space-3); font-size: var(--fs-sm); color: var(--color-text-tertiary);">${date}</td>
        <td style="padding: var(--space-3);">${actionLabels[log.action] || log.action}</td>
        <td style="padding: var(--space-3); font-weight: var(--fw-medium);">${log.adminName}</td>
        <td style="padding: var(--space-3);">${typeLabels[log.targetType] || log.targetType}</td>
        <td style="padding: var(--space-3); font-family: var(--font-mono); font-size: var(--fs-xs);">${log.targetId}</td>
        <td style="padding: var(--space-3); font-size: var(--fs-sm); color: var(--color-text-secondary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.reason || '-'}</td>
      </tr>
    `;
  },

  renderPagination(total) {
    // Simplified - just show count
    return `<span style="padding: var(--space-2) var(--space-3); color: var(--color-text-tertiary);">Prikazano ${Math.min(total, 50)} od ${total} rezultata</span>`;
  },

  bindHistoryEvents() {
    $('#histApplyFilters')?.addEventListener('click', () => this.applyFilters());
    $('#histClearFilters')?.addEventListener('click', () => this.clearFilters());
    $('#histExportCSV')?.addEventListener('click', () => this.exportCSV());
  },

  applyFilters() {
    const params = new URLSearchParams();
    const action = $('#histFilterAction')?.value;
    const search = $('#histFilterSearch')?.value;
    const dateFrom = $('#histFilterDateFrom')?.value;
    const dateTo = $('#histFilterDateTo')?.value;

    if (action) params.set('action', action);
    if (search) params.set('search', search);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    window.location.search = params.toString();
  },

  clearFilters() {
    window.location.search = '';
  },

  exportCSV() {
    const filters = this.getFiltersFromURL();
    const logs = this.getLogs(filters);

    const headers = ['Timestamp', 'Action', 'Admin', 'Target Type', 'Target ID', 'Reason'];
    const rows = logs.map(log => [
      log.timestamp,
      log.action,
      log.adminName,
      log.targetType,
      log.targetId,
      log.reason || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))].join(String.fromCharCode(10));
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'moderation-history-' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
    
    showToast('CSV exported', 'success');
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ModerationHistory.init());
} else {
  ModerationHistory.init();
}

window.ModerationHistory = ModerationHistory;

// ============================================================
// ADMIN NOTIFICATIONS (Phase 13 - Step 11.7)
// Email/Push notifications for new moderation items
// ============================================================
const AdminNotifications = {
  config: {
    emailEnabled: true,
    pushEnabled: true,
    notifyOnNewImage: true,
    notifyOnNewReview: true,
    notifyOnNewQuestion: true,
    notifyOnBulkAction: true,
    digestEnabled: true,
    digestIntervalHours: 6
  },

  lastNotified: {
    images: 0,
    reviews: 0,
    questions: 0
  },

  async init() {
    this.loadConfig();
    this.startPolling();
    console.log('[AdminNotifications] Initialized');
  },

  loadConfig() {
    try {
      const saved = localStorage.getItem('dalli_admin_notifications');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[AdminNotifications] Config load failed:', e);
    }
  },

  saveConfig() {
    try {
      localStorage.setItem('dalli_admin_notifications', JSON.stringify(this.config));
    } catch (e) {
      console.warn('[AdminNotifications] Config save failed:', e);
    }
  },

  // Start polling for new items
  startPolling() {
    // Check every 2 minutes
    setInterval(() => this.checkForNewItems(), 2 * 60 * 1000);
    // Initial check
    setTimeout(() => this.checkForNewItems(), 5000);
  },

  async checkForNewItems() {
    if (!this.config.emailEnabled && !this.config.pushEnabled) return;

    const user = state.user.get();
    if (!user || !this.isAdminOrModerator(user)) return;

    // Check CommunityGallery
    if (this.config.notifyOnNewImage) {
      await this.checkNewImages();
    }
    // Check ReviewSystem
    if (this.config.notifyOnNewReview) {
      await this.checkNewReviews();
    }
    // Check QASystem
    if (this.config.notifyOnNewQuestion) {
      await this.checkNewQuestions();
    }
  },

  isAdminOrModerator(user) {
    return user.role === 'admin' || user.role === 'moderator';
  },

  async checkNewImages() {
    const images = window.CommunityGallery?.images || [];
    const pending = images.filter(i => i.status === 'pending');
    if (pending.length > this.lastNotified.images) {
      const newCount = pending.length - this.lastNotified.images;
      this.lastNotified.images = pending.length;
      await this.notify('new_images', { count: newCount, totalPending: pending.length });
    }
  },

  async checkNewReviews() {
    const reviews = window.ReviewSystem?.reviews || [];
    const pending = reviews.filter(r => r.status === 'pending');
    if (pending.length > this.lastNotified.reviews) {
      const newCount = pending.length - this.lastNotified.reviews;
      this.lastNotified.reviews = pending.length;
      await this.notify('new_reviews', { count: newCount, totalPending: pending.length });
    }
  },

  async checkNewQuestions() {
    const questions = window.QASystem?.questions || [];
    const pending = questions.filter(q => q.status === 'pending');
    if (pending.length > this.lastNotified.questions) {
      const newCount = pending.length - this.lastNotified.questions;
      this.lastNotified.questions = pending.length;
      await this.notify('new_questions', { count: newCount, totalPending: pending.length });
    }
  },

  async notify(type, data) {
    const user = state.user.get();
    if (!user?.email) return;

    const notifications = [];

    if (this.config.emailEnabled) {
      notifications.push(this.sendEmail(type, data, user.email));
    }
    if (this.config.pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      notifications.push(this.sendPush(type, data));
    }

    await Promise.all(notifications);
  },

  async sendEmail(type, data, email) {
    const templates = {
      new_images: {
        subject: `t("moderation.pendingImages", { count: data.count })`,
        body: `t("moderation.pendingImages", { count: data.count, total: data.totalPending })

<a href="/admin/moderation.html" style="display: inline-block; padding: 12px 24px; background: #2c3e50; color: white; text-decoration: none; border-radius: 4px;">${t("common.adminPanel")}</a>`
      },
      new_reviews: {
        subject: `t("moderation.pendingReviews", { count: data.count })`,
        body: `t("moderation.pendingReviews", { count: data.count, total: data.totalPending })

<a href="/admin/moderation.html" style="display: inline-block; padding: 12px 24px; background: #2c3e50; color: white; text-decoration: none; border-radius: 4px;">${t("common.adminPanel")}</a>`
      },
      new_questions: {
        subject: `t("moderation.pendingQuestions", { count: data.count })`,
        body: `t("moderation.pendingQuestions", { count: data.count, total: data.totalPending })

<a href="/admin/moderation.html" style="display: inline-block; padding: 12px 24px; background: #2c3e50; color: white; text-decoration: none; border-radius: 4px;">${t("common.adminPanel")}</a>`
      }
    };

    const template = templates[type];
    if (!template) return;

    // Use EmailService if available
    if (window.EmailService?.send) {
      await window.EmailService.send('admin_notification', {
        subject: template.subject,
        body: template.body,
        count: data.count,
        totalPending: data.totalPending,
        moderationUrl: '/admin/moderation.html'
      }, email);
    } else {
      console.log('[AdminNotifications] Email would be sent:', template.subject, 'to', email);
    }
  },

  async sendPush(type, data) {
    const titles = {
      new_images: 'Nove slike za moderaciju',
      new_reviews: 'Nove recenzije za moderaciju',
      new_questions: 'Nova pitanja za moderaciju'
    };
    const body = `${t('moderation.pendingItems', { count: data.count, totalPending: data.totalPending })}`;

    try {
      new Notification(titles[type], {
        body,
        icon: '/images/icons/icon-192x192.png',
        tag: 'moderation-' + type,
        requireInteraction: true
      });
    } catch (e) {
      console.warn('[AdminNotifications] Push failed:', e);
    }
  },

  // Request notification permission
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  },

  // Digest email (periodic summary)
  async sendDigest() {
    if (!this.config.digestEnabled) return;

    const user = state.user.get();
    if (!user?.email || !this.isAdminOrModerator(user)) return;

    const images = window.CommunityGallery?.images || [];
    const reviews = window.ReviewSystem?.reviews || [];
    const questions = window.QASystem?.questions || [];

    const pendingImages = images.filter(i => i.status === 'pending').length;
    const pendingReviews = reviews.filter(r => r.status === 'pending').length;
    const pendingQuestions = questions.filter(q => q.status === 'pending').length;

    if (pendingImages + pendingReviews + pendingQuestions === 0) return;

    await window.EmailService?.send('moderation_digest', {
      pendingImages,
      pendingReviews,
      pendingQuestions,
      moderationUrl: '/admin/moderation.html'
    }, user.email);
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    AdminNotifications.init();
    AdminNotifications.requestPermission();
  });
} else {
  AdminNotifications.init();
  AdminNotifications.requestPermission();
}

window.AdminNotifications = AdminNotifications;


// ============================================================
// PERMISSIONS ENFORCEMENT (Phase 13 - Step 11.8)
// Role-based access control for moderation actions
// ============================================================
const ModerationPermissions = {
  roles: {
    admin: {
      canApprove: true,
      canReject: true,
      canFeature: true,
      canDelete: true,
      canChangeSettings: true,
      canViewHistory: true,
      canExportHistory: true,
      canManageUsers: true
    },
    moderator: {
      canApprove: true,
      canReject: true,
      canFeature: false,
      canDelete: false,
      canChangeSettings: false,
      canViewHistory: true,
      canExportHistory: false,
      canManageUsers: false
    },
    user: {
      canApprove: false,
      canReject: false,
      canFeature: false,
      canDelete: false,
      canChangeSettings: false,
      canViewHistory: false,
      canExportHistory: false,
      canManageUsers: false
    }
  },

  getCurrentUserRole() {
    const user = state.user.get();
    if (!user) return 'user';
    return user.role || 'user';
  },

  getPermissions() {
    const role = this.getCurrentUserRole();
    return this.roles[role] || this.roles.user;
  },

  can(action) {
    const perms = this.getPermissions();
    return perms[action] === true;
  },

  // Middleware: wrap action with permission check
  requirePermission(action, callback) {
    if (this.can(action)) {
      return callback();
    }
    showToast('Nemate dozvolu za ovu akciju: ' + action, 'error');
    trackEvent('permission_denied', { action, role: this.getCurrentUserRole() });
    return null;
  },

  // Check specific permissions
  canApprove() { return this.can('canApprove'); },
  canReject() { return this.can('canReject'); },
  canFeature() { return this.can('canFeature'); },
  canDelete() { return this.can('canDelete'); },
  canChangeSettings() { return this.can('canChangeSettings'); },
  canViewHistory() { return this.can('canViewHistory'); },
  canExportHistory() { return this.can('canExportHistory'); },
  canManageUsers() { return this.can('canManageUsers'); },

  // Get UI visibility for elements
  getUIFlags() {
    const perms = this.getPermissions();
    return {
      showApproveBtn: perms.canApprove,
      showRejectBtn: perms.canReject,
      showFeatureBtn: perms.canFeature,
      showDeleteBtn: perms.canDelete,
      showSettingsTab: perms.canChangeSettings,
      showHistoryTab: perms.canViewHistory,
      showExportBtn: perms.canExportHistory,
      showUserManagement: perms.canManageUsers
    };
  }
};

// Integrate permissions into AdminModeration
const originalAdminModerationInit = window.AdminModeration?.init;
window.AdminModeration.init = function() {
  const uiFlags = window.ModerationPermissions?.getUIFlags();
  if (uiFlags) {
    // Hide/show UI elements based on permissions
    Object.entries(uiFlags).forEach(([key, show]) => {
      const elements = document.querySelectorAll('[data-permission="' + key + '"]');
      elements.forEach(el => el.style.display = show ? '' : 'none');
    });
  }
  if (originalAdminModerationInit) originalAdminModerationInit.call(this);
};

// Wrap AdminModeration actions with permission checks
const originalSingleAction = window.AdminModeration?.singleAction;
window.AdminModeration.singleAction = function(id, action) {
  const permMap = {
    approve: 'canApprove',
    reject: 'canReject',
    feature: 'canFeature',
    delete: 'canDelete'
  };
  const perm = permMap[action];
  if (perm && !window.ModerationPermissions?.can(perm)) {
    showToast('Nemate dozvolu za: ' + action, 'error');
    return;
  }
  if (originalSingleAction) return originalSingleAction.call(this, id, action);
};

const originalBulkAction = window.AdminModeration?.bulkAction;
window.AdminModeration.bulkAction = function(action) {
  const permMap = {
    approve: 'canApprove',
    reject: 'canReject',
    delete: 'canDelete'
  };
  const perm = permMap[action];
  if (perm && !window.ModerationPermissions?.can(perm)) {
    showToast('Nemate dozvolu za bulk: ' + action, 'error');
    return;
  }
  if (originalBulkAction) return originalBulkAction.call(this, action);
};

window.ModerationPermissions = ModerationPermissions;

// ============================================================
// COMMUNITY ANALYTICS (Phase 13 - Step 12)
// Track: review submissions, review views, photo review engagement, community gallery engagement
// ============================================================
const CommunityAnalytics = {
  events: [],
  maxEvents: 5000,
  flushInterval: 30000,
  flushTimer: null,

  async init() {
    this.loadEvents();
    this.bindExistingTrackers();
    this.startFlushTimer();
    console.log('[CommunityAnalytics] Initialized');
  },

  loadEvents() {
    try {
      const saved = localStorage.getItem('dalli_community_analytics');
      if (saved) {
        this.events = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[CommunityAnalytics] Load failed:', e);
      this.events = [];
    }
  },

  saveEvents() {
    try {
      localStorage.setItem('dalli_community_analytics', JSON.stringify(this.events.slice(-this.maxEvents)));
    } catch (e) {
      console.warn('[CommunityAnalytics] Save failed:', e);
    }
  },

  // Track an event
  track(eventName, data = {}) {
    const event = {
      id: 'ca_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      event: eventName,
      timestamp: new Date().toISOString(),
      userId: state.user.get()?.id || 'anonymous',
      userTier: state.user.get()?.loyalty?.tier || 'none',
      sessionId: this.getSessionId(),
      ...data
    };

    this.events.push(event);

    // Also push to global dataLayer for GA/GTM
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'community_' + eventName,
        ...data,
        userTier: event.userTier
      });
    }

    // Flush if buffer full
    if (this.events.length >= 100) this.flush();
  },

  getSessionId() {
    let sessionId = sessionStorage.getItem('dalli_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('dalli_session_id', sessionId);
    }
    return sessionId;
  },

  // Bind to existing system events
  bindExistingTrackers() {
    // Review submissions
    const originalSubmitReview = window.ReviewSystem?.submitReview;
    if (originalSubmitReview) {
      window.ReviewSystem.submitReview = async function(...args) {
        const result = await originalSubmitReview.apply(this, args);
        if (result?.success) {
          window.CommunityAnalytics?.track('review_submitted', {
            productId: args[0]?.productId,
            rating: args[0]?.rating,
            hasPhotos: (args[0]?.photos?.length || 0) > 0,
            hasVideos: (args[0]?.videos?.length || 0) > 0,
            verifiedPurchase: result.review?.verifiedPurchase
          });
        }
        return result;
      };
    }

    // Review views (when ReviewDisplay loads)
    const originalReviewDisplayInit = window.ReviewDisplay?.init;
    if (originalReviewDisplayInit) {
      window.ReviewDisplay.init = function(...args) {
        const result = originalReviewDisplayInit.apply(this, args);
        if (this.productId) {
          window.CommunityAnalytics?.track('review_view', {
            productId: this.productId,
            reviewsCount: window.ReviewSystem?.getProductReviews?.(this.productId)?.length || 0
          });
        }
        return result;
      };
    }

    // Helpful votes on reviews
    const originalVoteHelpful = window.ReviewSystem?.voteHelpful;
    if (originalVoteHelpful) {
      window.ReviewSystem.voteHelpful = function(...args) {
        const result = originalVoteHelpful.apply(this, args);
        if (result?.success) {
          window.CommunityAnalytics?.track('review_vote', {
            reviewId: args[0],
            helpful: args[1],
            helpfulVotes: result.helpfulVotes,
            notHelpfulVotes: result.notHelpfulVotes
          });
        }
        return result;
      };
    }

    // Q&A submissions
    const originalSubmitQuestion = window.QASystem?.submitQuestion;
    if (originalSubmitQuestion) {
      window.QASystem.submitQuestion = async function(...args) {
        const result = await originalSubmitQuestion.apply(this, args);
        if (result?.success) {
          window.CommunityAnalytics?.track('question_submitted', {
            productId: args[0]?.productId
          });
        }
        return result;
      };
    }

    // Q&A votes
    const originalQAVote = window.QASystem?.voteHelpful;
    if (originalQAVote) {
      window.QASystem.voteHelpful = function(...args) {
        const result = originalQAVote.apply(this, args);
        if (result?.success) {
          window.CommunityAnalytics?.track('qa_vote', {
            questionId: args[0],
            helpful: args[1]
          });
        }
        return result;
      };
    }

    // Community Gallery submissions
    const originalSubmitImage = window.CommunityGallery?.submitImage;
    if (originalSubmitImage) {
      window.CommunityGallery.submitImage = async function(...args) {
        const result = await originalSubmitImage.apply(this, args);
        if (result?.success) {
          window.CommunityAnalytics?.track('community_image_submitted', {
            productId: args[0]?.productId,
            hasCaption: !!(args[0]?.caption),
            taggedProductsCount: args[0]?.taggedProducts?.length || 0,
            tagsCount: args[0]?.tags?.length || 0
          });
        }
        return result;
      };
    }

    // Community Gallery views
    const originalGetAllImages = window.CommunityGallery?.getAllImages;
    if (originalGetAllImages) {
      window.CommunityGallery.getAllImages = function(...args) {
        const result = originalGetAllImages.apply(this, args);
        if (args[0]?.limit && args[0].limit > 10) {
          // Likely a gallery page view
          window.CommunityAnalytics?.track('community_gallery_view', {
            imagesCount: result.length,
            featured: args[0]?.featured || false
          });
        }
        return result;
      };
    }

    // Community image votes
    const originalCGVote = window.CommunityGallery?.voteHelpful;
    if (originalCGVote) {
      window.CommunityGallery.voteHelpful = function(...args) {
        const result = originalCGVote.apply(this, args);
        if (result?.success) {
          window.CommunityAnalytics?.track('community_image_vote', {
            imageId: args[0],
            helpful: args[1]
          });
        }
        return result;
      };
    }

    // Shop the Community clicks
    const originalNavigateToProduct = window.ShopTheCommunity?.navigateToProduct;
    if (originalNavigateToProduct) {
      window.ShopTheCommunity.navigateToProduct = function(...args) {
        window.CommunityAnalytics?.track('shop_community_click', {
          productId: args[0]
        });
        return originalNavigateToProduct.apply(this, args);
      };
    }

    // Social clicks
    const originalTrackSocialClick = window.SocialIntegration?.trackSocialClick;
    if (originalTrackSocialClick) {
      window.SocialIntegration.trackSocialClick = function(...args) {
        window.CommunityAnalytics?.track('social_click', {
          platform: args[0],
          action: args[1]
        });
        return originalTrackSocialClick.apply(this, args);
      };
    }

    // Moderation actions
    const originalSingleAction = window.AdminModeration?.singleAction;
    if (originalSingleAction) {
      window.AdminModeration.singleAction = function(...args) {
        const result = originalSingleAction.apply(this, args);
        window.CommunityAnalytics?.track('moderation_action', {
          action: args[1],
          targetId: args[0]
        });
        return result;
      };
    }

    const originalBulkAction = window.AdminModeration?.bulkAction;
    if (originalBulkAction) {
      window.AdminModeration.bulkAction = function(...args) {
        const result = originalBulkAction.apply(this, args);
        window.CommunityAnalytics?.track('moderation_bulk_action', {
          action: args[0],
          count: this.selectedItems?.size || 0
        });
        return result;
      };
    }
  },

  // Periodic flush
  startFlushTimer() {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  },

  flush() {
    if (this.events.length === 0) return;
    this.saveEvents();
    // In production: send to analytics endpoint
    // this.sendToServer(this.events.splice(0, this.events.length));
  },

  // Get analytics data for dashboard
  getAnalytics(periodDays = 30) {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const recent = this.events.filter(e => new Date(e.timestamp) >= since);

    // Group by event type
    const byEvent = {};
    const byUserTier = {};
    const byProduct = {};

    recent.forEach(e => {
      byEvent[e.event] = (byEvent[e.event] || 0) + 1;
      byUserTier[e.userTier] = (byUserTier[e.userTier] || 0) + 1;
      if (e.productId) {
        byProduct[e.productId] = (byProduct[e.productId] || 0) + 1;
      }
    });

    // Calculate engagement rates
    const reviewViews = byEvent.review_view || 0;
    const reviewSubmissions = byEvent.review_submitted || 0;
    const submissionRate = reviewViews > 0 ? (reviewSubmissions / reviewViews * 100).toFixed(2) : 0;

    const galleryViews = byEvent.community_gallery_view || 0;
    const imageSubmissions = byEvent.community_image_submitted || 0;
    const gallerySubmissionRate = galleryViews > 0 ? (imageSubmissions / galleryViews * 100).toFixed(2) : 0;

    return {
      period: periodDays,
      totalEvents: recent.length,
      byEvent,
      byUserTier,
      topProducts: Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 10),
      engagement: {
        reviewSubmissionRate: submissionRate + '%',
        gallerySubmissionRate: gallerySubmissionRate + '%',
        totalReviewViews: reviewViews,
        totalReviewSubmissions: reviewSubmissions,
        totalGalleryViews: galleryViews,
        totalImageSubmissions: imageSubmissions,
        totalHelpfulVotes: (byEvent.review_vote || 0) + (byEvent.community_image_vote || 0) + (byEvent.qa_vote || 0),
        totalSocialClicks: byEvent.social_click || 0,
        totalShopCommunityClicks: byEvent.shop_community_click || 0
      }
    };
  },

  // Render analytics dashboard (for admin page)
  renderDashboard(containerEl, periodDays = 30) {
    if (!containerEl) return;

    const data = this.getAnalytics(periodDays);

    containerEl.innerHTML = `
      <div class="community-analytics-dashboard">
        <div class="analytics-header" style="margin-bottom: var(--space-6);">
          <h3 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--fw-light);">
            Community Analytics
          </h3>
          <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
            <button class="btn btn-sm ${periodDays === 7 ? 'btn-primary' : 'btn-secondary'}" data-period="7">7 dana</button>
            <button class="btn btn-sm ${periodDays === 30 ? 'btn-primary' : 'btn-secondary'}" data-period="30">30 dana</button>
            <button class="btn btn-sm ${periodDays === 90 ? 'btn-primary' : 'btn-secondary'}" data-period="90">90 dana</button>
          </div>
        </div>

        <div class="analytics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
          <div class="stat-card" style="padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-3xl); font-weight: var(--fw-bold); color: var(--color-text);">${data.totalEvents}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Total Events</div>
          </div>
          <div class="stat-card" style="padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-3xl); font-weight: var(--fw-bold); color: var(--color-primary);">${data.engagement.totalReviewViews}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Review Views</div>
          </div>
          <div class="stat-card" style="padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-3xl); font-weight: var(--fw-bold); color: var(--color-success);">${data.engagement.totalReviewSubmissions}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Review Submissions</div>
          </div>
          <div class="stat-card" style="padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-3xl); font-weight: var(--fw-bold); color: var(--color-info);">${data.engagement.reviewSubmissionRate}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Submission Rate</div>
          </div>
          <div class="stat-card" style="padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-3xl); font-weight: var(--fw-bold); color: var(--color-warning);">${data.engagement.totalGalleryViews}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Gallery Views</div>
          </div>
          <div class="stat-card" style="padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-3xl); font-weight: var(--fw-bold); color: var(--color-accent);">${data.engagement.totalImageSubmissions}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Image Submissions</div>
          </div>
          <div class="stat-card" style="padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border);">
            <div style="font-size: var(--text-3xl); font-weight: var(--fw-bold); color: var(--color-accent);">${data.engagement.gallerySubmissionRate}</div>
            <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: uppercase;">Gallery Submit Rate</div>
          </div>
        </div>

        <div class="analytics-charts" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6);">
          <div class="chart-card" style="background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border); padding: var(--space-4);">
            <h4 style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-light); margin-bottom: var(--space-4);">Events by Type</h4>
            <div class="event-bars" style="display: flex; flex-direction: column; gap: var(--space-3);">
              ${Object.entries(data.byEvent).sort((a,b) => b[1] - a[1]).map(([event, count]) => `
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                  <span style="width: 160px; font-size: var(--fs-sm); color: var(--color-text-secondary);">${event}</span>
                  <div style="flex: 1; height: 24px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden;">
                    <div style="width: ${Math.min(100, (count / Math.max(...Object.values(data.byEvent))) * 100)}%; height: 100%; background: var(--color-primary); border-radius: var(--radius-full); transition: width var(--duration-normal);"></div>
                  </div>
                  <span style="width: 60px; text-align: right; font-weight: var(--fw-medium);">${count}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="chart-card" style="background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border); padding: var(--space-4);">
            <h4 style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-light); margin-bottom: var(--space-4);">Events by User Tier</h4>
            <div class="tier-bars" style="display: flex; flex-direction: column; gap: var(--space-3);">
              ${Object.entries(data.byUserTier).map(([tier, count]) => `
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                  <span style="width: 100px; font-size: var(--fs-sm); color: var(--color-text-secondary); text-transform: capitalize;">${tier}</span>
                  <div style="flex: 1; height: 24px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden;">
                    <div style="width: ${Math.min(100, (count / Math.max(...Object.values(data.byUserTier))) * 100)}%; height: 100%; background: var(--color-secondary); border-radius: var(--radius-full);"></div>
                  </div>
                  <span style="width: 60px; text-align: right; font-weight: var(--fw-medium);">${count}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="top-products" style="margin-top: var(--space-6); background: var(--color-bg); border-radius: var(--radius-card); border: 1px solid var(--color-border); padding: var(--space-4);">
          <h4 style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-light); margin-bottom: var(--space-4);">Top Products by Engagement</h4>
          ${data.topProducts.length ? `
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--color-border);">
                  <th style="text-align: left; padding: var(--space-3);">Product</th>
                  <th style="text-align: right; padding: var(--space-3);">Events</th>
                </tr>
              </thead>
              <tbody>
                ${data.topProducts.map(([productId, count]) => {
                  const product = window.state?.products?.get?.()?.find(p => p.id == productId);
                  return `<tr style="border-bottom: 1px solid var(--color-divider);">
                    <td style="padding: var(--space-3);">${product?.name || 'Product #' + productId}</td>
                    <td style="padding: var(--space-3); text-align: right; font-weight: var(--fw-medium);">${count}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          ` : '<p style="color: var(--color-text-tertiary);">No product data available</p>'}
        </div>
      </div>
    `;

    // Bind period buttons
    containerEl.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => this.renderDashboard(containerEl, parseInt(btn.dataset.period)));
    });
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CommunityAnalytics.init());
} else {
  CommunityAnalytics.init();
}

window.CommunityAnalytics = CommunityAnalytics;

// ============================================================
// COMMUNITY PERFORMANCE (Phase 13 - Step 13)
// Lazy loading, IntersectionObserver, performance budgets
// ============================================================
const CommunityPerformance = {
  imageObserver: null,
  galleryObserver: null,
  initDone: false,

  async init() {
    if (this.initDone) return;
    
    // Setup IntersectionObserver for lazy loading
    this.setupLazyLoading();
    
    // Setup gallery infinite scroll / pagination
    this.setupGalleryPagination();
    
    // Preconnect to image CDN
    this.addPreconnectHints();
    
    // Monitor Core Web Vitals for community pages
    this.monitorWebVitals();
    
    this.initDone = true;
    console.log('[CommunityPerformance] Initialized');
  },

  setupLazyLoading() {
    if (!('IntersectionObserver' in window)) return;

    // Lazy load community gallery images
    this.imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
          }
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }
          this.imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '100px 0px', // Start loading 100px before viewport
      threshold: 0.01
    });

    // Observe existing lazy images
    this.observeLazyImages();

    // Re-observe on dynamic content
    const observer = new MutationObserver(() => this.observeLazyImages());
    observer.observe(document.body, { childList: true, subtree: true });
  },

  observeLazyImages() {
    document.querySelectorAll('img[data-src], img[data-srcset]').forEach(img => {
      this.imageObserver?.observe(img);
    });
  },

  setupGalleryPagination() {
    // Infinite scroll for community gallery
    this.galleryObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const trigger = entry.target;
          if (trigger.dataset.loadMore) {
            this.loadMoreGalleryItems(trigger);
            this.galleryObserver.unobserve(trigger);
          }
        }
      });
    }, {
      rootMargin: '200px 0px',
      threshold: 0.1
    });

    // Observe load more triggers
    document.querySelectorAll('[data-load-more]').forEach(el => {
      this.galleryObserver?.observe(el);
    });
  },

  async loadMoreGalleryItems(trigger) {
    const page = parseInt(trigger.dataset.page || '1') + 1;
    const container = trigger.closest('[data-gallery-container]');
    if (!container) return;

    trigger.innerHTML = '<span class="spinner"></span> Učitavanje...';
    trigger.disabled = true;

    try {
      // Simulate API call - replace with actual fetch
      await new Promise(r => setTimeout(r, 300));
      
      const newItems = window.CommunityGallery?.getAllImages?.({ 
        limit: 20, 
        offset: (page - 1) * 20 
      }) || [];

      if (newItems.length) {
        container.insertAdjacentHTML('beforeend', newItems.map(img => 
          window.ShopTheCommunity?.createShoppableImage?.(img)?.outerHTML || ''
        ).join(''));
        
        // Re-observe new images for lazy loading
        this.observeLazyImages();
        
        // Update trigger for next page
        trigger.dataset.page = page;
        trigger.innerHTML = 'Učitaj više';
        trigger.disabled = false;
        
        if (newItems.length === 20) {
          this.galleryObserver?.observe(trigger);
        } else {
          trigger.remove(); // No more items
        }
      } else {
        trigger.remove();
      }
    } catch (e) {
      console.warn('[CommunityPerformance] Load more failed:', e);
      trigger.innerHTML = 'Greška. Pokušajte ponovo.';
      trigger.disabled = false;
    }
  },

  addPreconnectHints() {
    // Preconnect to image CDN if configured
    const cdnDomain = 'cdn.dalli.rs'; // Replace with actual CDN
    if (!document.querySelector(`link[rel="preconnect"][href*="${cdnDomain}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = 'https://' + cdnDomain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  },

  monitorWebVitals() {
    // Only on community pages
    if (!document.querySelector('[data-community-page]')) return;

    // LCP monitoring
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry.startTime > 1500) {
            console.warn('[CommunityPerformance] LCP exceeded budget:', lastEntry.startTime.toFixed(0), 'ms');
            trackEvent('web_vital_lcp_exceeded', { value: lastEntry.startTime });
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}

      // CLS monitoring
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          if (clsValue > 0.03) {
            console.warn('[CommunityPerformance] CLS exceeded budget:', clsValue.toFixed(4));
            trackEvent('web_vital_cls_exceeded', { value: clsValue });
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}

      // INP monitoring (using Event Timing API)
      try {
        const inpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.processingStart && entry.startTime) {
              const inp = entry.processingStart - entry.startTime;
              if (inp > 100) {
                console.warn('[CommunityPerformance] INP exceeded budget:', inp.toFixed(0), 'ms');
                trackEvent('web_vital_inp_exceeded', { value: inp });
              }
            }
          });
        });
        inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 100 });
      } catch (e) {}
    }
  },

  // Optimize images for gallery - generate srcset
  generateResponsiveSrcSet(baseUrl, widths = [320, 640, 960, 1280, 1920]) {
    return widths.map(w => `${baseUrl}?w=${w} ${w}w`).join(', ');
  },

  // Create optimized gallery image element
  createOptimizedImage(imageData, options = {}) {
    const { widths = [320, 640, 960, 1280], sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' } = options;
    
    const img = document.createElement('img');
    img.src = imageData.imageUrl; // Fallback
    img.dataset.src = imageData.imageUrl; // For lazy loading
    img.alt = imageData.caption || 'Community photo';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s ease;';
    
    img.addEventListener('load', () => {
      img.style.opacity = '1';
    });
    
    // Add to observer
    setTimeout(() => this.imageObserver?.observe(img), 0);
    
    return img;
  },

  // Debounce utility
  debounce(fn, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  },

  // Throttle utility
  throttle(fn, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CommunityPerformance.init());
} else {
  CommunityPerformance.init();
}

window.CommunityPerformance = CommunityPerformance;

// ============================================================
// FAQ ACCORDION (Category pages)
// ============================================================
const FAQAccordion = {
  init() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => this.toggle(btn));
    });
    console.log('[FAQAccordion] Initialized');
  },

  toggle(btn) {
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    const answerId = btn.getAttribute('aria-controls');
    const answer = document.getElementById(answerId);
    const icon = btn.querySelector('.faq-icon');

    // Close all others in same FAQ page
    const faqPage = btn.closest('[itemtype="https://schema.org/FAQPage"]');
    if (faqPage) {
      faqPage.querySelectorAll('.faq-question').forEach(otherBtn => {
        if (otherBtn !== btn) {
          otherBtn.setAttribute('aria-expanded', 'false');
          const otherAnswerId = otherBtn.getAttribute('aria-controls');
          const otherAnswer = document.getElementById(otherAnswerId);
          if (otherAnswer) otherAnswer.hidden = true;
          const otherIcon = otherBtn.querySelector('.faq-icon');
          if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
        }
      });
    }

    // Toggle current
    btn.setAttribute('aria-expanded', !isExpanded);
    if (answer) answer.hidden = isExpanded;
    if (icon) icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FAQAccordion.init());
} else {
  FAQAccordion.init();
}

window.FAQAccordion = FAQAccordion;









// ============================================================
  // EMAIL SERVICE (Step 9 - Preparation)
  // Template-based email sending with triggers
  // ============================================================
  





// ============================================================
// EMAIL SERVICE (Step 9 - Preparation)
// Template-based email sending with triggers
// ============================================================
class EmailServiceClass {
  constructor() {
    this.templates = null;
    this.queue = [];
    this.isProcessing = false;
  }

  async init() {
    try {
      const response = await fetch('/data/email-templates.json');
      if (response.ok) {
        this.templates = await response.json();
        console.log('[EmailService] Templates loaded:', Object.keys(this.templates?.templates || {}).length);
      }
    } catch (e) {
      console.warn('[EmailService] Failed to load templates:', e);
    }
  }

  getTemplate(id) {
    return this.templates?.templates?.[id] || null;
  }

  renderTemplate(template, variables) {
    let html = template.html || '';
    let text = template.text || '';
    let subject = template.subject || '';
    let preheader = template.preheader || '';

    for (const [key, value] of Object.entries(variables || {})) {
      const placeholder = new RegExp('\{\{' + key + '\}\}', 'g');
      html = html.replace(placeholder, value);
      text = text.replace(placeholder, value);
      subject = subject.replace(placeholder, value);
      preheader = preheader.replace(placeholder, value);
    }

    return { html, text, subject, preheader };
  }

  async send(templateId, variables, toEmail) {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.error('[EmailService] Template not found:', templateId);
      return false;
    }

    if (!template.enabled) {
      console.warn('[EmailService] Template disabled:', templateId);
      return false;
    }

    const rendered = this.renderTemplate(template, variables);
    
    const emailData = {
      to: toEmail,
      subject: rendered.subject,
      preheader: rendered.preheader,
      html: rendered.html,
      text: rendered.text,
      templateId,
      timestamp: Date.now()
    };

    this.queue.push(emailData);
    this.processQueue();
    return true;
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const email = this.queue.shift();
      try {
        console.log('[EmailService] Sending:', email.subject, 'to', email.to);
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.error('[EmailService] Send failed:', e);
        this.queue.unshift(email);
        break;
      }
    }
    
    this.isProcessing = false;
  }

  async triggerBackInStock(product, variant) {
    const user = state.user.get();
    if (!user?.email) return;
    await this.send('back_in_stock', {
      productName: product.name,
      productUrl: '/proizvod-' + product.slug + '.html',
      price: variant.price.I18n.formatNumber,
      size: variant.size,
      color: variant.color,
      imageUrl: product.images?.main,
      discountPercent: 0
    }, user.email);
  }

  async triggerPriceDrop(product, variant, dropPercent) {
    const user = state.user.get();
    if (!user?.email) return;
    await this.send('price_drop', {
      productName: product.name,
      productUrl: '/proizvod-' + product.slug + '.html',
      oldPrice: (variant.price / (1 - dropPercent/100)).I18n.formatNumber,
      newPrice: variant.price.I18n.formatNumber,
      dropPercent: dropPercent.toFixed(0),
      imageUrl: product.images?.main
    }, user.email);
  }

  async triggerNewCollection(user, points) {
    await this.send('new_collection', {
      points,
      expiryDate: I18n.formatDate(new Date(Date.now() + 30*86400000)),
      discountUrl: '/profile.html#points'
    }, user.email);
  }

  async triggerWelcome(user) {
    await this.send('welcome', {
      firstName: user.firstName || user.name,
      discountCode: 'WELCOME10',
      discountPercent: 10
    }, user.email);
  }

  async triggerAbandonedCart(cartItems) {
    const user = state.user.get();
    if (!user?.email || !cartItems.length) return;
    await this.send('abandoned_cart', {
      itemCount: cartItems.length,
      cartUrl: '/cart.html',
      subtotal: cartItems.reduce((s, i) => s + i.price * i.qty, 0).I18n.formatNumber,
      discountCode: 'COMEBACK10'
    }, user.email);
  }

  async triggerOrderConfirmed(order) {
    const user = state.user.get();
    if (!user?.email) return;
    await this.send('order_confirmed', {
      orderNumber: order.orderNumber,
      items: order.items.map(i => i.name + ' x' + i.qty).join(', '),
      total: order.totals.total.I18n.formatNumber,
      shippingAddress: order.shipping.address + ', ' + order.shipping.city,
      estimatedDelivery: I18n.formatDate(new Date(Date.now() + 3*86400000))
    }, user.email);
  }

  async triggerShippingUpdate(order, status, trackingNumber) {
    const user = state.user.get();
    if (!user?.email) return;
    await this.send('shipping_update', {
      orderNumber: order.orderNumber,
      status,
      trackingNumber,
      trackingUrl: trackingNumber ? 'https://tracking.post.com/' + trackingNumber : '',
      estimatedDelivery: I18n.formatDate(new Date(Date.now() + 2*86400000))
    }, user.email);
  }

  async triggerReviewRequest(product) {
    const user = state.user.get();
    if (!user?.email) return;
    await this.send('review_request', {
      productName: product.name,
      productUrl: '/proizvod-' + product.slug + '.html',
      reviewUrl: '/proizvod-' + product.slug + '.html#reviews'
    }, user.email);
  }

  async triggerBirthday(user) {
    await this.send('birthday', {
      firstName: user.firstName,
      discountCode: 'BIRTHDAY20',
      discountPercent: 20,
      expiryDate: I18n.formatDate(new Date(Date.now() + 7*86400000))
    }, user.email);
  }

  async triggerPointsExpiring(user, points) {
    await this.send('points_expiring', {
      points,
      expiryDate: I18n.formatDate(new Date(Date.now() + 30*86400000)),
      discountUrl: '/profile.html#points'
    }, user.email);
  }

  async triggerVipInvite(user, event) {
    await this.send('vip_experience_invite', {
      eventName: event.name,
      eventDate: event.date,
      eventUrl: event.url,
      rsvpUrl: event.rsvpUrl
    }, user.email);
  }

  async registerPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // We'll show a subtle prompt later
      }
    } catch (e) {
      console.warn('[EmailService] Push registration failed:', e);
    }
  }

  destroy() {
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
  }
};

window.EmailService = new EmailServiceClass();

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => EmailService.init());
} else {
  EmailService.init();

// ============================================================
// EMAIL TRIGGER UTILITIES
// Helper functions to trigger emails based on events
// ============================================================

// Track previous product state for price/inventory comparison
let previousProductState = new Map();

// Check for price drops and back-in-stock when products are loaded/refreshed
const checkProductChanges = (newProducts) => {
  const oldState = previousProductState;
  const newState = new Map();
  
  newProducts.forEach(p => {
    const key = p.id;
    const variants = p.variants || [{ 
      id: p.id, 
      price: p.price, 
      stock: p.inventory?.totalStock || 0,
      size: p.size || 'OS',
      color: p.color || 'Default'
    }];
    
    variants.forEach(v => {
      const variantKey = key + '_' + (v.id || v.size + '_' + v.color);
      newState.set(variantKey, {
        productId: p.id,
        variantId: v.id,
        price: v.price,
        stock: v.stock,
        size: v.size,
        color: v.color,
        productName: p.name,
        productSlug: p.slug,
        productImages: p.images
      });
    });
  });
  
  // Compare with old state
  oldState.forEach((oldData, key) => {
    const newData = newState.get(key);
    if (!newData) return; // Product removed
    
    // Check for price drop
    if (newData.price < oldData.price) {
      const dropPercent = Math.round(((oldData.price - newData.price) / oldData.price) * 100);
      if (dropPercent >= 5) { // Only notify for 5%+ drops
        window.EmailService?.triggerPriceDrop?.(
          { name: oldData.productName, slug: oldData.productSlug, images: oldData.productImages },
          { price: newData.price, size: newData.size, color: newData.color },
          dropPercent
        );
      }
    }
    
    // Check for back in stock
    if (oldData.stock === 0 && newData.stock > 0) {
      window.EmailService?.triggerBackInStock?.(
        { name: oldData.productName, slug: oldData.productSlug, images: oldData.productImages },
        { price: newData.price, size: newData.size, color: newData.color, stock: newData.stock }
      );
    }
  });
  
  previousProductState = newState;
};

// Trigger review request for delivered orders
const triggerReviewRequestsForDelivered = () => {
  const user = state.user.get();
  if (!user?.email) return;
  
  const orders = JSON.parse(localStorage.getItem('dalli_orders') || '[]');
  const userOrders = orders.filter(o => o.userId === user.id || o.email === user.email);
  
  userOrders.forEach(order => {
    if (order.status === 'delivered' && !order.reviewRequested) {
      order.items.forEach(item => {
        const product = state.products.get?.().find(p => p.id === item.productId);
        if (product) {
          window.EmailService?.triggerReviewRequest?.(product);
        }
      });
      order.reviewRequested = true;
    }
  });
  
  localStorage.setItem('dalli_orders', JSON.stringify(orders));
};

// Check for points expiring (run daily)
const checkPointsExpiring = () => {
  const user = state.user.get();
  if (!user?.email || !user.loyalty) return;
  
  const points = user.loyalty.points || 0;
  const lastEarned = user.loyalty.lastEarnedAt || user.loyalty.joinedAt;
  
  if (lastEarned) {
    const daysSinceEarned = Math.floor((Date.now() - new Date(lastEarned).getTime()) / (1000 * 60 * 60 * 24));
    const expiryDays = 365 - daysSinceEarned; // Points expire after 1 year
    
    if (expiryDays <= 30 && expiryDays > 0) {
      window.EmailService?.triggerPointsExpiring?.(user, points);
    }
  }
};

// Check for birthdays (run daily)
const checkBirthdays = () => {
  const user = state.user.get();
  if (!user?.email || !user.birthDate) return;
  
  const today = new Date();
  const birthDate = new Date(user.birthDate);
  
  if (today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate()) {
    // Check if already sent this year
    const lastBirthdayEmail = localStorage.getItem('dalli_last_birthday_email');
    const currentYear = today.getFullYear().toString();
    
    if (lastBirthdayEmail !== currentYear) {
      window.EmailService?.triggerBirthday?.(user);
      localStorage.setItem('dalli_last_birthday_email', currentYear);
    }
  }
};

// Initialize email triggers
const initEmailTriggers = () => {
  // Check product changes when products are loaded
  const originalLoadProducts = loadProducts;
  loadProducts = async () => {
    await originalLoadProducts();
    checkProductChanges(state.products.get());
  };
  
  // Check for review requests on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', triggerReviewRequestsForDelivered);
  } else {
    triggerReviewRequestsForDelivered();
  }
  
  // Check points expiring and birthdays daily
  setInterval(() => {
    checkPointsExpiring();
    checkBirthdays();
  }, 24 * 60 * 60 * 1000); // Daily
  
  console.log('[EmailTriggers] Initialized');
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEmailTriggers);
} else {
  initEmailTriggers();
}

}

// ============================================================
// REVIEW SYSTEM (Step 1-3: Review System Foundation)
// ============================================================
const ReviewSystem = {
  reviews: [],
  settings: {},
  productReviewsCache: new Map(),

  async init() {
    try {
      const response = await fetch('/data/reviews.json');
      if (response.ok) {
        const data = await response.json();
        this.reviews = data.reviews || [];
        this.settings = data.settings || {};
        this.buildProductCache();
        console.log('[ReviewSystem] Initialized:', this.reviews.length, 'reviews');
      }
    } catch (e) {
      console.warn('[ReviewSystem] Failed to load reviews:', e);
    }
  },

  buildProductCache() {
    this.productReviewsCache.clear();
    this.reviews.forEach(review => {
      if (!this.productReviewsCache.has(review.productId)) {
        this.productReviewsCache.set(review.productId, []);
      }
      this.productReviewsCache.get(review.productId).push(review);
    });
  },

  getProductReviews(productId, options = {}) {
    const reviews = this.productReviewsCache.get(productId) || [];
    const { 
      status = 'approved', 
      verifiedOnly = this.settings?.requireVerifiedPurchase !== false,
      sortBy = 'helpful',
      limit = 10,
      offset = 0
    } = options;

    let filtered = reviews.filter(r => r.status === status);
    
    if (verifiedOnly) {
      filtered = filtered.filter(r => r.verifiedPurchase);
    }
    
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(a.createdAt));
        break;
      case 'highest':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      case 'helpful':
      default:
        filtered.sort((a, b) => (b.helpfulVotes - b.notHelpfulVotes) - (a.helpfulVotes - a.notHelpfulVotes));
        break;
    }
    
    return filtered.slice(offset, offset + limit);
  },

  generateReviewSchema(productId) {
    const reviews = this.getProductReviews(productId, { limit: 100 });
    if (!reviews.length) return null;

    const aggregateRating = {
      '@context': 'https://schema.org',
      '@type': 'AggregateRating',
      itemReviewed: {
        '@type': 'Product',
        name: this.getProductName(productId)
      },
      ratingValue: this.calculateAverageRating(reviews),
      reviewCount: reviews.filter(r => r.verifiedPurchase).length,
      bestRating: 5,
      worstRating: 1
    };

    const reviews_schema = reviews.slice(0, 10).map(review => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.userName || review.userInitials
      },
      datePublished: review.createdAt,
      reviewBody: review.text,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1
      },
      publisher: {
        '@type': 'Organization',
        name: 'DALLI'
      }
    }));

    return {
      aggregateRating,
      reviews: reviews_schema
    };
  },

  getProductName(productId) {
    const product = state.products.get?.().find(p => p.id === productId);
    return product?.name || 'Product';
  },

  calculateAverageRating(reviews) {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  },

  getReviewStats(productId) {
    const reviews = this.productReviewsCache.get(productId) || [];
    const approved = reviews.filter(r => r.status === 'approved');
    const verified = approved.filter(r => r.verifiedPurchase);
    
    if (!approved.length) {
      return { averageRating: 0, totalReviews: 0, verifiedCount: 0, verifiedPercent: 0, distribution: {} };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    approved.forEach(r => distribution[r.rating]++);

    return {
      averageRating: this.calculateAverageRating(approved),
      totalReviews: approved.length,
      verifiedCount: verified.length,
      verifiedPercent: Math.round((verified.length / approved.length) * 100),
      distribution
    };
  },

  canUserReview(userId, productId, variantId) {
    if (!this.settings?.requireVerifiedPurchase) return { allowed: true };
    
    const user = state.user.get();
    if (!user) return { allowed: false, reason: 'login_required' };
    
    const purchased = user.orders?.some(order => 
      order.items.some(item => item.productId === productId || item.variantId === variantId)
    ) || false;
    
    if (!purchased) {
      return { allowed: false, reason: 'verified_purchase_required' };
    }
    
    const existingReview = this.reviews.find(r => 
      r.userId === userId && r.productId === productId && r.status !== 'rejected'
    );
    
    if (existingReview) {
      return { allowed: false, reason: 'already_reviewed', existingReview };
    }

    return { allowed: true };
  },

  async submitReview(reviewData) {
    const validation = this.canUserReview(reviewData.userId, reviewData.productId, reviewData.variantId);
    if (!validation.allowed) {
      return { success: false, error: validation.reason, existingReview: validation.existingReview };
    }

    const { title, text, rating, photos = [], videos = [] } = reviewData;

    if (!title || title.length < 3) return { success: false, error: 'Title too short' };
    if (!text || text.length < (this.settings?.textMinLength || 20)) return { success: false, error: 'Review text too short' };
    if (!rating || rating < 1 || rating > 5) return { success: false, error: 'Invalid rating' };
    if (photos.length > (this.settings?.maxPhotosPerReview || 5)) return { success: false, error: 'Too many photos' };

    const user = state.user.get();
    const newReview = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      ...reviewData,
      userName: user.name,
      userInitials: user.name?.split(' ').map(n => n[0]).join('') || 'US',
      verifiedPurchase: true,
      helpfulVotes: 0,
      notHelpfulVotes: 0,
      status: this.settings?.autoApproveVerifiedPurchases ? 'approved' : 'pending',
      adminNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.reviews.push(newReview);
    this.save();
    this.buildProductCache();

    trackEvent('review_submitted', { productId: reviewData.productId, rating: rating });

    return { success: true, review: newReview };
  },

  save() {
    try {
      localStorage.setItem('dalli_reviews', JSON.stringify({ reviews: this.reviews, settings: this.settings }));
    } catch (e) {
      console.warn('[ReviewSystem] Save failed:', e);
    }
  },

  voteHelpful(reviewId, helpful) {
    const review = this.reviews.find(r => r.id === reviewId);
    if (!review) return { success: false, error: 'Review not found' };

    const user = state.user.get();
    if (!user) return { success: false, error: 'Login required' };

    const voteKey = 'review_vote_' + reviewId;
    const existingVote = localStorage.getItem(voteKey);
    
    if (existingVote) {
      return { success: false, error: 'Already voted' };
    }

    if (helpful) {
      review.helpfulVotes++;
    } else {
      review.notHelpfulVotes++;
    }
    
    this.save();
    localStorage.setItem('review_vote_' + reviewId, helpful ? 'helpful' : 'not_helpful');
    
    trackEvent('review_vote', { reviewId, helpful });
    return { success: true, helpfulVotes: review.helpfulVotes, notHelpfulVotes: review.notHelpfulVotes };
  },

  async uploadReviewMedia(reviewId, files) {
    const urls = Array.from(files).map((file, i) => 
      '/images/reviews/temp_' + Date.now() + '_' + i + '.jpg'
    );
    return urls;
  }
};

window.ReviewSystem = ReviewSystem;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ReviewSystem.init());
} else {
  ReviewSystem.init();
}
// FOR YOU - Personalized Recommendations Module (ML-ready)
// Collaborative filtering, behavioral signals, fallback to featured
// ============================================================
const ForYou = (() => {
  let sectionEl = null;
  let productsGrid = null;
  let statusEl = null;
  let loadingEl = null;
  let emptyEl = null;
  let refreshBtn = null;
  let products = [];
  let userProfile = null;
  let isLoading = false;
  let abortController = null;
  let reducedMotion = false;

  // Recommendation strategies (in order of preference)
  const STRATEGIES = [
    { name: 'collaborative', weight: 0.4, minInteractions: 5 },      // Users like you bought
    { name: 'content-based', weight: 0.3, minInteractions: 2 },      // Similar to viewed/bought
    { name: 'trending', weight: 0.15, minInteractions: 0 },          // Popular now
    { name: 'featured', weight: 0.15, minInteractions: 0 }           // Fallback
  ];

  const init = async () => {
    sectionEl = $('#forYou');
    if (!sectionEl) return;

    productsGrid = $('#forYouProducts');
    statusEl = $('#forYouStatus');
    loadingEl = $('.for-you__loading', statusEl);
    emptyEl = $('#forYouEmpty');
    refreshBtn = document.querySelector('[data-action="refreshForYou"]');

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Load user profile (behavioral data)
    await loadUserProfile();

    // Load products catalog
    await loadProducts();

    // Initialize refresh button
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => loadRecommendations(true));
      refreshBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          loadRecommendations(true);
        }
      });
    }

    // Initial load
    await loadRecommendations();

    console.log('[ForYou] Initialized');
  };

  const loadUserProfile = async () => {
    try {
      // Get behavioral data from localStorage
      const viewed = JSON.parse(localStorage.getItem('dalli_viewed_products') || '[]');
      const purchased = JSON.parse(localStorage.getItem('dalli_purchased_products') || '[]');
      const wishlisted = JSON.parse(localStorage.getItem('dalli_wishlist') || '[]');
      const carted = JSON.parse(localStorage.getItem('dalli_carted_products') || '[]');
      const searched = JSON.parse(localStorage.getItem('dalli_search_history') || '[]');
      const categoryPrefs = JSON.parse(localStorage.getItem('dalli_category_preferences') || '{}');

      userProfile = {
        viewed: viewed.slice(-50),           // Last 50 viewed
        purchased: purchased.slice(-20),     // Last 20 purchases
        wishlisted: wishlisted.slice(-20),   // Last 20 wishlisted
        carted: carted.slice(-10),           // Last 10 carted
        searched: searched.slice(-10),       // Last 10 searches
        categoryPrefs,                       // Category affinity scores
        lastUpdated: Date.now()
      };

      // Check if we have enough data for personalization
      const totalInteractions = viewed.length + purchased.length + wishlisted.length + carted.length;
      userProfile.hasEnoughData = totalInteractions >= 3;

    } catch (e) {
      console.warn('[ForYou] Failed to load user profile:', e);
      userProfile = { viewed: [], purchased: [], wishlisted: [], carted: [], searched: [], categoryPrefs: {}, hasEnoughData: false };
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/data/products.json', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        products = data.products || data || [];
      }
    } catch (e) {
      console.warn('[ForYou] Failed to load products:', e);
      products = [];
    }
  };

  const loadRecommendations = async (forceRefresh = false) => {
    if (isLoading) return;
    isLoading = true;
    
    if (abortController) abortController.abort();
    abortController = new AbortController();

    showLoading(true);

    try {
      let recommendations = [];

      if (userProfile.hasEnoughData && !forceRefresh) {
        // Try personalized recommendations
        recommendations = await getPersonalizedRecommendations();
      }

      // Fallback to featured/bestseller if no personalized results
      if (recommendations.length === 0) {
        recommendations = getFallbackRecommendations();
      }

      // Limit to 8 products
      recommendations = recommendations.slice(0, 8);

      renderRecommendations(recommendations);
      showLoading(false);

      trackEvent('for_you_load', { 
        count: recommendations.length, 
        source: userProfile.hasEnoughData ? 'personalized' : 'fallback',
        forceRefresh 
      });

    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('[ForYou] Load failed:', e);
        showEmpty();
      }
      showLoading(false);
    } finally {
      isLoading = false;
    }
  };

  const getPersonalizedRecommendations = () => {
    // ============================================================
    // COMPREHENSIVE RECOMMENDATION ENGINE
    // Combines: Collaborative Filtering (3.1) + Content-based (3.2) + 
    // Frequently Bought Together (3.3) + Complete the Look (3.4) + Hybrid (3.5)
    // ============================================================
    
    const config = state.personalization.get() || {};
    const algorithms = config.algorithms || {};
    const scoring = config.scoring || {};
    const filters = config.filters || {};
    
    const scores = new Map(); // productId -> { score, reasons: [] }
    const now = Date.now();
    const RECENCY_HALF_LIFE = (scoring.recencyHalfLifeDays || 14) * 24 * 60 * 60 * 1000;
    
    // ============================================================
    // HELPER: Recency decay
    // ============================================================
    const recencyFactor = (timestamp) => {
      if (!timestamp) return 1;
      const age = now - timestamp;
      return Math.pow(0.5, age / RECENCY_HALF_LIFE);
    };
    
    // ============================================================
    // 3.1 COLLABORATIVE FILTERING
    // "Users who bought X also bought Y" - based on purchase co-occurrence
    // ============================================================
    if (algorithms.collaborative?.enabled) {
      const weight = algorithms.collaborative.weight || 0.35;
      const minInteractions = algorithms.collaborative.minInteractions || 3;
      
      // Build co-occurrence matrix from purchase history
      const cooccurrence = new Map(); // variantId -> Map(otherVariantId -> count)
      
      // Build from all users' purchase data (from localStorage if available)
      try {
        const allPurchases = JSON.parse(localStorage.getItem('dalli_purchased_products') || '[]');
        // Group purchases by order
        const ordersByUser = new Map();
        allPurchases.forEach(p => {
          if (!ordersByUser.has(p.orderNumber)) ordersByUser.set(p.orderNumber, []);
          ordersByUser.get(p.orderNumber).push(p);
        });
        
        // Build co-occurrence
        ordersByUser.forEach(items => {
          if (items.length < 2) return;
          for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
              const a = items[i].variantId;
              const b = items[j].variantId;
              if (!cooccurrence.has(a)) cooccurrence.set(a, new Map());
              if (!cooccurrence.has(b)) cooccurrence.set(b, new Map());
              cooccurrence.get(a).set(b, (cooccurrence.get(a).get(b) || 0) + 1);
              cooccurrence.get(b).set(a, (cooccurrence.get(b).get(a) || 0) + 1);
            }
          }
        });
        
        // Apply collaborative scores
        userProfile.purchased.forEach(purchased => {
          const related = cooccurrence.get(purchased.variantId);
          if (related) {
            related.forEach((count, otherVariantId) => {
              if (count >= (algorithms.collaborative.minCooccurrence || 2)) {
                const product = getProductByVariantId(otherVariantId);
                if (product) {
                  const key = product.id;
                  const boost = weight * count * recencyFactor(purchased.purchasedAt);
                  if (!scores.has(key)) scores.set(key, { score: 0, reasons: [] });
                  const entry = scores.get(key);
                  entry.score += boost * Math.min(count / 10, 2);
                  entry.reasons.push(`Kupci su kupili sa: ${purchased.name}`);
                }
              }
            });
          }
        });
      } catch (e) {
        console.warn('[ForYou] Collaborative filtering failed:', e);
      }
    }
    
    // ============================================================
    // 3.2 CONTENT-BASED FILTERING
    // Similar products by tags, category, style, price
    // ============================================================
    if (algorithms.contentBased?.enabled) {
      const weight = algorithms.contentBased.weight || 0.30;
      const tagWeight = algorithms.contentBased.tagWeight || 0.4;
      const categoryWeight = algorithms.contentBased.categoryWeight || 0.3;
      const styleWeight = algorithms.contentBased.styleWeight || 0.2;
      const priceWeight = algorithms.contentBased.priceWeight || 0.1;
      
      // Build user interest profile from viewed/wishlisted/purchased
      const interestTags = new Map();
      const interestCategories = new Map();
      const interestStyles = new Map();
      let totalInteractions = 0;
      
      // Weight interactions by type (from scoring config)
      const addInterest = (product, interactionWeight) => {
        totalInteractions += interactionWeight;
        
        // Tags
        product.tags?.forEach(tag => {
          interestTags.set(tag, (interestTags.get(tag) || 0) + interactionWeight);
        });
        
        // Category
        if (product.category) {
          interestCategories.set(product.category, (interestCategories.get(product.category) || 0) + interactionWeight);
        }
        
        // Style (from product metadata)
        if (product.style) {
          interestStyles.set(product.style, (interestStyles.get(product.style) || 0) + interactionWeight);
        }
        
        // Price range preference
        if (product.price) {
          const priceRange = getPriceRange(product.price);
          userProfile.priceRangePrefs = userProfile.priceRangePrefs || new Map();
          userProfile.priceRangePrefs.set(priceRange, (userProfile.priceRangePrefs.get(priceRange) || 0) + interactionWeight);
        }
      };
      
      // Viewed products (weight from config)
      userProfile.viewed.forEach(v => {
        const product = getProductById(v.productId || v.id);
        if (product) addInterest(product, scoring.viewWeight || 1.0 * recencyFactor(v.timestamp));
      });
      
      // Wishlisted (stronger signal)
      userProfile.wishlisted.forEach(w => {
        const product = getProductById(w.productId || w.id);
        if (product) addInterest(product, scoring.wishlistWeight || 2.5);
      });
      
      // Purchased (strongest signal)
      userProfile.purchased.forEach(p => {
        const product = getProductById(p.productId || p.id);
        if (product) addInterest(product, scoring.purchaseWeight || 5.0);
      });
      
      // Apply content-based scores
      products.forEach(product => {
        let score = 0;
        
        // Tag similarity
        product.tags?.forEach(tag => {
          score += (interestTags.get(tag) || 0) * tagWeight;
        });
        
        // Category similarity
        if (product.category) {
          score += (interestCategories.get(product.category) || 0) * categoryWeight;
        }
        
        // Style similarity
        if (product.style) {
          score += (interestStyles.get(product.style) || 0) * styleWeight;
        }
        
        // Price range similarity
        if (product.price) {
          const priceRange = getPriceRange(product.price);
          score += (userProfile.priceRangePrefs?.get(priceRange) || 0) * priceWeight;
        }
        
        // Apply weight
        score *= weight;
        
        // Category affinity boost
        const catPref = userProfile.categoryPrefs?.[product.category] || 0;
        score += catPref * (scoring.categoryAffinityWeight || 1.5);
        
        if (score > 0) {
          if (!scores.has(product.id)) scores.set(product.id, { score: 0, reasons: [] });
          const entry = scores.get(product.id);
          entry.score += score;
          if (score > 0) entry.reasons.push('Sličan vašim interesovanjima');
        }
      });
    }
    
    // ============================================================
    // 3.3 FREQUENTLY BOUGHT TOGETHER (Cart co-occurrence)
    // ============================================================
    if (algorithms.frequentlyBoughtTogether?.enabled) {
      const weight = algorithms.frequentlyBoughtTogether.weight || 0.20;
      const minCooccurrence = algorithms.frequentlyBoughtTogether.minCooccurrence || 3;
      
      // Build from cart history
      try {
        const cartHistory = JSON.parse(localStorage.getItem('dalli_carted_products') || '[]');
        const cooccurrence = new Map();
        
        // Group by session/time proximity (simplified)
        const sessions = groupBySession(cartHistory);
        sessions.forEach(sessionItems => {
          if (sessionItems.length < 2) return;
          for (let i = 0; i < sessionItems.length; i++) {
            for (let j = i + 1; j < sessionItems.length; j++) {
              const a = sessionItems[i].variantId;
              const b = sessionItems[j].variantId;
              if (!cooccurrence.has(a)) cooccurrence.set(a, new Map());
              if (!cooccurrence.has(b)) cooccurrence.set(b, new Map());
              cooccurrence.get(a).set(b, (cooccurrence.get(a).get(b) || 0) + 1);
              cooccurrence.get(b).set(a, (cooccurrence.get(b).get(a) || 0) + 1);
            }
          }
        });
        
        // Apply FBT scores
        const userCart = userProfile.carted || [];
        userCart.forEach(cartItem => {
          const related = cooccurrence.get(cartItem.variantId);
          if (related) {
            related.forEach((count, otherVariantId) => {
              if (count >= minCooccurrence) {
                const product = getProductByVariantId(otherVariantId);
                if (product) {
                  const key = product.id;
                  if (!scores.has(key)) scores.set(key, { score: 0, reasons: [] });
                  const entry = scores.get(key);
                  entry.score += weight * count;
                  entry.reasons.push(`Često se kupuje sa: ${cartItem.name}`);
                }
              }
            });
          }
        });
      } catch (e) {
        console.warn('[ForYou] FBT failed:', e);
      }
    }
    
    // ============================================================
    // 3.4 COMPLETE THE LOOK (Outfit collections)
    // ============================================================
    if (algorithms.completeTheLook?.enabled) {
      const weight = algorithms.completeTheLook.weight || 0.15;
      
      // Find outfit collections that include viewed/purchased items
      const userCategories = new Set([
        ...userProfile.viewed.map(v => v.category).filter(Boolean),
        ...userProfile.purchased.map(p => p.category).filter(Boolean),
        ...userProfile.wishlisted.map(w => w.category).filter(Boolean)
      ]);
      
      // Outfit mapping: category -> complementary categories
      const outfitComplements = {
        'majice': ['dukseri', 'trenerke', 'aksesoari'],
        'trenerke': ['majice', 'dukseri', 'patike'],
        'dukseri': ['majice', 'trenerke', 'kabanice'],
        'kabanice': ['majice', 'trenerke', 'šalice'],
        'pantalone': ['majice', 'trenerke', 'patike'],
        'šorts': ['majice', 'šalice', 'patike'],
        'haljine': ['dukseri', 'aksesoari', 'cipelice'],
        'jeans': ['majice', 'kabanice', 'patike'],
        'aksesoari': ['majice', 'dukseri', 'haljine']
      };
      
      // Find complementary products
      userCategories.forEach(cat => {
        const complements = outfitComplements[cat.toLowerCase()] || [];
        complements.forEach(compCat => {
          products.filter(p => p.category === compCat).forEach(product => {
            if (!scores.has(product.id)) scores.set(product.id, { score: 0, reasons: [] });
            const entry = scores.get(product.id);
            entry.score += weight;
            entry.reasons.push(`Dopunjuje vaš ${cat}`);
          });
        });
      });
    }
    
    // ============================================================
    // 3.5 HYBRID SCORING & FINAL RANKING
    // ============================================================
    
    // Apply trending/popularity boost
    const popularityBoost = scoring.popularityBoost || 0.1;
    products.forEach(product => {
      const entry = scores.get(product.id);
      if (entry) {
        if (product.bestseller) entry.score += popularityBoost;
        if (product.badge === 'hot') entry.score += popularityBoost * 2;
        if (product.badge === 'new') entry.score += popularityBoost;
      }
    });
    
    // Member tier boost
    const user = state.user.get();
    if (user?.loyalty?.tier) {
      const tierBoost = scoring.memberTierBoost?.[user.loyalty.tier] || 0;
      scores.forEach(entry => entry.score *= (1 + tierBoost));
    }
    
    // ============================================================
    // FILTERS
    // ============================================================
    
    // Exclude purchased
    if (filters.excludePurchased) {
      scores.forEach((entry, id) => {
        if (userProfile.purchased.some(p => p.id === id)) {
          entry.score *= 0.1;
        }
      });
    }
    
    // Exclude in cart
    if (filters.excludeInCart) {
      scores.forEach((entry, id) => {
        if (userProfile.carted.some(c => c.id === id)) {
          entry.score *= 0.5;
        }
      });
    }
    
    // Exclude out of stock
    if (filters.excludeOutOfStock) {
      scores.forEach((entry, id) => {
        const product = products.find(p => p.id === id);
        if (product && product.inventory?.status === 'out_of_stock') {
          entry.score = 0;
        }
      });
    }
    
    // Category diversity
    if (filters.categoryDiversity) {
      const maxPerCategory = filters.maxPerCategory || 2;
      const categoryCounts = new Map();
      const sorted = Array.from(scores.entries()).sort((a, b) => b[1].score - a[1].score);
      
      const diversified = [];
      sorted.forEach(([id, entry]) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        const catCount = categoryCounts.get(product.category) || 0;
        if (catCount < maxPerCategory) {
          categoryCounts.set(product.category, catCount + 1);
          diversified.push([id, entry]);
        }
      });
      
      scores.clear();
      diversified.forEach(([id, entry]) => scores.set(id, entry));
    }
    
    // ============================================================
    // FINAL SORT & RETURN
    // ============================================================
    return Array.from(scores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .map(([id, entry]) => {
        const product = products.find(p => p.id === id);
        if (product) product._recommendationReasons = entry.reasons;
        return product;
      })
      .filter(Boolean);
  };

  // Helper functions
  const getPriceRange = (price) => {
    if (price < 2000) return 'budget';
    if (price < 5000) return 'mid';
    if (price < 10000) return 'premium';
    return 'luxury';
  };

  const groupBySession = (cartItems) => {
    // Simplified: group by hour
    const sessions = new Map();
    cartItems.forEach(item => {
      const hour = new Date(item.timestamp).getHours();
      if (!sessions.has(hour)) sessions.set(hour, []);
      sessions.get(hour).push(item);
    });
    return Array.from(sessions.values());
  };

  const getFallbackRecommendations = () => {
    // Featured > Bestsellers > New arrivals > Trending
    const featured = products.filter(p => p.featured).slice(0, 8);
    if (featured.length >= 4) return featured;
    
    const bestsellers = products.filter(p => p.bestseller).slice(0, 8);
    const combined = [...featured, ...bestsellers.filter(b => !featured.includes(b))].slice(0, 8);
    if (combined.length >= 4) return combined;
    
    // Final fallback: newest
    return [...products].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 8);
  };

  const renderRecommendations = (recs) => {
    if (!productsGrid) return;
    
    if (recs.length === 0) {
      showEmpty();
      return;
    }
    
    productsGrid.innerHTML = recs.map((product, index) => {
      const variant = product.variants?.[0] || { 
        color: product.colors?.[0]?.name, 
        size: product.sizes?.[0]?.size, 
        price: product.price, 
        image: product.images?.main 
      };
      const salePrice = product.salePrice && product.salePrice < product.price ? product.salePrice : null;
      const displayPrice = salePrice || variant?.price || product.price;
      const badge = product.badge;
      const delay = index * 50;
      
      return `
        <article class="product-card animate-reveal" 
                 data-product-id="${product.id}" 
                 data-ab-variant="for_you" 
                 style="animation-delay: ${delay}ms;" 
                 role="listitem">
          <div class="product-card__media">
            <picture>
              <source type="image/avif" srcset="${variant?.image?.replace('.jpg', '.avif') || product.images?.main?.replace('.jpg', '.avif') || '/images/placeholder.avif'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <source type="image/webp" srcset="${variant?.image?.replace('.jpg', '.svg') || product.images?.main?.replace('.jpg', '.svg') || '/images/placeholder.svg'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <div class="lqip-wrapper" style="aspect-ratio: 1;">
      <img 
        class="lqip-placeholder" 
        src="${generateLQIP(variant?.image || product.images?.main || '/images/placeholder.jpg')}" 
        alt="" 
        aria-hidden="true"
        style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(8px); transform: scale(1.1); transition: opacity 0.3s ease;"
      >
      <img 
        class="product-card__image" 
        src="${variant?.image || product.images?.main || '/images/placeholder.jpg'}" 
        alt="${escapeHtml(product.altText || product.name)}" 
        loading="lazy" width="400" height="400" decoding="async"
        style="background: ${getDominantColor(product)};"
        onload="this.style.opacity=1; this.previousElementSibling.style.opacity=0;"
      >
    </div>
            </picture>
            <div class="product-card__parallax-overlay"></div>
            ${badge ? `<div class="product-card__badges"><span class="badge badge-${badge === 'bestseller' ? 'warning' : badge === 'new' ? 'primary' : 'accent'}">${badge === 'bestseller' ? t('product.bestSeller') : badge === 'new' ? t('product.new') : t('product.sale')}</span></div>` : ''}
            <button class="product-card__wishlist" data-action="wishlist" data-product-id="${product.id}" aria-label="${escapeHtml("Dodaj " + product.name + " na listu želja")}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button class="product-card__quick-add" data-action="quick-add" data-product-id="${product.id}" data-variant-id="${product.id}-${variant?.color}-${variant?.size}" aria-label="${escapeHtml("Brzo dodaj " + product.name + " u korpu")}">Dodaj u korpu</button>
            <span class="product-card__ripple" aria-hidden="true"></span>
          </div>
          <div class="product-card__content">
            <span class="product-card__category">${escapeHtml(product.category || 'Garderoba')}</span>
            <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
            <div class="product-card__rating">
              <span class="product-card__stars">${'\u2605'.repeat(Math.floor(product.rating || 4.5))}${'\u2606'.repeat(5 - Math.floor(product.rating || 4.5))}</span>
              <span>(${product.reviews || 0})</span>
            </div>
            <div class="product-card__price-row">
              <span class="product-card__price" data-price="${displayPrice}">${formatPrice(displayPrice)}</span>
              ${salePrice ? `<span class="product-card__old-price">${formatPrice(product.price)}</span>` : ''}
            </div>
            <p class="product-card__installment">ili ${Math.ceil(displayPrice / 3).I18n.formatNumber} RSD x 3 rate bez kamate</p>
          </div>
        </article>
      `;
  });
    
    // Mark as rendered
    productsGrid.dataset.rendered = 'true';
  };

  const showLoading = (show) => {
    if (!statusEl || !loadingEl) return;
    if (show) {
      statusEl.style.display = 'flex';
      loadingEl.style.display = 'flex';
      if (emptyEl) emptyEl.classList.add('hidden');
    } else {
      statusEl.style.display = 'none';
      loadingEl.style.display = 'none';
    }
  };

  const showEmpty = () => {
    if (!statusEl || !emptyEl) return;
    statusEl.style.display = 'flex';
    loadingEl.style.display = 'none';
    emptyEl.classList.remove('hidden');
  };

  const getDominantColor = (product) => {
    const colorMap = {
      'muski': '#1a1a2e', 'zenski': '#ec4899', 'dukseri': '#16a34a',
      'bestseller': '#f59e0b', 'trenerke': '#2563eb', 'majice': '#f5f5f5',
      'aksesoari': '#808080', 'merch': '#f59e0b'
    };
    return colorMap[product.category?.toLowerCase()] || colorMap[product.gender?.toLowerCase()] || '#1a1a2e';
  };

  const formatPrice = (num) => {
    try {
      return new Intl.NumberFormat('sr-RS').format(num) + ' RSD';
    } catch {
      return I18n.formatCurrency(num);
    }
  };

  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  };

  const trackEvent = (eventName, data) => {
    const payload = {
      event: eventName,
      section: 'for_you',
      timestamp: Date.now(),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      ...data
    };
    if (window.dataLayer) window.dataLayer.push(payload);
    if (window.gtag) window.gtag('event', eventName, payload);
    console.log('[ForYou] Track:', payload);
  };

  // Public API
  const refresh = () => loadRecommendations(true);
  const getProfile = () => userProfile;

  return { init, refresh, getProfile };
})();

// Initialize ForYou on DOM ready (only if personalization enabled)
const initForYou = () => {
  const personalization = state.user.get()?.preferences?.personalization;
  if (personalization?.enabled === false) {
    const section = $('#forYou');
    if (section) section.style.display = 'none';
    console.log('[ForYou] Personalization disabled, section hidden');
    return;
  }
  ForYou.init();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForYou);
} else {
  initForYou();
}

// Export
window.ForYou = ForYou;

// ============================================================
// RECENTLY VIEWED - Carousel Module (localStorage, cross-page, max 10)
// ============================================================
const RecentlyViewed = (() => {
  let sectionEl = null;
  let trackEl = null;
  let prevBtn = null;
  let nextBtn = null;
  let clearBtn = null;
  let products = [];
  let viewedProducts = [];
  let maxItems = 10;
  let isScrolling = false;

  const STORAGE_KEY = 'dalli_recently_viewed';
  const CARD_WIDTH = 280;
  const GAP = 16;

  const init = async () => {
    sectionEl = $('#recentlyViewed');
    if (!sectionEl) return;

    trackEl = $('#recentlyViewedTrack');
    prevBtn = document.querySelector('[data-action="recentlyViewedPrev"]');
    nextBtn = document.querySelector('[data-action="recentlyViewedNext"]');
    clearBtn = $('#clearRecentlyViewedBtn');

    await loadProducts();
    loadFromStorage();
    render();
    initNavigation();
    initViewTracking();

    if (clearBtn) clearBtn.addEventListener('click', clearHistory);

    console.log('[RecentlyViewed] Initialized', { items: viewedProducts.length });
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/data/products.json', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        products = data.products || data || [];
        window._productMap = new Map(products.map(p => [p.id, p]));
      }
    } catch (e) {
      console.warn('[RecentlyViewed] Failed to load products:', e);
      products = [];
    }
  };

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('dalli_recently_viewed');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) viewedProducts = parsed.slice(0, 10);
      }
    } catch (e) {
      console.warn('[RecentlyViewed] Failed to load from storage:', e);
      viewedProducts = [];
    }
  };

  const saveToStorage = () => {
    try {
      localStorage.setItem('dalli_recently_viewed', JSON.stringify(viewedProducts));
    } catch (e) {
      console.warn('[RecentlyViewed] Failed to save to storage:', e);
    }
  };

  const addView = (productId) => {
    const id = Number(productId);
    if (isNaN(id)) return;
    viewedProducts = viewedProducts.filter(v => v.id !== id);
    viewedProducts.unshift({ id, timestamp: Date.now() });
    if (viewedProducts.length > 10) viewedProducts = viewedProducts.slice(0, 10);
    saveToStorage();
    render();
    if (sectionEl && sectionEl.style.display === 'none') sectionEl.style.display = 'block';
  };

  const render = () => {
    if (!trackEl) return;
    if (viewedProducts.length === 0) {
      trackEl.innerHTML = '';
      if (sectionEl) sectionEl.style.display = 'none';
      return;
    }
    if (sectionEl) sectionEl.style.display = 'block';

    trackEl.innerHTML = viewedProducts.map(({ id }, index) => {
      const product = window._productMap?.get(id);
      if (!product) return '';
      const variant = product.variants?.[0] || { color: product.colors?.[0]?.name, size: product.sizes?.[0]?.size, price: product.price, image: product.images?.main };
      const salePrice = product.salePrice && product.salePrice < product.price ? product.salePrice : null;
      const displayPrice = salePrice || variant?.price || product.price;
      const badge = product.badge;
      const delay = index * 30;
      return `
        <article class="product-card animate-reveal" data-product-id="${product.id}" data-ab-variant="recently_viewed" style="animation-delay: ${index * 30}ms;" role="listitem">
          <div class="product-card__media">
            <picture>
              <source type="image/avif" srcset="${variant?.image?.replace('.jpg', '.avif') || product.images?.main?.replace('.jpg', '.avif') || '/images/placeholder.avif'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <source type="image/webp" srcset="${variant?.image?.replace('.jpg', '.svg') || product.images?.main?.replace('.jpg', '.svg') || '/images/placeholder.svg'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <img class="product-card__image" src="${variant?.image || product.images?.main || '/images/placeholder.jpg'}" alt="${escapeHtml(product.altText || product.name)}" loading="lazy" width="400" height="400" decoding="async" style="background: ${getDominantColor(product)};">
            </picture>
            <div class="product-card__parallax-overlay"></div>
            ${badge ? `<div class="product-card__badges"><span class="badge badge-${badge === 'bestseller' ? 'warning' : badge === 'new' ? 'primary' : 'accent'}">${badge === 'bestseller' ? t('product.bestSeller') : badge === 'new' ? t('product.new') : t('product.sale')}</span></div>` : ''}
            <button class="product-card__wishlist" data-action="wishlist" data-product-id="${product.id}" aria-label='${escapeHtml("Dodaj " + product.name + " na listu želja")}'><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
            <button class="product-card__quick-add" data-action="quick-add" data-product-id="${product.id}" data-variant-id="${product.id}-${variant?.color}-${variant?.size}" aria-label='${escapeHtml("Brzo dodaj " + product.name + " u korpu")}'>Dodaj u korpu</button>
            <span class="product-card__ripple" aria-hidden="true"></span>
          </div>
          <div class="product-card__content">
            <span class="product-card__category">${escapeHtml(product.category || 'Garderoba')}</span>
            <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
            <div class="product-card__rating"><span class="product-card__stars">${'★'.repeat(Math.floor(product.rating || 4.5))}${'☆'.repeat(5 - Math.floor(product.rating || 4.5))}</span><span>(${product.reviews || 0})</span></div>
            <div class="product-card__price-row"><span class="product-card__price" data-price="${displayPrice}">${formatPrice(displayPrice)}</span>${salePrice ? `<span class="product-card__old-price">${formatPrice(product.price)}</span>` : ''}</div>
            <p class="product-card__installment">ili ${Math.ceil(displayPrice / 3).I18n.formatNumber} RSD x 3 rate bez kamate</p>
          </div>
        </article>
      `;
  });
    updateNavButtons();
  };

  const initNavigation = () => {
    if (!trackEl || !prevBtn || !nextBtn) return;
    prevBtn.addEventListener('click', () => scrollBy(-1));
    nextBtn.addEventListener('click', () => scrollBy(1));
    trackEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); scrollBy(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); scrollBy(1); }
    });
    trackEl.addEventListener('scroll', debounce(() => updateNavButtons(), 50), { passive: true });
  };

  const scrollBy = (direction) => {
    if (!trackEl || isScrolling) return;
    isScrolling = true;
    const scrollAmount = 280 + 16;
    trackEl.scrollTo({ left: trackEl.scrollLeft + direction * scrollAmount, behavior: 'smooth' });
    setTimeout(() => { isScrolling = false; updateNavButtons(); }, 400);
  };

  const updateNavButtons = () => {
    if (!trackEl || !prevBtn || !nextBtn) return;
    const maxScroll = trackEl.scrollWidth - trackEl.clientWidth;
    if (prevBtn) prevBtn.disabled = trackEl.scrollLeft <= 10;
    if (nextBtn) nextBtn.disabled = trackEl.scrollLeft >= maxScroll - 10;
  };

  const clearHistory = () => {
    viewedProducts = [];
    saveToStorage();
    render();
    trackEvent('recently_viewed_clear', {});
  };

  const initViewTracking = () => {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card[data-product-id]');
      if (card && !e.target.closest('button, a')) addView(card.dataset.productId);
    });
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="quick-add"], [data-action="wishlist"]');
      if (btn) {
        const card = btn.closest('.product-card[data-product-id]');
        if (card) addView(card.dataset.productId);
      }
    });

  };  // end

  const getDominantColor = (product) => {
    const colorMap = { 'muski': '#1a1a2e', 'zenski': '#ec4899', 'dukseri': '#16a34a', 'bestseller': '#f59e0b', 'trenerke': '#2563eb', 'majice': '#f5f5f5', 'aksesoari': '#808080', 'merch': '#f59e0b' };
    return colorMap[product.category?.toLowerCase()] || colorMap[product.gender?.toLowerCase()] || '#1a1a2e';
  };
  const formatPrice = (num) => { try { return new Intl.NumberFormat('sr-RS').format(num) + ' RSD'; } catch { return I18n.formatCurrency(num); } };
  const escapeHtml = (str) => { if (!str) return ''; return String(str).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '&#039;'); };
  const trackEvent = (eventName, data) => { const payload = { event: eventName, section: 'recently_viewed', timestamp: Date.now(), device: window.innerWidth < 768 ? 'mobile' : 'desktop', ...data }; if (window.dataLayer) window.dataLayer.push(payload); if (window.gtag) window.gtag('event', eventName, payload); console.log('[RecentlyViewed] Track:', payload); };
  const debounce = (fn, wait) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), wait); }; };

  return { init, add: addView, clear: clearHistory, getItems: () => viewedProducts };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', RecentlyViewed.init); else RecentlyViewed.init();
window.RecentlyViewed = RecentlyViewed;

// ============================================================
// TRENDING NOW - Time-decay algorithm badge + section
// ============================================================
const TrendingNow = (() => {
  let sectionEl = null;
  let gridEl = null;
  let products = [];
  let trendingProducts = [];
  let maxItems = 8;
  let decayFactor = 0.15; // Per day decay
  let refreshInterval = null;

  const loadProducts = async () => {
    try {
      const response = await fetch('/data/products.json', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        products = data.products || data || [];
      }
    } catch (e) {
      console.warn('[TrendingNow] Failed to load products:', e);
      products = [];
    }
  };

  const computeTrending = () => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    trendingProducts = products
      .map(product => {
        const views = product.views || Math.floor(Math.random() * 1000);
        const purchases = product.purchases || Math.floor(Math.random() * 100);
        const wishlists = product.wishlists || Math.floor(Math.random() * 50);
        const cartAdds = product.cartAdds || Math.floor(Math.random() * 30);
        const daysSinceLaunch = product.createdAt ? (Date.now() - new Date(product.createdAt).getTime()) / DAY_MS : 30;

        const engagement = views * 1 + purchases * 10 + wishlists * 3 + cartAdds * 5;
        const timeDecay = Math.exp(-0.15 * daysSinceLaunch);
        const score = engagement * Math.exp(-0.15 * daysSinceLaunch);

        return { product, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item, index) => ({ ...item.product, trendingScore: item.score, trendingRank: index + 1 }));
  };

  const render = () => {
    if (!gridEl) return;

    if (trendingProducts.length === 0) {
      if (sectionEl) sectionEl.style.display = 'none';
      return;
    }

    if (sectionEl) sectionEl.style.display = 'block';

    gridEl.innerHTML = trendingProducts.map((product, index) => {
      const variant = product.variants?.[0] || { 
        color: product.colors?.[0]?.name, 
        size: product.sizes?.[0]?.size, 
        price: product.price, 
        image: product.images?.main 
      };
      const salePrice = product.salePrice && product.salePrice < product.price ? product.salePrice : null;
      const displayPrice = salePrice || variant?.price || product.price;
      const badge = product.badge;
      const delay = index * 40;

      const score = product.trendingScore || 0;
      const formattedScore = score >= 1000 ? (score / 1000).toFixed(1) + 'k' : Math.round(score);

      return `
        <article class="product-card animate-reveal" 
                 data-product-id="${product.id}" 
                 data-ab-variant="trending" 
                 style="animation-delay: ${index * 40}ms;" 
                 role="listitem">
          <div class="product-card__media">
            <picture>
              <source type="image/avif" srcset="${variant?.image?.replace('.jpg', '.avif') || product.images?.main?.replace('.jpg', '.avif') || '/images/placeholder.avif'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <source type="image/webp" srcset="${variant?.image?.replace('.jpg', '.svg') || product.images?.main?.replace('.jpg', '.svg') || '/images/placeholder.svg'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <div class="lqip-wrapper" style="aspect-ratio: 1;">
      <img 
        class="lqip-placeholder" 
        src="${generateLQIP(variant?.image || product.images?.main || '/images/placeholder.jpg')}" 
        alt="" 
        aria-hidden="true"
        style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(8px); transform: scale(1.1); transition: opacity 0.3s ease;"
      >
      <img 
        class="product-card__image" 
        src="${variant?.image || product.images?.main || '/images/placeholder.jpg'}" 
        alt="${escapeHtml(product.altText || product.name)}" 
        loading="lazy" width="400" height="400" decoding="async"
        style="background: ${getDominantColor(product)};"
        onload="this.style.opacity=1; this.previousElementSibling.style.opacity=0;"
      >
    </div>
            </picture>
            <div class="product-card__parallax-overlay"></div>
            ${badge ? `<div class="product-card__badges"><span class="badge badge-${badge === 'bestseller' ? 'warning' : badge === 'new' ? 'primary' : 'accent'}">${badge === 'bestseller' ? t('product.bestSeller') : badge === 'new' ? t('product.new') : t('product.sale')}</span></div>` : ''}
            <div class="trending-score" aria-label="Trending score: ${formattedScore}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="23 6 16 12 23 18"/></svg>
              <span>${formattedScore}</span>
            </div>
            <button class="product-card__wishlist" data-action="wishlist" data-product-id="${product.id}" aria-label="${escapeHtml('Dodaj ' + product.name + ' na listu želja')}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
            <button class="product-card__quick-add" data-action="quick-add" data-product-id="${product.id}" data-variant-id="${product.id}-${variant?.color}-${variant?.size}" aria-label="${escapeHtml('Brzo dodaj ' + product.name + ' u korpu')}">Dodaj u korpu</button>
            <span class="product-card__ripple" aria-hidden="true"></span>
          </div>
          <div class="product-card__content">
            <span class="product-card__category">${escapeHtml(product.category || 'Garderoba')}</span>
            <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
            <div class="product-card__rating"><span class="product-card__stars">${'★'.repeat(Math.floor(product.rating || 4.5))}${'☆'.repeat(5 - Math.floor(product.rating || 4.5))}</span><span>(${product.reviews || 0})</span></div>
            <div class="product-card__price-row"><span class="product-card__price" data-price="${displayPrice}">${formatPrice(displayPrice)}</span>${salePrice ? `<span class="product-card__old-price">${formatPrice(product.price)}</span>` : ''}</div>
            <p class="product-card__installment">ili ${Math.ceil(displayPrice / 3).I18n.formatNumber} RSD x 3 rate bez kamate</p>
          </div>
        </article>
      `;
  });

    gridEl.dataset.rendered = 'true';
  };

  const startAutoRefresh = () => {
    refreshInterval = setInterval(() => {
      computeTrending();
      render();
    }, 30 * 60 * 1000);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) clearInterval(refreshInterval);
  };

  const getDominantColor = (product) => {
    const colorMap = { 'muski': '#1a1a2e', 'zenski': '#ec4899', 'dukseri': '#16a34a', 'bestseller': '#f59e0b', 'trenerke': '#2563eb', 'majice': '#f5f5f5', 'aksesoari': '#808080', 'merch': '#f59e0b' };
    return colorMap[product.category?.toLowerCase()] || colorMap[product.gender?.toLowerCase()] || '#1a1a2e';
  };

  const formatPrice = (num) => { try { return new Intl.NumberFormat('sr-RS').format(num) + ' RSD'; } catch { return I18n.formatCurrency(num); } };
  const escapeHtml = (str) => { if (!str) return ''; return String(str).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '&#039;'); };
  const trackEvent = (eventName, data) => { const payload = { event: eventName, section: 'trending_now', timestamp: Date.now(), device: window.innerWidth < 768 ? 'mobile' : 'desktop', ...data }; if (window.dataLayer) window.dataLayer.push(payload); if (window.gtag) window.gtag('event', eventName, payload); console.log('[TrendingNow] Track:', payload); };

  const init = async () => {
    sectionEl = document.getElementById('trendingNow');
    if (!sectionEl) return;

    gridEl = document.getElementById('trendingGrid');
    await loadProducts();
    computeTrending();
    render();
    startAutoRefresh();

    console.log('[TrendingNow] Initialized', { products: trendingProducts.length });
  };

  const refresh = () => { computeTrending(); render(); };

  return { init, refresh };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', TrendingNow.init); else TrendingNow.init();
window.TrendingNow = TrendingNow;

// ============================================================
// FREQUENTLY BOUGHT TOGETHER (3.3) - Product Page Widget
// ============================================================
const FrequentlyBoughtTogether = (() => {
  let containerEl = null;
  let productId = null;
  let products = [];

  const init = (productIdOrEl) => {
    if (typeof productIdOrEl === 'number') {
      productId = productIdOrEl;
    } else if (productIdOrEl && productIdOrEl.dataset) {
      productId = parseInt(productIdOrEl.dataset.productId);
      containerEl = productIdOrEl;
    } else {
      productId = productIdOrEl;
    }
    
    if (!productId) return;
    if (!containerEl) containerEl = $(`#frequentlyBoughtTogether[data-product-id="${productId}"]`);
    if (!containerEl) return;
    
    loadProducts();
    buildCooccurrence();
    render();
    console.log('[FBT] Initialized for product:', productId);
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/data/products.json', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        products = data.products || data || [];
      }
    } catch (e) {
      console.warn('[FBT] Failed to load products:', e);
    }
};

  const render = () => {
    if (!containerEl || !cooccurrence) return;
    
    const currentVariant = products.find(p => p.id === productId)?.variants?.[0];
    const currentVariantId = currentVariant ? `${productId}-${currentVariant.color}-${currentVariant.size}` : null;
    
    if (!currentVariantId || !cooccurrence?.has(currentVariantId)) {
      containerEl.innerHTML = '';
      return;
    }
    
    const related = cooccurrence.get(currentVariantId);
    if (!related || related.size === 0) {
      containerEl.innerHTML = '';
      return;
    }
    
    // Get top 4 related products
    const topRelated = Array.from(related.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([variantId, count]) => {
        const product = getProductByVariantId(variantId);
        return product ? { ...product, count } : null;
      })
      .filter(Boolean);
    
    if (topRelated.length === 0) {
      containerEl.innerHTML = '';
      return;
    }
    
    containerEl.innerHTML = `
      <div class="fbt-section" style="margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--color-divider);">
        <h3 style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-light); margin-bottom: var(--space-4);">Često se kupuju zajedno</h3>
        <div class="fbt-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-4);">
          ${topRelated.map(item => `
            <article class="fbt-item" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: var(--space-3); text-align: center; transition: transform var(--duration-fast);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <img src="${item.image}" alt="${item.name}" style="width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: var(--radius-btn); margin-bottom: var(--space-2);">
              <h4 style="font-size: var(--fs-sm); font-weight: var(--fw-medium); margin-bottom: var(--space-1);">${item.name}</h4>
              <div style="font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--fw-medium); color: var(--color-primary);">${item.price.I18n.formatNumber} RSD</div>
              <button class="btn btn-primary btn-sm" style="margin-top: var(--space-2); width: 100%;" data-action="quick-add" data-variant-id="${item.variantId || item.id}">Dodaj</button>
            </article>
          `).join('')}
        </div>
      </div>
    `;
    
    // Bind quick-add buttons
    containerEl.querySelectorAll('[data-action="quick-add"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const variantId = btn.dataset.variantId;
        const product = getProductByVariantId(variantId);
        const variant = product?.variants?.find(v => `${product.id}-${v.color}-${v.size}` === variantId);
        if (product && variant) {
          addToCart(product, variant, 1);
          showToast(`${t("cart.addedToCart", { productName: product.name })}`, 'success');
        }
      });
    });
  };

  return { init, render };
})();

window.FrequentlyBoughtTogether = FrequentlyBoughtTogether;

// ============================================================
// COMPLETE THE LOOK (3.4) - Product Page Widget
// ============================================================
const CompleteTheLook = (() => {
  let containerEl = null;
  let productId = null;
  let products = [];

  const outfitComplements = {
    'majice': ['dukseri', 'trenerke', 'aksesoari', 'kabanice'],
    'trenerke': ['majice', 'dukseri', 'patike', 'šalice'],
    'dukseri': ['majice', 'trenerke', 'kabanice', 'šalice'],
    'kabanice': ['majice', 'trenerke', 'šalice', 'kacamke'],
    'pantalone': ['majice', 'kabanice', 'patike', 'kacamke'],
    'šorts': ['majice', 'šalice', 'patike', 'kabanice'],
    'haljine': ['dukseri', 'aksesoari', 'cipelice', 'šalice'],
    'jeans': ['majice', 'kabanice', 'patike', 'kabanice'],
    'šalice': ['majice', 'dukseri', 'haljine', 'kabanice'],
    'patike': ['pantalone', 'jeans', 'šorts', 'trenerke'],
    'cipelice': ['haljine', 'šalice', 'dukseri', 'aksesoari'],
    'aksesoari': ['majice', 'dukseri', 'haljine', 'kabanice'],
    'kacamke': ['majice', 'dukseri', 'haljine', 'šalice']
  };

  const init = (productIdOrEl) => {
    if (typeof productIdOrEl === 'number') {
      productId = productIdOrEl;
    } else if (productIdOrEl && productIdOrEl.dataset) {
      productId = parseInt(productIdOrEl.dataset.productId);
      containerEl = productIdOrEl;
    } else {
      productId = productIdOrEl;
    }
    
    if (!productId) return;
    if (!containerEl) containerEl = $(`#completeTheLook[data-product-id="${productId}"]`);
    if (!containerEl) return;
    
    loadProducts();
    render();
    console.log('[CTL] Initialized for product:', productId);
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/data/products.json', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        products = data.products || data || [];
      }
    } catch (e) {
      console.warn('[CTL] Failed to load products:', e);
    }
  };

  const render = () => {
    if (!containerEl) return;
    
    const currentProduct = getProductById(productId);
    if (!currentProduct) return;
    
    const complements = outfitComplements[currentProduct.category?.toLowerCase()];
    if (!complements || complements.length === 0) {
      containerEl.innerHTML = '';
      return;
    }
    
    // Get one product from each complementary category
    const lookItems = complements.map(cat => {
      const candidates = products.filter(p => p.category === cat);
      if (candidates.length === 0) return null;
      // Prefer products in stock
      const inStock = candidates.filter(p => p.inventory?.status !== 'out_of_stock');
      return (inStock.length ? inStock : candidates)[Math.floor(Math.random() * (inStock.length || candidates.length))];
    }).filter(Boolean);
    
    if (lookItems.length === 0) {
      containerEl.innerHTML = '';
      return;
    }
    
    containerEl.innerHTML = `
      <div class="ctl-section" style="margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--color-divider);">
        <h3 style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-light); margin-bottom: var(--space-4);">Dopuni izgled</h3>
        <div class="ctl-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-4);">
          ${lookItems.map(item => `
            <article class="ctl-item" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: var(--space-3); text-align: center; transition: transform var(--duration-fast);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <img src="${item.image}" alt="${item.name}" style="width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: var(--radius-btn); margin-bottom: var(--space-2);">
              <div style="font-size: var(--fs-xs); color: var(--color-text-tertiary); text-transform: capitalize; margin-bottom: var(--space-1);">${item.category}</div>
              <h4 style="font-size: var(--fs-sm); font-weight: var(--fw-medium); margin-bottom: var(--space-1);">${item.name}</h4>
              <div style="font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--fw-medium); color: var(--color-primary);">${item.price.I18n.formatNumber} RSD</div>
              <button class="btn btn-primary btn-sm" style="margin-top: var(--space-2); width: 100%;" data-action="quick-add" data-variant-id="${item.id}">Dodaj</button>
            </article>
          `).join('')}
        </div>
      </div>
    `;
    
    // Bind quick-add buttons
    containerEl.querySelectorAll('[data-action="quick-add"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const variantId = btn.dataset.variantId;
        const product = getProductById(parseInt(variantId));
        const variant = product?.variants?.[0];
        if (product && variant) {
          addToCart(product, variant, 1);
          showToast(`${t("cart.addedToCart", { productName: product.name })}`, 'success');
        }
      });
    });
  };

  return { init, render };
})();

window.CompleteTheLook = CompleteTheLook;

// ============================================================
// SIMILAR PRODUCTS (3.2) - Product Page Widget
// ============================================================
const SimilarProducts = (() => {
  let containerEl = null;
  let productId = null;
  let products = [];

  const init = (productIdOrEl) => {
    if (typeof productIdOrEl === 'number') {
      productId = productIdOrEl;
    } else if (productIdOrEl && productIdOrEl.dataset) {
      productId = parseInt(productIdOrEl.dataset.productId);
      containerEl = productIdOrEl;
    } else {
      productId = productIdOrEl;
    }
    
    if (!productId) return;
    if (!containerEl) containerEl = $(`#similarProducts[data-product-id="${productId}"]`);
    if (!containerEl) return;
    
    loadProducts();
    render();
    console.log('[Similar] Initialized for product:', productId);
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/data/products.json', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        products = data.products || data || [];
      }
    } catch (e) {
      console.warn('[Similar] Failed to load products:', e);
    }
  };

  const render = () => {
    if (!containerEl) return;
    
    const currentProduct = getProductById(productId);
    if (!currentProduct) return;
    
    // Find similar products (same category, gender, similar price)
    const similar = products
      .filter(p => p.id !== productId)
      .filter(p => p.category === currentProduct.category || p.gender === currentProduct.gender)
      .filter(p => Math.abs(p.price - currentProduct.price) / currentProduct.price < 0.5)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
    
    if (similar.length === 0) {
      containerEl.innerHTML = '';
      return;
    }
    
    containerEl.innerHTML = `
      <div class="similar-section" style="margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--color-divider);">
        <h3 style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-light); margin-bottom: var(--space-4);">Slični proizvodi</h3>
        <div class="similar-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-4);">
          ${similar.map(item => `
            <article class="similar-item" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: var(--space-3); text-align: center; transition: transform var(--duration-fast);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <img src="${item.image}" alt="${item.name}" style="width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: var(--radius-btn); margin-bottom: var(--space-2);">
              <h4 style="font-size: var(--fs-sm); font-weight: var(--fw-medium); margin-bottom: var(--space-1);">${item.name}</h4>
              <div style="font-family: var(--font-display); font-size: var(--text-base); font-weight: var(--fw-medium); color: var(--color-primary);">${item.price.I18n.formatNumber} RSD</div>
              <button class="btn btn-primary btn-sm" style="margin-top: var(--space-2); width: 100%;" data-action="quick-add" data-variant-id="${item.id}">Dodaj</button>
            </article>
          `).join('')}
        </div>
      </div>
    `;
    
    containerEl.querySelectorAll('[data-action="quick-add"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const variantId = btn.dataset.variantId;
        const product = getProductById(parseInt(variantId));
        const variant = product?.variants?.find(v => `${product.id}-${v.color}-${v.size}` === variantId);
        if (product && variant) {
          addToCart(product, variant, 1);
          showToast(`${t("cart.addedToCart", { productName: product.name })}`, 'success');
        }
      });
    });
  };

  return { init, render };
})();

window.SimilarProducts = SimilarProducts;

// ============================================================
// UGC FEED - Shoppable Instagram Feed (Carousel + Grid + API)
// ============================================================
const UGCFeed = (() => {
  let sectionEl = null;
  let trackEl = null;
  let carouselEl = null;
  let navEl = null;
  let prevBtn = null;
  let nextBtn = null;
  let dotsEl = null;
  let loadMoreBtn = null;
  let modeIndicatorEl = null;
  let loadingEl = null;
  let errorEl = null;
  let posts = [];
  let currentPage = 0;
  let itemsPerPage = 12;
  let isLoading = false;
  let hasMore = true;
  let isDesktop = false;
  let reducedMotion = false;
  let autoSlideInterval = null;
  let currentSlide = 0;
  let totalSlides = 0;
  let touchStartX = 0;
  let isDragging = false;

  // Configuration
  const CONFIG = {
    apiEndpoint: '/api/instagram/posts', // Replace with actual endpoint
    accessToken: null, // Set via admin panel
    fallbackDataUrl: '/data/ugc.json',
    maxPosts: 48,
    postsPerPage: 12,
    carouselAutoSlide: 5000,
    enableAutoSlide: false,
  };

  // Static fallback data (loaded from /data/ugc.json)
  let fallbackPosts = [];

  const init = async () => {
    sectionEl = $('#ugcFeed');
    if (!sectionEl) return;

    trackEl = $('#ugcTrack');
    carouselEl = $('#ugcCarousel');
    navEl = $('#ugcNav');
    prevBtn = document.querySelector('[data-action="ugcPrev"]');
    nextBtn = document.querySelector('[data-action="ugcNext"]');
    dotsEl = $('#ugcDots');
    loadMoreBtn = $('#ugcLoadMoreBtn');
    modeIndicatorEl = $('#ugcModeIndicator');
    loadingEl = sectionEl.querySelector('.ugc-feed__loading');
    errorEl = sectionEl.querySelector('.ugc-feed__error');

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isDesktop = window.innerWidth >= 768;

    // Load fallback data first
    await loadFallbackData();

    // Try to load from Instagram API
    await loadPosts();

    // Initialize UI
    renderPosts();
    initNavigation();
    initCarousel();
    initLoadMore();
    initTouchSwipe();
    initResizeHandler();

    console.log('[UGCFeed] Initialized', { posts: posts.length, fallback: fallbackPosts.length });
  };

  const loadFallbackData = async () => {
    try {
      const response = await fetch(CONFIG.fallbackDataUrl, { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        fallbackPosts = data.posts || data || [];
        console.log('[UGCFeed] Loaded fallback data:', fallbackPosts.length, 'posts');
      }
    } catch (e) {
      console.warn('[UGCFeed] Failed to load fallback data:', e);
      fallbackPosts = [];
    }
  };

  const loadPosts = async () => {
    // Try Instagram Graph API if token available
    if (CONFIG.accessToken) {
      try {
        const response = await fetch(`${CONFIG.apiEndpoint}?access_token=${CONFIG.accessToken}&limit=${CONFIG.maxPosts}`, {
          credentials: 'same-origin',
          signal: AbortSignal.timeout(10000)
        });
        if (response.ok) {
          const data = await response.json();
          posts = (data.data || data.posts || data).slice(0, CONFIG.maxPosts);
          return;
        }
      } catch (e) {
        console.warn('[UGCFeed] API failed, using fallback:', e);
      }
    }
    
    // Fallback to local data
    posts = fallbackPosts.slice(0, CONFIG.maxPosts);
    if (modeIndicatorEl) modeIndicatorEl.classList.remove('hidden');
  };

  const renderPosts = () => {
    if (!trackEl) return;

    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    const pagePosts = posts.slice(start, end);

    if (pagePosts.length === 0) {
      if (trackEl) trackEl.innerHTML = '';
      if (sectionEl) sectionEl.style.display = 'none';
      return;
    }

    if (sectionEl) sectionEl.style.display = 'block';

    // Render new posts
    const html = pagePosts.map((post, index) => renderPostCard(post, start + index)).join('');
    
    if (currentPage === 0) {
      trackEl.innerHTML = html;
    } else {
      trackEl.insertAdjacentHTML('beforeend', html);
    }

    // Update navigation dots
    updateDots();

    // Initialize shoppable tags
    initShoppableTags();

    // Update load more button
    hasMore = end < posts.length;
    if (loadMoreBtn) {
      loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
      loadMoreBtn.disabled = !hasMore;
    }
  };

  const renderPostCard = (post, index) => {
    const variant = post.product?.variants?.[0] || { 
      color: post.product?.colors?.[0]?.name, 
      size: post.product?.sizes?.[0]?.size, 
      price: post.product?.price, 
      image: post.product?.images?.main 
    };
    const salePrice = post.product?.salePrice && post.product.salePrice < post.product.price ? post.product.salePrice : null;
    const displayPrice = salePrice || variant?.price || post.product?.price;
    const badge = post.product?.badge;
    const delay = index * 30;

    // Shoppable tags
    const tags = post.taggedProducts || [];
    const tagsHtml = tags.slice(0, 3).map(tag => `
      <div class="ugc-tag" style="--delay: ${Math.random() * 2}s;">
        <span class="ugc-tag__product">${escapeHtml(tag.name || tag.productName)}</span>
        ${tag.price ? `<span class="ugc-tag__price">${formatPrice(tag.price)}</span>` : ''}
        ${tag.productId ? `
          <button class="ugc-tag__quick-add" data-action="quick-add" data-product-id="${tag.productId}" aria-label="${escapeHtml('Brzo dodaj ' + (tag.name || '') + ' u korpu')}">+ Dodaj</button>
        ` : ''}
      </div>
    `).join('');

    return `
      <article class="ugc-card animate-reveal" 
               data-post-id="${post.id}" 
               data-ab-variant="ugc" 
               style="animation-delay: ${index * 30}ms;" 
               role="listitem">
        <div class="ugc-card__media">
          <picture>
            <source type="image/avif" srcset="${post.image?.replace('.jpg', '.avif') || '/images/placeholder.avif'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
            <source type="image/webp" srcset="${post.image?.replace('.jpg', '.svg') || '/images/placeholder.svg'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
            <div class="lqip-wrapper" style="aspect-ratio: 1;">
      <img 
        class="lqip-placeholder" 
        src="${generateLQIP(post.image || '/images/placeholder.jpg')}" 
        alt="" 
        aria-hidden="true"
        style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(8px); transform: scale(1.1); transition: opacity 0.3s ease;"
      >
      <img 
        class="ugc-card__image" 
        src="${post.image || '/images/placeholder.jpg'}" 
        alt="${escapeHtml(post.altText || post.caption || 'Instagram post')}" 
        loading="lazy" width="400" height="400" decoding="async"
        style="background: ${getDominantColor(post)};"
        onload="this.style.opacity=1; this.previousElementSibling.style.opacity=0;"
      >
    </div>
          </picture>
          <div class="ugc-card__tags" aria-hidden="true">
            ${post.taggedProducts?.slice(0, 3).map(tag => `
              <div class="ugc-tag" style="--delay: ${Math.random() * 2}s;">
                <span class="ugc-tag__product">${escapeHtml(tag.name || tag.productName)}</span>
                ${tag.price ? `<span class="ugc-tag__price">${formatPrice(tag.price)}</span>` : ''}
                ${tag.productId ? `
                  <button class="ugc-tag__quick-add" data-action="quick-add" data-product-id="${tag.productId}" aria-label="${escapeHtml('Brzo dodaj ' + (tag.name || '') + ' u korpu')}">+ Dodaj</button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="ugc-card__content">
          <div class="ugc-card__meta">
            <div class="ugc-card__username">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>${escapeHtml(post.username || '@dalli.rs')}</span>
            </div>
            <time class="ugc-card__date" datetime="${post.timestamp || new Date().toISOString()}">${formatRelativeTime(post.timestamp)}</time>
          </div>
          <p class="ugc-card__caption">${escapeHtml(post.caption || '')}</p>
          <div class="ugc-card__actions">
            <button class="ugc-card__action" data-action="ugcLike" data-post-id="${post.id}" aria-label="Lajkuj">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>${post.likesCount || 0}</span>
            </button>
            <button class="ugc-card__action" data-action="ugcSave" data-post-id="${post.id}" aria-label="Sačuvaj">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span>Sačuvaj</span>
            </button>
            <button class="ugc-card__action" data-action="ugcReport" data-post-id="${post.id}" aria-label="Prijavi">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>Prijavi</span>
            </button>
            <a href="https://instagram.com/p/${post.shortCode || ''}" target="_blank" rel="noopener" class="ugc-card__action" data-track="ugc_open_instagram" aria-label="Otvori na Instagramu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="23 6 16 12 23 18"/></svg>
              <span>Instagram</span>
            </a>
          </div>
        </div>
      </article>
    `;
  };

const initShoppableTags = () => {
  // Initialize quick-add buttons in shoppable tags
  $$('.ugc-tag__quick-add', trackEl).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.dataset.productId;
      if (productId) {
        const product = window._productMap?.get(Number(productId));
        if (product) {
          const variant = product.variants?.[0] || { color: product.colors?.[0]?.name, size: product.sizes?.[0]?.size, price: product.price, image: product.images?.main };
          addToCart(product, variant, 1);
          trackEvent('ugc_shop_click', { productId, source: 'shoppable_tag' });
        }
      }
    });
  });

  // Initialize quick-add buttons on cards
  $$('.ugc-card .product-card__quick-add', trackEl).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.dataset.productId;
      if (productId) {
        trackEvent('ugc_shop_click', { productId, source: 'card_quick_add' });
      }
    });
  });

  // Like button
  $$('[data-action="ugcLike"]', trackEl).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.postId;
      btn.classList.toggle('active');
      trackEvent('ugc_like', { postId, liked: btn.classList.contains('active') });
    });
  });

  // Save button
  $$('[data-action="ugcSave"]', trackEl).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.postId;
      btn.classList.toggle('saved');
      trackEvent('ugc_save', { postId, saved: btn.classList.contains('saved') });
    });
  });

  // Report button - adds to moderation queue
  $$('[data-action="ugcReport"]', trackEl).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.postId;
      const post = posts.find(p => p.id === postId);
      ModerationQueue.add({
        type: 'ugc_report',
        postId: postId,
        reason: 'User reported content',
        content: post?.caption || 'No caption',
        userId: 'anonymous' // In real app, get from auth
      });
      btn.classList.add('reported');
      btn.disabled = true;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg> Prijavljeno';
      trackEvent('ugc_report', { postId });
    });
  });

  // Track card impressions
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const postId = card.dataset.postId;
          trackEvent('ugc_impression', { postId });
          observer.unobserve(card);
        }
      });
    }, { threshold: 0.5 });

    $$('.ugc-card', trackEl).forEach(card => observer.observe(card));
  }
};

const initNavigation = () => {
  if (!navEl || !prevBtn || !nextBtn) return;

  prevBtn.addEventListener('click', () => scrollCarousel(-1));
  nextBtn.addEventListener('click', () => scrollCarousel(1));

  // Keyboard navigation
  if (trackEl) {
    trackEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); scrollCarousel(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); scrollCarousel(1); }
    });
  }
};

const initCarousel = () => {
  if (!trackEl || !carouselEl) return;

  // Auto-slide for mobile
  if (!isDesktop && CONFIG.enableAutoSlide && !reducedMotion) {
    autoSlideInterval = setInterval(() => {
      if (!isDragging && document.visibilityState === 'visible') {
        scrollCarousel(1);
      }
    }, CONFIG.carouselAutoSlide);
  }

  // Pause on hover
  if (carouselEl) {
    carouselEl.addEventListener('mouseenter', () => {
      if (autoSlideInterval) clearInterval(autoSlideInterval);
    });
    carouselEl.addEventListener('mouseleave', () => {
      if (CONFIG.enableAutoSlide && !reducedMotion && !isDesktop) {
        autoSlideInterval = setInterval(() => scrollCarousel(1), CONFIG.carouselAutoSlide);
      }
    });
  }

  // Update dots on scroll
  if (trackEl) {
    trackEl.addEventListener('scroll', debounce(() => {
      updateDots();
      updateNavButtons();
    }, 50), { passive: true });
  }
};

const scrollCarousel = (direction) => {
  if (!trackEl || isDragging) return;
  
  const cardWidth = 280 + 16; // card width + gap
  const targetScroll = trackEl.scrollLeft + (direction * (280 + 16));
  
  trackEl.scrollTo({
    left: targetScroll,
    behavior: 'smooth'
  });

};  // end

  const updateDots = () => {
  if (!dotsEl || !trackEl) return;
  
  const cardWidth = 280 + 16;
  const totalCards = posts.length;
  const cardsPerView = isDesktop ? 4 : 1;
  totalSlides = Math.ceil(posts.length / cardsPerView);
  
  dotsEl.innerHTML = '';
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('button');
    dot.className = 'ugc-feed__dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-selected', i === currentSlide ? 'true' : 'false');
    dot.setAttribute('aria-label', `Stranica ${i + 1}`);
    dot.dataset.slide = i;
    dot.addEventListener('click', () => goToSlide(i));
    dotsEl.appendChild(dot);
  }
  
  // Update active dot
  const currentSlideIndex = Math.floor(trackEl.scrollLeft / (280 + 16) / cardsPerView);
  currentSlide = Math.min(currentSlideIndex, totalSlides - 1);
  
  $$('.ugc-feed__dot', dotsEl).forEach((dot, i) => {
    dot.setAttribute('aria-selected', i === currentSlide);
  });

};  // end

  const goToSlide = (slideIndex) => {
  if (!trackEl) return;
  const cardsPerView = isDesktop ? 4 : 1;
  const scrollLeft = slideIndex * cardsPerView * (280 + 16);
  trackEl.scrollTo({ left: scrollLeft, behavior: 'smooth' });
};

const updateNavButtons = () => {
  if (!trackEl || !prevBtn || !nextBtn) return;
  const maxScroll = trackEl.scrollWidth - trackEl.clientWidth;
  prevBtn.disabled = trackEl.scrollLeft <= 10;
  nextBtn.disabled = trackEl.scrollLeft >= maxScroll - 10;
};

const initLoadMore = () => {
  if (!loadMoreBtn) return;
  
  loadMoreBtn.addEventListener('click', async () => {
    if (isLoading || !hasMore) return;
    isLoading = true;
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = `
      <svg class="ugc-feed__spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg>
      Učitavanje...
    `;

    currentPage++;
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate loading
    renderPosts();
    isLoading = false;
  });

};  // end

  const initTouchSwipe = () => {
  if (!trackEl) return;
  
  trackEl.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  trackEl.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touchX = e.touches[0].clientX;
    const diff = touchStartX - touchX;
    if (Math.abs(diff) > 50) {
      trackEl.scrollLeft += diff * 0.5;
      touchStartX = touchX;
    }
  }, { passive: true });

  trackEl.addEventListener('touchend', () => {
    isDragging = false;
    updateDots();
    updateNavButtons();
  });

};  // end

  const initResizeHandler = () => {
  window.addEventListener('resize', debounce(() => {
    const wasDesktop = isDesktop;
    isDesktop = window.innerWidth >= 768;
    
    if (wasDesktop !== isDesktop) {
      updateDots();
      updateNavButtons();
    }
  }, 150));
};

const getDominantColor = (post) => {
  const colors = {
    'instagram': '#E1306C', // Instagram brand color
    'default': '#1a1a2e'
  };
  return post.dominantColor || colors['instagram'];
};

const formatPrice = (num) => {
  try {
    return new Intl.NumberFormat('sr-RS').format(num) + ' RSD';
  } catch {
    return I18n.formatCurrency(num);
  }
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Nedavno';
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Upravo sada';
  if (minutes < 60) return `pre ${minutes} min`;
  if (hours < 24) return `pre ${hours} h`;
  if (days < 7) return `pre ${days} d`;
  return I18n.formatDate(timestamp);
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
};

const trackEvent = (eventName, data) => {
  const payload = {
    event: eventName,
    section: 'ugc_feed',
    timestamp: Date.now(),
    device: window.innerWidth < 768 ? 'mobile' : 'desktop',
    ...data
  };
  if (window.dataLayer) window.dataLayer.push(payload);
  if (window.gtag) window.gtag('event', eventName, payload);
  console.log('[UGCFeed] Track:', payload);
};

const debounce = (fn, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

// Public API
const refresh = async () => { await loadPosts(); renderPosts(); };
const loadMore = () => { if (loadMoreBtn) loadMoreBtn.click(); };
const setAccessToken = (token) => { CONFIG.accessToken = token; loadPosts(); };

return { init, refresh, loadMore, setAccessToken };
})();

// Initialize UGCFeed on DOM ready
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', UGCFeed.init); else UGCFeed.init();

// Export
window.UGCFeed = UGCFeed;

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="quick-add"]');
  if (!btn) return;
  const productId = btn.dataset.productId;
  const variantId = btn.dataset.variantId;
  const product = state.products.get().find(p => p.id == productId);
  const variant = product.variants?.find(v => `${v.color}-${v.size}` === variantId.split('-').slice(1).join('-')) || product.variants?.[0];
  if (product && variant) addToCart(product, variant, 1);
});

// Wishlist toggle
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="wishlist"]');
  if (!btn) return;
  btn.classList.toggle('active');
  showToast(btn.classList.contains('active') ? t('wishlist.added') : t('wishlist.removed'), 'info');
});

// ============================================================
// FAQ ACCORDION
// ============================================================
$$('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !expanded);
    const answer = document.getElementById(btn.getAttribute('aria-controls'));
    if (answer) answer.classList.toggle('hidden');
  });
});

// ============================================================
// NEWSLETTER FORM
// ============================================================
$('#newsletterForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#newsletterEmail').value;
  const btn = e.target.querySelector('button[type="submit"]');
  const successEl = $('#newsletterSuccess');

  btn.disabled = true;
  btn.textContent = 'Pretplaćivanje...';

  // TODO: Submit to API
  await new Promise(r => setTimeout(r, 800));

  hide(e.target);
  show(successEl);
  showToast(t('newsletter.subscribed'), 'success');
});

// ============================================================
// FAQ TOGGLE
// ============================================================
window.toggleFaq = (btn) => {
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', !expanded);
  const answer = document.getElementById(btn.getAttribute('aria-controls'));
  if (answer) answer.classList.toggle('hidden');
};

$$('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => window.toggleFaq(btn));
});

// ============================================================
// COOKIE CONSENT
// ============================================================
const initCookieConsent = () => {
  const consent = localStorage.getItem('dalli_cookie_consent');
  if (!consent) {
    setTimeout(() => show($('#cookieConsent')), 3000);
  }
};

$('#cookieAccept')?.addEventListener('click', () => {
  safeSetItem('dalli_cookie_consent', 'all');
  hide($('#cookieConsent'));
  // Enable analytics, marketing cookies
});

$('#cookieReject')?.addEventListener('click', () => {
  safeSetItem('dalli_cookie_consent', 'necessary');
  hide($('#cookieConsent'));
  // Only necessary cookies
});

$('#cookieSettings')?.addEventListener('click', () => {
  // TODO: Open cookie settings modal
  showToast(t('settings.cookiesComingSoon'), 'info');
});

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
const showToast = (message, type = 'info') => {
  const container = $('#toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  const icons = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.47h16.94a2 2 0 0 0 1.71-3.47L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease-in reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

window.showToast = showToast;

// ============================================================
// SEARCH (Basic)
// ============================================================
let searchDebounce;
$('#searchInput')?.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  const query = e.target.value.trim().toLowerCase();
  const suggestions = $('#searchSuggestions');
  const recent = $('#searchRecent');

  if (query.length < 2) {
    hide(suggestions);
    show($('#searchRecent'));
    return;
  }

  hide($('#searchRecent'));
  searchDebounce = setTimeout(() => {
    const products = state.products.get();
    const matches = products
      .filter(p => p.name.toLowerCase().includes(query) || (p.category?.toLowerCase().includes(query)))
      .slice(0, 5);

    if (matches.length) {
      suggestions.innerHTML = matches.map(p => `
        <button class="search-suggestion-item" role="option" data-product-id="${p.id}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);width:100%;text-align:left;cursor:pointer;transition:background var(--duration-fast);">
          <img src="${p.images?.main || '/images/placeholder.jpg'}" alt="" width="40" height="40" style="object-fit:cover;border-radius:var(--radius-md);">
          <div>
            <div style="font-weight:600;color:var(--color-text);">${p.name}</div>
            <div style="font-size:var(--fs-xs);color:var(--color-text-tertiary);">${p.category} • ${p.price.I18n.formatNumber} RSD</div>
          </div>
        </button>
      `).join('');
      show(suggestions);
    } else {
      hide(suggestions);
    }
  }, 150);
});

// Search suggestion click
$('#searchSuggestions')?.addEventListener('click', (e) => {
  const item = e.target.closest('[data-product-id]');
  if (!item) return;
  const productId = item.dataset.productId;
  window.location.href = `/proizvod-${state.products.get().find(p => p.id == productId)?.slug || productId}.html`;
  });

// Search form submit
$('#searchForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = $('#searchInput').value.trim();
  if (query) {
    window.location.href = `/proizvodi.html?q=${encodeURIComponent(query)}`;
  }
  });

// ============================================================
// LOYALTY CONFIG LOADER
// ============================================================
const loadLoyaltyConfig = async () => {
  try {
    const res = await fetch('/data/loyalty.json');
    if (!res.ok) throw new Error('Failed to load loyalty config');
    const config = await res.json();
    state.loyalty.set(config);
    console.log('[Loyalty] Config loaded:', config.tiers.length, 'tiers');
  } catch (err) {
    console.warn('[Loyalty] Config load failed:', err.message);
    // Fallback minimal config
    state.loyalty.set({
      tiers: [
        { id: 'member', label: 'Član', minSpent: 0, color: '#6B7280', gradient: 'from-gray-500 to-gray-600', benefits: [] },
        { id: 'silver', label: 'Srebro', minSpent: 100000, color: '#9CA3AF', gradient: 'from-gray-400 to-gray-500', benefits: [] },
        { id: 'gold', label: 'Zlato', minSpent: 500000, color: '#F59E0B', gradient: 'from-amber-400 to-amber-600', benefits: [] },
        { id: 'black', label: 'Crno', minSpent: 1000000, color: '#111827', gradient: 'from-black to-gray-900', benefits: [] }
      ],
      points: { earnRate: 1, earnPerCurrency: 100, redeemRate: 100, redeemValue: 1, minRedeem: 500, maxRedeemPercent: 30, expiryMonths: 24 },
      progress: { showNextTier: true, showSpendRemaining: true, showOrdersRemaining: true, milestones: [] }
    });
  }
};

// ============================================================
// PERSONALIZATION CONFIG LOADER
// ============================================================
const loadPersonalizationConfig = async () => {
  try {
    const res = await fetch('/data/personalization.json');
    if (!res.ok) throw new Error('Failed to load personalization config');
    const config = await res.json();
    state.personalization.set(config);
    console.log('[Personalization] Config loaded');
  } catch (err) {
    console.warn('[Personalization] Config load failed:', err.message);
    // Fallback minimal config
    state.personalization.set({
      enabled: true,
      algorithms: { collaborative: { enabled: true, weight: 0.35 }, contentBased: { enabled: true, weight: 0.30 } },
      recommendationTypes: { forYou: { enabled: true, maxProducts: 8 }, recentlyViewed: { enabled: true, maxProducts: 10 } },
      scoring: { viewWeight: 1, wishlistWeight: 2.5, cartWeight: 3, purchaseWeight: 5 },
      filters: { excludePurchased: true, excludeInCart: true, excludeOutOfStock: true },
      privacy: { requireConsent: true, allowOptOut: true }
    });
  }
};

// ============================================================
const LoyaltyUtils = {
  getTierConfig: (tierId) => {
    const config = state.loyalty.get();
    return config?.tiers?.find(t => t.id === tierId) || null;
  },

  getCurrentTier: (user) => {
    if (!user?.loyalty) return 'member';
    return user.loyalty.tier || 'member';
  },

  getNextTier: (user) => {
    const config = state.loyalty.get();
    if (!config?.tiers || !user?.loyalty) return null;
    const totalSpent = user.loyalty.totalSpentRSD || 0;
    return config.tiers.find(t => t.minSpent > totalSpent) || null;
  },

  getProgressToNextTier: (user) => {
    const config = state.loyalty.get();
    if (!config?.tiers || !user?.loyalty) return { percent: 0, current: 0, target: 0 };
    const totalSpent = user.loyalty.totalSpentRSD || 0;
    const nextTier = config.tiers.find(t => t.minSpent > totalSpent);
    if (!nextTier) return { percent: 100, current: totalSpent, target: totalSpent };
    const prevTier = config.tiers.slice().reverse().find(t => t.minSpent <= totalSpent);
    const prevSpent = prevTier?.minSpent || 0;
    const percent = Math.min(((totalSpent - prevSpent) / (nextTier.minSpent - prevSpent)) * 100, 100);
    return { percent, current: totalSpent, target: nextTier.minSpent, nextTier: nextTier.id };
  },

  getTierLabel: (tierId) => {
    const labels = { member: 'Član', silver: 'Srebro', gold: 'Zlato', black: 'Crno' };
    return labels[tierId] || tierId;
  },

  getTierColor: (tierId) => {
    const colors = { member: '#6B7280', silver: '#9CA3AF', gold: '#F59E0B', black: '#111827' };
    return colors[tierId] || '#6B7280';
  },

  getTierGradient: (tierId) => {
    const gradients = {
      member: 'from-gray-500 to-gray-600',
      silver: 'from-gray-400 to-gray-500',
      gold: 'from-amber-400 to-amber-600',
      black: 'from-black to-gray-900'
    };
    return gradients[tierId] || 'from-gray-500 to-gray-600';
  },

  getBenefitsForTier: (tierId) => {
    const config = state.loyalty.get();
    if (!config?.benefits) return [];
    const tier = config.tiers.find(t => t.id === tierId);
    if (!tier?.benefits) return [];
    return tier.benefits.map(bId => config.benefits[bId]).filter(Boolean);
  },

  getAllBenefits: () => {
    const config = state.loyalty.get();
    return config?.benefits ? Object.values(config.benefits) : [];
  },

  calculatePointsEarned: (amountRSD) => {
    const config = state.loyalty.get();
    const rate = config?.points?.earnPerCurrency || 100;
    return Math.floor(amountRSD / rate);
  },

  calculatePointsValue: (points) => {
    const config = state.loyalty.get();
    const rate = config?.points?.redeemRate || 100;
    return Math.floor(points / rate);
  },

  canRedeemPoints: (points, orderTotal) => {
    const config = state.loyalty.get();
    const minRedeem = config?.points?.minRedeem || 500;
    const maxPercent = config?.points?.maxRedeemPercent || 30;
    const maxRedeemValue = Math.floor(orderTotal * maxPercent / 100);
    const pointsValue = Math.floor(points / (config?.points?.redeemRate || 100));
    return points >= minRedeem && pointsValue <= maxRedeemValue;
  },

  getMilestones: () => {
    const config = state.loyalty.get();
    return config?.progress?.milestones || [];
  },

  getProductLoyaltyFlags: (product) => {
    return product?.loyalty || {
      memberOnly: false,
      earlyAccess: false,
      limitedRelease: false,
      tierRequired: 'member',
      pointsMultiplier: 1
    };
  },

  isProductAccessible: (product, user) => {
    const flags = LoyaltyUtils.getProductLoyaltyFlags(product);
    if (!flags.memberOnly && !flags.earlyAccess && !flags.limitedRelease) return true;
    if (!user?.loyalty) return !flags.memberOnly && !flags.earlyAccess && !flags.limitedRelease;
    
    const userTier = user.loyalty.tier || 'member';
    const tierOrder = { member: 0, silver: 1, gold: 2, black: 3 };
    const requiredTier = flags.tierRequired || 'member';
    
    if (flags.memberOnly && tierOrder[userTier] < tierOrder.member) return false;
    if (flags.earlyAccess && tierOrder[userTier] < tierOrder[requiredTier]) return false;
    if (flags.limitedRelease && tierOrder[userTier] < tierOrder[requiredTier]) return false;
    
    return true;
  },

  getPointsMultiplier: (product, user) => {
    const flags = LoyaltyUtils.getProductLoyaltyFlags(product);
    let multiplier = flags.pointsMultiplier || 1;
    if (user?.loyalty) {
      const tierMultipliers = { member: 1, silver: 1.25, gold: 1.5, black: 2.0 };
      multiplier *= tierMultipliers[user.loyalty.tier] || 1;
    }
    return multiplier;
  }
};

window.LoyaltyUtils = LoyaltyUtils;

// INITIALIZATION
// ============================================================
const init = async () => {
  // Apply saved theme
  applyTheme(state.theme.get());

  // Update user UI
  updateUserUI(state.user.get());

  // Load loyalty config
  await loadLoyaltyConfig();

  // Load personalization config
  await loadPersonalizationConfig();

  // Load products
  await loadProducts();

  // Recalc cart
  recalcCart();

  // Init cookie consent
  initCookieConsent();

  // Init UI components
  if (window.initButtons) window.initButtons();
  if (window.initFormControls) window.initFormControls();
  if (window.initPasswordToggles) window.initPasswordToggles();
  if (window.initCharCounters) window.initCharCounters();
  // if (window.Navigation) window.Navigation.init(); // removed
  // if (window.Feedback) window.Feedback.init(); // removed
  // if (window.DataDisplay) window.DataDisplay.init(); // removed
  // if (window.AdminComponents) window.AdminComponents.init(); // removed
  // if (window.MarketingSocial) window.MarketingSocial.init(); // removed
  // if (window.UtilityLayout) window.UtilityLayout.initAll(); // removed
  // if (window.Analytics) window.Analytics.init(); // removed
  // if (window.SecurityCompliance) window.SecurityCompliance.init(); // removed
  // if (window.I18n) window.I18n.init(); // removed
  // if (window.SubscriptionManager) window.SubscriptionManager.init(); // removed
  // if (window.AdvancedPromotions) window.AdvancedPromotions.init(); // removed
  // if (window.AdvancedAnalytics) window.AdvancedAnalytics.init(); // removed
  // if (window.FeedbackLoop) window.FeedbackLoop.init(); // removed
  if (window.PersonalizationEngine) window.PersonalizationEngine.init();
  if (window.InternationalExpansion) window.InternationalExpansion.init();
  if (window.HeadlessCommerceAPI) window.HeadlessCommerceAPI.init();
  if (window.ViewTracking) window.ViewTracking.init();
  if (window.SizeMemory) window.SizeMemory.init();
  if (window.NotificationCenter) window.NotificationCenter.init();
  if (window.ReviewDisplay) {
    // Initialize on product pages
    const productPage = document.querySelector('[data-product-page][data-product-id]');
    if (productPage) {
      const productId = parseInt(productPage.dataset.productId);
      if (productId) window.ReviewDisplay.init(productId);
    }
  }
  if (window.Card) window.renderProductGrid && window.renderProductGrid('featuredProductsFavorites', state.products.get().filter(p => p.featured).slice(0, 8), { onAddToCart: addToCart, onWishlist: (id, card) => card.element.querySelector('[data-action="wishlist"]').classList.toggle('active') });

  // Smooth scroll for anchor links
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
      }
    });
  });

  // IntersectionObserver for scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  $$('.animate-fade-in, .animate-slide-up, .animate-scale-in').forEach(el => observer.observe(el));

  console.log('[DALLI] App initialized');

  // Web Vitals reporting (LCP, INP, CLS, FCP, TTFB)
  if ('PerformanceObserver' in window) {
    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.startTime;
        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric_name: 'LCP',
            metric_value: Math.round(lcp),
            metric_rating: lcp <= 1500 ? 'good' : lcp <= 2500 ? 'needs-improvement' : 'poor'
          });
        }
        console.log('[WebVitals] LCP:', Math.round(lcp), 'ms', lcp <= 1500 ? '✓' : '✗');
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    // INP (Interaction to Next Paint)
    try {
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        let maxInp = 0;
        entries.forEach(entry => {
          if (entry.processingStart && entry.startTime) {
            const inp = entry.processingStart - entry.startTime + entry.duration;
            maxInp = Math.max(maxInp, inp);
          }
        });
        if (maxInp > 0 && window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric_name: 'INP',
            metric_value: Math.round(maxInp),
            metric_rating: maxInp <= 100 ? 'good' : maxInp <= 300 ? 'needs-improvement' : 'poor'
          });
        }
        if (maxInp > 0) console.log('[WebVitals] INP:', Math.round(maxInp), 'ms', maxInp <= 100 ? '✓' : '✗');
      });
      inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch (e) {}

    // CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric_name: 'CLS',
            metric_value: Math.round(clsValue * 1000) / 1000,
            metric_rating: clsValue <= 0.03 ? 'good' : clsValue <= 0.1 ? 'needs-improvement' : 'poor'
          });
        }
        console.log('[WebVitals] CLS:', clsValue.toFixed(4), clsValue <= 0.03 ? '✓' : '✗');
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

    // FCP (First Contentful Paint)
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
        if (fcpEntry && window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric_name: 'FCP',
            metric_value: Math.round(fcpEntry.startTime),
            metric_rating: fcpEntry.startTime <= 1200 ? 'good' : fcpEntry.startTime <= 2500 ? 'needs-improvement' : 'poor'
          });
          console.log('[WebVitals] FCP:', Math.round(fcpEntry.startTime), 'ms', fcpEntry.startTime <= 1200 ? '✓' : '✗');
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {}

    // TTFB (Time to First Byte)
    try {
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric_name: 'TTFB',
            metric_value: Math.round(ttfb),
            metric_rating: ttfb <= 600 ? 'good' : ttfb <= 1500 ? 'needs-improvement' : 'poor'
          });
        }
        console.log('[WebVitals] TTFB:', Math.round(ttfb), 'ms', ttfb <= 600 ? '✓' : '✗');
      }
    } catch (e) {}
  }
};

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================
// HERO — Minimal: LCP Reporting Only
// ============================================================
const Hero = (() => {
  let lcpReported = false;

  const init = () => {
    const heroEl = $('#hero');
    if (!heroEl) return;

    // Performance: Report LCP (only useful metric for static hero)
reportLCP();
    reportINP();
    reportCLS();

    console.log('[Hero] Initialized — Static luxury image');
  };

  const reportLCP = () => {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.startTime;
        
        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric_name: 'LCP',
            metric_value: Math.round(lcp),
            metric_rating: lcp <= 1500 ? 'good' : lcp <= 2500 ? 'needs-improvement' : 'poor'
          });
        }
        
        console.log('[Hero] LCP:', Math.round(lcp), 'ms');
        observer.disconnect();
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      })
    } catch (e) {
      console.warn('[Hero] LCP observation failed:', e);
    }
  };

  const reportINP = () => {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        let maxInp = 0;
        for (const entry of entries) {
          const inp = entry.processingStart - entry.startTime;
          if (inp > maxInp) maxInp = inp;
        }
        
        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric_name: 'INP',
            metric_value: Math.round(maxInp),
            metric_rating: maxInp <= 100 ? 'good' : maxInp <= 200 ? 'needs-improvement' : 'poor'
          });
        }
        
        console.log('[Hero] INP:', Math.round(maxInp), 'ms');
      });
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('[Hero] INP observation failed:', e);
    }
  };

  const reportCLS = () => {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        
        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric_name: 'CLS',
            metric_value: Math.round(clsValue * 1000) / 1000,
            metric_rating: clsValue <= 0.03 ? 'good' : clsValue <= 0.1 ? 'needs-improvement' : 'poor'
          });
        }
        
        console.log('[Hero] CLS:', clsValue.toFixed(4));
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('[Hero] CLS observation failed:', e);
    }
  };

  return { init };
})();

// ============================================================
// TRUST BAR MODULE - Auto-scroll carousel, progress dots, analytics
// ============================================================
const TrustBar = (() => {
  let barEl = null;
  let viewportEl = null;
  let listEl = null;
  let items = [];
  let dots = [];
  let scrollHintEl = null;
  let autoScrollTimer = null;
  let autoScrollInterval = null;
  let isHovering = false;
  let isScrolling = false;
  let currentIndex = 0;
  let reducedMotion = false;
  let isMobile = false;
  let observer = null;
  let resizeHandler = null;

  const BENEFITS = [
    { id: 'free-shipping', label: 'Besplatna dostava >5.000 RSD' },
    { id: 'cash-on-delivery', label: 'Plaćanje pri preuzimanju' },
    { id: 'easy-returns', label: '30 dana za vraćanje' },
    { id: 'crypto-discount', label: '15% popust kripto' },
    { id: 'secure-shopping', label: 'Sigurna kupovina' }
  ];

  const AUTO_SCROLL_DELAY = 4000;
  const SCROLL_DURATION = 500;

  const init = () => {
    barEl = $('#trustBar');
    if (!barEl) return;

    viewportEl = $('#trustBarViewport');
    listEl = $('.trust-bar__list', barEl);
    items = $$('.trust-bar__item', listEl);
    dots = $$('.trust-bar__dot', barEl);
    scrollHintEl = $('#trustBarScrollHint');

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isMobile = window.innerWidth < 768;

    if (items.length === 0) return;

    // Setup scroll snap
    initScrollSnap();

    // Progress dots
    initProgressDots();

    // Auto-scroll carousel (mobile only)
    if (isMobile && !reducedMotion) {
      initAutoScroll();
    }

    // Scroll hint
    initScrollHint();

    // Keyboard navigation
    initKeyboardNav();

    // Analytics tracking
    initAnalytics();

    // Scroll reveal animation
    initScrollReveal();

    // Resize handler
    resizeHandler = debounce(handleResize, 150);
    window.addEventListener('resize', resizeHandler, { passive: true });

    // Reduced motion listener
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', (e) => {
      reducedMotion = e.matches;
      if (reducedMotion) {
        stopAutoScroll();
      } else if (isMobile) {
        startAutoScroll();
      }
    });

    console.log('[TrustBar] Initialized', { items: items.length, isMobile, reducedMotion });
  };

  const initScrollSnap = () => {
    if (!viewportEl) return;

    // Smooth scroll to item
    const scrollToItem = (index, behavior = 'smooth') => {
      if (index < 0 || index >= items.length) return;
      const item = items[index];
      const viewportRect = viewportEl.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const scrollLeft = viewportEl.scrollLeft + itemRect.left - viewportRect.left - (viewportRect.width - itemRect.width) / 2;
      
      viewportEl.scrollTo({ left: scrollLeft, behavior });
      updateProgressDots(index);
      currentIndex = index;
    };

    // Expose for dot clicks
    viewportEl.scrollToItem = scrollToItem;

    // Update dots on manual scroll
    let scrollTimeout;
    viewportEl.addEventListener('scroll', () => {
      if (isScrolling) return;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const centerX = viewportEl.scrollLeft + viewportEl.clientWidth / 2;
        let closestIndex = 0;
        let closestDist = Infinity;
        
        items.forEach((item, i) => {
          const itemCenter = item.offsetLeft + item.offsetWidth / 2;
          const dist = Math.abs(itemCenter - centerX);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = i;
          }
        });
        
        if (closestIndex !== currentIndex) {
          updateProgressDots(closestIndex);
          currentIndex = closestIndex;
        }
        
        // Hide scroll hint after user scrolls
        if (scrollHintEl) scrollHintEl.style.opacity = '0';
      }, 100);
    }, { passive: true });

    // Pause auto-scroll on hover/touch
    barEl.addEventListener('mouseenter', () => { isHovering = true; stopAutoScroll(); });
    barEl.addEventListener('mouseleave', () => { isHovering = false; if (isMobile && !reducedMotion) startAutoScroll(); });
    barEl.addEventListener('touchstart', () => { isHovering = true; stopAutoScroll(); }, { passive: true });
    barEl.addEventListener('touchend', () => { isHovering = false; if (isMobile && !reducedMotion) startAutoScroll(); }, { passive: true });
  };

  const initProgressDots = () => {
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        if (viewportEl.scrollToItem) {
          viewportEl.scrollToItem(index);
          trackInteraction('dot_click', index);
        }
      });
      
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dot.click();
        }
      });
    });

  };  // end

  const updateProgressDots = (index) => {
    dots.forEach((dot, i) => {
      const selected = i === index;
      dot.setAttribute('aria-selected', selected);
      dot.classList.toggle('active', selected);
    });

  };  // end

  const initAutoScroll = () => {
    if (reducedMotion || !isMobile) return;
    
    const startAutoScroll = () => {
      if (autoScrollTimer) clearTimeout(autoScrollTimer);
      if (autoScrollInterval) clearInterval(autoScrollInterval);
      
      autoScrollTimer = setTimeout(() => {
        autoScrollInterval = setInterval(() => {
          if (!isHovering && !isScrolling && document.visibilityState === 'visible') {
            const nextIndex = (currentIndex + 1) % items.length;
            if (viewportEl.scrollToItem) {
              viewportEl.scrollToItem(nextIndex);
              isScrolling = true;
              setTimeout(() => { isScrolling = false; }, SCROLL_DURATION);
            }
          }
        }, AUTO_SCROLL_DELAY);
      }, AUTO_SCROLL_DELAY);
    };

    const stopAutoScroll = () => {
      if (autoScrollTimer) clearTimeout(autoScrollTimer);
      if (autoScrollInterval) clearInterval(autoScrollInterval);
      autoScrollTimer = null;
      autoScrollInterval = null;
    };

    // Expose for external control
    barEl.startAutoScroll = startAutoScroll;
    barEl.stopAutoScroll = stopAutoScroll;

    // Start initially
    startAutoScroll();

    // Pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoScroll();
      else if (!isHovering) startAutoScroll();
    });

  };  // end

  const initScrollHint = () => {
    if (!scrollHintEl || !isMobile) return;
    
    // Show hint initially, hide after first scroll
    let hintShown = true;
    viewportEl.addEventListener('scroll', () => {
      if (hintShown && viewportEl.scrollLeft > 10) {
        scrollHintEl.style.opacity = '0';
        scrollHintEl.style.pointerEvents = 'none';
        hintShown = false;
      }
    }, { passive: true, once: true });
  };

  const initKeyboardNav = () => {
    listEl.addEventListener('keydown', (e) => {
      const focusedIndex = items.findIndex(item => item === document.activeElement || item.contains(document.activeElement));
      if (focusedIndex === -1) return;

      let nextIndex = focusedIndex;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (focusedIndex + 1) % items.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = (focusedIndex - 1 + items.length) % items.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = items.length - 1;
      }

      if (nextIndex !== focusedIndex && viewportEl.scrollToItem) {
        viewportEl.scrollToItem(nextIndex);
        items[nextIndex].focus();
      }
    });

  };  // end

  const initAnalytics = () => {
    items.forEach((item, index) => {
      const benefit = item.dataset.benefit || BENEFITS[index]?.id || `benefit-${index}`;
      
      // Click tracking
      item.addEventListener('click', () => trackInteraction('click', index, benefit));
      
      // Hover tracking (debounced)
      let hoverTimer;
      item.addEventListener('mouseenter', () => {
        hoverTimer = setTimeout(() => trackInteraction('hover', index, benefit), 500);
      });
      item.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
    });

  };  // end

  const trackInteraction = (type, index, benefit) => {
    const data = {
      event: `trust_bar_${type}`,
      benefit_id: benefit,
      benefit_index: index,
      benefit_label: BENEFITS[index]?.label || benefit,
      position: 'trust_bar',
      device: window.innerWidth < 768 ? 'mobile' : 'desktop'
    };

    // Push to data layer
    if (window.dataLayer) {
      window.dataLayer.push(data);
    }

    // GA4 via gtag
    if (window.gtag) {
      window.gtag('event', data.event, data);
    }

    console.log('[TrustBar] Track:', data);
  };

  const initScrollReveal = () => {
    if (reducedMotion) return;

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    items.forEach(item => {
      item.style.animationPlayState = 'paused';
      observer.observe(item);
    });

  };  // end

  const handleResize = () => {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < 768;

    // Mobile -> Desktop transition
    if (wasMobile && !isMobile) {
      stopAutoScroll();
      if (scrollHintEl) scrollHintEl.style.display = 'none';
    }
    // Desktop -> Mobile transition
    else if (!wasMobile && isMobile && !reducedMotion) {
      if (barEl.startAutoScroll) barEl.startAutoScroll();
      if (scrollHintEl) scrollHintEl.style.display = 'flex';
    }
  };

  const stopAutoScroll = () => {
    if (barEl.stopAutoScroll) barEl.stopAutoScroll();
  };

  const debounce = (fn, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  };

  const cleanup = () => {
    stopAutoScroll();
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (observer) observer.disconnect();
  };

  return { init, cleanup };
})();

// Initialize TrustBar on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TrustBar.init);
} else {
  TrustBar.init();
}

// Export
window.TrustBar = TrustBar;

// ============================================================
// CATEGORY WORLDS MODULE — Parallax, Animated Counters, Analytics
// Dynamic config from /data/categories.json
// ============================================================
const CategoryWorlds = (() => {
  let sectionEl = null;
  let cards = [];
  let counters = [];
  let reducedMotion = false;
  let parallaxEnabled = false;
  let countersAnimated = new Set();
  let observer = null;
  let scrollHandler = null;
  let resizeHandler = null;
  let config = null;
  let configLoaded = false;

  // Default settings (fallback if config fails to load)
  const DEFAULT_CONFIG = {
    parallaxSpeed: 0.25,
    counterDuration: 1200,
    viewThreshold: 0.5,
    staggerDelay: 100,
    hoverDwellTime: 300,
    categories: []
  };

  const init = async () => {
    sectionEl = $('#category-worlds');
    if (!sectionEl) return;

    // Load dynamic config first
    await loadConfig();

    cards = $$('.category-world', sectionEl);
    counters = $$('.category-world__count', sectionEl);
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    parallaxEnabled = !reducedMotion && window.innerWidth >= 768;

    if (cards.length === 0) return;

    // Sync HTML with config (for SSR/hydration consistency)
    syncWithConfig();

    // Init scroll parallax (desktop, no reduced motion)
    if (parallaxEnabled) {
      initParallax();
    }

    // Init animated counters
    initCounters();

    // Init staggered entrance (IntersectionObserver)
    initStaggeredReveal();

    // Init view tracking analytics
    initViewTracking();

    // Init click/hover analytics
    initInteractionTracking();

    // Keyboard focus management
    initKeyboardNav();

    // Resize handler
    resizeHandler = debounce(handleResize, 150);
    window.addEventListener('resize', resizeHandler, { passive: true });

    // Reduced motion listener
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', (e) => {
      reducedMotion = e.matches;
      if (reducedMotion) {
        disableParallax();
      } else if (window.innerWidth >= 768) {
        enableParallax();
      }
    });

    console.log('[CategoryWorlds] Initialized', { 
      cards: cards.length, 
      parallaxEnabled, 
      reducedMotion,
      configLoaded,
      configVersion: config?.version
    });

  };  // end

  const loadConfig = async () => {
    try {
      const response = await fetch('/data/categories.json', { 
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      config = await response.json();
      configLoaded = true;
      
      // Validate config structure
      if (!config.categories || !Array.isArray(config.categories)) {
        throw new Error('Invalid categories config');
      }
      
      console.log('[CategoryWorlds] Config loaded', { 
        version: config.version, 
        categories: config.categories.length 
      });
    } catch (error) {
      console.warn('[CategoryWorlds] Config load failed, using defaults:', error.message);
      config = DEFAULT_CONFIG;
      configLoaded = false;
    }
  };

  const syncWithConfig = () => {
    if (!configLoaded || !config.categories.length) return;

    // Map config categories by ID for quick lookup
    const configMap = new Map(config.categories.map(c => [c.id, c]));

    cards.forEach((card, index) => {
      const categoryId = card.dataset.category;
      const cfg = configMap.get(categoryId);
      
      if (!cfg) return;

      // Update counter target from config
      const counter = $('.category-world__count', card);
      if (counter && typeof cfg.count === 'number') {
        counter.dataset.target = cfg.count;
        counter.textContent = '0'; // Reset for animation
      }

      // Update badge from config
      const badge = $('.category-world__badge', card);
      if (badge && cfg.badge) {
        badge.className = `category-world__badge category-world__badge--${cfg.badge}`;
        badge.textContent = cfg.badge === 'new' ? 'Nova' : 
                           cfg.badge === 'hot' ? 'Hit' : 
                           cfg.badge === 'sale' ? 'Popust' : '';
        badge.setAttribute('aria-label', cfg.badgeLabel || '');
      } else if (badge && !cfg.badge) {
        badge.remove();
      }

      // Update link href from config
      const link = $('.category-world__link', card);
      if (link && cfg.slug) {
        link.href = `/${cfg.slug}`;
      }

      // Update order via CSS custom property (for grid ordering if needed)
      card.style.setProperty('--cat-order', cfg.order);
    });

  };  // end

  const getParallaxSpeed = () => configLoaded && config.settings?.parallaxSpeed 
    ? config.settings.parallaxSpeed 
    : DEFAULT_CONFIG.parallaxSpeed;

  const getCounterDuration = () => configLoaded && config.settings?.counterDuration 
    ? config.settings.counterDuration 
    : DEFAULT_CONFIG.counterDuration;

  const getViewThreshold = () => configLoaded && config.settings?.viewThreshold 
    ? config.settings.viewThreshold 
    : DEFAULT_CONFIG.viewThreshold;

  const getHoverDwellTime = () => configLoaded && config.settings?.hoverDwellTime 
    ? config.settings.hoverDwellTime 
    : DEFAULT_CONFIG.hoverDwellTime;

  // ... rest of the module uses getParallaxSpeed(), getCounterDuration(), etc.

  const initParallax = () => {
    if (!parallaxEnabled) return;

    let ticking = false;
    const updateParallax = () => {
      const sectionRect = sectionEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Section is in viewport vicinity
      if (sectionRect.bottom < 0 || sectionRect.top > viewportHeight) {
        ticking = false;
        return;
      }

      // Scroll progress through section (0 to 1)
      const sectionHeight = sectionRect.height;
      const scrollProgress = Math.max(0, Math.min(1, 
        (viewportHeight - sectionRect.top) / (sectionHeight + viewportHeight)
      ));

      cards.forEach((card, index) => {
        const media = $('.category-world__media img', card);
        const overlay = $('.category-world__overlay', card);
        if (!media) return;

        // Staggered parallax per card (subtle variation)
        const staggerOffset = index * 0.05;
        const cardProgress = Math.max(0, Math.min(1, scrollProgress + staggerOffset));
        const translateY = cardProgress * getParallaxSpeed() * 80; // px
        const overlayOpacity = Math.min(0.6, cardProgress * 0.8);

        // GPU-accelerated transforms
        media.style.transform = `translate3d(0, ${translateY}px, 0) scale(1)`;
        if (overlay) {
          overlay.style.opacity = overlayOpacity;
          overlay.classList.add('category-world__overlay--parallax');
        }
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    scrollHandler = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  const disableParallax = () => {
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
      scrollHandler = null;
    }
    cards.forEach(card => {
      const media = $('.category-world__media img', card);
      const overlay = $('.category-world__overlay', card);
      if (media) media.style.transform = '';
      if (overlay) { overlay.style.opacity = ''; overlay.classList.remove('category-world__overlay--parallax'); }
    });
    parallaxEnabled = false;
  };

  const enableParallax = () => {
    if (window.innerWidth >= 768) {
      initParallax();
      parallaxEnabled = true;
    }
  };

  const initCounters = () => {
    if (counters.length === 0) return;

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const counter = entry.target;
          const target = parseInt(counter.dataset.target || counter.textContent || '0', 10);
          const id = counter.id;
          
          if (!countersAnimated.has(id)) {
            countersAnimated.add(id);
            animateCounter(counter, target);
          }
          counterObserver.unobserve(counter);
        }
      });
    }, { threshold: 0.3, rootMargin: '0px 0px -50px 0px' });

    counters.forEach(counter => counterObserver.observe(counter));
  };

  const animateCounter = (el, target) => {
    if (reducedMotion) {
      el.textContent = formatNumber(target);
      return;
    }

    const start = 0;
    const duration = getCounterDuration();
    const startTime = performance.now();
    const easing = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easing(progress);
      const current = Math.floor(start + (target - start) * eased);
      el.textContent = formatNumber(current);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatNumber(target);
      }
    };

    requestAnimationFrame(tick);
  };

  const formatNumber = (num) => {
    try {
      return new Intl.NumberFormat('sr-RS').format(num);
    } catch {
      return String(num);
    }
  };

  const initStaggeredReveal = () => {
    if (reducedMotion) {
      cards.forEach(card => card.classList.add('category-world--revealed'));
      return;
    }

    // Cards already have animate-reveal class with CSS animation
    // This observer adds --revealed class for any post-animation cleanup
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('category-world--revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    cards.forEach(card => observer.observe(card));
  };

  const initViewTracking = () => {
    if (cards.length === 0) return;

    const viewObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const category = card.dataset.category;
          const badge = card.dataset.badge || 'none';
          
          trackEvent('category_world_view', {
            category,
            badge,
            position: Array.from(cards).indexOf(card) + 1
          });
          
          viewObserver.unobserve(card);
        }
      });
    }, { threshold: getViewThreshold() });

    cards.forEach(card => viewObserver.observe(card));
  };

  const initInteractionTracking = () => {
    cards.forEach((card, index) => {
      const link = $('.category-world__link', card);
      const category = card.dataset.category;
      const badge = card.dataset.badge || 'none';

      if (link) {
        link.addEventListener('click', (e) => {
          trackEvent('category_world_click', {
            category,
            badge,
            position: index + 1,
            href: link.href
          });
        });
      }

      // Hover dwell tracking
      let hoverTimer;
      let hoverStart = 0;
      card.addEventListener('mouseenter', () => {
        hoverStart = performance.now();
        hoverTimer = setTimeout(() => {
          trackEvent('category_world_hover', {
            category,
            badge,
            position: index + 1,
            dwell: Math.round(performance.now() - hoverStart)
          });
        }, getHoverDwellTime());
      });
      card.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
      });

      // Focus tracking (keyboard nav)
      card.addEventListener('focusin', () => {
        trackEvent('category_world_focus', { category, badge, position: index + 1 });
      });
    });

  };  // end

  const initKeyboardNav = () => {
    // Roving tabindex for grid navigation
    cards.forEach((card, index) => {
      card.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    sectionEl.addEventListener('keydown', (e) => {
      const focusedCard = sectionEl.querySelector('.category-world:focus-within, .category-world:focus');
      if (!focusedCard) return;

      const currentIndex = Array.from(cards).indexOf(focusedCard);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      const cols = getGridColumns();

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = Math.min(currentIndex + 1, cards.length - 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = Math.min(currentIndex + cols, cards.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = Math.max(currentIndex - cols, 0);
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = cards.length - 1;
          break;
      }

      if (nextIndex !== currentIndex) {
        cards[nextIndex].focus();
        updateRovingTabindex(nextIndex);
      }
    });

  };  // end

  const getGridColumns = () => {
    const width = window.innerWidth;
    if (width >= 1024) return 4;
    if (width >= 768) return 2;
    if (width >= 480) return 2;
    return 1;
  };

  const updateRovingTabindex = (activeIndex) => {
    cards.forEach((card, index) => {
      card.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
    });

  };  // end

  const trackEvent = (eventName, data) => {
    const payload = {
      event: eventName,
      section: 'category_worlds',
      timestamp: Date.now(),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      ...data
    };

    if (window.dataLayer) window.dataLayer.push(payload);
    if (window.gtag) window.gtag('event', eventName, payload);
    
    console.log('[CategoryWorlds] Track:', payload);
  };

  const handleResize = () => {
    const wasParallax = parallaxEnabled;
    parallaxEnabled = !reducedMotion && window.innerWidth >= 768;

    if (wasParallax && !parallaxEnabled) {
      disableParallax();
    } else if (!wasParallax && parallaxEnabled) {
      enableParallax();
    }
  };

  const debounce = (fn, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  };

  const cleanup = () => {
    disableParallax();
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (observer) observer.disconnect();
  };

  return { init, cleanup };
})();

// Initialize CategoryWorlds on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', CategoryWorlds.init);
} else {
  CategoryWorlds.init();
}

// Export
window.CategoryWorlds = CategoryWorlds;

// ============================================================
// INSTAGRAM OEMBED - Native Instagram post embedding
// Uses Instagram oEmbed API to fetch and render native posts
// ============================================================
const InstagramEmbed = (() => {
  const OEEMBED_ENDPOINT = 'https://graph.facebook.com/v18.0/instagram_oembed';
  const cache = new Map();
  const pending = new Map();

  const fetchOEmbed = async (url) => {
    if (cache.has(url)) return cache.get(url);

    if (pending.has(url)) {
      return pending.get(url);
    }

    const promise = (async () => {
      try {
        const params = new URLSearchParams({
          url: url,
          maxwidth: 658,
          hidecaption: 'false',
          access_token: CONFIG_INSTAGRAM?.accessToken || ''
        });
        const response = await fetch(`${OEEMBED_ENDPOINT}?${params}`, {
          credentials: 'omit',
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error(`oEmbed failed: ${response.status}`);
        const data = await response.json();
        cache.set(url, data);
        return data;
      } catch (e) {
        console.warn('[InstagramEmbed] oEmbed failed:', e);
        return null;
      } finally {
        pending.delete(url);
      }
    })();

    pending.set(url, promise);
    return promise;
  };

  const extractShortCode = (url) => {
    const match = url.match(/(?:instagram\.com\/p\/|instagram\.com\/reel\/)([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const renderEmbed = async (container, url) => {
    if (!container) return;
    
    container.innerHTML = `
      <div class="instagram-embed-loading" style="padding: 20px; text-align: center; color: #666;">
        <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 8px; animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/>
        </svg>
        <p style="font-size: 14px;">Učitavanje Instagram posta...</p>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        .instagram-embed-loading .spinner { border: 2px solid #e0e0e0; border-top-color: #E1306C; border-radius: 50%; animation: spin 1s linear infinite; }
      </style>
    `;

    const data = await fetchOEmbed(url);
    
    if (!data || !data.html) {
      container.innerHTML = `
        <div class="instagram-embed-error" style="padding: 20px; text-align: center; color: #e00; background: #fee; border-radius: 8px; border: 1px solid #fcc;">
          <p>Ne mogu da učitam Instagram post.</p>
          <a href="${url}" target="_blank" rel="noopener" style="color: #E1306C; text-decoration: underline;">Otvori na Instagramu</a>
        </div>
      `;
      return;
    }

    container.innerHTML = data.html;
    
    // Instagram embed script initialization
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    } else {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      script.onload = () => window.instgrm?.Embeds?.process();
      document.head.appendChild(script);
    }
  };

  const autoEmbed = async (selector = '[data-instagram-url]') => {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const url = el.dataset.instagramUrl;
      if (url && !el.dataset.embedded) {
        el.dataset.embedded = 'true';
        await renderEmbed(el, url);
      }
    }
  };

  const setAccessToken = (token) => {
    CONFIG_INSTAGRAM = { ...CONFIG_INSTAGRAM, accessToken: token };
  };

  let CONFIG_INSTAGRAM = { accessToken: null };

  return { fetchOEmbed, renderEmbed, autoEmbed, setAccessToken, extractShortCode };
})();

// Auto-initialize Instagram embeds on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => InstagramEmbed.autoEmbed());
} else {
  InstagramEmbed.autoEmbed();
}

window.InstagramEmbed = InstagramEmbed;

