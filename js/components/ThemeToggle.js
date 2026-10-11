/**
 * DALLI Theme Toggle — 3-State (Light / Dark / Auto) with OS Detection
 * Vanilla JS Module, ~2KB gzipped
 */

export class ThemeToggle {
  constructor(options = {}) {
    this.selector = options.selector || '[data-theme-toggle]';
    this.storageKey = options.storageKey || 'dalli_theme';
    this.attribute = options.attribute || 'data-theme';
    this.onChange = options.onChange || (() => {});
    this.states = ['light', 'dark', 'auto'];
    this.currentIndex = 0;
    this.mediaQuery = null;
    this.init();
  }

  init() {
    this.button = document.querySelector(this.selector);
    if (!this.button) return;

    this.iconSun = this.button.querySelector('[data-theme-icon="sun"]');
    this.iconMoon = this.button.querySelector('[data-theme-icon="moon"]');
    this.iconAuto = this.button.querySelector('[data-theme-icon="auto"]');
    this.label = this.button.querySelector('[data-theme-label]');

    this.loadPreference();
    this.setupMediaQuery();
    this.bindEvents();
    this.updateUI();
  }

  loadPreference() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved && this.states.includes(saved)) {
      this.currentIndex = this.states.indexOf(saved);
    } else {
      this.currentIndex = 2; // Default to 'auto'
    }
  }

  setupMediaQuery() {
    if (window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener?.('change', this.handleSystemChange.bind(this));
    }
  }

  handleSystemChange(e) {
    if (this.getCurrentState() === 'auto') {
      this.applyTheme(this.resolveAuto());
      this.updateUI();
    }
  }

  getCurrentState() {
    return this.states[this.currentIndex];
  }

  resolveAuto() {
    if (!this.mediaQuery) return 'light';
    return this.mediaQuery.matches ? 'dark' : 'light';
  }

  getEffectiveTheme() {
    const state = this.getCurrentState();
    return state === 'auto' ? this.resolveAuto() : state;
  }

  cycle() {
    this.currentIndex = (this.currentIndex + 1) % this.states.length;
    this.savePreference();
    this.applyTheme(this.getEffectiveTheme());
    this.updateUI();
    this.onChange(this.getEffectiveTheme(), this.getCurrentState());
  }

  setState(state) {
    const index = this.states.indexOf(state);
    if (index === -1) return false;
    this.currentIndex = index;
    this.savePreference();
    this.applyTheme(this.getEffectiveTheme());
    this.updateUI();
    this.onChange(this.getEffectiveTheme(), this.getCurrentState());
    return true;
  }

  savePreference() {
    localStorage.setItem(this.storageKey, this.getCurrentState());
  }

  applyTheme(theme) {
    document.documentElement.setAttribute(this.attribute, theme);
    document.documentElement.style.colorScheme = theme;
  }

  updateUI() {
    const state = this.getCurrentState();
    const effective = this.getEffectiveTheme();

    // Update button aria-label
    const labels = {
      light: 'Preklopi na tamnu temu',
      dark: 'Preklopi na automatsku temu',
      auto: 'Preklopi na svetlu temu'
    };
    this.button.setAttribute('aria-label', labels[state] || labels.auto);
    this.button.setAttribute('title', labels[state] || labels.auto);
    this.button.setAttribute('data-theme-state', state);

    // Update icons
    [this.iconSun, this.iconMoon, this.iconAuto].forEach((icon, i) => {
      if (icon) icon.hidden = i !== this.currentIndex;
    });

    // Update label text
    if (this.label) {
      const labelTexts = { light: 'Svetla', dark: 'Tamna', auto: 'Auto' };
      this.label.textContent = labelTexts[state] || 'Auto';
    }
  }

  bindEvents() {
    this.button.addEventListener('click', this.cycle.bind(this));

    // Keyboard support
    this.button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.cycle();
      }
    });
  }

  destroy() {
    this.mediaQuery?.removeEventListener?.('change', this.handleSystemChange.bind(this));
    this.button?.removeEventListener('click', this.cycle.bind(this));
  }
}

// Auto-initialize if element exists
export function initThemeToggle(selector = '[data-theme-toggle]') {
  const button = document.querySelector(selector);
  if (button && !button.dataset.themeToggleInitialized) {
    button.dataset.themeToggleInitialized = 'true';
    return new ThemeToggle({ selector });
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.DALLI_ThemeToggle = { ThemeToggle, initThemeToggle };
}