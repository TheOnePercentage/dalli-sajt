import { $, $$, on, delegate, show, hide, formatPrice } from '../../core/dom.js';
import { trackEvent } from '../../features/analytics.js';

const FIELDS = [
  { id: 'address', required: true, autocomplete: 'street-address', type: 'text', inputmode: 'text' },
  { id: 'city', required: true, autocomplete: 'address-level2', type: 'text', inputmode: 'text' },
  { id: 'postalCode', required: true, autocomplete: 'postal-code', type: 'text', inputmode: 'text' },
  { id: 'country', required: true, type: 'select' },
  { id: 'deliveryInstructions', required: false, type: 'textarea' }
];

let form = null;
let nextBtn = null;
let prevBtn = null;
let currentStep = 2;

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
      if (field.tagName === 'SELECT') {
        field.value = value;
      } else {
        field.value = value;
      }
    }
  });
};

const validateField = (field) => {
  const el = form?.querySelector(`[name="${field.id}"]`);
  if (!el) return true;

  if (field.required && !el.value.trim()) {
    showError(el, 'Ovo polje je obavezno');
    return false;
  }

  if (field.id === 'postalCode' && el.value.trim()) {
    const postalRegex = /^[0-9]{5}$/;
    if (!postalRegex.test(el.value.trim())) {
      showError(el, 'Poštanski kod mora imati 5 cifara');
      return false;
    }
  }

  clearError(el);
  return true;
};

const validateStep = () => {
  return FIELDS.every(validateField);
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

  FIELDS.forEach(field => {
    const el = form.querySelector(`[name="${field.id}"]`);
    if (!el) return;

    if (field.type === 'select') {
      on(el, 'change', () => clearError(el));
    } else if (field.type === 'textarea') {
      on(el, 'input', () => clearError(el));
    } else {
      on(el, 'input', () => clearError(el));
      on(el, 'blur', () => validateField(field));
    }
  });

  if (nextBtn) on(nextBtn, 'click', () => {
    if (validateStep()) {
      trackEvent('checkout_step_complete', { step: 2, fields: Object.keys(getFormData()).length });
      window.dispatchEvent(new CustomEvent('checkout:step:complete', { detail: { step: 2, data: getFormData() } }));
    } else {
      trackEvent('checkout_step_validation_error', { step: 2 });
    }
  });

  if (prevBtn) on(prevBtn, 'click', () => {
    window.dispatchEvent(new CustomEvent('checkout:step:prev', { detail: { step: 2 } }));
  });
};

const init = (stepEl) => {
  form = stepEl.querySelector('form') || stepEl.closest('form');
  if (!form) return { init: () => {}, validate: () => false, getData: () => ({}) };

  nextBtn = stepEl.querySelector('[data-action="next-step"]');
  prevBtn = stepEl.querySelector('[data-action="prev-step"]');

  bindEvents();

  return {
    validate: validateStep,
    getData: getFormData,
    setData: setFormData,
    setStep: (step) => { currentStep = step; }
  };
};

if (typeof window !== 'undefined') {
  window.DALLI_CheckoutStep2 = { init };
}

export { init, validateStep, getFormData as getStep2Data };