/**
 * Instagram Business Connector
 * Uses Facebook Graph API for Instagram Business accounts
 */

import { BaseConnector, PlatformStatus, SyncInterval } from './base-connector.js';
import { ImperiumUtils } from '../utils/helpers.js';

const INSTAGRAM_CONFIG = {
  platformId: 'instagram',
  platformName: 'Instagram Business',
  apiBaseUrl: 'https://graph.facebook.com/v19.0',
  oauthConfig: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    clientId: null, // Set via setCredentials()
    clientSecret: null,
    redirectUri: null
  },
  scopes: [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_read_engagement',
    'pages_show_list'
  ],
  syncInterval: SyncInterval.HOURLY
};

export class InstagramConnector extends BaseConnector {
  constructor(config = {}) {
    super({ ...INSTAGRAM_CONFIG, ...config });
    
    this.igUserId = null;
    this.pageId = null;
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
    
    // Exchange for long-lived token (60 days)
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
      // If exchange fails, return short-lived token
      return { access_token: shortLivedToken, expires_in: 3600 };
    }
    
    return response.json();
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // For Instagram/Facebook, we need to re-authenticate or use long-lived token
    // Long-lived tokens can be refreshed once per day
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
    // First get user's pages
    const pagesResponse = await this.makeRequest('/me/accounts', {
      method: 'GET'
    });
    
    if (!pagesResponse.data || pagesResponse.data.length === 0) {
      throw new Error('No Facebook pages found. You need a Facebook Page to connect Instagram Business.');
    }
    
    // Find page with Instagram Business account
    let instagramAccount = null;
    for (const page of pagesResponse.data) {
      try {
        const igResponse = await this.makeRequest(`/${page.id}`, {
          method: 'GET',
          headers: { 'fields': 'instagram_business_account' }
        });
        
        if (igResponse.instagram_business_account) {
          instagramAccount = igResponse.instagram_business_account;
          this.pageId = page.id;
          break;
        }
      } catch (e) {
        // Continue checking other pages
      }
    }
    
    if (!instagramAccount) {
      throw new Error('No Instagram Business account found on your Facebook Pages. Please convert your Instagram account to a Business account and connect it to a Facebook Page.');
    }
    
    this.igUserId = instagramAccount.id;
    
    // Get Instagram profile info
    const profileResponse = await this.makeRequest(`/${this.igUserId}`, {
      method: 'GET',
      headers: { 'fields': 'id,username,account_type,media_count,followers_count,profile_picture_url' }
    });
    
