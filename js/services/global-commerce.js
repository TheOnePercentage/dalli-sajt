/**
 * Global Commerce Engine Service
 * Core service for DALLI Global Commerce & Regional Expansion
 * Handles countries, currencies, shipping, payments, SEO, languages
 */

const COUNTRIES_DATA_URL = '/data/countries.json';
const CURRENCIES_DATA_URL = '/data/currencies.json';
const SHIPPING_DATA_URL = '/data/shipping.json';
const PAYMENTS_DATA_URL = '/data/payments.json';
const REGIONAL_SEO_URL = '/data/regional-seo.json';
const LANGUAGES_DATA_URL = '/data/languages.json';

let _countriesData = null;
let _currenciesData = null;
let _shippingData = null;
let _paymentsData = null;
let _regionalSeoData = null;
let _languagesData = null;
let _loadPromise = null;
let _currentCountry = null;
let _currentCurrency = null;
let _currentLanguage = null;

async function loadAllData() {
  if (_countriesData && _currenciesData && _shippingData && _paymentsData && _regionalSeoData && _languagesData) {
    return {
      countries: _countriesData,
      currencies: _currenciesData,
      shipping: _shippingData,
      payments: _paymentsData,
      regionalSeo: _regionalSeoData,
      languages: _languagesData
    };
  }

  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const [countriesRes, currenciesRes, shippingRes, paymentsRes, seoRes, languagesRes] = await Promise.all([
        fetch(COUNTRIES_DATA_URL),
        fetch(CURRENCIES_DATA_URL),
        fetch(SHIPPING_DATA_URL),
        fetch(PAYMENTS_DATA_URL),
        fetch(REGIONAL_SEO_URL),
        fetch(LANGUAGES_DATA_URL)
      ]);

      if (countriesRes.ok) _countriesData = await countriesRes.json();
      else _countriesData = { countries: { enabled: true, countries: {} } };

      if (currenciesRes.ok) _currenciesData = await currenciesRes.json();
      else _currenciesData = { currencies: { enabled: true, currencies: {} } };

      if (shippingRes.ok) _shippingData = await shippingRes.json();
      else _shippingData = { shipping: { enabled: true, carriers: {} } };

      if (paymentsRes.ok) _paymentsData = await paymentsRes.json();
      else _paymentsData = { payments: { enabled: true, methods: {} } };

      if (seoRes.ok) _regionalSeoData = await seoRes.json();
      else _regionalSeoData = { regionalSEO: { enabled: true, markets: {} } };

      if (languagesRes.ok) _languagesData = await languagesRes.json();
      else _languagesData = { languages: { enabled: true, supportedLanguages: {} } };
    } catch (err) {
      console.warn('[GlobalCommerce] Load failed:', err);
      _countriesData = _countriesData || { countries: { enabled: true, countries: {} } };
      _currenciesData = _currenciesData || { currencies: { enabled: true, currencies: {} } };
      _shippingData = _shippingData || { shipping: { enabled: true, carriers: {} } };
      _paymentsData = _paymentsData || { payments: { enabled: true, methods: {} } };
      _regionalSeoData = _regionalSeoData || { regionalSEO: { enabled: true, markets: {} } };
      _languagesData = _languagesData || { languages: { enabled: true, supportedLanguages: {} } };
    } finally {
      _loadPromise = null;
    }

    return {
      countries: _countriesData,
      currencies: _currenciesData,
      shipping: _shippingData,
      payments: _paymentsData,
      regionalSeo: _regionalSeoData,
      languages: _languagesData
    };
  })();

  return _loadPromise;
}

export function getCountryConfig(countryCode) {
  const countries = _countriesData?.countries?.countries || {};
  return countries[countryCode?.toUpperCase()];
}

export function getEnabledCountries() {
  const countries = _countriesData?.countries?.countries || {};
  return Object.values(countries).filter(c => c.enabled === true);
}

