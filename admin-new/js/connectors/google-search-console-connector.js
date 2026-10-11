/**
 * Google Search Console Connector
 * For search analytics, queries, CTR, position data
 */

import { BaseConnector, PlatformStatus, SyncInterval } from './base-connector.js';
import { ImperiumUtils } from '../utils/helpers.js';

const GSC_CONFIG = {
  platformId: 'google_search_console',
  platformName: 'Google Search Console',
  apiBaseUrl: 'https://searchconsole.googleapis.com/v1',
  oauthConfig: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: null,
    clientSecret: null,
    redirectUri: null
  },
  scopes: [
    'https://www.googleapis.com/auth/webmasters.readonly'
  ],
  syncInterval: SyncInterval.DAILY
};

export class GoogleSearchConsoleConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...GSC_CONFIG, ...config });
    this.siteUrl = null;
    this.sites = [];
  }

  setCredentials(clientId, clientSecret, redirectUri) {
    this.oauthConfig.clientId = clientId;
    this.oauthConfig.clientSecret = clientSecret;
    this.oauthConfig.redirectUri = redirectUri;
  }

  async exchangeCodeForToken(code) {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      redirect_uri: this.oauthConfig.redirectUri,
      code,
      grant_type: 'authorization_code'
    });
    
    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || error.error || 'Failed to exchange code for token');
    }
    
    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    };
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token'
    });
    
    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    
    await this.saveConnection();
    return data;
  }

  async makeRequest(endpoint, options = {}) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    
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
      if (response.status === 401) {
        try {
          await this.refreshAccessToken();
          return this.makeRequest(endpoint, options);
        } catch (refreshError) {
          this.setStatus(PlatformStatus.EXPIRED, 'Token expired');
          throw new Error('Authentication expired, please reconnect');
        }
      }
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    return response.json();
  }

  async fetchAccountInfo() {
    const sites = await this.makeRequest('/sites', {
      method: 'GET'
    });
    
    this.sites = sites.siteEntry || [];
    
    if (this.sites.length === 0) {
      throw new Error('No verified sites found in Search Console. Please verify your site first.');
    }
    
    const verifiedSite = this.sites.find(s => s.permissionLevel === 'siteOwner' || s.permissionLevel === 'siteFullUser') || this.sites[0];
    this.siteUrl = verifiedSite.siteUrl;
    
    this.metadata = {
      sites: this.sites.map(s => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel
      }))
    };
    
    return {
      id: this.siteUrl,
      name: new URL(this.siteUrl).hostname,
      permission: verifiedSite.permissionLevel,
      totalSites: this.sites.length
    };
  }

  async fetchMetrics() {
    if (!this.siteUrl) {
      throw new Error('Site URL not set');
    }
    
    const [
      searchAnalytics,
      sitemaps,
      indexCoverage,
      urlInspection
    ] = await Promise.allSettled([
      this.fetchSearchAnalytics(),
      this.fetchSitemaps(),
      this.fetchIndexCoverage(),
      this.fetchUrlInspection()
    ]);
    
    return {
      siteUrl: this.siteUrl,
      siteName: new URL(this.siteUrl).hostname,
      
      searchAnalytics: searchAnalytics.status === 'fulfilled' ? searchAnalytics.value : {},
      sitemaps: sitemaps.status === 'fulfilled' ? sitemaps.value : {},
      indexCoverage: indexCoverage.status === 'fulfilled' ? indexCoverage.value : {},
      urlInspection: urlInspection.status === 'fulfilled' ? urlInspection.value : {}
    };
  }

  async fetchSearchAnalytics() {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    const [
      queriesReport,
      pagesReport,
      countriesReport,
      devicesReport,
      searchAppearanceReport,
      dateReport
    ] = await Promise.allSettled([
      this.querySearchAnalytics({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'],
        rowLimit: 1000
      }),
      this.querySearchAnalytics({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['page'],
        rowLimit: 1000
      }),
      this.querySearchAnalytics({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['country'],
        rowLimit: 100
      }),
      this.querySearchAnalytics({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['device'],
        rowLimit: 10
      }),
      this.querySearchAnalytics({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['searchAppearance'],
        rowLimit: 10
      }),
      this.querySearchAnalytics({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['date'],
        rowLimit: 1000
      })
    ]);
    
    let totals = {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    };
    
    const topQueries = [];
    
    if (queriesReport.status === 'fulfilled') {
      const rows = queriesReport.value.rows || [];
      for (const row of rows) {
        const clicks = row.clicks || 0;
        const impressions = row.impressions || 0;
        const ctr = row.ctr || 0;
        const position = row.position || 0;
        
        totals.clicks += clicks;
        totals.impressions += impressions;
        
        topQueries.push({
          query: row.keys?.[0] || '',
          clicks,
          impressions,
          ctr: Number(ctr.toFixed(4)),
          position: Number(position.toFixed(1))
        });
      }
      
      totals.ctr = totals.impressions > 0 ? Number((totals.clicks / totals.impressions * 100).toFixed(2)) : 0;
      totals.position = rows.length > 0 
        ? Number((rows.reduce((sum, r) => sum + (r.position || 0), 0) / rows.length).toFixed(1))
        : 0;
    }
    
    return {
      totals,
      topQueries: topQueries.sort((a, b) => b.clicks - a.clicks).slice(0, 50),
      topPages: pagesReport.status === 'fulfilled' 
        ? (pagesReport.value.rows || []).map(row => ({
            page: row.keys?.[0] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: Number((row.ctr || 0).toFixed(4)),
            position: Number((row.position || 0).toFixed(1))
          })).sort((a, b) => b.clicks - a.clicks).slice(0, 50)
        : [],
      countries: countriesReport.status === 'fulfilled'
        ? (countriesReport.value.rows || []).map(row => ({
            country: row.keys?.[0] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: Number((row.ctr || 0).toFixed(4)),
            position: Number((row.position || 0).toFixed(1))
          })).sort((a, b) => b.clicks - a.clicks)
        : [],
      devices: devicesReport.status === 'fulfilled'
        ? (devicesReport.value.rows || []).map(row => ({
            device: row.keys?.[0] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: Number((row.ctr || 0).toFixed(4)),
            position: Number((row.position || 0).toFixed(1))
          }))
        : [],
      searchAppearance: searchAppearanceReport.status === 'fulfilled'
        ? (searchAppearanceReport.value.rows || []).map(row => ({
            appearance: row.keys?.[0] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: Number((row.ctr || 0).toFixed(4)),
            position: Number((row.position || 0).toFixed(1))
          }))
        : [],
      dailyTrend: dateReport.status === 'fulfilled'
        ? (dateReport.value.rows || []).map(row => ({
            date: row.keys?.[0] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: Number((row.ctr || 0).toFixed(4)),
            position: Number((row.position || 0).toFixed(1))
          })).sort((a, b) => a.date.localeCompare(b.date))
        : []
    };
  }

  async querySearchAnalytics(request) {
    const body = {
      startDate: request.startDate,
      endDate: request.endDate,
      dimensions: request.dimensions,
      rowLimit: request.rowLimit || 1000,
      startRow: request.startRow || 0,
      aggregationType: 'byPage'
    };
    
    const encodedSiteUrl = encodeURIComponent(this.siteUrl);
    return this.makeRequest(`/sites/${encodedSiteUrl}/searchAnalytics/query`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async fetchSitemaps() {
    const sitemaps = await this.makeRequest(`/sites/${encodeURIComponent(this.siteUrl)}/sitemaps`, {
      method: 'GET'
    });
    
    return {
      sitemaps: (sitemaps.sitemap || []).map(s => ({
        path: s.path,
        lastSubmitted: s.lastSubmitted,
        type: s.type,
        contents: s.contents || [],
        errors: s.errors || 0,
        warnings: s.warnings || 0
      })),
      totalSubmitted: (sitemaps.sitemap || []).reduce((sum, s) => sum + (s.contents?.[0]?.submitted || 0), 0),
      totalIndexed: (sitemaps.sitemap || []).reduce((sum, s) => sum + (s.contents?.[0]?.indexed || 0), 0)
    };
  }

  async fetchIndexCoverage() {
    const response = await this.makeRequest(`/sites/${encodeURIComponent(this.siteUrl)}/indexCoverage`, {
      method: 'GET'
    });
    
    return {
      summary: response.summary || {},
      details: (response.indexCoverage || []).map(d => ({
        state: d.state,
        count: d.count,
        examples: d.examples || []
      }))
    };
  }

  async fetchUrlInspection() {
    if (!this.siteUrl) return { error: 'Site URL not set' };
    
    try {
      const response = await this.makeRequest(`/urlInspection/index:inspect`, {
        method: 'POST',
        body: JSON.stringify({
          inspectionUrl: this.siteUrl,
          siteUrl: this.siteUrl
        })
      });
      
      return {
        inspectionResult: response.inspectionResult || {},
        indexStatus: response.inspectionResult?.indexStatusResult || {},
        mobileUsability: response.inspectionResult?.mobileUsabilityResult || {},
        richResults: response.inspectionResult?.richResultsResult || {}
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async submitUrlForIndexing(url) {
    return this.makeRequest(`/urlNotifications:publish`, {
      method: 'POST',
      body: JSON.stringify({
        url,
        type: 'URL_UPDATED'
      })
    });
  }

  getShortcuts() {
    return [
      { key: 'gsc-home', label: 'Search Console', url: 'https://search.google.com/search-console', action: 'open-gsc' },
      { key: 'gsc-performance', label: 'Performance', url: `https://search.google.com/search-console/performance?resource_id=${encodeURIComponent(this.siteUrl)}`, action: 'open-gsc-performance' },
      { key: 'gsc-coverage', label: 'Index Coverage', url: `https://search.google.com/search-console/index?resource_id=${encodeURIComponent(this.siteUrl)}`, action: 'open-gsc-coverage' },
      { key: 'gsc-sitemaps', label: 'Sitemaps', url: `https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(this.siteUrl)}`, action: 'open-gsc-sitemaps' }
    ];
  }
}

export default GoogleSearchConsoleConnector;