    return {
      id: profileResponse.id,
      name: profileResponse.username,
      username: profileResponse.username,
      accountType: profileResponse.account_type,
      mediaCount: profileResponse.media_count,
      followersCount: profileResponse.followers_count,
      avatar: profileResponse.profile_picture_url
    };
  }

  async fetchMetrics() {
    if (!this.igUserId) {
      throw new Error('Instagram user ID not set');
    }
    
    const metrics = await this.makeRequest(`/${this.igUserId}/insights`, {
      method: 'GET',
      headers: { 
        'fields': 'metric,period,value,title,description',
        'params': JSON.stringify({
          metric: [
            'followers_count',
            'impressions',
            'reach',
            'profile_views',
            'website_clicks',
            'email_contacts',
            'phone_call_clicks',
            'text_message_clicks',
            'get_directions_clicks'
          ].join(','),
          period: 'day'
        })
      }
    });
    
    // Get media insights for reels/stories
    const mediaResponse = await this.makeRequest(`/${this.igUserId}/media`, {
      method: 'GET',
      headers: { 
        'fields': 'id,media_type,media_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions,reach,video_views,engagement,shares,saved).period(lifetime)'
      }
    });
    
    return this.processMetrics(metrics, mediaResponse);
  }

  processMetrics(insightsResponse, mediaResponse) {
    const metrics = {};
    
    // Process account-level insights
    if (insightsResponse.data) {
      for (const insight of insightsResponse.data) {
        const values = insight.values || [];
        const latest = values[values.length - 1];
        if (latest && latest.value !== undefined) {
          metrics[insight.name] = latest.value;
        }
      }
    }
    
    // Process media insights
    let totalReelViews = 0;
    let totalReelLikes = 0;
    let totalReelComments = 0;
    let totalReelShares = 0;
    let totalStoryViews = 0;
    let totalStoryExits = 0;
    let totalStoryReplies = 0;
    let reelsCount = 0;
    let storiesCount = 0;
    
    if (mediaResponse.data) {
      for (const media of mediaResponse.data) {
        if (media.media_type === 'VIDEO' || media.media_type === 'REELS') {
          reelsCount++;
          if (media.insights?.data) {
            for (const insight of media.insights.data) {
              switch (insight.name) {
                case 'video_views':
                  totalReelViews += insight.values?.[0]?.value || 0;
                  break;
                case 'engagement':
                  totalReelLikes += insight.values?.[0]?.value || 0;
                  break;
              }
            }
          }
          totalReelLikes += media.like_count || 0;
          totalReelComments += media.comments_count || 0;
        } else if (media.media_type === 'STORIES') {
          storiesCount++;
          if (media.insights?.data) {
            for (const insight of media.insights.data) {
              switch (insight.name) {
                case 'impressions':
                  totalStoryViews += insight.values?.[0]?.value || 0;
                  break;
                case 'exits':
                  totalStoryExits += insight.values?.[0]?.value || 0;
                  break;
                case 'replies':
                  totalStoryReplies += insight.values?.[0]?.value || 0;
                  break;
              }
            }
          }
        }
      }
    }
    
    return {
      // Account metrics
      followers: metrics.followers_count || 0,
      followersChange: this.calculateFollowersChange(metrics.followers_count),
      reach: metrics.reach || 0,
      impressions: metrics.impressions || 0,
      profileVisits: metrics.profile_views || 0,
      linkClicks: (metrics.website_clicks || 0) + (metrics.email_contacts || 0) + (metrics.phone_call_clicks || 0),
      
      // Reel performance
      reelViews: totalReelViews,
      reelLikes: totalReelLikes,
      reelComments: totalReelComments,
      reelShares: totalReelShares,
      
      // Story performance
      storyViews: totalStoryViews,
      storyExits: totalStoryExits,
      storyReplies: totalStoryReplies,
      
      // Engagement rate
      engagementRate: this.calculateEngagementRate(metrics),
      
      // Raw data for debugging
      raw: {
        insights: insightsResponse,
        media: mediaResponse
      }
    };
  }

  calculateFollowersChange(currentFollowers) {
    // In production, compare with previous day's data from storage
    const stored = localStorage.getItem(`dalli_ig_followers_${this.igUserId}`);
    if (stored) {
      const previous = parseInt(stored, 10);
      localStorage.setItem(`dalli_ig_followers_${this.igUserId}`, currentFollowers.toString());
      return currentFollowers - previous;
    }
    localStorage.setItem(`dalli_ig_followers_${this.igUserId}`, currentFollowers.toString());
    return 0;
  }

  calculateEngagementRate(metrics) {
    const followers = metrics.followers_count || 1;
    const engagement = (metrics.impressions || 0) > 0 
      ? ((metrics.impressions || 0) / followers) * 100 
      : 0;
    return Math.round(engagement * 100) / 100;
  }

  // Quick access shortcuts
  getShortcuts() {
    return [
      { key: 'profile', label: 'Instagram Profile', url: `https://www.instagram.com/${this.accountName}`, action: 'open-instagram-profile' },
      { key: 'dashboard', label: 'Instagram Dashboard', url: `https://business.facebook.com/${this.pageId}/instagram_management`, action: 'open-instagram-dashboard' }
    ];
  }

  // Public methods for UI
  async getFollowers() {
    return this.metadata.followers || 0;
  }

  async getReach() {
    return this.metadata.reach || 0;
  }

  async getImpressions() {
    return this.metadata.impressions || 0;
  }

  async getProfileVisits() {
    return this.metadata.profileVisits || 0;
  }

  async getLinkClicks() {
    return this.metadata.linkClicks || 0;
  }

  async getReelPerformance() {
    return {
      views: this.metadata.reelViews || 0,
      likes: this.metadata.reelLikes || 0,
      comments: this.metadata.reelComments || 0,
      shares: this.metadata.reelShares || 0
    };
  }

  async getStoryPerformance() {
    return {
      views: this.metadata.storyViews || 0,
      exits: this.metadata.storyExits || 0,
      replies: this.metadata.storyReplies || 0
    };
  }

  async getEngagementRate() {
    return this.metadata.engagementRate || 0;
  }
}

export default InstagramConnector;