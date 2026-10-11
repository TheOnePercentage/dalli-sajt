import { log, createLogger } from '../utils/logger.js';
import { renderShortcutsModal } from '../templates/admin-templates.js';

const logger = createLogger('AdminKeyboardShortcuts');

export class AdminKeyboardShortcuts {
  constructor(admin) {
    this.admin = admin;
    this.shortcuts = new Map();
    this.enabled = true;
    this.modalOpen = false;
  }

  init() {
    this.registerDefaults();
    this.bindGlobalListener();
    logger.debug('Keyboard shortcuts initialized');
  }

  registerDefaults() {
    // Global shortcuts
    this.register('ctrl+k', 'Otvori pretragu', () => this.admin.handleAction('search'));
    this.register('ctrl+shift+k', 'Prikaži prečice', () => this.showShortcuts());
    this.register('ctrl+/', 'Prikaži prečice', () => this.showShortcuts());
    this.register('escape', 'Zatvori modal/pretragu', () => this.handleEscape());
    
    // Navigation
    this.register('ctrl+1', 'Dashboard', () => this.admin.navigateTo('dashboard'));
    this.register('ctrl+2', 'Porudžbine', () => this.admin.navigateTo('orders'));
    this.register('ctrl+3', 'Proizvodi', () => this.admin.navigateTo('products'));
    this.register('ctrl+4', 'Kupci', () => this.admin.navigateTo('customers'));
    this.register('ctrl+5', 'Analitika', () => this.admin.navigateTo('analytics'));
    this.register('ctrl+6', 'Postavke', () => this.admin.navigateTo('settings'));
    
    // Actions
    this.register('ctrl+n', 'Novi proizvod', () => this.admin.openCreateProductModal());
    this.register('ctrl+s', 'Sačuvaj', () => this.handleSave());
    this.register('ctrl+shift+s', 'Sačuvaj kao', () => this.handleSaveAs());
    
    // UI
    this.register('ctrl+b', 'Toggle sidebar', () => this.admin.toggleSidebar());
    this.register('ctrl+shift+t', 'Toggle tema', () => this.handleThemeToggle());
    this.register('ctrl+l', 'Toggle jezik', () => this.handleLocaleToggle());
  }

  register(keyCombo, description, handler) {
    const normalized = this.normalizeKey(keyCombo);
    this.shortcuts.set(normalized, { description, handler, keyCombo });
  }

  unregister(keyCombo) {
    const normalized = this.normalizeKey(keyCombo);
    this.shortcuts.delete(normalized);
  }

  normalizeKey(keyCombo) {
    return keyCombo.toLowerCase()
      .replace(/\s+/g, '')
      .replace('control', 'ctrl')
      .replace('meta', 'cmd')
      .replace('alt', 'alt')
      .replace('shift', 'shift');
  }

  matchEvent(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    
    const key = e.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      parts.push(key);
    }
    
    return parts.join('+');
  }

  bindGlobalListener() {
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      
      // Don't trigger shortcuts in input fields (except Escape)
      const activeElement = document.activeElement;
      const isInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable
      );
      
      if (isInput && e.key !== 'Escape') return;

      const combo = this.matchEvent(e);
      const shortcut = this.shortcuts.get(combo);
      
      if (shortcut) {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          shortcut.handler(e);
          logger.trace(`Shortcut triggered: ${combo}`);
        } catch (error) {
          logger.error({ err: error }, `Error executing shortcut: ${combo}`);
        }
      }
    });
  }

  handleEscape() {
    // Close modals
    document.querySelectorAll('.modal-overlay.open').forEach(modal => {
      const modalInstance = modal.__modalInstance;
      if (modalInstance) {
        modalInstance.close();
      }
    });
    
    // Close dropdowns
    document.querySelectorAll('.dropdown-menu[aria-expanded="true"]').forEach(menu => {
      menu.setAttribute('aria-expanded', 'false');
      const trigger = document.querySelector(`[aria-controls="${menu.id}"]`);
      trigger?.setAttribute('aria-expanded', 'false');
    });
    
    // Clear search
    const searchInput = document.querySelector('.search-input:focus');
    if (searchInput) {
      searchInput.blur();
      searchInput.value = '';
    }
  }

  handleSave() {
    // Trigger save on current section if it has a save method
    if (this.admin.currentSection && typeof this.admin.currentSection.save === 'function') {
      this.admin.currentSection.save();
    }
  }

  handleSaveAs() {
    if (this.admin.currentSection && typeof this.admin.currentSection.saveAs === 'function') {
      this.admin.currentSection.saveAs();
    }
  }

  handleThemeToggle() {
    const themeToggle = document.querySelector('[data-action="theme-toggle"]');
    if (themeToggle) {
      themeToggle.click();
    }
  }

  handleLocaleToggle() {
    const langDropdown = document.querySelector('[data-action="language-toggle"]');
    if (langDropdown) {
      langDropdown.click();
    }
  }

  showShortcuts() {
    const shortcuts = this.getShortcuts();
    const html = renderShortcutsModal(shortcuts);

    const modal = this.admin.openModal({
      title: 'Prečice na tastaturi',
      size: 'lg',
      children: html
    });

    modal.element.querySelector('.shortcuts-modal').style.cssText = `
      max-height: 60vh;
      overflow-y: auto;
    `;
  }

  categorizeShortcut(keyCombo) {
    if (keyCombo.startsWith('ctrl+') && keyCombo.length <= 6) return 'Navigacija';
    if (keyCombo.includes('shift')) return 'Akcije';
    if (keyCombo === 'escape') return 'Opšte';
    if (keyCombo.includes('k') || keyCombo.includes('/')) return 'Pretraga';
    return 'UI';
  }

  formatKeyCombo(keyCombo) {
    return keyCombo
      .split('+')
      .map(k => k.charAt(0).toUpperCase() + k.slice(1))
      .join(' + ');
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setModalOpen(open) {
    this.modalOpen = open;
  }

  getShortcuts() {
    return Array.from(this.shortcuts.entries()).map(([key, { description, keyCombo }]) => ({
      key: keyCombo,
      description
    }));
  }

  bindLanguageDropdownKeyboard(dropdown) {
    if (!dropdown) return;
    const getItems = () => Array.from(
      dropdown.querySelectorAll('[data-locale], .language-option, [role="menuitem"]')
    );
    dropdown.addEventListener('keydown', (e) => {
      const items = getItems();
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          items[(currentIndex + 1 + items.length) % items.length].focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          items[(currentIndex - 1 + items.length) % items.length].focus();
          break;
        case 'Home':
          e.preventDefault();
          items[0].focus();
          break;
        case 'End':
          e.preventDefault();
          items[items.length - 1].focus();
          break;
        case 'Escape':
          e.preventDefault();
          dropdown.classList.remove('open');
          if (dropdown.contains(document.activeElement)) document.activeElement.blur();
          break;
        default:
          break;
      }
    });
  }

  destroy() {
    this.shortcuts.clear();
    this.enabled = true;
  }
}