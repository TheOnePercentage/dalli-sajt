/**
 * Environment Configuration Loader
 * Loads and validates environment variables with type safety
 */

import { z } from 'zod';

const envSchema = z.object({
  // Application
  VITE_APP_NAME: z.string().min(1).default('DALLI Admin'),
  VITE_APP_VERSION: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
  VITE_BASE_URL: z.string().regex(/^(\/|\.\.?\/|https?:\/\/)/).default('/admin/'),
  VITE_API_URL: z.string().url().default('http://localhost:8000/api'),
  VITE_WS_URL: z.string().url().default('ws://localhost:8001'),

  // Authentication
  VITE_AUTH_PROVIDER: z.enum(['jwt', 'oauth', 'session']).default('jwt'),
  VITE_JWT_ISSUER: z.string().url().optional(),
  VITE_JWT_AUDIENCE: z.string().optional(),
  VITE_OAUTH_CLIENT_ID: z.string().optional(),
  VITE_OAUTH_REDIRECT_URI: z.string().url().optional(),

  // Feature Flags
  VITE_ENABLE_PWA: z.coerce.boolean().default(true),
  VITE_ENABLE_REALTIME: z.coerce.boolean().default(true),
  VITE_ENABLE_ANALYTICS: z.coerce.boolean().default(true),
  VITE_ENABLE_ERROR_REPORTING: z.coerce.boolean().default(true),
  VITE_ENABLE_PERFORMANCE_MONITORING: z.coerce.boolean().default(true),
  VITE_ENABLE_EXPERIMENTAL_FEATURES: z.coerce.boolean().default(false),

  // External Services
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_GA_MEASUREMENT_ID: z.string().regex(/^G-[A-Z0-9]+$/).optional(),
  VITE_HOTJAR_ID: z.string().regex(/^\d+$/).optional(),
  VITE_INTERCOM_APP_ID: z.string().optional(),
  VITE_ALGOLIA_APP_ID: z.string().optional(),
  VITE_ALGOLIA_SEARCH_KEY: z.string().optional(),

  // Storage
  VITE_STORAGE_PREFIX: z.string().default('imperium_'),
  VITE_CACHE_TTL: z.coerce.number().int().positive().default(300),
  VITE_OFFLINE_QUEUE_LIMIT: z.coerce.number().int().positive().default(1000),

  // Development
  VITE_SSL: z.coerce.boolean().default(false),
  VITE_MOCK_API: z.coerce.boolean().default(false),
  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  VITE_DEV_TOOLS: z.coerce.boolean().default(true),
});

// Safe defaults for CI/build environments where .env may not exist
const SAFE_DEFAULTS = envSchema.parse({});

class EnvConfigLoader {
  constructor() {
    this.config = null;
    this.validated = false;
    this.validationError = null;
  }

  static getInstance() {
    if (!EnvConfigLoader.instance) {
      EnvConfigLoader.instance = new EnvConfigLoader();
    }
    return EnvConfigLoader.instance;
  }

  load() {
    if (this.config && this.validated) {
      return this.config;
    }

    const rawEnv = this.getRawEnv();
    const result = envSchema.safeParse(rawEnv);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(errors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('\n');

      this.validationError = errorMessages;
      
      // In CI/build environments, use safe defaults instead of throwing
      const isCI = typeof process !== 'undefined' && (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.GITLAB_CI === 'true');
      const isBuild = typeof process !== 'undefined' && process.env.NODE_ENV === 'production' && !process.env.VITE_API_URL;
      
      if (isCI || isBuild || Object.keys(rawEnv).length === 0) {
        // Use safe defaults with a warning
        console.warn('[EnvConfig] Validation failed, using safe defaults for CI/build:\n', errorMessages);
        this.config = SAFE_DEFAULTS;
        this.validated = true;
        return this.config;
      }

      throw new Error(`Invalid environment configuration:\n${errorMessages}`);
    }

    this.config = result.data;
    this.validated = true;
    this.validationError = null;

    if (this.config.VITE_DEV_TOOLS && typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      this.logConfig();
    }

    return this.config;
  }

  getRawEnv() {
    const env = {};

    if (typeof import.meta !== 'undefined' && import.meta.env) {
      Object.entries(import.meta.env).forEach(([key, value]) => {
        if (key.startsWith('VITE_')) {
          env[key] = String(value);
        }
      });
    }

    if (typeof process !== 'undefined' && process.env) {
      Object.entries(process.env).forEach(([key, value]) => {
        if (key.startsWith('VITE_') && value !== undefined) {
          env[key] = String(value);
        }
      });
    }

    return env;
  }

  logConfig() {
    const { VITE_SENTRY_DSN, VITE_OAUTH_CLIENT_ID, VITE_ALGOLIA_SEARCH_KEY, ...safeConfig } = this.config;
    console.group('Environment Configuration');
    console.table(safeConfig);
    console.groupEnd();
  }

  get(key) {
    const config = this.load();
    return config[key];
  }

  getAll() {
    return this.load();
  }

  isFeatureEnabled(flag) {
    return this.get(flag);
  }

  getApiUrl(path = '') {
    const base = this.get('VITE_API_URL').replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return cleanPath ? `${base}/${cleanPath}` : base;
  }

  getWsUrl(path = '') {
    const base = this.get('VITE_WS_URL').replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return cleanPath ? `${base}/${cleanPath}` : base;
  }

  reset() {
    this.config = null;
    this.validated = false;
    this.validationError = null;
  }
}

const envConfig = EnvConfigLoader.getInstance();
export { envConfig };
export const loadEnvConfig = () => envConfig.load();
export default envConfig;