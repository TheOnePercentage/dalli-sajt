/**
 * TikTok Business Connector
 * For TikTok Business account analytics (not Ads)
 */

import { BaseConnector, PlatformStatus, SyncInterval } from './base-connector.js';
import { ImperiumUtils } from '../utils/helpers.js';

const TIKTOK_BUSINESS_CONFIG = {
  platformId: 'tiktok',
  platformName: 'TikTok Business',
  apiBaseUrl: 'https://business-api.tiktok.com',
  oauthConfig: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://business-api.tiktok.com/oauth2/access_token/',
    clientId: null,
    clientSecret: null,
    redirectUri: null
  },
  scopes: [
    'business.analytics',
    'business.creator',
    'video.list',
    'video.data',
    'user.info'
  ],
  syncInterval: SyncInterval.HOURLY
};

export class TikTokBusinessConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...TIKTOK_BUSINESS_CONFIG, ...config });
    this.businessId = null;
    this.creatorId = null;
  }

  setCredentials(clientId, clientSecret, redirectUri) {
    this.oauthConfig.clientId = clientId;
    this.oauthConfig.clientSecret = clientSecret;
    this.oauthConfig.redirectUri = redirectUri;
  }

  async exchangeCodeForToken(code) {
    const params = new URLSearchParams({
      client_key: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.oauthConfig.redirectUri
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
      client_key: this.oauthConfig.clientId,
      client_secret: this.oauthConfig.clientSecret,
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
    const business = await this.makeRequest('/business/get/', {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    if (!business.business_id) {
      throw new Error('No TikTok Business account found');
    }
    
    this.businessId = business.business_id;
    this.metadata = {
      businessId: business.business_id,
      businessName: business.business_name,
      industry: business.industry,
      timezone: business.timezone
    };
    
    const creator = await this.makeRequest('/creator/info/', {
      method: 'POST',
      body: JSON.stringify({ business_id: this.businessId })
    });
    
    if (creator.creator_info) {
      this.creatorId = creator.creator_info.creator_id;
      this.metadata.creator = creator.creator_info;
    }
    
    return {
      id: this.businessId,
      name: business.business_name,
      industry: business.industry,
      creatorId: this.creatorId,
      creatorUsername: creator.creator_info?.creator_username
    };
  }

  async fetchMetrics() {
    if (!this.businessId) {
      throw new Error('Business ID not set');
    }
    
    const [
      videoList,
      creatorAnalytics,
      trendingData
    ] = await Promise.allSettled([
      this.fetchVideoList(),
      this.fetchCreatorAnalytics(),
      this.fetchTrendingData()
    ]);
    
    return {
      businessId: this.businessId,
      businessName: this.metadata.businessName,
      creatorId: this.creatorId,
      
      videos: videoList.status === 'fulfilled' ? videoList.value : {},
      creator: creatorAnalytics.status === 'fulfilled' ? creatorAnalytics.value : {},
      trending: trendingData.status === 'fulfilled' ? trendingData.value : {}
    };
  }

  async fetchVideoList() {
    let allVideos = [];
    let cursor = 0;
    const pageSize = 50;
    
    do {
      const response = await this.makeRequest('/video/list/', {
        method: 'POST',
        body: JSON.stringify({
          business_id: this.businessId,
          cursor,
          count: pageSize
        })
      });
      
      const videos = response.videos || [];
      allVideos = allVideos.concat(videos);
      cursor = response.cursor || 0;
      const hasMore = response.has_more === true;
      
      if (!hasMore || videos.length < pageSize) break;
    } while (true);
    
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86400000;
    
    const recentVideos = allVideos.filter(v => v.create_time * 1000 >= thirtyDaysAgo);
    const totalViews = allVideos.reduce((sum, v) => sum + (v.view_count || 0), 0);
    const totalLikes = allVideos.reduce((sum, v) => sum + (v.like_count || 0), 0);
    const totalComments = allVideos.reduce((sum, v) => sum + (v.comment_count || 0), 0);
    const totalShares = allVideos.reduce((sum, v) => sum + (v.share_count || 0), 0);
    
    const topVideos = allVideos
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 10)
      .map(v => ({
        id: v.id,
        title: v.title || `Video ${v.id}`,
        createTime: v.create_time,
        duration: v.duration,
        views: v.view_count,
        likes: v.like_count,
        comments: v.comment_count,
        shares: v.share_count,
        engagementRate: v.view_count > 0 ? ((v.like_count + v.comment_count + v.share_count) / v.view_count * 100).toFixed(2) : 0
      }));
    
    return {
      totalVideos: allVideos.length,
      recentVideos: recentVideos.length,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      avgViews: allVideos.length > 0 ? Math.round(totalViews / allVideos.length) : 0,
      avgEngagementRate: totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2) : 0,
      topVideos,
      allVideos: allVideos.slice(0, 20)
    };
  }

  async fetchCreatorAnalytics() {
    if (!this.creatorId) {
      return { error: 'No creator ID available' };
    }
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    
    const response = await this.makeRequest('/video/data/', {
      method: 'POST',
      body: JSON.stringify({
        business_id: this.businessId,
        creator_id: this.creatorId,
        start_date: startDate,
        end_date: endDate,
        metrics: [
          'video_views', 'likes', 'comments', 'shares',
          'followers', 'profile_views', 'video_completion_rate',
          'average_watch_time', 'traffic_source_type'
        ]
      })
    });
    
    const dailyData = response.data || [];
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalFollowers = 0;
    let totalProfileViews = 0;
    let totalWatchTime = 0;
    let completionRates = [];
    
    const trafficSources = {};
    
    for (const day of dailyData) {
      const metrics = day.metrics || {};
      totalViews += metrics.video_views || 0;
      totalLikes += metrics.likes || 0;
      totalComments += metrics.comments || 0;
      totalShares += metrics.shares || 0;
      totalFollowers += metrics.followers || 0;
      totalProfileViews += metrics.profile_views || 0;
      totalWatchTime += metrics.average_watch_time || 0;
      if (metrics.video_completion_rate) completionRates.push(metrics.video_completion_rate);
      
      if (metrics.traffic_source_type) {
        for (const [source, count] of Object.entries(metrics.traffic_source_type)) {
          trafficSources[source] = (trafficSources[source] || 0) + count;
        }
      }
    }
    
    return {
      followers: this.metadata.creator?.follower_count || 0,
      following: this.metadata.creator?.following_count || 0,
      totalVideos: this.metadata.creator?.video_count || 0,
      totalLikes: this.metadata.creator?.total_likes || 0,
      
      periodViews: totalViews,
      periodLikes: totalLikes,
      periodComments: totalComments,
      periodShares: totalShares,
      periodFollowers: totalFollowers,
      periodProfileViews: totalProfileViews,
      avgWatchTime: dailyData.length > 0 ? Math.round(totalWatchTime / dailyData.length) : 0,
      avgCompletionRate: completionRates.length > 0 ? (completionRates.reduce((a, b) => a + b, 0) / completionRates.length).toFixed(1) : 0,
      
      engagementRate: totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2) : 0,
      followerGrowthRate: this.metadata.creator?.follower_count > 0 ? (totalFollowers / this.metadata.creator.follower_count * 100).toFixed(2) : 0,
      
      trafficSources: Object.entries(trafficSources)
        .sort(([,a], [,b]) => b - a)
        .map(([source, count]) => ({ source, count, percentage: totalViews > 0 ? (count / totalViews * 100).toFixed(1) : 0 })),
      
      dailyData
    };
  }

  async fetchTrendingData() {
    if (!this.creatorId) {
      return { error: 'No creator ID available' };
    }
    
    try {
      const response = await this.makeRequest('/creator/trending/', {
        method: 'POST',
        body: JSON.stringify({
          business_id: this.businessId,
          creator_id: this.creatorId,
          period: '7d'
        })
      });
      
      return {
        trendingHashtags: response.hashtags || [],
        trendingSounds: response.sounds || [],
        trendingEffects: response.effects || []
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  getShortcuts() {
    return [
      { key: 'business-center', label: 'TikTok Business Center', url: 'https://business.tiktok.com/', action: 'open-tiktok-business' },
      { key: 'analytics', label: 'TikTok Analytics', url: `https://www.tiktok.com/analytics?business_id=${this.businessId}`, action: 'open-tiktok-analytics' },
      { key: 'creator-portal', label: 'Creator Portal', url: 'https://creators.tiktok.com/', action: 'open-creator-portal' }
    ];
  }
}

export default TikTokBusinessConnector;