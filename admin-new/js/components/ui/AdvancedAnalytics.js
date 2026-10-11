/**
 * DALLI Advanced Analytics Dashboard
 * Real-time dashboards, LTV/CAC, churn prediction, forecasting, custom reports
 */

export class AdvancedAnalytics {
  static init() {
    this.initDashboards();
    this.initLTVCalculator();
    this.initCACCalculator();
    this.initChurnPrediction();
    this.initForecasting();
    this.initCohortAnalysis();
    this.initCustomReports();
    this.initRealTimeMonitoring();
    this.initExportEngine();
  }

  // ============================================================
  // REAL-TIME DASHBOARDS
  // ============================================================
  static initDashboards() {
    this.dashboards = new Map();
    this.widgets = new Map();
  }

  static createDashboard(config) {
    const dashboard = {
      id: this.generateId(),
      name: config.name,
      description: config.description,
      layout: config.layout || 'grid',
      widgets: config.widgets || [],
      filters: config.filters || {},
      refreshInterval: config.refreshInterval || 30000,
      permissions: config.permissions || ['admin'],
      createdAt: new Date().toISOString(),
      createdBy: config.createdBy,
      isDefault: config.isDefault || false
    };

    this.dashboards.set(dashboard.id, dashboard);
    return { success: true, dashboard };
  }

  static createWidget(config) {
    const widget = {
      id: this.generateId(),
      type: config.type, // metric, chart, table, funnel, cohort, heatmap, map
      title: config.title,
      dataSource: config.dataSource,
      query: config.query || {},
      visualization: config.visualization || {},
      size: config.size || 'medium',
      position: config.position || { x: 0, y: 0 },
      refreshInterval: config.refreshInterval || 60000,
      filters: config.filters || {},
      drillDown: config.drillDown || null,
      alerts: config.alerts || [],
      createdAt: new Date().toISOString()
    };

    this.widgets.set(widget.id, widget);
    return { success: true, widget };
  }

  static async renderDashboard(dashboardId, container) {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return { success: false };

    const containerEl = document.getElementById(container);
    if (!containerEl) return { success: false };

    containerEl.innerHTML = `
      <div class="analytics-dashboard" data-dashboard-id="${dashboard.id}">
        <div class="dashboard-header">
          <h2>${dashboard.name}</h2>
          <div class="dashboard-controls">
            <select class="dashboard-time-range" data-dashboard-time-range>
              <option value="1h">Last Hour</option>
              <option value="24h" selected>Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            <button class="btn btn-secondary" data-action="refresh-dashboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
            <button class="btn btn-primary" data-action="export-dashboard">Export</button>
          </div>
        </div>
        <div class="dashboard-filters" style="display: none;"></div>
        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-4);"></div>
      </div>
    `;

    // Load widgets
    for (const widgetConfig of dashboard.widgets) {
      await this.renderWidget(widgetConfig);
    }

    // Set up auto-refresh
    this.setupAutoRefresh(dashboardId);

    return { success: true };
  }

  static setupAutoRefresh(dashboardId) {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return;

    if (dashboard.refreshIntervalId) {
      clearInterval(dashboard.refreshIntervalId);
    }

    dashboard.refreshIntervalId = setInterval(() => {
      this.refreshDashboard(dashboardId);
    }, dashboard.refreshInterval);
  }

  static async refreshDashboard(dashboardId) {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return;

    for (const widgetConfig of dashboard.widgets) {
      await this.refreshWidget(widgetConfig.id);
    }
  }

  static async refreshWidget(widgetId) {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    try {
      const data = await this.fetchWidgetData(widget);
      this.updateWidgetUI(widget.id, data);
    } catch (e) {
      console.error('Widget refresh failed:', e);
    }
  }

