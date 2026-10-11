/**
 * Core Web Vitals - Scoring Engine Tests
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { cwvScoringEngine } from './scoring.js';
import { CWV_METRICS, CWV_RATINGS, CWV_THRESHOLDS, CWV_PAGE_REPORT } from './models.js';

async function runScoringTests() {
  console.log('🧪 Running CWV Scoring Engine Tests...\n');

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

  // Create mock reports for testing
let createMockReport = (metrics) => {let report = {
      url: 'https://example.com/test',
      timestamp: new Date().toISOString(),
      device: 'mobile',
      metrics: {},
      overallScore: 0,
      overallRating: 'good',
      passedCount: 0,
      totalMetrics: 5
    };
    
    for (const [key, value] of Object.entries(metrics)) {let thresholds = CWV_THRESHOLDS[key];let rating = value <= thresholds.good ? 'good' : 
                      value <= thresholds.poor ? 'needs-improvement' : 'poor';
      
      report.metrics[key] = {
        metric: key,
        value,
        rating,
        timestamp: new Date().toISOString(),
        source: 'test'
      };
    }
    return report;
  }

  // Test 1: Perfect scores
  console.log('\n📝 Test 1: Perfect scores (all Good)');let perfectReport = createMockReport({
    lcp: 2000,   // Good (≤2500)
    cls: 0.05,   // Good (≤0.1)
    inp: 150,    // Good (≤200)
    fcp: 1500,   // Good (≤1800)
    ttfb: 600    // Good (≤800)
  });let perfectResult = cwvScoringEngine.calculateScore(perfectReport);
  assert(perfectResult.overallScore === 100, 'Perfect score = 100');
  assert(perfectResult.overallRating === 'good', 'Perfect rating = good');
  assert(perfectResult.grade === 'A', 'Perfect grade = A');
  assert(perfectResult.passedCount === 5, 'All 5 metrics passed');
  assert(perfectResult.breakdown.length === 5, 'All 5 metrics in breakdown');

  // Test 2: All poor
  console.log('\n📝 Test 2: All Poor scores');let poorReport = createMockReport({
    lcp: 5000,   // Poor (>4000)
    cls: 0.3,    // Poor (>0.25)
    inp: 600,    // Poor (>500)
    fcp: 4000,   // Poor (>3000)
    ttfb: 2000   // Poor (>1800)
  });let poorResult = cwvScoringEngine.calculateScore(poorReport);
  assert(poorResult.overallScore === 0, 'All poor = 0 score');
  assert(poorResult.overallRating === 'poor', 'All poor = poor rating');
  assert(poorResult.grade === 'F', 'Grade = F');
  assert(poorResult.passedCount === 0, 'No metrics passed');

  // Test 3: Mixed scores
  console.log('\n📝 Test 3: Mixed scores');let mixedReport = createMockReport({
    lcp: 2000,     // Good
    cls: 0.15,     // Needs improvement
    inp: 300,      // Needs improvement
    fcp: 2000,     // Needs improvement
    ttfb: 1000     // Needs improvement
  });let mixedResult = cwvScoringEngine.calculateScore(mixedReport);
  assert(mixedResult.overallScore > 0 && mixedResult.overallScore < 100, 'Mixed score between 0-100');
  assert(mixedResult.passedCount === 1, 'Only 1 metric passed');
  assert(mixedResult.overallRating === 'needs-improvement', 'Overall rating needs-improvement');

  // Test 3b: Detailed breakdown
  console.log('\n📝 Test 3b: Breakdown structure');let result = cwvScoringEngine.calculateScore(perfectReport);
  assert(result.breakdown.length === 5, 'Breakdown has 5 metrics');
  
  for (const b of result.breakdown) {
    assert(['lcp', 'cls', 'inp', 'fcp', 'ttfb'].includes(b.metric), `Has valid metric: ${b.metric}`);
    assert(typeof b.value === 'number', `${b.metric} has numeric value`);
    assert(['good', 'needs-improvement', 'poor'].includes(b.rating), `${b.metric} has valid rating`);
    assert(typeof b.score === 'number', `${b.metric} has score`);
    assert(b.weight > 0, `${b.metric} has weight`);
    assert(typeof b.weightedScore === 'number', `${b.metric} has weighted score`);
    assert(typeof b.percentile === 'number', `${b.metric} has percentile`);
    assert(b.threshold, `${b.metric} has threshold`);
    assert(b.formattedValue, `${b.metric} has formatted value`);
  }

  // Test 2: Weighted scoring
  console.log('\n📝 Test 2: Weighted scoring');let customEngine = new (await import('./scoring.js')).CWVScoringEngine({
    weights: {
      lcp: 0.5,
      cls: 0.3,
      inp: 0.1,
      fcp: 0.05,
      ttfb: 0.05
    }
  });

  // LCP good (100), others poor (0) -> 0.5 * 100 = 50
let weightTestReport = createMockReport({
    lcp: 2000,   // Good
    cls: 0.3,    // Poor
    inp: 600,    // Poor
    fcp: 4000,   // Poor
    ttfb: 2000   // Poor
  });

  let customEngine2 = new (await import('./scoring.js')).CWVScoringEngine({
    weights: { lcp: 0.5, cls: 0.3, inp: 0.1, fcp: 0.05, ttfb: 0.05 }
  });let weightResult = customEngine.calculateScore(perfectReport);
  // LCP good (100 * 0.5) + others good (100 * 0.5) = 100
  assert(weightResult.overallScore === 100, 'Perfect with custom weights = 100');

  // Test: only LCP good
let lcpOnlyReport = createMockReport({
    lcp: 2000,   // Good
    cls: 0.3,    // Poor
    inp: 600,    // Poor
    fcp: 4000,   // Poor
    ttfb: 2000   // Poor
  });let lcpOnlyResult = customEngine.calculateScore(lcpOnlyReport);
  // LCP good (100 * 0.5) = 50
  assert(lcpOnlyResult.overallScore === 50, 'Only LCP good with 0.5 weight = 50');

  // Test 3: Percentile calculation
  console.log('\n📝 Test 3: Percentile calculation');let engine = new (await import('./scoring.js')).CWVScoringEngine();

  // LCP percentiles
  assert(engine.calculatePercentile('lcp', 1000) >= 90, 'LCP 1000ms = top 10%');
  assert(engine.calculatePercentile('lcp', 1800) >= 75, 'LCP 1800ms ~ top 25%');
  assert(engine.calculatePercentile('lcp', 2800) >= 50, 'LCP 2800ms ~ top 50%');
  assert(engine.calculatePercentile('lcp', 4200) >= 25, 'LCP 4200ms ~ top 25% (bottom 75%)');
  assert(engine.calculatePercentile('lcp', 6500) <= 10, 'LCP 6500ms = bottom 10%');

  // CLS percentiles
  assert(engine.calculatePercentile('cls', 0.01) >= 90, 'CLS 0.01 = top 10%');
  assert(engine.calculatePercentile('cls', 0.12) >= 50, 'CLS 0.12 ~ 50th percentile');
  assert(engine.calculatePercentile('cls', 0.3) <= 10, 'CLS 0.3 = bottom 10%');

  // INP percentiles
  assert(engine.calculatePercentile('inp', 100) >= 90, 'INP 100ms = top 10%');
  assert(engine.calculatePercentile('inp', 280) >= 50, 'INP 280ms ~ 50th percentile');
  assert(engine.calculatePercentile('inp', 800) <= 10, 'INP 800ms = bottom 10%');

  // Test: Percentile buckets
  console.log('\n📝 Test 3b: Percentile buckets');
  assert(engine.getPercentileBucket(95) === 'top10', '95th percentile = top10');
  assert(engine.getPercentileBucket(80) === 'top25', '80th percentile = top25');
  assert(engine.getPercentileBucket(50) === 'top50', '50th percentile = top50');
  assert(engine.getPercentileBucket(30) === 'bottom50', '30th percentile = bottom50');
  assert(engine.getPercentileBucket(5) === 'bottom10', '5th percentile = bottom10');

  // Test: Grade calculation
  console.log('\n📝 Test 4: Grade calculation');
  assert(engine.getGrade(95) === 'A', '95 = A');
  assert(engine.getGrade(85) === 'B', '85 = B');
  assert(engine.getGrade(75) === 'C', '75 = C');
  assert(engine.getGrade(65) === 'D', '65 = D');
  assert(engine.getGrade(50) === 'F', '50 = F');
  assert(engine.getGrade(30) === 'F', '30 = F');

  assert(engine.getGradeColor(95) === '#16a34a', 'A color = green');
  assert(engine.getGradeColor(75) === '#eab308', 'C color = yellow');
  assert(engine.getGradeColor(50) === '#dc2626', 'F color = red');

  // Test 5: Format value
  console.log('\n📝 Test 5: Format value');let engine2 = new (await import('./scoring.js')).CWVScoringEngine();
  assert(engine2.formatValue(2500, 'ms') === '2.50s', '2500ms = 2.50s');
  assert(engine2.formatValue(1500, 'ms') === '1500ms', '1500ms stays ms');
  assert(engine2.formatValue(0.1, '') === '0.100', 'CLS 0.1 = 0.100');
  assert(engine2.formatValue(0.25, '') === '0.250', 'CLS 0.25 = 0.250');
  assert(engine2.formatValue(250, 'ms') === '250ms', '250ms INP = 250ms');
  assert(engine2.formatValue(5000, 'ms') === '5.00s', '5000ms = 5.00s');

  // Test: Rating colors
  console.log('\n📝 Test 6: Rating colors');
  assert(engine2.getRatingColor('good').bg === '#dcfce7', 'Good bg');
  assert(engine2.getRatingColor('good').border === '#86efac', 'Good border');
  assert(engine2.getRatingColor('good').text === '#166534', 'Good text');

  assert(engine2.getRatingColor('needs-improvement').bg === '#fef9c3', 'Warning bg');
  assert(engine2.getRatingColor('needs-improvement').text === '#854d0e', 'Warning text');

  assert(engine2.getRatingColor('poor').bg === '#fef2f2', 'Poor bg');
  assert(engine2.getRatingColor('poor').border === '#fca5a5', 'Poor border');
  assert(engine2.getRatingColor('poor').text === '#991b1b', 'Poor text');

  // Test: Rating labels
  console.log('\n📝 Test 7: Rating labels (Serbian)');
  assert(engine2.getRatingLabel('good') === 'Dobro', 'Good = Dobro');
  assert(engine2.getRatingLabel('needs-improvement') === 'Poboljšanje', 'Needs improvement = Poboljšanje');
  assert(engine2.getRatingLabel('poor') === 'Loše', 'Poor = Loše');

  // Test 8: Metric card data
  console.log('\n📝 Test 8: Metric card data');let perfectResult1 = cwvScoringEngine.calculateScore(perfectReport);let cards = engine2.generateMetricCardData(perfectResult.breakdown);
  
  assert(cards.length === 5, '5 metric cards');
  for (const card of cards) {
    assert(card.metric, 'Has metric');
    assert(card.threshold, 'Has threshold');
    assert(card.ratingLabel, 'Has rating label');
    assert(card.ratingColor, 'Has rating color');
    assert(card.bucket, 'Has bucket');
    assert(card.status, 'Has status');
  }

  // Test 9: Improvement advice
  console.log('\n📝 Test 9: Improvement advice');let advice = engine2.getImprovementAdvice('lcp', 5000);
  assert(advice.includes('Optimizujte slike'), 'LCP advice mentions images');
  assert(advice.includes('CDN'), 'LCP advice mentions CDN');let clsAdvice = engine2.getImprovementAdvice('cls', 0.3);
  assert(clsAdvice.includes('dimenzi'), 'CLS advice mentions dimensions');let inpAdvice = engine2.getImprovementAdvice('inp', 600);
  assert(inpAdvice.includes('JavaScript'), 'INP advice mentions JavaScript');

  // Test 10: Comparison data
  console.log('\n📝 Test 10: Comparison data');let ourReport = createMockReport({
    lcp: 2000, cls: 0.05, inp: 150, fcp: 1500, ttfb: 600
  });let theirData = {
    lcp: 3000, cls: 0.15, inp: 300, fcp: 2500, ttfb: 1000
  };let comparison = engine2.generateComparisonData(
    createMockReport({ lcp: 2000, cls: 0.05, inp: 150, fcp: 1500, ttfb: 600 }),
    { lcp: 3000, cls: 0.15, inp: 300, fcp: 2500, ttfb: 1000 }
  );

  assert(comparison.length === 5, 'Comparison for all 5 metrics');
  for (const c of comparison) {
    assert(c.metric, 'Has metric');
    assert(c.ourValue !== undefined, 'Has our value');
    assert(c.theirValue !== undefined, 'Has their value');
    assert(c.difference !== undefined, 'Has difference');
    assert(typeof c.weWin === 'boolean', 'Has weWin boolean');
    assert(typeof c.percentBetter === 'number', 'Has percent better');
  }

  // Test: We win when our value is lower (better)
let ourBetter = engine2.generateComparisonData(
    createMockReport({ lcp: 2000 }),
    { lcp: 3000 }
  );
  assert(ourBetter[0].weWin === true, 'We win when lower');let theyBetter = engine2.generateComparisonData(
    createMockReport({ lcp: 4000 }),
    { lcp: 2500 }
  );
  assert(theyBetter[0].weWin === false, 'We lose when higher');

  // Test 11: Targets generation
  console.log('\n📝 Test 11: Targets generation');let targetsReport = createMockReport({
    lcp: 5000,    // Poor
    cls: 0.15,    // Needs improvement
    inp: 600,     // Poor
    fcp: 2000,    // Good
    ttfb: 1000    // Needs improvement
  });let targets = cwvScoringEngine.generateTargets(targetsReport);
  
  // Should have targets for poor and needs-improvement metrics
let poorTargets = targets.filter(t => t.priority === 'high');let mediumTargets = targets.filter(t => t.priority === 'medium');
  
  assert(poorTargets.length >= 2, 'At least 2 high priority targets (LCP, INP poor)');
  assert(mediumTargets.length >= 1, 'At least 1 medium priority target');

  for (const target of targets) {
    assert(target.metric, 'Has metric');
    assert(target.current !== undefined, 'Has current value');
    assert(target.target !== undefined, 'Has target value');
    assert(['low', 'medium', 'high'].includes(target.effort), 'Has effort level');
    assert(['high', 'medium', 'low'].includes(target.priority), 'Has priority');
  }

  // Test 12: Progress bar data
  console.log('\n📝 Test 12: Progress bar data');let progressData = engine2.generateProgressData(perfectResult.breakdown);
  assert(progressData.length === 5, '5 progress bars');
  
  for (const p of progressData) {
    assert(p.metric, 'Has metric');
    assert(p.label, 'Has label');
    assert(p.value !== undefined, 'Has value');
    assert(p.formattedValue, 'Has formatted value');
    assert(p.score === 100, 'Perfect score = 100');
    assert(p.rating === 'good', 'Rating good');
    assert(p.progressPercent === 100, 'Progress 100%');
  }

  // Test poor progress
let poorProgress = engine2.generateProgressData(
    cwvScoringEngine.calculateScore(createMockReport({
      lcp: 5000, cls: 0.3, inp: 600, fcp: 4000, ttfb: 2000
    })).breakdown
  );
  
  for (const p of poorProgress) {
    assert(p.progressPercent === 25, 'Poor progress = 25%');
  }

  // Test 13: Summary generation
  console.log('\n📝 Test 13: Summary generation');let perfectReport2 = createMockReport({
    lcp: 2000, cls: 0.05, inp: 150, fcp: 1500, ttfb: 600
  });let perfectResult2 = cwvScoringEngine.calculateScore(perfectReport2);let summary = cwvScoringEngine.generateSummary(perfectReport2, perfectResult2);

  assert(summary.url, 'Has URL');
  assert(summary.overallScore === 100, 'Summary score 100');
  assert(summary.grade === 'A', 'Grade A');
  assert(summary.passedMetrics === '5/5', 'Passed 5/5');
  assert(summary.metrics.length === 5, '5 metrics in summary');
  assert(summary.strengths.length === 5, 'All 5 are strengths');
  assert(summary.weaknesses.length === 0, 'No weaknesses');
  assert(summary.recommendations.length === 0, 'No recommendations for perfect');

  // Test with issues
let mixedReport2 = createMockReport({
    lcp: 5000, cls: 0.15, inp: 600, fcp: 2000, ttfb: 1000
  });let mixedResult2 = cwvScoringEngine.calculateScore(mixedReport2);let mixedSummary = cwvScoringEngine.generateSummary(mixedReport2, mixedResult2);

  assert(mixedSummary.weaknesses.length > 0, 'Has weaknesses');
  assert(mixedSummary.recommendations.length > 0, 'Has recommendations');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All Scoring Tests Passed!' : `\n⚠️ ${failed} test(s) failed`);

  return { passed, failed };
}

export { runScoringTests };

if (typeof document !== 'undefined') {
  runScoringTests().catch(console.error);
}