export function getBalkanPriorityCountries() {
  const priorityCodes = _countriesData?.countries?.balkanPriority || [];
  const countries = _countriesData?.countries?.countries || {};
  return priorityCodes.map(code => countries[code]).filter(Boolean);
}

export function getCurrencyConfig(currencyCode) {
  const currencies = _currenciesData?.currencies?.currencies || {};
  return currencies[currencyCode?.toUpperCase()];
}

export function getEnabledCurrencies() {
  const currencies = _currenciesData?.currencies?.currencies || {};
  return Object.values(currencies).filter(c => c.enabled === true);
}

export function getCurrencyForCountry(countryCode) {
  const country = getCountryConfig(countryCode);
  return country?.currency || _currenciesData?.currencies?.defaultCurrency || 'RSD';
}

export function getLanguageConfig(languageCode) {
  const languages = _languagesData?.languages?.supportedLanguages || {};
  return languages[languageCode];
}

export function getEnabledLanguages() {
  const languages = _languagesData?.languages?.supportedLanguages || {};
  return Object.values(languages).filter(l => l.enabled === true);
}

export function getLanguagesForCountry(countryCode) {
  const matrix = _languagesData?.languages?.countryLanguageMatrix || {};
  const codes = matrix[countryCode?.toUpperCase()] || [];
  return codes.map(code => getLanguageConfig(code)).filter(Boolean);
}

export function getDefaultLanguageForCountry(countryCode) {
  const country = getCountryConfig(countryCode);
  return country?.defaultLanguage || _languagesData?.languages?.defaultLanguage || 'en';
}

export function getCurrentCountry() {
  if (_currentCountry) return _currentCountry;

  // Try to determine from URL or localStorage
  if (typeof window !== 'undefined') {
    // Check subdomain
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    const knownCountries = Object.keys(_countriesData?.countries?.countries || {});
    if (knownCountries.includes(subdomain.toUpperCase())) {
      _currentCountry = subdomain.toUpperCase();
      return _currentCountry;
    }

    // Check path prefix
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const possibleCountry = pathParts[0].toUpperCase();
      if (knownCountries.includes(possibleCountry)) {
        _currentCountry = possibleCountry;
        return _currentCountry;
      }
    }

    // Check localStorage
    const stored = localStorage.getItem('dalli_country');
    if (stored && knownCountries.includes(stored.toUpperCase())) {
      _currentCountry = stored.toUpperCase();
      return _currentCountry;
    }
  }

  // Default to configured default
  _currentCountry = _countriesData?.countries?.defaultCountry || 'RS';
  return _currentCountry;
}

export function setCurrentCountry(countryCode) {
  const code = countryCode?.toUpperCase();
  const country = getCountryConfig(code);
  if (!country) return false;
  if (!country.enabled) return false;

  _currentCountry = code;
  _currentCurrency = country.currency;
  _currentLanguage = country.defaultLanguage;

  if (typeof window !== 'undefined') {
    localStorage.setItem('dalli_country', code);
    localStorage.setItem('dalli_currency', country.currency);
    localStorage.setItem('dalli_language', country.defaultLanguage);
  }

  return true;
}

export function getCurrentCurrency() {
  if (_currentCurrency) return _currentCurrency;

  const countryCode = getCurrentCountry();
  _currentCurrency = getCurrencyForCountry(countryCode);
  return _currentCurrency;
}

export function setCurrentCurrency(currencyCode) {
  const currency = getCurrencyConfig(currencyCode);
  if (!currency || !currency.enabled) return false;

  _currentCurrency = currencyCode;

  if (typeof window !== 'undefined') {
    localStorage.setItem('dalli_currency', currencyCode);
  }

  return true;
}

export function getCurrentLanguage() {
  if (_currentLanguage) return _currentLanguage;

  const countryCode = getCurrentCountry();
  _currentLanguage = getDefaultLanguageForCountry(countryCode);
  return _currentLanguage;
}

