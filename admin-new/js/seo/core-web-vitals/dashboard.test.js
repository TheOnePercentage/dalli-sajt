/**
 * Core Web Vitals - Dashboard Tests
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { cwvDashboard } from './dashboard.js';
import { cwvCollector, cwvScoringEngine } from './index.js';
import { CWV_METRICS, CWV_RATINGS, CWV_THRESHOLDS } from './models.js';

async function runDashboardTests() {
  console.log('🧪 Running CWV Dashboard Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.log(`  ❌ ${message}`);
      failed++;
    }
  }

  // Create a test container
let testContainer = document.createElement('div');
  testContainer.id = 'cwv-test-container';
  testContainer.style.display = 'none';
  document.body.appendChild(testContainer);

  // Test 1: Dashboard initialization
  console.log('\n📝 Test 1: Dashboard initialization');let dashboard = new (await import('./dashboard.js')).CWVDashboard({
    showHistorical: true,
    showTrends: true,
    showComparison: true,
    autoRefresh: false
  });

  assert(typeof dashboard === 'object', 'Dashboard instantiated');
  assert(typeof dashboard.mount === 'function', 'Has mount method');
  assert(typeof dashboard.loadData === 'function', 'Has loadData method');
  assert(typeof dashboard.render === 'function', 'Has render method');
  assert(typeof dashboard.destroy === 'function', 'Has destroy method');

  // Test 2: Mount to container
  console.log('\n📝 Test 2: Mount to container');let container = document.createElement('div');
  container.id = 'cwv-dashboard-test';
  document.body.appendChild(container);

  try {
    dashboard.mount('#cwv-dashboard-test');
    assert(dashboard.container === container, 'Mounted to container');
    container.remove();
  } catch (e) {
    assert(false, `Mount failed: ${e.message}`);
  }

  // Test 3: Empty state rendering
  console.log('\n📝 Test 3: Empty state rendering');let emptyDashboard = new (await import('./dashboard.js')).CWVDashboard();
  emptyDashboard.mount(testContainer);
  emptyDashboard.render();let emptyHtml = testContainer.innerHTML;
  assert(emptyHtml.includes('Core Web Vitals Dashboard'), 'Shows dashboard title');
  assert(emptyHtml.includes('cwv-input-url'), 'Shows URL input');
  assert(emptyHtml.includes('cwv-device-select'), 'Shows device select');
  assert(emptyHtml.includes('cwv-run-audit-btn'), 'Shows audit button');

  // Test 4: Load data (mock)
  console.log('\n📝 Test 4: Load data rendering');let dashboard2 = new (await import('./dashboard.js')).CWVDashboard();let container2 = document.createElement('div');
  document.body.appendChild(container2);
  dashboard2.mount(container2);
  
  // Mock a perfect report
let mockReport = {
    url: 'https://example.com/test',
    timestamp: new Date().toISOString(),
    device: 'mobile',
    metrics: {
      lcp: { metric: 'lcp', value: 2000, rating: 'good', timestamp: new Date().toISOString(), source: 'test' },
      cls: { metric: 'cls', value: 0.05, rating: 'good', timestamp: new Date().toISOString(), source: 'test' },
      inp: { metric: 'inp', value: 150, rating: 'good', timestamp: new Date().toISOString(), source: 'test' },
      fcp: { metric: 'fcp', value: 1500, rating: 'good', timestamp: new Date().toISOString(), source: 'test' },
      ttfb: { metric: 'ttfb', value: 600, rating: 'good', timestamp: new Date().toISOString(), source: 'test' }
    },
    overallScore: 100,
    overallRating: 'good',
    passedCount: 5,
    totalMetrics: 5
  };

  // Test render with data
let dashboard3 = new (await import('./dashboard.js')).CWVDashboard();let container3 = document.createElement('div');
  document.body.appendChild(container3);
  dashboard3.mount(container3);
  
  // Manually set report and render
let dashboard4 = new (await import('./dashboard.js')).CWVDashboard();let container4 = document.createElement('div');
  document.body.appendChild(container4);
  dashboard4.mount(container4);
  dashboard4.currentReport = {
    url: 'https://example.com/test',
    timestamp: new Date().toISOString(),
    device: 'mobile',
    metrics: {
      lcp: { metric: 'lcp', value: 2000, rating: 'good', timestamp: new Date().toISOString(), source: 'test' },
      cls: { metric: 'cls', value: 0.05, rating: 'good', timestamp: new Date().toISOString(), source: 'test' },
      inp: { metric: 'inp', value: 150, rating: 'good', timestamp: new Date().toISOString(), source: 'test' },
      fcp: { metric: 'fcp', value: 1500, rating: 'good', timestamp: new Date().toISOString(), source: 'test' },
      ttfb: { metric: 'ttfb', value: 600, rating: 'good', timestamp: new Date().toISOString(), source: 'test' }
    },
    overallScore: 100,
    overallRating: 'good',
    passedCount: 5,
    totalMetrics: 5,
    timestamp: new Date().toISOString(),
    device: 'mobile'
  };
  dashboard4.currentReport = dashboard4.currentReport;
  dashboard4.render();let html = container4.innerHTML;
  assert(html.includes('Core Web Vitals'), 'Shows CWV title');
  assert(html.includes('100'), 'Shows perfect score');
  assert(html.includes('A'), 'Shows A grade');
  assert(html.includes('Largest Contentful Paint'), 'Shows LCP');
  assert(html.includes('Cumulative Layout Shift'), 'Shows CLS');
  assert(html.includes('Interaction to Next Paint'), 'Shows INP');
  assert(html.includes('First Contentful Paint'), 'Shows FCP');
  assert(html.includes('Time to First Byte'), 'Shows TTFB');

  // Test 5: Progress bars
  console.log('\n📝 Test 5: Progress bars rendering');let html2 = container4.innerHTML;
  assert(html2.includes('Progress Overview'), 'Shows progress section');
  assert(html2.includes('100%'), 'Shows 100% progress');

  // Test 6: Historical data rendering
  console.log('\n📝 Test 6: Historical data rendering');let dashboard5 = new (await import('./dashboard.js')).CWVDashboard({ showHistorical: true });let container5 = document.createElement('div');
  document.body.appendChild(container5);
  dashboard5.mount(container5);
  
  dashboard5.currentReport = {
    url: 'https://example.com/test',
    timestamp: new Date().toISOString(),
    device: 'mobile',
    metrics: {
      lcp: { metric: 'lcp', value: 2000, rating: 'good', timestamp: new Date().toISOString() },
      cls: { metric: 'cls', value: 0.05, rating: 'good', timestamp: new Date().toISOString() },
      inp: { metric: 'inp', value: 150, rating: 'good', timestamp: new Date().toISOString() },
      fcp: { metric: 'fcp', value: 1500, rating: 'good', timestamp: new Date().toISOString() },
      ttfb: { metric: 'ttfb', value: 600, rating: 'good', timestamp: new Date().toISOString() }
    },
    overallScore: 100,
    overallRating: 'good',
    passedCount: 5,
    totalMetrics: 5,
    timestamp: new Date().toISOString(),
    device: 'mobile'
  };
  dashboard5.historicalData = [
    { date: new Date(Date.now() - 86400000).toISOString(), metrics: { lcp: 2500 }, overallScore: 90 },
    { date: new Date().toISOString(), metrics: { lcp: 2000 }, overallScore: 100 }
  ];
  dashboard5.render();let histHtml = document.getElementById('cwv-history-chart') !== null;
  // Note: Chart rendering requires canvas

  // Test 7: Trend indicators
  console.log('\n📝 Test 7: Trend indicators');let dashboard6 = new (await import('./dashboard.js')).CWVDashboard({ showTrends: true });let container6 = document.createElement('div');
  document.body.appendChild(container6);
  dashboard6.mount(container6);
  dashboard6.currentReport = {
    url: 'https://example.com/test',
    metrics: { lcp: { value: 2000 }, cls: { value: 0.05 }, inp: { value: 150 }, fcp: { value: 1500 }, ttfb: { value: 600 } },
    device: 'mobile'
  };
  dashboard6.historicalData = [
    { date: new Date(Date.now() - 7*86400000).toISOString(), metrics: { lcp: 3000 }, overallScore: 80 },
    { date: new Date().toISOString(), metrics: { lcp: 2000 }, overallScore: 100 }
  ];
  dashboard6.render();
  dashboard6.initTrendIndicators();
  
  // Check trend elements exist
let trendEls = document.querySelectorAll('[id^="cwv-trend-"]');
  assert(trendEls.length === 5, '5 trend indicators rendered');

  // Test 8: Empty state
  console.log('\n📝 Test 8: Empty state');let dashboard7 = new (await import('./dashboard.js')).CWVDashboard();let container7 = document.createElement('div');
  document.body.appendChild(container7);
  dashboard7.mount(container7);
  dashboard7.render();
  
  let emptyHtml2 = container7.innerHTML;
  assert(emptyHtml.includes('Core Web Vitals Dashboard'), 'Empty state shows title');
  assert(emptyHtml.includes('cwv-input-url'), 'Shows URL input');
  assert(emptyHtml.includes('cwv-device-select'), 'Shows device select');

  // Test 8: Loading state
  console.log('\n📝 Test 9: Loading state');let dashboard8 = new (await import('./dashboard.js')).CWVDashboard();let container8 = document.createElement('div');
  document.body.appendChild(container8);
  dashboard8.mount(container8);
  dashboard8.showLoading();let loadingHtml = container8.innerHTML;
  assert(loadingHtml.includes('Učitavanje Core Web Vitals'), 'Shows loading message');
  assert(loadingHtml.includes('spin'), 'Has spinner animation');

  // Test 10: Error state
  console.log('\n📝 Test 10: Error state');let dashboard9 = new (await import('./dashboard.js')).CWVDashboard();let container9 = document.createElement('div');
  document.body.appendChild(container9);
  dashboard9.mount(container9);
  dashboard9.showError('Test error message');let errorHtml = container9.innerHTML;
  assert(errorHtml.includes('Greška'), 'Shows error in Serbian');
  assert(errorHtml.includes('Test error message'), 'Shows error message');
  assert(errorHtml.includes('Pokušaj ponovo'), 'Shows retry button');

  // Test 10: Format value helper
  console.log('\n📝 Test 10: Format value helper');let dashboard10 = new (await import('./dashboard.js')).CWVDashboard();
  assert(dashboard10.formatValue(2500, 'ms') === '2.50s', '2500ms = 2.50s');
  assert(dashboard10.formatValue(1500, 'ms') === '1500ms', '1500ms stays ms');
  assert(dashboard10.formatValue(0.1, '') === '0.100', 'CLS 0.1 = 0.100');
  assert(dashboard10.formatValue(250, 'ms') === '250ms', '250ms INP');
  assert(dashboard10.formatValue(5000, 'ms') === '5.00s', '5000ms = 5.00s');

  // Test 11: Rating helpers
  console.log('\n📝 Test 11: Rating helpers');let dashboard11 = new (await import('./dashboard.js')).CWVDashboard();
  assert(dashboard11.getRatingLabel('good') === 'Dobro', 'Good = Dobro');
  assert(dashboard11.getRatingLabel('needs-improvement') === 'Poboljšanje', 'Needs improvement = Poboljšanje');
  assert(dashboard11.getRatingLabel('poor') === 'Loše', 'Poor = Loše');let goodColor = dashboard11.getRatingColor('good');
  assert(goodColor.bg === '#dcfce7', 'Good bg');
  assert(goodColor.text === '#166534', 'Good text color');let poorColor = dashboard11.getRatingColor('poor');
  assert(poorColor.bg === '#fef2f2', 'Poor bg');
  assert(poorColor.text === '#991b1b', 'Poor text');

  // Test 12: Format threshold
  console.log('\n📝 Test 12: Format threshold');let dash = new (await import('./dashboard.js')).CWVDashboard();
  assert(dash.formatThreshold(2500, 'ms') === '2.50s', '2500ms = 2.50s');
  assert(dash.formatThreshold(0.1, '') === '0.100', '0.1 CLS = 0.100');

  // Test 12: Comparison rendering
  console.log('\n📝 Test 12: Comparison section');let dashboard12 = new (await import('./dashboard.js')).CWVDashboard({ showComparison: true });let container12 = document.createElement('div');
  document.body.appendChild(container12);
  dashboard12.mount(container12);
  dashboard12.currentReport = {
    url: 'https://example.com/test',
    metrics: { lcp: { value: 2000 }, cls: { value: 0.05 }, inp: { value: 150 }, fcp: { value: 1500 }, ttfb: { value: 600 } },
    device: 'mobile'
  };
  dashboard12.render();let compHtml = container12.innerHTML;
  assert(compHtml.includes('Competitor Comparison'), 'Shows comparison section');
  assert(compHtml.includes('cwv-competitor-url'), 'Has competitor URL input');
  assert(compHtml.includes('cwv-compare-btn'), 'Has compare button');

  // Test 13: Alerts section
  console.log('\n📝 Test 13: Alerts section');let dashboard13 = new (await import('./dashboard.js')).CWVDashboard();let container13 = document.createElement('div');
  document.body.appendChild(container13);
  dashboard13.mount(container13);
  dashboard13.render();let alertsHtml = container13.innerHTML;
  assert(alertsHtml.includes('CWV Alerts'), 'Shows alerts section');
  assert(alertsHtml.includes('cwv-alerts-container'), 'Has alerts container');

  // Test 13: Destroy method
  console.log('\n📝 Test 10: Destroy method');let dashboard14 = new (await import('./dashboard.js')).CWVDashboard();let container14 = document.createElement('div');
  document.body.appendChild(container14);
  dashboard14.mount(container14);
  dashboard14.render();
  
  dashboard14.destroy();
  assert(dashboard14.container === null, 'Container cleared');
  assert(dashboard14.charts.size === 0, 'Charts cleared');

  // Test: Format threshold helper
  console.log('\n📝 Test 11: Format threshold helper');let dash1 = new (await import('./dashboard.js')).CWVDashboard();
  assert(dash.formatThreshold(2500, 'ms') === '2.50s', 'Format threshold ms');
  assert(dash.formatThreshold(0.1, '') === '0.100', 'Format threshold unitless');
  assert(dash.formatThreshold(200, 'ms') === '200ms', 'Format threshold small ms');

  // Test: Event binding (simulated)
  console.log('\n📝 Test 11: Event binding simulation');let dashboard15 = new (await import('./dashboard.js')).CWVDashboard();let container15 = document.createElement('div');
  document.body.appendChild(container15);
  dashboard15.mount(container15);
  dashboard15.render();
  
  // Check buttons exist
let runBtn = container15.querySelector('#cwv-run-audit-btn');let urlInput = container11.querySelector('#cwv-input-url');let deviceSelect = container15.querySelector('#cwv-device-select');
  
  assert(runBtn !== null, 'Run audit button exists');
  assert(urlInput !== null, 'URL input exists');
  assert(deviceSelect !== null, 'Device select exists');
  
  // Clean up test containers
  [testContainer, container2, container3, container4, container5, container6, container7, container8, container9, container12, container13, container14, container15].forEach(c => c.remove());

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All Dashboard Tests Passed!' : `\n⚠️ ${failed} test(s) failed`);

  return { passed, failed };
}

export { runDashboardTests };

if (typeof document !== 'undefined') {
  runDashboardTests().catch(console.error);
}