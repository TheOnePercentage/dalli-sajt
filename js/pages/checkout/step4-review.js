import { $, $$, show, hide, on, formatPrice } from '../../core/dom.js';
import { cartSignal, subscribeToCart, getCartTotals } from '../../state/cart.js';
import { userSignal } from '../../state/user.js';
import { trackEvent } from '../../features/analytics.js';

let form = null;
let placeOrderBtn = null;
let currentStep = 4;

const getFormData = () => {
  if (!form) return {};
  const data = new FormData(form);
  const obj = {};
  data.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};

const setFormData = (data) => {
  if (!form) return;
  Object.entries(data).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) {
      if (field.type === 'checkbox') {
        field.checked = !!value;
      } else {
        field.value = value;
      }
    }
  });
};

const renderReview = (orderData) => {
  // Customer info
  const reviewCustomer = $('#reviewCustomer');
  if (reviewCustomer && orderData.firstName && orderData.lastName) {
    reviewCustomer.innerHTML = `
      <div class="review-item"><span class="review-label">Ime i prezime:</span> <span class="review-value">${orderData.firstName} ${orderData.lastName}</span></div>
      <div class="review-item"><span class="review-label">Email:</span> <span class="review-value">${orderData.email}</span></div>
      <div class="review-item"><span class="review-label">Telefon:</span> <span class="review-value">${orderData.phone}</span></div>
    `;
  }

  // Shipping address
  const reviewShipping = $('#reviewShipping');
  if (reviewShipping && orderData.address) {
    reviewShipping.innerHTML = `
      <div class="review-item review-item--full"><span class="review-label">Adresa:</span> <span class="review-value">${orderData.address}, ${orderData.postalCode} ${orderData.city}, ${orderData.country}${orderData.deliveryInstructions ? ', ' + orderData.deliveryInstructions : ''}</span></div>
    `;
  }

  // Payment method
  const reviewPayment = $('#reviewPayment');
  const methodLabels = {
    'cod': 'Plaćanje pri preuzimanju',
    'bank-transfer': 'Bankovni prenos',
    'card': 'Kreditna / Debitna kartica',
    'crypto': 'Kripto plaćanje (15% popust)'
  };
  if (reviewPayment && orderData.paymentMethod) {
    reviewPayment.innerHTML = `
      <div class="review-item"><span class="review-label">Metod:</span> <span class="review-value">${methodLabels[orderData.paymentMethod] || orderData.paymentMethod}</span></div>
    `;
  }

  // Order items
  const reviewItems = $('#reviewItems');
  if (reviewItems) {
    const cart = cartSignal.get();
    if (cart.length > 0) {
      reviewItems.innerHTML = cart.map(item => `
        <div class="review-item review-item--product">
          <div class="review-item__info">
            <span class="review-item__name">${item.name}</span>
            <div class="review-item__meta">
              ${item.color ? `<span>${item.color}</span>` : ''}
              ${item.size ? `<span>${item.size}</span>` : ''}
              <span>x${item.qty}</span>
            </div>
          </div>
          <span class="review-item__price">${formatPrice(item.price * item.qty)}</span>
        </div>
      `).join('');
    }
  }
};

const validateStep = () => {
  const termsAccepted = form?.querySelector('[name="termsAccepted"]');
  if (termsAccepted && !termsAccepted.checked) {
    termsAccepted.classList.add('is-invalid');
    trackEvent('checkout_terms_not_accepted');
    return false;
  }
  if (termsAccepted) termsAccepted.classList.remove('is-invalid');
  return true;
};

const bindEvents = () => {
  if (!form) return;

  // Terms checkbox validation
  const termsCheckbox = form.querySelector('[name="termsAccepted"]');
  if (termsCheckbox) {
    on(termsCheckbox, 'change', () => {
      if (termsCheckbox.checked) {
        termsCheckbox.classList.remove('is-invalid');
      }
    });
  }

  // Re-render on cart changes
  subscribeToCart(() => {
    const data = getFormData();
    renderReview(data);
  });

  if (placeOrderBtn) {
    on(placeOrderBtn, 'click', (e) => {
      e.preventDefault();
      if (!validateStep()) {
        trackEvent('checkout_validation_error', { step: 4 });
        return;
      }
      
      const data = getFormData();
      trackEvent('checkout_submit', { step: 4, ...data });
      window.dispatchEvent(new CustomEvent('checkout:step:complete', { detail: { step: 4, data } }));
    });
  }
};

const init = (stepEl) => {
  form = stepEl.querySelector('form') || stepEl.closest('form');
  if (!form) return { init: () => {}, validate: () => false, getData: () => ({}) };

  placeOrderBtn = $('#placeOrderBtn');

  bindEvents();

  return {
    validate: validateStep,
    getData: getFormData,
    setData: setFormData,
    renderReview: (data) => renderReview(data),
    setStep: (step) => { currentStep = step; }
  };
};

if (typeof window !== 'undefined') {
  window.DALLI_CheckoutStep4 = { init };
}

export { init, validateStep, getFormData as getStep4Data, renderReview };