export function setCurrentLanguage(languageCode) {
  const language = getLanguageConfig(languageCode);
  if (!language || !language.enabled) return false;

  // Check if language is supported for current country
  const countryCode = getCurrentCountry();
  const supported = getLanguagesForCountry(countryCode).map(l => l.code);
  if (!supported.includes(languageCode)) return false;

  _currentLanguage = languageCode;

  if (typeof window !== 'undefined') {
    localStorage.setItem('dalli_language', languageCode);
  }

  return true;
}

export function formatPrice(amount, currencyCode = null, languageCode = null) {
  const currency = currencyCode ? getCurrencyConfig(currencyCode) : getCurrencyConfig(getCurrentCurrency());
  const language = languageCode ? getLanguageConfig(languageCode) : getLanguageConfig(getCurrentLanguage());

  if (!currency) return amount.toString();

  const { decimals, thousandsSeparator, decimalSeparator, format, formatNative, symbol, symbolNative } = currency;
  const useNative = language && language.script !== 'Latn';

  const formattedAmount = Number(amount).toLocaleString(language?.locale || 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true
  }).replace(',', decimalSeparator).replace('.', thousandsSeparator);

  const sym = useNative ? symbolNative : symbol;
  const fmt = useNative ? formatNative : format;

  return fmt.replace('{amount}', formattedAmount).replace('{symbol}', sym);
}

export function convertCurrency(amount, fromCurrency, toCurrency) {
  const fromConfig = getCurrencyConfig(fromCurrency);
  const toConfig = getCurrencyConfig(toCurrency);

  if (!fromConfig || !toConfig) return amount;

  // Convert to base (EUR) then to target
  const baseRate = fromConfig.exchangeRate?.rate || 1;
  const targetRate = toConfig.exchangeRate?.rate || 1;

  const inBase = amount / baseRate;
  return inBase * targetRate;
}

export function getShippingConfig(countryCode) {
  const country = getCountryConfig(countryCode);
  return country?.shipping;
}

export function getPaymentMethods(countryCode) {
  const methods = _paymentsData?.payments?.methods || {};
  const result = {};

  for (const [methodId, method] of Object.entries(methods)) {
    const countryConfig = method.countries?.[countryCode?.toUpperCase()];
    if (countryConfig?.enabled !== false && method.enabled) {
      result[methodId] = {
        ...method,
        countryConfig: countryConfig || {}
      };
    }
  }

  return result;
}

export function getShippingCarriers(countryCode) {
  const carriers = _shippingData?.shipping?.carriers || {};
  return Object.entries(carriers)
    .filter(([_, carrier]) => carrier.countries?.includes(countryCode?.toUpperCase()))
    .map(([id, carrier]) => ({ id, ...carrier }));
}

export function calculateShipping(countryCode, cartValue, deliveryType = 'standard') {
  const shipping = getShippingConfig(countryCode);
  if (!shipping || !shipping.enabled) return { available: false, cost: 0 };

  const freeThreshold = shipping.freeShippingThreshold || 0;
  if (cartValue >= freeThreshold) return { available: true, cost: 0, free: true };

  const costKey = deliveryType === 'express' ? 'expressCost' : 'standardCost';
  const cost = shipping[costKey] || shipping.standardCost || 0;

  return { available: true, cost, free: false };
}

export function getSEOConfig(countryCode) {
  const country = getCountryConfig(countryCode);
  return country?.seo || {};
}

export function getCanonicalURL(countryCode, path = '') {
  const country = getCountryConfig(countryCode);
  const base = country?.seo?.canonicalBase || `https://${countryCode.toLowerCase()}.dalli.rs`;
  return `${base}${path}`;
}

export function getHreflangTags(currentPath, currentCountryCode) {
  const enabledCountries = getEnabledCountries();
  const currentLang = getCurrentLanguage();

  return enabledCountries
    .filter(c => c.enabled)
    .map(country => {
      const lang = country.defaultLanguage;
      const hreflang = `${lang}-${country.code}`;
      const url = getCanonicalURL(country.code, currentPath);
      return { hreflang, url, lang: country.defaultLanguage };
    });
}

