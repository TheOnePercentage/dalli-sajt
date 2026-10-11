import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

/**
 * Sidebar Component - Admin Navigation Sidebar
 * 
 * Renders collapsible navigation sidebar with:
 * - Brand/logo section
 * - Navigation sections with items
 * - User info footer
 * - Collapse/expand toggle
 * 
 * @extends Component
 * @example
 * const sidebar = new Sidebar({
 *   brand: { name: 'DALLI', icon: '<svg>...</svg>' },
 *   items: [{ title: 'Trgovina', items: [{ section: 'orders', label: 'Porudžbine', icon: '...' }] }],
 *   collapsed: false,
 *   onNavigate: (section) => navigateTo(section)
 * });
 */
export class Sidebar extends Component {
  /**
   * @constructor
   * @param {Object} options
   * @param {Array} options.items - Navigation sections and items
   * @param {boolean} options.collapsed - Initial collapsed state
   * @param {string} options.activeSection - Currently active section
   * @param {Function} options.onNavigate - Navigation callback
   * @param {Object} options.user - Current user object
   * @param {Object} options.brand - Brand config { name, icon }
   */
  constructor(options = {}) {
    super(options);
    this.items = options.items || [];
    this.collapsed = options.collapsed || false;
    this.activeSection = options.activeSection || null;
    this.onNavigate = options.onNavigate;
    this.brand = options.brand || { name: 'DALLI', icon: '' };
    this.user = options.user || null;
    this.id = options.id || ImperiumUtils.generateId('sidebar-');
  }

  render() {
    const navHtml = this.items.map(section => this.renderSection(section)).join('');
    const userHtml = this.user ? this.renderUser() : '';

    return `
      <aside class="sidebar ${this.collapsed ? 'collapsed' : ''}" role="navigation" aria-label="Glavna navigacija" data-ref="sidebar">
        <div class="sidebar-brand">
          <a href="#" class="brand-link" aria-label="${ImperiumUtils.escapeHtml(this.brand.name)} Dashboard">
            <div class="brand-icon" aria-hidden="true">
              ${this.brand.icon || this.renderDefaultIcon()}
            </div>
            <span class="brand-text">${ImperiumUtils.escapeHtml(this.brand.name)}</span>
          </a>
        </div>

        <nav class="sidebar-nav" aria-label="Admin sekcije" data-ref="nav">
          ${navHtml}
        </nav>

        ${userHtml}

        <button class="sidebar-toggle" aria-label="${this.collapsed ? 'Proširi meni' : 'Sažmi meni'}" aria-expanded="${!this.collapsed}" data-action="toggle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="${this.collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'}"/>
          </svg>
        </button>
      </aside>
    `;
  }

  renderDefaultIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect width="48" height="48" rx="12" fill="currentColor"/>
        <path d="M14 16h20M14 24h16M14 32h12" stroke="white" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `;
  }

  renderSection(section) {
    const itemsHtml = section.items.map(item => this.renderItem(item)).join('');
    const titleHtml = section.title ? `<span class="nav-section-title">${ImperiumUtils.escapeHtml(section.title)}</span>` : '';

    return `
      <div class="nav-section">
        ${titleHtml}
        ${itemsHtml}
      </div>
    `;
  }

  renderItem(item) {
    const active = this.activeSection === item.section;
    const badgeHtml = item.badge ? `<span class="nav-badge ${item.badgeVariant || ''}">${ImperiumUtils.escapeHtml(item.badge)}</span>` : '';

    return `
      <a href="#" class="nav-item ${active ? 'active' : ''}" data-section="${ImperiumUtils.escapeHtml(item.section)}" ${active ? 'aria-current="page"' : ''} data-action="navigate">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          ${item.icon}
        </svg>
        <span>${ImperiumUtils.escapeHtml(item.label)}</span>
        ${badgeHtml}
      </a>
    `;
  }

  renderUser() {
    const initials = this.user.name ? this.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    const avatarColor = this.user.color || 'primary';

    return `
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar avatar-${avatarColor}" aria-hidden="true">${ImperiumUtils.escapeHtml(initials)}</div>
          <div class="user-details">
            <span class="user-name">${ImperiumUtils.escapeHtml(this.user.name || 'Korisnik')}</span>
            <span class="user-role">${ImperiumUtils.escapeHtml(this.user.role || 'Admin')}</span>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    super.bindEvents();
    this.on('click', '[data-action="navigate"]', (e) => {
      e.preventDefault();
      const section = e.delegateTarget.dataset.section;
      this.setActiveSection(section);
      if (this.onNavigate) this.onNavigate(section);
      this.emit('navigate', { section });
    });

