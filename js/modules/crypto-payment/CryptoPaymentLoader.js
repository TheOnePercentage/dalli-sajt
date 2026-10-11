// @vite-ignore
// Crypto Payment Lazy Loader
// Handles dynamic loading of crypto payment modules only when needed.
// Zero bytes loaded on homepage/category pages.
// Loads only when user clicks "See It On You" button.

import { getCryptoDiscountRateSync } from '../../services/payment-incentives.js';

let _cryptoModuleCache = null;
let _cryptoLoadPromise = null;

/**
 * Load crypto payment model data from JSON
 */
async function loadCryptoPaymentModel() {
  if (_cryptoModuleCache) {
    return _cryptoModuleCache;
  }
  
  if (_cryptoLoadPromise) {
    return _cryptoLoadPromise;
  }
  
  _cryptoLoadPromise = (async () => {
    const response = await fetch('/data/crypto-payment-model.json');
    if (!response.ok) {
      throw new Error('Failed to load crypto payment model');
    }
    return await response.json();
  })();
  
  try {
    _cryptoModuleCache = await _cryptoLoadPromise;
    return _cryptoModuleCache;
  } catch (error) {
    _cryptoLoadPromise = null; // Allow retry
    throw error;
  }
}

/**
 * Check if crypto payments are supported/enabled
 */
export function isCryptoPaymentEnabled() {
  return loadCryptoPaymentModel().then(model => model.CRYPTO_PAYMENT_CONFIG?.enabled === true);
}

/**
 * Check if crypto payments are supported in current browser
 */
export function isCryptoPaymentSupported() {
  return (
    'createObjectURL' in URL &&
    'FileReader' in window &&
    'Blob' in window &&
    'OffscreenCanvas' in window && // For future canvas processing
    navigator.mediaDevices?.getUserMedia // For camera access
  );
}

/**
 * Check if a product is eligible for Virtual Try-On
 * @param {Object} product - Product object from CMS
 * @returns {boolean}
 */
export function isProductEligible(product) {
  return loadCryptoPaymentModel().then(model => {
    if (!product?.virtualTryOn?.eligible) return false;
    if (product.virtualTryOn?.status === 'disabled') return false;
    
    const globalConfig = model.CRYPTO_PAYMENT_CONFIG;
    if (!globalConfig?.enabled) return false;
    
    // Check if category is supported
    const supportedCategories = model.CRYPTO_PAYMENT_CONFIG?.supportedCategories || [];
    if (supportedCategories.length && !supportedCategories.includes(product.category)) {
      return false;
    }
    
    // Check if category is explicitly unsupported
    const unsupportedCategories = model.CRYPTO_PAYMENT_CONFIG?.unsupportedCategories || [];
    if (unsupportedCategories.includes(product.category)) {
      return false;
    }
    
    return product.virtualTryOn?.eligible === true;
  });
}

/**
 * Get crypto payment configuration from CMS
 */
export function getCryptoPaymentConfig() {
  return loadCryptoPaymentModel().then(model => model.CRYPTO_PAYMENT_CONFIG || { enabled: false });
}

/**
 * Get supported currencies from CMS config
 */
export function getSupportedCryptoCurrencies() {
  return loadCryptoPaymentModel().then(model => 
    model.CRYPTO_PAYMENT_CONFIG?.supportedCategories || []
  );
}

/**
 * Get crypto currency by ID
 */
export function getCryptoCurrencyById(id) {
  return loadCryptoPaymentModel().then(model => 
    model.SUPPORTED_CRYPTO_CURRENCIES?.find(c => c.id === id)
  );
}

/**
 * Get payment methods from CMS config
 */
export function getPaymentMethods() {
  return loadCryptoPaymentModel().then(model => model.PAYMENT_METHODS || []);
}

/**
 * Get enabled payment methods
 */
export function getEnabledPaymentMethods() {
  return loadCryptoPaymentModel().then(model => 
    (model.PAYMENT_METHODS || []).filter(m => m.enabled)
  );
}

/**
 * Get payment method by ID
 */
export function getPaymentMethodById(id) {
  return loadCryptoPaymentModel().then(model => 
    (model.PAYMENT_METHODS || []).find(m => m.id === id)
  );
}

/**
 * Get crypto payment method config
 */
export function getCryptoPaymentMethod() {
  return loadCryptoPaymentModel().then(model => model.CRYPTO_PAYMENT_METHOD || null);
}

/**
 * Get active crypto config
 */
export function getActiveCryptoConfig() {
  return loadCryptoPaymentModel().then(model => model.CRYPTO_PAYMENT_CONFIG || {});
}

/**
 * Get crypto order schema
 */
export function getCryptoOrderSchema() {
  return loadCryptoPaymentModel().then(model => model.CRYPTO_ORDER_SCHEMA || {});
}

/**
 * Get crypto order statuses
 */
export function getCryptoOrderStatuses() {
  return loadCryptoPaymentModel().then(model => model.CRYPTO_ORDER_STATUS || {});
}

