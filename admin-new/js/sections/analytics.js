// analytics dashboard - e-commerce metrics display with charts
// Step 2: Dashboard UI Design with 8 key metrics + Canvas visualizations

import { INITIAL_METRICS_STATE, calculateAllMetrics } from '../analytics/metrics-definitions.js';
import { Component } from '../core/component.js';
import { SectionAPI } from '../services/integration.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class AnalyticsSection extends Component {
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
      adSpend: 0,
    };
    this.filterDateFrom = '';
    this.filterDateTo = '';
  }

  async onEnter() {
    await this.loadData();
    await this.calculateMetrics();
    this.render();
    this.initCharts();
  }

  async loadProducts() {
    if (Array.isArray(this.data.products) && this.data.products.length) return;
    try {
      const productsModule = await import('../../../data/products.json');
      this.data.products = productsModule.default || productsModule.products || [];
    } catch (e) {
      this.data.products = [];
    }
  }

  async loadData() {
    await this.loadProducts();
    try {
      const [stats, revenueChart, ordersChart, trafficSources, deviceBreakdown, conversionFunnel] =
        await Promise.all([
          this.api.getStats(this.period),
          this.api.getRevenueChart(this.period),
          this.api.getOrdersChart(this.period),
          this.api.getTrafficSources(this.period),
          this.api.getDeviceBreakdown(this.period),
          this.api.getConversionFunnel(this.period),
        ]);

      // Real, persisted data from the analytics API. Never fabricated.
      this.metrics = stats;
      this.data.orders = Array.isArray(stats.orders) ? stats.orders : [];
      this.data.customers = Array.isArray(stats.customers) ? stats.customers : [];
      this.data.sessions = stats.sessions || 0;
      this.data.adSpend = stats.adSpend || 0;
      this.data.marketingBudget = stats.marketingBudget || stats.adSpend || 0;
      this.chartData = {
        revenue: revenueChart,
        orders: ordersChart,
        trafficSources,
        deviceBreakdown,
        conversionFunnel,
      };
      this.apiSourced = true;
    } catch (error) {
      console.warn('[Analytics] API failed, falling back to local data:', error);
      this.apiSourced = false;
      await this.loadFallbackData();
    }
  }

  async loadFallbackData() {
    // Orders/customers have no bundled source; keep arrays available for metrics.
    this.data.orders = this.data.orders || [];
    this.data.customers = this.data.customers || [];

    await this.loadProducts();

    // Only use values explicitly stored by the owner; never invent numbers.
    const storedSessions = localStorage.getItem('dalli_sessions');
    this.data.sessions = storedSessions ? parseInt(storedSessions, 10) : 0;

    const storedBudget = localStorage.getItem('dalli_marketing_budget');
    this.data.marketingBudget = storedBudget ? parseInt(storedBudget, 10) : 0;

    const storedAdSpend = localStorage.getItem('dalli_adspend');
    this.data.adSpend = storedAdSpend ? parseInt(storedAdSpend, 10) : 0;
  }

  async calculateMetrics() {
    this.metrics = calculateAllMetrics({
      orders: this.data.orders,
      customers: this.data.customers,
      products: this.data.products,
      marketingBudget: this.data.marketingBudget,
      sessions: this.data.sessions,
      adSpend: this.data.adSpend,
    });

    // Prepare chart data based on orders
    this.prepareChartData();

    // Store calculated metrics in localStorage for persistence
    localStorage.setItem(
      'dalli_metrics',
      JSON.stringify({
        ...this.metrics,
        lastCalculated: new Date().toISOString(),
        period: this.period,
      })
    );
  }

  prepareChartData() {
    // Sort orders by date
    const sortedOrders = [...this.data.orders].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Generate daily revenue data for the period
    const now = new Date();
    const startDate = now;
    const days = this.period === '7d' ? 7 : this.period === '30d' ? 30 : 90;
    const endDate = new Date(now.getTime() + days * 86400000);

    // Create date range
    const dates = [];
    const revenueData = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      // Find orders for this date
      const dayOrders = sortedOrders.filter(o => {
        const orderDate = new Date(o.date);
        return (
          orderDate.getFullYear() === currentDate.getFullYear() &&
          orderDate.getMonth() === currentDate.getMonth() &&
          orderDate.getDate() === currentDate.getDate()
        );
      });
      revenueData.push({
        date: new Date(currentDate),
        value: dayOrders.reduce((sum, o) => sum + o.total, 0),
      });
      currentDate = new Date(currentDate.getTime() + 86400000);
    }

    // Store chart data in localStorage for persistence
    localStorage.setItem(
      'dalli_chart_data',
      JSON.stringify({
        dates: dates.map(d => d.toISOString()),
        revenue: revenueData.map(r => r.value),
        period: this.period,
      })
    );

    this.chartsData = {
      revenue: revenueData,
      dates,
    };

    // Prepare orders by status data
    const statusCounts = {
      new: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    sortedOrders.forEach(order => {
      if (Object.prototype.hasOwnProperty.call(statusCounts, order.status)) {
        statusCounts[order.status]++;
      }
    });

    this.chartsData.ordersByStatus = statusCounts;
  }

  // Period filter change handler
  async onPeriodChange(period) {
    this.period = period;
    await this.loadData();
    await this.calculateMetrics();
    this.render();
    this.initCharts();
  }

  // Metric card click handler (for drill-down)
  onMetricClick(metricName) {
    this.admin.toastInfo(`Detail: ${metricName}`);
  }

  render() {
    return `
      <div class="analytics-section">
        <!-- Header -->
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Analitika</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Detaljna analitika e-commerce performansi</p>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <select class="input-field select-field" style="min-width: 140px;" aria-label="Vremenski period" data-period>
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

        <!-- Charts Section -->
        <div class="charts-section" style="margin-top: var(--space-5); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-bg-tertiary);">
          <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3);">
            <h3 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Visualizacija</h3>
            <select class="input-field select-field" style="min-width: 140px;" aria-label="Vremenski period za chart" data-period>
              <option value="7d" ${this.period === '7d' ? 'selected' : ''}>Poslednjih 7 dana</option>
              <option value="30d" ${this.period === '30d' ? 'selected' : ''}>Poslednjih 30 dana</option>
              <option value="90d" ${this.period === '90d' ? 'selected' : ''}>Poslednjih 90 dana</option>
            </select>
          </div>

          <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-4);">
            <!-- Revenue Trend Chart -->
            <div class="chart-card" style="background: var(--color-surface); border: 1px solid var(--color-border-primary);">
              <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: var(--space-3);">
                <h4 style="font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-text-primary);">Prihod po danu</h4>
                <small style="color: var(--color-text-tertiary); font-size: var(--text-xs);">@${new Date().getFullYear()}</small>
              </div>
              <div class="card-body" style="height: 250px;">
                <canvas id="revenueTrendChart" width="400" height="250" style="width: 100%; height: 100%;"></canvas>
              </div>
            </div>

            <!-- Orders by Status Chart -->
            <div class="chart-card" style="background: var(--color-surface); border: 1px solid var(--color-border-primary);">
              <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: var(--space-3);">
                <h4 style="font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-text-primary);">Porudžbine po statusu</h4>
                <small style="color: var(--color-text-tertiary); font-size: var(--text-xs);">Ukupno: ${this.data.orders.length}</small>
              </div>
              <div class="card-body" style="height: 250px;">
                <canvas id="ordersStatusChart" width="400" height="250" style="width: 100%; height: 100%;"></canvas>
              </div>
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
    this.on('change', 'select[data-period]', e => {
      const period = e.target.value;
      this.onPeriodChange(period);
    });

    this.on('click', '[data-action="refresh"]', async () => {
      await this.calculateMetrics();
      this.admin.success('Metrike uspešno izračunate');
    });
  }

  initCharts() {
    // Revenue trend chart
    const revenueCanvas = document.getElementById('revenueTrendChart');
    if (!revenueCanvas) return;

    const revenueData = this.chartsData?.revenue || [];
    if (!revenueData?.length) {
      revenueCanvas.parentElement.parentElement.parentElement.style.display = 'none';
      return;
    }

    // Destroy existing chart if present
    if (this.charts.revenue) {
      this.charts.revenue.destroy();
    }

    // Revenue trend chart using custom Canvas 2D drawing
    const revenueData2 = this.chartsData?.revenue || [];
    const revenueChartContainer = revenueCanvas.parentElement.parentElement.parentElement;
    if (!revenueData2?.length) {
      revenueChartContainer.style.display = 'none';
      return;
    }

    revenueChartContainer.style.display = 'block';

    const ctx = revenueCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = revenueCanvas.getBoundingClientRect();
    revenueCanvas.width = rect.width * dpr;
    revenueCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    revenueCanvas.style.width = rect.width + 'px';
    revenueCanvas.style.height = rect.height + 'px';

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = revenueData.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Grid lines (horizontal)
    ctx.strokeStyle = 'var(--color-border-primary)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = 'var(--color-text-tertiary)';
    ctx.font = '11px var(--font-mono)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const val = maxValue - (i / 4) * range;
      const y = padding.top + (i / 4) * chartHeight;
      ctx.fillText(ImperiumUtils.formatNumber(val), padding.left - 10, y);
    }

    // Plot line
    ctx.strokeStyle = 'var(--color-primary)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const dataLength = revenueData.length;
    const xStep = chartWidth / (dataLength - 1 || 1);

    for (let i = 0; i < dataLength; i++) {
      const x = padding.left + i * xStep;
      const y =
        padding.top + chartHeight - ((revenueData[i].value - minValue) / range) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // X-axis labels (dates)
    ctx.fillStyle = 'var(--color-text-tertiary)';
    ctx.font = '11px var(--font-sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelStep = Math.ceil(dataLength / 6);
    for (let i = 0; i < dataLength; i += labelStep) {
      const x = padding.left + i * xStep;
      const date = new Date(revenueData[i].date);
      const label = date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' });
      ctx.fillText(label, x, height - padding.bottom + 8);
    }
  }

  onLeave() {
    Object.values(this.charts).forEach(chart => chart?.destroy());
  }
}
