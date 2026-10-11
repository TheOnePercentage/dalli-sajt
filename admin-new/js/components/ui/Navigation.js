/**
 * DALLI Navigation Component System
 * Mobile-first, accessible, SEO-optimized
 * Components: Header, MegaMenu, Breadcrumbs, Tabs, Pagination, Stepper, Sidebar, MobileDrawer, CommandPalette
 */

export class Navigation {
  static init() {
    this.initHeader();
    this.initMegaMenu();
    this.initBreadcrumbs();
    this.initTabs();
    this.initPagination();
    this.initStepper();
    this.initSidebar();
    this.initMobileDrawer();
    this.initCommandPalette();
  }

  static initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            document.body.classList.add('header--hidden');
          } else {
            document.body.classList.remove('header--hidden');
          }
          
          if (currentScrollY > 20) {
            document.body.classList.add('header--scrolled');
          } else {
            document.body.classList.remove('header--scrolled');
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    // Search toggle
    const searchBtn = document.querySelector('[data-action="search"]');
    const searchDrawer = document.getElementById('searchDrawer');
    if (searchBtn && searchDrawer) {
      searchBtn.addEventListener('click', () => {
        const isOpen = searchDrawer.classList.toggle('open');
        searchBtn.setAttribute('aria-expanded', isOpen);
        if (isOpen) {
          document.body.style.overflow = 'hidden';
          setTimeout(() => {
            const input = searchDrawer.querySelector('input');
            input?.focus();
          }, 50);
        } else {
          document.body.style.overflow = '';
        }
      });
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle && window.toggleTheme) {
      themeToggle.addEventListener('click', () => window.toggleTheme());
    }

    // Mobile menu toggle
    const menuBtn = document.getElementById('menuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    if (menuBtn && mobileDrawer) {
      menuBtn.addEventListener('click', () => {
        const isOpen = mobileDrawer.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
    }

    // Cart drawer
    const cartBtn = document.getElementById('cartBtn');
    const cartDrawer = document.getElementById('cartDrawer');
    if (cartBtn && cartDrawer) {
      cartBtn.addEventListener('click', () => {
        const isOpen = cartDrawer.classList.toggle('open');
        cartBtn.setAttribute('aria-expanded', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
    }

    // User menu dropdown
    const userTrigger = document.getElementById('userMenuTrigger');
    const userDropdown = document.getElementById('userDropdown');
    if (userTrigger && userDropdown) {
      userTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = userDropdown.classList.toggle('hidden');
        userTrigger.setAttribute('aria-expanded', !userDropdown.classList.contains('hidden'));
      });

      document.addEventListener('click', (e) => {
        if (!userTrigger.contains(e.target) && !userDropdown.contains(e.target)) {
          userDropdown.classList.add('hidden');
        }
      });
    }

    // Close drawers on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.drawer.open, .modal-overlay.open').forEach(el => {
          el.classList.remove('open');
        });
        document.body.style.overflow = '';
      }
    });

    // Close drawer on backdrop click
    document.querySelectorAll('.drawer__backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => {
        const drawer = backdrop.closest('.drawer');
        drawer?.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.header__dropdown:not(.hidden)').forEach(dd => {
        if (!dd.contains(e.target) && !e.target.closest('[data-action="user-menu"]')) {
          dd.classList.add('hidden');
        }
      });
    });
  }

  static initMegaMenu() {
    const nav = document.querySelector('.header__nav');
    if (!nav) return;

    const menuItems = nav.querySelectorAll('.header__nav-link');
    
    // Add keyboard navigation
    menuItems.forEach((item, index) => {
      item.addEventListener('keydown', (e) => {
        const items = Array.from(menuItems);
        const currentIndex = items.indexOf(e.target);
        
        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault();
            items[(currentIndex + 1) % items.length]?.focus();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            items[(currentIndex - 1 + items.length) % items.length]?.focus();
            break;
          case 'Enter':
          case ' ':
            if (e.target.getAttribute('aria-haspopup') === 'true') {
              e.preventDefault();
              e.target.click();
            }
            break;
        }
      });
    });

    // Submenu handling (if any)
    nav.querySelectorAll('[aria-haspopup="true"]').forEach(trigger => {
      const submenu = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!submenu) return;

      let timeout;
      
      trigger.addEventListener('mouseenter', () => {
        clearTimeout(timeout);
        submenu.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      });

      trigger.addEventListener('mouseleave', () => {
        timeout = setTimeout(() => {
          submenu.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }, 200);
      });

      submenu.addEventListener('mouseenter', () => clearTimeout(timeout));
      submenu.addEventListener('mouseleave', () => {
        timeout = setTimeout(() => {
          submenu.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }, 200);
      });

      // Keyboard support
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const isOpen = submenu.classList.toggle('open');
          e.target.setAttribute('aria-expanded', isOpen);
        }
      });
    });
  }

  static initBreadcrumbs() {
    const breadcrumb = document.querySelector('.breadcrumb');
    if (!breadcrumb) return;

    // Add structured data
    const ol = breadcrumb.querySelector('ol');
    if (ol) {
      ol.setAttribute('itemscope', '');
      ol.setAttribute('itemtype', 'https://schema.org/BreadcrumbList');
      
      const items = ol.querySelectorAll('li[itemprop="itemListElement"]');
      items.forEach((item, index) => {
        item.setAttribute('itemprop', 'itemListElement');
        item.setAttribute('itemscope', '');
        item.setAttribute('itemtype', 'https://schema.org/ListItem');
        
        const link = item.querySelector('a');
        if (link) {
          link.setAttribute('itemprop', 'item');
          const span = link.querySelector('span');
          if (span) span.setAttribute('itemprop', 'name');
        }
        
        const meta = item.querySelector('meta[itemprop="position"]');
        if (!meta) {
          const metaEl = document.createElement('meta');
          metaEl.setAttribute('itemprop', 'position');
          metaEl.setAttribute('content', (index + 1).toString());
          item.appendChild(metaEl);
        }
      });
    }

    // Mobile breadcrumb scroll hint
    const breadcrumbList = breadcrumb.querySelector('.breadcrumb-list');
    if (breadcrumbList && window.innerWidth < 768) {
      breadcrumbList.style.scrollSnapType = 'x mandatory';
      breadcrumbList.style.overflowX = 'auto';
      breadcrumbList.style.webkitOverflowScrolling = 'touch';
    }
  }

  static initTabs() {
    document.querySelectorAll('[role="tablist"]').forEach(tablist => {
      const tabs = tablist.querySelectorAll('[role="tab"]');
      const panels = tablist.parentElement?.querySelectorAll('[role="tabpanel"]') || [];

      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          panels.forEach(p => p.classList.remove('active'));

          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
          panels[index]?.classList.add('active');
        });

        tab.addEventListener('keydown', (e) => {
          const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
          const currentIndex = tabs.indexOf(e.target);
          
          switch (e.key) {
            case 'ArrowRight':
              e.preventDefault();
              tabs[(index + 1) % tabs.length]?.focus();
              break;
            case 'ArrowLeft':
              e.preventDefault();
              tabs[(index - 1 + tabs.length) % tabs.length]?.focus();
              break;
            case 'Home':
              e.preventDefault();
              tabs[0]?.focus();
              break;
            case 'End':
              e.preventDefault();
              tabs[tabs.length - 1]?.focus();
              break;
          }
        });
      });
    });
  }

  static initPagination() {
    document.querySelectorAll('.pagination').forEach(pagination => {
      const links = pagination.querySelectorAll('a, button');
      
      links.forEach(link => {
        link.addEventListener('click', (e) => {
          if (link.tagName === 'BUTTON') {
            e.preventDefault();
          }
          
          // Add loading state
          if (link.tagName === 'A') {
            link.classList.add('pagination__link--loading');
          }
        });
      });

      // Keyboard navigation
      pagination.addEventListener('keydown', (e) => {
        const links = Array.from(pagination.querySelectorAll('a, button'));
        const currentIndex = links.indexOf(document.activeElement);
        
        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault();
            links[(links.indexOf(document.activeElement) + 1) % links.length]?.focus();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            links[(links.indexOf(document.activeElement) - 1 + links.length) % links.length]?.focus();
            break;
            case 'Home':
              e.preventDefault();
              links[0]?.focus();
              break;
            case 'End':
              e.preventDefault();
              links[links.length - 1]?.focus();
              break;
        }
      });
    });
  }

  static initStepper() {
    document.querySelectorAll('.stepper').forEach(stepper => {
      const steps = stepper.querySelectorAll('.stepper__step');
      const currentStep = parseInt(stepper.dataset.currentStep || '1', 10);

      steps.forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber < currentStep) step.classList.add('stepper__step--completed');
        else if (stepNumber === currentStep) step.classList.add('stepper__step--current');
        else step.classList.add('stepper__step--pending');
      });

      // Navigation
      const prevBtn = stepper.querySelector('.stepper__prev');
      const nextBtn = stepper.querySelector('.stepper__next');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          const event = new CustomEvent('stepper:prev', { detail: { currentStep } });
          stepper.dispatchEvent(event);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          const event = new CustomEvent('stepper:next', { detail: { currentStep } });
          stepper.dispatchEvent(event);
        });
      }

      // Keyboard navigation
      stepper.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevBtn = stepper.querySelector('.stepper__prev');
          prevBtn?.click();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextBtn = stepper.querySelector('.stepper__next');
          nextBtn?.click();
        }
      });
    });
  }

  static initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const toggleBtn = document.querySelector('[data-action="sidebar-toggle"]');
    const closeBtn = sidebar.querySelector('.sidebar__close');

    const openSidebar = () => {
      document.body.classList.add('sidebar--open');
      document.body.style.overflow = 'hidden';
      sidebar.setAttribute('aria-hidden', 'false');
    };

    const closeSidebar = () => {
      document.body.classList.remove('sidebar--open');
      document.body.style.overflow = '';
      sidebar.setAttribute('aria-hidden', 'true');
    };

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

    // Close on backdrop click
    const backdrop = document.querySelector('.sidebar__backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => closeSidebar());
    }

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('sidebar--open')) {
        closeSidebar();
      }
    });

    // Submenu handling
    sidebar.querySelectorAll('.sidebar__item[aria-haspopup="true"]').forEach(item => {
      const submenu = item.querySelector('.sidebar__submenu');
      if (!submenu) return;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.sidebar__link')) return;
        e.preventDefault();
        const isOpen = item.classList.toggle('sidebar__item--open');
        item.setAttribute('aria-expanded', item.classList.contains('sidebar__item--open'));
      });
    });

    // Keyboard navigation
    sidebar.querySelectorAll('.sidebar__link').forEach(link => {
      link.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' && link.getAttribute('aria-haspopup') === 'true') {
          e.preventDefault();
          link.closest('.sidebar__item')?.classList.add('sidebar__item--open');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          link.closest('.sidebar__item')?.classList.remove('sidebar__item--open');
        }
      });
    });
  }

  static initMobileDrawer() {
    const drawers = document.querySelectorAll('.drawer');
    
    drawers.forEach(drawer => {
      const backdrop = drawer.querySelector('.drawer__backdrop');
      const closeBtn = drawer.querySelector('.drawer__close');
      const triggerAttr = drawer.dataset.drawer;

      const open = () => {
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.body.setAttribute('data-drawer-open', drawer.dataset.drawer);
        
        // Focus first focusable element
        setTimeout(() => {
          const focusable = drawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          focusable?.focus();
        }, 50);
      };

      const close = () => {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
        document.body.removeAttribute('data-drawer-open');
      };

      if (backdrop) backdrop.addEventListener('click', () => close());
      if (drawer.dataset.drawer === 'menu') {
        // Mobile menu handled in initHeader
      } else if (drawer.dataset.drawer === 'cart') {
        // Cart handled in initHeader
      } else if (drawer.dataset.drawer === 'search') {
        // Search handled in initHeader
      } else {
        // Generic drawer trigger
        const triggers = document.querySelectorAll(`[data-action="${drawer.dataset.drawer}"]`);
        triggers.forEach(trigger => {
          trigger.addEventListener('click', (e) => {
            e.preventDefault();
            drawer.classList.contains('open') ? close() : open();
          });
        });
      }

      if (closeBtn) closeBtn.addEventListener('click', close);

      // Close on ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
          drawer.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    });

    // Close all drawers on outside click
    document.querySelectorAll('.drawer__backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => {
        document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open'));
        document.body.style.overflow = '';
      });
    });
  }

  static initCommandPalette() {
    const palette = document.getElementById('commandPalette');
    if (!palette) return;

    const trigger = document.querySelector('[data-action="command-palette"]');
    const input = palette.querySelector('.command-palette__input');
    const results = palette.querySelector('.command-palette__results');
    const closeBtn = palette.querySelector('.command-palette__close');

    const sections = [
      { name: 'Navigacija', items: [
        { label: 'Početna', url: '/', icon: '🏠', keywords: 'home pocetna' },
        { label: 'Svi Proizvodi', url: '/proizvodi.html', icon: '📦', keywords: 'proizvodi shop' },
        { label: 'Muška Garderoba', url: '/muska-garderoba.html', icon: '👨', keywords: 'muski musko' },
        { label: 'Ženska Garderoba', url: '/zenska-garderoba.html', icon: '👩', keywords: 'zenski zensko' },
        { label: 'Duksevi', url: '/dukseri.html', icon: '🧥', keywords: 'duksevi hoodie' },
        { label: 'Korpa', url: '/cart.html', icon: '🛒', keywords: 'korpa cart' },
        { label: 'Moje Narudžbine', url: '/orders.html', icon: '📦', keywords: 'narudzbine orders' },
      ]},
      { name: 'Akcije', items: [
        { label: 'Pretraži proizvode', action: 'search', icon: '🔍', keywords: 'pretraga search' },
        { label: 'Prijava', action: 'auth', icon: '👤', keywords: 'prijava login' },
        { label: 'Registracija', action: 'register', icon: '📝', keywords: 'registracija register' },
        { label: 'Moj Profil', action: 'profile', icon: '👤', keywords: 'profil profile' },
        { label: 'Moje Narudžbine', action: 'orders', icon: '📦', keywords: 'narudzbine' },
        { label: 'Lista Želja', action: 'wishlist', icon: '❤️', keywords: 'zelja wishlist' },
      ]},
      { name: 'Admin', items: [
        { label: 'Admin Panel', url: '/admin-login.html', icon: '⚙️', keywords: 'admin panel' },
      ]}
    ];

    const renderResults = (query) => {
      const filtered = [];
      const lowerQuery = query.toLowerCase();
      
      sections.forEach(section => {
        const matches = section.items.filter(item => 
          item.label.toLowerCase().includes(lowerQuery) ||
          item.keywords.toLowerCase().includes(lowerQuery)
        );
        if (matches.length) filtered.push({ section: section.name, items: matches });
      });

      return filtered.map(group => `
        <div class="command-palette__section">
          <div class="command-palette__section-title">${group.section}</div>
          ${group.items.map(item => `
            <button class="command-palette__item" data-action="${item.action}" data-url="${item.url || ''}">
              <span class="command-palette__item-icon">${item.icon}</span>
              <span class="command-palette__item-label">${item.label}</span>
              ${item.shortcut ? `<span class="command-palette__shortcut">${item.shortcut}</span>` : ''}
            </button>
          `).join('')}
        </div>
      `).join('');
    };

    const open = () => {
      document.body.classList.add('command-palette--open');
      document.body.style.overflow = 'hidden';
      palette.classList.add('open');
      setTimeout(() => palette.querySelector('input')?.focus(), 50);
    };

    const close = () => {
      document.body.classList.remove('command-palette--open');
      document.body.style.overflow = '';
      palette.classList.remove('open');
      const inputEl = palette.querySelector('.command-palette__input');
      if (inputEl) inputEl.value = '';
    };

    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        open();
      });
    }

    // Global shortcut: ⌘K / Ctrl+K
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.body.classList.contains('command-palette--open') ? close() : open();
      }
      if (e.key === 'Escape') close();
    });

    if (input && resultsContainer) {
      input.addEventListener('input', (e) => {
        const results = palette.querySelector('.command-palette__results');
        if (results) results.innerHTML = renderResults(e.target.value);
      });

      // Handle result click
      const handleKeydown = (e) => {
        if (e.key !== 'Enter') return;
        const firstResult = resultsContainer.querySelector('.command-palette__item');
        if (!firstResult) return;
        e.preventDefault();
        const action = firstResult.dataset.action;
        const url = firstResult.dataset.url;
        
        if (action === 'search') {
          const searchDrawer = document.getElementById('searchDrawer');
          if (searchDrawer) searchDrawer.classList.add('open');
        } else if (action === 'auth') {
          const authModal = document.getElementById('authModal');
          if (authModal) authModal.classList.add('open');
        } else if (url) {
          window.location.href = url;
        }
        close();
      };
      input.addEventListener('keydown', handleKeydown);
    }

    // Click on result
    const resultsContainer = palette.querySelector('.command-palette__results');
      resultsContainer?.addEventListener('click', (e) => {
        const item = e.target.closest('.command-palette__item');
        if (!item) return;
        
        const action = item.dataset.action;
        const url = item.dataset.url;
        
        if (action === 'search') {
          const searchDrawer = document.getElementById('searchDrawer');
          if (searchDrawer) searchDrawer.classList.add('open');
        } else if (action === 'auth') {
          const authModal = document.getElementById('authModal');
          if (authModal) authModal.classList.add('open');
        } else if (url) {
          window.location.href = url;
        }
        close();
      });

    // Close on backdrop click
    const backdrop = palette.querySelector('.command-palette__backdrop');
    if (backdrop) backdrop.addEventListener('click', close);

    // Global shortcut registration
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const palette = document.getElementById('commandPalette');
        if (palette) {
          palette.classList.contains('open') ? close() : open();
        }
      }
    });
  }
}

