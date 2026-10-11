/**
 * Elite Product Editor - DALLI Luxury Product Publishing Platform
 *
 * Full-screen product editor with 16 specialized tabs:
 *   general, media, pricing, inventory, variants, seo, content,
 *   craftsmanship, view360, vto, crypto, shipping, luxury, faq,
 *   analytics, publishing.
 *
 * Data is always real:
 *   - Products are loaded from the API (SectionAPI.products) or, when the API is
 *     unreachable, from the storefront source of truth `/data/products.json`.
 *   - Crypto currencies / payment methods are auto-detected at runtime from
 *     `data/crypto-payment-model.json` (never hardcoded).
 *
 * Persistence:
 *   - Saves through SectionAPI.products (update/create).
 *   - When offline, mutations are queued to localStorage and replayed once a
 *     connection is restored (mutateWithOfflineSupport already handles this).
 */

import { Component } from '../core/component.js';
import { SectionAPI } from '../services/integration.js';
import { ImperiumUtils } from '../utils/helpers.js';

const ESR = value => ImperiumUtils.escapeHTML(value === undefined || value === null ? '' : value);

const WORKFLOW = ['draft', 'review', 'approved', 'scheduled', 'published', 'archived'];

const WORKFLOW_LABELS = {
  draft: 'Nacrt',
  review: 'Pregled',
  approved: 'Odobreno',
  scheduled: 'Zakazano',
  published: 'Objavljeno',
  archived: 'Arhivirano',
};

const WORKFLOW_COLORS = {
  draft: 'badge-neutral',
  review: 'badge-warning',
  approved: 'badge-info',
  scheduled: 'badge-info',
  published: 'badge-success',
  archived: 'badge-danger',
};

const CATEGORIES = [
  't-shirts',
  'hoodies',
  'tracksuits',
  'shorts',
  'jackets',
  'essentials',
  'leggings',
  'matching-sets',
  'shirts',
  'blazers',
  'suits',
  'trousers',
  'coats',
  'dresses',
  'accessories',
];

const COLLECTIONS = ['casual', 'elegance'];

const GENDERS = ['men', 'women', 'unisex'];

const STYLE_OCCASIONS = [
  'everyday',
  'business',
  'formal',
  'evening',
  'travel',
  'sport',
  'smart-casual',
  'luxury-essentials',
  'special-occasion',
];

const GARMENT_TYPES = ['upper-body', 'lower-body', 'full-body', 'outerwear', 'dress', 'accessory'];

const TAB_ICONS = {
  general:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  media:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  pricing:
    '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  inventory:
    '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  variants:
    '<path d="M4 7h3M14 7h3M11 7H8M4 17h7M18 17h2M14 17h-1"/><path d="M7 11h10v3H7z"/><rect x="2" y="7" width="2" height="10" rx="1"/><rect x="20" y="7" width="2" height="10" rx="1"/>',
  seo: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
  content: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  craftsmanship:
    '<circle cx="12" cy="8" r="6"/><path d="M15.5 8.5 19 12l2-2"/><path d="M12 2v2M12 12v2M2 8h2M20 8h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4"/>',
  view360: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
  vto: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  crypto:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="6" y1="10" x2="10" y2="10"/><line x1="14" y1="14" x2="18" y2="14"/><path d="M6 14h1.5M16.5 10H18"/>',
  shipping:
    '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  luxury: '<path d="M20 6 9 17l-5-5"/>',
  faq: '<path d="M4 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8l-4 4z"/><path d="M9 10h6M9 7h6M9 13h3"/>',
  analytics: '<path d="M18 20V10M12 20V4M6 20v-6"/><path d="M2 20h20"/>',
  publishing:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><path d="M12 5v14M5 12h14"/>',
};

