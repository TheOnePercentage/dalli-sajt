import { Component } from '../core/component.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AdminSections');

export class AdminSections {
  constructor(admin) {
    this.admin = admin;
    this.sections = new Map();
    this.currentSection = null;
    this.loadingPromises = new Map();
  }

  async loadSection(sectionName) {
    if (this.sections.has(sectionName)) {
      return this.sections.get(sectionName);
    }

    if (this.loadingPromises.has(sectionName)) {
      return this.loadingPromises.get(sectionName);
    }

    const loadPromise = this.importSection(sectionName);
    this.loadingPromises.set(sectionName, loadPromise);

    try {
      const SectionClass = await loadPromise;
      const sectionInstance = new SectionClass({ admin: this.admin });
      this.sections.set(sectionName, sectionInstance);
      this.loadingPromises.delete(sectionName);
      return sectionInstance;
    } catch (error) {
      this.loadingPromises.delete(sectionName);
      logger.error({ err: error }, `Failed to load section ${sectionName}`);
      return this.createDefaultSection(sectionName);
    }
  }

  async importSection(sectionName) {
    const sectionMap = {
      dashboard: () => import('../sections/dashboard.js').then(m => m.DashboardSection),
      executive: () => import('../sections/executive.js').then(m => m.ExecutiveSection),
      orders: () => import('../sections/orders.js').then(m => m.OrdersSection),
      products: () => import('../sections/products.js').then(m => m.ProductsSection),
      'products-elite': () =>
        import('../sections/products-elite.js').then(m => m.EliteProductEditorSection),
      inventory: () => import('../sections/inventory.js').then(m => m.InventorySection),
      categories: () => import('../sections/categories.js').then(m => m.CategoriesSection),
      customers: () => import('../sections/customers.js').then(m => m.CustomersSection),
      reviews: () => import('../sections/reviews.js').then(m => m.ReviewsSection),
      'community-gallery': () =>
        import('../sections/community-gallery.ts').then(m => m.CommunityGallerySection),
      promotions: () => import('../sections/promotions.js').then(m => m.PromotionsSection),
      campaigns: () => import('../sections/campaigns.js').then(m => m.CampaignsSection),
      seo: () => import('../sections/seo.js').then(m => m.SEOSection),
      social: () => import('../sections/social-media.js').then(m => m.SocialMediaCenter),
      'experience-center': () =>
        import('../sections/experience-center.js').then(m => m.ExperienceCenterSection),
      analytics: () => import('../sections/analytics.js').then(m => m.AnalyticsSection),
      profit: () => import('../sections/profit.js').then(m => m.ProfitSection),
      'search-analytics': () =>
        import('../sections/search-analytics.js').then(m => m.SearchAnalyticsSection),
      growth: () => import('../sections/growth.js').then(m => m.GrowthSection),
      diagnostics: () => import('../sections/diagnostics.js').then(m => m.DiagnosticsSection),
      settings: () => import('../sections/settings.js').then(m => m.SettingsSection),
      roles: () => import('../sections/roles.js').then(m => m.RolesSection),
      'products-cms': () => import('../sections/products-cms.js').then(m => m.ProductsCMSSection),
      markets: () => import('../sections/markets.js').then(m => m.MarketsSection),
      accounting: () => import('../sections/accounting.js').then(m => m.AccountingSection),
      employees: () => import('../sections/employees.js').then(m => m.EmployeesSection),
    };

    const loader = sectionMap[sectionName];
    if (!loader) {
      throw new Error(`Unknown section: ${sectionName}`);
    }

    return loader();
  }

