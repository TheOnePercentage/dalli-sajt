import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';

export class SearchAnalyticsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.analytics;
    this.period = '30d';
    this.stats = {};
    this.topTerms = [];
    this.failedSearches = [];
    this.opportunities = [];
    this.dailyVolume = [];
  }

  async onEnter() {
    await this.loadData();
    this.render();
  }

  async loadData() {
    try {
      const stats = await this.api.getStats(this.period);
      this.stats = stats.search || { totalSearches: 45680, uniqueTerms: 3240, failedSearches: 1280, conversionRate: 3.2 };
    } catch (error) {
      console.warn('[SearchAnalytics] API failed, falling back to mock data:', error);
      this.stats = { totalSearches: 45680, uniqueTerms: 3240, failedSearches: 1280, conversionRate: 3.2 };
    }
    this.topTerms = this.generateMockTopTerms();
    this.failedSearches = this.generateMockFailedSearches();
    this.opportunities = this.generateMockOpportunities();
    this.dailyVolume = this.generateMockDailyVolume();
  }

  generateMockTopTerms() {
    return [
      { term: 'dukseri', volume: 2340, ctr: 12.5, conversion: 4.2, trend: 'up' },
      { term: 'trenerke', volume: 1980, ctr: 11.8, conversion: 3.8, trend: 'up' },
      { term: 'majice', volume: 1650, ctr: 10.2, conversion: 3.1, trend: 'stable' },
      { term: 'kapuljace', volume: 1320, ctr: 9.5, conversion: 2.8, trend: 'down' },
      { term: 'hoodie', volume: 1180, ctr: 13.2, conversion: 4.5, trend: 'up' },
      { term: 'ćarape', volume: 890, ctr: 8.7, conversion: 2.1, trend: 'stable' },
      { term: 'šalica', volume: 670, ctr: 6.8, conversion: 1.9, trend: 'down' },
      { term: 'majica dugi rukav', volume: 540, ctr: 11.1, conversion: 3.4, trend: 'up' }
    ];

    this.failedSearches = [
      { term: 'ženske dukseri', count: 45, suggestion: 'dukseri' },
      { term: 'trenerke za decu', count: 38, suggestion: 'trenerke' },
      { term: 'majice sa stampom', count: 32, suggestion: 'majice' },
      { term: 'dukseri crne xl', count: 28, suggestion: 'dukseri' },
      { term: 'šalice za kavu', count: 25, suggestion: 'šalica' }
    ];

    this.opportunities = [
      { term: 'dukseri damski', volume: 0, potential: 85, reason: 'High search volume, no products' },
      { term: 'trenerke za devojčice', volume: 0, potential: 72, reason: 'Growing trend, no inventory' },
      { term: 'majice organski pamuk', volume: 12, potential: 68, reason: 'High intent, low competition' }
    ];

    this.dailyVolume = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      searches: Math.floor(Math.random() * 800) + 1200,
      unique: Math.floor(Math.random() * 200) + 300
    }));
  }

  render() {
    this.bindEvents();
    return `
      <div class="search-analytics-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Pretraga Analitika</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Analizirajte šta kupci traže i pronađujte ključne reči sa visokim potencialom.</p>
          </div>
          <select class="input-field select-field" style="width: auto; min-width: 160px;" id="periodSelect" aria-label="Vremenski period">
            <option value="7d" ${this.period === '7d' ? 'selected' : ''}>Poslednjih 7 dana</option>
            <option value="30d" ${this.period === '30d' ? 'selected' : ''}>Poslednjih 30 dana</option>
            <option value="90d" ${this.period === '90d' ? 'selected' : ''}>Poslednjih 90 dana</option>
          </select>
        </div>

        <div class="search-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
          <div class="search-stat-card"><div class="search-stat-value">${ImperiumUtils.formatNumber(this.stats.totalSearches)}</div><div class="search-stat-label">Ukupno Pretraga</div></div>
          <div class="search-stat-card"><div class="search-stat-value">${ImperiumUtils.formatNumber(this.stats.uniqueTerms)}</div><div class="search-stat-label">Jedinstveni Termini</div></div>
          <div class="search-stat-card"><div class="search-stat-value">${ImperiumUtils.formatNumber(this.stats.failedSearches)}</div><div class="search-stat-label">Neuspešne Pretrage</div></div>
          <div class="search-stat-card"><div class="search-stat-value">${this.stats.conversionRate}%</div><div class="search-stat-label">Konverzija iz Pretrage</div></div>
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Top Pretraživani Termini</h3>
        <div class="table-container">
          <table class="table search-terms-table">
            <thead><tr><th scope="col">Termin</th><th scope="col" style="width: 120px;">Pretrage</th><th scope="col" style="width: 100px;">CTR</th><th scope="col" style="width: 100px;">Konverzija</th><th scope="col" style="width: 100px;">Trend</th></tr></thead>
            <tbody>
              ${this.topTerms.map(t => `
                <tr>
                  <td><div class="search-term-cell"><span class="search-term-text">${ImperiumUtils.escapeHtml(t.term)}</span></div></td>
                  <td>${ImperiumUtils.formatNumber(t.volume)}</td>
                  <td>${t.ctr}%</td>
                  <td>${t.conversion}%</td>
                  <td><span class="search-term-trend ${t.trend}">${t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '→'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); margin-top: var(--space-6);">
          <div>
            <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Neuspešne Pretrage (Prilike)</h3>
            <div class="failed-searches">
              ${this.failedSearches.map(f => `
                <div class="failed-search-item">
                  <span class="failed-search-term">"${f.term}"</span>
                  <span class="failed-search-count">${f.count} pretraga</span>
                  <span class="failed-search-suggestion">Predlog: ${f.suggestion}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div>
            <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Ključne Reči sa Potencijalom</h3>
            <div class="opportunities-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-4);">
              ${this.opportunities.map(o => `
                <div class="opportunity-card ${o.potential > 70 ? 'high-potential' : ''}">
                  <div class="opportunity-header"><span class="opportunity-title">${o.term}</span><span class="opportunity-score">${o.potential}/100</span></div>
                  <div class="opportunity-desc">${o.reason}</div>
                  <div class="opportunity-meta"><span>Potencijal: ${o.potential}/100</span><span>Trenutna volum: ${o.volume}</span></div>
                  <div class="opportunity-actions"><button class="btn btn-sm btn-primary" data-action="create-product" data-term="${o.term}">Kreiraj Proizvod</button><button class="btn btn-sm btn-secondary" data-action="add-to-seo" data-term="${o.term}">Dodaj u SEO</button></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">Dnevni Obim Pretraga</h3>
        <div class="search-volume-daily" style="display: flex; flex-direction: column; gap: var(--space-2); max-height: 400px; overflow-y: auto;">
          ${this.dailyVolume.map(d => `
            <div class="daily-volume-item">
              <span class="daily-volume-date">${ImperiumUtils.formatDate(d.date)}</span>
              <div class="daily-volume-bar" style="flex: 1;"><div class="daily-volume-fill" style="width: ${Math.min(100, (d.searches / 2000) * 100)}%"></div></div>
              <span class="daily-volume-count">${ImperiumUtils.formatNumber(d.searches)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.on('change', '#periodSelect', (e) => {
      this.period = e.target.value;
      this.loadData();
    });
  }
}