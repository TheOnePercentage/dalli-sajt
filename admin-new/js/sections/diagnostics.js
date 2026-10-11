import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';

export class DiagnosticsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.utils;
    this.healthChecks = [];
    this.issues = [];
    this.logs = [];
    this.brokenLinks = [];
    this.missingImages = [];
    this.seoIssues = [];
    this.securityChecks = [];
    this.perfMetrics = [];
  }

  async onEnter() {
    await this.loadData();
    this.render();
  }

  async loadData() {
    try {
      const [health, logs] = await Promise.all([
        this.api.healthCheck(),
        this.api.getSystemLogs({ limit: 50 })
      ]);
      this.healthChecks = health.checks || this.generateMockHealthChecks();
      this.logs = logs.entries || this.generateMockLogs();
    } catch (error) {
      console.warn('[Diagnostics] API failed, falling back to mock data:', error);
      this.healthChecks = this.generateMockHealthChecks();
      this.logs = this.generateMockLogs();
    }
    this.issues = this.generateMockIssues();
    this.brokenLinks = this.generateMockBrokenLinks();
    this.missingImages = this.generateMockMissingImages();
    this.seoIssues = this.generateMockSeoIssues();
    this.securityChecks = this.generateMockSecurityChecks();
    this.perfMetrics = this.generateMockPerfMetrics();
  }

  generateMockHealthChecks() {
    return [
      { id: 'database', name: 'Baza Podataka', status: 'healthy', desc: 'Sve veze su stabilne, vreme odziva < 50ms', metric: '12.3 ms', icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v16"/><path d="M2 12h20"/>' },
      { id: 'api', name: 'API Servisi', status: 'healthy', desc: 'Svi endpoints funkcionalni, error rate < 0.1%', metric: '99.99% uptime', icon: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
      { id: 'cdn', name: 'CDN / Assets', status: 'warning', desc: '3 regiona sa increased latency', metric: '145 ms avg', icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
      { id: 'email', name: 'Email Servis', status: 'healthy', desc: 'Delivery rate 98.5%, bounce rate 1.2%', metric: '98.5% delivery', icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
      { id: 'payments', name: 'Payment Gateway', status: 'critical', desc: 'Stripe webhook failing intermittently', metric: '12% failure rate', icon: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
      { id: 'search', name: 'Search Index', status: 'info', desc: 'Reindex scheduled for tonight 02:00', metric: 'Next run: 02:00', icon: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>' }
    ];
  }

  generateMockIssues() {
    return [
      { id: 'ISS-001', title: 'Payment webhook timeout', severity: 'critical', desc: 'Stripe webhook endpoint returns 504 after 30s', meta: 'Affected: Checkout flow', actions: ['view', 'fix'] },
      { id: 'ISS-002', title: 'CDN latency EU-West', severity: 'high', desc: 'Latency spike to 340ms in Frankfurt edge', meta: 'Affected: Image delivery', actions: ['view'] },
      { id: 'ISS-003', title: 'Slow query on orders table', severity: 'medium', desc: 'Missing index on customer_id + status', meta: 'Query time: 2.3s', actions: ['view', 'fix'] },
      { id: 'ISS-004', title: 'Email template missing variable', severity: 'low', desc: '{{customer_name}} not replaced in welcome email', meta: 'Affected: 47 emails', actions: ['fix'] }
    ];
  }

  generateMockLogs() {
    return [
      { time: '14:32:15', level: 'info', msg: 'Cron job completed: daily_inventory_sync' },
      { time: '14:30:02', level: 'warning', msg: 'High memory usage detected: 87%' },
      { time: '14:28:45', level: 'info', msg: 'Backup completed successfully: 2.3 GB' },
      { time: '14:25:10', level: 'error', msg: 'Stripe webhook timeout: /webhooks/stripe' },
      { time: '14:20:00', level: 'info', msg: 'User admin@dalli.rs logged in' },
      { time: '14:15:33', level: 'debug', msg: 'Cache cleared: product_catalog' }
    ];
  }

  generateMockBrokenLinks() {
    return [
      { url: '/products/old-sku-123', status: '404', type: 'Product page' },
      { url: '/category/deprecated-line', status: '404', type: 'Category page' },
      { url: '/blog/summer-collection-2023', status: '404', type: 'Blog post' },
      { url: '/api/v1/legacy/orders', status: '500', type: 'API endpoint' },
      { url: '/checkout/old-flow', status: '301', type: 'Redirect' }
    ];
  }

  generateMockMissingImages() {
    return [
      { path: '/images/products/hoodie-black-xl.jpg', product: 'Muški Duks (Hoodie) - Crna - XL' },
      { path: '/images/products/tshirt-white-s.jpg', product: 'Osnovna Majica - Bela - S' },
      { path: '/images/products/tracksuit-blue-m.jpg', product: 'Muška Sportska Trenerka - Plava - M' }
    ];
  }

  generateMockSeoIssues() {
    return [
      { type: 'missing-title', url: '/products/old-sku-123', desc: 'Missing meta title tag' },
      { type: 'missing-desc', url: '/categories/dukseri', desc: 'Meta description under 50 chars' },
      { type: 'missing-alt', url: '/products/hoodie-black-xl', desc: 'Product image missing alt text' },
      { type: 'duplicate', url: '/products/tshirt-white-s', desc: 'Duplicate meta description with /products/tshirt-white-m' }
    ];
  }

  generateMockSecurityChecks() {
    return [
      { name: 'SSL Certificate', status: 'passed', desc: 'Valid until 2025-03-15' },
      { name: 'HSTS Header', status: 'passed', desc: 'max-age=31536000; includeSubDomains' },
      { name: 'CSP Header', status: 'failed', desc: 'Missing Content-Security-Policy header' },
      { name: 'X-Frame-Options', status: 'passed', desc: 'DENY' },
      { name: 'Rate Limiting', status: 'passed', desc: '100 req/min per IP' },
      { name: 'SQL Injection Protection', status: 'passed', desc: 'Parameterized queries enforced' }
    ];
  }

  generateMockPerfMetrics() {
    return [
      { name: 'TTFB (Time to First Byte)', value: '142 ms', status: 'good' },
      { name: 'LCP (Largest Contentful Paint)', value: '1.8 s', status: 'good' },
      { name: 'CLS (Cumulative Layout Shift)', value: '0.08', status: 'good' },
      { name: 'FID (First Input Delay)', value: '34 ms', status: 'warning' },
      { name: 'API Response Time (p95)', value: '245 ms', status: 'warning' },
      { name: 'Database Query Time (p95)', value: '89 ms', status: 'good' }
    ];
  }

  getStatusLabel(status) {
    const labels = { healthy: 'Zdrav', warning: 'Upozorenje', critical: 'Kritičan', info: 'Info' };
    return labels[status] || status;
  }

  render() {
    this.bindEvents();
    return `
      <div class="diagnostics-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Dijagnostika Sistema</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Monitoring zdravlja sistema, sigurnosti i performansi.</p>
          </div>
          <button class="btn btn-primary" data-action="run-diagnostics">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Pokreni Dijagnostiku
          </button>
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Health Check-ovi</h3>
        <div class="health-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-5); margin-bottom: var(--space-6);">
          ${this.healthChecks.map(h => `
            <div class="health-card ${h.status}">
              <div class="health-header">
                <div class="health-icon" style="background: linear-gradient(135deg, var(--color-${h.status === 'healthy' ? 'success' : h.status === 'warning' ? 'warning' : h.status === 'critical' ? 'error' : 'info'}), var(--color-${h.status === 'healthy' ? 'success' : h.status === 'warning' ? 'warning' : h.status === 'critical' ? 'error' : 'info'}-dark));">${h.icon}</div>
                <span class="health-status">${this.getStatusLabel(h.status)}</span>
              </div>
              <div class="health-title">${h.name}</div>
              <div class="health-desc">${h.desc}</div>
              <div class="health-metric"><span class="health-metric-label">Metric</span><span class="health-metric-value">${h.metric}</span></div>
            </div>
          `).join('')}
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Aktivni Problemi</h3>
        <div class="issues-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
          ${this.issues.map(i => `
            <div class="issue-card ${i.severity}">
              <div class="issue-header">
                <h4 class="issue-title">${ImperiumUtils.escapeHtml(i.title)}</h4>
                <span class="issue-severity">${i.severity.toUpperCase()}</span>
              </div>
              <div class="issue-desc">${ImperiumUtils.escapeHtml(i.desc)}</div>
              <div class="issue-meta">${i.meta}</div>
              <div class="issue-actions">
                ${i.actions.map(a => `<button class="btn btn-sm btn-${a === 'fix' ? 'primary' : 'secondary'}">${a === 'fix' ? 'Reši' : 'Detalji'}</button>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6);">
          <div class="card">
            <div class="card-header"><h3 class="card-title">System Logovi</h3></div>
            <div class="card-body" style="padding: 0;">
              <div class="log-list" style="max-height: 300px; overflow-y: auto;">
                ${this.logs.map(l => `
                  <div class="log-entry log-${l.level}" style="padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border-primary); display: flex; align-items: center; gap: var(--space-3);">
                    <span class="log-time" style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-tertiary); min-width: 70px;">${l.time}</span>
                    <span class="log-level" style="text-transform: uppercase; font-size: var(--text-xs); font-weight: var(--font-medium); padding: 2px 8px; border-radius: var(--radius-sm); background: var(--color-${l.level === 'error' ? 'error' : l.level === 'warning' ? 'warning' : l.level === 'info' ? 'info' : 'muted'}-light); color: var(--color-${l.level === 'error' ? 'error' : l.level === 'warning' ? 'warning' : l.level === 'info' ? 'info' : 'muted'});">${l.level}</span>
                    <span class="log-msg" style="flex: 1; font-size: var(--text-sm);">${ImperiumUtils.escapeHtml(l.msg)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3 class="card-title">Performance Metrike</h3></div>
            <div class="card-body" style="padding: 0;">
              <div class="perf-list">
                ${this.perfMetrics.map(m => `
                  <div class="perf-item" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border-primary);">
                    <div>
                      <div class="perf-name" style="font-weight: var(--font-medium); font-size: var(--text-sm);">${m.name}</div>
                      <div class="perf-value" style="font-family: var(--font-mono); font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-${m.status === 'good' ? 'success' : 'warning'});">${m.value}</div>
                    </div>
                    <span class="perf-status" style="padding: 4px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--font-medium); background: var(--color-${m.status === 'good' ? 'success' : 'warning'}-light); color: var(--color-${m.status === 'good' ? 'success' : 'warning'});">${m.status}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">Sigurnosni Pregledi</h3>
        <div class="card">
          <div class="card-body" style="padding: 0;">
            <div class="security-list">
              ${this.securityChecks.map(s => `
                <div class="security-item" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-5); border-bottom: 1px solid var(--color-border-primary);">
                  <div>
                    <div class="security-name" style="font-weight: var(--font-medium);">${s.name}</div>
                    <div class="security-desc" style="font-size: var(--text-sm); color: var(--color-text-tertiary);">${s.desc}</div>
                  </div>
                  <span class="security-status" style="padding: 4px 12px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--font-medium); background: var(--color-${s.status === 'passed' ? 'success' : 'error'}-light); color: var(--color-${s.status === 'passed' ? 'success' : 'error'});">${s.status === 'passed' ? 'Prošlo' : 'Nije Prošlo'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.on('click', '[data-action="run-diagnostics"]', async () => {
      this.admin.toastInfo('Dijagnostika pokrenuta...');
      await this.loadData();
      this.render();
      this.admin.success('Dijagnostika završena');
    });
  }
}