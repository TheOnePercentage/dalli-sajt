/**
 * ModalManager - Modal lifecycle management for admin panel
 * Handles modal stack, focus trap, open/close, ESC handler, aria attributes
 */
(function() {
  'use strict';

  function getEventBus() {
    return window.AdminEventBus;
  }

  function getStore() {
    return window.AdminStore;
  }

  function emit(event, data) {
    const bus = getEventBus();
    if (bus) bus.emit(event, data);
  }

  class ModalManager {
    constructor() {
      this._stack = [];
      this._initialized = false;
      this._escapeHandler = this._onEscape.bind(this);
      this._focusHandler = this._onFocus.bind(this);
    }

    init() {
      if (this._initialized) return;
      
      const bus = window.AdminEventBus;
      if (bus) {
        bus.on('modal:open', ({ modalId, options }) => this.open(modalId, options));
        bus.on('modal:close', ({ modalId }) => this.close(modalId));
        bus.on('modal:closeAll', () => this.closeAll());
      }

      document.addEventListener('keydown', this._escapeHandler);
      this._initialized = true;
    }

    open(modalId, options = {}) {
      const modal = document.getElementById(modalId);
      if (!modal) {
        console.warn('Modal "' + modalId + '" not found');
        return false;
      }

      document.body.style.overflow = 'hidden';
      document.body.setAttribute('data-modal-open', 'true');

      const previousFocus = document.activeElement;

      this._stack.push({
        id: modalId,
        element: modal,
        previousFocus: previousFocus,
        options: {
          closeOnOverlayClick: options.closeOnOverlayClick !== false,
          closeOnEscape: options.closeOnEscape !== false,
          focusTrap: options.focusTrap !== false,
          ...options,
        },
      });

      modal.classList.add('open');
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      if (this._stack.length === 1) {
        document.addEventListener('focusin', this._focusHandler);
      }

      setTimeout(() => {
        const focusable = modal.querySelector(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) {
          focusable.focus();
        } else {
          modal.focus();
        }
      }, 0);

      if (this._stack[this._stack.length - 1].options.closeOnOverlayClick) {
        modal.addEventListener('click', this._onOverlayClick.bind(this, modalId));
      }

      const store = window.AdminStore;
      if (store) {
        const modals = { ...store.get('ui.modals'), [modalId]: { open: true, data: options.data } };
        store.set('ui.modals', modals);
      }

      emit('modal:open', { modalId, options });
      return true;
    }

    close(modalId) {
      const index = this._stack.findIndex(m => m.id === modalId);
      if (index === -1) return false;

      const modalData = this._stack[index];
      const modal = modalData.element;

      modal.removeEventListener('click', this._onOverlayClick.bind(this, modalId));

      modal.classList.remove('open');
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');

      this._stack.splice(index, 1);

      if (modalData.previousFocus && document.body.contains(modalData.previousFocus)) {
        modalData.previousFocus.focus();
      }

      if (this._stack.length === 0) {
        document.body.style.overflow = '';
        document.body.removeAttribute('data-modal-open');
        document.removeEventListener('focusin', this._focusHandler);
      }

      const store = window.AdminStore;
      if (store) {
        const modals = { ...store.get('ui.modals') };
        delete modals[modalId];
        store.set('ui.modals', modals);
      }

      emit('modal:close', { modalId });
      return true;
    }

    closeAll() {
      while (this._stack.length > 0) {
        this.close(this._stack[this._stack.length - 1].id);
      }
    }

    getTopModal() {
      return this._stack[this._stack.length - 1] || null;
    }

    isAnyOpen() {
      return this._stack.length > 0;
    }

    getCount() {
      return this._stack.length;
    }

    // Programmatic confirmation dialog
    confirm(options = {}) {
      return new Promise((resolve) => {
        const {
          title = 'Potvrda',
          message = 'Da li ste sigurni?',
          confirmText = 'Da',
          cancelText = 'Ne',
          variant = 'danger',
          onConfirm,
          onCancel
        } = options;

        const template = document.getElementById('modalTemplate');
        if (!template) {
          console.error('Modal template not found');
          resolve(false);
          return;
        }

        const modalEl = template.content.firstElementChild.cloneNode(true);
        const overlay = modalEl;
        const modal = modalEl.querySelector('.modal');
        const titleEl = modalEl.querySelector('.modal-title');
        const bodyEl = modalEl.querySelector('#modalBody');
        const footerEl = modalEl.querySelector('#modalFooter');
        const closeBtn = modalEl.querySelector('.modal-close');

        if (titleEl) {
          const span = titleEl.querySelector('span');
          if (span) span.remove();
          titleEl.insertAdjacentHTML('beforeend', ' ' + title);
        }
        if (bodyEl) bodyEl.innerHTML = '<p style="margin: 0; color: var(--color-text-secondary);">' + message + '</p>';

        if (footerEl) {
          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'btn btn-secondary';
          cancelBtn.textContent = cancelText;
          cancelBtn.addEventListener('click', () => {
            this.close(overlay.id);
            resolve(false);
            onCancel?.();
          });

          const confirmBtn = document.createElement('button');
          confirmBtn.type = 'button';
          confirmBtn.className = 'btn btn-' + variant;
          confirmBtn.textContent = confirmText;
          confirmBtn.addEventListener('click', () => {
            this.close(overlay.id);
            resolve(true);
            onConfirm?.();
          });

          footerEl.appendChild(cancelBtn);
          footerEl.appendChild(confirmBtn);
        }

        const modalId = 'confirm-modal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        overlay.id = modalId;

        document.body.appendChild(overlay);

        this._stack.push({
          id: modalId,
          element: overlay,
          previousFocus: document.activeElement,
          options: {
            closeOnOverlayClick: true,
            closeOnEscape: true,
            focusTrap: true,
          },
        });

        overlay.classList.add('open');
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        setTimeout(() => {
          const cancelBtn = footerEl?.querySelector('.btn-secondary');
          if (cancelBtn) cancelBtn.focus();
        }, 0);

        const originalClose = this.close.bind(this);
        this.close = function(id) {
          if (id === modalId) {
            resolve(false);
            onCancel?.();
          }
          return originalClose.apply(this, arguments);
        };
      });
    }

    _onEscape(e) {
      if (e.key === 'Escape' && this._stack.length > 0) {
        const topModal = this._stack[this._stack.length - 1];
        if (topModal.options.closeOnEscape) {
          e.preventDefault();
          this.close(topModal.id);
        }
      }
    }

    _onFocus(e) {
      if (this._stack.length === 0) return;
      
      const topModal = this._stack[this._stack.length - 1];
      if (!topModal.options.focusTrap) return;

      const modal = topModal.element;
      const focusableElements = modal.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.target === lastElement && !e.shiftKey) {
        e.preventDefault();
        firstElement.focus();
      } else if (e.target === firstElement && e.shiftKey) {
        e.preventDefault();
        lastElement.focus();
      }
    }

    _onOverlayClick(modalId, e) {
      if (e.target === e.currentTarget) {
        this.close(modalId);
      }
    }

    closeAll() {
      while (this._stack.length > 0) {
        this.close(this._stack[this._stack.length - 1].id);
      }
    }

    getTopModal() {
      return this._stack[this._stack.length - 1] || null;
    }

    isAnyOpen() {
      return this._stack.length > 0;
    }

    getCount() {
      return this._stack.length;
    }

    destroy() {
      this.closeAll();
      document.removeEventListener('keydown', this._escapeHandler);
      document.removeEventListener('focusin', this._focusHandler);
      this._stack = [];
      this._initialized = false;
    }
  }

  window.ModalManager = new ModalManager();
})();
