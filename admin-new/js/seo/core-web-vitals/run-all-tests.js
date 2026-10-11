/**
 * Core Web Vitals - Test Runner
 * Run all CWV tests in sequence
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { runModelsTests } from './models.test.js';
import { runCollectorTests } from './collector.test.js';
import { runScoringTests } from './scoring.test.js';
import { runDashboardTests } from './dashboard.test.js';
import { runIntegrationTests } from './integration.test.js';

async function runAllTests() {
  console.log('═══════════════════════════════════════');
  console.log('  CORE WEB VITALS - FULL TEST SUITE');
  console.log('═══════════════════════════════════════\n');let results = {
    models: { passed: 0, failed: 0 },
    collector: { passed: 0, failed: 0 },
    scoring: { passed: 0, failed: 0 },
    dashboard: { passed: 0, failed: 0 },
    integration: { passed: 0, failed: 0 },
    total: { passed: 0, failed: 0 }
  };let runTest = async (name, testFn) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  Running: ${name}`);
    console.log('='.repeat(50));
    
    try {let result = await testFn();
      results[name] = result;
      results.total.passed += result.passed;
      results.total.failed += result.failed;
    } catch (error) {
      console.error(`  ❌ ${name} failed with error:`, error);
      results[name] = { passed: 0, failed: 1 };
      results.total.failed += 1;
    }
  };

  // Run all test suites
  await runTest('models', runModelsTests);
  await runTest('collector', runCollectorTests);
  await runTest('scoring', runScoringTests);
  await runTest('dashboard', runDashboardTests);
  await runTest('integration', runIntegrationTests);

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(50));
  
  for (const [name, result] of Object.entries(results)) {
    if (name !== 'total') {let status = result.failed === 0 ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${name.padEnd(15)}: ${result.passed} passed, ${result.failed} failed  ${status}`);
    }
  }

  console.log('-'.repeat(50));let totalStatus = results.total.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED';
  console.log(`  TOTAL: ${results.total.passed} passed, ${results.total.failed} failed  ${totalStatus}`);
  console.log('='.repeat(50));

  return results;
}

// Export for manual running
export { runAllTests };

// Auto-run if in browser
if (typeof document !== 'undefined') {
  runAllTests().catch(console.error);
}