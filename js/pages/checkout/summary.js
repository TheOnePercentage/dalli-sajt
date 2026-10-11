import { $, $$, formatPrice, show, hide } from '../../core/dom.js';
import { cartSignal, subscribeToCart, getCartTotals } from '../../state/cart.js';
import { userSignal } from '../../state/user.js';

let isInitialized = false;

const init = () => {
  if (isInitialized) return;
  if (!$('#summaryItems')) return;

  subscribeToCart(renderSummary);
  subscribeToCart(renderSidebarSummary);
  renderSummary();
  renderSidebarSummary();

  isInitialized = true;
};

const renderSummary = () => {
  const summaryItems = $('#summaryItems');
  if (!summaryItems) return;

  const cart = cartSignal.get();
  if (cart.length === 0) {
    summaryItems.innerHTML = '';
    return;
  }

  summaryItems.innerHTML = cart.map(item => `
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

const renderSidebarSummary = () => {
  const cart = cartSignal.get();
  const user = userSignal.get();
  const { subtotal, shipping, cryptoDiscount, total, itemCount, freeShippingRemaining } = getCartTotals(user?.cryptoWallet);

  // Page summary
  const itemCountEl = $('#summaryItemCount');
  const subtotalEl = $('#summarySubtotal');
  const shippingEl = $('#summaryShipping');
  const discountRow = $('#summaryDiscountRow');
  const discountEl = $('#summaryDiscount');
  const totalEl = $('#summaryTotal');

  if (itemCountEl) itemCountEl.textContent = itemCount;
  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Besplatno' : formatPrice(shipping);
  
  if (discountRow && discountEl) {
    const showDiscount = cryptoDiscount > 0;
    discountRow.classList.toggle('hidden', !showDiscount);
    discountEl.textContent = `-${formatPrice(cryptoDiscount)}`;
  }
  if (totalEl) totalEl.textContent = formatPrice(total);

  // Sidebar summary (cart drawer)
  const sidebarItemCount = $('#cartDrawerCount');
  const sidebarSubtotal = $('#cartSubtotal');
  const sidebarShipping = $('#cartShipping');
  const sidebarCryptoDiscount = $('#cartCryptoDiscount');
  const sidebarCryptoAmount = $('#cartCryptoAmount');
  const sidebarTotal = $('#cartTotal');
  const sidebarFreeShipping = $('#cartFreeShippingRemaining');
  const sidebarCheckoutCryptoBtn = $('#checkoutCryptoBtn');

  if (sidebarItemCount) sidebarItemCount.textContent = itemCount;
  if (sidebarSubtotal) sidebarSubtotal.textContent = formatPrice(subtotal);
  if (sidebarShipping) sidebarShipping.textContent = shipping === 0 ? 'Besplatno' : formatPrice(shipping);
  if (sidebarTotal) sidebarTotal.textContent = formatPrice(total);

  if (sidebarCryptoDiscount && sidebarCryptoAmount) {
    const showSidebarCrypto = cryptoDiscount > 0;
    sidebarCryptoDiscount.style.display = showSidebarCrypto ? 'flex' : 'none';
    sidebarCryptoAmount.textContent = `-${formatPrice(cryptoDiscount)}`;
  }
  if (sidebarCheckoutCryptoBtn) sidebarCheckoutCryptoBtn.style.display = user?.cryptoWallet ? 'block' : 'none';

  // Free shipping note
  const freeShippingNote = $('#cartFreeShippingNote');
  const sidebarFreeShippingRemaining = $('#cartFreeShippingRemaining');
  if (freeShippingNote && sidebarFreeShippingRemaining) {
    if (freeShippingRemaining > 0) {
      show(freeShippingNote);
      sidebarFreeShippingRemaining.textContent = formatPrice(freeShippingRemaining);
    } else {
      hide(freeShippingNote);
    }
  }
};

if (typeof window !== 'undefined') {
  window.DALLI_CheckoutSummary = { init, renderSummary, renderSidebarSummary };
}

export { init, renderSummary, renderSidebarSummary };