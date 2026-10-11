import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

/**
 * Swipe Actions Component - Touch Gestures for List Items
 * 
 * Enables swipe-to-reveal actions on list/table items.
 * Supports multiple actions with configurable thresholds.
 * 
 * @extends Component
 * @example
 * const swipe = new SwipeActions({
 *   container: '.orders-list',
 *   selector: '.swipeable-item',
 *   actions: [
 *     { label: 'Edit', icon: editIcon, action: 'edit', color: 'primary' },
 *     { label: 'Delete', icon: deleteIcon, action: 'delete', color: 'error', threshold: 80 }
 *   ],
 *   onAction: ({ action, item, element }) => handleAction(action, item)
 * });
 * swipe.init();
 */
export class SwipeActions extends Component {
  /**
   * @constructor
   * @param {Object} options
   * @param {HTMLElement|string} options.container - Container element or selector
   * @param {string} options.selector - Item selector within container
   * @param {Array} options.actions - Swipe actions
   * @param {number} options.threshold - Swipe distance to trigger action (px)
   * @param {number} options.maxSwipe - Maximum swipe distance (px)
   * @param {boolean} options.haptic - Enable haptic feedback
   * @param {Function} options.onAction - Action callback
   * @param {Function} options.onSwipe - Swipe progress callback
   */
  constructor(options = {}) {
    super(options);
    this.container = typeof options.container === 'string' 
      ? document.querySelector(options.container) 
      : options.container;
    this.selector = options.selector || '.swipeable-item';
    this.actions = options.actions || [];
    this.threshold = options.threshold || 80;
    this.maxSwipe = options.maxSwipe || 120;
    this.haptic = options.haptic !== false;
    this.onAction = options.onAction;
    this.onSwipe = options.onSwipe;
    
    // State
    this.items = new Map();
    this.activeItem = null;
    this.isSwiping = false;
    this.startX = 0;
    this.currentX = 0;
    this.itemElement = null;
    this.contentElement = null;
    this.actionsElement = null;
    this.swipeDistance = 0;
    
    // Bind handlers
    this._touchStartHandler = this._onTouchStart.bind(this);
    this._touchMoveHandler = this._onTouchMove.bind(this);
    this._touchEndHandler = this._onTouchEnd.bind(this);
    this._clickHandler = this._onClick.bind(this);
    this._keydownHandler = this._onKeyDown.bind(this);
  }

  /**
   * Initialize swipe actions
   */
  init() {
    if (!this.container) {
      console.warn('[SwipeActions] Container not found');
      return;
    }

    this.container.classList.add('swipe-actions-container');
    this._setupItems();
    this._bindEvents();
    this.emit('init');
  }

  _setupItems() {
    const items = this.container.querySelectorAll(this.selector);
    items.forEach(item => this._setupItem(item));
  }

  _setupItem(item) {
    // Wrap content if not already wrapped
    if (!item.querySelector('.swipeable-item__content')) {
      const content = document.createElement('div');
      content.className = 'swipeable-item__content';
      content.innerHTML = item.innerHTML;
      item.innerHTML = '';
      item.appendChild(content);
    }

    // Create actions element
    if (!item.querySelector('.swipeable-item__actions')) {
      const actionsEl = document.createElement('div');
      actionsEl.className = 'swipeable-item__actions';
      actionsEl.innerHTML = this._renderActions();
      item.insertBefore(actionsEl, item.firstChild);
    }

    // Add swipe hint
    if (!item.querySelector('.swipe-hint')) {
      const hint = document.createElement('span');
      hint.className = 'swipe-hint';
      hint.textContent = 'Swipe for actions';
      item.appendChild(hint);
    }

    // Add classes
    item.classList.add('swipeable-item');
    
    // Store references
    this.items.set(item, {
      content: item.querySelector('.swipeable-item__content'),
      actions: item.querySelector('.swipeable-item__actions'),
      hint: item.querySelector('.swipe-hint'),
      actionsWidth: 0
    });
  }

