# DALLI Social Media Integration Center - Architecture & Planning (Step 1)

## Current State Analysis

### Existing Infrastructure
- **Admin Panel**: `admin-new/` - Modern component-based architecture with Imperium framework
- **Social Media Section**: Already exists at `js/sections/social-media.js` with basic platform structure
- **Styling**: `css/sections/social-media.css` - Complete styling for all planned components
- **Navigation**: Already integrated in sidebar under "Marketing" → "Social Media Centar"
- **Components**: Reusable UI components (Button, Modal, Toast, Sidebar, Topbar, etc.)

### Current Platforms Defined (in social-media.js)
1. Instagram Business
2. Facebook Page
3. Twitter (X) - **NOT in requirements**
4. TikTok Business
5. Google Analytics

### Missing from Requirements
- Meta Business Manager
- Meta Ads
- TikTok Ads
- Google Search Console
- All Analytics/ROAS/Commerce/Influencer tracking

---

## Required Platform Integrations (8 Total)

| # | Platform | API Type | OAuth | Scopes Needed |
|---|----------|----------|-------|---------------|
| 1 | Instagram Business | Graph API | Yes | instagram_business_basic, instagram_business_manage_insights |
| 2 | Facebook Page | Graph API | Yes | pages_read_engagement, pages_show_list, pages_manage_ads |
| 3 | Meta Business Manager | Graph API | Yes | business_management, ads_management |
| 4 | Meta Ads | Marketing API | Yes | ads_read, ads_management |
| 5 | TikTok Business | TikTok Business API | Yes | business.analytics, business.creator |
| 6 | TikTok Ads | TikTok Marketing API | Yes | ad.read, ad.write |
| 7 | Google Analytics | GA4 Admin + Data API | Yes | analytics.readonly, analytics.edit |
| 8 | Google Search Console | Search Console API | Yes | webmasters.readonly |

---

## Database Schema Design

### Table: `social_connections`
```sql
CREATE TABLE social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    platform VARCHAR(50) NOT NULL, -- instagram, facebook, meta_bm, meta_ads, tiktok, tiktok_ads, ga4, gsc
    platform_account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    avatar_url TEXT,
    access_token TEXT NOT NULL, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires_at TIMESTAMP,
    scopes TEXT[], -- granted scopes
    status VARCHAR(20) DEFAULT 'connected', -- connected, disconnected, expired, error
    metadata JSONB, -- platform-specific data
    connected_at TIMESTAMP DEFAULT NOW(),
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(20), -- success, partial, failed
    sync_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, platform, platform_account_id)
);
```

### Table: `social_analytics`
```sql
CREATE TABLE social_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES social_connections(id),
    date DATE NOT NULL,
    platform VARCHAR(50) NOT NULL,
    metrics JSONB NOT NULL, -- flexible metric storage
    raw_response JSONB, -- for debugging
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(connection_id, date)
);
```

### Table: `ad_campaigns`
```sql
CREATE TABLE ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES social_connections(id),
    platform_campaign_id VARCHAR(255) NOT NULL,
    name VARCHAR(500),
    objective VARCHAR(100),
    status VARCHAR(50), -- active, paused, completed, deleted
    daily_budget DECIMAL(12,2),
    lifetime_budget DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'RSD',
    start_date DATE,
    end_date DATE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `ad_metrics`
```sql
CREATE TABLE ad_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES ad_campaigns(id),
    date DATE NOT NULL,
    spend DECIMAL(12,2) DEFAULT 0,
    reach BIGINT DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cpc DECIMAL(10,4),
    ctr DECIMAL(8,4),
    conversions BIGINT DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    roas DECIMAL(8,4),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(campaign_id, date)
);
```

### Table: `social_commerce`
```sql
CREATE TABLE social_commerce (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES social_connections(id),
    order_id UUID REFERENCES orders(id),
    platform VARCHAR(50) NOT NULL,
    revenue DECIMAL(12,2),
    items_count INT,
    attribution_type VARCHAR(50), -- last_click, view_through, first_click
    attributed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `influencer_campaigns`
```sql
CREATE TABLE influencer_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    influencer_name VARCHAR(255),
    influencer_handle VARCHAR(255),
    platform VARCHAR(50),
    campaign_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'RSD',
    status VARCHAR(50), -- planned, active, completed, cancelled
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `influencer_metrics`
```sql
CREATE TABLE influencer_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES influencer_campaigns(id),
    date DATE NOT NULL,
    reach BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    traffic_generated BIGINT DEFAULT 0,
    orders_generated INT DEFAULT 0,
    revenue_generated DECIMAL(12,2) DEFAULT 0,
    roi DECIMAL(8,4),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(campaign_id, date)
);
```

### Table: `social_alerts`
```sql
CREATE TABLE social_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50), -- follower_spike, engagement_drop, trending, roas_change, budget_alert
    platform VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    severity VARCHAR(20), -- info, warning, critical
    metadata JSONB,
    read BOOLEAN DEFAULT FALSE,
    dismissed BOOLEAN DEFAULT FALSE,
    sound_event VARCHAR(50), -- for sound events feature
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Component Architecture

