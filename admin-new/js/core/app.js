/**
 * Core App - Main Application Controller
 * Central entry point for the DALLI Admin application
 */

import { ImperiumStore, createStore } from './store.js';
import { ThemeManager } from './theme.js';
import { APIClient, createApi } from '../utils/api.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { ImperiumStorage } from '../utils/storage.js';
import { eventBus } from './event-bus.js';

export class App {
  constructor(options = {}) {
    this.options = {
      name: options.name || 'DALLI Admin',
      version: options.version || '1.0.0',
      debug: options.debug || false,
      ...options
    };

    this.store = null;
    this.api = null;
    this.storage = null;
    this.theme = null;
    this.router = null;
    this.initialized = false;
    this.modules = new Map();
    this.eventBus = eventBus; // Use unified event bus
    this.performance = {
      marks: new Map(),
      measures: new Map()
    };
  }

  async init(options = {}) {
    if (this.initialized) {
      console.warn('App already initialized');
      return this;
    }

    try {
      this.perfMark('app:init:start');

      await this.initStore(options.store);
      await this.initTheme(options.theme);
      await this.initAPI(options.api);
      await this.initStorage(options.storage);
      await this.initRouter(options.router);
      await this.initModules(options.modules);

      this.initialized = true;
      this.perfMark('app:init:end');
      this.perfMeasure('app:init', 'app:init:start', 'app:init:end');

      this.emit('app:ready', { app: this });
      console.log(`[${this.options.name}] v${this.options.version} initialized`);

      return this;
    } catch (error) {
      console.error('App initialization failed:', error);
      throw error;
    }
  }

  async initStore(options = {}) {
    this.store = createStore({
      user: null,
      session: null,
      permissions: [],
      settings: {},
      ui: {
        sidebarCollapsed: false,
        theme: 'system',
        locale: 'sr'
      },
      ...options
    });

    this.store.addMiddleware((nextState, prevState) => {
      if (this.options.debug) {
        console.log('[Store]', prevState, '->', nextState);
      }
    });

    this.store.enableDevTools('DALLI Admin');
    return this.store;
  }

  async initTheme(options = {}) {
    const ThemeManager = (await import('./theme.js')).ThemeManager;
    this.theme = ThemeManager;
    await this.theme.init({
      defaultTheme: options.defaultTheme || 'system',
      storageKey: options.storageKey || 'dalli_theme',
      ...options
    });
    return this.theme;
  }

  async initAPI(options = {}) {
    this.api = createApi({
      baseURL: options.baseURL || '/api',
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      interceptors: {
        request: (config) => {
          const token = this.store?.getState()?.session?.token;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        response: (response) => {
          if (response.status === 401) {
            this.emit('auth:unauthorized');
          }
          return response;
        },
        error: (error) => {
          if (error.status === 401) {
            this.store?.setState({ user: null, session: null });
            this.emit('auth:expired');
          }
          return Promise.reject(error);
        }
      },
      ...options
    });
    return this.api;
  }

  async initStorage(options = {}) {
    const { ImperiumStorage } = await import('../utils/storage.js');
    this.storage = new ImperiumStorage({
      prefix: options.prefix || 'dalli_',
      ...options
    });
    return this.storage;
  }

  async initRouter(options = {}) {
    const { Router } = await import('./router.js');
    this.router = new Router({
      mode: options.mode || 'hash',
      base: options.base || '/',
      routes: options.routes || [],
      scrollBehavior: options.scrollBehavior || 'smooth',
      ...options
    });

    this.router.beforeEach((to, from, next) => {
      if (to.meta.requiresAuth && !this.store?.getState()?.user) {
        next({ name: 'login', query: { redirect: to.fullPath } });
      } else {
        next();
      }
    });

    this.router.afterEach((to, from) => {
      this.emit('route:changed', { to, from });
    });

    return this.router;
  }

  async initModules(moduleConfigs = {}) {
    const defaultModules = [
      'sidebar',
      'topbar',
      'tabs',
      'tables',
      'modals',
      'forms',
      'notifications',
      'charts'
    ];

    const modules = { ...defaultModules, ...moduleConfigs };

    for (const [name, config] of Object.entries(modules)) {
      if (config === false) continue;

      try {
        const modulePath = `../components/${name}.js`;
        const module = await import(modulePath);
        const instance = new module.default(config);
        this.modules.set(name, instance);
      } catch (error) {
        console.warn(`Failed to load module ${name}:`, error);
      }
    }

    return this.modules;
  }

  perfMark(name) {
    this.performance.marks.set(name, performance.now());
    performance.mark?.(`app:${name}`);
  }

  perfMeasure(name, startMark, endMark) {
    try {
      performance.measure(`app:${name}`, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      this.performance.measures.set(name, measure.duration);
      return measure.duration;
    } catch {
      return 0;
    }
  }

  emit(event, detail) {
    this.eventBus.dispatchEvent(new CustomEvent(event, { detail, bubbles: true }));
  }

  on(event, handler) {
    this.eventBus.addEventListener(event, handler);
    return () => this.eventBus.removeEventListener(event, handler);
  }

  off(event, handler) {
    this.eventBus.removeEventListener(event, handler);
  }

  once(event, handler) {
    const wrapper = (e) => {
      handler(e);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
    return () => this.off(event, wrapper);
  }

  getState(path) {
    return this.store?.getState(path);
  }

  setState(partial, replace = false) {
    return this.store?.setState(partial, replace);
  }

  select(path) {
    return this.store?.select(path);
  }

  destroy() {
    this.modules.forEach(module => module.destroy?.());
    this.modules.clear();
    this.store?.destroy?.();
    this.router?.destroy?.();
    this.initialized = false;
  }
}

export function createApp(options) {
  const app = new App(options);
  return app.init();
}

export default App;