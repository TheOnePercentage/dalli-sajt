import experienceApi from '../../../js/experience/experience-api.js';
import {
  OWNER_ONLY_ACTIONS,
  SECTION_KEYS,
  THEME_CATALOG,
  createDefaultConfig,
  getPublicSlice,
} from '../../../js/experience/experience-config.js';
import { ExperiencePermissions } from '../../../js/experience/experience-permissions.js';
import { experienceStore } from '../../../js/experience/experience-store.js';
import { Component } from '../core/component.js';
import { SectionAPI } from '../services/integration.js';
import { ImperiumUtils } from '../utils/helpers.js';

const esc = v => ImperiumUtils.escapeHtml(v === null || v === undefined ? '' : String(v));

async function fetchJsonSafe(url, fallback) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return fallback;
    const json = await res.json();
    return json === undefined ? fallback : json;
  } catch (err) {
    return fallback;
  }
}

function field(label, name, value, disabled = '', type = 'text') {
  return `<div class="form-group"><label class="input-label">${esc(label)}</label><input class="input-field" type="${type}" name="${name}" value="${esc(value)}" ${disabled}></div>`;
}

function fieldArea(label, name, value, disabled = '', rows = 3) {
  return `<div class="form-group"><label class="input-label">${esc(label)}</label><textarea class="input-field textarea-field" rows="${rows}" name="${name}" ${disabled}>${esc(value)}</textarea></div>`;
}

function toCsv(obj) {
  const lines = ['field,value'];
  const walk = (prefix, node) => {
    if (node && typeof node === 'object') {
      Object.entries(node).forEach(([k, v]) => walk(prefix ? `${prefix}.${k}` : k, v));
    } else {
      lines.push(
        `${JSON.stringify(prefix)},${JSON.stringify(node === null || node === undefined ? '' : node)}`
      );
    }
  };
  walk('', obj);
  return lines.join('\n');
}

function downloadFile(name, content, type) {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.warn('[ExperienceOS] Export failed:', err);
  }
}

export const EC_GROUPS = [
  { id: 'control', label: 'Kontrolna tabla' },
  { id: 'brand', label: 'Brand i imovina' },
  { id: 'experience', label: 'Iskustvo i sadržaj' },
  { id: 'communication', label: 'Komunikacija' },
  { id: 'finance', label: 'Prodaja i finansije' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'operations', label: 'Operacije' },
  { id: 'infrastructure', label: 'Infrastruktura' },
  { id: 'system', label: 'Sistem' },
  { id: 'core', label: 'Core platforma (read-only)' },
];

const EC_TABS = [
  { id: 'os', label: 'Owner Dashboard', icon: '🛰️', owned: true, group: 'control' },
  { id: 'executive', label: 'Executive Command Center', icon: '📊', owned: true, group: 'control' },
  { id: 'brandIdentity', label: 'Brand podaci', icon: '🏷️', owned: true, group: 'brand' },
  { id: 'assets', label: 'Imovina i logoi', icon: '🖼️', owned: true, group: 'brand' },
  { id: 'domains', label: 'Domeni', icon: '🌐', owned: true, group: 'brand' },
  { id: 'brand', label: 'Brand Story', icon: '🏛️', owned: true, group: 'experience' },
  { id: 'themes', label: 'Teme', icon: '🎨', owned: true, group: 'experience' },
  { id: 'hero', label: 'Hero', icon: '🏛️', owned: true, group: 'experience' },
  { id: 'collections', label: 'Kolekcije', icon: '🗂️', owned: true, group: 'experience' },
  { id: 'ai', label: 'AI', icon: '🤖', owned: true, group: 'experience' },
  { id: 'community', label: 'Zajednica', icon: '👥', owned: true, group: 'experience' },
  { id: 'luxury', label: 'Luxury Mode', icon: '💎', owned: true, group: 'experience' },
  { id: 'editorial', label: 'Editorial Mode', icon: '📰', owned: true, group: 'experience' },
  { id: 'trust', label: 'Trust Blocks', icon: '🛡️', owned: true, group: 'experience' },
  { id: 'journal', label: 'Journal', icon: '📖', owned: true, group: 'experience' },
  { id: 'craftsmanship', label: 'Zanatstvo', icon: '✂️', owned: true, group: 'experience' },
  { id: 'materials', label: 'Materijali', icon: '🧵', owned: true, group: 'experience' },
  { id: 'video', label: 'Video', icon: '🎬', owned: true, group: 'experience' },
  { id: 'outfits', label: 'Outfit Engine', icon: '👔', owned: true, group: 'experience' },
  { id: 'membership', label: 'Membership Center', icon: '👑', owned: true, group: 'experience' },
  { id: 'immersive', label: 'Immersive Experience', icon: '🌌', owned: true, group: 'experience' },
  { id: 'global', label: 'Global Expansion Center', icon: '🌍', owned: true, group: 'experience' },
  { id: 'concierge', label: 'Luxury Concierge', icon: '🤵', owned: true, group: 'experience' },
  {
    id: 'communication',
    label: 'E-mail i telefoni',
    icon: '✉️',
    owned: true,
    group: 'communication',
  },
  { id: 'social', label: 'Društvene mreže', icon: '📱', owned: true, group: 'communication' },
  {
    id: 'integrations',
    label: 'API i kredencijali',
    icon: '🔑',
    owned: true,
    group: 'communication',
  },
  {
    id: 'paymentIncentives',
    label: 'Payment Incentives',
    icon: '💳',
    owned: true,
    group: 'commerce',
  },
  { id: 'payments', label: 'Plaćanje', icon: '💳', owned: true, group: 'finance' },
  { id: 'finance', label: 'Finansije', icon: '💰', owned: true, group: 'finance' },
  { id: 'treasury', label: 'Trezor i usklađivanje', icon: '⚖️', owned: true, group: 'finance' },
  { id: 'reports', label: 'Izveštaji', icon: '📊', owned: true, group: 'finance' },
  { id: 'maintenance', label: 'Održavanje', icon: '🔧', owned: true, group: 'operations' },
  { id: 'operations', label: 'Operacije', icon: '🚦', owned: true, group: 'operations' },
  { id: 'shipping', label: 'Dostava i kuriri', icon: '🚚', owned: true, group: 'operations' },
  { id: 'api', label: 'API Center', icon: '🔌', owned: true, group: 'operations' },
  { id: 'employee', label: 'Employee Center', icon: '👥', owned: true, group: 'operations' },
  { id: 'fraud', label: 'Fraud & Risk Engine', icon: '🛡️', owned: true, group: 'operations' },
  { id: 'stores', label: 'Prodavnice', icon: '🏬', owned: true, group: 'infrastructure' },
  { id: 'warehouses', label: 'Skladišta', icon: '📦', owned: true, group: 'infrastructure' },
  { id: 'omnichannel', label: 'Omnichannel Control Center', icon: '🔄', owned: true, group: 'infrastructure' },
  {
    id: 'products',
    label: 'Vidljivost proizvoda',
    icon: '👕',
    owned: true,
    group: 'operations',
  },
  {
    id: 'permissions',
    label: 'Dozvole',
    icon: '🛡️',
    owned: false,
    readonly: true,
    group: 'system',
  },
  { id: 'promotions', label: 'Promocije', icon: '🏷️', owned: false, core: true, group: 'core' },
  { id: 'campaigns', label: 'Kampanje', icon: '📣', owned: false, core: true, group: 'core' },
  { id: 'seo', label: 'SEO', icon: '🔍', owned: false, core: true, group: 'core' },
  { id: 'analytics', label: 'Analitika', icon: '📊', owned: false, core: true, group: 'core' },
];

// Credential schemas for the "API i kredencijali" tab. Each provider lists the
// fields the owner copies from the platform's developer/app dashboard. Multiple
// accounts per provider are supported — add as many rows as you have.
const SOCIAL_PROVIDERS = {
  instagram: {
    label: 'Instagram (Meta Graph API)',
    hint: 'Graph API app + dugoročni access token za Business nalog.',
    fields: [
      { key: 'appId', label: 'App ID' },
      { key: 'appSecret', label: 'App Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', secret: true },
      { key: 'businessAccountId', label: 'Business Account ID' },
      { key: 'pageId', label: 'Facebook Page ID' },
    ],
  },
  facebook: {
    label: 'Facebook (Meta Graph)',
    fields: [
      { key: 'appId', label: 'App ID' },
      { key: 'appSecret', label: 'App Secret', secret: true },
      { key: 'accessToken', label: 'Page Access Token', secret: true },
      { key: 'pageId', label: 'Page ID' },
      { key: 'businessId', label: 'Business Manager ID' },
    ],
  },
  tiktok: {
    label: 'TikTok',
    fields: [
      { key: 'clientKey', label: 'Client Key' },
      { key: 'clientSecret', label: 'Client Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', secret: true },
      { key: 'advertiserId', label: 'Advertiser ID' },
    ],
  },
  youtube: {
    label: 'YouTube (Google)',
    fields: [
      { key: 'apiKey', label: 'API Key', secret: true },
      { key: 'clientId', label: 'OAuth Client ID' },
      { key: 'clientSecret', label: 'OAuth Client Secret', secret: true },
      { key: 'refreshToken', label: 'Refresh Token', secret: true },
      { key: 'channelId', label: 'Channel ID' },
    ],
  },
  pinterest: {
    label: 'Pinterest',
    fields: [
      { key: 'appId', label: 'App ID' },
      { key: 'appSecret', label: 'App Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', secret: true },
    ],
  },
  linkedin: {
    label: 'LinkedIn',
    fields: [
      { key: 'clientId', label: 'Client ID' },
      { key: 'clientSecret', label: 'Client Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', secret: true },
      { key: 'organizationId', label: 'Organization ID' },
    ],
  },
  x: {
    label: 'X (Twitter)',
    fields: [
      { key: 'apiKey', label: 'API Key' },
      { key: 'apiSecret', label: 'API Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', secret: true },
      { key: 'accessTokenSecret', label: 'Access Token Secret', secret: true },
    ],
  },
  threads: {
    label: 'Threads',
    fields: [
      { key: 'appId', label: 'App ID' },
      { key: 'appSecret', label: 'App Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', secret: true },
    ],
  },
};

const AD_PROVIDERS = {
  google: {
    label: 'Google Ads',
    hint: 'Developer token + OAuth kredencijali Google Ads API-ja.',
    fields: [
      { key: 'developerToken', label: 'Developer Token', secret: true },
      { key: 'clientId', label: 'OAuth Client ID' },
      { key: 'clientSecret', label: 'OAuth Client Secret', secret: true },
      { key: 'refreshToken', label: 'Refresh Token', secret: true },
      { key: 'loginCustomerId', label: 'Login Customer ID (MCC)' },
      { key: 'customerId', label: 'Customer ID' },
    ],
  },
  meta: {
    label: 'Meta Ads',
    hint: 'Marketing API — app + access token + ad account.',
    fields: [
      { key: 'appId', label: 'App ID' },
      { key: 'appSecret', label: 'App Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', secret: true },
      { key: 'adAccountId', label: 'Ad Account ID (act_...)' },
      { key: 'pixelId', label: 'Pixel ID' },
    ],
  },
  tiktok: {
    label: 'TikTok Ads',
    fields: [
      { key: 'appId', label: 'App ID' },
      { key: 'secret', label: 'Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', secret: true },
      { key: 'advertiserId', label: 'Advertiser ID' },
      { key: 'pixelId', label: 'Pixel ID' },
    ],
  },
};

const ASSET_POSITIONS = [
  {
    key: 'headerLogo',
    label: 'Header logo',
    rec: '320×80',
    min: '120×30',
    max: '640×160',
    formats: 'SVG, PNG, WebP',
  },
  {
    key: 'footerLogo',
    label: 'Footer logo',
    rec: '320×80',
    min: '120×30',
    max: '640×160',
    formats: 'SVG, PNG, WebP',
  },
  {
    key: 'mobileLogo',
    label: 'Mobile logo',
    rec: '160×40',
    min: '80×20',
    max: '320×80',
    formats: 'SVG, PNG, WebP',
  },
  {
    key: 'darkLogo',
    label: 'Dark logo',
    rec: '320×80',
    min: '120×30',
    max: '640×160',
    formats: 'SVG, PNG, WebP',
  },
  {
    key: 'lightLogo',
    label: 'Light logo',
    rec: '320×80',
    min: '120×30',
    max: '640×160',
    formats: 'SVG, PNG, WebP',
  },
  {
    key: 'wordmarkLogo',
    label: 'Wordmark',
    rec: '480×120',
    min: '200×50',
    max: '960×240',
    formats: 'SVG, PNG',
  },
  {
    key: 'iconLogo',
    label: 'Icon logo',
    rec: '64×64',
    min: '32×32',
    max: '256×256',
    formats: 'SVG, PNG',
  },
  {
    key: 'favicon',
    label: 'Favicon',
    rec: '32×32',
    min: '16×16',
    max: '64×64',
    formats: 'ICO, PNG, SVG',
  },
  {
    key: 'appIcon',
    label: 'App icon',
    rec: '512×512',
    min: '192×192',
    max: '1024×1024',
    formats: 'PNG',
  },
  {
    key: 'ogLogo',
    label: 'OpenGraph logo',
    rec: '1200×630',
    min: '600×315',
    max: '2400×1260',
    formats: 'PNG, JPG',
  },
  {
    key: 'socialLogo',
    label: 'Social preview',
    rec: '1200×630',
    min: '600×315',
    max: '2400×1260',
    formats: 'PNG, JPG',
  },
];

const EMAIL_ROLES = [
  'orders',
  'marketing',
  'membership',
  'vip',
  'support',
  'returns',
  'finance',
  'operations',
];
const PHONE_KINDS = ['primary', 'secondary', 'vip', 'store', 'regional'];
const SOCIAL_SCOPES = ['global', 'casual', 'elegance', 'country', 'collection'];
const REPORT_PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
const EXPORT_FORMATS = ['pdf', 'excel', 'csv', 'json'];

