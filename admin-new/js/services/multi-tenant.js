/**
 * Multi-tenant / Multi-store Architecture
 * Supports multiple stores, organizations, and white-label configurations
 */

import { apiService } from './api.js';
import { cacheService } from './cache.js';
import { envConfig } from '../utils/env-config.js';

class MultiTenantService {
  constructor(options = {}) {
    this.currentTenant = null;
    this.tenants = new Map();
    this.stores = new Map();
    this.organizations = new Map();
    this.configurations = new Map();
    this.listeners = new Map();

    // Subdomain parsing configuration
    this.subdomainConfig = {
      // Known admin/portal subdomains to ignore
      reservedSubdomains: new Set([
        'www', 'admin', 'api', 'app', 'dashboard', 'portal', 'cpanel', 'webmail',
        'mail', 'ftp', 'ssh', 'vpn', 'test', 'staging', 'dev', 'development',
        'localhost', 'local', 'internal', 'intranet'
      ]),
      // Custom regex for subdomain extraction (optional)
      customRegex: options.subdomainRegex || null,
      // Known TLDs for public suffix detection (fallback)
      knownTLDs: new Set([
        'com', 'org', 'net', 'io', 'co', 'dev', 'app', 'rs', 'me', 'biz',
        'info', 'eu', 'de', 'fr', 'uk', 'us', 'ca', 'au', 'jp', 'cn'
      ]),
      // Base domains to ignore (configurable)
      baseDomains: new Set(options.baseDomains || ['localhost', 'example.com']),
    };
  }

  // =========================================================================
  // Tenant Management
  // =========================================================================

