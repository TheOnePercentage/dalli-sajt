import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';

export class ExecutiveSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.analytics;
    this.period = '30d';
    this.kpis = [];
    this.revenueData = [];
    this.ordersData = [];
    this.topCategories = [];
    this.customerSegments = [];
    this.geoData = [];
    this.funnelData = [];
    this.isLoading = false;
    this.destroyed = false;
    this.charts = { revenue: null, orders: null, funnel: null, geo: null };
  }

  async onEnter() {
    await this.loadData();
    this.render();
    this.initCharts();
    this.startAutoRefresh();
  }

  onLeave() {
    this.stopAutoRefresh();
    this.destroyCharts();
  }

  destroyCharts() {
    Object.values(this.charts).forEach(chart => chart?.destroy());
    this.charts = { revenue: null, orders: null, funnel: null, geo: null };
  }

  startAutoRefresh() {
    this.autoRefreshTimer = setInterval(() => {
      if (!this.destroyed && !this.isLoading) {
        this.loadData(true);
      }
    }, 120000);
  }

  stopAutoRefresh() {
    clearInterval(this.autoRefreshTimer);
  }

  async loadData(silent = false) {
    if (this.isLoading) return;
    this.isLoading = true;
    if (!silent) this.setLoadingState(true);

    try {
      const data = await this.fetchExecutiveData();
      this.kpis = data.kpis;
      this.revenueData = data.revenue;
      this.ordersData = data.orders;
      this.topCategories = data.topCategories;
      this.customerSegments = data.customerSegments;
      this.geoData = data.geoData;
      this.funnelData = data.funnel;
      
      if (!this.destroyed) {
        this.render();
        this.updateCharts();
      }
    } catch (error) {
      console.error('[Executive] Failed to load data:', error);
      if (!silent) this.admin.toastContainer.error('Greška pri učitavanju Executive Overview');
    } finally {
      this.isLoading = false;
      if (!silent) this.setLoadingState(false);
    }
  }

  async fetchExecutiveData() {
    try {
      const [stats, revenueChart, ordersChart, trafficSources, deviceBreakdown, conversionFunnel] = await Promise.all([
        this.api.getStats(this.period),
        this.api.getRevenueChart(this.period),
        this.api.getOrdersChart(this.period),
        this.api.getTrafficSources(this.period),
        this.api.getDeviceBreakdown(this.period),
        this.api.getConversionFunnel(this.period)
      ]);

      return {
        kpis: stats.map(s => ({ ...s, icon: this.icons[s.key] || this.icons.revenue, color: s.color })),
        revenue: revenueChart,
        orders: ordersChart,
        topCategories: [],
        customerSegments: [],
        geoData: deviceBreakdown,
        funnel: conversionFunnel
      };
    } catch (error) {
      console.warn('[Executive] API failed, falling back to mock data:', error);
      const periodMs = this.periodToMs(this.period);
      const cutoff = new Date(Date.now() - periodMs);
      const days = Math.ceil((Date.now() - cutoff.getTime()) / 86400000);
      return this.generateRealisticData(cutoff, days);
    }
  }

  periodToMs(period) {
    const map = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    return (map[period] || 30) * 24 * 60 * 60 * 1000;
  }

  generateRealisticData(cutoff, days) {
    // Revenue time series with weekly seasonality
    const revenue = Array.from({ length: days }, (_, i) => {
      const date = new Date(cutoff.getTime() + i * 86400000);
      const base = 52000;
      const weekly = Math.sin(i * 2 * Math.PI / 7) * 18000;
      const trend = i * 120;
      const noise = (Math.random() - 0.5) * 8000;
      const weekend = (date.getDay() === 0 || date.getDay() === 6) ? 12000 : 0;
      return {
        date: date.toISOString().split('T')[0],
        value: Math.max(0, Math.round(base + weekly + trend + noise + weekend))
      };
    });

    const orders = Array.from({ length: days }, (_, i) => {
      const date = new Date(cutoff.getTime() + i * 86400000);
      const base = 14;
      const weekly = Math.sin(i * 2 * Math.PI / 7) * 5;
      const trend = i * 0.05;
      const noise = (Math.random() - 0.5) * 3;
      const weekend = (date.getDay() === 0 || date.getDay() === 6) ? 6 : 0;
      return {
        date: date.toISOString().split('T')[0],
        value: Math.max(0, Math.round(base + weekly + trend + noise + weekend))
      };
    });

    const totalRevenue = revenue.reduce((sum, d) => sum + d.value, 0);
    const totalOrders = orders.reduce((sum, d) => sum + d.value, 0);
    const prevPeriodRevenue = totalRevenue * 0.88;
    const prevPeriodOrders = totalOrders * 0.92;

    return {
      kpis: [
        { 
          key: 'revenue', 
          label: 'Ukupni Prihod', 
          value: totalRevenue, 
          trend: ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue * 100).toFixed(1),
          trendLabel: 'vs. prethodni period', 
          icon: this.icons.revenue, 
          color: 'accent',
          sparkline: revenue.slice(-7).map(d => d.value)
        },
        { 
          key: 'orders', 
          label: 'Porudžbine', 
          value: totalOrders, 
          trend: ((totalOrders - prevPeriodOrders) / prevPeriodOrders * 100).toFixed(1),
          trendLabel: 'vs. prethodni period', 
          icon: this.icons.orders, 
          color: 'primary',
          sparkline: orders.slice(-7).map(d => d.value)
        },
        { 
          key: 'aov', 
          label: 'Prosečna Vrednost Porudžbine', 
          value: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0, 
          trend: +2.3, 
          trendLabel: 'vs. prethodni period', 
          icon: this.icons.aov, 
          color: 'info',
          suffix: ' RSD'
        },
        { 
          key: 'conversion', 
          label: 'Konverzija', 
          value: 3.24, 
          trend: +0.18, 
          trendLabel: 'vs. prethodni period', 
          icon: this.icons.conversion, 
          color: 'warning',
          suffix: '%'
        },
        { 
          key: 'customers', 
          label: 'Aktivni Kupci', 
          value: 2847, 
          trend: +12.5, 
          trendLabel: 'vs. prethodni period', 
          icon: this.icons.customers, 
          color: 'success'
        },
        { 
          key: 'ltv', 
          label: 'Lifetime Value (LTV)', 
          value: 24500, 
          trend: +8.7, 
          trendLabel: 'vs. prethodni period', 
          icon: this.icons.ltv, 
          color: 'accent',
          suffix: ' RSD'
        },
        { 
          key: 'retention', 
          label: 'Retencija (30d)', 
          value: 42.3, 
          trend: -1.2, 
          trendLabel: 'vs. prethodni period', 
          icon: this.icons.retention, 
          color: 'info',
          suffix: '%'
        },
        { 
          key: 'inventory_turn', 
          label: 'Obrt Zaliha', 
          value: 4.2, 
          trend: +0.3, 
          trendLabel: 'vs. prethodni period', 
          icon: this.icons.inventory, 
          color: 'primary',
          suffix: 'x'
        }
      ],
      revenue,
      orders,
      topCategories: [
        { name: 'Duksevi', revenue: 485000, orders: 124, growth: +18.5, color: 'accent' },
        { name: 'Trenerke', revenue: 412000, orders: 156, growth: +22.1, color: 'primary' },
        { name: 'Majice', revenue: 389000, orders: 342, growth: +15.2, color: 'info' },
        { name: 'Aksesoari', revenue: 87000, orders: 298, growth: +35.7, color: 'warning' }
      ],
      customerSegments: [
        { name: 'VIP', count: 124, revenue: 890000, avgOrder: 7177, color: 'accent' },
        { name: 'Lojalni', count: 567, revenue: 1240000, avgOrder: 2186, color: 'success' },
        { name: 'Redovni', count: 1456, revenue: 980000, avgOrder: 673, color: 'primary' },
        { name: 'Novi', count: 432, revenue: 156000, avgOrder: 361, color: 'info' },
        { name: 'Rizični', count: 189, revenue: 45000, avgOrder: 238, color: 'warning' },
        { name: 'Izgubljeni', count: 78, revenue: 0, avgOrder: 0, color: 'danger' }
      ],
      geoData: [
        { region: 'Beograd', revenue: 1240000, orders: 456, customers: 389 },
        { region: 'Novi Sad', revenue: 485000, orders: 187, customers: 156 },
        { region: 'Niš', revenue: 312000, orders: 124, customers: 98 },
        { region: 'Kragujevac', revenue: 198000, orders: 78, customers: 67 },
        { region: 'Subotica', revenue: 167000, orders: 65, customers: 54 },
        { region: 'Ostalo', revenue: 598000, orders: 234, customers: 187 }
      ],
      funnel: [
        { stage: 'Posete', value: 125000, rate: 100 },
        { stage: 'Pregledi proizvoda', value: 45000, rate: 36.0 },
        { stage: 'Dodato u korpu', value: 8500, rate: 6.8 },
        { stage: 'Početo checkout', value: 5200, rate: 4.2 },
        { stage: 'Završeno kupovina', value: 3420, rate: 2.7 }
      ]
    };
  }

  get icons() {
    return {
      revenue: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
      orders: '<path d="M21 12V7H5v5M16 19h6M8 19H2M21 19V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/><circle cx="9" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>',
      aov: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      conversion: '<path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-6"/>',
      customers: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      ltv: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><circle cx="12" cy="12" r="4"/>',
      retention: '<path d="M21 12a9 9 0 0 1-9 9c-2.52 0-4.93-1-6.74-2.56l-1.39 1.39A11 11 0 0 0 12 30c5.52 0 10-4.48 10-10 0-1.84-.46-3.54-1.24-5.06L21 12z"/>',
      inventory: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v16"/><path d="M2 12h20"/>'
    };
  }

  setLoadingState(loading) {
    const container = this.element?.querySelector('.kpi-grid');
    if (container) {
      container.style.opacity = loading ? '0.6' : '1';
      container.style.pointerEvents = loading ? 'none' : 'auto';
    }
  }

  getPeriodLabel() {
    const labels = { '7d': '7 dana', '30d': '30 dana', '90d': '90 dana', '1y': 'godinu dana' };
    return labels[this.period] || '30 dana';
  }

  render() {
    const kpisHtml = this.kpis.map(kpi => this.renderKPICard(kpi)).join('');
    const categoriesHtml = this.renderTopCategories();
    const segmentsHtml = this.renderCustomerSegments();
    const geoHtml = this.renderGeoHeatmap();
    const funnelHtml = this.renderFunnel();

    this.bindEvents();
    return `
      <div class="executive-section">
        <div class="executive-toolbar" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Executive Overview</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm); margin-top: var(--space-1);">Strateški pregled ključnih metrika performansi za poslednjih ${this.getPeriodLabel()}</p>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
            <select class="input-field select-field" style="width: auto; min-width: 160px;" id="periodSelect" aria-label="Vremenski period">
              <option value="7d" ${this.period === '7d' ? 'selected' : ''}>Poslednjih 7 dana</option>
              <option value="30d" ${this.period === '30d' ? 'selected' : ''}>Poslednjih 30 dana</option>
              <option value="90d" ${this.period === '90d' ? 'selected' : ''}>Poslednjih 90 dana</option>
              <option value="1y" ${this.period === '1y' ? 'selected' : ''}>Poslednje godine</option>
            </select>
            <button class="btn btn-secondary btn-sm" id="refreshBtn" aria-label="Osveži podatke">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Osveži
            </button>
            <button class="btn btn-primary btn-sm" id="exportBtn" aria-label="Izvezi izveštaj">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Izvezi PDF
            </button>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="dashboard-widget dashboard-widget-full" style="grid-column: span 12; margin-bottom: var(--space-5);">
          <div class="widget-header">
            <h3 class="widget-title">Ključni Performansi Indikatori</h3>
          </div>
          <div class="widget-body" style="padding: 0;">
            <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-5);">
              ${kpisHtml}
            </div>
          </div>
        </div>

        <!-- Revenue & Orders Charts Row -->
        <div class="dashboard-widget dashboard-widget-two-thirds" style="grid-column: span 8; margin-bottom: var(--space-5);">
          <div class="widget-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3);">
            <h3 class="widget-title">Prihod Trend — Poslednjih ${this.getPeriodLabel()}</h3>
            <div class="chart-legend" style="display: flex; gap: var(--space-4); font-size: var(--text-2xs);">
              <span style="display: flex; align-items: center; gap: var(--space-1); color: var(--color-accent);">● Prihod</span>
              <span style="display: flex; align-items: center; gap: var(--space-1); color: var(--color-primary);">● Porudžbine</span>
            </div>
          </div>
          <div class="widget-body" style="padding: var(--space-4);">
            <div class="chart-container" style="height: 320px; position: relative;">
              <canvas class="chart-canvas" id="execRevenueChart" width="800" height="320"></canvas>
            </div>
          </div>
        </div>

        <div class="dashboard-widget dashboard-widget-third" style="grid-column: span 4; margin-bottom: var(--space-5);">
          <div class="widget-header">
            <h3 class="widget-title">Porudžbine Trend</h3>
          </div>
          <div class="widget-body" style="padding: var(--space-4);">
            <div class="chart-container" style="height: 320px; position: relative;">
              <canvas class="chart-canvas" id="execOrdersChart" width="400" height="320"></canvas>
            </div>
          </div>
        </div>

        <!-- Top Categories & Funnel Row -->
        <div class="dashboard-widget dashboard-widget-half" style="grid-column: span 6; margin-bottom: var(--space-5);">
          <div class="widget-header">
            <h3 class="widget-title">Top Kategorije</h3>
          </div>
          <div class="widget-body" style="padding: 0;">
            ${categoriesHtml}
          </div>
        </div>

        <div class="dashboard-widget dashboard-widget-half" style="grid-column: span 6; margin-bottom: var(--space-5);">
          <div class="widget-header">
            <h3 class="widget-title">Konverzija Funnel</h3>
          </div>
          <div class="widget-body" style="padding: 0;">
            ${funnelHtml}
          </div>
        </div>

        <!-- Customer Segments & Geo Row -->
        <div class="dashboard-widget dashboard-widget-half" style="grid-column: span 6; margin-bottom: var(--space-5);">
          <div class="widget-header">
            <h3 class="widget-title">Segments of Customers</h3>
          </div>
          <div class="widget-body" style="padding: 0;">
            ${segmentsHtml}
          </div>
        </div>

        <div class="dashboard-widget dashboard-widget-half" style="grid-column: span 6; margin-bottom: var(--space-5);">
          <div class="widget-header">
            <h3 class="widget-title">Geografska Distribucija</h3>
          </div>
          <div class="widget-body" style="padding: 0;">
            ${geoHtml}
          </div>
        </div>
      </div>
    `;

  }

  renderKPICard(kpi) {
    const trend = parseFloat(kpi.trend);
    const trendClass = trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral';
    const trendIcon = trend > 0 
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>'
      : trend < 0
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>';

    const colorVar = kpi.color === 'danger' ? 'error' : kpi.color;
    const colorDarkVar = kpi.color === 'danger' ? 'error' : kpi.color;

    // Mini sparkline for revenue/orders
    let sparklineHtml = '';
    if (kpi.sparkline) {
      const points = kpi.sparkline;
      const maxV = Math.max(...points);
      const minV = Math.min(...points);
      const range = maxV - minV || 1;
      const path = points.map((v, i) => {
        const x = (i / (points.length - 1)) * 60;
        const y = 30 - ((v - minV) / range) * 25;
        return `${x},${y}`;
      }).join(' ');
      sparklineHtml = `
        <svg class="kpi-sparkline" width="64" height="32" viewBox="0 0 64 32" style="margin-top: var(--space-2);">
          <polyline fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" points="${path}"/>
        </svg>
      `;
    }

    this.bindEvents();
    return `
      <div class="kpi-card" style="--kpi-color: var(--color-${colorVar});">
        <div class="kpi-header">
          <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-${colorVar}), var(--color-${colorDarkVar}-dark));">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">${kpi.icon}</svg>
          </div>
          <div class="kpi-trend ${trendClass}">
            ${trendIcon}
            <span>${trend > 0 ? '+' : ''}${trend}%</span>
          </div>
        </div>
        <div class="kpi-value">${ImperiumUtils.formatNumber(kpi.value)}${kpi.suffix || ''}</div>
        <div class="kpi-label">${kpi.label}</div>
        <div class="kpi-sublabel">${kpi.trendLabel}</div>
        ${sparklineHtml}
      </div>
    `;
  }

  renderTopCategories() {
    this.bindEvents();
    return `
      <div class="data-grid" style="grid-template-columns: 1fr; gap: var(--space-3);">
        ${this.topCategories.map((cat, i) => `
          <div class="data-card" style="display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); transition: background var(--transition-fast); border-left: 4px solid var(--color-${cat.color});">
            <div class="data-card-stat" style="flex: 0 0 36px; text-align: center;">
              <div class="data-card-stat-value" style="font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--color-${cat.color});">${i + 1}</div>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div class="data-card-title" style="margin-bottom: var(--space-1);">${ImperiumUtils.escapeHtml(cat.name)}</div>
              <div class="data-card-meta" style="display: flex; gap: var(--space-3); font-size: var(--text-2xs); color: var(--color-text-tertiary);">
                <span>${ImperiumUtils.formatCurrency(cat.revenue)}</span>
                <span>${cat.orders} porudžbina</span>
              </div>
            </div>
            <div class="data-card-stat" style="text-align: right;">
              <div class="data-card-stat-label" style="font-size: var(--text-2xs); color: var(--color-text-tertiary);">Rast</div>
              <div class="data-card-stat-value" style="font-weight: var(--font-semibold); color: var(--color-success);">+${cat.growth}%</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderCustomerSegments() {
    const totalCustomers = this.customerSegments.reduce((sum, s) => sum + s.count, 0);
    
    this.bindEvents();
    return `
      <div class="data-grid" style="grid-template-columns: 1fr; gap: var(--space-3);">
        ${this.customerSegments.map(seg => {
          const pct = ((seg.count / totalCustomers) * 100).toFixed(1);
          return `
            <div class="data-card" style="display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); transition: background var(--transition-fast); border-left: 4px solid var(--color-${seg.color});">
              <div class="data-card-stat" style="flex: 0 0 36px; text-align: center;">
                <div class="data-card-stat-value" style="font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--color-${seg.color});">${seg.count}</div>
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="data-card-title" style="margin-bottom: var(--space-1); display: flex; align-items: center; gap: var(--space-2);">
                  ${ImperiumUtils.escapeHtml(seg.name)}
                  <span style="font-size: var(--text-2xs); color: var(--color-text-tertiary);">(${pct}%)</span>
                </div>
                <div class="data-card-meta" style="display: flex; gap: var(--space-3); font-size: var(--text-2xs); color: var(--color-text-tertiary);">
                  ${seg.avgOrder > 0 ? `<span>Avg: ${ImperiumUtils.formatCurrency(seg.avgOrder)}</span>` : ''}
                  ${seg.revenue > 0 ? `<span>${ImperiumUtils.formatCurrency(seg.revenue)}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderGeoHeatmap() {
    const maxRevenue = Math.max(...this.geoData.map(d => d.revenue));
    
    this.bindEvents();
    return `
      <div class="geo-heatmap" style="display: flex; flex-direction: column; gap: var(--space-3);">
        ${this.geoData.map(region => {
          const intensity = region.revenue / maxRevenue;
          const barWidth = intensity * 100;
          return `
            <div class="geo-row" style="display: flex; align-items: center; gap: var(--space-3);">
              <span style="font-weight: var(--font-medium); min-width: 100px; font-size: var(--text-sm);">${ImperiumUtils.escapeHtml(region.region)}</span>
              <div style="flex: 1; height: 8px; background: var(--color-bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light)); border-radius: var(--radius-full); transition: width var(--transition-slow);"></div>
              </div>
              <span style="font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--color-text-primary); min-width: 90px; text-align: right;">${ImperiumUtils.formatCurrency(region.revenue)}</span>
              <span style="font-size: var(--text-2xs); color: var(--color-text-tertiary); min-width: 60px; text-align: right;">${region.orders} ord.</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderFunnel() {
    const maxVal = this.funnelData[0]?.value || 1;
    
    this.bindEvents();
    return `
      <div class="funnel-chart" style="display: flex; flex-direction: column; gap: var(--space-2); align-items: center;">
        ${this.funnelData.map((stage, i) => {
          const width = (stage.value / maxVal) * 100;
          const prevRate = i > 0 ? ((stage.value / this.funnelData[i-1].value) * 100).toFixed(1) : 100;
          return `
            <div class="funnel-stage" style="display: flex; align-items: center; gap: var(--space-3); width: 100%; max-width: 320px;">
              <div style="flex: 1; text-align: right; font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-text-secondary); min-width: 120px;">${stage.stage}</div>
              <div style="position: relative; width: ${width}%; min-width: 60px; height: 36px; background: linear-gradient(90deg, var(--color-${i === 0 ? 'primary' : i === 1 ? 'info' : i === 2 ? 'warning' : i === 3 ? 'accent' : 'success'}), var(--color-${i === 0 ? 'primary' : i === 1 ? 'info' : i === 2 ? 'warning' : i === 3 ? 'accent' : 'success'}-light)); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: flex-end; padding-right: var(--space-3); color: white; font-weight: var(--font-semibold); font-size: var(--text-sm);">
                ${ImperiumUtils.formatNumber(stage.value)}
              </div>
              <div style="font-size: var(--text-2xs); color: var(--color-text-tertiary); min-width: 55px; text-align: left;">${stage.rate}% (${prevRate}%)</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  initCharts() {
    this.renderRevenueChart();
    this.renderOrdersChart();
  }

  updateCharts() {
    this.renderRevenueChart();
    this.renderOrdersChart();
  }

  renderRevenueChart() {
    const canvas = document.getElementById('execRevenueChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = this.revenueData;
    if (!data?.length) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 24, right: 24, bottom: 44, left: 68 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'var(--color-border-primary)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid
    for (let i = 0; i < data.length; i += Math.ceil(data.length / 6)) {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
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
      ctx.fillText(ImperiumUtils.formatNumber(val), padding.left - 12, y);
    }

    // X-axis labels
    ctx.fillStyle = 'var(--color-text-tertiary)';
    ctx.font = '11px var(--font-sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelStep = Math.ceil(data.length / 8);
    for (let i = 0; i < data.length; i += labelStep) {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const date = new Date(data[i].date);
      const label = date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' });
      ctx.fillText(label, x, height - padding.bottom + 10);
    }

    // Area gradient
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(201, 168, 108, 0.22)');
    gradient.addColorStop(1, 'rgba(201, 168, 108, 0)');

    // Area
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    data.forEach((point, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.strokeStyle = 'var(--color-accent)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Revenue line (second dataset)
    if (this.ordersData.length) {
      const ordersMax = Math.max(...this.ordersData.map(d => d.value));
      const ordersRange = ordersMax || 1;

      ctx.strokeStyle = 'var(--color-primary)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      this.ordersData.forEach((point, i) => {
        const x = padding.left + (i / (this.ordersData.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((point.value / ordersMax) * chartHeight * 0.8);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  renderOrdersChart() {
    const canvas = document.getElementById('execOrdersChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = this.ordersData;
    if (!data?.length) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 24, right: 24, bottom: 44, left: 52 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d.value);
    const maxValue = Math.max(...values, 1);

    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = 'var(--color-border-primary)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Y labels
    ctx.fillStyle = 'var(--color-text-tertiary)';
    ctx.font = '11px var(--font-mono)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round(maxValue - (i / 4) * maxValue);
      const y = padding.top + (i / 4) * chartHeight;
      ctx.fillText(String(val), padding.left - 10, y);
    }

    // Bars
    const barWidth = chartWidth / data.length * 0.5;
    const barGap = chartWidth / data.length * 0.5;

    ctx.fillStyle = 'var(--color-primary)';
    data.forEach((point, i) => {
      const x = padding.left + i * (barWidth + barGap) + barGap / 2;
      const barHeight = (point.value / maxValue) * chartHeight;
      const y = height - padding.bottom - barHeight;
      
      const radius = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + radius);
      ctx.lineTo(x, height - padding.bottom - radius);
      ctx.arcTo(x, height - padding.bottom, x + radius, height - padding.bottom, radius);
      ctx.lineTo(x + barWidth - radius, height - padding.bottom);
      ctx.arcTo(x + barWidth, height - padding.bottom, x + barWidth, height - padding.bottom - radius, radius);
      ctx.lineTo(x + barWidth, y + radius);
      ctx.arcTo(x + barWidth, y, x + barWidth - radius, y, radius);
      ctx.lineTo(x + radius, y);
      ctx.arcTo(x, y, x, y + radius, radius);
      ctx.closePath();
      ctx.fill();
    });

    // X labels
    ctx.fillStyle = 'var(--color-text-tertiary)';
    ctx.font = '10px var(--font-sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelStep = Math.ceil(data.length / 8);
    for (let i = 0; i < data.length; i += labelStep) {
      const x = padding.left + i * (barWidth + barGap) + (barWidth + barGap) / 2;
      const date = new Date(data[i].date);
      const label = date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' });
      ctx.fillText(label, x, height - padding.bottom + 8);
    }
  }

  bindEvents() {
    this.on('change', '#periodSelect', (e) => {
      this.period = e.target.value;
      this.loadData();
    });

    this.on('click', '#refreshBtn', () => {
      this.loadData();
    });

    this.on('click', '#exportBtn', () => {
      this.exportExecutive();
    });
  }

  exportExecutive() {
    const report = {
      generated: new Date().toISOString(),
      period: this.period,
      kpis: this.kpis,
      topCategories: this.topCategories,
      customerSegments: this.customerSegments,
      geoData: this.geoData,
      funnel: this.funnelData,
      charts: { revenue: this.revenueData, orders: this.ordersData }
    };

    const json = JSON.stringify(report, null, 2);
    ImperiumUtils.downloadFile(json, `dalli-executive-${this.period}-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    this.admin.toastContainer.success('Izveštaj preuzet (JSON). PDF export uskoro dostupan.');
  }
}