import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';

export class SettingsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.settings;
    this.activeTab = 'general';
    this.settings = null;
    this.passwordChanging = false;
  }

  getDefaultSettings() {
    return {
      general: { storeName: 'DALLI', storeEmail: 'admin@dalli.rs', currency: 'RSD', timezone: 'Europe/Belgrade', language: 'sr', adminLanguage: 'sr' },
      currency: { primary: 'RSD', format: '{amount} {currency}', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.' },
      tax: { pricesIncludeTax: false, taxRates: [{ country: 'RS', rate: 20, name: 'PDV 20%' }] },
      shipping: { zones: [{ name: 'Srbija', countries: ['RS'], rates: [{ name: 'Standardna', cost: 390, freeFrom: 10000 }, { name: 'Brza', cost: 690, freeFrom: 15000 }] }] },
      payments: { cod: true, stripe: false, paypal: false, bankTransfer: true },
      notifications: { email: true, sms: false, push: true, slack: false },
      email: { templates: { orderConfirmation: '', shippingConfirmation: '', orderCancelled: '' } },
      backup: { autoBackup: true, frequency: 'daily', retention: 30, lastRun: '2024-12-15 02:00' },
      markets: {
        active: ['RS'],
        regions: {
          'RS': { name: 'Srbija', currency: 'RSD', language: 'sr', locales: ['sr-RS'], currencySymbol: 'дин.', timezone: 'Europe/Belgrade' },
          'DE': { name: 'Nemacka', currency: 'EUR', language: 'de', locales: ['de-DE'], currencySymbol: '€', timezone: 'Europe/Berlin' },
          'FR': { name: 'Francuska', currency: 'EUR', language: 'fr', locales: ['fr-FR'], currencySymbol: '€', timezone: 'Europe/Paris' },
          'IT': { name: 'Italija', currency: 'EUR', language: 'it', locales: ['it-IT'], currencySymbol: '€', timezone: 'Europe/Rome' },
          'ES': { name: 'Spanija', currency: 'EUR', language: 'es', locales: ['es-ES'], currencySymbol: '€', timezone: 'Europe/Madrid' }
        },
        regionsConfig: {
          'RS': { enabled: true, flag: '🇷🇸', defaultLocale: 'sr-RS' },
          'DE': { enabled: false, flag: '🇩🇪', defaultLocale: 'de-DE' },
          'FR': { enabled: false, flag: '🇫🇷', defaultLocale: 'fr-FR' },
          'IT': { enabled: false, flag: '🇮🇹', defaultLocale: 'it-IT' },
          'ES': { enabled: false, flag: '🇪🇸', defaultLocale: 'es-ES' }
        }
      }
    };
  }

  async onEnter() {
    await this.loadSettings();
    this.applyAdminLanguage(this.getAdminLanguage());
    this.render();
  }

  async loadSettings() {
    try {
      this.settings = await this.api.get();
    } catch (error) {
      console.warn('[Settings] API failed, falling back to default settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  render() {
    this.bindEvents();
    return `
      <div class="settings-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Postavke</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Konfiguracija sistema, integracije i podešavanja.</p>
          </div>
          <button class="btn btn-primary" data-action="save-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 13 13 13 17"/></svg>
            Sačuvaj Sve
          </button>
        </div>

        <div class="settings-tabs" style="border-bottom: 1px solid var(--color-border-primary); margin-bottom: var(--space-5);">
          <button class="tab ${this.activeTab === 'general' ? 'active' : ''}" data-tab="general">Opšte</button>
          <button class="tab ${this.activeTab === 'currency' ? 'active' : ''}" data-tab="currency">Valuta</button>
          <button class="tab ${this.activeTab === 'tax' ? 'active' : ''}" data-tab="tax">Porezi</button>
          <button class="tab ${this.activeTab === 'shipping' ? 'active' : ''}" data-tab="shipping">Dostava</button>
          <button class="tab ${this.activeTab === 'payments' ? 'active' : ''}" data-tab="payments">Plaćanje</button>
          <button class="tab ${this.activeTab === 'notifications' ? 'active' : ''}" data-tab="notifications">Obaveštenja</button>
          <button class="tab ${this.activeTab === 'email' ? 'active' : ''}" data-tab="email">Email Šabloni</button>
          <button class="tab ${this.activeTab === 'backup' ? 'active' : ''}" data-tab="backup">Backup</button>
          <button class="tab ${this.activeTab === 'markets' ? 'active' : ''}" data-tab="markets">Marke i.regije</button>
          <button class="tab ${this.activeTab === 'security' ? 'active' : ''}" data-tab="security">Sigurnost</button>
        </div>

        <div class="tab-panel ${this.activeTab === 'general' ? 'active' : ''}" id="tab-general" style="display: ${this.activeTab === 'general' ? 'block' : 'none'};">
          ${this.renderGeneralSettings()}
        </div>
        <div class="tab-panel ${this.activeTab === 'currency' ? 'active' : ''}" id="tab-currency" style="display: ${this.activeTab === 'currency' ? 'block' : 'none'};">
          ${this.renderCurrencySettings()}
        </div>
        <div class="tab-panel ${this.activeTab === 'tax' ? 'active' : ''}" id="tab-tax" style="display: ${this.activeTab === 'tax' ? 'block' : 'none'};">
          ${this.renderTaxSettings()}
        </div>
        <div class="tab-panel ${this.activeTab === 'shipping' ? 'active' : ''}" id="tab-shipping" style="display: ${this.activeTab === 'shipping' ? 'block' : 'none'};">
          ${this.renderShippingSettings()}
        </div>
        <div class="tab-panel ${this.activeTab === 'payments' ? 'active' : ''}" id="tab-payments" style="display: ${this.activeTab === 'payments' ? 'block' : 'none'};">
          ${this.renderPaymentSettings()}
        </div>
        <div class="tab-panel ${this.activeTab === 'notifications' ? 'active' : ''}" id="tab-notifications" style="display: ${this.activeTab === 'notifications' ? 'block' : 'none'};">
          ${this.renderNotificationSettings()}
        </div>
        <div class="tab-panel ${this.activeTab === 'email' ? 'active' : ''}" id="tab-email" style="display: ${this.activeTab === 'email' ? 'block' : 'none'};">
          ${this.renderEmailSettings()}
        </div>
        <div class="tab-panel ${this.activeTab === 'backup' ? 'active' : ''}" id="tab-backup" style="display: ${this.activeTab === 'backup' ? 'block' : 'none'};">
          ${this.renderBackupSettings()}
        </div>
        <div class="tab-panel ${this.activeTab === 'markets' ? 'active' : ''}" id="tab-markets" style="display: ${this.activeTab === 'markets' ? 'block' : 'none'};">
          ${this.renderMarketsSettings()}
        </div>
        <div class="tab-panel ${this.activeTab === 'security' ? 'active' : ''}" id="tab-security" style="display: ${this.activeTab === 'security' ? 'block' : 'none'};">
          ${this.renderSecuritySettings()}
        </div>
      </div>
    `;
  }

  renderGeneralSettings() {
    const s = this.settings?.general || this.getDefaultSettings().general;
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Osnovne Informacije</h3></div>
          <div class="settings-card-body">
            <form class="settings-form">
              <div class="form-group">
                <label class="input-label">Naziv Prodavnice *</label>
                <input type="text" class="input-field" name="storeName" value="${ImperiumUtils.escapeHtml(s.storeName)}" required>
              </div>
              <div class="form-group">
                <label class="input-label">Email Prodavnice *</label>
                <input type="email" class="input-field" name="storeEmail" value="${ImperiumUtils.escapeHtml(s.storeEmail)}" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="input-label">Valuta</label>
                  <select class="input-field" name="currency">
                    <option value="RSD" ${s.currency === 'RSD' ? 'selected' : ''}>RSD (дин.)</option>
                    <option value="EUR" ${s.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                    <option value="USD" ${s.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="input-label">Vremenska Zona</label>
                  <select class="input-field" name="timezone">
                    <option value="Europe/Belgrade" ${s.timezone === 'Europe/Belgrade' ? 'selected' : ''}>Europe/Belgrade</option>
                    <option value="Europe/Berlin" ${s.timezone === 'Europe/Berlin' ? 'selected' : ''}>Europe/Berlin</option>
                    <option value="Europe/Paris" ${s.timezone === 'Europe/Paris' ? 'selected' : ''}>Europe/Paris</option>
                    <option value="UTC" ${s.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="input-label">Jezik</label>
                <select class="input-field" name="language">
                  <option value="sr" ${s.language === 'sr' ? 'selected' : ''}>Srpski</option>
                  <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option>
                  <option value="de" ${s.language === 'de' ? 'selected' : ''}>Deutsch</option>
                  <option value="ru" ${s.language === 'ru' ? 'selected' : ''}>Русский</option>
                </select>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  renderCurrencySettings() {
    const s = this.settings?.currency || this.getDefaultSettings().currency;
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Format Valute</h3></div>
          <div class="settings-card-body">
            <form class="settings-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="input-label">Primarna Valuta</label>
                  <select class="input-field" name="primary">
                    <option value="RSD" ${s.primary === 'RSD' ? 'selected' : ''}>RSD</option>
                    <option value="EUR" ${s.primary === 'EUR' ? 'selected' : ''}>EUR</option>
                    <option value="USD" ${s.primary === 'USD' ? 'selected' : ''}>USD</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="input-label">Format Prikaza</label>
                  <input type="text" class="input-field" name="format" value="${ImperiumUtils.escapeHtml(s.format)}" placeholder="{amount} {currency}">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="input-label">Broj Decimala</label>
                  <input type="number" class="input-field" name="decimalPlaces" value="${s.decimalPlaces}" min="0" max="4">
                </div>
                <div class="form-group">
                  <label class="input-label">Separator Hiljada</label>
                  <input type="text" class="input-field" name="thousandsSeparator" value="${ImperiumUtils.escapeHtml(s.thousandsSeparator)}" maxlength="1">
                </div>
                <div class="form-group">
                  <label class="input-label">Decimalni Separator</label>
                  <input type="text" class="input-field" name="decimalSeparator" value="${ImperiumUtils.escapeHtml(s.decimalSeparator)}" maxlength="1">
                </div>
              </div>
              <div class="form-group">
                <label class="input-label">Preview</label>
                <div class="currency-preview" style="padding: 12px; background: var(--surface); border-radius: var(--radius-md); border: 1px solid var(--border-color); font-family: monospace; font-size: 1.125rem;">
                  ${this.formatCurrencyPreview(1234567.89, s)}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  formatCurrencyPreview(amount, settings) {
    const parts = amount.toFixed(settings.decimalPlaces).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, settings.thousandsSeparator);
    return parts.join(settings.decimalSeparator) + ' ' + settings.primary;
  }

  renderTaxSettings() {
    const s = this.settings?.tax || this.getDefaultSettings().tax;
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Porezi</h3></div>
          <div class="settings-card-body">
            <form class="settings-form">
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="pricesIncludeTax" ${s.pricesIncludeTax ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  Cene ukljuđuju porez
                </label>
              </div>
              <div class="form-group">
                <label class="input-label">Porezne Stope</label>
                <div id="taxRatesContainer">
                  ${(s.taxRates || []).map((rate, i) => `
                    <div class="tax-rate-row" style="display: flex; gap: 12px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;">
                      <input type="text" class="input-field" name="taxRate_country_${i}" value="${ImperiumUtils.escapeHtml(rate.country)}" placeholder="Zemlja (npr. RS)" style="flex: 1; min-width: 120px;">
                      <input type="number" class="input-field" name="taxRate_rate_${i}" value="${rate.rate}" placeholder="Stopa %" min="0" max="100" step="0.01" style="width: 100px;">
                      <input type="text" class="input-field" name="taxRate_name_${i}" value="${ImperiumUtils.escapeHtml(rate.name)}" placeholder="Naziv (npr. PDV 20%)" style="flex: 1; min-width: 150px;">
                      <button type="button" class="btn btn-ghost btn-sm remove-tax-rate" data-index="${i}" style="color: var(--error);">Obriši</button>
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="addTaxRate">+ Dodaj Poreznu Stopu</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  renderShippingSettings() {
    const s = this.settings?.shipping || this.getDefaultSettings().shipping;
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Zone Dostave</h3></div>
          <div class="settings-card-body">
            <div id="shippingZonesContainer">
              ${(s.zones || []).map((zone, zi) => `
                <div class="shipping-zone" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0;">Zona ${zi + 1}</h4>
                    <button type="button" class="btn btn-ghost btn-sm remove-zone" data-index="${zi}" style="color: var(--error);">Obriši Zonu</button>
                  </div>
                  <div class="form-row" style="margin-bottom: 12px;">
                    <div class="form-group" style="flex: 1;">
                      <label class="input-label">Naziv Zone</label>
                      <input type="text" class="input-field" name="zone_name_${zi}" value="${ImperiumUtils.escapeHtml(zone.name)}" placeholder="Npr. Srbija">
                    </div>
                    <div class="form-group" style="flex: 1;">
                      <label class="input-label">Zemlje (ISO kodovi, zarezom)</label>
                      <input type="text" class="input-field" name="zone_countries_${zi}" value="${(zone.countries || []).join(', ')}" placeholder="RS, BA, ME">
                    </div>
                  </div>
                  <div id="zoneRates_${zi}">
                    ${(zone.rates || []).map((rate, ri) => `
                      <div class="shipping-rate-row" style="display: flex; gap: 12px; margin-bottom: 8px; align-items: center; flex-wrap: wrap;">
                        <input type="text" class="input-field" name="rate_name_${zi}_${ri}" value="${ImperiumUtils.escapeHtml(rate.name)}" placeholder="Naziv tarife" style="flex: 1; min-width: 150px;">
                        <input type="number" class="input-field" name="rate_cost_${zi}_${ri}" value="${rate.cost}" placeholder="Cena (RSD)" min="0" step="10" style="width: 120px;">
                        <input type="number" class="input-field" name="rate_freeFrom_${zi}_${ri}" value="${rate.freeFrom || 0}" placeholder="Besplatno od (RSD)" min="0" step="100" style="width: 150px;">
                        <button type="button" class="btn btn-ghost btn-sm remove-rate" data-zone="${zi}" data-index="${ri}" style="color: var(--error);">Obriši</button>
                      </div>
                    `).join('')}
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm add-rate" data-zone="${zi}">+ Dodaj Tarifu</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="btn btn-primary" id="addShippingZone">+ Dodaj Zonu Dostave</button>
          </div>
        </div>
      </div>
    `;
  }

  renderPaymentSettings() {
    const s = this.settings?.payments || this.getDefaultSettings().payments;
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Načini Plaćanja</h3></div>
          <div class="settings-card-body">
            <form class="settings-form">
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="cod" ${s.cod ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  Plaćanje prilikom preuzimanja (COD)
                </label>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="stripe" ${s.stripe ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  Stripe (kartice)
                </label>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="paypal" ${s.paypal ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  PayPal
                </label>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="bankTransfer" ${s.bankTransfer ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  Bankovni Transfer
                </label>
              </div>
            </form>
          </div>
        </div>
        <div class="settings-card" style="display: ${s.stripe ? 'block' : 'none'}" id="stripeConfig">
          <div class="settings-card-header"><h3 class="settings-card-title">Stripe Konfiguracija</h3></div>
          <div class="settings-card-body">
            <form class="settings-form">
              <div class="form-group">
                <label class="input-label">Publishable Key</label>
                <input type="text" class="input-field" name="stripePublishableKey" placeholder="pk_test_...">
              </div>
              <div class="form-group">
                <label class="input-label">Secret Key</label>
                <input type="password" class="input-field" name="stripeSecretKey" placeholder="sk_test_..." autocomplete="new-password">
              </div>
              <div class="form-group">
                <label class="input-label">Webhook Secret</label>
                <input type="text" class="input-field" name="stripeWebhookSecret" placeholder="whsec_...">
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  renderNotificationSettings() {
    const s = this.settings?.notifications || this.getDefaultSettings().notifications;
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Obaveštenja</h3></div>
          <div class="settings-card-body">
            <form class="settings-form">
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="email" ${s.email ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  Email obaveštenja
                </label>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="sms" ${s.sms ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  SMS obaveštenja
                </label>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="push" ${s.push ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  Push obaveštenja
                </label>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="slack" ${s.slack ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  Slack integracija
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  renderEmailSettings() {
    const s = this.settings?.email || this.getDefaultSettings().email;
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Email Šabloni</h3></div>
          <div class="settings-card-body">
            <form class="settings-form">
              ${Object.entries(s.templates || {}).map(([key, value]) => `
                <div class="form-group">
                  <label class="input-label">${key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</label>
                  <textarea class="input-field" name="email_${key}" rows="4" style="font-family: monospace; font-size: 0.875rem;">${ImperiumUtils.escapeHtml(value || '')}</textarea>
                  <p class="form-hint">Dostupne promenljive: {{order_number}}, {{customer_name}}, {{total}}, {{date}}</p>
                </div>
              `).join('')}
            </form>
          </div>
        </div>
      </div>
    `;
  }

  renderBackupSettings() {
    const s = this.settings?.backup || this.getDefaultSettings().backup;
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Automatski Backup</h3></div>
          <div class="settings-card-body">
            <form class="settings-form">
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="autoBackup" ${s.autoBackup ? 'checked' : ''}>
                  <span class="checkbox-custom"></span>
                  Omogući automatski backup
                </label>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="input-label">Frekvencija</label>
                  <select class="input-field" name="frequency">
                    <option value="daily" ${s.frequency === 'daily' ? 'selected' : ''}>Dnevno</option>
                    <option value="weekly" ${s.frequency === 'weekly' ? 'selected' : ''}>Nedeljno</option>
                    <option value="monthly" ${s.frequency === 'monthly' ? 'selected' : ''}>Mesečno</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="input-label">Čuvanje (dana)</label>
                  <input type="number" class="input-field" name="retention" value="${s.retention}" min="1" max="365">
                </div>
              </div>
              <div class="form-group">
                <label class="input-label">Poslednji Backup</label>
                <input type="text" class="input-field" value="${ImperiumUtils.escapeHtml(s.lastRun)}" readonly style="background: var(--surface);">
              </div>
              <div class="form-actions" style="margin-top: 16px; display: flex; gap: 12px;">
                <button type="button" class="btn btn-primary" data-action="runBackup">Pokreni Backup Sad</button>
                <button type="button" class="btn btn-secondary" data-action="downloadBackup">Preuzmi Poslednji</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  renderMarketsSettings() {
    const s = this.settings?.markets || this.getDefaultSettings().markets;
    const activeMarkets = s.active || [];
    const regions = s.regions || {};
    const regionsConfig = s.regionsConfig || {};
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Aktivne Marke / Regije</h3></div>
          <div class="settings-card-body">
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
              ${Object.keys(regions).map(code => {
                const region = regions[code];
                const config = regionsConfig[code] || {};
                const isActive = activeMarkets.includes(code);
                return `
                  <label style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; border: 1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}; border-radius: var(--radius-md); background: ${isActive ? 'var(--primary-bg)' : 'var(--surface)'}; cursor: pointer; transition: all 0.2s;">
                    <input type="checkbox" name="activeMarkets" value="${code}" ${isActive ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);">
                    <span style="font-size: 1.5rem;">${config.flag || '🏳️'}</span>
                    <span style="font-weight: 500;">${region.name}</span>
                    <span style="font-size: 0.75rem; color: var(--text-tertiary);">(${region.currency})</span>
                  </label>
                `;
              }).join('')}
            </div>
            <p class="form-hint">Samo aktivne marke će biti dostupne kupcima.</p>
          </div>
        </div>
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Konfiguracija Regija</h3></div>
          <div class="settings-card-body">
            <div id="marketsConfigContainer">
              ${Object.entries(regions).map(([code, region]) => {
                const config = regionsConfig[code] || {};
                return `
                  <div class="market-config" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
                    <h4 style="margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;"><span style="font-size: 1.5rem;">${config.flag || '🏳️'}</span> ${region.name} (${code})</h4>
                    <div class="form-row" style="margin-bottom: 12px;">
                      <div class="form-group" style="flex: 1;">
                        <label class="input-label">Valuta</label>
                        <input type="text" class="input-field" name="market_currency_${code}" value="${ImperiumUtils.escapeHtml(region.currency)}" readonly style="background: var(--surface);">
                      </div>
                      <div class="form-group" style="flex: 1;">
                        <label class="input-label">Jezik</label>
                        <input type="text" class="input-field" name="market_language_${code}" value="${ImperiumUtils.escapeHtml(region.language)}" readonly style="background: var(--surface);">
                      </div>
                      <div class="form-group" style="flex: 1;">
                        <label class="input-label">Vremenska Zona</label>
                        <input type="text" class="input-field" name="market_timezone_${code}" value="${ImperiumUtils.escapeHtml(region.timezone)}" readonly style="background: var(--surface);">
                      </div>
                    </div>
                    <div class="form-row" style="margin-bottom: 12px;">
                      <div class="form-group" style="flex: 1;">
                        <label class="input-label">Simbol Valute</label>
                        <input type="text" class="input-field" name="market_symbol_${code}" value="${ImperiumUtils.escapeHtml(region.currencySymbol)}" maxlength="5">
                      </div>
                      <div class="form-group" style="flex: 1;">
                        <label class="input-label">Default Locale</label>
                        <input type="text" class="input-field" name="market_locale_${code}" value="${ImperiumUtils.escapeHtml(config.defaultLocale || '')}" placeholder="sr-RS">
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="checkbox-label">
                        <input type="checkbox" name="market_enabled_${code}" ${config.enabled ? 'checked' : ''}>
                        <span class="checkbox-custom"></span>
                        Omogućena za prodaju
                      </label>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderSecuritySettings() {
    this.bindEvents();
    const s = this.settings?.general || this.getDefaultSettings().general;
    const currentAdminLang = s.adminLanguage || 'sr';
    return `
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Jezik Admin Panela</h3></div>
          <div class="settings-card-body">
            <p style="color: var(--color-text-tertiary); margin-bottom: var(--space-4); font-size: var(--text-sm);">
              Izaberite jezik admin panela. Ova postavka je lična za vaš nalog i ne utiče na ostale administratore niti na javni sajt.
            </p>
            <div class="form-group">
              <label class="input-label">Jezik Admin Panela</label>
              <select class="input-field" name="adminLanguage" id="adminLanguageSelect">
                <option value="sr" ${currentAdminLang === 'sr' ? 'selected' : ''}>Srpski</option>
                <option value="en" ${currentAdminLang === 'en' ? 'selected' : ''}>English</option>
                <option value="de" ${currentAdminLang === 'de' ? 'selected' : ''}>Deutsch</option>
                <option value="ru" ${currentAdminLang === 'ru' ? 'selected' : ''}>Русский</option>
                <option value="tr" ${currentAdminLang === 'tr' ? 'selected' : ''}>Türkçe</option>
                <option value="es" ${currentAdminLang === 'es' ? 'selected' : ''}>Español</option>
                <option value="it" ${currentAdminLang === 'it' ? 'selected' : ''}>Italiano</option>
                <option value="fr" ${currentAdminLang === 'fr' ? 'selected' : ''}>Français</option>
              </select>
            </div>
          </div>
        </div>
        <div class="settings-card">
          <div class="settings-card-header"><h3 class="settings-card-title">Promena Lozinke</h3></div>
          <div class="settings-card-body">
            <p style="color: var(--color-text-tertiary); margin-bottom: var(--space-4); font-size: var(--text-sm);">
              Promena lozinke vašeg naloga. Trenutna lozinka je obavezna za potvrdu identiteta.
            </p>
            <form id="changePasswordForm" class="settings-form" style="max-width: 500px;">
              <div class="form-group">
                <label class="input-label">Trenutna Lozinka *</label>
                <input type="password" class="input-field" name="currentPassword" required autocomplete="current-password" placeholder="Unesite trenutnu lozinku">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="input-label">Nova Lozinka *</label>
                  <input type="password" class="input-field" name="newPassword" required autocomplete="new-password" minlength="8" placeholder="Min. 8 karaktera, velika/mala slova, broj, specijalni">
                  <div class="password-strength" style="margin-top: 8px;">
                    <div class="strength-bar" style="height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden;">
                      <div class="strength-fill" style="height: 100%; width: 0%; background: var(--error); transition: width 0.3s, background 0.3s;"></div>
                    </div>
                    <span class="strength-text" style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 4px; display: block;">Min. 8 karaktera, veliko/malo slovo, broj, specijalni karakter</div>
                  </div>
                </div>
                <div class="form-group">
                  <label class="input-label">Potvrdi Novu Lozinku *</label>
                  <input type="password" class="input-field" name="confirmPassword" required autocomplete="new-password" placeholder="Ponovite novu lozinku">
                  <div class="password-match" style="margin-top: 8px; font-size: 0.75rem; display: none;"></div>
                </div>
              </div>
              <div class="form-actions" style="margin-top: 24px; display: flex; gap: 12px;">
                <button type="submit" class="btn btn-primary" ${this.passwordChanging ? 'disabled' : ''}>
                  ${this.passwordChanging ? '<svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg>' : ''}
                  Sačuvaj Promenu
                </button>
              </div>
            </form>
            <div class="security-info" style="margin-top: 24px; padding: 16px; background: var(--surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <h4 style="margin: 0 0 8px 0; font-size: 0.875rem;">Preporuke za bezbednu lozinku:</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.8;">
                <li>Minimum 8 karaktera</li>
                <li>Kombinacija velikih i malih slova</li>
                <li>Bar jedan broj (0-9)</li>
                <li>Bar jedan specijalni karakter (!@#$%^&*)</li>
                <li>Ne koristite lične informacije (ime, datum rođenja, itd.)</li>
                <li>Ne ponavljajte lozinke sa drugih sajtova</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return { score: Math.min(score, 4) };
  }

  saveAdminLanguage(lang) {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    const key = `imperium_admin_lang_${userId}`;
    localStorage.setItem(key, lang);
    
    // Update settings object
    if (this.settings && this.settings.general) {
      this.settings.general.adminLanguage = lang;
    }
    
    // Apply immediately
    this.applyAdminLanguage(lang);
    
    this.admin.toastContainer?.success(`Jezik admin panela promenjen na: ${this.getLanguageName(lang)}`);
  }

  getCurrentUserId() {
    try {
      const auth = JSON.parse(localStorage.getItem('imperium_auth') || '{}');
      return auth.user?.id || auth.id || null;
    } catch {
      return null;
    }
  }

  getAdminLanguage() {
    const userId = this.getCurrentUserId();
    if (!userId) return 'sr';
    return localStorage.getItem(`imperium_admin_lang_${userId}`) || 'sr';
  }

  applyAdminLanguage(lang) {
    // Apply to document for immediate effect
    document.documentElement.lang = lang;
    // Could also trigger i18n update here if needed
    document.documentElement.setAttribute('data-admin-lang', lang);
  }

  getLanguageName(code) {
    const names = {
      'sr': 'Srpski',
      'en': 'English',
      'de': 'Deutsch',
      'ru': 'Русский',
      'tr': 'Türkçe',
      'es': 'Español',
      'it': 'Italiano',
      'fr': 'Français'
    };
    return names[code] || code;
  }

  calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return { score: Math.min(score, 4) };
  }

  

  bindEvents() {
    this.on('click', '.tab[data-tab]', (e) => {
      this.activeTab = e.delegateTarget.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this.activeTab));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + this.activeTab));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = p.id === 'tab-' + this.activeTab ? 'block' : 'none');
    });

    this.on('click', '[data-action="save-all"]', () => {
      this.admin.toastContainer.success('Sve postavke sačuvane');
    });

    // Password strength meter
    this.on('input', 'input[name="newPassword"]', (e) => {
      const password = e.target.value;
      const strength = this.calculatePasswordStrength(password);
      const fill = e.target.closest('.form-group').querySelector('.strength-fill');
      if (fill) {
        fill.style.width = `${strength.score * 25}%`;
        fill.style.background = ['var(--error)', 'var(--error)', 'var(--accent-warning)', 'var(--success)'][strength.score - 1] || 'var(--error)';
      }
    });

    // Password match indicator
    this.on('input', 'input[name="confirmPassword"]', (e) => {
      const newPass = e.target.closest('form').querySelector('input[name="newPassword"]')?.value;
      const confirm = e.target.value;
      const matchEl = e.target.closest('.form-group').querySelector('.password-match');
      if (matchEl) {
        if (e.target.value.length === 0) {
          matchEl.style.display = 'none';
        } else if (e.target.value === newPass) {
          matchEl.textContent = '✅ Lozinke se poklapaju';
          matchEl.style.color = 'var(--success)';
          matchEl.style.display = 'block';
        } else {
          matchEl.textContent = '❌ Lozinke se ne poklapaju';
          matchEl.style.color = 'var(--error)';
          matchEl.style.display = 'block';
        }
      }
    });

    // Admin language selector change
    this.on('change', '#adminLanguageSelect', (e) => {
      const lang = e.target.value;
      this.saveAdminLanguage(lang);
    });

    // Password change form submit
    this.on('submit', '#changePasswordForm', async (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      if (data.newPassword !== data.confirmPassword) {
        this.admin.toastContainer?.error('Lozinke se ne poklapaju');
        return;
      }

      if (data.newPassword.length < 8) {
        this.admin.toastContainer?.error('Nova lozinka mora imati minimum 8 karaktera');
        return;
      }

      if (!/[A-Z]/.test(data.newPassword) || !/[a-z]/.test(data.newPassword) || !/[0-9]/.test(data.newPassword) || !/[^A-Za-z0-9]/.test(data.newPassword)) {
        this.admin.toastContainer?.error('Nova lozinka mora sadržati: veliko slovo, malo slovo, broj, specijalni karakter');
        return;
      }

      if (data.currentPassword === data.newPassword) {
        this.admin.toastContainer?.error('Nova lozinka ne sme biti ista kao trenutna');
        return;
      }

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg> Menjam...';

      try {
        const auth = window.AuthManager;
        if (!auth || !auth.changePassword) {
          throw new Error('AuthManager nije dostupan');
        }

        const result = await auth.changePassword(data.currentPassword, data.newPassword);
        
        if (result.success) {
          this.admin.toastContainer?.success('Lozinka uspešno promenjena');
          e.target.reset();
        } else {
          this.admin.toastContainer?.error(result.error || 'Greška pri promeni lozinke');
        }
      } catch (error) {
        this.admin.toastContainer?.error(error.message || 'Greška pri promeni lozinke');
      } finally {
        this.render(); // Re-render to reset button state
      }
    });
  }
}