### Core Classes (to extend existing SocialMediaCenter)

```
SocialMediaCenter (main orchestrator)
├── ConnectionManager
│   ├── InstagramConnector
│   ├── FacebookConnector
│   ├── MetaBusinessManagerConnector
│   ├── MetaAdsConnector
│   ├── TikTokBusinessConnector
│   ├── TikTokAdsConnector
│   ├── GoogleAnalyticsConnector
│   └── GoogleSearchConsoleConnector
├── AnalyticsEngine
│   ├── InstagramAnalytics
│   ├── TikTokAnalytics
│   ├── FacebookAnalytics
│   ├── GoogleAnalytics
│   └── UnifiedAnalytics (Marketing Command Center)
├── AdvertisingCenter
│   ├── MetaAdsManager
│   └── TikTokAdsManager
├── ROASDashboard
├── TrafficIntelligence
├── CommerceTracker
├── InfluencerTracker
├── AlertSystem
└── SoundEvents (to be implemented later)
```

---

## Data Flow Design

### Connection Flow
```
User clicks "Connect" → OAuth Redirect → Platform Auth → Callback → 
  Store tokens (encrypted) → Fetch initial data → Update UI → 
  Schedule periodic sync
```

### Analytics Sync Flow
```
Cron/Interval (every 1-4 hours) → 
  For each active connection:
    Fetch metrics from platform API → 
    Normalize data → 
    Store in social_analytics → 
    Check alert thresholds → 
    Trigger alerts if needed → 
    Update last_sync_at
```

### Advertising Data Flow
```
Daily sync (or webhook) → 
  Fetch campaign list → 
  Fetch daily metrics per campaign → 
  Calculate ROAS → 
  Store in ad_metrics → 
  Update ROAS dashboard
```

---

## API Integration Requirements

### Instagram Business (Graph API)
- Base: `https://graph.facebook.com/v19.0/`
- Endpoints:
  - `/me/accounts` - Get connected pages
  - `/{ig-user-id}` - Profile info
  - `/{ig-user-id}/insights` - Metrics (followers, reach, impressions, etc.)
  - `/{ig-user-id}/media` - Posts/reels/stories
  - `/{ig-user-id}/insights?metric=...` - Specific metrics

### Facebook Page (Graph API)
- Same base as Instagram
- Endpoints:
  - `/{page-id}/insights` - Page metrics
  - `/{page-id}/posts` - Post performance
  - `/{page-id}/ads` - Ads (if connected to ad account)

### Meta Business Manager / Ads (Marketing API)
- Base: `https://graph.facebook.com/v19.0/`
- Endpoints:
  - `/{business-id}/owned_ad_accounts` - Ad accounts
  - `/{ad-account-id}/campaigns` - Campaigns
  - `/{ad-account-id}/insights` - Ad metrics (spend, reach, impressions, etc.)
  - `/{campaign-id}/insights` - Campaign-level metrics

### TikTok Business (Business API)
- Base: `https://business-api.tiktok.com/`
- Endpoints:
  - `/business/get/` - Business info
  - `/video/list/` - Video list
  - `/video/data/` - Video metrics
  - `/creator/info/` - Creator analytics