/**
 * Check if crypto order status is final
 */
export function isCryptoOrderFinal(status) {
  return loadCryptoPaymentModel().then(model => 
    model.CRYPTO_ORDER_STATUS && 
    ['confirmed', 'failed', 'expired', 'refunded'].includes(status)
  );
}

/**
 * Check if crypto order can be retried
 */
export function canRetryCryptoOrder(status) {
  return loadCryptoPaymentModel().then(model => 
    model.CRYPTO_ORDER_STATUS && ['failed', 'expired'].includes(status)
  );
}

/**
 * Get admin panel order display fields for crypto
 */
export function getAdminCryptoOrderFields() {
  return loadCryptoPaymentModel().then(model => model.ADMIN_CRYPTO_ORDER_FIELDS || []);
}

/**
 * Get crypto payment errors
 */
export function getCryptoPaymentErrors() {
  return loadCryptoPaymentModel().then(model => model.CRYPTO_PAYMENT_ERRORS || {});
}

/**
 * Get crypto payment error message
 */
export function getCryptoPaymentErrorMessage(errorCode) {
  return loadCryptoPaymentModel().then(model => {
    const error = model.CRYPTO_PAYMENT_ERRORS?.[errorCode];
    return error ? error.message : 'Došlo je do greške. Pokušajte ponovo.';
  });
}

/**
 * Calculate crypto discount
 */
export function calculateCryptoDiscount(subtotal, discountRate) {
  return loadCryptoPaymentModel().then(() => {
    const rate = discountRate ?? getCryptoDiscountRateSync();
    return Math.round(subtotal * rate);
  });
}

/**
 * Calculate crypto amount from RSD
 */
export function calculateCryptoAmount(amountRSD, exchangeRate) {
  return loadCryptoPaymentModel().then(() => amountRSD / exchangeRate);
}

/**
 * Calculate RSD amount from crypto
 */
export function calculateRSDAmount(amountCrypto, exchangeRate) {
  return loadCryptoPaymentModel().then(() => Math.round(amountCrypto * exchangeRate));
}

/**
 * Preload crypto payment module (call on checkout page load)
 * Use this to warm up the cache before user clicks "See It On You"
 */
export function preloadCryptoPaymentModule() {
  if (!_cryptoLoadPromise && !_cryptoModuleCache) {
    _cryptoLoadPromise = (async () => {
      const response = await fetch('/data/crypto-payment-model.json');
      if (!response.ok) {
        throw new Error('Failed to load crypto payment model');
      }
      return await response.json();
    })();
    // Don't await - fire and forget for preloading
  }
  return _cryptoLoadPromise;
}

/**
 * Create crypto payment instance for checkout
 * Main entry point for the application
 * 
 * @param {Object} orderData - Order data from checkout
 * @param {Object} orderData.totals - Order totals
 * @param {string} orderData.orderNumber
 * @param {Array} orderData.items
 * @param {Object} orderData.customer
 * @returns {Promise} Payment instance
 */
export async function createCryptoPayment(orderData) {
  const model = await loadCryptoPaymentModel();
  const { createCryptoPayment } = await import('./CryptoPaymentCore.js');
  return createCryptoPayment(orderData);
}

/**
 * Open crypto payment flow for an order
 * Handles full flow: create -> open -> handle result
 * 
 * @param {Object} orderData - Order data from checkout
 * @returns {Promise} Result { success, orderNumber, paymentId }
 */
export async function openCryptoPayment(orderData) {
  const cryptoPayment = await createCryptoPayment(orderData);
  const result = await cryptoPayment.open();
  return result;
}

/**
 * Preload on checkout page - call when user reaches payment step
 */
export function registerCheckoutForCrypto(orderData) {
  if (!isCryptoPaymentEnabled()) return;
  
  // Preload module
  preloadCryptoPaymentModule();
  
  // Setup button listeners
  document.querySelectorAll('[data-action="virtual-tryon"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await openCryptoPayment(orderData);
      } catch (error) {
        console.error('[CryptoPayment] Error:', error);
        window.showToast?.(`Virtual Try-On nije dostupan: ${error.message}`, 'error');
      }
    });
  });
  
  console.log('[CryptoPayment] Product page registered for Virtual Try-On:', orderData.slug);
}

/**
 * Get module load status
 */
export function getCryptoPaymentLoadStatus() {
  if (_cryptoModuleCache) return 'loaded';
  if (_cryptoLoadPromise) return 'loading';
  return 'idle';
}

/**
 * Clear module cache (for testing or re-init)
 */
export function clearCryptoPaymentCache() {
  _cryptoModuleCache = null;
  _cryptoLoadPromise = null;
}

export default {
  loadCryptoPaymentModel,
  createCryptoPayment,
  openCryptoPayment,
  preloadCryptoPaymentModule,
  isProductEligible,
  isCryptoPaymentEnabled,
  isCryptoPaymentSupported,
  clearCryptoPaymentCache,
  getCryptoPaymentLoadStatus,
  registerCheckoutForCrypto
};