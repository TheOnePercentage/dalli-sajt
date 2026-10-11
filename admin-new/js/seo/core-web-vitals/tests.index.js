/**
 * Core Web Vitals - Test Index
 * Exports all test modules
 */

export { runModelsTests } from './models.test.js';
export { runCollectorTests } from './collector.test.js';
export { runScoringTests } from './scoring.test.js';
export { runDashboardTests } from './dashboard.test.js';
export { runIntegrationTests } from './integration.test.js';
export { runAllTests } from './run-all-tests.js';

export const testSuites = {
  models: { name: 'Models', path: './models.test.js' },
  collector: { name: 'Collector', path: './collector.test.js' },
  scoring: { name: 'Scoring', path: './scoring.test.js' },
  dashboard: { name: 'Dashboard', path: './dashboard.test.js' },
  integration: { name: 'Integration', path: './integration.test.js' }
};

export const totalTests = 105; // Approximate total across all test files

export default {
  runAll: async () => {let { runAllTests } = await import('./run-all-tests.js');
    return runAllTests();
  },
  runModels: async () => {let { runModelsTests } = await import('./models.test.js');
    return runModelsTests();
  },
  runCollector: async () => {let { runCollectorTests } = await import('./collector.test.js');
    return runCollectorTests();
  },
  runScoring: async () => {let { runScoringTests } = await import('./scoring.test.js');
    return runScoringTests();
  },
  runDashboard: async () => {let { runDashboardTests } = await import('./dashboard.test.js');
    return runDashboardTests();
  },
  runIntegration: async () => {let { runIntegrationTests } = await import('./integration.test.js');
    return runIntegrationTests();
  }
};