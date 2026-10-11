import { Imperium, ThemeManager } from './index.js';
import { AdminComponents } from './services/admin-components.js';
import { AdminEventBus } from './services/admin-event-bus.js';
import { AdminKeyboardShortcuts } from './services/admin-keyboard-shortcuts.js';
import { AdminSections } from './services/admin-sections.js';
import { AuthManager } from './services/auth-manager.js';
import { renderProductForm, templates } from './templates/admin-templates.js';
import { i18n } from './utils/i18n.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('ImperiumAdmin');

// Shared constants for product variants
export const PRODUCT_COLORS = [
  'Bela',
  'Crna',
  'Navy',
  'Siva',
  'Bordeaux',
  'Olive',
  'Roza',
  'Bež',
  'Lavanda',
  'Graphite',
];
export const PRODUCT_SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
  '36-40',
  '41-45',
  'Standard 330ml',
  'One Size',
];

const {
  Component,
  Store,
  Theme,
  API,
  Storage,
  SessionStorage,
  Utils,
  components: {
    Button,
    Input,
    Textarea,
    Select,
    Checkbox,
    Radio,
    Switch,
    Table,
    Pagination,
    Dropdown,
    SelectDropdown,
    Tooltip,
    Popover,
  },
} = Imperium;

/**
 * ImperiumAdmin - DALLI Admin Panel Core Class
 *
 * Main application controller managing:
 * - State management via Store
 * - Component lifecycle (Sidebar, Topbar, PageHeader, Modal, Toast)
 * - Section navigation & lazy loading
 * - Theme management
 * - Keyboard shortcuts & Command Palette
 * - Multi-tab synchronization
 * - Error handling via ErrorBoundary
 *
 * @class ImperiumAdmin
 * @example
 * const admin = new ImperiumAdmin();
 * await admin.init();
 */
class ImperiumAdmin {
  /**
   * @constructor
   * Initializes store, components, and state
   */
  constructor() {
    this.store = new Store({
      user: null,
      sidebarCollapsed: false,
      activeSection: 'dashboard',
      theme: 'auto',
      notifications: [],
      unreadCount: 0,
      loading: false,
      userRole: 'super_admin',
      permissions: {},
    });

    // Core services
    this.authManager = new AuthManager(this);
    this.eventBus = new AdminEventBus(this);
    this.keyboardShortcuts = new AdminKeyboardShortcuts(this);
    this.sections = new AdminSections(this);
    this.components = new AdminComponents(this);

    // State
    this.initialized = false;
    this.performanceMarks = new Map();
    this.t = i18n.t.bind(i18n);
  }

  // Convenience accessors delegated to the AdminComponents service
  get sidebar() {
    return this.components.sidebar;
  }
  get topbar() {
    return this.components.topbar;
  }
  get pageHeader() {
    return this.components.pageHeader;
  }
  get modal() {
    return this.components.modal;
  }
  get commandPalette() {
    return this.components.commandPalette;
  }
  get toast() {
    return this.components.toastContainer;
  }
  get alertBanner() {
    return this.components.alertBanner;
  }
  get alertCenter() {
    return this.components.alertCenter;
  }

