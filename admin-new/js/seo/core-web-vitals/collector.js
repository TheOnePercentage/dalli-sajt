/**
 * Core Web Vitals - Data Collector
 * Fetches and parses CWV metrics from multiple sources:
 * - Chrome User Experience Report (CrUX) API
 * - Real User Monitoring (RUM) endpoint
 * - Synthetic testing (Lighthouse, WebPageTest)
 * - Manual entry
 */

import { 
  CWV_METRICS, 
  CWV_RATINGS,
  CWV_THRESHOLDS,
  CWVMetricKey,
  CWVMetricValue,
  CWVPageReport,
  CWVHistoricalPoint,
  CWVConfig,
  DEFAULT_CWV_CONFIG,
  getRating,
  getMetricScore,
  getOverallScore,
  getOverallRating
 } from './models.js';

export class CWVCollector {
  config;
  sources = new Map();
  cache = new Map();
  cacheTTL = 1000 * 60 * 60 * 6; // 6 hours

  constructor(config = {}) {
    this.config = { ...DEFAULT_CWV_CONFIG, ...config };
    this.initializeDefaultSources();
  }

  initializeDefaultSources() {
    // CrUX API Source
    this.registerSource({
      name: 'CrUX API',
      type: 'crux',
      enabled: true,
      priority: 1,
      fetch: this.fetchFromCrUX.bind(this)
    });

    // RUM Source (placeholder - would connect to your RUM endpoint)
    this.registerSource({
      name: 'RUM Endpoint',
      type: 'rum',
      enabled: false,
      priority: 2,
      fetch: this.fetchFromRUM.bind(this)
    });

    // Synthetic Source (placeholder - would connect to Lighthouse CI, WebPageTest, etc.)
    this.registerSource({
      name: 'Synthetic Tests',
      type: 'synthetic',
      enabled: false,
      priority: 3,
      fetch: this.fetchFromSynthetic.bind(this)
    });

    // Manual entry source
    this.registerSource({
      name: 'Manual Entry',
      type: 'manual',
      enabled: true,
      priority: 4,
      fetch: async () => null // Manual entry handled separately
    });
  }

  registerSource(source) {
    this.sources.set(source.name, source);
  }

  enableSource(name, enabled) {
    const source = this.sources.get(name);
    if (source) source.enabled = enabled;
  }

  setCrUXApiKey(apiKey) {
    this.config.dataSources.cruxApiKey = apiKey;
  }

  setRumEndpoint(endpoint) {
    this.config.dataSources.rumEndpoint = endpoint;
  }

  async collect(url, options = {}) {
    const cacheKey = `${url}:${options.device || 'mobile'}:${options.dateRange?.start || ''}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return { ...cached.data, _cached: true };
    }

    // Try sources in priority order
    const sortedSources = Array.from(this.sources.values())
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const source of sortedSources) {
      try {
        const result = await this.fetchWithTimeout(source.fetch(url, options), 10000);
        if (result) {
          // Validate and enrich data
          const validated = this.validateAndEnrich(result, url, options.device || 'mobile', source.type);
          this.cache.set(cacheKey, { data: validated, timestamp: Date.now() });
          return validated;
        }
      } catch (error) {
        console.warn(`Source ${source.name} failed:`, error);
        continue;
      }
    }

    // Return empty/default if all sources fail
    return this.getDefaultMetrics(url, options.device || 'mobile');
  }

  async fetchWithTimeout(promise, ms) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
    return Promise.race([promise, timeout]);
  }

  async fetchFromCrUX(url, options) {
    const apiKey = this.config.dataSources.cruxApiKey;
    if (!apiKey) {
      console.warn('CrUX API key not configured');
      return null;
    }

    try {
      const apiUrl = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${apiKey}`;
      const body = {
        origin: new URL(url).origin,
        ...(options.device && { formFactor: options.device.toUpperCase() })
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        if (response.status === 404) return null; // No data for this origin
        throw new Error(`CrUX API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseCrUXRecord(data.record, 'crux');
    } catch (error) {
      console.warn('CrUX fetch failed:', error);
      return null;
    }
  }

  parseCrUXRecord(record, source) {
    const metrics = {};

    const metricMapping = {
      LCP: 'largestContentfulPaint',
      CLS: 'cumulativeLayoutShift',
      INP: 'interactionToNextPaint',
      FCP: 'firstContentfulPaint',
      TTFB: 'timeToFirstByte'
    };

    for (const [metricKey, cruxKey] of Object.entries(metricMapping)) {
      const cruxMetric = record.metrics?.[cruxKey];
      if (cruxMetric && cruxMetric.histogram) {
        // Calculate 75th percentile (p75) from histogram
        const p75 = this.calculatePercentile(cruxMetric.histogram, 75);
        const thresholds = CWV_THRESHOLDS[metricKey];
        const rating = getRating(p75, thresholds);
        
        metrics[metricKey] = {
          metric: metricKey,
          value: p75,
          rating,
          timestamp: new Date().toISOString(),
          source: source
        };
      }
    }

    return metrics;
  }

  calculatePercentile(histogram, percentile) {
    // Sort by start value
    const sorted = [...histogram].sort((a, b) => a.start - b.start);
    let cumulative = 0;
    const target = percentile / 100;

    for (const bin of sorted) {
      cumulative += bin.density;
      if (cumulative >= target) {
        // Linear interpolation within bin
        const binStart = bin.start;
        const binEnd = bin.end || binStart;
        const binDensity = bin.density;
        const overshoot = cumulative - target;
        return binStart + (binEnd - binStart) * (1 - overshoot / binDensity);
      }
    }

    // Fallback: return last bin end
    return sorted[sorted.length - 1].end || sorted[sorted.length - 1].start;
  }

  async fetchFromRUM(url, options) {
    const endpoint = this.config.dataSources.rumEndpoint;
    if (!endpoint) return null;

    try {
      const response = await fetch(`${endpoint}?url=${encodeURIComponent(url)}&device=${options.device || 'mobile'}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) return null;
      const data = await response.json();
      
      return this.parseRUMData(data);
    } catch (error) {
      console.warn('RUM fetch failed:', error);
      return null;
    }
  }

