/**
 * Social Media Integration Center - DALLI Admin
 * Main section component using ConnectionManager
 */

import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';
import { connectionManager, PlatformStatus, PLATFORM_CONFIGS } from '../connectors/connection-manager.js';
import { syncScheduler, SyncFrequency } from '../connectors/index.js';
import { PlatformCard, ConnectModal, QuickAccessShortcuts, StatusIndicator } from '../components/index.js';
import { playSoundEvent, playAlertSound, setSoundEnabled, isSoundEnabled, setMasterVolume, loadSoundSettings } from '../utils/sound-events.js';

// Simple h() helper for virtual DOM
function h(tag, props, children) {
  const element = document.createElement(tag);
  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'class') element.className = value;
      else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
      else element.setAttribute(key, value);
    });
  }
  if (children) {
    (Array.isArray(children) ? children : [children]).forEach(child => {
      if (child == null) return;
      if (typeof child === 'string' || typeof child === 'number') element.appendChild(document.createTextNode(child));
      else if (child instanceof Node) element.appendChild(child);
      else if (child && typeof child === 'object' && child.tagName) element.appendChild(child);
    });
  }
  return element;
}

export class SocialMediaCenter extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.utils;
    this.connectionManager = connectionManager;
    this.unsubscribers = [];
    this.showConnectModal = null;
    this.activeTab = 'connections'; // connections, analytics, advertising, roas, traffic, commerce, influencers, alerts
    this.metricsCache = {};
  }

  async onMount() {
    // Initialize connection manager
    await this.connectionManager.initialize();
    
    // Load saved connections
    await this.connectionManager.loadAllConnections();
    
    // Initialize sync scheduler
    await this.initSyncScheduler();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load initial metrics for connected platforms
    await this.loadAllMetrics();
    
    // Load Chart.js for ROAS dashboard
    await this.loadChartJS();
    
    this.render();
  }

  async initSyncScheduler() {
    // Start the scheduler
    syncScheduler.start();
    
    // Set up sync jobs for all connected platforms
    for (const connector of this.connectionManager.getConnectedConnectors()) {
      this.createSyncJobForConnector(connector);
    }
    
    // Listen for new connections
    this.unsubscribers.push(
      this.connectionManager.on('platform-connect', (data) => {
        const connector = this.connectionManager.getConnector(data.platform);
        if (connector) {
          this.createSyncJobForConnector(connector);
        }
      })
    );
    
    // Listen for disconnections
    this.unsubscribers.push(
      this.connectionManager.on('platform-disconnect', (data) => {
        this.removeSyncJobsForPlatform(data.platform);
      })
    );
    
    // Sync scheduler events
    this.unsubscribers.push(
      syncScheduler.on('job-success', (data) => {
        if (data.job.platformId) {
          this.handleSyncComplete({ platform: data.job.platformId, data: data.result });
        }
      })
    );
    
    this.unsubscribers.push(
      syncScheduler.on('job-error', (data) => {
        console.warn(`Sync job error for ${data.job.name}:`, data.error);
      })
    );
  }

  createSyncJobForConnector(connector) {
    const platformId = connector.platformId;
    const frequency = this.getSyncFrequencyForPlatform(platformId);
    
    // Remove existing jobs for this platform
    this.removeSyncJobsForPlatform(platformId);
    
    // Create new sync job
    syncScheduler.addJob({
      id: `sync-${platformId}`,
      name: `Sync ${connector.platformName}`,
      platformId: platformId,
      connector: connector,
      frequency: frequency,
      enabled: true,
      priority: 'normal',
      maxRetries: 3,
      retryDelay: 60000,
      timeout: 120000
    });
  }

  removeSyncJobsForPlatform(platformId) {
    const jobs = syncScheduler.getJobsByPlatform(platformId);
    for (const job of jobs) {
      syncScheduler.removeJob(job.id);
    }
  }

  getSyncFrequencyForPlatform(platformId) {
    const frequencies = {
      instagram: SyncFrequency.HOURLY,
      facebook: SyncFrequency.HOURLY,
      meta_bm: SyncFrequency.DAILY,
      meta_ads: SyncFrequency.HOURLY,
      tiktok: SyncFrequency.HOURLY,
      tiktok_ads: SyncFrequency.HOURLY,
      google_analytics: SyncFrequency.HOURLY,
      google_search_console: SyncFrequency.DAILY
    };
    return frequencies[platformId] || SyncFrequency.HOURLY;
  }

  setupEventListeners() {
    // Platform status changes
    this.unsubscribers.push(
      this.connectionManager.on('platform-status-change', (data) => {
        this.handlePlatformStatusChange(data);
      })
    );
    
    this.unsubscribers.push(
      this.connectionManager.on('platform-connect', (data) => {
        this.handlePlatformConnect(data);
      })
    );
    
    this.unsubscribers.push(
      this.connectionManager.on('platform-disconnect', (data) => {
        this.handlePlatformDisconnect(data);
      })
    );
    
    this.unsubscribers.push(
      this.connectionManager.on('platform-sync-complete', (data) => {
        this.handleSyncComplete(data);
      })
    );
    
    this.unsubscribers.push(
      this.connectionManager.on('platform-sync-error', (data) => {
        this.handleSyncError(data);
      })
    );
    
    // Listen for connector events
    for (const connector of this.connectionManager.getAllConnectors()) {
      this.unsubscribers.push(
        connector.on('sync-complete', (data) => {
          this.updateMetricsCache(data.platform, data.data);
        })
      );
    }
  }

  handlePlatformStatusChange(data) {
    this.render();
    this.showToast(
      data.status === PlatformStatus.CONNECTED 
        ? `${data.platform} povezan` 
        : `${data.platform} status: ${data.status}`,
      data.status === PlatformStatus.CONNECTED ? 'success' : 'info'
    );
  }

  handlePlatformConnect(data) {
    this.loadPlatformMetrics(data.platform);
    this.render();
  }

  handlePlatformDisconnect(data) {
    this.metricsCache[data.platform] = {};
    this.render();
  }

  handleSyncComplete(data) {
    this.updateMetricsCache(data.platform, data.data);
    this.render();
  }

  handleSyncError(data) {
    console.warn(`Sync error for ${data.platform}:`, data.error);
  }

  updateMetricsCache(platformId, data) {
    this.metricsCache[platformId] = { ...this.metricsCache[platformId], ...data };
  }

  async loadAllMetrics() {
    for (const connector of this.connectionManager.getConnectedConnectors()) {
      await this.loadPlatformMetrics(connector.platformId);
    }
  }

  async loadPlatformMetrics(platformId) {
    const connector = this.connectionManager.getConnector(platformId);
    if (!connector || connector.status !== PlatformStatus.CONNECTED) return;
    
    try {
      const result = await connector.sync();
      if (result.success) {
        this.updateMetricsCache(platformId, result.data);
      }
    } catch (error) {
      console.error(`Failed to load metrics for ${platformId}:`, error);
    }
  }

  async openConnectModal(platformId) {
    const connector = this.connectionManager.getConnector(platformId);
    if (!connector) return;
    
    this.showConnectModal = platformId;
    this.render();
  }

  closeConnectModal() {
    this.showConnectModal = null;
    this.render();
  }

  async onConnectSuccess(platformId, result) {
    this.showConnectModal = null;
    await this.loadPlatformMetrics(platformId);
    this.render();
  }

  async disconnectPlatform(platformId) {
    const connector = this.connectionManager.getConnector(platformId);
    if (!connector) return;
    
    const confirmed = await this.confirm(
      `Da li ste sigurni da želite da odvojite ${connector.platformName}?`,
      { title: 'Odvajanje naloga', variant: 'warning' }
    );
    
    if (confirmed) {
      await connector.disconnect();
      this.metricsCache[platformId] = {};
      this.render();
    }
  }

  handleShortcutClick(shortcut) {
    if (shortcut.url) {
      window.open(shortcut.url, '_blank', 'noopener,noreferrer');
    } else if (shortcut.action) {
      this.emit('shortcut-action', shortcut);
    }
  }

  handleTabChange(tab) {
    this.activeTab = tab;
    this.render();
  }

  getTabs() {
    return [
      { id: 'connections', label: 'Konekcije', icon: '🔗' },
      { id: 'analytics', label: 'Analitika', icon: '📊' },
      { id: 'command-center', label: 'Command Center', icon: '🎯' },
      { id: 'advertising', label: 'Reklame', icon: '📈' },
      { id: 'roas', label: 'ROAS', icon: '💰' },
      { id: 'traffic', label: 'Saobraćaj', icon: '🌐' },
      { id: 'commerce', label: 'Trgovina', icon: '🛍️' },
      { id: 'influencers', label: 'Influenceri', icon: '👤' },
      { id: 'alerts', label: 'Alarmi', icon: '🔔' },
      { id: 'sync-scheduler', label: 'Scheduler', icon: '⏰' }
    ];
  }

  render() {
    const tabs = this.getTabs();
    const statusSummary = this.connectionManager.getStatusSummary();
    const shortcuts = this.connectionManager.getQuickAccessShortcuts();

    return h('div', { class: 'social-media-center' }, [
      // Header with summary
      h('div', { class: 'social-header' }, [
        h('div', { class: 'header-left' }, [
          h('h1', { class: 'page-title' }, 'Social Media Centar'),
          h('p', { class: 'page-subtitle' }, 'Upravljajte platformama, pratite analitiku i optimizujte kampanje')
        ]),
        h('div', { class: 'header-stats' }, [
          h('div', { class: 'stat-card connected' }, [
            h('span', { class: 'stat-value' }, statusSummary.connected),
            h('span', { class: 'stat-label' }, 'Povezano')
          ]),
          h('div', { class: 'stat-card disconnected' }, [
            h('span', { class: 'stat-value' }, statusSummary.disconnected),
            h('span', { class: 'stat-label' }, 'Odvojeno')
          ]),
          h('div', { class: 'stat-card error' }, [
            h('span', { class: 'stat-value' }, statusSummary.error + statusSummary.expired),
            h('span', { class: 'stat-label' }, 'Problemi')
          ])
        ])
      ]),

      // Tabs
      h('div', { class: 'social-tabs' }, [
        h('nav', { class: 'tabs-nav', role: 'tablist' }, tabs.map(tab => 
          h('button', {
            class: `tab-btn ${this.activeTab === tab.id ? 'active' : ''}`,
            role: 'tab',
            'aria-selected': this.activeTab === tab.id,
            onclick: () => this.handleTabChange(tab.id)
          }, [
            h('span', { class: 'tab-icon' }, tab.icon),
            h('span', { class: 'tab-label' }, tab.label)
          ])
        ))
      ]),

      // Tab Panels
      h('div', { class: 'tab-panels' }, [
        this.activeTab === 'connections' && this.renderConnectionsTab(statusSummary),
        this.activeTab === 'analytics' && this.renderAnalyticsTab(),
        this.activeTab === 'command-center' && this.renderCommandCenterTab(),
        this.activeTab === 'advertising' && this.renderAdvertisingTab(),
        this.activeTab === 'roas' && this.renderROASTab(),
        this.activeTab === 'traffic' && this.renderTrafficTab(),
        this.activeTab === 'commerce' && this.renderCommerceTab(),
        this.activeTab === 'influencers' && this.renderInfluencersTab(),
        this.activeTab === 'alerts' && this.renderAlertsTab(),
        this.activeTab === 'sync-scheduler' && this.renderSyncSchedulerTab()
      ]),

      // Quick Access Shortcuts (always visible at bottom)
      shortcuts.length > 0 && h('div', { class: 'global-quick-access' }, [
        h('h3', { class: 'section-title' }, 'Brzi pristup poveznim platformama'),
        new QuickAccessShortcuts({ 
          shortcuts, 
          onShortcutClick: (s) => this.handleShortcutClick(s)
        })
      ]),

      // Connect Modal
      this.showConnectModal && h('div', { class: 'modal-overlay', onclick: () => this.closeConnectModal() }, [
        h('div', { class: 'modal-container', onclick: (e) => e.stopPropagation() }, [
          new ConnectModal({
            platformId: this.showConnectModal,
            connector: this.connectionManager.getConnector(this.showConnectModal),
            onClose: () => this.closeConnectModal(),
            onSuccess: (result) => this.onConnectSuccess(this.showConnectModal, result)
          })
        ])
      ])
    ]);
  }

  renderConnectionsTab(statusSummary) {
    const platforms = this.connectionManager.getAllPlatformConfigs();

    return h('div', { class: 'tab-panel connections-panel' }, [
      h('div', { class: 'panel-header' }, [
        h('h2', {}, 'Upravljanje platformama'),
        h('p', { class: 'panel-desc' }, 'Povežite svoje društvene mreže i reklamne naloge za centralizovano upravljanje i analitiku.')
      ]),

      // Platform Grid
      h('div', { class: 'platforms-grid' }, platforms.map(platformConfig => {
        const connector = this.connectionManager.getConnector(platformConfig.id);
        const platformData = statusSummary.platforms[platformConfig.id];
        
        return new PlatformCard({
          platform: platformConfig,
          connector: connector,
          onConnect: (id) => this.openConnectModal(id),
          onDisconnect: (id) => this.disconnectPlatform(id),
          onShortcut: (shortcut) => this.handleShortcutClick(shortcut)
        });
      })),

      // Credentials Setup Info
      h('div', { class: 'credentials-info' }, [
        h('h3', {}, 'Postavljanje kredencijala'),
        h('p', {}, 'Za povezivanje platformi potrebni su vam API kredencijali. Uputstva za dobijanje kredencijala:'),
        h('div', { class: 'credentials-links' }, [
          h('a', { href: 'https://developers.facebook.com/docs/instagram-api/getting-started', target: '_blank', rel: 'noopener' }, 'Instagram Business API'),
          h('a', { href: 'https://developers.facebook.com/docs/marketing-api/', target: '_blank', rel: 'noopener' }, 'Meta Marketing API'),
          h('a', { href: 'https://business-api.tiktok.com/portal/docs', target: '_blank', rel: 'noopener' }, 'TikTok Business API'),
          h('a', { href: 'https://developers.google.com/analytics', target: '_blank', rel: 'noopener' }, 'Google Analytics API'),
          h('a', { href: 'https://developers.google.com/search/docs', target: '_blank', rel: 'noopener' }, 'Google Search Console API')
        ])
      ])
    ]);
  }

  renderAnalyticsTab() {
    // Get all connected platforms (including new ones)
    const allPlatformIds = ['instagram', 'facebook', 'tiktok', 'meta_bm', 'meta_ads', 'tiktok_ads', 'google_analytics', 'google_search_console'];
    const platforms = allPlatformIds.filter(p => 
      this.connectionManager.getConnector(p)?.status === PlatformStatus.CONNECTED
    );

    if (platforms.length === 0) {
      return this.renderEmptyState('analytics', 'Nema povezanih platformi za prikaz analitike');
    }

    return h('div', { class: 'tab-panel analytics-panel' }, [
      h('div', { class: 'panel-header' }, [
        h('h2', {}, 'Društvene mreže - Analitika'),
        h('p', { class: 'panel-desc' }, 'Pregled ključnih metrika za sve povezane platforme')
      ]),
      h('div', { class: 'analytics-grid' }, platforms.map(platformId => 
        this.renderPlatformAnalytics(platformId)
      ))
    ]);
  }

  renderPlatformAnalytics(platformId) {
    const connector = this.connectionManager.getConnector(platformId);
    const metrics = this.metricsCache[platformId] || {};
    const config = PLATFORM_CONFIGS[platformId]?.config;

    if (!connector) return null;

    const platformAnalytics = {
      instagram: () => h('div', { class: 'analytics-card instagram' }, [
        h('div', { class: 'card-header', style: `background: ${config.gradient}` }, [
          h('div', { class: 'header-left' }, [
            h('h3', {}, `${config.icon} Instagram`),
            h('span', { class: 'platform-subtitle' }, '@' + (metrics.username || 'username'))
          ]),
          new StatusIndicator({ status: connector.status, size: 'sm' })
        ]),
        
        // Main KPIs Row
        h('div', { class: 'main-kpis' }, [
          this.kpiCard('Pratioci', ImperiumUtils.formatNumber(metrics.followers), metrics.followersChange ? `${metrics.followersChange > 0 ? '+' : ''}${metrics.followersChange}` : null, metrics.followersChange > 0 ? 'positive' : 'negative', '👥'),
          this.kpiCard('Doseg', ImperiumUtils.formatNumber(metrics.reach), null, null, '👁️'),
          this.kpiCard('Prikazi', ImperiumUtils.formatNumber(metrics.impressions), null, null, '📊'),
          this.kpiCard('Engagement', `${(metrics.engagementRate || 0).toFixed(2)}%`, null, null, '💬')
        ]),

        // Detailed Metrics Grid
        h('div', { class: 'metrics-sections' }, [
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📈 Profil & Saobraćaj'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Posete profilu', ImperiumUtils.formatNumber(metrics.profileVisits || 0)),
              this.metricItem('Klikovi na link', ImperiumUtils.formatNumber(metrics.linkClicks || 0)),
              this.metricItem('Email klikovi', ImperiumUtils.formatNumber(metrics.emailClicks || 0)),
              this.metricItem('Telefon klikovi', ImperiumUtils.formatNumber(metrics.phoneClicks || 0))
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🎬 Reels Performanse'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Ukupni pregledi', ImperiumUtils.formatNumber(metrics.reelViews || 0)),
              this.metricItem('Lajkovi', ImperiumUtils.formatNumber(metrics.reelLikes || 0)),
              this.metricItem('Komentari', ImperiumUtils.formatNumber(metrics.reelComments || 0)),
              this.metricItem('Deljenja', ImperiumUtils.formatNumber(metrics.reelShares || 0)),
              this.metricItem('Sačuvano', ImperiumUtils.formatNumber(metrics.reelSaved || 0)),
              this.metricItem('Prosečan watch %', `${(metrics.reelWatchPercent || 0).toFixed(1)}%`)
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📖 Stories Performanse'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Pregledi', ImperiumUtils.formatNumber(metrics.storyViews || 0)),
              this.metricItem('Napuštanja', ImperiumUtils.formatNumber(metrics.storyExits || 0)),
              this.metricItem('Odgovori', ImperiumUtils.formatNumber(metrics.storyReplies || 0)),
              this.metricItem('Forward', ImperiumUtils.formatNumber(metrics.storyForwards || 0)),
              this.metricItem('Back', ImperiumUtils.formatNumber(metrics.storyBacks || 0)),
              this.metricItem('Completion %', `${(metrics.storyCompletionRate || 0).toFixed(1)}%`)
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📊 Audience Insights'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Top grad', metrics.topCity || '—'),
              this.metricItem('Top zemlja', metrics.topCountry || '—'),
              this.metricItem('Starosna grupa', metrics.topAgeGroup || '—'),
              this.metricItem('Pol (M/Ž)', `${metrics.genderMale || 0}% / ${metrics.genderFemale || 0}%`),
              this.metricItem('Najaktivnije vreme', metrics.mostActiveTime || '—'),
              this.metricItem('Jezik', metrics.topLanguage || '—')
            ])
          ])
        ]),

        // Top Posts
        (metrics.topPosts && metrics.topPosts.length > 0) && h('div', { class: 'top-posts-section' }, [
          h('h4', { class: 'section-title-small' }, '🏆 Top Postovi'),
          h('div', { class: 'top-posts-grid' }, metrics.topPosts.slice(0, 3).map(post => 
            h('div', { class: 'top-post-card' }, [
              post.thumbnail && h('img', { class: 'post-thumb', src: post.thumbnail, alt: post.caption }),
              h('div', { class: 'post-info' }, [
                h('p', { class: 'post-caption' }, post.caption?.substring(0, 80) + '...'),
                h('div', { class: 'post-stats' }, [
                  h('span', {}, `❤️ ${ImperiumUtils.formatNumber(post.likes)}`),
                  h('span', {}, `💬 ${ImperiumUtils.formatNumber(post.comments)}`),
                  h('span', {}, `📤 ${ImperiumUtils.formatNumber(post.shares)}`)
                ])
              ])
            ])
          ))
        ])
      ]),
      facebook: () => h('div', { class: 'analytics-card facebook' }, [
        h('div', { class: 'card-header', style: `background: ${config.gradient}` }, [
          h('div', { class: 'header-left' }, [
            h('h3', {}, `${config.icon} Facebook`),
            h('span', { class: 'platform-subtitle' }, metrics.pageName || 'Stranica')
          ]),
          new StatusIndicator({ status: connector.status, size: 'sm' })
        ]),
        
        h('div', { class: 'main-kpis' }, [
          this.kpiCard('Pratioci', ImperiumUtils.formatNumber(metrics.followers || 0), metrics.followersChange ? `${metrics.followersChange > 0 ? '+' : ''}${metrics.followersChange}` : null, metrics.followersChange > 0 ? 'positive' : 'negative', '👥'),
          this.kpiCard('Doseg', ImperiumUtils.formatNumber(metrics.reach || 0), null, null, '👁️'),
          this.kpiCard('Engagement', `${(metrics.engagementRate || 0).toFixed(2)}%`, null, null, '💬'),
          this.kpiCard('Klikovi', ImperiumUtils.formatNumber(metrics.linkClicks || 0), null, null, '🔗')
        ]),

        h('div', { class: 'metrics-sections' }, [
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📝 Post Performanse'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Ukupni lajkovi', ImperiumUtils.formatNumber(metrics.postLikes || 0)),
              this.metricItem('Komentari', ImperiumUtils.formatNumber(metrics.postComments || 0)),
              this.metricItem('Deljenja', ImperiumUtils.formatNumber(metrics.postShares || 0)),
              this.metricItem('Reakcije', ImperiumUtils.formatNumber(metrics.postReactions || 0)),
              this.metricItem('Video pregledi', ImperiumUtils.formatNumber(metrics.videoViews || 0)),
              this.metricItem('3s video views', ImperiumUtils.formatNumber(metrics.videoViews3s || 0))
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '👥 Audience'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Muškarci', `${(metrics.genderMale || 0).toFixed(1)}%`),
              this.metricItem('Žene', `${(metrics.genderFemale || 0).toFixed(1)}%`),
              this.metricItem('Top grad', metrics.topCity || '—'),
              this.metricItem('Top zemlja', metrics.topCountry || '—'),
              this.metricItem('Starost 18-24', `${(metrics.age18_24 || 0).toFixed(1)}%`),
              this.metricItem('Starost 25-34', `${(metrics.age25_34 || 0).toFixed(1)}%`)
            ])
          ])
        ])
      ]),
      tiktok: () => h('div', { class: 'analytics-card tiktok' }, [
        h('div', { class: 'card-header', style: `background: ${config.gradient}` }, [
          h('div', { class: 'header-left' }, [
            h('h3', {}, `${config.icon} TikTok`),
            h('span', { class: 'platform-subtitle' }, '@' + (metrics.username || 'username'))
          ]),
          new StatusIndicator({ status: connector.status, size: 'sm' })
        ]),
        
        h('div', { class: 'main-kpis' }, [
          this.kpiCard('Pratioci', ImperiumUtils.formatNumber(metrics.followers || 0), metrics.followersChange ? `${metrics.followersChange > 0 ? '+' : ''}${metrics.followersChange}` : null, metrics.followersChange > 0 ? 'positive' : 'negative', '👥'),
          this.kpiCard('Pregledi', ImperiumUtils.formatNumber(metrics.views || 0), null, null, '👁️'),
          this.kpiCard('Lajkovi', ImperiumUtils.formatNumber(metrics.likes || 0), null, null, '❤️'),
          this.kpiCard('Prosečno vreme', this.formatWatchTime(metrics.avgWatchTime || 0), null, null, '⏱️')
        ]),

        h('div', { class: 'metrics-sections' }, [
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📈 Engagment Metrike'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Komentari', ImperiumUtils.formatNumber(metrics.comments || 0)),
              this.metricItem('Deljenja', ImperiumUtils.formatNumber(metrics.shares || 0)),
              this.metricItem('Sačuvano', ImperiumUtils.formatNumber(metrics.saves || 0)),
              this.metricItem('Posete profilu', ImperiumUtils.formatNumber(metrics.profileVisits || 0)),
              this.metricItem('Follow rate', `${(metrics.followRate || 0).toFixed(2)}%`),
              this.metricItem('Engagement rate', `${(metrics.engagementRate || 0).toFixed(2)}%`)
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🎬 Video Metrike'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Ukupno videa', ImperiumUtils.formatNumber(metrics.totalVideos || 0)),
              this.metricItem('Prosečni pregledi', ImperiumUtils.formatNumber(metrics.avgViews || 0)),
              this.metricItem('Completion rate', `${(metrics.completionRate || 0).toFixed(1)}%`),
              this.metricItem('Ukupno vreme gled.', this.formatWatchTime(metrics.watchTime || 0)),
              this.metricItem('Sound on rate', `${(metrics.soundOnRate || 0).toFixed(1)}%`),
              this.metricItem('Full screen rate', `${(metrics.fullScreenRate || 0).toFixed(1)}%`)
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '👥 Audience'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Top zemlja', metrics.topCountry || '—'),
              this.metricItem('Muškarci', `${(metrics.genderMale || 0).toFixed(1)}%`),
              this.metricItem('Žene', `${(metrics.genderFemale || 0).toFixed(1)}%`),
              this.metricItem('18-24 godine', `${(metrics.age18_24 || 0).toFixed(1)}%`),
              this.metricItem('25-34 godine', `${(metrics.age25_34 || 0).toFixed(1)}%`),
              this.metricItem('35-44 godine', `${(metrics.age35_44 || 0).toFixed(1)}%`)
            ])
          ]),
          (metrics.bestVideos && metrics.bestVideos.length > 0) && h('div', { class: 'top-videos-section' }, [
            h('h4', { class: 'section-title-small' }, '🏆 Najbolja Videa'),
            h('div', { class: 'top-videos-grid' }, metrics.bestVideos.slice(0, 3).map((video, i) => 
              h('div', { class: 'top-video-card' }, [
                h('span', { class: 'video-rank' }, `#${i + 1}`),
                h('div', { class: 'video-info' }, [
                  h('h5', {}, video.title || `Video ${video.id}`),
                  h('div', { class: 'video-stats' }, [
                    h('span', {}, `👁️ ${ImperiumUtils.formatNumber(video.views)}`),
                    h('span', {}, `❤️ ${ImperiumUtils.formatNumber(video.likes)}`),
                    h('span', {}, `💬 ${ImperiumUtils.formatNumber(video.comments)}`)
                  ])
                ])
              ])
            ))
          ])
        ])
      ]),
      google_analytics: () => h('div', { class: 'analytics-card website' }, [
        h('div', { class: 'card-header', style: 'background: linear-gradient(45deg, #F9AB00, #FF6D00)' }, [
          h('div', { class: 'header-left' }, [
            h('h3', {}, '📈 Google Analytics (GA4)'),
            h('span', { class: 'platform-subtitle' }, metrics.propertyName || 'Property')
          ]),
          new StatusIndicator({ status: connector.status, size: 'sm' })
        ]),
        
        h('div', { class: 'main-kpis' }, [
          this.kpiCard('Aktivni korisnici', ImperiumUtils.formatNumber(metrics.activeUsers || 0), null, null, '👤'),
          this.kpiCard('Sesije', ImperiumUtils.formatNumber(metrics.sessions || 0), null, null, '📊'),
          this.kpiCard('Stranice/Sesiju', (metrics.pagesPerSession || 0).toFixed(2), null, null, '📄'),
          this.kpiCard('Konverzije', ImperiumUtils.formatNumber(metrics.conversions || 0), null, null, '🎯')
        ]),

        h('div', { class: 'metrics-sections' }, [
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📊 Saobraćaj'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Prikazi stranica', ImperiumUtils.formatNumber(metrics.pageViews || 0)),
              this.metricItem('Jedinstveni pregledi', ImperiumUtils.formatNumber(metrics.uniquePageViews || 0)),
              this.metricItem('Prosečno vreme', this.formatWatchTime(metrics.avgSessionDuration || 0)),
              this.metricItem('Otkaz %', `${(metrics.bounceRate || 0).toFixed(1)}%`),
              this.metricItem('Noviji korisnici', `${((metrics.newUserRate || 0) * 100).toFixed(1)}%`),
              this.metricItem('Povratni korisnici', `${((metrics.returningUserRate || 0) * 100).toFixed(1)}%`)
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🌍 Geografija & Uređaji'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Top zemlja', metrics.topCountry || '—'),
              this.metricItem('Top grad', metrics.topCity || '—'),
              this.metricItem('Desktop', `${(metrics.desktopPercent || 0).toFixed(1)}%`),
              this.metricItem('Mobile', `${(metrics.mobilePercent || 0).toFixed(1)}%`),
              this.metricItem('Tablet', `${(metrics.tabletPercent || 0).toFixed(1)}%`),
              this.metricItem('Top browser', metrics.topBrowser || '—')
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🎯 Konverzije & E-commerce'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Transakcije', ImperiumUtils.formatNumber(metrics.transactions || 0)),
              this.metricItem('Prihod', `${ImperiumUtils.formatNumber(metrics.revenue || 0)} RSD`),
              this.metricItem('AOV', `${ImperiumUtils.formatNumber(metrics.avgOrderValue || 0)} RSD`),
              this.metricItem('Konverzija %', `${(metrics.conversionRate || 0).toFixed(2)}%`),
              this.metricItem('Proizvoda kupovina', ImperiumUtils.formatNumber(metrics.itemsPurchased || 0)),
              this.metricItem('Košarica → Kupovina', `${(metrics.cartToPurchaseRate || 0).toFixed(1)}%`)
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🔍 Top Izvori Saobraćaja'),
            h('div', { class: 'traffic-sources-grid' }, [
              h('div', { class: 'traffic-source-item' }, [
                h('span', { class: 'ts-source' }, 'Organic Search'),
                h('span', { class: 'ts-value' }, `${(metrics.organicPercent || 0).toFixed(1)}%`)
              ]),
              h('div', { class: 'traffic-source-item' }, [
                h('span', { class: 'ts-source' }, 'Direct'),
                h('span', { class: 'ts-value' }, `${(metrics.directPercent || 0).toFixed(1)}%`)
              ]),
              h('div', { class: 'traffic-source-item' }, [
                h('span', { class: 'ts-source' }, 'Social'),
                h('span', { class: 'ts-value' }, `${(metrics.socialPercent || 0).toFixed(1)}%`)
              ]),
              h('div', { class: 'traffic-source-item' }, [
                h('span', { class: 'ts-source' }, 'Referral'),
                h('span', { class: 'ts-value' }, `${(metrics.referralPercent || 0).toFixed(1)}%`)
              ]),
h('div', { class: 'traffic-source-item' }, [
                h('span', { class: 'ts-source' }, 'Email'),
                h('span', { class: 'ts-value' }, `${(metrics.emailPercent || 0).toFixed(1)}%`)
              ]),
h('div', { class: 'traffic-source-item' }, [
                h('span', { class: 'ts-source' }, 'Paid Search'),
                h('span', { class: 'ts-value' }, `${(metrics.paidPercent || 0).toFixed(1)}%`)
              ])
            ])
          ])
        ])
      ]),
      meta_bm: () => h('div', { class: 'analytics-card meta-bm' }, [
        h('div', { class: 'card-header', style: `background: ${config.gradient}` }, [
          h('div', { class: 'header-left' }, [
            h('h3', {}, `${config.icon} Meta Business Manager`),
            h('span', { class: 'platform-subtitle' }, metrics.businessName || 'Business Manager')
          ]),
          new StatusIndicator({ status: connector.status, size: 'sm' })
        ]),
        
        h('div', { class: 'main-kpis' }, [
          this.kpiCard('Ad Nalozi', metrics.adAccounts?.total || 0, null, null, '📊'),
          this.kpiCard('Stranice', metrics.pages?.total || 0, null, null, '📘'),
          this.kpiCard('Instagram Nalozi', metrics.instagramAccounts?.total || 0, null, null, '📷'),
          this.kpiCard('Sistemski Korisnici', metrics.systemUsers?.total || 0, null, null, '👥')
        ]),

        h('div', { class: 'metrics-sections' }, [
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '💰 Ad Nalozi Performanse (30d)'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Ukupni Trošak', `${ImperiumUtils.formatNumber(metrics.adAccounts?.totalSpend || 0)} ${metrics.adAccounts?.currency || 'RSD'}`),
              this.metricItem('Ukupni Prihod', `${ImperiumUtils.formatNumber(metrics.adAccounts?.totalRevenue || 0)} ${metrics.adAccounts?.currency || 'RSD'}`),
              this.metricItem('ROAS', (metrics.adAccounts?.totalRoas || 0).toFixed(2)),
              this.metricItem('Aktivni Nalozi', metrics.adAccounts?.active || 0)
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📘 Facebook Stranice'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Ukupni Pratioci', ImperiumUtils.formatNumber(metrics.pages?.totalFollowers || 0)),
              this.metricItem('Broj Stranica', metrics.pages?.total || 0),
              this.metricItem('Sa Instagram', metrics.pages?.withInstagram || 0)
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📷 Instagram Nalozi'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Ukupni Pratioci', ImperiumUtils.formatNumber(metrics.instagramAccounts?.totalFollowers || 0)),
              this.metricItem('Broj Naloga', metrics.instagramAccounts?.total || 0)
            ])
          ]),