  createDefaultSection(sectionName) {
    const SectionClass = class DefaultSection {
      constructor(options) {
        this.admin = options.admin;
        this.name = sectionName;
        this.t = this.admin?.t || (key => key);
      }

      async onEnter() {
        this.render();
      }

      onLeave() {}

      render() {
        const panel = document.querySelector(`.admin-tab-panel[data-panel="${sectionName}"]`);
        const content = panel || document.getElementById('content');
        if (content) {
          content.innerHTML = `
            <div class="section-placeholder">
              <div class="placeholder-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 9h6v6H9z"/>
                </svg>
              </div>
              <h2>${this.formatSectionName(sectionName)}</h2>
              <p>Ova sekcija je u razvoju.</p>
            </div>
          `;
        }
      }

      formatSectionName(name) {
        return name
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    };

    const instance = new SectionClass({ admin: this.admin });
    this.sections.set(sectionName, instance);
    return instance;
  }

  async navigateTo(sectionName) {
    if (!sectionName) return;

    // Check permissions
    const meta = this.getSectionMeta(sectionName);
    if (meta?.permissions && !this.admin.checkPermissions(meta.permissions)) {
      this.admin.toastContainer.error('Nemate dozvolu za pristup ovoj sekciji');
      return false;
    }

    // Leave current section
    if (this.currentSection && this.currentSection.onLeave) {
      try {
        await this.currentSection.onLeave();
      } catch (error) {
        logger.warn({ err: error }, `Error leaving section ${this.currentSectionName}`);
      }
    }

    // Load and enter new section
    const section = await this.loadSection(sectionName);
    this.currentSection = section;
    this.currentSectionName = sectionName;

    // Update store
    this.admin.store.setState({ activeSection: sectionName });

    // Activate the matching tab panel/button and resolve the mount root
    const panel = this.activatePanel(sectionName);
    const mountRoot = this.prepareMountRoot(panel, sectionName);
    this.installRenderBridge(section, mountRoot);

    // Update UI
    this.updateSidebar(sectionName);
    this.updatePageHeader(sectionName);

    // Enter new section (loads data, renders)
    if (section.onEnter) {
      try {
        await section.onEnter();
      } catch (error) {
        logger.error({ err: error }, `Error entering section ${sectionName}`);
        this.admin.toastContainer?.error?.('Greška pri učitavanju sekcije');
      }
    }

    // If the section rendered nothing (string-returning render discarded, or no
    // onEnter), do a final render pass into the mount root.
    if (mountRoot && !mountRoot.hasChildNodes()) {
      try {
        section.render();
      } catch (error) {
        logger.error({ err: error }, `Error rendering section ${sectionName}`);
      }
    }

    // Sections whose render() writes directly into this.element (instead of
    // returning a string) still need their stored event handlers attached.
    if (!section.mounted && section.element && section.element.hasChildNodes()) {
      section.mounted = true;
      try {
        Component.prototype.bindEvents.call(section);
      } catch (error) {
        logger.warn({ err: error }, `Failed to bind events for section ${sectionName}`);
      }
    }

    // Update URL
    this.updateURL(sectionName);

    this.admin.emit('section:change', { section: sectionName, previous: this.currentSectionName });
    logger.info(`Navigated to section: ${sectionName}`);

    return true;
  }

  activatePanel(sectionName) {
    let panel = null;
    document.querySelectorAll('.admin-tab-panel').forEach(p => {
      const isTarget = p.dataset.panel === sectionName || p.id === `tab-${sectionName}`;
      p.classList.toggle('active', isTarget);
      if (isTarget) panel = p;
    });

    if (!panel) {
      const anyPanel = document.querySelector('.admin-tab-panel');
      panel = document.createElement('div');
      panel.className = 'admin-tab-panel active';
      panel.id = `tab-${sectionName}`;
      panel.dataset.panel = sectionName;
      panel.setAttribute('role', 'tabpanel');
      if (anyPanel && anyPanel.parentNode) {
        anyPanel.parentNode.appendChild(panel);
      } else {
        (document.getElementById('content') || document.body).appendChild(panel);
      }
    }

    document.querySelectorAll('.tab[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === sectionName);
    });
    return panel;
  }

  prepareMountRoot(panel, sectionName) {
    const host = panel || document.getElementById('content') || document.body;
    let root = host.querySelector(`#${sectionName}-section`);
    if (!root) {
      root = document.createElement('div');
      root.id = `${sectionName}-section`;
      root.className = `${sectionName}-section`;
      root.dataset.panel = sectionName;
    }
    host.innerHTML = '';
    host.appendChild(root);
    return root;
  }

  installRenderBridge(section, root) {
    if (!section || !root) return;
    section.__mountRoot = root;
    // Re-point the section at the freshly created mount root on every navigation
    // (the previous root is removed by prepareMountRoot).
    section.element = root;
    section.mounted = false;
    if (section.__renderBridged) return;

    const originalRender = section.render;
    if (typeof originalRender !== 'function') return;

    section.render = function bridgedRender(...args) {
      if (this.eventHandlers && typeof this.eventHandlers.clear === 'function') {
        this.eventHandlers.clear();
      }
      const html = originalRender.apply(this, args);
      if (html instanceof Element && this.__mountRoot) {
        this.__mountRoot.innerHTML = '';
        this.__mountRoot.appendChild(html);
        this.element = html;
        this.mounted = true;
        try {
          Component.prototype.bindEvents.call(this);
        } catch (error) {
          logger.warn({ err: error }, 'Failed to bind section events');
        }
      } else if (typeof html === 'string' && html.trim() && this.__mountRoot) {
        this.__mountRoot.innerHTML = html;
        this.element = this.__mountRoot;
        this.mounted = true;
        try {
          Component.prototype.bindEvents.call(this);
        } catch (error) {
          logger.warn({ err: error }, 'Failed to bind section events');
        }
      }
      return html;
    };
    section.__renderBridged = true;
  }

