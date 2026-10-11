/**
 * Regional Availability Service
 * Handles product/collection availability, pricing, and messaging per country
 * Provides elegant luxury messaging when products are unavailable
 */

import {
  getCountryConfig,
  isProductAvailableInCountry,
  getProductCountryPrice,
  getCollectionAvailability,
  getCurrentCountry,
  formatPrice
} from './global-commerce.js';

let _availabilityCache = new Map();
let _cacheTTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(type, id, countryCode) {
  return `${type}:${id}:${countryCode}`;
}

function getFromCache(key) {
  const entry = _availabilityCache.get(key);
  if (entry && Date.now() - entry.timestamp < _cacheTTL) {
    return entry.data;
  }
  return null;
}

function setCache(key, data) {
  _availabilityCache.set(key, { data, timestamp: Date.now() });
}

export function checkProductAvailability(product, countryCode = null) {
  const targetCountry = countryCode || getCurrentCountry();
  const cacheKey = getCacheKey('product', product.id || product.sku, targetCountry);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const available = isProductAvailableInCountry(product, targetCountry);
  const countryConfig = getCountryConfig(targetCountry);
  const countryPricing = getProductCountryPrice(product, targetCountry);

  const result = {
    available,
    country: targetCountry,
    countryName: countryConfig?.name || targetCountry,
    currency: countryPricing?.currency || countryConfig?.currency || 'RSD',
    price: countryPricing?.price || product.price,
    salePrice: countryPricing?.salePrice || product.salePrice,
    originalPrice: countryPricing?.originalPrice || product.originalPrice,
    formattedPrice: countryPricing ? formatPrice(countryPricing.price, countryPricing.currency) : formatPrice(product.price),
    formattedSalePrice: countryPricing?.salePrice ? formatPrice(countryPricing.salePrice, countryPricing.currency) : (product.salePrice ? formatPrice(product.salePrice) : null),
    message: null,
    cta: null,
    alternatives: []
  };

  if (!available) {
    result.message = getUnavailableMessage(product, targetCountry, countryConfig);
    result.cta = getUnavailableCTA(targetCountry);
    result.alternatives = getAlternativeProducts(product, targetCountry, 4);
  }

  setCache(cacheKey, result);
  return result;
}

export function checkCollectionAvailability(collectionId, countryCode = null) {
  const targetCountry = countryCode || getCurrentCountry();
  const cacheKey = getCacheKey('collection', collectionId, targetCountry);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const result = getCollectionAvailability(targetCountry, collectionId);
  setCache(cacheKey, result);
  return result;
}

function getUnavailableMessage(product, countryCode, countryConfig) {
  const productName = product.name || 'This product';
  const countryName = countryConfig?.name || countryCode;

  const messages = {
    sr: `"${productName}" trenutno nije dostupan u vašoj regiji (${countryName}).`,
    'sr-Latn': `"${productName}" trenutno nije dostupan u vašoj regiji (${countryName}).`,
    bs: `"${productName}" trenutno nije dostupan u vašoj regiji (${countryName}).`,
    hr: `"${productName}" trenutno nije dostupan u vašoj regiji (${countryName}).`,
    mk: `"${productName}" моментално не е достапен во вашата регија (${countryName}).`,
    sl: `"${productName}" trenutno ni na voljo vaši regiji (${countryName}).`,
    de: `"${productName}" ist derzeit in Ihrer Region (${countryName}) nicht verfügbar.`,
    fr: `"${productName}" n'est actuellement pas disponible dans votre région (${countryName}).`,
    it: `"${productName}" non è al momento disponibile nella vostra regione (${countryName}).`,
    en: `"${productName}" is currently unavailable in your region (${countryName}).`,
    ar: `"${productName}" غير متوفر حالياً في منطقتك (${countryName}).`
  };

  const language = countryConfig?.defaultLanguage || 'en';
  return messages[language] || messages.en;
}

function getUnavailableCTA(countryCode) {
  const countryConfig = getCountryConfig(countryCode);
  const language = countryConfig?.defaultLanguage || 'en';

  const ctas = {
    sr: { text: "Obavesti me kada bude dostupan", action: "notify" },
    'sr-Latn': { text: "Obavesti me kada bude dostupan", action: "notify" },
    bs: { text: "Obavijesti me kada bude dostupan", action: "notify" },
    hr: { text: "Obavijesti me kada bude dostupan", action: "notify" },
    mk: { text: "Известете ме кога ќе биде достапен", action: "notify" },
    sl: { text: "Obvestite me, ko bo na voljo", action: "notify" },
    de: { text: "Benachrichtigen, wenn verfügbar", action: "notify" },
    fr: { text: "Me notifier quand disponible", action: "notify" },
    it: { text: "Avvisami quando disponibile", action: "notify" },
    en: { text: "Notify me when available", action: "notify" },
    ar: { text: "أعلمني عند التوفر", action: "notify" }
  };

  return ctas[language] || ctas.en;
}

function getAlternativeProducts(product, countryCode, limit = 4) {
  // This would integrate with the styling engine to find similar products
  // For now, return empty array - would be populated by recommendation engine
  return [];
}

export function getAvailabilityMessage(product, countryCode = null) {
  const availability = checkProductAvailability(product, countryCode);

  if (availability.available) return null;

  return {
    type: 'unavailable',
    title: availability.message,
    cta: availability.cta,
    alternatives: availability.alternatives,
    productName: product.name,
    countryName: availability.countryName
  };
}

