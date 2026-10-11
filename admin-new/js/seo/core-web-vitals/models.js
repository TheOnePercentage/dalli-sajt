/**
 * Core Web Vitals - Data Models
 * JavaScript version for browser compatibility
 */

export const CWV_METRICS = {
  LCP: 'lcp',
  CLS: 'cls',
  INP: 'inp',
  FCP: 'fcp',
  TTFB: 'ttfb'
};

export const CWV_RATINGS = {
  GOOD: 'good',
  NEEDS_IMPROVEMENT: 'needs-improvement',
  POOR: 'poor'
};

export const CWV_COLORS = {
  [CWV_RATINGS.GOOD]: {
    bg: '#dcfce7',
    border: '#86efac',
    text: '#166534',
    label: 'Dobro',
    shortLabel: '✓'
  },
  [CWV_RATINGS.NEEDS_IMPROVEMENT]: {
    bg: '#fef9c3',
    border: '#fde047',
    text: '#854d0e',
    label: 'Poboljšanje',
    shortLabel: '⚠'
  },
  [CWV_RATINGS.POOR]: {
    bg: '#fef2f2',
    border: '#fca5a5',
    text: '#991b1b',
    label: 'Loše',
    shortLabel: '✗'
  }
};

export const CWV_THRESHOLDS = {
  [CWV_METRICS.LCP]: {
    good: 2500,
    poor: 4000,
    unit: 'ms',
    label: 'Largest Contentful Paint',
    description: 'Vreme učitavanja najvećeg elementa na ekranu'
  },
  [CWV_METRICS.CLS]: {
    good: 0.1,
    poor: 0.25,
    unit: '',
    label: 'Cumulative Layout Shift',
    description: 'Kumulativni pomeraj rasporeda - vizuelna stabilnost'
  },
  [CWV_METRICS.INP]: {
    good: 200,
    poor: 500,
    unit: 'ms',
    label: 'Interaction to Next Paint',
    description: 'Odgovornost interakcija - latencija klik/unos'
  },
  [CWV_METRICS.FCP]: {
    good: 1800,
    poor: 3000,
    unit: 'ms',
    label: 'First Contentful Paint',
    description: 'Vreme do prvog sadržaja na ekranu'
  },
  [CWV_METRICS.TTFB]: {
    good: 800,
    poor: 1800,
    unit: 'ms',
    label: 'Time to First Byte',
    description: 'Vreme do prvog bajta - server response time'
  }
};
// Alias for camelCase import compatibility
export const CWVThresholds = CWV_THRESHOLDS;

// CWVConfig object structure (for JSDoc reference)
/**
 * @typedef {Object} CWVConfig
 * @property {Object} thresholds
 * @property {Object} weights
 * @property {Object} ratingColors
 * @property {Object} dataSources
 * @property {Object} alertThresholds
 */

