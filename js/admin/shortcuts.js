/**
 * ShortcutManager - Keyboard shortcut registry for admin panel
 * Handles keybind registration, context-aware handlers, combo keys
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

  // Default key combinations
  const DEFAULT_SHORTCUTS = {
    // Global shortcuts
    'mod+k': { action: 'commandPalette', description: 'Otvaranje command palette' },
    'mod+/': { action: 'help', description: 'Prikaži pomoć/shortcuts' },
    'mod+s': { action: 'save', description: 'Sačuvaj formu', context: 'form' },
    'mod+z': { action: 'undo', description: 'Poništi', context: 'form' },
    'mod+shift+z': { action: 'redo', description: 'Ponovi', context: 'form' },
    
    // Navigation
    'mod+1': { action: 'tab:orders', description: 'Tab: Nalog' },
    'mod+2': { action: 'tab:complaints', description: 'Tab: Reklamacije' },
    'mod+3': { action: 'tab:ads', description: 'Tab: Oglasi' },
    'mod+4': { action: 'tab:accounting', description: 'Tab: Knjiženje' },
    'mod+5': { action: 'tab:analytics', description: 'Tab: Analitika' },
    'mod+6': { action: 'tab:trash', description: 'Tab: Korpa' },
    'mod+7': { action: 'tab:customers', description: 'Tab: Kupci' },
    'mod+8': { action: 'tab:employees', description: 'Tab: Zaposleni' },
    'mod+9': { action: 'tab:settings', description: 'Tab: Podesavanja' },
    
    // Modal shortcuts
    'escape': { action: 'closeModal', description: 'Zatvori modal' },
    'mod+w': { action: 'closeModal', description: 'Zatvori modal' },
    
    // Form shortcuts
    'mod+enter': { action: 'submitForm', description: 'Pošalji formu', context: 'form' },
    'mod+shift+enter': { action: 'newLine', description: 'Novi red', context: 'textarea' },
    
    // Search
    'mod+f': { action: 'search', description: 'Pretraga', context: 'searchable' },
    'mod+shift+f': { action: 'advancedSearch', description: 'Napredna pretraga' },
    
    // Refresh
    'mod+r': { action: 'refresh', description: 'Osveži podatke' },
    'mod+shift+r': { action: 'hardRefresh', description: 'Puno osvežavanje' },
  };

  class ShortcutManager {
    constructor() {
      this._shortcuts = new Map(); // key -> { action, handler, context, description, options }
      this._contextStack = ['global']; // context stack
      this._enabled = true;
      this._handler = this._onKeyDown.bind(this);
      this._initialized = false;
    }

    init() {
      if (this._initialized) return;
      
      // Register default shortcuts
      Object.entries(DEFAULT_SHORTCUTS).forEach(([keys, config]) => {
        this.register(keys, config.action, config.description, config.options || {});
      });

      // Global keydown listener
      document.addEventListener('keydown', this._handler);
      
      // Context management for forms/inputs
      document.addEventListener('focusin', this._onFocusIn.bind(this));
      document.addEventListener('focusout', this._onFocusOut.bind(this));

      this._enabled = true;
      this._initialized = true;
    }

    // Register a shortcut
    register(keys, action, description = '', options = {}) {
      const normalizedKeys = this._normalizeKeys(keys);
      const contexts = options.context ? [options.context] : ['global'];
      
      const shortcut = {
        keys: normalizedKeys,
        action,
        description,
        contexts,
        options: {
          preventDefault: options.preventDefault !== false,
          stopPropagation: options.stopPropagation || false,
          repeat: options.repeat || false,
          ...options,
        },
      };

      this._shortcuts.set(normalizedKeys, shortcut);
      
      emit('shortcut:registered', { keys: normalizedKeys, action, description, contexts });
      
      return () => this.unregister(normalizedKeys);
    }

    // Unregister a shortcut
    unregister(keys) {
      const normalizedKeys = this._normalizeKeys(keys);
      const removed = this._shortcuts.delete(normalizedKeys);
      
      if (removed) {
        emit('shortcut:unregistered', { keys: normalizedKeys });
      }
      
      return removed;
    }

    // Get registered shortcut
    get(keys) {
      return this._shortcuts.get(this._normalizeKeys(keys));
    }

    // List all shortcuts
    list(context = null) {
      const shortcuts = Array.from(this._shortcuts.values());
      if (context) {
        return shortcuts.filter(s => s.contexts.includes(context) || s.contexts.includes('global'));
      }
      return shortcuts;
    }

    // Enable/disable all shortcuts
    setEnabled(enabled) {
      this._enabled = enabled;
    }

    isEnabled() {
      return this._enabled;
    }

    // Push context (e.g., when modal opens, form focuses)
    pushContext(context) {
      if (!this._contextStack.includes(context)) {
        this._contextStack.push(context);
      }
    }

    // Pop context
    popContext(context) {
      const index = this._contextStack.lastIndexOf(context);
      if (index !== -1) {
        this._contextStack.splice(index, 1);
      }
    }

    // Get current active contexts
    getActiveContexts() {
      return [...this._contextStack];
    }

    // Check if shortcut matches current contexts
    _matchesContext(shortcut) {
      return shortcut.contexts.some(ctx => this._contextStack.includes(ctx));
    }

    // Normalize key combination string
    _normalizeKeys(keys) {
      return keys
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/cmd|meta|win/g, 'mod')
        .replace(/ctrl/g, 'mod')
        .replace(/alt/g, 'alt')
        .replace(/shift/g, 'shift')
        .split('+')
        .sort()
        .join('+');
    }

    // Build key string from event
    _eventToKeys(e) {
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('mod');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      if (e.key && !['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
        parts.push(e.key.toLowerCase());
      }
      return parts.sort().join('+');
    }

    // Main keydown handler
    _onKeyDown(e) {
      if (!this._enabled) return;
      
      // Don't trigger shortcuts when typing in inputs (except specific contexts)
      const target = e.target;
      const isInput = target.matches('input, textarea, select, [contenteditable="true"]');
      const isEditable = target.isContentEditable;
      
      const keys = this._eventToKeys(e);
      const shortcut = this._shortcuts.get(keys);
      
      if (!shortcut) return;
      
      // Check context match
      if (!this._matchesContext(shortcut)) return;
      
      // Handle input-specific logic
      if (isInput || isEditable) {
        // Allow shortcuts marked for form/textarea contexts
        const allowedContexts = ['form', 'textarea', 'searchable', 'input'];
        const hasAllowedContext = shortcut.contexts.some(c => allowedContexts.includes(c));
        
        // Allow Escape always (close modal)
        if (keys !== 'escape' && !hasAllowedContext && !shortcut.contexts.includes('global')) {
          return; // Let browser handle input normally
        }
      }
      
      // Prevent default if specified
      if (shortcut.options.preventDefault) {
        e.preventDefault();
      }
      
      if (shortcut.options.stopPropagation) {
        e.stopPropagation();
      }
      
      // Handle repeat
      if (e.repeat && !shortcut.options.repeat) return;
      
      // Execute handler
      try {
        this._executeAction(shortcut.action, e);
        emit('shortcut:triggered', { keys: shortcut.keys, action: shortcut.action, event: e });
      } catch (err) {
        console.error(`Shortcut error for "${keys}":`, err);
      }
    }

    // Execute action
    _executeAction(action, originalEvent) {
      const nav = window.NavigationController;
      const modal = window.ModalManager;
      const toast = window.ToastManager;
      const auth = window.AuthManager;
      const store = window.AdminStore;

      switch (action) {
        // Command palette / help
        case 'commandPalette':
          this._openCommandPalette();
          break;
        case 'help':
          this._showHelp();
          break;

        // Save/Undo/Redo
        case 'save':
          this._triggerFormAction('save');
          break;
        case 'undo':
          this._triggerFormAction('undo');
          break;
        case 'redo':
          this._triggerFormAction('redo');
          break;

        // Navigation tabs
        case 'tab:orders':
        case 'tab:complaints':
        case 'tab:ads':
        case 'tab:accounting':
        case 'tab:analytics':
        case 'tab:trash':
        case 'tab:customers':
        case 'tab:employees':
        case 'tab:settings':
        case 'tab:markets':
        case 'tab:products-cms':
          if (window.NavigationController) {
            window.NavigationController.switchTab(action.replace('tab:', ''));
          }
          break;

        // Modal
        case 'closeModal':
          if (window.ModalManager && window.ModalManager.isAnyOpen()) {
            window.ModalManager.closeAll();
          }
          break;

        // Form actions
        case 'submitForm':
          this._submitActiveForm();
          break;
        case 'newLine':
          // Allow default behavior for textarea
          return true;

        // Search
        case 'search':
          this._focusSearch();
          break;
        case 'advancedSearch':
          this._openAdvancedSearch();
          break;

        // Refresh
        case 'refresh':
          this._refreshData();
          break;
        case 'hardRefresh':
          window.location.reload();
          break;

        default:
          // Emit custom action event for app-specific handlers
          emit('shortcut:action', { action, originalEvent: arguments[1] });
      }
    }

    // Focus management
    _onFocusIn(e) {
      const target = e.target;
      if (target.matches('form, [data-form]')) {
        this.pushContext('form');
      }
      if (target.matches('textarea')) {
        this.pushContext('textarea');
      }
      if (target.matches('[data-search], input[type="search"], input[data-search]')) {
        this.pushContext('searchable');
      }
      if (target.closest('.modal')) {
        this.pushContext('modal');
      }
    }

    _onFocusOut(e) {
      const target = e.target;
      if (target.matches('form, [data-form]')) {
        this.popContext('form');
      }
      if (target.matches('textarea')) {
        this.popContext('textarea');
      }
      if (target.matches('[data-search], input[type="search"], input[data-search]')) {
        this.popContext('searchable');
      }
      if (target.closest('.modal')) {
        this.popContext('modal');
      }
    }

    // Helper methods for actions
    _triggerFormAction(action) {
      const form = document.querySelector('form[data-active="true"], form:focus-within, form.dirty');
      if (form) {
        const event = new CustomEvent('form:' + action, { bubbles: true });
        form.dispatchEvent(event);
      }
    }

    _submitActiveForm() {
      const form = document.querySelector('form[data-active="true"], form:focus-within');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    }

    _focusSearch() {
      const search = document.querySelector('[data-search], input[type="search"], input[data-search]');
      if (search) {
        search.focus();
        search.select();
      }
    }

    _openAdvancedSearch() {
      // Emit event for app to handle
      emit('shortcut:advancedSearch', {});
    }

    _refreshData() {
      const store = window.AdminStore;
      if (store) {
        const activeTab = store.getActiveTab();
        emit('data:refresh', { tab: activeTab });
      }
    }

    _openCommandPalette() {
      emit('commandPalette:open', {});
    }

    _showHelp() {
      const shortcuts = this.list();
      const helpText = shortcuts
        .filter(s => s.description)
        .map(s => `${s.keys.toUpperCase().replace('MOD', '⌘/Ctrl')} — ${s.description}`)
        .join('\n');
      
      if (window.ToastManager) {
        window.ToastManager.info('Shortcuts: ' + helpText.substring(0, 200) + '...', 8000);
      }
      console.log('Available shortcuts:', shortcuts);
    }

    // Help dialog
    showHelpDialog() {
      const shortcuts = this.list();
      const html = `
        <div class="shortcuts-help">
          <h3>⌨️ Prečice tastature</h3>
          <div class="shortcuts-list">
            ${shortcuts
              .filter(s => s.description)
              .map(s => `<div><kbd>${s.keys.toUpperCase().replace('MOD', '⌘/Ctrl')}</kbd><span>${s.description}</span></div>`)
              .join('')}
          </div>
        </div>
      `;
      
      if (window.ModalManager) {
        // Create temporary modal for help
        const modal = document.createElement('div');
        modal.id = 'shortcuts-help-modal';
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modal-overlay"></div>
          <div class="modal-content">${html}</div>
        `;
        document.body.appendChild(modal);
        window.ModalManager.open('shortcuts-help-modal');
      }
    }
  }

  // Export singleton
  window.ShortcutManager = new ShortcutManager();
})();
