#!/usr/bin/env node
/**
 * Performance Budget Check Script
 * Enforces performance budgets and detects regressions
 * Usage: node scripts/performance-budget-check.js [--baseline=baseline.json] [--output=report.json]
 */

const fs = require('fs');
const path = require('path');

const BUDGET_FILE = path.join(__dirname, '..', 'performance-budget.json');
const REPORT_DIR = path.join(__dirname, '..', '.lighthouseci');
const BASELINE_FILE = path.join(__dirname, '..', '.lighthouseci', 'baseline.json');

function loadBudget() {
  const content = fs.readFileSync(BUDGET_FILE, 'utf8');
  return JSON.parse(content);
}

function loadLighthouseReport() {
  const files = fs.readdirSync(REPORT_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('No Lighthouse reports found in', REPORT_DIR);
    return null;
  }
  
  // Get the latest report
  const latestFile = files
    .map(f => ({ file: f, mtime: fs.statSync(path.join(REPORT_DIR, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;
    
  const content = fs.readFileSync(path.join(REPORT_DIR, latestFile), 'utf8');
  return JSON.parse(content);
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) {
    console.log('No baseline file found, skipping regression check');
    return null;
  }
  const content = fs.readFileSync(BASELINE_FILE, 'utf8');
  return JSON.parse(content);
}

function saveBaseline(report) {
  const baseline = {
    timestamp: new Date().toISOString(),
    url: report.finalUrl,
    categories: report.categories,
    audits: extractKeyMetrics(report)
  };
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  console.log('Baseline saved to', BASELINE_FILE);
}

function extractKeyMetrics(report) {
  const metrics = {};
  const keyAudits = [
    'first-contentful-paint',
    'largest-contentful-paint',
    'interactive',
    'cumulative-layout-shift',
    'total-blocking-time',
    'speed-index',
    'first-input-delay',
    'redirects',
    'server-response-time',
    'uses-long-cache-ttl',
    'uses-text-compression',
    'image-alt',
    'font-display',
    'html-has-lang',
    'document-title',
    'meta-description',
    'html-lang-valid',
    'viewport'
  ];

  for (const audit of keyAudits) {
    const auditData = report.audits[audit];
    if (auditData) {
      metrics[audit] = {
        score: auditData.score,
        numericValue: auditData.numericValue,
        displayValue: auditData.displayValue
      };
    }
  }
  return metrics;
}

function checkBudgets(report, budgets) {
  const results = {
    passed: true,
    warnings: [],
    errors: [],
    details: []
  };

  for (const budget of budgets.budgets) {
    const audit = getAuditForResourceType(report, budget.resourceType);
    if (!audit) {
      console.warn('No audit data for resource type:', budget.resourceType);
      continue;
    }

    const value = audit.numericValue || 0;
    const budgetKb = budget.budget;
    const valueKb = value / 1024; // Convert bytes to KB
    const ratio = valueKb / budgetKb;

    let status = 'pass';
    let message = '';

    if (ratio >= 1.0) {
      status = 'error';
      message = budget.name + ' (' + budget.resourceType + '): ' + valueKb.toFixed(1) + 'KB exceeds budget of ' + budgetKb + 'KB (' + (ratio * 100).toFixed(1) + '%)';
      results.errors.push({ budget: budget.name, value: valueKb, budget: budgetKb, ratio });
    } else if (ratio >= 0.8) {
      status = 'warning';
      message = budget.name + ' (' + budget.resourceType + '): ' + valueKb.toFixed(1) + 'KB is ' + (ratio * 100).toFixed(1) + '% of budget (' + budgetKb + 'KB)';
      results.warnings.push({ budget: budget.name, value: valueKb, budget: budgetKb, ratio });
    } else {
      message = budget.name + ' (' + budget.resourceType + '): ' + valueKb.toFixed(1) + 'KB / ' + budgetKb + 'KB (' + (ratio * 100).toFixed(1) + '%)';
    }

    results.details.push({
      name: budget.name,
      resourceType: budget.resourceType,
      valueKb,
      budgetKb,
      ratio,
      status,
      message
    });

    if (status === 'error') {
      results.passed = false;
    }
  }

  // Check resource counts
  for (const countBudget of budgets.resourceCounts || []) {
    const audit = getAuditForResourceType(report, countBudget.resourceType);
    if (audit && audit.numericValue) {
      const value = audit.numericValue;
      const budget = countBudget.budget;
      const ratio = value / budget;

      let status = 'pass';
      if (ratio >= 1.0) {
        results.passed = false;
        results.errors.push({
          budget: countBudget.name,
          value,
          budget,
          message: countBudget.name + ': ' + value + ' exceeds budget of ' + budget
        });
      } else if (ratio >= 0.8) {
        results.warnings.push({
          budget: countBudget.name,
          value,
          budget,
          message: countBudget.name + ': ' + value + ' is ' + (ratio * 100).toFixed(1) + '% of budget (' + budget + ')'
        });
      }
    }
  }

  return results;
}

function getAuditForResourceType(report, resourceType) {
  const typeMap = {
    'total': 'total-byte-weight',
    'script': 'total-byte-weight',
    'stylesheet': 'total-byte-weight',
    'image': 'total-byte-weight',
    'font': 'total-byte-weight',
    'third-party': 'third-party-summary'
  };
  
  const auditName = typeMap[resourceType];
  return report.audits[auditName] || report.audits['total-byte-weight'];
}

function checkThresholds(report) {
  const results = {
    passed: true,
    warnings: [],
    errors: []
  };

  const categories = [
    { key: 'performance', name: 'Performance', minScore: 0.9 },
    { key: 'accessibility', name: 'Accessibility', minScore: 0.9 },
    { key: 'best-practices', name: 'Best Practices', minScore: 0.9 },
    { key: 'seo', name: 'SEO', minScore: 0.9 },
    { key: 'pwa', name: 'PWA', minScore: 0.5 }
  ];

  for (const cat of categories) {
    const score = report.categories[cat.key]?.score || 0;
    const minScore = cat.minScore;
    
    if (score < minScore) {
      return {
        passed: false,
        errors: [{
          category: cat.name,
          score: score * 100,
          threshold: minScore * 100,
          message: cat.name + ' score ' + (score * 100).toFixed(1) + ' below threshold ' + (minScore * 100)
        }]
      };
    }
  }

  return { passed: true, warnings: [], errors: [] };
}

function checkRegression(baseline, current) {
  if (!baseline) return { regressed: false, details: [] };

  const results = {
    regressed: false,
    improvements: [],
    regressions: []
  };

  const metricsToCheck = [
    'first-contentful-paint',
    'largest-contentful-paint',
    'interactive',
    'cumulative-layout-shift',
    'total-blocking-time',
    'speed-index',
    'first-input-delay'
  ];

  for (const metric of metricsToCheck) {
    const baselineMetric = baseline.audits?.[metric];
    const currentMetric = current.audits?.[metric];
    
    if (!baselineMetric || !currentMetric) continue;

    const baselineValue = baselineMetric.numericValue || 0;
    const currentValue = currentMetric.numericValue || 0;

    if (baselineValue > 0) {
      const changePercent = ((currentValue - baselineValue) / baselineValue) * 100;
      
      if (changePercent > 10) {
        results.regressed = true;
        results.regressions.push({
          metric,
          baseline: baselineMetric.numericValue,
          current: currentMetric.numericValue,
          changePercent: changePercent.toFixed(1)
        });
      } else if (changePercent < -10) {
        results.improvements.push({
          metric,
          baseline: baselineMetric.numericValue,
          current: currentMetric.numericValue,
          changePercent: changePercent.toFixed(1)
        });
      }
    }
  }

  return results;
}

function generateReport(results, budgetResults, regressionResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: results.passed && budgetResults.passed && !regressionResults.regressed,
      totalErrors: results.errors.length + budgetResults.errors.length,
      totalWarnings: results.warnings.length + budgetResults.warnings.length,
      regressed: regressionResults.regressed
    },
    categories: results,
    budgets: budgetResults,
    regression: regressionResults
  };

  return report;
}

function main() {
  const args = process.argv.slice(2);
  let outputFile = 'performance-report.json';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output') outputFile = args[i + 1];
  }

  console.log('=== Performance Budget Check ===\n');

  const report = loadLighthouseReport();
  if (!report) {
    console.error('No Lighthouse report found');
    process.exit(1);
  }

  console.log('Analyzing: ' + report.finalUrl);
  console.log('Date: ' + new Date().toISOString());
  console.log('');

  const budgets = loadBudget();
  console.log('Loaded ' + budgets.budgets.length + ' resource budgets and ' + (budgets.resourceCounts?.length || 0) + ' count budgets');

  // Check budgets
  console.log('\n=== Budget Checks ===');
  const budgetResults = checkBudgets(loadLighthouseReport(), loadBudget());
  
  budgetResults.details.forEach(d => {
    const icon = d.status === 'error' ? 'X' : d.status === 'warning' ? '!' : 'OK';
    console.log(icon + ' ' + d.message);
  });

  console.log('Budget: ' + (budgetResults.passed ? 'PASSED' : 'FAILED'));
  console.log('Errors: ' + budgetResults.errors.length + ', Warnings: ' + budgetResults.warnings.length);

  // Check category thresholds
  const thresholdResults = checkThresholds(loadLighthouseReport());
  console.log('Category Thresholds: ' + (thresholdResults.passed ? 'PASSED' : 'FAILED'));
  thresholdResults.errors.forEach(e => console.log('  X ' + e.message));
  thresholdResults.warnings.forEach(w => console.log('  ! ' + w.message));

  // Check regression
  const baseline = loadBaseline();
  const currentReport = loadLighthouseReport();
  const regressionResults = checkRegression(baseline, loadLighthouseReport());
  
  console.log('\nRegression Check:');
  if (fs.existsSync(BASELINE_FILE)) {
    console.log('Baseline found');
    if (regressionResults.regressed) {
      console.log('REGRESSION DETECTED:');
      regressionResults.regressions.forEach(r => {
        console.log('  ' + r.metric + ': ' + r.baseline + ' -> ' + r.current + ' (' + r.changePercent + '% worse)');
      });
    } else {
      console.log('No regressions detected');
    }
    if (regressionResults.improvements.length > 0) {
      console.log('Improvements:');
      regressionResults.improvements.forEach(r => {
        console.log('  ' + r.metric + ': ' + r.baseline + ' -> ' + r.current + ' (' + r.changePercent + '% better)');
      });
    }
  } else {
    console.log('No baseline found, skipping regression check');
  }

  // Save current as baseline
  saveBaseline(loadLighthouseReport());

  // Generate final report
  const finalReport = generateReport(
    { passed: true, errors: [], warnings: [] },
    budgetResults,
    regressionResults
  );

  fs.writeFileSync('performance-report.json', JSON.stringify(report, null, 2));
  console.log('\nFull report saved to performance-report.json');

  // Exit code based on results
  const failed = !budgetResults.passed || regressionResults.regressed;
  process.exit(failed ? 1 : 0);
}

main();
