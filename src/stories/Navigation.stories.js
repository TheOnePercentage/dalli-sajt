import { Navigation } from '../../admin-new/js/components/ui/Navigation.js';

export default {
  title: 'Components/Navigation',
  component: Navigation,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'DALLI Navigation system with header, mega menu, breadcrumbs, tabs, pagination, stepper, sidebar, drawers, and command palette.',
      },
    },
  },
  argTypes: {
    onNavigate: { action: 'navigate' },
  },
};

export const Header = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <header class="header" role="banner" id="header">
        <div class="container header__inner">
          <div class="header__logo">
            <a href="/" class="header__logo-link" aria-label="DALLI - Početna">
              <svg class="header__logo-icon" viewBox="0 0 100 100" aria-hidden="true" fill="none">
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:var(--color-primary);stop-opacity:1" />
                    <stop offset="100%" style="stop-color:var(--color-primary-dark);stop-opacity:1" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="50" fill="url(#logoGrad)"/>
                <text x="50" y="68" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="var(--color-accent)" text-anchor="middle">📦</text>
              </svg>
              <span class="header__logo-text">DALLI</span>
            </a>
          </div>

          <nav class="header__nav" role="navigation" aria-label="Glavna navigacija" itemscope itemtype="https://schema.org/SiteNavigationElement" id="navigation">
            <a href="/" class="header__nav-link" itemprop="url" aria-current="page"><span itemprop="name">Početna</span></a>
            <a href="/proizvodi.html" class="header__nav-link" itemprop="url"><span itemprop="name">Svi Proizvodi</span></a>
            <a href="/muska-garderoba.html" class="header__nav-link" itemprop="url"><span itemprop="name">Muška Garderoba</span></a>
            <a href="/zenska-garderoba.html" class="header__nav-link" itemprop="url"><span itemprop="name">Ženska Garderoba</span></a>
            <a href="/dukseri.html" class="header__nav-link" itemprop="url"><span itemprop="name">Duksevi</span></a>
          </nav>

          <div class="header__actions">
            <button class="header__btn header__search-btn" aria-label="Pretraga proizvoda" aria-expanded="false" aria-controls="search-drawer" data-action="search">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>

            <div class="header__user" id="headerUser">
              <div class="header__user--logged-out" id="userLoggedOut">
                <a href="/admin-login.html" class="header__btn header__admin-link" aria-label="Administrator panel" title="Admin panel">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
                </a>
                <button class="header__btn header__auth-btn" aria-label="Prijava ili registracija" data-action="auth" id="authBtn">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
              </div>

              <div class="header__user--logged-in hidden" id="userLoggedIn">
                <button class="header__btn header__user-trigger" aria-label="Korisnički meni" aria-expanded="false" aria-haspopup="true" aria-controls="userDropdown" data-action="user-menu" id="userMenuTrigger">
                  <span class="header__user-avatar" id="userAvatar">👤</span>
                  <span class="header__user-name" id="userName"></span>
                </button>
                <div class="header__dropdown hidden" id="userDropdown" role="menu" aria-labelledby="userMenuTrigger">
                  <div class="header__dropdown-header">
                    <div class="header__dropdown-avatar" id="dropdownAvatar">👤</div>
                    <div class="header__dropdown-name" id="dropdownName"></div>
                    <div class="header__dropdown-email" id="dropdownEmail"></div>
                    <span class="badge badge-crypto" id="cryptoBadge" style="display:none;">15% POPUST KRIPTO</span>
                  </div>
                  <button class="header__dropdown-item" role="menuitem" data-action="profile">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>Moj Profil</span>
                  </button>
                  <button class="header__dropdown-item" role="menuitem" data-action="orders">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    <span>Moje Narudžbine</span>
                  </button>
                  <button class="header__dropdown-item" role="menuitem" data-action="wishlist">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span>Lista Želja</span>
                  </button>
                  <button class="header__dropdown-item" role="menuitem" data-action="crypto-wallet">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                    <span>Kripto Novčanik</span>
                    <span class="badge badge-crypto">15% POPUST</span>
                  </button>
                  <hr style="margin: var(--space-2) 0; border-color: var(--color-divider);">
                  <button class="header__dropdown-item header__dropdown-item--danger" role="menuitem" data-action="logout">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <span>Odjavi se</span>
                  </button>
                </div>
              </div>
            </div>

            <button class="header__cart header__btn" aria-label="Korpa za kupovinu" aria-expanded="false" aria-controls="cartDrawer" data-action="cart" id="cartBtn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <span class="header__cart-count" id="cartCount" aria-live="polite">0</span>
            </button>

            <button class="header__menu-btn header__btn" aria-label="Otvorite meni" aria-expanded="false" aria-controls="mobileDrawer" data-action="menu" id="menuBtn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </header>
    `;

    // Initialize navigation
    setTimeout(() => {
      if (window.Navigation) window.Navigation.init();
    }, 0);

    return container;
  },
};

export const Breadcrumbs = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <nav class="breadcrumb" aria-label="Breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
        <div class="container">
          <ol class="breadcrumb-list">
            <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
              <a href="/" class="breadcrumb-link" itemprop="item"><span itemprop="name">Početna</span></a>
              <meta itemprop="position" content="1">
            </li>
            <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
              <a href="/muska-garderoba.html" class="breadcrumb-link" itemprop="item"><span itemprop="name">Muška Garderoba</span></a>
              <meta itemprop="position" content="2">
            </li>
            <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
              <span itemprop="name">Majice</span>
              <meta itemprop="position" content="3">
            </li>
          </ol>
        </div>
      </nav>
    `;
    return container;
  },
};

