/**
 * Core Web Vitals - Module Index
 * Exports all CWV functionality
 */

export {
  CWV_METRICS,
  CWV_RATINGS,
  CWV_THRESHOLDS,
  CWV_COLORS,
  CWVMetricKey,
  CWVRating,
  CWVThresholds,
  CWVMetricValue,
  CWVPageReport,
  CWVHistoricalPoint,
  CWVTrendData,
  CWVConfig,
  DEFAULT_CWV_CONFIG,
  getRating,
  getMetricScore,
  getOverallScore,
  getOverallRating,
  formatValue,
  getColorForRating,
  CWV_METRIC_ORDER,
  CWVAlert,
  CWVTarget,
  CWVDashboardData } from
'./models.js';

export { CWVCollector, cwvCollector, DataSource, FetchOptions, CollectorResult } from './collector.js';
export { CWVScoringEngine, cwvScoringEngine, ScoreBreakdown, ScoringResult, PercentileData } from './scoring.js';
export { CWVDashboard, DashboardConfig, ChartDataPoint } from './dashboard.js';

export { loadChartJS, Chart } from './dashboard.js';

export const CoreWebVitals = {
  metrics: CWV_METRICS,
  ratings: CWV_RATINGS,
  thresholds: CWV_THRESHOLDS,
  colors: CWV_COLORS,
  collector: cwvCollector,
  scoring: cwvScoringEngine,
  dashboard: null // Set after dashboard import
};

export default CoreWebVitals;