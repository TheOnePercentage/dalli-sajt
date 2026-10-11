/**
 * Connection Manager
 * Central manager for all platform connectors
 */

import { InstagramConnector } from './instagram-connector.js';
import { FacebookPageConnector } from './facebook-page-connector.js';
import { MetaBMConnector } from './meta-bm-connector.js';
import { MetaAdsConnector } from './meta-ads-connector.js';
import { TikTokBusinessConnector } from './tiktok-business-connector.js';
import { TikTokAdsConnector } from './tiktok-ads-connector.js';
import { GoogleAnalyticsConnector } from './google-analytics-connector.js';
import { GoogleSearchConsoleConnector } from './google-search-console-connector.js';
import { PlatformStatus, BaseConnector } from './base-connector.js';
import { ImperiumUtils } from '../utils/helpers.js';

const PLATFORM_CONFIGS = {
  instagram: {
    class: InstagramConnector,
    config: {
      platformId: 'instagram',
      platformName: 'Instagram Business',
      icon: 'instagram',
      color: '#E1306C',
      gradient: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)'
    }
  },
  facebook: {
    class: FacebookPageConnector,
    config: {
      platformId: 'facebook',
      platformName: 'Facebook Page',
      icon: 'facebook',
      color: '#1877F2',
      gradient: 'linear-gradient(45deg, #1877F2, #42A5F5)'
    }
  },
  meta_bm: {
    class: MetaBMConnector,
    config: {
      platformId: 'meta_bm',
      platformName: 'Meta Business Manager',
      icon: 'meta',
      color: '#0064FF',
      gradient: 'linear-gradient(45deg, #0064FF, #0096FF)'
    }
  },
  meta_ads: {
    class: MetaAdsConnector,
    config: {
      platformId: 'meta_ads',
      platformName: 'Meta Ads',
      icon: 'meta-ads',
      color: '#1877F2',
      gradient: 'linear-gradient(45deg, #1877F2, #0D47A1)'
    }
  },
  tiktok: {
    class: TikTokBusinessConnector,
    config: {
      platformId: 'tiktok',
      platformName: 'TikTok Business',
      icon: 'tiktok',
      color: '#000000',
      gradient: 'linear-gradient(45deg, #000000, #69C0D0, #EE1D52)'
    }
  },
  tiktok_ads: {
    class: TikTokAdsConnector,
    config: {
      platformId: 'tiktok_ads',
      platformName: 'TikTok Ads',
      icon: 'tiktok-ads',
      color: '#000000',
      gradient: 'linear-gradient(45deg, #000000, #FF6B35)'
    }
  },
  google_analytics: {
    class: GoogleAnalyticsConnector,
    config: {
      platformId: 'google_analytics',
      platformName: 'Google Analytics (GA4)',
      icon: 'google-analytics',
      color: '#F9AB00',
      gradient: 'linear-gradient(45deg, #F9AB00, #FF6D00)'
    }
  },
  google_search_console: {
    class: GoogleSearchConsoleConnector,
    config: {
      platformId: 'google_search_console',
      platformName: 'Google Search Console',
      icon: 'google-search-console',
      color: '#4285F4',
      gradient: 'linear-gradient(45deg, #4285F4, #34A853, #FBBC05, #EA4335)'
    }
  }
};

