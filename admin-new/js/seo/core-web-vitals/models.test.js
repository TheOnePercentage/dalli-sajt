/**
 * Core Web Vitals - Models Tests
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { 
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
  CWV_METRIC_ORDER
} from './models.js';

async function runModelsTests() {
  console.log('🧪 Running Core Web Vitals Models Tests...\n');

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

  // Test 1: Constants exist
  console.log('\n📝 Test 1: Constants exist');
  assert(Object.keys(CWV_METRICS).length === 5, 'CWV_METRICS has 5 metrics');
  assert(CWV_METRICS.LCP === 'lcp', 'LCP metric key correct');
  assert(CWV_METRICS.CLS === 'cls', 'CLS metric key correct');
  assert(CWV_METRICS.INP === 'inp', 'INP metric key correct');
  assert(CWV_METRICS.FCP === 'fcp', 'FCP metric key correct');
  assert(CWV_METRICS.TTFB === 'ttfb', 'TTFB metric key correct');

  assert(Object.keys(CWV_RATINGS).length === 3, 'CWV_RATINGS has 3 ratings');
  assert(CWV_RATINGS.GOOD === 'good', 'GOOD rating correct');
  assert(CWV_RATINGS.NEEDS_IMPROVEMENT === 'needs-improvement', 'NEEDS_IMPROVEMENT rating correct');
  assert(CWV_RATINGS.POOR === 'poor', 'POOR rating correct');

  // Test 2: Thresholds exist and are correct
  console.log('\n📝 Test 2: Thresholds are correct');
  assert(CWV_THRESHOLDS.lcp.good === 2500, 'LCP good threshold 2500ms');
  assert(CWV_THRESHOLDS.lcp.poor === 4000, 'LCP poor threshold 4000ms');
  assert(CWV_THRESHOLDS.cls.good === 0.1, 'CLS good threshold 0.1');
  assert(CWV_THRESHOLDS.cls.poor === 0.25, 'CLS poor threshold 0.25');
  assert(CWV_THRESHOLDS.inp.good === 200, 'INP good threshold 200ms');
  assert(CWV_THRESHOLDS.inp.poor === 500, 'INP poor threshold 500ms');
  assert(CWV_THRESHOLDS.fcp.good === 1800, 'FCP good threshold 1800ms');
  assert(CWV_THRESHOLDS.fcp.poor === 3000, 'FCP poor threshold 3000ms');
  assert(CWV_THRESHOLDS.ttfb.good === 800, 'TTFB good threshold 800ms');
  assert(CWV_THRESHOLDS.ttfb.poor === 1800, 'TTFB poor threshold 1800ms');

  // Test 3: getRating function
  console.log('\n📝 Test 3: getRating function');
  assert(getRating(2000, CWV_THRESHOLDS.lcp) === CWV_RATINGS.GOOD, 'LCP 2000ms = GOOD');
  assert(getRating(3000, CWV_THRESHOLDS.lcp) === CWV_RATINGS.NEEDS_IMPROVEMENT, 'LCP 3000ms = NEEDS_IMPROVEMENT');
  assert(getRating(5000, CWV_THRESHOLDS.lcp) === CWV_RATINGS.POOR, 'LCP 5000ms = POOR');
  
  assert(getRating(0.05, CWV_THRESHOLDS.cls) === CWV_RATINGS.GOOD, 'CLS 0.05 = GOOD');
  assert(getRating(0.15, CWV_THRESHOLDS.cls) === CWV_RATINGS.NEEDS_IMPROVEMENT, 'CLS 0.15 = NEEDS_IMPROVEMENT');
  assert(getRating(0.3, CWV_THRESHOLDS.cls) === CWV_RATINGS.POOR, 'CLS 0.3 = POOR');

  assert(getRating(150, CWV_THRESHOLDS.inp) === CWV_RATINGS.GOOD, 'INP 150ms = GOOD');
  assert(getRating(300, CWV_THRESHOLDS.inp) === CWV_RATINGS.NEEDS_IMPROVEMENT, 'INP 300ms = NEEDS_IMPROVEMENT');
  assert(getRating(600, CWV_THRESHOLDS.inp) === CWV_RATINGS.POOR, 'INP 600ms = POOR');

  // Test 4: getMetricScore function
  console.log('\n📝 Test 4: getMetricScore function');
  assert(getMetricScore(2000, CWV_THRESHOLDS.lcp) === 100, 'LCP 2000ms = 100 score');
  assert(getMetricScore(4000, CWV_THRESHOLDS.lcp) === 0, 'LCP 4000ms = 0 score');
  assert(getMetricScore(3000, CWV_THRESHOLDS.lcp) === 50, 'LCP 3000ms = 50 score (midpoint)');
  
  // Test 5: getOverallScore function
  console.log('\n📝 Test 5: getOverallScore function');let mockMetrics = {
    lcp: { rating: CWV_RATINGS.GOOD, value: 2000 },
    cls: { rating: CWV_RATINGS.GOOD, value: 0.05 },
    inp: { rating: CWV_RATINGS.GOOD, value: 150 },
    fcp: { rating: CWV_RATINGS.GOOD, value: 1500 },
    ttfb: { rating: CWV_RATINGS.GOOD, value: 600 }
  };let overallScore = getOverallScore(mockMetrics, DEFAULT_CWV_CONFIG.weights);
  assert(overallScore === 100, 'All GOOD metrics = 100 overall score');let mixedMetrics = {
    lcp: { rating: CWV_RATINGS.GOOD, value: 2000 },
    cls: { rating: CWV_RATINGS.NEEDS_IMPROVEMENT, value: 0.15 },
    inp: { rating: CWV_RATINGS.POOR, value: 600 },
    fcp: { rating: CWV_RATINGS.GOOD, value: 1500 },
    ttfb: { rating: CWV_RATINGS.GOOD, value: 600 }
  };let mixedScore = getOverallScore(mixedMetrics, DEFAULT_CWV_CONFIG.weights);
  assert(mixedScore < 100 && mixedScore > 0, 'Mixed metrics produce valid score');

  // Test 6: getOverallRating function
  console.log('\n📝 Test 6: getOverallRating function');
  assert(getOverallRating(95) === CWV_RATINGS.GOOD, 'Score 95 = GOOD');
  assert(getOverallRating(75) === CWV_RATINGS.NEEDS_IMPROVEMENT, 'Score 75 = NEEDS_IMPROVEMENT');
  assert(getOverallRating(30) === CWV_RATINGS.POOR, 'Score 30 = POOR');

  // Test 7: formatValue function
  console.log('\n📝 Test 7: formatValue function');
  assert(formatValue(2500, 'ms') === '2.50s', '2500ms = 2.50s');
  assert(formatValue(1500, 'ms') === '1500ms', '1500ms = 1500ms');
  assert(formatValue(0.1, '') === '0.100', '0.1 CLS = 0.100');
  assert(formatValue(250, 'ms') === '250ms', '250ms INP = 250ms');

  // Test 8: formatValue with different units
  console.log('\n📝 Test 8: formatValue with different units');
  assert(formatValue(0.1, '') === '0.100', 'CLS unitless formats to 3 decimals');
  assert(formatValue(0.25, '') === '0.250', 'CLS 0.25 formats to 0.250');
  assert(formatValue(5000, 'ms') === '5.00s', '5000ms = 5.00s');

  // Test 9: getColorForRating function
  console.log('\n📝 Test 9: getColorForRating function');let goodColor = getColorForRating(CWV_RATINGS.GOOD);
  assert(goodColor.bg === '#dcfce7', 'GOOD bg color correct');
  assert(goodColor.border === '#86efac', 'GOOD border color correct');
  assert(goodColor.text === '#166534', 'GOOD text color correct');let poorColor = getColorForRating(CWV_RATINGS.POOR);
  assert(poorColor.bg === '#fef2f2', 'POOR bg color correct');
  assert(poorColor.border === '#fca5a5', 'POOR border color correct');
  assert(poorColor.text === '#991b1b', 'POOR text color correct');

  // Test 10: CWV_METRIC_ORDER
  console.log('\n📝 Test 10: CWV_METRIC_ORDER');
  assert(CWV_METRIC_ORDER.length === 5, 'CWV_METRIC_ORDER has 5 metrics');
  assert(CWV_METRIC_ORDER[0] === 'lcp', 'First metric is LCP');
  assert(CWV_METRIC_ORDER[4] === 'ttfb', 'Last metric is TTFB');

  // Test 11: CWV_CONFIG defaults
  console.log('\n📝 Test 11: CWV_CONFIG defaults');
  assert(DEFAULT_CWV_CONFIG.weights.lcp === 0.25, 'LCP weight 0.25');
  assert(DEFAULT_CWV_CONFIG.weights.cls === 0.25, 'CLS weight 0.25');
  assert(DEFAULT_CWV_CONFIG.weights.inp === 0.25, 'INP weight 0.25');
  assert(DEFAULT_CWV_CONFIG.weights.fcp === 0.125, 'FCP weight 0.125');
  assert(DEFAULT_CWV_CONFIG.weights.ttfb === 0.125, 'TTFB weight 0.125');

  // Test 12: Rating colors
  console.log('\n📝 Test 12: Rating colors');let goodColors = CWV_COLORS.good;
  assert(goodColors.bg === '#dcfce7', 'Good bg color');
  assert(goodColors.border === '#86efac', 'Good border');let warningColors = CWV_COLORS['needs-improvement'];
  assert(warningColors.bg === '#fef9c3', 'Warning bg');
  assert(warningColors.text === '#854d0e', 'Warning text');let poorColors = CWV_COLORS.poor;
  assert(poorColors.bg === '#fef2f2', 'Poor bg');
  assert(poorColors.border === '#fca5a5', 'Poor border');

  // Test 13: Threshold labels and descriptions
  console.log('\n📝 Test 13: Threshold metadata');
  assert(CWV_THRESHOLDS.lcp.label === 'Largest Contentful Paint', 'LCP label');
  assert(CWV_THRESHOLDS.cls.label === 'Cumulative Layout Shift', 'CLS label');
  assert(CWV_THRESHOLDS.inp.label === 'Interaction to Next Paint', 'INP label');
  assert(CWV_THRESHOLDS.fcp.label === 'First Contentful Paint', 'FCP label');
  assert(CWV_THRESHOLDS.ttfb.label === 'Time to First Byte', 'TTFB label');

  assert(CWV_THRESHOLDS.lcp.description.includes('najvećeg elementa'), 'LCP description in Serbian');
  assert(CWV_THRESHOLDS.cls.description.includes('pomeraj rasporeda'), 'CLS description in Serbian');
  assert(CWV_THRESHOLDS.inp.description.includes('latencija klik'), 'INP description in Serbian');

  // Test 14: Metric order constant
  console.log('\n📝 Test 14: CWV_METRIC_ORDER constant');
  assert(Array.isArray(CWV_METRIC_ORDER), 'CWV_METRIC_ORDER is array');
  assert(CWV_METRIC_ORDER.length === 5, 'CWV_METRIC_ORDER has 5 items');
  assert(CWV_METRIC_ORDER.includes('lcp'), 'Includes LCP');
  assert(CWV_METRIC_ORDER.includes('cls'), 'Includes CLS');
  assert(CWV_METRIC_ORDER.includes('inp'), 'Includes INP');
  assert(CWV_METRIC_ORDER.includes('fcp'), 'Includes FCP');
  assert(CWV_METRIC_ORDER.includes('ttfb'), 'Includes TTFB');

  // Test 15: CWV_COLORS structure
  console.log('\n📝 Test 15: CWV_COLORS structure');
  assert(CWV_COLORS.good.bg, 'Good has bg');
  assert(CWV_COLORS.good.border, 'Good has border');
  assert(CWV_COLORS.good.text, 'Good has text');
  assert(CWV_COLORS.good.label === 'Dobro', 'Good label in Serbian');
  assert(CWV_COLORS.good.shortLabel === '✓', 'Good short label');

  // Test 16: Ratings constants
  console.log('\n📝 Test 16: Ratings constants');
  assert(CWV_RATINGS.GOOD === 'good', 'GOOD = good');
  assert(CWV_RATINGS.NEEDS_IMPROVEMENT === 'needs-improvement', 'NEEDS_IMPROVEMENT');
  assert(CWV_RATINGS.POOR === 'poor', 'POOR = poor');

  // Test 17: Metrics constants
  console.log('\n📝 Test 17: Metrics constants');
  assert(CWV_METRICS.LCP === 'lcp', 'LCP = lcp');
  assert(CWV_METRICS.CLS === 'cls', 'CLS = cls');
  assert(CWV_METRICS.INP === 'inp', 'INP = inp');
  assert(CWV_METRICS.FCP === 'fcp', 'FCP = fcp');
  assert(CWV_METRICS.TTFB === 'ttfb', 'TTFB = ttfb');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All Models Tests Passed!' : `\n⚠️ ${failed} test(s) failed`);

  return { passed, failed };
}

export { runModelsTests };

if (typeof document !== 'undefined') {
  runModelsTests().catch(console.error);
}