import { $, $$, show, hide, on, formatPrice } from '../../core/dom.js';
import { trackEvent } from '../../features/analytics.js';

const PAYMENT_METHODS = ['cod', 'bank-transfer', 'card', 'crypto'];

let form = null;
let nextBtn = null;
let prevBtn = null;
let currentStep = 3;
let selectedPaymentMethod = 'cod';
let cardFields = null;
let cryptoFields = null;
let cryptoPaymentDetails = null;

const getFormData = () => {
  if (!form) return {};
  const data = new FormData(form);
  const obj = { paymentMethod: selectedPaymentMethod };
  data.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};

const setFormData = (data) => {
  if (!form) return;
  if (data.paymentMethod) {
    selectPaymentMethod(data.paymentMethod);
  }
  Object.entries(data).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) {
      field.value = value;
    }
  });
};

const selectPaymentMethod = (method) => {
  if (!PAYMENT_METHODS.includes(method)) return;

  selectedPaymentMethod = method;

  // Update radio buttons
  $$('input[name="paymentMethod"]').forEach(radio => {
    radio.checked = radio.value === method;
    radio.closest('.payment-option')?.classList.toggle('selected', radio.value === method);
  });

  // Show/hide conditional fields
  if (cardFields) hide(cardFields);
  if (cryptoFields) hide(cryptoFields);
  if (cryptoPaymentDetails) hide(cryptoPaymentDetails);

  if (method === 'card' && cardFields) {
    show(cardFields);
  } else if (method === 'crypto' && cryptoFields) {
    show(cryptoFields);
    initCryptoFields();
  }

  trackEvent('checkout_payment_method_select', { method });
};

const initCryptoFields = () => {
  // This would integrate with the crypto payment module
  // For now, just show the fields
  console.log('[Step3] Crypto fields initialized');
};

const validateField = (field) => {
  const el = form?.querySelector(`[name="${field.id}"]`);
  if (!el) return true;

  // Skip validation for hidden fields
  if (el.offsetParent === null) return true;

  if (field.required && !el.value.trim()) {
    showError(el, 'Ovo polje je obavezno');
    return false;
  }

  if (field.id === 'cardNumber' && el.value.trim()) {
    const clean = el.value.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(clean)) {
      showError(el, 'Nevažeći broj kartice');
      return false;
    }
  }

  if (field.id === 'cardExpiry' && el.value.trim()) {
    if (!/^\d{2}\/\d{2}$/.test(el.value)) {
      showError(el, 'Format: MM/YY');
      return false;
    }
  }

  if (field.id === 'cardCvc' && el.value.trim()) {
    if (!/^\d{3,4}$/.test(el.value)) {
      showError(el, 'CVC mora imati 3-4 cifre');
      return false;
    }
  }

  clearError(el);
  return true;
};

const validateStep = () => {
  const baseValid = selectedPaymentMethod !== 'card' || [
    { id: 'cardNumber', required: true },
    { id: 'cardExpiry', required: true },
    { id: 'cardCvc', required: true },
    { id: 'cardName', required: true }
  ].every(validateField);

  if (selectedPaymentMethod === 'crypto') {
    const cryptoCurrency = form?.querySelector('[name="cryptoCurrency"]');
    if (cryptoCurrency && !cryptoCurrency.value) {
      showError(cryptoCurrency, 'Izaberite kriptovalutu');
      return false;
    }
  }

  return baseValid;
};

const showError = (el, message) => {
  el.classList.add('is-invalid');
  let errorEl = el.parentNode.querySelector('.field-error');
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.className = 'field-error';
    errorEl.setAttribute('role', 'alert');
    el.parentNode.appendChild(errorEl);
  }
  errorEl.textContent = message;
};

const clearError = (el) => {
  el.classList.remove('is-invalid');
  const errorEl = el.parentNode.querySelector('.field-error');
  if (errorEl) errorEl.remove();
};

const bindEvents = () => {
  if (!form) return;

  // Payment method radios
  $$('input[name="paymentMethod"]').forEach(radio => {
    on(radio, 'change', () => selectPaymentMethod(radio.value));
  });

  // Card fields validation
  if (cardFields) {
    $$('input', cardFields).forEach(input => {
      on(input, 'input', () => clearError(input));
      on(input, 'blur', () => {
        const field = { id: input.name, required: true };
        validateField(field);
      });
    });
  }

  // Crypto currency select
  const cryptoCurrency = form?.querySelector('[name="cryptoCurrency"]');
  if (cryptoCurrency) {
    on(cryptoCurrency, 'change', () => clearError(cryptoCurrency));
  }

  // Copy crypto address
  const copyBtn = $('#copyAddressBtn');
  if (copyBtn) {
    on(copyBtn, 'click', () => {
      const addressEl = $('#cryptoWalletAddress');
      if (addressEl) {
        navigator.clipboard.writeText(addressEl.textContent);
        window.showToast?.('Adresa kopirana', 'success');
        trackEvent('crypto_address_copy');
      }
    });
  }

  if (nextBtn) on(nextBtn, 'click', () => {
    if (validateStep()) {
      trackEvent('checkout_step_complete', { step: 3, method: selectedPaymentMethod });
      window.dispatchEvent(new CustomEvent('checkout:step:complete', { detail: { step: 3, data: getFormData() } }));
    } else {
      trackEvent('checkout_step_validation_error', { step: 3 });
    }
  });

  if (prevBtn) on(prevBtn, 'click', () => {
    window.dispatchEvent(new CustomEvent('checkout:step:prev', { detail: { step: 3 } }));
  });
};

const init = (stepEl) => {
  form = stepEl.querySelector('form') || stepEl.closest('form');
  if (!form) return { init: () => {}, validate: () => false, getData: () => ({}) };

  nextBtn = stepEl.querySelector('[data-action="next-step"]');
  prevBtn = stepEl.querySelector('[data-action="prev-step"]');
  cardFields = $('#cardFields');
  cryptoFields = $('#cryptoFields');
  cryptoPaymentDetails = $('#cryptoPaymentDetails');

  bindEvents();

  // Set initial payment method
  const checkedRadio = form.querySelector('input[name="paymentMethod"]:checked');
  if (checkedRadio) {
    selectPaymentMethod(checkedRadio.value);
  }

  return {
    validate: validateStep,
    getData: getFormData,
    setData: setFormData,
    setStep: (step) => { currentStep = step; }
  };
};

if (typeof window !== 'undefined') {
  window.DALLI_CheckoutStep3 = { init };
}

export { init, validateStep, getFormData as getStep3Data };