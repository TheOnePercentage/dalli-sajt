/**
 * Facebook Page Connector
 * For Facebook Page insights, posts, audience, and engagement metrics
 */

import { BaseConnector, PlatformStatus, SyncInterval } from './base-connector.js';
import { ImperiumUtils } from '../utils/helpers.js';

const FACEBOOK_PAGE_CONFIG = {
  platformId: 'facebook',
  platformName: 'Facebook Page',
  apiBaseUrl: 'https://graph.facebook.com/v19.0',
  oauthConfig: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    clientId: null,
    clientSecret: null,
    redirectUri: null
  },
  scopes: [
    'pages_read_engagement',
    'pages_show_list',
    'pages_read_user_content',
    'pages_manage_metadata',
    'instagram_basic',
    'instagram_manage_insights'
  ],
  syncInterval: SyncInterval.HOURLY
};

export class FacebookPageConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...FACEBOOK_PAGE_CONFIG, ...config });
    this.pageId = null;
    this.pageAccessToken = null;
    this.instagramAccountId = null;
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
    
    await this.getPageAccessToken();
    await this.saveConnection();
    return data;
  }

  async getPageAccessToken() {
    const pages = await this.makeRequest('/me/accounts', {
      method: 'GET',
      headers: { 'fields': 'id,name,access_token,category,fan_count,instagram_business_account' }
    });
    
    if (!pages.data || pages.data.length === 0) {
      throw new Error('No Facebook Pages found');
    }
    
    const page = pages.data.find(p => p.id === this.pageId) || pages.data[0];
    this.pageId = page.id;
    this.pageAccessToken = page.access_token;
    
    if (page.instagram_business_account) {
      this.instagramAccountId = page.instagram_business_account.id;
    }
    
    return page.access_token;
  }

  async fetchAccountInfo() {
    await this.getPageAccessToken();
    
    const pageInfo = await this.makeRequest(`/${this.pageId}`, {
      method: 'GET',
      headers: { 'fields': 'id,name,category,fan_count,about,website,instagram_business_account,location,phone,emails' }
    });
    
    return {
      id: pageInfo.id,
      name: pageInfo.name,
      category: pageInfo.category,
      followers: pageInfo.fan_count,
      about: pageInfo.about,
      website: pageInfo.website,
      instagramConnected: !!pageInfo.instagram_business_account,
      instagramAccountId: pageInfo.instagram_business_account?.id
    };
  }

  async makePageRequest(endpoint, options = {}) {
    if (!this.pageAccessToken) {
      await this.getPageAccessToken();
    }
    
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.pageAccessToken}`,
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
        await this.refreshAccessToken();
        return this.makePageRequest(endpoint, options);
      }
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    return response.json();
  }

  async fetchMetrics() {
    if (!this.pageId) {
      throw new Error('Page ID not set');
    }
    
    const [
      pageInsights,
      postsInsights,
      audienceInsights,
      videoInsights
    ] = await Promise.allSettled([
      this.fetchPageInsights(),
      this.fetchPostsInsights(),
      this.fetchAudienceInsights(),
      this.fetchVideoInsights()
    ]);
    
    return {
      pageId: this.pageId,
      pageName: this.accountName,
      category: this.metadata.category,
      
      overview: pageInsights.status === 'fulfilled' ? pageInsights.value : {},
      posts: postsInsights.status === 'fulfilled' ? postsInsights.value : {},
      audience: audienceInsights.status === 'fulfilled' ? audienceInsights.value : {},
      videos: videoInsights.status === 'fulfilled' ? videoInsights.value : {}
    };
  }

  async fetchPageInsights() {
    const metrics = [
      'page_fans',
      'page_fans_locale',
      'page_fans_city',
      'page_fans_country',
      'page_fans_gender_age',
      'page_impressions',
      'page_impressions_unique',
      'page_impressions_paid',
      'page_impressions_organic',
      'page_impressions_viral',
      'page_engaged_users',
      'page_post_engagements',
      'page_consumptions',
      'page_consumptions_unique',
      'page_views_total',
      'page_views_logged_in_total',
      'page_actions_post_reactions_like_total',
      'page_actions_post_reactions_love_total',
      'page_actions_post_reactions_wow_total',
      'page_actions_post_reactions_haha_total',
      'page_actions_post_reactions_sorry_total',
      'page_actions_post_reactions_anger_total',
      'page_fan_adds',
      'page_fan_adds_unique',
      'page_fan_removes',
      'page_fan_removes_unique'
    ];
    
    const response = await this.makePageRequest(`/${this.pageId}/insights`, {
      method: 'GET',
      headers: {
        'fields': 'name,values',
        'metric': metrics.join(','),
        'period': 'day',
        'since': Math.floor((Date.now() - 30 * 86400000) / 1000)
      }
    });
    
    const result = {};
    for (const insight of response.data || []) {
      const values = insight.values || [];
      const latest = values[values.length - 1];
      if (latest && latest.value !== undefined) {
        result[insight.name] = typeof latest.value === 'object' ? latest.value : latest.value;
      }
    }
    
    return result;
  }

  async fetchPostsInsights() {
    const postsResponse = await this.makePageRequest(`/${this.pageId}/posts`, {
      method: 'GET',
      headers: {
        'fields': 'id,message,created_time,type,status_type,link,permalink_url,insights.metric(post_impressions,post_impressions_unique,post_engaged_users,post_consumptions,post_clicks,post_reactions_like_total,post_reactions_love_total,post_reactions_wow_total,post_reactions_haha_total,post_reactions_sorry_total,post_reactions_anger_total,post_video_views,post_video_views_30s).period(lifetime)',
        'limit': 50
      }
    });
    
    const posts = postsResponse.data || [];
    let totalImpressions = 0;
    let totalEngagement = 0;
    let totalReactions = 0;
    let totalVideoViews = 0;
    
    const topPosts = posts.map(post => {
      const insights = post.insights?.data || [];
      const getMetric = (name) => {
        const metric = insights.find(i => i.name === name);
        return metric?.values?.[0]?.value || 0;
      };
      
      const impressions = getMetric('post_impressions');
      const engagedUsers = getMetric('post_engaged_users');
      const likes = getMetric('post_reactions_like_total');
      const loves = getMetric('post_reactions_love_total');
      const wows = getMetric('post_reactions_wow_total');
      const hahas = getMetric('post_reactions_haha_total');
      const sorrys = getMetric('post_reactions_sorry_total');
      const angers = getMetric('post_reactions_anger_total');
      const videoViews = getMetric('post_video_views');
      
      const engagement = engagedUsers;
      const reactions = likes + loves + wows + hahas + sorrys + angers;
      
      totalImpressions += impressions;
      totalEngagement += engagement;
      totalReactions += reactions;
      totalVideoViews += videoViews;
      
      return {
        id: post.id,
        message: post.message?.substring(0, 100),
        createdTime: post.created_time,
        type: post.type,
        impressions,
        engagement,
        reactions,
        videoViews,
        engagementRate: impressions > 0 ? (engagement / impressions * 100).toFixed(2) : 0,
        url: post.permalink_url
      };
    }).sort((a, b) => b.engagement - a.engagement).slice(0, 10);
    
    return {
      totalPosts: posts.length,
      totalImpressions,
      totalEngagement,
      totalReactions,
      totalVideoViews,
      avgEngagementRate: posts.length > 0 ? (totalEngagement / totalImpressions * 100).toFixed(2) : 0,
      topPosts
    };
  }

  async fetchAudienceInsights() {
    const metrics = [
      'page_fans_locale',
      'page_fans_city',
      'page_fans_country',
      'page_fans_gender_age'
    ];
    
    const response = await this.makePageRequest(`/${this.pageId}/insights`, {
      method: 'GET',
      headers: {
        'fields': 'name,values',
        'metric': metrics.join(','),
        'period': 'lifetime'
      }
    });
    
    const result = {
      topCountries: [],
      topCities: [],
      locales: [],
      genderAge: {}
    };
    
    for (const insight of response.data || []) {
      const values = insight.values || [];
      const latest = values[values.length - 1];
      if (latest && latest.value) {
        if (insight.name === 'page_fans_country') {
          result.topCountries = Object.entries(latest.value)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([country, count]) => ({ country, count }));
        } else if (insight.name === 'page_fans_city') {
          result.topCities = Object.entries(latest.value)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([city, count]) => ({ city, count }));
        } else if (insight.name === 'page_fans_locale') {
          result.locales = Object.entries(latest.value)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([locale, count]) => ({ locale, count }));
        } else if (insight.name === 'page_fans_gender_age') {
          result.genderAge = latest.value;
        }
      }
    }
    
    return result;
  }

  async fetchVideoInsights() {
    const videosResponse = await this.makePageRequest(`/${this.pageId}/videos`, {
      method: 'GET',
      headers: {
        'fields': 'id,title,description,created_time,length,views,insights.metric(total_video_views,total_video_views_unique,total_30s_video_views,total_video_complete_views).period(lifetime)',
        'limit': 50
      }
    });
    
    const videos = videosResponse.data || [];
    let totalViews = 0;
    let total30sViews = 0;
    let totalCompleteViews = 0;
    
    const topVideos = videos.map(video => {
      const insights = video.insights?.data || [];
      const getMetric = (name) => {
        const metric = insights.find(i => i.name === name);
        return metric?.values?.[0]?.value || 0;
      };
      
      const views = getMetric('total_video_views') || video.views || 0;
      const views30s = getMetric('total_30s_video_views');
      const completeViews = getMetric('total_video_complete_views');
      const completionRate = views > 0 ? (completeViews / views * 100).toFixed(1) : 0;
      
      totalViews += views;
      total30sViews += views30s;
      totalCompleteViews += completeViews;
      
      return {
        id: video.id,
        title: video.title,
        createdTime: video.created_time,
        length: video.length,
        views,
        views30s,
        completeViews,
        completionRate
      };
    }).sort((a, b) => b.views - a.views).slice(0, 10);
    
    return {
      totalVideos: videos.length,
      totalViews,
      total30sViews,
      totalCompleteViews,
      avgCompletionRate: videos.length > 0 ? (totalCompleteViews / totalViews * 100).toFixed(1) : 0,
      topVideos
    };
  }

  getShortcuts() {
    return [
      { key: 'page', label: 'Facebook Page', url: `https://www.facebook.com/${this.pageId}`, action: 'open-fb-page' },
      { key: 'insights', label: 'Page Insights', url: `https://www.facebook.com/${this.pageId}/insights`, action: 'open-fb-insights' },
      { key: 'publishing', label: 'Publishing Tools', url: `https://www.facebook.com/${this.pageId}/publishing_tools`, action: 'open-fb-publishing' }
    ];
  }
}

export default FacebookPageConnector;