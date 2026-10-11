import { themeSignal, initTheme, toggleTheme, getTheme, setTheme } from '../state/theme.js';
import { $, on } from '../core/dom.js';
import { emit, DOM_EVENTS } from '../core/events.js';

export class ThemeToggle {
  constructor(options = {}) {
    this.selector = options.selector || '[data-theme-toggle]';
    this.button = null;
    this.iconSun = null;
    this.iconMoon = null;
    this.iconAuto = null;
    this.label = null;
    this.unsubscribe = null;
    this.init();
  }

  init() {
    this.button = $(this.selector);
    if (!this.button) return;

    this.iconSun = this.button.querySelector('[data-theme-icon="sun"]');
    this.iconMoon = this.button.querySelector('[data-theme-icon="moon"]');
    this.iconAuto = this.button.querySelector('[data-theme-icon="auto"]');
    this.label = this.button.querySelector('[data-theme-label]');

    this.bindEvents();
    this.subscribeToTheme();
    this.updateUI();
  }

  subscribeToTheme() {
    this.unsubscribe = themeSignal.subscribe((theme) => {
      this.updateUI();
    });
  }

  bindEvents() {
    this.button.addEventListener('click', () => {
      toggleTheme();
    });

    this.button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  updateUI() {
    const state = getTheme();
    const effective = state === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : state;

    const labels = {
      light: 'Preklopi na tamnu temu',
      dark: 'Preklopi na automatsku temu',
      auto: 'Preklopi na svetlu temu'
    };
    const labelTexts = { light: 'Svetla', dark: 'Tamna', system: 'Auto' };

    this.button.setAttribute('aria-label', labels[state] || labels.system);
    this.button.setAttribute('title', labels[state] || labels.system);
    this.button.setAttribute('data-theme-state', state);

    [this.iconSun, this.iconMoon, this.iconAuto].forEach((icon, i) => {
      if (icon) icon.hidden = i !== ['light', 'dark', 'system'].indexOf(state);
    });

    if (this.label) {
      this.label.textContent = labelTexts[state] || 'Auto';
    }

    this.button.setAttribute('aria-pressed', effective === 'dark' ? 'true' : 'false');
  }

  destroy() {
    this.unsubscribe?.();
    this.button?.removeEventListener('click', this.cycle.bind(this));
  }
}

export function initThemeToggle(selector = '[data-theme-toggle]') {
  const button = $(selector);
  if (button && !button.dataset.themeToggleInitialized) {
    button.dataset.themeToggleInitialized = 'true';
    return new ThemeToggle({ selector });
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.DALLI_ThemeToggle = { ThemeToggle, initThemeToggle };
}