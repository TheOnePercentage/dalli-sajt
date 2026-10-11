/**
 * Payment Incentives Service
 * Dynamic source of truth for crypto and payment incentives
 * Supports global, country, collection, and product level overrides
 */

const PAYMENT_INCENTIVES_URL = '/data/payment-incentives.json';
let _cache = null;
let _lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchIncentives() {
  const now = Date.now();
  if (_cache && now - _lastFetch < CACHE_TTL) {
    return _cache;
  }
  try {
    const res = await fetch(PAYMENT_INCENTIVES_URL, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      _cache = data;
      _lastFetch = now;
      return data;
    }
  } catch (e) {
    console.warn('[PaymentIncentives] Failed to fetch:', e);
  }
  return getDefaults();
}

function getDefaults() {
  return {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    global: {
      cryptoEnabled: true,
      cryptoDiscountEnabled: true,
      discountType: 'percentage',
      discountValue: 15,
      customMessage: '15% popust kripto',
      customMessageEn: '15% crypto discount',
      appliesTo: 'subtotal'
    },
    countryOverrides: {},
    collectionOverrides: {},
    productOverrides: {}
  };
}

export async function getPaymentIncentives() {
  return await fetchIncentives();
}

export async function getCryptoDiscountConfig(countryCode = null, collectionId = null, productId = null) {
  const incentives = await fetchIncentives();
  let config = { ...incentives.global };
  
  if (countryCode && incentives.countryOverrides && incentives.countryOverrides[countryCode]) {
    config = { ...config, ...incentives.countryOverrides[countryCode] };
  }
  if (collectionId && incentives.collectionOverrides && incentives.collectionOverrides[collectionId]) {
    config = { ...config, ...incentives.collectionOverrides[collectionId] };
  }
  if (productId && incentives.productOverrides && incentives.productOverrides[productId]) {
    config = { ...config, ...incentives.productOverrides[productId] };
  }
  
  return config;
}

export async function getCryptoDiscountRate(countryCode = null, collectionId = null, productId = null) {
  const cfg = await getCryptoDiscountConfig(countryCode, collectionId, productId);
  if (!cfg.cryptoDiscountEnabled) return 0;
  if (cfg.discountType === 'percentage') {
    return (cfg.discountValue || 0) / 100;
  }
  return 0;
}

export async function getCryptoDiscountValue(countryCode = null, collectionId = null, productId = null) {
  const cfg = await getCryptoDiscountConfig(countryCode, collectionId, productId);
  if (!cfg.cryptoDiscountEnabled) return 0;
  return cfg.discountValue || 0;
}

export async function getCryptoDiscountMessage(countryCode = null, collectionId = null, productId = null, lang = 'sr') {
  const cfg = await getCryptoDiscountConfig(countryCode, collectionId, productId);
  if (!cfg.cryptoDiscountEnabled) return '';
  if (lang === 'en' && cfg.customMessageEn) return cfg.customMessageEn;
  return cfg.customMessage || `${cfg.discountValue}% crypto discount`;
}

export async function isCryptoEnabled(countryCode = null, collectionId = null, productId = null) {
  const cfg = await getCryptoDiscountConfig(countryCode, collectionId, productId);
  return cfg.cryptoEnabled !== false;
}

export function clearCache() {
  _cache = null;
  _lastFetch = 0;
}

/**
 * Synchronous client-side reader for the owner-configured payment incentives.
 * Resolution order (no network, never throws):
 *   1. `#dalli-experience-data` island (server-injected public config)
 *   2. localStorage `dalli_experience_config` (local-first Experience Center)
 *   3. last fetched server cache
 *   4. built-in defaults
 */
function readClientIncentives() {
  try {
    if (typeof document !== 'undefined') {
      const island = document.getElementById('dalli-experience-data');
      if (island && island.textContent) {
        const data = JSON.parse(island.textContent);
        if (data && data.paymentIncentives) return data.paymentIncentives;
      }
    }
  } catch (e) {
    /* ignore malformed island */
  }
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem('dalli_experience_config') : null;
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg && cfg.paymentIncentives) return cfg.paymentIncentives;
    }
  } catch (e) {
    /* ignore malformed local config */
  }
  return null;
}

function resolveGlobalIncentives(countryCode, collectionId, productId) {
  const inc = readClientIncentives();
  let g = (inc && inc.global) || (_cache && _cache.global) || getDefaults().global;
  if (inc) {
    if (countryCode && inc.countryOverrides && inc.countryOverrides[countryCode]) {
      g = { ...g, ...inc.countryOverrides[countryCode] };
    }
    if (collectionId && inc.collectionOverrides && inc.collectionOverrides[collectionId]) {
      g = { ...g, ...inc.collectionOverrides[collectionId] };
    }
    if (productId && inc.productOverrides && inc.productOverrides[productId]) {
      g = { ...g, ...inc.productOverrides[productId] };
    }
  }
  return g;
}

/**
 * Synchronous crypto discount rate (0..1). Safe to call from render code.
 */
export function getCryptoDiscountRateSync(countryCode = null, collectionId = null, productId = null) {
  const g = resolveGlobalIncentives(countryCode, collectionId, productId);
  if (g.cryptoDiscountEnabled === false) return 0;
  if (g.discountType === 'percentage') return (g.discountValue || 0) / 100;
  return 0;
}

/** Synchronous enabled flag. */
export function isCryptoEnabledSync() {
  const g = resolveGlobalIncentives(null, null, null);
  return g.cryptoEnabled !== false;
}

/**
 * Kick off a background fetch so server-synced incentives are cached for
 * later synchronous reads. Safe to call multiple times (deduplicated).
 * Dispatches `payment-incentives:updated` on the window when new data arrives.
 */
let _preloadPromise = null;
export function preloadPaymentIncentives() {
  if (_preloadPromise) return _preloadPromise;
  _preloadPromise = fetchIncentives()
    .then(data => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('payment-incentives:updated', {
            detail: { rate: getCryptoDiscountRateSync(), enabled: isCryptoEnabledSync() },
          })
        );
      }
      return data;
    })
    .catch(() => _cache);
  return _preloadPromise;
}