  static async fetchWidgetData(widget) {
    const params = new URLSearchParams({
      ...widget.query,
      startDate: this.getStartDate(),
      endDate: new Date().toISOString()
    });

    const response = await fetch(`/api/analytics/${widget.dataSource}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch widget data');
    return response.json();
  }

  static updateWidgetUI(widgetId, data) {
    const container = document.getElementById(`widget-${widgetId}`);
    if (!container) return;

    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    switch (widget.type) {
      case 'metric':
        this.renderMetricWidget(container, data);
        break;
      case 'line_chart':
      case 'bar_chart':
      case 'area_chart':
        this.renderChartWidget(container, data, widget.visualization);
        break;
      case 'table':
        this.renderTableWidget(container, data, widget.visualization);
        break;
      case 'funnel':
        this.renderFunnelWidget(container, data);
        break;
      case 'cohort':
        this.renderCohortWidget(container, data);
        break;
      case 'heatmap':
        this.renderHeatmapWidget(container, data);
        break;
    }
  }

  // ============================================================
  // LTV CALCULATOR
  // ============================================================
  static initLTVCalculator() {
    this.ltvCache = new Map();
  }

  static async calculateLTV(customerId, options = {}) {
    const cacheKey = `ltv_${customerId}_${JSON.stringify(options)}`;
    if (this.ltvCache.has(cacheKey)) {
      return this.ltvCache.get(cacheKey);
    }

    try {
      const response = await fetch(`/api/analytics/ltv/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      const data = await response.json();

      const ltv = {
        customerId,
        predictedLTV: data.predictedLTV,
        historicalLTV: data.historicalLTV,
        predictedOrders: data.predictedOrders,
        avgOrderValue: data.avgOrderValue,
        purchaseFrequency: data.purchaseFrequency,
        expectedLifespan: data.expectedLifespan,
        confidence: data.confidence,
        segments: data.segments,
        calculatedAt: new Date().toISOString()
      };

      this.ltvCache.set(cacheKey, ltv);
      return ltv;
    } catch (e) {
      console.error('LTV calculation failed:', e);
      return null;
    }
  }

