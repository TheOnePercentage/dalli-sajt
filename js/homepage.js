/**
 * DALLI Homepage — Component Initialization
 * Entry point for all homepage components
 */

import { initThemeToggle } from './components/ThemeToggle.js';
import { initMarketSelector } from './components/MarketSelector.js';

// Initialize core components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle (3-state: light/dark/auto with OS detection)
  initThemeToggle('[data-theme-toggle]');

  // Market selector (country/currency/language)
  initMarketSelector('[data-market-selector]');

  // Expose for debugging
  window.DALLI_Homepage = { initThemeToggle, initMarketSelector };
});

// Handle theme changes from other tabs
window.addEventListener('storage', e => {
  if (e.key === 'dalli_theme') {
    const theme = e.newValue;
    if (theme && ['light', 'dark', 'auto'].includes(theme)) {
      document.documentElement.setAttribute('data-theme', theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme
      );
      // Re-initialize to update UI
      initThemeToggle('[data-theme-toggle]');
    }
  }
  if (e.key === 'dalli_market') {
    initMarketSelector('[data-market-selector]');
  }
});

// Handle market changes from i18n system
window.addEventListener('dalli:countrychange', e => {
  initMarketSelector('[data-market-selector]');
});

window.addEventListener('dalli:marketchange', e => {
  initMarketSelector('[data-market-selector]');
});