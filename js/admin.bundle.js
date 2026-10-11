/**
 * Admin Dashboard Bundle
 * Loads all admin modules in correct order
 * This replaces the old monolithic admin.js
 */
(function() {
  'use strict';

  // Module loader - loads scripts in order
  const modules = [
    'js/admin/events.js',
    'js/admin/store.js',
    'js/admin/auth.js',
    'js/admin/toast.js',
    'js/admin/modal.js',
    'js/admin/navigation.js',
    'js/admin/shortcuts.js',
    'js/admin/product-form.js',
    'js/admin/index.js'
  ];

  function loadModule(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadAllModules() {
    for (const src of modules) {
      try {
        await loadModule(src);
        console.log(`[Admin] Loaded: ${src}`);
      } catch (err) {
        console.error(`[Admin] Failed to load ${src}:`, err);
      }
    }
    console.log('[Admin] All modules loaded');
  }

  // Auto-load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllModules);
  } else {
    loadAllModules();
  }

  // Export for manual loading
  window.AdminBundle = { loadAllModules, modules };
})();
