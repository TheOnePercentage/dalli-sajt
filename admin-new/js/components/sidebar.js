import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

/**
 * Sidebar Component - Admin Navigation Sidebar
 * Matches the HTML structure in admin.html exactly
 * 
 * Features:
 * - Brand/logo section
 * - Navigation sections with items
 * - Section dividers and titles
 * - User info footer
 * - Collapse/expand toggle
 * - Mobile overlay support
 * - Keyboard navigation
 * 
 * @extends Component
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
   * @param {string} options.container - Container selector
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
    this.container = options.container || '#sidebar';
    this.id = options.id || ImperiumUtils.generateId('sidebar-');
  }

  render() {
    const navHtml = this.items.map(section => this.renderSection(section)).join('');
    const userHtml = this.user ? this.renderUser() : '';

    return `
      <aside class="sidebar ${this.collapsed ? 'collapsed' : ''}" role="navigation" aria-label="Glavna navigacija" id="${this.id}" data-ref="sidebar">
        <!-- Sidebar Brand -->
        <div class="sidebar-brand">
          <a href="#dashboard" class="brand-link" aria-label="${ImperiumUtils.escapeHtml(this.brand.name)} Admin Dashboard">
            <div class="brand-icon" aria-hidden="true">
              ${this.brand.icon || this.renderDefaultIcon()}
            </div>
            <span class="brand-text">${ImperiumUtils.escapeHtml(this.brand.name)}</span>
          </a>
        </div>

        <nav class="sidebar-nav" aria-label="Admin sekcije" data-ref="nav">
          <ul class="sidebar-nav-list">
            ${navHtml}
          </ul>
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar" id="sidebarUserAvatar">
              <span class="user-initial">${this.user ? this.getInitials(this.user.name) : 'A'}</span>
            </div>
            <div class="user-details">
              <span class="user-name" id="sidebarUserName">${this.user ? ImperiumUtils.escapeHtml(this.user.name) : 'Admin'}</span>
              <span class="user-role" id="sidebarUserRole">${this.user ? ImperiumUtils.escapeHtml(this.user.role) : 'Administrator'}</span>
            </div>
          </div>
          <button class="sidebar-toggle" aria-label="${this.collapsed ? 'Proširi meni' : 'Sažmi meni'}" aria-expanded="${!this.collapsed}" data-action="toggle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="${this.collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'}"/>
            </svg>
          </button>
        </div>
      </aside>
    `;
  }

  renderDefaultIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill="currentColor"/>
        <path d="M10 12L16 18L22 10" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  renderSection(section) {
    const itemsHtml = section.items.map(item => this.renderItem(item)).join('');
    const titleHtml = section.title ? `<li class="nav-section-title">${ImperiumUtils.escapeHtml(section.title)}</li>` : '';
    const dividerHtml = section.divider ? '<li class="nav-section-divider"></li>' : '';

    return `
      ${dividerHtml}
      ${titleHtml}
      ${itemsHtml}
    `;
  }

  renderItem(item) {
    const active = this.activeSection === item.section;
    const badgeHtml = item.badge ? `<span class="nav-badge ${item.badgeVariant || ''}">${ImperiumUtils.escapeHtml(item.badge)}</span>` : '';

    return `
      <li>
        <a href="#" class="nav-item ${active ? 'active' : ''}" data-section="${ImperiumUtils.escapeHtml(item.section)}" ${active ? 'aria-current="page"' : ''} data-action="navigate">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            ${item.icon}
          </svg>
          <span>${ImperiumUtils.escapeHtml(item.label)}</span>
          ${badgeHtml}
        </a>
      </li>
    `;
  }

  renderUser() {
    const name = this.user?.name || 'Admin';
    const role = this.user?.role || 'Administrator';
    const initials = this.getInitials(this.user?.name || 'Admin');

    return `
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar" id="sidebarUserAvatar">
            <span class="user-initial">${ImperiumUtils.escapeHtml(initials)}</span>
          </div>
          <div class="user-details">
            <span class="user-name" id="sidebarUserName">${ImperiumUtils.escapeHtml(this.user?.name || 'Admin')}</span>
            <span class="user-role" id="sidebarUserRole">${ImperiumUtils.escapeHtml(this.user?.role || 'Administrator')}</span>
          </div>
        </div>
        <button class="sidebar-toggle" aria-label="${this.collapsed ? 'Proširi meni' : 'Sažmi meni'}" aria-expanded="${!this.collapsed}" data-action="toggle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="${this.collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'}"/>
          </svg>
        </button>
      </div>
    `;
  }

  getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  bindEvents() {
    super.bindEvents();

    // Navigation clicks
    this.on('click', '[data-action="navigate"]', (e) => {
      e.preventDefault();
      const section = e.delegateTarget.dataset.section;
      this.setActiveSection(section);
      if (this.onNavigate) this.onNavigate(section);
      this.emit('navigate', { section });
    });

    // Collapse/expand toggle
    this.on('click', '[data-action="toggle"]', () => {
      this.toggleCollapse();
    });

    // Keyboard navigation
    this.on('keydown', '[data-action="navigate"]', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.delegateTarget.click();
      }
    });

    // Mobile overlay click
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.closeMobile();
        }
      });
    }

    // Responsive: auto-collapse on mobile
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768 && !this.collapsed) {
        this.setCollapsed(true);
      }
    });
  }

  setActiveSection(section) {
    this.activeSection = section;
    this.setState({ activeSection: section });

    // Update active state in DOM
    const items = this.element?.querySelectorAll('[data-action="navigate"]');
    items?.forEach(item => {
      const isActive = item.dataset.section === section;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Update page header breadcrumbs if needed
    this.emit('section-changed', { section });

    // Close mobile sidebar after navigation
    if (window.innerWidth <= 768) {
      this.closeMobile();
    }
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.setState({ collapsed: this.collapsed });
    this.emit('collapse-toggle', { collapsed: this.collapsed });
  }

  setCollapsed(collapsed) {
    this.collapsed = collapsed;
    this.setState({ collapsed: collapsed });
  }

  closeMobile() {
    this.element?.classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    overlay?.classList.remove('visible');
  }

  openMobile() {
    this.element?.classList.add('open');
    const overlay = document.getElementById('sidebarOverlay');
    overlay?.classList.add('visible');
  }

  toggleMobile() {
    if (this.element?.classList.contains('open')) {
      this.closeMobile();
    } else {
      this.openMobile();
    }
  }

  setCollapsed(collapsed) {
    this.collapsed = collapsed;
    this.setState({ collapsed });
  }

  setUser(user) {
    this.user = user;
    this.setState({ user });
  }

  setItems(items) {
    this.items = items;
    this.setState({ items });
  }
}

/**
 * Navigation Controller - Handles section navigation and history
 */
