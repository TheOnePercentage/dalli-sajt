import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class Modal extends Component {
  constructor(options = {}) {
    super(options);
    this.title = options.title || '';
    this.size = options.size || 'md';
    this._open = options.open || false;
    this.closable = options.closable !== false;
    this.closeOnOverlay = options.closeOnOverlay !== false;
    this.closeOnEscape = options.closeOnEscape !== false;
    this.children = options.children || '';
    this.footer = options.footer;
    this.onClose = options.onClose;
    this.onOpen = options.onOpen;
    this.id = options.id || ImperiumUtils.generateId('modal-');
    this._focusedElementBeforeOpen = null;
  }

  render() {
    const sizeClasses = {
      sm: 'modal-sm',
      md: 'modal-md',
      lg: 'modal-lg',
      xl: 'modal-xl',
      full: 'modal-full',
    };

    const modalClasses = ['modal', sizeClasses[this.size] || ''].filter(Boolean).join(' ');
    const overlayClasses = ['modal-overlay', this._open ? 'open' : ''].filter(Boolean).join(' ');

    const headerHtml =
      this.title || this.closable
        ? `
      <div class="modal-header">
        <h2 class="modal-title" id="${this.id}-title">${ImperiumUtils.escapeHtml(this.title)}</h2>
        ${
          this.closable
            ? `
          <button class="modal-close" aria-label="Zatvori modal" data-action="close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        `
            : ''
        }
      </div>
    `
        : '';

    const footerHtml = this.footer
      ? `
      <div class="modal-footer">
        ${this.footer}
      </div>
    `
      : '';

    return `
      <div class="${overlayClasses}" id="${this.id}-overlay" role="dialog" aria-modal="true" aria-labelledby="${this.title ? this.id + '-title' : ''}" ${!this._open ? 'hidden' : ''}>
        <div class="${modalClasses}" id="${this.id}-modal" role="document">
          ${headerHtml}
          <div class="modal-body" data-ref="body">
            ${this.children}
          </div>
          ${footerHtml}
        </div>
      </div>
    `;
  }

  onMount() {
    if (this._open) {
      this._doOpen();
    }
  }

  bindEvents() {
    super.bindEvents();
    this.on('click', '[data-action="close"]', () => this.close());

    if (this.closeOnOverlay) {
      this.on('click', e => {
        if (e.target === this.element) this.close();
      });
    }

    if (this.closeOnEscape) {
      if (this._escapeHandler) {
        document.removeEventListener('keydown', this._escapeHandler);
      }
      this._escapeHandler = e => {
        if (e.key === 'Escape' && this._open) this.close();
      };
      document.addEventListener('keydown', this._escapeHandler);
    }
  }

  onUnmount() {
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
    }
    this._restoreFocus();
    ImperiumUtils.unlockBodyScroll();
  }

  _doOpen() {
    this._focusedElementBeforeOpen = document.activeElement;
    this._open = true;
    this.setState({ open: true });
    ImperiumUtils.lockBodyScroll();

    requestAnimationFrame(() => {
      const focusable = this.element?.querySelector(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();

      // Defer onOpen to ensure DOM is fully updated
      if (this.onOpen) this.onOpen();
      this.emit('open');
    });
  }

  _doClose() {
    this._open = false;
    this.setState({ open: false });
    ImperiumUtils.unlockBodyScroll();
    this._restoreFocus();

    if (this.onClose) this.onClose();
    this.emit('close');
  }

  _restoreFocus() {
    if (
      this._focusedElementBeforeOpen &&
      typeof this._focusedElementBeforeOpen.focus === 'function'
    ) {
      this._focusedElementBeforeOpen.focus();
    }
  }

  open(options = null) {
    if (options && typeof options === 'object' && Object.keys(options).length) {
      if ('title' in options) this.title = options.title || '';
      if ('size' in options) this.size = options.size || 'md';
      if ('children' in options) this.children = options.children || '';
      else if ('content' in options) this.children = options.content || '';
      if ('footer' in options) this.footer = options.footer;
      if ('onClose' in options) this.onClose = options.onClose;
      if ('onOpen' in options) this.onOpen = options.onOpen;
      if ('closable' in options) this.closable = options.closable !== false;
      if ('closeOnOverlay' in options) this.closeOnOverlay = options.closeOnOverlay !== false;
      if ('closeOnEscape' in options) this.closeOnEscape = options.closeOnEscape !== false;
      if (this.mounted) this.update();
    }
    if (!this._open) this._doOpen();
  }

  close() {
    if (this._open) this._doClose();
  }

  toggle() {
    this._open ? this.close() : this.open();
  }

  setContent(content) {
    this.children = content;
    this.setState({ children: content });
  }

  setTitle(title) {
    this.title = title;
    this.setState({ title });
  }

  setFooter(footer) {
    this.footer = footer;
    this.setState({ footer });
  }
}

export class Toast extends Component {
  constructor(options = {}) {
    super(options);
    this.message = options.message || '';
    this.type = options.type || 'info';
    this.title = options.title;
    this.duration = options.duration || 5000;
    this.closable = options.closable !== false;
    this.action = options.action;
    this.onClose = options.onClose;
    this.id = options.id || ImperiumUtils.generateId('toast-');
    this._timeout = null;
  }

  render() {
    const typeClasses = {
      success: 'toast-success',
      error: 'toast-error',
      warning: 'toast-warning',
      info: 'toast-info',
    };

    const classes = ['toast', typeClasses[this.type] || ''].filter(Boolean).join(' ');

    const iconHtml = this.renderIcon();
    const titleHtml = this.title
      ? `<div class="toast-title">${ImperiumUtils.escapeHtml(this.title)}</div>`
      : '';
    const actionHtml = this.action
      ? `
      <button class="toast-action btn btn-sm btn-ghost" data-action="action">
        ${ImperiumUtils.escapeHtml(this.action.label)}
      </button>
    `
      : '';
    const closeHtml = this.closable
      ? `
      <button class="toast-close" aria-label="Zatvori" data-action="close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `
      : '';

    return `
      <div class="${classes}" id="${this.id}" role="alert" aria-live="polite">
        <div class="toast-icon" aria-hidden="true">${iconHtml}</div>
        <div class="toast-content">
          ${titleHtml}
          <div class="toast-message">${ImperiumUtils.escapeHtml(this.message)}</div>
          ${actionHtml}
        </div>
        ${closeHtml}
        <div class="toast-progress" style="--toast-duration: ${this.duration}ms" aria-hidden="true"></div>
      </div>
    `;
  }

  renderIcon() {
    const icons = {
      success:
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      error:
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning:
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };
    return icons[this.type] || icons.info;
  }

  onMount() {
    if (this.duration > 0) {
      this._timeout = setTimeout(() => this.close(), this.duration);
    }
    requestAnimationFrame(() => {
      this.setState({ visible: true });
    });
  }

  onUnmount() {
    if (this._timeout) clearTimeout(this._timeout);
  }

  bindEvents() {
    super.bindEvents();
    this.on('click', '[data-action="close"]', () => this.close());
    this.on('click', '[data-action="action"]', e => {
      if (this.action?.onClick) this.action.onClick(e);
      this.close();
    });
  }

  close() {
    this.setState({ visible: false });
    setTimeout(() => {
      this.unmount();
      if (this.onClose) this.onClose();
      this.emit('close');
    }, 300);
  }
}