  parseRUMData(data) {
    const metrics = {};

    for (const metricKey of Object.values(CWV_METRICS)) {
      const value = data[metricKey];
      if (value !== undefined) {
        const thresholds = CWV_THRESHOLDS[metricKey];
        metrics[metricKey] = {
          metric: metricKey,
          value: typeof value === 'number' ? value : parseFloat(value),
          rating: getRating(value, CWV_THRESHOLDS[metricKey]),
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'rum'
        };
      }
    }

    return metrics;
  }

  async fetchFromSynthetic(url, options) {
    // Placeholder for Lighthouse CI, WebPageTest, etc.
    // Would integrate with your CI/CD pipeline or external API
    return null;
  }

  validateAndEnrich(
    rawMetrics,
    url,
    device,
    sourceType
  ) {
    const enriched = {};

    for (const metricKey of Object.values(CWV_METRICS)) {
      const raw = rawMetrics[metricKey];
      const thresholds = CWV_THRESHOLDS[metricKey];

      if (raw && typeof raw.value === 'number') {
        enriched[metricKey] = {
          metric: metricKey,
          value: raw.value,
          rating: raw.rating || getRating(raw.value, thresholds),
          timestamp: raw.timestamp || new Date().toISOString(),
          url,
          device,
          source: raw.source || sourceType
        };
      } else {
        // Provide default/placeholder
        enriched[metricKey] = this.getDefaultMetric(metricKey, url, device, sourceType);
      }
    }

    return enriched;
  }

  getDefaultMetrics(url, device) {
    const metrics = {};
    for (const metricKey of Object.values(CWV_METRICS)) {
      metrics[metricKey] = this.getDefaultMetric(metricKey, url, device, 'manual');
    }
    return metrics;
  }

  getDefaultMetric(metricKey, url, device, source) {
    const thresholds = CWV_THRESHOLDS[metricKey];
    // Return mid-range "needs improvement" as default
    const defaultValue = (thresholds.good + thresholds.poor) / 2;
    
    return {
      metric: metricKey,
      value: defaultValue,
      rating: CWV_RATINGS.NEEDS_IMPROVEMENT,
      timestamp: new Date().toISOString(),
      url,
      device,
      source: source
    };
  }

  // Public API for manual entry
  async setManualMetrics(url, metrics, device = 'mobile') {
    const enriched = {};

    for (const metricKey of Object.values(CWV_METRICS)) {
      const value = metrics[metricKey];
      const thresholds = CWV_THRESHOLDS[metricKey];
      
      if (value !== undefined && typeof value === 'number') {
        enriched[metricKey] = {
          metric: metricKey,
          value,
          rating: getRating(value, thresholds),
          timestamp: new Date().toISOString(),
          url,
          device,
          source: 'manual'
        };
      } else {
        enriched[metricKey] = this.getDefaultMetric(metricKey, url, device, 'manual');
      }
    }

    return enriched;
  }

  // Generate full page report
  async generatePageReport(url, options = {}) {
    const metrics = await this.collect(url, options);
    
    const overallScore = getOverallScore(metrics, this.config.weights);
    const overallRating = getOverallRating(overallScore);
    
    let passedCount = 0;
    for (const metric of Object.values(metrics)) {
      if (metric.rating === CWV_RATINGS.GOOD) passedCount++;
    }

    return {
      url,
      timestamp: new Date().toISOString(),
      device: options.device || 'mobile',
      metrics,
      overallScore,
      overallRating,
      passedCount,
      totalMetrics: 5
    };
  }

  // Historical data management
  async saveHistoricalPoint(report) {
    const key = `history:${report.url}:${report.device}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({
      date: report.timestamp,
      metrics: Object.fromEntries(
        Object.entries(report.metrics).map(([k, v]) => [k, v.value])
      ),
      overallScore: report.overallScore,
      sampleCount: 1
    });

    // Keep last 90 days
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const filtered = existing.filter((p) => new Date(p.date).getTime() > cutoff);
    
    localStorage.setItem(key, JSON.stringify(filtered.slice(-90)));
  }

  async getHistoricalData(url, device, days = 30) {
    const key = `history:${url}:${device}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    return data
      .filter((p) => new Date(p.date).getTime() > cutoff)
      .map((p) => ({
        date: p.date,
        metrics: p.metrics,
        overallScore: p.overallScore,
        sampleCount: p.sampleCount
      }));
  }

  // Trend analysis
  calculateTrend(historical, metricKey) {
    if (historical.length < 2) return { trend: 'stable', changePercent: 0 };

    const recent = historical.slice(-7);
    const older = historical.slice(-14, -7);

    const recentAvg = recent.reduce((sum, p) => sum + p.metrics[metricKey], 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.metrics[metricKey], 0) / older.length;

    if (olderAvg === 0) return { trend: 'stable', changePercent: 0 };

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (Math.abs(change) < 5) return { trend: 'stable', changePercent: change };
    return { trend: change < 0 ? 'improving' : 'declining', changePercent: change };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const cwvCollector = new CWVCollector();

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

// Export runtime classes for validation/creation
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

// Export aliases for backward compatibility
export const DataSource = DataSourceClass;
export const FetchOptions = FetchOptionsClass;
export const CollectorResult = CollectorResultClass;
