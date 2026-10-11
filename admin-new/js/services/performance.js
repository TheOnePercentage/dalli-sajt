/**
 * Performance Monitoring - Web Vitals + Custom Metrics
 * Tracks LCP, FID, CLS, TTFB, INP and custom admin metrics
 */

const METRICS_BUFFER_SIZE = 100;
const REPORT_INTERVAL = 30000;

class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      sampleRate: options.sampleRate || 1.0,
      endpoint: options.endpoint || '/api/admin/performance/metrics',
      debug: options.debug || false,
      ...options
    };

    this.metrics = {
      webVitals: [],
      navigation: [],
      resources: [],
      custom: [],
      api: []
    };
    this.observers = [];
    this.reportTimer = null;
    this.sessionId = this.generateSessionId();
    this.pageLoadTime = performance.now();

    if (this.options.enabled) {
      this.init();
    }
  }

  generateSessionId() {
    return 'perf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  init() {
    this.observeWebVitals();
    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observeLongTasks();
    this.startPeriodicReporting();
    this.trackPageVisibility();
  }

  observeWebVitals() {
    if (!window.PerformanceObserver) return;

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordWebVital('LCP', lastEntry.startTime, lastEntry);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(lcpObserver);
    } catch (e) {}

    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordWebVital('FID', entry.processingStart - entry.startTime, entry);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      this.observers.push(fidObserver);
    } catch (e) {}

    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        let sessionEntries = [];
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            sessionEntries.push(entry);
          }
        });
        if (clsValue > 0) {
          this.recordWebVital('CLS', clsValue, { entries: sessionEntries });
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(clsObserver);
    } catch (e) {}

    try {
      const ttfbObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordWebVital('TTFB', entry.responseStart - entry.requestStart, entry);
        });
      });
      ttfbObserver.observe({ type: 'navigation', buffered: true });
      this.observers.push(ttfbObserver);
    } catch (e) {}

    try {
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordWebVital('INP', entry.duration, entry);
        });
      });
      inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      this.observers.push(inpObserver);
    } catch (e) {}
  }

  observeNavigationTiming() {
    if (!window.PerformanceObserver) return;

    try {
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordNavigationTiming(entry);
        });
      });
      navObserver.observe({ type: 'navigation', buffered: true });
      this.observers.push(navObserver);
    } catch (e) {}
  }

  observeResourceTiming() {
    if (!window.PerformanceObserver) return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
            this.recordApiTiming(entry);
          }
        });
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
      this.observers.push(resourceObserver);
    } catch (e) {}
  }

  observeLongTasks() {
    if (!window.PerformanceObserver) return;

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordCustomMetric('long-task', entry.duration, {
            name: entry.name,
            startTime: entry.startTime,
            attribution: entry.attribution
          });
        });
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
      this.observers.push(longTaskObserver);
    } catch (e) {}
  }

  recordWebVital(name, value, entry) {
    const metric = {
      name,
      value: Math.round(value),
      rating: this.rateWebVital(name, value),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.pathname,
      entry: entry ? this.serializeEntry(entry) : null
    };

    this.metrics.webVitals.push(metric);
    this.trimBuffer(this.metrics.webVitals);

    if (this.options.debug) {
      console.log('[Performance]', name, metric);
    }
  }

  rateWebVital(name, value) {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 }
    };

    const t = thresholds[name];
    if (!t) return 'unknown';
    if (value <= t.good) return 'good';
    if (value >= t.poor) return 'poor';
    return 'needs-improvement';
  }

  recordNavigationTiming(entry) {
    const metric = {
      type: entry.type,
      dns: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
      tcp: Math.round(entry.connectEnd - entry.connectStart),
      tls: entry.secureConnectionStart ? Math.round(entry.connectEnd - entry.secureConnectionStart) : 0,
      ttfb: Math.round(entry.responseStart - entry.requestStart),
      download: Math.round(entry.responseEnd - entry.responseStart),
      domInteractive: Math.round(entry.domInteractive - entry.fetchStart),
      domComplete: Math.round(entry.domComplete - entry.fetchStart),
      loadComplete: Math.round(entry.loadEventEnd - entry.fetchStart),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.pathname
    };

    this.metrics.navigation.push(metric);
    this.trimBuffer(this.metrics.navigation);
  }

  recordResourceTiming(entry) {
    const metric = {
      name: entry.name,
      type: entry.initiatorType,
      duration: Math.round(entry.duration),
      size: entry.transferSize || 0,
      encodedSize: entry.encodedBodySize || 0,
      decodedSize: entry.decodedBodySize || 0,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.metrics.resources.push(metric);
    this.trimBuffer(this.metrics.resources);
  }

  recordApiTiming(entry) {
    const url = new URL(entry.name, window.location.origin);
    const isApiCall = url.pathname.startsWith('/api/');

    const metric = {
      url: entry.name,
      method: 'GET',
      duration: Math.round(entry.duration),
      status: isApiCall ? 'unknown' : 'cached',
      size: entry.transferSize || 0,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.metrics.api.push(metric);
    this.trimBuffer(this.metrics.api);
  }

  recordCustomMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.pathname
    };

    this.metrics.custom.push(metric);
    this.trimBuffer(this.metrics.custom);
  }

  trackApiCall(method, url, duration, status, size = 0) {
    const metric = {
      url,
      method: method.toUpperCase(),
      duration: Math.round(duration),
      status,
      size,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.metrics.api.push(metric);
    this.trimBuffer(this.metrics.api);
  }

  trackSectionLoad(sectionName, duration) {
    this.recordCustomMetric('section-load', duration, { section: sectionName });
  }

  trackComponentRender(componentName, duration) {
    this.recordCustomMetric('component-render', duration, { component: componentName });
  }

  trackInteraction(action, duration) {
    this.recordCustomMetric('interaction', duration, { action });
  }

  trimBuffer(buffer) {
    if (buffer.length > METRICS_BUFFER_SIZE) {
      buffer.splice(0, buffer.length - METRICS_BUFFER_SIZE);
    }
  }

  serializeEntry(entry) {
    return {
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration
    };
  }

  startPeriodicReporting() {
    this.reportTimer = setInterval(() => this.report(), REPORT_INTERVAL);
  }

  trackPageVisibility() {
    document.addEventListener('visibilitychange', () => {
      this.recordCustomMetric('visibility-change', document.hidden ? 0 : 1, {
        hidden: document.hidden
      });
    });
  }

  async report() {
    if (!this.hasMetrics()) return;

    const payload = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: { ...this.metrics }
    };

    if (this.options.debug) {
      console.log('[Performance] Reporting:', payload);
    }

    try {
      await fetch(this.options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (e) {
      if (this.options.debug) {
        console.warn('[Performance] Report failed:', e);
      }
    }
  }

  hasMetrics() {
    return Object.values(this.metrics).some(arr => arr.length > 0);
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getSummary() {
    const webVitals = this.metrics.webVitals;
    const summary = {};

    ['LCP', 'FID', 'CLS', 'TTFB', 'INP'].forEach(name => {
      const entries = webVitals.filter(m => m.name === name);
      if (entries.length > 0) {
        const values = entries.map(e => e.value).sort((a, b) => a - b);
        summary[name] = {
          count: entries.length,
          p50: values[Math.floor(values.length * 0.5)],
          p75: values[Math.floor(values.length * 0.75)],
          p95: values[Math.floor(values.length * 0.95)],
          ratings: entries.reduce((acc, e) => {
            acc[e.rating] = (acc[e.rating] || 0) + 1;
            return acc;
          }, {})
        };
      }
    });

    return summary;
  }

  destroy() {
    this.observers.forEach(o => o.disconnect());
    this.observers = [];
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }
}

const performanceMonitor = new PerformanceMonitor();

export { PerformanceMonitor, performanceMonitor };
export default performanceMonitor;