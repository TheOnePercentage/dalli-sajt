import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SEOAuditor } from '../seo/seo-auditor.js';
import { SEOSectionTemplate } from './seo-template.js';
import { cwvCollector, cwvScoringEngine, cwvDashboard, CWV_METRICS, CWV_THRESHOLDS } from '../../js/seo/core-web-vitals/index.js';
import { SectionAPI } from '../services/integration.js';

export class SEOSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.seo;
    this.auditor = null;
    this.pages = [];
    this.overallScore = 0;
    this.siteAuditResult = null;
    this.currentView = 'overview'; // overview, audit, pages, issues, editor, cwv
    this.selectedPage = null;
    this.auditInProgress = false;
    this.cwvDashboard = cwvDashboard;
    this.cwvInProgress = false;
  }

  async onEnter() {
    this.initAuditor();
    await this.loadInitialData();
    this.render();
  }

  initAuditor() {
    this.auditor = new SEOAuditor({
      validators: ['meta-description', 'image-alt', 'schema', 'canonical'],
      validatorConfigs: {
        'meta-description': {
          minLength: 120,
          maxLength: 160,
          optimalMin: 150,
          optimalMax: 160,
          checkUniqueness: true,
          requireKeywords: true
        },
        'image-alt': {
          minLength: 10,
          maxLength: 125,
          optimalMin: 50,
          optimalMax: 100,
          checkDecorative: true,
          checkRedundancy: true,
          checkKeywordStuffing: true,
          checkFileNameFallback: true
        },
        'schema': {
          requiredTypes: ['Product', 'Organization', 'WebSite', 'BreadcrumbList'],
          validateProduct: true,
          validateOrganization: true,
          validateBreadcrumb: true,
          validateWebSite: true,
          checkNestedSchemas: true,
          checkGoogleRichResults: true,
          checkPropertyTypes: true,
          checkSameAs: true,
          checkLogo: true
        },
        'canonical': {
          requireCanonical: true,
          checkSelfReferencing: true,
          checkCrossDomain: true,
          checkPagination: true,
          checkHreflang: true,
          checkDuplicateContent: true,
          checkHttpHeader: true,
          allowRelative: false,
          allowedDomains: ['dalli.rs', 'www.dalli.rs'],
          checkTrailingSlash: true,
          checkWwwNonWww: true,
          checkHttpHttps: true,
          maxCanonicalChain: 1
        }
      },
      weights: {
        'meta-description': 0.25,
        'image-alt': 0.20,
        'schema': 0.30,
        'canonical': 0.25
      },
      gradeThresholds: {
        A: 90, B: 75, C: 60, D: 40, F: 0
      },
      crawl: false
    });
  }

  async loadInitialData() {
    // Load page list from API or generate from routes
    this.pages = await this.fetchPageList();
    
    // Run initial audit on homepage
    await this.runAudit('/');
  }

  async fetchPageList() {
    try {
      return await this.api.list({ type: 'all' });
    } catch (error) {
      console.warn('[SEO] API failed, falling back to mock data:', error);
      // In production, this would fetch from API
      // For now, return known routes
      const routes = [
        { url: '/', type: 'home', title: 'DALLI - Premium Moda' },
        { url: '/products', type: 'category', title: 'Proizvodi | DALLI' },
        { url: '/products/hoodie-black-xl', type: 'product', title: 'Muški Duks Crni XL | DALLI' },
        { url: '/products/tshirt-white-s', type: 'product', title: 'Osnovna Majica Bela S | DALLI' },
        { url: '/categories/dukseri', type: 'category', title: 'Dukseri | DALLI' },
        { url: '/categories/trenerke', type: 'category', title: 'Trenerke | DALLI' },
        { url: '/blog/winter-collection', type: 'blog', title: 'Zimska Kolekcija 2024 | DALLI Blog' },
        { url: '/checkout', type: 'checkout', title: 'Checkout | DALLI' },
        { url: '/cart', type: 'cart', title: 'Korpa | DALLI' },
        { url: '/account', type: 'account', title: 'Moj Nalog | DALLI' },
        { url: '/contact', type: 'static', title: 'Kontakt | DALLI' },
        { url: '/about', type: 'static', title: 'O Nama | DALLI' }
      ];

      return routes.map(r => ({
        ...r,
        score: null,
        issues: 0,
        status: 'pending',
        lastAudited: null
      }));
    }
  }

  async runAudit(url = '/', showToast = true) {
    if (this.auditInProgress) return;
    
    this.auditInProgress = true;
    this.currentView = 'audit';
    this.render();

    if (showToast) {
      this.admin.toastContainer.info('SEO audit pokrenut...');
    }

    try {
      // Fetch page HTML
      const html = await this.fetchPageHtml(url);
      
      // Run audit
      const pageResult = await this.auditor.auditPage(url, html);
      
      // Update page in list
      const pageIndex = this.pages.findIndex(p => p.url === url);
      if (pageIndex !== -1) {
        this.pages[pageIndex] = {
          ...this.pages[pageIndex],
          score: pageResult.overallScore,
          grade: pageResult.grade,
          issues: pageResult.issueCounts.critical + pageResult.issueCounts.high + pageResult.issueCounts.medium,
          status: this.getStatusFromScore(pageResult.overallScore),
          lastAudited: new Date().toISOString(),
          auditResult: pageResult
        };
      }

      // Update overall site score
      this.updateOverallScore();

      if (showToast) {
        this.admin.toastContainer.success(`Audit završen: ${pageResult.overallScore}/100 (${pageResult.grade})`);
      }

      this.currentView = 'overview';
      this.render();
    } catch (error) {
      console.error('Audit error:', error);
      if (showToast) {
        this.admin.toastContainer.error('Greška pri auditu: ' + error.message);
      }
      this.currentView = 'overview';
      this.render();
    } finally {
      this.auditInProgress = false;
    }
  }

  async fetchPageHtml(url) {
    // In production, this would fetch from the actual page
    // For now, simulate with a mock based on URL
    return this.generateMockHtml(url);
  }

  generateMockHtml(url) {
    // Generate realistic HTML for each page type
    const pageData = this.getPageData(url);
    
    this.bindEvents();
    return `<!DOCTYPE html>
<html lang="sr">
<head>
  <title>${pageData.title}</title>
  <meta name="description" content="${pageData.description || ''}">
  <link rel="canonical" href="https://dalli.rs${url}">
  ${pageData.schema ? `<script type="application/ld+json">${JSON.stringify(pageData.schema)}</script>` : ''}
</head>
<body>
  ${pageData.images ? pageData.images.map(img => `<img src="${img.src}" alt="${img.alt || ''}">`).join('\n') : ''}
</body>
</html>`;
  }

  getPageData(url) {
    const data = {
      '/': {
        title: 'DALLI - Premium Moda',
        description: 'Kupite najkvalitetnije odeće na DALLI. Brza dostava, povrat robe u 30 dana.',
        schema: {
          "@context": "https://schema.org/",
          "@type": "WebSite",
          "name": "DALLI",
          "url": "https://dalli.rs",
          "potentialAction": {
            "@type": "SearchAction",
            "target": { "@type": "EntryPoint", "urlTemplate": "https://dalli.rs/search?q={search_term_string}" },
            "query-input": "required name=search_term_string"
          }
        },
        images: [
          { src: '/hero-banner.jpg', alt: 'DALLI premium moda kolekcija - muški i ženski odelo' }
        ]
      },
      '/products': {
        title: 'Proizvodi | DALLI',
        description: 'Pregledajte naš pun katalog premium odeće. Majice, trenerke, duksevi i aksesoari.',
        schema: {
          "@context": "https://schema.org/",
          "@type": "CollectionPage",
          "name": "Proizvodi",
          "description": "Pregledajte naš katalog premium odeće"
        },
        images: [
          { src: '/products-grid.jpg', alt: 'Mreža proizvoda - majice, trenerke, duksevi' }
        ]
      },
      '/products/hoodie-black-xl': {
        title: 'Muški Duks (Hoodie) Crni XL | DALLI',
        description: 'Kupite premium muški duks (hoodie) u crnoj boji, veličina XL. 100% pamuk, 350g/m². Brza dostava po Srbiji.',
        schema: {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": "Muški Duks (Hoodie) Crni XL",
          "image": "https://dalli.rs/images/hoodie-black-xl.jpg",
          "description": "Premium crni hoodie od 100% pamuka, 350g/m². Veličina XL.",
          "sku": "ML-005-BLK-XL",
          "brand": { "@type": "Brand", "name": "DALLI" },
          "offers": {
            "@type": "Offer",
            "price": "4290",
            "priceCurrency": "RSD",
            "availability": "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": "DALLI" }
          }
        },
        images: [
          { src: '/images/hoodie-black-xl-front.jpg', alt: 'Crni muški hoodie prednji pogled, veličina XL, prikazujeme relaxed fit i rebrazne manžete' },
          { src: '/images/hoodie-black-xl-back.jpg', alt: 'Crni muški hoodie zadnji pogled, sa bordiranim DALLI logom na vratu' }
        ]
      },
      '/products/tshirt-white-s': {
        title: 'Osnovna Majica Bela S | DALLI',
        description: 'Osnovna bela majica, veličina S. 100% organski pamuk.',
        schema: {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": "Osnovna Majica Bela S",
          "description": "Osnovna bela majica, veličina S. 100% organski pamuk.",
          "sku": "ML-001-WHT-S"
        },
        images: []
      }
    };

    return data[url] || {
      title: 'Stranica | DALLI',
      description: 'DALLI - Premium Moda',
      images: [],
      schema: null
    };
  }

  updateOverallScore() {
    const auditedPages = this.pages.filter(p => p.score !== null);
    if (auditedPages.length > 0) {
      this.overallScore = Math.round(
        auditedPages.reduce((sum, p) => sum + (p.score || 0), 0) / auditedPages.length
      );
    }
  }

  getStatusFromScore(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  async runFullSiteAudit() {
    this.auditInProgress = true;
    this.currentView = 'audit';
    this.render();

    this.admin.toastContainer.info('Puni SEO audit pokrenut za sve stranice...');

    // Also run CWV audit if enabled
    await this.runCWVAudit();
  }

  async runCWVAudit(url = '/', showToast = true) {
    if (this.cwvInProgress) return;
    
    this.cwvInProgress = true;
    if (showToast) {
      this.admin.toastContainer.info('Core Web Vitals audit pokrenut...');
    }

    try {
      const report = await cwvCollector.generatePageReport(url, { device: 'mobile' });
      await cwvCollector.saveHistoricalPoint(report);
      
      if (showToast) {
        const scoringResult = cwvScoringEngine.calculateScore(report);
        this.admin.toastContainer.success(`CWV Audit završen: ${scoringResult.overallScore}/100 (${scoringResult.grade})`);
      }
    } catch (error) {
      console.error('CWV Audit error:', error);
      if (showToast) {
        this.admin.toastContainer.error('Greška pri CWV auditu: ' + error.message);
      }
    } finally {
      this.cwvInProgress = false;
    }
  }

  async runFullSiteAudit() {
    this.auditInProgress = true;
    this.currentView = 'audit';
    this.render();

    this.admin.toastContainer.info('Puni SEO audit pokrenut za sve stranice...');

    const results = [];
    for (const page of this.pages) {
      if (this.auditInProgress === false) break; // Allow cancellation
      
      this.pages[this.pages.indexOf(page)] = { ...page, status: 'auditing' };
      this.render();

      try {
        const html = await this.fetchPageHtml(page.url);
        const result = await this.auditor.auditPage(page.url, html);
        
        page.score = result.overallScore;
        page.grade = result.grade;
        page.issues = result.issueCounts.critical + result.issueCounts.high + result.issueCounts.medium;
        page.status = this.getStatusFromScore(result.overallScore);
        page.lastAudited = new Date().toISOString();
        page.auditResult = result;
        
        results.push(result);
      } catch (error) {
        console.error(`Audit failed for ${page.url}:`, error);
        page.status = 'error';
      }
      
      this.updateOverallScore();
      this.render();
      
      // Small delay to prevent blocking
      await new Promise(r => setTimeout(r, 100));
    }

    // Run cross-page analyses
    if (results.length > 1) {
      await this.runCrossPageAnalyses(results);
    }

    this.auditInProgress = false;
    this.currentView = 'overview';
    this.admin.toastContainer.success(`Puni audit završen. Prosečan skor: ${this.overallScore}/100`);
    this.render();
  }

  async runCrossPageAnalyses(results) {
    // Meta description uniqueness
    const metaResults = results.map(r => r.results.get('meta-description')).filter(Boolean);
    if (metaResults.length > 1) {
      const crossResult = await import('../seo/validators/meta-description-validator.js')
        .then(m => m.MetaDescriptionValidator.checkCrossPageUniqueness(metaResults));
      if (crossResult.issueCount > 0) {
        this.showCrossPageAlert('Meta Description', crossResult);
      }
    }

    // Image alt consistency
    const altResults = results.map(r => r.results.get('image-alt')).filter(Boolean);
    if (altResults.length > 1) {
      const crossResult = await import('../seo/validators/image-alt-validator.js')
        .then(m => m.ImageAltValidator.checkCrossImageConsistency(altResults));
      if (crossResult.issueCount > 0) {
        this.showCrossPageAlert('Image Alt', crossResult);
      }
    }

    // Schema consistency
    const schemaResults = results.map(r => r.results.get('schema')).filter(Boolean);
    if (schemaResults.length > 1) {
      const crossResult = await import('../seo/validators/schema-validator.js')
        .then(m => m.SchemaValidator.checkCrossPageConsistency(schemaResults));
      if (crossResult.issueCount > 0) {
        this.showCrossPageAlert('Schema.org', crossResult);
      }
    }

    // Canonical consistency
    const canonicalResults = results.map(r => r.results.get('canonical')).filter(Boolean);
    if (canonicalResults.length > 1) {
      const crossResult = await import('../seo/validators/canonical-validator.js')
        .then(m => m.CanonicalValidator.checkCrossPageCanonicals(canonicalResults));
      if (crossResult.issueCount > 0) {
        this.showCrossPageAlert('Canonical', crossResult);
      }
    }
  }

  showCrossPageAlert(type, result) {
    const messages = [];
    if (result.errors) {
      result.errors.forEach(e => messages.push(`🔴 ${e.message}`));
    }
    if (result.warnings) {
      result.warnings.forEach(w => messages.push(`🟡 ${w.message}`));
    }
    if (messages.length > 0) {
      this.admin.toastContainer.warning(`${type} cross-page: ${messages[0]}`, { duration: 10000 });
    }
  }

  render() {
    const template = new SEOSectionTemplate({
      overallScore: this.overallScore,
      pages: this.pages,
      currentView: this.currentView,
      selectedPage: this.selectedPage,
      auditInProgress: this.auditInProgress,
      admin: this.admin,
      onViewChange: (view) => { this.currentView = view; this.render(); },
      onRunAudit: (url) => this.runAudit(url),
      onRunFullAudit: () => this.runFullSiteAudit(),
      onViewPage: (url) => { this.selectedPage = url; this.currentView = 'editor'; this.render(); },
      onExportReport: () => this.exportReport(),
      onRunCWVAudit: (url) => this.runCWVAudit(url),
      onViewCWV: () => { this.currentView = 'cwv'; this.render(); }
    });
    
    this.element.innerHTML = template.render();
    this.bindEvents();
  }

  bindEvents() {
    this.on('click', '[data-action="run-audit"]', (e) => {
      const url = e.delegateTarget.dataset.url || '/';
      this.runAudit(url);
    });

    this.on('click', '[data-action="run-full-audit"]', () => {
      this.runFullSiteAudit();
    });

    this.on('click', '[data-action="view-page"]', (e) => {
      const url = e.delegateTarget.dataset.url;
      this.selectedPage = url;
      this.currentView = 'editor';
      this.render();
    });

    this.on('click', '[data-action="export-report"]', () => this.exportReport());

    this.on('click', '[data-action="back-overview"]', () => {
      this.currentView = 'overview';
      this.selectedPage = null;
      this.render();
    });

    this.on('click', '[data-action="retry-audit"]', (e) => {
      const url = e.delegateTarget.dataset.url;
      this.runAudit(url);
    });

    // CWV events
    this.on('click', '[data-action="view-cwv"]', () => {
      this.currentView = 'cwv';
      this.render();
      this.mountCWVDashboard();
    });

    this.on('click', '[data-action="run-cwv-audit"]', () => {
      this.runCWVAudit();
    });

    this.on('click', '#cwv-run-audit-btn', () => {
const urlInput = this.element.querySelector('#cwv-input-url');
      const deviceSelect = this.element.querySelector('#cwv-device-select');
      const device = (deviceSelect?.value || 'mobile');
      this.runCWVAudit(url, true);
    });

    // Meta editor events
    this.on('input', '[name="seoTitle"]', (e) => this.updateCharCount(e.target, 60));
    this.on('input', '[name="seoDescription"]', (e) => this.updateCharCount(e.target, 160));
    this.on('click', '[data-action="save-meta"]', () => this.saveMetaData());
    this.on('click', '[data-action="auto-generate-meta"]', () => this.autoGenerateMeta());

    // Issue actions
    this.on('click', '[data-action="fix-issue"]', (e) => {
      const type = e.delegateTarget.dataset.type;
      this.fixIssue(type);
    });

    this.on('click', '[data-action="view-issue"]', (e) => {
      const type = e.delegateTarget.dataset.type;
      this.viewIssueDetails(type);
    });
  }

  mountCWVDashboard() {
    const container = this.element.querySelector('#cwv-dashboard-container');
    if (container && this.cwvDashboard) {
      this.cwvDashboard.mount(container);
      // Load current page CWV data
      if (this.selectedPage) {
        this.cwvDashboard.loadData(this.selectedPage, { device: 'mobile' });
      }
    }
  }

  updateCharCount(input, maxLength) {
    const counter = input.parentElement.querySelector('.seo-char-count span');
    if (counter) {
      counter.textContent = input.value.length;
      counter.style.color = input.value.length > maxLength ? 'var(--color-danger)' : 'var(--color-text-tertiary)';
    }
  }

  async saveMetaData() {
    const title = this.element.querySelector('[name="seoTitle"]')?.value;
    const description = this.element.querySelector('[name="seoDescription"]')?.value;
    const canonical = this.element.querySelector('[name="seoCanonical"]')?.value;
    const ogImage = this.element.querySelector('[name="seoOgImage"]')?.value;

    // In production, send to API
    console.log('Saving meta:', { title, description, canonical, ogImage });
    this.admin.toastContainer.success('Meta podaci sačuvani');
  }

  autoGenerateMeta() {
    if (!this.selectedPage) return;
    
    const metaPageData = this.getPageData(this.selectedPage);
    const generatedTitle = metaPageData.title.length > 60 ? metaPageData.title.substring(0, 57) + '...' : metaPageData.title;
    const generatedDesc = metaPageData.description || `Kupite ${metaPageData.title} na DALLI. Brza dostava, kvalitetna roba.`;

    this.element.querySelector('[name="seoTitle"]').value = generatedTitle;
    this.element.querySelector('[name="seoDescription"]').value = generatedDesc;
    this.element.querySelector('[name="seoCanonical"]').value = `https://dalli.rs${this.selectedPage}`;
    
    this.updateCharCount(this.element.querySelector('[name="seoTitle"]'), 60);
    this.updateCharCount(this.element.querySelector('[name="seoDescription"]'), 160);
    
    this.admin.toastContainer.info('Meta podaci auto-generisani');
  }

  fixIssue(type) {
    this.admin.toastContainer.info(`Popravka za ${type} - u razvoju`);
    // Navigate to relevant pages
  }

  viewIssueDetails(type) {
    this.currentView = 'issues';
    this.render();
  }

  exportReport() {
    if (this.siteAuditResult) {
      const reports = this.auditor.generateReport(this.siteAuditResult);
      ImperiumUtils.downloadFile(reports.json, `seo-audit-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    } else {
      // Export current page data
      const report = {
        generated: new Date().toISOString(),
        overallScore: this.overallScore,
        pages: this.pages
      };
      const json = JSON.stringify(report, null, 2);
      ImperiumUtils.downloadFile(json, `seo-audit-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    }
    this.admin.toastContainer.success('Izveštaj preuzet');
  }
}

export default SEOSection;