  async initialize() {
    // Load current tenant from URL, subdomain, or header
    this.currentTenant = await this.resolveTenant();
    
    // Load tenant configuration
    if (this.currentTenant) {
      await this.loadTenantConfig(this.currentTenant.id);
    }

    // Listen for tenant changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'imperium_current_tenant') {
        this.handleTenantChange(JSON.parse(e.newValue || 'null'));
      }
    });

    return this.currentTenant;
  }

  async resolveTenant() {
    // Priority: URL param > Subdomain > Header > LocalStorage > Default

    // 1. URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) {
      return this.getTenantByIdentifier(tenantParam);
    }

    // 2. Subdomain (improved parsing)
    const hostname = window.location.hostname;
    const subdomain = this.extractSubdomain(hostname);
    if (subdomain) {
      const tenant = await this.getTenantBySubdomain(subdomain);
      if (tenant) return tenant;
    }

    // 3. Custom header (for iframe/embedded)
    const tenantHeader = localStorage.getItem('imperium_tenant_header');
    if (tenantHeader) {
      return this.getTenantByIdentifier(tenantHeader);
    }

    // 4. LocalStorage
    const stored = localStorage.getItem('imperium_current_tenant');
    if (stored) {
      return JSON.parse(stored);
    }

    // 5. Default tenant
    return this.getDefaultTenant();
  }

  /**
   * Extract tenant subdomain from hostname
   * Handles: admin.localhost, staging.admin.example.com, tenant.domain.com
   */
  extractSubdomain(hostname) {
    const { reservedSubdomains, customRegex, knownTLDs, baseDomains } = this.subdomainConfig;

    // Custom regex override
    if (customRegex) {
      const match = hostname.match(customRegex);
      if (match && match[1]) return match[1];
    }

    const parts = hostname.split('.');
    
    // IP address or localhost without subdomain
    if (parts.length === 1 || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null;
    }

    // Check if hostname is a base domain (e.g., localhost, example.com)
    if (baseDomains.has(hostname)) {
      return null;
    }

    // For 2-part domains (tenant.com), no subdomain
    if (parts.length === 2) {
      const tld = parts[1].toLowerCase();
      if (knownTLDs.has(tld)) {
        return null; // e.g., tenant.com -> no subdomain
      }
    }

    // For 3+ parts, extract subdomain considering public suffix
    // e.g., admin.localhost -> null (localhost is base)
    // staging.admin.example.com -> 'staging.admin' or 'admin' depending on config
    // tenant.example.com -> 'tenant'

    // Simple heuristic: first part unless it's reserved
    const potentialSubdomain = parts[0].toLowerCase();
    
    // Check if it's a reserved subdomain
    if (reservedSubdomains.has(potentialSubdomain)) {
      // Check if there's a deeper subdomain (e.g., staging.admin.example.com)
      if (parts.length >= 4) {
        // Return the full subdomain path except TLD and domain
        // e.g., staging.admin.example.com -> 'staging.admin'
        return parts.slice(0, -2).join('.');
      }
      return null;
    }

    return potentialSubdomain;
  }

  /**
   * Configure subdomain parsing at runtime
   */
  configureSubdomainParsing(config) {
    if (config.reservedSubdomains) {
      this.subdomainConfig.reservedSubdomains = new Set(config.reservedSubdomains);
    }
    if (config.customRegex) {
      this.subdomainConfig.customRegex = config.customRegex;
    }
    if (config.baseDomains) {
      this.subdomainConfig.baseDomains = new Set(config.baseDomains);
    }
    if (config.knownTLDs) {
      this.subdomainConfig.knownTLDs = new Set(config.knownTLDs);
    }
  }

  async getTenantByIdentifier(identifier) {
    const cacheKey = `tenant_${identifier}`;
    let tenant = await cacheService.get(cacheKey);
    
    if (!tenant) {
      tenant = await apiService.get(`/tenants/by-identifier/${identifier}`);
      await cacheService.set(cacheKey, tenant, { ttl: 30 * 60 * 1000, tags: ['tenant'] });
    }
    
    return tenant;
  }

  async getTenantBySubdomain(subdomain) {
    const cacheKey = `tenant_subdomain_${subdomain}`;
    let tenant = await cacheService.get(cacheKey);
    
    if (!tenant) {
      try {
        tenant = await apiService.get(`/tenants/by-subdomain/${subdomain}`);
        await cacheService.set(cacheKey, tenant, { ttl: 30 * 60 * 1000, tags: ['tenant'] });
      } catch (e) {
        return null;
      }
    }
    
    return tenant;
  }

  async getDefaultTenant() {
    const cacheKey = 'tenant_default';
    let tenant = await cacheService.get(cacheKey);
    
    if (!tenant) {
      tenant = await apiService.get('/tenants/default');
      await cacheService.set(cacheKey, tenant, { ttl: 60 * 60 * 1000, tags: ['tenant'] });
    }
    
    return tenant;
  }

  async loadTenantConfig(tenantId) {
    const cacheKey = `tenant_config_${tenantId}`;
    let config = await cacheService.get(cacheKey);
    
    if (!config) {
      config = await apiService.get(`/tenants/${tenantId}/config`);
      await cacheService.set(cacheKey, config, { ttl: 10 * 60 * 1000, tags: ['tenant', 'config'] });
    }
    
    this.configurations.set(tenantId, config);
    this.applyTenantConfig(config);
    
    return config;
  }

  applyTenantConfig(config) {
    // Apply theme
    if (config.theme) {
      document.documentElement.style.setProperty('--color-primary', config.theme.primary || '#0f172a');
      document.documentElement.style.setProperty('--color-accent', config.theme.accent || '#f59e0b');
      document.documentElement.style.setProperty('--font-family', config.theme.font || 'system-ui');
      
      if (config.theme.cssVariables) {
        Object.entries(config.theme.cssVariables).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value);
        });
      }
    }

    // Apply branding
    if (config.branding) {
      this.applyBranding(config.branding);
    }

    // Apply feature flags
    if (config.features) {
      this.applyFeatureFlags(config.features);
    }

    // Apply locale
    if (config.locale) {
      this.applyLocale(config.locale);
    }

    // Emit change event
    this.emit('config:changed', config);
  }

  applyBranding(branding) {
    // Logo
    if (branding.logo) {
      const logoElements = document.querySelectorAll('[data-brand="logo"]');
      logoElements.forEach(el => {
        if (el.tagName === 'IMG') el.src = branding.logo;
        else el.style.backgroundImage = `url(${branding.logo})`;
      });
    }

    // Favicon
    if (branding.favicon) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = branding.favicon;
    }

    // Title
    if (branding.name) {
      document.title = branding.name;
      const titleElements = document.querySelectorAll('[data-brand="title"]');
      titleElements.forEach(el => el.textContent = branding.name);
    }
  }

  applyFeatureFlags(features) {
    Object.entries(features).forEach(([key, enabled]) => {
      document.documentElement.dataset[`feature-${key}`] = enabled ? 'true' : 'false';
    });
    this.emit('features:changed', features);
  }

  applyLocale(locale) {
    document.documentElement.lang = locale.language || 'sr';
    document.documentElement.dir = locale.rtl ? 'rtl' : 'ltr';
    
    // Update currency, date format, number format
    if (locale.currency) {
      window.__IMPERIUM_LOCALE__ = {
        ...window.__IMPERIUM_LOCALE__,
        currency: locale.currency,
        dateFormat: locale.dateFormat,
        numberFormat: locale.numberFormat,
      };
    }
    
    this.emit('locale:changed', locale);
  }

  async switchTenant(tenantId) {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    // Store in localStorage
    localStorage.setItem('imperium_current_tenant', JSON.stringify(tenant));
    
    // Reload configuration
    await this.loadTenantConfig(tenantId);
    
    this.currentTenant = tenant;
    this.emit('tenant:switched', tenant);
    
    return tenant;
  }

  async getTenantById(tenantId) {
    const cacheKey = `tenant_${tenantId}`;
    let tenant = await cacheService.get(cacheKey);
    
    if (!tenant) {
      tenant = await apiService.get(`/tenants/${tenantId}`);
      await cacheService.set(cacheKey, tenant, { ttl: 30 * 60 * 1000, tags: ['tenant'] });
    }
    
    return tenant;
  }

  handleTenantChange(newTenant) {
    if (newTenant && newTenant.id !== this.currentTenant?.id) {
      this.loadTenantConfig(newTenant.id);
      this.currentTenant = newTenant;
      this.emit('tenant:switched', newTenant);
    }
  }

  getCurrentTenant() {
    return this.currentTenant;
  }

  getTenantConfig() {
    return this.currentTenant ? this.configurations.get(this.currentTenant.id) : null;
  }

  // =========================================================================
  // Store Management
  // =========================================================================

  async getStores(tenantId = null) {
    const tid = tenantId || this.currentTenant?.id;
    if (!tid) return [];

    const cacheKey = `stores_${tid}`;
    let stores = await cacheService.get(cacheKey);
    
    if (!stores) {
      stores = await apiService.get(`/tenants/${tid}/stores`);
      await cacheService.set(cacheKey, stores, { ttl: 15 * 60 * 1000, tags: ['tenant', 'stores'] });
    }
    
    stores.forEach(s => this.stores.set(s.id, s));
    return stores;
  }

  async getStore(storeId) {
    if (this.stores.has(storeId)) {
      return this.stores.get(storeId);
    }
    
    const store = await apiService.get(`/stores/${storeId}`);
    this.stores.set(storeId, store);
    return store;
  }

  async createStore(tenantId, data) {
    const store = await apiService.post(`/tenants/${tenantId}/stores`, data);
    this.stores.set(store.id, store);
    await cacheService.invalidateByTag('stores');
    this.emit('store:created', store);
    return store;
  }

  async updateStore(storeId, data) {
    const store = await apiService.put(`/stores/${storeId}`, data);
    this.stores.set(storeId, store);
    await cacheService.invalidateByTag('stores');
    this.emit('store:updated', store);
    return store;
  }

  async deleteStore(storeId) {
    await apiService.delete(`/stores/${storeId}`);
    this.stores.delete(storeId);
    await cacheService.invalidateByTag('stores');
    this.emit('store:deleted', storeId);
  }

  // =========================================================================
  // Organization Management
  // =========================================================================

  async getOrganizations(tenantId = null) {
    const tid = tenantId || this.currentTenant?.id;
    if (!tid) return [];

    const cacheKey = `organizations_${tid}`;
    let orgs = await cacheService.get(cacheKey);
    
    if (!orgs) {
      orgs = await apiService.get(`/tenants/${tid}/organizations`);
      await cacheService.set(cacheKey, orgs, { ttl: 15 * 60 * 1000, tags: ['tenant', 'organizations'] });
    }
    
    orgs.forEach(o => this.organizations.set(o.id, o));
    return orgs;
  }

  async getOrganization(orgId) {
    if (this.organizations.has(orgId)) {
      return this.organizations.get(orgId);
    }
    
    const org = await apiService.get(`/organizations/${orgId}`);
    this.organizations.set(orgId, org);
    return org;
  }

  // =========================================================================
  // White-label Configuration
  // =========================================================================

  async getWhiteLabelConfig(tenantId = null) {
    const tid = tenantId || this.currentTenant?.id;
    if (!tid) return null;

    const cacheKey = `whitelabel_${tid}`;
    let config = await cacheService.get(cacheKey);
    
    if (!config) {
      config = await apiService.get(`/tenants/${tid}/whitelabel`);
      await cacheService.set(cacheKey, config, { ttl: 60 * 60 * 1000, tags: ['tenant', 'whitelabel'] });
    }
    
    return config;
  }

  async updateWhiteLabelConfig(tenantId, config) {
    const updated = await apiService.put(`/tenants/${tenantId}/whitelabel`, config);
    await cacheService.invalidateByTag('whitelabel');
    this.emit('whitelabel:updated', updated);
    return updated;
  }

  // =========================================================================
  // Domain Management
  // =========================================================================

  async getDomains(tenantId = null) {
    const tid = tenantId || this.currentTenant?.id;
    if (!tid) return [];

    return apiService.get(`/tenants/${tid}/domains`);
  }

  async addDomain(tenantId, domain) {
    const result = await apiService.post(`/tenants/${tenantId}/domains`, { domain });
    await cacheService.invalidateByTag('domains');
    return result;
  }

  async verifyDomain(tenantId, domainId) {
    const result = await apiService.post(`/tenants/${tenantId}/domains/${domainId}/verify`);
    return result;
  }

  async removeDomain(tenantId, domainId) {
    await apiService.delete(`/tenants/${tenantId}/domains/${domainId}`);
    await cacheService.invalidateByTag('domains');
  }

  // =========================================================================
  // User Context
  // =========================================================================

  getUserContext() {
    return {
      tenant: this.currentTenant,
      config: this.getTenantConfig(),
      store: this.getCurrentStore(),
      organization: this.getCurrentOrganization(),
      permissions: this.getCurrentPermissions(),
    };
  }

  getCurrentStore() {
    const storeId = localStorage.getItem('imperium_current_store');
    if (storeId) return this.stores.get(storeId);
    return null;
  }

  setCurrentStore(storeId) {
    localStorage.setItem('imperium_current_store', storeId);
    this.emit('store:switched', this.stores.get(storeId));
  }

  getCurrentOrganization() {
    const orgId = localStorage.getItem('imperium_current_organization');
    if (orgId) return this.organizations.get(orgId);
    return null;
  }

  setCurrentOrganization(orgId) {
    localStorage.setItem('imperium_current_organization', orgId);
    this.emit('organization:switched', this.organizations.get(orgId));
  }

  getCurrentPermissions() {
    // Combine tenant, store, and organization permissions
    const permissions = new Set();
    
    if (this.currentTenant?.permissions) {
      this.currentTenant.permissions.forEach(p => permissions.add(p));
    }
    
    const store = this.getCurrentStore();
    if (store?.permissions) {
      store.permissions.forEach(p => permissions.add(p));
    }
    
    const org = this.getCurrentOrganization();
    if (org?.permissions) {
      org.permissions.forEach(p => permissions.add(p));
    }
    
    return Array.from(permissions);
  }

  hasPermission(permission) {
    return this.getCurrentPermissions().includes(permission);
  }

  // =========================================================================
  // Event System
  // =========================================================================

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.warn(`[MultiTenant] Event handler error for ${event}:`, e);
      }
    });
  }

  // =========================================================================
  // Utility
  // =========================================================================

  isMultiTenant() {
    return envConfig.get('VITE_ENABLE_MULTITENANT') !== false;
  }

  clearCache() {
    this.tenants.clear();
    this.stores.clear();
    this.organizations.clear();
    this.configurations.clear();
  }
}

const multiTenantService = new MultiTenantService();

export { MultiTenantService, multiTenantService };
export default multiTenantService;