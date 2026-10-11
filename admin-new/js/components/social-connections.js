/**
 * Social Media Connection UI Components
 * ConnectModal, PlatformCard, StatusIndicator, QuickAccessShortcuts
 */

import { Component, defineComponent } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { connectionManager, PlatformStatus, PLATFORM_CONFIGS } from '../connectors/connection-manager.js';

class StatusIndicator extends Component {
  constructor(options = {}) {
    super(options);
    this.status = options.status || PlatformStatus.DISCONNECTED;
    this.size = options.size || 'md';
    this.showLabel = options.showLabel !== false;
  }

  render() {
    const statusConfig = {
      [PlatformStatus.CONNECTED]: { 
        class: 'connected', 
        label: 'Povezano', 
        icon: '✓',
        dotClass: 'status-dot connected'
      },
      [PlatformStatus.CONNECTING]: { 
        class: 'connecting', 
        label: 'Povezivanje...', 
        icon: '⟳',
        dotClass: 'status-dot connecting'
      },
      [PlatformStatus.EXPIRED]: { 
        class: 'expired', 
        label: 'Istekao token', 
        icon: '⚠',
        dotClass: 'status-dot expired'
      },
      [PlatformStatus.ERROR]: { 
        class: 'error', 
        label: 'Greška', 
        icon: '✕',
        dotClass: 'status-dot error'
      },
      [PlatformStatus.DISCONNECTED]: { 
        class: 'disconnected', 
        label: 'Nije povezano', 
        icon: '○',
        dotClass: 'status-dot disconnected'
      }
    };

    const config = statusConfig[this.status] || statusConfig[PlatformStatus.DISCONNECTED];
    const sizes = { sm: 'status-sm', md: '', lg: 'status-lg' };

    return h('span', { class: `status-indicator ${config.class} ${sizes[this.size]}` }, [
      h('span', { class: config.dotClass, 'aria-hidden': 'true' }),
      this.showLabel && h('span', { class: 'status-label' }, config.label)
    ]);
  }
}

class PlatformCard extends Component {
  constructor(options = {}) {
    super(options);
    this.platform = options.platform;
    this.connector = options.connector;
    this.onConnect = options.onConnect;
    this.onDisconnect = options.onDisconnect;
    this.onShortcut = options.onShortcut;
  }

  getStatus() {
    return this.connector?.status || PlatformStatus.DISCONNECTED;
  }

  getAccountName() {
    return this.connector?.accountName || null;
  }

  getAvatarUrl() {
    return this.connector?.avatarUrl || PLATFORM_CONFIGS[this.platform.id]?.config?.icon;
  }

  getLastSync() {
    if (!this.connector?.lastSyncAt) return null;
    return ImperiumUtils.formatRelativeTime(this.connector.lastSyncAt);
  }

  getSyncError() {
    return this.connector?.syncError || null;
  }

  getShortcuts() {
    if (this.connector?.getShortcuts) {
      return this.connector.getShortcuts();
    }
    return [];
  }

  handleConnect() {
    if (this.onConnect) {
      this.onConnect(this.platform.id);
    }
  }

  handleDisconnect() {
    if (this.onDisconnect) {
      this.onDisconnect(this.platform.id);
    }
  }

  handleShortcut(shortcut) {
    if (this.onShortcut) {
      this.onShortcut(shortcut);
    }
  }

