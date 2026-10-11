import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

/**
 * Floating Action Button (FAB) Component
 * 
 * Mobile-first floating action button with speed dial support.
 * Supports: primary, extended, speed dial, tooltip, badge, scroll awareness.
 * 
 * @extends Component
 * @example
 * const fab = new FAB({
 *   icon: '<svg>...</svg>',
 *   tooltip: 'Create new',
 *   onClick: () => openCreateModal(),
 *   position: 'bottom-right',
 *   speedDial: [
 *     { label: 'New Order', icon: orderIcon, action: 'new-order' },
 *     { label: 'New Product', icon: productIcon, action: 'new-product' }
 *   ]
 * });
 */
export class FAB extends Component {
  /**
   * @constructor
   * @param {Object} options
   * @param {string} options.icon - SVG icon string
   * @param {string} options.tooltip - Tooltip text
   * @param {string} options.ariaLabel - ARIA label
   * @param {string} options.variant - primary, secondary, tertiary, danger
   * @param {string} options.size - sm, md, lg
   * @param {boolean} options.extended - Show label
   * @param {string} options.label - Extended label text
   * @param {Array} options.speedDial - Speed dial actions
   * @param {string} options.position - bottom-right, bottom-left, top-right, top-left
   * @param {boolean} options.scrollHide - Hide on scroll down
   * @param {number} options.scrollThreshold - Scroll threshold to hide
   * @param {string} options.badge - Badge text/number
   * @param {boolean} options.pulse - Pulse animation
   * @param {Function} options.onClick - Click handler
   * @param {Array} options.speedDial - Speed dial actions
   * @param {Function} options.onSpeedDialAction - Speed dial action handler
   */
  constructor(options = {}) {
    super(options);
    this.icon = options.icon || '';
    this.tooltip = options.tooltip || '';
    this.ariaLabel = options.ariaLabel || options.tooltip || 'Action';
    this.variant = options.variant || 'primary';
    this.size = options.size || 'md';
    this.extended = options.extended === true;
    this.label = options.label || '';
    this.speedDial = options.speedDial || [];
    this.position = options.position || 'bottom-right';
    this.scrollHide = options.scrollHide !== false;
    this.scrollThreshold = options.scrollThreshold || 100;
    this.badge = options.badge || '';
    this.pulse = options.pulse === true;
    this.onClick = options.onClick;
    this.onSpeedDialAction = options.onSpeedDialAction;
    this.disabled = options.disabled === true;
    this.id = options.id || `fab-${ImperiumUtils.generateId()}`;
    
    // State
    this.isOpen = false;
    this.isVisible = true;
    this.lastScrollY = 0;
    this.ticking = false;
  }

  render() {
    const variantClass = `fab--${this.variant}`;
    const sizeClass = this.size !== 'md' ? `fab--${this.size}` : '';
    const positionClass = `fab--${this.position}`;
    const extendedClass = this.extended ? 'fab--extended' : '';
    const pulseClass = this.pulse ? 'fab--pulse' : '';
    const disabledClass = this.disabled ? 'disabled' : '';
    const scrollHideClass = this.scrollHide ? 'fab--scroll-hide' : '';
    const badgeClass = this.badge ? 'fab-with-badge' : '';
    const badgeHtml = this.badge ? `<span class="fab__badge" aria-hidden="true">${ImperiumUtils.escapeHtml(this.badge)}</span>` : '';

    const tooltipHtml = this.tooltip 
      ? `<span class="fab__tooltip">${ImperiumUtils.escapeHtml(this.tooltip)}</span>` 
      : '';

    const extendedLabelHtml = (this.extended && this.label) 
      ? `<span class="fab__label">${ImperiumUtils.escapeHtml(this.label)}</span>` 
      : '';

    // Speed dial actions
    const speedDialActionsHtml = this.speedDial.length > 0 
      ? this.speedDial.map((action, index) => `
        <div class="fab-speed-dial__action" style="transition-delay: ${index * 40}ms;" role="menuitem">
          <span class="fab-speed-dial__label">${ImperiumUtils.escapeHtml(action.label)}</span>
          <button 
            class="fab-speed-dial__action-btn" 
            type="button"
            aria-label="${ImperiumUtils.escapeHtml(action.ariaLabel || action.label)}"
            data-action="${ImperiumUtils.escapeHtml(action.action)}"
            ${action.disabled ? 'disabled aria-disabled="true"' : ''}
          >
            ${action.icon || ''}
          </button>
        </div>
      `).join('') 
      : '';

    const hasSpeedDial = this.speedDial.length > 0;

    if (hasSpeedDial) {
      return `
        <div class="fab-speed-dial ${positionClass} ${scrollHideClass} ${disabledClass} ${this.isOpen ? 'open' : ''}" 
             id="${this.id}" 
             role="group" 
             aria-label="Quick actions">
          <button 
            class="fab-speed-dial__main" 
            type="button" 
            aria-label="${ImperiumUtils.escapeHtml(this.ariaLabel || 'Quick actions')}"
            aria-expanded="${this.isOpen}"
            aria-haspopup="true"
            aria-controls="${this.id}-speed-dial-actions"
            data-action="speed-dial-toggle"
          >
            ${this.icon || this.renderDefaultIcon()}
            ${badgeHtml}
          </button>
          <div class="fab-speed-dial__actions" id="${this.id}-speed-dial-actions" role="menu">
            ${speedDialActionsHtml}
          </div>
        </div>
      `;
    }

    return `
      <button 
        class="fab ${variantClass} ${sizeClass} ${positionClass} ${extendedClass} ${pulseClass} ${scrollHideClass} ${badgeClass} ${disabledClass}" 
        id="${this.id}" 
        type="button" 
        aria-label="${ImperiumUtils.escapeHtml(this.ariaLabel || this.tooltip)}"
        aria-disabled="${this.disabled}"
        data-action="fab-click"
        ${this.tooltip ? `data-tooltip="${ImperiumUtils.escapeHtml(this.tooltip)}"` : ''}
      >
        ${this.icon || this.renderDefaultIcon()}
        ${extendedLabelHtml}
        ${badgeHtml}
      </button>
      ${tooltipHtml}
    `;
  }

