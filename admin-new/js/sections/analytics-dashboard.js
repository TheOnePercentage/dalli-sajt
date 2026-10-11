// analytics dashboard - e-commerce metrics display
// Step 2: Dashboard UI Design

import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';
import {
  METRICS,
  DATA_SOURCES,
  INITIAL_METRICS_STATE,
  calculateAllMetrics
} from '../analytics/metrics-definitions.js';

export class AnalyticsDashboardSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.analytics;
    this.period = '30d'; // 7d, 30d, 90d
    this.metrics = { ...INITIAL_METRICS_STATE };
    this.data = {
      orders: [],
      customers: [],
      products: [],
      sessions: 0,
      marketingBudget: 0,
      adSpend: 0
    };
    this.filterDateFrom = '';
    this.filterDateTo = '';
  }

  async onEnter() {
    await this.loadData();
    if (!this.chartData) {
      await this.calculateMetrics();
    }
    this.render();
  }

  async loadData() {
    try {
      const [stats, revenueChart, ordersChart, trafficSources, deviceBreakdown, conversionFunnel] = await Promise.all([
        this.api.getStats(this.period),
        this.api.getRevenueChart(this.period),
        this.api.getOrdersChart(this.period),
        this.api.getTrafficSources(this.period),
        this.api.getDeviceBreakdown(this.period),
        this.api.getConversionFunnel(this.period)
      ]);

      this.metrics = stats;
      this.chartData = { revenue: revenueChart, orders: ordersChart, trafficSources, deviceBreakdown, conversionFunnel };
    } catch (error) {
      console.warn('[AnalyticsDashboard] API failed, falling back to local data:', error);
      await this.loadFallbackData();
    }
  }

  async loadFallbackData() {
    // Load orders data
    try {
      const ordersModule = await import('../../scripts/generate-orders.js');
      this.data.orders = ordersModule.default || ordersModule.orders || [];
    } catch (e) {
      console.warn('Could not load orders, using empty array');
      this.data.orders = [];
    }

    // Load customers data
    try {
      const customersModule = await import('../../scripts/generate-customers.js');
      this.data.customers = customersModule.default || customersModule.customers || [];
    } catch (e) {
      console.warn('Could not load customers, using empty array');
      this.data.customers = [];
    }

    // Load products data
    try {
      const productsModule = await import('../../data/products.json');
      this.data.products = productsModule.default || productsModule.products || [];
    } catch (e) {
      console.warn('Could not load products, using empty array');
      this.data.products = [];
    }

    // Load sessions from localStorage or set default
    const storedSessions = localStorage.getItem('dalli_sessions');
    this.data.sessions = storedSessions ? parseInt(storedSessions) : 1000;

    // Marketing budget from localStorage
    const storedBudget = localStorage.getItem('dalli_marketing_budget');
    this.data.marketingBudget = storedBudget ? parseInt(storedBudget) : 50000;

    // Ad spend from localStorage
    const storedAdSpend = localStorage.getItem('dalli_ad_spend');
    this.data.adSpend = storedAdSpend ? parseInt(storedAdSpend) : 10000;
  }

  async calculateMetrics() {
    this.metrics = calculateAllMetrics({
      orders: this.data.orders,
      customers: this.data.customers,
      products: this.data.products,
      marketingBudget: this.data.marketingBudget,
      sessions: this.data.sessions,
      adSpend: this.data.adSpend
    });

    // Store calculated metrics in localStorage for persistence
    localStorage.setItem('dalli_metrics', JSON.stringify({
      ...this.metrics,
      lastCalculated: new Date().toISOString()
    }));
  }

  // Period filter change handler
  onPeriodChange(period) {
    this.period = period;
    // Recalculate metrics based on filtered date range
    this.calculateMetrics();
    this.render();
  }

  // Metric card click handler (for drill-down)
  onMetricClick(metricName) {
    this.admin.toastInfo(`Detail: ${metricName}`);
  }

  render() {
    this.bindEvents();
    const currency = 'RSD';

    return `
      <div class="analytics-dashboard">
        <!-- Header -->
        <div class="dashboard-header" style="margin-bottom: var(--space-5);">
          <div class="header-left">
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Analitika</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">E-commerce metrics | DALLI prodaja</p>
          </div>
          <div class="header-right" style="display: flex; align-items: center; gap: var(--space-3);">
            <select class="input-field select-field" style="min-width: 140px;" aria-label="Vremenski period">
              <option value="7d" ${this.period === '7d' ? 'selected' : ''}>Poslednjih 7 dana</option>
              <option value="30d" ${this.period === '30d' ? 'selected' : ''}>Poslednjih 30 dana</option>
              <option value="90d" ${this.period === '90d' ? 'selected' : ''}>Poslednjih 90 dana</option>
            </select>
            <button class="btn btn-secondary btn-sm" data-action="refresh">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Ažuriraj
            </button>
            <button class="btn btn-outline btn-sm" data-action="settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Postavke
            </button>
          </div>
        </div>

        <!-- Metric Cards Grid -->
        <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-5);">
          <!-- REVENUE Card -->
          <div class="metric-card revenue-card" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)); border: 1px solid var(--color-primary-light);">
            <div class="metric-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <div style="font-size: var(--text-lg); font-weight: var(--font-semibold); color: white;">${ImperiumUtils.formatCurrency(this.metrics.REVENUE)}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">@${new Date().getFullYear()}</div>
            </div>
            <div class="metric-body">
              <div style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Ukupni primanjavljeni prihod</div>
              <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
                <span style="color: var(--color-text-tertiary);">Period: ${this.period === '7d' ? '7 dana' : this.period === '30d' ? '30 dana' : '90 dana'}</span>
                <span style="color: var(--color-text-tertiary);" data-tooltip="Prirodni datum">Od: ${ImperiumUtils.formatDate(new Date(Date.now() - 30 * 86400000))}</span>
              </div>
            </div>
            <div class="metric-footer" style="padding-top: var(--space-2); border-top: 1px solid var(--color-primary-light);">
              <button class="btn btn-link text-primary btn-block btn-sm" style="width: 100%; padding: var(--space-2) var(--space-3); background: transparent; text-align: left; font-size: var(--text-sm);">
                Detail ▼
              </button>
            </div>
          </div>

          <!-- CONVERSION RATE Card -->
          <div class="metric-card conversion-card" style="background: linear-gradient(135deg, var(--color-success), var(--color-success-dark)); border: 1px solid var(--color-success-light);">
            <div class="metric-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <div style="font-size: var(--text-lg); font-weight: var(--font-semibold); color: white;">${this.metrics.CONVERSION_RATE}%</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">@${new Date().getFullYear()}</div>
            </div>
            <div class="metric-body">
              <div style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Postotak posetilaca koji naprave kupovinu</div>
              <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
                <span style="color: var(--color-text-tertiary);">Ukupnih sesija: ${this.data.sessions}</span>
                <span style="color: var(--color-text-tertiary);">Izvršene porudžbine: ${this.data.orders.length}</span>
              </div>
            </div>
            <div class="metric-footer" style="padding-top: var(--space-2); border-top: 1px solid var(--color-success-light);">
              <button class="btn btn-link text-primary btn-block btn-sm" style="width: 100%; padding: var(--space-2) var(--space-3); background: transparent; text-align: left; font-size: var(--text-sm);">
                Detail ▼
              </button>
            </div>
          </div>

          <!-- AOV Card -->
          <div class="metric-card aov-card" style="background: linear-gradient(135deg, var(--color-info), var(--color-info-dark)); border: 1px solid var(--color-info-light);">
            <div class="metric-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <div style="font-size: var(--text-lg); font-weight: var(--font-semibold); color: white;">${ImperiumUtils.formatCurrency(this.metrics.AOV)}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">@${new Date().getFullYear()}</div>
            </div>
            <div class="metric-body">
              <div style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Prosek po jednoj porudžbini</div>
              <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
                <span style="color: var(--color-text-tertiary);">Ukupno porudžbina: ${this.data.orders.length}</span>
                <span style="color: var(--color-text-tertiary);">Ukupni prenos: ${ImperiumUtils.formatCurrency(this.metrics.REVENUE)}</span>
              </div>
            </div>
            <div class="metric-footer" style="padding-top: var(--space-2); border-top: 1px solid var(--color-info-light);">
              <button class="btn btn-link text-primary btn-block btn-sm" style="width: 100%; padding: var(--space-2) var(--space-3); background: transparent; text-align: left; font-size: var(--text-sm);">
                Detail ▼
              </button>
            </div>
          </div>

          <!-- REPEAT CUSTOMER RATE Card -->
          <div class="metric-card repeat-card" style="background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dark)); border: 1px solid var(--color-accent-light);">
            <div class="metric-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <div style="font-size: var(--text-lg); font-weight: var(--font-semibold); color: white;">${this.metrics.REPEAT_CUSTOMER_RATE}%</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">@${new Date().getFullYear()}</div>
            </div>
            <div class="metric-body">
              <div style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Postotak kupaca sa više od jedne porudžbine</div>
              <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
                <span style="color: var(--color-text-tertiary);">Ukupno kupaca: ${this.data.customers.length}</span>
                <span style="color: var(--color-text-tertiary);">Vraćajućih kupaca: ${this.data.customers.filter(c => c.orderCount > 1).length}</span>
              </div>
            </div>
            <div class="metric-footer" style="padding-top: var(--space-2); border-top: 1px solid var(--color-accent-light);">
              <button class="btn btn-link text-primary btn-block btn-sm" style="width: 100%; padding: var(--space-2) var(--space-3); background: transparent; text-align: left; font-size: var(--text-sm);">
                Detail ▼
              </button>
            </div>
          </div>

          <!-- PROFIT MARGIN Card -->
          <div class="metric-card margin-card" style="background: linear-gradient(135deg, var(--color-warning), var(--color-warning-dark)); border: 1px solid var(--color-warning-light);">
            <div class="metric-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <div style="font-size: var(--text-lg); font-weight: var(--font-semibold); color: white;">${this.metrics.PROFIT_MARGIN}%</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">@${new Date().getFullYear()}</div>
            </div>
            <div class="metric-body">
              <div style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Brutni marž iznos</div>
              <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
                <span style="color: var(--color-text-tertiary);">Revenue: ${ImperiumUtils.formatCurrency(this.metrics.REVENUE)}</span>
                <span style="color: var(--color-text-tertiary);">COGS estimate: 40%</span>
              </div>
            </div>
            <div class="metric-footer" style="padding-top: var(--space-2); border-top: 1px solid var(--color-warning-light);">
              <button class="btn btn-link text-primary btn-block btn-sm" style="width: 100%; padding: var(--space-2) var(--space-3); background: transparent; text-align: left; font-size: var(--text-sm);">
                Detail ▼
              </button>
            </div>
          </div>

          <!-- CAC Card -->
          <div class="metric-card cac-card" style="background: linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark)); border: 1px solid var(--color-secondary-light);">
            <div class="metric-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <div style="font-size: var(--text-lg); font-weight: var(--font-semibold); color: white;">${ImperiumUtils.formatCurrency(this.metrics.CAC)}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">@${new Date().getFullYear()}</div>
            </div>
            <div class="metric-body">
              <div style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Prosecni trošak akvizicije novog kupca</div>
              <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
                <span style="color: var(--color-text-tertiary);">Marketing budžet: ${ImperiumUtils.formatCurrency(this.data.marketingBudget)}</span>
                <span style="color: var(--color-text-tertiary);">Aktivni kupci: ${this.data.customers.filter(c => c.orderCount > 0).length}</span>
              </div>
            </div>
            <div class="metric-footer" style="padding-top: var(--space-2); border-top: 1px solid var(--color-secondary-light);">
              <button class="btn btn-link text-primary btn-block btn-sm" style="width: 100%; padding: var(--space-2) var(--space-3); background: transparent; text-align: left; font-size: var(--text-sm);">
                Detail ▼
              </button>
            </div>
          </div>

          <!-- ROAS Card -->
          <div class="metric-card roas-card" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)); border: 1px solid var(--color-primary-light);">
            <div class="metric-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <div style="font-size: var(--text-lg); font-weight: var(--font-semibold); color: white;">${this.metrics.ROAS > 1 ? `${this.metrics.ROAS}x` : `${this.metrics.ROAS} (below 1x)`}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">@${new Date().getFullYear()}</div>
            </div>
            <div class="metric-body">
              <div style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Izdeljeni ingreso po jedinici marketing troška</div>
              <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
                <span style="color: var(--color-text-tertiary);">Prihod: ${ImperiumUtils.formatCurrency(this.metrics.REVENUE)}</span>
                <span style="color: var(--color-text-tertiary);">Reklama trošak: ${ImperiumUtils.formatCurrency(this.data.adSpend)}</span>
              </div>
            </div>
            <div class="metric-footer" style="padding-top: var(--space-2); border-top: 1px solid var(--color-primary-light);">
              <button class="btn btn-link text-primary btn-block btn-sm" style="width: 100%; padding: var(--space-2) var(--space-3); background: transparent; text-align: left; font-size: var(--text-sm);">
                Detail ▼
              </button>
            </div>
          </div>

          <!-- LTV Card -->
          <div class="metric-card ltv-card" style="background: linear-gradient(135deg, var(--color-success), var(--color-success-dark)); border: 1px solid var(--color-success-light);">
            <div class="metric-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <div style="font-size: var(--text-lg); font-weight: var(--font-semibold); color: white;">${ImperiumUtils.formatCurrency(this.metrics.LTV)}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">@${new Date().getFullYear()}</div>
            </div>
            <div class="metric-body">
              <div style="font-size: var(--text-sm); color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Prosecni LTV po životnom ciklusu kupca</div>
              <div style="display: flex; justify-content: space-between; font-size: var(--text-sm);">
                <span style="color: var(--color-text-tertiary);">Ukupni prihod: ${ImperiumUtils.formatCurrency(this.data.customers.reduce((sum, c) => sum + c.totalSpent, 0))}</span>
                <span style="color: var(--color-text-tertiary);">Aktivni kupci: ${this.data.customers.filter(c => c.orderCount > 0).length}</span>
              </div>
            </div>
            <div class="metric-footer" style="padding-top: var(--space-2); border-top: 1px solid var(--color-success-light);">
              <button class="btn btn-link text-primary btn-block btn-sm" style="width: 100%; padding: var(--space-2) var(--space-3); background: transparent; text-align: left; font-size: var(--text-sm);">
                Detail ▼
              </button>
            </div>
          </div>
        </div>

        <!-- Supporting Info -->
        <div class="supporting-info" style="margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid var(--color-bg-tertiary);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); font-size: var(--text-sm); color: var(--color-text-tertiary);">
            <div>
              <strong>Ukupni podaci:</strong> ${this.data.orders.length} porudžbina, ${this.data.customers.length} kupaca, ${this.data.products.length} proizvoda
            </div>
            <div>
              <strong>Vremenski period:</strong> ${this.period === '7d' ? '7 dana' : this.period === '30d' ? '30 dana' : '90 dana'}
            </div>
            <div>
              <strong>Podaci se ažuriraju:</strong> ${new Date().toLocaleDateString('sr-RS', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.on('change', 'select[data-period]', (e) => {
      const period = e.target.value;
      this.onPeriodChange(period);
    });

    this.on('click', '[data-action="refresh"]', async () => {
      await this.loadData();
      this.render();
      this.admin.success('Podaci uspešno osveženi');
    });

    this.on('click', '[data-action="settings"]', () => {
      this.admin.toastInfo('Postavke analytics');
    });
  }

  onLeave() {
    Object.values(this.charts || {}).forEach(chart => chart?.destroy());
  }
}