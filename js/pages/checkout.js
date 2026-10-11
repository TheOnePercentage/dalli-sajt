import {
  getCryptoDiscountRate,
  getCryptoDiscountRateSync,
  getCryptoDiscountMessage,
} from '../../services/payment-incentives.js';
import { cartSignal, subscribeToCart, getCartTotals, clearCart } from '../state/cart.js';
import { userSignal, subscribeToUser, getUser, getUserDiscount } from '../state/user.js';
import { $, $$, show, hide, formatPrice, on, delegate } from '../core/dom.js';
import { trackEvent } from '../features/analytics.js';
import { CryptoPayment, CryptoAmountCalculator, initQRCodeModal } from '../../components/CryptoPayment.js';

let isInitialized = false;
let promoApplied = false;
let promoDiscount = { type: 'percent', value: 0, description: '' };
let shippingCost = 0;
let selectedShippingMethod = 'standard';

const PROMO_CODES = {
  'WELCOME10': { type: 'percent', value: 10, description: 'Dobrodošli popust 10%' },
  'SAVE20': { type: 'percent', value: 20, description: 'Sezonski popust 20%' },
  'FREESHIP': { type: 'shipping', value: 0, description: 'Besplatna dostava' },
  'SAVE15': { type: 'percent', value: 15, description: 'Popust 15%' },
  'VIP25': { type: 'percent', value: 25, description: 'VIP popust 25%' }
};

const SHIPPING_METHODS = [
  { id: 'standard', name: 'Standardna dostava', price: 290, freeThreshold: 5000, days: '2-4 radna dana', description: 'Standardna pošta' },
  { id: 'express', name: 'Brza dostava', price: 490, freeThreshold: 10000, days: '1-2 radna dana', description: 'Brza pošta' },
  { id: 'pickup', name: 'Preuzimanje u prodavnici', price: 0, freeThreshold: 0, days: 'Istog dana', description: 'Preuzimanje u našoj prodavnici' }
];

const initElements = () => {
  return {
    checkoutForm: $('#checkoutForm'),
    promoCode: $('#promoCode'),
    applyPromo: $('#applyPromo'),
    promoDiscountRow: $('#summaryDiscountRow'),
    promoDiscountAmount: $('#summaryDiscount'),
    shippingMethod: $('input[name="shippingMethod"]'),
    shippingCost: $('#summaryShipping'),
    summarySubtotal: $('#summarySubtotal'),
    summaryShipping: $('#summaryShipping'),
    summaryDiscountRow: $('#summaryDiscountRow'),
    summaryDiscount: $('#summaryDiscount'),
    summaryTotal: $('#summaryTotal'),
    summaryItemCount: $('#summaryItemCount'),
    summaryItems: $('#summaryItems'),
    reviewItems: $('#reviewItems'),
    reviewCustomer: $('#reviewCustomer'),
    reviewShipping: $('#reviewShipping'),
    reviewPayment: $('#reviewPayment'),
    summarySubtotal: $('#summarySubtotal'),
    summaryShipping: $('#summaryShipping'),
    summaryDiscountRow: $('#summaryDiscountRow'),
    summaryDiscount: $('#summaryDiscount'),
    summaryTotal: $('#summaryTotal'),
    summaryItemCount: $('#summaryItemCount'),
    checkoutBtnSidebar: $('#checkoutBtnSidebar'),
    checkoutCryptoBtn: $('#checkoutCryptoBtn'),
    paymentMethodRadios: $$('input[name="paymentMethod"]'),
    cardFields: $('#cardFields'),
    cryptoFields: $('#cryptoFields'),
    cryptoCurrency: $('#cryptoCurrency'),
    cryptoAmountRSD: $('#cryptoAmountRSD'),
    cryptoAmountCrypto: $('#cryptoAmountCrypto'),
    cryptoCurrencyLabel: $('#cryptoCurrencyLabel'),
    cryptoPaymentDetails: $('#cryptoPaymentDetails'),
    cryptoWalletAddress: $('#cryptoWalletAddress'),
    cryptoQRCode: $('#cryptoQRCode'),
    summaryDiscountRow: $('#summaryDiscountRow'),
    summaryDiscount: $('#summaryDiscount'),
    summaryTotal: $('#summaryTotal'),
    summarySubtotal: $('#summarySubtotal'),
    summaryShipping: $('#summaryShipping'),
    summaryItemCount: $('#summaryItemCount'),
    reviewPayment: $('#reviewPayment'),
    reviewCustomer: $('#reviewCustomer'),
    reviewShipping: $('#reviewShipping'),
    reviewItems: $('#reviewItems'),
    // Checkout mode elements
    checkoutModeRadios: $$('input[name="checkoutMode"]'),
    passwordFields: $('#passwordFields'),
    password: $('#password'),
    confirmPassword: $('#confirmPassword'),
    createAccountCheckbox: $('#createAccount')
  };
};

