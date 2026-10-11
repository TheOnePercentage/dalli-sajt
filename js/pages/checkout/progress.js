import { $, $$, on } from '../../core/dom.js';
import { trackEvent } from '../../features/analytics.js';

const STEPS = [
  { id: 1, name: 'data', label: 'Podaci', url: '?step=1' },
  { id: 2, name: 'shipping', label: 'Dostava', url: '?step=2' },
  { id: 3, name: 'payment', label: 'Plaćanje', url: '?step=3' },
  { id: 4, name: 'review', label: 'Pregled', url: '?step=4' }
];

let currentStep = 1;

const init = () => {
  const progressContainer = $('.checkout-progress');
  if (!progressContainer) return;

  const steps = $$('.checkout-progress__step', progressContainer);
  
  // Update from URL if present
  const urlStep = parseInt(new URLSearchParams(window.location.search).get('step')) || 1;
  if (urlStep >= 1 && urlStep <= 4) {
    currentStep = urlStep;
    updateProgress(currentStep);
  }

  // Keyboard navigation on progress steps
  steps.forEach((stepEl, index) => {
    const stepNum = index + 1;
    on(stepEl, 'click', () => {
      if (stepNum < currentStep) {
        // Allow going back
        window.dispatchEvent(new CustomEvent('checkout:step:goto', { detail: { step: stepNum } }));
      } else if (stepNum === currentStep + 1) {
        // Allow next only if current is valid
        window.dispatchEvent(new CustomEvent('checkout:step:next'));
      }
      trackEvent('checkout_progress_click', { from: currentStep, to: stepNum });
    });

    // Keyboard support
    on(stepEl, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        stepEl.click();
      }
    });
  });

  // Listen for step changes
  window.addEventListener('checkout:step:change', (e) => {
    currentStep = e.detail.step;
    updateProgress(currentStep);
    updateURL(currentStep);
  });

  window.addEventListener('checkout:step:goto', (e) => {
    currentStep = e.detail.step;
    updateProgress(currentStep);
    updateURL(currentStep);
  });

  window.addEventListener('checkout:step:next', () => {
    if (currentStep < 4) {
      currentStep++;
      updateProgress(currentStep);
      updateURL(currentStep);
    }
  });

  window.addEventListener('checkout:step:prev', () => {
    if (currentStep > 1) {
      currentStep--;
      updateProgress(currentStep);
      updateURL(currentStep);
    }
  });

  // Initial render
  updateProgress(currentStep);
};

const updateProgress = (step) => {
  const steps = $$('.checkout-progress__step');
  steps.forEach((stepEl, index) => {
    const stepNum = index + 1;
    stepEl.classList.toggle('active', stepNum === step);
    stepEl.classList.toggle('completed', stepNum < step);
    stepEl.setAttribute('aria-current', stepNum === step ? 'step' : 'false');
    stepEl.setAttribute('aria-disabled', stepNum > step + 1 ? 'true' : 'false');
  });
};

const updateURL = (step) => {
  const url = new URL(window.location);
  url.searchParams.set('step', step);
  window.history.replaceState({}, '', url);
};

if (typeof window !== 'undefined') {
  window.DALLI_CheckoutProgress = { init, updateProgress, getStep: () => currentStep };
}

export { init, updateProgress };
export const getStep = () => currentStep;