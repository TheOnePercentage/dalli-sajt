import { AlertBanner, AlertCenter } from '../components/alert-banner.js';
import { CommandPalette } from '../components/command-palette.js';
import { PageHeader, Sidebar, Topbar } from '../components/layout.js';
import { Modal, ToastContainer } from '../components/modals-toasts.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AdminComponents');

export class AdminComponents {
  static ICONS = {
    dashboard:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    'trending-up':
      '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    'shopping-cart':
      '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    package:
      '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    database:
      '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    users:
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    image:
      '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    megaphone: '<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    'share-2':
      '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    'bar-chart-2':
      '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    'dollar-sign':
      '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    globe:
      '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    calculator:
      '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
    'edit-3':
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    sparkles:
      '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/><path d="M5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6z"/>',
  };

  constructor(admin) {
    this.admin = admin;
    this.components = {};
  }

  createAll() {
    this.createToastContainer();
    this.createAlertBanner();
    this.createSidebar();
    this.createTopbar();
    this.createPageHeader();
    this.createModal();
    this.createCommandPalette();

    logger.debug('All components created');
  }

  createToastContainer() {
    this.components.toastContainer = new ToastContainer({
      position: 'bottom-right',
      maxToasts: 5,
    });
    this.components.toastContainer.mount('#toastContainer');
  }

  createAlertBanner() {
    this.components.alertBanner = new AlertBanner({ admin: this.admin });
    this.components.alertBanner.mount('#alertBanner');

    this.components.alertCenter = new AlertCenter({ admin: this.admin });
    this.components.alertCenter.mount('#alertBannerContainer');
  }

  createSidebar() {
    this.components.sidebar = new Sidebar({
      items: this.getNavigationItems(),
      collapsed: this.admin.store.getState().sidebarCollapsed,
      activeSection: this.admin.store.getState().activeSection,
      user: this.admin.store.getState().user,
      onNavigate: section => this.admin.sections.navigateTo(section),
      onToggle: collapsed => this.admin.store.setState({ sidebarCollapsed: collapsed }),
    });
    this.components.sidebar.mount('#sidebar');
  }

  createTopbar() {
    this.components.topbar = new Topbar({
      admin: this.admin,
      user: this.admin.store.getState().user,
      onSearch: query => this.admin.handleGlobalSearch(query),
      onAction: action => this.admin.handleAction(action),
      onLanguageChange: locale => this.admin.setLocale(locale),
      onThemeToggle: () => this.admin.handleThemeToggle(),
    });
    this.components.topbar.mount('#topbar');
  }

  createPageHeader() {
    this.components.pageHeader = new PageHeader({
      admin: this.admin,
      onAction: action => this.admin.handleAction(action),
      onViewChange: view => this.admin.handleViewChange(view),
      onExport: format => this.admin.handleExport(format),
      onDateRangeChange: range => this.admin.handleDateRangeChange(range),
    });
    this.components.pageHeader.mount('#pageHeader');
  }

  createModal() {
    this.components.modal = new Modal({
      id: 'mainModal',
      size: 'md',
      closable: true,
      closeOnOverlay: true,
      closeOnEscape: true,
    });
    this.components.modal.mount('#modalOverlay');
  }

  createCommandPalette() {
    this.components.commandPalette = new CommandPalette({
      admin: this.admin,
      onCommand: command => this.handleCommand(command),
    });
    this.components.commandPalette.mount(document.body);
  }