  updateSidebar(sectionName) {
    if (this.admin.sidebar) {
      this.admin.sidebar.setActiveSection(sectionName);
    }
  }

  updatePageHeader(sectionName) {
    if (this.admin.pageHeader) {
      const meta = this.getSectionMeta(sectionName);
      if (typeof this.admin.pageHeader.setTitle === 'function') {
        this.admin.pageHeader.setTitle(meta?.title || sectionName);
        if (typeof this.admin.pageHeader.setSubtitle === 'function') {
          this.admin.pageHeader.setSubtitle(meta?.subtitle || '');
        }
        if (typeof this.admin.pageHeader.setActions === 'function' && meta?.actions) {
          this.admin.pageHeader.setActions(meta.actions);
        }
      }
    }
  }

  updateURL(sectionName) {
    const url = `#${sectionName}`;
    if (window.location.hash !== url) {
      history.pushState({ section: sectionName }, '', url);
    }
  }

  getSectionMeta(sectionName) {
    const metaMap = {
      dashboard: { title: 'Dashboard', subtitle: 'Pregled ključnih metrika i aktivnosti' },
      executive: { title: 'Executive Overview', subtitle: 'Strateški pregled poslovanja' },
      orders: { title: 'Porudžbine', subtitle: 'Upravljanje porudžbinama' },
      products: { title: 'Proizvodi', subtitle: 'Katalog proizvoda' },
      'products-elite': {
        title: 'Elite Product Editor',
        subtitle: 'Luxury platforma za objavljivanje proizvoda',
      },
      inventory: { title: 'Inventar', subtitle: 'Stanje zaliha' },
      categories: { title: 'Kategorije', subtitle: 'Upravljanje kategorijama' },
      customers: { title: 'Kupci', subtitle: 'Baza kupaca' },
      reviews: { title: 'Recenzije', subtitle: 'Moderacija recenzija' },
      'community-gallery': { title: 'Zajednica / Galerija', subtitle: 'Korisnički sadržaj' },
      promotions: { title: 'Promocije', subtitle: 'Upravljanje promocijama' },
      campaigns: { title: 'Kampanje', subtitle: 'Marketing kampanje' },
      seo: { title: 'SEO Centar', subtitle: 'Optimizacija za pretraživače' },
      social: { title: 'Social Media', subtitle: 'Upravljanje društvenim mrežama' },
      analytics: { title: 'Analitika', subtitle: 'Detaljna analitika' },
      profit: { title: 'Profit Centar', subtitle: 'Analiza profitabilnosti' },
      'search-analytics': { title: 'Pretraga Analitika', subtitle: 'Analitika pretrage' },
      growth: { title: 'Rast i Trendi', subtitle: 'Koorte i trendovi' },
      diagnostics: { title: 'Dijagnostika', subtitle: 'Sistemska dijagnostika' },
      settings: { title: 'Postavke', subtitle: 'Konfiguracija sistema' },
      roles: { title: 'Uloge i Dozvole', subtitle: 'RBAC upravljanje' },
      'products-cms': { title: 'Proizvodi CMS', subtitle: 'Upravljanje proizvodima' },
      markets: { title: 'Tržišta', subtitle: 'Više tržišta i valuta' },
      accounting: { title: 'Računovodstvo', subtitle: 'Finansijski izveštaji' },
      employees: { title: 'Zaposleni', subtitle: 'Tim, dozvole i pristup / prijave' },
      'experience-center': {
        title: 'Experience Center',
        subtitle: 'Upravljanje temama i iskustvom',
      },
    };

    return metaMap[sectionName] || { title: sectionName };
  }

  getCurrentSection() {
    return this.currentSection;
  }

  getCurrentSectionName() {
    return this.currentSectionName;
  }

  renderInitialSection() {
    const initialSection = this.admin.store.getState().activeSection || 'dashboard';
    return this.navigateTo(initialSection);
  }

  destroy() {
    this.sections.forEach(section => {
      if (section.onLeave) {
        section.onLeave();
      }
    });
    this.sections.clear();
    this.loadingPromises.clear();
    this.currentSection = null;
  }
}