  render() {
    const status = this.getStatus();
    const isConnected = status === PlatformStatus.CONNECTED;
    const config = PLATFORM_CONFIGS[this.platform.id]?.config;
    const shortcuts = this.getShortcuts();

    return h('div', { 
      class: `social-connection-card ${isConnected ? 'connected' : ''} ${status === PlatformStatus.ERROR ? 'error' : ''}`,
      'data-platform': this.platform.id
    }, [
      h('div', { class: 'platform-card-header' }, [
        h('div', { class: 'platform-avatar-wrapper' }, [
          config?.gradient ? 
            h('div', { 
              class: 'platform-avatar-gradient', 
              style: `background: ${config.gradient}` 
            }, this.platform.id.charAt(0).toUpperCase()) :
            h('img', { 
              class: 'platform-avatar', 
              src: this.getAvatarUrl(), 
              alt: this.platform.name 
            })
        ]),
        h('div', { class: 'platform-info' }, [
          h('h3', { class: 'platform-name' }, this.platform.name),
          h('div', { class: 'platform-meta' }, [
            new StatusIndicator({ status, size: 'sm', showLabel: true })
          ])
        ]),
        h('div', { class: 'platform-actions' }, [
          isConnected ? 
            h('button', { 
              class: 'btn btn-secondary btn-sm', 
              onclick: () => this.handleDisconnect(),
              title: 'Odvoji nalog'
            }, 'Odvoji') :
            h('button', { 
              class: 'btn btn-primary btn-sm', 
              onclick: () => this.handleConnect(),
              title: 'Poveži nalog'
            }, 'Poveži')
        ])
      ]),

      isConnected && h('div', { class: 'platform-connected-info' }, [
        this.getAccountName() && h('div', { class: 'connected-account' }, [
          h('span', { class: 'connected-label' }, 'Nalog:'),
          h('span', { class: 'connected-value' }, this.getAccountName())
        ]),
        this.getLastSync() && h('div', { class: 'last-sync' }, [
          h('span', { class: 'sync-label' }, 'Poslednja sinhronizacija:'),
          h('span', { class: 'sync-value' }, this.getLastSync())
        ]),
        this.getSyncError() && h('div', { class: 'sync-error' }, [
          h('span', { class: 'error-icon' }, '⚠'),
          h('span', { class: 'error-text' }, this.getSyncError())
        ])
      ]),

      shortcuts.length > 0 && h('div', { class: 'platform-shortcuts' }, [
        h('h4', { class: 'shortcuts-title' }, 'Brzi pristup:'),
        h('div', { class: 'quick-access-shortcuts' }, shortcuts.map(shortcut => 
          h('button', {
            class: 'quick-access-shortcut connected',
            onclick: () => this.handleShortcut(shortcut),
            title: shortcut.label
          }, [
            h('span', { class: 'shortcut-label' }, shortcut.label)
          ])
        ))
      ])
    ]);
  }
}

class ConnectModal extends Component {
  constructor(options = {}) {
    super(options);
    this.platformId = options.platformId;
    this.connector = options.connector;
    this.onClose = options.onClose;
    this.onSuccess = options.onSuccess;
    this.step = 'credentials'; // credentials, oauth, success
    this.credentials = {
      clientId: '',
      clientSecret: '',
      redirectUri: ''
    };
    this.oauthState = null;
  }

  getPlatformConfig() {
    return PLATFORM_CONFIGS[this.platformId]?.config;
  }

  validateCredentials() {
    const { clientId, clientSecret, redirectUri } = this.credentials;
    return clientId && clientSecret && redirectUri;
  }

  async handleSaveCredentials() {
    if (!this.validateCredentials()) {
      this.showError('Sva polja su obavezna');
      return;
    }

    // Save credentials to connection manager
    connectionManager.setCredentials(this.platformId, this.credentials);
    
    // Update connector
    if (this.connector && this.connector.setCredentials) {
      this.connector.setCredentials(
        this.credentials.clientId,
        this.credentials.clientSecret,
        this.credentials.redirectUri
      );
    }

    this.step = 'oauth';
    this.render();
  }

