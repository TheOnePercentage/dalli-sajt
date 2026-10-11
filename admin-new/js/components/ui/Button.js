/**
 * DALLI Button Component
 * Mobile-first, accessible, with ripple/tap feedback
 * Variants: primary, secondary, outline, ghost, crypto, accent, danger
 * Sizes: sm, md, lg, xl
 * States: loading, disabled, full-width, icon-only
 */

export class Button {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      variant: options.variant || 'primary',
      size: options.size || 'md',
      fullWidth: options.fullWidth || false,
      iconOnly: options.iconOnly || false,
      loading: options.loading || false,
      disabled: options.disabled || false,
      ripple: options.ripple !== false,
      onClick: options.onClick || null,
      ...options
    };

    this.rippleElement = null;
    this.originalText = element.textContent.trim();
    this.init();
  }

  static create(options = {}) {
    const button = document.createElement('button');
    button.type = options.type || 'button';
    button.className = `btn btn--${options.variant || 'primary'} btn--${options.size || 'md'}`;
    
    if (options.fullWidth) button.classList.add('btn--block');
    if (options.iconOnly) button.classList.add('btn--icon-only');
    if (options.disabled) button.disabled = true;
    if (options.loading) button.classList.add('btn--loading');
    
    if (options.icon) {
      button.innerHTML = `<span class="btn__icon" aria-hidden="true">${options.icon}</span>`;
      if (options.text) button.innerHTML += `<span class="btn__text">${options.text}</span>`;
    } else {
      button.textContent = options.text || '';
    }

    if (options.onClick) {
      button.addEventListener('click', options.onClick);
    }

    return new Button(button, options);
  }

  init() {
    this.element.classList.add('btn');
    this.setupVariant();
    this.setupSize();
    this.setupState();
    this.bindEvents();
  }

  setupVariant() {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'crypto', 'accent', 'danger', 'success', 'warning', 'info'];
    variants.forEach(v => this.element.classList.remove(`btn--${v}`));
    this.element.classList.add(`btn--${this.options.variant}`);
  }

  setupSize() {
    const sizes = ['sm', 'md', 'lg', 'xl', 'icon'];
    sizes.forEach(s => this.element.classList.remove(`btn--${s}`));
    this.element.classList.add(`btn--${this.options.size}`);
    
    if (this.options.fullWidth) this.element.classList.add('btn--block');
    if (this.options.iconOnly) this.element.classList.add('btn--icon-only');
  }

  setupState() {
    if (this.options.disabled) {
      this.element.disabled = true;
      this.element.classList.add('btn--disabled');
    }
    if (this.options.loading) {
      this.setLoading(true);
    }
  }

  bindEvents() {
    if (this.options.ripple) {
      this.element.addEventListener('pointerdown', this.handleRippleStart.bind(this));
      this.element.addEventListener('pointerup', this.handleRippleEnd.bind(this));
      this.element.addEventListener('pointerleave', this.handleRippleEnd.bind(this));
    }

    this.element.addEventListener('click', (e) => {
      if (this.options.loading || this.options.disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (this.options.onClick) {
        this.options.onClick(e, this);
      }
    });

    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (this.options.loading || this.options.disabled) {
          e.preventDefault();
          return;
        }
        this.element.click();
      }
    });
  }

  handleRippleStart(e) {
    if (this.options.loading || this.options.disabled) return;
    
    const rect = this.element.getBoundingClientRect();
    const size = Math.max(this.element.offsetWidth, this.element.offsetHeight);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    this.rippleElement = document.createElement('span');
    this.rippleElement.className = 'btn__ripple';
    this.rippleElement.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
    `;
    this.element.appendChild(this.rippleElement);
    
    requestAnimationFrame(() => {
      this.rippleElement.classList.add('btn__ripple--active');
    });
  }

  handleRippleEnd() {
    if (this.rippleElement) {
      this.rippleElement.classList.remove('btn__ripple--active');
      this.rippleElement.classList.add('btn__ripple--fade');
      setTimeout(() => {
        this.rippleElement?.remove();
        this.rippleElement = null;
      }, 300);
    }
  }

  setLoading(loading) {
    this.options.loading = loading;
    if (loading) {
      this.element.classList.add('btn--loading');
      this.element.disabled = true;
      this.element.setAttribute('aria-busy', 'true');
      if (!this.element.querySelector('.btn__spinner')) {
        this.element.insertAdjacentHTML('afterbegin', `
          <span class="btn__spinner" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" stroke-dasharray="31.4 31.4">
                <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/>
              </path>
            </svg>
          </span>
        `);
      }
    } else {
      this.element.classList.remove('btn--loading');
      this.element.disabled = this.options.disabled;
      this.element.removeAttribute('aria-busy');
      const spinner = this.element.querySelector('.btn__spinner');
      spinner?.remove();
    }
  }

  setDisabled(disabled) {
    this.options.disabled = disabled;
    this.element.disabled = disabled;
    if (disabled) {
      this.element.classList.add('btn--disabled');
    } else {
      this.element.classList.remove('btn--disabled');
    }
  }

  setVariant(variant) {
    this.options.variant = variant;
    this.setupVariant();
  }

  setSize(size) {
    this.options.size = size;
    this.setupSize();
  }

  destroy() {
    this.element.removeEventListener('pointerdown', this.handleRippleStart);
    this.element.removeEventListener('pointerup', this.handleRippleEnd);
    this.element.removeEventListener('pointerleave', this.handleRippleEnd);
    this.rippleElement?.remove();
  }

  static initButtons(root = document) {
    const buttons = root.querySelectorAll('[data-btn]');
    buttons.forEach(el => {
      if (el._btnInstance) return;
      const options = {
        variant: el.dataset.btnVariant || 'primary',
        size: el.dataset.btnSize || 'md',
        fullWidth: el.dataset.btnBlock === 'true',
        iconOnly: el.dataset.btnIconOnly === 'true',
        disabled: el.dataset.btnDisabled === 'true',
        loading: el.dataset.btnLoading === 'true',
        ripple: el.dataset.btnRipple !== 'false'
      };
      el._btnInstance = new Button(el, options);
    });
  }
}

// Auto-initialize buttons with data attributes
export function initButtons(root = document) {
  const buttons = root.querySelectorAll('[data-btn]');
  buttons.forEach(el => {
    if (el._btnInstance) return;
    const options = {
      variant: el.dataset.btnVariant || 'primary',
      size: el.dataset.btnSize || 'md',
      fullWidth: el.dataset.btnBlock === 'true',
      iconOnly: el.dataset.btnIconOnly === 'true',
      disabled: el.dataset.btnDisabled === 'true',
      loading: el.dataset.btnLoading === 'true',
      ripple: el.dataset.btnRipple !== 'false'
    };
    el._btnInstance = new Button(el, options);
  });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Button, initButtons };
}

// Global export for non-module environments
if (typeof window !== 'undefined') {
  window.Button = Button;
  window.initButtons = initButtons;
}