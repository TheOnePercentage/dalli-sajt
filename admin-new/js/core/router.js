/**
 * Router - Client-side Hash/History Router
 * Lightweight SPA router with middleware support
 */

export class Router {
  constructor(options = {}) {
    this.options = {
      mode: options.mode || 'hash',
      base: options.base || '/',
      routes: options.routes || [],
      scrollBehavior: options.scrollBehavior || 'smooth',
      caseSensitive: options.caseSensitive || false,
      strict: options.strict || false,
      ...options
    };

    this.routes = new Map();
    this.currentRoute = null;
    this.previousRoute = null;
    this.beforeHooks = [];
    this.afterHooks = [];
    this.errorHooks = [];
    this.currentGuard = null;
    this.pending = false;
    this.ready = false;
    this._listeners = new Map();

    this._initRoutes(this.options.routes);
    this._initListener();
  }

  _initRoutes(routes) {
    routes.forEach(route => this.addRoute(route));
  }

  addRoute(route) {
    const normalized = this._normalizeRoute(route);
    const key = this._routeKey(normalized.path);
    this.routes.set(key, normalized);
    return this;
  }

  removeRoute(path) {
    const key = this._routeKey(path);
    return this.routes.delete(key);
  }

  getRoutes() {
    return Array.from(this.routes.values());
  }

  _normalizeRoute(route) {
    const path = this.options.caseSensitive ? route.path : route.path.toLowerCase();
    return {
      path,
      name: route.name,
      component: route.component,
      meta: route.meta || {},
      beforeEnter: route.beforeEnter,
      children: route.children?.map(child => this._normalizeRoute(child)) || [],
      redirect: route.redirect,
      alias: route.alias,
      props: route.props || false,
      beforeLeave: route.beforeLeave
    };
  }

  _routeKey(path) {
    return path;
  }

  _initListener() {
    if (this.options.mode === 'history') {
      window.addEventListener('popstate', this._onPopState.bind(this));
    } else {
      window.addEventListener('hashchange', this._onHashChange.bind(this));
    }
  }

  _onPopState(event) {
    this._navigate(window.location.pathname + window.location.search + window.location.hash, false);
  }

  _onHashChange(event) {
    this._navigate(window.location.hash.slice(1) || '/', false);
  }

  async navigate(to, options = {}) {
    if (this.pending) return false;

    const target = this._resolvePath(to);
    const normalized = this._normalizePath(target.path);
    const matched = this._matchRoute(normalized);

    if (!matched) {
      if (this.options.routes.some(r => r.path === '*')) {
        return this.navigate({ name: 'not-found', params: { path: normalized } });
      }
      return false;
    }

    this.pending = true;

    try {
      for (const hook of this.beforeHooks) {
        await hook(matched, this.currentRoute);
      }

      if (matched.route.beforeEnter) {
        await matched.route.beforeEnter(matched, this.currentRoute, () => {});
      }

      const from = this.currentRoute;
      this.previousRoute = this.currentRoute;
      this.currentRoute = matched;

      this._updateURL(matched, options.replace);

      for (const hook of this.afterHooks) {
        await hook(matched, from);
      }

      this.emit('navigate', { to: matched, from });
      return true;
    } catch (error) {
      for (const hook of this.errorHooks) {
        await hook(error, matched, this.currentRoute);
      }
      throw error;
    } finally {
      this.pending = false;
      this.ready = true;
    }
  }

  _resolvePath(to) {
    if (typeof to === 'string') {
      return { path: to };
    }
    if (to.name) {
      const route = this.getRoutes().find(r => r.name === to.name);
      if (!route) throw new Error(`Route "${to.name}" not found`);
      let path = route.path;
      Object.entries(to.params || {}).forEach(([key, value]) => {
        path = path.replace(`:${key}`, value);
      });
      return { path, query: to.query, hash: to.hash };
    }
    if (to.path) {
      return { path: to.path, query: to.query, hash: to.hash };
    }
    throw new Error('Invalid navigation target');
  }

  _normalizePath(path) {
    let normalized = path;
    if (!this.options.caseSensitive) {
      normalized = normalized.toLowerCase();
    }
    if (!this.options.strict && normalized.endsWith('/') && normalized !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  _matchRoute(path) {
    const [pathname, search] = path.split('?');
    const query = this._parseQuery(search);

    for (const route of this.routes.values()) {
      const match = this._matchPath(pathname, route.path);
      if (match) {
        return {
          route,
          path: pathname,
          params: match.params,
          query,
          hash: window.location.hash.slice(1),
          fullPath: path
        };
      }
    }
    return null;
  }

  _matchPath(pathname, routePath) {
    const routeParts = routePath.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (routePath === '*') return { params: { path: pathname } };
    if (routeParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const pathPart = pathParts[i];

      if (routePart.startsWith(':')) {
        const key = routePart.slice(1);
        params[key] = decodeURIComponent(pathPart);
      } else if (routePart !== pathPart) {
        return null;
      }
    }

    return { params };
  }

  _parseQuery(search) {
    const query = {};
    if (!search) return query;
    search.slice(1).split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
    return query;
  }

  _updateURL(route, replace = false) {
    const url = this._buildURL(route);
    if (this.options.mode === 'history') {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
    } else {
      const hash = '#' + url.replace(this.options.base, '');
      if (replace) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + hash);
      } else {
        window.location.hash = hash;
      }
    }
  }

  _buildURL(route) {
    let path = route.path;
    Object.entries(route.params || {}).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });
    const query = new URLSearchParams(route.query || {}).toString();
    return this.options.base + path + (query ? '?' + query : '') + (route.hash ? '#' + route.hash : '');
  }

  go(delta) {
    window.history.go(delta);
  }

  back() {
    this.go(-1);
  }

  forward() {
    this.go(1);
  }

  push(to, options) {
    return this.navigate(to, { ...options, replace: false });
  }

  replace(to, options) {
    return this.navigate(to, { ...options, replace: true });
  }

  beforeEach(hook) {
    this.beforeHooks.push(hook);
    return () => {
      const idx = this.beforeHooks.indexOf(hook);
      if (idx > -1) this.beforeHooks.splice(idx, 1);
    };
  }

  afterEach(hook) {
    this.afterHooks.push(hook);
    return () => {
      const idx = this.afterHooks.indexOf(hook);
      if (idx > -1) this.afterHooks.splice(idx, 1);
    };
  }

  onError(hook) {
    this.errorHooks.push(hook);
    return () => {
      const idx = this.errorHooks.indexOf(hook);
      if (idx > -1) this.errorHooks.splice(idx, 1);
    };
  }

  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx > -1) handlers.splice(idx, 1);
  }

  emit(event, detail) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    handlers.forEach(h => h(detail));
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  getPreviousRoute() {
    return this.previousRoute;
  }

  isReady() {
    return this.ready;
  }

  resolve(name, params = {}) {
    const route = this.getRoutes().find(r => r.name === name);
    if (!route) return null;
    let path = route.path;
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });
    return this.options.base + path;
  }

  hasRoute(name) {
    return this.getRoutes().some(r => r.name === name);
  }

  destroy() {
    window.removeEventListener('popstate', this._onPopState);
    window.removeEventListener('hashchange', this._onHashChange);
    this._listeners.clear();
  }
}

export function createRouter(options) {
  return new Router(options);
}

export default Router;