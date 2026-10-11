import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/boot.smoke.test.js'],
    setupFiles: [],
    pool: 'forks',
    testTimeout: 30000,
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
