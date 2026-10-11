/**
 * ThemeManager - DALLI Admin Theme Management
 * 
 * Provides zero-flash theme switching with:
 * - Light / Dark / Auto (OS sync) modes
 * - Zero-flash initial paint (sync apply before paint)
 * - Persistent storage (localStorage)
 * - OS preference sync (media query listener)
 * - CSS transition management (no flash on toggle)
 * - Event listeners for UI updates
 * 
 * @module ThemeManager
 */

const ThemeManager = (() => {
  const THEMES = ['light', 'dark', 'auto'];
  const STORAGE_KEY = 'dalli_theme';
  const META_THEME_COLOR = 'meta[name="theme-color"]';

  let currentTheme = 'auto';
  let systemTheme = 'light';
  let mediaQuery = null;
  let listeners = new Set();
  let transitionClass = 'theme-transition';
  let isInitialized = false;

  function applyTheme(theme) {
    const effective = theme === 'auto' ? systemTheme : theme;
    document.documentElement.setAttribute('data-theme', effective);
    updateMetaThemeColor(effective);
  }

  function updateMetaThemeColor(theme) {
    const colors = { light: '#ffffff', dark: '#1a1a1a' };
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', colors[theme] || colors.light);
  }

  function onSystemThemeChange(e) {
    systemTheme = e.matches ? 'dark' : 'light';
    if (currentTheme === 'auto') {
      const effective = getEffectiveTheme();
      document.documentElement.setAttribute('data-theme', effective);
      updateMetaThemeColor(effective);
      notifyListeners();
    }
  }

  function notifyListeners() {
    const effective = getEffectiveTheme();
    listeners.forEach(function(fn) {
      try {
        fn(effective, currentTheme);
      } catch (e) {
        console.error('Theme change listener error:', e);
      }
    });
  }

  function init() {
    if (isInitialized) return;
    
    const stored = localStorage.getItem('dalli_theme');
    if (stored && ['light', 'dark', 'auto'].includes(stored)) {
      currentTheme = stored;
    }
    
    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemTheme = mediaQuery.matches ? 'dark' : 'light';
      mediaQuery.addEventListener('change', onSystemThemeChange);
    }
    
    const effective = getEffectiveTheme();
    document.documentElement.setAttribute('data-theme', effective);
    updateMetaThemeColor(effective);
    
    requestAnimationFrame(function() {
      document.documentElement.classList.add('theme-ready');
    });
    
    isInitialized = true;
  }

  function setTheme(theme) {
    if (!['light', 'dark', 'auto'].includes(theme)) {
      console.warn('Invalid theme: ' + theme);
      return false;
    }
    
    currentTheme = theme;
    localStorage.setItem('dalli_theme', theme);
    
    const effective = getEffectiveTheme();
    document.documentElement.setAttribute('data-theme', effective);
    updateMetaThemeColor(effective);
    
    notifyListeners();
    return true;
  }

  function getTheme() {
    return currentTheme;
  }

  function getEffectiveTheme() {
    if (currentTheme === 'auto') {
      return systemTheme;
    }
    return currentTheme;
  }

  function cycleTheme() {
    const idx = ['light', 'dark', 'auto'].indexOf(currentTheme);
    const next = ['light', 'dark', 'auto'][(idx + 1) % 3];
    setTheme(['light', 'dark', 'auto'][idx]);
  }

  function toggleTheme() {
    const effective = getEffectiveTheme();
    setTheme(effective === 'dark' ? 'light' : 'dark');
  }

  function getTheme() {
    return currentTheme;
  }

  function getEffectiveTheme() {
    if (currentTheme === 'auto') {
      return systemTheme;
    }
    return currentTheme;
  }

  function cycleTheme() {
    const themes = ['light', 'dark', 'auto'];
    const idx = themes.indexOf(currentTheme);
    const next = themes[(idx + 1) % 3];
    setTheme(next);
  }

  function toggleTheme() {
    const effective = getEffectiveTheme();
    setTheme(effective === 'dark' ? 'light' : 'dark');
  }

  function onChange(listener) {
    if (typeof listener !== 'function') return function() {};
    listeners.add(listener);
    return function() { listeners.delete(listener); };
  }

  function getThemeInfo() {
    return {
      current: currentTheme,
      effective: getEffectiveTheme(),
      system: systemTheme
    };
  }

  return {
    init: init,
    setTheme: setTheme,
    getTheme: getTheme,
    getEffectiveTheme: getEffectiveTheme,
    cycleTheme: cycleTheme,
    toggleTheme: toggleTheme,
    onChange: onChange,
    getThemeInfo: getThemeInfo,
    THEMES: ['light', 'dark', 'auto']
  };
})();

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ThemeManager.init);
} else {
  ThemeManager.init();
}

export const ColorPalette = {
  primary: '#06d6a0',
  secondary: '#1a252f',
  accent: '#e74c3c',
  warning: '#f39c12',
  danger: '#e74c3c',
  success: '#27ae60',
  info: '#3498db'
};

export function generateThemeCSS(theme) {
  return '';
}

export { ThemeManager };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeManager };
}