    this.on('click', '[data-action="toggle"]', () => {
      this.toggleCollapse();
    });
  }

  setActiveSection(section) {
    this.activeSection = section;
    this.setState({ activeSection: section });
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.setState({ collapsed: this.collapsed });
    this.emit('collapse-toggle', { collapsed: this.collapsed });
  }

  setItems(items) {
    this.items = items;
    this.setState({ items });
  }

  setUser(user) {
    this.user = user;
    this.setState({ user });
  }
}

/**
 * Topbar Component - Admin Header Bar
 * 
 * Renders top navigation bar with:
 * - Mobile menu toggle
 * - Search input with results
 * - Action buttons
 * - Notifications dropdown
 * - User menu dropdown
 * - Theme toggle
 * 
 * @extends Component
 * @example
 * const topbar = new Topbar({
 *   searchable: true,
 *   showThemeToggle: true,
 *   showNotifications: true,
 *   showUserMenu: true,
 *   onSearch: (query) => handleSearch(query),
 *   onNotificationClick: (notif) => handleNotification(notif)
 * });
 */
export class Topbar extends Component {
  /**
   * @constructor
   * @param {Object} options
   * @param {boolean} options.searchable - Show search input
   * @param {string} options.searchPlaceholder - Search placeholder text
   * @param {boolean} options.showThemeToggle - Show theme toggle
   * @param {boolean} options.showNotifications - Show notifications dropdown
   * @param {boolean} options.showUserMenu - Show user menu
   * @param {Array} options.notifications - Notification items
   * @param {number} options.unreadCount - Unread notification count
   * @param {Object} options.user - Current user object
   * @param {Function} options.onSearch - Search callback
   * @param {Function} options.onNotificationClick - Notification click handler
   * @param {Function} options.onMarkAllRead - Mark all read callback
   */
  constructor(options = {}) {
    super(options);
    this.title = options.title || '';
    this.subtitle = options.subtitle || '';
    this.actions = options.actions || [];
    this.searchable = options.searchable !== false;
    this.searchPlaceholder = options.searchPlaceholder || 'Pretraži...';
    this.showThemeToggle = options.showThemeToggle !== false;
    this.showNotifications = options.showNotifications !== false;
    this.showUserMenu = options.showUserMenu !== false;
    this.notifications = options.notifications || [];
    this.unreadCount = options.unreadCount || 0;
    this.user = options.user || null;
    this.onSearch = options.onSearch;
    this.onNotificationClick = options.onNotificationClick;
    this.onMarkAllRead = options.onMarkAllRead;
    this.id = options.id || ImperiumUtils.generateId('topbar-');
    this._searchOpen = false;
  }

  render() {
    const searchHtml = this.searchable ? this.renderSearch() : '';
    const actionsHtml = this.renderActions();
    const notificationsHtml = this.showNotifications ? this.renderNotifications() : '';
    const userMenuHtml = this.showUserMenu ? this.renderUserMenu() : '';

    return `
      <header class="topbar" role="banner" data-ref="topbar">
        <button class="mobile-menu-btn" aria-label="Otvori meni" aria-expanded="false" data-action="menu-toggle">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        ${searchHtml}

        <div class="topbar-actions">
          ${actionsHtml.join('')}
          
          ${this.showThemeToggle ? `
            <button class="icon-btn" aria-label="Preklopi temu" title="Tema" data-action="theme-toggle">
              <svg class="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              <svg class="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
          ` : ''}

          ${notificationsHtml}
          ${userMenuHtml}
        </div>
      </header>
    `;
  }

  renderSearch() {
    return `
      <div class="topbar-search ${this._searchOpen ? 'mobile-open' : ''}" data-ref="search">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input type="search" class="search-input" placeholder="${ImperiumUtils.escapeHtml(this.searchPlaceholder)}" aria-label="Globalna pretraga" autocomplete="off" data-ref="searchInput">
        <div class="search-results" role="listbox" aria-label="Rezultati pretrage" data-ref="searchResults"></div>
        <kbd class="search-shortcut">⌘K</kbd>
      </div>
    `;
  }

  renderActions() {
    return this.actions.map(action => {
      if (action.type === 'button') {
        return `
          <button class="btn ${action.variant ? `btn-${action.variant}` : 'btn-secondary'} ${action.size ? `btn-${action.size}` : ''}" 
                  ${action.disabled ? 'disabled' : ''} 
                  data-action="${action.action}">
            ${action.icon ? `<span class="btn-icon">${action.icon}</span>` : ''}
            ${action.label}
          </button>
        `;
      }
      if (action.type === 'divider') {
        return `<div class="topbar-divider" aria-hidden="true"></div>`;
      }
      return '';
    });
  }