export class NavigationController {
  constructor(admin) {
    this.admin = admin;
    this.currentSection = 'dashboard';
    this.history = [];
    this.maxHistory = 50;
  }

  navigate(section, options = {}) {
    if (!section) return false;

    // Update history
    this.history.push(this.currentSection);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.currentSection = section;
    this.admin.store.setState({ activeSection: section });

    // Update URL hash
    if (window.location.hash !== `#${section}`) {
      window.location.hash = section;
    }

    // Update page header
    this.updatePageHeader(section);

    // Emit navigation event
    this.emit('navigate', { section, previous: this.history[this.history.length - 2] });

    return true;
  }

  goBack() {
    if (this.history.length > 0) {
      const previous = this.history.pop();
      this.currentSection = previous;
      window.location.hash = previous;
      return true;
    }
    return false;
  }

  goForward() {
    // Not implemented yet
  }

  getCurrentSection() {
    return this.currentSection;
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }

  updatePageHeader(section) {
    const sectionInfo = this.getSectionInfo(section);
    const pageHeader = document.getElementById('pageHeader');
    if (pageHeader) {
      const title = pageHeader.querySelector('.page-title');
      const subtitle = pageHeader.querySelector('.page-subtitle');
      if (title) title.textContent = sectionInfo.title;
      if (subtitle) subtitle.textContent = sectionInfo.subtitle;
    }
  }

  getSectionInfo(section) {
    const sections = {
      dashboard: { title: 'Dashboard', subtitle: 'Pregled ključnih metrika i aktivnosti' },
      executive: { title: 'Executive Overview', subtitle: 'Strateški pregled poslovanja' },
      orders: { title: 'Porudžbine', subtitle: 'Upravljanje porudžbinama i isporukama' },
      products: { title: 'Proizvodi', subtitle: 'Upravljanje katalogom proizvoda' },
      'products-elite': {
        title: 'Elite Product Editor',
        subtitle: 'Luxury platforma za objavljivanje proizvoda',
      },
      inventory: { title: 'Inventar', subtitle: 'Stanje zaliha i skladišne operacije' },
      categories: { title: 'Kategorije', subtitle: 'Hijerarhija kategorija proizvoda' },
      customers: { title: 'Kupci', subtitle: 'Upravljanje kupcima i segmentacijom' },
      reviews: { title: 'Recenzije', subtitle: 'Moderacija i upravljanje recenzijama' },
      promotions: { title: 'Promocije', subtitle: 'Upravljanje promo akcijama i kupovnim kuponima' },
      campaigns: { title: 'Kampanje', subtitle: 'Marketing kampanje i performanse' },
      seo: { title: 'SEO Centar', subtitle: 'Optimizacija za pretraživače' },
      social: { title: 'Social Media', subtitle: 'Upravljanje društvenim mrežama' },
      analytics: { title: 'Analitika', subtitle: 'Detaljna analitika i izveštaji' },
      profit: { title: 'Profit Centar', subtitle: 'Finansijski izveštaji i profitabilnost' },
      growth: { title: 'Rast i Trendi', subtitle: 'Trendovi rasta i prognoze' },
      executive: { title: 'Executive Overview', subtitle: 'Strateški pregled poslovanja' },
      diagnostics: { title: 'Dijagnostika', subtitle: 'Sistemska dijagnostika i zdravlje' },
      settings: { title: 'Postavke', subtitle: 'Sistemski podešavanja i konfiguracija' },
      roles: { title: 'Uloge i Dozvole', subtitle: 'Upravljanje korisničkim ulogama' },
      'products-cms': { title: 'Proizvodi CMS', subtitle: 'Upravljanje CMS proizvodima' },
      markets: { title: 'Tržišta', subtitle: 'Međunarodna tržišta i lokalizacija' },
      accounting: { title: 'Računovodstvo', subtitle: 'Finansijski evidencije i knjigovodstvo' },
      'search-analytics': { title: 'Pretraga Analitika', subtitle: 'Analitika pretrage i ključne reči' },
    };

    return sections[section] || { title: section, subtitle: '' };
  }
}

export function createSidebar(options) {
  return new Sidebar(options);
}

export function createNavigationController(admin) {
  return new NavigationController(admin);
}