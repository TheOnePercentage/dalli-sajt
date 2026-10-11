import { $, $$, show, hide, formatPrice, on, delegate } from '../../core/dom.js';
import { cartSignal, subscribeToCart, getCartTotals } from '../../state/cart.js';
import { userSignal, subscribeToUser } from '../../state/user.js';
import { trackEvent } from '../../features/analytics.js';
import { init as initStep1 } from './step1-customer.js';
import { init as initStep2 } from './step2-shipping.js';
import { init as initStep3 } from './step3-payment.js';
import { init as initStep4 } from './step4-review.js';
import { init as initProgress } from './progress.js';
import { init as initSummary } from './summary.js';

let currentStep = 1;
let stepControllers = {};
let isInitialized = false;
let orderData = {};

const STEPS = [
  { id: 1, name: 'customer', selector: '.checkout-step[data-step="1"]', title: 'Podaci' },
  { id: 2, name: 'shipping', selector: '.checkout-step[data-step="2"]', title: 'Dostava' },
  { id: 3, name: 'payment', selector: '.checkout-step[data-step="3"]', title: 'Plaćanje' },
  { id: 4, name: 'review', selector: '.checkout-step[data-step="4"]', title: 'Pregled' }
];

const getStepEl = (step) => $(STEPS.find(s => s.id === step)?.selector);

const showStep = (step) => {
  STEPS.forEach(s => {
    const el = getStepEl(s.id);
    const progressEl = $$(`.checkout-progress__step[data-step="${s.id}"]`)[0];
    if (el) el.classList.toggle('active', s.id === step);
    if (progressEl) progressEl.classList.toggle('active', s.id === step);
  });
  currentStep = step;
  window.dispatchEvent(new CustomEvent('checkout:step:change', { detail: { step } }));
};

const validateCurrentStep = () => {
  const controller = stepControllers[currentStep];
  if (controller?.validate) {
    return controller.validate();
  }
  return true;
};

const collectOrderData = () => {
  const data = { ...orderData };
  STEPS.forEach(s => {
    if (stepControllers[s.id]?.getData) {
      Object.assign(data, stepControllers[s.id].getData());
    }
  });
  return data;
};

const handleNext = async () => {
  if (!validateCurrentStep()) return;

  const data = collectOrderData();
  orderData = data;

  if (currentStep < STEPS.length) {
    showStep(currentStep + 1);
  } else {
    await submitOrder(data);
  }
};

const handlePrev = () => {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
};

const submitOrder = async (data) => {
  const placeOrderBtn = $('#placeOrderBtn');
  if (!placeOrderBtn) return;

  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = 'Obrada...';

  try {
    const cart = cartSignal.get();
    const user = userSignal.get();
    const totals = getCartTotals(user?.cryptoWallet);

    const orderPayload = {
      userId: user?.id || user?.email || null,
      customer: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        marketingConsent: data.marketingConsent || false
      },
      shipping: {
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        instructions: data.deliveryInstructions
      },
      payment: {
        method: data.paymentMethod,
        ...(data.paymentMethod === 'card' && {
          cardNumber: data.cardNumber,
          cardExpiry: data.cardExpiry,
          cardCvc: data.cardCvc,
          cardName: data.cardName
        }),
        ...(data.paymentMethod === 'crypto' && {
          currency: data.cryptoCurrency,
          amountRSD: data.cryptoAmountRSD,
          amountCrypto: data.cryptoAmountCrypto,
          walletAddress: data.cryptoWalletAddress
        })
      },
      items: cart.map(item => ({
        productId: item.id,
        variantId: item.variantId,
        name: item.name,
        color: item.color,
        size: item.size,
        price: item.price,
        qty: item.qty
      })),
      totals: {
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        discount: totals.cryptoDiscount,
        total: totals.total
      }
    };

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) throw new Error('Greška prilikom slanja porudžbine');

    const result = await response.json();
    
    trackEvent('purchase', {
      transaction_id: result.orderNumber,
      value: totals.total,
      currency: 'RSD',
      items: orderPayload.items.map(i => ({
        item_id: i.variantId,
        item_name: i.name,
        price: i.price,
        quantity: i.qty
      }))
    });

    cartSignal.set([]);
    window.showToast?.('Porudžbina je uspešno poslata!', 'success');
    window.location.href = `/porudzbina-uspesna.html?order=${result.orderNumber}`;

  } catch (err) {
    console.error('Order submit error:', err);
    window.showToast?.(err.message || 'Greška prilikom slanja porudžbine. Pokušajte ponovo.', 'error');
  } finally {
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = 'Potvrdite porudžbinu';
  }
};

const bindGlobalEvents = () => {
  document.addEventListener('checkout:step:complete', (e) => {
    orderData = { ...orderData, ...e.detail.data };
    handleNext();
  });

  document.addEventListener('checkout:step:prev', (e) => {
    handlePrev();
  });

  document.addEventListener('checkout:step:change', (e) => {
    initSummary(); // Re-render summary with updated data
  });
};

export const initCheckoutPage = () => {
  if (isInitialized) return;

  // Check if we're on checkout page
  if (!$('#checkoutForm')) return;

  // Initialize all steps
  STEPS.forEach(step => {
    const stepEl = getStepEl(step.id);
    if (stepEl) {
      let controller = null;
      switch (step.name) {
        case 'customer': controller = initStep1(stepEl); break;
        case 'shipping': controller = initStep2(stepEl); break;
        case 'payment': controller = initStep3(stepEl); break;
        case 'review': controller = initStep4(stepEl); break;
      }
      if (controller) stepControllers[step.id] = controller;
    }
  });

  // Initialize progress and summary
  initProgress();
  initSummary();

  // Bind global events
  bindGlobalEvents();

  // Initialize with step 1
  showStep(1);

  isInitialized = true;
  console.log('[Checkout] Initialized');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckoutPage);
} else {
  initCheckoutPage();
}

export { initCheckoutPage as init, showStep };
export const getStep = () => currentStep;

if (typeof window !== 'undefined') {
  window.DALLI_Checkout = { initCheckoutPage, showStep };
}