class ConnectionManager {
  constructor() {
    this.connectors = new Map();
    this.listeners = new Map();
    this.initialized = false;
    this.credentials = {};
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (error) {
          console.error(`[ConnectionManager] Listener error for ${event}:`, error);
        }
      });
    }
  }

  setCredentials(platformId, credentials) {
    this.credentials[platformId] = credentials;
    const connector = this.connectors.get(platformId);
    if (connector && connector.setCredentials) {
      connector.setCredentials(
        credentials.clientId,
        credentials.clientSecret,
        credentials.redirectUri
      );
    }
  }

  getConnector(platformId) {
    return this.connectors.get(platformId);
  }

  getAllConnectors() {
    return Array.from(this.connectors.values());
  }

  getConnectedConnectors() {
    return this.getAllConnectors().filter(c => c.status === PlatformStatus.CONNECTED);
  }

  async initialize() {
    if (this.initialized) return;
    
    // Initialize connectors with classes
    for (const [platformId, platformConfig] of Object.entries(PLATFORM_CONFIGS)) {
      let connector;
      
      if (platformConfig.class) {
        connector = new platformConfig.class(platformConfig.config);
      } else {
        connector = this.createPlaceholderConnector(platformConfig.config);
      }
      
      this.connectors.set(platformId, connector);
    }
    
    // Load saved connections
    await this.loadAllConnections();
    
    // Set up cross-connector events
    this.setupCrossEvents();
    
    this.initialized = true;
    this.emit('ready', { connectors: this.getAllConnectors() });
  }

  createPlaceholderConnector(config) {
    const connector = {
      platformId: config.platformId,
      platformName: config.platformName,
      icon: config.icon,
      color: config.color,
      gradient: config.gradient,
      status: PlatformStatus.DISCONNECTED,
      accountId: null,
      accountName: null,
      avatarUrl: null,
      metadata: {},
      lastSyncAt: null,
      syncError: null,
      listeners: new Map(),
      
      on(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
      },
      
      off(event, callback) {
        if (this.listeners.has(event)) this.listeners.get(event).delete(callback);
      },
      
      emit(event, data) {
        if (this.listeners.has(event)) {
          this.listeners.get(event).forEach(cb => cb(data));
        }
      },
      
      setStatus(status, error = null) {
        this.status = status;
        this.syncError = error;
        this.emit('status-change', { platform: this.platformId, status, error });
      },
      
      async connect() {
        this.setStatus(PlatformStatus.CONNECTING);
        // Placeholder - will be implemented when connector is built
        this.setStatus(PlatformStatus.ERROR, 'Not implemented yet');
        return { success: false, error: 'Not implemented yet' };
      },
      
      async disconnect() {
        this.setStatus(PlatformStatus.DISCONNECTED);
        this.emit('disconnect', { platform: this.platformId });
      },
      
      async loadConnection() { return false; },
      async saveConnection() {},
      clearConnection() {},
      getOAuthUrl() { return '#'; },
      getShortcuts() { return []; },
      destroy() { this.listeners.clear(); }
    };
    
    return connector;
  }

  setupCrossEvents() {
    for (const connector of this.connectors.values()) {
      connector.on('status-change', (data) => {
        this.emit('platform-status-change', data);
      });
      
      connector.on('connect', (data) => {
        this.emit('platform-connect', data);
      });
      
      connector.on('disconnect', (data) => {
        this.emit('platform-disconnect', data);
      });
      
      connector.on('sync-complete', (data) => {
        this.emit('platform-sync-complete', data);
      });
      
      connector.on('sync-error', (data) => {
        this.emit('platform-sync-error', data);
      });
    }
  }

  async loadAllConnections() {
    const results = {};
    
    for (const [platformId, connector] of this.connectors) {
      if (typeof connector.loadConnection === 'function') {
        try {
          results[platformId] = await connector.loadConnection();
        } catch (error) {
          console.error(`[ConnectionManager] Failed to load ${platformId}:`, error);
          results[platformId] = false;
        }
      }
    }
    
    return results;
  }

  async saveAllConnections() {
    for (const connector of this.connectors.values()) {
      if (typeof connector.saveConnection === 'function') {
        try {
          await connector.saveConnection();
        } catch (error) {
          console.error(`[ConnectionManager] Failed to save ${connector.platformId}:`, error);
        }
      }
    }
  }

  getPlatformConfig(platformId) {
    return PLATFORM_CONFIGS[platformId]?.config;
  }

  getAllPlatformConfigs() {
    return Object.values(PLATFORM_CONFIGS).map(p => p.config);
  }

  getStatusSummary() {
    const summary = {
      total: this.connectors.size,
      connected: 0,
      disconnected: 0,
      error: 0,
      expired: 0,
      platforms: {}
    };
    
    for (const [platformId, connector] of this.connectors) {
      const status = connector.status || PlatformStatus.DISCONNECTED;
      summary.platforms[platformId] = {
        id: platformId,
        name: connector.platformName,
        status,
        icon: connector.icon,
        color: connector.color,
        gradient: connector.gradient,
        accountName: connector.accountName,
        avatarUrl: connector.avatarUrl,
        lastSyncAt: connector.lastSyncAt,
        syncError: connector.syncError
      };
      
      switch (status) {
        case PlatformStatus.CONNECTED:
          summary.connected++;
          break;
        case PlatformStatus.DISCONNECTED:
          summary.disconnected++;
          break;
        case PlatformStatus.ERROR:
          summary.error++;
          break;
        case PlatformStatus.EXPIRED:
          summary.expired++;
          break;
      }
    }
    
    return summary;
  }

  getQuickAccessShortcuts() {
    const shortcuts = [];
    
    for (const connector of this.connectors.values()) {
      if (connector.status === PlatformStatus.CONNECTED && typeof connector.getShortcuts === 'function') {
        const connectorShortcuts = connector.getShortcuts();
        shortcuts.push(...connectorShortcuts.map(s => ({
          ...s,
          platform: connector.platformId,
          platformName: connector.platformName,
          icon: connector.icon,
          color: connector.color
        })));
      }
    }
    
    return shortcuts;
  }

  async disconnectAll() {
    for (const connector of this.connectors.values()) {
      if (typeof connector.disconnect === 'function') {
        await connector.disconnect();
      }
    }
  }

  destroy() {
    for (const connector of this.connectors.values()) {
      if (typeof connector.destroy === 'function') {
        connector.destroy();
      }
    }
    this.connectors.clear();
    this.listeners.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();

export { PLATFORM_CONFIGS, PlatformStatus, ConnectionManager };

export default ConnectionManager;