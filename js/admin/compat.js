/**
 * Backward Compatibility Layer
 * Exposes legacy global functions for code that depends on old admin.js globals
 */
(function() {
  'use strict';

  function getEventBus() {
    return window.AdminEventBus;
  }

  function getStore() {
    return window.AdminStore;
  }

  function getAuth() {
    return window.AuthManager;
  }

  function getToast() {
    return window.ToastManager;
  }

  function getModal() {
    return window.ModalManager;
  }

  function getNavigation() {
    return window.NavigationController;
  }

  // Backward-compatible global functions
  window.showToast = function(message, type = 'success', duration = 4000) {
    const toast = getToast();
    if (toast && toast._initialized) {
      return toast.show(message, type, duration);
    }
    // Fallback if ToastManager not ready
    const container = document.getElementById('toastContainer');
    if (container) {
      const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span><button class="toast-close" aria-label="Zatvori">&times;</button>`;
      container.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
    }
  };

  window.openModal = function(modalId) {
    const modal = getModal();
    if (modal && modal._initialized) {
      return modal.open(modalId);
    }
    // Fallback
    const overlay = document.getElementById(modalId);
    if (overlay) {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      const focusable = overlay.querySelector('input, select, button, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }
  };

  window.closeModal = function(modalId) {
    const modal = getModal();
    if (modal && modal._initialized) {
      return modal.close(modalId);
    }
    // Fallback
    const overlay = document.getElementById(modalId);
    if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  window.toggleAdminMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('adminDropdownMenu');
    const btn = document.getElementById('adminDropdownBtn');
    if (menu && btn) {
      const isOpen = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
    }
  };

  window.selectAdminTab = function(tabName) {
    const nav = window.NavigationController;
    if (nav && nav._initialized) {
      return nav.switchTab(tabName);
    }
    // Fallback
    const menu = document.getElementById('adminDropdownMenu');
    const btn = document.getElementById('adminDropdownBtn');
    if (menu) menu.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    
    if (typeof switchTab === 'function') {
      switchTab(tabName);
    } else {
      document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
      const tab = document.querySelector(`.admin-tab[data-tab="${tabName}"]`);
      const panel = document.getElementById(`tab-${tabName}`);
      if (tab && panel) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        panel.classList.add('active');
        panel.hidden = false;
      }
    }
  };

  // Export for manual init
  window.AdminCompat = {
    init: function() {
      console.log('[AdminCompat] Backward compatibility layer initialized');
    }
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AdminCompat.init());
  } else {
    window.AdminCompat.init();
  }
})();
