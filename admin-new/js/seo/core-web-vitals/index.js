/**
 * Core Web Vitals - Module Index
 * Exports all CWV functionality
 */

import {
  CWV_METRICS,
  CWV_RATINGS,
  CWV_THRESHOLDS,
  CWV_COLORS,
  CWVMetricKey,
  CWVRating,
  CWVThresholds,
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
  CWVDashboardData,
  DataSource,
  FetchOptions,
  CollectorResult,
  DashboardConfig,
  ChartDataPoint
} from './models.js';
import { CWVCollector, cwvCollector } from './collector.js';
import { CWVScoringEngine, cwvScoringEngine, ScoreBreakdown, ScoringResult, PercentileData } from './scoring.js';
import { CWVDashboard, cwvDashboard, loadChartJS } from './dashboard.js';

export {
  CWV_METRICS,
  CWV_RATINGS,
  CWV_THRESHOLDS,
  CWV_COLORS,
  CWVMetricKey,
  CWVRating,
  CWVThresholds,
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
  CWVDashboardData,
  DataSource,
  FetchOptions,
  CollectorResult,
  DashboardConfig,
  ChartDataPoint
};

export { CWVCollector, cwvCollector };
export { CWVScoringEngine, cwvScoringEngine, ScoreBreakdown, ScoringResult, PercentileData };
export { CWVDashboard, cwvDashboard, loadChartJS };

export const CoreWebVitals = {
  metrics: CWV_METRICS,
  ratings: CWV_RATINGS,
  thresholds: CWV_THRESHOLDS,
  colors: CWV_COLORS,
  collector: cwvCollector,
  scoring: cwvScoringEngine,
  dashboard: cwvDashboard
};

export default CoreWebVitals;