/**
 * Base Connector Class
 * All platform connectors extend this class
 */

import { ImperiumUtils } from '../utils/helpers.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';

export const PlatformStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  EXPIRED: 'expired',
  ERROR: 'error'
};

export const SyncInterval = {
  REALTIME: 60000,       // 1 minute
  FREQUENT: 300000,      // 5 minutes
  HOURLY: 3600000,       // 1 hour
  DAILY: 86400000        // 24 hours
};

export class BaseConnector {
  constructor(config = {}) {
    this.platformId = config.platformId;
    this.platformName = config.platformName;
    this.apiBaseUrl = config.apiBaseUrl;
    this.oauthConfig = config.oauthConfig || {};
    this.scopes = config.scopes || [];
    this.syncInterval = config.syncInterval || SyncInterval.HOURLY;
    
    this.status = PlatformStatus.DISCONNECTED;
    this.accountId = null;
    this.accountName = null;
    this.avatarUrl = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.metadata = {};
    this.lastSyncAt = null;
    this.syncError = null;
    this.syncTimer = null;
    this.listeners = new Map();
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
          console.error(`[${this.platformId}] Listener error for ${event}:`, error);
        }
      });
    }
  }

  setStatus(status, error = null) {
    const oldStatus = this.status;
    this.status = status;
    this.syncError = error;
    
    if (oldStatus !== status) {
      this.emit('status-change', { 
        platform: this.platformId, 
        status, 
        previousStatus: oldStatus,
        error 
      });
    }
  }

  async connect(authData) {
    this.setStatus(PlatformStatus.CONNECTING);
    
    try {
      const tokenData = await this.exchangeCodeForToken(authData.code);
      
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || null;
      this.tokenExpiresAt = tokenData.expires_in 
        ? Date.now() + (tokenData.expires_in * 1000) 
        : null;
      
      // Fetch account info
      const accountInfo = await this.fetchAccountInfo();
      this.accountId = accountInfo.id;
      this.accountName = accountInfo.name;
      this.avatarUrl = accountInfo.avatar;
      
      this.setStatus(PlatformStatus.CONNECTED);
      this.emit('connect', { platform: this.platformId, account: accountInfo });
      
      // Start periodic sync
      this.startSync();
      
      return { success: true, account: accountInfo };
    } catch (error) {
      this.setStatus(PlatformStatus.ERROR, error.message);
      this.emit('error', { platform: this.platformId, error });
      return { success: false, error: error.message };
    }
  }

  async exchangeCodeForToken(code) {
    throw new Error('exchangeCodeForToken must be implemented by subclass');
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    throw new Error('refreshAccessToken must be implemented by subclass');
  }

  async fetchAccountInfo() {
    throw new Error('fetchAccountInfo must be implemented by subclass');
  }

  async disconnect() {
    this.stopSync();
    
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.accountId = null;
    this.accountName = null;
    this.avatarUrl = null;
    this.metadata = {};
    this.lastSyncAt = null;
    this.syncError = null;
    
    this.setStatus(PlatformStatus.DISCONNECTED);
    this.emit('disconnect', { platform: this.platformId });
  }

  async makeRequest(endpoint, options = {}) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    
    // Check token expiry
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt - 60000) {
      await this.refreshAccessToken();
    }
    
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle token expiry
      if (response.status === 401) {
        try {
          await this.refreshAccessToken();
          // Retry once
          return this.makeRequest(endpoint, options);
        } catch (refreshError) {
          this.setStatus(PlatformStatus.EXPIRED, 'Token expired');
          throw new Error('Authentication expired, please reconnect');
        }
      }
      
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    return response.json();
  }

  async sync() {
    if (this.status !== PlatformStatus.CONNECTED) {
      return { success: false, error: 'Not connected' };
    }
    
    try {
      const data = await this.fetchMetrics();
      this.lastSyncAt = Date.now();
      this.syncError = null;
      
      this.emit('sync-complete', { 
        platform: this.platformId, 
        data,
        timestamp: this.lastSyncAt 
      });
      
      return { success: true, data, timestamp: this.lastSyncAt };
    } catch (error) {
      this.syncError = error.message;
      this.emit('sync-error', { 
        platform: this.platformId, 
        error: error.message 
      });
      return { success: false, error: error.message };
    }
  }

  async fetchMetrics() {
    throw new Error('fetchMetrics must be implemented by subclass');
  }

  startSync() {
    this.stopSync();
    this.syncTimer = setInterval(() => this.sync(), this.syncInterval);
    // Initial sync
    this.sync();
  }

  stopSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  isTokenExpired() {
    if (!this.tokenExpiresAt) return false;
    return Date.now() >= this.tokenExpiresAt;
  }

  getConnectionData() {
    return {
      platformId: this.platformId,
      platformName: this.platformName,
      status: this.status,
      accountId: this.accountId,
      accountName: this.accountName,
      avatarUrl: this.avatarUrl,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      tokenExpiresAt: this.tokenExpiresAt,
      metadata: this.metadata,
      lastSyncAt: this.lastSyncAt,
      syncError: this.syncError,
      scopes: this.scopes
    };
  }

  async saveConnection() {
    const data = this.getConnectionData();
    const encrypted = {
      ...data,
      accessToken: data.accessToken ? await encryptToken(data.accessToken) : null,
      refreshToken: data.refreshToken ? await encryptToken(data.refreshToken) : null
    };
    
    localStorage.setItem(`dalli_connection_${this.platformId}`, JSON.stringify(encrypted));
    return encrypted;
  }

  async loadConnection() {
    const stored = localStorage.getItem(`dalli_connection_${this.platformId}`);
    if (!stored) return false;
    
    try {
      const data = JSON.parse(stored);
      
      this.accountId = data.accountId;
      this.accountName = data.accountName;
      this.avatarUrl = data.avatarUrl;
      this.tokenExpiresAt = data.tokenExpiresAt;
      this.metadata = data.metadata || {};
      this.lastSyncAt = data.lastSyncAt;
      this.syncError = data.syncError;
      this.scopes = data.scopes || this.scopes;
      
      if (data.accessToken) {
        this.accessToken = await decryptToken(data.accessToken);
      }
      if (data.refreshToken) {
        this.refreshToken = await decryptToken(data.refreshToken);
      }
      
      if (this.accessToken) {
        // Verify token works
        try {
          await this.fetchAccountInfo();
          this.setStatus(PlatformStatus.CONNECTED);
          this.startSync();
          return true;
        } catch (error) {
          // Token invalid, try refresh
          if (this.refreshToken) {
            try {
              await this.refreshAccessToken();
              this.setStatus(PlatformStatus.CONNECTED);
              this.startSync();
              return true;
            } catch (refreshError) {
              this.setStatus(PlatformStatus.EXPIRED);
              return false;
            }
          }
          this.setStatus(PlatformStatus.EXPIRED);
          return false;
        }
      }
      
      this.setStatus(PlatformStatus.DISCONNECTED);
      return false;
    } catch (error) {
      console.error(`[${this.platformId}] Failed to load connection:`, error);
      return false;
    }
  }

  clearConnection() {
    localStorage.removeItem(`dalli_connection_${this.platformId}`);
  }

  getOAuthUrl(state = null) {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: this.scopes.join(' '),
      response_type: 'code',
      state: state || this.generateState()
    });
    
    return `${this.oauthConfig.authUrl}?${params.toString()}`;
  }

  generateState() {
    return ImperiumUtils.randomString(32);
  }

  destroy() {
    this.stopSync();
    this.listeners.clear();
  }
}

export default BaseConnector;