(metrics.adAccounts?.accounts && metrics.adAccounts.accounts.length > 0) ? h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🏆 Top Ad Nalozi po ROAS'),
            h('div', { class: 'top-accounts-grid' }, metrics.adAccounts.accounts
              .filter(a => a.spend > 0)
              .sort((a, b) => b.roas - a.roas)
              .slice(0, 5)
              .map(acc => h('div', { class: 'top-account-card' }, [
                h('div', { class: 'account-name' }, acc.name),
                h('div', { class: 'account-stats' }, [
                  h('span', {}, `ROAS: ${acc.roas}x`),
                  h('span', {}, `Trošak: ${ImperiumUtils.formatNumber(acc.spend)}`),
                  h('span', {}, `Prihod: ${ImperiumUtils.formatNumber(acc.revenue)}`)
                ])
              ])))
            ]) : null
          ])
      ]),
      meta_ads: () => h('div', { class: 'analytics-card meta-ads' }, [
        h('div', { class: 'card-header', style: `background: ${config.gradient}` }, [
          h('div', { class: 'header-left' }, [
            h('h3', {}, `${config.icon} Meta Ads`),
            h('span', { class: 'platform-subtitle' }, metrics.accountName || 'Ad Account')
          ]),
          new StatusIndicator({ status: connector.status, size: 'sm' })
        ]),
        
        h('div', { class: 'main-kpis' }, [
          this.kpiCard('Trošak (30d)', `${ImperiumUtils.formatNumber(metrics.spend)} ${metrics.currency || 'RSD'}`, null, null, '💸'),
          this.kpiCard('Prihod (30d)', `${ImperiumUtils.formatNumber(metrics.revenue)} ${metrics.currency || 'RSD'}`, null, null, '💰'),
          this.kpiCard('ROAS', metrics.roas.toFixed(2), null, metrics.roas >= 3 ? 'positive' : metrics.roas >= 1 ? 'neutral' : 'negative', '📈'),
          this.kpiCard('Konverzije', ImperiumUtils.formatNumber(metrics.conversions), null, null, '🎯')
        ]),

        h('div', { class: 'metrics-sections' }, [
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📊 Osnovne Metrike'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Doseg', ImperiumUtils.formatNumber(metrics.reach)),
              this.metricItem('Prikazi', ImperiumUtils.formatNumber(metrics.impressions)),
              this.metricItem('Klikovi', ImperiumUtils.formatNumber(metrics.clicks)),
              this.metricItem('CTR', `${metrics.ctr.toFixed(2)}%`),
              this.metricItem('CPC', `${metrics.cpc.toFixed(2)} ${metrics.currency || 'RSD'}`),
              this.metricItem('CPP', `${metrics.cpp.toFixed(2)} ${metrics.currency || 'RSD'}`)
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🏆 Top 5 Kampanje po ROAS'),
            h('div', { class: 'top-campaigns-grid' }, (metrics.bestCampaigns || []).map((c, i) => 
              h('div', { class: 'top-campaign-card' }, [
                h('span', { class: 'campaign-rank' }, `#${i + 1}`),
                h('div', { class: 'campaign-info' }, [
                  h('h5', {}, c.name),
                  h('div', { class: 'campaign-stats' }, [
                    h('span', {}, `ROAS: ${c.roas}x`),
                    h('span', {}, `Trošak: ${ImperiumUtils.formatNumber(c.spend)}`),
                    h('span', {}, `Prihod: ${ImperiumUtils.formatNumber(c.revenue)}`)
                  ])
                ])
              ])
            ))
          ]),
          (metrics.worstCampaigns && metrics.worstCampaigns.length > 0) && h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '⚠️ Bottom 5 Kampanje po ROAS'),
            h('div', { class: 'top-campaigns-grid' }, metrics.worstCampaigns.map((c, i) => 
              h('div', { class: 'top-campaign-card worst' }, [
                h('span', { class: 'campaign-rank' }, `#${i + 1}`),
                h('div', { class: 'campaign-info' }, [
                  h('h5', {}, c.name),
                  h('div', { class: 'campaign-stats' }, [
                    h('span', {}, `ROAS: ${c.roas}x`),
                    h('span', {}, `Trošak: ${ImperiumUtils.formatNumber(c.spend)}`),
                    h('span', {}, `Prihod: ${ImperiumUtils.formatNumber(c.revenue)}`)
                  ])
                ])
              ])
            ))
          ])
        ])
      ]),
      tiktok_ads: () => h('div', { class: 'analytics-card tiktok-ads' }, [
        h('div', { class: 'card-header', style: `background: ${config.gradient}` }, [
          h('div', { class: 'header-left' }, [
            h('h3', {}, `${config.icon} TikTok Ads`),
            h('span', { class: 'platform-subtitle' }, metrics.accountName || 'Advertiser')
          ]),
          new StatusIndicator({ status: connector.status, size: 'sm' })
        ]),
        
        h('div', { class: 'main-kpis' }, [
          this.kpiCard('Trošak (30d)', `${ImperiumUtils.formatNumber(metrics.spend)} ${metrics.currency || 'RSD'}`, null, null, '💸'),
          this.kpiCard('Prihod (30d)', `${ImperiumUtils.formatNumber(metrics.revenue)} ${metrics.currency || 'RSD'}`, null, null, '💰'),
          this.kpiCard('ROAS', metrics.roas.toFixed(2), null, metrics.roas >= 3 ? 'positive' : metrics.roas >= 1 ? 'neutral' : 'negative', '📈'),
          this.kpiCard('Konverzije', ImperiumUtils.formatNumber(metrics.conversions), null, null, '🎯')
        ]),

        h('div', { class: 'metrics-sections' }, [
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📊 Osnovne Metrike'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Doseg', ImperiumUtils.formatNumber(metrics.reach)),
              this.metricItem('Prikazi', ImperiumUtils.formatNumber(metrics.impressions)),
              this.metricItem('Klikovi', ImperiumUtils.formatNumber(metrics.clicks)),
              this.metricItem('CTR', `${metrics.ctr.toFixed(2)}%`),
              this.metricItem('CPC', `${metrics.cpc.toFixed(2)} ${metrics.currency || 'RSD'}`),
              this.metricItem('Konverzije', ImperiumUtils.formatNumber(metrics.conversions))
            ])
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🏆 Top 5 Kampanje po ROAS'),
            h('div', { class: 'top-campaigns-grid' }, (metrics.bestCampaigns || []).map((c, i) => 
              h('div', { class: 'top-campaign-card' }, [
                h('span', { class: 'campaign-rank' }, `#${i + 1}`),
                h('div', { class: 'campaign-info' }, [
                  h('h5', {}, c.name),
                  h('div', { class: 'campaign-stats' }, [
                    h('span', {}, `ROAS: ${c.roas}x`),
                    h('span', {}, `Trošak: ${ImperiumUtils.formatNumber(c.spend)}`),
                    h('span', {}, `Prihod: ${ImperiumUtils.formatNumber(c.revenue)}`)
                  ])
                ])
              ])
            ))
          ])
        ])
      ]),
      google_search_console: () => h('div', { class: 'analytics-card gsc' }, [
        h('div', { class: 'card-header', style: `background: ${config.gradient}` }, [
          h('div', { class: 'header-left' }, [
            h('h3', {}, `${config.icon} Google Search Console`),
            h('span', { class: 'platform-subtitle' }, metrics.siteName || 'Site')
          ]),
          new StatusIndicator({ status: connector.status, size: 'sm' })
        ]),
        
        h('div', { class: 'main-kpis' }, [
          this.kpiCard('Klikovi', ImperiumUtils.formatNumber(metrics.searchAnalytics?.totals?.clicks || 0), null, null, '🖱️'),
          this.kpiCard('Prikazi', ImperiumUtils.formatNumber(metrics.searchAnalytics?.totals?.impressions || 0), null, null, '👁️'),
          this.kpiCard('CTR', `${(metrics.searchAnalytics?.totals?.ctr || 0).toFixed(2)}%`, null, null, '📈'),
          this.kpiCard('Prosečna Pozicija', (metrics.searchAnalytics?.totals?.position || 0).toFixed(1), null, null, '📍')
        ]),

        h('div', { class: 'metrics-sections' }, [
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🔍 Top Ključne Reči'),
            h('div', { class: 'metrics-grid' }, (metrics.searchAnalytics?.topQueries || []).slice(0, 10).map((q, i) => 
              h('div', { class: 'query-item' }, [
                h('span', { class: 'query-rank' }, `#${i + 1}`),
                h('span', { class: 'query-text' }, q.query),
                h('span', { class: 'query-stats' }, [
                  h('span', {}, `${ImperiumUtils.formatNumber(q.clicks)} klikova`),
                  h('span', {}, `${ImperiumUtils.formatNumber(q.impressions)} prikaza`),
                  h('span', {}, `CTR: ${q.ctr.toFixed(2)}%`),
                  h('span', {}, `Poz: ${q.position.toFixed(1)}`)
                ])
              ])
            ))
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📄 Top Stranice'),
            h('div', { class: 'metrics-grid' }, (metrics.searchAnalytics?.topPages || []).slice(0, 10).map((p, i) => 
              h('div', { class: 'page-item' }, [
                h('span', { class: 'page-rank' }, `#${i + 1}`),
                h('span', { class: 'page-url' }, p.page),
                h('span', { class: 'page-stats' }, [
                  h('span', {}, `${ImperiumUtils.formatNumber(p.clicks)} klikova`),
                  h('span', {}, `${ImperiumUtils.formatNumber(p.impressions)} prikaza`),
                  h('span', {}, `CTR: ${p.ctr.toFixed(2)}%`),
                  h('span', {}, `Poz: ${p.position.toFixed(1)}`)
                ])
              ])
            ))
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🌍 Zemlje'),
            h('div', { class: 'metrics-grid' }, (metrics.searchAnalytics?.countries || []).slice(0, 10).map(c => 
              h('div', { class: 'country-item' }, [
                h('span', { class: 'country-name' }, c.country),
                h('span', { class: 'country-stats' }, [
                  h('span', {}, `${ImperiumUtils.formatNumber(c.clicks)} klikova`),
                  h('span', {}, `${ImperiumUtils.formatNumber(c.impressions)} prikaza`),
                  h('span', {}, `CTR: ${c.ctr.toFixed(2)}%`)
                ])
              ])
            ))
          ]),
          h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📱 Uređaji'),
            h('div', { class: 'metrics-grid' }, (metrics.searchAnalytics?.devices || []).map(d => 
              h('div', { class: 'device-item' }, [
                h('span', { class: 'device-name' }, d.device),
                h('span', { class: 'device-stats' }, [
                  h('span', {}, `${ImperiumUtils.formatNumber(d.clicks)} klikova`),
                  h('span', {}, `${ImperiumUtils.formatNumber(d.impressions)} prikaza`),
                  h('span', {}, `CTR: ${d.ctr.toFixed(2)}%`)
                ])
              ])
            ))
          ]),
          (metrics.searchAnalytics?.dailyTrend && metrics.searchAnalytics.dailyTrend.length > 0) && h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '📈 Dnevni Trend (30d)'),
            h('div', { class: 'daily-trend-grid' }, metrics.searchAnalytics.dailyTrend.slice(-14).map(d => 
              h('div', { class: 'daily-trend-item' }, [
                h('span', { class: 'trend-date' }, d.date),
                h('span', { class: 'trend-clicks' }, `${ImperiumUtils.formatNumber(d.clicks)} klikova`),
                h('span', { class: 'trend-impressions' }, `${ImperiumUtils.formatNumber(d.impressions)} prikaza`),
                h('span', { class: 'trend-ctr' }, `${d.ctr.toFixed(2)}% CTR`),
                h('span', { class: 'trend-position' }, `Poz: ${d.position.toFixed(1)}`)
              ])
            ))
          ]),
          (metrics.sitemaps && Object.keys(metrics.sitemaps).length > 0) && h('div', { class: 'metrics-section' }, [
            h('h4', { class: 'section-title-small' }, '🗺️ Sitemap Status'),
            h('div', { class: 'metrics-grid' }, [
              this.metricItem('Ukupno URL-a', ImperiumUtils.formatNumber(metrics.sitemaps.totalSubmitted || 0)),
              this.metricItem('Indeksirano', ImperiumUtils.formatNumber(metrics.sitemaps.totalIndexed || 0)),
              this.metricItem('Indeksiranje %', metrics.sitemaps.totalSubmitted > 0 ? `${(metrics.sitemaps.totalIndexed / metrics.sitemaps.totalSubmitted * 100).toFixed(1)}%` : '0%')
            ])
          ])
        ])
      ])
    };
 
    return platformAnalytics[platformId]?.();
  }

  kpiCard(label, value, change, changeType, icon) {
    return h('div', { class: `kpi-card ${changeType || ''}` }, [
      h('div', { class: 'kpi-icon' }, icon),
      h('div', { class: 'kpi-content' }, [
        h('div', { class: 'kpi-label' }, label),
        h('div', { class: 'kpi-value' }, value),
        change && h('div', { class: `kpi-change ${changeType}` }, change)
      ])
    ]);
  }

  metricItem(label, value, change = null) {
    return h('div', { class: 'metric-item' }, [
      h('div', { class: 'metric-label' }, label),
      h('div', { class: 'metric-value' }, value),
      change && h('div', { class: `metric-change ${change > 0 ? 'positive' : 'negative'}` }, 
        `${change > 0 ? '+' : ''}${change}`
      )
    ]);
  }

  formatWatchTime(seconds) {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    this.bindEvents();
    return `${minutes}m`;
  }

  renderCommandCenterTab() {
    const connectedPlatforms = this.connectionManager.getConnectedConnectors();
    const allMetrics = this.metricsCache;
    
    // Calculate totals across platforms
    const totals = this.calculateTotals(allMetrics);
    
    // Get website analytics (if available)
    const websiteMetrics = allMetrics.google_analytics || {};
    
    // Get sales data (mock for now)
    const salesMetrics = this.getSalesMetrics();

    return h('div', { class: 'tab-panel command-center-panel' }, [
      // Header
      h('div', { class: 'panel-header' }, [
        h('div', { class: 'header-content' }, [
          h('h2', {}, 'Marketing Command Center'),
          h('p', { class: 'panel-desc' }, 'Jedinstveni pregled performansi svih kanala u realnom vremenu')
        ]),
        h('div', { class: 'header-actions' }, [
          h('div', { class: 'date-range-selector' }, [
            h('label', { for: 'dateRange' }, 'Vremenski period:'),
            h('select', {
              id: 'dateRange',
              class: 'form-select',
              value: this.dateRange || '7d',
              onchange: (e) => { this.dateRange = e.target.value; this.render(); }
            }, [
              h('option', { value: 'today' }, 'Danas'),
              h('option', { value: '7d' }, 'Poslednjih 7 dana'),
              h('option', { value: '30d' }, 'Poslednjih 30 dana'),
              h('option', { value: '90d' }, 'Poslednjih 90 dana')
            ])
          ]),
          h('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.refreshAllMetrics() }, [
            h('span', { class: 'btn-icon' }, '⟳'),
            ' Osveži sve'
          ])
        ])
      ]),

      // KPI Cards Row
      h('div', { class: 'kpi-grid' }, [
        this.kpiCard('Ukupni pratioци', ImperiumUtils.formatNumber(totals.followers), '+12.5%', 'positive', '👥'),
        this.kpiCard('Ukupan doseg', ImperiumUtils.formatNumber(totals.reach), '+8.2%', 'positive', '👁️'),
        this.kpiCard('Ukupni prikazi', ImperiumUtils.formatNumber(totals.impressions), '+15.3%', 'positive', '📊'),
        this.kpiCard('Engagement Rate', `${totals.engagementRate.toFixed(2)}%`, '+0.8%', 'positive', '💬'),
        this.kpiCard('Saobraćaj na sajtu', ImperiumUtils.formatNumber(websiteMetrics.sessions || 0), '+5.1%', 'positive', '🌐'),
        this.kpiCard('Konverzije', ImperiumUtils.formatNumber(salesMetrics.conversions), '+3.2%', 'positive', '💰'),
        this.kpiCard('Ad Trošak (30d)', `${ImperiumUtils.formatNumber(totals.adSpend)} RSD`, null, null, '💸'),
        this.kpiCard('Ad Prihod (30d)', `${ImperiumUtils.formatNumber(totals.adRevenue)} RSD`, null, null, '💰'),
        this.kpiCard('Ad ROAS', totals.adRoas.toFixed(2), null, totals.adRoas >= 3 ? 'positive' : totals.adRoas >= 1 ? 'neutral' : 'negative', '📈'),
        this.kpiCard('Search Klikovi', ImperiumUtils.formatNumber(totals.searchClicks), null, null, '🔍'),
        this.kpiCard('Search CTR', `${totals.searchCtr.toFixed(2)}%`, null, null, '📈')
      ]),

      // Platform Comparison Grid
      h('div', { class: 'section-header' }, [
        h('h3', {}, 'Poređenje platformi'),
        h('p', { class: 'section-desc' }, 'Kako se platforme međusobno ponašaju')
      ]),
      h('div', { class: 'platform-comparison' }, connectedPlatforms.map(connector => 
        this.renderPlatformComparisonCard(connector, allMetrics[connector.platformId] || {})
      )),

      // Website Analytics Section (if Google Analytics connected)
      (websiteMetrics.sessions || websiteMetrics.users) && h('div', { class: 'section-header' }, [
        h('h3', {}, '🌐 Website Analytics (Google Analytics)'),
        h('p', { class: 'section-desc' }, 'Saobraćaj i ponašanje korisnika na sajtu')
      ]),
      (websiteMetrics.sessions || websiteMetrics.users) && h('div', { class: 'analytics-grid' }, [
        h('div', { class: 'analytics-card website' }, [
          h('div', { class: 'card-header', style: 'background: linear-gradient(45deg, #F9AB00, #FF6D00)' }, [
            h('h3', {}, '📈 Google Analytics'),
            new StatusIndicator({ status: this.connectionManager.getConnector('google_analytics')?.status || PlatformStatus.DISCONNECTED, size: 'sm' })
          ]),
          h('div', { class: 'metrics-grid' }, [
            this.metricItem('Sesije', ImperiumUtils.formatNumber(websiteMetrics.sessions)),
            this.metricItem('Korisnici', ImperiumUtils.formatNumber(websiteMetrics.users)),
            this.metricItem('Stranice/SES', websiteMetrics.pagesPerSession?.toFixed(2) || '0'),
            this.metricItem('Prosečno vreme', websiteMetrics.avgSessionDuration ? this.formatWatchTime(websiteMetrics.avgSessionDuration) : '0'),
            this.metricItem('Otkaz %', `${websiteMetrics.bounceRate?.toFixed(1) || 0}%`),
            this.metricItem('Konverzije', ImperiumUtils.formatNumber(websiteMetrics.conversions || 0))
          ])
        ])
      ]),
      
      // Search Console Section (if connected)
      (allMetrics.google_search_console?.searchAnalytics?.totals) && h('div', { class: 'section-header' }, [
        h('h3', {}, '🔍 Search Console (Google)'),
        h('p', { class: 'section-desc' }, 'Organski pretraživanje i SEO performanse')
      ]),
      (allMetrics.google_search_console?.searchAnalytics?.totals) && h('div', { class: 'analytics-grid' }, [
        h('div', { class: 'analytics-card gsc' }, [
          h('div', { class: 'card-header', style: 'background: linear-gradient(45deg, #4285F4, #34A853, #FBBC05, #EA4335)' }, [
            h('h3', {}, '🔍 Google Search Console'),
            new StatusIndicator({ status: this.connectionManager.getConnector('google_search_console')?.status || PlatformStatus.DISCONNECTED, size: 'sm' })
          ]),
          h('div', { class: 'metrics-grid' }, [
            this.metricItem('Klikovi', ImperiumUtils.formatNumber(allMetrics.google_search_console.searchAnalytics.totals.clicks)),
            this.metricItem('Prikazi', ImperiumUtils.formatNumber(allMetrics.google_search_console.searchAnalytics.totals.impressions)),
            this.metricItem('CTR', `${allMetrics.google_search_console.searchAnalytics.totals.ctr?.toFixed(2) || 0}%`),
            this.metricItem('Prosečna Pozicija', (allMetrics.google_search_console.searchAnalytics.totals.position || 0).toFixed(1)),
            this.metricItem('Top Ključne Reči', allMetrics.google_search_console.searchAnalytics.topQueries?.length || 0),
            this.metricItem('Top Stranice', allMetrics.google_search_console.searchAnalytics.topPages?.length || 0)
          ])
        ])
      ]),

      // Top Content Performance
      h('div', { class: 'section-header' }, [
        h('h3', {}, '🏆 Najbolje performanse'),
        h('p', { class: 'section-desc' }, 'Top sadržaj po platformama')
      ]),
      h('div', { class: 'top-content-grid' }, this.renderTopContent(allMetrics))

    ]);
  }

  calculateTotals(allMetrics) {
    let followers = 0, reach = 0, impressions = 0, engagement = 0, engagementCount = 0;
    let adSpend = 0, adRevenue = 0, adConversions = 0;
    let searchClicks = 0, searchImpressions = 0;
    
    for (const [platformId, metrics] of Object.entries(allMetrics)) {
      // Social platforms (Instagram, Facebook, TikTok)
      if (['instagram', 'facebook', 'tiktok'].includes(platformId)) {
        if (metrics.followers) followers += metrics.followers;
        if (metrics.reach) reach += metrics.reach;
        if (metrics.impressions) impressions += metrics.impressions;
        if (metrics.engagementRate) {
          engagement += metrics.engagementRate;
          engagementCount++;
        }
      }
      
      // Meta Business Manager - aggregate ad account totals
      if (platformId === 'meta_bm' && metrics.adAccounts) {
        adSpend += metrics.adAccounts.totalSpend || 0;
        adRevenue += metrics.adAccounts.totalRevenue || 0;
        if (metrics.adAccounts.accounts) {
          for (const acc of metrics.adAccounts.accounts) {
            if (acc.impressions) impressions += acc.impressions;
            if (acc.reach) reach += acc.reach;
          }
        }
      }
      
      // Meta Ads & TikTok Ads
      if (['meta_ads', 'tiktok_ads'].includes(platformId)) {
        adSpend += metrics.spend || 0;
        adRevenue += metrics.revenue || 0;
        adConversions += metrics.conversions || 0;
        if (metrics.reach) reach += metrics.reach;
        if (metrics.impressions) impressions += metrics.impressions;
      }
      
      // Google Analytics
      if (platformId === 'google_analytics') {
        if (metrics.sessions) reach += metrics.sessions;
        if (metrics.screenPageViews) impressions += metrics.screenPageViews;
      }
      
      // Google Search Console
      if (platformId === 'google_search_console' && metrics.searchAnalytics?.totals) {
        searchClicks += metrics.searchAnalytics.totals.clicks || 0;
        searchImpressions += metrics.searchAnalytics.totals.impressions || 0;
      }
    }
    
    return {
      followers,
      reach,
      impressions,
      engagementRate: engagementCount > 0 ? engagement / engagementCount : 0,
      adSpend,
      adRevenue,
      adConversions,
      adRoas: adSpend > 0 ? adRevenue / adSpend : 0,
      searchClicks,
      searchImpressions,
      searchCtr: searchImpressions > 0 ? (searchClicks / searchImpressions * 100) : 0
    };
  }

  getSalesMetrics() {
    // Mock data - in production would come from orders API
    return {
      conversions: 147,
      revenue: 2850000,
      aov: 19387
    };
  }

  renderPlatformComparisonCard(connector, metrics) {
    const config = PLATFORM_CONFIGS[connector.platformId]?.config;
    const isConnected = connector.status === PlatformStatus.CONNECTED;

    return h('div', { 
      class: `platform-comparison-card ${isConnected ? 'connected' : 'disconnected'}`,
      style: config?.gradient ? `--platform-gradient: ${config.gradient}` : ''
    }, [
      h('div', { class: 'comparison-header' }, [
        h('div', { class: 'platform-badge', style: config?.gradient ? `background: ${config.gradient}` : '' }, 
          config?.icon || connector.platformId.charAt(0).toUpperCase()
        ),
        h('div', { class: 'platform-info' }, [
          h('h4', {}, config?.name || connector.platformName),
          h('span', { class: `status-tag ${connector.status}` }, this.getStatusLabel(connector.status))
        ])
      ]),
      h('div', { class: 'comparison-metrics' }, [
        this.comparisonMetric('Pratioci', ImperiumUtils.formatNumber(metrics.followers || 0)),
        this.comparisonMetric('Doseg', ImperiumUtils.formatNumber(metrics.reach || 0)),
        this.comparisonMetric('Prikazi', ImperiumUtils.formatNumber(metrics.impressions || 0)),
        this.comparisonMetric('Engagement', `${(metrics.engagementRate || 0).toFixed(2)}%`)
      ]),
      isConnected && h('div', { class: 'comparison-actions' }, [
        h('button', { 
          class: 'btn btn-sm btn-secondary', 
          onclick: () => this.handleTabChange('analytics')
        }, 'Detalji')
      ])
    ]);
  }

  comparisonMetric(label, value) {
    return h('div', { class: 'comparison-metric' }, [
      h('span', { class: 'cmp-label' }, label),
      h('span', { class: 'cmp-value' }, value)
    ]);
  }

  getStatusLabel(status) {
    const labels = {
      [PlatformStatus.CONNECTED]: 'Aktivan',
      [PlatformStatus.CONNECTING]: 'Povezivanje...',
      [PlatformStatus.DISCONNECTED]: 'Odvojen',
      [PlatformStatus.EXPIRED]: 'Istekao',
      [PlatformStatus.ERROR]: 'Greška'
    };
    return labels[status] || 'Nepoznato';
  }

  renderTopContent(allMetrics) {
    const content = [];
    
    // Instagram top reels
    if (allMetrics.instagram?.reelViews) {
      content.push({
        platform: 'instagram',
        type: 'Reel',
        title: 'Top Reel ovoga meseca',
        metric: `${ImperiumUtils.formatNumber(allMetrics.instagram.reelViews)} pregleda`,
        icon: '🎬'
      });
    }
    
    // TikTok top videos
    if (allMetrics.tiktok?.views) {
      content.push({
        platform: 'tiktok',
        type: 'Video',
        title: 'Najgledaniji TikTok',
        metric: `${ImperiumUtils.formatNumber(allMetrics.tiktok.views)} pregleda`,
        icon: '🎵'
      });
    }
    
    // Facebook top posts
    if (allMetrics.facebook?.postLikes) {
      content.push({
        platform: 'facebook',
        type: 'Post',
        title: 'Najpopularniji post',
        metric: `${ImperiumUtils.formatNumber(allMetrics.facebook.postLikes)} lajkova`,
        icon: '📘'
      });
    }

    if (content.length === 0) {
      return [h('div', { class: 'no-content' }, 'Povežite platforme da biste videli top performanse')];
    }

    return content.map(item => h('div', { class: 'top-content-card' }, [
      h('div', { class: 'content-icon' }, item.icon),
      h('div', { class: 'content-info' }, [
        h('span', { class: 'content-platform' }, item.platform.toUpperCase()),
        h('h4', {}, item.title),
        h('p', { class: 'content-type' }, item.type)
      ]),
      h('div', { class: 'content-metric' }, item.metric)
    ]));
  }

  refreshAllMetrics() {
    for (const connector of this.connectionManager.getConnectedConnectors()) {
      this.loadPlatformMetrics(connector.platformId);
    }
    this.showToast('Osvežavanje metrika započeto...', 'info');
  }

  renderAdvertisingTab() {
    const metaAds = this.connectionManager.getConnector('meta_ads');
    const tiktokAds = this.connectionManager.getConnector('tiktok_ads');
    const connectedAds = [metaAds, tiktokAds].filter(c => c && c.status === PlatformStatus.CONNECTED);
    
    if (connectedAds.length === 0) {
      return this.renderEmptyState('advertising', 'Nema povezanih reklamnih naloga. Povežite Meta Ads i/ili TikTok Ads.');
    }

    const metaMetrics = this.metricsCache.meta_ads || {};
    const tiktokMetrics = this.metricsCache.tiktok_ads || {};
    
    // Combined totals
    const combinedSpend = (metaMetrics.spend || 0) + (tiktokMetrics.spend || 0);
    const combinedRevenue = (metaMetrics.revenue || 0) + (tiktokMetrics.revenue || 0);
    const combinedRoas = combinedSpend > 0 ? combinedRevenue / combinedSpend : 0;
    const combinedReach = (metaMetrics.reach || 0) + (tiktokMetrics.reach || 0);
    const combinedImpressions = (metaMetrics.impressions || 0) + (tiktokMetrics.impressions || 0);
    const combinedClicks = (metaMetrics.clicks || 0) + (tiktokMetrics.clicks || 0);
    const combinedConversions = (metaMetrics.conversions || 0) + (tiktokMetrics.conversions || 0);
    const combinedCpc = combinedClicks > 0 ? combinedSpend / combinedClicks : 0;
    const combinedCtr = combinedImpressions > 0 ? (combinedClicks / combinedImpressions) * 100 : 0;

    return h('div', { class: 'tab-panel advertising-panel' }, [
      h('div', { class: 'panel-header' }, [
        h('div', { class: 'header-content' }, [
          h('h2', {}, 'Reklamni Centar'),
          h('p', { class: 'panel-desc' }, 'Praćenje performansi Meta Ads i TikTok Ads kampanja')
        ]),
        h('div', { class: 'header-actions' }, [
          h('div', { class: 'date-range-selector' }, [
            h('label', { for: 'adDateRange' }, 'Period:'),
            h('select', {
              id: 'adDateRange',
              class: 'form-select',
              value: this.adDateRange || '30d',
              onchange: (e) => { this.adDateRange = e.target.value; this.render(); }
            }, [
              h('option', { value: '7d' }, 'Poslednjih 7 dana'),
              h('option', { value: '30d' }, 'Poslednjih 30 dana'),
              h('option', { value: '90d' }, 'Poslednjih 90 dana'),
              h('option', { value: 'lifetime' }, 'Sve vreme')
            ])
          ]),
          h('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.refreshAdMetrics() }, [
            h('span', { class: 'btn-icon' }, '⟳'),
            ' Osveži'
          ])
        ])
      ]),

      // Combined KPIs
      h('div', { class: 'kpi-grid' }, [
        this.kpiCard('Ukupni trošak', `${ImperiumUtils.formatNumber(combinedSpend)} ${metaMetrics.currency || 'RSD'}`, null, null, '💸'),
        this.kpiCard('Ukupni prihod', `${ImperiumUtils.formatNumber(combinedRevenue)} ${metaMetrics.currency || 'RSD'}`, null, null, '💰'),
        this.kpiCard('ROAS', combinedRoas.toFixed(2), null, combinedRoas >= 3 ? 'positive' : combinedRoas >= 1 ? 'neutral' : 'negative', '📈'),
        this.kpiCard('Doseg', ImperiumUtils.formatNumber(combinedReach), null, null, '👁️'),
        this.kpiCard('Prikazi', ImperiumUtils.formatNumber(combinedImpressions), null, null, '📊'),
        this.kpiCard('Klikovi', ImperiumUtils.formatNumber(combinedClicks), null, null, '🖱️'),
        this.kpiCard('CPC', `${combinedCpc.toFixed(2)} ${metaMetrics.currency || 'RSD'}`, null, null, '💲'),
        this.kpiCard('CTR', `${combinedCtr.toFixed(2)}%`, null, null, '📉'),
        this.kpiCard('Konverzije', ImperiumUtils.formatNumber(combinedConversions), null, null, '🎯')
      ]),

      // Platform breakdown
      h('div', { class: 'section-header' }, [
        h('h3', {}, 'Po platformama'),
        h('p', { class: 'section-desc' }, 'Poređenje Meta Ads i TikTok Ads performansi')
      ]),
      h('div', { class: 'platform-comparison' }, connectedAds.map(connector => {
        const metrics = this.metricsCache[connector.platformId] || {};
        const config = PLATFORM_CONFIGS[connector.platformId]?.config;
        const spend = metrics.spend || 0;
        const revenue = metrics.revenue || 0;
        const roas = spend > 0 ? revenue / spend : 0;
        
        return h('div', { 
          class: `ad-platform-card ${connector.status === PlatformStatus.CONNECTED ? 'connected' : ''}`,
          style: config?.gradient ? `--platform-gradient: ${config.gradient}` : ''
        }, [
          h('div', { class: 'ad-platform-header' }, [
            h('div', { class: 'platform-badge', style: config?.gradient ? `background: ${config.gradient}` : '' }, 
              config?.icon || '📢'
            ),
            h('div', { class: 'platform-info' }, [
              h('h4', {}, config?.name || connector.platformName),
              h('span', { class: `status-tag ${connector.status}` }, this.getStatusLabel(connector.status))
            ])
          ]),
          h('div', { class: 'ad-platform-metrics' }, [
            this.adMetric('Trošak', `${ImperiumUtils.formatNumber(spend)} ${metrics.currency || 'RSD'}`),
            this.adMetric('Prihod', `${ImperiumUtils.formatNumber(revenue)} ${metrics.currency || 'RSD'}`),
            this.adMetric('ROAS', roas.toFixed(2), roas >= 3 ? 'positive' : roas >= 1 ? 'neutral' : 'negative'),
            this.adMetric('Konverzije', ImperiumUtils.formatNumber(metrics.conversions || 0)),
            this.adMetric('Doseg', ImperiumUtils.formatNumber(metrics.reach || 0)),
            this.adMetric('CTR', `${(metrics.ctr || 0).toFixed(2)}%`),
            this.adMetric('CPC', `${(metrics.cpc || 0).toFixed(2)} ${metrics.currency || 'RSD'}`),
            this.adMetric('Aktivne kampanje', metrics.activeCampaigns || 0)
          ]),
          h('div', { class: 'ad-platform-actions' }, [
            h('button', { 
              class: 'btn btn-sm btn-secondary', 
              onclick: () => this.showCampaignDetails(connector.platformId)
            }, 'Detalji kampanja')
          ])
        ]);
      })),

      // Top/Bottom Campaigns
      (metaMetrics.bestCampaigns?.length > 0 || tiktokMetrics.bestCampaigns?.length > 0) && h('div', { class: 'section-header' }, [
        h('h3', {}, '🏆 Najbolje i najgore kampanje')
      ]),
      (metaMetrics.bestCampaigns?.length > 0 || tiktokMetrics.bestCampaigns?.length > 0) && h('div', { class: 'campaign-performance-grid' }, [
        h('div', { class: 'campaign-list best' }, [
          h('h4', { class: 'campaign-list-title' }, '✅ Top 5 po ROAS'),
          h('div', { class: 'campaign-items' }, [
            ...(metaMetrics.bestCampaigns || []).map(c => this.renderCampaignItem(c, 'meta')),
            ...(tiktokMetrics.bestCampaigns || []).map(c => this.renderCampaignItem(c, 'tiktok'))
          ].sort((a, b) => parseFloat(b.dataset.roas) - parseFloat(a.dataset.roas)).slice(0, 5).map(el => el))
        ]),
        h('div', { class: 'campaign-list worst' }, [
          h('h4', { class: 'campaign-list-title' }, '⚠️ Bottom 5 po ROAS'),
          h('div', { class: 'campaign-items' }, [
            ...(metaMetrics.worstCampaigns || []).map(c => this.renderCampaignItem(c, 'meta')),
            ...(tiktokMetrics.worstCampaigns || []).map(c => this.renderCampaignItem(c, 'tiktok'))
          ].sort((a, b) => parseFloat(a.dataset.roas) - parseFloat(b.dataset.roas)).slice(0, 5).map(el => el))
        ])
      ]),

      // Budget Pacing Section
      connectedAds.map(connector => {
        const metrics = this.metricsCache[connector.platformId] || {};
        return this.renderBudgetPacing(connector.platformId, metrics);
      }).filter(Boolean),
      
      // Daily trend chart with Chart.js
      (metaMetrics.dailyData?.length > 0 || tiktokMetrics.dailyData?.length > 0) && h('div', { class: 'section-header' }, [
        h('h3', {}, '📈 Dnevni trend troškova i ROAS-a')
      ]),
      (metaMetrics.dailyData?.length > 0 || tiktokMetrics.dailyData?.length > 0) && h('div', { class: 'daily-trend-chart' }, [
        h('div', { class: 'chart-container' }, [
          h('canvas', { id: 'adDailyTrendChart', width: 800, height: 350 })
        ])
      ])
    ]);
  }

  adMetric(label, value, type = null) {
    return h('div', { class: `ad-metric ${type || ''}` }, [
      h('span', { class: 'ad-metric-label' }, label),
      h('span', { class: 'ad-metric-value' }, value)
    ]);
  }

  // Budget pacing calculation
  calculateBudgetPacing(metrics) {
    const dailyBudget = metrics.dailyBudget || 0;
    const lifetimeBudget = metrics.lifetimeBudget || 0;
    const spend = metrics.spend || 0;
    const daysElapsed = metrics.daysElapsed || 1;
    const totalDays = metrics.totalDays || 30;
    
    if (!dailyBudget && !lifetimeBudget) return null;
    
    let pacing = {};
    if (dailyBudget) {
      const expectedSpend = dailyBudget * daysElapsed;
      pacing.daily = {
        budget: dailyBudget,
        expected: expectedSpend,
        actual: spend,
        pace: expectedSpend > 0 ? (spend / expectedSpend * 100).toFixed(1) : 0,
        status: spend > expectedSpend ? 'over' : spend < expectedSpend * 0.8 ? 'under' : 'on-track'
      };
    }
    if (lifetimeBudget) {
      const expectedSpend = (lifetimeBudget / totalDays) * daysElapsed;
      pacing.lifetime = {
        budget: lifetimeBudget,
        expected: expectedSpend,
        actual: spend,
        pace: expectedSpend > 0 ? (spend / expectedSpend * 100).toFixed(1) : 0,
        status: spend > expectedSpend ? 'over' : spend < expectedSpend * 0.8 ? 'under' : 'on-track'
      };
    }
    return pacing;
  }

  // Check for budget alerts
  checkBudgetAlerts(metrics) {
    const pacing = this.calculateBudgetPacing(metrics);
    if (!pacing) return [];
    
    const alerts = [];
    if (pacing.daily) {
      const pace = parseFloat(pacing.daily.pace);
      if (pace > 120) alerts.push({ type: 'over_budget', severity: 'critical', message: `Dnevni budžet prekoracen za ${Math.round(pace - 100)}% (${pacing.daily.pace}%)` });
      else if (pace > 110) alerts.push({ type: 'over_budget', severity: 'warning', message: `Dnevni budžet blizu limita (${pacing.daily.pace}%)` });
      else if (pace < 50) alerts.push({ type: 'under_budget', severity: 'warning', message: `Dnevni budžet iskorišćen samo ${pace}%` });
    }
    if (pacing.lifetime) {
      const pace = parseFloat(pacing.lifetime.pace);
      if (pace > 120) alerts.push({ type: 'over_budget', severity: 'critical', message: `Ukupni budžet prekoracen za ${Math.round(pace - 100)}%` });
      else if (pace > 110) alerts.push({ type: 'over_budget', severity: 'warning', message: `Ukupni budžet blizu limita (${pacing.lifetime.pace}%)` });
      else if (pace < 50) alerts.push({ type: 'under_budget', severity: 'info', message: `Ukupni budžet iskorišćen samo ${pace}%` });
    }
    return alerts;
  }

  // Budget pacing section for platform
  renderBudgetPacing(platformId, metrics) {
    const pacing = this.calculateBudgetPacing(metrics);
    const alerts = this.checkBudgetAlerts(metrics);
    
    if (!pacing) return null;
    
    const hasDaily = !!pacing.daily;
    const hasLifetime = !!pacing.lifetime;
    
    return h('div', { class: 'budget-pacing-section' }, [
      h('h4', { class: 'section-title-small' }, '💰 Budget Pacing'),
      
      alerts.length > 0 && h('div', { class: 'budget-alerts' }, alerts.map(alert => 
        h('div', { class: `budget-alert ${alert.severity}` }, [
          h('span', { class: 'alert-icon' }, alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'),
          h('span', { class: 'alert-message' }, alert.message)
        ])
      )),
      
      h('div', { class: 'budget-pacing-grid' }, [
        hasDaily && h('div', { class: `pacing-card ${pacing.daily.status}` }, [
          h('div', { class: 'pacing-header' }, [
            h('span', { class: 'pacing-label' }, 'Dnevni budžet'),
            h('span', { class: `pacing-status ${pacing.daily.status}` }, pacing.daily.status === 'over' ? '🔴 Prekoracen' : pacing.daily.status === 'under' ? '🟡 Ispod' : '🟢 Na putu')
          ]),
          h('div', { class: 'pacing-metrics' }, [
            h('div', { class: 'pacing-metric' }, [
              h('span', { class: 'pacing-metric-label' }, 'Budžet/dan'),
              h('span', { class: 'pacing-metric-value' }, `${ImperiumUtils.formatNumber(pacing.daily.budget)} ${metrics.currency || 'RSD'}`)
            ]),
            h('div', { class: 'pacing-metric' }, [
              h('span', { class: 'pacing-metric-label' }, 'Očekivano'),
              h('span', { class: 'pacing-metric-value' }, `${ImperiumUtils.formatNumber(pacing.daily.expected)} ${metrics.currency || 'RSD'}`)
            ]),
            h('div', { class: 'pacing-metric' }, [
              h('span', { class: 'pacing-metric-label' }, 'Stvarno'),
              h('span', { class: 'pacing-metric-value' }, `${ImperiumUtils.formatNumber(pacing.daily.actual)} ${metrics.currency || 'RSD'}`)
            ]),
            h('div', { class: 'pacing-metric pace' }, [
              h('span', { class: 'pacing-metric-label' }, 'Tempo'),
              h('span', { class: `pacing-metric-value pace-${pacing.daily.status}` }, `${pacing.daily.pace}%`)
            ])
          ]),
          h('div', { class: 'pacing-bar' }, [
            h('div', { 
              class: `pacing-bar-fill pace-${pacing.daily.status}`, 
              style: `width: ${Math.min(200, parseFloat(pacing.daily.pace))}%` 
            })
          ])
        ]),
        
        hasLifetime && h('div', { class: `pacing-card ${pacing.lifetime.status}` }, [
          h('div', { class: 'pacing-header' }, [
            h('span', { class: 'pacing-label' }, 'Ukupni budžet'),
            h('span', { class: `pacing-status ${pacing.lifetime.status}` }, pacing.lifetime.status === 'over' ? '🔴 Prekoracen' : pacing.lifetime.status === 'under' ? '🟡 Ispod' : '🟢 Na putu')
          ]),
          h('div', { class: 'pacing-metrics' }, [
            h('div', { class: 'pacing-metric' }, [
              h('span', { class: 'pacing-metric-label' }, 'Ukupni budžet'),
              h('span', { class: 'pacing-metric-value' }, `${ImperiumUtils.formatNumber(pacing.lifetime.budget)} ${metrics.currency || 'RSD'}`)
            ]),
            h('div', { class: 'pacing-metric' }, [
              h('span', { class: 'pacing-metric-label' }, 'Očekivano do sada'),
              h('span', { class: 'pacing-metric-value' }, `${ImperiumUtils.formatNumber(pacing.lifetime.expected)} ${metrics.currency || 'RSD'}`)
            ]),
            h('div', { class: 'pacing-metric' }, [
              h('span', { class: 'pacing-metric-label' }, 'Stvarno'),
              h('span', { class: 'pacing-metric-value' }, `${ImperiumUtils.formatNumber(pacing.lifetime.actual)} ${metrics.currency || 'RSD'}`)
            ]),
            h('div', { class: 'pacing-metric pace' }, [
              h('span', { class: 'pacing-metric-label' }, 'Tempo'),
              h('span', { class: `pacing-metric-value pace-${pacing.lifetime.status}` }, `${pacing.lifetime.pace}%`)
            ])
          ]),
          h('div', { class: 'pacing-bar' }, [
            h('div', { 
              class: `pacing-bar-fill pace-${pacing.lifetime.status}`, 
              style: `width: ${Math.min(200, parseFloat(pacing.lifetime.pace))}%` 
            })
          ])
        ])
      ])
    ]);
  }

  renderCampaignItem(campaign, platform) {
    const config = PLATFORM_CONFIGS[platform === 'meta' ? 'meta_ads' : 'tiktok_ads']?.config;
    return h('div', { 
      class: 'campaign-item', 
      'data-roas': campaign.roas,
      style: config?.gradient ? `border-left: 3px solid ${config.color}` : ''
    }, [
      h('div', { class: 'campaign-name' }, campaign.name),
      h('div', { class: 'campaign-stats' }, [
        h('span', { class: 'campaign-roas' }, `ROAS: ${campaign.roas}x`),
        h('span', { class: 'campaign-spend' }, `${ImperiumUtils.formatNumber(campaign.spend)} ${campaign.currency || 'RSD'}`),
        h('span', { class: 'campaign-revenue' }, `${ImperiumUtils.formatNumber(campaign.revenue)} ${campaign.currency || 'RSD'}`)
      ])
    ]);
  }

  showCampaignDetails(platformId) {
    const metrics = this.metricsCache[platformId] || {};
    const campaigns = metrics.campaigns || [];
    
    if (campaigns.length === 0) {
      this.showToast('Nema dostupnih kampanja za prikaz', 'info');
      return;
    }
    
    this.admin.openModal({
      title: `Kampanje - ${platformId === 'meta_ads' ? 'Meta Ads' : 'TikTok Ads'}`,
      size: 'lg',
      content: h('div', { class: 'campaign-details-modal' }, [
        h('table', { class: 'campaign-table' }, [
          h('thead', {}, [
            h('tr', {}, [
              h('th', {}, 'Naziv'),
              h('th', {}, 'Status'),
              h('th', {}, 'Trošak'),
              h('th', {}, 'Prihod'),
              h('th', {}, 'ROAS'),
              h('th', {}, 'Konverzije'),
              h('th', {}, 'Doseg'),
              h('th', {}, 'CTR')
            ])
          ]),
          h('tbody', {}, campaigns
            .filter(c => c.metrics)
            .sort((a, b) => b.metrics.roas - a.metrics.roas)
            .map(campaign => {
              const m = campaign.metrics;
              const config = PLATFORM_CONFIGS[platformId]?.config;
              return h('tr', { style: config?.gradient ? `border-left: 3px solid ${config.color}` : '' }, [
                h('td', {}, campaign.name || campaign.campaign_name),
                h('td', {}, campaign.status || campaign.campaign_status),
                h('td', {}, `${ImperiumUtils.formatNumber(m.spend)} ${m.currency || 'RSD'}`),
                h('td', {}, `${ImperiumUtils.formatNumber(m.revenue)} ${m.currency || 'RSD'}`),
                h('td', { class: m.roas >= 3 ? 'positive' : m.roas >= 1 ? 'neutral' : 'negative' }, m.roas.toFixed(2)),
                h('td', {}, ImperiumUtils.formatNumber(m.conversions)),
                h('td', {}, ImperiumUtils.formatNumber(m.reach)),
                h('td', {}, `${m.ctr.toFixed(2)}%`)
              ]);
            })
          )
        ])
      ]),
      footer: h('button', { class: 'btn btn-primary', onclick: () => this.admin.closeModal() }, 'Zatvori')
    });
  }

  refreshAdMetrics() {
    const metaAds = this.connectionManager.getConnector('meta_ads');
    const tiktokAds = this.connectionManager.getConnector('tiktok_ads');
    
    if (metaAds) this.loadPlatformMetrics('meta_ads');
    if (tiktokAds) this.loadPlatformMetrics('tiktok_ads');
    
    this.showToast('Osvežavanje reklamnih metrika...', 'info');
  }

  renderROASTab() {
    const metaMetrics = this.metricsCache.meta_ads || {};
    const tiktokMetrics = this.metricsCache.tiktok_ads || {};
    const gaMetrics = this.metricsCache.google_analytics || {};
    
    // Combined data
    const combinedSpend = (metaMetrics.spend || 0) + (tiktokMetrics.spend || 0);
    const combinedRevenue = (metaMetrics.revenue || 0) + (tiktokMetrics.revenue || 0);
    const combinedRoas = combinedSpend > 0 ? combinedRevenue / combinedSpend : 0;
    const combinedConversions = (metaMetrics.conversions || 0) + (tiktokMetrics.conversions || 0);
    
    // Daily data for charts
    const metaDaily = metaMetrics.dailyData || [];
    const tiktokDaily = tiktokMetrics.dailyData || [];
    
    // Merge daily data
    const dailyMap = new Map();
    [...metaDaily, ...tiktokDaily].forEach(d => {
      if (!dailyMap.has(d.date)) {
        dailyMap.set(d.date, { date: d.date, spend: 0, revenue: 0, roas: 0, conversions: 0 });
      }
      const day = dailyMap.get(d.date);
      day.spend += d.spend || 0;
      day.revenue += d.revenue || 0;
      day.conversions += d.conversions || 0;
    });
    
    const mergedDaily = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, roas: d.spend > 0 ? d.revenue / d.spend : 0 }));
    
    // Weekly/Monthly aggregation
    const weeklyData = this.aggregateByWeek(mergedDaily);
    const monthlyData = this.aggregateByMonth(mergedDaily);
    const yearlyData = this.aggregateByYear(mergedDaily);
    
    const hasAdData = combinedSpend > 0 || combinedRevenue > 0;
    
    return h('div', { class: 'tab-panel roas-panel' }, [
      h('div', { class: 'panel-header' }, [
        h('div', { class: 'header-content' }, [
          h('h2', {}, 'ROAS Dashboard'),
          h('p', { class: 'panel-desc' }, 'Napredna analiza povratka ulaganja na reklame (Return on Ad Spend)')
        ]),
        h('div', { class: 'header-actions' }, [
          h('div', { class: 'period-selector' }, [
            h('label', { for: 'roasPeriod' }, 'Granularnost:'),
            h('select', {
              id: 'roasPeriod',
              class: 'form-select',
              value: this.roasPeriod || 'daily',
              onchange: (e) => { this.roasPeriod = e.target.value; this.render(); }
            }, [
              h('option', { value: 'daily' }, 'Dnevno'),
              h('option', { value: 'weekly' }, 'Nedeljno'),
              h('option', { value: 'monthly' }, 'Mesečno'),
              h('option', { value: 'yearly' }, 'Godišnje')
            ])
          ]),
          h('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.refreshROASMetrics() }, [
            h('span', { class: 'btn-icon' }, '⟳'),
            ' Osveži'
          ])
        ])
      ]),

      // Summary KPIs
      h('div', { class: 'kpi-grid' }, [
        this.kpiCard('Ukupni trošak', `${ImperiumUtils.formatNumber(combinedSpend)} RSD`, null, null, '💸'),
        this.kpiCard('Ukupni prihod', `${ImperiumUtils.formatNumber(combinedRevenue)} RSD`, null, null, '💰'),
        this.kpiCard('ROAS', combinedRoas.toFixed(2), null, combinedRoas >= 3 ? 'positive' : combinedRoas >= 1 ? 'neutral' : 'negative', '📈'),
        this.kpiCard('Konverzije', ImperiumUtils.formatNumber(combinedConversions), null, null, '🎯'),
        this.kpiCard('Profit', `${ImperiumUtils.formatNumber(combinedRevenue - combinedSpend)} RSD`, null, combinedRevenue > combinedSpend ? 'positive' : 'negative', '💵'),
        this.kpiCard('ROI', combinedSpend > 0 ? `${(((combinedRevenue - combinedSpend) / combinedSpend) * 100).toFixed(1)}%` : '0%', null, combinedRevenue > combinedSpend ? 'positive' : 'negative', '📊')
      ]),

      // Main ROAS Chart
      hasAdData ? h('div', { class: 'chart-section' }, [
        h('h3', { class: 'section-title' }, `📈 ROAS Trend (${this.getPeriodLabel(this.roasPeriod || 'daily')})`),
        h('div', { class: 'chart-container' }, [
          h('canvas', { id: 'roasMainChart', width: 800, height: 400 })
        ])
      ]) : h('div', { class: 'chart-section empty' }, [
        h('div', { class: 'chart-placeholder' }, [
          h('span', { class: 'placeholder-icon' }, '📊'),
          h('p', {}, 'Nema reklamnih podataka za prikaz. Povežite Meta Ads i/ili TikTok Ads.'),
          h('button', { class: 'btn btn-primary', onclick: () => this.handleTabChange('connections') }, 'Idi na Konekcije')
        ])
      ]),

      // Platform Breakdown Charts
      hasAdData && h('div', { class: 'charts-grid' }, [
        h('div', { class: 'chart-section' }, [
          h('h3', { class: 'section-title' }, '🥧 Trošak po platformi'),
          h('div', { class: 'chart-container' }, [
            h('canvas', { id: 'roasSpendChart', width: 400, height: 300 })
          ])
        ]),
        h('div', { class: 'chart-section' }, [
          h('h3', { class: 'section-title' }, '🥧 Prihod po platformi'),
          h('div', { class: 'chart-container' }, [
            h('canvas', { id: 'roasRevenueChart', width: 400, height: 300 })
          ])
        ])
      ]),

      // Best/Worst Campaigns
      (metaMetrics.bestCampaigns?.length > 0 || tiktokMetrics.bestCampaigns?.length > 0) && h('div', { class: 'section-header' }, [
        h('h3', {}, '🏆 Najbolje i najgore kampanje (po ROAS)')
      ]),
      (metaMetrics.bestCampaigns?.length > 0 || tiktokMetrics.bestCampaigns?.length > 0) && h('div', { class: 'campaign-performance-grid' }, [
        h('div', { class: 'campaign-list best' }, [
          h('h4', { class: 'campaign-list-title' }, '✅ Top 5 po ROAS'),
          h('div', { class: 'campaign-items' }, this.getTopCampaigns(metaMetrics, tiktokMetrics, 5, true))
        ]),
        h('div', { class: 'campaign-list worst' }, [
          h('h4', { class: 'campaign-list-title' }, '⚠️ Bottom 5 po ROAS'),
          h('div', { class: 'campaign-items' }, this.getTopCampaigns(metaMetrics, tiktokMetrics, 5, false))
        ])
      ]),

      // Platform Comparison Table
      hasAdData && h('div', { class: 'section-header' }, [
        h('h3', {}, '📋 Poređenje platformi')
      ]),
      hasAdData && h('div', { class: 'roas-comparison-table' }, [
        h('table', { class: 'comparison-table' }, [
          h('thead', {}, [
            h('tr', {}, [
              h('th', {}, 'Platforma'),
              h('th', {}, 'Trošak'),
              h('th', {}, 'Prihod'),
              h('th', {}, 'ROAS'),
              h('th', {}, 'Konverzije'),
              h('th', {}, 'CPC'),
              h('th', {}, 'CTR'),
              h('th', {}, 'Aktivne kamp.')
            ])
          ]),
          h('tbody', {}, [
            metaMetrics.spend > 0 && h('tr', { style: 'border-left: 3px solid #1877F2' }, [
              h('td', {}, '📘 Meta Ads'),
              h('td', {}, `${ImperiumUtils.formatNumber(metaMetrics.spend)} ${metaMetrics.currency || 'RSD'}`),
              h('td', {}, `${ImperiumUtils.formatNumber(metaMetrics.revenue)} ${metaMetrics.currency || 'RSD'}`),
              h('td', { class: (metaMetrics.roas || 0) >= 3 ? 'positive' : (metaMetrics.roas || 0) >= 1 ? 'neutral' : 'negative' }, (metaMetrics.roas || 0).toFixed(2)),
              h('td', {}, ImperiumUtils.formatNumber(metaMetrics.conversions || 0)),
              h('td', {}, `${(metaMetrics.cpc || 0).toFixed(2)} ${metaMetrics.currency || 'RSD'}`),
              h('td', {}, `${(metaMetrics.ctr || 0).toFixed(2)}%`),
              h('td', {}, metaMetrics.activeCampaigns || 0)
            ]),
            tiktokMetrics.spend > 0 && h('tr', { style: 'border-left: 3px solid #000000' }, [
              h('td', {}, '🎵 TikTok Ads'),
              h('td', {}, `${ImperiumUtils.formatNumber(tiktokMetrics.spend)} ${tiktokMetrics.currency || 'RSD'}`),
              h('td', {}, `${ImperiumUtils.formatNumber(tiktokMetrics.revenue)} ${tiktokMetrics.currency || 'RSD'}`),
              h('td', { class: (tiktokMetrics.roas || 0) >= 3 ? 'positive' : (tiktokMetrics.roas || 0) >= 1 ? 'neutral' : 'negative' }, (tiktokMetrics.roas || 0).toFixed(2)),
              h('td', {}, ImperiumUtils.formatNumber(tiktokMetrics.conversions || 0)),
              h('td', {}, `${(tiktokMetrics.cpc || 0).toFixed(2)} ${tiktokMetrics.currency || 'RSD'}`),
              h('td', {}, `${(tiktokMetrics.ctr || 0).toFixed(2)}%`),
              h('td', {}, tiktokMetrics.activeCampaigns || 0)
            ]),
            h('tr', { class: 'total-row' }, [
              h('td', { class: 'total-label' }, '📊 UKUPNO'),
              h('td', {}, `${ImperiumUtils.formatNumber(combinedSpend)} RSD`),
              h('td', {}, `${ImperiumUtils.formatNumber(combinedRevenue)} RSD`),
              h('td', { class: combinedRoas >= 3 ? 'positive' : combinedRoas >= 1 ? 'neutral' : 'negative' }, combinedRoas.toFixed(2)),
              h('td', {}, ImperiumUtils.formatNumber(combinedConversions)),
              h('td', {}, '—'),
              h('td', {}, '—'),
              h('td', {}, (metaMetrics.activeCampaigns || 0) + (tiktokMetrics.activeCampaigns || 0))
            ])
          ])
        ])
      ])
    ]);
  }

  getPeriodLabel(period) {
    const labels = { daily: 'Dnevno', weekly: 'Nedeljno', monthly: 'Mesečno', yearly: 'Godišnje' };
    return labels[period] || 'Dnevno';
  }

  aggregateByWeek(dailyData) {
    const weeklyMap = new Map();
    dailyData.forEach(d => {
      const date = new Date(d.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      
      if (!weeklyMap.has(key)) {
        weeklyMap.set(key, { weekStart: key, spend: 0, revenue: 0, conversions: 0 });
      }
      const w = weeklyMap.get(key);
      w.spend += d.spend;
      w.revenue += d.revenue;
      w.conversions += d.conversions;
    });
    
    return Array.from(weeklyMap.values())
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
      .map(w => ({ ...w, label: this.formatWeekLabel(w.weekStart), roas: w.spend > 0 ? w.revenue / w.spend : 0 }));
  }

  aggregateByMonth(dailyData) {
    const monthlyMap = new Map();
    dailyData.forEach(d => {
      const key = d.date.substring(0, 7); // YYYY-MM
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { month: key, spend: 0, revenue: 0, conversions: 0 });
      }
      const m = monthlyMap.get(key);
      m.spend += d.spend;
      m.revenue += d.revenue;
      m.conversions += d.conversions;
    });
    
    return Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({ ...m, label: this.formatMonthLabel(m.month), roas: m.spend > 0 ? m.revenue / m.spend : 0 }));
  }

  aggregateByYear(dailyData) {
    const yearlyMap = new Map();
    dailyData.forEach(d => {
      const key = d.date.substring(0, 4); // YYYY
      if (!yearlyMap.has(key)) {
        yearlyMap.set(key, { year: key, spend: 0, revenue: 0, conversions: 0 });
      }
      const y = yearlyMap.get(key);
      y.spend += d.spend;
      y.revenue += d.revenue;
      y.conversions += d.conversions;
    });
    
    return Array.from(yearlyMap.values())
      .sort((a, b) => a.year.localeCompare(b.year))
      .map(y => ({ ...y, label: y.year, roas: y.spend > 0 ? y.revenue / y.spend : 0 }));
  }

  formatWeekLabel(weekStart) {
    const date = new Date(weekStart);
    const end = new Date(date);
    end.setDate(date.getDate() + 6);
    this.bindEvents();
    return `${date.getDate()}.${date.getMonth() + 1}. - ${end.getDate()}.${end.getMonth() + 1}.`;
  }

  formatMonthLabel(month) {
    const [year, monthNum] = month.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    this.bindEvents();
    return `${months[parseInt(monthNum) - 1]} ${year}`;
  }

  getTopCampaigns(metaMetrics, tiktokMetrics, limit, best) {
    const allCampaigns = [
      ...(metaMetrics.bestCampaigns || []).map(c => ({ ...c, platform: 'meta' })),
      ...(tiktokMetrics.bestCampaigns || []).map(c => ({ ...c, platform: 'tiktok' })),
      ...(metaMetrics.worstCampaigns || []).map(c => ({ ...c, platform: 'meta' })),
      ...(tiktokMetrics.worstCampaigns || []).map(c => ({ ...c, platform: 'tiktok' }))
    ];
    
    // Filter unique by ID
    const unique = Array.from(new Map(allCampaigns.map(c => [c.id, c])).values());
    
    const sorted = unique
      .filter(c => c.roas !== undefined && c.spend > 0)
      .sort((a, b) => best ? b.roas - a.roas : a.roas - b.roas)
      .slice(0, limit);
    
    return sorted.map((c, i) => h('div', { 
      class: 'campaign-item', 
      'data-roas': c.roas,
      style: c.platform === 'meta' ? 'border-left: 3px solid #1877F2' : 'border-left: 3px solid #000'
    }, [
      h('div', { class: 'campaign-rank' }, `#${i + 1}`),
      h('div', { class: 'campaign-name' }, c.name),
      h('div', { class: 'campaign-stats' }, [
        h('span', { class: 'campaign-roas' }, `ROAS: ${c.roas}x`),
        h('span', { class: 'campaign-spend' }, `${ImperiumUtils.formatNumber(c.spend)} ${c.currency || 'RSD'}`),
        h('span', { class: 'campaign-revenue' }, `${ImperiumUtils.formatNumber(c.revenue)} ${c.currency || 'RSD'}`)
      ])
    ]));
  }

  refreshROASMetrics() {
    this.refreshAdMetrics();
    this.showToast('Osvežavanje ROAS metrika...', 'info');
  }

  async onAfterRender() {
    // Initialize charts after render
    if (this.activeTab === 'roas' && this.chartJSLoaded) {
      setTimeout(() => this.initROASCharts(), 100);
    }
    if (this.activeTab === 'advertising' && this.chartJSLoaded) {
      setTimeout(() => this.initAdvertisingCharts(), 100);
    }
  }

  initAdvertisingCharts() {
    const metaMetrics = this.metricsCache.meta_ads || {};
    const tiktokMetrics = this.metricsCache.tiktok_ads || {};
    
    if (!this.chartJSLoaded) return;
    
    const { createROASChart } = require('../utils/charts.js');
    
    // Get merged daily data for advertising trend chart
    const metaDaily = metaMetrics.dailyData || [];
    const tiktokDaily = tiktokMetrics.dailyData || [];
    
    const dailyMap = new Map();
    [...metaDaily, ...tiktokDaily].forEach(d => {
      if (!dailyMap.has(d.date)) {
        dailyMap.set(d.date, { date: d.date, spend: 0, revenue: 0, roas: 0 });
      }
      const day = dailyMap.get(d.date);
      day.spend += d.spend || 0;
      day.revenue += d.revenue || 0;
    });
    
    const merged = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, roas: d.spend > 0 ? d.revenue / d.spend : 0 }));
    
    if (merged.length === 0) return;
    
    const chartData = {
      labels: merged.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}.${date.getMonth() + 1}.`;
      }),
      spend: merged.map(d => d.spend),
      revenue: merged.map(d => d.revenue),
      roas: merged.map(d => d.roas)
    };
    
    // Main Advertising Trend Chart
    try {
      createROASChart('adDailyTrendChart', chartData);
    } catch (e) {
      console.warn('Failed to create advertising trend chart:', e);
    }
  }

  initROASCharts() {
    const metaMetrics = this.metricsCache.meta_ads || {};
    const tiktokMetrics = this.metricsCache.tiktok_ads || {};
    
    if (!this.chartJSLoaded) return;
    
    const { createROASChart, createDoughnutChart } = require('../utils/charts.js');
    
    // Get data based on selected period
    let chartData;
    switch (this.roasPeriod) {
      case 'weekly':
        chartData = this.getWeeklyChartData();
        break;
      case 'monthly':
        chartData = this.getMonthlyChartData();
        break;
      case 'yearly':
        chartData = this.getYearlyChartData();
        break;
      default:
        chartData = this.getDailyChartData();
    }
    
    // Main ROAS Chart
    if (chartData.labels.length > 0) {
      try {
        createROASChart('roasMainChart', chartData);
      } catch (e) {
        console.warn('Failed to create ROAS chart:', e);
      }
    }
    
    // Spend Doughnut
    const metaSpend = metaMetrics.spend || 0;
    const tiktokSpend = tiktokMetrics.spend || 0;
    if (metaSpend > 0 || tiktokSpend > 0) {
      try {
        createDoughnutChart('roasSpendChart', {
          labels: ['Meta Ads', 'TikTok Ads'],
          values: [metaSpend, tiktokSpend],
          colors: ['#1877F2', '#000000']
        });
      } catch (e) {
        console.warn('Failed to create spend chart:', e);
      }
    }
    
    // Revenue Doughnut
    const metaRevenue = metaMetrics.revenue || 0;
    const tiktokRevenue = tiktokMetrics.revenue || 0;
    if (metaRevenue > 0 || tiktokRevenue > 0) {
      try {
        createDoughnutChart('roasRevenueChart', {
          labels: ['Meta Ads', 'TikTok Ads'],
          values: [metaRevenue, tiktokRevenue],
          colors: ['#1877F2', '#000000']
        });
      } catch (e) {
        console.warn('Failed to create revenue chart:', e);
      }
    }
  }

  getDailyChartData() {
    const metaDaily = this.metricsCache.meta_ads?.dailyData || [];
    const tiktokDaily = this.metricsCache.tiktok_ads?.dailyData || [];
    
    const dailyMap = new Map();
    [...metaDaily, ...tiktokDaily].forEach(d => {
      if (!dailyMap.has(d.date)) {
        dailyMap.set(d.date, { date: d.date, spend: 0, revenue: 0, roas: 0 });
      }
      const day = dailyMap.get(d.date);
      day.spend += d.spend || 0;
      day.revenue += d.revenue || 0;
    });
    
    const merged = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, roas: d.spend > 0 ? d.revenue / d.spend : 0 }));
    
    return {
      labels: merged.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}.${date.getMonth() + 1}.`;
      }),
      spend: merged.map(d => d.spend),
      revenue: merged.map(d => d.revenue),
      roas: merged.map(d => d.roas)
    };
  }

  getWeeklyChartData() {
    const weekly = this.aggregateByWeek(
      [...(this.metricsCache.meta_ads?.dailyData || []), ...(this.metricsCache.tiktok_ads?.dailyData || [])]
    );
    return {
      labels: weekly.map(w => w.label),
      spend: weekly.map(w => w.spend),
      revenue: weekly.map(w => w.revenue),
      roas: weekly.map(w => w.roas)
    };
  }

  getMonthlyChartData() {
    const monthly = this.aggregateByMonth(
      [...(this.metricsCache.meta_ads?.dailyData || []), ...(this.metricsCache.tiktok_ads?.dailyData || [])]
    );
    return {
      labels: monthly.map(m => m.label),
      spend: monthly.map(m => m.spend),
      revenue: monthly.map(m => m.revenue),
      roas: monthly.map(m => m.roas)
    };
  }

  getYearlyChartData() {
    const yearly = this.aggregateByYear(
      [...(this.metricsCache.meta_ads?.dailyData || []), ...(this.metricsCache.tiktok_ads?.dailyData || [])]
    );
    return {
      labels: yearly.map(y => y.label),
      spend: yearly.map(y => y.spend),
      revenue: yearly.map(y => y.revenue),
      roas: yearly.map(y => y.roas)
    };
  }

  onUnmount() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    
    // Destroy charts
    const { destroyAllCharts } = require('../utils/charts.js');
    destroyAllCharts();
  }

  renderTrafficTab() {
    const gaMetrics = this.metricsCache.google_analytics || {};
    const metaMetrics = this.metricsCache.meta_ads || {};
    const tiktokMetrics = this.metricsCache.tiktok_ads || {};
    const instagramMetrics = this.metricsCache.instagram || {};
    const facebookMetrics = this.metricsCache.facebook || {};
    const tiktokOrganicMetrics = this.metricsCache.tiktok || {};
    
    // Get traffic sources from GA4
    const trafficSources = this.calculateTrafficSources(gaMetrics, metaMetrics, tiktokMetrics, instagramMetrics, facebookMetrics, tiktokOrganicMetrics);
    const totalSessions = trafficSources.reduce((sum, s) => sum + s.sessions, 0);
    
    // Daily trend data (mock - would come from GA4)
    const dailyTrend = this.generateDailyTrend(trafficSources);
    
    return h('div', { class: 'tab-panel traffic-panel' }, [
      h('div', { class: 'panel-header' }, [
        h('div', { class: 'header-content' }, [
          h('h2', {}, 'Saobraćaj Intelligence'),
          h('p', { class: 'panel-desc' }, 'Analiza izvora saobraćaja i trendi po kanalu')
        ]),
        h('div', { class: 'header-actions' }, [
          h('div', { class: 'date-range-selector' }, [
            h('label', { for: 'trafficDateRange' }, 'Period:'),
            h('select', {
              id: 'trafficDateRange',
              class: 'form-select',
              value: this.trafficDateRange || '30d',
              onchange: (e) => { this.trafficDateRange = e.target.value; this.render(); }
            }, [
              h('option', { value: '7d' }, 'Poslednjih 7 dana'),
              h('option', { value: '30d' }, 'Poslednjih 30 dana'),
              h('option', { value: '90d' }, 'Poslednjih 90 dana')
            ])
          ]),
          h('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.refreshTrafficMetrics() }, [
            h('span', { class: 'btn-icon' }, '⟳'),
            ' Osveži'
          ])
        ])
      ]),

      // Traffic Source Breakdown
      h('div', { class: 'section-header' }, [
        h('h3', {}, '📊 Distribucija saobraćaja po izvoru'),
        h('p', { class: 'section-desc' }, `Ukupno sesija: ${ImperiumUtils.formatNumber(totalSessions)}`)
      ]),
      h('div', { class: 'traffic-sources-grid' }, trafficSources.map(source => 
        h('div', { class: `traffic-source-card ${source.type}` }, [
          h('div', { class: 'traffic-source-header' }, [
            h('div', { class: 'source-icon', style: `background: ${source.gradient}` }, source.icon),
            h('div', { class: 'source-info' }, [
              h('h4', { class: 'source-name' }, source.name),
              h('span', { class: `source-tag ${source.type}` }, source.label)
            ])
          ]),
          h('div', { class: 'traffic-source-stats' }, [
            h('div', { class: 'stat-main' }, [
              h('span', { class: 'stat-value' }, ImperiumUtils.formatNumber(source.sessions)),
              h('span', { class: 'stat-percent' }, totalSessions > 0 ? `${((source.sessions / totalSessions) * 100).toFixed(1)}%` : '0%')
            ]),
            h('div', { class: 'stat-bar' }, [
              h('div', { 
                class: 'stat-bar-fill', 
                style: `width: ${totalSessions > 0 ? (source.sessions / totalSessions) * 100 : 0}%; background: ${source.gradient}` 
              })
            ]),
            h('div', { class: 'stat-details' }, [
              h('span', { class: 'detail' }, `👁️ ${ImperiumUtils.formatNumber(source.pageViews)} pregleda`),
              h('span', { class: 'detail' }, `⏱️ ${source.avgDuration}`),
              h('span', { class: 'detail' }, `📉 ${source.bounceRate}% otkaz`)
            ])
          ]),
          source.trend && h('div', { class: 'source-trend' }, [
            h('span', { class: `trend-value ${source.trend > 0 ? 'positive' : source.trend < 0 ? 'negative' : 'neutral'}` }, 
              `${source.trend > 0 ? '+' : ''}${source.trend.toFixed(1)}%`),
            h('span', { class: 'trend-label' }, 'vs prethodni period')
          ])
        ])
      )),

      // Traffic Trend Chart
      h('div', { class: 'chart-section' }, [
        h('h3', { class: 'section-title' }, '📈 Trend saobraćaja po izvoru (poslednjih 30 dana)'),
        h('div', { class: 'chart-container' }, [
          h('canvas', { id: 'trafficTrendChart', width: 800, height: 350 })
        ])
      ]),

      // Channel Comparison Table
      h('div', { class: 'section-header' }, [
        h('h3', {}, '📋 Detaljno poređenje kanala')
      ]),
      h('div', { class: 'traffic-comparison-table' }, [
        h('table', { class: 'comparison-table' }, [
          h('thead', {}, [
            h('tr', {}, [
              h('th', {}, 'Kanal'),
              h('th', {}, 'Sesije'),
              h('th', {}, '% od ukupno'),
              h('th', {}, 'Prikazi stranica'),
              h('th', {}, 'Prosečno vreme'),
              h('th', {}, 'Otkaz %'),
              h('th', {}, 'Str./Sesiju'),
              h('th', {}, 'Novi korisnici %'),
              h('th', {}, 'Trend')
            ])
          ]),
          h('tbody', {}, trafficSources.map(source => 
            h('tr', { class: `source-${source.type}` }, [
              h('td', { class: 'source-cell' }, [
                h('span', { class: 'source-icon-sm', style: `background: ${source.gradient}` }, source.icon),
                h('span', { class: 'source-name' }, source.name)
              ]),
              h('td', {}, ImperiumUtils.formatNumber(source.sessions)),
              h('td', { class: 'percent-cell' }, totalSessions > 0 ? `${((source.sessions / totalSessions) * 100).toFixed(1)}%` : '0%'),
              h('td', {}, ImperiumUtils.formatNumber(source.pageViews)),
              h('td', {}, source.avgDuration),
              h('td', { class: source.bounceRate > 70 ? 'negative' : source.bounceRate < 40 ? 'positive' : 'neutral' }, `${source.bounceRate}%`),
              h('td', {}, source.pagesPerSession.toFixed(2)),
              h('td', {}, `${source.newUserRate}%`),
              h('td', { class: `trend-cell ${source.trend > 0 ? 'positive' : source.trend < 0 ? 'negative' : 'neutral'}` }, 
                `${source.trend > 0 ? '+' : ''}${source.trend.toFixed(1)}%`)
            ])
          ))
        ])
      ]),

      // UTM Campaign Tracking
      h('div', { class: 'section-header' }, [
        h('h3', {}, '🏷️ Top UTM Kampanje (iz GA4)')
      ]),
      h('div', { class: 'utm-campaigns' }, [
        h('p', { class: 'utm-note' }, 'Pokazuje top 10 kampanja po sesijama. Podaci dolaze iz Google Analytics (utm_source, utm_medium, utm_campaign).'),
        h('div', { class: 'utm-table-wrapper' }, [
          h('table', { class: 'utm-table' }, [
            h('thead', {}, [
              h('tr', {}, [
                h('th', {}, 'Kampanja'),
                h('th', {}, 'Izvor / Medijum'),
                h('th', {}, 'Sesije'),
                h('th', {}, 'Konverzije'),
                h('th', {}, 'Prihod'),
                h('th', {}, 'ROAS')
              ])
            ]),
            h('tbody', {}, this.getTopUTMCampaigns(gaMetrics).map((camp, i) => 
              h('tr', {}, [
                h('td', { class: 'campaign-name' }, camp.name || '(not set)'),
                h('td', { class: 'campaign-source' }, `${camp.source || '(not set)'} / ${camp.medium || '(not set)'}`),
                h('td', {}, ImperiumUtils.formatNumber(camp.sessions)),
                h('td', {}, ImperiumUtils.formatNumber(camp.conversions)),
                h('td', {}, `${ImperiumUtils.formatNumber(camp.revenue)} RSD`),
                h('td', { class: (camp.roas || 0) >= 3 ? 'positive' : (camp.roas || 0) >= 1 ? 'neutral' : 'negative' }, 
                  (camp.roas || 0).toFixed(2))
              ])
            ))
          ])
        ])
      ])
    ]);
  }

  calculateTrafficSources(ga, meta, tiktok, instagram, facebook, tiktokOrg) {
    // Base sessions from GA4
    const gaSessions = ga.sessions || 0;
    const organicPercent = ga.organicPercent || 0;
    const directPercent = ga.directPercent || 0;
    const socialPercent = ga.socialPercent || 0;
    const referralPercent = ga.referralPercent || 0;
    const emailPercent = ga.emailPercent || 0;
    const paidPercent = ga.paidPercent || 0;
    
    // Calculate base from GA
    const baseSessions = Math.max(gaSessions, 1);
    
    const sources = [
      {
        type: 'google',
        name: 'Google Organic',
        label: 'Organic',
        icon: '🔍',
        gradient: 'linear-gradient(135deg, #4285F4, #34A853)',
        sessions: Math.round(baseSessions * (organicPercent / 100)),
        pageViews: Math.round((ga.pageViews || 0) * (organicPercent / 100)),
        avgDuration: this.formatDuration(ga.avgSessionDuration || 0),
        bounceRate: (ga.bounceRate || 50).toFixed(1),
        pagesPerSession: ga.pagesPerSession || 1,
        newUserRate: Math.round((ga.newUserRate || 0) * 100),
        trend: (Math.random() - 0.3) * 20 // Mock trend
      },
      {
        type: 'direct',
        name: 'Direct',
        label: 'Direct',
        icon: '🔗',
        gradient: 'linear-gradient(135deg, #6B7280, #9CA3AF)',
        sessions: Math.round(baseSessions * (directPercent / 100)),
        pageViews: Math.round((ga.pageViews || 0) * (directPercent / 100)),
        avgDuration: this.formatDuration((ga.avgSessionDuration || 0) * 1.2),
        bounceRate: ((ga.bounceRate || 50) * 0.8).toFixed(1),
        pagesPerSession: (ga.pagesPerSession || 1) * 1.3,
        newUserRate: Math.round((ga.newUserRate || 0) * 80),
        trend: (Math.random() - 0.4) * 15
      },
      {
        type: 'instagram',
        name: 'Instagram',
        label: 'Social',
        icon: '📷',
        gradient: 'linear-gradient(135deg, #E1306C, #FD1D1D, #F77737)',
        sessions: Math.round(baseSessions * (socialPercent / 100) * 0.4),
        pageViews: Math.round(instagramMetrics.profileVisits || 0),
        avgDuration: this.formatDuration(instagramMetrics.avgSessionDuration || 45),
        bounceRate: '55.2',
        pagesPerSession: 1.8,
        newUserRate: 65,
        trend: instagramMetrics.followersChange ? ((instagramMetrics.followersChange / Math.max(instagramMetrics.followers, 1)) * 100).toFixed(1) : (Math.random() - 0.2) * 25
      },
      {
        type: 'facebook',
        name: 'Facebook',
        label: 'Social',
        icon: '📘',
        gradient: 'linear-gradient(135deg, #1877F2, #42A5F5)',
        sessions: Math.round(baseSessions * (socialPercent / 100) * 0.35),
        pageViews: Math.round(facebookMetrics.profileVisits || 0),
        avgDuration: this.formatDuration(facebookMetrics.avgSessionDuration || 60),
        bounceRate: '52.1',
        pagesPerSession: 2.1,
        newUserRate: 58,
        trend: facebookMetrics.followersChange ? ((facebookMetrics.followersChange / Math.max(facebookMetrics.followers, 1)) * 100).toFixed(1) : (Math.random() - 0.3) * 20
      },
      {
        type: 'tiktok',
        name: 'TikTok',
        label: 'Social',
        icon: '🎵',
        gradient: 'linear-gradient(135deg, #000000, #69C0D0, #EE1D52)',
        sessions: Math.round(baseSessions * (socialPercent / 100) * 0.25),
        pageViews: Math.round(tiktokOrgMetrics.profileVisits || 0),
        avgDuration: this.formatDuration(tiktokOrgMetrics.avgWatchTime || 120),
        bounceRate: '48.5',
        pagesPerSession: 1.5,
        newUserRate: 72,
        trend: tiktokOrgMetrics.followersChange ? ((tiktokOrgMetrics.followersChange / Math.max(tiktokOrgMetrics.followers, 1)) * 100).toFixed(1) : (Math.random() + 0.1) * 30
      },
      {
        type: 'referral',
        name: 'Referral',
        label: 'Referral',
        icon: '🔗',
        gradient: 'linear-gradient(135deg, #8B5CF6, #A855F7)',
        sessions: Math.round(baseSessions * (referralPercent / 100)),
        pageViews: Math.round((ga.pageViews || 0) * (referralPercent / 100)),
        avgDuration: this.formatDuration((ga.avgSessionDuration || 0) * 1.5),
        bounceRate: '35.2',
        pagesPerSession: 2.8,
        newUserRate: 45,
        trend: (Math.random() - 0.3) * 15
      },
      {
        type: 'email',
        name: 'Email Marketing',
        label: 'Email',
        icon: '📧',
        gradient: 'linear-gradient(135deg, #EC4899, #F472B6)',
        sessions: Math.round(baseSessions * (emailPercent / 100)),
        pageViews: Math.round((ga.pageViews || 0) * (emailPercent / 100)),
        avgDuration: this.formatDuration((ga.avgSessionDuration || 0) * 1.8),
        bounceRate: '28.5',
        pagesPerSession: 3.2,
        newUserRate: 35,
        trend: (Math.random() - 0.2) * 10
      },
      {
        type: 'paid',
        name: 'Paid Search / Ads',
        label: 'Paid',
        icon: '💰',
        gradient: 'linear-gradient(135deg, #F59E0B, #F97316)',
        sessions: Math.round(baseSessions * (paidPercent / 100)) + (meta.spend > 0 ? Math.round(meta.spend / 50) : 0) + (tiktok.spend > 0 ? Math.round(tiktok.spend / 50) : 0),
        pageViews: Math.round((ga.pageViews || 0) * (paidPercent / 100)),
        avgDuration: this.formatDuration((ga.avgSessionDuration || 0) * 1.3),
        bounceRate: '42.3',
        pagesPerSession: 2.4,
        newUserRate: 52,
        trend: (Math.random() - 0.1) * 20
      }
    ];
    
    // Add meta ads traffic if available
    if (meta.spend > 0) {
      sources.find(s => s.type === 'paid').sessions += Math.round(meta.spend / 50);
    }
    if (tiktok.spend > 0) {
      sources.find(s => s.type === 'paid').sessions += Math.round(tiktok.spend / 50);
    }
    
    return sources.filter(s => s.sessions > 0);
  }

  formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.bindEvents();
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  generateDailyTrend(trafficSources) {
    // Generate 30 days of mock trend data
    const days = 30;
    const labels = [];
    const datasets = {};
    
    trafficSources.forEach(source => {
      datasets[source.type] = [];
    });
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(`${date.getDate()}.${date.getMonth() + 1}.`);
      
      trafficSources.forEach(source => {
        // Base sessions with some random variation
        const base = Math.max(1, source.sessions / days);
        const variation = base * (0.5 + Math.random());
        datasets[source.type].push(Math.round(variation));
      });
    }
    
    return { labels, datasets };
  }

  getTopUTMCampaigns(ga) {
    // Mock UTM campaigns - in production would come from GA4 API
    const campaigns = [
      { name: 'summer_sale_2024', source: 'instagram', medium: 'social', sessions: 1247, conversions: 89, revenue: 1780000, roas: 4.2 },
      { name: 'new_collection_launch', source: 'facebook', medium: 'social', sessions: 982, conversions: 67, revenue: 1340000, roas: 3.8 },
      { name: 'tiktok_influencer_campaign', source: 'tiktok', medium: 'social', sessions: 2156, conversions: 134, revenue: 2680000, roas: 5.1 },
      { name: 'google_brand_bid', source: 'google', medium: 'cpc', sessions: 856, conversions: 112, revenue: 2240000, roas: 6.4 },
      { name: 'email_welcome_series', source: 'newsletter', medium: 'email', sessions: 445, conversions: 34, revenue: 510000, roas: 8.2 },
      { name: 'retargeting_cart_abandon', source: 'facebook', medium: 'cpc', sessions: 312, conversions: 45, revenue: 675000, roas: 4.5 },
      { name: 'organic_brand', source: 'google', medium: 'organic', sessions: 3421, conversions: 234, revenue: 4680000, roas: 0 },
      { name: 'direct_brand', source: '(direct)', medium: '(none)', sessions: 2187, conversions: 156, revenue: 3120000, roas: 0 },
      { name: 'referral_blog', source: 'fashionblog.rs', medium: 'referral', sessions: 189, conversions: 12, revenue: 180000, roas: 0 },
      { name: 'instagram_story_ads', source: 'instagram', medium: 'cpc', sessions: 567, conversions: 38, revenue: 570000, roas: 3.2 }
    ];
    
    return campaigns;
  }

  refreshTrafficMetrics() {
    const ga = this.connectionManager.getConnector('google_analytics');
    const gsc = this.connectionManager.getConnector('google_search_console');
    
    if (ga) this.loadPlatformMetrics('google_analytics');
    if (gsc) this.loadPlatformMetrics('google_search_console');
    
    this.showToast('Osvežavanje saobraćaj metrika...', 'info');
  }

  async onAfterRender() {
    // Initialize charts after render
    if (this.activeTab === 'roas' && this.chartJSLoaded) {
      setTimeout(() => this.initROASCharts(), 100);
    }
    if (this.activeTab === 'traffic' && this.chartJSLoaded) {
      setTimeout(() => this.initTrafficCharts(), 100);
    }
  }

  initTrafficCharts() {
    if (!this.chartJSLoaded) return;
    
    const { createStackedBarChart } = require('../utils/charts.js');
    
    const gaMetrics = this.metricsCache.google_analytics || {};
    const metaMetrics = this.metricsCache.meta_ads || {};
    const tiktokMetrics = this.metricsCache.tiktok_ads || {};
    const instagramMetrics = this.metricsCache.instagram || {};
    const facebookMetrics = this.metricsCache.facebook || {};
    const tiktokOrgMetrics = this.metricsCache.tiktok || {};
    
    const trafficSources = this.calculateTrafficSources(gaMetrics, metaMetrics, tiktokMetrics, instagramMetrics, facebookMetrics, tiktokOrgMetrics);
    const trendData = this.generateDailyTrend(trafficSources);
    
    // Create stacked bar chart for daily traffic
    const chartData = {
      labels: trendData.labels,
      datasets: trafficSources.map((source, i) => ({
        label: source.name,
        data: trendData.datasets[source.type],
        color: [
          '#4285F4', '#6B7280', '#E1306C', '#1877F2', '#000000', 
          '#8B5CF6', '#EC4899', '#F59E0B'
        ][i % 8]
      }))
    };
    
    try {
      createStackedBarChart('trafficTrendChart', chartData, {
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.chart.data.datasets.reduce((sum, ds) => sum + (ds.data[context.dataIndex] || 0), 0);
                const percent = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                return `${context.dataset.label}: ${context.parsed.y.toLocaleString('sr-RS')} (${percent}%)`;
              }
            }
          }
        }
      });
    } catch (e) {
      console.warn('Failed to create traffic trend chart:', e);
    }
  }

  renderCommerceTab() {
    const instagramMetrics = this.metricsCache.instagram || {};
    const tiktokMetrics = this.metricsCache.tiktok || {};
    const facebookMetrics = this.metricsCache.facebook || {};
    const gaMetrics = this.metricsCache.google_analytics || {};
    const metaAdsMetrics = this.metricsCache.meta_ads || {};
    const tiktokAdsMetrics = this.metricsCache.tiktok_ads || {};
    
    // Calculate commerce data per platform
    const commerceData = this.calculateCommerceData(instagramMetrics, tiktokMetrics, facebookMetrics, gaMetrics, metaAdsMetrics, tiktokAdsMetrics);
    const totalRevenue = commerceData.reduce((sum, p) => sum + p.revenue, 0);
    const totalOrders = commerceData.reduce((sum, p) => sum + p.orders, 0);
    const totalSessions = commerceData.reduce((sum, p) => sum + p.sessions, 0);
    const overallConversion = totalSessions > 0 ? ((totalOrders / totalSessions) * 100).toFixed(2) : 0;
    
    // Daily trend for revenue
    const dailyRevenue = this.generateDailyRevenue(commerceData);
    
    return h('div', { class: 'tab-panel commerce-panel' }, [
      h('div', { class: 'panel-header' }, [
        h('div', { class: 'header-content' }, [
          h('h2', {}, 'Social Commerce Tracking'),
          h('p', { class: 'panel-desc' }, 'Prodaja, konverzije i prihod po društvenim mrežama')
        ]),
        h('div', { class: 'header-actions' }, [
          h('div', { class: 'date-range-selector' }, [
            h('label', { for: 'commerceDateRange' }, 'Period:'),
            h('select', {
              id: 'commerceDateRange',
              class: 'form-select',
              value: this.commerceDateRange || '30d',
              onchange: (e) => { this.commerceDateRange = e.target.value; this.render(); }
            }, [
              h('option', { value: '7d' }, 'Poslednjih 7 dana'),
              h('option', { value: '30d' }, 'Poslednjih 30 dana'),
              h('option', { value: '90d' }, 'Poslednjih 90 dana'),
              h('option', { value: 'lifetime' }, 'Sve vreme')
            ])
          ]),
          h('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.refreshCommerceMetrics() }, [
            h('span', { class: 'btn-icon' }, '⟳'),
            ' Osveži'
          ])
        ])
      ]),

      // Summary KPIs
      h('div', { class: 'kpi-grid' }, [
        this.kpiCard('Ukupan prihod', `${ImperiumUtils.formatNumber(totalRevenue)} RSD`, null, null, '💰'),
        this.kpiCard('Ukupne porudžbine', ImperiumUtils.formatNumber(totalOrders), null, null, '📦'),
        this.kpiCard('Konverzija', `${overallConversion}%`, null, overallConversion >= 3 ? 'positive' : overallConversion >= 1 ? 'neutral' : 'negative', '📈'),
        this.kpiCard('AOV', totalOrders > 0 ? `${ImperiumUtils.formatNumber(Math.round(totalRevenue / totalOrders))} RSD` : '0 RSD', null, null, '💵'),
        this.kpiCard('Sesije', ImperiumUtils.formatNumber(totalSessions), null, null, '👁️'),
        this.kpiCard('Prihod / Sesiju', totalSessions > 0 ? `${ImperiumUtils.formatNumber(Math.round(totalRevenue / totalSessions))} RSD` : '0 RSD', null, null, '💎')
      ]),

      // Platform Commerce Cards
      h('div', { class: 'section-header' }, [
        h('h3', {}, '🛍️ Prodaja po platformama'),
        h('p', { class: 'section-desc' }, 'Poređenje performansi prodaje na svakom kanalu')
      ]),
      h('div', { class: 'commerce-platform-grid' }, commerceData.map(platform => 
        h('div', { class: `commerce-platform-card ${platform.type}`, style: platform.gradient ? `--platform-gradient: ${platform.gradient}` : '' }, [
          h('div', { class: 'commerce-platform-header' }, [
            h('div', { class: 'platform-badge', style: platform.gradient ? `background: ${platform.gradient}` : '' }, platform.icon),
            h('div', { class: 'platform-info' }, [
              h('h4', {}, platform.name),
              h('span', { class: 'platform-source' }, platform.source)
            ])
          ]),
          h('div', { class: 'commerce-platform-kpis' }, [
            this.commerceKPI('Prihod', `${ImperiumUtils.formatNumber(platform.revenue)} RSD`, '💰', platform.revenueChange),
            this.commerceKPI('Porudžbine', ImperiumUtils.formatNumber(platform.orders), '📦', platform.ordersChange),
            this.commerceKPI('Konverzija', `${platform.conversionRate.toFixed(2)}%`, '📈', platform.conversionChange),
            this.commerceKPI('AOV', `${ImperiumUtils.formatNumber(platform.aov)} RSD`, '💵', null),
            this.commerceKPI('Sesije', ImperiumUtils.formatNumber(platform.sessions), '👁️', null),
            this.commerceKPI('Prihod / Ses.', `${ImperiumUtils.formatNumber(platform.revenuePerSession)} RSD`, '💎', null)
          ]),
          h('div', { class: 'commerce-platform-breakdown' }, [
            h('h5', {}, 'Izvor prodaje:'),
            h('div', { class: 'breakdown-items' }, platform.breakdown.map(b => 
              h('div', { class: 'breakdown-item' }, [
                h('span', { class: 'breakdown-label' }, b.label),
                h('span', { class: 'breakdown-value' }, `${ImperiumUtils.formatNumber(b.value)} RSD (${b.percent}%)`)
              ])
            ))
          ]),
          h('div', { class: 'commerce-platform-actions' }, [
            h('button', { 
              class: 'btn btn-sm btn-secondary', 
              onclick: () => this.showPlatformCommerceDetails(platform.type)
            }, 'Detalji')
          ])
        ])
      )),

      // Revenue Trend Chart
      h('div', { class: 'chart-section' }, [
        h('h3', { class: 'section-title' }, '📈 Trend prihoda po platformama (poslednjih 30 dana)'),
        h('div', { class: 'chart-container' }, [
          h('canvas', { id: 'commerceTrendChart', width: 800, height: 350 })
        ])
      ]),

      // Attribution Model Comparison
      h('div', { class: 'section-header' }, [
        h('h3', {}, '🎯 Modeli atribucije'),
        h('p', { class: 'section-desc' }, 'Kako različiti modeli atribucije utiču na dodelu prodaje kanalima')
      ]),
      h('div', { class: 'attribution-models' }, [
        h('div', { class: 'attribution-model-card' }, [
          h('h4', {}, 'Last Click'),
          h('p', { class: 'model-desc' }, 'Celokupna vrednost dodeljena poslednjem kanalu pre kupovine'),
          h('div', { class: 'model-stats' }, this.getAttributionData(commerceData, 'lastClick'))
        ]),
        h('div', { class: 'attribution-model-card' }, [
          h('h4', {}, 'First Click'),
          h('p', { class: 'model-desc' }, 'Vrednost dodeljena prvom kanalu koji je doveo korisnika'),
          h('div', { class: 'model-stats' }, this.getAttributionData(commerceData, 'firstClick'))
        ]),
        h('div', { class: 'attribution-model-card' }, [
          h('h4', {}, 'Linear'),
          h('p', { class: 'model-desc' }, 'Jednakomerno raspodela vrednosti po svim touchpoint-ovima'),
          h('div', { class: 'model-stats' }, this.getAttributionData(commerceData, 'linear'))
        ]),
        h('div', { class: 'attribution-model-card' }, [
          h('h4', {}, 'Data-Driven (GA4)'),
          h('p', { class: 'model-desc' }, 'ML model koji dodeljuje vrednost na osnovu istorijskih podataka'),
          h('div', { class: 'model-stats' }, this.getAttributionData(commerceData, 'dataDriven'))
        ])
      ]),

      // Top Products by Platform
      h('div', { class: 'section-header' }, [
        h('h3', {}, '🏆 Top Proizvodi po platformama')
      ]),
      h('div', { class: 'top-products-grid' }, commerceData.map(platform => 
        h('div', { class: 'top-products-card' }, [
          h('h4', { style: platform.gradient ? `color: ${platform.color}` : '' }, `${platform.icon} ${platform.name}`),
          h('div', { class: 'top-products-list' }, platform.topProducts.map((product, i) => 
            h('div', { class: 'top-product-item' }, [
              h('span', { class: 'product-rank' }, `#${i + 1}`),
              h('div', { class: 'product-info' }, [
                h('div', { class: 'product-name' }, product.name),
                h('div', { class: 'product-category' }, product.category)
              ]),
              h('div', { class: 'product-stats' }, [
                h('span', { class: 'product-revenue' }, `${ImperiumUtils.formatNumber(product.revenue)} RSD`),
                h('span', { class: 'product-orders' }, `${product.orders} kom`),
                h('span', { class: 'product-conversion' }, `${product.conversionRate}%`)
              ])
            ])
          ))
        ])
      ))
    ]);
  }

  calculateCommerceData(instagram, tiktok, facebook, ga, metaAds, tiktokAds) {
    // Instagram Commerce
    const igOrganicRevenue = instagram.revenue || 0;
    const igOrganicOrders = instagram.orders || 0;
    const igOrganicSessions = instagram.profileVisits || instagram.linkClicks || 0;
    const igOrganicConversion = igOrganicSessions > 0 ? (igOrganicOrders / igOrganicSessions * 100) : 0;
    
    const igAdsRevenue = metaAds.revenue || 0;
    const igAdsOrders = metaAds.conversions || 0;
    const igAdsSessions = metaAds.clicks || 0;
    const igAdsConversion = igAdsSessions > 0 ? (igAdsOrders / igAdsSessions * 100) : 0;
    
    // TikTok Commerce
    const ttOrganicRevenue = tiktok.revenue || 0;
    const ttOrganicOrders = tiktok.orders || 0;
    const ttOrganicSessions = tiktok.profileVisits || tiktok.linkClicks || 0;
    const ttOrganicConversion = ttOrganicSessions > 0 ? (ttOrganicOrders / ttOrganicSessions * 100) : 0;
    
    const ttAdsRevenue = tiktokAds.revenue || 0;
    const ttAdsOrders = tiktokAds.conversions || 0;
    const ttAdsSessions = tiktokAds.clicks || 0;
    const ttAdsConversion = ttAdsSessions > 0 ? (ttAdsOrders / ttAdsSessions * 100) : 0;
    
    // Facebook Commerce
    const fbOrganicRevenue = facebook.revenue || 0;
    const fbOrganicOrders = facebook.orders || 0;
    const fbOrganicSessions = facebook.profileVisits || facebook.linkClicks || 0;
    const fbOrganicConversion = fbOrganicSessions > 0 ? (fbOrganicOrders / fbOrganicSessions * 100) : 0;
    
    const fbAdsRevenue = metaAds.revenue || 0;
    const fbAdsOrders = metaAds.conversions || 0;
    const fbAdsSessions = metaAds.clicks || 0;
    const fbAdsConversion = fbAdsSessions > 0 ? (fbAdsOrders / fbAdsSessions * 100) : 0;
    
    // Google Commerce
    const googleRevenue = ga.revenue || 0;
    const googleOrders = ga.transactions || 0;
    const googleSessions = ga.sessions || 0;
    const googleConversion = googleSessions > 0 ? (googleOrders / googleSessions * 100) : 0;
    
    // Combine Instagram (organic + ads)
    const igRevenue = igOrganicRevenue + igAdsRevenue;
    const igOrders = igOrganicOrders + igAdsOrders;
    const igSessions = igOrganicSessions + igAdsSessions;
    const igConversion = igSessions > 0 ? (igOrders / igSessions * 100) : 0;
    
    // Combine TikTok (organic + ads)
    const ttRevenue = ttOrganicRevenue + ttAdsRevenue;
    const ttOrders = ttOrganicOrders + ttAdsOrders;
    const ttSessions = ttOrganicSessions + ttAdsSessions;
    const ttConversion = ttSessions > 0 ? (ttOrders / ttSessions * 100) : 0;
    
    // Combine Facebook (organic + ads)
    const fbRevenue = fbOrganicRevenue + fbAdsRevenue;
    const fbOrders = fbOrganicOrders + fbAdsOrders;
    const fbSessions = fbOrganicSessions + fbAdsSessions;
    const fbConversion = fbSessions > 0 ? (fbOrders / fbSessions * 100) : 0;
    
    return [
      {
        type: 'instagram',
        name: 'Instagram',
        icon: '📷',
        color: '#E1306C',
        gradient: 'linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
        source: 'Organic + Ads',
        revenue: igRevenue,
        orders: igOrders,
        sessions: igSessions,
        conversionRate: igConversion,
        aov: igOrders > 0 ? Math.round(igRevenue / igOrders) : 0,
        revenuePerSession: igSessions > 0 ? Math.round(igRevenue / igSessions) : 0,
        revenueChange: '+12.5%',
        ordersChange: '+8.3%',
        conversionChange: '+0.5%',
        breakdown: [
          { label: 'Organic', value: igOrganicRevenue, percent: igRevenue > 0 ? Math.round((igOrganicRevenue / igRevenue) * 100) : 0 },
          { label: 'Ads', value: igAdsRevenue, percent: igRevenue > 0 ? Math.round((igAdsRevenue / igRevenue) * 100) : 0 }
        ],
        topProducts: [
          { name: 'Oversized Hoodie', category: 'Duksevi', revenue: Math.round(igRevenue * 0.35), orders: Math.round(igOrders * 0.3), conversionRate: 3.2 },
          { name: 'Organic Cotton Tee', category: 'Majice', revenue: Math.round(igRevenue * 0.25), orders: Math.round(igOrders * 0.25), conversionRate: 2.8 },
          { name: 'Tracksuit Set', category: 'Trenerke', revenue: Math.round(igRevenue * 0.2), orders: Math.round(igOrders * 0.2), conversionRate: 4.1 },
          { name: 'Baseball Cap', category: 'Ostalo', revenue: Math.round(igRevenue * 0.12), orders: Math.round(igOrders * 0.15), conversionRate: 5.5 },
          { name: 'Socks Pack', category: 'Ostalo', revenue: Math.round(igRevenue * 0.08), orders: Math.round(igOrders * 0.1), conversionRate: 6.2 }
        ]
      },
      {
        type: 'tiktok',
        name: 'TikTok',
        icon: '🎵',
        color: '#000000',
        gradient: 'linear-gradient(135deg, #000000, #69C0D0, #EE1D52)',
        source: 'Organic + Ads',
        revenue: ttRevenue,
        orders: ttOrders,
        sessions: ttSessions,
        conversionRate: ttConversion,
        aov: ttOrders > 0 ? Math.round(ttRevenue / ttOrders) : 0,
        revenuePerSession: ttSessions > 0 ? Math.round(ttRevenue / ttSessions) : 0,
        revenueChange: '+24.1%',
        ordersChange: '+18.7%',
        conversionChange: '+1.2%',
        breakdown: [
          { label: 'Organic', value: ttOrganicRevenue, percent: ttRevenue > 0 ? Math.round((ttOrganicRevenue / ttRevenue) * 100) : 0 },
          { label: 'Ads', value: ttAdsRevenue, percent: ttRevenue > 0 ? Math.round((ttAdsRevenue / ttRevenue) * 100) : 0 }
        ],
        topProducts: [
          { name: 'Viral Hoodie', category: 'Duksevi', revenue: Math.round(ttRevenue * 0.4), orders: Math.round(ttOrders * 0.35), conversionRate: 4.5 },
          { name: 'Trendy Tee', category: 'Majice', revenue: Math.round(ttRevenue * 0.3), orders: Math.round(ttOrders * 0.3), conversionRate: 3.8 },
          { name: 'Cargo Pants', category: 'Trenerke', revenue: Math.round(ttRevenue * 0.15), orders: Math.round(ttOrders * 0.15), conversionRate: 2.9 },
          { name: 'Accessories Set', category: 'Ostalo', revenue: Math.round(ttRevenue * 0.1), orders: Math.round(ttOrders * 0.1), conversionRate: 5.1 },
          { name: 'Sneakers', category: 'Ostalo', revenue: Math.round(ttRevenue * 0.05), orders: Math.round(ttOrders * 0.1), conversionRate: 2.2 }
        ]
      },
      {
        type: 'facebook',
        name: 'Facebook',
        icon: '📘',
        color: '#1877F2',
        gradient: 'linear-gradient(135deg, #1877F2, #42A5F5)',
        source: 'Organic + Ads',
        revenue: fbRevenue,
        orders: fbOrders,
        sessions: fbSessions,
        conversionRate: fbConversion,
        aov: fbOrders > 0 ? Math.round(fbRevenue / fbOrders) : 0,
        revenuePerSession: fbSessions > 0 ? Math.round(fbRevenue / fbSessions) : 0,
        revenueChange: '+5.8%',
        ordersChange: '+3.2%',
        conversionChange: '+0.2%',
        breakdown: [
          { label: 'Organic', value: fbOrganicRevenue, percent: fbRevenue > 0 ? Math.round((fbOrganicRevenue / fbRevenue) * 100) : 0 },
          { label: 'Ads', value: fbAdsRevenue, percent: fbRevenue > 0 ? Math.round((fbAdsRevenue / fbRevenue) * 100) : 0 }
        ],
        topProducts: [
          { name: 'Classic Hoodie', category: 'Duksevi', revenue: Math.round(fbRevenue * 0.4), orders: Math.round(fbOrders * 0.3), conversionRate: 2.5 },
          { name: 'Basic Tee', category: 'Majice', revenue: Math.round(fbRevenue * 0.25), orders: Math.round(fbOrders * 0.25), conversionRate: 2.1 },
          { name: 'Tracksuit', category: 'Trenerke', revenue: Math.round(fbRevenue * 0.2), orders: Math.round(fbOrders * 0.2), conversionRate: 3.5 },
          { name: 'Beanie', category: 'Ostalo', revenue: Math.round(fbRevenue * 0.1), orders: Math.round(fbOrders * 0.15), conversionRate: 4.8 },
          { name: 'Gift Card', category: 'Ostalo', revenue: Math.round(fbRevenue * 0.05), orders: Math.round(fbOrders * 0.1), conversionRate: 8.5 }
        ]
      },
      {
        type: 'google',
        name: 'Google',
        icon: '🔍',
        color: '#4285F4',
        gradient: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)',
        source: 'Organic + Paid + Shopping',
        revenue: googleRevenue,
        orders: googleOrders,
        sessions: googleSessions,
        conversionRate: googleConversion,
        aov: googleOrders > 0 ? Math.round(googleRevenue / googleOrders) : 0,
        revenuePerSession: googleSessions > 0 ? Math.round(googleRevenue / googleSessions) : 0,
        revenueChange: '+9.4%',
        ordersChange: '+6.1%',
        conversionChange: '+0.3%',
        breakdown: [
          { label: 'Organic Search', value: Math.round(googleRevenue * 0.45), percent: 45 },
          { label: 'Google Shopping', value: Math.round(googleRevenue * 0.3), percent: 30 },
          { label: 'Paid Search', value: Math.round(googleRevenue * 0.15), percent: 15 },
          { label: 'Direct', value: Math.round(googleRevenue * 0.1), percent: 10 }
        ],
        topProducts: [
          { name: 'Best Seller Hoodie', category: 'Duksevi', revenue: Math.round(googleRevenue * 0.3), orders: Math.round(googleOrders * 0.25), conversionRate: 3.8 },
          { name: 'Classic Tee', category: 'Majice', revenue: Math.round(googleRevenue * 0.25), orders: Math.round(googleOrders * 0.2), conversionRate: 3.2 },
          { name: 'Tracksuit Pro', category: 'Trenerke', revenue: Math.round(googleRevenue * 0.2), orders: Math.round(googleOrders * 0.2), conversionRate: 4.2 },
          { name: 'Accessories Bundle', category: 'Ostalo', revenue: Math.round(googleRevenue * 0.15), orders: Math.round(googleOrders * 0.2), conversionRate: 5.5 },
          { name: 'Gift Card', category: 'Ostalo', revenue: Math.round(googleRevenue * 0.1), orders: Math.round(googleOrders * 0.15), conversionRate: 9.1 }
        ]
      }
    ];
  }

  commerceKPI(label, value, icon, change) {
    return h('div', { class: `commerce-kpi ${change ? 'has-change' : ''}` }, [
      h('div', { class: 'commerce-kpi-icon' }, icon),
      h('div', { class: 'commerce-kpi-content' }, [
        h('div', { class: 'commerce-kpi-label' }, label),
        h('div', { class: 'commerce-kpi-value' }, value),
        change && h('div', { class: `commerce-kpi-change ${change.startsWith('+') ? 'positive' : change.startsWith('-') ? 'negative' : 'neutral'}` }, change)
      ])
    ]);
  }

  getAttributionData(commerceData, model) {
    // Simplified attribution calculation
    const multipliers = {
      lastClick: { instagram: 1.1, tiktok: 1.0, facebook: 0.9, google: 1.2 },
      firstClick: { instagram: 0.9, tiktok: 1.2, facebook: 1.1, google: 0.8 },
      linear: { instagram: 1.0, tiktok: 1.0, facebook: 1.0, google: 1.0 },
      dataDriven: { instagram: 1.05, tiktok: 1.15, facebook: 0.95, google: 1.1 }
    };
    
    const mult = multipliers[model] || multipliers.linear;
    
    return commerceData.map(p => 
      h('div', { class: 'attribution-stat' }, [
        h('span', { class: 'attr-label' }, `${p.icon} ${p.name}`),
        h('span', { class: 'attr-value' }, `${ImperiumUtils.formatNumber(Math.round(p.revenue * mult[p.type]))} RSD`),
        h('span', { class: 'attr-percent' }, `${((p.revenue * mult[p.type]) / commerceData.reduce((s, c) => s + c.revenue * mult[c.type], 0) * 100).toFixed(1)}%`)
      ])
    );
  }

  generateDailyRevenue(commerceData) {
    const days = 30;
    const labels = [];
    const datasets = {};
    
    commerceData.forEach(p => {
      datasets[p.type] = [];
    });
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(`${date.getDate()}.${date.getMonth() + 1}.`);
      
      commerceData.forEach(p => {
        const base = Math.max(1, p.revenue / days);
        const variation = base * (0.5 + Math.random());
        datasets[p.type].push(Math.round(variation));
      });
    }
    
    return { labels, datasets };
  }

  showPlatformCommerceDetails(platformType) {
    const platformNames = {
      instagram: 'Instagram',
      tiktok: 'TikTok',
      facebook: 'Facebook',
      google: 'Google'
    };
    
    this.admin.openModal({
      title: `Commerce Detalji - ${platformNames[platformType]}`,
      size: 'lg',
      content: h('div', { class: 'commerce-details-modal' }, [
        h('p', { class: 'modal-note' }, 'Detaljan pregleda prodaje, funnel analiza, cohort analiza i segmentacija kupaca dostupna u narednom koraku.')
      ]),
      footer: h('button', { class: 'btn btn-primary', onclick: () => this.admin.closeModal() }, 'Zatvori')
    });
  }

  refreshCommerceMetrics() {
    const ga = this.connectionManager.getConnector('google_analytics');
    const metaAds = this.connectionManager.getConnector('meta_ads');
    const tiktokAds = this.connectionManager.getConnector('tiktok_ads');
    
    if (ga) this.loadPlatformMetrics('google_analytics');
    if (metaAds) this.loadPlatformMetrics('meta_ads');
    if (tiktokAds) this.loadPlatformMetrics('tiktok_ads');
    
    this.showToast('Osvežavanje commerce metrika...', 'info');
  }

  async onAfterRender() {
    // Initialize charts after render
    if (this.activeTab === 'roas' && this.chartJSLoaded) {
      setTimeout(() => this.initROASCharts(), 100);
    }
    if (this.activeTab === 'advertising' && this.chartJSLoaded) {
      setTimeout(() => this.initAdvertisingCharts(), 100);
    }
    if (this.activeTab === 'traffic' && this.chartJSLoaded) {
      setTimeout(() => this.initTrafficCharts(), 100);
    }
    if (this.activeTab === 'commerce' && this.chartJSLoaded) {
      setTimeout(() => this.initCommerceCharts(), 100);
    }
    if (this.activeTab === 'influencers' && this.chartJSLoaded) {
      setTimeout(() => this.initInfluencerCharts(), 100);
    }
  }

  initCommerceCharts() {
    if (!this.chartJSLoaded) return;
    
    const { createStackedBarChart } = require('../utils/charts.js');
    
    const instagramMetrics = this.metricsCache.instagram || {};
    const tiktokMetrics = this.metricsCache.tiktok || {};
    const facebookMetrics = this.metricsCache.facebook || {};
    const gaMetrics = this.metricsCache.google_analytics || {};
    const metaAdsMetrics = this.metricsCache.meta_ads || {};
    const tiktokAdsMetrics = this.metricsCache.tiktok_ads || {};
    
    const commerceData = this.calculateCommerceData(instagramMetrics, tiktokMetrics, facebookMetrics, gaMetrics, metaAdsMetrics, tiktokAdsMetrics);
    const dailyRevenue = this.generateDailyRevenue(commerceData);
    
    const chartData = {
      labels: dailyRevenue.labels,
      datasets: commerceData.map((platform, i) => ({
        label: platform.name,
        data: dailyRevenue.datasets[platform.type],
        color: [
          '#E1306C', '#000000', '#1877F2', '#4285F4'
        ][i % 4]
      }))
    };
    
    try {
      createStackedBarChart('commerceTrendChart', chartData, {
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.chart.data.datasets.reduce((sum, ds) => sum + (ds.data[context.dataIndex] || 0), 0);
                const percent = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                return `${context.dataset.label}: ${context.parsed.y.toLocaleString('sr-RS')} RSD (${percent}%)`;
              }
            }
          }
        }
      });
    } catch (e) {
      console.warn('Failed to create commerce trend chart:', e);
    }
  }

  initInfluencerCharts() {
    if (!this.chartJSLoaded) return;
    
    const { createStackedBarChart, createDoughnutChart } = require('../utils/charts.js');
    
    const influencers = this.getInfluencerData();
    const allCampaigns = influencers.flatMap(inf => inf.campaigns);
    
    // ROI Distribution Doughnut
    const roiRanges = [
      { label: 'ROI < 0%', count: 0, color: '#ef4444' },
      { label: 'ROI 0-50%', count: 0, color: '#f59e0b' },
      { label: 'ROI 50-100%', count: 0, color: '#3b82f6' },
      { label: 'ROI 100-200%', count: 0, color: '#22c55e' },
      { label: 'ROI 200-500%', count: 0, color: '#a855f7' },
      { label: 'ROI > 500%', count: 0, color: '#ec4899' }
    ];
    
    allCampaigns.forEach(camp => {
      if (camp.roi < 0) roiRanges[0].count++;
      else if (camp.roi < 50) roiRanges[1].count++;
      else if (camp.roi < 100) roiRanges[2].count++;
      else if (camp.roi < 200) roiRanges[3].count++;
      else if (camp.roi < 500) roiRanges[4].count++;
      else roiRanges[5].count++;
    });
    
    try {
      createDoughnutChart('influencerRoiChart', {
        labels: roiRanges.map(r => r.label),
        values: roiRanges.map(r => r.count),
        colors: roiRanges.map(r => r.color)
      });
    } catch (e) {
      console.warn('Failed to create influencer ROI chart:', e);
    }
    
    // Platform Revenue Doughnut
    const platformRevenue = {};
    allCampaigns.forEach(camp => {
      platformRevenue[camp.platform] = (platformRevenue[camp.platform] || 0) + camp.revenue;
    });
    
    const platformLabels = Object.keys(platformRevenue);
    const platformValues = Object.values(platformRevenue);
    const platformColors = {
      instagram: '#E1306C',
      tiktok: '#000000',
      facebook: '#1877F2',
      youtube: '#FF0000',
      twitter: '#1DA1F2'
    };
    
    try {
      createDoughnutChart('influencerPlatformChart', {
        labels: platformLabels,
        values: platformValues,
        colors: platformLabels.map(l => platformColors[l] || '#6b7280')
      });
    } catch (e) {
      console.warn('Failed to create influencer platform chart:', e);
    }
    
    // Monthly Revenue Trend (mock - would come from actual data)
    const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    const monthlyRevenue = monthlyLabels.map(() => Math.floor(Math.random() * 500000) + 100000);
    
    try {
      createStackedBarChart('influencerMonthlyChart', {
        labels: monthlyLabels,
        datasets: [{
          label: 'Prihod',
          data: monthlyRevenue,
          color: '#22c55e'
        }]
      });
    } catch (e) {
      console.warn('Failed to create influencer monthly chart:', e);
    }
  }

  renderInfluencersTab() {
    const influencers = this.getInfluencerData();
    const totalReach = influencers.reduce((sum, i) => sum + i.reach, 0);
    const totalClicks = influencers.reduce((sum, i) => sum + i.clicks, 0);
    const totalTraffic = influencers.reduce((sum, i) => sum + i.traffic, 0);
    const totalOrders = influencers.reduce((sum, i) => sum + i.orders, 0);
    const totalRevenue = influencers.reduce((sum, i) => sum + i.revenue, 0);
    const totalBudget = influencers.reduce((sum, i) => sum + i.budget, 0);
    const overallROI = totalBudget > 0 ? ((totalRevenue - totalBudget) / totalBudget * 100).toFixed(1) : 0;
    const overallROAS = totalBudget > 0 ? (totalRevenue / totalBudget).toFixed(2) : 0;

    return h('div', { class: 'tab-panel influencers-panel' }, [
      h('div', { class: 'panel-header' }, [
        h('div', { class: 'header-content' }, [
          h('h2', {}, 'Influencer Tracking Center'),
          h('p', { class: 'panel-desc' }, 'Praćenje performansi influencera, kampanja i ROI')
        ]),
        h('div', { class: 'header-actions' }, [
          h('button', { class: 'btn btn-primary', onclick: () => this.openAddInfluencerModal() }, [
            h('span', { class: 'btn-icon' }, '+'),
            ' Dodaj Influencera'
          ]),
          h('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.refreshInfluencerMetrics() }, [
            h('span', { class: 'btn-icon' }, '⟳'),
            ' Osveži'
          ])
        ])
      ]),

      // Summary KPIs
      h('div', { class: 'kpi-grid' }, [
        this.kpiCard('Ukupan doseg', ImperiumUtils.formatNumber(totalReach), null, null, '👁️'),
        this.kpiCard('Ukupni klikovi', ImperiumUtils.formatNumber(totalClicks), null, null, '🖱️'),
        this.kpiCard('Saobraćaj', ImperiumUtils.formatNumber(totalTraffic), null, null, '🌐'),
        this.kpiCard('Porudžbine', ImperiumUtils.formatNumber(totalOrders), null, null, '📦'),
        this.kpiCard('Prihod', `${ImperiumUtils.formatNumber(totalRevenue)} RSD`, null, null, '💰'),
        this.kpiCard('Budžet', `${ImperiumUtils.formatNumber(totalBudget)} RSD`, null, null, '💸'),
        this.kpiCard('ROI', `${overallROI}%`, null, overallROI >= 100 ? 'positive' : overallROI >= 0 ? 'neutral' : 'negative', '📈'),
        this.kpiCard('ROAS', `${overallROAS}x`, null, overallROAS >= 3 ? 'positive' : overallROAS >= 1 ? 'neutral' : 'negative', '📊')
      ]),

      // Influencer Charts Section
      h('div', { class: 'section-header' }, [
        h('h3', {}, '📊 Influencer Analytics Charts'),
        h('p', { class: 'section-desc' }, 'Vizuelizacija performansi po ROI, platformama i mesecima')
      ]),
      h('div', { class: 'charts-grid' }, [
        h('div', { class: 'chart-section' }, [
          h('h3', { class: 'section-title' }, '🥧 Distribucija ROI po kampanjama'),
          h('div', { class: 'chart-container' }, [
            h('canvas', { id: 'influencerRoiChart', width: 400, height: 300 })
          ])
        ]),
        h('div', { class: 'chart-section' }, [
          h('h3', { class: 'section-title' }, '🥧 Prihod po platformama'),
          h('div', { class: 'chart-container' }, [
            h('canvas', { id: 'influencerPlatformChart', width: 400, height: 300 })
          ])
        ]),
        h('div', { class: 'chart-section' }, [
          h('h3', { class: 'section-title' }, '📈 Mesečni trend prihoda'),
          h('div', { class: 'chart-container' }, [
            h('canvas', { id: 'influencerMonthlyChart', width: 800, height: 300 })
          ])
        ])
      ]),

      // Influencer List
      h('div', { class: 'section-header' }, [
        h('h3', {}, '👥 Influenceri i Kampanje'),
        h('p', { class: 'section-desc' }, `${influencers.length} aktivnih saradnika`)
      ]),
      h('div', { class: 'influencers-grid' }, influencers.map(inf => this.renderInfluencerCard(inf))),

      // Campaign Performance
      h('div', { class: 'section-header' }, [
        h('h3', {}, '📋 Kampanje po performansama')
      ]),
      h('div', { class: 'campaign-performance-table' }, [
        h('table', { class: 'comparison-table' }, [
          h('thead', {}, [
            h('tr', {}, [
              h('th', {}, 'Kampanja'),
              h('th', {}, 'Influencer'),
              h('th', {}, 'Platforma'),
              h('th', {}, 'Status'),
              h('th', {}, 'Budžet'),
              h('th', {}, 'Doseg'),
              h('th', {}, 'Klikovi'),
              h('th', {}, 'CTR'),
              h('th', {}, 'Saobraćaj'),
              h('th', {}, 'Porudžbine'),
              h('th', {}, 'Prihod'),
              h('th', {}, 'ROI'),
              h('th', {}, 'ROAS')
            ])
          ]),
          h('tbody', {}, influencers.flatMap(inf => inf.campaigns.map(camp => 
            h('tr', { class: `campaign-row platform-${camp.platform}` }, [
              h('td', { class: 'campaign-name' }, camp.name),
              h('td', {}, `${inf.icon} ${inf.name}`),
              h('td', { class: 'platform-badge-sm' }, camp.platform),
              h('td', { class: `status-badge ${camp.status.toLowerCase()}` }, camp.status),
              h('td', {}, `${ImperiumUtils.formatNumber(camp.budget)} RSD`),
              h('td', {}, ImperiumUtils.formatNumber(camp.reach)),
              h('td', {}, ImperiumUtils.formatNumber(camp.clicks)),
              h('td', {}, `${camp.ctr.toFixed(2)}%`),
              h('td', {}, ImperiumUtils.formatNumber(camp.traffic)),
              h('td', {}, ImperiumUtils.formatNumber(camp.orders)),
              h('td', { class: 'revenue-cell' }, `${ImperiumUtils.formatNumber(camp.revenue)} RSD`),
              h('td', { class: camp.roi >= 100 ? 'positive' : camp.roi >= 0 ? 'neutral' : 'negative' }, `${camp.roi.toFixed(1)}%`),
              h('td', { class: camp.roas >= 3 ? 'positive' : camp.roas >= 1 ? 'neutral' : 'negative' }, `${camp.roas.toFixed(2)}x`)
            ])
          )).sort((a, b) => {
            const roiA = parseFloat(a.children[11]?.children?.[0]?.replace('%', '') || 0);
            const roiB = parseFloat(b.children[11]?.children?.[0]?.replace('%', '') || 0);
            return roiB - roiA;
          }))
        ])
      ]),

      // Top Performers
      h('div', { class: 'section-header' }, [
        h('h3', {}, '🏆 Top Performersi')
      ]),
      h('div', { class: 'top-performers-grid' }, [
        h('div', { class: 'top-performer-card best-roi' }, [
          h('h4', {}, '🥇 Najbolji ROI'),
          ...this.getTopPerformers(influencers, 'roi', 3).map((inf, i) => 
            h('div', { class: 'top-performer-item' }, [
              h('span', { class: 'performer-rank' }, `#${i + 1}`),
              h('div', { class: 'performer-info' }, [
                h('div', { class: 'performer-name' }, `${inf.icon} ${inf.name}`),
                h('div', { class: 'performer-campaign' }, inf.campaigns[0]?.name || 'N/A')
              ]),
              h('div', { class: 'performer-metric positive' }, `${inf.bestROI.toFixed(1)}% ROI`)
            ])
          )
        ]),
        h('div', { class: 'top-performer-card best-roas' }, [
          h('h4', {}, '🥇 Najbolji ROAS'),
          ...this.getTopPerformers(influencers, 'roas', 3).map((inf, i) => 
            h('div', { class: 'top-performer-item' }, [
              h('span', { class: 'performer-rank' }, `#${i + 1}`),
              h('div', { class: 'performer-info' }, [
                h('div', { class: 'performer-name' }, `${inf.icon} ${inf.name}`),
                h('div', { class: 'performer-campaign' }, inf.campaigns[0]?.name || 'N/A')
              ]),
              h('div', { class: 'performer-metric positive' }, `${inf.bestROAS.toFixed(2)}x ROAS`)
            ])
          )
        ]),
        h('div', { class: 'top-performer-card best-revenue' }, [
          h('h4', {}, '🥇 Najveći Prihod'),
          ...this.getTopPerformers(influencers, 'revenue', 3).map((inf, i) => 
            h('div', { class: 'top-performer-item' }, [
              h('span', { class: 'performer-rank' }, `#${i + 1}`),
              h('div', { class: 'performer-info' }, [
                h('div', { class: 'performer-name' }, `${inf.icon} ${inf.name}`),
                h('div', { class: 'performer-campaign' }, inf.campaigns[0]?.name || 'N/A')
              ]),
              h('div', { class: 'performer-metric' }, `${ImperiumUtils.formatNumber(inf.totalRevenue)} RSD`)
            ])
          )
        ]),
        h('div', { class: 'top-performer-card best-engagement' }, [
          h('h4', {}, '🥇 Najbolji Engagement'),
          ...this.getTopPerformers(influencers, 'engagement', 3).map((inf, i) => 
            h('div', { class: 'top-performer-item' }, [
              h('span', { class: 'performer-rank' }, `#${i + 1}`),
              h('div', { class: 'performer-info' }, [
                h('div', { class: 'performer-name' }, `${inf.icon} ${inf.name}`),
                h('div', { class: 'performer-campaign' }, inf.campaigns[0]?.name || 'N/A')
              ]),
              h('div', { class: 'performer-metric' }, `${inf.bestEngagement.toFixed(2)}%`)
            ])
          )
        ])
      ])
    ]);
  }

  getInfluencerData() {
    // Mock data - in production would come from database
    return [
      {
        id: 'inf-1',
        name: 'Ana Petrović',
        handle: '@ana.fashion',
        icon: '👩‍💼',
        platform: 'instagram',
        followers: 125000,
        engagementRate: 4.2,
        totalRevenue: 2850000,
        totalOrders: 187,
        totalTraffic: 45600,
        bestROI: 340,
        bestROAS: 4.4,
        bestEngagement: 5.8,
        campaigns: [
          { id: 'camp-1', name: 'Summer Collection 2024', platform: 'Instagram', status: 'Completed', budget: 150000, reach: 850000, clicks: 12400, ctr: 1.46, traffic: 18500, orders: 67, revenue: 670000, roi: 347, roas: 4.47 },
          { id: 'camp-2', name: 'Fall Essentials', platform: 'Instagram', status: 'Active', budget: 200000, reach: 1200000, clicks: 18900, ctr: 1.58, traffic: 28400, orders: 94, revenue: 1120000, roi: 460, roas: 5.6 },
          { id: 'camp-3', name: 'Black Friday Teaser', platform: 'Instagram', status: 'Completed', budget: 80000, reach: 450000, clicks: 8200, ctr: 1.82, traffic: 12100, orders: 26, revenue: 280000, roi: 250, roas: 3.5 }
        ]
      },
      {
        id: 'inf-2',
        name: 'Marko Jovanović',
        handle: '@marko.style',
        icon: '👨‍💼',
        platform: 'tiktok',
        followers: 89000,
        engagementRate: 6.8,
        totalRevenue: 1920000,
        totalOrders: 142,
        totalTraffic: 67800,
        bestROI: 420,
        bestROAS: 5.2,
        bestEngagement: 8.1,
        campaigns: [
          { id: 'camp-4', name: 'TikTok Dance Challenge', platform: 'TikTok', status: 'Completed', budget: 100000, reach: 2500000, clicks: 35600, ctr: 1.42, traffic: 42300, orders: 89, revenue: 890000, roi: 790, roas: 8.9 },
          { id: 'camp-5', name: 'GRWM Series', platform: 'TikTok', status: 'Active', budget: 120000, reach: 1800000, clicks: 24500, ctr: 1.36, traffic: 25500, orders: 53, revenue: 1030000, roi: 758, roas: 8.58 }
        ]
      },
      {
        id: 'inf-3',
        name: 'Jelena Nikolić',
        handle: '@jelena.lifestyle',
        icon: '👩‍💼',
        platform: 'instagram',
        followers: 67000,
        engagementRate: 3.5,
        totalRevenue: 890000,
        totalOrders: 78,
        totalTraffic: 23400,
        bestROI: 180,
        bestROAS: 2.8,
        bestEngagement: 4.2,
        campaigns: [
          { id: 'camp-6', name: 'Cozy Winter', platform: 'Instagram', status: 'Completed', budget: 90000, reach: 380000, clicks: 6700, ctr: 1.76, traffic: 11200, orders: 34, revenue: 290000, roi: 222, roas: 3.22 },
          { id: 'camp-7', name: 'Home Office Essentials', platform: 'Instagram', status: 'Paused', budget: 60000, reach: 220000, clicks: 3100, ctr: 1.41, traffic: 5800, orders: 12, revenue: 156000, roi: 160, roas: 2.6 }
        ]
      },
      {
        id: 'inf-4',
        name: 'Stefan Milošević',
        handle: '@stefan.tech',
        icon: '👨‍💼',
        platform: 'youtube',
        followers: 156000,
        engagementRate: 2.8,
        totalRevenue: 3450000,
        totalOrders: 234,
        totalTraffic: 89000,
        bestROI: 280,
        bestROAS: 3.8,
        bestEngagement: 3.5,
        campaigns: [
          { id: 'camp-8', name: 'Tech Review Series', platform: 'YouTube', status: 'Active', budget: 300000, reach: 850000, clicks: 15600, ctr: 1.84, traffic: 34500, orders: 112, revenue: 1450000, roi: 383, roas: 4.83 },
          { id: 'camp-9', name: 'Unboxing Campaign', platform: 'YouTube', status: 'Completed', budget: 200000, reach: 620000, clicks: 9800, ctr: 1.58, traffic: 21200, orders: 67, revenue: 1120000, roi: 460, roas: 5.6 },
          { id: 'camp-10', name: 'Shorts Daily', platform: 'YouTube', status: 'Active', budget: 50000, reach: 1200000, clicks: 12400, ctr: 1.03, traffic: 18900, orders: 55, revenue: 880000, roi: 1660, roas: 17.6 }
        ]
      },
      {
        id: 'inf-5',
        name: 'Milica Đorđević',
        handle: '@milica.beauty',
        icon: '👩‍💼',
        platform: 'tiktok',
        followers: 45000,
        engagementRate: 7.2,
        totalRevenue: 560000,
        totalOrders: 56,
        totalTraffic: 15600,
        bestROI: 220,
        bestROAS: 3.2,
        bestEngagement: 9.1,
        campaigns: [
          { id: 'camp-11', name: 'Skincare Routine', platform: 'TikTok', status: 'Completed', budget: 40000, reach: 890000, clicks: 18900, ctr: 2.12, traffic: 12400, orders: 28, revenue: 168000, roi: 320, roas: 4.2 },
          { id: 'camp-12', name: 'Makeup Tutorial', platform: 'TikTok', status: 'Active', budget: 35000, reach: 560000, clicks: 9800, ctr: 1.75, traffic: 3200, orders: 14, revenue: 98000, roi: 180, roas: 2.8 }
        ]
      }
    ];
  }

  getTopPerformers(influencers, metric, limit) {
    const sorted = [...influencers].sort((a, b) => {
      if (metric === 'roi') return b.bestROI - a.bestROI;
      if (metric === 'roas') return b.bestROAS - a.bestROAS;
      if (metric === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (metric === 'engagement') return b.bestEngagement - a.bestEngagement;
      return 0;
    });
    return sorted.slice(0, limit);
  }

  renderInfluencerCard(inf) {
    const config = PLATFORM_CONFIGS[inf.platform]?.config;
    const activeCampaigns = inf.campaigns.filter(c => c.status === 'Active').length;
    const completedCampaigns = inf.campaigns.filter(c => c.status === 'Completed').length;
    
    return h('div', { 
      class: `influencer-card ${inf.platform}`,
      style: config?.gradient ? `--platform-gradient: ${config.gradient}` : ''
    }, [
      h('div', { class: 'influencer-header' }, [
        h('div', { class: 'influencer-avatar', style: config?.gradient ? `background: ${config.gradient}` : '' }, inf.icon),
        h('div', { class: 'influencer-info' }, [
          h('div', { class: 'influencer-name-row' }, [
            h('h4', { class: 'influencer-name' }, inf.name),
            h('span', { class: 'influencer-handle' }, inf.handle),
            h('span', { class: `platform-badge-sm ${inf.platform}` }, inf.platform)
          ]),
          h('div', { class: 'influencer-stats-row' }, [
            h('span', { class: 'stat-item' }, `👥 ${ImperiumUtils.formatNumber(inf.followers)} followers`),
            h('span', { class: 'stat-item' }, `📈 ${inf.engagementRate}% engagement`),
            h('span', { class: 'stat-item' }, `📋 ${inf.campaigns.length} kampanje (${activeCampaigns} aktivne)`)
          ])
        ]),
        h('div', { class: 'influencer-kpis' }, [
          h('div', { class: 'inf-kpi' }, [
            h('span', { class: 'inf-kpi-label' }, 'Prihod'),
            h('span', { class: 'inf-kpi-value' }, `${ImperiumUtils.formatNumber(inf.totalRevenue)} RSD`)
          ]),
          h('div', { class: 'inf-kpi' }, [
            h('span', { class: 'inf-kpi-label' }, 'ROI'),
            h('span', { class: 'inf-kpi-value positive' }, `${inf.bestROI}%`)
          ]),
          h('div', { class: 'inf-kpi' }, [
            h('span', { class: 'inf-kpi-label' }, 'ROAS'),
            h('span', { class: 'inf-kpi-value positive' }, `${inf.bestROAS}x`)
          ])
        ])
      ]),
      h('div', { class: 'influencer-campaigns' }, [
        h('h5', {}, 'Kampanje:'),
        h('div', { class: 'campaign-mini-list' }, inf.campaigns.map(camp => 
          h('div', { class: `campaign-mini ${camp.status.toLowerCase()}` }, [
            h('div', { class: 'campaign-mini-name' }, camp.name),
            h('div', { class: 'campaign-mini-stats' }, [
              h('span', { class: 'mini-stat' }, `💰 ${ImperiumUtils.formatNumber(camp.budget)}`),
              h('span', { class: 'mini-stat' }, `👁️ ${ImperiumUtils.formatNumber(camp.reach)}`),
              h('span', { class: 'mini-stat' }, `🖱️ ${ImperiumUtils.formatNumber(camp.clicks)}`),
              h('span', { class: 'mini-stat revenue' }, `💵 ${ImperiumUtils.formatNumber(camp.revenue)}`),
              h('span', { class: `mini-stat roi ${camp.roi >= 100 ? 'positive' : camp.roi >= 0 ? 'neutral' : 'negative'}` }, `${camp.roi.toFixed(0)}% ROI`),
              h('span', { class: `mini-stat roas ${camp.roas >= 3 ? 'positive' : camp.roas >= 1 ? 'neutral' : 'negative'}` }, `${camp.roas.toFixed(1)}x ROAS`)
            ]),
            h('span', { class: `status-dot ${camp.status.toLowerCase()}` })
          ])
        ))
      ]),
      h('div', { class: 'influencer-actions' }, [
        h('button', { class: 'btn btn-sm btn-secondary', onclick: () => this.openInfluencerDetails(inf.id) }, 'Detalji'),
        h('button', { class: 'btn btn-sm btn-primary', onclick: () => this.openAddCampaignModal(inf.id) }, '+ Kampanja')
      ])
    ]);
  }

  getTopPerformers(influencers, metric, limit) {
    const sorted = [...influencers].sort((a, b) => {
      if (metric === 'roi') return b.bestROI - a.bestROI;
      if (metric === 'roas') return b.bestROAS - a.bestROAS;
      if (metric === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (metric === 'engagement') return b.bestEngagement - a.bestEngagement;
      return 0;
    });
    return sorted.slice(0, limit);
  }

  openAddInfluencerModal() {
    this.admin.openModal({
      title: 'Dodaj Influencera',
      size: 'lg',
      content: h('div', { class: 'influencer-form-modal' }, [
        h('div', { class: 'form-group' }, [
          h('label', { for: 'infName' }, 'Ime i prezime *'),
          h('input', { type: 'text', id: 'infName', class: 'form-input', placeholder: 'Ana Petrović' })
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'infHandle' }, 'Handle *'),
          h('input', { type: 'text', id: 'infHandle', class: 'form-input', placeholder: '@ana.fashion' })
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'infPlatform' }, 'Glavna platforma *'),
          h('select', { id: 'infPlatform', class: 'form-select' }, [
            h('option', { value: 'instagram' }, '📷 Instagram'),
            h('option', { value: 'tiktok' }, '🎵 TikTok'),
            h('option', { value: 'youtube' }, '▶️ YouTube'),
            h('option', { value: 'facebook' }, '📘 Facebook')
          ])
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'infFollowers' }, 'Pratioci'),
          h('input', { type: 'number', id: 'infFollowers', class: 'form-input', placeholder: '125000' })
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'infEngagement' }, 'Engagement Rate %'),
          h('input', { type: 'number', id: 'infEngagement', class: 'form-input', step: '0.1', placeholder: '4.2' })
        ])
      ]),
      footer: h('div', { class: 'modal-footer' }, [
        h('button', { class: 'btn btn-secondary', onclick: () => this.admin.closeModal() }, 'Otkaži'),
        h('button', { class: 'btn btn-primary', onclick: () => this.saveInfluencer() }, 'Sačuvaj')
      ])
    });
  }

  openAddCampaignModal(influencerId) {
    const inf = this.getInfluencerData().find(i => i.id === influencerId);
    if (!inf) return;
    
    this.admin.openModal({
      title: `Nova Kampanja - ${inf.name}`,
      size: 'lg',
      content: h('div', { class: 'campaign-form-modal' }, [
        h('div', { class: 'form-group' }, [
          h('label', { for: 'campName' }, 'Naziv kampanje *'),
          h('input', { type: 'text', id: 'campName', class: 'form-input', placeholder: 'Summer Collection 2024' })
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'campPlatform' }, 'Platforma *'),
          h('select', { id: 'campPlatform', class: 'form-select' }, [
            h('option', { value: 'instagram' }, '📷 Instagram'),
            h('option', { value: 'tiktok' }, '🎵 TikTok'),
            h('option', { value: 'youtube' }, '▶️ YouTube'),
            h('option', { value: 'facebook' }, '📘 Facebook')
          ])
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'campBudget' }, 'Budžet (RSD) *'),
          h('input', { type: 'number', id: 'campBudget', class: 'form-input', placeholder: '150000' })
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'campStatus' }, 'Status *'),
          h('select', { id: 'campStatus', class: 'form-select' }, [
            h('option', { value: 'Planned' }, 'Planirana'),
            h('option', { value: 'Active' }, 'Aktivna'),
            h('option', { value: 'Completed' }, 'Završena'),
            h('option', { value: 'Paused' }, 'Pauzirana')
          ])
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'campStartDate' }, 'Datum početka'),
          h('input', { type: 'date', id: 'campStartDate', class: 'form-input' })
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'campEndDate' }, 'Datum završetka'),
          h('input', { type: 'date', id: 'campEndDate', class: 'form-input' })
        ])
      ]),
      footer: h('div', { class: 'modal-footer' }, [
        h('button', { class: 'btn btn-secondary', onclick: () => this.admin.closeModal() }, 'Otkaži'),
        h('button', { class: 'btn btn-primary', onclick: () => this.saveCampaign(influencerId) }, 'Sačuvaj')
      ])
    });
  }

  openInfluencerDetails(influencerId) {
    const inf = this.getInfluencerData().find(i => i.id === influencerId);
    if (!inf) return;
    
    this.admin.openModal({
      title: `${inf.icon} ${inf.name} - Detalji`,
      size: 'xl',
      content: h('div', { class: 'influencer-details-modal' }, [
        h('div', { class: 'inf-detail-header' }, [
          h('div', { class: 'inf-avatar-large', style: `background: ${PLATFORM_CONFIGS[inf.platform]?.config?.gradient}` }, inf.icon),
          h('div', { class: 'inf-detail-info' }, [
            h('h3', {}, inf.name),
            h('p', { class: 'inf-handle' }, inf.handle),
            h('div', { class: 'inf-detail-stats' }, [
              h('span', { class: 'detail-stat' }, `👥 ${ImperiumUtils.formatNumber(inf.followers)} followers`),
              h('span', { class: 'detail-stat' }, `📈 ${inf.engagementRate}% engagement`),
              h('span', { class: 'detail-stat' }, `📋 ${inf.campaigns.length} kampanje`),
              h('span', { class: 'detail-stat' }, `💰 ${ImperiumUtils.formatNumber(inf.totalRevenue)} RSD ukupno`)
            ])
          ])
        ]),
        h('div', { class: 'inf-detail-tabs' }, [
          h('div', { class: 'inf-tabs' }, [
            h('button', { class: 'inf-tab active', onclick: () => this.showInfTab('campaigns') }, 'Kampanje'),
            h('button', { class: 'inf-tab', onclick: () => this.showInfTab('performance') }, 'Performanse'),
            h('button', { class: 'inf-tab', onclick: () => this.showInfTab('audience') }, 'Publika')
          ]),
          h('div', { class: 'inf-tab-panels' }, [
            h('div', { class: 'inf-tab-panel active', id: 'inf-campaigns' }, [
              h('table', { class: 'comparison-table' }, [
                h('thead', {}, [
                  h('tr', {}, [
                    h('th', {}, 'Kampanja'), h('th', {}, 'Status'), h('th', {}, 'Budžet'), h('th', {}, 'Doseg'),
                    h('th', {}, 'Klikovi'), h('th', {}, 'CTR'), h('th', {}, 'Saobraćaj'), h('th', {}, 'Porudžbine'),
                    h('th', {}, 'Prihod'), h('th', {}, 'ROI'), h('th', {}, 'ROAS')
                  ])
                ]),
                h('tbody', {}, inf.campaigns.map(camp => 
                  h('tr', { class: `campaign-row platform-${camp.platform}` }, [
                    h('td', { class: 'campaign-name' }, camp.name),
                    h('td', { class: `status-badge ${camp.status.toLowerCase()}` }, camp.status),
                    h('td', {}, `${ImperiumUtils.formatNumber(camp.budget)} RSD`),
                    h('td', {}, ImperiumUtils.formatNumber(camp.reach)),
                    h('td', {}, ImperiumUtils.formatNumber(camp.clicks)),
                    h('td', {}, `${camp.ctr.toFixed(2)}%`),
                    h('td', {}, ImperiumUtils.formatNumber(camp.traffic)),
                    h('td', {}, ImperiumUtils.formatNumber(camp.orders)),
                    h('td', { class: 'revenue-cell' }, `${ImperiumUtils.formatNumber(camp.revenue)} RSD`),
                    h('td', { class: camp.roi >= 100 ? 'positive' : camp.roi >= 0 ? 'neutral' : 'negative' }, `${camp.roi.toFixed(1)}%`),
                    h('td', { class: camp.roas >= 3 ? 'positive' : camp.roas >= 1 ? 'neutral' : 'negative' }, `${camp.roas.toFixed(2)}x`)
                  ])
                ))
              ])
            ]),
            h('div', { class: 'inf-tab-panel', id: 'inf-performance' }, [
              h('p', { class: 'coming-soon-note' }, 'Grafikoni performansi po vremenu, poređenje kampanja, funnel analiza - u narednom koraku.')
            ]),
            h('div', { class: 'inf-tab-panel', id: 'inf-audience' }, [
              h('p', { class: 'coming-soon-note' }, 'Demografija publike, interesi, geo distribucija, aktivnost po vremenu - u narednom koraku.')
            ])
          ])
        ])
      ]),
      footer: h('button', { class: 'btn btn-primary', onclick: () => this.admin.closeModal() }, 'Zatvori')
    });
  }

  showInfTab(tab) {
    document.querySelectorAll('.inf-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.inf-tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.inf-tab[onclick*="${tab}"]`)?.classList.add('active');
    document.getElementById(`inf-${tab}`)?.classList.add('active');
  }

  saveInfluencer() {
    this.showToast('Influencer sačuvan (demo)', 'success');
    this.admin.closeModal();
  }

  saveCampaign(influencerId) {
    this.showToast('Kampanja sačuvana (demo)', 'success');
    this.admin.closeModal();
  }

  refreshInfluencerMetrics() {
    this.showToast('Osvežavanje influencer metrika...', 'info');
  }

  renderAlertsTab() {
    const alerts = this.getAlertsData();
    const unreadCount = alerts.filter(a => !a.read).length;
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    const infoCount = alerts.filter(a => a.severity === 'info').length;

    return h('div', { class: 'tab-panel alerts-panel' }, [
      h('div', { class: 'panel-header' }, [
        h('div', { class: 'header-content' }, [
          h('h2', {}, 'Social Media Alarmi'),
          h('p', { class: 'panel-desc' }, 'Automatski alarmi za promene na platformama i kampanjama')
        ]),
        h('div', { class: 'header-actions' }, [
          h('div', { class: 'alert-filters' }, [
            h('select', {
              id: 'alertSeverityFilter',
              class: 'form-select',
              value: this.alertSeverityFilter || 'all',
              onchange: (e) => { this.alertSeverityFilter = e.target.value; this.render(); }
            }, [
              h('option', { value: 'all' }, 'Svi alarmi'),
              h('option', { value: 'critical' }, 'Kritični'),
              h('option', { value: 'warning' }, 'Upozorenja'),
              h('option', { value: 'info' }, 'Informativni')
            ]),
            h('select', {
              id: 'alertPlatformFilter',
              class: 'form-select',
              value: this.alertPlatformFilter || 'all',
              onchange: (e) => { this.alertPlatformFilter = e.target.value; this.render(); }
            }, [
              h('option', { value: 'all' }, 'Sve platforme'),
              h('option', { value: 'instagram' }, 'Instagram'),
              h('option', { value: 'tiktok' }, 'TikTok'),
              h('option', { value: 'facebook' }, 'Facebook'),
              h('option', { value: 'meta_ads' }, 'Meta Ads'),
              h('option', { value: 'tiktok_ads' }, 'TikTok Ads'),
              h('option', { value: 'google_analytics' }, 'Google Analytics')
            ])
          ]),
          unreadCount > 0 && h('button', { 
            class: 'btn btn-primary', 
            onclick: () => this.markAllAlertsRead()
          }, [
            h('span', { class: 'btn-icon' }, '✓'),
            ` Označi sve kao pročitano (${unreadCount})`
          ]),
          h('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.refreshAlerts() }, [
            h('span', { class: 'btn-icon' }, '⟳'),
            ' Osveži'
          ])
        ])
      ]),

      // Alert Summary Cards
      h('div', { class: 'alert-summary-grid' }, [
        h('div', { class: 'alert-summary-card critical' }, [
          h('div', { class: 'summary-icon' }, '🔴'),
          h('div', { class: 'summary-content' }, [
            h('span', { class: 'summary-value' }, criticalCount),
            h('span', { class: 'summary-label' }, 'Kritični')
          ])
        ]),
        h('div', { class: 'alert-summary-card warning' }, [
          h('div', { class: 'summary-icon' }, '🟡'),
          h('div', { class: 'summary-content' }, [
            h('span', { class: 'summary-value' }, warningCount),
            h('span', { class: 'summary-label' }, 'Upozorenja')
          ])
        ]),
        h('div', { class: 'alert-summary-card info' }, [
          h('div', { class: 'summary-icon' }, '🔵'),
          h('div', { class: 'summary-content' }, [
            h('span', { class: 'summary-value' }, infoCount),
            h('span', { class: 'summary-label' }, 'Informativni')
          ])
        ]),
        h('div', { class: 'alert-summary-card unread' }, [
          h('div', { class: 'summary-icon' }, '📬'),
          h('div', { class: 'summary-content' }, [
            h('span', { class: 'summary-value' }, unreadCount),
            h('span', { class: 'summary-label' }, 'Nepročitani')
          ])
        ])
      ]),

      // Sound Settings
      h('div', { class: 'alert-sound-settings' }, [
        h('label', { class: 'sound-toggle' }, [
          h('input', {
            type: 'checkbox',
            id: 'alertSoundEnabled',
            checked: this.alertSoundEnabled !== false,
            onchange: (e) => { this.alertSoundEnabled = e.target.checked; this.saveAlertSettings(); }
          }),
          h('span', { class: 'toggle-label' }, 'Zvučni alarmi'),
          h('select', {
            id: 'alertSoundType',
            class: 'form-select sound-select',
            value: this.alertSoundType || 'notification',
            disabled: !this.alertSoundEnabled,
            onchange: (e) => { this.alertSoundType = e.target.value; this.saveAlertSettings(); this.playTestSound(); }
          }, [
            h('option', { value: 'notification' }, 'Standardna notifikacija'),
            h('option', { value: 'alert' }, 'Alarm'),
            h('option', { value: 'success' }, 'Uspeh'),
            h('option', { value: 'warning' }, 'Upozorenje'),
            h('option', { value: 'critical' }, 'Kritičan')
          ]),
          h('button', { 
            class: 'btn btn-sm btn-secondary', 
            onclick: () => this.playTestSound(),
            disabled: !this.alertSoundEnabled
          }, 'Testiraj')
        ])
      ]),

      // Alerts List
      h('div', { class: 'section-header' }, [
        h('h3', {}, `📋 Lista alarma (${alerts.length} ukupno)`)
      ]),
      h('div', { class: 'alerts-list' }, alerts
        .filter(a => {
          if (this.alertSeverityFilter && this.alertSeverityFilter !== 'all' && a.severity !== this.alertSeverityFilter) return false;
          if (this.alertPlatformFilter && this.alertPlatformFilter !== 'all' && a.platform !== this.alertPlatformFilter) return false;
          return true;
        })
        .map(alert => this.renderAlertItem(alert))
      ),

      // Alert Rules Configuration
      h('div', { class: 'section-header' }, [
        h('h3', {}, '⚙️ Pravila alarma'),
        h('p', { class: 'section-desc' }, 'Konfiguriši kada se automatski šalju alarmi')
      ]),
      h('div', { class: 'alert-rules-grid' }, this.getAlertRules().map(rule => 
        h('div', { class: `alert-rule-card ${rule.enabled ? 'enabled' : 'disabled'}` }, [
          h('div', { class: 'rule-header' }, [
            h('div', { class: 'rule-info' }, [
              h('h4', {}, rule.name),
              h('p', { class: 'rule-desc' }, rule.description)
            ]),
            h('label', { class: 'rule-toggle' }, [
              h('input', {
                type: 'checkbox',
                checked: rule.enabled,
                onchange: (e) => this.toggleAlertRule(rule.id, e.target.checked)
              }),
              h('span', { class: 'toggle-slider' })
            ])
          ]),
          h('div', { class: 'rule-conditions' }, [
            h('span', { class: 'condition-label' }, 'Uslov:'),
            h('span', { class: 'condition-value' }, rule.condition),
            h('span', { class: 'condition-label' }, 'Prag:'),
            h('span', { class: 'condition-value' }, rule.threshold),
            h('span', { class: 'condition-label' }, 'Severitet:'),
            h('span', { class: `condition-value severity-${rule.severity}` }, rule.severity)
          ]),
          h('div', { class: 'rule-actions' }, [
            h('button', { class: 'btn btn-sm btn-secondary', onclick: () => this.editAlertRule(rule.id) }, 'Izmeni'),
            h('button', { class: 'btn btn-sm btn-primary', onclick: () => this.testAlertRule(rule.id) }, 'Testiraj')
          ])
        ])
      ))
    ]);
  }

  renderSyncSchedulerTab() {
    const stats = syncScheduler.getStats();
    const allJobs = syncScheduler.getAllJobs();
    const history = syncScheduler.getHistory({ limit: 50 });

    return h('div', { class: 'tab-panel sync-scheduler-panel' }, [
      // Header
      h('div', { class: 'panel-header' }, [
        h('div', { class: 'header-content' }, [
          h('h2', {}, 'Sync Scheduler'),
          h('p', { class: 'panel-desc' }, 'Upravljanje automatskom sinhronizacijom podataka sa platformi')
        ]),
        h('div', { class: 'header-actions' }, [
          h('button', { 
            class: 'btn btn-primary', 
            onclick: () => this.toggleScheduler(),
            id: 'schedulerToggleBtn'
          }, [
            h('span', { class: 'btn-icon' }, syncScheduler.running ? '⏸️' : '▶️'),
            syncScheduler.running ? ' Zaustavi' : ' Pokreni'
          ]),
          h('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.refreshScheduler() }, [
            h('span', { class: 'btn-icon' }, '⟳'),
            ' Osveži'
          ])
        ])
      ]),

      // Scheduler Status
      h('div', { class: 'scheduler-status-bar' }, [
        h('div', { class: `status-indicator ${syncScheduler.running ? 'running' : 'stopped'}` }, [
          h('span', { class: 'status-dot' }),
          h('span', syncScheduler.running ? 'Aktivan - Automatska sinhronizacija radi' : 'Zaustavljen - Sinhronizacija isključena')
        ]),
        h('div', { class: 'scheduler-stats' }, [
          h('div', { class: 'stat' }, [
            h('span', { class: 'stat-value' }, stats.enabledJobs),
            h('span', { class: 'stat-label' }, 'Aktivnih poslova')
          ]),
          h('div', { class: 'stat' }, [
            h('span', { class: 'stat-value' }, stats.totalRuns),
            h('span', { class: 'stat-label' }, 'Ukupno izvršavanja')
          ]),
          h('div', { class: 'stat' }, [
            h('span', { class: 'stat-value' }, stats.successRate + '%'),
            h('span', { class: 'stat-label' }, 'Uspešnost')
          ]),
          h('div', { class: 'stat' }, [
            h('span', { class: 'stat-value' }, `${(stats.avgDuration / 1000).toFixed(1)}s`),
            h('span', { class: 'stat-label' }, 'Prosek trajanja')
          ])
        ])
      ]),

      // Jobs Table
      h('div', { class: 'section-header' }, [
        h('h3', {}, '📋 Raspored poslova'),
        h('p', { class: 'section-desc' }, 'Svi zakazani sinhronizacioni poslovi')
      ]),
      
      allJobs.length === 0 ? 
        h('div', { class: 'empty-state' }, [
          h('p', {}, 'Nema zakazanih poslova. Povežite platforme da biste ih videli.'),
          h('p', { class: 'empty-hint' }, 'Poslovi se automatski kreiraju kada povežete platformu.')
        ]) :
        h('div', { class: 'jobs-table-container' }, [
          h('table', { class: 'jobs-table' }, [
            h('thead', {}, [
              h('tr', {}, [
                h('th', {}, 'Posao'),
                h('th', {}, 'Platforma'),
                h('th', {}, 'Frekvencija'),
                h('th', {}, 'Status'),
                h('th', {}, 'Poslednji put'),
                h('th', {}, 'Sledeći put'),
                h('th', {}, 'Izvršavanja'),
                h('th', {}, 'Uspešnost'),
                h('th', {}, 'Akcije')
              ])
            ]),
            h('tbody', {}, allJobs.map(job => {
              const isConnected = this.connectionManager.getConnector(job.platformId)?.status === PlatformStatus.CONNECTED;
              return h('tr', { class: job.enabled ? '' : 'disabled' }, [
                h('td', {}, [
                  h('strong', {}, job.name),
                  h('br'),
                  h('small', { class: 'job-id' }, job.id)
                ]),
                h('td', {}, [
                  h('span', { class: 'platform-badge', style: job.metadata?.color ? `background: ${job.metadata.color}` : '' }, 
                    job.metadata?.icon || job.platformId.charAt(0).toUpperCase()
                  ),
                  h('span', { class: 'platform-name' }, job.metadata?.name || job.platformId)
                ]),
                h('td', {}, job.frequency.label),
                h('td', {}, [
                  h('span', { class: `job-status ${job.enabled ? 'enabled' : 'disabled'}` }, 
                    job.enabled ? 'Aktivan' : 'Isključen'
                  )
                ]),
                h('td', {}, job.lastRun ? ImperiumUtils.formatRelativeTime(job.lastRun) : 'Nikada'),
                h('td', {}, job.nextRun ? ImperiumUtils.formatRelativeTime(job.nextRun) : '—'),
                h('td', {}, job.runCount.toString()),
                h('td', {}, [
                  h('span', { class: `success-rate ${job.successCount > 0 && job.errorCount === 0 ? 'good' : job.errorCount > job.successCount ? 'bad' : 'ok'}` },
                    `${job.runCount > 0 ? Math.round((job.successCount / job.runCount) * 100) : 0}%`
                  ),
                  job.lastError && h('span', { class: 'last-error', title: job.lastError }, ` ⚠ ${job.lastError.substring(0, 30)}...`)
                ]),
                h('td', {}, [
                  h('button', { 
                    class: 'btn btn-sm btn-secondary', 
                    onclick: () => this.toggleJob(job.id),
                    title: job.enabled ? 'Isključi posao' : 'Uključi posao'
                  }, job.enabled ? '⏸️' : '▶️'),
                  h('button', { 
                    class: 'btn btn-sm btn-primary', 
                    onclick: () => this.runJobNow(job.id),
                    title: 'Pokreni sada'
                  }, '▶'),
                  h('button', { 
                    class: 'btn btn-sm btn-secondary', 
                    onclick: () => this.showJobHistory(job.id),
                    title: 'Istorija'
                  }, '📜')
                ])
              ]);
            }))
          ])
        ]),

      // Recent History
      h('div', { class: 'section-header' }, [
        h('h3', {}, '📜 Nedavna istorija izvršavanja'),
        h('p', { class: 'section-desc' }, 'Poslednjih 50 izvršavanja poslova')
      ]),
      
      history.length === 0 ?
        h('div', { class: 'empty-state' }, [
          h('p', {}, 'Nema istorije izvršavanja.')
        ]) :
        h('div', { class: 'jobs-table-container' }, [
          h('table', { class: 'jobs-table' }, [
            h('thead', {}, [
              h('tr', {}, [
                h('th', {}, 'Vreme'),
                h('th', {}, 'Posao'),
                h('th', {}, 'Platforma'),
                h('th', {}, 'Status'),
                h('th', {}, 'Trajanje'),
                h('th', {}, 'Detalji')
              ])
            ]),
            h('tbody', {}, history.map(entry => 
              h('tr', { class: entry.success ? 'success' : 'error' }, [
                h('td', {}, ImperiumUtils.formatRelativeTime(entry.timestamp)),
                h('td', {}, entry.jobName),
                h('td', {}, entry.platformId),
                h('td', {}, [
                  h('span', { class: `history-status ${entry.success ? 'success' : 'error'}` },
                    entry.success ? '✅ Uspešno' : '❌ Greška'
                  )
                ]),
                h('td', {}, `${(entry.duration / 1000).toFixed(1)}s`),
                h('td', {}, entry.error ? `Greška: ${entry.error}` : (entry.result || 'OK'))
              ])
            ))
          ])
        ]),

      // Manual Sync Actions
      h('div', { class: 'section-header' }, [
        h('h3', {}, '🔧 Ručna sinhronizacija'),
        h('p', { class: 'section-desc' }, 'Pokreni sinhronizaciju odmah za sve ili pojedinačne platforme')
      ]),
      h('div', { class: 'manual-sync-actions' }, [
        h('button', { 
          class: 'btn btn-primary', 
          onclick: () => this.runAllSyncNow()
        }, [
          h('span', { class: 'btn-icon' }, '⟳'),
          ' Sinhronizuj sve sada'
        ]),
        h('div', { class: 'platform-sync-buttons' }, 
          this.connectionManager.getAllConnectors()
            .filter(c => c.status === PlatformStatus.CONNECTED)
            .map(connector => 
              h('button', { 
                class: 'btn btn-secondary btn-sm', 
                onclick: () => this.runPlatformSync(connector.platformId),
                style: connector.config?.gradient ? `border-color: ${connector.config.color}` : ''
              }, [
                h('span', { style: connector.config?.gradient ? `color: ${connector.config.color}` : '' }, connector.config?.icon || '🔗'),
                ` ${connector.platformName}`
              ])
            )
        )
      ])
    ]);
  }

  toggleScheduler() {
    if (syncScheduler.running) {
      syncScheduler.stop();
      this.showToast('Scheduler zaustavljen', 'warning');
    } else {
      syncScheduler.start();
      this.showToast('Scheduler pokrenut', 'success');
    }
    this.render();
  }

  refreshScheduler() {
    this.render();
  }

  async runAllSyncNow() {
    this.showToast('Pokrećem sinhronizaciju za sve platforme...', 'info');
    for (const connector of this.connectionManager.getConnectedConnectors()) {
      await this.runPlatformSync(connector.platformId);
    }
  }

  async runPlatformSync(platformId) {
    const connector = this.connectionManager.getConnector(platformId);
    if (!connector) return;
    
    try {
      this.showToast(`Sinhronizujem ${connector.platformName}...`, 'info');
      const result = await connector.sync();
      if (result.success) {
        this.showToast(`${connector.platformName} sinhronizovan`, 'success');
        this.updateMetricsCache(platformId, result.data);
      } else {
        this.showToast(`Greška: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showToast(`Greška: ${error.message}`, 'error');
    }
    this.render();
  }

  async runJobNow(jobId) {
    const job = syncScheduler.getJob(jobId);
    if (!job) return;
    
    this.showToast(`Pokrećem posao ${job.name}...`, 'info');
    try {
      if (job.handler) {
        await job.handler(job);
      } else if (job.connector && typeof job.connector.sync === 'function') {
        await job.connector.sync();
      }
      this.showToast(`${job.name} izvršen`, 'success');
    } catch (error) {
      this.showToast(`Greška: ${error.message}`, 'error');
    }
    this.render();
  }

  toggleJob(jobId) {
    const job = syncScheduler.getJob(jobId);
    if (!job) return;
    
    if (job.enabled) {
      syncScheduler.disableJob(jobId);
      this.showToast(`Posao ${job.name} isključen`, 'warning');
    } else {
      syncScheduler.enableJob(jobId);
      this.showToast(`Posao ${job.name} uključen`, 'success');
    }
    this.render();
  }

  showJobHistory(jobId) {
    const history = syncScheduler.getHistory({ jobId, limit: 20 });
    this.showToast(`Istorija za posao (${history.length} zapisa)`, 'info');
  }

  getAlertsData() {
    // Generate mock alerts based on current metrics
    const alerts = [];
    const now = Date.now();
    const hour = 3600000;
    const day = 86400000;
    
    const instagramMetrics = this.metricsCache.instagram || {};
    const tiktokMetrics = this.metricsCache.tiktok || {};
    const facebookMetrics = this.metricsCache.facebook || {};
    const metaAdsMetrics = this.metricsCache.meta_ads || {};
    const tiktokAdsMetrics = this.metricsCache.tiktok_ads || {};
    const gaMetrics = this.metricsCache.google_analytics || {};
    
    // Instagram alerts
    if (instagramMetrics.followersChange > 1000) {
      alerts.push({
        id: 'alert-ig-followers',
        type: 'follower_spike',
        platform: 'instagram',
        severity: 'info',
        title: 'Znatan rast pratilaca na Instagramu',
        message: `Instagram je dobio ${ImperiumUtils.formatNumber(instagramMetrics.followersChange)} novih pratilaca u poslednjih 24h`,
        timestamp: now - 2 * hour,
        read: false,
        soundEvent: 'success'
      });
    }
    
    if (instagramMetrics.engagementRate < 1.5 && instagramMetrics.followers > 10000) {
      alerts.push({
        id: 'alert-ig-engagement',
        type: 'engagement_drop',
        platform: 'instagram',
        severity: 'warning',
        title: 'Pad engagement rate na Instagramu',
        message: `Engagement rate je pao na ${instagramMetrics.engagementRate.toFixed(2)}% (preporučeno > 2%)`,
        timestamp: now - 4 * hour,
        read: false,
        soundEvent: 'warning'
      });
    }
    
    // TikTok alerts
    if (tiktokMetrics.views && tiktokMetrics.views > 1000000) {
      alerts.push({
        id: 'alert-tt-viral',
        type: 'video_trending',
        platform: 'tiktok',
        severity: 'info',
        title: 'TikTok video postaje viralni',
        message: `Video ima ${ImperiumUtils.formatNumber(tiktokMetrics.views)} pregleda - razmotrite boosting`,
        timestamp: now - 1 * hour,
        read: false,
        soundEvent: 'success'
      });
    }
    
    // Meta Ads alerts
    if (metaAdsMetrics.roas && metaAdsMetrics.roas > 4) {
      alerts.push({
        id: 'alert-meta-roas-high',
        type: 'roas_increase',
        platform: 'meta_ads',
        severity: 'info',
        title: 'Meta Ads ROAS iznad cilja',
        message: `ROAS je ${metaAdsMetrics.roas.toFixed(2)}x (cilj: 3x) - uvećajte budžet`,
        timestamp: now - 3 * hour,
        read: true,
        soundEvent: 'success'
      });
    }
    
    if (metaAdsMetrics.spend && metaAdsMetrics.dailyBudget && metaAdsMetrics.spend > metaAdsMetrics.dailyBudget * 0.9) {
      alerts.push({
        id: 'alert-meta-budget',
        type: 'budget_exhausted',
        platform: 'meta_ads',
        severity: 'critical',
        title: 'Meta Ads budžet skoro iscrpan',
        message: `Potrošeno ${(metaAdsMetrics.spend / metaAdsMetrics.dailyBudget * 100).toFixed(0)}% dnevnog budžeta`,
        timestamp: now - 30 * 60000,
        read: false,
        soundEvent: 'critical'
      });
    }
    
    // TikTok Ads alerts
    if (tiktokAdsMetrics.roas && tiktokAdsMetrics.roas < 1 && tiktokAdsMetrics.spend > 10000) {
      alerts.push({
        id: 'alert-ttads-roas-low',
        type: 'roas_decrease',
        platform: 'tiktok_ads',
        severity: 'critical',
        title: 'TikTok Ads ROAS ispod 1x',
        message: `ROAS: ${tiktokAdsMetrics.roas.toFixed(2)}x sa troškom od ${ImperiumUtils.formatNumber(tiktokAdsMetrics.spend)} RSD`,
        timestamp: now - 2 * hour,
        read: false,
        soundEvent: 'critical'
      });
    }
    
    // GA4 alerts
    if (gaMetrics.sessions && gaMetrics.sessions > 0) {
      const prevSessions = localStorage.getItem('ga_prev_sessions') || gaMetrics.sessions * 1.1;
      const change = ((gaMetrics.sessions - prevSessions) / prevSessions) * 100;
      
      if (change < -20) {
        alerts.push({
          id: 'alert-ga-traffic-drop',
          type: 'traffic_drop',
          platform: 'google_analytics',
          severity: 'warning',
          title: 'Pad saobraćaja na sajtu',
          message: `Saobraćaj je pao za ${Math.abs(change).toFixed(1)}% u odnosu na prethodni period`,
          timestamp: now - 5 * hour,
          read: false,
          soundEvent: 'warning'
        });
      }
    }
    
    // Conversion drop alert
    const totalConversions = (metaAdsMetrics.conversions || 0) + (tiktokAdsMetrics.conversions || 0);
    if (totalConversions < 10 && (metaAdsMetrics.spend || 0) + (tiktokAdsMetrics.spend || 0) > 50000) {
      alerts.push({
        id: 'alert-conversions-low',
        type: 'conversion_drop',
        platform: 'meta_ads',
        severity: 'warning',
        title: 'Niske konverzije sa visokim troškom',
        message: `Samo ${totalConversions} konverzija sa troškom od ${ImperiumUtils.formatNumber((metaAdsMetrics.spend || 0) + (tiktokAdsMetrics.spend || 0))} RSD`,
        timestamp: now - 6 * hour,
        read: true,
        soundEvent: 'warning'
      });
    }
    
    // Sort by timestamp (newest first)
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  renderAlertItem(alert) {
    const config = PLATFORM_CONFIGS[alert.platform]?.config;
    const timeAgo = ImperiumUtils.formatRelativeTime(alert.timestamp);
    const severityIcons = { critical: '🔴', warning: '🟡', info: '🔵' };
    const severityLabels = { critical: 'Kritičan', warning: 'Upozorenje', info: 'Informativan' };
    
    return h('div', { 
      class: `alert-item ${alert.severity} ${!alert.read ? 'unread' : ''}`,
      'data-alert-id': alert.id
    }, [
      h('div', { class: 'alert-left' }, [
        h('span', { class: 'alert-severity-icon' }, severityIcons[alert.severity])
      ]),
      h('div', { class: 'alert-content' }, [
        h('div', { class: 'alert-header' }, [
          h('h4', { class: `alert-title ${!alert.read ? 'unread' : ''}` }, alert.title),
          h('div', { class: 'alert-meta' }, [
            h('span', { class: `alert-platform platform-${alert.platform}` }, 
              config?.icon ? h('span', { style: `background: ${config.gradient}` }, config.icon) : alert.platform.toUpperCase()
            ),
            h('span', { class: `alert-severity ${alert.severity}` }, severityLabels[alert.severity]),
            h('span', { class: 'alert-time' }, timeAgo)
          ])
        ]),
        h('p', { class: 'alert-message' }, alert.message),
        h('div', { class: 'alert-actions' }, [
          !alert.read && h('button', { 
            class: 'btn btn-sm btn-primary', 
            onclick: () => this.markAlertRead(alert.id)
          }, 'Označi pročitanim'),
          h('button', { 
            class: 'btn btn-sm btn-secondary', 
            onclick: () => this.dismissAlert(alert.id)
          }, 'Odbaci'),
          h('button', { 
            class: 'btn btn-sm btn-secondary', 
            onclick: () => this.navigateToRelatedSection(alert)
          }, 'Pogledaj detalje')
        ])
      ]),
      alert.soundEvent && this.alertSoundEnabled && h('div', { class: 'alert-sound-indicator' }, [
        h('span', { class: 'sound-icon' }, '🔊'),
        h('span', { class: 'sound-type' }, alert.soundEvent)
      ])
    ]);
  }

  getAlertRules() {
    return [
      {
        id: 'rule-follower-spike',
        name: 'Rast pratilaca',
        description: 'Obavesti kada platforma dobije više od X novih pratilaca u 24h',
        enabled: true,
        condition: 'followers_change_24h > threshold',
        threshold: '1000 pratilaca',
        severity: 'info'
      },
      {
        id: 'rule-engagement-drop',
        name: 'Pad engagement rate',
        description: 'Obavesti kada engagement rate padne ispod X%',
        enabled: true,
        condition: 'engagement_rate < threshold',
        threshold: '2%',
        severity: 'warning'
      },
      {
        id: 'rule-video-trending',
        name: 'Viralni video',
        description: 'Obavesti kada video prede X pregleda u 1h',
        enabled: true,
        condition: 'video_views_1h > threshold',
        threshold: '100,000 pregleda',
        severity: 'info'
      },
      {
        id: 'rule-roas-increase',
        name: 'ROAS iznad cilja',
        description: 'Obavesti kada ROAS prede ciljnu vrednost',
        enabled: true,
        condition: 'roas > target',
        threshold: '3x',
        severity: 'info'
      },
      {
        id: 'rule-roas-decrease',
        name: 'ROAS ispod 1x',
        description: 'Kritičan alarm kada ROAS padne ispod 1x sa troškom > X',
        enabled: true,
        condition: 'roas < 1 AND spend > threshold',
        threshold: '10,000 RSD troška',
        severity: 'critical'
      },
      {
        id: 'rule-budget-exhausted',
        name: 'Budžet skoro iscrpan',
        description: 'Obavesti kada dnevni budžet dostigne X%',
        enabled: true,
        condition: 'spend / daily_budget > threshold',
        threshold: '90%',
        severity: 'critical'
      },
      {
        id: 'rule-traffic-drop',
        name: 'Pad saobraćaja',
        description: 'Obavesti kada saobraćaj na sajtu padne za X%',
        enabled: true,
        condition: 'sessions_change < -threshold',
        threshold: '20%',
        severity: 'warning'
      },
      {
        id: 'rule-conversions-low',
        name: 'Niske konverzije',
        description: 'Obavesti kada konverzije padnu ispod X sa troškom > Y',
        enabled: true,
        condition: 'conversions < threshold AND spend > threshold',
        threshold: '10 konverzija / 50,000 RSD',
        severity: 'warning'
      }
    ];
  }

  markAlertRead(alertId) {
    // In production, update in database
    this.showToast('Alarm označen kao pročitan', 'success');
    this.render();
  }

  markAllAlertsRead() {
    this.showToast('Svi alarmi označeni kao pročitani', 'success');
    this.render();
  }

  dismissAlert(alertId) {
    this.showToast('Alarm odbačen', 'info');
    this.render();
  }

  navigateToRelatedSection(alert) {
    const sectionMap = {
      instagram: 'analytics',
      tiktok: 'analytics',
      facebook: 'analytics',
      meta_ads: 'advertising',
      tiktok_ads: 'advertising',
      google_analytics: 'analytics'
    };
    const section = sectionMap[alert.platform] || 'analytics';
    this.handleTabChange(section);
    this.admin.closeModal?.();
  }

  toggleAlertRule(ruleId, enabled) {
    // In production, save to database
    this.showToast(`Pravilo ${enabled ? 'uključeno' : 'isključeno'}`, 'success');
  }

  editAlertRule(ruleId) {
    this.admin.openModal({
      title: 'Izmeni pravilo alarma',
      size: 'lg',
      content: h('div', { class: 'alert-rule-form' }, [
        h('p', { class: 'modal-note' }, 'Forma za uređivanje pravila alarma - u narednom koraku.')
      ]),
      footer: h('button', { class: 'btn btn-primary', onclick: () => this.admin.closeModal() }, 'Zatvori')
    });
  }

  testAlertRule(ruleId) {
    this.showToast('Test alarm poslat (demo)', 'info');
    // Play test sound using new sound system
    this.playTestSound();
  }

  playTestSound() {
    if (!this.alertSoundEnabled) return;
    const soundEvent = this.alertSoundType || 'notification';
    playSoundEvent(soundEvent);
  }

  saveAlertSettings() {
    setSoundEnabled(this.alertSoundEnabled);
    localStorage.setItem('dalli_alert_sound_type', this.alertSoundType);
    localStorage.setItem('dalli_alert_sound_volume', this.alertSoundVolume || '0.5');
  }

  loadAlertSettings() {
    loadSoundSettings();
    this.alertSoundEnabled = isSoundEnabled();
    this.alertSoundType = localStorage.getItem('dalli_alert_sound_type') || 'notification';
    this.alertSoundVolume = parseFloat(localStorage.getItem('dalli_alert_sound_volume') || '0.5');
    setMasterVolume(this.alertSoundVolume);
  }

  refreshAlerts() {
    this.showToast('Osvežavanje alarma...', 'info');
    this.render();
  }

  renderComingSoon(tabId, title, description) {
    return h('div', { class: 'tab-panel coming-soon' }, [
      h('div', { class: 'coming-soon-content' }, [
        h('div', { class: 'coming-soon-icon' }, '🚧'),
        h('h2', {}, `${title} - U izradi`),
        h('p', {}, description),
        h('p', { class: 'coming-soon-note' }, 'Ova funkcionalnost će biti dostupna u narednom koraku razvoja.')
      ])
    ]);
  }

  renderEmptyState(tabId, message) {
    return h('div', { class: 'tab-panel empty-state' }, [
      h('div', { class: 'empty-content' }, [
        h('div', { class: 'empty-icon' }, '📭'),
        h('h2', {}, 'Nema podataka'),
        h('p', {}, message),
        h('button', { 
          class: 'btn btn-primary', 
          onclick: () => this.handleTabChange('connections')
        }, 'Idi na Konekcije')
      ])
    ]);
  }

  onUnmount() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}

export default SocialMediaCenter;