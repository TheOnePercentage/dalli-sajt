import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      '**/*.e2e.{js,ts}',
      // Legacy browser-console QA harnesses (run manually in the browser, not
      // vitest suites — they auto-run via `document` guards and use a custom
      // assert/counter model). Not collected by vitest.
      'js/seo/**/*.test.js',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
        'js/services/worker/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    setupFiles: ['./tests/setup.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './coverage/test-report.html',
    },
    testTimeout: 10000,
    hookTimeout: 5000,
    teardownTimeout: 3000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js'),
      '@core': resolve(__dirname, 'js/core'),
      '@utils': resolve(__dirname, 'js/utils'),
      '@services': resolve(__dirname, 'js/services'),
      '@components': resolve(__dirname, 'js/components'),
      '@sections': resolve(__dirname, 'js/sections'),
      '@connectors': resolve(__dirname, 'js/connectors'),
      '@styles': resolve(__dirname, 'css'),
      '@assets': resolve(__dirname, 'assets'),
    },
  },
  define: {
    __APP_VERSION__: '"test"',
    __BUILD_TIME__: '"2024-01-01T00:00:00.000Z"',
    __ENV__: '"test"',
  },
});