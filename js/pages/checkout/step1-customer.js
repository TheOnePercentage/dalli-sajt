import { $, $$, on, delegate, show, hide, formatPrice } from '../../core/dom.js';
import { trackEvent } from '../../features/analytics.js';

const FIELDS = [
  { id: 'firstName', required: true, autocomplete: 'given-name', type: 'text', inputmode: 'text' },
  { id: 'lastName', required: true, autocomplete: 'family-name', type: 'text', inputmode: 'text' },
  { id: 'email', required: true, autocomplete: 'email', type: 'email', inputmode: 'email' },
  { id: 'phone', required: true, autocomplete: 'tel', type: 'tel', inputmode: 'tel' },
  { id: 'marketingConsent', required: false, type: 'checkbox' }
];

let form = null;
let nextBtn = null;
let prevBtn = null;
let currentStep = 1;

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

const validateField = (field) => {
  const el = form?.querySelector(`[name="${field.id}"]`);
  if (!el) return true;

  if (field.required) {
    if (field.type === 'checkbox') {
      if (!el.checked) {
        showError(el, 'Ovo polje je obavezno');
        return false;
      }
    } else if (!el.value.trim()) {
      showError(el, 'Ovo polje je obavezno');
      return false;
    }
  }

  if (field.id === 'email' && el.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(el.value.trim())) {
      showError(el, 'Nevažeća email adresa');
      return false;
    }
  }

  if (field.id === 'phone' && el.value.trim()) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (!phoneRegex.test(el.value.trim())) {
      showError(el, 'Nevažeći broj telefona');
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

const updateNavigation = () => {
  if (prevBtn) {
    prevBtn.style.display = currentStep > 1 ? 'inline-flex' : 'none';
  }
};

const handleNext = async () => {
  if (!validateStep()) {
    trackEvent('checkout_step_validation_error', { step: currentStep });
    return false;
  }

  const data = getFormData();
  trackEvent('checkout_step_complete', { step: currentStep, fields: Object.keys(data).length });
  
  window.dispatchEvent(new CustomEvent('checkout:step:complete', { 
    detail: { step: currentStep, data } 
  }));
  
  return true;
};

const handlePrev = () => {
  window.dispatchEvent(new CustomEvent('checkout:step:prev', { detail: { step: currentStep } }));
};

const bindEvents = () => {
  if (!form) return;

  FIELDS.forEach(field => {
    const el = form.querySelector(`[name="${field.id}"]`);
    if (!el) return;

    if (field.type === 'checkbox') {
      on(el, 'change', () => clearError(el));
    } else {
      on(el, 'input', () => clearError(el));
      on(el, 'blur', () => validateField(field));
    }
  });

  if (nextBtn) on(nextBtn, 'click', handleNext);
  if (prevBtn) on(prevBtn, 'click', handlePrev);

  on(form, 'submit', (e) => {
    e.preventDefault();
    handleNext();
  });
};

const init = (stepEl) => {
  form = stepEl.querySelector('form') || stepEl.closest('form');
  if (!form) return { init: () => {}, validate: () => false, getData: () => ({}) };

  nextBtn = stepEl.querySelector('[data-action="next-step"]');
  prevBtn = stepEl.querySelector('[data-action="prev-step"]');

  bindEvents();
  updateNavigation();

  return {
    validate: validateStep,
    getData: getFormData,
    setData: setFormData,
    setStep: (step) => { currentStep = step; updateNavigation(); }
  };
};

if (typeof window !== 'undefined') {
  window.DALLI_CheckoutStep1 = { init };
}

export { init, validateStep, getFormData as getStep1Data };