const getShippingCost = (methodId, subtotal) => {
  const method = SHIPPING_METHODS.find(m => m.id === methodId);
  if (!method) return { price: 0, free: false };
  const free = subtotal >= method.freeThreshold;
  return { price: free ? 0 : method.price, free, method };
};

const getPromoCode = (code) => {
  const normalized = code.trim().toUpperCase();
  return PROMO_CODES[normalized] || null;
};

const calculateTotals = (cart, user, shippingMethodId, promoCode) => {
  const { subtotal } = getCartTotals(user?.cryptoWallet);
  
  const shippingInfo = getShippingCost(selectedShippingMethod, subtotal);
  shippingCost = shippingInfo.price;
  
  let promoDiscountValue = 0;
  let promoDescription = '';
  
  if (promoApplied && promoDiscount) {
    if (promoDiscount.type === 'percent') {
      promoDiscountValue = subtotal * (promoDiscount.value / 100);
      promoDescription = promoDiscount.description;
    } else if (promoDiscount.type === 'shipping') {
      promoDiscountValue = shippingCost;
      promoDescription = promoDiscount.description;
    }
  }
  
  // Loyalty discount
  const loyaltyDiscountPercent = getUserDiscount();
  const loyaltyDiscountValue = subtotal * (loyaltyDiscountPercent / 100);
  
  // Crypto discount
  const cryptoDiscountValue = user?.cryptoWallet ? subtotal * getCryptoDiscountRateSync() : 0;
  
  const totalDiscount = promoDiscountValue + loyaltyDiscountValue + cryptoDiscountValue;
  const total = subtotal + shippingCost - totalDiscount;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const freeShippingRemaining = Math.max(0, 5000 - subtotal);
  
  return {
    subtotal,
    shipping: shippingCost,
    shippingFree: shippingInfo.free,
    promoDiscount: promoDiscountValue,
    promoDescription,
    loyaltyDiscount: loyaltyDiscountValue,
    loyaltyDiscountPercent,
    cryptoDiscount: cryptoDiscountValue,
    totalDiscount: totalDiscount,
    total: Math.max(0, total),
    itemCount,
    freeShippingRemaining,
    shippingMethod: selectedShippingMethod,
    shippingMethodInfo: shippingInfo.method
  };
};

