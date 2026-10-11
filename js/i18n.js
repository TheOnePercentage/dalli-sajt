/**
 * DALLI Internationalization Core Module
 * 
 * Handles multi-country, multi-currency, multi-language support
 * with fallback chains and runtime country switching.
 */

(function() {
  'use strict';

  // ============================================
  // State Management
  // ============================================
  
  let currentCountry = null;
  let currentLanguage = null;
  let currentCurrency = null;
  let currentMarket = null;
  let exchangeRates = {};
  let translations = {};
  let isInitialized = false;
  let countryChangeCallbacks = [];

  // ============================================
  // Configuration Access
  // ============================================
  
  function getCountriesConfig() {
    return window.DALLI_COUNTRIES || {};
  }

  function getCountryConfig(code) {
    const config = getCountriesConfig();
    return config.getCountry ? config.getCountry(code) : null;
  }

  function getActiveCountries() {
    const config = getCountriesConfig();
    return config.getActiveCountries ? config.getActiveCountries() : [];
  }

  function getCountryWithFallback(code, path) {
    const config = getCountriesConfig();
    return config.getCountryWithFallback ? config.getCountryWithFallback(code, path) : null;
  }

  // ============================================
  // Initialization
  // ============================================
  
  async function initI18n(options = {}) {
    if (isInitialized) return { country: currentCountry, language: currentLanguage, currency: currentCurrency };
    
    const optionsDefaults = {
      defaultCountry: 'RS',
      detectFromBrowser: true,
      detectFromIP: false,
      persistSelection: true,
      loadTranslations: true,
      loadExchangeRates: true,
    };
    
    const opts = { ...optionsDefaults, ...options };
    
    try {
      // 1. Determine initial country
      let countryCode = opts.defaultCountry;
      
      if (opts.persistSelection) {
        const saved = localStorage.getItem('dalli_country');
        if (saved && getCountryConfig(saved)) {
          countryCode = saved;
        }
      }
      
      if (opts.detectFromBrowser && countryCode === opts.defaultCountry) {
        const browserCountry = detectCountryFromBrowser();
        if (browserCountry && getCountryConfig(browserCountry)) {
          countryCode = browserCountry;
        }
      }
      
      // Validate country is active
      const countryConfig = getCountryConfig(countryCode);
      if (!countryConfig || !countryConfig.active) {
        countryCode = opts.defaultCountry;
      }
      
      // 2. Set country
      await setCountry(countryCode, { persist: opts.persistSelection });
      
      // 3. Load translations
      if (opts.loadTranslations) {
        await loadTranslations(currentLanguage);
      }
      
      // 4. Load exchange rates
      if (opts.loadExchangeRates) {
        await loadExchangeRates();
      }
      
      isInitialized = true;
      
      return { country: currentCountry, language: currentLanguage, currency: currentCurrency };
    } catch (error) {
      console.error('[I18n] Initialization failed:', error);
      // Fallback to defaults
      await setCountry('RS');
      return { country: 'RS', language: 'sr', currency: 'RSD' };
    }
  }

  // ============================================
  // Country Management
  // ============================================
  
  async function setCountry(code, options = {}) {
    const upperCode = code.toUpperCase();
    const countryConfig = getCountryConfig(upperCode);
    
    if (!countryConfig) {
      throw new Error(`Country ${upperCode} not configured`);
    }
    
    if (!countryConfig.active) {
      throw new Error(`Country ${upperCode} is not active`);
    }
    
    const previousCountry = currentCountry;
    currentCountry = upperCode;
    
    // Set language from country config
    currentLanguage = countryConfig.language?.code || 'en';
    currentCurrency = countryConfig.currency?.code || 'EUR';
    
    // Determine market
    const markets = getCountriesConfig().MARKETS || {};
    for (const [key, market] of Object.entries(markets)) {
      if (market.countries.includes(upperCode)) {
        currentMarket = market.code;
        break;
      }
    }
    
    // Persist
    if (options.persist !== false) {
      localStorage.setItem('dalli_country', upperCode);
      localStorage.setItem('dalli_language', currentLanguage);
      localStorage.setItem('dalli_currency', currentCurrency);
      localStorage.setItem('dalli_market', currentMarket);
    }
    
    // Update document attributes
    document.documentElement.lang = currentLanguage;
    document.documentElement.setAttribute('data-country', upperCode);
    document.documentElement.setAttribute('data-currency', currentCurrency);
    document.documentElement.setAttribute('data-market', currentMarket);
    
    // Update meta tags
    updateMetaTags();
    
    // Notify callbacks
    countryChangeCallbacks.forEach(cb => {
      try { cb({ country: upperCode, language: currentLanguage, currency: currentCurrency, previousCountry }); }
      catch (e) { console.error('[I18n] Country change callback error:', e); }
    });
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('dalli:countrychange', {
      detail: { country: upperCode, language: currentLanguage, currency: currentCurrency, previousCountry }
    }));
    
    console.log(`[I18n] Country changed to ${upperCode} (${currentLanguage}/${currentCurrency})`);
    
    return { country: upperCode, language: currentLanguage, currency: currentCurrency };
  }

  function getCurrentCountry() {
    return currentCountry;
  }

  function getCurrentLanguage() {
    return currentLanguage;
  }

  function getCurrentCurrency() {
    return currentCurrency;
  }

  function getCurrentMarket() {
    return currentMarket;
  }

  function getCountryConfig(code) {
    return getCountryConfig(code);
  }

  // ============================================
  // Language & Translations
  // ============================================
  
  async function loadTranslations(langCode) {
    const language = langCode || currentLanguage;
    
    try {
      // Try to load from local files first
      const response = await fetch(`/locales/${language}.json`);
      if (response.ok) {
        translations[language] = await response.json();
        console.log(`[I18n] Loaded translations for ${language}`);
        return translations[language];
      }
    } catch (e) {
      console.warn(`[I18n] Could not load translations for ${language}:`, e.message);
    }
    
    // Fallback to inline translations
    if (!translations[language]) {
      translations[language] = getInlineTranslations(language);
    }
    
    return translations[language];
  }

  function getInlineTranslations(lang) {
    // Inline fallback translations for critical UI
    const fallbacks = {
      sr: {
        'common.loading': 'Učitavanje...',
        'common.error': 'Greška',
        'common.success': 'Uspešno',
        'common.save': 'Sačuvaj',
        'common.cancel': 'Otkaži',
        'common.delete': 'Obriši',
        'common.edit': 'Izmeni',
        'common.add': 'Dodaj',
        'common.search': 'Pretraga',
        'common.filter': 'Filter',
        'common.sort': 'Sortiraj',
        'cart.title': 'Korpa',
        'cart.empty': 'Korpa je prazna',
        'cart.total': 'Ukupno',
        'cart.checkout': 'Na kasu',
        'product.add_to_cart': 'Dodaj u korpu',
        'product.out_of_stock': 'Nema na stanju',
        'checkout.title': 'Naplata',
        'checkout.shipping': 'Dostava',
        'checkout.payment': 'Plaćanje',
        'checkout.confirm': 'Potvrdi porudžbinu',
        'country.select': 'Izaberite zemlju',
        'currency.select': 'Izaberite valutu',
        'language.select': 'Izaberite jezik',
      },
      en: {
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.add': 'Add',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.sort': 'Sort',
        'cart.title': 'Cart',
        'cart.empty': 'Cart is empty',
        'cart.total': 'Total',
        'cart.checkout': 'Checkout',
        'product.add_to_cart': 'Add to cart',
        'product.out_of_stock': 'Out of stock',
        'checkout.title': 'Checkout',
        'checkout.shipping': 'Shipping',
        'checkout.payment': 'Payment',
        'checkout.confirm': 'Confirm order',
        'country.select': 'Select country',
        'currency.select': 'Select currency',
        'language.select': 'Select language',
      },
      de: {
        'common.loading': 'Laden...',
        'common.error': 'Fehler',
        'common.success': 'Erfolg',
        'common.save': 'Speichern',
        'common.cancel': 'Abbrechen',
        'common.delete': 'Löschen',
        'common.edit': 'Bearbeiten',
        'common.add': 'Hinzufügen',
        'common.search': 'Suchen',
        'common.filter': 'Filter',
        'common.sort': 'Sortieren',
        'cart.title': 'Warenkorb',
        'cart.empty': 'Warenkorb ist leer',
        'cart.total': 'Gesamt',
        'cart.checkout': 'Zur Kasse',
        'product.add_to_cart': 'In den Warenkorb',
        'product.out_of_stock': 'Nicht verfügbar',
        'checkout.title': 'Kasse',
        'checkout.shipping': 'Versand',
        'checkout.payment': 'Zahlung',
        'checkout.confirm': 'Bestellung bestätigen',
      },
    };
    
    return fallbacks[lang] || fallbacks.en;
  }

  function t(key, params = {}) {
    const lang = currentLanguage || 'en';
    const dict = translations[lang] || translations.en || getInlineTranslations('en');
    let text = dict[key] || key;
    
    // Simple parameter interpolation: {param}
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
    
    return text;
  }

  function setLanguage(code) {
    const upperCode = code.toLowerCase();
    const countryConfig = getCountryConfig(currentCountry);
    
    if (countryConfig?.language?.fallback?.includes(upperCode)) {
      currentLanguage = upperCode;
      localStorage.setItem('dalli_language', upperCode);
      document.documentElement.lang = upperCode;
      
      // Reload translations
      loadTranslations(upperCode);
      
      window.dispatchEvent(new CustomEvent('dalli:languagechange', {
        detail: { language: upperCode }
      }));
      
      return true;
    }
    return false;
  }

  // ============================================
  // Currency & Exchange Rates
  // ============================================
  
  async function loadExchangeRates() {
    try {
      // Try to load from API (in production, use a real service)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      if (response.ok) {
        const data = await response.json();
        exchangeRates = data.rates || {};
        exchangeRates.EUR = 1.0;
        exchangeRates.lastUpdated = new Date().toISOString();
        localStorage.setItem('dalli_exchange_rates', JSON.stringify(exchangeRates));
        console.log('[I18n] Exchange rates loaded:', Object.keys(exchangeRates).length, 'currencies');
        return exchangeRates;
      }
    } catch (e) {
      console.warn('[I18n] Could not load exchange rates:', e.message);
    }
    
    // Fallback to cached
    try {
      const cached = localStorage.getItem('dalli_exchange_rates');
      if (cached) {
        exchangeRates = JSON.parse(cached);
        return exchangeRates;
      }
    } catch (e) {}
    
    // Hardcoded fallbacks
    exchangeRates = {
      EUR: 1.0,
      RSD: 117.5,
      USD: 1.08,
      GBP: 0.86,
      CHF: 0.96,
      BAM: 1.95583,
      lastUpdated: new Date().toISOString(),
    };
    
    return exchangeRates;
  }

  function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    const rates = exchangeRates;
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    
    // Convert to EUR first, then to target
    const eurAmount = amount / fromRate;
    return eurAmount * toRate;
  }

  function formatCurrency(amount, currencyCode = null) {
    const currency = currencyCode || currentCurrency;
    const countryConfig = getCountryConfig(currentCountry);
    const currencyConfig = countryConfig?.currency || { code: currency, symbol: currency, decimals: 2, format: '{symbol}{amount}' };
    
    const decimals = currencyConfig.decimals ?? 2;
    const formattedAmount = Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    
    return currencyConfig.format
      .replace('{amount}', formattedAmount)
      .replace('{symbol}', currencyConfig.symbol);
  }

  function getExchangeRate(from, to) {
    const rates = exchangeRates;
    if (!rates[from] || !rates[to]) return null;
    return rates[to] / rates[from];
  }

  // ============================================
  // Price Engine (Country-specific pricing)
  // ============================================
  
  function calculatePrice(basePrice, options = {}) {
    const countryConfig = getCountryConfig(currentCountry);
    const pricingConfig = countryConfig?.pricing || { ppvMultiplier: 1.0, rounding: { method: 'round', precision: 0 } };
    const priceList = options.priceList || 'retail';
    const quantity = options.quantity || 1;
    
    let price = basePrice * (pricingConfig.ppvMultiplier || 1.0);
    
    // Apply price list multiplier
    const priceLists = countryConfig?.pricing?.priceLists || {};
    const listConfig = priceLists[priceList];
    if (listConfig?.multiplier) {
      price *= listConfig.multiplier;
    }
    
    // Check minimum quantity
    if (listConfig?.minQty && quantity < listConfig.minQty) {
      // Fallback to retail
      const retailConfig = priceLists.retail;
      if (retailConfig?.multiplier) {
        price = basePrice * retailConfig.multiplier;
      }
    }
    
    // Quantity discounts
    if (options.quantityBreaks) {
      for (const breakPoint of options.quantityBreaks.sort((a, b) => b.qty - a.qty)) {
        if (quantity >= breakPoint.qty) {
          price *= (1 - (breakPoint.discount || 0));
          break;
        }
      }
    }
    
    // Apply rounding
    const rounding = pricingConfig.rounding || { method: 'round', precision: 0 };
    const precision = rounding.precision || 0;
    const multiplier = Math.pow(10, precision);
    
    let rounded;
    switch (rounding.method) {
      case 'floor': rounded = Math.floor(price * multiplier) / multiplier; break;
      case 'ceil': rounded = Math.ceil(price * multiplier) / multiplier; break;
      default: rounded = Math.round(price * multiplier) / multiplier;
    }
    
    return Math.max(0, rounded);
  }

  function getPriceListConfig(priceList) {
    const countryConfig = getCountryConfig(currentCountry);
    return countryConfig?.pricing?.priceLists?.[priceList] || null;
  }

  // ============================================
  // Tax Engine
  // ============================================
  
  function calculateTax(amount, options = {}) {
    const countryConfig = getCountryConfig(currentCountry);
    const taxConfig = countryConfig?.tax || { vatRate: 0.20 };
    
    let rate = taxConfig.vatRate || 0.20;
    
    // Check for reduced rate
    if (options.reduced) {
      rate = taxConfig.reducedVatRate || taxConfig.vatRate;
    } else if (options.superReduced) {
      rate = taxConfig.superReducedVatRate || taxConfig.reducedVatRate || taxConfig.vatRate;
    }
    
    // Check for zero-rate (exports, etc.)
    if (options.zeroRated || options.export) {
      rate = 0;
    }
    
    // Reverse charge
    if (options.reverseCharge) {
      rate = 0; // Buyer accounts for VAT
    }
    
    const vatAmount = amount * rate;
    return {
      net: amount,
      vatRate: rate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      gross: amount + vatAmount,
      isReverseCharge: !!options.reverseCharge,
    };
  }

  function validateVATNumber(vatNumber) {
    const countryConfig = getCountryConfig(currentCountry);
    const pattern = countryConfig?.tax?.vatNumberFormat;
    if (!pattern) return { valid: false, reason: 'No pattern for country' };
    
    const regex = new RegExp(pattern);
    return { valid: regex.test(vatNumber), format: pattern };
  }

  // ============================================
  // Shipping Engine
  // ============================================
  
  function calculateShipping(cartTotal, postalCode, options = {}) {
    const countryConfig = getCountryConfig(currentCountry);
    const shippingConfig = countryConfig?.shipping || {};
    const zones = shippingConfig.zones || [];
    
    // Find matching zone
    let zone = null;
    if (postalCode) {
      zone = zones.find(z => 
        z.postalCodes?.some(pc => {
          if (pc.endsWith('*')) {
            return postalCode.startsWith(pc.slice(0, -1));
          }
          return postalCode === pc;
        })
      );
    }
    
    if (!zone) {
      zone = zones.find(z => z.id === shippingConfig.defaultZone) || zones[0];
    }
    
    if (!zone) {
      return { cost: 0, freeShipping: true, estimatedDays: 'N/A', zone: null };
    }
    
    const freeThreshold = options.freeThreshold ?? shippingConfig.freeShippingThreshold ?? zone.freeThreshold ?? 0;
    const isFree = cartTotal >= freeThreshold;
    
    return {
      cost: isFree ? 0 : (zone.cost || 0),
      freeShipping: isFree,
      freeThreshold,
      estimatedDays: zone.estimatedDays || '3-5',
      zone: zone.name,
      zoneId: zone.id,
      expressAvailable: shippingConfig.expressAvailable,
      expressCost: shippingConfig.expressCost,
      expressDays: shippingConfig.expressDays,
    };
  }

  function getShippingZones() {
    const countryConfig = getCountryConfig(currentCountry);
    return countryConfig?.shipping?.zones || [];
  }

  // ============================================
  // Promotions Engine
  // ============================================
  
  function validatePromoCode(code, cartTotal, cartItems = []) {
    const countryConfig = getCountryConfig(currentCountry);
    const promoConfig = countryConfig?.promotions || {};
    
    // Validate format
    const couponRegex = new RegExp(promoConfig.couponFormat || '^[A-Z0-9]{6,12}$');
    if (!couponRegex.test(code)) {
      return { valid: false, reason: 'Invalid format' };
    }
    
    // Check seasonal campaigns
    const now = new Date();
    const activeCampaign = countryConfig?.promotions?.seasonalCampaigns?.find(c => {
      const start = new Date(`${now.getFullYear()}-${c.start}`);
      const end = new Date(`${now.getFullYear()}-${c.end}`);
      return now >= start && now <= end;
    });
    
    return {
      valid: true,
      code,
      campaign: activeCampaign,
      maxDiscount: promoConfig.maxDiscountPercent || 70,
      stackable: promoConfig.stackable || false,
    };
  }

  function applyPromotion(cartTotal, code, cartItems = []) {
    const validation = validatePromoCode(code, cartTotal, cartItems);
    if (!validation.valid) return { discount: 0, valid: false, reason: validation.reason };
    
    const countryConfig = getCountryConfig(currentCountry);
    const promoConfig = countryConfig?.promotions || {};
    
    // In production, look up code in database
    // For now, implement common promotion types based on code patterns
    let discount = 0;
    let message = 'Promotion applied';
    let discountType = 'percentage';
    
    // Parse code patterns for common promotions
    // PERCENT_XX -> percentage discount
    // FIXED_XX -> fixed amount discount  
    // FREESHIP -> free shipping
    // BOGO -> buy one get one
    
    const upperCode = code.toUpperCase();
    
    if (upperCode.startsWith('PERCENT_')) {
      const percent = parseInt(upperCode.replace('PERCENT_', ''));
      if (!isNaN(percent) && percent > 0 && percent <= (promoConfig.maxDiscountPercent || 70)) {
        discount = cartTotal * (percent / 100);
        discountType = 'percentage';
        message = `${percent}% popust primenjen`;
      }
    } else if (upperCode.startsWith('FIXED_')) {
      const amount = parseInt(upperCode.replace('FIXED_', ''));
      if (!isNaN(amount) && amount > 0 && amount <= cartTotal) {
        discount = Math.min(amount, cartTotal);
        discountType = 'fixed';
        message = `Fiksni popust od ${formatCurrency(amount)} primenjen`;
      }
    } else if (upperCode === 'FREESHIP' || upperCode.startsWith('FREE_SHIP')) {
      discountType = 'free_shipping';
      message = 'Besplatna dostava primenjena';
    } else if (upperCode === 'BOGO' || upperCode.startsWith('BOGO_')) {
      discountType = 'bogo';
      message = 'Akcija 1+1 primenjena';
    } else if (upperCode.startsWith('SEASON_')) {
      // Seasonal campaign code
      discountType = 'seasonal';
      message = 'Sezonska akcija primenjena';
    } else {
      // Unknown code - check if it matches active seasonal campaign
      if (validation.campaign) {
        discountType = 'seasonal';
        message = `Sezonska akcija "${validation.campaign.name}" primenjena`;
      }
    }
    
    // Cap discount at max allowed
    const maxDiscount = cartTotal * ((promoConfig.maxDiscountPercent || 70) / 100);
    if (discount > maxDiscount) {
      discount = maxDiscount;
    }
    
    return {
      discount: Math.max(0, Math.round(discount * 100) / 100),
      valid: discount > 0,
      code,
      discountType,
      message,
      maxDiscountAllowed: maxDiscount,
    };
  }

