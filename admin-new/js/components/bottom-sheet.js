import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

/**
 * Bottom Sheet Component - Mobile-First Action Sheets
 * 
 * Replaces center modals on mobile with bottom-up action sheets.
 * Supports: actions, lists, forms, destructive actions.
 * 
 * @extends Component
 * @example
 * const sheet = new BottomSheet({
 *   title: 'Actions',
 *   items: [
 *     { label: 'Edit', icon: '<svg>...', action: 'edit' },
 *     { label: 'Delete', icon: '<svg>...', action: 'delete', destructive: true }
 *   ],
 *   onAction: (action) => handleAction(action)
 * });
 * sheet.open();
 */
export class BottomSheet extends Component {
  /**
   * @constructor
   * @param {Object} options
   * @param {string} options.id - Unique ID
   * @param {string} options.title - Sheet title
   * @param {string} options.subtitle - Optional subtitle
   * @param {Array} options.items - Action items
   * @param {boolean} options.showGrabber - Show drag handle
   * @param {boolean} options.closeOnOverlayClick - Close on backdrop click
   * @param {boolean} options.closeOnEscape - Close on ESC key
   * @param {Function} options.onAction - Action callback
   * @param {Function} options.onClose - Close callback
   */
  constructor(options = {}) {
    super(options);
    this.id = options.id || `bottom-sheet-${ImperiumUtils.generateId()}`;
    this.title = options.title || '';
    this.subtitle = options.subtitle || '';
    this.items = options.items || [];
    this.showGrabber = options.showGrabber !== false;
    this.closeOnOverlayClick = options.closeOnOverlayClick !== false;
    this.closeOnEscape = options.closeOnEscape !== false;
    this.onAction = options.onAction;
    this.onClose = options.onClose;
    this.isOpen = false;
    this._focusTrap = null;
    this._lastFocusedElement = null;
  }

  render() {
    const grabberHtml = this.showGrabber ? `
      <div class="bottom-sheet__grabber" aria-hidden="true"></div>
    ` : '';

    const headerHtml = this.title ? `
      <header class="bottom-sheet__header">
        <div>
          ${this.title ? `<h2 class="bottom-sheet__title">${ImperiumUtils.escapeHtml(this.title)}</h2>` : ''}
          ${this.subtitle ? `<p class="bottom-sheet__subtitle">${ImperiumUtils.escapeHtml(this.subtitle)}</p>` : ''}
        </div>
        <button class="bottom-sheet__close" aria-label="Zatvori" data-action="close" type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </header>
    ` : '';

    const contentHtml = this.renderContent();

    return `
      <div class="bottom-sheet-overlay" id="${this.id}-overlay" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title" aria-hidden="true">
        <div class="bottom-sheet__backdrop" data-action="close-overlay" tabindex="-1"></div>
        <div class="bottom-sheet" role="document">
          ${this.showGrabber ? '<div class="bottom-sheet__grabber" aria-hidden="true"></div>' : ''}
          ${this.title ? `
            <header class="bottom-sheet__header">
              <div>
                <h2 id="${this.id}-title" class="bottom-sheet__title">${ImperiumUtils.escapeHtml(this.title)}</h2>
                ${this.subtitle ? `<p class="bottom-sheet__subtitle">${ImperiumUtils.escapeHtml(this.subtitle)}</p>` : ''}
              </div>
              <button class="bottom-sheet__close" aria-label="Zatvori" data-action="close" type="button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </header>
          ` : ''}
          <div class="bottom-sheet__content" role="document">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `;
  }

  renderContent() {
    if (this.items.length === 0) {
      return '<div class="bottom-sheet__empty">Nema dostupnih akcija</div>';
    }

    // Group items by section
    const sections = this.groupItemsBySection(this.items);
    
    return Object.entries(sections).map(([sectionTitle, items]) => `
      <div class="bottom-sheet__section">
        ${sectionTitle ? `<h3 class="bottom-sheet__section-title">${ImperiumUtils.escapeHtml(sectionTitle)}</h3>` : ''}
        <div class="bottom-sheet__actions" role="list">
          ${items.map(item => this.renderItem(item)).join('')}
        </div>
      </div>
    `).join('');
  }

  groupItemsBySection(items) {
    const sections = {};
    items.forEach(item => {
      const section = item.section || 'default';
      if (!sections[section]) sections[section] = [];
      sections[section].push(item);
    });
    return sections;
  }

  renderItem(item) {
    const isDestructive = item.destructive === true;
    const isDisabled = item.disabled === true;
    const iconHtml = item.icon ? `<span class="bottom-sheet__action-icon">${item.icon}</span>` : '';
    const shortcutHtml = item.shortcut ? `<kbd class="bottom-sheet__action-shortcut">${ImperiumUtils.escapeHtml(item.shortcut)}</kbd>` : '';
    const badgeHtml = item.badge ? `<span class="bottom-sheet__badge">${ImperiumUtils.escapeHtml(item.badge)}</span>` : '';
    const disabledAttr = isDisabled ? 'disabled aria-disabled="true"' : '';

    return `
      <button 
        class="bottom-sheet__action ${item.destructive ? 'destructive' : ''} ${item.selected ? 'selected' : ''}" 
        ${disabledAttr}
        data-action="item"
        data-value="${ImperiumUtils.escapeHtml(item.value || item.action)}"
        data-destructive="${isDestructive}"
        type="button"
        role="listitem"
        aria-disabled="${isDisabled}"
        ${item.description ? `aria-describedby="${item.id}-desc"` : ''}
      >
        ${item.icon ? `<span class="bottom-sheet__action-icon">${item.icon}</span>` : ''}
        <span class="bottom-sheet__action-text">${ImperiumUtils.escapeHtml(item.label)}</span>
        ${shortcutHtml}
        ${badgeHtml}
      </button>
    `;
  }

