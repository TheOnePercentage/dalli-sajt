/**
 * DALLI Analytics & Tracking
 * GA4, Enhanced Ecommerce, Meta Pixel, TikTok Pixel, Consent Mode v2
 */

export class Analytics {
  static init() {
    this.initGA4();
    this.initMetaPixel();
    this.initTikTokPixel();
    this.initConsentMode();
    this.initDataLayer();
    this.initEnhancedEcommerce();
    this.initCustomEvents();
  }

  // ============================================================
  // GOOGLE ANALYTICS 4 (GA4)
  // ============================================================
  static initGA4() {
    const measurementId = 'G-XXXXXXXXXX'; // Replace with actual GA4 ID
    
    if (!measurementId || measurementId === 'G-XXXXXXXXXX') {
      console.warn('GA4 Measurement ID not configured');
      return;
    }

    // Load gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: true,
      allow_google_signals: true,
      allow_ad_personalization_signals: true,
      cookie_flags: 'SameSite=None;Secure'
    });

    // Enhanced ecommerce
    this.initEnhancedEcommerce(measurementId);

    // Consent Mode v2
    this.updateConsentMode();
  }

    static initEnhancedEcommerce(measurementId) {
    // Track product views
    document.addEventListener('click', (e) => {
      const productCard = e.target.closest('[data-product-id]');
      if (productCard && e.target.closest('[data-action="quick-add"], [data-action="wishlist"], a[href*="/proizvod-"]')) {
        const productId = productCard.dataset.productId;
        const productData = this.getProductData(productCard);
        this.trackEvent('view_item', {
          currency: 'RSD',
          value: productData.price,
          items: [{
            item_id: productData.id,
            item_name: productData.name,
            item_category: productData.category,
            item_variant: productData.color || productData.size || 'default',
            price: productData.price,
            quantity: 1,
            item_brand: 'DALLI'
          }]
        });
      }
    });

    // Track add to cart
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="quick-add"]');
      if (btn) {
        const productId = btn.dataset.productId;
        const variantId = btn.dataset.variantId;
        const productCard = btn.closest('[data-product-id]');
        const productData = this.getProductData(productCard);
        
        this.trackEvent('add_to_cart', {
          currency: 'RSD',
          value: productData.price,
          items: [{
            item_id: productData.id,
            item_name: productData.name,
            item_category: productData.category,
            item_variant: productData.color || productData.size || 'default',
            price: productData.price,
            quantity: 1,
            item_brand: 'DALLI'
          }]
        });
      }
    });

    // Track begin checkout
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="checkout"]') || e.target.closest('#checkoutBtn')) {
        const cart = this.getCartData();
        if (cart.items.length > 0) {
          window.gtag('event', 'begin_checkout', {
            currency: 'RSD',
            value: cart.total,
            items: cart.items.map(item => ({
              item_id: item.id,
              item_name: item.name,
              item_category: item.category,
              item_variant: item.color || item.size || 'default',
              price: item.price,
              quantity: item.qty,
              item_brand: 'DALLI'
            }))
          });
        }
      }
    });
  }

  static getProductData(card) {
    if (!card) return {};
    
    const nameEl = card.querySelector('.product-card__name, .product-card__name a');
    const priceEl = card.querySelector('.product-card__price');
    const categoryEl = card.querySelector('.product-card__category');
    const colorEl = card.querySelector('.color-swatch, .color-swatch.active');
    const sizeEl = card.querySelector('.size-chip.active, .size-chip:checked');

    return {
      id: card.dataset.productId,
      name: nameEl?.textContent?.trim() || '',
      price: parseFloat(priceEl?.textContent?.replace(/[^\d]/g, '') || '0'),
      category: categoryEl?.textContent?.trim() || 'Garderoba',
      color: colorEl?.getAttribute('aria-label')?.replace('Boja: ', '') || '',
      size: sizeEl?.textContent?.trim() || ''
    };
  }

  static getCartData() {
    try {
      return JSON.parse(localStorage.getItem('dalli_cart') || '[]');
    } catch {
      return { items: [], total: 0 };
    }
  }

  // ============================================================
  // META PIXEL (Facebook/Instagram)
  // ============================================================
  static initMetaPixel() {
    const pixelId = 'XXXXXXXXXXXXXXX'; // Replace with actual Pixel ID
    
    if (!pixelId || pixelId === 'XXXXXXXXXXXXXXX') {
      console.warn('Meta Pixel ID not configured');
      return;
    }

    // Load fbq
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');

    // Enhanced matching
    window.fbq('set', 'autoConfig', false, pixelId);

    // Track events
    this.trackMetaEvent = (eventName, params) => {
      window.fbq('track', eventName, params);
    };
  }

  // ============================================================
  // TIKTOK PIXEL
  // ============================================================
  static initTikTokPixel() {
    const pixelId = 'XXXXXXXXXXXXXXX'; // Replace with actual TikTok Pixel ID
    
    if (!pixelId || pixelId === 'XXXXXXXXXXXXXXX') {
      console.warn('TikTok Pixel ID not configured');
      return;
    }

    // Load TikTok Pixel
    const script = document.createElement('script');
    script.src = 'https://analytics.tiktok.com/i18n/pixel/events.js';
    script.async = true;
    document.head.appendChild(script);

    window.tiktokPixel = window.tiktokPixel || function() {
      window.tiktokPixel.q = window.tiktokPixel.q || [];
      window.tiktokPixel.q.push(arguments);
    };
    
    window.tiktokPixel('init', pixelId);
    window.tiktokPixel('track', 'PageView');

    this.trackTikTokEvent = (eventName, params) => {
      window.tiktokPixel('track', eventName, params);
    };
  }

  // ============================================================
  // CONSENT MODE V2
  // ============================================================
  static initConsentMode() {
    // Default consent state
    const defaultConsent = {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    };

    // Initialize gtag consent
    window.gtag = window.gtag || function() {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(arguments);
    };
    
    window.gtag('consent', 'default', defaultConsent);

    // Listen for consent changes
    window.addEventListener('cookie-consent-update', (e) => {
      this.updateConsentMode(e.detail);
    });

    // Listen for cookie consent changes
    window.addEventListener('cookie-consent-update', (e) => {
      this.updateConsentMode(e.detail);
    });
  }

  static updateConsentMode(consent) {
    if (!consent) return;

    const consentMode = {
      ad_storage: consent.marketing ? 'granted' : 'denied',
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    };

    window.gtag('consent', 'update', consentMode);
  }

  // ============================================================
  // DATA LAYER
  // ============================================================
  static initDataLayer() {
    window.dataLayer = window.dataLayer || [];
    
    // Push page view
    window.dataLayer.push({
      event: 'page_view',
      page_path: window.location.pathname,
      page_title: document.title,
      page_url: window.location.href,
      timestamp: Date.now()
    });

    // Push user data if logged in
    const user = JSON.parse(localStorage.getItem('dalli_user') || 'null');
    if (user) {
      window.dataLayer.push({
        event: 'user_data',
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        user_loyalty_tier: user.loyaltyTier || 'bronze'
      });
    }

    // Push cart data
    this.pushCartData();

    // Listen for cart changes
    window.addEventListener('cart-update', () => {
      this.pushCartData();
    });
  }

  static pushCartData() {
    const cart = JSON.parse(localStorage.getItem('dalli_cart') || '[]');
    const items = cart.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price,
      quantity: item.qty,
      item_brand: 'DALLI',
      item_variant: `${item.color || ''} / ${item.size || ''}`.trim() || 'default'
    }));

    window.dataLayer.push({
      event: 'cart_update',
      ecommerce: {
        currency: 'RSD',
        value: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        items: items
      }
    });
  }

  // ============================================================
  // CUSTOM EVENTS
  // ============================================================
  static initCustomEvents() {
    // Track custom events from data attributes
    document.addEventListener('click', (e) => {
      const trackEl = e.target.closest('[data-track]');
      if (!trackEl) return;

      const eventName = trackEl.dataset.track;
      const eventData = trackEl.dataset.trackData ? JSON.parse(trackEl.dataset.trackData) : {};
      
      this.trackEvent(eventName, eventData);
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.dataset.trackSubmit) {
        const eventName = form.dataset.trackSubmit;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        this.trackEvent(eventName, {
          form_id: form.id,
          ...data
        });
      }
    });

    // Track scroll depth
    let maxScroll = 0;
    let scrollTracked = new Set();
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (scrollPercent >= 25 && !scrollTracked.has(25)) { this.trackEvent('scroll_depth', { depth: 25 }); scrollTracked.add(25); }
        if (scrollPercent >= 50 && !scrollTracked.has(50)) { this.trackEvent('scroll_depth', { depth: 50 }); scrollTracked.add(50); }
        if (scrollPercent >= 75 && !scrollTracked.has(75)) { this.trackEvent('scroll_depth', { depth: 75 }); scrollTracked.add(75); }
        if (scrollPercent >= 100 && !scrollTracked.has(100)) { this.trackEvent('scroll_depth', { depth: 100 }); scrollTracked.add(100); }
      }
    }, { passive: true });

    // Track time on page
    let timeOnPage = 0;
    setInterval(() => {
      timeOnPage += 10;
      if (timeOnPage % 30 === 0) {
        this.trackEvent('time_on_page', { seconds: timeOnPage });
      }
    }, 10000);
  }

  // ============================================================
  // EVENT TRACKING HELPERS
  // ============================================================
  static trackEvent(eventName, params = {}) {
    const eventData = {
      ...params,
      timestamp: Date.now(),
      page_path: window.location.pathname,
      page_title: document.title
    };

    // GA4
    if (window.gtag) {
      window.gtag('event', eventName, params);
    }

    // Meta Pixel
    if (window.fbq) {
      window.fbq('trackCustom', eventName, params);
    }

    // TikTok
    if (window.tiktokPixel) {
      window.tiktokPixel('track', eventName, params);
    }

    // Data Layer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...params
    });

    // Custom event for internal listeners
    window.dispatchEvent(new CustomEvent('analytics:event', {
      detail: { event: eventName, params }
    }));
  }

  // ============================================================
  // ENHANCED ECOMMERCE HELPERS
  // ============================================================
  static trackViewItem(product) {
    this.trackEvent('view_item', {
      currency: 'RSD',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        item_variant: `${product.color || ''} / ${product.size || ''}`.trim() || 'default',
        price: product.price,
        quantity: 1,
        item_brand: 'DALLI'
      }]
    });
  }

  static trackAddToCart(product, quantity = 1) {
    this.trackEvent('add_to_cart', {
      currency: 'RSD',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        item_variant: `${product.color || ''} / ${product.size || ''}`.trim() || 'default',
        price: product.price,
        quantity,
        item_brand: 'DALLI'
      }]
    });
  }

  static trackBeginCheckout(cart) {
    this.trackEvent('begin_checkout', {
      currency: 'RSD',
      value: cart.total,
      items: cart.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        item_variant: `${item.color || ''} / ${item.size || ''}`.trim() || 'default',
        price: item.price,
        quantity: item.qty,
        item_brand: 'DALLI'
      }))
    });
  }

  static trackPurchase(order) {
    this.trackEvent('purchase', {
      transaction_id: order.id,
      currency: 'RSD',
      value: order.total,
      items: order.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        item_variant: `${item.color || ''} / ${item.size || ''}`.trim() || 'default',
        price: item.price,
        quantity: item.qty,
        item_brand: 'DALLI'
      })),
      coupon: order.coupon || ''
    });
  }

  static trackRefund(orderId, items, value) {
    this.trackEvent('refund', {
      transaction_id: orderId,
      currency: 'RSD',
      value: value,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.qty
      }))
    });
  }

  // ============================================================
  // INIT
  // ============================================================
  static init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Analytics.init());
} else {
  Analytics.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Analytics };
}

if (typeof window !== 'undefined') {
  window.Analytics = Analytics;
}