  renderDefaultIcon() {
    return `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M12 5v14M12 5l-6 6M12 5l6 6"/>
      </svg>
    `;
  }

  bindEvents() {
    super.bindEvents();

    // Main FAB click
    this.on('click', '[data-action="fab-click"]', (e) => {
      if (this.disabled) return;
      if (this.onClick) this.onClick(e);
      this.emit('click', { originalEvent: e });
    });

    // Speed dial toggle
    this.on('click', '[data-action="speed-dial-toggle"]', (e) => {
      e.stopPropagation();
      this.toggleSpeedDial();
    });

    // Speed dial actions
    this.on('click', '.fab-speed-dial__action-btn', (e) => {
      const btn = e.currentTarget;
      if (btn.disabled) return;
      
      const action = btn.dataset.action;
      if (this.onSpeedDialAction) {
        this.onSpeedDialAction({ action, originalEvent: e });
      }
      this.emit('speed-dial-action', { action, originalEvent: e });
      this.closeSpeedDial();
    });

    // Close speed dial on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && !e.target.closest(`#${this.id}`)) {
        this.closeSpeedDial();
      }
    });

    // Scroll hide
    if (this.scrollHide) {
      this._scrollHandler = this._onScroll.bind(this);
      window.addEventListener('scroll', this._scrollHandler, { passive: true });
    }

    // Keyboard support
    this._keydownHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeSpeedDial();
      }
    };
    document.addEventListener('keydown', this._keydownHandler);
  }

  _onScroll() {
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        
        if (scrollY > this.scrollThreshold) {
          if (scrollY > this.lastScrollY && this.isVisible) {
            // Scrolling down - hide FAB
            this.hide();
          } else if (scrollY < this.lastScrollY && !this.isVisible) {
            // Scrolling up - show FAB
            this.show();
          }
        } else {
          if (!this.isVisible) this.show();
        }
        
        this.lastScrollY = scrollY;
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  show() {
    if (this.isVisible) return;
    this.isVisible = true;
    const el = this.$(`#${this.id}`);
    if (el) {
      el.classList.remove('hidden');
      el.style.opacity = '';
      el.style.visibility = '';
      el.style.transform = '';
      el.style.pointerEvents = '';
    }
  }

  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    const el = this.$(`#${this.id}`);
    if (el) {
      el.classList.add('hidden');
    }
  }

  toggleSpeedDial() {
    this.isOpen = !this.isOpen;
    const container = this.$(`#${this.id}`);
    if (container) {
      container.classList.toggle('open', this.isOpen);
      const mainBtn = container.querySelector('.fab-speed-dial__main');
      if (mainBtn) {
        mainBtn.setAttribute('aria-expanded', this.isOpen);
      }
    }
    this.emit('speed-dial-toggle', { open: this.isOpen });
  }

  closeSpeedDial() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const container = this.$(`#${this.id}`);
    if (container) {
      container.classList.remove('open');
      const mainBtn = container.querySelector('.fab-speed-dial__main');
      if (mainBtn) {
        mainBtn.setAttribute('aria-expanded', 'false');
      }
    }
  }

  setBadge(badge) {
    this.badge = badge;
    if (this.isRendered) {
      this.setState({ badge });
    }
  }

  setDisabled(disabled) {
    this.disabled = disabled;
    if (this.isRendered) {
      this.setState({ disabled });
    }
  }

  setBadgeCount(count) {
    this.badge = count > 0 ? String(count) : '';
    if (this.isRendered) {
      this.setState({ badge: this.badge });
    }
  }

  setPosition(position) {
    this.position = position;
    if (this.isRendered) {
      this.setState({ position });
    }
  }

  destroy() {
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler);
    }
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
    }
    super.destroy();
  }
}

/**
 * Factory functions
 */
export function createFAB(options) {
  const fab = new FAB(options);
  return fab;
}

export function createSpeedDial(options) {
  const fab = new FAB({
    ...options,
    speedDial: options.actions || [],
    variant: options.variant || 'primary'
  });
  return fab;
}

export function createExtendedFAB(options) {
  const fab = new FAB({
    ...options,
    extended: true,
    label: options.label || '',
    variant: options.variant || 'primary'
  });
  return fab;
}

export default FAB;