/**
 * Meta Ads Connector (Facebook Marketing API)
 * For tracking ad campaigns, spend, reach, impressions, ROAS
 */

import { BaseConnector, PlatformStatus, SyncInterval } from './base-connector.js';
import { ImperiumUtils } from '../utils/helpers.js';

const META_ADS_CONFIG = {
  platformId: 'meta_ads',
  platformName: 'Meta Ads',
  apiBaseUrl: 'https://graph.facebook.com/v19.0',
  oauthConfig: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    clientId: null,
    clientSecret: null,
    redirectUri: null
  },
  scopes: [
    'ads_read',
    'ads_management',
    'business_management',
    'pages_read_engagement'
  ],
  syncInterval: SyncInterval.HOURLY
};

export class MetaAdsConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...META_ADS_CONFIG, ...config });
    this.adAccountId = null;
    this.businessId = null;
    this.campaigns = [];
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
    
    // Get long-lived token
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
    // Get user's ad accounts
    const accountsResponse = await this.makeRequest('/me/adaccounts', {
      method: 'GET',
      headers: { 'fields': 'id,name,account_status,currency,timezone_name,business' }
    });
    
    if (!accountsResponse.data || accountsResponse.data.length === 0) {
      throw new Error('No ad accounts found. You need a Meta Ads account.');
    }
    
    // Use first active ad account
    const adAccount = accountsResponse.data.find(a => a.account_status === 1) || accountsResponse.data[0];
    this.adAccountId = adAccount.id.replace('act_', '');
    this.metadata.currency = adAccount.currency;
    this.metadata.timezone = adAccount.timezone_name;
    
    // Get business info if available
    if (adAccount.business) {
      this.businessId = adAccount.business.id;
    }
    
    return {
      id: adAccount.id,
      name: adAccount.name,
      currency: adAccount.currency,
      status: adAccount.account_status === 1 ? 'Active' : 'Inactive'
    };
  }

  async fetchMetrics() {
    if (!this.adAccountId) {
      throw new Error('Ad account ID not set');
    }
    
    // Fetch campaigns
    const campaignsResponse = await this.makeRequest(`/act_${this.adAccountId}/campaigns`, {
      method: 'GET',
      headers: { 
        'fields': 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,updated_time'
      }
    });
    
    this.campaigns = campaignsResponse.data || [];
    
    // Fetch insights for all campaigns
    const campaignIds = this.campaigns.map(c => c.id).join(',');
    if (!campaignIds) {
      return this.getEmptyMetrics();
    }
    
    const insightsResponse = await this.makeRequest(`/act_${this.adAccountId}/insights`, {
      method: 'GET',
      headers: {
        'fields': 'campaign_id,campaign_name,spend,reach,impressions,clicks,cpc,ctr,cpp,actions,action_values,date_start,date_stop',
        'level': 'campaign',
        'date_preset': 'last_30d',
        'limit': 100
      }
    });
    
    // Fetch account-level insights
    const accountInsights = await this.makeRequest(`/act_${this.adAccountId}/insights`, {
      method: 'GET',
      headers: {
        'fields': 'spend,reach,impressions,clicks,cpc,ctr,cpp,actions,action_values',
        'date_preset': 'last_30d'
      }
    });
    
    return this.processMetrics(accountInsights, insightsResponse);
  }

  processMetrics(accountInsights, campaignInsights) {
    const accountData = accountInsights.data?.[0] || {};
    const campaignData = campaignInsights.data || [];
    
    // Calculate totals
    const totals = this.calculateTotals(campaignData);
    
    // Get revenue from actions
    const revenue = this.extractRevenue(accountData);
    const conversions = this.extractConversions(accountData);
    
    // Process campaigns for top/bottom performers
    const campaignsWithMetrics = this.campaigns.map(campaign => {
      const insights = campaignData.find(i => i.campaign_id === campaign.id);
      if (!insights) return { ...campaign, metrics: null };
      
      const campRevenue = this.extractRevenue(insights);
      const campConversions = this.extractConversions(insights);
      const campSpend = parseFloat(insights.spend || 0);
      const campRoas = campSpend > 0 ? campRevenue / campSpend : 0;
      
      return {
        ...campaign,
        metrics: {
          spend: campSpend,
          reach: parseInt(insights.reach || 0),
          impressions: parseInt(insights.impressions || 0),
          clicks: parseInt(insights.clicks || 0),
          cpc: parseFloat(insights.cpc || 0),
          ctr: parseFloat(insights.ctr || 0),
          conversions: campConversions,
          revenue: campRevenue,
          roas: campRoas
        }
      };
    });
    
    const sortedByRoas = campaignsWithMetrics
      .filter(c => c.metrics && c.metrics.spend > 0)
      .sort((a, b) => b.metrics.roas - a.metrics.roas);
    
    return {
      // Account-level totals
      spend: totals.spend,
      reach: totals.reach,
      impressions: totals.impressions,
      clicks: totals.clicks,
      cpc: totals.cpc,
      ctr: totals.ctr,
      cpp: totals.cpp,
      conversions: conversions,
      revenue: revenue,
      roas: totals.spend > 0 ? revenue / totals.spend : 0,
      
      // Campaigns
      campaigns: campaignsWithMetrics,
      totalCampaigns: this.campaigns.length,
      activeCampaigns: this.campaigns.filter(c => c.status === 'ACTIVE').length,
      
      // Top/Bottom performers
      bestCampaigns: sortedByRoas.slice(0, 5).map(c => ({
        id: c.id,
        name: c.name,
        roas: c.metrics.roas.toFixed(2),
        spend: c.metrics.spend,
        revenue: c.metrics.revenue
      })),
      worstCampaigns: sortedByRoas.slice(-5).reverse().map(c => ({
        id: c.id,
        name: c.name,
        roas: c.metrics.roas.toFixed(2),
        spend: c.metrics.spend,
        revenue: c.metrics.revenue
      })),
      
      // Daily breakdown for charts
      dailyData: this.getDailyBreakdown(campaignData),
      
      // Currency
      currency: this.metadata.currency || 'RSD'
    };
  }

  calculateTotals(campaignData) {
    return campaignData.reduce((acc, curr) => {
      acc.spend += parseFloat(curr.spend || 0);
      acc.reach += parseInt(curr.reach || 0);
      acc.impressions += parseInt(curr.impressions || 0);
      acc.clicks += parseInt(curr.clicks || 0);
      return acc;
    }, { spend: 0, reach: 0, impressions: 0, clicks: 0 });
  }

  extractRevenue(data) {
    if (!data.action_values) return 0;
    return data.action_values.reduce((sum, action) => {
      if (action.action_type === 'purchase' || action.action_type === 'omni_purchase') {
        return sum + parseFloat(action.value || 0);
      }
      return sum;
    }, 0);
  }

  extractConversions(data) {
    if (!data.actions) return 0;
    return data.actions.reduce((sum, action) => {
      if (action.action_type === 'purchase' || action.action_type === 'omni_purchase' || 
          action.action_type === 'lead' || action.action_type === 'complete_registration') {
        return sum + parseInt(action.value || 0);
      }
      return sum;
    }, 0);
  }

  getDailyBreakdown(campaignData) {
    // Group by date
    const dailyMap = new Map();
    
    for (const insight of campaignData) {
      const date = insight.date_start || insight.date_stop;
      if (!date) continue;
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { spend: 0, reach: 0, impressions: 0, clicks: 0, revenue: 0, conversions: 0 });
      }
      
      const day = dailyMap.get(date);
      day.spend += parseFloat(insight.spend || 0);
      day.reach += parseInt(insight.reach || 0);
      day.impressions += parseInt(insight.impressions || 0);
      day.clicks += parseInt(insight.clicks || 0);
      day.revenue += this.extractRevenue(insight);
      day.conversions += this.extractConversions(insight);
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
      cpc: 0, ctr: 0, cpp: 0, conversions: 0, revenue: 0, roas: 0,
      campaigns: [], totalCampaigns: 0, activeCampaigns: 0,
      bestCampaigns: [], worstCampaigns: [], dailyData: [],
      currency: this.metadata.currency || 'RSD'
    };
  }

  // Quick access shortcuts
  getShortcuts() {
    return [
      { key: 'ads-manager', label: 'Meta Ads Manager', url: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${this.adAccountId}`, action: 'open-meta-ads' },
      { key: 'business-manager', label: 'Meta Business Manager', url: `https://business.facebook.com/${this.businessId || 'home'}`, action: 'open-meta-bm' }
    ];
  }
}

export default MetaAdsConnector;