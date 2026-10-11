import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class AlertBanner extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.alerts = [];
    this.dismissedAlerts = new Set();
    this.snoozedAlerts = new Map();
    this.soundEnabled = true;
    this.newOrderSound = null;
    this.loadAlerts();
  }

  loadAlerts() {
    const saved = localStorage.getItem('dalli_dismissed_alerts');
    if (saved) {
      this.dismissedAlerts = new Set(JSON.parse(saved));
    }
    const snoozed = localStorage.getItem('dalli_snoozed_alerts');
    if (snoozed) {
      this.snoozedAlerts = new Map(JSON.parse(snoozed));
    }
  }

  saveDismissed() {
    localStorage.setItem('dalli_dismissed_alerts', JSON.stringify([...this.dismissedAlerts]));
  }

  saveSnoozed() {
    localStorage.setItem('dalli_snoozed_alerts', JSON.stringify([...this.snoozedAlerts]));
  }

  initNewOrderSound() {
    this.newOrderSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUpur755NMAwQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUpur755NMAw');
    this.newOrderSound.volume = 0.5;
  }

  playNewOrderSound() {
    if (this.soundEnabled && this.newOrderSound) {
      this.newOrderSound.currentTime = 0;
      this.newOrderSound.play().catch(() => {});
    }
  }

  addAlert(alert) {
    const id = alert.id || ImperiumUtils.generateId('alert-');
    const newAlert = {
      id,
      type: alert.type || 'info',
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp || new Date().toISOString(),
      priority: alert.priority || 0,
      dismissible: alert.dismissible !== false,
      snoozable: alert.snoozable !== false,
      action: alert.action,
      details: alert.details,
      read: false
    };

    this.alerts.unshift(newAlert);
    this.alerts.sort((a, b) => b.priority - a.priority);
    this.render();
    return newAlert;
  }

  addCriticalAlert(title, message, options = {}) {
    return this.addAlert({
      type: 'critical',
      title,
      message,
      priority: 100,
      dismissible: true,
      snoozable: true,
      ...options
    });
  }

  addWarningAlert(title, message, options = {}) {
    return this.addAlert({
      type: 'warning',
      title,
      message,
      priority: 50,
      dismissible: true,
      snoozable: true,
      ...options
    });
  }

  addInfoAlert(title, message, options = {}) {
    return this.addAlert({
      type: 'info',
      title,
      message,
      priority: 10,
      dismissible: true,
      snoozable: false,
      ...options
    });
  }

  addSuccessAlert(title, message, options = {}) {
    return this.addAlert({
      type: 'success',
      title,
      message,
      priority: 5,
      dismissible: true,
      snoozable: false,
      autoDismiss: 5000,
      ...options
    });
  }

  dismissAlert(id) {
    this.dismissedAlerts.add(id);
    this.saveDismissed();
    this.alerts = this.alerts.filter(a => a.id !== id);
    this.render();
  }

  snoozeAlert(id, hours = 24) {
    const until = Date.now() + hours * 60 * 60 * 1000;
    this.snoozedAlerts.set(id, until);
    this.saveSnoozed();
    this.alerts = this.alerts.filter(a => a.id !== id);
    this.render();
  }

  markAsRead(id) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) alert.read = true;
  }

  getVisibleAlerts() {
    const now = Date.now();
    return this.alerts.filter(alert => {
      if (this.dismissedAlerts.has(alert.id)) return false;
      if (this.snoozedAlerts.has(alert.id)) {
        if (this.snoozedAlerts.get(alert.id) > now) return false;
        this.snoozedAlerts.delete(alert.id);
        this.saveSnoozed();
      }
      return true;
    });
  }

  getCriticalCount() {
    return this.getVisibleAlerts().filter(a => a.type === 'critical').length;
  }

  getWarningCount() {
    return this.getVisibleAlerts().filter(a => a.type === 'warning').length;
  }

  getUnreadCount() {
    return this.getVisibleAlerts().filter(a => !a.read).length;
  }

  render() {
    const visibleAlerts = this.getVisibleAlerts();
    if (visibleAlerts.length === 0) {
      return `
        <div class="alert-banner-container" data-ref="container">
          <div class="dalli-happy-state" id="dalliHappy">
            <div class="dalli-mascot" aria-hidden="true">
              <svg class="dalli-body" viewBox="0 0 120 120" width="80" height="80">
                <!-- Shadow -->
                <ellipse cx="60" cy="105" rx="35" ry="8" fill="rgba(0,0,0,0.1)" class="dalli-shadow"/>
                <!-- Body -->
                <g class="dalli-main">
                  <!-- Feet -->
                  <ellipse cx="42" cy="90" rx="14" ry="6" fill="#2c3e50" class="dalli-foot dalli-foot-left"/>
                  <ellipse cx="78" cy="90" rx="14" ry="6" fill="#2c3e50" class="dalli-foot dalli-foot-right"/>
                  <!-- Body main -->
                  <path d="M25 40 Q15 55 20 85 Q25 95 42 90 Q50 92 60 90 Q70 92 78 90 Q95 95 100 85 Q105 55 95 40 Q85 25 60 20 Q35 25 25 40" fill="#2c3e50" class="dalli-body-shape"/>
                  <!-- Belly -->
                  <path d="M40 50 Q40 55 45 55 Q55 55 55 50 Q55 45 50 45 Q45 45 45 50 Q40 50 40 50" fill="#34495e" class="dalli-belly"/>
                  <!-- Arms -->
                  <path d="M20 45 Q10 50 12 65 Q15 70 25 65" fill="#2c3e50" class="dalli-arm dalli-arm-left"/>
                  <path d="M100 45 Q110 50 108 65 Q105 70 95 65" fill="#2c3e50" class="dalli-arm dalli-arm-right"/>
                  <!-- Eyes -->
                  <g class="dalli-eyes">
                    <ellipse cx="48" cy="45" rx="8" ry="10" fill="white" class="dalli-eye-white"/>
                    <ellipse cx="72" cy="45" rx="8" ry="10" fill="white" class="dalli-eye-white"/>
                    <ellipse cx="50" cy="47" rx="4" ry="5" fill="#1a252f" class="dalli-pupil"/>
                    <ellipse cx="74" cy="47" rx="4" ry="5" fill="#1a252f" class="dalli-pupil"/>
                    <circle cx="52" cy="44" r="2" fill="white" class="dalli-eye-shine"/>
                    <circle cx="76" cy="44" r="2" fill="white" class="dalli-eye-shine"/>
                  </g>
                  <!-- Mouth -->
                  <path d="M50 70 Q60 78 70 70" stroke="#1a252f" stroke-width="3" fill="none" stroke-linecap="round" class="dalli-mouth"/>
                  <!-- Blush -->
                  <ellipse cx="38" cy="55" rx="6" ry="3" fill="#e74c3c" opacity="0.3" class="dalli-blush dalli-blush-left"/>
                  <ellipse cx="82" cy="55" rx="6" ry="3" fill="#e74c3c" opacity="0.3" class="dalli-blush dalli-blush-right"/>
                </g>
                <!-- Party hat (appears occasionally) -->
                <g class="dalli-hat" opacity="0">
                  <path d="M60 5 Q55 25 60 35 Q65 25 60 5" fill="#e74c3c" class="dalli-hat-shape"/>
                  <circle cx="60" cy="5" r="4" fill="white" class="dalli-hat-pompon"/>
                </g>
                <!-- Floating hearts -->
                <g class="dalli-hearts">
                  <path d="M30 30 Q25 25 30 20 Q35 25 30 30 Q25 35 30 30" fill="#e74c3c" class="dalli-heart" style="opacity:0"/>
                  <path d="M90 25 Q85 20 90 15 Q95 20 90 25 Q85 30 90 25" fill="#e74c3c" class="dalli-heart" style="opacity:0"/>
                  <path d="M60 10 Q55 5 60 0 Q65 5 60 10 Q55 15 60 10" fill="#e74c3c" class="dalli-heart" style="opacity:0"/>
                </g>
              </svg>
            </div>
            <div class="dalli-message">
              <span class="dalli-text-main">Sve je u redu! 🎉</span>
              <span class="dalli-text-sub">Nema grešaka, upozorenja niti obaveštenja.</span>
            </div>
            <div class="dalli-stats">
              <div class="dalli-stat"><span class="dalli-stat-value">0</span><span class="dalli-stat-label">Grešaka</span></div>
              <div class="dalli-stat"><span class="dalli-stat-value">0</span><span class="dalli-stat-label">Upozorenja</span></div>
              <div class="dalli-stat"><span class="dalli-stat-value">✓</span><span class="dalli-stat-label">Sistem OK</span></div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="alert-banner-container" data-ref="container">
        ${visibleAlerts.map(alert => this.renderAlert(alert)).join('')}
      </div>
    `;
  }

  renderAlert(alert) {
    const typeClasses = {
      critical: 'alert-banner-critical',
      warning: 'alert-banner-warning',
      info: 'alert-banner-info',
      success: 'alert-banner-success'
    };

    const typeIcons = {
      critical: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
    };

    const priorityLabels = {
      critical: 'Kritično',
      warning: 'Upozorenje',
      info: 'Informacija',
      success: 'Uspeh'
    };

    return `
      <div class="alert-banner ${typeClasses[alert.type]}" data-id="${alert.id}" role="alert" aria-live="${alert.type === 'critical' ? 'assertive' : 'polite'}">
        <div class="alert-banner-icon" aria-hidden="true">
          ${typeIcons[alert.type]}
        </div>
        <div class="alert-banner-content">
          <div class="alert-banner-header">
            <span class="alert-banner-type">${priorityLabels[alert.type]}</span>
            <h4 class="alert-banner-title">${ImperiumUtils.escapeHtml(alert.title)}</h4>
            <span class="alert-banner-time">${ImperiumUtils.formatRelativeTime(alert.timestamp)}</span>
          </div>
          <p class="alert-banner-message">${ImperiumUtils.escapeHtml(alert.message)}</p>
          ${alert.details ? `<div class="alert-banner-details">${ImperiumUtils.escapeHtml(alert.details)}</div>` : ''}
        </div>
        <div class="alert-banner-actions">
          ${alert.action ? `<button class="btn btn-sm btn-ghost" data-action="alert-action" data-alert-id="${alert.id}">${ImperiumUtils.escapeHtml(alert.action.label)}</button>` : ''}
          ${alert.snoozable ? `<button class="btn btn-sm btn-ghost" data-action="snooze" data-alert-id="${alert.id}" aria-label="Odloži 24h">Odloži</button>` : ''}
          ${alert.dismissible ? `<button class="btn btn-sm btn-ghost" data-action="dismiss" data-alert-id="${alert.id}" aria-label="Zatvori">×</button>` : ''}
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.on('click', '[data-action="dismiss"]', (e) => {
      const id = e.delegateTarget.dataset.alertId;
      this.dismissAlert(id);
    });

    this.on('click', '[data-action="snooze"]', (e) => {
      const id = e.delegateTarget.dataset.alertId;
      this.snoozeAlert(id, 24);
    });

    this.on('click', '[data-action="alert-action"]', (e) => {
      const id = e.delegateTarget.dataset.alertId;
      const alert = this.alerts.find(a => a.id === id);
      if (alert?.action?.onClick) {
        alert.action.onClick(alert);
      }
      this.markAsRead(id);
    });

    this.on('click', '.alert-banner', (e) => {
      if (!e.target.closest('button')) {
        const id = e.delegateTarget.dataset.id;
        this.markAsRead(id);
      }
    });
  }

  mount(container) {
    super.mount(container);
    this.initNewOrderSound();
    this.checkSystemAlerts();
    setInterval(() => this.checkSystemAlerts(), 60000);
  }

  checkSystemAlerts() {
    this.checkSSLExpiry();
    this.checkDomainExpiry();
    this.checkLowStock();
    this.checkMissingSEO();
  }

  checkSSLExpiry() {
    const sslExpiry = localStorage.getItem('dalli_ssl_expiry');
    if (sslExpiry) {
      const daysLeft = Math.ceil((new Date(sslExpiry).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 30 && daysLeft > 0) {
        const id = 'ssl-expiry';
        if (!this.dismissedAlerts.has(id) && !this.alerts.find(a => a.id === id)) {
          this.addCriticalAlert(
            'SSL sertifikat uskoro isteče',
            `SSL sertifikat ističe za ${daysLeft} dana. Obnavljajte ga kako biste sprečili prekid usluge.`,
            { id, action: { label: 'Podesi', onClick: () => this.admin.navigateTo('settings') } }
          );
        }
      }
    }
  }

  checkDomainExpiry() {
    const domainExpiry = localStorage.getItem('dalli_domain_expiry');
    if (domainExpiry) {
      const daysLeft = Math.ceil((new Date(domainExpiry).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 60 && daysLeft > 0) {
        const id = 'domain-expiry';
        if (!this.dismissedAlerts.has(id) && !this.alerts.find(a => a.id === id)) {
          this.addCriticalAlert(
            'Domen uskoro isteče',
            `Domen ističe za ${daysLeft} dana. Produžite registraciju kako biste zadržali vlasništvo.`,
            { id, action: { label: 'Produži', onClick: () => this.admin.navigateTo('settings') } }
          );
        }
      }
    }
  }

  checkLowStock() {
    const products = this.admin.store.getState().products || [];
    const lowStockProducts = products.filter(p => p.totalStock > 0 && p.totalStock <= 5);
    if (lowStockProducts.length > 0) {
      const id = 'low-stock';
      if (!this.dismissedAlerts.has(id) && !this.alerts.find(a => a.id === id)) {
        this.addWarningAlert(
          'Niske zalihe',
          `${lowStockProducts.length} proizvoda ima zalihe ispod 5 komada. Potrebno je naručiti novu robu.`,
          { id, action: { label: 'Pogledaj inventar', onClick: () => this.admin.navigateTo('inventory') } }
        );
      }
    }
  }

  checkMissingSEO() {
    const products = this.admin.store.getState().products || [];
    const missingSEO = products.filter(p => !p.seo?.title || !p.seo?.description);
    if (missingSEO.length > 0) {
      const id = 'missing-seo';
      if (!this.dismissedAlerts.has(id) && !this.alerts.find(a => a.id === id)) {
        this.addWarningAlert(
          'Nedostaju SEO podaci',
          `${missingSEO.length} proizvoda nema SEO naslov ili opis. To utica na rangiranje u pretraživačima.`,
          { id, action: { label: 'Optimizuj SEO', onClick: () => this.admin.navigateTo('seo') } }
        );
      }
    }
  }

  notifyNewOrder(order) {
    this.playNewOrderSound();
    
    this.addInfoAlert(
      'Nova porudžbina primljena',
      `Porudžbina ${order.id} od ${order.customer.name} za ${ImperiumUtils.formatCurrency(order.total)}`,
      {
        id: `new-order-${order.id}`,
        priority: 80,
        action: { label: 'Pogledaj', onClick: () => this.admin.navigateTo('orders') }
      }
    );

    this.admin.toastContainer.info(`Nova porudžbina: ${order.id}`, {
      action: { label: 'Pogledaj', onClick: () => this.admin.navigateTo('orders') }
    });

    this.admin.store.setState({ 
      notifications: [
        {
          id: `notif-${order.id}`,
          title: 'Nova porudžbina',
          message: `${order.customer.name} - ${ImperiumUtils.formatCurrency(order.total)}`,
          time: new Date().toISOString(),
          read: false,
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5v5M16 19h6M8 19H2M21 19V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/><circle cx="9" cy="19" r="1"/><circle cx="19" cy="19" r="1"/></svg>',
          color: 'var(--color-primary)',
          iconColor: 'var(--color-accent)'
        },
        ...this.admin.store.getState().notifications
      ].slice(0, 50),
      unreadCount: this.admin.store.getState().unreadCount + 1
    });
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    localStorage.setItem('dalli_sound_enabled', enabled);
  }
}

export class AlertCenter extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.alertBanner = options.alertBanner;
    this.filter = 'all';
  }

  render() {
    const alerts = this.alertBanner?.getVisibleAlerts() || [];
    const filtered = this.filter === 'all' ? alerts : alerts.filter(a => a.type === this.filter);

    this.element.innerHTML = `
      <div class="alert-center">
        <div class="alert-center-header">
          <h3>Centar Obaveštenja</h3>
          <div class="alert-center-filters">
            <button class="btn ${this.filter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-filter="all">Sva (${alerts.length})</button>
            <button class="btn ${this.filter === 'critical' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-filter="critical">Kritična (${alerts.filter(a => a.type === 'critical').length})</button>
            <button class="btn ${this.filter === 'warning' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-filter="warning">Upozorenja (${alerts.filter(a => a.type === 'warning').length})</button>
            <button class="btn ${this.filter === 'info' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-filter="info">Info (${alerts.filter(a => a.type === 'info').length})</button>
            <button class="btn ${this.filter === 'success' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-filter="success">Uspeh (${alerts.filter(a => a.type === 'success').length})</button>
          </div>
        </div>
        <div class="alert-center-list">
          ${filtered.length === 0 ? `
            <div class="alert-center-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <p>Nema obaveštenja za prikaz</p>
            </div>
          ` : filtered.map(alert => this.renderAlertItem(alert)).join('')}
        </div>
      </div>
    `;
    this.bindEvents();
  }

  renderAlertItem(alert) {
    const typeClasses = {
      critical: 'alert-item-critical',
      warning: 'alert-item-warning',
      info: 'alert-item-info',
      success: 'alert-item-success'
    };

    const typeIcons = {
      critical: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
    };

    return `
      <div class="alert-item ${typeClasses[alert.type]} ${alert.read ? 'read' : 'unread'}" data-id="${alert.id}">
        <div class="alert-item-icon" aria-hidden="true">${typeIcons[alert.type]}</div>
        <div class="alert-item-content">
          <div class="alert-item-header">
            <h4 class="alert-item-title">${ImperiumUtils.escapeHtml(alert.title)}</h4>
            <span class="alert-item-time">${ImperiumUtils.formatRelativeTime(alert.timestamp)}</span>
          </div>
          <p class="alert-item-message">${ImperiumUtils.escapeHtml(alert.message)}</p>
          ${alert.details ? `<p class="alert-item-details">${ImperiumUtils.escapeHtml(alert.details)}</p>` : ''}
        </div>
        <div class="alert-item-actions">
          ${alert.action ? `<button class="btn btn-sm btn-ghost" data-action="alert-action" data-alert-id="${alert.id}">${ImperiumUtils.escapeHtml(alert.action.label)}</button>` : ''}
          ${alert.snoozable ? `<button class="btn btn-sm btn-ghost" data-action="snooze" data-alert-id="${alert.id}" aria-label="Odloži 24h">Odloži</button>` : ''}
          ${alert.dismissible ? `<button class="btn btn-sm btn-ghost" data-action="dismiss" data-alert-id="${alert.id}" aria-label="Zatvori">×</button>` : ''}
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.on('click', '[data-filter]', (e) => {
      this.filter = e.delegateTarget.dataset.filter;
      this.render();
    });

    this.on('click', '[data-action="dismiss"]', (e) => {
      const id = e.delegateTarget.dataset.alertId;
      this.alertBanner?.dismissAlert(id);
      this.render();
    });

    this.on('click', '[data-action="snooze"]', (e) => {
      const id = e.delegateTarget.dataset.alertId;
      this.alertBanner?.snoozeAlert(id, 24);
      this.render();
    });

    this.on('click', '[data-action="alert-action"]', (e) => {
      const id = e.delegateTarget.dataset.alertId;
      const alert = this.alertBanner?.alerts.find(a => a.id === id);
      if (alert?.action?.onClick) {
        alert.action.onClick(alert);
      }
      this.alertBanner?.markAsRead(id);
      this.render();
    });

    this.on('click', '.alert-item', (e) => {
      if (!e.target.closest('button')) {
        const id = e.delegateTarget.dataset.id;
        this.alertBanner?.markAsRead(id);
        this.render();
      }
    });
  }
}