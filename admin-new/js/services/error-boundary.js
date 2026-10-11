/**
 * Global Error Boundary - Centralized error handling with retry UI
 * Catches unhandled errors, API failures, and provides recovery options
 */

import { ImperiumUtils } from '../utils/helpers.js';

class ErrorBoundary {
  constructor(options = {}) {
    this.options = {
      onError: options.onError || (() => {}),
      showToast: options.showToast !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };

    this.errorQueue = [];
    this.retryAttempts = new Map();
    this.isHandlingError = false;
    this.init();
  }

  init() {
    window.addEventListener('error', (event) => this.handleError(event.error, 'global'));
    window.addEventListener('unhandledrejection', (event) => this.handleError(event.reason, 'promise'));

    if (typeof window !== 'undefined') {
      this.createErrorContainer();
    }
  }

  createErrorContainer() {
    if (document.getElementById('error-boundary-container')) return;

    const container = document.createElement('div');
    container.id = 'error-boundary-container';
    container.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  handleError(error, source = 'unknown') {
    if (this.isHandlingError) return;
    this.isHandlingError = true;

    const errorInfo = {
      id: Date.now() + Math.random(),
      message: error?.message || String(error),
      stack: error?.stack,
      source,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      retryCount: 0
    };

    console.error('[ErrorBoundary]', errorInfo);

    this.errorQueue.push(errorInfo);
    this.options.onError(errorInfo);

    if (this.options.showToast) {
      this.showErrorToast(errorInfo);
    }

    this.isHandlingError = false;
  }

  showErrorToast(errorInfo) {
    const container = document.getElementById('error-boundary-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = `
      background: var(--color-error);
      color: var(--color-error-contrast);
      padding: var(--space-4);
      margin-bottom: var(--space-2);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      pointer-events: auto;
      animation: slideInRight 0.3s ease;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    `;

    const isRetryable = this.isRetryableError(errorInfo);
    const retryKey = `${errorInfo.source}:${errorInfo.message}`;
    const attempts = this.retryAttempts.get(retryKey) || 0;

    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: var(--space-3);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: var(--font-semibold); font-size: var(--text-sm);">
            ${ImperiumUtils.escapeHtml(errorInfo.message)}
          </div>
          <div style="font-size: var(--text-xs); opacity: 0.8; margin-top: 2px;">
            ${errorInfo.source} • ${new Date(errorInfo.timestamp).toLocaleTimeString()}
          </div>
        </div>
        <button class="error-toast-dismiss" style="
          background: none; border: none; color: inherit; padding: 4px;
          cursor: pointer; opacity: 0.7; flex-shrink: 0;
        " aria-label="Zatvori">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      ${isRetryable && attempts < this.options.maxRetries ? `
        <div style="display: flex; gap: var(--space-2); padding-top: var(--space-2); border-top: 1px solid rgba(255,255,255,0.2);">
          <button class="error-toast-retry" style="
            flex: 1; padding: var(--space-2) var(--space-3);
            background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);
            color: inherit; border-radius: var(--radius-md); font-size: var(--text-sm);
            cursor: pointer; transition: background 0.2s;
          ">Pokušaj ponovo (${attempts + 1}/${this.options.maxRetries})</button>
          <button class="error-toast-ignore" style="
            padding: var(--space-2) var(--space-3);
            background: transparent; border: 1px solid rgba(255,255,255,0.3);
            color: inherit; border-radius: var(--radius-md); font-size: var(--text-sm);
            cursor: pointer;
          ">Ignoriši</button>
        </div>
      ` : ''}
    `;

    container.appendChild(toast);

    toast.querySelector('.error-toast-dismiss')?.addEventListener('click', () => this.dismissToast(toast));
    toast.querySelector('.error-toast-retry')?.addEventListener('click', () => this.retryError(errorInfo, toast));
    toast.querySelector('.error-toast-ignore')?.addEventListener('click', () => this.dismissToast(toast));

    setTimeout(() => this.dismissToast(toast), 10000);
  }

  isRetryableError(errorInfo) {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /fetch/i,
      /connection/i,
      /5\d{2}/,
      /429/,
      /408/,
      /econnrefused/i,
      /enotfound/i
    ];
    return retryablePatterns.some(p => p.test(errorInfo.message));
  }

  async retryError(errorInfo, toastElement) {
    const retryKey = `${errorInfo.source}:${errorInfo.message}`;
    const attempts = (this.retryAttempts.get(retryKey) || 0) + 1;
    this.retryAttempts.set(retryKey, attempts);

    toastElement.querySelector('.error-toast-retry').disabled = true;
    toastElement.querySelector('.error-toast-retry').textContent = 'Pokušavam...';

    await new Promise(r => setTimeout(r, this.options.retryDelay * attempts));

    this.dismissToast(toastElement);

    if (attempts >= this.options.maxRetries) {
      this.retryAttempts.delete(retryKey);
      this.showErrorToast({
        ...errorInfo,
        message: `Neuspešno posle ${attempts} pokušaja: ${errorInfo.message}`,
        retryCount: attempts
      });
      return;
    }

    if (errorInfo.source === 'promise' && errorInfo.originalPromise) {
      try {
        await errorInfo.originalPromise;
      } catch (e) {
        this.handleError(e, 'retry');
      }
    }
  }

  dismissToast(toast) {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }

  getErrors() {
    return [...this.errorQueue].reverse();
  }

  clearErrors() {
    this.errorQueue = [];
    this.retryAttempts.clear();
  }
}

const errorBoundary = new ErrorBoundary();

export { ErrorBoundary, errorBoundary };
export default errorBoundary;