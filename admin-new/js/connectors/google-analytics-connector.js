/**
 * Google Analytics (GA4) Connector
 * Uses GA4 Admin API + Data API for analytics data
 */

import { BaseConnector, PlatformStatus, SyncInterval } from './base-connector.js';
import { ImperiumUtils } from '../utils/helpers.js';

const GA4_CONFIG = {
  platformId: 'google_analytics',
  platformName: 'Google Analytics (GA4)',
  apiBaseUrl: 'https://analyticsdata.googleapis.com/v1beta',
  adminApiBaseUrl: 'https://analyticsadmin.googleapis.com/v1alpha',
  oauthConfig: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: null,
    clientSecret: null,
    redirectUri: null
  },
  scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics.edit'
  ],
  syncInterval: SyncInterval.HOURLY
};

export class GoogleAnalyticsConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...GA4_CONFIG, ...config });
    this.propertyId = null;
    this.propertyName = null;
    this.dataStreamId = null;
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

  async makeAdminRequest(endpoint, options = {}) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt - 60000) {
      await this.refreshAccessToken();
    }
    
    const url = `${this.adminApiBaseUrl}${endpoint}`;
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
          return this.makeAdminRequest(endpoint, options);
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
    const accounts = await this.makeAdminRequest('/accountSummaries', {
      method: 'GET'
    });
    
    if (!accounts.accountSummaries || accounts.accountSummaries.length === 0) {
      throw new Error('No Google Analytics accounts found');
    }
    
    let foundProperty = null;
    for (const account of accounts.accountSummaries) {
      for (const prop of account.propertySummaries || []) {
        if (prop.propertyType === 'GA4') {
          foundProperty = prop;
          this.propertyId = prop.property.replace('properties/', '');
          break;
        }
      }
      if (foundProperty) break;
    }
    
    if (!foundProperty) {
      throw new Error('No GA4 properties found. Please create a GA4 property first.');
    }
    
    const property = await this.makeAdminRequest(`/${foundProperty.property}`, {
      method: 'GET'
    });
    
    this.propertyName = property.displayName;
    this.metadata = {
      accountId: account.name.replace('accounts/', ''),
      propertyId: this.propertyId,
      propertyName: property.displayName,
      currencyCode: property.currencyCode,
      timeZone: property.timeZone,
      industryCategory: property.industryCategory
    };
    
    const dataStreams = await this.makeAdminRequest(`/${foundProperty.property}/dataStreams`, {
      method: 'GET'
    });
    
    if (dataStreams.dataStreams && dataStreams.dataStreams.length > 0) {
      this.dataStreamId = dataStreams.dataStreams[0].name.replace('dataStreams/', '');
      this.metadata.dataStreamId = this.dataStreamId;
      this.metadata.dataStreamType = dataStreams.dataStreams[0].type;
    }
    
    return {
      id: this.propertyId,
      name: property.displayName,
      accountId: this.metadata.accountId,
      currency: property.currencyCode,
      timezone: property.timeZone,
      dataStreamId: this.dataStreamId
    };
  }

  async runReport(metrics, dimensions = [], dateRanges = [{ startDate: '30daysAgo', endDate: 'today' }], limit = 10000) {
    const body = {
      metrics: metrics.map(m => ({ name: m })),
      dimensions: dimensions.map(d => ({ name: d })),
      dateRanges,
      limit,
      dimensionFilter: undefined,
      metricFilter: undefined,
      orderBys: []
    };
    
    return this.makeRequest(`/properties/${this.propertyId}:runReport`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async fetchMetrics() {
    if (!this.propertyId) {
      throw new Error('Property ID not set');
    }
    
    const [
      overviewReport,
      trafficReport,
      ecommerceReport,
      realtimeReport,
      topPagesReport,
      geoReport,
      deviceReport
    ] = await Promise.allSettled([
      this.fetchOverviewReport(),
      this.fetchTrafficReport(),
      this.fetchEcommerceReport(),
      this.fetchRealtimeReport(),
      this.fetchTopPagesReport(),
      this.fetchGeoReport(),
      this.fetchDeviceReport()
    ]);
    
    return {
      propertyId: this.propertyId,
      propertyName: this.propertyName,
      currency: this.metadata.currencyCode,
      timezone: this.metadata.timeZone,
      
      overview: overviewReport.status === 'fulfilled' ? overviewReport.value : {},
      traffic: trafficReport.status === 'fulfilled' ? trafficReport.value : {},
      ecommerce: ecommerceReport.status === 'fulfilled' ? ecommerceReport.value : {},
      realtime: realtimeReport.status === 'fulfilled' ? realtimeReport.value : {},
      topPages: topPagesReport.status === 'fulfilled' ? topPagesReport.value : {},
      geo: geoReport.status === 'fulfilled' ? geoReport.value : {},
      device: deviceReport.status === 'fulfilled' ? deviceReport.value : {}
    };
  }

  async fetchOverviewReport() {
    const response = await this.runReport(
      [
        'activeUsers',
        'newUsers',
        'sessions',
        'screenPageViews',
        'screenPageViewsPerSession',
        'averageSessionDuration',
        'bounceRate',
        'userEngagementDuration'
      ],
      ['date'],
      [{ startDate: '30daysAgo', endDate: 'yesterday' }]
    );
    
    const rows = response.rows || [];
    let totals = {
      activeUsers: 0,
      newUsers: 0,
      sessions: 0,
      screenPageViews: 0,
      engagementDuration: 0
    };
    
    const dailyData = rows.map(row => {
      const values = row.metricValues || [];
      const data = {
        date: row.dimensionValues?.[0]?.value,
        activeUsers: parseInt(values[0]?.value || 0),
        newUsers: parseInt(values[1]?.value || 0),
        sessions: parseInt(values[2]?.value || 0),
        screenPageViews: parseInt(values[3]?.value || 0),
        pagesPerSession: parseFloat(values[4]?.value || 0),
        avgSessionDuration: parseFloat(values[5]?.value || 0),
        bounceRate: parseFloat(values[6]?.value || 0),
        engagementDuration: parseFloat(values[7]?.value || 0)
      };
      
      totals.activeUsers += data.activeUsers;
      totals.newUsers += data.newUsers;
      totals.sessions += data.sessions;
      totals.screenPageViews += data.screenPageViews;
      totals.engagementDuration += data.engagementDuration;
      
      return data;
    });
    
    return {
      ...totals,
      pagesPerSession: totals.sessions > 0 ? (totals.screenPageViews / totals.sessions).toFixed(2) : 0,
      avgSessionDuration: totals.sessions > 0 ? Math.round(totals.engagementDuration / totals.sessions) : 0,
      dailyData
    };
  }

  async fetchTrafficReport() {
    const response = await this.runReport(
      [
        'sessions',
        'newUsers',
        'screenPageViews',
        'averageSessionDuration',
        'bounceRate',
        'conversions'
      ],
      ['sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium', 'date'],
      [{ startDate: '30daysAgo', endDate: 'yesterday' }]
    );
    
    const rows = response.rows || [];
    const channelMap = {};
    
    for (const row of rows) {
      const dims = row.dimensionValues || [];
      const vals = row.metricValues || [];
      const channel = dims[0]?.value || 'Unknown';
      const source = dims[1]?.value || '';
      const medium = dims[2]?.value || '';
      const date = dims[3]?.value || '';
      
      if (!channelMap[channel]) {
        channelMap[channel] = { sessions: 0, newUsers: 0, pageViews: 0, conversions: 0 };
      }
      
      channelMap[channel].sessions += parseInt(vals[0]?.value || 0);
      channelMap[channel].newUsers += parseInt(vals[1]?.value || 0);
      channelMap[channel].pageViews += parseInt(vals[2]?.value || 0);
      channelMap[channel].conversions += parseInt(vals[5]?.value || 0);
    }
    
    const totalSessions = Object.values(channelMap).reduce((sum, c) => sum + c.sessions, 0);
    
    return {
      channels: Object.entries(channelMap).map(([channel, data]) => ({
        channel,
        sessions: data.sessions,
        newUsers: data.newUsers,
        pageViews: data.pageViews,
        conversions: data.conversions,
        percentage: totalSessions > 0 ? (data.sessions / totalSessions * 100).toFixed(1) : 0
      })).sort((a, b) => b.sessions - a.sessions),
      totalSessions
    };
  }

  async fetchEcommerceReport() {
    const response = await this.runReport(
      [
        'transactions',
        'totalRevenue',
        'averageOrderValue',
        'itemsViewed',
        'itemsAddedToCart',
        'itemsPurchased',
        'cartToViewRate',
        'cartToPurchaseRate'
      ],
      ['itemName', 'itemId', 'date'],
      [{ startDate: '30daysAgo', endDate: 'yesterday' }]
    );
    
    const rows = response.rows || [];
    let totalTransactions = 0;
    let totalRevenue = 0;
    let totalItemsPurchased = 0;
    const products = {};
    
    for (const row of rows) {
      const dims = row.dimensionValues || [];
      const vals = row.metricValues || [];
      const itemName = dims[0]?.value || 'Unknown';
      const itemId = dims[1]?.value || '';
      
      const transactions = parseInt(vals[0]?.value || 0);
      const revenue = parseFloat(vals[1]?.value || 0);
      const itemsPurchased = parseInt(vals[6]?.value || 0);
      
      totalTransactions += transactions;
      totalRevenue += revenue;
      totalItemsPurchased += itemsPurchased;
      
      if (!products[itemId]) {
        products[itemId] = { name: itemName, transactions: 0, revenue: 0, itemsSold: 0 };
      }
      products[itemId].transactions += transactions;
      products[itemId].revenue += revenue;
      products[itemId].itemsSold += itemsPurchased;
    }
    
    return {
      transactions: totalTransactions,
      revenue: totalRevenue,
      avgOrderValue: totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : 0,
      itemsPurchased: totalItemsPurchased,
      topProducts: Object.values(products)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
    };
  }

  async fetchRealtimeReport() {
    const response = await this.runReport(
      ['activeUsers', 'screenPageViews', 'userEngagementDuration'],
      ['unifiedScreenName', 'city', 'country'],
      [{ startDate: 'today', endDate: 'today' }],
      1000
    );
    
    const rows = response.rows || [];
    let activeUsers = 0;
    let pageViews = 0;
    
    const topActivePages = [];
    
    for (const row of rows) {
      const dims = row.dimensionValues || [];
      const vals = row.metricValues || [];
      const users = parseInt(vals[0]?.value || 0);
      const views = parseInt(vals[1]?.value || 0);
      
      activeUsers += users;
      pageViews += views;
      
      topActivePages.push({
        page: dims[0]?.value || '(unknown)',
        city: dims[1]?.value || '',
        country: dims[2]?.value || '',
        activeUsers: users,
        pageViews: views
      });
    }
    
    return {
      activeUsers,
      pageViews,
      topActivePages: topActivePages.sort((a, b) => b.activeUsers - a.activeUsers).slice(0, 10)
    };
  }

  async fetchTopPagesReport() {
    const response = await this.runReport(
      ['screenPageViews', 'activeUsers', 'averageSessionDuration', 'bounceRate'],
      ['unifiedScreenName', 'unifiedScreenClass', 'date'],
      [{ startDate: '30daysAgo', endDate: 'yesterday' }]
    );
    
    const rows = response.rows || [];
    const pageMap = {};
    
    for (const row of rows) {
      const dims = row.dimensionValues || [];
      const vals = row.metricValues || [];
      const pageName = dims[0]?.value || '(unknown)';
      const pageClass = dims[1]?.value || '';
      
      if (!pageMap[pageName]) {
        pageMap[pageName] = { pageName, pageClass, pageViews: 0, users: 0, totalDuration: 0, bounceCount: 0, sessions: 0 };
      }
      
      pageMap[pageName].pageViews += parseInt(vals[0]?.value || 0);
      pageMap[pageName].users += parseInt(vals[1]?.value || 0);
      pageMap[pageName].totalDuration += parseFloat(vals[2]?.value || 0);
      pageMap[pageName].sessions += 1;
    }
    
    return Object.values(pageMap)
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 20)
      .map(p => ({
        ...p,
        avgDuration: p.sessions > 0 ? Math.round(p.totalDuration / p.sessions) : 0,
        bounceRate: p.sessions > 0 ? (p.bounceCount / p.sessions * 100).toFixed(1) : 0
      }));
  }

  async fetchGeoReport() {
    const response = await this.runReport(
      ['activeUsers', 'sessions', 'screenPageViews', 'conversions'],
      ['country', 'city', 'region'],
      [{ startDate: '30daysAgo', endDate: 'yesterday' }]
    );
    
    const rows = response.rows || [];
    const countryMap = {};
    const cityMap = {};
    
    for (const row of rows) {
      const dims = row.dimensionValues || [];
      const vals = row.metricValues || [];
      const country = dims[0]?.value || 'Unknown';
      const city = dims[1]?.value || '';
      const region = dims[2]?.value || '';
      
      if (!countryMap[country]) {
        countryMap[country] = { users: 0, sessions: 0, pageViews: 0, conversions: 0 };
      }
      countryMap[country].users += parseInt(vals[0]?.value || 0);
      countryMap[country].sessions += parseInt(vals[1]?.value || 0);
      countryMap[country].pageViews += parseInt(vals[2]?.value || 0);
      countryMap[country].conversions += parseInt(vals[3]?.value || 0);
      
      if (city) {
        const cityKey = `${city}, ${region}, ${country}`;
        if (!cityMap[cityKey]) {
          cityMap[cityKey] = { city, region, country, users: 0, sessions: 0 };
        }
        cityMap[cityKey].users += parseInt(vals[0]?.value || 0);
        cityMap[cityKey].sessions += parseInt(vals[1]?.value || 0);
      }
    }
    
    return {
      topCountries: Object.entries(countryMap)
        .sort(([,a], [,b]) => b.users - a.users)
        .slice(0, 15)
        .map(([country, data]) => ({ country, ...data })),
      topCities: Object.entries(cityMap)
        .sort(([,a], [,b]) => b.users - a.users)
        .slice(0, 15)
        .map(([, data]) => data)
    };
  }

  async fetchDeviceReport() {
    const response = await this.runReport(
      ['activeUsers', 'sessions', 'screenPageViews', 'bounceRate'],
      ['deviceCategory', 'operatingSystem', 'browser', 'date'],
      [{ startDate: '30daysAgo', endDate: 'yesterday' }]
    );
    
    const rows = response.rows || [];
    const deviceMap = {};
    const osMap = {};
    const browserMap = {};
    
    for (const row of rows) {
      const dims = row.dimensionValues || [];
      const vals = row.metricValues || [];
      const device = dims[0]?.value || 'Unknown';
      const os = dims[1]?.value || 'Unknown';
      const browser = dims[2]?.value || 'Unknown';
      
      if (!deviceMap[device]) deviceMap[device] = { users: 0, sessions: 0, pageViews: 0 };
      deviceMap[device].users += parseInt(vals[0]?.value || 0);
      deviceMap[device].sessions += parseInt(vals[1]?.value || 0);
      deviceMap[device].pageViews += parseInt(vals[2]?.value || 0);
      
      if (!osMap[os]) osMap[os] = { users: 0 };
      osMap[os].users += parseInt(vals[0]?.value || 0);
      
      if (!browserMap[browser]) browserMap[browser] = { users: 0 };
      browserMap[browser].users += parseInt(vals[0]?.value || 0);
    }
    
    return {
      devices: Object.entries(deviceMap).map(([device, data]) => ({ device, ...data })),
      operatingSystems: Object.entries(osMap).map(([os, data]) => ({ os, ...data })).sort((a, b) => b.users - a.users).slice(0, 10),
      browsers: Object.entries(browserMap).map(([browser, data]) => ({ browser, ...data })).sort((a, b) => b.users - a.users).slice(0, 10)
    };
  }

  getShortcuts() {
    return [
      { key: 'ga4-home', label: 'GA4 Home', url: 'https://analytics.google.com/', action: 'open-ga4' },
      { key: 'ga4-realtime', label: 'Realtime', url: `https://analytics.google.com/analytics/web/#/p${this.propertyId}/reports/realtime`, action: 'open-ga4-realtime' },
      { key: 'ga4-explore', label: 'Explore', url: `https://analytics.google.com/analytics/web/#/p${this.propertyId}/explorer`, action: 'open-ga4-explore' }
    ];
  }
}

export default GoogleAnalyticsConnector;