/**
 * Advanced Analytics Service
 * Custom reports, scheduled exports, data visualization, and business intelligence
 */

import { apiService } from './api.js';
import { cacheService } from './cache.js';
import { performanceMonitor } from './performance.js';
import { Cron } from 'croner';

const REPORT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf', 'json'];

class AnalyticsService {
  constructor() {
    this.reportCache = new Map();
    this.scheduledJobs = new Map();
    this.customMetrics = new Map();
    this.dashboards = new Map();
  }

  // =========================================================================
  // Custom Reports
  // =========================================================================

  async createReport(config) {
    const report = {
      id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      description: config.description,
      type: config.type || 'custom',
      query: config.query,
      filters: config.filters || {},
      dimensions: config.dimensions || [],
      metrics: config.metrics || [],
      visualization: config.visualization || 'table',
      schedule: config.schedule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: config.createdBy,
      isPublic: config.isPublic || false,
      tags: config.tags || [],
    };

    // Validate query
    await this.validateQuery(report.query);

    // Cache the report definition
    this.reportCache.set(report.id, report);

    // Persist to backend
    await apiService.post('/analytics/reports', report);

    // Schedule if needed
    if (report.schedule) {
      this.scheduleReport(report);
    }

    return report;
  }

  async getReport(reportId) {
    // Check cache first
    if (this.reportCache.has(reportId)) {
      return this.reportCache.get(reportId);
    }

    // Fetch from API
    const report = await apiService.get(`/analytics/reports/${reportId}`);
    this.reportCache.set(reportId, report);
    return report;
  }