export class EliteProductEditorSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.products;
    this.products = [];
    this.mode = 'list';
    this.editingId = null;
    this.etab = 'general';
    this.loading = false;
    this.dirty = false;
    this.brandNew = false;
    this.cryptoCatalog = null;
    this.search = '';
    this.filterCollection = 'all';
    this.offlineQueueKey = 'dalli_elite_offline_queue';
  }

  async onEnter() {
    await Promise.all([this.loadProducts(), this.loadCryptoCatalog()]);
    this.render();
  }

  onLeave() {
    this.dirty = false;
    this.brandNew = false;
  }

  // ==================== DATA LOADING ====================

  async loadProducts() {
    this.loading = true;
    try {
      const res = await this.api.list({ limit: 500 });
      this.products = (res && (res.products || res.data || (Array.isArray(res) ? res : []))) || [];
    } catch (error) {
      console.warn(
        '[EliteEditor] API unavailable, reading source of truth /data/products.json:',
        error.message
      );
      try {
        const res = await fetch('/data/products.json');
        const json = await res.json();
        this.products = json.products || [];
      } catch (err) {
        console.warn('[EliteEditor] Could not load /data/products.json either:', err.message);
        this.products = [];
      }
    }
    this.loading = false;
    return this.products;
  }

  // ==================== CRYPTO AUTO-DETECTION ====================

  extractJsArray(text, name) {
    const re = new RegExp(`${name}\\s*=\\s*\\[`);
    const match = re.exec(text);
    if (!match) return [];
    let depth = 0;
    let index = match.index + match[0].length - 1;
    for (; index < text.length; index++) {
      const char = text[index];
      if (char === '[') depth++;
      else if (char === ']') {
        depth--;
        if (depth === 0) break;
      }
    }
    const slice = text.slice(match.index + match[0].length - 1, index + 1);
    try {
      const parsed = JSON.parse(slice);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn(`[EliteEditor] Failed to parse ${name}:`, e.message);
      return [];
    }
  }

  async loadCryptoCatalog() {
    if (this.cryptoCatalog) return this.cryptoCatalog;
    let currencies = [];
    let paymentMethods = [];
    let source = '/data/crypto-payment-model.json';
    try {
      const res = await fetch(source);
      if (res.ok) {
        const text = await res.text();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (e) {
          json = null;
        }
        if (json && typeof json === 'object') {
          currencies = Array.isArray(json.SUPPORTED_CRYPTO_CURRENCIES)
            ? json.SUPPORTED_CRYPTO_CURRENCIES
            : [];
          paymentMethods = Array.isArray(json.PAYMENT_METHODS) ? json.PAYMENT_METHODS : [];
        } else {
          // Legacy shape: const SUPPORTED_CRYPTO_CURRENCIES = [...]; (JS-as-JSON)
          currencies = this.extractJsArray(text, 'SUPPORTED_CRYPTO_CURRENCIES');
          paymentMethods = this.extractJsArray(text, 'PAYMENT_METHODS');
        }
      }
    } catch (e) {
      console.warn('[EliteEditor] crypto model fetch failed:', e.message);
    }
    if (!currencies.length) {
      // Mirror of data/crypto-payment-provider.js SUPPORTED_CRYPTO_CURRENCIES.
      // Used ONLY when the runtime auto-detection source is unreachable.
      source = 'auto-detect nedostupan (fallback provider)';
      currencies = [
        { id: 'BTC', name: 'Bitcoin', symbol: '₿', enabled: true },
        { id: 'ETH', name: 'Ethereum', symbol: 'Ξ', enabled: true },
        { id: 'USDT', name: 'Tether (USDT)', symbol: '$', enabled: true },
        { id: 'USDC', name: 'USD Coin (USDC)', symbol: '$', enabled: true },
        { id: 'PI', name: 'Pi Network', symbol: 'π', enabled: true },
      ];
    }
    if (!paymentMethods.length) {
      paymentMethods = [
        { id: 'cod', name: 'Plaćanje pri preuzimanju', type: 'traditional', enabled: true },
        { id: 'bank-transfer', name: 'Bankovni prenos', type: 'traditional', enabled: true },
        { id: 'card', name: 'Kartica', type: 'card', enabled: true },
        { id: 'crypto', name: 'Kripto plaćanje', type: 'crypto', enabled: true },
      ];
    }
    this.cryptoCatalog = { currencies, paymentMethods, source };
    return this.cryptoCatalog;
  }

  // ==================== PRODUCT SHAPING ====================

  emptyProduct() {
    return {
      id: null,
      slug: '',
      sku: '',
      name: '',
      shortDescription: '',
      description: '',
      category: 't-shirts',
      gender: ['unisex'],
      price: 0,
      salePrice: null,
      currency: 'RSD',
      categoryLabel: '',
      images: { main: '', gallery: [], ogImage: '' },
      altText: '',
      colors: [],
      sizes: [],
      vatRate: 20,
      marginPct: 0,
      specifications: { material: '', weight: '', care: '', warrantyMonths: 24 },
      inventory: {
        totalStock: 0,
        status: 'in_stock',
        lowStockThreshold: 5,
        trackInventory: true,
        allowBackorder: false,
      },
      seo: { metaTitle: '', metaDescription: '', keywords: '', canonicalUrl: '' },
      structuredData: { brand: 'DALLI', category: '', gtin: null, mpn: '' },
      faq: [],
      cms: {
        featured: false,
        bestseller: false,
        newArrival: false,
        publishedAt: null,
        updatedAt: null,
        status: 'draft',
        salesCount: 0,
        viewCount: 0,
        cartAddCount: 0,
        lookIds: [],
        searchKeywords: [],
        priority: 100,
        virtualTryOn: {
          eligible: false,
          modelType: 'upper-body',
          primaryImage: '',
          secondaryImages: [],
          fitGuide: 'standard',
        },
        product360: { enabled: false, images: [], totalFrames: 24, autoRotate: true },
      },
      loyalty: {
        memberOnly: false,
        earlyAccess: false,
        earlyAccessDate: null,
        limitedRelease: false,
        maxPerCustomer: 0,
        tierRequired: null,
        pointsMultiplier: 1,
      },
      collection: 'casual',
      styleOccasion: [],
      shipping: {
        weightKg: 0.5,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 5,
        shippingClass: 'standard',
        freeShipping: false,
        handlingDays: 1,
        international: false,
      },
      craftsmanship: {
        artisan: '',
        atelier: '',
        provenance: '',
        materialsNote: '',
        construction: '',
        qualityGrade: 'premium',
        limitedEdition: false,
        editionOf: 0,
        serialNumbered: false,
        certificateOfAuthenticity: false,
      },
      payments: {
        cryptoEnabled: false,
        acceptedCurrencies: [],
        paymentMethods: [],
        cryptoDiscountPct: 0,
      },
      publishing: {
        workflow: 'draft',
        scheduledAt: null,
        publishedAt: null,
        archivedAt: null,
        updatedAt: null,
        notes: '',
      },
      analytics: { views: 0, conversions: 0, revenue: 0, engagement: 0 },
    };
  }

  normalizeProduct(raw) {
    const base = Object.assign(this.emptyProduct(), raw);
    if (Array.isArray(raw?.gender)) base.gender = raw.gender;
    else if (typeof raw?.gender === 'string' && raw.gender) base.gender = [raw.gender];
    else base.gender = ['unisex'];
    base.colors = Array.isArray(base.colors) ? base.colors : [];
    base.sizes = Array.isArray(base.sizes) ? base.sizes : [];
    base.faq = Array.isArray(base.faq) ? base.faq : [];
    base.styleOccasion = Array.isArray(base.styleOccasion) ? base.styleOccasion : [];
    base.images = Object.assign({ main: '', gallery: [], ogImage: '' }, base.images || {});
    base.cms = Object.assign(this.emptyProduct().cms, base.cms || {});
    base.cms.virtualTryOn = Object.assign(
      this.emptyProduct().cms.virtualTryOn,
      base.cms.virtualTryOn || {}
    );
    base.cms.product360 = Object.assign(
      this.emptyProduct().cms.product360,
      base.cms.product360 || {}
    );
    base.inventory = Object.assign(this.emptyProduct().inventory, base.inventory || {});
    base.specifications = Object.assign(
      this.emptyProduct().specifications,
      base.specifications || {}
    );
    base.seo = Object.assign(this.emptyProduct().seo, base.seo || {});
    base.structuredData = Object.assign(
      this.emptyProduct().structuredData,
      base.structuredData || {}
    );
    base.loyalty = Object.assign(this.emptyProduct().loyalty, base.loyalty || {});
    base.shipping = Object.assign(this.emptyProduct().shipping, base.shipping || {});
    base.craftsmanship = Object.assign(this.emptyProduct().craftsmanship, base.craftsmanship || {});
    base.payments = Object.assign(this.emptyProduct().payments, base.payments || {});
    base.publishing = Object.assign(this.emptyProduct().publishing, base.publishing || {});
    base.analytics = Object.assign(this.emptyProduct().analytics, base.analytics || {});
    if (!Number.isFinite(base.vatRate)) base.vatRate = 20;
    if (!Number.isFinite(base.marginPct)) base.marginPct = 0;
    return base;
  }

  get editing() {
    return this.products.find(p => String(p.id) === String(this.editingId));
  }

  nextId() {
    const ids = this.products.map(p => Number(p.id)).filter(n => !Number.isNaN(n));
    const max = ids.length ? Math.max(...ids) : 0;
    return max + 1;
  }

  // ==================== RENDER ====================

  render() {
    this.bindEvents();
    if (this.mode === 'edit') return this.renderEditor();
    return this.renderList();
  }

  renderList() {
    const products = this.getFilteredProducts();
    const rows = products.length
      ? products
          .map(p => {
            const eliteCount = this.getEliteCoverage(p);
            const img = p.images?.main || p.images?.primaryImage || '';
            return `
            <tr data-id="${ESR(p.id)}">
              <td>
                <div class="product-thumb" style="width:52px;height:52px;border-radius:var(--radius-sm);overflow:hidden;background:var(--color-bg-tertiary);">
                  ${
                    img
                      ? `<img src="${ESR(img)}" alt="${ESR(p.name)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
                      : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--color-text-tertiary);">—</div>'
                  }
                </div>
              </td>
              <td>
                <div class="cell-primary">${ESR(p.name)}</div>
                <div class="cell-tertiary">${ESR(p.sku)} · ${ESR(p.slug)}</div>
              </td>
              <td><span class="badge ${p.collection === 'elegance' ? 'badge-info' : 'badge-neutral'}">${ESR(p.collection || p.category)}</span></td>
              <td><span class="badge badge-neutral">${ESR(p.category)}</span></td>
              <td class="cell-primary">${ImperiumUtils.formatCurrency(p.price != null ? p.price : p.basePrice)}</td>
              <td>
                <div class="elite-coverage" role="progressbar" aria-valuenow="${eliteCount}" aria-valuemin="0" aria-valuemax="100">
                  <div class="elite-coverage-track"><div class="elite-coverage-fill" style="width:${eliteCount}%;"></div></div>
                  <span>${eliteCount}%</span>
                </div>
              </td>
              <td>
                <button class="btn btn-secondary btn-sm" data-action="elite-open" data-id="${ESR(p.id)}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
                  Elite Editor
                </button>
              </td>
            </tr>`;
          })
          .join('')
      : '';

    return `
      <div class="elite-editor-section">
        <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);flex-wrap:wrap;gap:var(--space-3);">
          <div>
            <h2 style="font-size:var(--text-2xl);font-weight:var(--font-bold);color:var(--color-text-primary);">Elite Product Editor</h2>
            <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);">Luxury publishing platform — 16 sekcija za kompletnu kontrolu proizvoda.${this.cryptoCatalog ? ` <span>Kripto izvor: <strong>${ESR(this.cryptoCatalog.source)}</strong> · ${this.cryptoCatalog.currencies.length} valuta · ${this.cryptoCatalog.paymentMethods.length} načina.</span>` : ''}</p>
          </div>
          <button class="btn btn-primary" data-action="elite-create">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novi elite proizvod
          </button>
        </div>

        <div class="card" style="margin-bottom:var(--space-4);">
          <div class="card-body" style="padding:var(--space-4) var(--space-5);">
            <div class="form-row" style="align-items:flex-end;gap:var(--space-4);flex-wrap:wrap;">
              <div class="form-group" style="flex:1;min-width:220px;">
                <label class="input-label">Pretraga</label>
                <input type="text" class="input-field" placeholder="Naziv, SKU, slug..." value="${ESR(this.search)}" data-elite-filter="search">
              </div>
              <div class="form-group" style="min-width:160px;">
                <label class="input-label">Kolekcija</label>
                <select class="input-field select-field" data-elite-filter="collection">
                  <option value="all" ${this.filterCollection === 'all' ? 'selected' : ''}>Sve</option>
                  <option value="casual" ${this.filterCollection === 'casual' ? 'selected' : ''}>Casual</option>
                  <option value="elegance" ${this.filterCollection === 'elegance' ? 'selected' : ''}>Elegance</option>
                </select>
              </div>
              <div class="form-group">
                <button class="btn btn-secondary" data-action="elite-refresh">Osveži</button>
              </div>
            </div>
          </div>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th style="width:64px;">Slika</th>
                <th>Proizvod</th>
                <th style="width:110px;">Kolekcija</th>
                <th style="width:120px;">Kategorija</th>
                <th style="width:110px;">Cena</th>
                <th style="width:130px;">Elite pokriće</th>
                <th style="width:150px;">Akcije</th>
              </tr>
            </thead>
            <tbody>
              ${rows === '' ? `<tr><td colspan="7"><div class="table-empty" style="padding:var(--space-10);text-align:center;"><h3 class="table-empty-title">Nema proizvoda</h3><p class="table-empty-message">Kliknite „Novi elite proizvod" da kreirate prvi.</p></div></td></tr>` : rows}
            </tbody>
          </table>
        </div>
        ${this.loading ? '<div style="text-align:center;padding:var(--space-4);color:var(--color-text-tertiary);">Učitavanje proizvoda…</div>' : ''}
      </div>`;
  }

  getFilteredProducts() {
    const q = this.search.toLowerCase().trim();
    return this.products.filter(p => {
      if (this.filterCollection !== 'all' && p.collection !== this.filterCollection) return false;
      if (!q) return true;
      return [p.name, p.sku, p.slug, p.category].some(v =>
        String(v || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }

  getEliteCoverage(product) {
    const p = this.normalizeProduct(product);
    const checks = [
      Boolean(p.images.main),
      Number(p.price) > 0,
      p.sizes.length > 0,
      p.colors.length > 0,
      Boolean(p.seo.metaTitle),
      p.analytics.views > 0,
      p.shipping.weightKg > 0,
      Boolean(p.craftsmanship.qualityGrade && p.craftsmanship.qualityGrade !== 'premium'),
      p.faq.length > 0,
      p.cms.product360.enabled,
      p.cms.virtualTryOn.eligible,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  // ==================== EDITOR ====================

  tabConfig() {
    return [
      { id: 'general', label: 'General', icon: TAB_ICONS.general },
      { id: 'media', label: 'Mediji', icon: TAB_ICONS.media },
      { id: 'pricing', label: 'Cene', icon: TAB_ICONS.pricing },
      { id: 'inventory', label: 'Inventar', icon: TAB_ICONS.inventory },
      { id: 'variants', label: 'Varijante', icon: TAB_ICONS.variants },
      { id: 'seo', label: 'SEO', icon: TAB_ICONS.seo },
      { id: 'content', label: 'Sadržaj', icon: TAB_ICONS.content },
      { id: 'craftsmanship', label: 'Zanatstvo', icon: TAB_ICONS.craftsmanship },
      { id: 'view360', label: '360° Pregled', icon: TAB_ICONS.view360 },
      { id: 'vto', label: 'Virtual Try-On', icon: TAB_ICONS.vto },
      { id: 'crypto', label: 'Kripto', icon: TAB_ICONS.crypto },
      { id: 'shipping', label: 'Dostava', icon: TAB_ICONS.shipping },
      { id: 'luxury', label: 'Luxury', icon: TAB_ICONS.luxury },
      { id: 'faq', label: 'FAQ', icon: TAB_ICONS.faq },
      { id: 'analytics', label: 'Analitika', icon: TAB_ICONS.analytics },
      { id: 'publishing', label: 'Objavljivanje', icon: TAB_ICONS.publishing },
    ];
  }

  renderEditor() {
    const product = this.getEditingCopy();
    if (!product || !this.editingId) {
      this.mode = 'list';
      this.editingId = null;
      this.bindEvents();
      return this.renderList();
    }
    const tabButtons = this.tabConfig()
      .map(
        tab => `
      <button class="elite-etab ${this.etab === tab.id ? 'active' : ''}"
              role="tab" data-etab="${tab.id}"
              aria-selected="${this.etab === tab.id}"
              aria-controls="elite-panel-${tab.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${tab.icon}</svg>
        <span>${ESR(tab.label)}</span>
      </button>`
      )
      .join('');

    const workflowStatus = product.publishing?.workflow || 'draft';

    return `
      <div class="elite-editor-section">
        <div class="elite-editor-bar">
          <div class="elite-editor-bar-left">
            <button class="btn btn-secondary btn-sm" data-action="elite-back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              Nazad
            </button>
            <div class="elite-editor-title">
              <strong>${ESR(product.name || 'Bez naziva')}</strong>
              <span class="cell-tertiary">${ESR(product.sku) || 'novi proizvod'} · ${ESR(product.slug) || '—'}</span>
            </div>
            <span class="badge ${WORKFLOW_COLORS[workflowStatus]}">${ESR(WORKFLOW_LABELS[workflowStatus] || workflowStatus)}</span>
            ${this.dirty ? '<span class="badge badge-warning">Nesačuvano</span>' : ''}
          </div>
          <div class="elite-editor-bar-right">
            <button class="btn btn-secondary btn-sm" data-action="elite-preview" title="Otvori na sajtu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview
            </button>
            <button class="btn btn-primary btn-sm" data-action="elite-save" ${!product.name ? 'disabled=""' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Sačuvaj
            </button>
          </div>
        </div>

        <nav class="elite-etabs" role="tablist" aria-label="Sekcije proizvoda">
          ${tabButtons}
        </nav>

        <div class="elite-panel" role="tabpanel" aria-labelledby="etab-${this.etab}">
          ${this.renderTabPanel(this.etab, product)}
        </div>

        <div class="elite-editor-footer">
          <div>
            ${this.dirty ? '<span style="color:var(--color-warning);font-size:var(--text-sm);">Imate nesačuvane izmene</span>' : '<span style="color:var(--color-text-tertiary);font-size:var(--text-sm);">Promene se šalju kroz API sa offline redom čekanja</span>'}
          </div>
          <div class="elite-editor-footer-right">
            <button class="btn btn-secondary btn-sm" data-action="elite-prev-tab">Prethodna</button>
            <button class="btn btn-secondary btn-sm" data-action="elite-next-tab">Sledeća</button>
            <button class="btn btn-primary btn-sm" data-action="elite-save" ${!product.name ? 'disabled=""' : ''}>Sačuvaj izmene</button>
          </div>
        </div>
      </div>`;
  }

  getEditingCopy() {
    const product = this.editing;
    return product ? this.normalizeProduct(product) : null;
  }

  renderTabPanel(tabId, product) {
    const panels = {
      general: () => this.tabGeneral(product),
      media: () => this.tabMedia(product),
      pricing: () => this.tabPricing(product),
      inventory: () => this.tabInventory(product),
      variants: () => this.tabVariants(product),
      seo: () => this.tabSeo(product),
      content: () => this.tabContent(product),
      craftsmanship: () => this.tabCraftsmanship(product),
      view360: () => this.tabView360(product),
      vto: () => this.tabVto(product),
      crypto: () => this.tabCrypto(product),
      shipping: () => this.tabShipping(product),
      luxury: () => this.tabLuxury(product),
      faq: () => this.tabFaq(product),
      analytics: () => this.tabAnalytics(product),
      publishing: () => this.tabPublishing(product),
    };
    const fn = panels[tabId];
    return fn ? fn() : '<div class="et-panel-body">Nepoznata sekcija</div>';
  }

  tabShell(title, subtitle, children) {
    return `
      <div class="et-panel-body">
        <div class="et-panel-head">
          <h3>${ESR(title)}</h3>
          <p>${ESR(subtitle)}</p>
        </div>
        ${children}
      </div>`;
  }

  formGroup(label, inputHtml, note = '') {
    return `
      <div class="form-group">
        <label class="input-label">${ESR(label)}</label>
        ${inputHtml}
        ${note ? `<small style="color:var(--color-text-tertiary);">${note}</small>` : ''}
      </div>`;
  }

  etCheck(name, label, checked) {
    return `
      <div class="form-group">
        <label class="et-check">
          <input type="checkbox" data-elite-field="${name}" ${checked ? 'checked' : ''}>
          <span>${ESR(label)}</span>
        </label>
      </div>`;
  }

  multiSelect(name, values, allValues, note = '') {
    return `
      <select class="input-field select-field" name="${name}" multiple size="5">
        ${allValues.map(v => `<option value="${ESR(v)}" ${values.includes(v) ? 'selected' : ''}>${ESR(v.replace(/-/g, ' '))}</option>`).join('')}
      </select>
      ${note ? `<small style="color:var(--color-text-tertiary);">${ESR(note)}</small>` : ''}`;
  }

  selectedGenderValue(gender) {
    if (Array.isArray(gender)) return gender;
    if (typeof gender === 'string' && gender) return [gender];
    return [];
  }

  toDatetimeLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  fromDatetimeLocal(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // ==================== TABS ====================

  tabGeneral(product) {
    return this.tabShell(
      'General',
      'Osnovni podaci o proizvodu i kategorizacija.',
      `
      <div class="form-row">
        ${this.formGroup('Naziv *', `<input class="input-field" data-elite-field="name" value="${ESR(product.name)}" placeholder="Naziv proizvoda">`)}
        ${this.formGroup('Slug', `<input class="input-field" data-elite-field="slug" value="${ESR(product.slug)}" placeholder="auto-generiše se iz naziva">`)}
      </div>
      <div class="form-row">
        ${this.formGroup('SKU', `<input class="input-field" data-elite-field="sku" value="${ESR(product.sku)}" placeholder="Npr. ML-001">`)}
        ${this.formGroup('Kolekcija *', `<select class="input-field select-field" data-elite-field="collection">${COLLECTIONS.map(c => `<option value="${c}" ${product.collection === c ? 'selected' : ''}>${ESR(c.charAt(0).toUpperCase() + c.slice(1))}</option>`).join('')}</select>`)}
        ${this.formGroup('Kategorija *', `<select class="input-field select-field" data-elite-field="category">${CATEGORIES.map(c => `<option value="${c}" ${product.category === c ? 'selected' : ''}>${ESR(c.replace(/-/g, ' '))}</option>`).join('')}</select>`)}
      </div>
      <div class="form-row">
        ${this.formGroup('Pol / demografija', this.multiSelect('gen_gender', this.selectedGenderValue(product.gender), GENDERS), 'Ctrl/Cmd za višestruki izbor')}
        ${this.formGroup('Stil / prilika', this.multiSelect('gen_style', product.styleOccasion, STYLE_OCCASIONS), 'Ctrl/Cmd za višestruki izbor')}
      </div>
      <div class="form-row">
        ${this.formGroup('Valuta', `<select class="input-field select-field" data-elite-field="currency"><option value="RSD" ${product.currency === 'RSD' ? 'selected' : ''}>RSD</option><option value="EUR" ${product.currency === 'EUR' ? 'selected' : ''}>EUR</option></select>`)}
        ${this.formGroup('Kategorija labela', `<input class="input-field" data-elite-field="categoryLabel" value="${ESR(product.categoryLabel)}" placeholder="T-Shirts">`)}
        ${this.formGroup('Rang (priority)', `<input type="number" class="input-field" data-elite-field="prio" value="${ESR(product.cms.priority)}" min="0">`)}
      </div>`
    );
  }

  tabMedia(product) {
    const gallery = (product.images.gallery || []).length
      ? product.images.gallery
          .map(
            (url, i) => `
          <div class="et-gallery-item">
            ${url ? `<img src="${ESR(url)}" alt="" onerror="this.style.opacity=.2"><button type="button" class="et-gallery-remove" data-action="elite-gallery-remove" data-idx="${i}" aria-label="Ukloni">×</button>` : ''}
            <input class="input-field" data-elite-gallery-url data-idx="${i}" value="${ESR(url)}" placeholder="/images/...">
          </div>`
          )
          .join('')
      : '<div style="color:var(--color-text-tertiary);font-size:var(--text-sm);">Galerija je prazna. Dodajte slike ispod.</div>';
    return this.tabShell(
      'Mediji',
      'Glavna slika, galerija i alternativni tekst.',
      `
      <div class="form-row">
        ${this.formGroup('Glavna slika', `<input class="input-field" data-elite-field="imgMain" value="${ESR(product.images.main)}" placeholder="/images/majica.svg">`)}
        ${this.formGroup('OG slika', `<input class="input-field" data-elite-field="imgOg" value="${ESR(product.images.ogImage)}" placeholder="/images/og-majica.svg">`)}
      </div>
      ${this.formGroup('Alt tekst', `<textarea class="input-field textarea-field" rows="2" data-elite-field="altText" placeholder="Alternativni tekst (pristupačnost i SEO)">${ESR(product.altText)}</textarea>`)}
      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label class="input-label">Galerija</label>
          <div class="et-gallery">${gallery}</div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" data-action="elite-gallery-add">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Dodaj sliku u galeriju
      </button>`
    );
  }

  tabPricing(product) {
    return this.tabShell(
      'Cene',
      'Cene, akcije i porez.',
      `
      <div class="form-row">
        ${this.formGroup('Regulerna cena (RSD) *', `<input type="number" class="input-field" data-elite-field="price" value="${ESR(product.price)}" min="0" step="10">`)}
        ${this.formGroup('Akcijska cena', `<input type="number" class="input-field" data-elite-field="salePrice" value="${ESR(product.salePrice ?? '')}" min="0" step="10">`)}
      </div>
      <div class="form-row">
        ${this.formGroup('PDV stopa (%)', `<input type="number" class="input-field" data-elite-field="vatRate" value="${ESR(product.vatRate)}" min="0" max="100" step="0.1">`)}
        ${this.formGroup('Marža (%)', `<input type="number" class="input-field" data-elite-field="marginPct" value="${ESR(product.marginPct)}" min="0" step="0.5">`)}
      </div>
      <div class="et-callout"><strong>Izračun:</strong> kataloška cena je finalna maloprodajna cena. Akcijska cena je aktivna dok je manja od regularne.</div>`
    );
  }

  tabInventory(product) {
    return this.tabShell(
      'Inventar',
      'Praćenje zaliha i dostupnost.',
      `
      <div class="form-row">
        ${this.formGroup('Ukupne zalihe', `<input type="number" class="input-field" data-elite-field="invTotal" value="${ESR(product.inventory.totalStock)}" min="0">`)}
        ${this.formGroup('Prag niske zalibe', `<input type="number" class="input-field" data-elite-field="invThreshold" value="${ESR(product.inventory.lowStockThreshold)}" min="0">`)}
        ${this.formGroup(
          'Status zaliha',
          `<select class="input-field select-field" data-elite-field="invStatus">
          <option value="in_stock" ${product.inventory.status === 'in_stock' ? 'selected' : ''}>Na stanju</option>
          <option value="low_stock" ${product.inventory.status === 'low_stock' ? 'selected' : ''}>Niska zaliha</option>
          <option value="out_of_stock" ${product.inventory.status === 'out_of_stock' ? 'selected' : ''}>Nema na stanju</option>
          <option value="preorder" ${product.inventory.status === 'preorder' ? 'selected' : ''}>Prednarudžbina</option>
        </select>`
        )}
      </div>
      <div class="form-row">
        ${this.etCheck('invTrack', 'Praćenje zaliha', product.inventory.trackInventory)}
        ${this.etCheck('invBackorder', 'Dozvoli prednarudžbine', product.inventory.allowBackorder)}
      </div>`
    );
  }

  tabVariants(product) {
    const colorRows = product.colors.length
      ? product.colors
          .map((c, i) => {
            const name = typeof c === 'string' ? c : c.name;
            const hex = typeof c === 'string' ? '#808080' : c.hex;
            return `
          <div class="et-variant-row">
            <input class="input-field" data-elite-color-name data-idx="${i}" value="${ESR(name)}" placeholder="Boja">
            <input class="input-field" style="max-width:120px;" data-elite-color-hex data-idx="${i}" value="${ESR(hex)}" placeholder="#HEX" type="color" title="Boja">
            <button type="button" class="btn btn-ghost btn-sm btn-icon" data-action="elite-color-remove" data-idx="${i}" aria-label="Ukloni boju">×</button>
          </div>`;
          })
          .join('')
      : '<div style="color:var(--color-text-tertiary);font-size:var(--text-sm);padding:var(--space-2) 0;">Bez boja.</div>';

    const sizeRows = product.sizes.length
      ? product.sizes
          .map((s, i) => {
            const size = typeof s === 'string' ? s : s.size;
            const stock = typeof s === 'string' ? 0 : (s.stock ?? 0);
            const available = typeof s === 'string' ? true : s.available !== false;
            return `
          <div class="et-variant-row">
            <input class="input-field" data-elite-size-name data-idx="${i}" value="${ESR(size)}" placeholder="Veličina">
            <input type="number" class="input-field" style="max-width:110px;" data-elite-size-stock data-idx="${i}" value="${ESR(stock)}" min="0">
            <label class="et-check" style="margin:0;"><input type="checkbox" data-elite-size-avail data-idx="${i}" ${available ? 'checked' : ''}><span>Dostupno</span></label>
            <button type="button" class="btn btn-ghost btn-sm btn-icon" data-action="elite-size-remove" data-idx="${i}" aria-label="Ukloni veličinu">×</button>
          </div>`;
          })
          .join('')
      : '<div style="color:var(--color-text-tertiary);font-size:var(--text-sm);padding:var(--space-2) 0;">Bez veličina.</div>';

    return this.tabShell(
      'Varijante',
      'Boje i veličine — svaka kombinacija postaje varijanta sa SKU-om.',
      `
      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label class="input-label">Boje</label>
          <div class="et-variants">${colorRows}</div>
          <button type="button" class="btn btn-secondary btn-sm" data-action="elite-color-add">+ Dodaj boju</button>
        </div>
        <div class="form-group" style="flex:1;">
          <label class="input-label">Veličine i zalihe</label>
          <div class="et-variants">${sizeRows}</div>
          <button type="button" class="btn btn-secondary btn-sm" data-action="elite-size-add">+ Dodaj veličinu</button>
        </div>
      </div>`
    );
  }

  tabSeo(product) {
    return this.tabShell(
      'SEO',
      'Meta podaci i struktuirani podaci za pretraživače.',
      `
      <div class="form-row">
        ${this.formGroup('Meta naslov', `<input class="input-field" data-elite-field="seoTitle" value="${ESR(product.seo.metaTitle)}" placeholder="Maks 60 karaktera">`)}
      </div>
      ${this.formGroup('Meta opis', `<textarea class="input-field textarea-field" rows="3" data-elite-field="seoDesc" placeholder="Maks 160 karaktera">${ESR(product.seo.metaDescription)}</textarea>`)}
      <div class="form-row">
        ${this.formGroup('Ključne reči', `<input class="input-field" data-elite-field="seoKeywords" value="${ESR(product.seo.keywords)}" placeholder="razdvojeno zarezima">`)}
        ${this.formGroup('Kanonski URL', `<input class="input-field" data-elite-field="seoCanonical" value="${ESR(product.seo.canonicalUrl)}" placeholder="https://dalli.rs/...">`)}
      </div>
      <div class="form-row">
        ${this.formGroup('MPN', `<input class="input-field" data-elite-field="mpn" value="${ESR(product.structuredData.mpn)}" placeholder="ML-001">`)}
        ${this.formGroup('GTIN (barkod)', `<input class="input-field" data-elite-field="gtin" value="${ESR(product.structuredData.gtin ?? '')}" placeholder="EAN">`)}
        ${this.formGroup('Brend', `<input class="input-field" data-elite-field="brand" value="${ESR(product.structuredData.brand)}">`)}
      </div>`
    );
  }

  tabContent(product) {
    return this.tabShell(
      'Sadržaj',
      'Opis proizvoda, materijal i nega.',
      `
      ${this.formGroup('Kratak opis (kartice)', `<input class="input-field" data-elite-field="shortDesc" value="${ESR(product.shortDescription)}" placeholder="Maks 300 karaktera">`)}
      ${this.formGroup('Detaljan opis', `<textarea class="input-field textarea-field" rows="7" data-elite-field="desc">${ESR(product.description)}</textarea>`)}
      <div class="form-row">
        ${this.formGroup('Materijal', `<input class="input-field" data-elite-field="specMaterial" value="${ESR(product.specifications.material)}" placeholder="100% organski pamuk">`)}
        ${this.formGroup('Gramatura', `<input class="input-field" data-elite-field="specWeight" value="${ESR(product.specifications.weight)}" placeholder="180g/m²">`)}
      </div>
      <div class="form-row">
        ${this.formGroup('Nega', `<input class="input-field" data-elite-field="specCare" value="${ESR(product.specifications.care)}" placeholder="Pranje 30°C">`)}
        ${this.formGroup('Garancija (meseci)', `<input type="number" class="input-field" data-elite-field="specWarranty" value="${ESR(product.specifications.warrantyMonths)}" min="0">`)}
      </div>`
    );
  }

  tabCraftsmanship(product) {
    return this.tabShell(
      'Zanatstvo',
      'Luxury izrada — atelje, poreklo, kvalitet i serija.',
      `
      <div class="form-row">
        ${this.formGroup('Zanatlija / krojač', `<input class="input-field" data-elite-field="craftArtisan" value="${ESR(product.craftsmanship.artisan)}" placeholder="Ime zanatlije">`)}
        ${this.formGroup('Atelje', `<input class="input-field" data-elite-field="craftAtelier" value="${ESR(product.craftsmanship.atelier)}" placeholder="Atelje / mesto izrade">`)}
      </div>
      <div class="form-row">
        ${this.formGroup('Poreklo', `<input class="input-field" data-elite-field="craftProvenance" value="${ESR(product.craftsmanship.provenance)}" placeholder="Npr. Italija, Srbija">`)}
        ${this.formGroup('Kvalitet', `<select class="input-field select-field" data-elite-field="craftGrade"><option value="premium" ${product.craftsmanship.qualityGrade === 'premium' ? 'selected' : ''}>Premium</option><option value="artisan" ${product.craftsmanship.qualityGrade === 'artisan' ? 'selected' : ''}>Artisan</option><option value="couture" ${product.craftsmanship.qualityGrade === 'couture' ? 'selected' : ''}>Couture</option><option value="bespoke" ${product.craftsmanship.qualityGrade === 'bespoke' ? 'selected' : ''}>Bespoke</option></select>`)}
      </div>
      ${this.formGroup('Bilješka o materijalima', `<textarea class="input-field textarea-field" rows="2" data-elite-field="craftMaterials" placeholder="Posebni materijali, tkanine…">${ESR(product.craftsmanship.materialsNote)}</textarea>`)}
      ${this.formGroup('Način izrade', `<textarea class="input-field textarea-field" rows="2" data-elite-field="craftConstruction" placeholder="Ručno, poluručno…">${ESR(product.craftsmanship.construction)}</textarea>`)}
      <div class="form-row">
        ${this.etCheck('craftLimited', 'Limitirana serija', product.craftsmanship.limitedEdition)}
        ${this.formGroup('Izdanje (komada)', `<input type="number" class="input-field" data-elite-field="craftEditionOf" value="${ESR(product.craftsmanship.editionOf)}" min="0">`)}
        ${this.etCheck('craftSerial', 'Serijski numerisano', product.craftsmanship.serialNumbered)}
        ${this.etCheck('craftCoa', 'Sertifikat o autentičnosti', product.craftsmanship.certificateOfAuthenticity)}
      </div>`
    );
  }

  tabView360(product) {
    const p360 = product.cms.product360;
    return this.tabShell(
      '360° Pregled',
      'Interaktivni 360° pregled proizvoda.',
      `
      <div class="form-row">
        ${this.etCheck('p360enabled', 'Omogući 360° pregled', p360.enabled)}
        ${this.formGroup('Broj kadrova', `<input type="number" class="input-field" data-elite-field="p360frames" value="${ESR(p360.totalFrames)}" min="8" max="120">`)}
        ${this.etCheck('p360auto', 'Auto-rotacija', p360.autoRotate)}
      </div>
      ${this.formGroup(`Kadrovi [${(p360.images || []).length}]`, `<textarea class="input-field textarea-field" rows="4" data-elite-field="p360images" placeholder="Putanje do slika, svaka u novom redu. Npr.&#10;/images/360/proizvod-01.avif">${ESR((p360.images || []).join('\n'))}</textarea>`, 'Preporuka: najmanje 24 kadra za pun okretaj.')}
      ${p360.enabled && (p360.images || []).length < 24 ? '<div class="et-callout" style="background:rgba(205,164,85,.12);"><strong>Upozorenje:</strong> manje od 24 kadra može izgledati grubo.</div>' : ''}`
    );
  }

  tabVto(product) {
    const vto = product.cms.virtualTryOn;
    return this.tabShell(
      'Virtual Try-On',
      'Eligibility i postavke virtuelne probne sobe.',
      `
      <div class="form-row">
        ${this.etCheck('vtoEligible', 'Omogući Virtual Try-On', vto.eligible)}
        ${this.formGroup('Tip odevnog predmeta', `<select class="input-field select-field" data-elite-field="vtoType">${GARMENT_TYPES.map(g => `<option value="${g}" ${vto.modelType === g ? 'selected' : ''}>${ESR(g.replace(/-/g, ' '))}</option>`).join('')}</select>`)}
        ${this.formGroup('Fit vodič', `<select class="input-field select-field" data-elite-field="vtoFit"><option value="standard" ${(vto.fitGuide || 'standard') === 'standard' ? 'selected' : ''}>Standard</option><option value="slim" ${vto.fitGuide === 'slim' ? 'selected' : ''}>Slim</option><option value="relaxed" ${vto.fitGuide === 'relaxed' ? 'selected' : ''}>Relaxed</option></select>`)}
      </div>
      ${this.formGroup('Primarna slika (model)', `<input class="input-field" data-elite-field="vtoPrimary" value="${ESR(vto.primaryImage)}" placeholder="/images/virtual-tryon/proizvod-front.svg">`)}
      ${this.formGroup('Sekundarne slike', `<textarea class="input-field textarea-field" rows="3" data-elite-field="vtoSecondary" placeholder="Putanje, svaka u novom redu">${ESR((vto.secondaryImages || []).join('\n'))}</textarea>`)}`
    );
  }

  tabCrypto(product) {
    const crypto = this.cryptoCatalog;
    const currencies = crypto ? crypto.currencies : [];
    const methods = crypto ? crypto.paymentMethods : [];
    const accepted = product.payments.acceptedCurrencies || [];
    const selectedMethods = product.payments.paymentMethods || [];
    const note = crypto ? `Auto-detektovano iz <code>${ESR(crypto.source)}</code>.` : '';
    return this.tabShell(
      'Kripto plaćanja',
      `Prihvatanje kriptovaluta i načina plaćanja po proizvodu. ${note}`,
      `
      <div class="form-row">
        ${this.etCheck('payCrypto', 'Prihvati kriptovalute za ovaj proizvod', product.payments.cryptoEnabled)}
      </div>
      ${!currencies.length ? '<div class="et-callout">Kripto katalog nije učitan — proverite da <code>/data/crypto-payment-model.json</code> postoji.</div>' : ''}
      <div class="form-row">
        ${this.formGroup('Dozvoljene valute', `<select class="input-field select-field" name="payCurrencies" multiple size="6">${currencies.map(c => `<option value="${ESR(c.id)}" ${accepted.includes(c.id) ? 'selected' : ''}>${ESR(c.name)} (${ESR(c.id)})${c.enabled === false ? ' — isključano' : ''}</option>`).join('')}</select>`, 'Ctrl/Cmd za višestruki izbor')}
        ${this.formGroup('Načini plaćanja', `<select class="input-field select-field" name="payMethods" multiple size="6">${methods.map(m => `<option value="${ESR(m.id)}" ${selectedMethods.includes(m.id) ? 'selected' : ''}>${ESR(m.name)}</option>`).join('')}</select>`, 'Ctrl/Cmd za višestruki izbor')}
      </div>
      <div class="form-row">
        ${this.formGroup('Kripto popust (%)', `<input type="number" class="input-field" data-elite-field="payCryptoDiscount" value="${ESR(product.payments.cryptoDiscountPct)}" min="0" max="30" step="0.5">`)}
      </div>`
    );
  }

  tabShipping(product) {
    const shipping = product.shipping;
    return this.tabShell(
      'Dostava',
      'Dimenzije, težina, klasa dostave i vreme obrade.',
      `
      <div class="form-row">
        ${this.formGroup('Težina (kg)', `<input type="number" class="input-field" data-elite-field="shipWeight" value="${ESR(shipping.weightKg)}" min="0" step="0.1">`)}
        ${this.formGroup('Dužina (cm)', `<input type="number" class="input-field" data-elite-field="shipLength" value="${ESR(shipping.lengthCm)}" min="0">`)}
        ${this.formGroup('Širina (cm)', `<input type="number" class="input-field" data-elite-field="shipWidth" value="${ESR(shipping.widthCm)}" min="0">`)}
        ${this.formGroup('Visina (cm)', `<input type="number" class="input-field" data-elite-field="shipHeight" value="${ESR(shipping.heightCm)}" min="0">`)}
      </div>
      <div class="form-row">
        ${this.formGroup('Klasa dostave', `<select class="input-field select-field" data-elite-field="shipClass"><option value="standard" ${shipping.shippingClass === 'standard' ? 'selected' : ''}>Standard</option><option value="express" ${shipping.shippingClass === 'express' ? 'selected' : ''}>Express</option><option value="white-glove" ${shipping.shippingClass === 'white-glove' ? 'selected' : ''}>White glove</option></select>`)}
        ${this.formGroup('Vreme obrade (dani)', `<input type="number" class="input-field" data-elite-field="shipHandling" value="${ESR(shipping.handlingDays)}" min="0">`)}
      </div>
      <div class="form-row">
        ${this.etCheck('shipFree', 'Besplatna dostava', shipping.freeShipping)}
        ${this.etCheck('shipIntl', 'Međunarodna dostava', shipping.international)}
      </div>`
    );
  }

  tabLuxury(product) {
    const loyalty = product.loyalty;
    return this.tabShell(
      'Luxury karakteristike',
      'Ekskluzivnost, članstvo i loyalty.',
      `
      <div class="form-row">
        ${this.etCheck('luxMember', 'Samo za članove', loyalty.memberOnly)}
        ${this.etCheck('luxEarly', 'Rani pristup', loyalty.earlyAccess)}
        ${this.etCheck('luxLimited', 'Limitirano izdanje', loyalty.limitedRelease)}
      </div>
      <div class="form-row">
        ${this.formGroup('Rani pristup do', `<input type="datetime-local" class="input-field" data-elite-field="luxEarlyDate" value="${ESR(this.toDatetimeLocal(loyalty.earlyAccessDate))}">`)}
        ${this.formGroup(
          'Potreban tier',
          `<select class="input-field select-field" data-elite-field="luxTier">
          <option value="" ${!loyalty.tierRequired ? 'selected' : ''}>Nema</option>
          <option value="silver" ${loyalty.tierRequired === 'silver' ? 'selected' : ''}>Silver</option>
          <option value="gold" ${loyalty.tierRequired === 'gold' ? 'selected' : ''}>Gold</option>
          <option value="vip" ${loyalty.tierRequired === 'vip' ? 'selected' : ''}>VIP</option>
        </select>`
        )}
      </div>
      <div class="form-row">
        ${this.formGroup('Max po kupcu', `<input type="number" class="input-field" data-elite-field="luxMaxPerCustomer" value="${ESR(loyalty.maxPerCustomer)}" min="0">`)}
        ${this.formGroup('Poeni množitelj', `<input type="number" class="input-field" data-elite-field="luxPointsMultiplier" value="${ESR(loyalty.pointsMultiplier)}" min="1" step="0.5">`)}
      </div>`
    );
  }

  tabFaq(product) {
    const rows = product.faq.length
      ? product.faq
          .map(
            (f, i) => `
          <div class="et-faq-row">
            <input class="input-field" data-elite-faq-q data-idx="${i}" value="${ESR(f.question)}" placeholder="Pitanje">
            <input class="input-field" data-elite-faq-a data-idx="${i}" value="${ESR(f.answer)}" placeholder="Odgovor">
            <button type="button" class="btn btn-ghost btn-sm btn-icon" data-action="elite-faq-remove" data-idx="${i}" aria-label="Ukloni">×</button>
          </div>`
          )
          .join('')
      : '<div style="color:var(--color-text-tertiary);font-size:var(--text-sm);padding:var(--space-2) 0;">Nema pitanja.</div>';
    return this.tabShell(
      'FAQ',
      'Česta pitanja — prikazuju se na stranici proizvoda.',
      `
      <div class="et-faqs">${rows}</div>
      <button type="button" class="btn btn-secondary btn-sm" data-action="elite-faq-add">+ Dodaj pitanje</button>`
    );
  }

  tabAnalytics(product) {
    const a = product.analytics;
    const cms = product.cms;
    const kpis = [
      { label: 'Pregledi (katalog)', value: cms.viewCount ?? 0 },
      { label: 'Prodaja (katalog)', value: cms.salesCount ?? 0 },
      { label: 'Dodato u korpu', value: cms.cartAddCount ?? 0 },
      { label: 'Pregledi (elite)', value: a.views ?? 0 },
      { label: 'Konverzije', value: a.conversions ?? 0 },
      { label: 'Angažman', value: a.engagement ?? 0 },
    ];
    const revenue = a.revenue != null ? a.revenue : (cms.salesCount || 0) * (product.price || 0);
    const conversionRate = a.views
      ? Math.round(((cms.salesCount || 0) / a.views) * 100 * 10) / 10
      : 0;
    const cards = kpis
      .map(
        k => `
      <div class="et-kpi">
        <div class="et-kpi-value">${ESR(Number(k.value || 0).toLocaleString('sr-RS'))}</div>
        <div class="et-kpi-label">${ESR(k.label)}</div>
      </div>`
      )
      .join('');
    return this.tabShell(
      'Analitika',
      'Performanse proizvoda — agregovano iz kataloga; pregledi/konverzije se ne menjaju ručno.',
      `
      <div class="et-kpis">${cards}</div>
      <div class="form-row">
        ${this.formGroup('Prihod (RSD)', `<input type="number" class="input-field" data-elite-field="anRevenue" value="${ESR(revenue)}" min="0">`)}
        ${this.formGroup('Stopa konverzije (%)', `<input type="number" class="input-field" value="${ESR(conversionRate)}" disabled>`)}
      </div>`
    );
  }

  tabPublishing(product) {
    const pub = product.publishing;
    const status = pub.workflow || 'draft';
    const index = WORKFLOW.indexOf(status);
    const transitions = this.getWorkflowTransitions(status);
    const bullets = WORKFLOW.map(
      (wf, i) => `
      <div class="et-wf-step ${i <= index ? 'reached' : ''} ${wf === status ? 'current' : ''}">
        <div class="et-wf-dot"></div>
        <div>${ESR(WORKFLOW_LABELS[wf])}</div>
      </div>`
    ).join('');
    return this.tabShell(
      'Objavljivanje',
      'Workflow status i zakazivanje objave.',
      `
      <div class="et-wf">${bullets}</div>
      <div class="et-wf-actions">
        ${transitions.map(t => `<button class="btn btn-sm ${t.primary ? 'btn-primary' : 'btn-secondary'}" data-action="elite-workflow" data-state="${t.to}">${ESR(t.label)}</button>`).join('')}
      </div>
      <div class="form-row">
        ${this.formGroup('Zakazano objavljivanje', `<input type="datetime-local" class="input-field" data-elite-field="pubScheduledAt" value="${ESR(this.toDatetimeLocal(pub.scheduledAt))}">`)}
      </div>
      ${this.formGroup('Napomena', `<textarea class="input-field textarea-field" rows="2" data-elite-field="pubNotes" placeholder="Interne napomene o objavi">${ESR(pub.notes)}</textarea>`)}
      <div class="form-row">
        ${this.etCheck('cmsFeatured', 'Prikazano na naslovnoj', product.cms.featured)}
        ${this.etCheck('cmsBestseller', 'Besteller oznaka', product.cms.bestseller)}
        ${this.etCheck('cmsNewArrival', 'Novo u ponudi', product.cms.newArrival)}
      </div>`
    );
  }

  getWorkflowTransitions(status) {
    switch (status) {
      case 'draft':
        return [{ to: 'review', label: 'Pošalji na pregled', primary: true }];
      case 'review':
        return [
          { to: 'approved', label: 'Odobri', primary: true },
          { to: 'draft', label: 'Vrati na nacrt' },
        ];
      case 'approved':
        return [
          { to: 'scheduled', label: 'Zakaži objavu' },
          { to: 'published', label: 'Objavi odmah', primary: true },
          { to: 'review', label: 'Vrati na pregled' },
        ];
      case 'scheduled':
        return [
          { to: 'published', label: 'Objavi sada', primary: true },
          { to: 'approved', label: 'Odloži' },
        ];
      case 'published':
        return [
          { to: 'archived', label: 'Arhiviraj' },
          { to: 'review', label: 'Vrati na pregled' },
        ];
      case 'archived':
        return [{ to: 'draft', label: 'Vrati u nacrt' }];
      default:
        return [];
    }
  }

  // ==================== EVENTS ====================

  bindEvents() {
    // ---- List view ----
    this.on(
      'input',
      '[data-elite-filter="search"]',
      ImperiumUtils.debounce(e => {
        this.search = e.target.value;
        this.render();
      }, 250)
    );

    this.on('change', '[data-elite-filter="collection"]', e => {
      this.filterCollection = e.target.value;
      this.render();
    });

    this.on('click', '[data-action="elite-refresh"]', async () => {
      await this.loadProducts();
      this.render();
    });

    this.on('click', '[data-action="elite-open"]', e =>
      this.openEditor(e.delegateTarget.dataset.id)
    );

    this.on('click', '[data-action="elite-create"]', () => {
      const product = Object.assign(this.emptyProduct(), { id: this.nextId() });
      this.products.unshift(product);
      this.editingId = product.id;
      this.brandNew = true;
      this.dirty = false;
      this.mode = 'edit';
      this.etab = 'general';
      this.render();
    });

    // ---- Editor chrome ----
    this.on('click', '[data-action="elite-back"]', () => {
      if (this.dirty && !window.confirm('Imate nesačuvane izmene. Napustiti editor bez čuvanja?'))
        return;
      this.mode = 'list';
      this.editingId = null;
      this.brandNew = false;
      this.dirty = false;
      this.render();
    });

    this.on('click', '[data-etab]', e => this.switchTab(e.delegateTarget.dataset.etab));

    this.on('click', '[data-action="elite-prev-tab"]', () => this.switchRelative(-1));
    this.on('click', '[data-action="elite-next-tab"]', () => this.switchRelative(1));

    this.on('click', '[data-action="elite-save"]', async () => this.saveCurrentTabAndPersist());

    this.on('click', '[data-action="elite-preview"]', () => this.previewProduct());

    this.on('click', '[data-action="elite-workflow"]', e => {
      this.applyWorkflow(e.delegateTarget.dataset.state);
      this.render();
    });

    // ---- Media ----
    this.on('click', '[data-action="elite-gallery-add"]', () => {
      this.attachGalleryItem('');
      this.render();
    });
    this.on('click', '[data-action="elite-gallery-remove"]', e => {
      this.gallery().splice(parseInt(e.delegateTarget.dataset.idx, 10), 1);
      this.dirty = true;
      this.render();
    });

    // ---- Variants ----
    this.on('click', '[data-action="elite-color-add"]', () => {
      this.syncColorsFromDom();
      this.editing.colors.push({ name: '', hex: '#808080' });
      this.dirty = true;
      this.render();
    });
    this.on('click', '[data-action="elite-size-add"]', () => {
      this.syncSizesFromDom();
      this.editing.sizes.push({ size: '', stock: 0, available: true });
      this.dirty = true;
      this.render();
    });
    this.on('click', '[data-action="elite-color-remove"]', e => {
      this.syncColorsFromDom();
      this.editing.colors.splice(parseInt(e.delegateTarget.dataset.idx, 10), 1);
      this.dirty = true;
      this.render();
    });
    this.on('click', '[data-action="elite-size-remove"]', e => {
      this.syncSizesFromDom();
      this.editing.sizes.splice(parseInt(e.delegateTarget.dataset.idx, 10), 1);
      this.dirty = true;
      this.render();
    });

    // ---- FAQ ----
    this.on('click', '[data-action="elite-faq-add"]', () => {
      this.syncFaqsFromDom();
      this.editing.faq.push({ question: '', answer: '' });
      this.dirty = true;
      this.render();
    });
    this.on('click', '[data-action="elite-faq-remove"]', e => {
      this.syncFaqsFromDom();
      this.editing.faq.splice(parseInt(e.delegateTarget.dataset.idx, 10), 1);
      this.dirty = true;
      this.render();
    });

    // ---- Live capture (input + change) ----
    this.on(
      'input',
      '[data-elite-field]',
      ImperiumUtils.debounce(e => this.captureField(e.target), 250)
    );
    this.on('change', '[data-elite-field]', e => this.captureField(e.target));
    this.on('change', 'select[multiple]', () => {
      this.captureMultiSelects();
      this.markDirty();
    });
    this.on(
      'input',
      '[data-elite-gallery-url]',
      ImperiumUtils.debounce(e => this.captureGalleryUrl(e.target), 250)
    );
  }

  openEditor(id) {
    const product = this.products.find(p => String(p.id) === String(id));
    if (!product) return;
    this.editingId = product.id;
    this.brandNew = false;
    this.dirty = false;
    this.mode = 'edit';
    this.etab = 'general';
    this.render();
  }

  switchTab(tabId) {
    if (this.etab === tabId) return;
    this.captureCurrentTab();
    this.etab = tabId;
    this.render();
  }

  switchRelative(offset) {
    const tabs = this.tabConfig();
    const index = tabs.findIndex(t => t.id === this.etab);
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    this.switchTab(next.id);
  }

  markDirty() {
    this.dirty = true;
  }

  gallery() {
    const product = this.editing;
    if (!product) return [];
    if (!Array.isArray(product.images.gallery)) product.images.gallery = [];
    return product.images.gallery;
  }

  // ==================== LIVE CAPTURE ====================

  captureField(input, markDirty = true) {
    const product = this.editing;
    if (!product || !input.dataset.eliteField) return;
    const field = input.dataset.eliteField;
    const path = this.pathFor(field);
    if (!path) return;
    let value = input.value;
    if (input.type === 'checkbox') value = input.checked;
    else if (input.type === 'number') value = input.value === '' ? null : Number(input.value);
    value = this.transformField(field, value);
    this.deepSet(product, path, value);
    if (markDirty) this.dirty = true;
  }

  pathFor(field) {
    const map = {
      // scalar fields
      name: ['name'],
      slug: ['slug'],
      sku: ['sku'],
      collection: ['collection'],
      category: ['category'],
      currency: ['currency'],
      categoryLabel: ['categoryLabel'],
      price: ['price'],
      salePrice: ['salePrice'],
      vatRate: ['vatRate'],
      marginPct: ['marginPct'],
      shortDesc: ['shortDescription'],
      desc: ['description'],
      imgMain: ['images', 'main'],
      imgOg: ['images', 'ogImage'],
      altText: ['altText'],
      seoTitle: ['seo', 'metaTitle'],
      seoDesc: ['seo', 'metaDescription'],
      seoKeywords: ['seo', 'keywords'],
      seoCanonical: ['seo', 'canonicalUrl'],
      mpn: ['structuredData', 'mpn'],
      gtin: ['structuredData', 'gtin'],
      brand: ['structuredData', 'brand'],
      specMaterial: ['specifications', 'material'],
      specWeight: ['specifications', 'weight'],
      specCare: ['specifications', 'care'],
      specWarranty: ['specifications', 'warrantyMonths'],
      prio: ['cms', 'priority'],
      vtoType: ['cms', 'virtualTryOn', 'modelType'],
      vtoFit: ['cms', 'virtualTryOn', 'fitGuide'],
      vtoPrimary: ['cms', 'virtualTryOn', 'primaryImage'],
      vtoSecondary: ['cms', 'virtualTryOn', 'secondaryImages'],
      p360frames: ['cms', 'product360', 'totalFrames'],
      p360images: ['cms', 'product360', 'images'],
      craftArtisan: ['craftsmanship', 'artisan'],
      craftAtelier: ['craftsmanship', 'atelier'],
      craftProvenance: ['craftsmanship', 'provenance'],
      craftMaterials: ['craftsmanship', 'materialsNote'],
      craftConstruction: ['craftsmanship', 'construction'],
      craftGrade: ['craftsmanship', 'qualityGrade'],
      craftEditionOf: ['craftsmanship', 'editionOf'],
      shipWeight: ['shipping', 'weightKg'],
      shipLength: ['shipping', 'lengthCm'],
      shipWidth: ['shipping', 'widthCm'],
      shipHeight: ['shipping', 'heightCm'],
      shipClass: ['shipping', 'shippingClass'],
      shipHandling: ['shipping', 'handlingDays'],
      luxEarlyDate: ['loyalty', 'earlyAccessDate'],
      luxTier: ['loyalty', 'tierRequired'],
      luxMaxPerCustomer: ['loyalty', 'maxPerCustomer'],
      luxPointsMultiplier: ['loyalty', 'pointsMultiplier'],
      payCryptoDiscount: ['payments', 'cryptoDiscountPct'],
      pubScheduledAt: ['publishing', 'scheduledAt'],
      pubNotes: ['publishing', 'notes'],
      anRevenue: ['analytics', 'revenue'],
      // checkboxes
      invTrack: ['inventory', 'trackInventory'],
      invBackorder: ['inventory', 'allowBackorder'],
      invStatus: ['inventory', 'status'],
      invTotal: ['inventory', 'totalStock'],
      invThreshold: ['inventory', 'lowStockThreshold'],
      p360enabled: ['cms', 'product360', 'enabled'],
      p360auto: ['cms', 'product360', 'autoRotate'],
      vtoEligible: ['cms', 'virtualTryOn', 'eligible'],
      payCrypto: ['payments', 'cryptoEnabled'],
      shipFree: ['shipping', 'freeShipping'],
      shipIntl: ['shipping', 'international'],
      luxMember: ['loyalty', 'memberOnly'],
      luxEarly: ['loyalty', 'earlyAccess'],
      luxLimited: ['loyalty', 'limitedRelease'],
      craftLimited: ['craftsmanship', 'limitedEdition'],
      craftSerial: ['craftsmanship', 'serialNumbered'],
      craftCoa: ['craftsmanship', 'certificateOfAuthenticity'],
      cmsFeatured: ['cms', 'featured'],
      cmsBestseller: ['cms', 'bestseller'],
      cmsNewArrival: ['cms', 'newArrival'],
    };
    return map[field] || null;
  }

  transformField(field, value) {
    if (field === 'p360images' || field === 'vtoSecondary') {
      return String(value || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
    }
    if (field === 'luxEarlyDate' || field === 'pubScheduledAt')
      return this.fromDatetimeLocal(value);
    if (field === 'gtin') return value === '' || value == null ? null : value;
    if (field === 'salePrice') return value === null ? null : value;
    if (field === 'luxTier') return value === '' ? null : value;
    return value;
  }

  deepSet(obj, path, value) {
    let o = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!o[path[i]] || typeof o[path[i]] !== 'object') o[path[i]] = {};
      o = o[path[i]];
    }
    o[path[path.length - 1]] = value;
  }

  captureCurrentTab() {
    const product = this.editing;
    if (!product) return;
    this.syncColorsFromDom();
    this.syncSizesFromDom();
    this.syncFaqsFromDom();
    this.syncGalleryFromDom();
    this.captureMultiSelects();
    this.flushScalarFields();
  }

  flushScalarFields() {
    if (!this.editing) return;
    const fields = this.element?.querySelectorAll('[data-elite-field]') || [];
    fields.forEach(field => this.captureField(field, false));
  }

  syncColorsFromDom() {
    const product = this.editing;
    if (!product) return;
    const rows = this.element?.querySelectorAll('[data-elite-color-name]') || [];
    if (!rows.length) return;
    const colors = [];
    rows.forEach(row => {
      const idx = parseInt(row.dataset.idx, 10);
      const nameEl = this.element.querySelector(`[data-elite-color-name][data-idx="${idx}"]`);
      const hexEl = this.element.querySelector(`[data-elite-color-hex][data-idx="${idx}"]`);
      const name = (nameEl?.value || '').trim();
      if (name) colors.push({ name, hex: hexEl?.value || '#808080' });
    });
    if (colors.length) product.colors = colors;
  }

  syncSizesFromDom() {
    const product = this.editing;
    if (!product) return;
    const rows = this.element?.querySelectorAll('[data-elite-size-name]') || [];
    if (!rows.length) return;
    const sizes = [];
    rows.forEach(row => {
      const idx = parseInt(row.dataset.idx, 10);
      const nameEl = this.element.querySelector(`[data-elite-size-name][data-idx="${idx}"]`);
      const stockEl = this.element.querySelector(`[data-elite-size-stock][data-idx="${idx}"]`);
      const availEl = this.element.querySelector(`[data-elite-size-avail][data-idx="${idx}"]`);
      const name = (nameEl?.value || '').trim();
      if (name)
        sizes.push({
          size: name,
          stock: Number(stockEl?.value || 0),
          available: availEl ? availEl.checked : true,
        });
    });
    if (sizes.length) product.sizes = sizes;
  }

  syncFaqsFromDom() {
    const product = this.editing;
    if (!product) return;
    const rows = this.element?.querySelectorAll('[data-elite-faq-q]') || [];
    if (!rows.length) return;
    const faqs = [];
    rows.forEach(row => {
      const idx = parseInt(row.dataset.idx, 10);
      const q = this.element.querySelector(`[data-elite-faq-q][data-idx="${idx}"]`);
      const a = this.element.querySelector(`[data-elite-faq-a][data-idx="${idx}"]`);
      if (q?.value?.trim()) faqs.push({ question: q.value.trim(), answer: a?.value?.trim() || '' });
    });
    if (faqs.length) product.faq = faqs;
  }

  syncGalleryFromDom() {
    const product = this.editing;
    if (!product) return;
    const urls = this.element?.querySelectorAll('[data-elite-gallery-url]') || [];
    if (!urls.length) return;
    const gallery = [];
    urls.forEach(url => {
      if (url.value.trim()) gallery.push(url.value.trim());
    });
    product.images.gallery = gallery;
  }

  captureMultiSelects() {
    const product = this.editing;
    if (!product) return;
    const maps = {
      gen_gender: ['gender'],
      gen_style: ['styleOccasion'],
      payCurrencies: ['payments', 'acceptedCurrencies'],
      payMethods: ['payments', 'paymentMethods'],
    };
    const selects = this.element?.querySelectorAll('select[multiple]') || [];
    selects.forEach(sel => {
      const map = maps[sel.name];
      if (!map) return;
      const values = Array.from(sel.selectedOptions).map(o => o.value);
      this.deepSet(product, map, values);
    });
  }

  captureGalleryUrl(input) {
    const product = this.editing;
    if (!product) return;
    const idx = parseInt(input.dataset.idx || '0', 10);
    this.gallery()[idx] = input.value;
    this.dirty = true;
  }

  attachGalleryItem(url) {
    this.gallery().push(url);
  }

  // ==================== SAVE ====================

  async saveCurrentTabAndPersist() {
    const product = this.editing;
    if (!product) return;

    this.captureCurrentTab();

    // Derive slug
    if (!product.slug || product.slug === 'proizvod-') {
      product.slug = ImperiumUtils.format.slugify(product.name) || `proizvod-${Date.now()}`;
    }

    // Sync total stock from sizes
    if (Array.isArray(product.sizes) && product.sizes.length) {
      product.inventory.totalStock = product.sizes.reduce(
        (s, size) => s + Number(size.stock || 0),
        0
      );
    }

    // Finalize normalized state
    const normalized = this.normalizeProduct(product);
    normalized.cms.updatedAt = new Date().toISOString();

    const isNew = this.brandNew;
    const idx = this.products.findIndex(p => String(p.id) === String(normalized.id));
    if (idx >= 0) this.products[idx] = normalized;

    try {
      const payload = this.toApiPayload(normalized);
      if (isNew) {
        const created = await this.api.create(payload);
        if (created && (created.product || created.data || created.id)) {
          const saved = created.product || created.data || created;
          if (saved.id != null) {
            normalized.id = saved.id;
            if (idx >= 0) this.products[idx] = normalized;
            this.editingId = normalized.id;
          }
        }
        this.brandNew = false;
        this.admin?.success('Elite proizvod kreiran');
      } else {
        await this.api.update(normalized.id, payload);
        if (idx >= 0) this.products[idx] = normalized;
        this.admin?.success('Elite proizvod sačuvan');
      }
      this.dirty = false;
    } catch (error) {
      console.warn('[EliteEditor] Save to API failed, queuing offline:', error.message);
      this.queueOffline(normalized, isNew);
      this.dirty = false;
      this.admin?.warning?.(
        'Izmena sačuvana lokalno (offline red). Sinhronizovaće se po povratku konekcije.'
      );
    }
    this.render();
  }

  toApiPayload(product) {
    const p = this.normalizeProduct(product);
    return {
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      shortDescription: p.shortDescription,
      description: p.description,
      category: p.category,
      gender: Array.isArray(p.gender) && p.gender.length ? p.gender : ['unisex'],
      price: Number(p.price) || 0,
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      currency: p.currency || 'RSD',
      categoryLabel:
        p.categoryLabel || p.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      images: {
        main: p.images.main || '',
        gallery: p.images.gallery || [],
        ogImage: p.images.ogImage || '',
      },
      altText: p.altText,
      colors: p.colors || [],
      sizes: p.sizes || [],
      vatRate: p.vatRate,
      marginPct: p.marginPct,
      specifications: p.specifications,
      inventory: p.inventory,
      seo: p.seo,
      structuredData: p.structuredData,
      faq: p.faq || [],
      cms: p.cms,
      loyalty: p.loyalty,
      collection: p.collection || 'casual',
      styleOccasion: p.styleOccasion || [],
      shipping: p.shipping,
      craftsmanship: p.craftsmanship,
      payments: p.payments,
      publishing: p.publishing,
      analytics: p.analytics,
    };
  }

  queueOffline(product, isNew) {
    try {
      const queue = JSON.parse(localStorage.getItem(this.offlineQueueKey) || '[]');
      queue.push({ product, isNew, at: new Date().toISOString() });
      localStorage.setItem(this.offlineQueueKey, JSON.stringify(queue.slice(-50)));
    } catch (e) {
      console.warn('[EliteEditor] Failed to persist offline queue:', e.message);
    }
  }

  applyWorkflow(next) {
    const product = this.editing;
    if (!product) return;
    const now = new Date().toISOString();
    if (!product.publishing) product.publishing = {};
    product.publishing.workflow = next;
    product.publishing.updatedAt = now;

    const cmsStatusMap = {
      draft: 'draft',
      review: 'draft',
      approved: 'approved',
      scheduled: 'scheduled',
      published: 'published',
      archived: 'archived',
    };
    product.cms.status = cmsStatusMap[next] || next;

    if (next === 'published') {
      product.publishing.publishedAt = now;
      product.cms.publishedAt = product.cms.publishedAt || now;
    }
    if (next === 'scheduled') {
      const el = this.element?.querySelector('[data-elite-field="pubScheduledAt"]');
      if (el) product.publishing.scheduledAt = this.fromDatetimeLocal(el.value) || null;
    }
    if (next === 'archived') product.publishing.archivedAt = now;
    this.markDirty();
    const saveBtn = this.element?.querySelector('[data-action="elite-save"]');
    if (saveBtn) saveBtn.disabled = !product.name;
  }

  previewProduct() {
    this.captureCurrentTab();
    const product = this.editing;
    if (!product) return;
    const target = product.slug ? `/proizvod-${product.slug}.html` : product.images?.main || '';
    if (target) window.open(target, '_blank', 'noopener');
  }
}

export default EliteProductEditorSection;
