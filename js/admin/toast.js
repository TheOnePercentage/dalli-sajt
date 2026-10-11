/**
 * ToastManager - Notification queue for admin panel
 * Handles toast display, queue management, timing, dismissal
 */
(function() {
  'use strict';

  const DEFAULT_DURATION = 4000;
  const MAX_TOASTS = 5;
  const ANIMATION_DURATION = 300;

  function getEventBus() {
    return window.AdminEventBus;
  }

  function getStore() {
    return window.AdminStore;
  }

  function getEvents() {
    return window.AdminEvents;
  }

  function emit(event, data) {
    const bus = getEventBus();
    if (bus) bus.emit(event, data);
  }

  const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
  };

  const ICONS = {
    [TOAST_TYPES.SUCCESS]: '✅',
    [TOAST_TYPES.ERROR]: '❌',
    [TOAST_TYPES.WARNING]: '⚠️',
    [TOAST_TYPES.INFO]: 'ℹ️',
  };

  class ToastManager {
    constructor() {
      this._container = null;
      this._toasts = new Map(); // id -> toast element
      this._queue = []; // pending toasts when container not ready
      this._initialized = false;
    }

    // Initialize toast container
    init() {
      if (this._initialized) return;
      
      this._container = document.getElementById('toastContainer');
      if (!this._container) {
        // Create container if not exists
        this._container = document.createElement('div');
        this._container.id = 'toastContainer';
        this._container.className = 'toast-container';
        this._container.setAttribute('role', 'region');
        this._container.setAttribute('aria-label', 'Obaveštenja');
        this._container.setAttribute('aria-live', 'polite');
        document.body.appendChild(this._container);
      }

      // Process queued toasts
      this._queue.forEach(toast => this._showToast(toast));
      this._queue = [];

      // Subscribe to store toast events
      const store = window.AdminStore;
      if (store) {
        store.subscribe(({ path, newValue }) => {
          if (path === 'ui.toasts') {
            this._syncWithStore(newValue);
          }
        });
      }

      // Listen for EventBus toast events
      const bus = window.AdminEventBus;
      if (bus) {
        bus.on('toast:show', (toast) => this.show(toast.message, toast.type, toast.duration, toast.id));
        bus.on('toast:hide', ({ id }) => this.hide(id));
      }

      this._initialized = true;
    }

    // Show a toast notification
    show(message, type = 'info', duration = DEFAULT_DURATION, customId = null) {
      if (!this._initialized) {
        this.init();
      }

      // If container not ready, queue it
      if (!this._container || !document.body.contains(this._container)) {
        this._queue.push({ message, type, duration, id: customId });
        return customId || 'pending-' + Date.now();
      }

      return this._showToast({ message, type, duration, id: customId });
    }

    // Internal show implementation
    _showToast({ message, type = 'info', duration = DEFAULT_DURATION, id = null }) {
      // Enforce max toasts limit
      if (this._toasts.size >= MAX_TOASTS) {
        const oldestId = this._toasts.keys().next().value;
        this.hide(oldestId);
      }

      const toastId = id || 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const icon = ICONS[type] || ICONS[TOAST_TYPES.INFO];

      const toast = document.createElement('div');
      toast.id = toastId;
      toast.className = `toast ${type}`;
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
      toast.innerHTML = `
        <span class="toast-icon" aria-hidden="true">${icon}</span>
        <span class="toast-message">${this._escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Zatvori" type="button">&times;</button>
      `;

      // Close button handler
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.hide(toastId));

      // Auto-dismiss
      let dismissTimer = null;
      if (duration > 0) {
        dismissTimer = setTimeout(() => this.hide(toastId), duration);
      }

      // Pause timer on hover
      toast.addEventListener('mouseenter', () => {
        if (dismissTimer) clearTimeout(dismissTimer);
      });
      toast.addEventListener('mouseleave', () => {
        if (duration > 0) {
          dismissTimer = setTimeout(() => this.hide(toastId), duration);
        }
      });

      // Add to container (newest on top)
      this._container.insertBefore(toast, this._container.firstChild);
      this._toasts.set(toastId, { element: toast, timer: dismissTimer });

      // Trigger animation
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });

      // Update store
      const store = window.AdminStore;
      if (store) {
        const toasts = store.get('ui.toasts') || [];
        store.set('ui.toasts', [...toasts, { id: toastId, message, type, duration, timestamp: Date.now() }]);
      }

      emit('toast:show', { id: toastId, message, type, duration });

      return toastId;
    }

    // Hide a specific toast
    hide(id) {
      const toastData = this._toasts.get(id);
      if (!toastData) return false;

      const { element, timer } = toastData;
      if (timer) clearTimeout(timer);

      element.classList.remove('show');
      element.classList.add('hide');

      setTimeout(() => {
        if (element.parentNode) element.parentNode.removeChild(element);
        this._toasts.delete(id);
        
        // Update store
        const store = window.AdminStore;
        if (store) {
          const toasts = (store.get('ui.toasts') || []).filter(t => t.id !== id);
          store.set('ui.toasts', toasts);
        }
        
        emit('toast:hide', { id });
      }, ANIMATION_DURATION);

      return true;
    }

    // Hide all toasts
    hideAll() {
      this._toasts.forEach((_, id) => this.hide(id));
    }

    // Get current toast count
    getCount() {
      return this._toasts.size;
    }

    // Sync with store (for cross-tab updates)
    _syncWithStore(toasts) {
      const currentIds = new Set(this._toasts.keys());
      const storeIds = new Set(toasts.map(t => t.id));

      // Remove toasts not in store
      currentIds.forEach(id => {
        if (!storeIds.has(id)) this.hide(id);
      });

      // Add toasts from store not in DOM
      toasts.forEach(toast => {
        if (!this._toasts.has(toast.id)) {
          this._showToast(toast);
        }
      });
    }

    // HTML escape utility
    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Convenience methods
    success(message, duration) { return this.show(message, TOAST_TYPES.SUCCESS, duration); }
    error(message, duration) { return this.show(message, TOAST_TYPES.ERROR, duration); }
    warning(message, duration) { return this.show(message, TOAST_TYPES.WARNING, duration); }
    info(message, duration) { return this.show(message, TOAST_TYPES.INFO, duration); }
  }

  // Export singleton
  window.ToastManager = new ToastManager();
})();