export class ExperienceCenterSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.t = this.admin?.t || (k => k);
    this.activeTab = 'os';
    this.config = createDefaultConfig();
    this.loading = false;
    this.error = null;
    this.saving = false;
    this.themeActionLoading = null;
    this.adSpend = [];
    this.adSpendLoading = false;
    this.socialMetrics = null;
    this.socialMetricsLoading = false;
    this.marketingError = null;
    this.unsubscribe = null;
    this.live = {
      shipping: null,
      brand: null,
      payments: null,
      locations: null,
      countries: null,
      currencies: null,
    };
    this.osStats = null;
  }

  async onEnter() {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = experienceStore.subscribe(() => {
      this.config = experienceStore.getState();
      if (this.mounted) this.update();
    });

    await Promise.all([this.loadConfig(), this.loadLiveData(), this.loadProductVisibilityData()]);
    this.loadOsStats();
    this.render();
  }

  async loadLiveData() {
    const [shipping, brand, payments, locations, countries, currencies] = await Promise.all([
      fetchJsonSafe('/data/shipping.json', null),
      fetchJsonSafe('/data/brand.json', null),
      fetchJsonSafe('/data/payments.json', null),
      fetchJsonSafe('/data/locations.json', null),
      fetchJsonSafe('/data/countries.json', null),
      fetchJsonSafe('/data/currencies.json', null),
    ]);
    this.live = { shipping, brand, payments, locations, countries, currencies };
  }

  async loadProductVisibilityData() {
    try {
      const [catalog, overlayRes] = await Promise.all([
        fetchJsonSafe('/data/products.json', { products: [] }),
        fetch('/api/v1/admin/products-visibility', {
          headers: { Accept: 'application/json', 'X-Admin-Role': this.getRole() || 'admin' },
        })
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      this.productCatalog = Array.isArray(catalog && catalog.products) ? catalog.products : [];
      this.productVisibility = (overlayRes && overlayRes.overrides) || {};
    } catch (err) {
      this.productCatalog = this.productCatalog || [];
      this.productVisibility = this.productVisibility || {};
    }
  }

  async saveProductVisibility(id, status) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Admin-Role': this.getRole() || 'admin',
    };
    try {
      const raw =
        localStorage.getItem('dalli_admin_auth') || sessionStorage.getItem('dalli_admin_auth');
      if (raw) {
        const token = JSON.parse(raw).token;
        if (token) headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // ignore
    }
    const res = await fetch(`/api/v1/admin/products-visibility/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Visibility save failed');
    return res.json();
  }

  productStatusBadge(status) {
    const map = {
      published: ['badge-success', 'Objavljen'],
      hidden: ['badge-warning', 'Sakriven (main page)'],
      archived: ['badge-danger', 'Arhiviran'],
    };
    const [cls, label] = map[status] || map.published;
    return `<span class="badge ${cls}">${label}</span>`;
  }

  loadOsStats() {
    try {
      const products = Array.isArray(this.admin?.sections?.get?.('products'))
        ? this.admin.sections.get('products')
        : null;
      this.osStats = { products: products ? products.length : null };
    } catch (err) {
      this.osStats = null;
    }
  }

  root() {
    return this.element || document;
  }

  rows(selector) {
    return Array.from(this.root().querySelectorAll(selector));
  }

  rowValue(row, name) {
    const el = row.querySelector(`[name="${name}"]`);
    return el ? String(el.value || '').trim() : '';
  }

  rowChecked(row, name) {
    const el = row.querySelector(`[name="${name}"]`);
    return el ? el.checked : false;
  }

  rowValues(row, name) {
    return Array.from(row.querySelectorAll(`[name="${name}"]:checked`)).map(e => e.value);
  }

  toast(kind, message) {
    const tc = this.admin?.toastContainer;
    if (kind === 'error') tc?.error?.(message);
    else if (kind === 'warning') tc?.warning?.(message);
    else tc?.success?.(message);
  }

  async submitSection(key, data, successMessage) {
    const r = await this.saveSection(key, data);
    if (!r.ok) this.toast('error', r.error || 'Greška pri čuvanju');
    else if (successMessage) this.toast('success', successMessage);
    return r;
  }

  onLeave() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async loadConfig() {
    this.loading = true;
    this.error = null;
    try {
      const cfg = await experienceApi.getConfig();
      if (cfg) {
        experienceStore.applyServer(cfg);
        this.config = experienceStore.getState();
      } else {
        this.config = experienceStore.getState();
      }
    } catch (err) {
      console.warn('[ExperienceCenter] Failed to load config:', err);
      this.error = err.message || 'Greška pri učitavanju';
      this.config = experienceStore.getState();
    } finally {
      this.loading = false;
    }
  }

  canManage() {
    return ExperiencePermissions.canManageExperience();
  }

  isOwner() {
    return ExperiencePermissions.isOwner();
  }

  getRole() {
    return ExperiencePermissions.getRoleHeader();
  }

  async saveSection(sectionKey, data) {
    if (!SECTION_KEYS.includes(sectionKey)) return { ok: false, error: 'Nepoznata sekcija' };
    if (!this.canManage()) return { ok: false, error: 'Nedovoljna dozvola' };
    this.saving = true;
    try {
      const res = await experienceApi.saveSection(sectionKey, data);
      if (res?.config) {
        experienceStore.applyServer(res.config);
        this.config = experienceStore.getState();
      }
      return { ok: true, res };
    } catch (err) {
      // Local-first fallback: persist through the shared store when the
      // Netlify function is unavailable (static/local deployment).
      const local = experienceStore.updateSection(sectionKey, data, this.getRole());
      if (local.success) {
        this.config = experienceStore.getState();
        return { ok: true, local: true };
      }
      return { ok: false, error: local.error || err.message };
    } finally {
      this.saving = false;
      if (this.mounted) this.update();
    }
  }

  async runThemeAction(action, payload = {}) {
    if (!OWNER_ONLY_ACTIONS.includes(action)) return { ok: false, error: 'Akcija nije dozvoljena' };
    if (!this.isOwner()) return { ok: false, error: 'Samo vlasnik može izvršiti ovu akciju' };
    this.themeActionLoading = action;
    try {
      const res = await experienceApi.runThemeAction(action, payload);
      if (res?.config) {
        experienceStore.applyServer(res.config);
        this.config = experienceStore.getState();
      }
      return { ok: true, res };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      this.themeActionLoading = null;
      if (this.mounted) this.update();
    }
  }

  bindEvents() {
    super.bindEvents();

    this.on('click', '[data-ec-tab]', e => {
      const id = e.delegateTarget.dataset.ecTab;
      if (id && id !== this.activeTab) {
        this.activeTab = id;
        this.update();
        if (id === 'integrations') {
          this.loadAdSpend();
          this.loadSocialMetrics();
        }
      }
    });

    this.on('click', '[data-ec-load-socialmetrics]', () => this.loadSocialMetrics(true));

    this.on('click', '[data-ec-remove-adspend]', e => {
      this.removeAdSpend(e.delegateTarget.dataset.ecRemoveAdspend);
    });

    this.on('submit', '[data-ec-form="adspend"]', async e => {
      e.preventDefault();
      await this.submitAdSpend();
    });

    this.on('change', '[data-theme-select]', async e => {
      const themeId = e.target.value;
      if (!themeId || themeId === this.config.activeThemeId) return;
      const r = await this.runThemeAction('activateTheme', { themeId });
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška pri aktivaciji teme');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Tema aktivirana');
    });

    this.on('click', '[data-theme-activate]', async e => {
      const themeId = e.delegateTarget.dataset.themeActivate;
      if (!themeId) return;
      const r = await this.runThemeAction('activateTheme', { themeId });
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Tema aktivirana');
    });

    this.on('click', '[data-theme-rollback]', async () => {
      const r = await this.runThemeAction('rollbackTheme', {});
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Vraćeno na prethodnu temu');
    });

    this.on('click', '[data-theme-cancel-schedule]', async () => {
      const r = await this.runThemeAction('cancelScheduledTheme', {});
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Zakazivanje otkazano');
    });
    this.on('click', '[data-theme-preview]', async e => {
      const themeId = e.delegateTarget.dataset.themePreview;
      if (!themeId) return;
      const r = await this.runThemeAction('previewTheme', { themeId });
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Preview aktiviran - pregled u toku');
    });

    this.on('click', '[data-theme-cancel-preview]', async () => {
      const r = await this.runThemeAction('cancelPreview', {});
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Preview uklonjen');
    });

    this.on('submit', '[data-ec-form="schedule-theme"]', async e => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const themeId = fd.get('themeId');
      const startAt = fd.get('startAt');
      const endAt = fd.get('endAt');
      const r = await this.runThemeAction('scheduleTheme', {
        themeId,
        startAt,
        endAt: endAt || null,
      });
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Tema zakazana');
      form.reset();
    });

    this.on('submit', '[data-ec-form="hero"]', async e => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const data = {
        title: fd.get('title') || '',
        subtitle: fd.get('subtitle') || '',
        ctaText: fd.get('ctaText') || '',
        ctaUrl: fd.get('ctaUrl') || '',
        imageUrl: fd.get('imageUrl') || '',
        imageAlt: fd.get('imageAlt') || '',
        enabled: fd.get('enabled') === 'on',
      };
      const r = await this.saveSection('hero', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Hero sačuvan');
    });

    this.on('submit', '[data-ec-form="maintenance"]', async e => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const data = {
        enabled: fd.get('enabled') === 'on',
        message: fd.get('message') || '',
        allowedPaths: (fd.get('allowedPaths') || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        countdownEnabled: fd.get('countdownEnabled') === 'on',
        targetAt: fd.get('countdownTo') || fd.get('targetAt') || null,
      };
      const r = await this.saveSection('maintenance', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Podešavanja održavanja sačuvana');
    });

    this.on('submit', '[data-ec-form="luxury"]', async e => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const data = {
        enabled: fd.get('enabled') === 'on',
        mode: fd.get('mode') || 'subtle',
        animationIntensity: Number(fd.get('animationIntensity') || 0.5),
        goldAccent: fd.get('goldAccent') === 'on',
        parallax: fd.get('parallax') === 'on',
      };
      const r = await this.saveSection('luxury', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Luxury Mode sačuvan');
    });

    this.on('submit', '[data-ec-form="collections"]', async e => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const items = (fd.get('items') || '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
      const r = await this.saveSection('collections', { items });
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Kolekcije sačuvane');
    });

    this.on('submit', '[data-ec-form="payments"]', async e => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const data = {
        showApplePay: fd.get('showApplePay') === 'on',
        showGooglePay: fd.get('showGooglePay') === 'on',
        showStripe: fd.get('showStripe') === 'on',
        showPayPal: fd.get('showPayPal') === 'on',
        installmentText: fd.get('installmentText') || '',
        cryptoShippingPaid: fd.get('cryptoShippingPaid') === 'on',
      };
      const r = await this.saveSection('payments', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Plaćanje sačuvano');
    });

    this.on('submit', '[data-ec-form="ai"]', async e => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const data = {
        enabled: fd.get('enabled') === 'on',
        model: fd.get('model') || 'gpt-4o-mini',
        temperature: Number(fd.get('temperature') || 0.7),
        maxTokens: Number(fd.get('maxTokens') || 500),
      };
      const r = await this.saveSection('ai', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('AI podešavanja sačuvana');
    });

    this.on('submit', '[data-ec-form="community"]', async e => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const data = {
        enabled: fd.get('enabled') === 'on',
        showUGC: fd.get('showUGC') === 'on',
        hashtag: fd.get('hashtag') || '',
      };
      const r = await this.saveSection('community', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Zajednica sačuvana');
    });

    this.on('submit', '[data-ec-form="editorial"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        enabled: fd.get('enabled') === 'on',
        reducePromotions: fd.get('reducePromotions') === 'on',
        largerStorySections: fd.get('largerStorySections') === 'on',
        moreBrandContent: fd.get('moreBrandContent') === 'on',
        moreCollectionPresentation: fd.get('moreCollectionPresentation') === 'on',
        hideSaleBadges: fd.get('hideSaleBadges') === 'on',
        showEditorialNote: fd.get('showEditorialNote') === 'on',
      };
      const r = await this.saveSection('editorial', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Editorial Mode sačuvan');
    });

    this.on('submit', '[data-ec-form="brand"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {};
      [
        'story',
        'philosophy',
        'mission',
        'values',
        'sustainability',
        'heritage',
        'futureVision',
        'founderMessage',
        'brandManifesto',
        'sustainabilityMessage',
        'luxuryValues',
      ].forEach(k => {
        data[k] = { enabled: fd.get(k) === 'on' };
      });
      const r = await this.saveSection('brand', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Brand Story sačuvan');
    });

    this.on('submit', '[data-ec-form="trust"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        enabled: fd.get('enabled') === 'on',
        blocks: {},
      };
      [
        'premium-materials',
        'hand-finished',
        'limited-production',
        'sustainability',
        'ethical-manufacturing',
        'lifetime-quality',
      ].forEach(k => {
        data.blocks[k] = fd.get('block-' + k) === 'on';
      });
      const r = await this.saveSection('trust', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Trust Blocks sačuvani');
    });

    this.on('submit', '[data-ec-form="journal"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        enabled: fd.get('enabled') === 'on',
        showEditorialNote: fd.get('showEditorialNote') === 'on',
        categories: {},
      };
      [
        'style-guides',
        'fashion-intelligence',
        'collections',
        'lifestyle',
        'product-care',
        'materials',
        'editorial',
      ].forEach(k => {
        data.categories[k] = fd.get('cat-' + k) === 'on';
      });
      const r = await this.saveSection('journal', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Journal sačuvan');
    });

    this.on('submit', '[data-ec-form="craftsmanship"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        enabled: fd.get('enabled') === 'on',
        sections: {},
      };
      [
        'manufacturing',
        'designProcess',
        'qualityStandards',
        'garmentConstruction',
        'materialSelection',
      ].forEach(k => {
        data.sections[k] = fd.get('sec-' + k) === 'on';
      });
      const r = await this.saveSection('craftsmanship', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Zanatstvo sačuvano');
    });

    this.on('submit', '[data-ec-form="materials"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const allMats = [
        'organic-cotton',
        'premium-cotton',
        'french-terry',
        'brushed-fleece',
        'linen-blend',
        'merino-wool',
        'future-materials',
      ];
      const visible = allMats.filter(k => fd.get('mat-' + k) === 'on');
      const data = { enabled: fd.get('enabled') === 'on', visible };
      const r = await this.saveSection('materials', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Materijali sačuvani');
    });

    this.on('submit', '[data-ec-form="video"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        enabled: fd.get('enabled') === 'on',
        lazyLoad: fd.get('lazyLoad') === 'on',
        preload: fd.get('preload') || 'none',
        maxConcurrent: Number(fd.get('maxConcurrent') || 1),
      };
      const r = await this.saveSection('video', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Video podešavanja sačuvana');
    });

    this.on('submit', '[data-ec-form="outfits"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        enabled: fd.get('enabled') === 'on',
        lookRecommendations: fd.get('lookRecommendations') === 'on',
        styleRecommendations: fd.get('styleRecommendations') === 'on',
        luxuryStylingMode: fd.get('luxuryStylingMode') === 'on',
        completeTheLook: fd.get('completeTheLook') === 'on',
        lookOfTheWeek: fd.get('lookOfTheWeek') === 'on',
      };
      const r = await this.saveSection('outfits', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Outfit Engine sačuvan');
    });

    this.on('submit', '[data-ec-form="membership"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        enabled: fd.get('enabled') === 'on',
        earlyAccessEngine: fd.get('earlyAccessEngine') === 'on',
        exclusiveCollections: fd.get('exclusiveCollections') === 'on',
        vipDashboard: fd.get('vipDashboard') === 'on',
        privateClientProgram: fd.get('privateClientProgram') === 'on',
        invitationSystem: fd.get('invitationSystem') === 'on',
        limitedEditionEngine: fd.get('limitedEditionEngine') === 'on',
      };
      const r = await this.saveSection('membership', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Membership Center sačuvan');
    });

    this.on('submit', '[data-ec-form="immersive"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        enabled: fd.get('enabled') === 'on',
        collectionWorlds: fd.get('collectionWorlds') === 'on',
        signatureMoments: fd.get('signatureMoments') === 'on',
        editorialExperience: fd.get('editorialExperience') === 'on',
        luxuryJourneySystem: fd.get('luxuryJourneySystem') === 'on',
        cinematicCollections: fd.get('cinematicCollections') === 'on',
        microInteractions: fd.get('microInteractions') === 'on',
      };
      const r = await this.saveSection('immersive', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Immersive Experience sačuvan');
    });

    this.on('submit', '[data-ec-form="global"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        enabled: fd.get('enabled') === 'on',
        countryActivation: fd.get('countryActivation') === 'on',
        regionalPricing: fd.get('regionalPricing') === 'on',
        regionalSEO: fd.get('regionalSEO') === 'on',
        regionalCollections: fd.get('regionalCollections') === 'on',
        multiCurrency: fd.get('multiCurrency') === 'on',
        regionalPersonalization: fd.get('regionalPersonalization') === 'on',
      };
      const r = await this.saveSection('global', data);
      if (!r.ok && this.admin?.toastContainer?.error)
        this.admin.toastContainer.error(r.error || 'Greška');
      else if (this.admin?.toastContainer?.success)
        this.admin.toastContainer.success('Global Expansion Center sačuvan');
    });

    // ---- Membership owner-only controls ----
    this.on('click', '[data-action="membership-tier-rules"]', () =>
      this.openJsonRuleEditor('tierRules', 'Tier Rules (Membership)')
    );
    this.on('click', '[data-action="membership-release-rules"]', () =>
      this.openJsonRuleEditor('releaseRules', 'Release Rules (Membership)')
    );
    this.on('click', '[data-action="membership-create-private"]', () =>
      this.openPrivateClientCreator()
    );

    // ---- Generic list row add/remove ----
    this.on('click', '[data-os-add]', e => {
      const name = e.delegateTarget.dataset.osAdd;
      const tpl = this.root().querySelector(`template[data-os-tpl="${name}"]`);
      const list = this.root().querySelector(`[data-os-list="${name}"]`);
      if (tpl && list) list.appendChild(tpl.content.cloneNode(true));
    });
    this.on('click', '[data-os-remove]', e => {
      const row = e.delegateTarget.closest('[data-os-row]');
      if (row) row.remove();
    });

    // ---- Sector 1: Brand settings ----
    this.on('submit', '[data-ec-form="brandIdentity"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        brandName: fd.get('brandName') || '',
        companyName: fd.get('companyName') || '',
        businessInfo: fd.get('businessInfo') || '',
        primaryDomain: fd.get('primaryDomain') || '',
        secondaryDomains: String(fd.get('secondaryDomains') || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        contactInfo: fd.get('contactInfo') || '',
        address: {
          streetAddress: fd.get('streetAddress') || '',
          addressLocality: fd.get('addressLocality') || '',
          postalCode: fd.get('postalCode') || '',
          addressCountry: fd.get('addressCountry') || '',
        },
      };
      await this.submitSection('brandIdentity', data, 'Brand podaci sačuvani');
    });

    // ---- Sector 2: Brand asset center ----
    this.on('submit', '[data-ec-form="assets"]', async e => {
      e.preventDefault();
      const library = this.rows('[data-os-row][data-os-kind="asset"]')
        .map(row => ({
          id: this.rowValue(row, 'id'),
          label: this.rowValue(row, 'label'),
          url: this.rowValue(row, 'url'),
          type: this.rowValue(row, 'type') || 'logo',
        }))
        .filter(a => a.id || a.url);
      const positions = {};
      this.rows('[data-os-position]').forEach(sel => {
        const key = sel.dataset.osPosition;
        const altEl = this.root().querySelector(`[data-os-position-alt="${key}"]`);
        positions[key] = { assetId: sel.value, alt: altEl ? altEl.value.trim() : '' };
      });
      await this.submitSection('assets', { library, positions }, 'Imovina brenda sačuvana');
    });

    // ---- Domain manager ----
    this.on('submit', '[data-ec-form="domains"]', async e => {
      e.preventDefault();
      const list = this.rows('[data-os-row][data-os-kind="domain"]')
        .map(row => ({
          domain: this.rowValue(row, 'domain'),
          enabled: this.rowChecked(row, 'enabled'),
          primary: this.rowChecked(row, 'primary'),
          language: this.rowValue(row, 'language'),
          currency: this.rowValue(row, 'currency'),
          seoOverride: this.rowValue(row, 'seoOverride'),
          regionalRules: this.rowValue(row, 'regionalRules'),
        }))
        .filter(d => d.domain);
      const primary = list.find(d => d.primary) || list[0] || null;
      list.forEach(d => {
        d.primary = primary ? d.domain === primary.domain : false;
      });
      const data = {
        list,
        primary: primary
          ? { domain: primary.domain, language: primary.language, currency: primary.currency }
          : { domain: 'dalli.rs', language: 'sr', currency: 'RSD' },
      };
      await this.submitSection('domains', data, 'Domeni sačuvani');
    });

    // ---- Sector 4: Communication center ----
    this.on('submit', '[data-ec-form="communication"]', async e => {
      e.preventDefault();
      const emails = this.rows('[data-os-row][data-os-kind="email"]')
        .map(row => ({
          address: this.rowValue(row, 'address'),
          roles: this.rowValues(row, 'role'),
          primary: this.rowChecked(row, 'primary'),
        }))
        .filter(x => x.address);
      const phones = this.rows('[data-os-row][data-os-kind="phone"]')
        .map(row => ({
          label: this.rowValue(row, 'label'),
          number: this.rowValue(row, 'number'),
          kind: this.rowValue(row, 'kind') || 'secondary',
          primary: this.rowChecked(row, 'primary'),
        }))
        .filter(x => x.number);
      await this.submitSection('communication', { emails, phones }, 'Komunikacioni centar sačuvan');
    });

    // ---- Sector 9: Social media center ----
    this.on('submit', '[data-ec-form="social"]', async e => {
      e.preventDefault();
      const accounts = this.rows('[data-os-row][data-os-kind="social"]')
        .map(row => ({
          platform: this.rowValue(row, 'platform'),
          handle: this.rowValue(row, 'handle'),
          url: this.rowValue(row, 'url'),
          scope: this.rowValue(row, 'scope') || 'global',
          primary: this.rowChecked(row, 'primary'),
        }))
        .filter(a => a.handle || a.url);
      await this.submitSection('social', { accounts }, 'Društvene mreže sačuvane');
    });

    // ---- Sector 11: Marketing API credentials (multi-account per provider) ----
    this.on('submit', '[data-ec-form="integrations"]', async e => {
      e.preventDefault();
      const groups = { social: SOCIAL_PROVIDERS, ads: AD_PROVIDERS };
      const data = { social: {}, ads: {} };
      Object.entries(groups).forEach(([kind, providers]) => {
        Object.entries(providers).forEach(([key, provider]) => {
          data[kind][key] = this.rows(`[data-os-row][data-os-kind="api-account"]`)
            .filter(row => {
              const list = row.closest('[data-os-list]');
              return list && list.dataset.osList === `api:${kind}:${key}`;
            })
            .map(row => {
              const credentials = {};
              provider.fields.forEach(f => {
                credentials[f.key] = this.rowValue(row, `cred__${f.key}`);
              });
              return {
                label: this.rowValue(row, 'label') || provider.label,
                enabled: this.rowChecked(row, 'enabled'),
                credentials,
              };
            })
            .filter(a => Object.values(a.credentials).some(Boolean));
        });
      });
      await this.submitSection('integrations', data, 'API kredencijali sačuvani');
    });

    // ---- Product visibility (hide from main page / archive) ----
    this.on('submit', '[data-ec-form="product-visibility"]', async e => {
      e.preventDefault();
      if (!this.canManage()) {
        this.toast('error', 'Nedovoljna dozvola');
        return;
      }
      const rows = this.rows('[data-os-row][data-os-kind="product"]');
      const changes = rows
        .map(row => {
          const id = row.dataset.productId;
          const next = this.rowValue(row, 'status') || 'published';
          const prev =
            (this.productVisibility[id] && this.productVisibility[id].status) || 'published';
          return { id, next, prev };
        })
        .filter(c => c.next !== c.prev);
      if (!changes.length) {
        this.toast('success', 'Nema izmena');
        return;
      }
      this.saving = true;
      let ok = 0;
      for (const c of changes) {
        try {
          await this.saveProductVisibility(c.id, c.next);
          if (c.next === 'published') delete this.productVisibility[c.id];
          else this.productVisibility[c.id] = { status: c.next };
          ok++;
        } catch (err) {
          // keep going; report at the end
        }
      }
      this.saving = false;
      this.toast(
        ok === changes.length ? 'success' : 'error',
        `${ok}/${changes.length} proizvoda ažurirano`
      );
      if (this.mounted) this.update();
    });

    this.on('click', '[data-os-action="reload-products"]', async () => {
      await this.loadProductVisibilityData();
      if (this.mounted) this.update();
    });

    // ---- Sector 3: Finance center ----
    this.on('submit', '[data-ec-form="finance"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const bankAccounts = this.rows('[data-os-row][data-os-kind="bank"]')
        .map(row => ({
          name: this.rowValue(row, 'name'),
          bank: this.rowValue(row, 'bank'),
          iban: this.rowValue(row, 'iban'),
          swift: this.rowValue(row, 'swift'),
          accountNumber: this.rowValue(row, 'accountNumber'),
          currency: this.rowValue(row, 'currency'),
          country: this.rowValue(row, 'country'),
          type: this.rowValue(row, 'type') || 'operating',
          primary: this.rowChecked(row, 'primary'),
        }))
        .filter(a => a.iban || a.accountNumber || a.name);
      const cryptoWallets = this.rows('[data-os-row][data-os-kind="wallet"]')
        .map(row => ({
          label: this.rowValue(row, 'label'),
          currency: this.rowValue(row, 'currency'),
          network: this.rowValue(row, 'network'),
          address: this.rowValue(row, 'address'),
          country: this.rowValue(row, 'country'),
          collection: this.rowValue(row, 'collection'),
          type: this.rowValue(row, 'type') || 'active',
          active: this.rowChecked(row, 'active'),
        }))
        .filter(w => w.address);
      const cardDepositAccounts = this.rows('[data-os-row][data-os-kind="card"]')
        .map(row => ({
          label: this.rowValue(row, 'label'),
          provider: this.rowValue(row, 'provider'),
          currency: this.rowValue(row, 'currency'),
          country: this.rowValue(row, 'country'),
        }))
        .filter(c => c.label || c.provider);
      const data = {
        bankAccounts,
        cryptoWallets,
        cardDepositAccounts,
        taxProfiles: { vatRules: fd.get('vatRules') || '' },
        invoices: {
          template: fd.get('template') || 'default',
          numberingPrefix: fd.get('numberingPrefix') || 'INV',
          showVat: fd.get('showVat') === 'on',
          footerNote: fd.get('footerNote') || '',
        },
        paymentInstructions: fd.get('paymentInstructions') || '',
        refundRules: fd.get('refundRules') || '',
      };
      await this.submitSection('finance', data, 'Finansije sačuvane');
    });

    // ---- Treasury & reconciliation ----
    this.on('click', '[data-os-action="reconcile"]', () => {
      this.openReconcileModal();
    });

    this.on('submit', '[data-ec-form="treasury"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        reconciliation: { autoMatch: fd.get('autoMatch') === 'on' },
        reports: {
          dailyScale: Number(fd.get('dailyScale') || 0),
          weeklyScale: Number(fd.get('weeklyScale') || 0),
          monthlyScale: Number(fd.get('monthlyScale') || 0),
          quarterlyScale: Number(fd.get('quarterlyScale') || 0),
          yearlyScale: Number(fd.get('yearlyScale') || 0),
        },
      };
      await this.submitSection('treasury', data, 'Trezor sačuvan');
    });

    // ---- Reports & exports ----
    this.on('click', '[data-os-report]', e => {
      this.generateReport(e.delegateTarget.dataset.period, e.delegateTarget.dataset.format);
    });
    this.on('click', '[data-os-share]', e => {
      this.shareReport(e.delegateTarget.dataset.osShare);
    });

    // ---- Sector 10: Operations center ----
    this.on('submit', '[data-ec-form="operations"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const notices = this.rows('[data-os-row][data-os-kind="notice"]')
        .map(row => ({
          text: this.rowValue(row, 'text'),
          type: this.rowValue(row, 'type') || 'info',
          active: this.rowChecked(row, 'active'),
        }))
        .filter(n => n.text);
      const data = {
        holiday: {
          enabled: fd.get('holidayEnabled') === 'on',
          startAt: fd.get('holidayStart') || '',
          endAt: fd.get('holidayEnd') || '',
          message: fd.get('holidayMessage') || '',
          suspendShipping: fd.get('suspendShipping') === 'on',
          suspendOrders: fd.get('suspendOrders') === 'on',
          customerNotice: fd.get('customerNotice') || '',
          countdown: fd.get('holidayCountdown') === 'on',
        },
        notices,
        orderPause: {
          enabled: fd.get('orderPause') === 'on',
          message: fd.get('orderPauseMessage') || '',
        },
        shippingPause: {
          enabled: fd.get('shippingPause') === 'on',
          message: fd.get('shippingPauseMessage') || '',
        },
      };
      await this.submitSection('operations', data, 'Operacije sačuvane');
    });

    // ---- Sector 7: Shipping center (live couriers) ----
    this.on('submit', '[data-ec-form="shipping"]', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const couriers = {};
      this.rows('[data-os-row][data-os-kind="courier"]').forEach(row => {
        const id = row.dataset.courierId;
        if (!id) return;
        couriers[id] = {
          enabled: this.rowChecked(row, 'enabled'),
          trackingEnabled: this.rowChecked(row, 'trackingEnabled'),
          apiEnabled: this.rowChecked(row, 'apiEnabled'),
          regions: this.rowValue(row, 'regions')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
        };
      });
      const data = {
        couriers,
        zonesEnabled: fd.get('zonesEnabled') === 'on',
        tracking: {
          customerNotifications: fd.get('customerNotifications') === 'on',
          ownerControlled: true,
        },
      };
      await this.submitSection('shipping', data, 'Dostava i kuriri sačuvani');
    });

    // ---- Sector 5: Stores ----
    this.on('submit', '[data-ec-form="stores"]', async e => {
      e.preventDefault();
      const stores = this.rows('[data-os-row][data-os-kind="store"]')
        .map(row => ({
          id: row.dataset.storeId || this.rowValue(row, 'slug') || `store-${Date.now()}`,
          name: this.rowValue(row, 'name'),
          coverImage: this.rowValue(row, 'coverImage'),
          gallery: this.rowValue(row, 'gallery')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
          address: {
            streetAddress: this.rowValue(row, 'street'),
            addressLocality: this.rowValue(row, 'city'),
            postalCode: this.rowValue(row, 'postal'),
            addressCountry: this.rowValue(row, 'country'),
          },
          phone: this.rowValue(row, 'phone'),
          manager: this.rowValue(row, 'manager'),
          workingHours: this.rowValue(row, 'hours'),
          coordinates: {
            latitude: Number(this.rowValue(row, 'lat') || 0),
            longitude: Number(this.rowValue(row, 'lng') || 0),
          },
          mapsUrl: this.rowValue(row, 'mapsUrl'),
          services: this.rowValue(row, 'services')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
          status: this.rowValue(row, 'status') || 'active',
        }))
        .filter(s => s.name);
      await this.submitSection('stores', stores, 'Prodavnice sačuvane');
    });

    // ---- Sector 6: Warehouses ----
    this.on('submit', '[data-ec-form="warehouses"]', async e => {
      e.preventDefault();
      const warehouses = this.rows('[data-os-row][data-os-kind="warehouse"]')
        .map(row => ({
          id: row.dataset.warehouseId || this.rowValue(row, 'slug') || `wh-${Date.now()}`,
          name: this.rowValue(row, 'name'),
          region: this.rowValue(row, 'region'),
          capacity: Number(this.rowValue(row, 'capacity') || 0),
          active: this.rowChecked(row, 'active'),
          priority: Number(this.rowValue(row, 'priority') || 0),
          shippingSupport: this.rowValue(row, 'shippingSupport')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
          inventoryAssignment: this.rowValue(row, 'inventoryAssignment'),
        }))
        .filter(w => w.name);
      await this.submitSection('warehouses', warehouses, 'Skladišta sačuvana');
    });
  }

  async loadAdSpend() {
    this.adSpendLoading = true;
    this.marketingError = null;
    if (this.mounted) this.update();
    try {
      const res = await SectionAPI.analytics.getAdSpend();
      this.adSpend = Array.isArray(res?.entries) ? res.entries : Array.isArray(res) ? res : [];
    } catch (err) {
      this.marketingError = err.message || 'Greška pri učitavanju troškova oglašavanja';
      this.adSpend = [];
    } finally {
      this.adSpendLoading = false;
      if (this.mounted) this.update();
    }
  }

  async loadSocialMetrics(refresh = false) {
    this.socialMetricsLoading = true;
    this.marketingError = null;
    try {
      const res = await SectionAPI.analytics.getSocialMetrics(refresh);
      this.socialMetrics = res || null;
    } catch (err) {
      this.marketingError = err.message || 'Greška pri učitavanju social analitike';
      this.socialMetrics = null;
    } finally {
      this.socialMetricsLoading = false;
      if (this.mounted) this.update();
    }
  }

  async submitAdSpend() {
    const form = this.element.querySelector('[data-ec-form="adspend"]');
    if (!form) return;
    const val = name => {
      const el = form.querySelector(`[name="${name}"]`);
      return el ? el.value.trim() : '';
    };
    const network = val('network');
    const amount = Number(val('amount') || 0);
    const date = val('date');
    if (!network || !amount) {
      this.admin?.toastContainer?.error?.('Popuni platformu i iznos');
      return;
    }
    this.adSpendLoading = true;
    this.update();
    try {
      await SectionAPI.analytics.addAdSpend({
        network,
        amount,
        date: date || undefined,
        note: val('note'),
      });
      form.reset();
      await this.loadAdSpend();
      this.admin?.toastContainer?.success?.('Trošak oglašavanja dodat');
    } catch (err) {
      this.admin?.toastContainer?.error?.(err.message || 'Greška pri dodavanju troška');
      this.adSpendLoading = false;
      this.update();
    }
  }

  async removeAdSpend(id) {
    if (!id) return;
    this.adSpendLoading = true;
    this.update();
    try {
      await SectionAPI.analytics.removeAdSpend(id);
      await this.loadAdSpend();
      this.admin?.toastContainer?.success?.('Trošak uklonjen');
    } catch (err) {
      this.admin?.toastContainer?.error?.(err.message || 'Greška pri uklanjanju troška');
      this.adSpendLoading = false;
      this.update();
    }
  }

  renderAdSpendPanel() {
    const adProviders = Object.entries(AD_PROVIDERS).map(
      ([key, p]) => `<option value="${esc(key)}">${esc(p.label)}</option>`
    );
    const rows = this.adSpend.length
      ? this.adSpend
          .slice(0, 50)
          .map(
            e => `
        <tr>
          <td>${esc(e.network)}</td>
          <td>${esc(e.date)}</td>
          <td>${ImperiumUtils.format.currency(e.amount)}</td>
          <td>${esc(e.note || '')}</td>
          <td>${this.canManage() ? `<button type="button" class="btn btn-secondary btn-sm" data-ec-remove-adspend="${esc(e.id)}">Ukloni</button>` : ''}</td>
        </tr>`
          )
          .join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--color-text-tertiary)">Nema unetih troškova</td></tr>';

    return `
      <div class="card" style="margin-top:var(--space-5)">
        <div class="card-body" style="padding:var(--space-5)">
          <h4 style="margin:0 0 4px">Troškovi oglašavanja (realni)</h4>
          <p class="text-tertiary" style="margin:0 0 var(--space-3);font-size:12px">
            Unesi stvarne troškove po platformi. Ovi troškovi ulaze u finansijske izveštaje i profit
            (ROAS i druge metrike se računaju iz realnih narudžbina).
          </p>
          ${
            this.canManage()
              ? `<form data-ec-form="adspend" style="display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:flex-end;margin-bottom:var(--space-3)">
                  <label class="form-group" style="margin:0"><span class="input-label">Platforma</span>
                    <select class="input-field" name="network">${adProviders}</select></label>
                  <div class="form-group" style="margin:0"><label class="input-label">Datum</label><input class="input-field" type="date" name="date" /></div>
                  <div class="form-group" style="margin:0"><label class="input-label">Iznos</label><input class="input-field" type="number" min="0" step="0.01" name="amount" /></div>
                  <div class="form-group" style="margin:0;flex:1"><label class="input-label">Napomena</label><input class="input-field" type="text" name="note" /></div>
                  <button type="submit" class="btn btn-primary" ${this.adSpendLoading ? 'disabled' : ''}>Dodaj trošak</button>
                </form>`
              : ''
          }
          <div class="table-container">
            <table class="table">
              <thead><tr><th>Platforma</th><th>Datum</th><th>Iznos</th><th>Napomena</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderSocialMetricsPanel() {
    const m = this.socialMetrics;
    if (this.socialMetricsLoading && !m) {
      return `<div class="card" style="margin-top:var(--space-5)"><div class="card-body" style="padding:var(--space-5)"><h4 style="margin:0 0 var(--space-3)">Social analitika (realna)</h4><p class="text-tertiary">Učitavanje...</p></div></div>`;
    }
    if (!m || !Array.isArray(m.accounts) || !m.accounts.length) {
      return `<div class="card" style="margin-top:var(--space-5)"><div class="card-body" style="padding:var(--space-5)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-2)">
          <h4 style="margin:0">Social analitika (realna)</h4>
          <button type="button" class="btn btn-secondary btn-sm" data-ec-load-socialmetrics ${this.socialMetricsLoading ? 'disabled' : ''}>Osveži</button>
        </div>
        <p class="text-tertiary" style="margin:var(--space-2) 0 0;font-size:12px">
          Nema konfigurisanih naloga ili nedostaju kredencijali. Dodaj API tokene u sekciji Društvene mreže iznad.
        </p>
      </div></div>`;
    }
    const cards = m.accounts
      .map(a => {
        const stats = a.metrics || a.stats || {};
        const lines = Object.entries(stats)
          .map(
            ([k, v]) =>
              `<div style="display:flex;justify-content:space-between;gap:var(--space-3)"><span class="cell-tertiary">${esc(k)}</span><strong>${esc(String(v))}</strong></div>`
          )
          .join('');
        const status = !a.supported
          ? '<span class="badge badge-error">Nije podržano</span>'
          : a.configured === false || a.ok === false
            ? `<span class="badge badge-error">${esc(a.error || 'Nije konfigurisano')}</span>`
            : '<span class="badge badge-success">Aktivno</span>';
        return `<div class="stat-card"><div class="stat-content">
          <div style="display:flex;justify-content:space-between;align-items:center"><span class="stat-label">${esc(a.handle ? `${a.platform} · ${a.handle}` : a.platform || 'Nalog')}</span>${status}</div>
          <div style="margin-top:var(--space-2);display:flex;flex-direction:column;gap:4px">${lines || '<span class="cell-tertiary">Nema metrika</span>'}</div>
        </div></div>`;
      })
      .join('');
    return `<div class="card" style="margin-top:var(--space-5)"><div class="card-body" style="padding:var(--space-5)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-2)">
        <h4 style="margin:0">Social analitika (realna)</h4>
        <button type="button" class="btn btn-secondary btn-sm" data-ec-load-socialmetrics ${this.socialMetricsLoading ? 'disabled' : ''}>Osveži</button>
      </div>
      <div class="stat-grid" style="margin-top:var(--space-3)">${cards}</div>
    </div></div>`;
  }

  renderTabs() {
    let lastGroup = null;
    const chunks = [];
    EC_TABS.forEach(t => {
      if (t.group !== lastGroup) {
        lastGroup = t.group;
        const g = EC_GROUPS.find(x => x.id === t.group);
        chunks.push(
          `<div class="ec-sector-label" style="flex-basis:100%;margin-top:var(--space-2);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--color-text-tertiary)">${esc(g ? g.label : t.group)}</div>`
        );
      }
      const active = this.activeTab === t.id;
      chunks.push(
        `<button class="tab ${active ? 'active' : ''}" data-ec-tab="${t.id}" type="button" role="tab" aria-selected="${active}">
          <span style="margin-right:4px">${t.icon}</span>${esc(t.label)}
        </button>`
      );
    });
    return `<nav class="tabs-nav" role="tablist" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:var(--space-5)">${chunks.join('')}</nav>`;
  }

  renderThemesTab() {
    const cfg = this.config;
    const activeId = cfg.activeThemeId;
    const prev = cfg.previousThemeId || '—';
    const scheduled = cfg.scheduledTheme;
    const themeOptions = THEME_CATALOG.map(
      th =>
        `<option value="${th.id}" ${th.id === activeId ? 'selected' : ''}>${th.emoji} ${th.label} (${th.id})</option>`
    ).join('');
    const cards = THEME_CATALOG.map(th => {
      const isActive = th.id === activeId;
      const isScheduled = scheduled && scheduled.themeId === th.id;
      return `
        <div class="card" style="border:${isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)'}">
          <div class="card-body" style="padding:var(--space-4)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3)">
              <div>
                <h4 style="margin:0 0 4px">${th.emoji} ${th.label}</h4>
                <code style="font-size:12px">${th.id}</code>
                ${isActive ? '<span class="badge badge-success" style="margin-left:6px">Aktivna</span>' : ''}
                ${isScheduled ? '<span class="badge badge-info" style="margin-left:6px">Zakazana</span>' : ''}
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${!isActive && this.isOwner() ? `<button class="btn btn-sm btn-primary" data-theme-activate="${th.id}" ${this.themeActionLoading === 'activateTheme' ? 'disabled' : ''}>Aktiviraj</button>` : ''}
                <button class="btn btn-sm btn-secondary" data-theme-preview="${th.id}">Pregled</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="space-y-6">
        <div class="card">
          <div class="card-body" style="padding:var(--space-5)">
            <h3 style="margin:0 0 var(--space-4)">Trenutno stanje</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-4)">
              <div><div class="text-tertiary" style="font-size:12px">Aktivna tema</div><div style="font-weight:600">${activeId}</div></div>
              <div><div class="text-tertiary" style="font-size:12px">Prethodna tema</div><div>${prev}</div></div>
              <div style="grid-column:1/-1"><div class="text-tertiary" style="font-size:12px">Zakazivanje</div>
                ${scheduled ? `<div>${scheduled.themeId} — od ${scheduled.startAt}${scheduled.endAt ? ' do ' + scheduled.endAt : ''} (by ${scheduled.by || 'scheduler'})</div>` : '<div>—</div>'}
                ${scheduled && this.isOwner() ? `<button class="btn btn-sm btn-danger" style="margin-top:8px" data-theme-cancel-schedule>Otkaži zakazivanje</button>` : ''}
              </div>
              ${
                cfg.previewThemeId
                  ? `<div style="grid-column:1/-1"><div class="text-tertiary" style="font-size:12px">Pregled (preview)</div>
                <div>${ImperiumUtils.escapeHtml(cfg.previewThemeId)}</div>
                <button class="btn btn-sm btn-danger" style="margin-top:8px" data-theme-cancel-preview>Otkaži pregled</button></div>`
                  : ''
              }
            </div>
            ${
              this.isOwner()
                ? `
            <div style="margin-top:var(--space-5);display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:flex-end">
              <div class="form-group" style="min-width:240px">
                <label class="input-label">Brzo aktiviranje</label>
                <select class="input-field select-field" data-theme-select>${themeOptions}</select>
              </div>
              ${cfg.previousThemeId ? `<button class="btn btn-secondary" data-theme-rollback>Vrati na prethodnu</button>` : ''}
            </div>`
                : ''
            }
            ${
              this.isOwner()
                ? `
            <div style="margin-top:var(--space-5);padding:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-md)">
              <h4 style="margin:0 0 var(--space-3)">Zakazi aktiviranje teme</h4>
              <form data-ec-form="schedule-theme" style="display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:flex-end">
                <div class="form-group" style="min-width:200px">
                  <label class="input-label">Tema</label>
                  <select class="input-field select-field" name="themeId" required>
                    ${THEME_CATALOG.map(th => `<option value="${th.id}">${th.emoji} ${th.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="min-width:200px">
                  <label class="input-label">Početak (ISO)</label>
                  <input class="input-field" type="datetime-local" name="startAt" required>
                </div>
                <div class="form-group" style="min-width:200px">
                  <label class="input-label">Kraj (ISO, opcionalno)</label>
                  <input class="input-field" type="datetime-local" name="endAt">
                </div>
                <button class="btn btn-primary" type="submit">Zakaži</button>
              </form>
            </div>`
                : ''
            }

            <div style="margin-top:var(--space-3);font-size:12px;color:var(--color-text-tertiary)">Akcije menjanja tema su dostupne samo vlasniku (owner). Čitanje/pregled je dozvoljen po dozvoli <code>experienceCenter</code>.</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--space-4)">${cards}</div>
        ${
          Array.isArray(cfg.history) && cfg.history.length
            ? `
        <div class="card" style="margin-top:var(--space-4)">
          <div class="card-body" style="padding:var(--space-5)">
            <h3 style="margin:0 0 var(--space-3)">Istorija akcija</h3>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);max-height:260px;overflow:auto">
              ${cfg.history
                .slice(0, 20)
                .map(
                  h => `<div style="padding:var(--space-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);font-size:12px">
                <div><strong>${ImperiumUtils.escapeHtml(h.action || '')}</strong> ${h.themeId ? 'tema: ' + ImperiumUtils.escapeHtml(h.themeId) : ''}</div>
                <div class="text-tertiary">${ImperiumUtils.escapeHtml(h.by || '')} • ${ImperiumUtils.escapeHtml(h.at || '')}</div>
              </div>`
                )
                .join('')}
            </div>
          </div>
        </div>`
            : ''
        }

      </div>
    `;
  }

  renderHeroTab() {
    const h = this.config.hero || {};
    return `
      <form class="card" data-ec-form="hero">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">Hero Manager</h3>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${h.enabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label>
          </div>
          <div class="form-group"><label class="input-label">Naslov</label><input class="input-field" name="title" value="${ImperiumUtils.escapeHtml(h.title || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
          <div class="form-group"><label class="input-label">Podnaslov</label><textarea class="input-field" name="subtitle" rows="2" ${!this.canManage() ? 'disabled' : ''}>${ImperiumUtils.escapeHtml(h.subtitle || '')}</textarea></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            <div class="form-group"><label class="input-label">CTA Tekst</label><input class="input-field" name="ctaText" value="${ImperiumUtils.escapeHtml(h.ctaText || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
            <div class="form-group"><label class="input-label">CTA URL</label><input class="input-field" name="ctaUrl" value="${ImperiumUtils.escapeHtml(h.ctaUrl || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
          </div>
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-3)">
            <div class="form-group"><label class="input-label">Slika URL</label><input class="input-field" name="imageUrl" value="${ImperiumUtils.escapeHtml(h.imageUrl || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
            <div class="form-group"><label class="input-label">Alt tekst</label><input class="input-field" name="imageAlt" value="${ImperiumUtils.escapeHtml(h.imageAlt || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
          </div>
          <div class="form-group"><label class="input-label">Collection Focus</label><select class="input-field select-field" name="collectionFocus" ${!this.canManage() ? 'disabled' : ''}><option value="all" ${h.collectionFocus === 'all' ? 'selected' : ''}>Sve</option><option value="casual" ${h.collectionFocus === 'casual' ? 'selected' : ''}>Casual</option><option value="elegance" ${h.collectionFocus === 'elegance' ? 'selected' : ''}>Elegance</option></select></div>
          <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="overrideTheme" ${h.overrideTheme ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Override tema</label>
          ${this.canManage() ? '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">Sačuvaj</button></div>' : ''}
        </div>
      </form>
    `;
  }

  renderCollectionsTab() {
    const c = this.config.collections || { casual: {}, elegance: {} };
    const casual = c.casual || {};
    const elegance = c.elegance || {};
    return `
      <form class="card" data-ec-form="collections">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Collection Manager</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
            <div class="card" style="padding:var(--space-3);border:2px solid var(--color-primary)">
              <h4 style="margin:0 0 var(--space-2)">🏃 CASUAL</h4>
              <div class="form-group"><label class="input-label">Hero</label><input class="input-field" name="casual[hero]" value="${ImperiumUtils.escapeHtml(casual.hero || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
              <div class="form-group"><label class="input-label">Logo URL</label><input class="input-field" name="casual[logo]" value="${ImperiumUtils.escapeHtml(casual.logo || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
              <div class="form-group"><label class="input-label">Featured Products (CSV)</label><input class="input-field" name="casual[featuredProducts]" value="${Array.isArray(casual.featuredProducts) ? casual.featuredProducts.join(', ') : casual.featuredProducts || ''}" ${!this.canManage() ? 'disabled' : ''}></div>
              <div class="form-group"><label class="input-label">Featured Categories (CSV)</label><input class="input-field" name="casual[featuredCategories]" value="${Array.isArray(casual.featuredCategories) ? casual.featuredCategories.join(', ') : casual.featuredCategories || ''}" ${!this.canManage() ? 'disabled' : ''}></div>
              <div class="form-group"><label class="input-label">Seasonal Override (theme ID)</label><input class="input-field" name="casual[seasonalOverride]" value="${ImperiumUtils.escapeHtml(casual.seasonalOverride || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
            </div>
            <div class="card" style="padding:var(--space-3);border:2px solid var(--color-secondary)">
              <h4 style="margin:0 0 var(--space-2)">👗 ELEGANCE</h4>
              <div class="form-group"><label class="input-label">Hero</label><input class="input-field" name="elegance[hero]" value="${ImperiumUtils.escapeHtml(elegance.hero || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
              <div class="form-group"><label class="input-label">Logo URL</label><input class="input-field" name="elegance[logo]" value="${ImperiumUtils.escapeHtml(elegance.logo || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
              <div class="form-group"><label class="input-label">Featured Products (CSV)</label><input class="input-field" name="elegance[featuredProducts]" value="${Array.isArray(elegance.featuredProducts) ? elegance.featuredProducts.join(', ') : elegance.featuredProducts || ''}" ${!this.canManage() ? 'disabled' : ''}></div>
              <div class="form-group"><label class="input-label">Featured Categories (CSV)</label><input class="input-field" name="elegance[featuredCategories]" value="${Array.isArray(elegance.featuredCategories) ? elegance.featuredCategories.join(', ') : elegance.featuredCategories || ''}" ${!this.canManage() ? 'disabled' : ''}></div>
              <div class="form-group"><label class="input-label">Seasonal Override (theme ID)</label><input class="input-field" name="elegance[seasonalOverride]" value="${ImperiumUtils.escapeHtml(elegance.seasonalOverride || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
            </div>
          </div>
          ${this.canManage() ? '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">Sačuvaj</button></div>' : ''}
        </div>
      </form>
    `;
  }

  renderPaymentsTab() {
    const p = this.config.payments || {};
    return `
      <form class="card" data-ec-form="payments">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Payment Rules</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-3)">
            ${['showApplePay', 'showGooglePay', 'showStripe', 'showPayPal', 'showBankTransfer', 'showCashOnDelivery', 'showCrypto'].map(k => `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="${k}" ${p[k] ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> ${k.replace('show', '')}</label>`).join('')}
          </div>
          <div class="form-group"><label class="input-label">Tekst za rate</label><input class="input-field" name="installmentText" value="${ImperiumUtils.escapeHtml(p.installmentText || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
          <div class="card" style="padding:var(--space-3)">
            <h4 style="margin:0 0 var(--space-2)">Kripto plaćanje</h4>
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" name="cryptoShippingPaid" ${p.cryptoShippingPaid !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}>
              <span>Naplaćuj poštarinu za kripto plaćanje</span>
            </label>
            <p class="text-tertiary" style="margin:6px 0 0;font-size:12px">Ako isključiš, kupci koji plaćaju kriptom dobijaju <strong>besplatnu dostavu</strong>.</p>
          </div>
          ${this.canManage() ? '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ' + (this.saving ? 'disabled' : '') + '>Sačuvaj</button></div>' : ''}
        </div>
      </form>
    `;
  }

  renderAITab() {
    const a = this.config.ai || {};
    return `
      <form class="card" data-ec-form="ai">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">AI Features</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${a.enabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3)">
            <div class="form-group"><label class="input-label">Model</label><input class="input-field" name="model" value="${ImperiumUtils.escapeHtml(a.model || '')}" ${!this.canManage() ? 'disabled' : ''}></div>
            <div class="form-group"><label class="input-label">Temperature</label><input type="number" step="0.1" min="0" max="2" class="input-field" name="temperature" value="${a.temperature ?? 0.7}" ${!this.canManage() ? 'disabled' : ''}></div>
            <div class="form-group"><label class="input-label">Max Tokens</label><input type="number" min="1" max="4096" class="input-field" name="maxTokens" value="${a.maxTokens ?? 500}" ${!this.canManage() ? 'disabled' : ''}></div>
          </div>
          <div class="card" style="margin-top:var(--space-4);padding:var(--space-3)">
            <h4 style="margin:0 0 var(--space-2)">Feature Toggles</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-2)">
              ${['tryOn', 'viewer360', 'personalization', 'recommendations'].map(k => `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="features[${k}]" ${a.features?.[k] ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> ${k.charAt(0).toUpperCase() + k.slice(1)}</label>`).join('')}
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${!this.canManage() ? 'disabled' : ''}>Sačuvaj</button></div>
        </div>
      </form>
    `;
  }

  renderCommunityTab() {
    const cm = this.config.community || {};
    return `
      <form class="card" data-ec-form="community">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Community Controls</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${cm.enabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <div class="card" style="padding:var(--space-3);display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3)">
            <div><h4 style="margin:0 0 var(--space-2)">Reviews</h4><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="reviewsEnabled" ${cm.reviewsEnabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Enabled</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="anonymousReviews" ${cm.anonymousReviews ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Anonymous</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="minOrder" ${cm.minOrder ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Min Order</label></div>
            <div><h4 style="margin:0 0 var(--space-2)">Photo Reviews</h4><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="photoEnabled" ${cm.photoEnabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Enabled</label><div class="form-group" style="margin-top:4px"><label class="input-label">Max Photos</label><input type="number" class="input-field" name="maxPhotos" value="${cm.maxPhotos ?? 5}" ${!this.canManage() ? 'disabled' : ''}></div></div>
            <div><h4 style="margin:0 0 var(--space-2)">Video Reviews</h4><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="videoEnabled" ${cm.videoEnabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Enabled</label><div class="form-group" style="margin-top:4px"><label class="input-label">Max Duration (s)</label><input type="number" class="input-field" name="maxDuration" value="${cm.maxDuration ?? 60}" ${!this.canManage() ? 'disabled' : ''}></div></div>
            <div><h4 style="margin:0 0 var(--space-2)">Gallery</h4><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="galleryEnabled" ${cm.galleryEnabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Enabled</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="autoApprove" ${cm.autoApprove ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Auto Approve</label></div>
            <div><h4 style="margin:0 0 var(--space-2)">Q&A</h4><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="qnaEnabled" ${cm.qnaEnabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Enabled</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="qnaAutoApprove" ${cm.qnaAutoApprove ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Auto Approve</label></div>
            <div><h4 style="margin:0 0 var(--space-2)">Moderation</h4><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="requireApproval" ${cm.requireApproval ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Require Approval</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="autoRejectSpam" ${cm.autoRejectSpam ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Auto Reject Spam</label></div>
          </div>
          ${this.canManage() ? '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">Sačuvaj</button></div>' : ''}
        </div>
      </form>
    `;
  }

  renderMaintenanceTab() {
    const m = this.config.maintenance || {};
    return `
      <form class="card" data-ec-form="maintenance">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Maintenance Mode</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${m.enabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <div class="form-group"><label class="input-label">Poruka</label><textarea class="input-field" name="message" rows="2" ${!this.canManage() ? 'disabled' : ''}>${ImperiumUtils.escapeHtml(m.message || '')}</textarea></div>
          <div class="form-group"><label class="input-label">Dozvoljene putanje (CSV)</label><input class="input-field" name="allowedPaths" value="${Array.isArray(m.allowedPaths) ? m.allowedPaths.join(', ') : ''}" ${!this.canManage() ? 'disabled' : ''} placeholder="/admin,/health"></div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:flex-end">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="countdownEnabled" ${m.countdownEnabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući odbrojavanje</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="allowAdminBypass" ${m.allowAdminBypass ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Admin bypass</label>
          </div>
          <div class="form-group"><label class="input-label">Odbrojavanje do (ISO)</label><input class="input-field" name="targetAt" value="${ImperiumUtils.escapeHtml(m.targetAt || '')}" ${!this.canManage() ? 'disabled' : ''} placeholder="2026-12-31T23:59:59Z"></div>
          ${this.canManage() ? '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">Sačuvaj</button></div>' : ''}
        </div>
      </form>
    `;
  }

  renderLuxuryTab() {
    const l = this.config.luxury || {};
    return `
      <form class="card" data-ec-form="luxury">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Luxury Mode (Flagship)</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${l.enabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <div class="card" style="padding:var(--space-3);display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3)">
            <div><h4 style="margin:0 0 var(--space-2)">Visual</h4><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="goldAccent" ${l.goldAccent ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Zlatni akcent</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="parallax" ${l.parallax ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Parallax</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="largerStory" ${l.largerStorySections ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Veće story sekcije</label></div>
            <div><h4 style="margin:0 0 var(--space-2)">Content</h4><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="reducePromotions" ${l.reducePromotions ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Smanji promocije</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="moreBrand" ${l.moreBrandContent ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Više brand sadržaja</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="moreCollection" ${l.moreCollectionPresentation ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Više kolekcija</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="hideSale" ${l.hideSaleBadges ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Sakrij sale badges</label><label style="display:flex;align-items:center;gap:8px;margin-top:4px"><input type="checkbox" name="editorialNote" ${l.showEditorialNote ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Prikaži editorial note</label></div>
            <div><h4 style="margin:0 0 var(--space-2)">Focus</h4><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="emphasisElegance" ${l.emphasis === 'elegance' ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Naglasak na Elegance</label><div class="form-group" style="margin-top:4px"><label class="input-label">Animation Intensity</label><input type="number" step="0.1" min="0" max="1" class="input-field" name="animationIntensity" value="${l.animationIntensity ?? 0.5}" ${!this.canManage() ? 'disabled' : ''}></div></div>
          </div>
          ${this.canManage() ? '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">Sačuvaj</button></div>' : ''}
        </div>
      </form>
    `;
  }

  renderEditorialTab() {
    const ed = this.config.editorial || {};
    const opts = [
      ['reducePromotions', 'Smanji promocije'],
      ['largerStorySections', 'Veće sekcije priče'],
      ['moreBrandContent', 'Više brend sadržaja'],
      ['moreCollectionPresentation', 'Više predstavljanja kolekcija'],
      ['hideSaleBadges', 'Sakrij sale bedževe'],
      ['showEditorialNote', 'Prikaži editorial napomenu'],
    ];
    return `
      <form class="card" data-ec-form="editorial">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Editorial Mode</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${ed.enabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <p class="text-tertiary" style="margin:0;font-size:12px">Kada je uključen: manje promocija, veće sekcije priče, više brend sadržaja, više kolekcijske prezentacije.</p>
          ${opts.map(([k, label]) => `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="${k}" ${ed[k] !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> ${label}</label>`).join('')}
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Editorial Mode</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderBrandTab() {
    const b = this.config.brand || {};
    const sections = [
      ['story', 'Brand Story'],
      ['philosophy', 'Filozofija'],
      ['mission', 'Misija'],
      ['values', 'Vrednosti'],
      ['sustainability', 'Održivost'],
      ['heritage', 'Heritage Timeline'],
      ['futureVision', 'Buduća Vizija'],
      ['founderMessage', 'Poruka Osnivača'],
      ['brandManifesto', 'Manifest'],
      ['sustainabilityMessage', 'Poruka o Održivosti'],
      ['luxuryValues', 'Luksuzne Vrednosti'],
    ];
    return `
      <form class="card" data-ec-form="brand">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Brand Story Sekcije</h3>
          <p class="text-tertiary" style="margin:0;font-size:12px">Uključi/isključi sekcije na About, Craftsmanship i drugim brend stranicama.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3)">
            ${sections.map(([k, label]) => `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="${k}" ${b[k]?.enabled !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> ${label}</label>`).join('')}
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Brand Story</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderTrustTab() {
    const t = this.config.trust || {};
    const blocks = t.blocks || {};
    const blockDefs = [
      ['premium-materials', 'Premium Materijali', '🧵'],
      ['hand-finished', 'Ručno Dovršeni Detalji', '✋'],
      ['limited-production', 'Ograničena Proizvodnja', '🔢'],
      ['sustainability', 'Održivost', '🌱'],
      ['ethical-manufacturing', 'Etička Proizvodnja', '🤝'],
      ['lifetime-quality', 'Doživotna Filozofija Kvaliteta', '♾️'],
    ];
    return `
      <form class="card" data-ec-form="trust">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Trust Blocks</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${t.enabled !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <p class="text-tertiary" style="margin:0;font-size:12px">Konfigurabilni blokovi poverenja koji se prikazuju na brend stranicama.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--space-3)">
            ${blockDefs.map(([k, label, icon]) => `<label style="display:flex;align-items:center;gap:8px;padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-sm)"><input type="checkbox" name="block-${k}" ${blocks[k] !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> <span>${icon}</span> ${label}</label>`).join('')}
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Trust Blocks</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderJournalTab() {
    const j = this.config.journal || {};
    const cats = j.categories || {};
    const catDefs = [
      ['style-guides', 'Vodiči Stila', '👔'],
      ['fashion-intelligence', 'Modna Inteligencija', '🧠'],
      ['collections', 'Kolekcije', '🗂️'],
      ['lifestyle', 'Lifestyle', '🌍'],
      ['product-care', 'Nega Proizvoda', '🧺'],
      ['materials', 'Materijali', '🧵'],
      ['editorial', 'Editorial', '✍️'],
    ];
    return `
      <form class="card" data-ec-form="journal">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Journal Podešavanja</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${j.enabled !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="showEditorialNote" ${j.showEditorialNote !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Prikaži editorial napomenu</label>
          <div class="form-group"><label class="input-label">Kategorije</label>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3)">
              ${catDefs.map(([k, label, icon]) => `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="cat-${k}" ${cats[k] !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> ${icon} ${label}</label>`).join('')}
            </div>
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Journal</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderCraftsmanshipTab() {
    const c = this.config.craftsmanship || {};
    const secs = c.sections || {};
    const secDefs = [
      ['manufacturing', 'Priča o Proizvodnji'],
      ['designProcess', 'Proces Dizajna'],
      ['qualityStandards', 'Standardi Kvaliteta'],
      ['garmentConstruction', 'Izrada Odeće'],
      ['materialSelection', 'Odabir Materijala'],
    ];
    return `
      <form class="card" data-ec-form="craftsmanship">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Zanatstvo</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${c.enabled !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <p class="text-tertiary" style="margin:0;font-size:12px">Upravljanje sekcijama Craftsmanship stranice.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-3)">
            ${secDefs.map(([k, label]) => `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="sec-${k}" ${secs[k] !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> ${label}</label>`).join('')}
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Zanatstvo</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderMaterialsTab() {
    const m = this.config.materials || {};
    const visible = Array.isArray(m.visible) ? m.visible : [];
    const matDefs = [
      ['organic-cotton', 'Organski Pamuk', '🌿'],
      ['premium-cotton', 'Premium Pamuk', '✨'],
      ['french-terry', 'Francuski Teri', '🧶'],
      ['brushed-fleece', 'Četkani Fleece', '❄️'],
      ['linen-blend', 'Lanena Mešavina', '🌾'],
      ['merino-wool', 'Merino Vuna', '🐑'],
      ['future-materials', 'Materijali Budućnosti', '🔬'],
    ];
    return `
      <form class="card" data-ec-form="materials">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Materijali</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${m.enabled !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <p class="text-tertiary" style="margin:0;font-size:12px">Izbor materijala koji će biti vidljivi na Materials stranici.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-3)">
            ${matDefs.map(([k, label, icon]) => `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="mat-${k}" ${visible.includes(k) || visible.length === 0 ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> ${icon} ${label}</label>`).join('')}
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Materijale</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderVideoTab() {
    const v = this.config.video || {};
    return `
      <form class="card" data-ec-form="video">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Video Story Podešavanja</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${v.enabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <p class="text-tertiary" style="margin:0;font-size:12px">Laka arhitektura za brend video, kolekcijske filmove i editorial videe. Bez teških biblioteka — performance safe.</p>
          <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="lazyLoad" ${v.lazyLoad !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Lazy load videa</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            <div class="form-group"><label class="input-label">Preload</label><select class="input-field select-field" name="preload" ${!this.canManage() ? 'disabled' : ''}><option value="none" ${v.preload === 'none' ? 'selected' : ''}>none</option><option value="metadata" ${v.preload === 'metadata' ? 'selected' : ''}>metadata</option></select></div>
            <div class="form-group"><label class="input-label">Max istovremeno</label><input type="number" min="1" max="5" class="input-field" name="maxConcurrent" value="${v.maxConcurrent || 1}" ${!this.canManage() ? 'disabled' : ''}></div>
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Video</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderOutfitsTab() {
    const o = this.config.outfits || {};
    return `
      <form class="card" data-ec-form="outfits">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Outfit Engine</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${o.enabled !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <p class="text-tertiary" style="margin:0;font-size:12px">DALLI Outfit Intelligence Engine - od pojedinačnih proizvoda ka kompletiranim lookovima i luxury stilizaciji.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="lookRecommendations" ${o.lookRecommendations !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Preporuke Lookova</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="styleRecommendations" ${o.styleRecommendations !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Style Preporuke</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="luxuryStylingMode" ${o.luxuryStylingMode ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Luxury Styling Mode</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="completeTheLook" ${o.completeTheLook !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> "Complete The Look" sekcija</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="lookOfTheWeek" ${o.lookOfTheWeek !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> "Look Of The Week" na Homepage</label>
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Outfit Engine</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderMembershipTab() {
    const m = this.config.membership || {};
    return `
      <form class="card" data-ec-form="membership">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Membership Center</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${m.enabled !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <p class="text-tertiary" style="margin:0;font-size:12px">DALLI Private Client & Luxury Membership Ecosystem - tier hijerarhija, early access, ekskluzivne kolekcije, VIP dashboard, invitation system.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="earlyAccessEngine" ${m.earlyAccessEngine !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Early Access Engine</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="exclusiveCollections" ${m.exclusiveCollections !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Exclusive Collections</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="vipDashboard" ${m.vipDashboard !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> VIP Dashboard</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="privateClientProgram" ${m.privateClientProgram !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Private Client Program</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="invitationSystem" ${m.invitationSystem ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Invitation System (Architecture)</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="limitedEditionEngine" ${m.limitedEditionEngine !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Limited Edition Engine</label>
          </div>
          <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4);margin-top:var(--space-2)">
            <h4 style="margin:0 0 var(--space-3);font-size:var(--text-sm);color:var(--color-text-tertiary)">Owner-Only Controls</h4>
            <p class="text-tertiary" style="margin:0;font-size:12px">Samo Owner može aktivirati Membership Engine, menjati Tier Rules, Release Rules, kreirati Private Client pristup.</p>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap">
              ${this.isOwner() ? `<button type="button" class="btn btn-primary" data-action="membership-tier-rules">Tier Rules</button><button type="button" class="btn btn-secondary" data-action="membership-release-rules">Release Rules</button><button type="button" class="btn btn-secondary" data-action="membership-create-private">Create Private Client</button>` : '<span class="badge badge-secondary">Samo Owner vidi ove kontrole</span>'}
            </div>
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Membership Center</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderImmersiveTab() {
    const i = this.config.immersive || {};
    return `
      <form class="card" data-ec-form="immersive">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Immersive Experience Manager</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${i.enabled !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <p class="text-tertiary" style="margin:0;font-size:12px">DALLI Worlds, Cinematic Collections, Signature Moments, Editorial Experience - luxury digital experience layer.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="collectionWorlds" ${i.collectionWorlds !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Collection Worlds (Casual/Elegance)</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="signatureMoments" ${i.signatureMoments !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Signature Moments</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="editorialExperience" ${i.editorialExperience !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Editorial Experience</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="luxuryJourneySystem" ${i.luxuryJourneySystem !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Luxury Journey System</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="cinematicCollections" ${i.cinematicCollections !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Cinematic Collections</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="microInteractions" ${i.microInteractions !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Micro Interactions</label>
          </div>
          <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4);margin-top:var(--space-2)">
            <h4 style="margin:0 0 var(--space-3);font-size:var(--text-sm);color:var(--color-text-tertiary)">Presentation Rules</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);font-size:12px">
              <label class="text-tertiary"><input type="checkbox" name="respectReducedMotion" ${i.presentationRules?.respectReducedMotion !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Respect Reduced Motion</label>
              <label class="text-tertiary"><input type="checkbox" name="soundArchitecture" ${i.soundArchitecture?.enabled ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Sound Architecture (Ready)</label>
            </div>
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Immersive Experience</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderGlobalTab() {
    const g = this.config.global || {};
    return `
      <form class="card" data-ec-form="global">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Global Expansion Center</h3><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="enabled" ${g.enabled !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Omogući</label></div>
          <p class="text-tertiary" style="margin:0;font-size:12px">DALLI Global Commerce Engine - countries, currencies, shipping, payments, SEO, languages. Owner-controlled worldwide expansion.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="countryActivation" ${g.countryActivation !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Country Activation</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="regionalPricing" ${g.regionalPricing !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Regional Pricing</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="regionalSEO" ${g.regionalSEO !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Regional SEO</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="regionalCollections" ${g.regionalCollections !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Regional Collections</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="multiCurrency" ${g.multiCurrency !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Multi Currency</label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="regionalPersonalization" ${g.regionalPersonalization !== false ? 'checked' : ''} ${!this.canManage() ? 'disabled' : ''}> Regional Personalization</label>
          </div>
          <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4);margin-top:var(--space-2)">
            <h4 style="margin:0 0 var(--space-3);font-size:var(--text-sm);color:var(--color-text-tertiary)">Expansion Readiness</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-2);font-size:12px">
              <label class="text-tertiary"><input type="checkbox" disabled checked> Balkans (6 countries) - Ready</label>
              <label class="text-tertiary"><input type="checkbox" disabled> DACH (3 countries) - Architecture</label>
              <label class="text-tertiary"><input type="checkbox" disabled> EU West (2 countries) - Architecture</label>
              <label class="text-tertiary"><input type="checkbox" disabled> UK - Architecture</label>
              <label class="text-tertiary"><input type="checkbox" disabled> North America - Architecture</label>
              <label class="text-tertiary"><input type="checkbox" disabled> Middle East - Architecture</label>
            </div>
          </div>
          <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4);margin-top:var(--space-2)">
            <h4 style="margin:0 0 var(--space-3);font-size:var(--text-sm);color:var(--color-text-tertiary)">Future Ready (Architecture Only)</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-2);font-size:12px">
              <label class="text-tertiary"><input type="checkbox" disabled> European Expansion</label>
              <label class="text-tertiary"><input type="checkbox" disabled> Middle East Expansion</label>
              <label class="text-tertiary"><input type="checkbox" disabled> North America Expansion</label>
              <label class="text-tertiary"><input type="checkbox" disabled> Global Warehouses</label>
              <label class="text-tertiary"><input type="checkbox" disabled> Regional Fulfillment</label>
            </div>
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj Global Expansion Center</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderCampaignsTab() {
    return `
      <div class="card">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">Campaign Manager</h3>
            <span class="badge badge-info">Korisiti core SectionAPI</span>
          </div>
          <div class="text-tertiary" style="font-size:12px">Kampanje se kreiraju/upravljaju preko Core Platform-e.</div>
          <a class="btn btn-secondary" href="#campaigns" style="align-self:flex-start">Otvori Kampanje</a>
        </div>
      </div>
    `;
  }

  renderAnalyticsTab() {
    return `

        <div class="card">

          <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">

            <div style="display:flex;justify-content:space-between;align-items:center">

              <h3 style="margin:0">Analytics Integration</h3>

              <span class="badge badge-info">Core Analytics</span>

            </div>

            <div class="text-tertiary" style="font-size:12px">GA4/GTM/Meta Pixel/TikTok/Microsoft Clarity/Bing Webmaster - upravljanje iz core oblasti.</div>

            <a class="btn btn-secondary" href="#analytics" style="align-self:flex-start">Otvori Analitiku</a>

          </div>

        </div>

      `;
  }

  renderSeoTab() {
    return `

        <div class="card">

          <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">

            <div style="display:flex;justify-content:space-between;align-items:center">

              <h3 style="margin:0">SEO Control Center</h3>

              <span class="badge badge-info">Core SEO</span>

            </div>

            <div class="text-tertiary" style="font-size:12px">Homepage/Collection/Campaign/Blog SEO, Auto Mode vs Custom Override. Product SEO ostaje automatski iz CMS-a.</div>

            <a class="btn btn-secondary" href="#seo" style="align-self:flex-start">Otvori SEO Centar</a>

          </div>

        </div>

      `;
  }

  renderPromotionsTab() {
    return `

        <div class="card">

          <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">

            <div style="display:flex;justify-content:space-between;align-items:center">

              <h3 style="margin:0">Promotion Manager</h3>

              <span class="badge badge-info">Core promotions</span>

            </div>

            <div class="text-tertiary" style="font-size:12px">Globalni/home/collection bannere upravljaj preko Core Promotion Manager-a.</div>

            <a class="btn btn-secondary" href="#promotions" style="align-self:flex-start">Otvori Promocije</a>

          </div>

        </div>

      `;
  }

  renderPermissionsTab() {
    const role = this.getRole();
    const canMng = this.canManage();
    const isOwn = this.isOwner();
    const publicSlice = getPublicSlice(this.config);
    return `
      <div class="card">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Dozvole (read-only)</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-3)">
            <div><div class="text-tertiary" style="font-size:12px">Efektivna uloga</div><div style="font-weight:600">${ImperiumUtils.escapeHtml(role)}</div></div>
            <div><div class="text-tertiary" style="font-size:12px">experienceCenter dozvola</div><div>${canMng ? '<span class="badge badge-success">DA</span>' : '<span class="badge badge-danger">NE</span>'}</div></div>
            <div><div class="text-tertiary" style="font-size:12px">Owner akcije</div><div>${isOwn ? '<span class="badge badge-success">DA</span>' : '<span class="badge badge-secondary">NE</span>'}</div></div>
            <div><div class="text-tertiary" style="font-size:12px">Izvor dozvola</div><div><code>core-rbac</code></div></div>
          </div>
          <div>
            <div class="text-tertiary" style="font-size:12px;margin-bottom:6px">Javni slice (public)</div>
            <pre style="margin:0;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-sm);overflow:auto;font-size:11px;max-height:240px">${ImperiumUtils.escapeHtml(JSON.stringify(publicSlice, null, 2))}</pre>
          </div>
          <div class="text-tertiary" style="font-size:12px">Experience Center čita dozvole isključivo iz Core Platform-e. Nema vlastitog RBAC-a.</div>
        </div>
      </div>
    `;
  }

  renderCoreNotice(title, desc) {
    return `
      <div class="card">
        <div class="card-body" style="padding:var(--space-5)">
          <h3 style="margin:0 0 var(--space-2)">${title}</h3>
          <p class="text-tertiary" style="margin:0 0 var(--space-3)">${desc}</p>
          <div class="text-tertiary" style="font-size:12px">Ova sekcija se upravlja preko Core Platform-e (SectionAPI/core modeli). Experience Center je read-only po dizajnu.</div>
        </div>
      </div>
    `;
  }

  // ==================== PHASE 20.5 SECTORS ====================

  courierEntries() {
    const carriers = this.live?.shipping?.shipping?.carriers;
    const out = [];
    if (carriers && typeof carriers === 'object' && !Array.isArray(carriers)) {
      Object.entries(carriers).forEach(([id, c]) =>
        out.push({
          id,
          name: c.name || id,
          countries: Array.isArray(c.countries) ? c.countries : [],
          trackingUrl: c.trackingUrl || '',
          apiEnabled: !!c.apiEnabled,
        })
      );
    }
    const required = [
      ['Posta_Srbije', 'Pošta Srbije'],
      ['BEX', 'BEX'],
      ['Aks', 'Aks'],
      ['City_Express', 'City Express'],
      ['D_Express', 'D Express'],
      ['Daily_Express', 'Daily Express'],
      ['X_Express', 'X Express'],
      ['DHL', 'DHL'],
      ['UPS', 'UPS'],
      ['FedEx', 'FedEx'],
    ];
    required.forEach(([id, name]) => {
      if (!out.some(c => c.name === name || c.id === id)) {
        out.push({ id, name, countries: [], trackingUrl: '', apiEnabled: false });
      }
    });
    return out;
  }

  storeSeed() {
    if (Array.isArray(this.config.stores) && this.config.stores.length) return this.config.stores;
    return (this.live?.locations?.locations || []).map(l => ({
      id: l.id,
      name: l.name,
      coverImage: '',
      gallery: [],
      address: l.address || {},
      phone: l.phone || '',
      manager: '',
      workingHours: '',
      coordinates: l.geo ? { latitude: l.geo.latitude, longitude: l.geo.longitude } : {},
      mapsUrl: '',
      services: [],
      status: 'active',
    }));
  }

  paymentMethodSummary() {
    const methods = this.live?.payments?.payments?.methods;
    if (!methods || typeof methods !== 'object') return [];
    return Object.keys(methods);
  }

  openModal(id, { title, bodyHtml, onSave, saveLabel = 'Sačuvaj' }) {
    this.closeModal(id);
    const overlay = document.createElement('div');
    overlay.className = 'ec-modal-overlay';
    overlay.dataset.ecModal = id;
    overlay.innerHTML = `
      <div class="ec-modal" role="dialog" aria-modal="true">
        <div class="ec-modal-header"><h3 style="margin:0">${esc(title)}</h3><button type="button" class="btn btn-ghost btn-sm" data-ec-modal-close aria-label="Zatvori">×</button></div>
        <div class="ec-modal-body">${bodyHtml}</div>
        <div class="ec-modal-footer">
          <button type="button" class="btn btn-secondary" data-ec-modal-close>Otkaži</button>
          <button type="button" class="btn btn-primary" data-ec-modal-save>${esc(saveLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => this.closeModal(id);
    overlay
      .querySelectorAll('[data-ec-modal-close]')
      .forEach(b => b.addEventListener('click', close));
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });
    this._modalEsc = e => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', this._modalEsc);

    const saveBtn = overlay.querySelector('[data-ec-modal-save]');
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      let ok = true;
      try {
        ok = await onSave(overlay);
      } finally {
        saveBtn.disabled = false;
      }
      if (ok !== false) close();
    });

    requestAnimationFrame(() => overlay.querySelector('textarea, input, select')?.focus());
  }

  closeModal(id) {
    const el = document.querySelector(`[data-ec-modal="${id}"]`);
    if (el) el.remove();
    if (this._modalEsc) {
      document.removeEventListener('keydown', this._modalEsc);
      this._modalEsc = null;
    }
  }

  openJsonRuleEditor(key, label) {
    const m = this.config.membership || {};
    const current = m[key] !== undefined ? m[key] : [];
    this.openModal(`membership-${key}`, {
      title: label,
      bodyHtml: `
        <p class="text-tertiary" style="margin:0 0 var(--space-3);font-size:12px">Uredite pravila kao JSON i sačuvajte u Membership Center.</p>
        <textarea class="input-field textarea-field" data-ec-json rows="14" style="width:100%;font-family:monospace;font-size:12px">${esc(
          JSON.stringify(current, null, 2)
        )}</textarea>`,
      onSave: async overlay => {
        let parsed;
        try {
          parsed = JSON.parse(overlay.querySelector('[data-ec-json]').value || '[]');
        } catch (err) {
          this.toast('error', 'Neispravan JSON');
          return false;
        }
        const res = await this.saveSection('membership', { [key]: parsed });
        if (res.ok) this.toast('success', `${label} sačuvano`);
        else this.toast('error', res.error || 'Greška');
        return res.ok;
      },
    });
  }

  openPrivateClientCreator() {
    this.openModal('membership-private', {
      title: 'Novi Private Client',
      saveLabel: 'Kreiraj',
      bodyHtml: `
        <div class="form-group"><label class="input-label">Ime i prezime</label><input class="input-field" data-pc-name placeholder="Ime Prezime"></div>
        <div class="form-group"><label class="input-label">E-mail</label><input class="input-field" type="email" data-pc-email placeholder="klijent@email.com"></div>
        <div class="form-group"><label class="input-label">Tier</label>
          <select class="input-field select-field" data-pc-tier>
            <option value="signature">Signature</option>
            <option value="elegance">Elegance</option>
            <option value="private">Private</option>
            <option value="vip">VIP</option>
          </select>
        </div>
        <div class="form-group"><label class="input-label">Napomena</label><textarea class="input-field textarea-field" data-pc-note rows="2"></textarea></div>`,
      onSave: async overlay => {
        const name = overlay.querySelector('[data-pc-name]').value.trim();
        const email = overlay.querySelector('[data-pc-email]').value.trim();
        if (!name || !email) {
          this.toast('error', 'Ime i e-mail su obavezni');
          return false;
        }
        const client = {
          id: `pc-${Date.now().toString(36)}`,
          name,
          email,
          tier: overlay.querySelector('[data-pc-tier]').value,
          note: overlay.querySelector('[data-pc-note]').value.trim(),
          createdAt: new Date().toISOString(),
        };
        const m = this.config.membership || {};
        const privateClients = Array.isArray(m.privateClients) ? m.privateClients.slice() : [];
        privateClients.push(client);
        const res = await this.saveSection('membership', { privateClients });
        if (res.ok) this.toast('success', `Private client kreiran: ${name}`);
        else this.toast('error', res.error || 'Greška');
        return res.ok;
      },
    });
  }

  openReconcileModal() {
    const t = this.config.treasury || {};
    const ledger = Array.isArray(t.ledger) ? t.ledger : [];
    const actuals = Array.isArray(t.actuals) ? t.actuals : [];
    this.openModal('treasury-reconcile', {
      title: 'Usklađivanje (Reconciliation)',
      saveLabel: 'Pokreni usklađivanje',
      bodyHtml: `
        <p class="text-tertiary" style="margin:0;font-size:12px">
          Nalepite stvarne stavke (npr. izvod banke) kao JSON niz. Svaka stavka: <code>{ "id": "...", "amount": 1234.56 }</code>.
          Poklapanje se vrši po <strong>ID-u</strong> i iznosu (uz toleranciju). Ledger stavki: <strong>${ledger.length}</strong>.
        </p>
        <textarea class="input-field textarea-field" data-ec-actuals rows="10" style="width:100%;font-family:monospace;font-size:12px" placeholder='[{ "id": "INV-1001", "amount": 14990 }]'>${esc(
          JSON.stringify(actuals, null, 2)
        )}</textarea>
        <div class="form-row">
          <div class="form-group"><label class="input-label">Tolerancija (iznos)</label><input class="input-field" type="number" step="0.01" min="0" data-ec-tolerance value="${esc(
            (t.reconciliation && t.reconciliation.tolerance) ?? 0.01
          )}"></div>
          <label class="et-check" style="align-self:flex-end;margin:0"><input type="checkbox" data-ec-automatch ${!t.reconciliation || t.reconciliation.autoMatch ? 'checked' : ''}><span>Auto-match</span></label>
        </div>`,
      onSave: async overlay => {
        let parsed;
        const raw = overlay.querySelector('[data-ec-actuals]').value.trim();
        try {
          parsed = raw ? JSON.parse(raw) : [];
        } catch (err) {
          this.toast('error', 'Neispravan JSON u stvarnim stavkama');
          return false;
        }
        if (!Array.isArray(parsed)) {
          this.toast('error', 'Stvarne stavke moraju biti niz');
          return false;
        }
        const tolerance = Number(overlay.querySelector('[data-ec-tolerance]').value || 0.01);
        const autoMatch = overlay.querySelector('[data-ec-automatch]').checked;
        const result = this.runReconciliation(ledger, parsed, tolerance, autoMatch);
        const res = await this.saveSection('treasury', {
          ledger: result.ledger,
          actuals: parsed,
          reconciliation: result.summary,
        });
        if (res.ok) {
          this.toast(
            'success',
            `Usklađeno: ${result.summary.matched} · Neusklađeno: ${result.summary.unmatched} · Višak: ${result.summary.orphans}`
          );
        } else {
          this.toast('error', res.error || 'Greška pri čuvanju');
        }
        return res.ok;
      },
    });
  }

  runReconciliation(ledger, actuals, tolerance, autoMatch) {
    const tol = Number.isFinite(tolerance) ? Math.abs(tolerance) : 0.01;
    const actualById = new Map();
    actuals.forEach(a => {
      if (a && a.id != null) actualById.set(String(a.id), a);
    });
    const usedActuals = new Set();
    let matched = 0;

    const nextLedger = (Array.isArray(ledger) ? ledger : []).map(entry => {
      const id = entry && entry.id != null ? String(entry.id) : '';
      const actual = id ? actualById.get(id) : null;
      const ledgerAmount = Number(entry && entry.amount);
      const actualAmount = actual ? Number(actual.amount) : NaN;
      const isMatch =
        autoMatch !== false &&
        !!actual &&
        Number.isFinite(ledgerAmount) &&
        Number.isFinite(actualAmount) &&
        Math.abs(ledgerAmount - actualAmount) <= tol;
      if (isMatch) {
        matched += 1;
        usedActuals.add(id);
      }
      return {
        ...entry,
        matched: isMatch,
        actualAmount:
          actual && Number.isFinite(actualAmount)
            ? actualAmount
            : entry
              ? entry.actualAmount
              : undefined,
        matchedAt: new Date().toISOString(),
      };
    });

    const orphans = actuals.filter(a => a && a.id != null && !usedActuals.has(String(a.id))).length;
    return {
      ledger: nextLedger,
      summary: {
        lastRunAt: new Date().toISOString(),
        matched,
        unmatched: nextLedger.length - matched,
        orphans,
        tolerance: tol,
        autoMatch: autoMatch !== false,
      },
    };
  }

  generateReport(period, format) {
    const cfg = this.config;
    const report = {
      period,
      generatedAt: new Date().toISOString(),
      revenue: cfg.treasury?.reports?.[`${period}Scale`] ?? null,
      bankAccounts: (cfg.finance?.bankAccounts || []).length,
      cryptoWallets: (cfg.finance?.cryptoWallets || []).length,
      cardDepositAccounts: (cfg.finance?.cardDepositAccounts || []).length,
      taxProfile: cfg.finance?.taxProfiles?.vatRules || '',
      paymentMethods: this.paymentMethodSummary(),
      domains: (cfg.domains?.list || []).map(d => ({
        domain: d.domain,
        enabled: d.enabled,
        currency: d.currency,
      })),
      reconciliation: cfg.treasury?.reconciliation || null,
    };
    const base = `dalli-${period}-report-${new Date().toISOString().slice(0, 10)}`;
    if (format === 'json') {
      downloadFile(`${base}.json`, JSON.stringify(report, null, 2), 'application/json');
    } else if (format === 'pdf') {
      const html = `<html><head><title>${esc(base)}</title></head><body style="font-family:sans-serif;padding:32px"><h1>DALLI — ${esc(period)} report</h1><pre>${esc(JSON.stringify(report, null, 2))}</pre></body></html>`;
      const win = window.open('', '_blank', 'noopener');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
      }
    } else {
      const csv = toCsv(report);
      const type = format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';
      const ext = format === 'excel' ? 'xls' : 'csv';
      downloadFile(`${base}.${ext}`, csv, type);
    }
    this.toast('success', `Izveštaj generisan (${period} · ${format.toUpperCase()})`);
  }

  reportSummaryText() {
    const cfg = this.config;
    const t = cfg.treasury?.reports || {};
    return (
      `DALLI — finansijski pregled (${new Date().toLocaleString('sr-RS')})\n` +
      `Prihod (mesečna skala): ${t.monthlyScale || 0}\n` +
      `Bankovni računi: ${(cfg.finance?.bankAccounts || []).length}\n` +
      `Kripto novčanici: ${(cfg.finance?.cryptoWallets || []).length}\n` +
      `Metodi plaćanja: ${this.paymentMethodSummary().join(', ') || '—'}\n` +
      `Usklađivanje: ${cfg.treasury?.reconciliation?.matched ?? 0} usklađeno / ${cfg.treasury?.reconciliation?.unmatched ?? 0} neusklađeno`
    );
  }

  async shareReport(channel) {
    const text = this.reportSummaryText();
    const subject = 'DALLI finansijski izveštaj';

    if (channel === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      this.toast('success', 'Otvoren e-mail klijent');
      return;
    }
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      this.toast('success', 'Otvaram WhatsApp');
      return;
    }
    if (channel === 'telegram') {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent('https://dalli.rs')}&text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener'
      );
      this.toast('success', 'Otvaram Telegram');
      return;
    }
    if (channel === 'slack') {
      const webhook = this.config.finance?.slackWebhook || this.config.slackWebhook;
      if (webhook) {
        try {
          await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
          this.toast('success', 'Poslato u Slack');
          return;
        } catch (err) {
          this.toast('error', 'Slack webhook nije dostupan');
          return;
        }
      }
      await this.copyToClipboard(text);
      return;
    }
    await this.copyToClipboard(text);
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast('success', 'Izveštaj kopiran u klipbord');
    } catch (err) {
      this.toast('warning', 'Kopiranje nije dostupno u ovom pregledaču');
    }
  }

  renderOsTab() {
    const cfg = this.config;
    const carriers = this.courierEntries();
    const enabledCouriers = carriers.filter(c => cfg.shipping?.couriers?.[c.id]?.enabled).length;
    const countryGroups = cfg.global?.countries ? Object.values(cfg.global.countries).flat() : [];
    const storesCount = this.storeSeed().length;
    const alerts = [];
    if (!cfg.brandIdentity?.companyName) alerts.push('Popunite podatke o firmi (Brand podaci).');
    if (!(cfg.finance?.bankAccounts || []).length)
      alerts.push('Dodajte najmanje jedan bankovni račun (Finansije).');
    if (
      (cfg.payments?.store?.crypto || cfg.payments?.store?.cryptoEnabled) &&
      !(cfg.finance?.cryptoWallets || []).length
    )
      alerts.push('Kripto plaćanje je uključeno, a nema kripto novčanika.');
    if (cfg.operations?.holiday?.enabled)
      alerts.push('Collective vacation / Holiday mode je AKTIVAN.');
    if (cfg.maintenance?.enabled) alerts.push('Maintenance mode je AKTIVAN.');
    const tasks = [];
    if (!cfg.assets?.positions?.headerLogo?.assetId) tasks.push('Izaberite header logo.');
    if (storesCount === 0) tasks.push('Dodajte fizičke lokacije (Prodavnice).');
    if (!(cfg.finance?.cryptoWallets || []).length) tasks.push('Konfigurišite kripto novčanike.');
    const kpis = [
      {
        label: 'Prihod (skala)',
        value: cfg.treasury?.reports?.monthlyScale ? `#${cfg.treasury.reports.monthlyScale}` : '—',
        note: 'mesečno · podesivo u Trezoru',
      },
      { label: 'Porudžbine', value: this.osStats?.products ?? '—', note: 'artikli u katalogu' },
      {
        label: 'Aktivna tema',
        value: cfg.activeThemeId || '—',
        note: cfg.scheduledTheme ? `zakazana: ${cfg.scheduledTheme.themeId}` : 'nema zakazane',
      },
      {
        label: 'Aktivna kampanja',
        value: cfg.brand?.homepageCampaign?.enabled ? 'DA' : '—',
        note: 'core Campaign Manager',
      },
      { label: 'Tržišta', value: countryGroups.length || '—', note: 'aktivacija po zemljama' },
      { label: 'Dostava', value: `${enabledCouriers}/${carriers.length}`, note: 'aktivni kuriri' },
      {
        label: 'Membership',
        value: cfg.membership?.enabled ? 'ON' : 'OFF',
        note: 'membership centar',
      },
      {
        label: 'System health',
        value: this.error ? 'DEGRADED' : 'OK',
        note: this.error ? 'greška pri učitavanju' : 'sve aktivno',
      },
      { label: 'Alerts', value: String(alerts.length), note: 'zahteva pažnju' },
      { label: 'Tasks', value: String(tasks.length), note: 'preporučene radnje' },
    ];
    const kpiHtml = kpis
      .map(
        k =>
          `<div class="ec-kpi"><div class="ec-kpi-value">${esc(k.value)}</div><div class="ec-kpi-label">${esc(k.label)}</div><div class="ec-kpi-note">${esc(k.note)}</div></div>`
      )
      .join('');
    const alertHtml = alerts.length
      ? alerts.map(a => `<li>${esc(a)}</li>`).join('')
      : '<li class="text-tertiary">Nema aktivnih upozorenja.</li>';
    const taskHtml = tasks.length
      ? tasks.map(t => `<li>${esc(t)}</li>`).join('')
      : '<li class="text-tertiary">Nema otvorenih zadataka.</li>';
    return `
      <div class="card">
        <div class="card-body" style="padding:var(--space-5)">
          <h3 style="margin:0 0 var(--space-4)">Owner Dashboard</h3>
          <div class="ec-kpi-grid">${kpiHtml}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-top:var(--space-5)">
            <div>
              <h4 style="margin:0 0 var(--space-2);font-size:var(--text-sm)">Alerts</h4>
              <ul class="ec-list">${alertHtml}</ul>
            </div>
            <div>
              <h4 style="margin:0 0 var(--space-2);font-size:var(--text-sm)">Zadaci koji zahtevaju pažnju</h4>
              <ul class="ec-list">${taskHtml}</ul>
            </div>
          </div>
          <div class="text-tertiary" style="font-size:12px;margin-top:var(--space-4)">Vlasnik operiše ceo DALLI ekosistem iz Experience Centra — brend, imovinu, domene, komunikaciju, finansije, dostavu, prodavnice, skladišta i operacije.</div>
        </div>
      </div>
    `;
  }

  renderBrandIdentityTab() {
    const b = this.config.brandIdentity || {};
    const a = b.address || {};
    const disabled = this.canManage() ? '' : 'disabled';
    return `
      <form class="card" data-ec-form="brandIdentity">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Brand podaci (Sector 1)</h3>
          <div class="form-row">
            ${field('Naziv brenda', 'brandName', b.brandName, disabled)}
            ${field('Naziv firme', 'companyName', b.companyName, disabled)}
          </div>
          <div class="form-row">
            ${field('Primarni domen', 'primaryDomain', b.primaryDomain, disabled)}
            ${field('Sekundarni domeni (zarezom)', 'secondaryDomains', (b.secondaryDomains || []).join(', '), disabled)}
          </div>
          ${fieldArea('Poslovne informacije', 'businessInfo', b.businessInfo, disabled, 2)}
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Adresa</h4>
          <div class="form-row">
            ${field('Ulica i broj', 'streetAddress', a.streetAddress, disabled)}
            ${field('Grad', 'addressLocality', a.addressLocality, disabled)}
          </div>
          <div class="form-row">
            ${field('Poštanski broj', 'postalCode', a.postalCode, disabled)}
            ${field('Zemlja (ISO)', 'addressCountry', a.addressCountry, disabled)}
          </div>
          ${fieldArea('Kontakt informacije', 'contactInfo', b.contactInfo, disabled, 2)}
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj brand podatke</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderAssetsTab() {
    const assets = this.config.assets || { library: [], positions: {} };
    const library = assets.library || [];
    const positions = assets.positions || {};
    const disabled = this.canManage() ? '' : 'disabled';
    const libRows = library
      .map(
        a => `
      <div class="et-row" data-os-row data-os-kind="asset">
        <input class="input-field" name="id" value="${esc(a.id)}" placeholder="id" ${disabled}>
        <input class="input-field" name="label" value="${esc(a.label)}" placeholder="Naziv" ${disabled}>
        <input class="input-field" name="url" value="${esc(a.url)}" placeholder="/images/logos/...">
        <select class="input-field select-field" name="type" ${disabled}>
          ${['logo', 'wordmark', 'icon', 'favicon', 'app', 'og', 'social'].map(t => `<option value="${t}" ${a.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    const posRows = ASSET_POSITIONS.map(p => {
      const cur = positions[p.key] || {};
      const options = library
        .map(
          a =>
            `<option value="${esc(a.id)}" ${cur.assetId === a.id ? 'selected' : ''}>${esc(a.label || a.id)}</option>`
        )
        .join('');
      const preview = library.find(a => a.id === cur.assetId);
      return `
      <tr>
        <td>${esc(p.label)}</td>
        <td>
          <select class="input-field select-field" data-os-position="${p.key}" ${disabled}>
            <option value="">—</option>
            ${options}
          </select>
          <input class="input-field" style="margin-top:4px" data-os-position-alt="${p.key}" value="${esc(cur.alt)}" placeholder="alt tekst" ${disabled}>
        </td>
        <td style="text-align:center">${preview && preview.url ? `<img src="${esc(preview.url)}" alt="" style="max-height:36px">` : '<span class="text-tertiary">—</span>'}</td>
        <td class="text-tertiary" style="font-size:11px">${esc(p.rec)} · min ${esc(p.min)} · max ${esc(p.max)}<br>${esc(p.formats)}</td>
      </tr>`;
    }).join('');
    return `
      <form class="card" data-ec-form="assets">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Brand Asset Center (Sector 2)</h3>
          <p class="text-tertiary" style="margin:0;font-size:12px">Biblioteka logotipa + dodela po pozicijama sa preporukama dimenzija.</p>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Biblioteka logotipa</h4>
          <div data-os-list="asset">${libRows || '<div class="text-tertiary" style="font-size:12px">Biblioteka je prazna.</div>'}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="asset" style="align-self:flex-start">+ Dodaj logo</button>' : ''}
          <template data-os-tpl="asset">
            <div class="et-row" data-os-row data-os-kind="asset">
              <input class="input-field" name="id" placeholder="id">
              <input class="input-field" name="label" placeholder="Naziv">
              <input class="input-field" name="url" placeholder="/images/logos/...">
              <select class="input-field select-field" name="type">
                <option value="logo">logo</option><option value="wordmark">wordmark</option><option value="icon">icon</option>
                <option value="favicon">favicon</option><option value="app">app</option><option value="og">og</option><option value="social">social</option>
              </select>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Pozicije logotipa</h4>
          <div class="table-container">
            <table class="table">
              <thead><tr><th>Pozicija</th><th>Logo + alt</th><th>Pregled</th><th>Zahtevi</th></tr></thead>
              <tbody>${posRows}</tbody>
            </table>
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj imovinu</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderDomainsTab() {
    const d = this.config.domains || { list: [], primary: {} };
    const list = d.list || [];
    const disabled = this.canManage() ? '' : 'disabled';
    const rows = list
      .map(
        dom => `
      <div class="et-row" data-os-row data-os-kind="domain">
        <input class="input-field" name="domain" value="${esc(dom.domain)}" placeholder="dalli.rs" ${disabled}>
        <label class="et-check" style="margin:0"><input type="checkbox" name="enabled" ${dom.enabled ? 'checked' : ''} ${disabled}><span>ON</span></label>
        <label class="et-check" style="margin:0"><input type="checkbox" name="primary" ${dom.primary ? 'checked' : ''} ${disabled}><span>Primarni</span></label>
        <input class="input-field" name="language" value="${esc(dom.language)}" placeholder="sr" ${disabled}>
        <input class="input-field" name="currency" value="${esc(dom.currency)}" placeholder="RSD" ${disabled}>
        <input class="input-field" name="seoOverride" value="${esc(dom.seoOverride)}" placeholder="SEO override" ${disabled}>
        <input class="input-field" name="regionalRules" value="${esc(dom.regionalRules)}" placeholder="Regionalna pravila" ${disabled}>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    return `
      <form class="card" data-ec-form="domains">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Domain Manager</h3>
          <p class="text-tertiary" style="margin:0;font-size:12px">Primarni + dodatni domeni. Svaki domen: uključen/ON-OFF, jezik, valuta, SEO override, regionalna pravila.</p>
          <div data-os-list="domain">${rows}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="domain" style="align-self:flex-start">+ Dodaj domen</button>' : ''}
          <template data-os-tpl="domain">
            <div class="et-row" data-os-row data-os-kind="domain">
              <input class="input-field" name="domain" placeholder="dalli.rs">
              <label class="et-check" style="margin:0"><input type="checkbox" name="enabled" checked><span>ON</span></label>
              <label class="et-check" style="margin:0"><input type="checkbox" name="primary"><span>Primarni</span></label>
              <input class="input-field" name="language" placeholder="sr">
              <input class="input-field" name="currency" placeholder="RSD">
              <input class="input-field" name="seoOverride" placeholder="SEO override">
              <input class="input-field" name="regionalRules" placeholder="Regionalna pravila">
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj domene</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderCommunicationTab() {
    const c = this.config.communication || { emails: [], phones: [] };
    const disabled = this.canManage() ? '' : 'disabled';
    const emailRows = (c.emails || [])
      .map(
        em => `
      <div class="et-row" data-os-row data-os-kind="email">
        <input class="input-field" name="address" value="${esc(em.address)}" placeholder="support@dalli.rs" ${disabled}>
        <div class="et-roles">${EMAIL_ROLES.map(r => `<label class="et-check" style="margin:0"><input type="checkbox" name="role" value="${r}" ${(em.roles || []).includes(r) ? 'checked' : ''} ${disabled}><span>${r}</span></label>`).join('')}</div>
        <label class="et-check" style="margin:0"><input type="checkbox" name="primary" ${em.primary ? 'checked' : ''} ${disabled}><span>Primarni</span></label>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    const phoneRows = (c.phones || [])
      .map(
        ph => `
      <div class="et-row" data-os-row data-os-kind="phone">
        <input class="input-field" name="label" value="${esc(ph.label)}" placeholder="Naziv" ${disabled}>
        <input class="input-field" name="number" value="${esc(ph.number)}" placeholder="+381..." ${disabled}>
        <select class="input-field select-field" name="kind" ${disabled}>${PHONE_KINDS.map(k => `<option value="${k}" ${ph.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
        <label class="et-check" style="margin:0"><input type="checkbox" name="primary" ${ph.primary ? 'checked' : ''} ${disabled}><span>Primarni</span></label>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    return `
      <form class="card" data-ec-form="communication">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Communication Center (Sector 4)</h3>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">E-mail adrese i role</h4>
          <div data-os-list="email">${emailRows}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="email" style="align-self:flex-start">+ Dodaj e-mail</button>' : ''}
          <template data-os-tpl="email">
            <div class="et-row" data-os-row data-os-kind="email">
              <input class="input-field" name="address" placeholder="support@dalli.rs">
              <div class="et-roles">${EMAIL_ROLES.map(r => `<label class="et-check" style="margin:0"><input type="checkbox" name="role" value="${r}"><span>${r}</span></label>`).join('')}</div>
              <label class="et-check" style="margin:0"><input type="checkbox" name="primary"><span>Primarni</span></label>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Telefoni</h4>
          <div data-os-list="phone">${phoneRows}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="phone" style="align-self:flex-start">+ Dodaj telefon</button>' : ''}
          <template data-os-tpl="phone">
            <div class="et-row" data-os-row data-os-kind="phone">
              <input class="input-field" name="label" placeholder="Naziv">
              <input class="input-field" name="number" placeholder="+381...">
              <select class="input-field select-field" name="kind">${PHONE_KINDS.map(k => `<option value="${k}">${k}</option>`).join('')}</select>
              <label class="et-check" style="margin:0"><input type="checkbox" name="primary"><span>Primarni</span></label>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj komunikaciju</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderSocialTab() {
    const s = this.config.social || { accounts: [], platforms: [], scopes: [] };
    const platforms =
      s.platforms && s.platforms.length
        ? s.platforms
        : ['instagram', 'facebook', 'tiktok', 'pinterest', 'youtube', 'linkedin', 'x', 'threads'];
    const scopes = s.scopes && s.scopes.length ? s.scopes : SOCIAL_SCOPES;
    const disabled = this.canManage() ? '' : 'disabled';
    const rows = (s.accounts || [])
      .map(
        a => `
      <div class="et-row" data-os-row data-os-kind="social">
        <select class="input-field select-field" name="platform" ${disabled}>${platforms.map(p => `<option value="${p}" ${a.platform === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
        <input class="input-field" name="handle" value="${esc(a.handle)}" placeholder="@handle" ${disabled}>
        <input class="input-field" name="url" value="${esc(a.url)}" placeholder="https://..." ${disabled}>
        <select class="input-field select-field" name="scope" ${disabled}>${scopes.map(sc => `<option value="${sc}" ${a.scope === sc ? 'selected' : ''}>${sc.toUpperCase()}</option>`).join('')}</select>
        <label class="et-check" style="margin:0"><input type="checkbox" name="primary" ${a.primary ? 'checked' : ''} ${disabled}><span>Primarni</span></label>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    return `
      <form class="card" data-ec-form="social">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Social Media Center (Sector 9)</h3>
          <p class="text-tertiary" style="margin:0;font-size:12px">Neograničen broj naloga sa scope-om: GLOBAL / CASUAL / ELEGANCE / COUNTRY / COLLECTION.</p>
          <div data-os-list="social">${rows}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="social" style="align-self:flex-start">+ Dodaj nalog</button>' : ''}
          <template data-os-tpl="social">
            <div class="et-row" data-os-row data-os-kind="social">
              <select class="input-field select-field" name="platform">${platforms.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
              <input class="input-field" name="handle" placeholder="@handle">
              <input class="input-field" name="url" placeholder="https://...">
              <select class="input-field select-field" name="scope">${scopes.map(sc => `<option value="${sc}">${sc.toUpperCase()}</option>`).join('')}</select>
              <label class="et-check" style="margin:0"><input type="checkbox" name="primary"><span>Primarni</span></label>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj naloge</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderApiAccountRow(provider, account = {}, disabled = '') {
    const creds = account.credentials || {};
    const fields = provider.fields
      .map(
        f =>
          `<input class="input-field" type="${f.secret ? 'password' : 'text'}" name="cred__${f.key}" value="${esc(
            creds[f.key]
          )}" placeholder="${esc(f.label)}${f.secret ? ' (tajno)' : ''}" autocomplete="off" ${disabled}>`
      )
      .join('');
    return `
      <div class="et-row" data-os-row data-os-kind="api-account">
        <input class="input-field" name="label" value="${esc(
          account.label
        )}" placeholder="Naziv naloga (npr. Glavni)" ${disabled}>
        ${fields}
        <label class="et-check" style="margin:0"><input type="checkbox" name="enabled" ${
          account.enabled === false ? '' : 'checked'
        } ${disabled}><span>Aktivan</span></label>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`;
  }

  renderProviderGroups(kind, providers, data, disabled) {
    return Object.entries(providers)
      .map(([key, provider]) => {
        const listName = `api:${kind}:${key}`;
        const accounts = Array.isArray(data[key]) ? data[key] : [];
        const rows = accounts.map(a => this.renderApiAccountRow(provider, a, disabled)).join('');
        return `
          <div class="api-provider-group" style="border-top:1px solid var(--color-border,#e5e7eb);padding-top:var(--space-3)">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-2)">
              <h4 style="margin:0">${esc(provider.label)}</h4>
              <span class="cell-tertiary">${accounts.length} nalog(a)</span>
            </div>
            ${provider.hint ? `<p class="text-tertiary" style="margin:2px 0 8px;font-size:12px">${esc(provider.hint)}</p>` : ''}
            <div data-os-list="${listName}">${rows}</div>
            ${this.canManage() ? `<button type="button" class="btn btn-secondary btn-sm" data-os-add="${listName}" style="align-self:flex-start;margin-top:var(--space-2)">+ Dodaj nalog</button>` : ''}
            <template data-os-tpl="${listName}">${this.renderApiAccountRow(provider, {}, '')}</template>
          </div>`;
      })
      .join('');
  }

  renderIntegrationsTab() {
    const cfg = this.config.integrations || { social: {}, ads: {} };
    const disabled = this.canManage() ? '' : 'disabled';
    return `
      <form class="card" data-ec-form="integrations">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-5)">
          <div>
            <h3 style="margin:0">Marketing API i kredencijali (Sector 11)</h3>
            <p class="text-tertiary" style="margin:4px 0 0;font-size:12px">
              Nalepi API ključeve / tokene koje prekopiraš sa svake platforme. Možeš dodati više naloga po mreži
              (npr. više Instagram ili Google Ads naloga). Kredencijali su vidljivi samo vlasniku i nikada se ne
              šalju na javni (storefront) deo sajta.
            </p>
          </div>
          <div>
            <h4 style="margin:0 0 var(--space-2)">Društvene mreže</h4>
            ${this.renderProviderGroups('social', SOCIAL_PROVIDERS, cfg.social || {}, disabled)}
          </div>
          <div>
            <h4 style="margin:0 0 var(--space-2)">Oglašavanje (Ads)</h4>
            ${this.renderProviderGroups('ads', AD_PROVIDERS, cfg.ads || {}, disabled)}
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj API kredencijale</button></div>` : ''}
        </div>
      </form>
      ${this.renderSocialMetricsPanel()}
      ${this.renderAdSpendPanel()}
    `;
  }

  renderFinanceTab() {
    const f = this.config.finance || {};
    const disabled = this.canManage() ? '' : 'disabled';
    const bankRows = (f.bankAccounts || [])
      .map(
        a => `
      <div class="et-row" data-os-row data-os-kind="bank">
        <input class="input-field" name="name" value="${esc(a.name)}" placeholder="Naziv računa" ${disabled}>
        <input class="input-field" name="bank" value="${esc(a.bank)}" placeholder="Banka" ${disabled}>
        <input class="input-field" name="iban" value="${esc(a.iban)}" placeholder="IBAN" ${disabled}>
        <input class="input-field" name="swift" value="${esc(a.swift)}" placeholder="SWIFT" ${disabled}>
        <input class="input-field" name="accountNumber" value="${esc(a.accountNumber)}" placeholder="Broj računa" ${disabled}>
        <input class="input-field" name="currency" value="${esc(a.currency)}" placeholder="RSD" ${disabled}>
        <input class="input-field" name="country" value="${esc(a.country)}" placeholder="RS" ${disabled}>
        <select class="input-field select-field" name="type" ${disabled}>${['operating', 'reserve', 'treasury', 'supplier'].map(t => `<option value="${t}" ${a.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <label class="et-check" style="margin:0"><input type="checkbox" name="primary" ${a.primary ? 'checked' : ''} ${disabled}><span>Primarni</span></label>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    const walletRows = (f.cryptoWallets || [])
      .map(
        w => `
      <div class="et-row" data-os-row data-os-kind="wallet">
        <input class="input-field" name="label" value="${esc(w.label)}" placeholder="Naziv novčanika" ${disabled}>
        <input class="input-field" name="currency" value="${esc(w.currency)}" placeholder="BTC" ${disabled}>
        <input class="input-field" name="network" value="${esc(w.network)}" placeholder="Bitcoin / ERC-20" ${disabled}>
        <input class="input-field" name="address" value="${esc(w.address)}" placeholder="Adresa" ${disabled}>
        <input class="input-field" name="country" value="${esc(w.country)}" placeholder="RS" ${disabled}>
        <input class="input-field" name="collection" value="${esc(w.collection)}" placeholder="collection" ${disabled}>
        <select class="input-field select-field" name="type" ${disabled}>${['active', 'backup', 'country', 'collection'].map(t => `<option value="${t}" ${w.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <label class="et-check" style="margin:0"><input type="checkbox" name="active" ${w.active ? 'checked' : ''} ${disabled}><span>Aktivan</span></label>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    const cardRows = (f.cardDepositAccounts || [])
      .map(
        c => `
      <div class="et-row" data-os-row data-os-kind="card">
        <input class="input-field" name="label" value="${esc(c.label)}" placeholder="Naziv" ${disabled}>
        <input class="input-field" name="provider" value="${esc(c.provider)}" placeholder="Provider" ${disabled}>
        <input class="input-field" name="currency" value="${esc(c.currency)}" placeholder="EUR" ${disabled}>
        <input class="input-field" name="country" value="${esc(c.country)}" placeholder="RS" ${disabled}>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    const inv = f.invoices || {};
    return `
      <form class="card" data-ec-form="finance">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Finance Center (Sector 3)</h3>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Bankovni računi</h4>
          <div data-os-list="bank">${bankRows}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="bank" style="align-self:flex-start">+ Dodaj bankovni račun</button>' : ''}
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Kripto novčanici (više mreža/valuta)</h4>
          <div data-os-list="wallet">${walletRows}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="wallet" style="align-self:flex-start">+ Dodaj novčanik</button>' : ''}
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Kartični depozitni računi</h4>
          <div data-os-list="card">${cardRows}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="card" style="align-self:flex-start">+ Dodaj kartični račun</button>' : ''}
          <template data-os-tpl="bank">
            <div class="et-row" data-os-row data-os-kind="bank">
              <input class="input-field" name="name" placeholder="Naziv računa"><input class="input-field" name="bank" placeholder="Banka">
              <input class="input-field" name="iban" placeholder="IBAN"><input class="input-field" name="swift" placeholder="SWIFT">
              <input class="input-field" name="accountNumber" placeholder="Broj računa"><input class="input-field" name="currency" placeholder="RSD">
              <input class="input-field" name="country" placeholder="RS">
              <select class="input-field select-field" name="type"><option value="operating">operating</option><option value="reserve">reserve</option><option value="treasury">treasury</option><option value="supplier">supplier</option></select>
              <label class="et-check" style="margin:0"><input type="checkbox" name="primary"><span>Primarni</span></label>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          <template data-os-tpl="wallet">
            <div class="et-row" data-os-row data-os-kind="wallet">
              <input class="input-field" name="label" placeholder="Naziv novčanika"><input class="input-field" name="currency" placeholder="BTC">
              <input class="input-field" name="network" placeholder="Bitcoin / ERC-20"><input class="input-field" name="address" placeholder="Adresa">
              <input class="input-field" name="country" placeholder="RS"><input class="input-field" name="collection" placeholder="collection">
              <select class="input-field select-field" name="type"><option value="active">active</option><option value="backup">backup</option><option value="country">country</option><option value="collection">collection</option></select>
              <label class="et-check" style="margin:0"><input type="checkbox" name="active" checked><span>Aktivan</span></label>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          <template data-os-tpl="card">
            <div class="et-row" data-os-row data-os-kind="card">
              <input class="input-field" name="label" placeholder="Naziv"><input class="input-field" name="provider" placeholder="Provider">
              <input class="input-field" name="currency" placeholder="EUR"><input class="input-field" name="country" placeholder="RS">
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Porezi i fakture</h4>
          ${fieldArea('VAT pravila / regionalni porezi', 'vatRules', f.taxProfiles?.vatRules, disabled, 2)}
          <div class="form-row">
            ${field('Šablon fakture', 'template', inv.template, disabled)}
            ${field('Prefiks numeracije', 'numberingPrefix', inv.numberingPrefix, disabled)}
          </div>
          <label class="et-check"><input type="checkbox" name="showVat" ${inv.showVat ? 'checked' : ''} ${disabled}><span>Prikaži VAT na fakturi</span></label>
          ${fieldArea('Napomena u podnožju fakture', 'footerNote', inv.footerNote, disabled, 2)}
          ${fieldArea('Uputstvo za plaćanje', 'paymentInstructions', f.paymentInstructions, disabled, 3)}
          ${fieldArea('Pravila povraćaja', 'refundRules', f.refundRules, disabled, 2)}
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj finansije</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderTreasuryTab() {
    const t = this.config.treasury || {};
    const rec = t.reconciliation || {};
    const ledger = Array.isArray(t.ledger) ? t.ledger : [];
    const disabled = this.canManage() ? '' : 'disabled';
    const ledgerRows = ledger.length
      ? ledger
          .slice(0, 50)
          .map(
            l =>
              `<tr><td>${esc(l.id || '')}</td><td>${esc(l.type || '')}</td><td>${esc(l.amount != null ? l.amount : '')}</td><td>${l.matched ? '<span class="badge badge-success">Match</span>' : '<span class="badge badge-warning">Unmatched</span>'}</td><td>${esc(l.at || '')}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="5" class="text-tertiary">Nema stavki u ledger-u.</td></tr>';
    const reps = t.reports || {};
    return `
      <div class="card" style="margin-bottom:var(--space-4)">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-3)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">Treasury & Reconciliation (Sector 3)</h3>
            ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-action="reconcile">Pokreni usklađivanje</button>' : ''}
          </div>
          <div class="ec-kpi-grid">
            <div class="ec-kpi"><div class="ec-kpi-value">${esc(rec.matched ?? 0)}</div><div class="ec-kpi-label">Usklađeno</div></div>
            <div class="ec-kpi"><div class="ec-kpi-value">${esc(rec.unmatched ?? 0)}</div><div class="ec-kpi-label">Neusklađeno</div></div>
            <div class="ec-kpi"><div class="ec-kpi-value">${esc(rec.orphans ?? 0)}</div><div class="ec-kpi-label">Višak (bez ledger-a)</div></div>
            <div class="ec-kpi"><div class="ec-kpi-value">${rec.lastRunAt ? esc(rec.lastRunAt.slice(0, 16).replace('T', ' ')) : '—'}</div><div class="ec-kpi-label">Poslednje pokretanje</div></div>
            <div class="ec-kpi"><div class="ec-kpi-value">${esc(ledger.length)}</div><div class="ec-kpi-label">Ledger stavke</div></div>
          </div>
          <div class="table-container">
            <table class="table"><thead><tr><th>ID</th><th>Tip</th><th>Iznos</th><th>Status</th><th>Datum</th></tr></thead><tbody>${ledgerRows}</tbody></table>
          </div>
        </div>
      </div>
      <form class="card" data-ec-form="treasury">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Revenue skala (Owner procena)</h3>
          <div class="form-row">
            ${field('Dnevna skala', 'dailyScale', reps.dailyScale, disabled, 'number')}
            ${field('Nedeljna skala', 'weeklyScale', reps.weeklyScale, disabled, 'number')}
            ${field('Mesečna skala', 'monthlyScale', reps.monthlyScale, disabled, 'number')}
            ${field('Kvartalna skala', 'quarterlyScale', reps.quarterlyScale, disabled, 'number')}
            ${field('Godišnja skala', 'yearlyScale', reps.yearlyScale, disabled, 'number')}
          </div>
          <label class="et-check"><input type="checkbox" name="autoMatch" ${rec.autoMatch ? 'checked' : ''} ${disabled}><span>Automatsko poklapanje (auto-match)</span></label>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj trezor</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderReportsTab() {
    const audit = Array.isArray(this.config.audit) ? this.config.audit : [];
    const auditRows = audit.length
      ? audit
          .slice(0, 40)
          .map(
            a =>
              `<tr><td>${esc(a.at ? a.at.slice(0, 19).replace('T', ' ') : '')}</td><td>${esc(a.by)}</td><td>${esc(a.section)}</td><td class="text-tertiary" style="font-size:11px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.after)}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="4" class="text-tertiary">Nema audit zapisa.</td></tr>';
    const periodBtns = REPORT_PERIODS.map(
      p =>
        `<button type="button" class="btn btn-secondary btn-sm" data-os-report data-period="${p}" data-format="csv">${p}</button>`
    ).join('');
    const formatBtns = EXPORT_FORMATS.map(
      f =>
        `<button type="button" class="btn btn-ghost btn-sm" data-os-report data-period="monthly" data-format="${f}">${f.toUpperCase()}</button>`
    ).join('');
    const shareBtns = ['email', 'whatsapp', 'telegram', 'slack']
      .map(
        c => `<button type="button" class="btn btn-ghost btn-sm" data-os-share="${c}">${c}</button>`
      )
      .join('');
    return `
      <div class="card" style="margin-bottom:var(--space-4)">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Accounting & Reporting Center</h3>
          <div><div class="text-tertiary" style="font-size:12px;margin-bottom:6px">Period</div><div style="display:flex;flex-wrap:wrap;gap:6px">${periodBtns}</div></div>
          <div><div class="text-tertiary" style="font-size:12px;margin-bottom:6px">Export formati</div><div style="display:flex;flex-wrap:wrap;gap:6px">${formatBtns}</div></div>
          <div><div class="text-tertiary" style="font-size:12px;margin-bottom:6px">Deljenje izveštaja</div><div style="display:flex;flex-wrap:wrap;gap:6px">${shareBtns}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:var(--space-5)">
          <h3 style="margin:0 0 var(--space-3)">Audit log (ko / kada / šta)</h3>
          <p class="text-tertiary" style="margin:0 0 var(--space-3);font-size:12px">Svaka izmena Experience Center sekcija se beleži sa starom i novom vrednošću.</p>
          <div class="table-container">
            <table class="table"><thead><tr><th>Kada</th><th>Ko</th><th>Sekcija</th><th>Nova vrednost</th></tr></thead><tbody>${auditRows}</tbody></table>
          </div>
        </div>
      </div>
    `;
  }

  renderOperationsTab() {
    const o = this.config.operations || {};
    const h = o.holiday || {};
    const disabled = this.canManage() ? '' : 'disabled';
    const noticeRows = (o.notices || [])
      .map(
        n => `
      <div class="et-row" data-os-row data-os-kind="notice">
        <input class="input-field" name="text" value="${esc(n.text)}" placeholder="Tekst obaveštenja">
        <select class="input-field select-field" name="type">${['info', 'warning', 'success', 'danger'].map(t => `<option value="${t}" ${n.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <label class="et-check" style="margin:0"><input type="checkbox" name="active" ${n.active ? 'checked' : ''}><span>Aktivno</span></label>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    return `
      <form class="card" data-ec-form="operations">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Operations Center (Sector 10)</h3>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Collective Vacation / Holiday Mode</h4>
          <label class="et-check"><input type="checkbox" name="holidayEnabled" ${h.enabled ? 'checked' : ''} ${disabled}><span>Omogući holiday mode</span></label>
          <div class="form-row">
            ${field('Početak', 'holidayStart', h.startAt, disabled, 'date')}
            ${field('Kraj', 'holidayEnd', h.endAt, disabled, 'date')}
          </div>
          ${fieldArea('Poruka', 'holidayMessage', h.message, disabled, 2)}
          ${fieldArea('Obaveštenje kupcima', 'customerNotice', h.customerNotice, disabled, 2)}
          <div class="form-row">
            <label class="et-check"><input type="checkbox" name="suspendShipping" ${h.suspendShipping ? 'checked' : ''} ${disabled}><span>Suspenduj dostavu</span></label>
            <label class="et-check"><input type="checkbox" name="suspendOrders" ${h.suspendOrders ? 'checked' : ''} ${disabled}><span>Suspenduj porudžbine</span></label>
            <label class="et-check"><input type="checkbox" name="holidayCountdown" ${h.countdown ? 'checked' : ''} ${disabled}><span>Countdown timer</span></label>
          </div>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Pauze i obaveštenja</h4>
          <div class="form-row">
            <label class="et-check"><input type="checkbox" name="orderPause" ${o.orderPause?.enabled ? 'checked' : ''} ${disabled}><span>Order pause</span></label>
            ${field('Poruka za order pause', 'orderPauseMessage', o.orderPause?.message, disabled)}
          </div>
          <div class="form-row">
            <label class="et-check"><input type="checkbox" name="shippingPause" ${o.shippingPause?.enabled ? 'checked' : ''} ${disabled}><span>Shipping pause</span></label>
            ${field('Poruka za shipping pause', 'shippingPauseMessage', o.shippingPause?.message, disabled)}
          </div>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Store notices</h4>
          <div data-os-list="notice">${noticeRows}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="notice" style="align-self:flex-start">+ Dodaj obaveštenje</button>' : ''}
          <template data-os-tpl="notice">
            <div class="et-row" data-os-row data-os-kind="notice">
              <input class="input-field" name="text" placeholder="Tekst obaveštenja">
              <select class="input-field select-field" name="type"><option value="info">info</option><option value="warning">warning</option><option value="success">success</option><option value="danger">danger</option></select>
              <label class="et-check" style="margin:0"><input type="checkbox" name="active" checked><span>Aktivno</span></label>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj operacije</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderShippingTab() {
    const s = this.config.shipping || {};
    const couriers = s.couriers || {};
    const disabled = this.canManage() ? '' : 'disabled';
    const rows = this.courierEntries()
      .map(c => {
        const cur = couriers[c.id] || {};
        return `
      <div class="et-row" data-os-row data-os-kind="courier" data-courier-id="${esc(c.id)}">
        <div style="min-width:150px;font-weight:600">${esc(c.name)}</div>
        <label class="et-check" style="margin:0"><input type="checkbox" name="enabled" ${cur.enabled ? 'checked' : ''} ${disabled}><span>Enabled</span></label>
        <label class="et-check" style="margin:0"><input type="checkbox" name="trackingEnabled" ${cur.trackingEnabled ? 'checked' : ''} ${disabled}><span>Tracking</span></label>
        <label class="et-check" style="margin:0"><input type="checkbox" name="apiEnabled" ${cur.apiEnabled !== undefined ? cur.apiEnabled : c.apiEnabled ? 'checked' : ''} ${disabled}><span>API</span></label>
        <input class="input-field" name="regions" value="${esc((cur.regions || c.countries || []).join(', '))}" placeholder="RS, BA, ..." ${disabled}>
        <span class="text-tertiary" style="font-size:11px">${c.trackingUrl ? 'tracking URL ✓' : 'bez tracking URL'}</span>
      </div>`;
      })
      .join('');
    return `
      <form class="card" data-ec-form="shipping">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Shipping & Courier Center (Sector 7)</h3>
          <p class="text-tertiary" style="margin:0;font-size:12px">Kuriri se čitaju iz živih podataka <code>/data/shipping.json</code> + required set (Pošta Srbije, BEX, Aks, City Express, D Express, Daily Express, X Express, DHL, UPS, FedEx).</p>
          <label class="et-check"><input type="checkbox" name="zonesEnabled" ${s.zonesEnabled !== false ? 'checked' : ''} ${disabled}><span>Zone dostave</span></label>
          <div data-os-list="courier">${rows}</div>
          <h4 style="margin:0;font-size:var(--text-sm);color:var(--color-text-tertiary)">Tracking control</h4>
          <label class="et-check"><input type="checkbox" name="customerNotifications" ${s.tracking?.customerNotifications !== false ? 'checked' : ''} ${disabled}><span>Obaveštenja kupcima</span></label>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj dostavu</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderStoresTab() {
    const stores = this.storeSeed();
    const disabled = this.canManage() ? '' : 'disabled';
    const rows = stores
      .map(
        st => `
      <div class="et-row" data-os-row data-os-kind="store" data-store-id="${esc(st.id)}">
        <input class="input-field" name="name" value="${esc(st.name)}" placeholder="Naziv prodavnice" ${disabled}>
        <input class="input-field" name="city" value="${esc(st.address?.addressLocality)}" placeholder="Grad" ${disabled}>
        <input class="input-field" name="street" value="${esc(st.address?.streetAddress)}" placeholder="Ulica" ${disabled}>
        <input class="input-field" name="postal" value="${esc(st.address?.postalCode)}" placeholder="Poštanski broj" ${disabled}>
        <input class="input-field" name="country" value="${esc(st.address?.addressCountry)}" placeholder="RS" ${disabled}>
        <input class="input-field" name="phone" value="${esc(st.phone)}" placeholder="Telefon" ${disabled}>
        <input class="input-field" name="manager" value="${esc(st.manager)}" placeholder="Menadžer" ${disabled}>
        <input class="input-field" name="hours" value="${esc(st.workingHours)}" placeholder="Radno vreme" ${disabled}>
        <input class="input-field" name="lat" value="${esc(st.coordinates?.latitude ?? '')}" placeholder="Lat" ${disabled}>
        <input class="input-field" name="lng" value="${esc(st.coordinates?.longitude ?? '')}" placeholder="Lng" ${disabled}>
        <input class="input-field" name="mapsUrl" value="${esc(st.mapsUrl)}" placeholder="Google Maps URL" ${disabled}>
        <input class="input-field" name="services" value="${esc((st.services || []).join(', '))}" placeholder="usluge" ${disabled}>
        <select class="input-field select-field" name="status">${['active', 'coming-soon', 'closed'].map(x => `<option value="${x}" ${st.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    return `
      <form class="card" data-ec-form="stores">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Stores & Physical Locations (Sector 5)</h3>
          <p class="text-tertiary" style="margin:0;font-size:12px">Neograničen broj lokacija. Podaci se seed-uju iz <code>/data/locations.json</code>, a vlasnik ih dalje uređuje.</p>
          <div data-os-list="store">${rows || '<div class="text-tertiary" style="font-size:12px">Nema lokacija.</div>'}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="store" style="align-self:flex-start">+ Dodaj prodavnicu</button>' : ''}
          <template data-os-tpl="store">
            <div class="et-row" data-os-row data-os-kind="store">
              <input class="input-field" name="name" placeholder="Naziv prodavnice"><input class="input-field" name="city" placeholder="Grad">
              <input class="input-field" name="street" placeholder="Ulica"><input class="input-field" name="postal" placeholder="Poštanski broj">
              <input class="input-field" name="country" placeholder="RS"><input class="input-field" name="phone" placeholder="Telefon">
              <input class="input-field" name="manager" placeholder="Menadžer"><input class="input-field" name="hours" placeholder="Radno vreme">
              <input class="input-field" name="lat" placeholder="Lat"><input class="input-field" name="lng" placeholder="Lng">
              <input class="input-field" name="mapsUrl" placeholder="Google Maps URL"><input class="input-field" name="services" placeholder="usluge">
              <select class="input-field select-field" name="status"><option value="active">active</option><option value="coming-soon">coming-soon</option><option value="closed">closed</option></select>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj prodavnice</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderWarehousesTab() {
    const warehouses = Array.isArray(this.config.warehouses) ? this.config.warehouses : [];
    const disabled = this.canManage() ? '' : 'disabled';
    const rows = warehouses
      .map(
        w => `
      <div class="et-row" data-os-row data-os-kind="warehouse" data-warehouse-id="${esc(w.id)}">
        <input class="input-field" name="name" value="${esc(w.name)}" placeholder="Naziv skladišta" ${disabled}>
        <input class="input-field" name="region" value="${esc(w.region)}" placeholder="Region" ${disabled}>
        <input class="input-field" name="capacity" type="number" value="${esc(w.capacity)}" placeholder="Kapacitet" ${disabled}>
        <label class="et-check" style="margin:0"><input type="checkbox" name="active" ${w.active ? 'checked' : ''} ${disabled}><span>Aktivno</span></label>
        <input class="input-field" name="priority" type="number" value="${esc(w.priority)}" placeholder="Prioritet" ${disabled}>
        <input class="input-field" name="shippingSupport" value="${esc((w.shippingSupport || []).join(', '))}" placeholder="tipovi dostave" ${disabled}>
        <input class="input-field" name="inventoryAssignment" value="${esc(w.inventoryAssignment)}" placeholder="Dodela zaliha" ${disabled}>
        ${this.canManage() ? '<button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>' : ''}
      </div>`
      )
      .join('');
    return `
      <form class="card" data-ec-form="warehouses">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <h3 style="margin:0">Warehouse Management (Sector 6)</h3>
          <div data-os-list="warehouse">${rows || '<div class="text-tertiary" style="font-size:12px">Nema skladišta.</div>'}</div>
          ${this.canManage() ? '<button type="button" class="btn btn-secondary btn-sm" data-os-add="warehouse" style="align-self:flex-start">+ Dodaj skladište</button>' : ''}
          <template data-os-tpl="warehouse">
            <div class="et-row" data-os-row data-os-kind="warehouse">
              <input class="input-field" name="name" placeholder="Naziv skladišta"><input class="input-field" name="region" placeholder="Region">
              <input class="input-field" name="capacity" type="number" placeholder="Kapacitet">
              <label class="et-check" style="margin:0"><input type="checkbox" name="active" checked><span>Aktivno</span></label>
              <input class="input-field" name="priority" type="number" placeholder="Prioritet">
              <input class="input-field" name="shippingSupport" placeholder="tipovi dostave">
              <input class="input-field" name="inventoryAssignment" placeholder="Dodela zaliha">
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-os-remove aria-label="Ukloni">×</button>
            </div>
          </template>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj skladišta</button></div>` : ''}
        </div>
      </form>
    `;
  }

  renderProductsVisibilityTab() {
    const products = Array.isArray(this.productCatalog) ? this.productCatalog : null;
    const visibility = this.productVisibility || {};
    const disabled = this.canManage() ? '' : 'disabled';
    if (!products) {
      return `
        <div class="card"><div class="card-body" style="padding:var(--space-5)">
          <h3 style="margin:0">Vidljivost proizvoda</h3>
          <p class="text-tertiary">Učitavanje kataloga…</p>
        </div></div>`;
    }
    const rows = products
      .map(p => {
        const entry = visibility[p.id] || visibility[String(p.id)];
        const status = (entry && entry.status) || 'published';
        return `
          <tr data-os-row data-os-kind="product" data-product-id="${esc(p.id)}">
            <td>
              <div class="cell-primary">${esc(p.name)}</div>
              <div class="cell-tertiary">${esc(p.sku || '')}</div>
            </td>
            <td class="cell-secondary">${esc(p.category || '')}</td>
            <td class="cell-secondary">${esc(p.slug || '')}</td>
            <td>${ImperiumUtils.formatCurrency(p.price || 0)}</td>
            <td>${this.productStatusBadge(status)}</td>
            <td>
              <select class="input-field select-field" name="status" ${disabled}>
                <option value="published" ${status === 'published' ? 'selected' : ''}>Objavljen</option>
                <option value="hidden" ${status === 'hidden' ? 'selected' : ''}>Sakrij sa main page</option>
                <option value="archived" ${status === 'archived' ? 'selected' : ''}>Arhiviraj</option>
              </select>
            </td>
          </tr>`;
      })
      .join('');
    return `
      <form class="card" data-ec-form="product-visibility">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
          <div>
            <h3 style="margin:0">Vidljivost proizvoda</h3>
            <p class="text-tertiary" style="margin:4px 0 0;font-size:12px">
              <strong>Sakrij sa main page</strong> uklanja proizvod sa naslovne i istaknutih prikaza.
              <strong>Arhiviraj</strong> uklanja proizvod sa celog sajta (kupci ga ne mogu naći).
              Promene se primenjuju na sajtu odmah.
            </p>
          </div>
          <div class="table-container">
            <table class="table">
              <thead><tr><th>Proizvod</th><th>Kategorija</th><th>Slug</th><th>Cena</th><th>Status</th><th>Vidljivost</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${this.canManage() ? `<div style="display:flex;justify-content:flex-end;gap:var(--space-2)"><button type="button" class="btn btn-secondary" data-os-action="reload-products">Osveži</button><button class="btn btn-primary" type="submit" ${this.saving ? 'disabled' : ''}>Sačuvaj vidljivost</button></div>` : ''}
        </div>
      </form>`;
  }

  renderActiveTab() {
    switch (this.activeTab) {
      case 'os':
        return this.renderOsTab();
      case 'brandIdentity':
        return this.renderBrandIdentityTab();
      case 'assets':
        return this.renderAssetsTab();
      case 'domains':
        return this.renderDomainsTab();
      case 'communication':
        return this.renderCommunicationTab();
      case 'social':
        return this.renderSocialTab();
      case 'integrations':
        return this.renderIntegrationsTab();
      case 'finance':
        return this.renderFinanceTab();
      case 'treasury':
        return this.renderTreasuryTab();
      case 'reports':
        return this.renderReportsTab();
      case 'operations':
        return this.renderOperationsTab();
      case 'shipping':
        return this.renderShippingTab();
      case 'stores':
        return this.renderStoresTab();
      case 'warehouses':
        return this.renderWarehousesTab();
      case 'products':
        return this.renderProductsVisibilityTab();
      case 'themes':
        return this.renderThemesTab();
      case 'hero':
        return this.renderHeroTab();
      case 'collections':
        return this.renderCollectionsTab();
      case 'payments':
        return this.renderPaymentsTab();
      case 'ai':
        return this.renderAITab();
      case 'community':
        return this.renderCommunityTab();
      case 'maintenance':
        return this.renderMaintenanceTab();
      case 'luxury':
        return this.renderLuxuryTab();
      case 'editorial':
        return this.renderEditorialTab();
      case 'brand':
        return this.renderBrandTab();
      case 'trust':
        return this.renderTrustTab();
      case 'journal':
        return this.renderJournalTab();
      case 'craftsmanship':
        return this.renderCraftsmanshipTab();
      case 'materials':
        return this.renderMaterialsTab();
      case 'video':
        return this.renderVideoTab();
      case 'outfits':
        return this.renderOutfitsTab();
      case 'membership':
        return this.renderMembershipTab();
      case 'immersive':
        return this.renderImmersiveTab();
      case 'global':
        return this.renderGlobalTab();
      case 'promotions':
        return this.renderPromotionsTab();
      case 'campaigns':
        return this.renderCampaignsTab();
      case 'seo':
        return this.renderSeoTab();
      case 'analytics':
        return this.renderAnalyticsTab();
      case 'permissions':
        return this.renderPermissionsTab();
      case 'paymentIncentives':
        return this.renderPaymentIncentivesTab();
      case 'concierge':
        return this.renderConciergeTab();
      case 'executive':
        return this.renderExecutiveTab();
      case 'omnichannel':
        return this.renderOmnichannelTab();
      case 'api':
        return this.renderApiTab();
      case 'employee':
        return this.renderEmployeeTab();
      case 'fraud':
        return this.renderFraudTab();
      default:
        return '<div>Nepoznata kartica</div>';
    }
  }

  render() {
    const toolbar = `
      <div class="section-header" style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-5);flex-wrap:wrap;gap:var(--space-3)">
        <div>
          <h2 style="margin:0;font-size:var(--text-2xl);font-weight:var(--font-bold)">DALLI Experience OS</h2>
          <p style="margin:4px 0 0;color:var(--color-text-tertiary);font-size:var(--text-sm)">Master Operating System — brend, imovina, finansije, komunikacija, dostava, operacije i ekspanzija. Role: ${esc(this.getRole())}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span class="badge ${this.canManage() ? 'badge-success' : 'badge-secondary'}">experienceCenter: ${this.canManage() ? 'DA' : 'NE'}</span>
          <span class="badge ${this.isOwner() ? 'badge-primary' : 'badge-secondary'}">Owner: ${this.isOwner() ? 'DA' : 'NE'}</span>
          ${this.loading ? '<span class="badge badge-info">Učitavanje...</span>' : ''}
          ${this.saving ? '<span class="badge badge-warning">Čuvanje...</span>' : ''}
        </div>
      </div>
    `;

    const body = `
      ${this.error ? `<div class="alert alert-danger" style="margin-bottom:var(--space-4)">${ImperiumUtils.escapeHtml(this.error)}</div>` : ''}
      ${this.renderTabs()}
      ${this.renderActiveTab()}
    `;

    return `<div class="experience-center-section">${toolbar}${body}</div>`;
  }

  renderConciergeTab() {
    return `
      <div class="experience-tab" style="display:grid;gap:16px">
        <div class="card" style="padding:16px">
          <h3 style="margin:0 0 12px 0">🤵 Luxury Concierge & Personal Shopper Ecosystem</h3>
          <p style="color:var(--color-text-tertiary);margin:0 0 16px 0">Owner controls for concierge system. Architecture-first, relationship building.</p>
          
          <div style="display:grid;gap:12px;max-width:600px">
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" id="concierge-enabled" checked>
              <span>Luxury Concierge - ON / OFF</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" id="concierge-personalShopper" checked>
              <span>Personal Shopper - ON / OFF</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" id="concierge-styleIntelligence" checked>
              <span>Style Intelligence - ON / OFF</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" id="concierge-vipExperiences" checked>
              <span>VIP Experiences - ON / OFF</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" id="concierge-clienteling" checked>
              <span>Clienteling Engine - ON / OFF</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  renderExecutiveTab() {
    return `
      <div class="experience-tab" style="display:grid;gap:16px">
        <div class="card" style="padding:16px">
          <h3 style="margin:0 0 12px 0">📊 Executive Command Center</h3>
          <p style="color:var(--color-text-tertiary);margin:0 0 16px 0">Owner-only executive intelligence & business control center.</p>
          <div style="display:grid;gap:12px;max-width:600px">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Executive Intelligence - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Business Insights - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Forecasting - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Automatic Reports - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Alerts - ON/OFF</span></label>
          </div>
        </div>
      </div>
    `;
  }

  renderOmnichannelTab() {
    return `
      <div class="experience-tab" style="display:grid;gap:16px">
        <div class="card" style="padding:16px">
          <h3 style="margin:0 0 12px 0">🔄 Omnichannel Control Center</h3>
          <p style="color:var(--color-text-tertiary);margin:0 0 16px 0">Unified luxury commerce across web, stores, social channels and future platforms.</p>
          <div style="display:grid;gap:12px;max-width:600px">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Omnichannel Engine - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Store Integration - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Social Commerce - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Warehouse Network - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Customer 360 - ON/OFF</span></label>
          </div>
        </div>
      </div>
    `;
  }

  renderPaymentIncentivesTab() {
    return `
      <div class="experience-tab" style="display:grid;gap:16px">
        <div class="card" style="padding:16px">
          <h3 style="margin:0 0 12px 0">💳 Payment Incentives</h3>
          <p style="color:var(--color-text-tertiary);margin:0 0 16px 0">Dynamic payment incentives and crypto discount configuration.</p>
          <div style="display:grid;gap:12px;max-width:600px">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Crypto Payment - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Dynamic Discount - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Display Incentive Message - ON/OFF</span></label>
          </div>
        </div>
      </div>
    `;
  }

  renderApiTab() {
    return `
      <div class="experience-tab" style="display:grid;gap:16px">
        <div class="card" style="padding:16px">
          <h3 style="margin:0 0 12px 0">🔌 API Ecosystem Center</h3>
          <p style="color:var(--color-text-tertiary);margin:0 0 16px 0">Generate, rotate, disable, archive and delete API keys. Role, IP and rate controls per API.</p>
          <div style="display:grid;gap:12px;max-width:600px">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>API Ecosystem - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Application Manager - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Market Intelligence API - ON/OFF</span></label>
          </div>
        </div>
      </div>
    `;
  }

  renderEmployeeTab() {
    return `
      <div class="experience-tab" style="display:grid;gap:16px">
        <div class="card" style="padding:16px">
          <h3 style="margin:0 0 12px 0">👥 Employee Operations Center</h3>
          <p style="color:var(--color-text-tertiary);margin:0 0 16px 0">Roles, workforce attendance and dynamic QR attendance. Strict privacy model enforced via RBAC.</p>
          <div style="display:grid;gap:12px;max-width:600px">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Attendance System - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Dynamic QR Attendance - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Employee App Readiness - ON/OFF</span></label>
          </div>
        </div>
      </div>
    `;
  }

  renderFraudTab() {
    return `
      <div class="experience-tab" style="display:grid;gap:16px">
        <div class="card" style="padding:16px">
          <h3 style="margin:0 0 12px 0">🛡️ Fraud & Risk Engine</h3>
          <p style="color:var(--color-text-tertiary);margin:0 0 16px 0">Velocity, identity, address and country-mismatch detection with owner-only permanent alert closure.</p>
          <div style="display:grid;gap:12px;max-width:600px">
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Fraud Detection Engine - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Admin Alerts - ON/OFF</span></label>
            <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked><span>Owner Override - ON/OFF</span></label>
          </div>
        </div>
      </div>
    `;
  }
}

export default ExperienceCenterSection;