  getNavigationItems() {
    return [
      {
        title: null,
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: this.getIcon('dashboard'),
            section: 'dashboard',
          },
          {
            id: 'executive',
            label: 'Executive Overview',
            icon: this.getIcon('trending-up'),
            section: 'executive',
          },
        ],
      },
      {
        title: 'Trgovina',
        items: [
          {
            id: 'orders',
            label: 'Porudžbine',
            icon: this.getIcon('shopping-cart'),
            section: 'orders',
          },
          {
            id: 'products',
            label: 'Proizvodi',
            icon: this.getIcon('package'),
            section: 'products',
          },
          {
            id: 'products-elite',
            label: 'Elite Editor',
            icon: this.getIcon('edit-3'),
            section: 'products-elite',
          },
          {
            id: 'inventory',
            label: 'Inventar',
            icon: this.getIcon('database'),
            section: 'inventory',
          },
          {
            id: 'categories',
            label: 'Kategorije',
            icon: this.getIcon('tag'),
            section: 'categories',
          },
        ],
      },
      {
        title: 'Kupci',
        items: [
          { id: 'customers', label: 'Kupci', icon: this.getIcon('users'), section: 'customers' },
          { id: 'reviews', label: 'Recenzije', icon: this.getIcon('star'), section: 'reviews' },
          {
            id: 'community-gallery',
            label: 'Zajednica / Galerija',
            icon: this.getIcon('image'),
            section: 'community-gallery',
          },
        ],
      },
      {
        title: 'Marketing',
        items: [
          {
            id: 'promotions',
            label: 'Promocije',
            icon: this.getIcon('tag'),
            section: 'promotions',
          },
          {
            id: 'campaigns',
            label: 'Kampanje',
            icon: this.getIcon('megaphone'),
            section: 'campaigns',
          },
          { id: 'seo', label: 'SEO Centar', icon: this.getIcon('search'), section: 'seo' },
          { id: 'social', label: 'Social Media', icon: this.getIcon('share-2'), section: 'social' },
        ],
      },
      {
        title: 'Analitika',
        items: [
          {
            id: 'analytics',
            label: 'Analitika',
            icon: this.getIcon('bar-chart-2'),
            section: 'analytics',
          },
          {
            id: 'profit',
            label: 'Profit Centar',
            icon: this.getIcon('dollar-sign'),
            section: 'profit',
          },
          {
            id: 'search-analytics',
            label: 'Pretraga Analitika',
            icon: this.getIcon('search'),
            section: 'search-analytics',
          },
          {
            id: 'growth',
            label: 'Rast i Trendi',
            icon: this.getIcon('trending-up'),
            section: 'growth',
          },
        ],
      },
      {
        title: 'Sistem',
        items: [
          {
            id: 'diagnostics',
            label: 'Dijagnostika',
            icon: this.getIcon('activity'),
            section: 'diagnostics',
          },
          {
            id: 'settings',
            label: 'Postavke',
            icon: this.getIcon('settings'),
            section: 'settings',
          },
          { id: 'roles', label: 'Uloge i Dozvole', icon: this.getIcon('shield'), section: 'roles' },
          {
            id: 'employees',
            label: 'Zaposleni i pristup',
            icon: this.getIcon('users'),
            section: 'employees',
          },
        ],
      },
      {
        title: 'CMS i Tržišta',
        items: [
          {
            id: 'products-cms',
            label: 'Proizvodi CMS',
            icon: this.getIcon('package'),
            section: 'products-cms',
          },
          { id: 'markets', label: 'Tržišta', icon: this.getIcon('globe'), section: 'markets' },
          {
            id: 'accounting',
            label: 'Računovodstvo',
            icon: this.getIcon('calculator'),
            section: 'accounting',
          },
        ],
      },
      {
        title: 'Experience',
        items: [
          {
            id: 'experience-center',
            label: 'Experience Center',
            icon: this.getIcon('sparkles'),
            section: 'experience-center',
          },
        ],
      },
    ];
  }

  getIcon(name) {
    const icons = AdminComponents.ICONS || {};
    return icons[name] || icons.dashboard || '';
  }

  handleCommand(command) {
    switch (command) {
      case 'new-product':
        this.admin.openCreateProductModal();
        break;
      case 'new-order':
        this.admin.navigateTo('orders');
        // Trigger new order creation
        break;
      case 'toggle-sidebar':
        this.admin.toggleSidebar();
        break;
      case 'toggle-theme':
        this.admin.handleThemeToggle();
        break;
      case 'toggle-locale':
        this.admin.handleLocaleToggle();
        break;
      case 'show-shortcuts':
        this.admin.keyboardShortcuts.showShortcuts();
        break;
      case 'logout':
        this.admin.authManager.handleLogout();
        break;
      case 'settings':
        this.admin.sections.navigateTo('settings');
        break;
    }
  }

  get(name) {
    return this.components[name];
  }

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
  get toastContainer() {
    return this.components.toastContainer;
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

  destroy() {
    Object.values(this.components).forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      } else if (component && typeof component.unmount === 'function') {
        component.unmount();
      }
    });
    this.components = {};
  }
}