  renderNotifications() {
    const itemsHtml = this.notifications.slice(0, 5).map(notif => `
      <div class="dropdown-item ${!notif.read ? 'unread' : ''}" data-id="${ImperiumUtils.escapeHtml(notif.id)}">
        <div class="dropdown-item-icon" style="background: ${notif.color || 'var(--color-bg-tertiary)'}; color: ${notif.iconColor || 'var(--color-text-secondary)'}">
          ${notif.icon || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'}
        </div>
        <div class="dropdown-item-content">
          <div class="dropdown-item-title">${ImperiumUtils.escapeHtml(notif.title)}</div>
          <div class="dropdown-item-message">${ImperiumUtils.escapeHtml(notif.message)}</div>
          <div class="dropdown-item-time">${ImperiumUtils.formatRelativeTime(notif.time)}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="dropdown" data-ref="notificationsDropdown">
        <button class="icon-btn" aria-label="Obaveštenja" aria-expanded="false" data-action="notifications-toggle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          ${this.unreadCount > 0 ? `<span class="notification-dot ${this.unreadCount > 0 ? 'visible' : ''}" aria-hidden="true"></span>` : ''}
        </button>
        <div class="notifications-dropdown" role="menu" aria-label="Obaveštenja" data-ref="notificationsMenu">
          <div class="dropdown-header">
            <h3>Obaveštenja</h3>
            ${this.unreadCount > 0 ? `<button class="mark-all-read" data-action="mark-all-read">Označi sve pročitano</button>` : ''}
          </div>
          <div class="dropdown-list" data-ref="notificationsList">
            ${itemsHtml || '<div class="dropdown-empty">Nema obaveštenja</div>'}
          </div>
          ${this.notifications.length > 5 ? `
            <div class="dropdown-footer">
              <a href="#" data-section="notifications" data-action="view-all">Prikaži sva obaveštenja</a>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderUserMenu() {
    const initials = this.user?.name ? this.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

    return `
      <div class="dropdown" data-ref="userDropdown">
        <button class="user-menu-btn" aria-label="Korisnički meni" aria-expanded="false" data-action="user-menu-toggle">
          <div class="user-avatar-sm">${ImperiumUtils.escapeHtml(initials)}</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="user-dropdown" role="menu" aria-label="Korisnički meni" data-ref="userMenu">
          <div class="dropdown-header">
            <div class="user-avatar avatar-primary" aria-hidden="true">${ImperiumUtils.escapeHtml(initials)}</div>
            <div>
              <div class="user-name">${ImperiumUtils.escapeHtml(this.user?.name || 'Korisnik')}</div>
              <div class="user-role">${ImperiumUtils.escapeHtml(this.user?.role || 'Admin')}</div>
            </div>
          </div>
          <hr class="dropdown-divider">
          <a href="#" class="dropdown-item" role="menuitem" data-section="profile" data-action="profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profil
          </a>
          <a href="#" class="dropdown-item" role="menuitem" data-section="settings" data-action="settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Postavke
          </a>
          <hr class="dropdown-divider">
          <button class="dropdown-item danger" role="menuitem" data-action="logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Odjavi se
          </button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    super.bindEvents();

    if (this.searchable) {
      this.on('input', '.search-input', ImperiumUtils.debounce((e) => {
        if (this.onSearch) this.onSearch(e.target.value);
        this.emit('search', { query: e.target.value });
      }, 200));

      this.on('focus', '.search-input', () => {
        this._searchOpen = true;
        this.setState({ _searchOpen: true });
      });

      this.on('blur', '.search-input', () => {
        setTimeout(() => {
          this._searchOpen = false;
          this.setState({ _searchOpen: false });
        }, 200);
      });

      this.on('keydown', '.search-input', (e) => {
        if (e.key === 'Escape') {
          e.target.blur();
        }
      });
    }

    this.on('click', '[data-action="theme-toggle"]', () => {
      this.emit('theme-toggle');
    });

    this.on('click', '[data-action="notifications-toggle"]', () => {
      this.emit('notifications-toggle');
    });

    this.on('click', '[data-action="mark-all-read"]', () => {
      if (this.onMarkAllRead) this.onMarkAllRead();
      this.emit('mark-all-read');
    });

    this.on('click', '.notifications-dropdown .dropdown-item[data-id]', (e) => {
      const id = e.delegateTarget.dataset.id;
      const notif = this.notifications.find(n => n.id == id);
      if (notif && this.onNotificationClick) {
        this.onNotificationClick(notif);
      }
      this.emit('notification-click', { notification: notif });
    });

    this.on('click', '[data-action="user-menu-toggle"]', () => {
      this.emit('user-menu-toggle');
    });

    this.on('click', '[data-action="profile"]', () => {
      this.emit('profile');
    });

    this.on('click', '[data-action="settings"]', () => {
      this.emit('settings');
    });

    this.on('click', '[data-action="logout"]', () => {
      this.emit('logout');
    });

    this.on('click', '[data-action="view-all"]', () => {
      this.emit('view-all-notifications');
    });

    this.on('click', '[data-action="menu-toggle"]', () => {
      this.emit('menu-toggle');
    });

    this.actions.forEach(action => {
      if (action.action) {
        this.on('click', `[data-action="${action.action}"]`, () => {
          if (action.onClick) action.onClick();
          this.emit(`action:${action.action}`);
        });
      }
    });
  }

  setNotifications(notifications) {
    this.notifications = notifications;
    this.unreadCount = notifications.filter(n => !n.read).length;
    this.setState({ notifications, unreadCount: this.unreadCount });
  }

  setUnreadCount(count) {
    this.unreadCount = count;
    this.setState({ unreadCount: count });
  }

  setUser(user) {
    this.user = user;
    this.setState({ user });
  }
}

export class PageHeader extends Component {
  constructor(options = {}) {
    super(options);
    this.title = options.title || '';
    this.subtitle = options.subtitle || '';
    this.actions = options.actions || [];
    this.breadcrumbs = options.breadcrumbs || [];
    this.id = options.id || ImperiumUtils.generateId('page-header-');
  }

  render() {
    const breadcrumbsHtml = this.breadcrumbs.length > 0 ? this.renderBreadcrumbs() : '';
    const actionsHtml = this.actions.map(action => this.renderAction(action)).join('');

    return `
      <div class="page-header" data-ref="header">
        ${breadcrumbsHtml}
        <div class="page-title-group">
          <h1 class="page-title">${ImperiumUtils.escapeHtml(this.title)}</h1>
          ${this.subtitle ? `<p class="page-subtitle">${ImperiumUtils.escapeHtml(this.subtitle)}</p>` : ''}
        </div>
        <div class="page-actions">
          ${actionsHtml}
        </div>
      </div>
    `;
  }

  renderBreadcrumbs() {
    return `
      <nav class="breadcrumbs" aria-label="Breadcrumb" data-ref="breadcrumbs">
        <ol class="breadcrumbs-list">
          ${this.breadcrumbs.map((crumb, index) => `
            <li class="breadcrumbs-item">
              ${index > 0 ? '<svg class="breadcrumbs-separator" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' : ''}
              ${index === this.breadcrumbs.length - 1 ? 
                `<span class="breadcrumbs-current" aria-current="page">${ImperiumUtils.escapeHtml(crumb.label)}</span>` :
                `<a href="${ImperiumUtils.escapeHtml(crumb.href || '#')}" class="breadcrumbs-link">${ImperiumUtils.escapeHtml(crumb.label)}</a>`
              }
            </li>
          `).join('')}
        </ol>
      </nav>
    `;
  }

  renderAction(action) {
    if (action.type === 'button') {
      return `
        <button class="btn ${action.variant ? `btn-${action.variant}` : 'btn-secondary'} ${action.size ? `btn-${action.size}` : ''}" 
                ${action.disabled ? 'disabled' : ''} 
                data-action="${action.action}">
          ${action.icon ? `<span class="btn-icon">${action.icon}</span>` : ''}
          ${action.label}
        </button>
      `;
    }
    if (action.type === 'dropdown') {
      return `
        <div class="dropdown" data-ref="${action.id || 'action-dropdown'}">
          <button class="btn btn-secondary dropdown-trigger" data-action="${action.id || 'action-dropdown'}-toggle" aria-haspopup="true" aria-expanded="false">
            ${action.icon ? `<span class="btn-icon">${action.icon}</span>` : ''}
            ${action.label}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="dropdown-menu" role="menu">
            ${action.items.map(item => `
              <button class="dropdown-item ${item.danger ? 'danger' : ''}" role="menuitem" data-action="${item.action}">
                ${item.icon ? `<span class="dropdown-item-icon">${item.icon}</span>` : ''}
                ${ImperiumUtils.escapeHtml(item.label)}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }
    return '';
  }

  bindEvents() {
    super.bindEvents();
    this.actions.forEach(action => {
      if (action.action && action.type === 'button') {
        this.on('click', `[data-action="${action.action}"]`, () => {
          if (action.onClick) action.onClick();
          this.emit(`action:${action.action}`);
        });
      }
    });
  }

  setTitle(title) {
    this.title = title;
    this.setState({ title });
  }

  setSubtitle(subtitle) {
    this.subtitle = subtitle;
    this.setState({ subtitle });
  }

  setActions(actions) {
    this.actions = actions;
    this.setState({ actions });
  }

  setBreadcrumbs(breadcrumbs) {
    this.breadcrumbs = breadcrumbs;
    this.setState({ breadcrumbs });
  }
}