  /**
   * Initialize the admin panel
   * Initializes theme, store, components, keyboard shortcuts, and loads user
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async init() {
    if (this.initialized) return;

    // Load saved locale from localStorage or default to 'sr'
    const savedLocale = localStorage.getItem('dalli_admin_locale') || 'sr';
    await i18n.loadLocale(savedLocale);

    // Check authentication before initializing
    const hasAuth = await this.authManager.init();
    if (!hasAuth) {
      return; // Auth modal opened, will continue after login
    }

    this.markPerformance('init:start');

    await this.initTheme();
    this.initStore();
    this.components.createAll();
    this.bindGlobalEvents();
    this.keyboardShortcuts.init();
    this.eventBus.initMultiTabSync();
    await this.loadUser();
    await this.sections.renderInitialSection();
    this.markPerformance('init:complete');

    this.initialized = true;
    this.emit('ready');
    this.reportPerformance();
  }

  // =========================================================================
  // Performance Monitoring
  // =========================================================================

  markPerformance(name) {
    this.performanceMarks.set(name, performance.now());
    performance.mark?.(`dalli:${name}`);
  }

  measurePerformance(name, startMark) {
    const start = this.performanceMarks.get(startMark);
    if (start) {
      const duration = performance.now() - start;
      this.performanceMarks.set(name, duration);
      return duration;
    }
    return null;
  }

  reportPerformance() {
    const initTime = this.measurePerformance('init:total', 'init:start');
    if (initTime) {
      logger.info(`Initialized in ${initTime.toFixed(2)}ms`);
      if (initTime > 1000) {
        logger.warn('Slow initialization detected');
      }
    }
  }

  // =========================================================================
  // Theme Management
  // =========================================================================

  async initTheme() {
    ThemeManager.init();
    ThemeManager.onChange((effective, raw) => {
      this.store.setState({ theme: raw });
      this.updateThemeUI(effective, raw);
    });
    this.updateThemeUI(ThemeManager.getEffectiveTheme(), ThemeManager.currentTheme);
  }

  updateThemeUI(effective, raw) {
    const themeToggle = document.querySelector('[data-action="theme-toggle"]');
    if (themeToggle) {
      themeToggle.setAttribute(
        'aria-label',
        `Trenutna tema: ${raw === 'auto' ? `Auto (${effective})` : raw}`
      );
    }
  }

  handleThemeToggle() {
    ThemeManager.cycleTheme();
  }

  // =========================================================================
  // Store & State
  // =========================================================================

  initStore() {
    this.store.subscribe(state => {
      // Persist selected state
      this.store.persist(['sidebarCollapsed', 'theme', 'activeSection']);
    });
  }

  async loadUser() {
    const user = this.authManager.getUser();
    if (user) {
      this.store.setState({ user });
      this.updateUserUI(user);
    }
  }

  updateUserUI(user) {
    const apply = component => {
      if (!component) return;
      if (typeof component.setUser === 'function') component.setUser(user);
      else if (typeof component.updateUser === 'function') component.updateUser(user);
    };
    apply(this.components.sidebar);
    apply(this.components.topbar);
  }

  // =========================================================================
  // Locale/i18n
  // =========================================================================

  setLocale(locale) {
    if (!['sr', 'en'].includes(locale)) return;

    i18n.loadLocale(locale).then(success => {
      if (success) {
        localStorage.setItem('dalli_admin_locale', locale);
        this.toastContainer?.success(locale === 'sr' ? 'Jezik: Srpski' : 'Language: English');

        if (this.sections.currentSection && this.sections.currentSection.render) {
          this.sections.currentSection.render();
        }

        this.eventBus.broadcast('locale-change', { locale });
        this.emit('locale:change', { locale });
      }
    });
  }

  handleLocaleToggle() {
    const current = localStorage.getItem('dalli_admin_locale') || 'sr';
    this.setLocale(current === 'sr' ? 'en' : 'sr');
  }

  // =========================================================================
  // Global Events
  // =========================================================================

  bindGlobalEvents() {
    // Theme toggle
    const themeToggleBtn = document.querySelector('[data-action="theme-toggle"]');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', e => {
        e.preventDefault();
        this.handleThemeToggle();
      });
    }

    // Window resize
    window.addEventListener('resize', () => {
      this.emit('resize');
    });

    // Action delegation
    this.eventBus.delegate('click', '[data-action]', (e, element) => {
      const action = element.dataset.action;
      this.handleAction(action, element, e);
    });

    // Keyboard shortcuts for language dropdown
    document.querySelectorAll('.language-dropdown').forEach(dropdown => {
      this.keyboardShortcuts.bindLanguageDropdownKeyboard(dropdown);
    });
  }

  handleAction(action, actionEl, e) {
    switch (action) {
      case 'menu-toggle':
        this.toggleSidebar();
        break;
      case 'auth':
        this.authManager.openAuthModal();
        break;
      case 'profile':
        this.sections.navigateTo('profile');
        this.closeAllDrawers();
        break;
      case 'logout':
        this.authManager.handleLogout();
        break;
      case 'theme-toggle':
        this.handleThemeToggle();
        break;
      case 'language-toggle':
        this.handleLocaleToggle();
        break;
      case 'search':
        this.handleGlobalSearch(actionEl.value);
        break;
      case 'notifications-toggle':
        this.toggleNotifications();
        break;
      case 'mark-all-read':
        this.markAllNotificationsRead();
        break;
      case 'view-all-notifications':
        this.sections.navigateTo('notifications');
        break;
      case 'create-product':
        this.openCreateProductModal();
        break;
      case 'export':
        this.handleExport(actionEl.dataset.export);
        break;
      case 'date-range':
        this.handleDateRangeChange(actionEl.dataset.range);
        break;
      case 'column-visibility':
        this.handleColumnVisibility(actionEl.dataset.column);
        break;
      case 'sidebar-toggle':
        this.toggleSidebar();
        break;
      case 'show-shortcuts':
        this.keyboardShortcuts.showShortcuts();
        break;
    }
  }

  // =========================================================================
  // Navigation & Sections
  // =========================================================================

  navigateTo(section) {
    return this.sections.navigateTo(section);
  }

  toggleSidebar(collapsed) {
    const newState = collapsed !== undefined ? collapsed : !this.store.getState().sidebarCollapsed;
    this.store.setState({ sidebarCollapsed: newState });
    this.eventBus.broadcast('sidebar-toggle', { collapsed: newState });
  }

  closeAllDrawers() {
    document.querySelectorAll('.drawer.open').forEach(drawer => {
      drawer.classList.remove('open');
    });
  }

  // =========================================================================
  // Notifications
  // =========================================================================

  toggleNotifications() {
    // Handled by Topbar component
  }

  handleNotificationClick(notification) {
    if (notification.action) {
      this.navigateTo(notification.action.section);
    }
  }

  markAllNotificationsRead() {
    this.store.setState({ unreadCount: 0 });
    this.emit('notifications:read-all');
  }

  // =========================================================================
  // Search
  // =========================================================================

  handleGlobalSearch(query) {
    this.emit('search', { query });
    // Section-specific search handled by active section
  }

  // =========================================================================
  // Product Modals
  // =========================================================================

  openCreateProductModal(product = null) {
    this.components.modal.open({
      title: product ? 'Uredi proizvod' : 'Novi proizvod',
      size: 'xl',
      children: renderProductForm(product),
      onClose: () => this.components.modal.close(),
    });

    setTimeout(() => this.bindProductFormEvents(product), 0);
  }

  bindProductFormEvents(product) {
    const form = document.getElementById('productForm');
    if (!form) return;

    // Add variant
    form.addEventListener('click', e => {
      if (e.target.closest('[data-action="add-variant"]')) {
        const editor = document.getElementById('variantsEditor');
        const index = editor.querySelectorAll('.variant-row').length;
        const newRow = document.createElement('div');
        newRow.className = 'variant-row';
        newRow.innerHTML = templates.variantRow({}, index);
        editor.appendChild(newRow);
      }
    });

    // Remove variant
    form.addEventListener('click', e => {
      const btn = e.target.closest('[data-action="remove-variant"]');
      if (btn) {
        btn.closest('.variant-row')?.remove();
        this.reindexVariants();
      }
    });

    // Cancel
    form.addEventListener('click', e => {
      if (e.target.closest('[data-action="cancel"]')) {
        this.components.modal.close();
      }
    });

    // Real-time validation clear on input/change
    form.querySelectorAll('input, select, textarea').forEach(input => {
      const clearError = () => {
        input.classList.remove('input-error');
        const errorEl = input.parentNode.querySelector('.field-error');
        errorEl?.remove();
      };
      input.addEventListener('input', clearError, { once: false });
      input.addEventListener('change', clearError, { once: false });
    });

    // Submit
    form.addEventListener('submit', async e => {
      e.preventDefault();

      // Clear previous errors
      form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
      form.querySelectorAll('.field-error').forEach(el => el.remove());

      // Validation
      const requiredFields = [
        { id: 'productName', label: 'Naziv' },
        { id: 'productCollection', label: 'Kolekcija' },
        { id: 'productGender', label: 'Pol' },
        { id: 'productCategory', label: 'Kategorija' },
      ];

      let isValid = true;
      let firstInvalid = null;

      const showError = (input, message) => {
        input.classList.add('input-error');
        const errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        errorEl.style.cssText =
          'display: block; color: var(--color-error); font-size: var(--fs-xs); margin-top: var(--space-1);';
        errorEl.textContent = message;
        input.parentNode.appendChild(errorEl);
      };

      requiredFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (!input || !input.value.trim()) {
          isValid = false;
          showError(input, `${field.label} je obavezno`);
          if (!firstInvalid) firstInvalid = input;
        }
      });

      // Validate hierarchy consistency
      const collection = document.getElementById('productCollection')?.value;
      const gender = document.getElementById('productGender')?.value;
      const category = document.getElementById('productCategory')?.value;

      if (collection && gender && category) {
        const CATEGORIES = {
          casual: {
            men: ['t-shirts', 'hoodies', 'tracksuits', 'shorts', 'jackets', 'essentials'],
            women: [
              't-shirts',
              'hoodies',
              'leggings',
              'tracksuits',
              'matching-sets',
              'jackets',
              'essentials',
            ],
            unisex: ['accessories', 'essentials'],
          },
          elegance: {
            men: ['shirts', 'blazers', 'suits', 'trousers', 'coats'],
            women: ['dresses', 'shirts', 'blazers', 'elegant-trousers', 'coats'],
            unisex: ['accessories'],
          },
        };

        const validCategories = CATEGORIES[collection]?.[gender] || [];
        if (!validCategories.includes(category)) {
          isValid = false;
          const categoryInput = document.getElementById('productCategory');
          showError(
            categoryInput,
            `Kategorija "${category}" nije validna za ${collection}/${gender}`
          );
          if (!firstInvalid) firstInvalid = categoryInput;
        }
      }

      if (!isValid) {
        if (firstInvalid) {
          firstInvalid.focus();
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        this.toastContainer.error('Popunite sva obavezna polja');
        return;
      }

      const formData = new FormData(form);
      // Submit logic would go here
      this.toastContainer.success(product ? 'Proizvod ažuriran' : 'Proizvod kreiran');
      this.components.modal.close();
    });
  }

  reindexVariants() {
    const editor = document.getElementById('variantsEditor');
    if (!editor) return;
    editor.querySelectorAll('.variant-row').forEach((row, index) => {
      row.dataset.index = index;
      row.querySelectorAll('[name]').forEach(input => {
        input.name = input.name.replace(/variants\[\d+\]/, `variants[${index}]`);
      });
      const removeBtn = row.querySelector('[data-action="remove-variant"]');
      if (removeBtn) removeBtn.dataset.index = index;
    });
  }

  // =========================================================================
  // Export/Import
  // =========================================================================

  handleExport(format) {
    this.emit('export', { format });
  }

  handleDateRangeChange(range) {
    this.emit('date-range:change', { range });
  }

  handleColumnVisibility(column) {
    this.emit('column-visibility:change', { column });
  }

  handleViewChange(view) {
    this.emit('view:change', { view });
  }

  // =========================================================================
  // Event Bus Delegation
  // =========================================================================

  emit(event, detail) {
    this.eventBus.emit(event, detail);
  }

  on(event, handler) {
    return this.eventBus.on(event, handler);
  }

  delegate(eventType, selector, handler) {
    return this.eventBus.delegate(eventType, selector, handler);
  }

  // =========================================================================
  // Toast Shortcuts
  // =========================================================================

  get toastContainerRef() {
    return this.components.toastContainer;
  }

  get toastContainer() {
    return this.toastContainerRef;
  }

  showToast(message, type = 'info', options = {}) {
    return this.toastContainerRef?.show({ message, type, ...options });
  }

  success(message, options) {
    return this.showToast(message, 'success', options);
  }
  error(message, options) {
    return this.showToast(message, 'error', options);
  }
  warning(message, options) {
    return this.showToast(message, 'warning', options);
  }
  info(message, options) {
    return this.showToast(message, 'info', options);
  }

  // =========================================================================
  // Modal Shortcuts
  // =========================================================================

  openModal(options) {
    return this.components.modal.open(options);
  }

  closeModal() {
    return this.components.modal.close();
  }

  confirm(message, options = {}) {
    return this.components.modal.confirm(message, options);
  }

  // =========================================================================
  // Permissions
  // =========================================================================

  checkPermissions(requiredPermissions) {
    const user = this.store.getState().user;
    if (!user) return false;
    if (user.permissions?.includes('*')) return true;
    return requiredPermissions.every(p => user.permissions?.includes(p));
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy() {
    this.authManager.destroy();
    this.eventBus.destroy();
    this.keyboardShortcuts.destroy();
    this.sections.destroy();
    this.components.destroy();
    this.initialized = false;
  }
}

/**
 * Error Boundary for catching and handling errors
 */
class ErrorBoundary {
  constructor() {
    this.handlers = [];
    this.isHandling = false;
  }

