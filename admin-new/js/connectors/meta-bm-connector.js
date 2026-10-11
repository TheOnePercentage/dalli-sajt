/**
 * Meta Business Manager Connector
 * For managing Business Manager assets, ad accounts, pages, Instagram accounts
 */

import { BaseConnector, PlatformStatus, SyncInterval } from './base-connector.js';
import { ImperiumUtils } from '../utils/helpers.js';

const META_BM_CONFIG = {
  platformId: 'meta_bm',
  platformName: 'Meta Business Manager',
  apiBaseUrl: 'https://graph.facebook.com/v19.0',
  oauthConfig: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    clientId: null,
    clientSecret: null,
    redirectUri: null
  },
  scopes: [
    'business_management',
    'ads_management',
    'pages_read_engagement',
    'pages_show_list',
    'instagram_basic',
    'instagram_manage_insights'
  ],
  syncInterval: SyncInterval.DAILY
};

export class MetaBMConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...META_BM_CONFIG, ...config });
    this.businessId = null;
    this.ownedAdAccounts = [];
    this.ownedPages = [];
    this.ownedInstagramAccounts = [];
    this.systemUsers = [];
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
      code
    });
    
    const response = await fetch(`${this.oauthConfig.tokenUrl}?${params}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to exchange code for token');
    }
    
    const data = await response.json();
    
    if (data.access_token) {
      const longLived = await this.getLongLivedToken(data.access_token);
      return longLived;
    }
    
    throw new Error('No access token in response');
  }

  async getLongLivedToken(shortLivedToken) {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      fb_exchange_token: shortLivedToken
    });
    
    const response = await fetch(`${this.oauthConfig.tokenUrl}?${params}`);
    
    if (!response.ok) {
      return { access_token: shortLivedToken, expires_in: 3600 };
    }
    
    return response.json();
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      fb_exchange_token: this.accessToken
    });
    
    const response = await fetch(`${this.oauthConfig.tokenUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    
    await this.saveConnection();
    return data;
  }

  async fetchAccountInfo() {
    const businesses = await this.makeRequest('/me/businesses', {
      method: 'GET',
      headers: { 'fields': 'id,name,primary_page,timezone_id,currency' }
    });
    
    if (!businesses.data || businesses.data.length === 0) {
      throw new Error('No Business Manager accounts found');
    }
    
    this.businessId = businesses.data[0].id;
    const business = businesses.data[0];
    
    await this.loadBusinessAssets();
    
    return {
      id: business.id,
      name: business.name,
      primaryPage: business.primary_page?.name,
      timezone: business.timezone_id,
      currency: business.currency,
      adAccountsCount: this.ownedAdAccounts.length,
      pagesCount: this.ownedPages.length,
      instagramAccountsCount: this.ownedInstagramAccounts.length
    };
  }

  async loadBusinessAssets() {
    if (!this.businessId) return;
    
    try {
      const [adAccounts, pages, instagramAccounts, systemUsers] = await Promise.allSettled([
        this.makeRequest(`/${this.businessId}/owned_ad_accounts`, {
          method: 'GET',
          headers: { 'fields': 'id,name,account_status,currency,timezone_name,business' }
        }),
        this.makeRequest(`/${this.businessId}/owned_pages`, {
          method: 'GET',
          headers: { 'fields': 'id,name,category,fan_count,instagram_business_account' }
        }),
        this.makeRequest(`/${this.businessId}/instagram_accounts`, {
          method: 'GET',
          headers: { 'fields': 'id,username,account_type,media_count,followers_count,profile_picture_url' }
        }),
        this.makeRequest(`/${this.businessId}/system_users`, {
          method: 'GET',
          headers: { 'fields': 'id,name,role,active' }
        })
      ]);
      
      this.ownedAdAccounts = adAccounts.status === 'fulfilled' ? adAccounts.value.data || [] : [];
      this.ownedPages = pages.status === 'fulfilled' ? pages.value.data || [] : [];
      this.ownedInstagramAccounts = instagramAccounts.status === 'fulfilled' ? instagramAccounts.value.data || [] : [];
      this.systemUsers = systemUsers.status === 'fulfilled' ? systemUsers.value.data || [] : [];
      
      this.metadata = {
        businessId: this.businessId,
        adAccounts: this.ownedAdAccounts.map(a => ({ id: a.id, name: a.name, status: a.account_status })),
        pages: this.ownedPages.map(p => ({ id: p.id, name: p.name, fans: p.fan_count })),
        instagramAccounts: this.ownedInstagramAccounts.map(i => ({ id: i.id, username: i.username, followers: i.followers_count })),
        systemUsers: this.systemUsers.map(u => ({ id: u.id, name: u.name, role: u.role }))
      };
    } catch (error) {
      console.warn('[MetaBM] Failed to load business assets:', error);
    }
  }

  async fetchMetrics() {
    await this.loadBusinessAssets();
    
    const adAccountMetrics = await this.fetchAdAccountMetrics();
    const pageMetrics = await this.fetchPageMetrics();
    
    return {
      businessId: this.businessId,
      businessName: this.accountName,
      
      adAccounts: {
        total: this.ownedAdAccounts.length,
        active: this.ownedAdAccounts.filter(a => a.account_status === 1).length,
        totalSpend: adAccountMetrics.totalSpend,
        totalRevenue: adAccountMetrics.totalRevenue,
        totalRoas: adAccountMetrics.totalSpend > 0 ? adAccountMetrics.totalRevenue / adAccountMetrics.totalSpend : 0,
        accounts: adAccountMetrics.accounts
      },
      
      pages: {
        total: this.ownedPages.length,
        totalFollowers: this.ownedPages.reduce((sum, p) => sum + (p.fan_count || 0), 0),
        pages: this.ownedPages.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          followers: p.fan_count,
          hasInstagram: !!p.instagram_business_account
        }))
      },
      
      instagramAccounts: {
        total: this.ownedInstagramAccounts.length,
        totalFollowers: this.ownedInstagramAccounts.reduce((sum, i) => sum + (i.followers_count || 0), 0),
        accounts: this.ownedInstagramAccounts.map(i => ({
          id: i.id,
          username: i.username,
          type: i.account_type,
          followers: i.followers_count,
          mediaCount: i.media_count
        }))
      },
      
      systemUsers: {
        total: this.systemUsers.length,
        active: this.systemUsers.filter(u => u.active).length,
        users: this.systemUsers
      },
      
      raw: {
        adAccounts: this.ownedAdAccounts,
        pages: this.ownedPages,
        instagramAccounts: this.ownedInstagramAccounts,
        systemUsers: this.systemUsers
      }
    };
  }

  async fetchAdAccountMetrics() {
    const accounts = [];
    let totalSpend = 0;
    let totalRevenue = 0;
    
    for (const adAccount of this.ownedAdAccounts) {
      if (adAccount.account_status !== 1) continue;
      
      try {
        const insights = await this.makeRequest(`/act_${adAccount.id.replace('act_', '')}/insights`, {
          method: 'GET',
          headers: {
            'fields': 'spend,revenue,roas,impressions,reach,clicks,conversions',
            'date_preset': 'last_30d'
          }
        });
        
        const data = insights.data?.[0] || {};
        const spend = parseFloat(data.spend || 0);
        const revenue = parseFloat(data.revenue || 0);
        const roas = spend > 0 ? revenue / spend : 0;
        
        totalSpend += spend;
        totalRevenue += revenue;
        
        accounts.push({
          id: adAccount.id,
          name: adAccount.name,
          currency: adAccount.currency,
          spend,
          revenue,
          roas: Number(roas.toFixed(2)),
          impressions: parseInt(data.impressions || 0),
          reach: parseInt(data.reach || 0),
          clicks: parseInt(data.clicks || 0),
          conversions: parseInt(data.conversions || 0)
        });
      } catch (error) {
        accounts.push({
          id: adAccount.id,
          name: adAccount.name,
          error: error.message
        });
      }
    }
    
    return { totalSpend, totalRevenue, accounts };
  }

  async fetchPageMetrics() {
    const pages = [];
    
    for (const page of this.ownedPages) {
      try {
        const insights = await this.makeRequest(`/${page.id}/insights`, {
          method: 'GET',
          headers: {
            'fields': 'page_fans,page_impressions,page_engaged_users,page_posts_impressions',
            'period': 'day',
            'since': Math.floor((Date.now() - 30 * 86400000) / 1000)
          }
        });
        
        const metrics = insights.data || [];
        const latest = metrics[metrics.length - 1] || {};
        
        pages.push({
          id: page.id,
          name: page.name,
          category: page.category,
          followers: page.fan_count,
          impressions: parseInt(latest.values?.[0]?.value || 0),
          engagedUsers: 0,
          hasInstagram: !!page.instagram_business_account
        });
      } catch (error) {
        pages.push({
          id: page.id,
          name: page.name,
          error: error.message
        });
      }
    }
    
    return pages;
  }

  getShortcuts() {
    return [
      { key: 'business-manager', label: 'Business Manager', url: `https://business.facebook.com/${this.businessId || 'home'}`, action: 'open-meta-bm' },
      { key: 'ads-manager', label: 'Ads Manager', url: 'https://adsmanager.facebook.com/', action: 'open-meta-ads' },
      { key: 'events-manager', label: 'Events Manager', url: `https://business.facebook.com/events_manager/${this.businessId || ''}`, action: 'open-events' }
    ];
  }
}

export default MetaBMConnector;