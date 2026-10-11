import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';

export class GrowthSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.analytics;
    this.period = '1y';
    this.cohorts = [];
    this.seasonal = [];
    this.yoy = [];
    this.growthMetrics = [];
    this.lifecycle = [];
  }

  async onEnter() {
    await this.loadData();
    this.render();
  }

  async loadData() {
    try {
      const [stats, conversionFunnel] = await Promise.all([
        this.api.getStats(this.period),
        this.api.getConversionFunnel(this.period)
      ]);
      this.growthMetrics = Array.isArray(stats) ? stats : this.generateMockGrowthMetrics();
      this.lifecycle = Array.isArray(conversionFunnel) ? conversionFunnel : this.generateMockLifecycle();
    } catch (error) {
      console.warn('[Growth] API failed, falling back to mock data:', error);
    }
    if (!Array.isArray(this.growthMetrics) || this.growthMetrics.length === 0) {
      this.growthMetrics = this.generateMockGrowthMetrics();
    }
    this.cohorts = this.generateMockCohorts();
    this.seasonal = this.generateMockSeasonal();
    this.yoy = this.generateMockYoY();
    if (!Array.isArray(this.lifecycle) || this.lifecycle.length === 0) {
      this.lifecycle = this.generateMockLifecycle();
    }
  }

  generateMockCohorts() {
    return [
      { month: '2024-01', size: 245, r1: 42, r2: 38, r3: 35, r6: 28, r12: 22 },
      { month: '2024-02', size: 198, r1: 45, r2: 40, r3: 37, r6: 31, r12: 25 },
      { month: '2024-03', size: 312, r1: 38, r2: 34, r3: 31, r6: 26, r12: 20 },
      { month: '2024-04', size: 267, r1: 41, r2: 37, r3: 33, r6: 27, r12: 21 },
      { month: '2024-05', size: 289, r1: 39, r2: 35, r3: 32, r6: 25, r12: 19 },
      { month: '2024-06', size: 234, r1: 43, r2: 39, r3: 36, r6: 29, r12: 23 },
      { month: '2024-07', size: 198, r1: 40, r2: 36, r3: 32, r6: 26, r12: 20 },
      { month: '2024-08', size: 256, r1: 44, r2: 38, r3: 34, r6: 28, r12: 22 },
      { month: '2024-09', size: 278, r1: 37, r2: 33, r3: 29, r6: 24, r12: 18 },
      { month: '2024-10', size: 301, r1: 42, r2: 38, r3: 35, r6: 29, r12: 23 },
      { month: '2024-11', size: 334, r1: 38, r2: 34, r3: 30, r6: 25, r12: 19 },
      { month: '2024-12', size: 289, r1: 41, r2: 37, r3: 33, r6: 27, r12: 21 }
    ];
  }

  generateMockSeasonal() {
    return [
      { name: 'Zima (Dec-Feb)', revenue: 2850000, orders: 890, customers: 567, growth: 18.5, color: 'info' },
      { name: 'Proleće (Mar-Maj)', revenue: 3200000, orders: 1050, customers: 678, growth: 22.3, color: 'success' },
      { name: 'Leto (Jun-Aug)', revenue: 1950000, orders: 612, customers: 389, growth: -8.2, color: 'warning' },
      { name: 'Jesen (Sep-Nov)', revenue: 3450000, orders: 1134, customers: 723, growth: 25.7, color: 'accent' }
    ];
  }

  generateMockYoY() {
    return [
      { period: '2024 vs 2023', revenue: { current: 11450000, prev: 9680000 }, orders: { current: 3680, prev: 3120 }, customers: { current: 2356, prev: 1980 }, aov: { current: 3111, prev: 3102 } },
      { period: '2023 vs 2022', revenue: { current: 9680000, prev: 8120000 }, orders: { current: 3120, prev: 2680 }, customers: { current: 1980, prev: 1740 }, aov: { current: 3102, prev: 3030 } }
    ];
  }

  generateMockGrowthMetrics() {
    return [
      { label: 'Mesečni rast prihoda', value: 12.5, trend: 5.2, suffix: '%' },
      { label: 'Novi kupci', value: 245, trend: 8.7, suffix: '' },
      { label: 'Ponavljene porudžbine', value: 38.2, trend: 3.4, suffix: '%' },
      { label: 'Churn rate', value: 2.8, trend: -1.2, suffix: '%' }
    ];
  }

  generateMockLifecycle() {
    return [
      { stage: 'Uvod', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', products: 3, revenue: 185000, color: 'info' },
      { stage: 'Rast', icon: '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20V16"/>', products: 8, revenue: 5200000, color: 'success' },
      { stage: 'Zrelost', icon: '<circle cx="12" cy="12" r="10"/>', products: 12, revenue: 4100000, color: 'accent' },
      { stage: 'Opadanje', icon: '<path d="M21 12V7H5v5M16 19h6M8 19H2M21 19V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/><circle cx="9" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>', products: 4, revenue: 450000, color: 'warning' }
    ];
  }

  render() {
    this.bindEvents();
    return `
      <div class="growth-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Rast i Trendi</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Analiza godišnjeg rasta, sezonskih trendova i lifecycle-a proizvoda.</p>
          </div>
          <select class="input-field select-field" style="width: auto; min-width: 160px;" id="periodSelect" aria-label="Vremenski period">
            <option value="30d" ${this.period === '30d' ? 'selected' : ''}>Poslednjih 30 dana</option>
            <option value="90d" ${this.period === '90d' ? 'selected' : ''}>Poslednjih 90 dana</option>
            <option value="1y" ${this.period === '1y' ? 'selected' : ''}>Poslednje godine</option>
          </select>
        </div>

        <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-5); margin-bottom: var(--space-6);">
          ${this.growthMetrics.map(m => `
            <div class="kpi-card" style="--kpi-color: var(--color-primary);">
              <div class="kpi-header"><div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20V16"/></svg></div></div>
              <div class="kpi-value">${ImperiumUtils.formatNumber(m.value)}${m.suffix || ''}</div>
              <div class="kpi-label">${m.label}</div>
              <div class="kpi-trend ${m.trend > 0 ? 'positive' : m.trend < 0 ? 'negative' : 'neutral'}">
                ${m.trend > 0 ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>' : m.trend < 0 ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>'}
                <span>${m.trend > 0 ? '+' : ''}${m.trend}%</span>
              </div>
            </div>
          `).join('')}
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Cohort Analiza (Retencija)</h3>
        <div class="cohort-table" style="overflow-x: auto; margin-bottom: var(--space-6);">
          <table class="table" style="min-width: 800px;">
            <thead>
              <tr>
                <th scope="col" style="position: sticky; left: 0; background: var(--color-bg-card); z-index: 3;">Kohorta</th>
                <th scope="col" style="position: sticky; top: 0; z-index: 2;">Veličina</th>
                <th scope="col" style="position: sticky; top: 0; z-index: 2;">Mesec 1</th>
                <th scope="col" style="position: sticky; top: 0; z-index: 2;">Mesec 2</th>
                <th scope="col" style="position: sticky; top: 0; z-index: 2;">Mesec 3</th>
                <th scope="col" style="position: sticky; top: 0; z-index: 2;">Mesec 6</th>
                <th scope="col" style="position: sticky; top: 0; z-index: 2;">Mesec 12</th>
              </tr>
            </thead>
            <tbody>
              ${this.cohorts.map(c => `
                <tr>
                  <td style="font-weight: var(--font-medium);">${c.month}</td>
                  <td>${c.size}</td>
                  <td class="${c.r1 >= 40 ? 'positive' : c.r1 >= 35 ? 'neutral' : 'negative'}">${c.r1}%</td>
                  <td class="${c.r2 >= 35 ? 'positive' : c.r2 >= 30 ? 'neutral' : 'negative'}">${c.r2}%</td>
                  <td class="${c.r3 >= 30 ? 'positive' : c.r3 >= 25 ? 'neutral' : 'negative'}">${c.r3}%</td>
                  <td class="${c.r6 >= 25 ? 'positive' : c.r6 >= 20 ? 'neutral' : 'negative'}">${c.r6}%</td>
                  <td class="${c.r12 >= 20 ? 'positive' : c.r12 >= 15 ? 'neutral' : 'negative'}">${c.r12}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">Sezonski Trendovi</h3>
        <div class="seasonal-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
          ${this.seasonal.map(s => `
            <div class="season-card">
              <div class="season-header">
                <span class="season-name">${s.name}</span>
                <span class="season-growth ${s.growth > 0 ? 'positive' : 'negative'}">${s.growth > 0 ? '+' : ''}${s.growth}%</span>
              </div>
              <div class="season-stats">
                <div class="season-stat"><span class="season-stat-label">Prihod</span><span class="season-stat-value">${ImperiumUtils.formatCurrency(s.revenue)}</span></div>
                <div class="season-stat"><span class="season-stat-label">Porudžbine</span><span class="season-stat-value">${ImperiumUtils.formatNumber(s.orders)}</span></div>
                <div class="season-stat"><span class="season-stat-label">Kupci</span><span class="season-stat-value">${ImperiumUtils.formatNumber(s.customers)}</span></div>
              </div>
            </div>
          `).join('')}
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">Year-over-Year Comparison</h3>
        <div class="yoy-comparison" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
          ${this.yoy.map(y => `
            <div class="yoy-card">
              <div class="yoy-header">
                <span class="yoy-period">${y.period}</span>
                <span class="yoy-change ${y.revenue.current > y.revenue.prev ? 'positive' : 'negative'}">${y.revenue.current > y.revenue.prev ? '+' : ''}${((y.revenue.current - y.revenue.prev) / y.revenue.prev * 100).toFixed(1)}%</span>
              </div>
              <div class="yoy-metrics">
                <div class="yoy-metric"><span class="yoy-metric-label">Prihod</span><span class="yoy-metric-value">${ImperiumUtils.formatCurrency(y.revenue.current)}</span><span class="yoy-metric-change ${y.revenue.current > y.revenue.prev ? 'positive' : 'negative'}">${y.revenue.current > y.revenue.prev ? '+' : ''}${((y.revenue.current - y.revenue.prev) / y.revenue.prev * 100).toFixed(1)}%</span></div>
                <div class="yoy-metric"><span class="yoy-metric-label">Porudžbine</span><span class="yoy-metric-value">${ImperiumUtils.formatNumber(y.orders.current)}</span><span class="yoy-metric-change ${y.orders.current > y.orders.prev ? 'positive' : 'negative'}">${y.orders.current > y.orders.prev ? '+' : ''}${((y.orders.current - y.orders.prev) / y.orders.prev * 100).toFixed(1)}%</span></div>
                <div class="yoy-metric"><span class="yoy-metric-label">Kupci</span><span class="yoy-metric-value">${ImperiumUtils.formatNumber(y.customers.current)}</span><span class="yoy-metric-change ${y.customers.current > y.customers.prev ? 'positive' : 'negative'}">${y.customers.current > y.customers.prev ? '+' : ''}${((y.customers.current - y.customers.prev) / y.customers.prev * 100).toFixed(1)}%</span></div>
                <div class="yoy-metric"><span class="yoy-metric-label">AOV</span><span class="yoy-metric-value">${ImperiumUtils.formatCurrency(y.aov.current)}</span><span class="yoy-metric-change ${y.aov.current > y.aov.prev ? 'positive' : 'negative'}">${y.aov.current > y.aov.prev ? '+' : ''}${((y.aov.current - y.aov.prev) / y.aov.prev * 100).toFixed(1)}%</span></div>
              </div>
            </div>
          `).join('')}
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">Product Lifecycle</h3>
        <div class="lifecycle-stages" style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${this.lifecycle.map(l => `
            <div class="lifecycle-stage ${l.stage.toLowerCase()}">
              <div class="lifecycle-icon" style="background: var(--color-${l.color}-100); color: var(--color-${l.color}-700);">${l.icon}</div>
              <div class="lifecycle-content">
                <div class="lifecycle-name">${l.stage}</div>
                <div class="lifecycle-products">${l.products} proizvoda</div>
                <div class="lifecycle-revenue">${ImperiumUtils.formatCurrency(l.revenue)}</div>
              </div>
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
      this.render();
    });
  }
}