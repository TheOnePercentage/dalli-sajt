/**
 * API Service Layer - Centralized API communication for all admin sections
 * Replaces mock data generation with real API calls
 * Includes caching, deduplication, offline queue, error boundary, and performance monitoring
 */

import { createApi } from '../utils/api.js';
import { AuthService } from './auth.js';
import { cacheService } from './cache.js';
import { errorBoundary } from './error-boundary.js';
import { performanceMonitor } from './performance.js';

class APIService {
  constructor(options = {}) {
    const version = options.version || 'v1';
    this.version = version;
    this.baseURL = `/api/${version}/admin`;

    this.client = createApi({
      baseURL: this.baseURL,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    });

    this.pendingRequests = new Map();
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();

    this.loadOfflineQueue();

    // Add auth interceptor
    this.client.addRequestInterceptor(config => {
      const token = AuthService.getToken();
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;

      // Forward the acting admin's identity so destructive actions can be
      // attributed (owner-only hard delete, admin trash + owner notifications).
      const actor = APIService.getAdminIdentity();
      if (actor) {
        config.headers['X-Admin-Id'] = actor.id;
        config.headers['X-Admin-Name'] = actor.name;
        config.headers['X-Admin-Role'] = actor.role;
      }

      config.metadata = { startTime: performance.now() };
      return config;
    });

    // Response interceptor for performance tracking
    this.client.addResponseInterceptor(response => {
      const duration =
        performance.now() - (response.config?.metadata?.startTime || performance.now());
      performanceMonitor.trackApiCall(
        response.config?.method || 'GET',
        response.config?.url || '',
        duration,
        response.status,
        response.headers?.get('content-length') || 0
      );

      // Add deprecation headers for old API endpoints
      this._handleDeprecationHeaders(response);

      return response;
    });

    // Error interceptor with error boundary integration
    this.client.addErrorInterceptor(error => {
      const duration = performance.now() - (error.config?.metadata?.startTime || performance.now());
      performanceMonitor.trackApiCall(
        error.config?.method || 'GET',
        error.config?.url || '',
        duration,
        error.status || 0
      );

      if (error.status === 401) {
        this.handleUnauthorized();
      }
      if (error.status === 403) {
        throw new Error('Nemate dozvolu za ovu akciju');
      }
      if (error.status === 404) {
        throw new Error('Resurs nije pronađen');
      }
      if (error.status === 422) {
        throw new Error('Validacija nije prošla');
      }
      if (error.status >= 500) {
        errorBoundary.handleError(new Error(`Server error: ${error.status}`), 'api');
      }
      if (!navigator.onLine) {
        errorBoundary.handleError(new Error('Offline - štedite promene za kasnije'), 'network');
      }
      throw error;
    });

    // Response interceptor for error handling
    this.client.addResponseInterceptor(response => {
      if (response.status === 401) {
        // Token expired - redirect to login
        this.handleUnauthorized();
        return Promise.reject(new Error('Unauthorized'));
      }
      // Throw for non-retryable error status codes
      const nonRetryableStatuses = [403, 404, 422];
      if (nonRetryableStatuses.includes(response.status)) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        error.config = response.config;
        throw error;
      }
      // Don't throw for 500 errors - let retry logic handle them
      // if (response.status >= 500) {
      //   throw new Error('Server error');
      // }
      return response;
    });