  handleOAuthStart() {
    if (!this.connector) return;
    
    this.oauthState = this.connector.generateState();
    const oauthUrl = this.connector.getOAuthUrl(this.oauthState);
    
    // Open OAuth in popup
    const popup = window.open(
      oauthUrl,
      `dalli-oauth-${this.platformId}`,
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    // Listen for OAuth callback
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        // Check if connection was successful
        setTimeout(() => this.checkConnection(), 1000);
      }
    }, 500);

    // Also listen for message from popup
    window.addEventListener('message', this.handleOAuthMessage.bind(this));
  }

  handleOAuthMessage(event) {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'dalli-oauth-callback') {
      this.handleOAuthCallback(event.data.code, event.data.state);
    }
  }

  async handleOAuthCallback(code, state) {
    if (state !== this.oauthState) {
      this.showError('Nevalidan OAuth state');
      return;
    }

    this.step = 'connecting';
    this.render();

    try {
      const result = await this.connector.connect({ code });
      if (result.success) {
        this.step = 'success';
        this.render();
        if (this.onSuccess) this.onSuccess(result);
        setTimeout(() => this.close(), 2000);
      } else {
        this.step = 'credentials';
        this.showError(result.error || 'Povezivanje neuspešno');
      }
    } catch (error) {
      this.step = 'credentials';
      this.showError(error.message);
    }
  }

  async checkConnection() {
    if (this.connector && this.connector.status === PlatformStatus.CONNECTED) {
      this.step = 'success';
      this.render();
      if (this.onSuccess) this.onSuccess({ success: true });
      setTimeout(() => this.close(), 2000);
    }
  }

  showError(message) {
    this.errorMessage = message;
    this.render();
  }

  close() {
    window.removeEventListener('message', this.handleOAuthMessage.bind(this));
    if (this.onClose) this.onClose();
  }

  render() {
    const config = this.getPlatformConfig();
    const isConnected = this.connector?.status === PlatformStatus.CONNECTED;

    if (this.step === 'success') {
      return h('div', { class: 'connect-modal success' }, [
        h('div', { class: 'modal-icon success' }, '✓'),
        h('h3', {}, `${config?.name || this.platformId} uspešno povezan!`),
        h('p', { class: 'success-message' }, 'Možete zatvoriti ovaj prozor.'),
        h('button', { 
          class: 'btn btn-primary', 
          onclick: () => this.close()
        }, 'Zatvori')
      ]);
    }

    return h('div', { class: 'connect-modal' }, [
      h('div', { class: 'modal-header' }, [
        config?.gradient ? 
          h('div', { 
            class: 'modal-platform-icon', 
            style: `background: ${config.gradient}` 
          }, this.platformId.charAt(0).toUpperCase()) :
          h('img', { class: 'modal-platform-icon', src: config?.icon, alt: config?.name }),
        h('div', { class: 'modal-platform-info' }, [
          h('h3', {}, `Poveži ${config?.name || this.platformId}`),
          h('p', { class: 'modal-platform-desc' }, this.getPlatformDescription())
        ]),
        h('button', { 
          class: 'modal-close', 
          onclick: () => this.close(),
          'aria-label': 'Zatvori'
        }, '✕')
      ]),

      this.step === 'credentials' && h('div', { class: 'modal-body' }, [
        h('div', { class: 'form-group' }, [
          h('label', { for: 'clientId' }, 'App ID / Client ID'),
          h('input', {
            type: 'text',
            id: 'clientId',
            class: 'form-input',
            placeholder: 'Unesite App ID',
            value: this.credentials.clientId,
            oninput: (e) => { this.credentials.clientId = e.target.value; }
          })
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'clientSecret' }, 'App Secret / Client Secret'),
          h('input', {
            type: 'password',
            id: 'clientSecret',
            class: 'form-input',
            placeholder: 'Unesite App Secret',
            value: this.credentials.clientSecret,
            oninput: (e) => { this.credentials.clientSecret = e.target.value; }
          })
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { for: 'redirectUri' }, 'Redirect URI'),
          h('input', {
            type: 'text',
            id: 'redirectUri',
            class: 'form-input',
            placeholder: 'https://yourdomain.com/admin/oauth/callback',
            value: this.credentials.redirectUri || `${window.location.origin}/admin/oauth/callback`,
            oninput: (e) => { this.credentials.redirectUri = e.target.value; }
          })
        ]),
        this.errorMessage && h('div', { class: 'error-message' }, this.errorMessage),
        h('div', { class: 'modal-footer' }, [
          h('button', { 
            class: 'btn btn-primary', 
            onclick: () => this.handleSaveCredentials(),
            disabled: !this.validateCredentials()
          }, 'Nastavi na OAuth')
        ])
      ]),

      this.step === 'oauth' && h('div', { class: 'modal-body oauth-step' }, [
        h('div', { class: 'oauth-icon' }, '🔐'),
        h('h3', {}, 'Autorizujte pristup'),
        h('p', {}, `Otvorice se prozor za prijavu na ${config?.name}. Prijavite se i dozvolite pristup.`),
        h('button', { 
          class: 'btn btn-primary btn-lg', 
          onclick: () => this.handleOAuthStart()
        }, 'Otvori autorizaciju'),
        h('p', { class: 'oauth-note' }, 'Ako se prozor ne otvori, proverite blokiranje popup prozora u browseru.'),
        h('div', { class: 'modal-footer' }, [
          h('button', { 
            class: 'btn btn-secondary', 
            onclick: () => { this.step = 'credentials'; this.render(); }
          }, 'Nazad')
        ])
      ]),

      this.step === 'connecting' && h('div', { class: 'modal-body connecting-step' }, [
        h('div', { class: 'spinner' }),
        h('h3', {}, 'Povezivanje...'),
        h('p', {}, 'Molimo sačekajte dok završavamo povezivanje.')
      ])
    ]);
  }

  getPlatformDescription() {
    const descriptions = {
      instagram: 'Povežite Instagram Business nalog za pristup analitici, reel/story performansi i brzim pristupom profilu.',
      facebook: 'Povežite Facebook stranicu za analitiku stranice, post performanse i Meta Ads pristup.',
      meta_bm: 'Povežite Meta Business Manager za centralizovano upravljanje svim Meta imovinom.',
      meta_ads: 'Povežite Meta Ads za praćenje kampanja, troškova, ROAS i performansi reklama.',
      tiktok: 'Povežite TikTok Business nalog za video analitiku, follower rast i trending sadržaj.',
      tiktok_ads: 'Povežite TikTok Ads za praćenje reklamnih kampanja i performansi.',
      google_analytics: 'Povežite Google Analytics (GA4) za saobraćaj, korisnike i konverzije.',
      google_search_console: 'Povežite Google Search Console za pretraživanje analitiku, ključne reči i CTR.'
    };
    return descriptions[this.platformId] || 'Povežite nalog za pristup podacima.';
  }
}