export const DEFAULT_CWV_CONFIG = {
  thresholds: CWV_THRESHOLDS,
  weights: {
    [CWV_METRICS.LCP]: 0.25,
    [CWV_METRICS.CLS]: 0.25,
    [CWV_METRICS.INP]: 0.25,
    [CWV_METRICS.FCP]: 0.125,
    [CWV_METRICS.TTFB]: 0.125
  },
  ratingColors: {
    [CWV_RATINGS.GOOD]: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
    [CWV_RATINGS.NEEDS_IMPROVEMENT]: { bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
    [CWV_RATINGS.POOR]: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' }
  },
  dataSources: {},
  alertThresholds: {
    regressionPercent: 20,
    minimumSamples: 100
  }
};

export function getRating(value, thresholds) {
  if (value <= thresholds.good) return CWV_RATINGS.GOOD;
  if (value <= thresholds.poor) return CWV_RATINGS.NEEDS_IMPROVEMENT;
  return CWV_RATINGS.POOR;
}

export function getMetricScore(value, thresholds) {
  if (value <= thresholds.good) return 100;
  if (value >= thresholds.poor) return 0;
  
  const range = thresholds.poor - thresholds.good;
  const position = value - thresholds.good;
  return Math.round(100 - (position / range) * 100);
}

export function getOverallScore(metrics, weights) {
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const [metric, weight] of Object.entries(weights)) {
    const metricData = metrics[metric];
    if (metricData) {
      weightedSum += metricData.rating === 'good' ? 100 * weight :
                    metricData.rating === 'needs-improvement' ? 50 * weight : 0 * weight;
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

export function getOverallRating(score) {
  if (score >= 90) return CWV_RATINGS.GOOD;
  if (score >= 50) return CWV_RATINGS.NEEDS_IMPROVEMENT;
  return CWV_RATINGS.POOR;
}

export function formatValue(value, unit) {
  if (unit === 'ms') {
    if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
    return `${Math.round(value)}ms`;
  }
  if (unit === '') return value.toFixed(3);
  return `${value}${unit}`;
}

export function getColorForRating(rating) {
  return CWV_COLORS[rating];
}

export const CWV_METRIC_ORDER = [
  CWV_METRICS.LCP,
  CWV_METRICS.CLS,
  CWV_METRICS.INP,
  CWV_METRICS.FCP,
  CWV_METRICS.TTFB
];

// Export constants for external reference
export const CWVMetricKey = Object.keys(CWV_METRICS);
export const CWVRating = Object.values(CWV_RATINGS);

// ============================================================
// Type Definitions (JSDoc + runtime classes for validation)
// ============================================================

/**
 * @typedef {Object} CWVMetricValue
 * @property {number} value - The metric value
 * @property {string} rating - 'good' | 'needs-improvement' | 'poor'
 * @property {number} score - 0-100 score
 * @property {string} metric - The metric name (LCP, CLS, INP, etc.)
 * @property {number} timestamp - Unix timestamp
 * @property {string} [url] - Page URL
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} CWVPageReport
 * @property {string} url - Page URL
 * @property {number} timestamp - Unix timestamp
 * @property {Object.<string, CWVMetricValue>} metrics - Metric values by name
 * @property {number} overallScore - 0-100 overall score
 * @property {string} overallRating - 'good' | 'needs-improvement' | 'poor'
 * @property {Object.<string, number>} weights - Metric weights used
 * @property {string} userAgent - User agent string
 * @property {string} [device] - Device type (mobile/desktop)
 * @property {string} [connection] - Connection type
 */

/**
 * @typedef {Object} CWVHistoricalPoint
 * @property {number} timestamp - Unix timestamp
 * @property {Object.<string, number>} metrics - Metric values
 * @property {number} overallScore - 0-100 overall score
 * @property {string} overallRating - 'good' | 'needs-improvement' | 'poor'
 * @property {number} sampleCount - Number of samples
 */

/**
 * @typedef {Object} CWVConfig
 * @property {Object} thresholds - Metric thresholds
 * @property {Object} weights - Metric weights
 * @property {Object} ratingColors - Color configuration
 * @property {Object} dataSources - Data source configuration
 * @property {Object} alertThresholds - Alert configuration
 */

/**
 * @typedef {Object} CWVAlert
 * @property {string} id - Alert ID
 * @property {string} type - Alert type ('regression' | 'threshold' | 'missing-data')
 * @property {string} metric - Metric name
 * @property {string} severity - 'warning' | 'critical'
 * @property {string} message - Alert message
 * @property {number} timestamp - Unix timestamp
 * @property {Object} metadata - Additional data
 * @property {boolean} acknowledged - Whether acknowledged
 */

/**
 * @typedef {Object} CWVTarget
 * @property {string} metric - Metric name
 * @property {number} targetValue - Target value
 * @property {number} currentValue - Current value
 * @property {number} deadline - Unix timestamp deadline
 * @property {string} status - 'on-track' | 'at-risk' | 'off-track'
 */

/**
 * @typedef {Object} CWVDashboardData
 * @property {Object.<string, CWVPageReport[]>} pages - Reports by page URL
 * @property {Object.<string, CWVHistoricalPoint[]>} history - Historical data by metric
 * @property {Object.<string, CWVAlert[]>} alerts - Active alerts
 * @property {Object.<string, CWVTarget[]>} targets - Performance targets
 * @property {Object} summary - Summary statistics
 * @property {number} lastUpdated - Unix timestamp
 */

/**
 * @typedef {Object} DataSource
 * @property {string} id - Data source ID
 * @property {string} name - Data source name
 * @property {string} type - 'crux' | 'web-vitals' | 'custom'
 * @property {Object} config - Source configuration
 * @property {boolean} enabled - Whether enabled
 * @property {number} lastFetch - Last fetch timestamp
 */

/**
 * @typedef {Object} FetchOptions
 * @property {string} [startDate] - Start date (ISO string)
 * @property {string} [endDate] - End date (ISO string)
 * @property {string[]} [metrics] - Metrics to fetch
 * @property {string[]} [urls] - URLs to fetch
 * @property {number} [limit] - Max results
 * @property {boolean} [useCache] - Whether to use cache
 */

/**
 * @typedef {Object} CollectorResult
 * @property {boolean} success - Whether collection succeeded
 * @property {Object[]} data - Collected data points
 * @property {number} count - Number of records
 * @property {string[]} errors - Any errors
 * @property {number} duration - Collection duration (ms)
 * @property {number} timestamp - Collection timestamp
 */

/**
 * @typedef {Object} DashboardConfig
 * @property {string[]} metrics - Metrics to display
 * @property {string} timeRange - Time range (e.g., '7d', '30d')
 * @property {string} granularity - 'hour' | 'day' | 'week'
 * @property {Object} filters - Filter configuration
 * @property {boolean} realTime - Whether real-time updates
 */

/**
 * @typedef {Object} ChartDataPoint
 * @property {number} x - X value (timestamp)
 * @property {number} y - Y value (metric value)
 */

/**
 * @typedef {Object} CWVTrendData
 * @property {string} metric - Metric name
 * @property {number} slope - Trend slope (positive = improving)
 * @property {string} direction - 'improving' | 'degrading' | 'stable'
 * @property {number} confidence - Confidence level 0-1
 * @property {number} period - Time period in days
 */

/**
 * @typedef {Object} CWVThresholds
 * @property {Object.<string, {good: number, poor: number, unit: string, label: string, description: string}>} thresholds - Metric thresholds
 */

/**
 * @typedef {Object} CWVTrendData
 * @property {string} metric - Metric name
 * @property {number} slope - Trend slope (positive = improving)
 * @property {string} direction - 'improving' | 'degrading' | 'stable'
 * @property {number} confidence - Confidence level 0-1
 * @property {number} period - Time period in days
 */

export class CWVTrendDataClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

export const CWVTrendData = CWVTrendDataClass;

// Runtime classes for validation/creation
export class CWVMetricValueClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

export class CWVPageReportClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

export class CWVHistoricalPointClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

export class CWVConfigClass {
  constructor(data = {}) {
    Object.assign(this, {
      thresholds: CWV_THRESHOLDS,
      weights: DEFAULT_CWV_CONFIG.weights,
      ratingColors: DEFAULT_CWV_CONFIG.ratingColors,
      dataSources: {},
      alertThresholds: DEFAULT_CWV_CONFIG.alertThresholds,
      ...data
    });
  }
}

export class CWVAlertClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

export class CWVTargetClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

export class CWVDashboardDataClass {
  constructor(data = {}) {
    Object.assign(this, {
      pages: {},
      history: {},
      alerts: [],
      targets: [],
      summary: {},
      lastUpdated: Date.now(),
      ...data
    });
  }
}

export class DataSourceClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

export class FetchOptionsClass {
  constructor(data = {}) {
    Object.assign(this, {
      startDate: null,
      endDate: null,
      metrics: null,
      urls: null,
      limit: 100,
      useCache: true,
      ...data
    });
  }
}

export class CollectorResultClass {
  constructor(data = {}) {
    Object.assign(this, {
      success: false,
      data: [],
      count: 0,
      errors: [],
      duration: 0,
      timestamp: Date.now(),
      ...data
    });
  }
}

export class DashboardConfigClass {
  constructor(data = {}) {
    Object.assign(this, {
      metrics: CWV_METRIC_ORDER,
      timeRange: '30d',
      granularity: 'day',
      filters: {},
      realTime: false,
      ...data
    });
  }
}

export class ChartDataPointClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

// Export aliases for backward compatibility
export const CWVMetricValue = CWVMetricValueClass;
export const CWVPageReport = CWVPageReportClass;
export const CWVHistoricalPoint = CWVHistoricalPointClass;
export const CWVConfig = CWVConfigClass;
export const CWVAlert = CWVAlertClass;
export const CWVTarget = CWVTargetClass;
export const CWVDashboardData = CWVDashboardDataClass;
export const DataSource = DataSourceClass;
export const FetchOptions = FetchOptionsClass;
export const CollectorResult = CollectorResultClass;
export const DashboardConfig = DashboardConfigClass;
export const ChartDataPoint = ChartDataPointClass;

// Export types for TypeScript consumers
/**
 * @typedef {CWVMetricValueClass} CWVMetricValue
 * @typedef {CWVPageReportClass} CWVPageReport
 * @typedef {CWVHistoricalPointClass} CWVHistoricalPoint
 * @typedef {CWVConfigClass} CWVConfig
 * @typedef {CWVAlertClass} CWVAlert
 * @typedef {CWVTargetClass} CWVTarget
 * @typedef {CWVDashboardDataClass} CWVDashboardData
 * @typedef {DataSourceClass} DataSource
 * @typedef {FetchOptionsClass} FetchOptions
 * @typedef {CollectorResultClass} CollectorResult
 * @typedef {DashboardConfigClass} DashboardConfig
 * @typedef {ChartDataPointClass} ChartDataPoint
 */