export class ToastContainer extends Component {
  constructor(options = {}) {
    super(options);
    this.position = options.position || 'bottom-right';
    this.maxToasts = options.maxToasts || 5;
    this.toasts = new Map();
  }

  render() {
    const positionClasses = {
      'top-left': 'toast-container-top-left',
      'top-right': 'toast-container-top-right',
      'bottom-left': 'toast-container-bottom-left',
      'bottom-right': 'toast-container-bottom-right',
      'top-center': 'toast-container-top-center',
      'bottom-center': 'toast-container-bottom-center',
    };

    return `
      <div class="toast-container ${positionClasses[this.position] || ''}" id="toast-container" aria-live="polite" aria-label="Obaveštenja"></div>
    `;
  }

  show(options) {
    const toast = new Toast({
      ...options,
      onClose: () => {
        this.toasts.delete(toast.id);
        options.onClose?.();
      },
    });

    this.toasts.set(toast.id, toast);

    if (this.toasts.size > this.maxToasts) {
      const oldestId = this.toasts.keys().next().value;
      this.toasts.get(oldestId)?.close();
    }

    toast.mount(this.ref('container') || this.element);
    return toast;
  }

  success(message, options = {}) {
    return this.show({ ...options, message, type: 'success' });
  }

  error(message, options = {}) {
    return this.show({ ...options, message, type: 'error' });
  }

  warning(message, options = {}) {
    return this.show({ ...options, message, type: 'warning' });
  }

  info(message, options = {}) {
    return this.show({ ...options, message, type: 'info' });
  }

  clear() {
    this.toasts.forEach(toast => toast.close());
    this.toasts.clear();
  }
}