  async listReports(filters = {}) {
    const cacheKey = `reports_list_${JSON.stringify(filters)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const reports = await apiService.get('/analytics/reports', { params: filters });
    await cacheService.set(cacheKey, reports, { ttl: REPORT_CACHE_TTL, tags: ['analytics', 'reports'] });
    return reports;
  }

  async updateReport(reportId, updates) {
    const report = await this.getReport(reportId);
    const updated = { ...report, ...updates, updatedAt: new Date().toISOString() };

    await apiService.put(`/analytics/reports/${reportId}`, updated);
    this.reportCache.set(reportId, updated);

    // Reschedule if schedule changed
    if (updates.schedule !== undefined) {
      this.unscheduleReport(reportId);
      if (updated.schedule) {
        this.scheduleReport(updated);
      }
    }

    return updated;
  }

  async deleteReport(reportId) {
    await apiService.delete(`/analytics/reports/${reportId}`);
    this.reportCache.delete(reportId);
    this.unscheduleReport(reportId);
  }

  async executeReport(reportId, options = {}) {
    const report = await this.getReport(reportId);
    const startTime = performance.now();

    try {
      const data = await apiService.post('/analytics/execute', {
        query: report.query,
        filters: { ...report.filters, ...options.filters },
        dimensions: options.dimensions || report.dimensions,
        metrics: options.metrics || report.metrics,
        limit: options.limit || 10000,
        offset: options.offset || 0,
      });

      const duration = performance.now() - startTime;
      performanceMonitor.trackCustomMetric('report_execution', duration, {
        reportId,
        rows: data.rows?.length || 0,
      });

      return {
        ...data,
        metadata: {
          reportId,
          reportName: report.name,
          executedAt: new Date().toISOString(),
          duration,
          filters: options.filters || report.filters,
        },
      };
    } catch (error) {
      performanceMonitor.trackCustomMetric('report_execution_error', 1, { reportId });
      throw error;
    }
  }

  async validateQuery(query) {
    return apiService.post('/analytics/validate', { query });
  }

  // =========================================================================
  // Scheduled Reports
  // =========================================================================

  scheduleReport(report) {
    if (!report.schedule) return;

    const { cron, timezone = 'Europe/Belgrade', format = 'csv', recipients = [] } = report.schedule;

    // Parse cron expression (simplified - use a proper cron library in production)
    const interval = this.parseCronToInterval(cron);
    if (!interval) {
      console.warn(`[Analytics] Invalid cron expression: ${cron}`);
      return;
    }

    const job = {
      reportId: report.id,
      interval,
      timezone,
      format,
      recipients,
      lastRun: null,
      nextRun: this.calculateNextRun(cron, timezone),
      timer: setInterval(() => this.runScheduledReport(report.id), interval),
    };

    this.scheduledJobs.set(report.id, job);
    console.log(`[Analytics] Scheduled report ${report.id}: every ${interval}ms`);
  }

  unscheduleReport(reportId) {
    const job = this.scheduledJobs.get(reportId);
    if (job) {
      clearInterval(job.timer);
      this.scheduledJobs.delete(reportId);
    }
  }

  async runScheduledReport(reportId) {
    const job = this.scheduledJobs.get(reportId);
    if (!job) return;

    try {
      const result = await this.executeReport(reportId);
      const exportData = await this.exportReport(result, job.format);

      // Send to recipients
      if (job.recipients.length > 0) {
        await this.sendReportEmail(job.recipients, {
          reportName: (await this.getReport(reportId)).name,
          format: job.format,
          data: exportData,
          generatedAt: new Date().toISOString(),
        });
      }

      job.lastRun = new Date().toISOString();
      job.nextRun = this.calculateNextRunFromInterval(job.interval);

      console.log(`[Analytics] Scheduled report ${reportId} executed successfully`);
    } catch (error) {
      console.error(`[Analytics] Scheduled report ${reportId} failed:`, error);
    }
  }

  parseCronToInterval(cron) {
    try {
      const cronJob = Cron(cron);
      const nextRun = cronJob.next();
      if (nextRun) {
        return nextRun.getTime() - Date.now();
      }
      return null;
    } catch (e) {
      console.warn('[Analytics] Invalid cron expression:', cron, e);
      return null;
    }
  }

  calculateNextRun(cron, timezone) {
    try {
      const cronJob = Cron(cron, { timezone });
      const nextRun = cronJob.next();
      return nextRun ? nextRun.toISOString() : null;
    } catch (e) {
      console.warn('[Analytics] Invalid cron expression:', cron, e);
      return null;
    }
  }

  calculateNextRunFromInterval(interval) {
    return new Date(Date.now() + interval).toISOString();
  }

  // =========================================================================
  // Export Engine
  // =========================================================================

  async exportReport(data, format = 'csv', options = {}) {
    if (!EXPORT_FORMATS.includes(format)) {
      throw new Error(`Unsupported format: ${format}. Supported: ${EXPORT_FORMATS.join(', ')}`);
    }

    switch (format) {
      case 'csv':
        return this.exportCSV(data, options);
      case 'xlsx':
        return this.exportXLSX(data, options);
      case 'pdf':
        return this.exportPDF(data, options);
      case 'json':
        return this.exportJSON(data, options);
      default:
        throw new Error(`Format ${format} not implemented`);
    }
  }

  exportCSV(data, options = {}) {
    const { rows, columns, metadata } = data;
    if (!rows || !rows.length) return '';

    const headers = columns || Object.keys(rows[0]);
    const delimiter = options.delimiter || ',';
    const includeHeaders = options.headers !== false;

    let csv = '';
    if (includeHeaders) {
      csv += headers.map(h => this.escapeCSV(h)).join(delimiter) + '\n';
    }

    rows.forEach(row => {
      const values = headers.map(h => row[h] ?? '');
      csv += values.map(v => this.escapeCSV(v)).join(delimiter) + '\n';
    });

    return csv;
  }

  escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  async exportXLSX(data, options = {}) {
    // In production, use a library like xlsx or exceljs
    // For now, return CSV with .xlsx extension hint
    return this.exportCSV(data, options);
  }

  async exportPDF(data, options = {}) {
    // In production, use a library like pdfkit or puppeteer
    // For now, return structured data
    return JSON.stringify({
      format: 'pdf',
      title: options.title || 'Report',
      data: data.rows,
      columns: data.columns,
      metadata: data.metadata,
    }, null, 2);
  }

  exportJSON(data, options = {}) {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      format: 'json',
      ...data,
    }, null, options.pretty ? 2 : 0);
  }

  // =========================================================================
  // Custom Metrics
  // =========================================================================

  defineMetric(metric) {
    const definition = {
      id: metric.id || `metric_${Date.now()}`,
      name: metric.name,
      description: metric.description,
      formula: metric.formula, // SQL-like or JS expression
      dimensions: metric.dimensions || [],
      unit: metric.unit || 'count',
      format: metric.format || 'number',
      tags: metric.tags || [],
      createdAt: new Date().toISOString(),
    };

    this.customMetrics.set(definition.id, definition);
    return definition;
  }

  getMetric(metricId) {
    return this.customMetrics.get(metricId);
  }

  listMetrics() {
    return Array.from(this.customMetrics.values());
  }

  async computeMetric(metricId, filters = {}, timeRange) {
    const metric = this.customMetrics.get(metricId);
    if (!metric) throw new Error(`Metric ${metricId} not found`);

    return apiService.post('/analytics/compute-metric', {
      formula: metric.formula,
      dimensions: metric.dimensions,
      filters,
      timeRange,
    });
  }

  // =========================================================================
  // Dashboards
  // =========================================================================

  async createDashboard(config) {
    const dashboard = {
      id: `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      description: config.description,
      layout: config.layout || 'grid',
      widgets: config.widgets || [],
      filters: config.filters || {},
      isPublic: config.isPublic || false,
      tags: config.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: config.createdBy,
    };