  bindEvents() {
    super.bindEvents();

    // Close on overlay click
    this.on('click', '[data-action="close-overlay"]', () => {
      if (this.closeOnOverlayClick) this.close();
    });

    // Close button
    this.on('click', '[data-action="close"]', () => {
      this.close();
    });

    // Item actions
    this.on('click', '[data-action="item"]', (e) => {
      const btn = e.currentTarget;
      if (btn.disabled) return;

      const action = btn.dataset.value;
      const destructive = btn.dataset.destructive === 'true';

      if (this.onAction) {
        this.onAction({ action, destructive, element: btn });
      }

      // Auto-close unless specified otherwise
      if (btn.dataset.keepOpen !== 'true') {
        this.close();
      }
    });

    // Close on Escape
    if (this.closeOnEscape) {
      this._keydownHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', this._keydownHandler);
    }

    // Focus trap
    this._setupFocusTrap();
  }

  _setupFocusTrap() {
    const overlay = this.$(`#${this.id}-overlay`);
    if (!overlay) return;

    const focusableElements = overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    this._focusTrap = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    overlay.addEventListener('keydown', this._focusTrap);
  }

  open() {
    if (this.isOpen) return;

    this._lastFocusedElement = document.activeElement;

    const container = document.body;
    const html = this.render();
    container.insertAdjacentHTML('beforeend', html);

    this.setState({ isOpen: true });
    this.isOpen = true;

    // Trigger reflow then animate
    requestAnimationFrame(() => {
      const overlay = document.getElementById(`${this.id}-overlay`);
      if (overlay) {
        overlay.classList.add('opening');
        overlay.setAttribute('aria-hidden', 'false');
        
        // Remove opening class after animation
        setTimeout(() => overlay.classList.remove('opening'), 400);
      }
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;

    // Emit open event
    this.emit('open');
  }

  close() {
    if (!this.isOpen) return;

    const overlay = document.getElementById(`${this.id}-overlay`);
    if (!overlay) return;

    overlay.classList.add('closing');
    overlay.setAttribute('aria-hidden', 'true');

    // Wait for animation
    setTimeout(() => {
      overlay.remove();
      this.isOpen = false;
      this.setState({ isOpen: false });

      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Restore focus
      if (this._lastFocusedElement) {
        this._lastFocusedElement.focus();
      }

      // Cleanup
      if (this._focusTrap) {
        document.removeEventListener('keydown', this._focusTrap);
        this._focusTrap = null;
      }
      if (this._keydownHandler) {
        document.removeEventListener('keydown', this._keydownHandler);
        this._keydownHandler = null;
      }

      this.emit('close');
      if (this.onClose) this.onClose();
    }, 300);
  }

  setItems(items) {
    this.items = items || [];
    if (this.isOpen) {
      this.setState({ items: this.items });
    }
  }

  addItem(item) {
    this.items.push(item);
    if (this.isOpen) {
      this.setState({ items: this.items });
    }
  }

  removeItem(value) {
    this.items = this.items.filter(item => item.value !== value && item.action !== value);
    if (this.isOpen) {
      this.setState({ items: this.items });
    }
  }

  setTitle(title) {
    this.title = title;
    if (this.isOpen) {
      const titleEl = this.$(`#${this.id}-title`);
      if (titleEl) titleEl.textContent = title;
    }
  }

  setSubtitle(subtitle) {
    this.subtitle = subtitle;
    if (this.isOpen) {
      const subtitleEl = this.$(`#${this.id}-subtitle`);
      if (subtitleEl) subtitleEl.textContent = subtitle;
    }
  }

  destroy() {
    if (this.isOpen) this.close();
    super.destroy();
  }
}

/**
 * Quick action sheet factory
 */
export function createActionSheet(title, items, onAction) {
  const sheet = new BottomSheet({ title, items, onAction });
  sheet.open();
  return sheet;
}

/**
 * Confirmation sheet
 */
export function createConfirmSheet(title, message, onConfirm, options = {}) {
  const items = [
    {
      label: options.confirmLabel || 'Potvrdi',
      action: 'confirm',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    },
    {
      label: options.cancelLabel || 'Odustani',
      action: 'cancel',
      destructive: true,
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    }
  ];

  const sheet = new BottomSheet({
    title,
    subtitle: message,
    items,
    onAction: ({ action }) => {
      if (action === 'confirm') onConfirm();
    }
  });
  sheet.open();
  return sheet;
}

/**
 * Selection sheet (single choice)
 */
export function createSelectionSheet(title, items, onSelect) {
  const sheetItems = items.map(item => ({
    ...item,
    icon: item.icon || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'
  }));

  const sheet = new BottomSheet({
    title,
    items: sheetItems,
    onAction: ({ action }) => onSelect(action)
  });
  sheet.open();
  return sheet;
}

export default BottomSheet;