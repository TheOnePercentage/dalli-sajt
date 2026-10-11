/**
 * AdminStore - Centralized state management for admin panel
 * Single source of truth for auth, config, UI state, and data
 */
(function() {
  'use strict';

  const eventBus = window.AdminEventBus;
  const Events = window.AdminEvents;

  // Initial state
  const initialState = {
    auth: {
      isAuthenticated: false,
      user: null,
      role: null,
      employeeId: null,
      employeeName: null,
      token: null,
    },
    config: {
      theme: 'light',
      language: 'sr',
      autoRefresh: true,
      refreshInterval: 30000,
    },
    ui: {
      activeTab: 'orders',
      sidebarOpen: true,
      modals: {},
      toasts: [],
      loading: false,
      dirtyForms: new Set(),
    },
    data: {
      orders: [],
      complaints: [],
      ads: [],
      employees: [],
      products: [],
      customers: [],
      trash: [],
      analytics: {},
      settings: {},
    },
    permissions: {},
    formState: {},
  };

  // Deep clone utility
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Path accessor
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
    target[last] = value;
  }

  class AdminStore {
    constructor() {
      this._state = deepClone(initialState);
      this._subscribers = new Set();
      this._devTools = window.__ADMIN_STORE_DEVTOOLS__ || false;
    }

    // Get current state (immutable)
    getState() {
      return deepClone(this._state);
    }

    // Get nested value by path
    get(path) {
      return getPath(this._state, path);
    }

    // Set nested value by path
    set(path, value) {
      const oldValue = getPath(this._state, path);
      if (oldValue === value) return false;

      setPath(this._state, path, value);
      this._notify(path, value, oldValue);
      return true;
    }

    // Update multiple paths at once (batch)
    patch(updates) {
      let changed = false;
      Object.entries(updates).forEach(([path, value]) => {
        if (this.set(path, value)) changed = true;
      });
      return changed;
    }

    // Subscribe to changes
    subscribe(callback) {
      this._subscribers.add(callback);
      return () => this._subscribers.delete(callback);
    }

    _notify(path, newValue, oldValue) {
      this._subscribers.forEach(cb => {
        try {
          cb({ path, newValue, oldValue, state: this.getState() });
        } catch (err) {
          console.error('Store subscriber error:', err);
        }
      });

      // Emit event for EventBus integration
      if (eventBus) {
        eventBus.emit('store:changed', { path, newValue, oldValue });
      }
    }

    // Auth helpers
    get auth() {
      return this.get('auth');
    }

    setAuth(authData) {
      this.patch({
        'auth.isAuthenticated': true,
        'auth.user': authData.user,
        'auth.role': authData.role,
        'auth.employeeId': authData.employeeId || null,
        'auth.employeeName': authData.employeeName || null,
      });
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.AUTH_LOGIN, authData);
      }
    }

    logout() {
      const role = this.get('auth.role');
      this.patch({
        'auth.isAuthenticated': false,
        'auth.user': null,
        'auth.role': null,
        'auth.employeeId': null,
        'auth.employeeName': null,
        'ui.activeTab': 'orders',
      });
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.AUTH_LOGOUT, { role });
      }
    }

    // UI helpers
    setActiveTab(tab) {
      this.set('ui.activeTab', tab);
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.NAV_TAB_CHANGED, { tab });
      }
    }

    getActiveTab() {
      return this.get('ui.activeTab');
    }

    // Toast helpers
    addToast(message, type = 'info', duration = 4000) {
      const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const toast = { id, message, type, duration, timestamp: Date.now() };
      const toasts = [...this.get('ui.toasts'), toast];
      this.set('ui.toasts', toasts);
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.TOAST_SHOW, toast);
      }
      return id;
    }

    removeToast(id) {
      const toasts = this.get('ui.toasts').filter(t => t.id !== id);
      this.set('ui.toasts', toasts);
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.TOAST_HIDE, { id });
      }
    }

    // Modal helpers
    openModal(modalId, data = {}) {
      const modals = { ...this.get('ui.modals'), [modalId]: { open: true, data } };
      this.set('ui.modals', modals);
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.MODAL_OPEN, { modalId, data });
      }
    }

    closeModal(modalId) {
      const modals = { ...this.get('ui.modals') };
      delete modals[modalId];
      this.set('ui.modals', modals);
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.MODAL_CLOSE, { modalId });
      }
    }

    closeAllModals() {
      this.set('ui.modals', {});
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.MODAL_CLOSE_ALL);
      }
    }

    // Form dirty tracking
    markFormDirty(formId) {
      const dirty = new Set(this.get('ui.dirtyForms'));
      dirty.add(formId);
      this.set('ui.dirtyForms', dirty);
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.FORM_DIRTY, { formId });
      }
    }

    markFormClean(formId) {
      const dirty = new Set(this.get('ui.dirtyForms'));
      dirty.delete(formId);
      this.set('ui.dirtyForms', dirty);
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(window.AdminEvents.FORM_CLEAN, { formId });
      }
    }

    isFormDirty(formId) {
      return this.get('ui.dirtyForms').has(formId);
    }

    hasDirtyForms() {
      return this.get('ui.dirtyForms').size > 0;
    }

    // Data helpers
    setData(key, value) {
      this.set(`data.${key}`, value);
      if (window.AdminEventBus) {
        window.AdminEventBus.emit(`data:${key}Changed`, value);
      }
    }

    getData(key) {
      return this.get(`data.${key}`);
    }

    // Config helpers
    setConfig(key, value) {
      this.set(`config.${key}`, value);
    }

    getConfig(key) {
      return this.get(`config.${key}`);
    }

    // Reset store to initial state
    reset() {
      this._state = deepClone(initialState);
      this._subscribers.forEach(cb => {
        try {
          cb({ path: '*', newValue: this.getState(), oldValue: null, state: this.getState() });
        } catch (err) {
          console.error('Store subscriber error:', err);
        }
      });
    }
  }

  // Export singleton
  window.AdminStore = new AdminStore();

  // DevTools helper
  if (typeof window !== 'undefined') {
    window.__ADMIN_STORE__ = window.AdminStore;
  }
})();