  onError(handler) {
    this.handlers.push(handler);
  }

  handleError(error, context = {}) {
    if (this.isHandling) return;
    this.isHandling = true;

    logger.error({ err: error, context }, '[ErrorBoundary]');

    this.handlers.forEach(handler => {
      try {
        handler(error, context);
      } catch (e) {
        logger.error({ err: e }, '[ErrorBoundary] Handler error');
      }
    });

    setTimeout(() => {
      this.isHandling = false;
    }, 0);
  }

  reportToMonitoring(error, context) {
    // Integration point for Sentry, etc.
  }

  wrap(fn, context = {}) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(error, context);
        throw error;
      }
    };
  }

  wrapAsync(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error, context);
        throw error;
      }
    };
  }
}

// Error Boundary Component for React-like error boundaries
class ErrorBoundaryComponent extends Component {
  constructor(options = {}) {
    super(options);
    this.fallback = options.fallback || this.defaultFallback;
    this.onError = options.onError;
    this.hasError = false;
    this.error = null;
  }

  componentDidCatch(error, errorInfo) {
    this.hasError = true;
    this.error = error;
    this.onError?.(error, errorInfo);
    this.setState({});
  }

  defaultFallback(error) {
    return `
      <div class="error-boundary" style="padding: var(--space-8); text-align: center;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="1.5" style="margin-bottom: var(--space-4);">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Nešto je pošlo po zlu</h3>
        <p style="color: var(--color-text-secondary); margin: var(--space-2) 0;">${error?.message || 'Došlo je do neočekivane greške'}</p>
        <button class="btn btn-primary" onclick="location.reload()">Osveži stranicu</button>
      </div>
    `;
  }

  render() {
    if (this.hasError) {
      return this.fallback(this.error);
    }
    return this.props.children || '';
  }
}

// Export
export { ErrorBoundary, ErrorBoundaryComponent, ImperiumAdmin };

// Initialize on DOM ready
if (typeof window !== 'undefined') {
  window.ImperiumAdmin = ImperiumAdmin;
  window.ErrorBoundary = ErrorBoundary;
  window.ErrorBoundaryComponent = ErrorBoundaryComponent;
}

export default ImperiumAdmin;
