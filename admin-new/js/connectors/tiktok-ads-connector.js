/**
 * TikTok Ads Connector (TikTok Marketing API)
 * For tracking ad campaigns, spend, reach, impressions, ROAS
 */

import { BaseConnector, PlatformStatus, SyncInterval } from './base-connector.js';
import { ImperiumUtils } from '../utils/helpers.js';

const TIKTOK_ADS_CONFIG = {
  platformId: 'tiktok_ads',
  platformName: 'TikTok Ads',
  apiBaseUrl: 'https://business-api.tiktok.com',
  oauthConfig: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://business-api.tiktok.com/oauth2/access_token/',
    clientId: null,
    clientSecret: null,
    redirectUri: null
  },
  scopes: [
    'ad.read',
    'ad.write',
    'business.analytics'
  ],
  syncInterval: SyncInterval.HOURLY
};

export class TikTokAdsConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...TIKTOK_ADS_CONFIG, ...config });
    this.advertiserId = null;
    this.campaigns = [];
  }

  setCredentials(clientId, clientSecret, redirectUri) {
    this.oauthConfig.clientId = clientId;
    this.oauthConfig.clientSecret = clientSecret;
    this.oauthConfig.redirectUri = redirectUri;
  }

  async exchangeCodeForToken(code) {
    const params = new URLSearchParams({
      app_id: this.oauthConfig.clientId,
      secret: this.oauthConfig.clientSecret,
      auth_code: code,
      grant_type: 'authorization_code'
    });
    
    const response = await fetch(`${this.oauthConfig.tokenUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to exchange code for token');
    }
    
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(data.message || 'Token exchange failed');
    }
    
    return {
      access_token: data.data.access_token,
      refresh_token: data.data.refresh_token,
      expires_in: data.data.expires_in
    };
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const params = new URLSearchParams({
      app_id: this.oauthConfig.clientId,
      secret: this.oauthConfig.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token'
    });
    
    const response = await fetch(`${this.oauthConfig.tokenUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(data.message || 'Token refresh failed');
    }
    
    this.accessToken = data.data.access_token;
    this.refreshToken = data.data.refresh_token;
    this.tokenExpiresAt = Date.now() + (data.data.expires_in * 1000);
    
    await this.saveConnection();
    return data;
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
      'Access-Token': this.accessToken,
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
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data.data;
  }

  async fetchAccountInfo() {
    // Get advertiser info
    const advertisers = await this.makeRequest('/open_api/v1.3/advertiser/get/', {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    if (!advertisers.list || advertisers.list.length === 0) {
      throw new Error('No TikTok Ads advertiser accounts found');
    }
    
    // Use first advertiser
    const advertiser = advertisers.list[0];
    this.advertiserId = advertiser.advertiser_id;
    this.metadata.currency = advertiser.currency;
    this.metadata.timezone = advertiser.timezone;
    
    return {
      id: advertiser.advertiser_id,
      name: advertiser.advertiser_name,
      currency: advertiser.currency,
      status: advertiser.status === 'ALIVE' ? 'Active' : 'Inactive'
    };
  }

  async fetchMetrics() {
    if (!this.advertiserId) {
      throw new Error('Advertiser ID not set');
    }
    
    // Get campaigns
    const campaignsResponse = await this.makeRequest('/open_api/v1.3/campaign/get/', {
      method: 'POST',
      body: JSON.stringify({
        advertiser_id: this.advertiserId,
        page: 1,
        page_size: 100
      })
    });
    
    this.campaigns = campaignsResponse.list || [];
    
    // Get campaign insights
    const campaignIds = this.campaigns.map(c => c.campaign_id).join(',');
    if (!campaignIds) {
      return this.getEmptyMetrics();
    }
    
    // Get metrics for last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const insightsResponse = await this.makeRequest('/open_api/v1.3/report/integrated/get/', {
      method: 'POST',
      body: JSON.stringify({
        advertiser_id: this.advertiserId,
        service_type: 'AUCTION',
        report_type: 'CAMPAIGN',
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: ['campaign_id', 'stat_time_day'],
        metrics: [
          'spend', 'reach', 'impressions', 'clicks', 
          'cpc', 'ctr', 'cpm', 'conversion', 'cost_per_conversion',
          'conversion_rate', 'total_cost', 'roi'
        ],
        start_date: startDate,
        end_date: endDate,
        page_size: 1000
      })
    });
    
    // Get advertiser-level summary
    const summaryResponse = await this.makeRequest('/open_api/v1.3/report/integrated/get/', {
      method: 'POST',
      body: JSON.stringify({
        advertiser_id: this.advertiserId,
        service_type: 'AUCTION',
        report_type: 'ADVERTISER',
        data_level: 'AUCTION_ADVERTISER',
        dimensions: ['stat_time_day'],
        metrics: [
          'spend', 'reach', 'impressions', 'clicks', 
          'cpc', 'ctr', 'conversion', 'roi'
        ],
        start_date: startDate,
        end_date: endDate
      })
    });
    
    return this.processMetrics(summaryResponse, insightsResponse);
  }

  processMetrics(summaryResponse, campaignInsights) {
    const summaryData = summaryResponse.list?.[0] || {};
    const campaignData = campaignInsights.list || [];
    
    // Calculate totals from summary
    const totals = {
      spend: parseFloat(summaryData.spend || 0),
      reach: parseInt(summaryData.reach || 0),
      impressions: parseInt(summaryData.impressions || 0),
      clicks: parseInt(summaryData.clicks || 0),
      cpc: parseFloat(summaryData.cpc || 0),
      ctr: parseFloat(summaryData.ctr || 0),
      conversions: parseInt(summaryData.conversion || 0),
      roas: parseFloat(summaryData.roi || 0)
    };
    
    // Revenue from ROAS
    const revenue = totals.spend > 0 ? totals.spend * totals.roas : 0;
    
    // Process campaigns
    const campaignMap = new Map();
    
    for (const insight of campaignData) {
      const campaignId = insight.dimensions?.campaign_id;
      if (!campaignId) continue;
      
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          spend: 0, reach: 0, impressions: 0, clicks: 0,
          conversions: 0, revenue: 0, days: 0
        });
      }
      
      const camp = campaignMap.get(campaignId);
      camp.spend += parseFloat(insight.metrics?.spend || 0);
      camp.reach += parseInt(insight.metrics?.reach || 0);
      camp.impressions += parseInt(insight.metrics?.impressions || 0);
      camp.clicks += parseInt(insight.metrics?.clicks || 0);
      camp.conversions += parseInt(insight.metrics?.conversion || 0);
      camp.revenue += parseFloat(insight.metrics?.spend || 0) * parseFloat(insight.metrics?.roi || 0);
      camp.days++;
    }
    
    // Merge with campaign info
    const campaignsWithMetrics = this.campaigns.map(campaign => {
      const metrics = campaignMap.get(campaign.campaign_id);
      if (!metrics) return { ...campaign, metrics: null };
      
      const campRoas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
      const campCpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
      const campCtr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
      
      return {
        ...campaign,
        metrics: {
          spend: metrics.spend,
          reach: metrics.reach,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          cpc: campCpc,
          ctr: campCtr,
          conversions: metrics.conversions,
          revenue: metrics.revenue,
          roas: campRoas
        }
      };
    });
    
    const sortedByRoas = campaignsWithMetrics
      .filter(c => c.metrics && c.metrics.spend > 0)
      .sort((a, b) => b.metrics.roas - a.metrics.roas);
    
    return {
      // Totals
      spend: totals.spend,
      reach: totals.reach,
      impressions: totals.impressions,
      clicks: totals.clicks,
      cpc: totals.cpc,
      ctr: totals.ctr,
      conversions: totals.conversions,
      revenue: revenue,
      roas: totals.roas,
      
      // Campaigns
      campaigns: campaignsWithMetrics,
      totalCampaigns: this.campaigns.length,
      activeCampaigns: this.campaigns.filter(c => c.campaign_status === 'CAMPAIGN_STATUS_ONGOING').length,
      
      // Top/Bottom performers
      bestCampaigns: sortedByRoas.slice(0, 5).map(c => ({
        id: c.campaign_id,
        name: c.campaign_name,
        roas: c.metrics.roas.toFixed(2),
        spend: c.metrics.spend,
        revenue: c.metrics.revenue
      })),
      worstCampaigns: sortedByRoas.slice(-5).reverse().map(c => ({
        id: c.campaign_id,
        name: c.campaign_name,
        roas: c.metrics.roas.toFixed(2),
        spend: c.metrics.spend,
        revenue: c.metrics.revenue
      })),
      
      // Daily breakdown
      dailyData: this.getDailyBreakdown(campaignData),
      
      // Currency
      currency: this.metadata.currency || 'RSD'
    };
  }

  getDailyBreakdown(campaignData) {
    const dailyMap = new Map();
    
    for (const insight of campaignData) {
      const date = insight.dimensions?.stat_time_day;
      if (!date) continue;
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { spend: 0, reach: 0, impressions: 0, clicks: 0, revenue: 0, conversions: 0 });
      }
      
      const day = dailyMap.get(date);
      const metrics = insight.metrics || {};
      day.spend += parseFloat(metrics.spend || 0);
      day.reach += parseInt(metrics.reach || 0);
      day.impressions += parseInt(metrics.impressions || 0);
      day.clicks += parseInt(metrics.clicks || 0);
      day.conversions += parseInt(metrics.conversion || 0);
      day.revenue += parseFloat(metrics.spend || 0) * parseFloat(metrics.roi || 0);
    }
    
    return Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        ...data,
        roas: data.spend > 0 ? data.revenue / data.spend : 0
      }));
  }

  getEmptyMetrics() {
    return {
      spend: 0, reach: 0, impressions: 0, clicks: 0,
      cpc: 0, ctr: 0, conversions: 0, revenue: 0, roas: 0,
      campaigns: [], totalCampaigns: 0, activeCampaigns: 0,
      bestCampaigns: [], worstCampaigns: [], dailyData: [],
      currency: this.metadata.currency || 'RSD'
    };
  }

  // Quick access shortcuts
  getShortcuts() {
    return [
      { key: 'ads-manager', label: 'TikTok Ads Manager', url: `https://ads.tiktok.com/marketing_tool/campaign?advertiser_id=${this.advertiserId}`, action: 'open-tiktok-ads' },
      { key: 'business-center', label: 'TikTok Business Center', url: 'https://business.tiktok.com/', action: 'open-tiktok-business' }
    ];
  }
}

export default TikTokAdsConnector;