/**
 * SEO Section Template - HTML rendering for SEO Section
 */

export class SEOSectionTemplate {
  constructor(options = {}) {
    this.overallScore = options.overallScore || 0;
    this.pages = options.pages || [];
    this.currentView = options.currentView || 'overview';
    this.selectedPage = options.selectedPage || null;
    this.auditInProgress = options.auditInProgress || false;
    this.admin = options.admin;
    this.onViewChange = options.onViewChange || (() => {});
    this.onRunAudit = options.onRunAudit || (() => {});
    this.onRunFullAudit = options.onRunFullAudit || (() => {});
    this.onViewPage = options.onViewPage || (() => {});
    this.onExportReport = options.onExportReport || (() => {});
    this.onRunCWVAudit = options.onRunCWVAudit || (() => {});
    this.onViewCWV = options.onViewCWV || (() => {});
  }

  getStatusBadge(status) {
    const badges = {
      excellent: '<span class="badge badge-success">Odlično</span>',
      good: '<span class="badge badge-info">Dobro</span>',
      warning: '<span class="badge badge-warning">Upozorenje</span>',
      poor: '<span class="badge badge-danger">Loše</span>',
      critical: '<span class="badge badge-danger">Kritično</span>',
      pending: '<span class="badge badge-neutral">Na čekanju</span>',
      auditing: '<span class="badge badge-primary">U toku</span>',
      error: '<span class="badge badge-danger">Greška</span>'
    };
    return badges[status] || `<span class="badge badge-neutral">${status}</span>`;
  }

