import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class Dropdown extends Component {
  constructor(options = {}) {
    super(options);
    this.trigger = options.trigger || '';
    this.items = options.items || [];
    this.triggerClass = options.triggerClass || 'dropdown-trigger';
    this.menuClass = options.menuClass || '';
    this.align = options.align || 'right';
    this.open = false;
    this.id = options.id || ImperiumUtils.generateId('dropdown-');
    this._outsideClickHandler = null;
  }

  render() {
    const triggerHtml = this.trigger || `
      <button class="${this.triggerClass}" data-action="toggle" aria-haspopup="true" aria-expanded="false">
        <span data-ref="triggerText">Izaberite...</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    `;

    const itemsHtml = this.items.map((item, index) => this.renderItem(item, index)).join('');

    return `
      <div class="dropdown" data-ref="dropdown">
        ${triggerHtml}
        <div class="dropdown-menu ${this.menuClass}" role="menu" aria-label="Opcije" data-ref="menu">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  renderItem(item, index) {
    if (item.divider) {
      return `<hr class="dropdown-divider" role="separator">`;
    }

    if (item.header) {
      return `<div class="dropdown-header">${ImperiumUtils.escapeHtml(item.header)}</div>`;
    }

    const iconHtml = item.icon ? `<span class="dropdown-item-icon">${item.icon}</span>` : '';
    const badgeHtml = item.badge ? `<span class="dropdown-item-badge">${ImperiumUtils.escapeHtml(item.badge)}</span>` : '';
    const disabled = item.disabled ? 'disabled' : '';
    const danger = item.danger ? 'dropdown-item-danger' : '';

    return `
      <button 
        class="dropdown-item ${disabled} ${danger}" 
        role="menuitem" 
        tabindex="-1"
        data-index="${index}"
        ${disabled ? 'aria-disabled="true"' : ''}
        data-action="select"
        data-value="${ImperiumUtils.escapeHtml(item.value)}"
      >
        ${iconHtml}
        <span class="dropdown-item-text">${ImperiumUtils.escapeHtml(item.label)}</span>
        ${badgeHtml}
      </button>
    `;
  }

  onMount() {
    this._outsideClickHandler = (e) => {
      if (this.open && this.element && !this.element.contains(e.target)) {
        this.close();
      }
    };
    document.addEventListener('click', this._outsideClickHandler);
  }

  onUnmount() {
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler);
    }
  }

  bindEvents() {
    super.bindEvents();
    this.on('click', '[data-action="toggle"]', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.on('click', '[data-action="select"]', (e) => {
      const item = e.delegateTarget;
      const index = parseInt(item.dataset.index);
      const value = item.dataset.value;
      const itemData = this.items[index];
      
      if (itemData?.disabled) return;
      
      this.close();
      
      if (itemData?.onClick) {
        itemData.onClick(itemData, e);
      }
      
      this.emit('select', { item: itemData, value, index });
    });

    this.on('keydown', (e) => {
      if (!this.open) return;
      
      const items = this.element?.querySelectorAll('.dropdown-item:not(.disabled)');
      if (!items?.length) return;
      
      const currentIndex = Array.from(items).findIndex(el => el === document.activeElement);
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[nextIndex]?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          items[prevIndex]?.focus();
          break;
        case 'Escape':
          e.preventDefault();
          this.close();
          this.ref('trigger')?.focus();
          break;
        case 'Tab':
          this.close();
          break;
      }
    });
  }

  open() {
    if (this.open) return;
    this.open = true;
    this.setState({ open: true });
    this.element?.querySelector('[data-action="toggle"]')?.setAttribute('aria-expanded', 'true');
    
    requestAnimationFrame(() => {
      const firstItem = this.element?.querySelector('.dropdown-item:not(.disabled)');
      firstItem?.focus();
    });
    
    this.emit('open');
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.setState({ open: false });
    this.element?.querySelector('[data-action="toggle"]')?.setAttribute('aria-expanded', 'false');
    this.emit('close');
  }

  toggle() {
    this.open ? this.close() : this.open();
  }

  setItems(items) {
    this.items = items;
    this.setState({ items });
  }

  addItem(item, index) {
    if (index !== undefined) {
      this.items.splice(index, 0, item);
    } else {
      this.items.push(item);
    }
    this.setState({ items: [...this.items] });
  }

  removeItem(value) {
    this.items = this.items.filter(item => item.value !== value);
    this.setState({ items: [...this.items] });
  }
}

export class SelectDropdown extends Dropdown {
  constructor(options = {}) {
    super(options);
    this.value = options.value;
    this.placeholder = options.placeholder || 'Izaberite...';
    this.searchable = options.searchable || false;
    this.multiple = options.multiple || false;
    this.maxSelected = options.maxSelected;
    this.onChange = options.onChange;
  }

  render() {
    const selectedItems = this.multiple 
      ? this.items.filter(item => this.value?.includes(item.value))
      : this.items.find(item => item.value === this.value);

    const triggerText = this.multiple
      ? selectedItems?.length > 0
        ? selectedItems.map(i => i.label).join(', ')
        : this.placeholder
      : selectedItems?.label || this.placeholder;

    const triggerHtml = `
      <button class="${this.triggerClass}" data-action="toggle" aria-haspopup="listbox" aria-expanded="false" aria-label="${ImperiumUtils.escapeHtml(this.placeholder)}">
        <span class="dropdown-trigger-text" data-ref="triggerText">${ImperiumUtils.escapeHtml(triggerText)}</span>
        ${this.multiple && selectedItems?.length > 0 ? `
          <span class="dropdown-clear" data-action="clear" aria-label="Očisti izbor">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </span>
        ` : ''}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    `;

    const searchHtml = this.searchable ? `
      <div class="dropdown-search">
        <input type="search" class="dropdown-search-input" placeholder="Pretraži..." aria-label="Pretraži opcije" data-ref="searchInput">
      </div>
    ` : '';

    const itemsHtml = this.items.map((item, index) => this.renderSelectItem(item, index)).join('');

    return `
      <div class="dropdown dropdown-select" data-ref="dropdown">
        ${triggerHtml}
        <div class="dropdown-menu ${this.menuClass}" role="listbox" aria-label="${ImperiumUtils.escapeHtml(this.placeholder)}" data-ref="menu">
          ${searchHtml}
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  renderSelectItem(item, index) {
    if (item.divider) {
      return `<hr class="dropdown-divider" role="separator">`;
    }

    if (item.header) {
      return `<div class="dropdown-header">${ImperiumUtils.escapeHtml(item.header)}</div>`;
    }

    const isSelected = this.multiple 
      ? this.value?.includes(item.value)
      : this.value === item.value;

    const iconHtml = item.icon ? `<span class="dropdown-item-icon">${item.icon}</span>` : '';
    const checkHtml = isSelected ? `<svg class="dropdown-item-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` : '';
    const disabled = item.disabled ? 'disabled' : '';

    return `
      <button 
        class="dropdown-item ${disabled} ${isSelected ? 'selected' : ''}" 
        role="option" 
        tabindex="-1"
        data-index="${index}"
        ${disabled ? 'aria-disabled="true"' : ''}
        ${isSelected ? 'aria-selected="true"' : ''}
        data-action="select"
        data-value="${ImperiumUtils.escapeHtml(item.value)}"
      >
        ${iconHtml}
        <span class="dropdown-item-text">${ImperiumUtils.escapeHtml(item.label)}</span>
        ${checkHtml}
      </button>
    `;
  }

  bindEvents() {
    super.bindEvents();
    this.on('click', '[data-action="clear"]', (e) => {
      e.stopPropagation();
      this.value = this.multiple ? [] : null;
      this.setState({ value: this.value });
      if (this.onChange) this.onChange(this.value);
      this.emit('change', { value: this.value });
      this.close();
    });

    if (this.searchable) {
      this.on('input', '.dropdown-search-input', ImperiumUtils.debounce((e) => {
        const query = e.target.value.toLowerCase();
        const items = this.element?.querySelectorAll('.dropdown-item');
        items?.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(query) ? '' : 'none';
        });
      }, 150));
    }
  }

  setValue(value) {
    this.value = value;
    this.setState({ value });
    this.updateTriggerText();
  }

  updateTriggerText() {
    const selectedItems = this.multiple 
      ? this.items.filter(item => this.value?.includes(item.value))
      : this.items.find(item => item.value === this.value);

    const triggerText = this.multiple
      ? selectedItems?.length > 0
        ? selectedItems.map(i => i.label).join(', ')
        : this.placeholder
      : selectedItems?.label || this.placeholder;

    const triggerEl = this.ref('triggerText');
    if (triggerEl) triggerEl.textContent = triggerText;
  }

  open() {
    super.open();
    if (this.searchable) {
      requestAnimationFrame(() => {
        const searchInput = this.ref('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.value = '';
        }
        const items = this.element?.querySelectorAll('.dropdown-item');
        items?.forEach(item => item.style.display = '');
      });
    }
  }
}

