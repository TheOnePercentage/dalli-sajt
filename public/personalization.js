/**
 * DALLI Personalization Engine
 * Learns user preferences for CASUAL vs ELEGANCE and provides personalized recommendations
 */

class DALLIPersonalization {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'dalli_personalization';
    this.sessionKey = 'dalli_session_prefs';
    this.eventsEndpoint = options.eventsEndpoint || '/.netlify/functions/track-event';

    // State
    this.profile = this.loadProfile();
    this.sessionPrefs = this.loadSessionPrefs();
    this.listeners = new Map();

    // Initialize
    this.init();
  }

  init() {
    // Track page views
    this.trackPageView();

    // Track product interactions
    this.bindProductEvents();

    // Track search queries
    this.bindSearchEvents();

    // Track cart/checkout events
    this.bindCartEvents();

    // Load product index (for recommendations + affinity learning)
    this.loadProductIndex().then(() => this.applyPersonalization());

    // Re-apply personalization whenever the profile changes
    this.on('profileUpdated', () => {
      clearTimeout(this._applyTimer);
      this._applyTimer = setTimeout(() => this.applyPersonalization(), 150);
    });

    // Sync with server periodically
    this.startSyncInterval();
  }

  async loadProductIndex() {
    if (Array.isArray(window.DALLI_ProductsCache) && window.DALLI_ProductsCache.length) {
      this.productIndex = window.DALLI_ProductsCache;
      return this.productIndex;
    }
    try {
      const res = await fetch('/data/products.json', { cache: 'force-cache' });
      const data = await res.json();
      const products = data.products || [];
      window.DALLI_ProductsCache = products;
      this.productIndex = products;
    } catch (err) {
      console.warn('[Personalization] Product index unavailable:', err);
      this.productIndex = window.DALLI_ProductsCache || [];
    }
    return this.productIndex;
  }

  getProductFromIndex(id) {
    const products = window.DALLI_ProductsCache || this.productIndex || [];
    return products.find(p => String(p.id) === String(id)) || null;
  }

  // ============ Profile Management ============

  loadProfile() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : this.getDefaultProfile();
    } catch {
      return this.getDefaultProfile();
    }
  }

  getDefaultProfile() {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        collection: { casual: 0, elegance: 0 }, // affinity scores
        gender: { men: 0, women: 0, unisex: 0 },
        category: {},
        styleOccasion: {},
        color: {},
        priceRange: { min: 0, max: 10000, avg: 2000 },
      },
      behavior: {
        totalViews: 0,
        totalClicks: 0,
        totalAddToCart: 0,
        totalPurchases: 0,
        totalSearchQueries: 0,
        avgSessionDuration: 0,
        preferredSort: 'relevance',
        preferredView: 'grid',
      },
      history: {
        viewedProducts: [], // last 50
        searchedQueries: [], // last 20
        purchasedProducts: [], // last 20
        addedToCart: [], // last 20
      },
      segments: {
        isNewVisitor: true,
        isReturning: false,
        isHighValue: false,
        prefersCasual: false,
        prefersElegance: false,
        priceSensitive: false,
        brandLoyal: false,
      },
    };
  }

  saveProfile() {
    this.profile.updatedAt = new Date().toISOString();
    localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
    this.emit('profileUpdated', this.profile);
  }

  loadSessionPrefs() {
    try {
      const stored = sessionStorage.getItem(this.sessionKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  saveSessionPrefs() {
    sessionStorage.setItem(this.sessionKey, JSON.stringify(this.sessionPrefs));
  }

  // ============ Event Tracking ============

  trackEvent(eventType, data = {}) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      data,
    };

    // Update local profile
    this.updateProfileFromEvent(event);

    // Send to server (non-blocking)
    this.sendEventToServer(event);

    this.emit(eventType, event);
  }

  trackPageView() {
    const page = window.location.pathname;
    const referrer = document.referrer;

    this.trackEvent('page_view', { page, referrer });

    // Track collection/page type
    if (page.startsWith('/casual/')) {
      this.incrementPreference('collection', 'casual', 1);
    } else if (page.startsWith('/elegance/')) {
      this.incrementPreference('collection', 'elegance', 1);
    }
  }

  bindProductEvents() {
    // Product card clicks
    document.addEventListener('click', e => {
      const productCard = e.target.closest('[data-product-id]');
      if (!productCard) return;

      const productId = productCard.dataset.productId;
      const action = e.target.closest('[data-action]')?.dataset.action || 'click';

      this.trackEvent('product_interaction', {
        productId,
        action, // click, quick_add, wishlist, view_360, virtual_tryon
        source: 'product_card',
      });

      this.recordViewedProduct(productCard.dataset.productId);
    });

    // Product page interactions
    if (document.body.classList.contains('product-page')) {
      const productId = document.body.dataset.productId;
      if (productId) {
        this.recordViewedProduct(productId);
        this.trackEvent('product_view', { productId });
      }
    }
  }

  bindSearchEvents() {
    // Search form submissions
    document.addEventListener('submit', e => {
      const form = e.target.closest('[data-search-form], #searchForm, .search-form');
      if (!form) return;

      const input = form.querySelector('input[type="search"], input[name="q"]');
      if (input?.value?.trim()) {
        this.trackEvent('search', {
          query: input.value.trim(),
          resultsCount: 0, // will be updated by search results
        });
        this.recordSearchQuery(input.value.trim());
      }
    });

    // Search modal interactions
    document.addEventListener('click', e => {
      if (e.target.matches('[data-track="search_result_click"]')) {
        this.trackEvent('search_result_click', {
          productId: e.target.dataset.productId,
          query: e.target.dataset.searchQuery,
          position: e.target.dataset.position,
        });
      }
    });
  }

  bindCartEvents() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-action="quick-add"], [data-action="add-to-cart"]');
      if (btn) {
        const productId = btn.dataset.productId;
        const variantId = btn.dataset.variantId;
        this.trackEvent('add_to_cart', { productId, variantId });
        this.incrementPreference('category', this.getProductCategory(btn.dataset.productId), 2);
      }
    });

    // Checkout completion
    document.addEventListener('dalli:checkout_complete', e => {
      this.trackEvent('purchase', e.detail);
      e.detail.items?.forEach(item => {
        this.incrementPreference('category', item.category, 5);
        this.incrementPreference('collection', item.collection, 5);
        this.recordPurchasedProduct(item.productId);
      });
    });
  }

  // ============ Preference Learning ============

  incrementPreference(namespace, key, weight = 1) {
    if (!this.profile.preferences[namespace]) {
      this.profile.preferences[namespace] = {};
    }
    this.profile.preferences[namespace][key] =
      (this.profile.preferences[namespace][key] || 0) + weight;
    this.saveProfile();
  }

  getProductCategory(productId) {
    const product = this.getProductById(productId);
    return product?.category || '';
  }

  getProductById(id) {
    // Try to find in viewed products history
    const historyId = this.profile.history.viewedProducts.find(p => p.id === id);
    return historyId ? { category: historyId.category } : null;
  }

  recordViewedProduct(productId) {
    const product = this.getProductFromIndex(productId);
    if (!product) return;

    // Add to viewed history (keep last 50)
    this.profile.history.viewedProducts = [
      {
        id: product.id,
        category: product.category,
        collection: product.collection,
        timestamp: new Date().toISOString(),
      },
      ...this.profile.history.viewedProducts.filter(p => p.id !== productId),
    ].slice(0, 50);

    this.incrementPreference('category', product.category, 1);
    this.incrementPreference('collection', product.collection, 1);
    product.styleOccasion?.forEach(so => this.incrementPreference('styleOccasion', so, 1));
    product.colors?.forEach(c => this.incrementPreference('color', c.name, 1));

    this.profile.behavior.totalViews++;
    this.saveProfile();
  }

  recordSearchQuery(query) {
    this.profile.history.searchedQueries = [
      query,
      ...this.profile.history.searchedQueries.filter(q => q !== query),
    ].slice(0, 20);

    this.profile.behavior.totalSearchQueries++;
    this.saveProfile();
  }

  recordPurchasedProduct(productId) {
    this.profile.history.purchasedProducts = [
      productId,
      ...this.profile.history.purchasedProducts.filter(id => id !== productId),
    ].slice(0, 20);

    this.profile.behavior.totalPurchases++;
    this.updateSegments();
    this.saveProfile();
  }

  updateProfileFromEvent(event) {
    switch (event.type) {
      case 'product_interaction':
        if (event.data.action === 'quick_add') {
          this.profile.behavior.totalAddToCart++;
          this.incrementPreference('category', this.getProductCategory(event.data.productId), 2);
        }
        break;
      case 'purchase':
        this.profile.behavior.totalPurchases++;
        break;
      case 'search':
        this.profile.behavior.totalSearchQueries++;
        break;
    }
    this.saveProfile();
  }

  async sendEventToServer(event) {
    try {
      await fetch('/.netlify/functions/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
      });
    } catch (err) {
      console.warn('[Personalization] Failed to send event:', err);
    }
  }

  // ============ Segmentation ============

  updateSegments() {
    const p = this.profile.preferences;
    const b = this.profile.behavior;
    const s = this.profile.segments;

    // Casual vs Elegance preference
    const casualScore = p.collection.casual || 0;
    const eleganceScore = p.collection.elegance || 0;
    s.prefersCasual = casualScore > eleganceScore * 1.5;
    s.prefersElegance = eleganceScore > casualScore * 1.5;

    // Price sensitivity
    const avgPrice = p.priceRange.avg || 2000;
    s.priceSensitive = avgPrice < 2000;

    // Loyalty
    s.brandLoyal = b.totalPurchases >= 3;

    // Visitor status
    s.isNewVisitor = b.totalViews < 5;
    s.isReturning = b.totalViews >= 5;

    // High value customer
    s.isHighValue = b.totalPurchases >= 5 || (b.totalPurchases > 0 && p.priceRange.avg > 3000);

    this.saveProfile();
  }

  // ============ Recommendations ============

  getRecommendations(options = {}) {
    const {
      limit = 8,
      context = 'homepage', // homepage, product_page, cart, checkout, email
      excludeIds = [],
      collection,
      gender,
    } = options;

    // Score all products based on user preferences
    const scoredProducts = this.getAllProducts()
      .filter(p => !excludeIds.includes(p.id))
      .filter(p => !collection || p.collection === collection)
      .filter(p => !gender || p.gender === gender || p.gender === 'unisex')
      .map(p => ({
        ...p,
        _personalizationScore: this.calculateProductScore(p),
      }))
      .sort((a, b) => b._personalizationScore - a._personalizationScore)
      .slice(0, limit);

    return scoredProducts;
  }

  calculateProductScore(product) {
    let score = 0;
    const p = this.profile.preferences;

    // Collection affinity
    score += (p.collection[product.collection] || 0) * 3;

    // Gender affinity
    score += (p.gender[product.gender] || 0) * 2;

    // Category affinity
    score += (p.category[product.category] || 0) * 2;

    // Style occasion affinity
    product.styleOccasion?.forEach(so => {
      score += (p.styleOccasion[so] || 0) * 2;
    });

    // Color affinity
    product.colors?.forEach(c => {
      score += p.color[c.name] || 0;
    });

    // Price affinity (prefer products near user's average price)
    const userAvgPrice = this.profile.preferences.priceRange.avg || 2000;
    const priceDiff = Math.abs(product.price - userAvgPrice);
    const maxPrice = this.profile.preferences.priceRange.max || 10000;
    score += Math.max(0, (maxPrice - priceDiff) / maxPrice) * 2;

    // Boost featured/bestseller/new
    if (product.cms?.featured) score += 5;
    if (product.cms?.bestseller) score += 3;
    if (product.cms?.newArrival) score += 2;

    // Boost virtual try-on eligible for users who tried it
    if (product.cms?.virtualTryOn?.eligible && this.hasUsedVTO()) score += 3;

    return score;
  }

  getAllProducts() {
    // In real implementation, fetch from API or use cached index
    return window.DALLI_ProductsCache || [];
  }

  hasUsedVTO() {
    return (
      this.profile.behavior.totalViews > 20 && localStorage.getItem('dalli_vto_used') === 'true'
    );
  }

  // ============ UI Application ============

  getCollectionAffinity() {
    const casual = this.profile.preferences.collection.casual || 0;
    const elegance = this.profile.preferences.collection.elegance || 0;
    if (casual === 0 && elegance === 0) return 'neutral';
    if (casual > elegance) return 'casual';
    if (elegance > casual) return 'elegance';
    return 'neutral';
  }

  applyPersonalization() {
    const affinity = this.getCollectionAffinity();
    this.updateSegments();

    // Expose affinity on <html> for CSS/JS hooks
    document.documentElement.dataset.collectionAffinity = affinity;

    // Reorder homepage collection world cards: preferred collection first
    const worlds = document.querySelector('[data-collection-worlds]');
    if (worlds && affinity !== 'neutral') {
      const cards = Array.from(worlds.querySelectorAll('[data-collection]'));
      const preferred = cards.filter(c => c.dataset.collection === affinity);
      const rest = cards.filter(c => c.dataset.collection !== affinity);
      if (preferred.length && rest.length) {
        [...preferred, ...rest].forEach((card, i) => {
          card.style.order = String(i);
          worlds.appendChild(card);
        });
        worlds.dataset.personalizedFor = affinity;
      }
    }

    // Fill optional personalized recommendation slot
    const recSlot = document.querySelector('[data-personalized-recommendations]');
    if (recSlot) {
      const recs = this.getRecommendations({ limit: 4 });
      if (recs.length && typeof window.renderProductGrid === 'function') {
        window.renderProductGrid(recSlot.id, recs, {});
        recSlot.dataset.personalized = 'true';
      }
    }

    // Optional affinity banner
    const banner = document.querySelector('[data-personalized-banner]');
    if (banner && affinity !== 'neutral') {
      const label = affinity === 'casual' ? 'CASUAL' : 'ELEGANCE';
      banner.textContent = `Izabrano za vas — ${label} kolekcija`.replace(
        'Izabrano',
        'Preporučeno'
      );
      banner.hidden = false;
    }

    this.emit('personalizationApplied', { affinity });
  }

  // ============ Public API ============

  getProfile() {
    return { ...this.profile };
  }

  getPreference(namespace, key) {
    return this.profile.preferences[namespace]?.[key] || 0;
  }

  getSegment(segment) {
    return this.profile.segments[segment];
  }

  getRecommendationsForContext(context, options = {}) {
    switch (context) {
      case 'homepage':
        return this.getRecommendations({ limit: 8, context: 'homepage' });
      case 'product_page':
        return this.getRecommendations({
          limit: 4,
          context: 'product_page',
          excludeIds: options.currentProductId ? [options.currentProductId] : [],
          collection: options.collection,
        });
      case 'cart':
        return this.getRecommendations({
          limit: 4,
          context: 'cart',
          excludeIds: options.cartProductIds || [],
        });
      case 'checkout':
        return this.getRecommendations({
          limit: 3,
          context: 'checkout',
          excludeIds: options.cartProductIds || [],
        });
      case 'email':
        return this.getRecommendations({ limit: 6, context: 'email' });
      default:
        return this.getRecommendations({ limit: 8 });
    }
  }

  // ============ Utilities ============

  getSessionId() {
    let sessionId = sessionStorage.getItem('dalli_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('dalli_session_id', sessionId);
    }
    return sessionId;
  }

  startSyncInterval() {
    setInterval(
      () => {
        this.syncWithServer();
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  async syncWithServer() {
    try {
      await fetch('/.netlify/functions/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: this.profile }),
      });
    } catch (err) {
      console.warn('[Personalization] Sync failed:', err);
    }
  }

  // ============ Event Emitter ============

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.DALLI_Personalization = new DALLIPersonalization();
  });
} else {
  window.DALLI_Personalization = new DALLIPersonalization();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DALLIPersonalization;
}