  getScoreClass(score) {
    if (score === null) return 'neutral';
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  getGradeLabel(grade) {
    const labels = { A: 'Odličan', B: 'Vrlo dobar', C: 'Dobar', D: 'Nedovoljan', F: 'Kritičan' };
    return labels[grade] || 'Nepoznat';
  }

  getGradeClass(grade) {
    const classes = { A: 'success', B: 'info', C: 'warning', D: 'danger', F: 'critical' };
    return classes[grade] || 'neutral';
  }

  getTopPage() {
    const scoredPages = this.pages.filter(p => p.score !== null);
    if (scoredPages.length === 0) return 'N/A';
    const top = scoredPages.reduce((max, p) => p.score > max.score ? p : max, scoredPages[0]);
    return `${top.title} (${top.score})`;
  }

  render() {
    switch (this.currentView) {
      case 'overview':
        return this.renderOverview();
      case 'audit':
        return this.renderAuditView();
      case 'pages':
        return this.renderPagesList();
      case 'issues':
        return this.renderIssuesView();
      case 'editor':
        return this.renderMetaEditor();
      case 'cwv':
        return this.renderCWV();
      default:
        return this.renderOverview();
    }
  }

  renderOverview() {
    const auditedPages = this.pages.filter(p => p.score !== null).length;
    const avgScore = this.overallScore || 0;
    const grade = this.getGrade(avgScore);

    return `
      <div class="seo-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">SEO Centar</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Optimizujte SEO meta podatke i pratite performanse pretrage.</p>
          </div>
          <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
            <button class="btn btn-primary" data-action="run-full-audit" ${this.auditInProgress ? 'disabled' : ''}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              ${this.auditInProgress ? 'Audit u toku...' : 'Pokreni Puni Audit'}
            </button>
            <button class="btn btn-primary" data-action="view-cwv" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); border: none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Core Web Vitals
            </button>
            <button class="btn btn-secondary" data-action="export-report">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Izvezi Izveštaj
            </button>
          </div>
        </div>

        <!-- Score Card -->
        <div style="display: grid; grid-template-columns: 300px 1fr; gap: var(--space-5); margin-bottom: var(--space-6);">
          <div class="seo-score-card" style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-6);">
            <div class="seo-score-circle" style="position: relative; width: 120px; height: 120px; margin: 0 auto var(--space-4);">
              <svg viewBox="0 0 120 120" style="transform: rotate(-90deg);">
                <circle class="score-bg" cx="60" cy="60" r="54" fill="none" stroke="var(--color-border)" stroke-width="8"/>
                <circle class="score-progress ${this.getScoreClass(this.overallScore)}" cx="60" cy="60" r="54" fill="none" stroke-width="8" stroke-dasharray="339" stroke-dashoffset="${339 - (339 * (this.overallScore || 0) / 100)}" style="transition: stroke-dashoffset 0.5s ease;"/>
              </svg>
              <div class="seo-score-value" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: var(--text-3xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.overallScore || 0}</div>
            </div>
            <div class="seo-score-label" style="text-align: center; font-size: var(--text-lg); color: var(--color-text-secondary); margin-bottom: var(--space-2);">Ukupni SEO Skor</div>
            <div class="seo-score-badge ${this.getGradeClass(this.getGrade(this.overallScore))}" style="display: inline-block; padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); font-size: var(--text-sm); font-weight: var(--font-semibold); margin: 0 auto;">${this.getGrade(this.overallScore || 0)}</div>
            <div style="margin-top: var(--space-5); padding: var(--space-4); background: var(--color-bg-secondary); border-radius: var(--radius-md); text-align: center;">
              <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);"><span>Auditirane stranice</span><strong>${this.pages.filter(p => p.score !== null).length}/${this.pages.length}</span></div>
              <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);"><span>Prosečan skor</span><strong>${this.overallScore || 0}/100</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>Status</span><strong>${this.getGradeLabel(this.getGrade(this.overallScore || 0))}</strong></div>
            </div>
          </div>

          <!-- Quick Stats -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4);">
            ${this.renderQuickStat('Stranice', `${this.pages.filter(p => p.score !== null).length}/${this.pages.length}`, '📄', 'Auditirane / Ukupno')}
            ${this.renderQuickStat('Prosečan skor', `${this.overallScore || 0}/100`, '📊', 'Srednja vrednost')}
            ${this.renderQuickStat('Top stranica', this.getTopPage(), '🏆', 'Najbolji skor')}
          </div>
        </div>

        <!-- Pages Table -->
        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">Stranice po SEO Skoru</h3>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">URL</th>
                <th scope="col" style="width: 120px;">Tip</th>
                <th scope="col">Title</th>
                <th scope="col" style="width: 100px;">Skor</th>
                <th scope="col" style="width: 100px;">Problemi</th>
                <th scope="col" style="width: 120px;">Status</th>
                <th scope="col" style="width: 140px;">Akcije</th>
              </tr>
            </thead>
            <tbody>
              ${this.pages.map(p => `
                <tr class="${p.status === 'auditing' ? 'auditing' : ''}">
                  <td><span style="font-family: var(--font-mono); font-size: var(--text-sm);">${p.url}</span></td>
                  <td><span class="badge badge-${p.type === 'product' ? 'primary' : p.type === 'category' ? 'info' : p.type === 'blog' ? 'warning' : p.type === 'static' ? 'neutral' : 'secondary'}">${p.type}</span></td>
                  <td>${p.title}</td>
                  <td>${p.score !== null ? `<span class="seo-score-badge ${this.getScoreClass(p.score)}">${p.score}/100</span>` : '<span class="badge badge-neutral">N/A</span>'}</td>
                  <td><span class="badge badge-${p.issues > 3 ? 'danger' : p.issues > 0 ? 'warning' : 'success'}">${p.issues || 0} problema</span></td>
                  <td>${this.getStatusBadge(p.status)}</td>
                  <td>
                    <div class="admin-actions" style="display: flex; gap: var(--space-2);">
                      ${p.score === null ? `
                        <button class="btn-action btn-secondary btn-sm" data-action="run-audit" data-url="${p.url}" title="Pokreni audit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        </button>
                      ` : `
                        <button class="btn-action btn-secondary btn-sm" data-action="run-audit" data-url="${p.url}" title="Ponovi audit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        </button>
                      `}
                      <button class="btn-action btn-secondary btn-sm" data-action="view-page" data-url="${p.url}" title="Optimizuj SEO">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
    `;
  }

  renderQuickStat(label, value, icon, desc) {
    return `
      <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-5); text-align: center;">
        <div style="font-size: var(--text-2xl); margin-bottom: var(--space-2);">${icon}</div>
        <div style="font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${value}</div>
        <div style="font-size: var(--text-sm); color: var(--color-text-tertiary);">${label}</div>
        <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); margin-top: var(--space-1);">${desc}</div>
      </div>
    `;
  }

  getScoreClass(score) {
    if (score === null) return 'neutral';
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  getGradeLabel(grade) {
    const labels = { A: 'Odličan', B: 'Vrlo dobar', C: 'Dobar', D: 'Nedovoljan', F: 'Kritičan' };
    return labels[grade] || 'Nepoznat';
  }

  getGradeClass(grade) {
    const classes = { A: 'success', B: 'info', C: 'warning', D: 'danger', F: 'critical' };
    return classes[grade] || 'neutral';
  }

  getTopPage() {
    const scoredPages = this.pages.filter(p => p.score !== null);
    if (scoredPages.length === 0) return 'N/A';
    const top = scoredPages.reduce((max, p) => p.score > max.score ? p : max, scoredPages[0]);
    return `${top.title} (${top.score})`;
  }

  getStatusBadge(status) {
    const badges = {
      excellent: '<span class="badge badge-success">Odlično</span>',
      good: '<span class="badge badge-info">Dobro</span>',
      warning: '<span class="badge badge-warning">Upozorenje</span>',
      poor: '<span class="badge badge-danger">Loše</span>',
      critical: '<span class="badge badge-danger">Kritično</span>',
      pending: '<span class="badge badge-neutral">Na čekanju</span>',
      auditing: '<span class="badge badge-primary">U toku</span>',
      error: '<span class="badge badge-danger">Greška</span>'
    };
    return badges[status] || `<span class="badge badge-neutral">${status}</span>`;
  }

  renderQuickStat(label, value, icon, desc) {
    return `
      <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-5); text-align: center;">
        <div style="font-size: var(--text-2xl); margin-bottom: var(--space-2);">${icon}</div>
        <div style="font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${value}</div>
        <div style="font-size: var(--text-sm); color: var(--color-text-tertiary);">${label}</div>
        <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); margin-top: var(--space-1);">${desc}</div>
      </div>
    `;
  }

  renderAuditView() {
    return `
      <div class="seo-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold);">Audit u toku...</h2>
            <p style="color: var(--color-text-tertiary);">Molimo sačekajte dok se audit završi.</p>
          </div>
          <div style="display: flex; gap: var(--space-3);">
            <button class="btn btn-secondary" data-action="back-overview">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
              Nazad
            </button>
          </div>
        </div>
        <div style="text-align: center; padding: var(--space-12);">
          <div style="width: 64px; height: 64px; border: 4px solid var(--color-border); border-top: 4px solid var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto var(--space-6);"></div>
          <h3 style="font-size: var(--text-xl); font-weight: var(--font-semibold); margin-bottom: var(--space-2);">Audit u toku...</h3>
          <p style="color: var(--color-text-tertiary);">Molimo sačekajte dok se audit završi.</p>
        </div>
        <style>
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    `;
  }

  renderPagesList() {
    return this.renderOverview();
  }

  renderIssuesView() {
    return `
      <div class="seo-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold);">SEO Problemi</h2>
            <p style="color: var(--color-text-tertiary);">Pregled i rešavanje detektovanih problema.</p>
          </div>
          <button class="btn btn-secondary" data-action="back-overview">Nazad</button>
        </div>
        <div style="text-align: center; padding: var(--space-12);">
          <p style="color: var(--color-text-tertiary);">Detaljan prikaz problema - u razvoju.</p>
          <button class="btn btn-primary" data-action="back-overview" style="margin-top: var(--space-4);">Nazad na pregled</button>
        </div>
    `;
  }

  renderMetaEditor() {
    const page = this.pages.find(p => p.url === this.selectedPage);
    if (!page) return this.renderOverview();

    const pageMetaData = this.getPageMetaData(this.selectedPage);
    const pageSeo = page.seo || {};

    // Get current SEO values
    const metaTitle = page.seo?.title || pageMetaData.title;
    const metaDesc = page.seo?.description || pageMetaData.desc;
    const canonical = page.seo?.canonical || pageMetaData.canonical || `https://dalli.rs${this.selectedPage}`;
    const ogImage = page.seo?.ogImage || '';
    
    // CMS SEO Control flags from page.seo
    const jsonLdEnabled = page.seo?.jsonLdEnabled !== false; // Default true
    const jsonLdCustom = page.seo?.jsonLdCustom || '';
    const noIndex = page.seo?.noIndex === true;
    const noFollow = page.seo?.noFollow === true;
    const noArchive = page.seo?.noArchive === true;
    const noSnippet = page.seo?.noSnippet === true;
    const noImageIndex = page.seo?.noImageIndex === true;
    const inSitemap = page.seo?.inSitemap !== false; // Default true
    const sitemapPriority = page.seo?.sitemapPriority || '0.5';
    const changefreq = page.seo?.changefreq || 'weekly';


    return `
      <div class="seo-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold);">Meta Editor: ${page.title}</h2>
            <p style="color: var(--color-text-tertiary);">Optimizujte meta podatke za ovu stranicu.</p>
          </div>
          <button class="btn btn-secondary" data-action="back-overview">Nazad</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 400px; gap: var(--space-6);">
          <!-- Form -->
          <div class="card" style="max-width: 700px;">
            <div class="card-body" style="padding: var(--space-5);">
              <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Osnovni Meta Podaci</div>
              <div class="seo-field-group">
                <label class="seo-field-label">Meta Title</label>
                <input type="text" class="seo-field-input" name="seoTitle" value="${page.seo?.title || pageMetaData.title}" maxlength="60" placeholder="Auto-generiše se">
                <div class="seo-char-count"><span>${(page.seo?.title || pageMetaData.title).length}</span>/60 karaktera</div>
              </div>
              <div class="seo-field-group">
                <label class="seo-field-label">Meta Description</label>
                <textarea class="seo-field-input seo-field-textarea" name="seoDescription" rows="3" maxlength="160" placeholder="Auto-generiše se">${page.seo?.description || pageMetaData.desc}</textarea>
                <div class="seo-char-count"><span>${(page.seo?.description || pageMetaData.desc).length}</span>/160 karaktera</div>
              </div>
              <div class="seo-field-group">
                <label class="seo-field-label">Canonical URL</label>
                <input type="url" class="seo-field-input" name="seoCanonical" value="${page.seo?.canonical || pageMetaData.canonical || `https://dalli.rs${this.selectedPage}`}">
              </div>
              <div class="seo-field-group">
                <label class="seo-field-label">Open Graph Image</label>
                <input type="url" class="seo-field-input" name="seoOgImage" value="${page.seo?.ogImage || ''}" placeholder="https://dalli.rs/images/og/...">
              </div>

              <!-- CMS SEO Control Section -->
              <div style="margin-top: var(--space-6); padding-top: var(--space-5); border-top: 1px solid var(--color-border);">
                <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">CMS SEO Control</h3>
                
                <!-- JSON-LD Structured Data -->
                <div class="seo-field-group">
                  <label class="seo-field-label">JSON-LD Structured Data</label>
                  <div style="display: flex; align-items: center; gap: var(--space-2);">
                    <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                      <input type="checkbox" name="jsonLdEnabled" ${page.seo?.jsonLdEnabled !== false ? 'checked' : ''} onchange="this.closest('form').dispatchEvent(new Event('change'))">
                      <span>Uključi JSON-LD structured data (auto-generisano)</span>
                    </label>
                  </div>
                  <div class="seo-field-group" style="margin-top: var(--space-3);">
                    <label class="seo-field-label">Custom JSON-LD (opciono)</label>
                    <textarea class="seo-field-input seo-field-textarea" name="jsonLdCustom" rows="5" placeholder='{"@context":"https://schema.org","@type":"Product","name":"..."}' style="font-family: monospace; font-size: var(--text-sm);">${page.seo?.jsonLdCustom || ''}</textarea>
                    <div class="seo-field-hint">Custom JSON-LD koji će biti dodat (samo ako je JSON-LD uključen). Ostavite prazno za auto-generisanje.</textarea>
                  </div>
                </div>

                <!-- Robots Control -->
                <div style="margin-top: var(--space-6); padding-top: var(--space-5); border-top: 1px solid var(--color-border);">
                  <h4 style="font-size: var(--text-base); font-weight: var(--font-semibold); margin-bottom: var(--space-3);">Robots Kontrola</h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
                    <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                      <input type="checkbox" name="noIndex" ${page.seo?.noIndex ? 'checked' : ''}>
                      <span>noindex</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                      <input type="checkbox" name="noFollow" ${page.seo?.noFollow ? 'checked' : ''}>
                      <span>nofollow</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                      <input type="checkbox" name="noArchive" ${page.seo?.noArchive ? 'checked' : ''}>
                      <span>noarchive</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                      <input type="checkbox" name="noSnippet" ${page.seo?.noSnippet ? 'checked' : ''}>
                      <span>nosnippet</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                      <input type="checkbox" name="noImageIndex" ${page.seo?.noImageIndex ? 'checked' : ''}>
                      <span>noimageindex</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                      <input type="checkbox" name="noFollow" ${page.seo?.noFollow ? 'checked' : ''}>
                      <span>nofollow (linkovi)</span>
                    </label>
                  </div>
                </div>

                <!-- Sitemap Control -->
                <div style="margin-top: var(--space-6); padding-top: var(--space-5); border-top: 1px solid var(--color-border);">
                  <h4 style="font-size: var(--text-base); font-weight: var(--font-semibold); margin-bottom: var(--space-3);">Sitemap Kontrola</h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3); align-items: end;">
                    <div class="seo-field-group">
                      <label class="seo-field-label" style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                        <input type="checkbox" name="inSitemap" ${page.seo?.inSitemap !== false ? 'checked' : ''}>
                        <span>Uključi u sitemap</span>
                      </label>
                    </div>
                    <div class="seo-field-group">
                      <label class="seo-field-label">Priority (0.0 - 1.0)</label>
                      <input type="number" class="seo-field-input" name="sitemapPriority" value="${page.seo?.sitemapPriority || '0.5'}" step="0.1" min="0" max="1">
                    </div>
                    <div class="seo-field-group">
                      <label class="seo-field-label">Change Frequency</label>
                      <select class="seo-field-input seo-field-select" name="changefreq">
                        <option value="always" ${page.seo?.changefreq === 'always' ? 'selected' : ''}>always</option>
                        <option value="hourly" ${page.seo?.changefreq === 'hourly' ? 'selected' : ''}>hourly</option>
                        <option value="daily" ${page.seo?.changefreq === 'daily' ? 'selected' : ''}>daily</option>
                        <option value="weekly" ${page.seo?.changefreq === 'weekly' ? 'selected' : ''}>weekly</option>
                        <option value="monthly" ${page.seo?.changefreq === 'monthly' ? 'selected' : ''}>monthly</option>
                        <option value="yearly" ${page.seo?.changefreq === 'yearly' ? 'selected' : ''}>yearly</option>
                        <option value="never" ${page.seo?.changefreq === 'never' ? 'selected' : ''}>never</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- JSON-LD Custom -->
                <div style="margin-top: var(--space-6); padding-top: var(--space-5); border-top: 1px solid var(--color-border);">
                  <h4 style="font-size: var(--text-base); font-weight: var(--font-semibold); margin-bottom: var(--space-3);">Custom JSON-LD Injection</h4>
                  <div class="seo-field-group">
                    <label class="seo-field-label">Custom JSON-LD (opciono)</label>
                    <textarea class="seo-field-input" name="jsonLdCustom" rows="6" placeholder='{"@context":"https://schema.org","@type":"Product","name":"..."}' style="font-family: monospace; font-size: var(--text-sm);">${page.seo?.jsonLdCustom || ''}</textarea>
                    <div class="seo-field-hint">Custom JSON-LD koji će biti dodat (samo ako je JSON-LD uključen). Ostavite prazno za auto-generisanje.</textarea>
                  </div>
                </div>

                <div style="margin-top: var(--space-5); display: flex; gap: var(--space-3);">
                  <button class="btn btn-primary" data-action="save-meta">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 21 13"/></svg>
                    Sačuvaj izmene
                  </button>
                  <button class="btn btn-secondary" data-action="auto-generate-meta">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><path d="M8 14a6 6 0 0 0-12 0"/></svg>
                    Auto-generiši
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div class="card">
            <div class="card-body" style="padding: var(--space-5);">
              <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Google SERP Preview</h3>
              <div class="meta-preview" style="border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); background: var(--color-bg); font-family: arial, sans-serif;">
                <div class="meta-preview-url" style="color: #1a8917; font-size: var(--text-sm); margin-bottom: var(--space-1); word-break: break-all;">dalli.rs${this.selectedPage}</div>
                <div class="meta-preview-title" style="color: #1a0dab; font-size: var(--text-lg); font-weight: 500; margin-bottom: var(--space-2); max-width: 600px;">${page.seo?.title || pageMetaData.title}</div>
                <div class="meta-preview-desc" style="color: #4d5156; font-size: var(--text-base); line-height: 1.4; max-width: 600px;">${page.seo?.description || pageMetaData.desc}</div>
              </div>
              <div style="margin-top: var(--space-4); padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-md); font-size: var(--text-xs); color: var(--color-text-tertiary);">
                <strong>Saveti:</strong> Title 50-60 karaktera, Description 150-160 karaktera, uključi ključne reči i call-to-action.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }


  renderCWV() {
    return `
      <div class="cwv-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Core Web Vitals</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Praćenje LCP, CLS, INP, FCP, TTFB metrika za performanse stranice</p>
          </div>
          <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
            <button class="btn btn-primary" data-action="run-cwv-audit" ${this.auditInProgress ? 'disabled' : ''}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Pokreni CWV Audit
            </button>
            <button class="btn btn-secondary" data-action="back-overview">Nazad</button>
          </div>
        </div>

        <div id="cwv-dashboard-container" style="min-height: 400px;">
          ${this.renderCWVEmptyState()}
        </div>
    `;
  }

  renderCWVEmptyState() {
    return `
      <div style="text-align: center; padding: var(--space-12);">
        <div style="font-size: var(--text-5xl); margin-bottom: var(--space-4);">📊</div>
        <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); margin-bottom: var(--space-2);">Core Web Vitals Dashboard</h2>
        <p style="color: var(--color-text-tertiary); margin-bottom: var(--space-6); max-width: 400px; margin-left: auto; margin-right: auto;">
          Unesite URL za audit Core Web Vitals metrika: LCP, CLS, INP, FCP, TTFB
        </p>
        <div style="display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap;">
          <input type="url" id="cwv-input-url" class="form-input" placeholder="https://example.com" style="min-width: 300px; max-width: 400px;">
          <select id="cwv-device-select" class="form-select" style="width: auto;">
            <option value="mobile">📱 Mobile</option>
            <option value="desktop">🖥️ Desktop</option>
          </select>
          <button class="btn btn-primary" id="cwv-run-audit-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Pokreni CWV Audit
          </button>
        </div>
      </div>
    `;
  }
}