export class Tooltip extends Component {
  constructor(options = {}) {
    super(options);
    this.content = options.content || '';
    this.position = options.position || 'top';
    this.delay = options.delay || 200;
    this.trigger = options.trigger || 'hover';
    this._showTimeout = null;
    this._hideTimeout = null;
  }

  render() {
    return `
      <div class="tooltip tooltip-${this.position}" data-ref="tooltip" role="tooltip">
        <div class="tooltip-content">${this.content}</div>
        <div class="tooltip-arrow" aria-hidden="true"></div>
      </div>
    `;
  }

  attach(target) {
    if (typeof target === 'string') {
      target = document.querySelector(target);
    }
    if (!target) return;

    const show = () => {
      this._showTimeout = setTimeout(() => {
        this.show(target);
      }, this.delay);
    };

    const hide = () => {
      if (this._showTimeout) clearTimeout(this._showTimeout);
      this._hideTimeout = setTimeout(() => {
        this.hide();
      }, this.delay);
    };

    if (this.trigger === 'hover' || this.trigger === 'both') {
      target.addEventListener('mouseenter', show);
      target.addEventListener('mouseleave', hide);
      this.element?.addEventListener('mouseenter', show);
      this.element?.addEventListener('mouseleave', hide);
    }

    if (this.trigger === 'focus' || this.trigger === 'both') {
      target.addEventListener('focus', show);
      target.addEventListener('blur', hide);
    }

    this._detach = () => {
      target.removeEventListener('mouseenter', show);
      target.removeEventListener('mouseleave', hide);
      target.removeEventListener('focus', show);
      target.removeEventListener('blur', hide);
    };
  }