// ============================================
  // URL & SEO Helpers
  // ============================================
  
  function getLocalizedUrl(path, options = {}) {
    const countryCode = options.country || currentCountry;
    const lang = options.lang || currentLanguage;
    const countryConfig = getCountryConfig(countryCode);
    
    const baseUrl = countryConfig?.seo?.canonicalBase || `https://dalli.${countryCode.toLowerCase()}`;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    
    // Language prefix for non-default languages
    const defaultLang = countryConfig?.language?.code || 'en';
    const langPrefix = lang !== defaultLang ? `/${lang}` : '';
    
    return `${baseUrl}${langPrefix}${cleanPath}`;
  }
  
  function getHreflangTags(path = '/') {
    const countries = getActiveCountries();
    const tags = [];
    
    countries.forEach(country => {
      const lang = country.language?.code || 'en';
      const url = getLocalizedUrl(path, { country: country.code, lang });
      tags.push({ hreflang: `${lang}-${country.code}`, href: url });
    });
    
    // x-default
    tags.push({ hreflang: 'x-default', href: getLocalizedUrl(path, { country: 'RS', lang: 'sr' }) });
    
    return tags;
  }
  
  function getCanonicalUrl(path = '/') {
    return getLocalizedUrl(path, { country: currentCountry });
  }
  
  // Generate sitemap for a specific country
  function generateSitemap(countryCode, pages = []) {
    const countryConfig = getCountryConfig(countryCode);
    if (!countryConfig) return '';
    
    const baseUrl = countryConfig.seo?.canonicalBase || `https://dalli.${countryCode.toLowerCase()}`;
    const lang = countryConfig.language?.code || 'en';
    const defaultLang = countryConfig.language?.code || 'en';
    const langPrefix = lang !== defaultLang ? `/${lang}` : '';
    
    const urls = [
      { url: `${countryConfig.seo?.canonicalBase || `https://dalli.${countryCode.toLowerCase()}`}${langPrefix}/`, changefreq: 'daily', priority: 1.0 },
      { url: `${countryConfig.seo?.canonicalBase || `https://dalli.${countryCode.toLowerCase()}`}${langPrefix}/products/`, changefreq: 'daily', priority: 0.9 },
      ...pages.map(page => ({
        url: `${baseUrl}${langPrefix}/proizvod-${page.slug}/`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: page.updatedAt || new Date().toISOString().split('T')[0]
      }))
    ];
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
    
    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${url.url}</loc>\n`;
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;
      if (url.lastmod) xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      
      // Add hreflang for each active country
      const countries = getActiveCountries();
      countries.forEach(country => {
        const lang = country.language?.code || 'en';
        const altUrl = getLocalizedUrl(url.url.replace(/^https?:\/\/[^\/]+/, ''), { 
          country: country.code, 
          lang 
        });
        xml += `    <xhtml:link rel="alternate" hreflang="${lang}-${country.code}" href="${altUrl}" />\n`;
      });
      xml += '    <xhtml:link rel="alternate" hreflang="x-default" href="' + getLocalizedUrl(url.url.replace(/^https?:\/\/[^\/]+/, ''), { country: 'RS', lang: 'sr' }) + '" />\n';
      xml += '  </url>\n';
    });
    
    xml += '</urlset>';
    return xml;
  }
  
  // Generate robots.txt for a country
  function generateRobotsTxt(countryCode) {
    const countryConfig = getCountryConfig(countryCode);
    if (!countryConfig) return '';
    
    const baseUrl = countryConfig.seo?.canonicalBase || `https://dalli.${countryCode.toLowerCase()}`;
    const lang = countryConfig.language?.code || 'en';
    const defaultLang = countryConfig.language?.code || 'en';
    const langPrefix = lang !== defaultLang ? `/${lang}` : '';
    
    let txt = `# ${countryConfig.name?.en || countryCode} - robots.txt\n`;
    txt += `# Generated: ${new Date().toISOString()}\n\n`;
    txt += `User-agent: *\n`;
    txt += `Allow: /\n\n`;
    txt += `Disallow: /admin/\n`;
    txt += `Disallow: /cart/\n`;
    txt += `Disallow: /checkout/\n`;
    txt += `Disallow: /account/\n`;
    txt += `Disallow: /api/\n`;
    txt += `Disallow: /*.json$\n\n`;
    txt += `Sitemap: ${baseUrl}${langPrefix}/sitemap.xml\n`;
    txt += `Host: ${new URL(baseUrl).hostname}\n`;
    
    return txt;
  }
  
  // Generate canonical URL with proper hreflang
  function getCanonicalUrl(path = '/') {
    return getLocalizedUrl(path, { country: currentCountry });
  }
  
  // Generate alternate links for <head>
  function getAlternateLinks(path = '/') {
    const countries = getActiveCountries();
    return countries.map(country => {
      const lang = country.language?.code || 'en';
      const url = getLocalizedUrl(path, { country: country.code, lang });
      return `<link rel="alternate" hreflang="${lang}-${country.code}" href="${url}" />`;
    }).join('\n');
  }
  
  // Get structured data for current page
  function getStructuredData(pageType, data = {}) {
    const countryConfig = getCountryConfig(currentCountry);
    const baseData = {
      '@context': 'https://schema.org',
      '@type': pageType,
      name: data.name || countryConfig.seo?.defaultTitle,
      description: data.description || countryConfig.seo?.defaultDescription,
      url: getCanonicalUrl(data.path || '/'),
      image: data.image || countryConfig.seo?.ogImage,
      priceCurrency: currentCurrency,
      inLanguage: currentLanguage,
    };
    
    if (pageType === 'Product') {
      return {
        ...baseData,
        '@type': 'Product',
        sku: data.sku,
        brand: { '@type': 'Brand', name: 'DALLI' },
        offers: {
          '@type': 'Offer',
          url: getCanonicalUrl(data.path || '/'),
          price: data.price,
          priceCurrency: currentCurrency,
          availability: data.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        }
      };
    }
    
    if (pageType === 'WebSite') {
      return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'DALLI',
        url: `https://dalli.${currentCountry.toLowerCase()}`,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `https://dalli.${currentCountry.toLowerCase()}/products/?search={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      };
    }
    
    return baseData;
  }

  // ============================================
  // Geo Detection
  // ============================================
  
  // Multiple IP geolocation providers (fallback chain)
  const IP_PROVIDERS = [
    { name: 'ipapi', url: 'https://ipapi.co/json/', getCode: (d) => data.country_code },
    { name: 'ipinfo', url: 'https://ipinfo.io/json', getCode: (d) => data.country },
    { name: 'ipgeolocation', url: 'https://api.ipgeolocation.io/ipgeo?apiKey=free', getCode: (d) => data.country_code2 },
    { name: 'ipwhois', url: 'https://ipwho.is/', getCode: (d) => data.country_code },
  ];

  function detectCountryFromBrowser() {
    // Try navigator.language
    const navLang = navigator.language || navigator.userLanguage || 'en';
    const langCode = navLang.split('-')[0].toLowerCase();
    
    // Map language to likely country
    const langToCountry = {
      sr: 'RS', hr: 'HR', sl: 'SI', bs: 'BA', mk: 'MK', sq: 'AL',
      de: 'DE', at: 'AT', ch: 'CH',
      fr: 'FR', be: 'BE', lu: 'LU',
      es: 'ES', mx: 'MX', ar: 'AR',
      it: 'IT', it: 'IT',
      pt: 'PT', br: 'BR',
      nl: 'NL', be: 'BE',
      pl: 'PL', cz: 'CZ', sk: 'SK', hu: 'HU',
      ro: 'RO', bg: 'BG', gr: 'GR',
    };
    
    return langToCountry[langCode] || null;
  }

  async function detectCountryFromIP(providerIndex = 0) {
    if (providerIndex >= IP_PROVIDERS.length) {
      console.warn('[I18n] All IP providers exhausted');
      return null;
    }

    const provider = IP_PROVIDERS[providerIndex];
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(provider.url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const countryCode = provider.getCode(data)?.toUpperCase();
      
      if (countryCode && getCountryConfig(countryCode)?.active) {
        console.log(`[I18n] Detected country ${countryCode} via ${provider.name}`);
        return countryCode;
      }
    } catch (e) {
      console.warn(`[I18n] Provider ${provider.name} failed:`, e.message);
    }
    
    // Try next provider
    return detectCountryFromIP(providerIndex + 1);
  }

  // Enhanced auto-detection with user consent
  async function autoDetectCountry(options = {}) {
    const { 
      preferIP = true, 
      requireConsent = true,
      saveChoice = true 
    } = options;

    // Check if user already made a choice
    const savedChoice = localStorage.getItem('dalli_country');
    if (savedChoice && getCountryConfig(savedChoice)?.active) {
      return savedChoice;
    }

    // Check for existing consent
    const hasConsent = localStorage.getItem('dalli_geo_consent') === 'true';
    if (requireConsent && !hasConsent) {
      return null; // Wait for user consent
    }

    // Try IP-based detection first (more accurate)
    if (preferIP) {
      const ipCountry = await detectCountryFromIP();
      if (ipCountry) {
        if (saveChoice) {
          await setCountry(ipCountry, { persist: true, source: 'ip' });
        }
        return ipCountry;
      }
    }

    // Fallback to browser language
    const browserCountry = detectCountryFromBrowser();
    if (browserCountry && getCountryConfig(browserCountry)?.active) {
      if (saveChoice) {
        await setCountry(browserCountry, { persist: true, source: 'browser' });
      }
      return browserCountry;
    }

    // Default fallback
    return 'RS';
  }

  // Country Selector UI Component
  function createCountrySelector(options = {}) {
    const { 
      onSelect, 
      showFlags = true, 
      showCurrency = true,
      showLanguage = true,
      placeholder = 'Izaberite zemlju...',
      className = ''
    } = options;

    const countries = getActiveCountries().sort((a, b) => 
      (a.name?.sr || a.name?.en || a.code).localeCompare(b.name?.sr || b.name?.en || b.code)
    );

    const select = document.createElement('select');
    select.className = `nc-country-select ${className}`;
    select.innerHTML = `<option value="">${placeholder}</option>` + 
      countries.map(c => 
        `<option value="${c.code}"${c.code === currentCountry ? ' selected' : ''}>
          ${showFlags ? c.flag + ' ' : ''}${c.name?.sr || c.name?.en || c.code}
          ${showCurrency ? ` (${c.currency?.symbol || c.currency?.code})` : ''}
        </option>`
      ).join('');

    select.addEventListener('change', (e) => {
      if (onSelect) onSelect(e.target.value);
    });

    return select;
  }

  // Country Selector Modal
  function showCountrySelector(options = {}) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'nc-country-modal-overlay';
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        padding: 2rem; animation: fadeIn 0.2s ease;
      `;

      const countries = getActiveCountries().sort((a, b) => 
        (a.name?.sr || a.name?.en || a.code).localeCompare(b.name?.sr || b.name?.en || b.code)
      );

      modal.innerHTML = `
        <div class="nc-country-modal" style="
          background: var(--background, #fff);
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          width: 100%; max-width: 500px; max-height: 90vh;
          overflow-y: auto; animation: slideUp 0.3s ease;
        ">
          <div class="nc-country-modal-header" style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 1rem 1.5rem; border-bottom: 1px solid var(--border, #ddd);
            background: var(--surface, #fafafa);
          ">
            <h3 style="margin: 0; font-size: 1.1rem;">🌍 Izaberite zemlju</h3>
            <button class="nc-modal-close" style="width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent; color: var(--text-light, #7f8c8d); cursor: pointer; font-size: 1.5rem;">×</button>
          </div>
          <div class="nc-country-search" style="padding: 1rem; border-bottom: 1px solid var(--border, #ddd);">
            <input type="text" placeholder="🔍 Pretraži zemlju..." style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border, #ddd); border-radius: 6px; font-size: 0.875rem;">
          </div>
          <div class="nc-country-list" style="padding: 1rem; max-height: 50vh; overflow-y: auto;">
            ${getActiveCountries().map(c => `
              <button class="nc-country-item" data-code="${c.code}" style="
                display: flex; align-items: center; gap: 1rem;
                padding: 0.75rem 1rem; border-radius: 8px;
                border: 1px solid transparent; cursor: pointer;
                transition: all 0.2s; width: 100%; text-align: left;
              " onmouseover="this.style.background='var(--surface, #fafafa)'" onmouseout="this.style.background='transparent'">
                <span style="font-size: 1.5rem;">${c.flag}</span>
                <div>
                  <div style="font-weight: 500; color: var(--text, #2c3e50);">${c.name?.sr || c.name?.en || c.code}</div>
                  <div style="font-size: 0.8rem; color: var(--text-light, #7f8c8d);">
                    ${c.currency?.symbol || c.currency?.code} | ${c.language?.nativeName || c.language?.code}
                  </div>
                </div>
                ${c.code === currentCountry ? '<span style="margin-left: auto; background: var(--primary, #2c3e50); color: white; padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.7rem;">Trenutna</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const closeModal = () => {
        modal.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => modal.remove(), 200);
      };

      modal.querySelector('.nc-modal-close').addEventListener('click', () => {
        closeModal();
        resolve(null);
      });

      modal.querySelector('.nc-country-search input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        modal.querySelectorAll('.nc-country-item').forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(query) ? 'flex' : 'none';
        });
      });

      modal.querySelectorAll('.nc-country-item').forEach(item => {
        item.addEventListener('click', () => {
          const code = item.dataset.code;
          closeModal();
          resolve(code);
        });
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
          resolve(null);
        }
      });

      // Animation styles
      if (!document.getElementById('country-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'country-modal-styles';
        style.textContent = `
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
          .nc-country-item:hover { background: var(--surface, #fafafa) !important; }
        `;
        document.head.appendChild(style);
      }
    });
  }

  // Request geo consent
  async function requestGeoConsent() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'nc-geo-consent-overlay';
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        padding: 2rem; animation: fadeIn 0.2s ease;
      `;

      modal.innerHTML = `
        <div style="background: var(--background, #fff); border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 100%; max-width: 450px; animation: slideUp 0.3s ease;">
          <div style="padding: 1.5rem; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🌍</div>
            <h3 style="margin: 0 0 0.5rem; color: var(--text, #2c3e50);">Da li želite da automatski detektujemo vašu zemlju?</h3>
            <p style="color: var(--text-light, #7f8c8d); margin-bottom: 1.5rem;">Koristimo vašu IP adresu da preporučimo najbolju zemlju, valutu i jezik za vas.</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
              <button class="nc-btn nc-btn-secondary" style="padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer;" onclick="this.closest('.nc-geo-consent-overlay').dataset.result='deny'; this.closest('.nc-geo-consent-overlay').remove(); resolve(false);">Ne, hvala</button>
              <button class="nc-btn nc-btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer;" onclick="this.closest('.nc-geo-consent-overlay').dataset.result='allow'; this.closest('.nc-geo-consent-overlay').remove(); resolve(true);">Da, detektuj</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      return new Promise((resolve) => {
        modal.dataset.result = 'pending';
        const checkResult = setInterval(() => {
          if (modal.dataset.result !== 'pending') {
            clearInterval(checkResult);
            const result = modal.dataset.result === 'allow';
            modal.remove();
            resolve(result);
          }
        }, 100);
      });
    });
  }

  // Initialize geo detection on first visit
  async function initGeoDetection(options = {}) {
    const { autoDetect = true, showConsent = true } = options;
    
    const hasConsent = localStorage.getItem('dalli_geo_consent') === 'true';
    const hasCountry = localStorage.getItem('dalli_country');
    
    if (!hasCountry && autoDetect) {
      if (showConsent && !hasConsent) {
        const consent = await requestGeoConsent();
        if (consent) {
          localStorage.setItem('dalli_geo_consent', 'true');
          await autoDetectCountry({ requireConsent: false });
        }
      } else if (hasConsent || !showConsent) {
        await autoDetectCountry({ requireConsent: false });
      }
    }
  }

  // ============================================
  // Event System
  // ============================================
  
  function onCountryChange(callback) {
    countryChangeCallbacks.push(callback);
    return () => {
      const idx = countryChangeCallbacks.indexOf(callback);
      if (idx > -1) countryChangeCallbacks.splice(idx, 1);
    };
  }

  // ============================================
  // Utility: Formatters
  // ============================================
  
  function formatNumber(value, options = {}) {
    const countryConfig = getCountryConfig(currentCountry);
    const numFormat = countryConfig?.language?.numberFormat || { decimal: ',', thousand: '.', grouping: 3 };
    const lang = currentLanguage || 'en';
    
    return new Intl.NumberFormat(lang, {
      minimumFractionDigits: options.decimals ?? 0,
      maximumFractionDigits: options.decimals ?? 0,
      useGrouping: true,
    }).format(value);
  }

  function formatDate(date, options = {}) {
    const countryConfig = getCountryConfig(currentCountry);
    const dateFormat = countryConfig?.language?.dateFormat || 'DD.MM.YYYY';
    const lang = currentLanguage || 'en';
    
    const d = new Date(date);
    const optionsIntl = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      ...options 
    };
    
    try {
      return d.toLocaleDateString(lang, optionsIntl);
    } catch (e) {
      return d.toLocaleDateString('sr-RS', optionsIntl);
    }
  }

  function formatDateTime(date, options = {}) {
    const countryConfig = getCountryConfig(currentCountry);
    const timeFormat = countryConfig?.language?.timeFormat || 'HH:mm';
    const lang = currentLanguage || 'en';
    
    const d = new Date(date);
    const optionsIntl = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options 
    };
    
    try {
      return d.toLocaleDateString(lang, optionsIntl);
    } catch (e) {
      return d.toLocaleDateString('sr-RS', optionsIntl);
    }
  }

  // ============================================
  // Export
  // ============================================
  
  window.DALLI_I18N = {
    // Init
    init: initI18n,
    
    // Country
    setCountry,
    getCurrentCountry,
    getCurrentLanguage,
    getCurrentCurrency,
    getCurrentMarket,
    getCountryConfig,
    getActiveCountries: () => getActiveCountries(),
    getCountryConfig,
    
    // Language
    loadTranslations,
    t,
    setLanguage,
    getCurrentLanguage,
    
    // Currency
    loadExchangeRates,
    convertCurrency,
    formatCurrency,
    getExchangeRate,
    
    // Pricing
    calculatePrice,
    getPriceListConfig,
    
    // Tax
    calculateTax,
    validateVATNumber,
    
    // Shipping
    calculateShipping,
    getShippingZones,
    
    // Promotions
    validatePromoCode,
    applyPromotion,
    
    // URL/SEO
    getLocalizedUrl,
    getHreflangTags,
    getCanonicalUrl,
    
    // Geo
    detectCountryFromBrowser,
    detectCountryFromIP,
    
    // Events
    onCountryChange,
    
    // Formatters
    formatNumber,
    formatDate,
    formatDateTime,
    
    // Translations
    translations: () => translations,
  };

  // Auto-init if not in test mode
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initI18n());
  } else {
    initI18n();
  }

})();