export const Tabs = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="tabs-container" style="max-width: 800px; margin: 0 auto;">
        <div class="section-header">
          <h2 class="section-title">Kategorije Proizvoda</h2>
        </div>
        <div class="section-header__tabs" role="tablist" aria-label="Filtriranje proizvoda" id="featuredTabs">
          <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="panel-favorites" data-tab="favorites">Naši Favoriti</button>
          <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-bestsellers" data-tab="bestsellers">Bestsellery</button>
          <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-new" data-tab="new">Novo u Ponudi</button>
        </div>
      </div>

      <div class="tab-panels" id="tabPanels">
        <div class="tab-panel active" id="panel-favorites" role="tabpanel" aria-labelledby="tab-favorites">
          <div class="product-grid" id="featuredProductsFavorites" role="list" aria-label="Preporučeni proizvodi">
            <div style="padding: var(--space-4); text-align: center; color: var(--color-text-secondary);">Favoriti će se učitati ovde</div>
          </div>
        </div>
        <div class="tab-panel hidden" id="panel-bestsellers" role="tabpanel" aria-labelledby="tab-bestsellers">
          <div class="product-grid" id="featuredProductsBestsellers" role="list" aria-label="Najprodavaniji proizvodi">
            <div style="padding: var(--space-4); text-align: center; color: var(--color-text-secondary);">Bestsellery će se učitati ovde</div>
          </div>
        </div>
        <div class="tab-panel hidden" id="panel-new" role="tabpanel" aria-labelledby="tab-new">
          <div class="product-grid" id="featuredProductsNew" role="list" aria-label="Novi proizvodi">
            <div style="padding: var(--space-4); text-align: center; color: var(--color-text-secondary);">Novi proizvodi će se učitati ovde</div>
          </div>
        </div>
      </div>
    `;
    return container;
  },
};

export const MobileDrawers = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="padding: var(--space-4); display: flex; gap: var(--space-4); flex-wrap: wrap;">
        <button class="btn btn-primary" data-action="search">🔍 Pretraga</button>
        <button class="btn btn-primary" data-action="menu">☰ Meni</button>
        <button class="btn btn-primary" data-action="cart">🛒 Korpa</button>
        <button class="btn btn-primary" data-action="auth">👤 Prijava</button>
      </div>
    `;
    return container;
  },
};

export const CommandPalette = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="padding: var(--space-4);">
        <p style="margin-bottom: var(--space-4); color: var(--color-text-secondary);">
          Pritisnite <kbd style="padding: 2px 6px; background: var(--color-bg-subtle); border-radius: var(--radius-btn); font-family: monospace;">⌘</kbd> + <kbd style="padding: 2px 6px; background: var(--color-bg-subtle); border-radius: var(--radius-btn); font-family: monospace;">K</kbd> da biste otvorili Command Palette
        </p>
        <button class="btn btn-primary" data-action="command-palette">Otvorite Command Palette</button>
      </div>
    `;
    return container;
  },
};