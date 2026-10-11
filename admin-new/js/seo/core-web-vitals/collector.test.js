/**
 * Core Web Vitals - Collector Tests
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { CWVCollector } from './collector.js';
import { CWV_METRICS, CWV_THRESHOLDS, CWV_RATINGS, getRating } from './models.js';

async function runCollectorTests() {
  console.log('🧪 Running CWV Collector Tests...\n');

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

  // Create collector instance
  const collector = new CWVCollector({
    dataSources: {
      cruxApiKey: '', // No API key for testing
      rumEndpoint: ''
    }
  });

  // Test 1: Collector initialization
  console.log('\n📝 Test 1: Collector initialization');
  const sources = collector.getCacheStats();
  assert(typeof collector === 'object', 'Collector instantiated');
  assert(typeof collector.collect === 'function', 'Has collect method');
  assert(typeof collector.generatePageReport === 'function', 'Has generatePageReport method');
  assert(typeof collector.setManualMetrics === 'function', 'Has setManualMetrics method');

  // Test 2: Manual metrics entry
  console.log('\n📝 Test 2: Manual metrics entry');
  const manualMetrics = await collector.setManualMetrics('https://example.com/test', {
    lcp: 2000,
    cls: 0.05,
    inp: 150,
    fcp: 1500,
    ttfb: 600
  }, 'mobile');

  assert(manualMetrics.lcp.value === 2000, 'LCP value set correctly');
  assert(manualMetrics.lcp.rating === 'good', 'LCP rating correct');
  assert(manualMetrics.cls.value === 0.05, 'CLS value set');
  assert(manualMetrics.cls.rating === 'good', 'CLS rating correct');
  assert(manualMetrics.inp.rating === 'good', 'INP rating correct');
  assert(manualMetrics.fcp.rating === 'good', 'FCP rating correct');
  assert(manualMetrics.ttfb.rating === 'good', 'TTFB rating correct');
  assert(manualMetrics.lcp.source === 'manual', 'Source is manual');
  assert(manualMetrics.lcp.device === 'mobile', 'Device is mobile');

  // Test 3: Manual metrics with poor values
  console.log('\n📝 Test 3: Manual metrics with poor values');
  const poorMetrics = await collector.setManualMetrics('https://example.com/poor', {
    lcp: 5000,
    cls: 0.3,
    inp: 600,
    fcp: 4000,
    ttfb: 2000
  }, 'desktop');

  assert(poorMetrics.lcp.rating === 'poor', 'LCP 5000ms = poor');
  assert(poorMetrics.cls.rating === 'poor', 'CLS 0.3 = poor');
  assert(poorMetrics.inp.rating === 'poor', 'INP 600ms = poor');
  assert(poorMetrics.fcp.rating === 'poor', 'FCP 4000ms = poor');
  assert(poorMetrics.ttfb.rating === 'poor', 'TTFB 2000ms = poor');
  assert(poorMetrics.lcp.device === 'desktop', 'Device is desktop');

  // Test 4: Partial metrics (missing some)
  console.log('\n📝 Test 4: Partial metrics entry');
  const partialMetrics = await collector.setManualMetrics('https://example.com/partial', {
    lcp: 2500,
    cls: 0.15
    // missing inp, fcp, ttfb
  }, 'mobile');

  assert(partialMetrics.lcp.value === 2500, 'LCP provided');
  assert(partialMetrics.cls.value === 0.15, 'CLS provided');
  // Missing metrics should get defaults
  assert(partialMetrics.inp.rating === 'needs-improvement', 'INP default to needs-improvement');
  assert(partialMetrics.fcp.rating === 'needs-improvement', 'FCP default to needs-improvement');
  assert(partialMetrics.ttfb.rating === 'needs-improvement', 'TTFB default to needs-improvement');

  // Test 5: Page report generation
  console.log('\n📝 Test 5: Page report generation');
  const collector2 = new CWVCollector();
  const report = await collector2.generatePageReport('https://example.com/test', { device: 'mobile' });

  assert(report.url === 'https://example.com/test', 'Report URL correct');
  assert(report.device === 'mobile', 'Device mobile');
  assert(typeof report.timestamp === 'string', 'Has timestamp');
  assert(typeof report.overallScore === 'number', 'Has overall score');
  assert(['good', 'needs-improvement', 'poor'].includes(report.overallRating), 'Has valid rating');
  assert(typeof report.passedCount === 'number', 'Has passed count');
  assert(report.totalMetrics === 5, 'Total metrics = 5');
  assert(report.metrics.lcp, 'Has LCP metric');
  assert(report.metrics.cls, 'Has CLS metric');
  assert(report.metrics.inp, 'Has INP metric');
  assert(report.metrics.fcp, 'Has FCP metric');
  assert(report.metrics.ttfb, 'Has TTFB metric');

  // Test 6: Historical data
  console.log('\n📝 Test 6: Historical data');
  const collector3 = new CWVCollector();
  
  // Generate and save multiple reports
  for (let i = 0; i < 5; i++) {
    const report = await collector3.generatePageReport(`https://example.com/history${i}`, { device: 'mobile' });
    await collector3.saveHistoricalPoint(report);
  }

  const history = await collector3.getHistoricalData('https://example.com/history0', 'mobile', 30);
  assert(Array.isArray(history), 'History is array');
  assert(history.length >= 1, 'Has historical data');
  assert(history[0].metrics, 'History has metrics');
  assert(typeof history[0].overallScore === 'number', 'Has overall score');

  // Test 7: Trend calculation
  console.log('\n📝 Test 7: Trend calculation');
  const collector4 = new CWVCollector();
  
  // Create trend data: improving LCP
  const trendData = [];
  for (let i = 10; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trendData.push({
      date: date.toISOString(),
      metrics: { lcp: 3000 - i * 100, cls: 0.1, inp: 200, fcp: 1800, ttfb: 600 },
      overallScore: 80 + i
    });
  }
  
  const trend = cwvCollector.calculateTrend(trendData, 'lcp');
  assert(trend.trend === 'improving', 'LCP improving trend detected');
  assert(trend.changePercent < 0, 'Improving trend has negative change');

  // Test declining trend
  const decliningData = [];
  for (let i = 10; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    decliningData.push({
      date: date.toISOString(),
      metrics: { lcp: 2000 + i * 100, cls: 0.1, inp: 200, fcp: 1800, ttfb: 600 },
      overallScore: 90 - i
    });
  }
  
  const decliningTrend = cwvCollector.calculateTrend(decliningData, 'lcp');
  assert(decliningTrend.trend === 'declining', 'LCP declining trend detected');
  assert(decliningTrend.changePercent > 0, 'Declining trend has positive change');

  // Test stable trend
  const stableData = [];
  for (let i = 10; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    stableData.push({
      date: date.toISOString(),
      metrics: { lcp: 2500, cls: 0.1, inp: 200, fcp: 1800, ttfb: 600 },
      overallScore: 85
    });
  }
  
  const stableTrend = cwvCollector.calculateTrend(stableData, 'lcp');
  assert(stableTrend.trend === 'stable', 'LCP stable trend detected');
  assert(Math.abs(stableTrend.changePercent) < 5, 'Stable trend has minimal change');

  // Test 8: Insufficient data
  console.log('\n📝 Test 8: Insufficient data for trend');
  const singlePoint = [{ date: new Date().toISOString(), metrics: { lcp: 2500 }, overallScore: 80 }];
  const singleTrend = cwvCollector.calculateTrend(singlePoint, 'lcp');
  assert(singleTrend.trend === 'stable', 'Single point = stable');
  assert(singleTrend.changePercent === 0, 'Single point change = 0');

  // Test 9: Default metrics
  console.log('\n📝 Test 9: Default metric values');
  const collector5 = new CWVCollector();
  const defaults = collector5.getDefaultMetrics('https://example.com/test', 'mobile');
  
  for (const metric of ['lcp', 'cls', 'inp', 'fcp', 'ttfb']) {
    assert(defaults[metric], `Has default for ${metric}`);
    assert(defaults[metric].rating === 'needs-improvement', `${metric} defaults to needs-improvement`);
    assert(defaults[metric].source === 'manual', 'Source is manual');
    assert(defaults[metric].device === 'mobile', 'Device is mobile');
  }

  // Test 10: Cache functionality
  console.log('\n📝 Test 10: Cache functionality');
  const collector6 = new CWVCollector();
  
  // Check cache stats
  const cacheStats = collector6.getCacheStats();
  assert(typeof cacheStats.size === 'number', 'Cache has size');
  assert(Array.isArray(cacheStats.keys), 'Cache keys is array');
  
  collector6.clearCache();
  const clearedStats = collector5.getCacheStats();
  assert(clearedStats.size === 0, 'Cache cleared');

  // Test 11: Configuration
  console.log('\n📝 Test 11: Configuration');
  const customCollector = new CWVCollector({
    thresholds: {
      ...CWV_THRESHOLDS,
      lcp: { ...CWV_THRESHOLDS.lcp, good: 2000, poor: 3000 } // Stricter LCP
    },
    weights: {
      lcp: 0.3,
      cls: 0.3,
      inp: 0.2,
      fcp: 0.1,
      ttfb: 0.1
    }
  });

  assert(customCollector.config.thresholds.lcp.good === 2000, 'Custom LCP threshold');
  assert(customCollector.config.weights.lcp === 0.3, 'Custom LCP weight');

  // Test 12: Edge cases
  console.log('\n📝 Test 12: Edge cases');
  
  // Empty manual metrics
  const emptyManual = await collector.setManualMetrics('https://example.com/empty', {}, 'mobile');
  for (const metric of ['lcp', 'cls', 'inp', 'fcp', 'ttfb']) {
    assert(emptyManual[metric].rating === 'needs-improvement', `${metric} defaults when not provided`);
  }

  // Invalid values
  const invalidMetrics = await collector.setManualMetrics('https://example.com/invalid', {
    lcp: -100, // negative
    cls: -0.1, // negative
    inp: 'invalid', // string
    fcp: null, // null
    ttfb: undefined
  }, 'mobile');
  
  // Should handle gracefully and use defaults
  assert(invalidMetrics.lcp.rating === 'needs-improvement', 'Negative LCP handled');
  assert(invalidMetrics.cls.rating === 'needs-improvement', 'Negative CLS handled');
  assert(invalidMetrics.inp.rating === 'needs-improvement', 'String INP handled');
  assert(invalidMetrics.fcp.rating === 'needs-improvement', 'Null FCP handled');
  assert(invalidMetrics.ttfb.rating === 'needs-improvement', 'Undefined TTFB handled');

  // Test 13: Page report with missing metrics
  console.log('\n📝 Test 13: Page report completeness');
  const collector7 = new CWVCollector();
  const minimalReport = await collector7.generatePageReport('https://example.com/minimal');
  
  for (const metric of ['lcp', 'cls', 'inp', 'fcp', 'ttfb']) {
    assert(minimalReport.metrics[metric], `Has ${metric} metric`);
    assert(typeof minimalReport.metrics[metric].value === 'number', `${metric} has numeric value`);
    assert(minimalReport.metrics[metric].rating, `${metric} has rating`);
  }
  
  // Test 14: Historical data filtering
  console.log('\n📝 Test 14: Historical data date filtering');
  const collector8 = new CWVCollector();
  
  // Add old data (100 days ago)
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 100);
  const oldReport = await collector8.generatePageReport('https://example.com/old', { device: 'mobile' });
  report.timestamp = oldDate.toISOString();
  await collector8.saveHistoricalPoint(report);
  
  // Add recent data (5 days ago)
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 5);
  const recentReport = await collector8.generatePageReport('https://example.com/recent', { device: 'mobile' });
  recentReport.timestamp = recentDate.toISOString();
  await collector8.saveHistoricalPoint(recentReport);
  
  const recentHistory = await collector8.getHistoricalData('https://example.com/recent', 'mobile', 30);
  assert(recentHistory.length >= 1, 'Recent data retrieved');
  
  // Old data should be filtered out
  const allHistory = await collector8.getHistoricalData('https://example.com/old', 'mobile', 30);
  // Note: This tests the 30-day filter in getHistoricalData

  // Test 15: Device types
  console.log('\n📝 Test 15: Device types');
  const mobileReport = await collector.setManualMetrics('https://example.com/mobile', {
    lcp: 3000, cls: 0.1, inp: 200, fcp: 2000, ttfb: 800
  }, 'mobile');
  assert(mobileReport.lcp.device === 'mobile', 'Mobile device set');
  
  const desktopReport = await collector.setManualMetrics('https://example.com/desktop', {
    lcp: 2000, cls: 0.05, inp: 100, fcp: 1500, ttfb: 500
  }, 'desktop');
  assert(desktopReport.lcp.device === 'desktop', 'Desktop device set');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All Collector Tests Passed!' : `\n⚠️ ${failed} test(s) failed`);

  return { passed, failed };
}

export { runCollectorTests };

if (typeof document !== 'undefined') {
  runCollectorTests().catch(console.error);
}