// SEO-optimized breadcrumb generator
export function generateBreadcrumbs(path, baseUrl = 'https://dalli.rs') {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [
    { name: 'Početna', url: `${baseUrl}/`, position: 1 }
  ];

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const name = segment
      .replace(/-/g, ' ')
      .replace(/\.html$/, '')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    breadcrumbs.push({
      name,
      url: `${baseUrl}${currentPath}`,
      position: index + 2
    });
  });

  return breadcrumbs;
}

// Render breadcrumb HTML with schema.org markup
export function renderBreadcrumbs(breadcrumbs, containerId = 'breadcrumb') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = `
    <nav class="breadcrumb" aria-label="Breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
      <div class="container">
        <ol class="breadcrumb-list">
          ${breadcrumbs.map((crumb, index) => `
            <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
              ${crumb.url ? `<a href="${crumb.url}" class="breadcrumb-link" itemprop="item"><span itemprop="name">${crumb.name}</span></a>` : `<span itemprop="name">${crumb.name}</span>`}
              <meta itemprop="position" content="${index + 1}">
            </li>
          `).join('')}
        </ol>
      </div>
    </nav>
  `;

  document.getElementById(containerId)?.insertAdjacentHTML('beforeend', html);
}

// Generate schema.org SiteNavigationElement
export function generateNavigationSchema(navItems) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'Glavna Navigacija',
    url: 'https://dalli.rs/',
    hasPart: navItems.map(item => ({
      '@type': 'SiteNavigationElement',
      name: item.label,
      url: item.url
    }))
  };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Navigation, generateBreadcrumbs, renderBreadcrumbs, generateNavigationSchema };
}

if (typeof window !== 'undefined') {
  window.Navigation = Navigation;
  window.generateBreadcrumbs = generateBreadcrumbs;
  window.renderBreadcrumbs = renderBreadcrumbs;
  window.generateNavigationSchema = generateNavigationSchema;
}