class QuickAccessShortcuts extends Component {
  constructor(options = {}) {
    super(options);
    this.shortcuts = options.shortcuts || [];
    this.onShortcutClick = options.onShortcutClick;
  }

  render() {
    if (this.shortcuts.length === 0) {
      return h('div', { class: 'quick-access-empty' }, [
        h('p', {}, 'Nema dostupnih prečica. Povežite platforme da biste ih videli.')
      ]);
    }

    return h('div', { class: 'quick-access-shortcuts-grid' }, this.shortcuts.map(shortcut => 
      h('button', {
        class: `quick-access-shortcut ${shortcut.platform ? `platform-${shortcut.platform}` : ''}`,
        onclick: () => this.onShortcutClick?.(shortcut),
        title: `${shortcut.platformName}: ${shortcut.label}`
      }, [
        h('span', { class: 'shortcut-icon', style: shortcut.color ? `color: ${shortcut.color}` : '' }, this.getPlatformIcon(shortcut.platform)),
        h('span', { class: 'shortcut-label' }, shortcut.label),
        shortcut.platformName && h('span', { class: 'shortcut-platform' }, shortcut.platformName)
      ])
    ));
  }

  getPlatformIcon(platform) {
    const icons = {
      instagram: '📷',
      facebook: '📘',
      meta_bm: '🏢',
      meta_ads: '📊',
      tiktok: '🎵',
      tiktok_ads: '📈',
      google_analytics: '📉',
      google_search_console: '🔍'
    };
    return icons[platform] || '🔗';
  }
}

defineComponent('status-indicator', StatusIndicator);
defineComponent('platform-card', PlatformCard);
defineComponent('connect-modal', ConnectModal);
defineComponent('quick-access-shortcuts', QuickAccessShortcuts);

export { StatusIndicator, PlatformCard, ConnectModal, QuickAccessShortcuts };