### TikTok Ads (Marketing API)
- Base: `https://business-api.tiktok.com/`
- Endpoints:
  - `/campaign/get/` - Campaigns
  - `/campaign/get_insight/` - Campaign insights
  - `/adgroup/get/` - Ad groups
  - `/ad/get_insight/` - Ad insights

### Google Analytics (GA4 Admin + Data API)
- Admin API: `https://analyticsadmin.googleapis.com/`
  - `properties.list` - List GA4 properties
  - `dataStreams.list` - Data streams
- Data API: `https://analyticsdata.googleapis.com/`
  - `properties/{property_id}:runReport` - Custom reports
  - Metrics: activeUsers, sessions, screenPageViews, conversions, etc.

### Google Search Console
- Base: `https://searchconsole.googleapis.com/`
- Endpoints:
  - `sites.list` - Verified sites
  - `sites.searchAnalytics.query` - Search analytics (clicks, impressions, CTR, position)

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Extend SocialMediaCenter with ConnectionManager
- [ ] Implement OAuth flow for all 8 platforms
- [ ] Create secure token storage (encryption)
- [ ] Build connection UI with status indicators
- [ ] Implement quick-access shortcuts
- [ ] Add periodic sync scheduler

### Phase 2: Analytics (Week 2-3)
- [ ] Instagram Analytics (all 9 metrics)
- [ ] TikTok Analytics (all 8 metrics)
- [ ] Facebook Analytics (all 5 metrics)
- [ ] Google Analytics integration
- [ ] Marketing Command Center (unified view)

### Phase 3: Advertising (Week 3-4)
- [ ] Meta Ads integration
- [ ] TikTok Ads integration
- [ ] Advertising Center dashboard
- [ ] ROAS Dashboard with charts
- [ ] Best/Worst performing campaigns

### Phase 4: Intelligence & Tracking (Week 4-5)
- [ ] Traffic Source Intelligence
- [ ] Social Commerce Tracking
- [ ] Influencer Tracking Center
- [ ] ROI calculations

### Phase 5: Alerts & Polish (Week 5-6)
- [ ] Alert System (all 6 alert types)
- [ ] Banner notifications
- [ ] Notification center
- [ ] Sound Events (placeholder for now)
- [ ] Testing & optimization

---

## Technical Considerations

### Security
- Encrypt all access tokens at rest (AES-256)
- Use short-lived tokens with refresh token rotation
- Implement PKCE for OAuth flows
- Validate webhook signatures
- Rate limiting per platform

### Performance
- Cache analytics data (5-15 min TTL)
- Use background jobs for sync
- Paginate large dataset queries
- Implement progressive loading

### Reliability
- Exponential backoff for API retries
- Dead letter queue for failed syncs
- Health checks per connection
- Graceful degradation (show cached data if API fails)

### Scalability
- Multi-tenant architecture (user_id isolation)
- Horizontal scaling for sync workers
- Database partitioning by date for analytics tables
- CDN for static assets (avatars, icons)

---

## Next Steps (Step 2)

1. **Create ConnectionManager class** with base connector interface
2. **Implement OAuth flow** for Instagram Business (first platform)
3. **Build connection UI** with status indicators
4. **Add token encryption/decryption utilities**
5. **Create sync scheduler** with cron-like intervals

---

## Questions for Confirmation

1. **Backend**: Do you have a backend API, or should this be frontend-only with localStorage/sessionStorage?
2. **Database**: Is there an existing database (PostgreSQL, MySQL, Supabase, Firebase)?
3. **Authentication**: How are admin users authenticated currently?
4. **Deployment**: Where will this be hosted? (Netlify, Vercel, VPS, etc.)
5. **Real-time**: Do you need real-time updates via WebSockets, or is periodic sync sufficient?
6. **Charts**: Preferred charting library? (Chart.js, ApexCharts, Recharts, etc.)
7. **Sounds**: Any preference for sound event library? (Howler.js, native Audio API)

---

*Document created: $(date)*
*Step 1 Complete - Ready for Step 2 upon confirmation*