const renderSummaryItems = (cart) => {
  const els = initElements();
  if (!els.summaryItems || !els.reviewItems) return;

  if (cart.length === 0) {
    if (els.summaryItems) els.summaryItems.innerHTML = '';
    if (els.reviewItems) els.reviewItems.innerHTML = '';
    return;
  }

  const html = cart.map(item => `
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

  if (els.summaryItems) els.summaryItems.innerHTML = html;
  if (els.reviewItems) els.reviewItems.innerHTML = html;
};

const renderReviewData = (orderData) => {
  const els = initElements();
  
  // Customer info
  if (els.reviewCustomer && orderData.customer) {
    els.reviewCustomer.innerHTML = `
      <div class="review-item"><span class="review-label">Ime i prezime:</span> <span class="review-value">${orderData.customer.firstName} ${orderData.customer.lastName}</span></div>
      <div class="review-item"><span class="review-label">Email:</span> <span class="review-value">${orderData.customer.email}</span></div>
      <div class="review-item"><span class="review-label">Telefon:</span> <span class="review-value">${orderData.customer.phone}</span></div>
    `;
  }

  // Shipping address
  if (els.reviewShipping && orderData.shipping) {
    els.reviewShipping.innerHTML = `
      <div class="review-item review-item--full"><span class="review-label">Adresa:</span> <span class="review-value">${orderData.shipping.address}, ${orderData.shipping.postalCode} ${orderData.shipping.city}, ${orderData.shipping.country}${orderData.shipping.instructions ? ', ' + orderData.shipping.instructions : ''}</span></div>
    `;
  }

  // Payment method
  if (els.reviewPayment && orderData.payment) {
    const methodLabels = {
      'cod': 'Plaćanje pri preuzimanju',
      'bank-transfer': 'Bankovni prenos',
      'card': 'Kreditna / Debitna kartica',
      'crypto': `Kripto plaćanje (${Math.round(getCryptoDiscountRateSync() * 100)}% popust)`
    };
    if (els.reviewPayment) {
      els.reviewPayment.innerHTML = `
        <div class="review-item"><span class="review-label">Metod:</span> <span class="review-value">${methodLabels[orderData.payment.method] || orderData.payment.method}</span></div>
      `;
    }
  }
};

const updateTotals = (cart, user, shippingMethodId, promoCode) => {
  const totals = calculateTotals(cart, user, selectedShippingMethod, promoApplied ? promoDiscount : null);
  
  const els = initElements();
  
  // Update shipping method selection
  if (els.shippingMethod) {
    els.shippingMethod.forEach(radio => {
      radio.checked = radio.value === selectedShippingMethod;
    });
  }

  // Page summary
  if (els.summaryItemCount) els.summaryItemCount.textContent = totals.itemCount;
  if (els.summarySubtotal) els.summarySubtotal.textContent = formatPrice(totals.subtotal);
  if (els.summaryShipping) els.summaryShipping.textContent = totals.shippingFree ? 'Besplatno' : formatPrice(totals.shipping);
  
  // Discounts
  const totalPromoDiscount = totals.promoDiscount + totals.loyaltyDiscount + totals.cryptoDiscount;
  const showDiscount = totalPromoDiscount > 0;
  
  if (els.summaryDiscountRow) els.summaryDiscountRow.classList.toggle('hidden', !showDiscount);
  if (els.summaryDiscount) {
    let discountText = '';
    const discounts = [];
    if (totals.promoDiscount > 0) discounts.push(`Promo: ${formatPrice(totals.promoDiscount)}`);
    if (totals.loyaltyDiscount > 0) discounts.push(`Lojalnost (${totals.loyaltyDiscountPercent}%): ${formatPrice(totals.loyaltyDiscount)}`);
    if (totals.cryptoDiscount > 0) discounts.push(`Kripto (${Math.round(getCryptoDiscountRateSync() * 100)}%): ${formatPrice(totals.cryptoDiscount)}`);
    if (els.summaryDiscount) els.summaryDiscount.textContent = `-${discounts.join(', ')}`;
  }
  
  if (els.summaryTotal) els.summaryTotal.textContent = formatPrice(totals.total);
  if (els.summaryItemCount) els.summaryItemCount.textContent = totals.itemCount;

  // Sidebar summary
  const sidebarSubtotal = $('#summarySubtotal');
  const sidebarShipping = $('#summaryShipping');
  const sidebarDiscountRow = $('#summaryDiscountRow');
  const sidebarDiscount = $('#summaryDiscount');
  const sidebarTotal = $('#summaryTotal');
  const sidebarItemCount = $('#summaryItemCount');
  const sidebarCheckoutCryptoBtn = $('#checkoutCryptoBtn');
  const sidebarFreeShipping = $('#cartFreeShippingRemaining');
  const sidebarFreeShippingNote = $('#cartFreeShippingNote');

  if (sidebarSubtotal) sidebarSubtotal.textContent = formatPrice(totals.subtotal);
  if (sidebarShipping) sidebarShipping.textContent = totals.shippingFree ? 'Besplatno' : formatPrice(totals.shipping);
  if (sidebarTotal) sidebarTotal.textContent = formatPrice(totals.total);
  if (sidebarItemCount) sidebarItemCount.textContent = totals.itemCount;

  // Crypto discount in sidebar
  const totalCryptoDiscount = totals.cryptoDiscount + totals.loyaltyDiscount + totals.promoDiscount;
  if (sidebarDiscountRow && sidebarDiscount) {
    const showSidebarDiscount = totalCryptoDiscount > 0;
    sidebarDiscountRow.classList.toggle('hidden', !showSidebarDiscount);
    sidebarDiscount.textContent = `-${formatPrice(totalCryptoDiscount)}`;
  }
  if (sidebarCheckoutCryptoBtn) sidebarCheckoutCryptoBtn.style.display = getUser()?.cryptoWallet ? 'block' : 'none';

  // Free shipping remaining
  if (sidebarFreeShipping && sidebarFreeShippingNote) {
    if (totals.freeShippingRemaining > 0) {
      show(sidebarFreeShippingNote);
      sidebarFreeShipping.textContent = formatPrice(totals.freeShippingRemaining);
    } else {
      hide(sidebarFreeShippingNote);
    }
  }

  // Update review totals
  if (totals.promoDiscount > 0 || totals.loyaltyDiscount > 0 || totals.cryptoDiscount > 0) {
    const discountRow = $('#summaryDiscountRow');
    const discountAmount = $('#summaryDiscount');
    if (discountRow) discountRow.classList.remove('hidden');
    if (discountAmount) {
      const discountParts = [];
      if (totals.promoDiscount > 0) discountParts.push(`Promo: ${formatPrice(totals.promoDiscount)}`);
      if (totals.loyaltyDiscount > 0) discountParts.push(`Lojalnost: ${formatPrice(totals.loyaltyDiscount)}`);
      if (totals.cryptoDiscount > 0) discountParts.push(`Kripto: ${formatPrice(totals.cryptoDiscount)}`);
      discountAmount.textContent = `-${discountParts.join(', ')}`;
    }
  }
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
  trackEvent('promo_apply', { code: normalized, type: promo.type, value: promo.value });
  return true;
};

const removePromoCode = () => {
  if (!promoApplied) return;
  
  promoApplied = false;
  promoDiscount = { type: 'percent', value: 0, description: '' };
  
  const els = initElements();
  if (els.promoCode) els.promoCode.value = '';
  
  window.showToast?.('Promo kod uklonjen', 'info');
  trackEvent('promo_remove');
};

const bindEvents = () => {
  const els = initElements();

  // Promo code
  if (els.applyPromo) {
    on(els.applyPromo, 'click', () => {
      if (els.promoCode?.value?.trim()) {
        applyPromoCode(els.promoCode.value);
        updateTotals(cartSignal.get(), userSignal.get(), selectedShippingMethod, promoApplied ? promoDiscount : null);
      }
    });
    if (els.promoCode) {
      on(els.promoCode, 'keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (els.promoCode.value?.trim()) {
            applyPromoCode(els.promoCode.value);
            updateTotals(cartSignal.get(), userSignal.get(), selectedShippingMethod, promoApplied ? promoDiscount : null);
          }
        }
      });
    }
  }

  // Shipping method selection
  if (els.shippingMethod) {
    on(document, 'change', 'input[name="shippingMethod"]', (e) => {
      selectedShippingMethod = e.target.value;
      updateTotals(cartSignal.get(), userSignal.get(), selectedShippingMethod, promoApplied ? promoDiscount : null);
    });
  }

  // Promo remove on input clear
  if (els.promoCode) {
    on(els.promoCode, 'input', () => {
      if (!els.promoCode.value.trim() && promoApplied) {
        removePromoCode();
        updateTotals(cartSignal.get(), userSignal.get(), selectedShippingMethod, null);
      }
    });
  }

  // Checkout Mode Toggle (Guest vs Account)
  if (els.checkoutModeRadios && els.checkoutModeRadios.length > 0) {
    els.checkoutModeRadios.forEach(radio => {
      on(radio, 'change', () => {
        if (radio.checked) {
          const mode = radio.value;
          const passwordFields = document.getElementById('passwordFields');
          const password = document.getElementById('password');
          const confirmPassword = document.getElementById('confirmPassword');
          
          if (mode === 'account') {
            // Show password fields
            if (passwordFields) passwordFields.hidden = false;
            if (password) password.required = true;
            if (confirmPassword) confirmPassword.required = true;
          } else {
            // Hide password fields
            const passwordFields = document.getElementById('passwordFields');
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirmPassword');
            
            if (passwordFields) passwordFields.hidden = true;
            if (password) {
              password.required = false;
              password.value = '';
            }
            if (confirmPassword) {
              confirmPassword.required = false;
              confirmPassword.value = '';
            }
          }
          
          trackEvent('checkout_mode_change', { mode });
        }
      });
    });
  }

  // Payment method change
  if (els.paymentMethodRadios) {
    els.paymentMethodRadios.forEach(radio => {
      on(radio, 'change', () => {
        if (radio.checked) {
          const method = radio.value;
          
          // Show/hide conditional fields
          if (els.cardFields) method === 'card' ? show(els.cardFields) : hide(els.cardFields);
          if (els.cryptoFields) method === 'crypto' ? show(els.cryptoFields) : hide(els.cryptoFields);
          
          // Update crypto fields if crypto selected
          if (method === 'crypto' && window.DALLI_Checkout) {
            window.DALLI_Checkout.initCryptoFields?.();
          }
          
          trackEvent('checkout_payment_method_change', { method });
        }
      });
    });
  }

  // Crypto currency change
  const cryptoCurrency = document.getElementById('cryptoCurrency');
  if (cryptoCurrency) {
    on(cryptoCurrency, 'change', () => {
      if (window.DALLI_Checkout) {
        window.DALLI_Checkout.updateCryptoAmount?.();
      }
    });
  }

  // Copy crypto address
  const copyBtn = document.getElementById('copyAddressBtn');
  if (copyBtn) {
    on(copyBtn, 'click', () => {
      const addressEl = document.getElementById('cryptoWalletAddress');
      if (addressEl) {
        navigator.clipboard.writeText(addressEl.textContent);
        window.showToast?.('Adresa kopirana', 'success');
        trackEvent('crypto_address_copy');
      }
    });
  }

  // Crypto amount manual input
  const cryptoAmountManual = document.getElementById('cryptoAmountManual');
  if (cryptoAmountManual) {
    on(cryptoAmountManual, 'input', () => {
      if (window.DALLI_Checkout) {
        window.DALLI_Checkout.updateCryptoAmount?.();
      }
    });
  }

  // Form navigation
  const form = document.getElementById('checkoutForm');
  if (form) {
    on(form, 'click', (e) => {
      const btn = e.target.closest('[data-action="next-step"]');
      if (btn) {
        const currentStep = parseInt(document.querySelector('.checkout-step.active')?.dataset.step || '1');
        const nextStep = currentStep + 1;
        
        // Validate current step
        const currentStepEl = document.querySelector(`.checkout-step[data-step="${currentStep}"]`);
        const inputs = currentStepEl.querySelectorAll('input[required], select[required], textarea[required]');
        let valid = true;
        
        // Check if account mode is selected for step 1
        const isAccountMode = document.querySelector('input[name="checkoutMode"][value="account"]')?.checked;
        
        inputs.forEach(input => {
          if (!input.value.trim()) {
            input.classList.add('is-invalid');
            valid = false;
          } else {
            input.classList.remove('is-invalid');
          }
        });
        
        // Additional validation for account mode passwords
        if (currentStep === 1 && isAccountMode) {
          const password = document.getElementById('password');
          const confirmPassword = document.getElementById('confirmPassword');
          
          if (password && password.value.length < 8) {
            password.classList.add('is-invalid');
            valid = false;
          } else if (password) {
            password.classList.remove('is-invalid');
          }
          
          if (confirmPassword && confirmPassword.value !== password?.value) {
            confirmPassword.classList.add('is-invalid');
            valid = false;
          } else if (confirmPassword) {
            confirmPassword.classList.remove('is-invalid');
          }
        }
        
        if (valid) {
          document.querySelectorAll('.checkout-step').forEach(step => {
            step.classList.remove('active');
          });
          document.querySelector(`.checkout-step[data-step="${nextStep}"]`)?.classList.add('active');
          
          // Update progress
          document.querySelectorAll('.checkout-progress__step').forEach((step, i) => {
            step.classList.toggle('active', i + 1 <= nextStep);
            step.classList.toggle('completed', i + 1 < nextStep);
          });
          
          // Update URL
          const url = new URL(window.location);
          url.searchParams.set('step', nextStep);
          window.history.replaceState({}, '', url);
        }
      }

      const prevBtn = e.target.closest('[data-action="prev-step"]');
      if (prevBtn) {
        const currentStep = parseInt(document.querySelector('.checkout-step.active')?.dataset.step || '1');
        if (currentStep > 1) {
          const prevStep = currentStep - 1;
          document.querySelectorAll('.checkout-step').forEach(step => {
            step.classList.remove('active');
          });
          document.querySelector(`.checkout-step[data-step="${prevStep}"]`)?.classList.add('active');
          
          document.querySelectorAll('.checkout-progress__step').forEach((step, i) => {
            step.classList.toggle('active', i + 1 <= prevStep);
            step.classList.toggle('completed', i + 1 < prevStep);
          });
          
          const url = new URL(window.location);
          url.searchParams.set('step', prevStep);
          window.history.replaceState({}, '', url);
        }
      }

      // Form submit
      if (e.target === form) {
        e.preventDefault();
        const termsAccepted = document.getElementById('termsAccepted');
        if (!termsAccepted?.checked) {
          window.showToast?.('Morate prihvatiti uslove korišćenja', 'error');
          return;
        }
        
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (placeOrderBtn) {
          placeOrderBtn.disabled = true;
          placeOrderBtn.textContent = 'Obrada...';
        }

        // Submit order
        submitOrder();
      }
    });
  }
};

const submitOrder = async () => {
  const cart = cartSignal.get();
  const user = userSignal.get();
  
  if (cart.length === 0) {
    window.showToast?.('Vaša korpa je prazna', 'warning');
    return;
  }

  const form = document.getElementById('checkoutForm');
  const formData = new FormData(form);
  
  const orderData = {
    userId: (user && (user.id || user.email)) || null,
    customer: {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      marketingConsent: formData.get('marketingConsent') === 'on'
    },
    shipping: {
      address: formData.get('address'),
      city: formData.get('city'),
      postalCode: formData.get('postalCode'),
      country: formData.get('country'),
      instructions: formData.get('deliveryInstructions')
    },
    payment: {
      method: formData.get('paymentMethod'),
      ...(formData.get('paymentMethod') === 'card' && {
        cardNumber: formData.get('cardNumber'),
        cardExpiry: formData.get('cardExpiry'),
        cardCvc: formData.get('cardCvc'),
        cardName: formData.get('cardName')
      }),
      ...(formData.get('paymentMethod') === 'crypto' && {
        currency: formData.get('cryptoCurrency'),
        amountRSD: formData.get('cryptoAmountRSD'),
        amountCrypto: formData.get('cryptoAmountCrypto'),
        walletAddress: formData.get('cryptoWalletAddress')
      })
    },
    items: cartSignal.get().map(item => ({
      productId: item.id,
      variantId: item.variantId,
      name: item.name,
      color: item.color,
      size: item.size,
      price: item.price,
      qty: item.qty
    })),
    totals: calculateTotals(cartSignal.get(), userSignal.get(), selectedShippingMethod, promoApplied ? promoDiscount : null),
    promoCode: promoApplied ? promoDiscount.type === 'percent' ? `PERCENT_${promoDiscount.value}` : promoDiscount.type === 'shipping' ? 'FREESHIP' : promoDiscount.description : null,
    appliedPromo: promoApplied ? {
      code: promoDiscount.description,
      type: promoDiscount.type,
      value: promoDiscount.value
    } : null
  };

  const placeOrderBtn = document.getElementById('placeOrderBtn');
  if (placeOrderBtn) {
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Obrada...';
  }

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Greška prilikom slanja porudžbine' }));
      throw new Error(error.message || 'Greška prilikom slanja porudžbine');
    }

    const result = await response.json();
    
    trackEvent('purchase', {
      transaction_id: result.orderNumber,
      value: calculateTotals(cartSignal.get(), userSignal.get(), selectedShippingMethod, promoApplied ? promoDiscount : null).total,
      currency: 'RSD',
      items: cartSignal.get().map(item => ({
        item_id: item.variantId,
        item_name: item.name,
        price: item.price,
        quantity: item.qty
      }))
    });

    cartSignal.set([]);
    window.showToast?.('Porudžbina je uspešno poslata!', 'success');
    window.location.href = `/porudzbina-uspesna.html?order=${result.orderNumber}`;

  } catch (err) {
    console.error('Order submit error:', err);
    window.showToast?.(err.message || 'Greška prilikom slanja porudžbine. Pokušajte ponovo.', 'error');
  } finally {
    if (placeOrderBtn) {
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = 'Potvrdite porudžbinu';
    }
  }
};

const bindShippingMethodEvents = () => {
  // Shipping method cards click
  document.querySelectorAll('.shipping-method').forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio && !radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
};

const initCheckoutPage = () => {
  if (isInitialized) return;

  // Check if on checkout page
  if (!document.getElementById('checkoutForm')) return;

  // Restore from URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlStep = parseInt(urlParams.get('step')) || 1;
  const urlPromo = urlParams.get('promo');
  
  // Initialize shipping method from localStorage or default
  const savedShipping = localStorage.getItem('checkout_shipping_method');
  if (savedShipping) {
    selectedShippingMethod = savedShipping;
  }

  // Initialize promo from URL
  if (urlPromo) {
    applyPromoCode(urlPromo);
  }

  // Subscribe to cart/user changes
  subscribeToCart(() => {
    if (isInitialized) {
      updateTotals(cartSignal.get(), userSignal.get(), selectedShippingMethod, promoApplied ? promoDiscount : null);
      renderSummaryItems(cartSignal.get());
      renderReviewData({
        customer: { ...getFormData() },
        shipping: { ...getFormData() },
        payment: { method: getSelectedPaymentMethod() }
      });
    }
  });

  subscribeToUser(() => {
    if (isInitialized) {
      updateTotals(cartSignal.get(), userSignal.get(), selectedShippingMethod, promoApplied ? promoDiscount : null);
    }
  });

  // Initial renders
  updateTotals(cartSignal.get(), userSignal.get(), selectedShippingMethod, promoApplied ? promoDiscount : null);
  renderSummaryItems(cartSignal.get());
  renderReviewData(getFormData());
  bindShippingMethodEvents();

  // Initialize payment method fields
  const checkedRadio = document.querySelector('input[name="paymentMethod"]:checked');
  if (checkedRadio) {
    const method = checkedRadio.value;
    if (method === 'card') {
      show($('#cardFields'));
    } else if (method === 'crypto') {
      show($('#cryptoFields'));
      initCryptoFields();
    }
  }

  // Bind events
  bindEvents();
  bindShippingMethodEvents();

  isInitialized = true;
  console.log('[Checkout] Initialized');
};

// Get form data helper
const getFormData = () => {
  const form = document.getElementById('checkoutForm');
  if (!form) return {};
  const data = new FormData(form);
  const obj = {};
  data.forEach((value, key) => obj[key] = value);
  return obj;
};

const getSelectedPaymentMethod = () => {
  const checked = document.querySelector('input[name="paymentMethod"]:checked');
  return checked?.value || 'cod';
};

const initCryptoFields = () => {
  // Initialize crypto payment with timer
  if (window.cryptoPayment) return; // Already initialized

  try {
    // Initialize crypto payment timer (30 minutes)
    window.cryptoPayment = new CryptoPayment({
      timerId: 'cryptoTimer',
      duration: 30 * 60 * 1000, // 30 minutes
      onExpire: () => {
        window.showToast?.('Vreme za kripto plaćanje je isteklo. Molimo vas da izaberete drugi način plaćanja.', 'warning');
        // Auto-switch to COD
        const codRadio = document.querySelector('input[name="paymentMethod"][value="cod"]');
        if (codRadio) {
          codRadio.checked = true;
          codRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    // Initialize crypto amount calculator
    window.cryptoCalculator = new CryptoAmountCalculator({
      currencyId: 'cryptoCurrency',
      amountRSDId: 'cryptoAmountRSD',
      amountCryptoId: 'cryptoAmountCrypto',
      currencyLabelId: 'cryptoCurrencyLabel',
      amountRSDDisplayId: 'cryptoAmountRSD',
      amountCryptoDisplayId: 'cryptoAmountCrypto',
      currencyLabelDisplayId: 'cryptoCurrencyLabel',
      manualInputId: 'cryptoAmountManual'
    });

    // Initialize QR code modal
    initQRCodeModal();

    // Set initial subtotal from cart
    const cart = cartSignal.get();
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    if (window.cryptoCalculator) {
      window.cryptoCalculator.setSubtotal(subtotal);
    }

    // Sync crypto currency select with calculator
    const cryptoCurrency = document.getElementById('cryptoCurrency');
    if (cryptoCurrency) {
      cryptoCurrency.addEventListener('change', () => {
        if (window.cryptoCalculator) {
          window.cryptoCalculator.update();
        }
      });
    }

    console.log('[CryptoPayment] Initialized with 30-min timer');
  } catch (err) {
    console.warn('[CryptoPayment] Init failed:', err);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckoutPage);
} else {
  initCheckoutPage();
}

export { initCheckoutPage, updateTotals, applyPromoCode, removePromoCode, calculateTotals };

if (typeof window !== 'undefined') {
  window.DALLI_Checkout = { 
    initCheckoutPage, 
    updateTotals, 
    applyPromoCode, 
    removePromoCode,
    initCryptoFields
  };
}