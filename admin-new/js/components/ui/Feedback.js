/**
 * DALLI Feedback & Overlay Component System
 * Mobile-first, accessible, SEO-optimized
 * Components: Modal, Drawer, Toast, Tooltip, Popover, Alert Banner, Confirmation Dialog, Loading Overlay, Progress Bar, Skeleton
 */

export class Feedback {
  static init() {
    this.initModals();
    this.initToasts();
    this.initTooltips();
    this.initPopovers();
    this.initAlertBanners();
    this.initConfirmationDialogs();
    this.initLoadingOverlays();
    this.initProgressBars();
    this.initSkeletons();
  }

  static initModals() {
    // Modal trigger handling
    document.querySelectorAll('[data-modal-trigger]').forEach(trigger => {
      const modalId = trigger.dataset.modalTrigger;
      const modal = document.getElementById(modalId);
      if (!modal) return;

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal(modal);
      });
    });

    // Close modal buttons
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        this.closeModal(modal);
      });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay);
        }
      });
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(this.closeModal);
      }
    });
  }

  static openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modal.setAttribute('aria-hidden', 'false');
    
    // Focus first focusable element
    setTimeout(() => {
      const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    }, 50);

    // Trap focus
    this.trapFocus(modal);
  }

  static closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    modal.setAttribute('aria-hidden', 'true');
  }

  static trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  // ============================================================
  // TOAST NOTIFICATIONS
  // ============================================================
  static initToasts() {
    // Create toast container if not exists
    if (!document.getElementById('toastContainer')) {
      const container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', 'Obaveštenja');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
  }

  static showToast(message, type = 'info', options = {}) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.47h16.94a2 2 0 0 0 1.71-3.47L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
      ${icons[type] || icons.info}
      <span>${message}</span>
      ${options.action ? `<button class="toast__action">${options.actionText || 'Akcija'}</button>` : ''}
      <button class="toast__close" aria-label="Zatvori">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    if (options.action) {
      toast.querySelector('.toast__action').addEventListener('click', () => {
        options.action();
        this.removeToast(toast);
      });
    }

    toast.querySelector('.toast__close').addEventListener('click', () => this.removeToast(toast));

    document.getElementById('toastContainer').appendChild(toast);

    // Auto-remove
    const duration = options.duration || 4000;
    setTimeout(() => this.removeToast(toast), duration);

    return toast;
  }

  static removeToast(toast) {
    toast.style.animation = 'slideInRight 0.3s ease-in reverse';
    setTimeout(() => toast.remove(), 300);
  }

  // ============================================================
  // TOOLTIPS
  // ============================================================
  static initTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
      const text = el.dataset.tooltip;
      const position = el.dataset.tooltipPosition || 'top';
      const delay = parseInt(el.dataset.tooltipDelay || '200', 10);

      let tooltip = null;
      let timeout = null;

      const show = () => {
        timeout = setTimeout(() => {
          const tooltipEl = document.createElement('div');
          tooltipEl.className = `tooltip tooltip--${tooltipPosition}`;
          tooltipEl.setAttribute('role', 'tooltip');
          tooltipEl.textContent = text;
          document.body.appendChild(tooltipEl);

          const rect = el.getBoundingClientRect();
          const tooltipRect = tooltipEl.getBoundingClientRect();

          let top, left;
          switch (position) {
            case 'top':
              top = rect.top - tooltipRect.height - 8;
              left = rect.left + rect.width / 2 - tooltipRect.width / 2;
              break;
            case 'bottom':
              top = rect.bottom + 8;
              left = rect.left + rect.width / 2 - tooltipRect.width / 2;
              break;
            case 'left':
              top = rect.top + rect.height / 2 - tooltipEl.offsetHeight / 2;
              left = rect.left - tooltipRect.width - 8;
              break;
            case 'right':
              top = rect.top + rect.height / 2 - tooltipEl.offsetHeight / 2;
              left = rect.right + 8;
              break;
          }

          tooltipEl.style.top = `${top + window.scrollY}px`;
          tooltipEl.style.left = `${left + window.scrollX}px`;
          tooltipEl.style.opacity = '1';
          tooltip = tooltipEl;
        }, delay);
      };

      const hide = () => {
        clearTimeout(timeout);
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      };

      el.addEventListener('mouseenter', show);
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focus', show);
      el.addEventListener('blur', hide);
      el.addEventListener('touchstart', show, { passive: true });
    });
  }

  // ============================================================
  // POPOVERS
  // ============================================================
  static initPopovers() {
    document.querySelectorAll('[data-popover]').forEach(trigger => {
      const popoverId = trigger.dataset.popover;
      const popover = document.getElementById(popoverId);
      if (!popover) return;

      let isOpen = false;

      const open = () => {
        popover.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        popover.setAttribute('aria-hidden', 'false');
        isOpen = true;
      };

      const close = () => {
        popover.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        isOpen = false;
      };

      const toggle = () => isOpen ? close() : open();

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!trigger.contains(e.target) && !popover.contains(e.target)) {
          popover.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });

      // Close on ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popover.classList.contains('open')) {
          popover.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  // ============================================================
  // ALERT BANNERS
  // ============================================================
  static initAlertBanners() {
    document.querySelectorAll('.alert-banner').forEach(banner => {
      const closeBtn = banner.querySelector('[data-alert-close]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          banner.style.animation = 'slideUp 0.3s ease-in reverse';
          setTimeout(() => banner.remove(), 300);
        });
      }

      // Auto-dismiss after duration
      const duration = parseInt(banner.dataset.autoDismiss || '0', 10);
      if (duration > 0) {
        setTimeout(() => {
          banner.style.animation = 'slideUp 0.3s ease-in reverse';
          setTimeout(() => banner.remove(), 300);
        }, duration);
      }
    });

    // Cookie banner handled separately
  }

  // ============================================================
  // CONFIRMATION DIALOGS
  // ============================================================
  static initConfirmationDialogs() {
    // Generic confirmation dialog
    window.confirmDialog = (options) => {
      return new Promise((resolve) => {
        const { title, message, confirmText = 'Potvrdi', cancelText = 'Otkaži', type = 'warning' } = options;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay modal-overlay--confirm open';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'confirmTitle');
        overlay.setAttribute('aria-describedby', 'confirmMessage');

        overlay.innerHTML = `
          <div class="modal-modern modal-modern--confirm" style="max-width: 400px;">
            <div class="modal-header">
              <h3 id="confirmTitle">${title}</h3>
            </div>
            <div class="modal-body">
              <p id="confirmMessage">${message}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn--secondary btn--block" data-action="cancel">${cancelText}</button>
              <button type="button" class="btn btn--${type === 'danger' ? 'danger' : 'primary'} btn--block" data-action="confirm">${confirmText}</button>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        const cleanup = () => {
          overlay.remove();
          document.body.style.overflow = '';
        };

        overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
          cleanup();
          resolve(true);
        });

        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
          cleanup();
          resolve(false);
        });

        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            cleanup();
            resolve(false);
          }
        });

        const handleEsc = (e) => {
          if (e.key === 'Escape') {
            cleanup();
            resolve(false);
            document.removeEventListener('keydown', handleEsc);
          }
        };
        document.addEventListener('keydown', handleEsc);
      });
    };
  }

  // ============================================================
  // LOADING OVERLAYS
  // ============================================================
  static initLoadingOverlays() {
    window.showLoading = (message = 'Učitavanje...') => {
      const overlay = document.createElement('div');
      overlay.className = 'loading-overlay open';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.setAttribute('aria-label', message);

      overlay.innerHTML = `
        <div class="loading-overlay__content">
          <div class="loading-spinner" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" stroke-dasharray="31.4 31.4">
                <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/>
              </path>
            </svg>
          </div>
          <p class="loading-overlay__message">${message}</p>
        </div>
      `;

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      return {
        hide: () => {
          overlay.remove();
          document.body.style.overflow = '';
        },
        updateMessage: (msg) => {
          overlay.querySelector('.loading-overlay__message').textContent = msg;
        }
      };
    };
  }

  // ============================================================
  // PROGRESS BARS
  // ============================================================
  static initProgressBars() {
    document.querySelectorAll('.progress-bar').forEach(bar => {
      const value = parseFloat(bar.dataset.value || '0');
      const max = parseFloat(bar.dataset.max || '100');
      const percentage = Math.min(100, Math.max(0, (value / max) * 100));

      bar.style.setProperty('--progress', `${percentage}%`);
      bar.style.setProperty('--progress-value', value);
      bar.style.setProperty('--progress-max', max);

      // Update method
      bar.update = (value) => {
        const pct = Math.min(100, Math.max(0, (value / max) * 100));
        bar.style.setProperty('--progress', `${pct}%`);
        bar.dataset.value = value;
      };
    });
  }

  // ============================================================
  // SKELETON LOADERS
  // ============================================================
  static initSkeletons() {
    // Skeleton animations handled by CSS
    // This method can be used to programmatically show/hide skeletons
    window.showSkeleton = (container, variant = 'product', count = 4) => {
      const containerEl = typeof container === 'string' ? document.getElementById(container) : container;
      if (!containerEl) return;

      containerEl.innerHTML = '';
      containerEl.className = 'product-grid skeleton-grid';
      containerEl.setAttribute('role', 'list');
      containerEl.setAttribute('aria-label', 'Učitavanje...');

      for (let i = 0; i < (variant === 'stats' ? 4 : 8); i++) {
        const card = document.createElement('article');
        card.className = `card card--skeleton`;
        card.setAttribute('role', 'listitem');
        card.setAttribute('aria-hidden', 'true');
        card.innerHTML = `
          <div class="skeleton-card">
            <div class="skeleton-card__media"></div>
            <div class="skeleton-card__content">
              <div class="skeleton-card__line skeleton-card__line--title"></div>
              <div class="skeleton-card__line skeleton-card__line--text"></div>
              <div class="skeleton-card__line skeleton-card__line--short"></div>
              <div class="skeleton-card__line skeleton-card__line--short"></div>
            </div>
          </div>
        `;
        card.setAttribute('role', 'listitem');
        card.setAttribute('aria-hidden', 'true');
        containerEl.appendChild(card);
      }
    };
  }

  // ============================================================
  // GLOBAL EXPORTS
  // ============================================================
  static showToast(message, type = 'info', options = {}) {
    return this.showToast(message, type, options);
  }

  static confirmDialog(options) {
    return window.confirmDialog(options);
  }

  static showLoading(message) {
    return window.showLoading(message);
  }

  static showSkeleton(container, variant, count) {
    window.showSkeleton(container, variant, count);
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Feedback.init());
} else {
  Feedback.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Feedback };
}

if (typeof window !== 'undefined') {
  window.Feedback = Feedback;
}