    await apiService.post('/analytics/dashboards', dashboard);
    this.dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }

  async getDashboard(dashboardId) {
    if (this.dashboards.has(dashboardId)) {
      return this.dashboards.get(dashboardId);
    }
    const dashboard = await apiService.get(`/analytics/dashboards/${dashboardId}`);
    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  async updateDashboard(dashboardId, updates) {
    const dashboard = await this.getDashboard(dashboardId);
    const updated = { ...dashboard, ...updates, updatedAt: new Date().toISOString() };
    await apiService.put(`/analytics/dashboards/${dashboardId}`, updated);
    this.dashboards.set(dashboardId, updated);
    return updated;
  }

  // =========================================================================
  // Cohort Analysis
  // =========================================================================

  async getCohortAnalysis(config) {
    return apiService.post('/analytics/cohort', {
      cohortType: config.cohortType || 'acquisition', // acquisition, behavioral
      cohortSize: config.cohortSize || 'month', // day, week, month, quarter
      metric: config.metric || 'retention', // retention, revenue, engagement
      timeRange: config.timeRange,
      filters: config.filters,
    });
  }

  // =========================================================================
  // Funnel Analysis
  // =========================================================================

  async getFunnelAnalysis(config) {
    return apiService.post('/analytics/funnel', {
      steps: config.steps, // [{ name, event, filters }]
      timeRange: config.timeRange,
      window: config.window || '30d', // conversion window
      breakdown: config.breakdown, // property to break down by
    });
  }

  // =========================================================================
  // Segmentation
  // =========================================================================

  async createSegment(config) {
    return apiService.post('/analytics/segments', {
      name: config.name,
      definition: config.definition, // { filters, logic: 'and'|'or' }
      description: config.description,
    });
  }

  async getSegmentMembers(segmentId, options = {}) {
    return apiService.get(`/analytics/segments/${segmentId}/members`, { params: options });
  }

  // =========================================================================
  // Real-time Analytics
  // =========================================================================

  async getRealTimeMetrics(metrics = []) {
    return apiService.post('/analytics/realtime', { metrics });
  }

  subscribeToRealTime(metrics, callback) {
    // Would use WebSocket/SSE in production
    return apiService.post('/analytics/realtime/subscribe', { metrics })
      .then(() => {
        // Set up listener
        const unsubscribe = () => {};
        return unsubscribe;
      });
  }

  // =========================================================================
  // Data Quality
  // =========================================================================

  async runDataQualityChecks(config = {}) {
    return apiService.post('/analytics/data-quality', {
      tables: config.tables || 'all',
      checks: config.checks || ['completeness', 'validity', 'consistency', 'uniqueness'],
      threshold: config.threshold || 0.95,
    });
  }

  // =========================================================================
  // Utility
  // =========================================================================

  getScheduledJobs() {
    return Array.from(this.scheduledJobs.entries()).map(([id, job]) => ({
      reportId: id,
      interval: job.interval,
      timezone: job.timezone,
      format: job.format,
      recipients: job.recipients,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
    }));
  }

  clearCache() {
    this.reportCache.clear();
  }
}

const analyticsService = new AnalyticsService();

export { AnalyticsService, analyticsService };
export default analyticsService;