  show(target) {
    if (!this.element) {
      this.mount(document.body);
    }

    const rect = target.getBoundingClientRect();
    const tooltipRect = this.element.getBoundingClientRect();
    const gap = 8;

    let top, left;

    switch (this.position) {
      case 'top':
        top = rect.top - tooltipRect.height - gap;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + gap;
        break;
    }

    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
    this.element.style.opacity = '1';
    this.element.style.visibility = 'visible';
    this.element.style.transform = 'translateY(0)';
  }

  hide() {
    if (this.element) {
      this.element.style.opacity = '0';
      this.element.style.visibility = 'hidden';
      this.element.style.transform = this.position === 'top' ? 'translateY(4px)' : 
                                     this.position === 'bottom' ? 'translateY(-4px)' :
                                     this.position === 'left' ? 'translateX(4px)' : 'translateX(-4px)';
    }
  }

  onUnmount() {
    this._detach?.();
  }
}

export class Popover extends Component {
  constructor(options = {}) {
    super(options);
    this.title = options.title;
    this.content = options.content || '';
    this.position = options.position || 'bottom';
    this.trigger = options.trigger || 'click';
    this.open = false;
    this.id = options.id || ImperiumUtils.generateId('popover-');
  }

  render() {
    return `
      <div class="popover popover-${this.position} ${this.open ? 'open' : ''}" role="dialog" aria-labelledby="${this.id}-title" data-ref="popover">
        <div class="popover-arrow" aria-hidden="true"></div>
        ${this.title ? `<h3 class="popover-title" id="${this.id}-title">${ImperiumUtils.escapeHtml(this.title)}</h3>` : ''}
        <div class="popover-content">${this.content}</div>
      </div>
    `;
  }

  attach(target) {
    if (typeof target === 'string') target = document.querySelector(target);
    if (!target) return;

    const toggle = () => this.open ? this.close() : this.openAt(target);
    const close = () => this.close();

    if (this.trigger === 'click') {
      target.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
      });
      document.addEventListener('click', close);
    } else if (this.trigger === 'hover') {
      target.addEventListener('mouseenter', () => this.openAt(target));
      target.addEventListener('mouseleave', close);
      this.element?.addEventListener('mouseenter', () => this.openAt(target));
      this.element?.addEventListener('mouseleave', close);
    }

    this._detach = () => {
      target.removeEventListener('click', toggle);
      target.removeEventListener('mouseenter', () => this.openAt(target));
      target.removeEventListener('mouseleave', close);
      document.removeEventListener('click', close);
    };
  }

  openAt(target) {
    if (!this.element) this.mount(document.body);
    
    const rect = target.getBoundingClientRect();
    const popoverRect = this.element.getBoundingClientRect();
    const gap = 8;

    let top, left;

    switch (this.position) {
      case 'top':
        top = rect.top - popoverRect.height - gap;
        left = rect.left + rect.width / 2 - popoverRect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - popoverRect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - popoverRect.height / 2;
        left = rect.left - popoverRect.width - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - popoverRect.height / 2;
        left = rect.right + gap;
        break;
    }

    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
    this.element.classList.add('open');
    this.open = true;
    this.emit('open');
  }

  close() {
    if (this.element) {
      this.element.classList.remove('open');
    }
    this.open = false;
    this.emit('close');
  }

  onUnmount() {
    this._detach?.();
  }
}