    this.client.addErrorInterceptor(error => {
      if (error.status === 401) {
        this.handleUnauthorized();
      }
      if (error.status === 403) {
        throw new Error('Nemate dozvolu za ovu akciju');
      }
      if (error.status === 404) {
        throw new Error('Resurs nije pronađen');
      }
      if (error.status === 422) {
        throw new Error('Validacija nije prošla');
      }
    });
  }

  handleUnauthorized() {
    AuthService.clearToken();
    window.location.href = '/admin/login';
  }

  _handleDeprecationHeaders(response) {
    const deprecatedPaths = [
      '/api/admin/',
      '/api/admin/dashboard',
      '/api/admin/orders',
      '/api/admin/products',
      '/api/admin/customers',
      '/api/admin/categories',
      '/api/admin/inventory',
      '/api/admin/campaigns',
      '/api/admin/promotions',
      '/api/admin/reviews',
      '/api/admin/users',
      '/api/admin/roles',
      '/api/admin/settings',
      '/api/admin/analytics',
      '/api/admin/inventory',
    ];

    const requestUrl = response.config?.url || '';
    const isDeprecated = deprecatedPaths.some(path => requestUrl.startsWith(path));

    if (isDeprecated) {
      const deprecationDate = '2025-12-31';
      const sunsetDate = '2026-06-30';
      const link = `<https://api.dalli.rs/v1/admin>; rel="successor-version"`;

      // Check if response already has deprecation headers
      const hasDeprecation =
        response.headers?.has('Deprecation') || response.headers?.has('Sunset');

      if (!hasDeprecation) {
        console.warn(
          `[API Deprecation] Endpoint "${requestUrl}" is deprecated. ` +
            `Use /api/v1/admin/ instead. ` +
            `Deprecation date: ${deprecationDate}, Sunset: ${sunsetDate}`
        );
      }
    }

    // Add deprecation headers to response for old API endpoints
    const requestUrl2 = response.config?.url || '';
    if (requestUrl2.startsWith('/api/admin/') && !requestUrl2.startsWith('/api/v1/admin/')) {
      // These headers would be set by the server, but we log them client-side
      // Server should add: Deprecation: true, Sunset: Sat, 31 Dec 2025 23:59:59 GMT, Link: <https://api.dalli.rs/v1/admin>; rel="successor-version"
    }
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  getCacheKey(method, url, params = {}) {
    // Normalize params by sorting keys for consistent cache keys
    const normalizedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        const value = params[key];
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {});

    const searchParams = new URLSearchParams(normalizedParams).toString();
    return `${method.toUpperCase()}:${url}${searchParams ? '?' + searchParams : ''}`;
  }

  async getWithCache(url, options = {}) {
    const { params = {}, ttl, tags = [], forceRefresh = false } = options;
    const cacheKey = this.getCacheKey('GET', url, params);

    if (!forceRefresh) {
      const cached = await cacheService.get(cacheKey);
      if (cached && !cached.stale) {
        return cached.data;
      }
      if (cached && cached.stale) {
        this.fetchAndCache(url, 'GET', { params, ttl, tags }, cacheKey);
        return cached.data;
      }
    }

    return this.fetchAndCache(url, 'GET', { params, ttl, tags }, cacheKey);
  }

  async fetchAndCache(url, method, options, cacheKey) {
    const deduplicated = this.deduplicateRequest(cacheKey, () =>
      this.client.request({ url, method, ...options })
    );
    const response = await deduplicated;

    if (method === 'GET' && response) {
      await cacheService.set(cacheKey, response, { ttl: options.ttl, tags: options.tags });
    }

    return response;
  }

  deduplicateRequest(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async mutateWithOfflineSupport(url, method, data, options = {}) {
    const { tags = [], optimisticUpdate, rollbackOnError = true } = options;

    if (!this.isOnline) {
      return this.queueOfflineMutation({ url, method, data, options });
    }

    try {
      const response = await this.client.request({ url, method, data });

      if (tags.length > 0) {
        await Promise.all(tags.map(tag => cacheService.invalidateByTag(tag)));
      }

      if (optimisticUpdate) {
        optimisticUpdate(data);
      }

      return response;
    } catch (error) {
      if (rollbackOnError && optimisticUpdate) {
        optimisticUpdate(null, true);
      }
      throw error;
    }
  }

  queueOfflineMutation(mutation) {
    return new Promise((resolve, reject) => {
      const queuedMutation = {
        ...mutation,
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        resolve,
        reject,
      };

      this.offlineQueue.push(queuedMutation);
      this.persistOfflineQueue();

      if (this.offlineQueue.length === 1) {
        this.showOfflineIndicator();
      }
    });
  }

  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const mutation of queue) {
      try {
        const response = await this.client.request({
          url: mutation.url,
          method: mutation.method,
          data: mutation.data,
        });
        mutation.resolve(response);
      } catch (error) {
        this.offlineQueue.push(mutation);
        mutation.reject(error);
      }
    }

    await this.persistOfflineQueue();

    if (this.offlineQueue.length === 0) {
      this.hideOfflineIndicator();
    }
  }

  async persistOfflineQueue() {
    try {
      localStorage.setItem(
        'imperium_offline_queue',
        JSON.stringify(
          this.offlineQueue.map(m => ({
            url: m.url,
            method: m.method,
            data: m.data,
            options: m.options,
            id: m.id,
            timestamp: m.timestamp,
          }))
        )
      );
    } catch (e) {
      console.warn('[API] Failed to persist offline queue:', e);
    }
  }

  async loadOfflineQueue() {
    try {
      const stored = localStorage.getItem('imperium_offline_queue');
      if (stored) {
        const queue = JSON.parse(stored);
        this.offlineQueue = queue.map(m => ({
          ...m,
          resolve: () => {},
          reject: () => {},
        }));
        if (this.offlineQueue.length > 0) {
          this.showOfflineIndicator();
        }
      }
    } catch (e) {
      console.warn('[API] Failed to load offline queue:', e);
    }
  }

  showOfflineIndicator() {
    if (!document.getElementById('offline-indicator')) {
      const indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
        background: var(--color-warning); color: var(--color-warning-contrast);
        padding: 8px 16px; text-align: center; font-size: 13px;
        box-shadow: var(--shadow-lg);
      `;
      indicator.textContent = 'Offline - promene će se sinhronizovati kada se vratite online';
      document.body.appendChild(indicator);
      document.body.style.paddingTop = '40px';
    }
  }

  hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.remove();
      document.body.style.paddingTop = '';
    }
  }

  // ============ DASHBOARD ============
  async getDashboardStats(period = '30d') {
    return this.getWithCache('/dashboard/stats', { params: { period }, tags: ['dashboard'] });
  }

  async getRevenueChart(period = '30d') {
    return this.getWithCache('/dashboard/charts/revenue', {
      params: { period },
      tags: ['dashboard', 'charts'],
    });
  }

  async getOrdersChart(period = '30d') {
    return this.getWithCache('/dashboard/charts/orders', {
      params: { period },
      tags: ['dashboard', 'charts'],
    });
  }

  async getRecentOrders(limit = 10) {
    return this.getWithCache('/orders/recent', { params: { limit }, tags: ['orders'] });
  }

  async getRecentActivity(limit = 8) {
    return this.getWithCache('/dashboard/activity', { params: { limit }, tags: ['dashboard'] });
  }

  async getTopProducts(limit = 6) {
    return this.getWithCache('/products/top', {
      params: { limit },
      tags: ['products', 'dashboard'],
    });
  }

  // ============ ORDERS ============
  static getAdminIdentity() {
    try {
      const raw =
        localStorage.getItem('dalli_admin_auth') || sessionStorage.getItem('dalli_admin_auth');
      if (!raw) return null;
      const user = JSON.parse(raw)?.user;
      if (!user) return null;
      return {
        id: String(user.id || user.email || 'admin'),
        name: user.name || user.email || 'Admin',
        role: user.role || 'admin',
      };
    } catch {
      return null;
    }
  }

  async getOrders(params = {}) {
    return this.getWithCache('/orders', {
      params: { scope: 'admin', ...params },
      tags: ['orders'],
    });
  }

  async getTrashOrders(params = {}) {
    return this.getWithCache('/orders', {
      params: { scope: 'admin', trash: '1', ...params },
      tags: ['orders', 'orders-trash'],
    });
  }

  async getOrder(id) {
    return this.getWithCache(`/orders/${id}`, { params: { scope: 'admin' }, tags: ['orders'] });
  }

  async updateOrderStatus(id, status, notes = '') {
    return this.mutateWithOfflineSupport(
      `/orders/${id}/status`,
      'PATCH',
      { status, notes },
      { tags: ['orders', 'dashboard'] }
    );
  }

  async deleteOrder(id) {
    return this.mutateWithOfflineSupport(`/orders/${id}`, 'DELETE', null, {
      tags: ['orders', 'orders-trash', 'dashboard'],
    });
  }

  async restoreOrder(id) {
    return this.mutateWithOfflineSupport(
      `/orders/${id}/restore`,
      'POST',
      {},
      { tags: ['orders', 'orders-trash', 'dashboard'] }
    );
  }

  async purgeOrder(id) {
    return this.mutateWithOfflineSupport(
      `/orders/${id}/purge`,
      'POST',
      {},
      { tags: ['orders', 'orders-trash', 'dashboard', 'order-notifications'] }
    );
  }

  async getOrderNotifications() {
    return this.getWithCache('/orders/notifications', { tags: ['order-notifications'] });
  }

  async markOrderNotificationsRead() {
    return this.mutateWithOfflineSupport(
      '/orders/notifications/read',
      'POST',
      {},
      { tags: ['order-notifications'] }
    );
  }

  async exportOrders(params = {}) {
    return this.client.get('/orders/export', { params, responseType: 'blob' });
  }

  async getOrderDetails(id) {
    return this.getWithCache(`/orders/${id}/details`, { tags: ['orders'] });
  }

  async updateOrderNotes(id, notes) {
    return this.mutateWithOfflineSupport(
      `/orders/${id}/notes`,
      'PATCH',
      { notes },
      { tags: ['orders'] }
    );
  }

  // ============ PRODUCTS ============
  async getProducts(params = {}) {
    return this.getWithCache('/products', { params, tags: ['products'] });
  }

  async getProduct(id) {
    return this.getWithCache(`/products/${id}`, { tags: ['products'] });
  }

  async createProduct(data) {
    return this.mutateWithOfflineSupport('/products', 'POST', data, {
      tags: ['products', 'dashboard'],
    });
  }

  async updateProduct(id, data) {
    return this.mutateWithOfflineSupport(`/products/${id}`, 'PUT', data, {
      tags: ['products', 'dashboard'],
    });
  }

  async deleteProduct(id) {
    return this.mutateWithOfflineSupport(`/products/${id}`, 'DELETE', null, {
      tags: ['products', 'dashboard'],
    });
  }

  async getProductVariants(productId) {
    return this.getWithCache(`/products/${productId}/variants`, { tags: ['products'] });
  }

  async addProductVariant(productId, data) {
    return this.mutateWithOfflineSupport(`/products/${productId}/variants`, 'POST', data, {
      tags: ['products'],
    });
  }

  async updateProductVariant(productId, variantId, data) {
    return this.mutateWithOfflineSupport(
      `/products/${productId}/variants/${variantId}`,
      'PUT',
      data,
      { tags: ['products'] }
    );
  }

  async deleteProductVariant(productId, variantId) {
    return this.mutateWithOfflineSupport(
      `/products/${productId}/variants/${variantId}`,
      'DELETE',
      null,
      { tags: ['products'] }
    );
  }

  async exportProducts(params = {}) {
    return this.client.get('/products/export', { params, responseType: 'blob' });
  }

  async importProducts(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.client.upload('/products/import', file);
  }

  // ============ INVENTORY ============
  async getInventory(params = {}) {
    return this.getWithCache('/inventory', { params, tags: ['inventory'] });
  }

  async adjustStock(productId, adjustment) {
    return this.mutateWithOfflineSupport(
      `/products/${productId}/stock/adjust`,
      'POST',
      adjustment,
      { tags: ['inventory', 'products'] }
    );
  }

  async getLowStock(threshold = 5) {
    return this.getWithCache('/inventory/low-stock', {
      params: { threshold },
      tags: ['inventory'],
    });
  }

  async getStockMovements(productId, params = {}) {
    return this.getWithCache(`/products/${productId}/stock/movements`, {
      params,
      tags: ['inventory'],
    });
  }

  // ============ CATEGORIES ============
  async getCategories(params = {}) {
    return this.getWithCache('/categories', { params, tags: ['categories'] });
  }

  async getCategoryTree() {
    return this.getWithCache('/categories/tree', { tags: ['categories'] });
  }

  async getCategory(id) {
    return this.getWithCache(`/categories/${id}`, { tags: ['categories'] });
  }

  async createCategory(data) {
    return this.mutateWithOfflineSupport('/categories', 'POST', data, { tags: ['categories'] });
  }

  async updateCategory(id, data) {
    return this.mutateWithOfflineSupport(`/categories/${id}`, 'PUT', data, {
      tags: ['categories'],
    });
  }

  async deleteCategory(id) {
    return this.mutateWithOfflineSupport(`/categories/${id}`, 'DELETE', null, {
      tags: ['categories'],
    });
  }

  async reorderCategories(orderedIds) {
    return this.mutateWithOfflineSupport(
      '/categories/reorder',
      'POST',
      { orderedIds },
      { tags: ['categories'] }
    );
  }

  async uploadCategoryImage(id, file) {
    const formData = new FormData();
    formData.append('image', file);
    return this.client.upload(`/categories/${id}/image`, formData);
  }

  // ============ CUSTOMERS ============
  async getCustomers(params = {}) {
    return this.getWithCache('/customers', { params, tags: ['customers'] });
  }

  async getCustomer(id) {
    return this.getWithCache(`/customers/${id}`, { tags: ['customers'] });
  }

  async createCustomer(data) {
    return this.mutateWithOfflineSupport('/customers', 'POST', data, { tags: ['customers'] });
  }

  async updateCustomer(id, data) {
    return this.mutateWithOfflineSupport(`/customers/${id}`, 'PUT', data, { tags: ['customers'] });
  }

  async deleteCustomer(id) {
    return this.mutateWithOfflineSupport(`/customers/${id}`, 'DELETE', null, {
      tags: ['customers'],
    });
  }

  async getCustomerOrders(customerId, params = {}) {
    return this.getWithCache(`/customers/${customerId}/orders`, {
      params,
      tags: ['customers', 'orders'],
    });
  }

  async getCustomerStats(customerId) {
    return this.getWithCache(`/customers/${customerId}/stats`, { tags: ['customers'] });
  }

  async exportCustomers(params = {}) {
    return this.client.get('/customers/export', { params, responseType: 'blob' });
  }

  // ============ REVIEWS ============
  async getReviews(params = {}) {
    return this.getWithCache('/reviews', { params, tags: ['reviews'] });
  }

  async getReview(id) {
    return this.getWithCache(`/reviews/${id}`, { tags: ['reviews'] });
  }

  async moderateReview(id, action, response = '') {
    return this.mutateWithOfflineSupport(
      `/reviews/${id}/moderate`,
      'POST',
      { action, response },
      { tags: ['reviews'] }
    );
  }

  async replyToReview(id, response) {
    return this.mutateWithOfflineSupport(
      `/reviews/${id}/reply`,
      'POST',
      { response },
      { tags: ['reviews'] }
    );
  }

  async exportReviews(params = {}) {
    return this.client.get('/reviews/export', { params, responseType: 'blob' });
  }

  // ============ CAMPAIGNS ============
  async getCampaigns(params = {}) {
    return this.getWithCache('/campaigns', { params, tags: ['campaigns'] });
  }

  async getCampaign(id) {
    return this.getWithCache(`/campaigns/${id}`, { tags: ['campaigns'] });
  }

  async createCampaign(data) {
    return this.mutateWithOfflineSupport('/campaigns', 'POST', data, { tags: ['campaigns'] });
  }

  async updateCampaign(id, data) {
    return this.mutateWithOfflineSupport(`/campaigns/${id}`, 'PUT', data, { tags: ['campaigns'] });
  }

  async deleteCampaign(id) {
    return this.mutateWithOfflineSupport(`/campaigns/${id}`, 'DELETE', null, {
      tags: ['campaigns'],
    });
  }

  async pauseCampaign(id) {
    return this.mutateWithOfflineSupport(`/campaigns/${id}/pause`, 'POST', null, {
      tags: ['campaigns'],
    });
  }

  async activateCampaign(id) {
    return this.mutateWithOfflineSupport(`/campaigns/${id}/activate`, 'POST', null, {
      tags: ['campaigns'],
    });
  }

  // ============ PROMOTIONS ============
  async getPromotions(params = {}) {
    return this.getWithCache('/promotions', { params, tags: ['promotions'] });
  }

  async createPromotion(data) {
    return this.mutateWithOfflineSupport('/promotions', 'POST', data, { tags: ['promotions'] });
  }

  async updatePromotion(id, data) {
    return this.mutateWithOfflineSupport(`/promotions/${id}`, 'PUT', data, {
      tags: ['promotions'],
    });
  }

  async deletePromotion(id) {
    return this.mutateWithOfflineSupport(`/promotions/${id}`, 'DELETE', null, {
      tags: ['promotions'],
    });
  }

  async togglePromotion(id, active) {
    return this.mutateWithOfflineSupport(
      `/promotions/${id}/toggle`,
      'POST',
      { active },
      { tags: ['promotions'] }
    );
  }

  // ============ ANALYTICS ============
  async getAnalyticsStats(period = '30d') {
    return this.getWithCache('/analytics/stats', { params: { period }, tags: ['analytics'] });
  }

  async getRevenueChart(period = '30d') {
    return this.getWithCache('/analytics/charts/revenue', {
      params: { period },
      tags: ['analytics', 'charts'],
    });
  }

  async getOrdersChart(period = '30d') {
    return this.getWithCache('/analytics/charts/orders', {
      params: { period },
      tags: ['analytics', 'charts'],
    });
  }

  async getTrafficSources(period = '30d') {
    return this.getWithCache('/analytics/traffic-sources', {
      params: { period },
      tags: ['analytics'],
    });
  }

  async getDeviceBreakdown(period = '30d') {
    return this.getWithCache('/analytics/device-breakdown', {
      params: { period },
      tags: ['analytics'],
    });
  }

  async getConversionFunnel(period = '30d') {
    return this.getWithCache('/analytics/conversion-funnel', {
      params: { period },
      tags: ['analytics'],
    });
  }

  // ============ FINANCE / ACCOUNTING / AD SPEND ============
  async getFinance(period = '30d') {
    return this.getWithCache('/analytics/finance', {
      params: { period },
      tags: ['analytics', 'finance'],
    });
  }

  async getAccounting(params = {}) {
    return this.getWithCache('/analytics/accounting', {
      params,
      tags: ['analytics', 'accounting'],
    });
  }

  async getAdSpend() {
    return this.getWithCache('/analytics/adspend', { tags: ['analytics', 'adspend'] });
  }

  async addAdSpend(entry) {
    return this.mutateWithOfflineSupport('/analytics/adspend', 'POST', entry, {
      tags: ['analytics', 'adspend'],
    });
  }

  async removeAdSpend(id) {
    return this.mutateWithOfflineSupport(`/analytics/adspend/${id}`, 'DELETE', null, {
      tags: ['analytics', 'adspend'],
    });
  }

  // ============ SOCIAL METRICS ============
  async getSocialMetrics(refresh = false) {
    return this.getWithCache('/social-metrics', {
      params: refresh ? { refresh: 1 } : {},
      tags: ['social'],
    });
  }

  // ============ INVENTORY ============
  async getInventoryStats() {
    return this.getWithCache('/inventory/stats', { tags: ['inventory'] });
  }

  async getLowStockProducts(threshold = 5) {
    return this.getWithCache('/inventory/low-stock', {
      params: { threshold },
      tags: ['inventory'],
    });
  }

  async adjustInventory(productId, adjustment) {
    return this.mutateWithOfflineSupport(
      `/products/${productId}/stock/adjust`,
      'POST',
      adjustment,
      { tags: ['inventory', 'products'] }
    );
  }

  // ============ CUSTOMERS ============
  async getCustomerStats() {
    return this.getWithCache('/customers/stats', { tags: ['customers'] });
  }

  async getCustomerSegments() {
    return this.getWithCache('/customers/segments', { tags: ['customers'] });
  }

  // ============ SETTINGS ============
  async getSettings() {
    return this.getWithCache('/settings', { tags: ['settings'] });
  }

  async updateSettings(data) {
    return this.mutateWithOfflineSupport('/settings', 'PUT', data, { tags: ['settings'] });
  }

  async getSystemInfo() {
    return this.getWithCache('/settings/system-info', { tags: ['settings'] });
  }

  async clearCache() {
    return this.client.post('/settings/clear-cache');
  }

  // ============ USERS/ROLES ============
  async getUsers(params = {}) {
    return this.getWithCache('/users', { params, tags: ['users'] });
  }

  async getUser(id) {
    return this.getWithCache(`/users/${id}`, { tags: ['users'] });
  }

  async createUser(data) {
    return this.mutateWithOfflineSupport('/users', 'POST', data, { tags: ['users'] });
  }

  async updateUser(id, data) {
    return this.mutateWithOfflineSupport(`/users/${id}`, 'PUT', data, { tags: ['users'] });
  }

  async deleteUser(id) {
    return this.mutateWithOfflineSupport(`/users/${id}`, 'DELETE', null, { tags: ['users'] });
  }

  async getRoles() {
    return this.getWithCache('/roles', { tags: ['users'] });
  }

  async createRole(data) {
    return this.mutateWithOfflineSupport('/roles', 'POST', data, { tags: ['users'] });
  }

  async updateRole(id, data) {
    return this.mutateWithOfflineSupport(`/roles/${id}`, 'PUT', data, { tags: ['users'] });
  }

  async deleteRole(id) {
    return this.mutateWithOfflineSupport(`/roles/${id}`, 'DELETE', null, { tags: ['users'] });
  }

  // ============ VERSIONING ============
  getVersion() {
    return this.version;
  }

  getBaseURL() {
    return this.baseURL;
  }

  // Check if an endpoint is deprecated
  isDeprecated(endpoint) {
    const deprecatedPaths = [
      '/api/admin/',
      '/api/admin/dashboard',
      '/api/admin/orders',
      '/api/admin/products',
      '/api/admin/customers',
      '/api/admin/categories',
      '/api/admin/inventory',
      '/api/admin/campaigns',
      '/api/admin/promotions',
      '/api/admin/reviews',
      '/api/admin/users',
      '/api/admin/roles',
      '/api/admin/settings',
      '/api/admin/analytics',
      '/api/admin/inventory',
    ];
    return deprecatedPaths.some(path => endpoint.startsWith(path));
  }

  // Get the v1 equivalent of a deprecated endpoint
  getV1Equivalent(endpoint) {
    if (endpoint.startsWith('/api/admin/')) {
      return endpoint.replace('/api/admin/', '/api/v1/admin/');
    }
    return endpoint;
  }
}

const apiService = new APIService();

// Legacy API client for backward compatibility (uses deprecated /api/admin)
const legacyApiService = new APIService({ version: 'legacy' });
legacyApiService.baseURL = '/api/admin';
legacyApiService.client = createApi({
  baseURL: '/api/admin',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
});

export { APIService, apiService, legacyApiService };
export default apiService;