  static async calculateSegmentLTV(segmentId, options = {}) {
    try {
      const response = await fetch('/api/analytics/ltv/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId, ...options })
      });
      return await response.json();
    } catch (e) {
      console.error('Segment LTV calculation failed:', e);
      return null;
    }
  }

  // ============================================================
  // CAC CALCULATOR
  // ============================================================
  static initCACCalculator() {
    this.cacCache = new Map();
  }

  static async calculateCAC(options = {}) {
    const cacheKey = `cac_${JSON.stringify(options)}`;
    if (this.cacCache.has(cacheKey)) {
      return this.cacCache.get(cacheKey);
    }

    try {
      const response = await fetch('/api/analytics/cac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      const data = await response.json();

      const cac = {
        totalCAC: data.totalCAC,
        cacByChannel: data.cacByChannel,
        cacByCampaign: data.cacByCampaign,
        cacByCohort: data.cacByCohort,
        paybackPeriod: data.paybackPeriod,
        ltvToCacRatio: data.ltvToCacRatio,
        calculatedAt: new Date().toISOString()
      };

      this.cacCache.set(cacheKey, cac);
      return cac;
    } catch (e) {
      console.error('CAC calculation failed:', e);
      return null;
    }
  }

  static async calculateChannelCAC(channel, period) {
    try {
      const response = await fetch('/api/analytics/cac/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, period })
      });
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  // ============================================================
  // CHURN PREDICTION
  // ============================================================
  static initChurnPrediction() {
    this.churnModels = new Map();
    this.predictions = new Map();
  }

  static async predictChurn(customerId, options = {}) {
    try {
      const response = await fetch('/api/analytics/churn/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, ...options })
      });
      const data = await response.json();

      const prediction = {
        customerId,
        churnProbability: data.churnProbability,
        riskLevel: data.riskLevel, // low, medium, high, critical
        keyFactors: data.keyFactors,
        recommendedActions: data.recommendedActions,
        predictedChurnDate: data.predictedChurnDate,
        confidence: data.confidence,
        predictedAt: new Date().toISOString()
      };

      this.predictions.set(customerId, prediction);
      return prediction;
    } catch (e) {
      console.error('Churn prediction failed:', e);
      return null;
    }
  }

  static async predictSegmentChurn(segmentId) {
    try {
      const response = await fetch('/api/analytics/churn/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId })
      });
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  static getChurnRiskCustomers(threshold = 0.7) {
    const atRisk = [];
    for (const [customerId, prediction] of this.predictions.entries()) {
      if (prediction.churnProbability >= threshold) {
        atRisk.push(prediction);
      }
    }
    return atRisk.sort((a, b) => b.churnProbability - a.churnProbability);
  }

  // ============================================================
  // FORECASTING
  // ============================================================
  static initForecasting() {
    this.forecasts = new Map();
    this.models = new Map();
  }

  static async forecastRevenue(options = {}) {
    try {
      const response = await fetch('/api/analytics/forecast/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  static async forecastDemand(productId, period) {
    try {
      const response = await fetch('/api/analytics/forecast/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, period })
      });
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  static async forecastInventoryNeeds(period) {
    try {
      const response = await fetch('/api/analytics/forecast/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period })
      });
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  static async forecastCashFlow(options = {}) {
    try {
      const response = await fetch('/api/analytics/forecast/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  // ============================================================
  // COHORT ANALYSIS
  // ============================================================
  static initCohortAnalysis() {
    this.cohorts = new Map();
  }

  static async analyzeCohort(cohortId, options = {}) {
    try {
      const response = await fetch('/api/analytics/cohort/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId, ...options })
      });
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  static async createCohort(config) {
    const cohort = {
      id: this.generateId(),
      name: config.name,
      definition: config.definition, // { field, operator, value }
      startDate: config.startDate,
      endDate: config.endDate,
      metrics: config.metrics || ['retention', 'revenue', 'orders'],
      status: 'building',
      createdAt: new Date().toISOString(),
      createdBy: config.createdBy
    };

    this.cohorts.set(cohort.id, cohort);
    this.buildCohort(cohort.id);

    return { success: true, cohort };
  }

  static async buildCohort(cohortId) {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) return;

    try {
      const members = await this.fetchCohortMembers(cohort.definition);
      cohort.members = members;
      cohort.size = members.length;

      const metrics = await this.calculateCohortMetrics(cohortId, members);
      cohort.metrics = metrics;
      cohort.status = 'ready';
      cohort.completedAt = new Date().toISOString();
    } catch (e) {
      cohort.status = 'failed';
      cohort.error = e.message;
    }
  }

  static async getCohortRetention(cohortId, periods = 12) {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort || cohort.status !== 'ready') return null;

    return {
      cohortId,
      retention: cohort.metrics.retention?.slice(0, periods) || [],
      averageRetention: cohort.metrics.avgRetention || 0
    };
  }

  static async compareCohorts(cohortIds, metric = 'retention') {
    const results = {};
    for (const id of cohortIds) {
      const cohort = this.cohorts.get(id);
      if (cohort && cohort.status === 'ready') {
        results[id] = cohort.metrics[metric] || null;
      }
    }
    return results;
  }

  // ============================================================
  // CUSTOM REPORTS
  // ============================================================
  static initCustomReports() {
    this.reports = new Map();
    this.scheduledReports = new Map();
  }

  static createReport(config) {
    const report = {
      id: this.generateId(),
      name: config.name,
      description: config.description,
      type: config.type, // table, chart, pivot, funnel, cohort
      dataSource: config.dataSource,
      dimensions: config.dimensions || [],
      metrics: config.metrics || [],
      filters: config.filters || {},
      sorting: config.sorting || [],
      limits: config.limits || { limit: 1000, offset: 0 },
      visualization: config.visualization || {},
      schedule: config.schedule || null,
      recipients: config.recipients || [],
      format: config.format || 'pdf',
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy: config.createdBy,
      lastRun: null,
      lastResult: null
    };

    this.reports.set(report.id, report);
    return { success: true, report };
  }

  static async runReport(reportId, params = {}) {
    const report = this.reports.get(reportId);
    if (!report) return { success: false };

    report.status = 'running';
    report.lastRun = new Date().toISOString();

    try {
      const result = await this.executeReport(report, params);
      report.lastResult = result;
      report.status = 'completed';
      report.lastRun = new Date().toISOString();
      return { success: true, result };
    } catch (e) {
      report.status = 'failed';
      report.error = e.message;
      return { success: false, error: e.message };
    }
  }

  static async executeReport(report, params) {
    return { data: [], meta: {} };
  }

  static scheduleReport(reportId, schedule) {
    const report = this.reports.get(reportId);
    if (!report) return { success: false };

    report.schedule = schedule;
    this.scheduledReports.set(report.id, { ...schedule, reportId });
    this.scheduleCronJob(report.id, schedule);

    return { success: true };
  }

  static async exportReport(reportId, format = 'pdf') {
    const report = this.reports.get(reportId);
    if (!report || !report.lastResult) return { success: false };

    let blob;
    let mimeType;
    let filename = `${report.name}_${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'csv':
        blob = this.generateCSV(report.lastResult.data);
        mimeType = 'text/csv';
        filename += '.csv';
        break;
      case 'excel':
        blob = this.generateExcel(report.lastResult.data);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename += '.xlsx';
        break;
      case 'pdf':
        blob = await this.generatePDF(report);
        mimeType = 'application/pdf';
        filename += '.pdf';
        break;
      case 'json':
        blob = new Blob([JSON.stringify(report.lastResult, null, 2)], { type: 'application/json' });
        mimeType = 'application/json';
        filename += '.json';
        break;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    return { success: true };
  }

  static generateCSV(data) {
    if (!data.length) return new Blob(['No data'], { type: 'text/csv' });
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
    return new Blob([headers + '\n' + rows], { type: 'text/csv' });
  }

  static generateExcel(data) {
    return this.generateCSV(data);
  }

  async generatePDF(report) {
    return new Blob([JSON.stringify(report.lastResult, null, 2)], { type: 'application/pdf' });
  }

  // ============================================================
  // REAL-TIME MONITORING
  // ============================================================
  static initRealTimeMonitoring() {
    this.realtimeMetrics = new Map();
    this.alerts = new Map();
    this.ws = null;
  }

  static connectWebSocket() {
    if (this.ws) return;

    this.ws = new WebSocket(`wss://api.dalli.rs/ws/analytics`);

    this.ws.onopen = () => {
      console.log('Analytics WebSocket connected');
      this.subscribeToMetrics();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealtimeUpdate(data);
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }

  static subscribeToMetrics() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        metrics: ['revenue', 'orders', 'visitors', 'conversion_rate', 'cart_abandonment']
      }));
    }
  }

  static handleRealtimeUpdate(data) {
    this.updateRealtimeWidgets(data);
    this.checkAlerts(data);
  }

  static updateRealtimeWidgets(data) {
    for (const [key, value] of Object.entries(data)) {
      const elements = document.querySelectorAll(`[data-realtime="${key}"]`);
      elements.forEach(el => {
        el.textContent = this.formatNumber(value);
        el.classList.add('updated');
        setTimeout(() => el.classList.remove('updated'), 1000);
      });
    }
  }

  static checkAlerts(data) {
    for (const alert of this.alerts.values()) {
      const value = data[alert.metric];
      if (value !== undefined && this.checkAlertCondition(value, alert.condition, alert.threshold)) {
        this.triggerAlert(alert, value);
      }
    }
  }

  static checkAlertCondition(value, condition, threshold) {
    switch (condition) {
      case 'above': return value > threshold;
      case 'below': return value < threshold;
      case 'equals': return value === threshold;
      case 'change_above': return value > threshold;
      case 'change_below': return value < threshold;
      default: return false;
    }
  }

  static triggerAlert(alert, value) {
    if (window.Sentry) {
      window.Sentry.captureMessage(`Alert: ${alert.name} - ${value} ${alert.condition} ${alert.threshold}`, {
        level: 'warning',
        extra: { alert, value }
      });
    }

    fetch('/api/alerts/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: alert.id, value, timestamp: Date.now() }),
      credentials: 'include',
      keepalive: true
    }).catch(() => {});
  }

  static addAlert(config) {
    const alert = {
      id: this.generateId(),
      name: config.name,
      metric: config.metric,
      condition: config.condition,
      threshold: config.threshold,
      severity: config.severity || 'warning',
      channels: config.channels || ['toast'],
      enabled: true,
      createdAt: new Date().toISOString()
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  // ============================================================
  // EXPORT ENGINE
  // ============================================================
  static initExportEngine() {
    this.exportJobs = new Map();
  }

  static async exportData(config) {
    const job = {
      id: this.generateId(),
      type: config.type,
      dataSource: config.dataSource,
      filters: config.filters || {},
      format: config.format,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      downloadUrl: null
    };

    this.exportJobs.set(job.id, job);
    this.processExportJob(job.id);
    return { success: true, jobId: job.id };
  }

  static async processExportJob(jobId) {
    const job = this.exportJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';

    try {
      const data = await this.fetchExportData(job.dataSource, job.filters);
      job.progress = 50;

      let blob;
      switch (job.format) {
        case 'csv':
          blob = this.generateCSV(data);
          mimeType = 'text/csv';
          break;
        case 'excel':
          blob = await this.generateExcel(data);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'pdf':
          blob = await this.generatePDF(data);
          mimeType = 'application/pdf';
          break;
        case 'json':
          blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          mimeType = 'application/json';
          break;
      }

      job.progress = 100;
      job.status = 'completed';
      job.downloadUrl = URL.createObjectURL(blob);

      if (window.showToast) window.showToast('Export completed', 'success');
    } catch (e) {
      job.status = 'failed';
      job.error = e.message;
    }
  }

  static generateCSV(data) {
    if (!data.length) return new Blob(['No data'], { type: 'text/csv' });
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
    return new Blob([headers + '\n' + rows], { type: 'text/csv' });
  }

  static generateExcel(data) {
    return this.generateCSV(data);
  }

  static async generatePDF(data) {
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/pdf' });
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================
  static generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static getStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  static formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('sr-RS');
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdvancedAnalytics.init());
} else {
  AdvancedAnalytics.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedAnalytics };
}

if (typeof window !== 'undefined') {
  window.AdvancedAnalytics = AdvancedAnalytics;
}