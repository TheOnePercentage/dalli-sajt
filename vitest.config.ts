import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.{test,spec}.{js,mjs,ts}', 'admin-new/tests/**/*.{test,spec}.{js,mjs,ts}'],
    exclude: ['**/visual-regression.spec.ts', '**/accessibility.spec.ts', '**/e2e/**/*.spec.ts'], 
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'public/',
        'scripts/',
        '**/*.stories.{js,mjs,ts}',
        '**/*.test.{js,mjs,ts}',
        '**/*.spec.{js,mjs,ts}'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/index.html'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@store': resolve(__dirname, 'src/store'),
      '@components/ui': resolve(__dirname, 'admin-new/js/components/ui')
    }
  }
});