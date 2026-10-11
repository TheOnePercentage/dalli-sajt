/**
 * Admin Panel - Main Entry Point
 * Composes all modules and initializes the admin panel
 */
(function() {
  'use strict';

  // Import all modules (they self-register on window)
  // Order matters: dependencies first
  
  // 1. Core infrastructure
  // events.js - EventBus + AdminEvents
  // store.js - AdminStore
  
  // 2. Feature modules
  // auth.js - AuthManager
  // toast.js - ToastManager
  // modal.js - ModalManager
  // navigation.js - NavigationController
  // shortcuts.js - ShortcutManager
  // product-form.js - ProductFormHandler (class, not singleton)
  
  // 3. Compatibility layer (must be last to expose globals)
  // compat.js - Backward compatibility globals

  // Initialize all managers
  function initAdmin() {
    console.log('[Admin] Initializing admin panel...');

    // Initialize core modules
    if (window.AdminEventBus) {
      console.log('[Admin] EventBus ready');
    }
    
    if (window.AdminStore) {
      console.log('[Admin] Store ready');
    }

    // Initialize feature modules
    if (window.AuthManager) {
      window.AuthManager.init();
      console.log('[Admin] AuthManager initialized');
    }

    if (window.ToastManager) {
      window.ToastManager.init();
      console.log('[Admin] ToastManager initialized');
    }

    if (window.ModalManager) {
      window.ModalManager.init();
      console.log('[Admin] ModalManager initialized');
    }

    if (window.NavigationController) {
      window.NavigationController.init();
      console.log('[Admin] NavigationController initialized');
    }

    if (window.ShortcutManager) {
      window.ShortcutManager.init();
      console.log('[Admin] ShortcutManager initialized');
    }

    // Initialize compatibility layer (exposes global functions)
    if (window.AdminCompat) {
      window.AdminCompat.init();
      console.log('[Admin] Compat layer initialized');
    }

    // Initialize theme (existing functionality)
    if (typeof initThemeToggle === 'function') {
      initThemeToggle();
    }

    // Initialize admin dashboard or login
    if (typeof initAdmin === 'function') {
      initAdmin();
    }

    console.log('[Admin] Admin panel initialized successfully');
    
    // Emit ready event
    if (window.AdminEventBus) {
      window.AdminEventBus.emit('admin:ready', { timestamp: Date.now() });
    }
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
  } else {
    initAdmin();
  }

  // Export public API
  window.AdminPanel = {
    init: initAdmin,
    
    // Module access
    get EventBus() { return window.AdminEventBus; },
    get Store() { return window.AdminStore; },
    get Auth() { return window.AuthManager; },
    get Toast() { return window.ToastManager; },
    get Modal() { return window.ModalManager; },
    get Navigation() { return window.NavigationController; },
    get Shortcuts() { return window.ShortcutManager; },
    get ProductForm() { return window.ProductFormHandler; },
    
    // Utility
    reset: () => {
      window.AdminStore?.reset();
      window.AuthManager?.logout();
      window.ToastManager?.hideAll();
      window.ModalManager?.closeAll();
      window.NavigationController?.destroy();
      window.ShortcutManager?.setEnabled(false);
    },
    
    // Development helpers
    _debug: {
      getState: () => window.AdminStore?.getState(),
      getStore: () => window.AdminStore,
      getAuth: () => window.AuthManager,
      getEvents: () => window.AdminEventBus,
    }
  };
})();