export function getOGConfig(countryCode) {
  const country = getCountryConfig(countryCode);
  return {
    locale: country?.seo?.ogLocale || 'sr_RS',
    localeAlternates: country?.seo?.ogLocaleAlternates || [],
    siteName: 'DALLI',
    type: 'website'
  };
}

export function getCountrySpecificContent(countryCode, contentType) {
  const country = getCountryConfig(countryCode);
  if (!country) return null;

  switch (contentType) {
    case 'homepage':
      return country.homepage || {};
    case 'collections':
      return country.collections || {};
    case 'legal':
      return country.legal || {};
    default:
      return null;
  }
}

export function isProductAvailableInCountry(product, countryCode) {
  if (!product) return true;

  const country = countryCode?.toUpperCase();
  const available = product.availableCountries || [];
  const restricted = product.restrictedCountries || [];
  const exclusive = product.exclusiveCountries || [];

  // If exclusive list exists, only those countries have access
  if (exclusive.length > 0) {
    return exclusive.includes(country);
  }

  // If restricted, check blacklist
  if (restricted.includes(country)) return false;

  // If available list exists, check whitelist
  if (available.length > 0) {
    return available.includes(country);
  }

  // Default: available everywhere
  return true;
}

export function getProductCountryPrice(product, countryCode) {
  if (!product) return null;

  const country = countryCode?.toUpperCase();
  const countryPricing = product.countryPricing || {};

  if (countryPricing[country]) {
    return {
      price: countryPricing[country].price,
      currency: countryPricing[country].currency,
      salePrice: countryPricing[country].salePrice,
      originalPrice: countryPricing[country].originalPrice
    };
  }

  // Fallback to base price with currency conversion
  const targetCurrency = getCurrencyForCountry(countryCode);
  const basePrice = product.price || 0;
  const baseCurrency = product.currency || 'RSD';

  if (baseCurrency === targetCurrency) {
    return { price: basePrice, currency: targetCurrency };
  }

  const converted = convertCurrency(basePrice, baseCurrency, targetCurrency);
  return { price: Math.round(converted), currency: targetCurrency };
}

export function getCollectionAvailability(countryCode, collectionId) {
  const country = getCountryConfig(countryCode);
  if (!country) return { enabled: false };

  const collections = country.collections || {};
  const collection = collections[collectionId];

  return {
    enabled: collection?.enabled !== false,
    visible: collection?.enabled !== false
  };
}

export async function initializeGlobalCommerce() {
  await loadAllData();

  // Auto-detect country
  if (typeof window !== 'undefined' && !_currentCountry) {
    getCurrentCountry(); // This will set _currentCountry
  }

  return {
    countries: _countriesData,
    currencies: _currenciesData,
    shipping: _shippingData,
    payments: _paymentsData,
    regionalSeo: _regionalSeoData,
    languages: _languagesData,
    currentCountry: _currentCountry,
    currentCurrency: _currentCurrency,
    currentLanguage: _currentLanguage
  };
}

export default {
  loadAllData,
  getCountryConfig,
  getEnabledCountries,
  getBalkanPriorityCountries,
  getCurrencyConfig,
  getEnabledCurrencies,
  getCurrencyForCountry,
  getLanguageConfig,
  getEnabledLanguages,
  getLanguagesForCountry,
  getDefaultLanguageForCountry,
  getCurrentCountry,
  setCurrentCountry,
  getCurrentCurrency,
  setCurrentCurrency,
  getCurrentLanguage,
  setCurrentLanguage,
  formatPrice,
  convertCurrency,
  getShippingConfig,
  getPaymentMethods,
  getShippingCarriers,
  calculateShipping,
  getSEOConfig,
  getCanonicalURL,
  getHreflangTags,
  getOGConfig,
  getCountrySpecificContent,
  isProductAvailableInCountry,
  getProductCountryPrice,
  getCollectionAvailability,
  initializeGlobalCommerce
};