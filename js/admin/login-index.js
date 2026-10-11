/**
 * Admin Login Entry Point
 * Lightweight entry for login page - only loads auth, toast, store, compat
 */
(function() {
  'use strict';

  // Initialize only required modules for login
  function initLogin() {
    console.log('[Admin Login] Initializing...');

    // Initialize core modules needed for login
    if (window.AdminStore) {
      console.log('[Admin Login] Store ready');
    }

    if (window.AuthManager) {
      window.AuthManager.init();
      console.log('[Admin Login] AuthManager initialized');
    }

    if (window.ToastManager) {
      window.ToastManager.init();
      console.log('[Admin Login] ToastManager initialized');
    }

    // Initialize compatibility layer (exposes global functions)
    if (window.AdminCompat) {
      window.AdminCompat.init();
      console.log('[Admin Login] Compat layer initialized');
    }

    // Initialize existing login functionality
    if (typeof initAdminLogin === 'function') {
      initAdminLogin();
    }

    if (typeof initThemeToggle === 'function') {
      initThemeToggle();
    }

    console.log('[Admin Login] Initialized');
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }

  // Export for manual init
  window.AdminLogin = { init: initLogin };
})();