  _renderActions() {
    return this.actions.map(action => `
      <button 
        class="swipe-action swipe-action--${action.color || 'primary'} ${action.class || ''}"
        data-action="${ImperiumUtils.escapeHtml(action.action)}"
        ${action.disabled ? 'disabled' : ''}
        aria-label="${ImperiumUtils.escapeHtml(action.label)}"
        title="${ImperiumUtils.escapeHtml(action.label)}"
      >
        ${action.icon || ''}
        <span class="swipe-action__label">${ImperiumUtils.escapeHtml(action.label)}</span>
      </button>
    `).join('');
  }

  _bindEvents() {
    this.container.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: true });
    this.container.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: true });
    this.container.addEventListener('touchcancel', this._onTouchEnd.bind(this), { passive: true });
    
    // Click for desktop/keyboard
    this.container.addEventListener('click', this._clickHandler, true);
    
    // Keyboard support
    document.addEventListener('keydown', this._keydownHandler.bind(this));
    
    // Window resize
    window.addEventListener('resize', () => this._updateActionWidths());
  }

  _onTouchStart(e) {
    const item = e.target.closest(this.selector);
    if (!item || !this.items.has(item)) return;

    // Don't start swipe on interactive elements
    if (e.target.closest('button, a, input, select, textarea, [contenteditable]')) return;

    const itemData = this.items.get(item);
    if (!itemData) return;

    this.itemElement = item;
    this.contentElement = itemData.content;
    this.actionsElement = itemData.actions;
    this.isSwiping = true;
    this.startX = e.touches[0].clientX;
    this.currentX = this.startX;
    
    // Calculate actions width
    const actionsRect = this.actionsElement.getBoundingClientRect();
    itemData.actionsWidth = actionsRect.width;

    // Add swiping class
    item.classList.add('swiping');
    
    // Close other open items
    this._closeOtherItems(item);
    
    // Haptic feedback
    if (this.haptic && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  _onTouchMove(e) {
    if (!this.isSwiping || !this.contentElement) return;

    const touch = e.touches[0];
    this.currentX = touch.clientX;
    const deltaX = this.currentX - this.startX;

    // Only swipe left (negative deltaX for right-to-left swipe)
    if (deltaX >= 0) {
      this._resetSwipe();
      return;
    }

    const distance = Math.abs(deltaX);
    const maxSwipe = Math.min(distance, this.maxSwipe || 200);
    this.swipeDistance = maxSwipe;

    // Apply transform
    this.contentElement.style.transform = `translateX(-${maxSwipe}px)`;
    
    // Show/hide actions
    this.actionsElement.style.pointerEvents = maxSwipe > 20 ? 'auto' : 'none';
    
    // Update threshold indicator
    const threshold = this.threshold || 80;
    this.itemElement.classList.toggle('swipe-threshold', maxSwipe >= threshold);

    // Update progress
    const progress = Math.min(maxSwipe / (this.maxSwipe || 200), 1);
    
    // Callback
    if (this.onSwipe) {
      this.onSwipe(progress, this.itemElement);
    }

    // Prevent scrolling
    if (maxSwipe > 20) {
      e.preventDefault();
    }
  }

  _onTouchEnd(e) {
    if (!this.isSwiping || !this.itemElement) return;

    const itemData = this.items.get(this.itemElement);
    if (!itemData) return;

    const maxSwipe = this.maxSwipe || 200;
    const threshold = this.threshold || 80;
    const swipeDistance = this.swipeDistance;

    this.itemElement.classList.remove('swiping', 'swipe-threshold');
    
    if (swipeDistance >= threshold) {
      // Trigger first action (or threshold action)
      this._triggerAction(this.itemElement, 0);
    } else {
      // Animate back
      this._animateBack();
    }

    this.isSwiping = false;
    this.swipeDistance = 0;
    this.itemElement = null;
    this.contentElement = null;
    this.actionsElement = null;
  }

  _onClick(e) {
    // Handle action button clicks
    const actionBtn = e.target.closest('.swipe-action');
    if (!actionBtn) return;

    const item = actionBtn.closest(this.selector);
    if (!item) return;

    const action = actionBtn.dataset.action;
    e.preventDefault();
    e.stopPropagation();

    this._triggerAction(item, action);
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') {
      this._closeAllItems();
    }
  }

  _triggerAction(item, actionValue) {
    const actionConfig = this.actions.find(a => a.action === actionValue);
    if (!actionConfig) return;

    // Get item data
    const itemData = this._getItemData(item);

    // Call action handler
    if (this.onAction) {
      this.onAction({
        action: actionValue,
        item: itemData,
        element: item,
        config: actionConfig
      });
    }

    this.emit('action', { action: actionValue, item: itemData, element: this.itemElement });

    // Close after action
    this._closeItem(item);
  }

  _closeItem(item) {
    const itemData = this.items.get(item);
    if (!itemData) return;

    const content = itemData.content;
    if (content) {
      content.style.transform = '';
      content.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    }
    item.classList.remove('swiping', 'swipe-threshold');
  }

  _closeOtherItems(currentItem) {
    this.items.forEach((itemData, item) => {
      if (item !== currentItem) {
        this._closeItem(item);
      }
    });
  }

  _closeAllItems() {
    this.items.forEach((itemData, item) => {
      this._closeItem(item);
    });
  }

  _animateBack() {
    if (!this.contentElement) return;
    
    this.contentElement.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    this.contentElement.style.transform = '';
    
    setTimeout(() => {
      if (this.contentElement) {
        this.contentElement.style.transition = '';
      }
    }, 200);
  }

  _updateActionWidths() {
    this.items.forEach((itemData, item) => {
      if (itemData.actions) {
        itemData.actionsWidth = itemData.actions.getBoundingClientRect().width;
      }
    });
  }

  _closeOtherItems(currentItem) {
    this.items.forEach((itemData, item) => {
      if (item !== currentItem && item.classList.contains('swiping')) {
        this._closeItem(item);
      }
    });
  }

  _getItemData(element) {
    // Extract data from element attributes
    const data = {};
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        const key = attr.name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        data[key] = attr.value;
      }
    });
    return data;
  }

  /**
   * Programmatically open an item's actions
   */
  openItem(element) {
    const itemData = this.items.get(element);
    if (!itemData) return;

    this._closeOtherItems(element);
    element.classList.add('swiping');
    element.querySelector('.swipeable-item__content').style.transform = `translateX(-${this.maxSwipe || 120}px)`;
    element.querySelector('.swipeable-item__actions').style.pointerEvents = 'auto';
  }

  /**
   * Close all open items
   */
  closeAll() {
    this._closeAllItems();
  }

  /**
   * Add new item dynamically
   */
  addItem(element) {
    if (element && !this.items.has(element)) {
      this._setupItem(element);
    }
  }

  /**
   * Remove item
   */
  removeItem(element) {
    this._closeItem(element);
    this.items.delete(element);
  }

  destroy() {
    this.container.removeEventListener('touchstart', this._touchStartHandler);
    this.container.removeEventListener('touchmove', this._touchMoveHandler);
    this.container.removeEventListener('touchend', this._touchEndHandler);
    this.container.removeEventListener('touchcancel', this._touchEndHandler);
    this.container.removeEventListener('click', this._clickHandler);
    document.removeEventListener('keydown', this._keydownHandler);
    
    this.items.clear();
    super.destroy();
  }

  /**
   * Static factory methods
   */
  static createForTable(table, actions, options = {}) {
    return new SwipeActions({
      container: table,
      selector: options.selector || 'tbody tr',
      actions,
      ...options
    });
  }

  static createForList(list, actions, options = {}) {
    return new SwipeActions({
      container: list,
      selector: options.selector || '.swipeable-item, li',
      actions,
      ...options
    });
  }
}

export default SwipeActions;