export function renderAvailabilityNotice(product, containerId = 'availability-notice', countryCode = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const availability = checkProductAvailability(product, countryCode);

  if (availability.available) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  const countryConfig = getCountryConfig(countryCode || getCurrentCountry());
  const language = countryConfig?.defaultLanguage || 'en';

  const labels = {
    sr: { alternatives: "Alternativni proizvodi", explore: "Istraži alternativne" },
    'sr-Latn': { alternatives: "Alternativni proizvodi", explore: "Istraži alternativne" },
    bs: { alternatives: "Alternativni proizvodi", explore: "Istraži alternativne" },
    hr: { alternatives: "Alternativni proizvodi", explore: "Istraži alternativne" },
    mk: { alternatives: "Алтернативни производи", explore: "Истражете алтернативи" },
    sl: { alternatives: "Alternativni izdelki", explore: "Raziskujte alternative" },
    de: { alternatives: "Alternative Produkte", explore: "Alternativen entdecken" },
    fr: { alternatives: "Produits alternatifs", explore: "Découvrir les alternatives" },
    it: { alternatives: "Prodotti alternativi", explore: "Scopri le alternative" },
    en: { alternatives: "Alternative Products", explore: "Explore Alternatives" },
    ar: { alternatives: "منتجات بديلة", explore: "استكشاف البدائل" }
  };

  const label = labels[language] || labels.en;

  let alternativesHtml = '';
  if (availability.alternatives.length > 0) {
    alternativesHtml = `
      <div class="availability-alternatives" style="margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--color-border);">
        <h4 style="font-size: var(--text-sm); font-weight: var(--font-semibold); margin-bottom: var(--space-3);">${escapeHtml(label.alternatives)}</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-3);">
          ${availability.alternatives.map(alt => `
            <a href="/product/${alt.slug}.html" class="alternative-product" style="text-decoration: none; color: inherit; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; display: block;">
              <div style="width: 100%; height: 140px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${alt.images && alt.images[0] ? `<img src="${alt.images[0]}" alt="${alt.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : '<span>👔</span>'}
              </div>
              <div style="padding: var(--space-2);">
                <div style="font-size: var(--text-xs); font-weight: var(--font-semibold); line-height: 1.3;">${escapeHtml(alt.name)}</div>
                <div style="font-size: var(--text-xs); font-weight: var(--font-semibold); color: var(--color-primary); margin-top: var(--space-1);">${formatPrice(alt.price)}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="availability-notice" style="
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      margin: var(--space-4) 0;
    ">
      <div style="display: flex; align-items: flex-start; gap: var(--space-4);">
        <div style="flex-shrink: 0; width: 40px; height: 40px; background: var(--color-warning-bg, #fef3c7); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--color-warning, #d97706);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <p style="font-size: var(--text-sm); color: var(--color-text); margin: 0 0 var(--space-3); line-height: 1.6;">
            ${escapeHtml(availability.message)}
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
            <button type="button" class="btn btn-outline btn-sm" data-action="notify-available" data-product-id="${product.id || product.sku}" style="
              padding: var(--space-2) var(--space-4);
              font-size: var(--text-sm);
            ">
              ${escapeHtml(availability.cta.text)}
            </button>
            <a href="/collections/${product.collection || 'all'}" class="btn btn-ghost btn-sm" style="
              padding: var(--space-2) var(--space-4);
              font-size: var(--text-sm);
            ">
              ${escapeHtml(labels[language]?.explore || labels.en.explore)}
            </a>
          </div>
        </div>
      </div>
      ${alternativesHtml}
    </div>
  `;

  container.style.display = 'block';

  // Bind notify button
  const notifyBtn = container.querySelector('[data-action="notify-available"]');
  if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
      // Integration with notification system
      window.showToast?.('Vi ćete biti obavešteni kada proizvod bude dostupan', 'info');
      // Track event
      if (window.OutfitAnalytics) {
        window.OutfitAnalytics.trackStyleMatchClick?.(product.id, product.id, 'unavailable-notify');
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function getRegionAwareContent(contentMap, countryCode = null) {
  const targetCountry = countryCode || getCurrentCountry();

  // Try exact match
  if (contentMap[targetCountry]) return contentMap[targetCountry];

  // Try region match
  const countryConfig = getCountryConfig(targetCountry);
  const region = countryConfig?.region;

  if (region && contentMap[region]) return contentMap[region];

  // Try priority match (balkan priority)
  const balkanCountries = ['RS', 'BA', 'ME', 'HR', 'MK', 'SI'];
  for (const bc of balkanCountries) {
    if (contentMap[bc]) return contentMap[bc];
  }

  // Fallback to default
  return contentMap.default || contentMap.RS || Object.values(contentMap)[0];
}

export function getRegionAwareHero(countryCode = null) {
  const targetCountry = countryCode || getCurrentCountry();
  const countryConfig = getCountryConfig(targetCountry);

  return {
    variant: countryConfig?.homepage?.heroVariant || 'default',
    campaignsEnabled: countryConfig?.homepage?.campaignsEnabled !== false,
    featuredCollections: countryConfig?.homepage?.featuredCollections || ['casual', 'elegance']
  };
}

export function getRegionAwareNavigation(countryCode = null) {
  const targetCountry = countryCode || getCurrentCountry();
  const countryConfig = getCountryConfig(targetCountry);

  return {
    collections: Object.entries(countryConfig?.collections || {})
      .filter(([_, config]) => config.enabled)
      .map(([id]) => id),
    featuredCollections: countryConfig?.homepage?.featuredCollections || ['casual', 'elegance']
  };
}

export function clearAvailabilityCache() {
  _availabilityCache.clear();
}

export default {
  checkProductAvailability,
  checkCollectionAvailability,
  getAvailabilityMessage,
  renderAvailabilityNotice,
  getRegionAwareContent,
  getRegionAwareHero,
  getRegionAwareNavigation,
  clearAvailabilityCache
};