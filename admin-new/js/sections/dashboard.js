import { Chart } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Component } from '../core/component.js';
import { SectionAPI } from '../services/integration.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('DashboardSection');

export class DashboardSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.dashboard;
    this.period = '30d';
    this.stats = [];
    this.recentOrders = [];
    this.recentActivity = [];
    this.topProducts = [];
    this.chartsData = { revenue: [], orders: [] };
    this.charts = { revenue: null, orders: null };
    this.isLoading = false;
    this.destroyed = false;
    this.resizeObserver = null;
    this.autoRefreshTimer = null;
    this.t = this.admin?.t || (key => key);
  }

  async onEnter() {
    await this.loadData();
    this.render();
    this.initCharts();
    this.startAutoRefresh();
    this.initResizeHandler();
  }

  onLeave() {
    this.stopAutoRefresh();
    this.destroyCharts();
    this.destroyResizeHandler();
  }

  destroyCharts() {
    Object.values(this.charts).forEach(chart => chart?.destroy());
    this.charts = { revenue: null, orders: null };
  }

  initResizeHandler() {
    const revenueCanvas = document.getElementById('revenueChart');
    const ordersCanvas = document.getElementById('ordersChart');

    if (revenueCanvas || ordersCanvas) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.target.id === 'revenueChart' && this.charts.revenue) {
            this.charts.revenue.resize();
          }
          if (entry.target.id === 'ordersChart' && this.charts.orders) {
            this.charts.orders.resize();
          }
        }
      });

      if (revenueCanvas) this.resizeObserver.observe(revenueCanvas.parentElement);
      if (ordersCanvas) this.resizeObserver.observe(ordersCanvas.parentElement);
    }
  }

  destroyResizeHandler() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  startAutoRefresh() {
    this.autoRefreshTimer = setInterval(() => {
      if (!this.destroyed && !this.isLoading) {
        this.loadData(true);
      }
    }, 60000);
  }

  stopAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  async loadData() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.setLoadingState(true);

    try {
      const data = await this.fetchDashboardData();
      this.stats = data.stats;
      this.recentOrders = data.recentOrders;
      this.recentActivity = data.recentActivity;
      this.topProducts = data.topProducts;
      this.chartsData = data.charts;

      if (!this.destroyed) {
        this.render();
        this.updateCharts();
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to load data');
      this.admin.toastContainer.error(this.t('dashboard.error'));
    } finally {
      this.isLoading = false;
    }
  }

  async fetchDashboardData() {
    try {
      const [stats, revenueChart, ordersChart, recentOrders, recentActivity, topProducts] =
        await Promise.all([
          this.api.getStats(this.period),
          this.api.getRevenueChart(this.period),
          this.api.getOrdersChart(this.period),
          this.api.getRecentOrders(10),
          this.api.getRecentActivity(8),
          this.api.getTopProducts(6),
        ]);

      return {
        stats: stats.map(s => ({
          ...s,
          icon: this.icons[s.key] || this.icons.revenue,
          color: s.color,
        })),
        recentOrders,
        recentActivity,
        topProducts,
        charts: { revenue: revenueChart, orders: ordersChart },
      };
    } catch (error) {
      logger.warn({ err: error }, 'API failed, falling back to mock data');
      return this.generateFallbackData();
    }
  }

  generateFallbackData() {
    const periodMs = this.periodToMs(this.period);
    const cutoff = new Date(Date.now() - periodMs);
    return this.generateRealisticData(cutoff);
  }

  periodToMs(period) {
    const map = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    return (map[period] || 30) * 24 * 60 * 60 * 1000;
  }

  generateRealisticData(cutoff) {
    const days = Math.ceil((Date.now() - cutoff.getTime()) / 86400000);

    const revenue = Array.from({ length: days }, (_, i) => {
      const date = new Date(cutoff.getTime() + i * 86400000);
      const base = 45000;
      const variance = Math.sin(i * 0.3) * 15000 + (Math.random() - 0.5) * 10000;
      const weekendBoost = date.getDay() === 0 || date.getDay() === 6 ? 8000 : 0;
      return {
        date: date.toISOString().split('T')[0],
        value: Math.max(0, Math.round(base + variance + weekendBoost)),
      };
    });

    const orders = Array.from({ length: days }, (_, i) => {
      const date = new Date(cutoff.getTime() + i * 86400000);
      const base = 12;
      const variance = Math.sin(i * 0.3) * 5 + (Math.random() - 0.5) * 4;
      const weekendBoost = date.getDay() === 0 || date.getDay() === 6 ? 4 : 0;
      return {
        date: date.toISOString().split('T')[0],
        value: Math.max(0, Math.round(base + variance + weekendBoost)),
      };
    });

    const totalRevenue = revenue.reduce((sum, d) => sum + d.value, 0);
    const totalOrders = orders.reduce((sum, d) => sum + d.value, 0);
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const conversionRate = ((totalOrders / (days * 150)) * 100).toFixed(2);
    const activeCustomers = 1200 + Math.floor(Math.random() * 200);

    return {
      stats: [
        {
          key: 'revenue',
          label: this.t('dashboard.statLabels.revenue'),
          value: totalRevenue,
          trend: +12.5,
          trendLabel: this.t('dashboard.trendVsPrevious'),
          icon: this.icons.revenue,
          color: 'accent',
        },
        {
          key: 'orders',
          label: this.t('dashboard.statLabels.orders'),
          value: totalOrders,
          trend: +8.2,
          trendLabel: this.t('dashboard.trendVsPrevious'),
          icon: this.icons.orders,
          color: 'primary',
        },
        {
          key: 'customers',
          label: this.t('dashboard.statLabels.customers'),
          value: activeCustomers,
          trend: +15.3,
          trendLabel: this.t('dashboard.trendVsPrevious'),
          icon: this.icons.customers,
          color: 'info',
        },
        {
          key: 'conversion',
          label: this.t('dashboard.statLabels.conversion'),
          value: parseFloat(conversionRate),
          suffix: '%',
          trend: +0.4,
          trendLabel: this.t('dashboard.trendVsPrevious'),
          icon: this.icons.conversion,
          color: 'warning',
        },
        {
          key: 'avgOrder',
          label: this.t('dashboard.statLabels.avgOrder'),
          value: avgOrder,
          trend: -2.1,
          trendLabel: this.t('dashboard.trendVsPrevious'),
          icon: this.icons.avgOrder,
          color: 'primary',
        },
        {
          key: 'inventory',
          label: this.t('dashboard.statLabels.inventory'),
          value: 156,
          trend: -3,
          trendLabel: this.t('dashboard.lowStock'),
          icon: this.icons.inventory,
          color: 'danger',
        },
      ],
      recentOrders: this.generateRecentOrders(),
      recentActivity: this.generateRecentActivity(),
      topProducts: this.generateTopProducts(),
      charts: { revenue, orders },
    };
  }

  generateRecentOrders() {
    const statuses = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const customers = [
      { name: 'Marko Petrović', email: 'marko.p@email.com' },
      { name: 'Ana Jovanović', email: 'ana.j@email.com' },
      { name: 'Nikola Đorđević', email: 'nikola.d@email.com' },
      { name: 'Jelena Stanković', email: 'jelena.s@email.com' },
      { name: 'Stefan Milošević', email: 'stefan.m@email.com' },
      { name: 'Milica Radović', email: 'milica.r@email.com' },
      { name: 'Aleksandar Vuković', email: 'aleksandar.v@email.com' },
    ];

    return Array.from({ length: 10 }, (_, i) => {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const date = new Date(Date.now() - Math.random() * 7 * 86400000);
      return {
        id: `ORD-${2024}-${String(1000 + i).padStart(4, '0')}`,
        customer,
        total: Math.floor(Math.random() * 15000) + 3000,
        status,
        date: date.toISOString(),
        items: Math.floor(Math.random() * 4) + 1,
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  generateRecentActivity() {
    const activities = [
      {
        type: 'order',
        icon: this.icons.orders,
        title: 'Nova porudžbina',
        desc: 'ORD-2024-005 od Stefana Miloševića',
        color: 'primary',
      },
      {
        type: 'customer',
        icon: this.icons.customers,
        title: 'Novi kupac registrovan',
        desc: 'Petar Nikolić (petar.n@email.com)',
        color: 'success',
      },
      {
        type: 'review',
        icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        title: 'Nova recenzija',
        desc: '5★ za "Osnovna Majica"',
        color: 'warning',
      },
      {
        type: 'inventory',
        icon: this.icons.inventory,
        title: 'Niska zaliha',
        desc: 'Dugorukava Majica - Crna - L (preostalo: 3)',
        color: 'danger',
      },
      {
        type: 'payment',
        icon: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
        title: 'Plaćanje primljeno',
        desc: 'ORD-2024-001 - 8.950 RSD',
        color: 'success',
      },
      {
        type: 'shipping',
        icon: '<path d="M21 12V7H5v5M16 19h6M8 19H2M21 19V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/><circle cx="9" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>',
        title: 'Pošiljka isporučena',
        desc: 'ORD-2024-003 kurir prelazi',
        color: 'info',
      },
      {
        type: 'stock',
        icon: this.icons.inventory,
        title: 'Zalihe dopunjene',
        desc: 'Muški Duks (Hoodie) +50 komada',
        color: 'primary',
      },
    ];

    return Array.from({ length: 8 }, (_, i) => {
      const act = activities[Math.floor(Math.random() * activities.length)];
      const minutesAgo = Math.floor(Math.random() * 240);
      return {
        ...act,
        time: minutesAgo < 60 ? `${minutesAgo} min pre` : `${Math.floor(minutesAgo / 60)} h pre`,
      };
    });
  }

  generateTopProducts() {
    return [
      { name: 'Osnovna Majica', sales: 127, revenue: 163830, stock: 45 },
      { name: 'Muška Sportska Trenerka', sales: 89, revenue: 310610, stock: 23 },
      { name: 'Ženska Kapuljača Trenerka', sales: 65, revenue: 175050, stock: 18 },
      { name: 'Muški Duks (Hoodie)', sales: 58, revenue: 248820, stock: 12 },
      { name: 'Dugorukava Majica', sales: 42, revenue: 66780, stock: 28 },
      { name: 'Ženska Kapuljača Trenerka', sales: 38, revenue: 148220, stock: 22 },
    ];
  }

  get icons() {
    return {
      revenue:
        '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
      orders:
        '<path d="M21 12V7H5v5M16 19h6M8 19H2M21 19V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/><circle cx="9" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>',
      customers:
        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 1-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      conversion:
        '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="23 6 16 12 23 18"/>',
      avgOrder: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      inventory:
        '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v16"/><path d="M2 12h20"/>',
    };
  }

  render() {
    if (this.destroyed) return;
    const container = document.getElementById('dashboard-section');
    if (!container) return;

    container.innerHTML = `
      <div class="dashboard-grid">
        <div class="dashboard-stats">
          ${this.stats.map(stat => this.renderStatCard(stat)).join('')}
        </div>
        
        <div class="dashboard-charts">
          <div class="chart-card">
            <div class="chart-header">
              <h3>${this.t('dashboard.revenueChartTitle')}</h3>
              <select class="period-select" data-period="${ImperiumUtils.escapeHtml(this.period)}">
                <option value="7d" ${this.period === '7d' ? 'selected' : ''}>${this.t('dashboard.last7Days')}</option>
                <option value="30d" ${this.period === '30d' ? 'selected' : ''}>${this.t('dashboard.last30Days')}</option>
                <option value="90d" ${this.period === '90d' ? 'selected' : ''}>${this.t('dashboard.last90Days')}</option>
                <option value="1y" ${this.period === '1y' ? 'selected' : ''}>${this.t('dashboard.lastYear')}</option>
              </select>
            </div>
            <canvas id="revenueChart" width="800" height="300"></canvas>
          </div>
          
          <div class="chart-card">
            <div class="chart-header">
              <h3>${this.t('dashboard.ordersChartTitle')}</h3>
              <select class="period-select" data-period="${ImperiumUtils.escapeHtml(this.period)}">
                <option value="7d" ${this.period === '7d' ? 'selected' : ''}>${this.t('dashboard.last7Days')}</option>
                <option value="30d" ${this.period === '30d' ? 'selected' : ''}>${this.t('dashboard.last30Days')}</option>
                <option value="90d" ${this.period === '90d' ? 'selected' : ''}>${this.t('dashboard.last90Days')}</option>
                <option value="1y" ${this.period === '1y' ? 'selected' : ''}>${this.t('dashboard.lastYear')}</option>
              </select>
            </div>
            <canvas id="ordersChart" width="800" height="300"></canvas>
          </div>
        </div>

        <div class="dashboard-tables">
          <div class="table-card">
            <div class="table-header">
              <h3>${this.t('dashboard.recentOrders')}</h3>
              <a href="#orders" class="view-all">${this.t('dashboard.recentOrdersViewAll')}</a>
            </div>
            ${this.renderOrdersTable()}
          </div>

          <div class="table-card">
            <div class="table-header">
              <h3>${this.t('dashboard.topProducts')}</h3>
              <a href="#products" class="view-all">${this.t('dashboard.topProductsViewAll')}</a>
            </div>
            ${this.renderTopProducts()}
          </div>
        </div>

        <div class="activity-feed-card">
          <div class="table-header">
            <h3>${this.t('dashboard.recentActivity')}</h3>
          </div>
          ${this.renderActivityFeed()}
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    const periodSelects = container.querySelectorAll('.period-select');
    periodSelects.forEach(select => {
      select.addEventListener('change', e => {
        this.period = e.target.value;
        periodSelects.forEach(s => (s.value = this.period));
        this.loadData();
      });
    });
  }

  setLoadingState(loading) {
    const container = document.getElementById('dashboard-section');
    if (!container) return;

    if (loading) {
      container.classList.add('loading');
    } else {
      container.classList.remove('loading');
    }
  }

  renderStatCard(stat) {
    const trendClass = stat.trend >= 0 ? 'positive' : 'negative';
    const trendIcon =
      stat.trend >= 0
        ? '<polyline points="23 6 16 12 23 18"/>'
        : '<polyline points="23 18 16 12 23 6"/>';
    const formattedValue =
      typeof stat.value === 'number' && stat.value > 999
        ? stat.value.toLocaleString('sr-RS')
        : stat.value;
    const suffix = stat.suffix || '';

    return `
      <div class="stat-card ${stat.color}">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${stat.icon}
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">${ImperiumUtils.escapeHtml(stat.label)}</div>
          <div class="stat-value">${ImperiumUtils.escapeHtml(formattedValue)}${suffix}</div>
          <div class="stat-trend ${trendClass}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${trendIcon}
            </svg>
            <span>${Math.abs(stat.trend)}${stat.trend >= 0 ? '+' : ''}${stat.trend}%</span>
            <span class="trend-label">${ImperiumUtils.escapeHtml(stat.trendLabel)}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderOrdersTable() {
    if (!this.recentOrders.length) {
      return '<div class="empty-state">${this.t("dashboard.recentOrdersEmpty")}</div>';
    }
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">${this.t('dashboard.orderTable.id')}</th>
            <th scope="col">${this.t('dashboard.orderTable.customer')}</th>
            <th scope="col">${this.t('dashboard.orderTable.total')}</th>
            <th scope="col">${this.t('dashboard.orderTable.status')}</th>
            <th scope="col">${this.t('dashboard.orderTable.date')}</th>
            <th scope="col">${this.t('dashboard.orderTable.items')}</th>
          </tr>
        </thead>
        <tbody>
          ${this.recentOrders
            .map(
              order => `
            <tr>
              <td>${ImperiumUtils.escapeHtml(order.id)}</td>
              <td>
                <div class="customer-info">
                  <span class="customer-name">${ImperiumUtils.escapeHtml(order.customer.name)}</span>
                  <span class="customer-email">${ImperiumUtils.escapeHtml(order.customer.email)}</span>
                </div>
              </td>
              <td>${ImperiumUtils.escapeHtml(order.total.toLocaleString('sr-RS'))} RSD</td>
              <td><span class="status-badge status-${ImperiumUtils.escapeHtml(order.status)}">${ImperiumUtils.escapeHtml(order.status)}</span></td>
              <td>${ImperiumUtils.escapeHtml(new Date(order.date).toLocaleDateString('sr-RS'))}</td>
              <td>${ImperiumUtils.escapeHtml(order.items)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  renderTopProducts() {
    if (!this.topProducts.length) {
      return '<div class="empty-state">${this.t("dashboard.topProductsEmpty")}</div>';
    }
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">${this.t('dashboard.productTable.product')}</th>
            <th scope="col">${this.t('dashboard.productTable.sales')}</th>
            <th scope="col">${this.t('dashboard.productTable.revenue')}</th>
            <th scope="col">${this.t('dashboard.productTable.stock')}</th>
          </tr>
        </thead>
        <tbody>
          ${this.topProducts
            .map(
              (product, i) => `
            <tr>
              <td>
                <div class="product-rank">
                  <span class="rank-badge">#${i + 1}</span>
                  <span class="product-name">${ImperiumUtils.escapeHtml(product.name)}</span>
                </div>
              </td>
              <td>${ImperiumUtils.escapeHtml(product.sales)}</td>
              <td>${ImperiumUtils.escapeHtml(product.revenue.toLocaleString('sr-RS'))} RSD</td>
              <td><span class="stock-badge ${product.stock < 20 ? 'low' : ''}">${ImperiumUtils.escapeHtml(product.stock)}</span></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  renderActivityFeed() {
    if (!this.recentActivity.length) {
      return '<div class="empty-state">${this.t("dashboard.recentActivityEmpty")}</div>';
    }
    return `
      <div class="activity-feed">
        ${this.recentActivity
          .map(
            activity => `
          <div class="activity-item">
            <div class="activity-icon ${activity.color}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${activity.icon}
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-title">${ImperiumUtils.escapeHtml(activity.title)}</div>
              <div class="activity-desc">${ImperiumUtils.escapeHtml(activity.desc)}</div>
            </div>
            <div class="activity-time">${ImperiumUtils.escapeHtml(activity.time)}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  initCharts() {
    this.renderRevenueChart();
    this.renderOrdersChart();
  }

  renderRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    if (this.charts.revenue) {
      this.charts.revenue.destroy();
    }

    const labels = this.chartsData.revenue.map(d => d.date);
    const data = this.chartsData.revenue.map(d => d.value);

    this.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: this.t('dashboard.revenueLabel'),
            data,
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            borderWidth: 2,
          },
        ],
      },
      options: this.getChartOptions('Prihod'),
    });
  }

  renderOrdersChart() {
    const ctx = document.getElementById('ordersChart');
    if (!ctx) return;

    if (this.charts.orders) {
      this.charts.orders.destroy();
    }

    const labels = this.chartsData.orders.map(d => d.date);
    const data = this.chartsData.orders.map(d => d.value);

    this.charts.orders = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: this.t('dashboard.ordersLabel'),
            data,
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: this.getChartOptions('Porudžbine'),
    });
  }

  updateCharts() {
    if (this.charts.revenue && this.chartsData.revenue.length) {
      this.charts.revenue.data.labels = this.chartsData.revenue.map(d => d.date);
      this.charts.revenue.data.datasets[0].data = this.chartsData.revenue.map(d => d.value);
      this.charts.revenue.update('none');
    }
    if (this.charts.orders && this.chartsData.orders.length) {
      this.charts.orders.data.labels = this.chartsData.orders.map(d => d.date);
      this.charts.orders.data.datasets[0].data = this.chartsData.orders.map(d => d.value);
      this.charts.orders.update('none');
    }
  }

  getChartOptions(title) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#fff',
          bodyColor: '#e2e8f0',
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: context => {
              const value = context.parsed.y;
              const isRevenue = title === this.t('dashboard.revenueChartTitle');
              return `${title}: ${value.toLocaleString('sr-RS')} ${isRevenue ? 'RSD' : ''}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', maxTicksLimit: 10 },
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { color: '#94a3b8', callback: value => value.toLocaleString('sr-RS') },
          beginAtZero: true,
        },
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
    };
  }
}
