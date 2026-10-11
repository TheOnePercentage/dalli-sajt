/**
 * DALLI International Expansion - Countries Configuration
 * 
 * Single source of truth for all country-specific configuration.
 * Add new countries here - no code changes required elsewhere.
 * 
 * Structure follows fallback chain: Country → Region → Global Defaults
 */

const COUNTRIES = {
  // ============================================
  // ACTIVE COUNTRIES
  // ============================================
  RS: {
    // Basic Info
    code: 'RS',
    name: { sr: 'Srbija', en: 'Serbia', de: 'Serbien', fr: 'Serbie' },
    nativeName: 'Србија',
    flag: '🇷🇸',
    
    // Status
    active: true,
    launchDate: '2024-01-01',
    
    // Currency
    currency: {
      code: 'RSD',
      symbol: 'RSD',
      symbolNative: 'РСД',
      decimals: 0,
      format: '{amount} {symbol}',
      exchangeRateToEUR: 0.0085, // 1 EUR = 117 RSD approx
      lastUpdated: '2024-01-15',
    },
    
    // Language
    language: {
      code: 'sr',
      nativeName: 'Српски',
      englishName: 'Serbian',
      rtl: false,
      locale: 'sr-RS',
      fallback: ['sr-Latn-RS', 'sr-Cyrl-RS', 'en'],
      dateFormat: 'DD.MM.YYYY',
      timeFormat: 'HH:mm',
      numberFormat: { decimal: ',', thousand: '.', grouping: 3 },
    },
    
    // Region & Market
    region: 'balkans',
    market: 'serbia',
    timezone: 'Europe/Belgrade',
    
    // Tax (VAT)
    tax: {
      vatRate: 0.20,           // 20% standard
      reducedVatRate: 0.10,    // 10% reduced (books, meds, etc.)
      superReducedVatRate: 0,  // N/A
      vatNumberFormat: '^[0-9]{9}$', // PIB format
      vatNumberPrefix: 'RS',
      ossRegistered: true,
      iossRegistered: false,
      reverseChargeApplicable: ['services', 'digital'],
      invoicing: {
        requiredFields: ['seller', 'buyer', 'items', 'vat', 'date', 'number'],
        language: 'sr',
        currency: 'RSD',
      },
    },
    
    // Shipping
    shipping: {
      zones: [
        { id: 'rs-belgrade', name: { sr: 'Beograd', en: 'Belgrade' }, postalCodes: ['11000', '11010', '11020', '11030', '11040', '11050', '11060', '11070', '11080', '11090'], cost: 0, freeThreshold: 0, estimatedDays: '1' },
        { id: 'rs-vojvodina', name: { sr: 'Vojvodina', en: 'Vojvodina' }, postalCodes: ['21*', '22*', '23*', '24*', '25*', '26*'], cost: 190, freeThreshold: 5000, estimatedDays: '1-2' },
        { id: 'rs-central', name: { sr: 'Centralna Srbija', en: 'Central Serbia' }, postalCodes: ['12*', '13*', '14*', '15*', '16*', '17*', '18*', '19*', '31*', '32*', '34*', '35*', '36*', '37*'], cost: 250, freeThreshold: 5000, estimatedDays: '2-3' },
        { id: 'rs-south', name: { sr: 'Južna Srbija', en: 'Southern Serbia' }, postalCodes: ['16*', '17*', '18*', '19*'], cost: 300, freeThreshold: 5000, estimatedDays: '2-3' },
      ],
      defaultZone: 'rs-central',
      freeShippingThreshold: 5000,
      expressAvailable: true,
      expressCost: 500,
      expressDays: '1',
      internationalShipping: false,
      carriers: ['posta-srbije', 'gls', 'dhl'],
      packagingCost: 100,
      codAvailable: true,
      codFee: 100,
      codMaxAmount: 100000,
    },
    
    // Pricing
    pricing: {
      baseCurrency: 'RSD',
      ppvMultiplier: 1.0,           // Purchase Power Parity multiplier
      rounding: { method: 'round', precision: 0 }, // Round to whole RSD
      priceDisplay: { includeTax: true, showOriginalPrice: true },
      dynamicPricing: false,
      priceLists: {
        retail: { name: { sr: 'Malo prodaja', en: 'Retail' }, multiplier: 1.0 },
        wholesale: { name: { sr: 'Veliko prodaja', en: 'Wholesale' }, multiplier: 0.7, minQty: 10 },
        b2b: { name: { sr: 'B2B', en: 'B2B' }, multiplier: 0.65, minQty: 50 },
      },
    },
    
    // Promotions
    promotions: {
      allowedTypes: ['percentage', 'fixed', 'bogo', 'free_shipping', 'gift'],
      maxDiscountPercent: 70,
      stackable: false,
      couponFormat: 'DALLI-[A-Z0-9]{6}',
      seasonalCampaigns: [
        { id: 'rs-new-year', name: { sr: 'Nova Godina', en: 'New Year' }, start: '01-01', end: '01-15' },
        { id: 'rs-spring', name: { sr: 'Proleće', en: 'Spring' }, start: '03-20', end: '04-20' },
        { id: 'rs-summer-sale', name: { sr: 'Letnja Rasprodaja', en: 'Summer Sale' }, start: '07-01', end: '08-15' },
        { id: 'rs-black-friday', name: { sr: 'Crni Petak', en: 'Black Friday' }, start: '11-24', end: '11-30' },
        { id: 'rs-christmas', name: { sr: 'Božić', en: 'Christmas' }, start: '12-15', end: '12-31' },
      ],
      loyaltyProgram: {
        enabled: true,
        name: { sr: 'DALLI Klub', en: 'DALLI Club' },
        pointsPerRSD: 0.01,
        pointsValue: 1, // 1 point = 1 RSD
        tiers: [
          { name: { sr: 'Bronza', en: 'Bronze' }, minPoints: 0, discount: 0 },
          { name: { sr: 'Srebro', en: 'Silver' }, minPoints: 5000, discount: 5 },
          { name: { sr: 'Zlato', en: 'Gold' }, minPoints: 20000, discount: 10 },
          { name: { sr: 'Platina', en: 'Platinum' }, minPoints: 50000, discount: 15, freeShipping: true },
        ],
      },
    },
    
    // Payment
    payment: {
      methods: ['cod', 'card', 'bank_transfer', 'installments'],
      installments: {
        enabled: true,
        maxInstallments: 12,
        minAmount: 3000,
        interestFreeMonths: [3, 6],
        providers: ['banca_intaesa', 'raiffeisen', 'unicredit'],
      },
      card: {
        supportedBrands: ['visa', 'mastercard', 'maestro', 'dina'],
        threeDSecure: true,
      },
    },
    
    // Legal & Compliance
    legal: {
      consumerProtectionLaw: 'Zakon o zaštiti potrošača',
      dataProtectionLaw: 'Zakon o ličnim podacima',
      ecommerceLaw: 'Zakon o elektronskoj trgovini',
      requiredDocuments: ['privacy_policy', 'terms_conditions', 'return_policy', 'cookie_policy', 'imprint'],
      ageVerificationRequired: false,
      restrictedProducts: ['alcohol', 'tobacco', 'weapons', 'medicines'],
    },
    
    // SEO & Marketing
    seo: {
      defaultTitle: { sr: 'DALLI - Online Prodaja Garderobe', en: 'DALLI - Online Fashion Store' },
      defaultDescription: { sr: 'Muška i ženska garderoba. Majice, trenerke, dukseri. Besplatna dostava nad 5000 RSD.', en: 'Men and women fashion. T-shirts, tracksuits, hoodies. Free shipping over 5000 RSD.' },
      ogImage: '/images/og-rs.jpg',
      twitterCard: 'summary_large_image',
      canonicalBase: 'https://dalli.rs',
      hreflang: { 'sr-RS': 'https://dalli.rs/', 'en': 'https://dalli.rs/en/' },
      structuredData: { '@type': 'Store', 'name': 'DALLI', 'currency': 'RSD' },
    },
    
    // Analytics & Tracking
    analytics: {
      ga4Id: 'G-XXXXXXXXXX',
      fbPixelId: '123456789',
      twitterPixelId: 'YOUR_TWITTER_PIXEL_ID',
      instagramPixelId: 'YOUR_INSTAGRAM_PIXEL_ID',
      tiktokPixelId: 'YOUR_TIKTOK_PIXEL_ID',
      gtmId: 'GTM-XXXXXXX',
      consentMode: true,
    },
  },
  
  // ============================================
  // PRE-CONFIGURED FUTURE COUNTRIES (INACTIVE)
  // ============================================
  DE: {
    code: 'DE',
    name: { de: 'Deutschland', en: 'Germany', sr: 'Nemačka' },
    nativeName: 'Deutschland',
    flag: '🇩🇪',
    active: false,
    launchDate: null,
    currency: { code: 'EUR', symbol: '€', symbolNative: '€', decimals: 2, format: '{symbol}{amount}', exchangeRateToEUR: 1.0, lastUpdated: '2024-01-15' },
    language: { code: 'de', nativeName: 'Deutsch', englishName: 'German', rtl: false, locale: 'de-DE', fallback: ['en'], dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', numberFormat: { decimal: ',', thousand: '.', grouping: 3 } },
    region: 'eu-central',
    market: 'germany',
    timezone: 'Europe/Berlin',
    tax: { vatRate: 0.19, reducedVatRate: 0.07, vatNumberFormat: '^DE[0-9]{9}$', vatNumberPrefix: 'DE', ossRegistered: true, iossRegistered: true, reverseChargeApplicable: ['services', 'digital', 'goods'] },
    shipping: { zones: [], freeShippingThreshold: 49.99, internationalShipping: true, carriers: ['dhl', 'hermes', 'dpd', 'gls'] },
    pricing: { baseCurrency: 'EUR', ppvMultiplier: 1.0, rounding: { method: 'round', precision: 2 }, priceLists: { retail: { name: { de: 'Einzelhandel' }, multiplier: 1.0 }, wholesale: { name: { de: 'Großhandel' }, multiplier: 0.7, minQty: 10 } } },
    active: false,
  },
  
  AT: {
    code: 'AT',
    name: { de: 'Österreich', en: 'Austria', sr: 'Austrija' },
    nativeName: 'Österreich',
    flag: '🇦🇹',
    active: false,
    launchDate: null,
    currency: { code: 'EUR', symbol: '€', symbolNative: '€', decimals: 2, format: '{symbol}{amount}', exchangeRateToEUR: 1.0, lastUpdated: '2024-01-15' },
    language: { code: 'de', nativeName: 'Deutsch', englishName: 'German', rtl: false, locale: 'de-AT', fallback: ['de-DE', 'en'], dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', numberFormat: { decimal: ',', thousand: '.', grouping: 3 } },
    region: 'eu-central',
    market: 'austria',
    timezone: 'Europe/Vienna',
    tax: { vatRate: 0.20, reducedVatRate: 0.10, vatNumberFormat: '^ATU[0-9]{8}$', vatNumberPrefix: 'AT', ossRegistered: true, iossRegistered: true },
    shipping: { zones: [], freeShippingThreshold: 39.99, internationalShipping: true, carriers: ['post_at', 'dhl', 'dpd', 'gls'] },
    pricing: { baseCurrency: 'EUR', ppvMultiplier: 1.02, rounding: { method: 'round', precision: 2 } },
    active: false,
  },
  
  FR: {
    code: 'FR',
    name: { fr: 'France', en: 'France', sr: 'Francuska' },
    nativeName: 'France',
    flag: '🇫🇷',
    active: false,
    launchDate: null,
    currency: { code: 'EUR', symbol: '€', symbolNative: '€', decimals: 2, format: '{amount} {symbol}', exchangeRateToEUR: 1.0, lastUpdated: '2024-01-15' },
    language: { code: 'fr', nativeName: 'Français', englishName: 'French', rtl: false, locale: 'fr-FR', fallback: ['en'], dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', numberFormat: { decimal: ',', thousand: ' ', grouping: 3 } },
    region: 'eu-west',
    market: 'france',
    timezone: 'Europe/Paris',
    tax: { vatRate: 0.20, reducedVatRate: 0.055, vatNumberFormat: '^FR[A-Z0-9]{2}[0-9]{9}$', vatNumberPrefix: 'FR', ossRegistered: true, iossRegistered: true },
    shipping: { zones: [], freeShippingThreshold: 59.00, internationalShipping: true, carriers: ['colissimo', 'mondial_relay', 'chronopost', 'dpd'] },
    pricing: { baseCurrency: 'EUR', ppvMultiplier: 1.0, rounding: { method: 'round', precision: 2 } },
    active: false,
  },
  
  IT: {
    code: 'IT',
    name: { it: 'Italia', en: 'Italy', sr: 'Italija' },
    nativeName: 'Italia',
    flag: '🇮🇹',
    active: false,
    launchDate: null,
    currency: { code: 'EUR', symbol: '€', symbolNative: '€', decimals: 2, format: '{symbol}{amount}', exchangeRateToEUR: 1.0, lastUpdated: '2024-01-15' },
    language: { code: 'it', nativeName: 'Italiano', englishName: 'Italian', rtl: false, locale: 'it-IT', fallback: ['en'], dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', numberFormat: { decimal: ',', thousand: '.', grouping: 3 } },
    region: 'eu-south',
    market: 'italy',
    timezone: 'Europe/Rome',
    tax: { vatRate: 0.22, reducedVatRate: 0.10, vatNumberFormat: '^IT[0-9]{11}$', vatNumberPrefix: 'IT', ossRegistered: true, iossRegistered: true },
    shipping: { zones: [], freeShippingThreshold: 49.99, internationalShipping: true, carriers: ['poste_italiane', 'bartolini', 'gls', 'dpd'] },
    pricing: { baseCurrency: 'EUR', ppvMultiplier: 0.95, rounding: { method: 'round', precision: 2 } },
    active: false,
  },
  
  ES: {
    code: 'ES',
    name: { es: 'España', en: 'Spain', sr: 'Španija' },
    nativeName: 'España',
    flag: '🇪🇸',
    active: false,
    launchDate: null,
    currency: { code: 'EUR', symbol: '€', symbolNative: '€', decimals: 2, format: '{amount} {symbol}', exchangeRateToEUR: 1.0, lastUpdated: '2024-01-15' },
    language: { code: 'es', nativeName: 'Español', englishName: 'Spanish', rtl: false, locale: 'es-ES', fallback: ['en'], dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', numberFormat: { decimal: ',', thousand: '.', grouping: 3 } },
    region: 'eu-south',
    market: 'spain',
    timezone: 'Europe/Madrid',
    tax: { vatRate: 0.21, reducedVatRate: 0.10, vatNumberFormat: '^ES[A-Z0-9]{9}$', vatNumberPrefix: 'ES', ossRegistered: true, iossRegistered: true },
    shipping: { zones: [], freeShippingThreshold: 49.99, internationalShipping: true, carriers: ['correos', 'seur', 'mrw', 'gls'] },
    pricing: { baseCurrency: 'EUR', ppvMultiplier: 0.9, rounding: { method: 'round', precision: 2 } },
    active: false,
  },
  
  HR: {
    code: 'HR',
    name: { hr: 'Hrvatska', en: 'Croatia', sr: 'Hrvatska' },
    nativeName: 'Hrvatska',
    flag: '🇭🇷',
    active: false,
    launchDate: null,
    currency: { code: 'EUR', symbol: '€', symbolNative: '€', decimals: 2, format: '{amount} {symbol}', exchangeRateToEUR: 1.0, lastUpdated: '2024-01-15' },
    language: { code: 'hr', nativeName: 'Hrvatski', englishName: 'Croatian', rtl: false, locale: 'hr-HR', fallback: ['sr', 'en'], dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', numberFormat: { decimal: ',', thousand: '.', grouping: 3 } },
    region: 'balkans',
    market: 'croatia',
    timezone: 'Europe/Zagreb',
    tax: { vatRate: 0.25, reducedVatRate: 0.13, vatNumberFormat: '^HR[0-9]{11}$', vatNumberPrefix: 'HR', ossRegistered: true },
    shipping: { zones: [], freeShippingThreshold: 39.99, internationalShipping: true, carriers: ['hp_hrvatska', 'gls', 'dpd'] },
    pricing: { baseCurrency: 'EUR', ppvMultiplier: 0.7, rounding: { method: 'round', precision: 2 } },
    active: false,
  },
  
  BA: {
    code: 'BA',
    name: { bs: 'Bosna i Hercegovina', sr: 'Bosna i Hercegovina', en: 'Bosnia and Herzegovina' },
    nativeName: 'Bosna i Hercegovina',
    flag: '🇧🇦',
    active: false,
    launchDate: null,
    currency: { code: 'BAM', symbol: 'KM', symbolNative: 'КМ', decimals: 2, format: '{amount} {symbol}', exchangeRateToEUR: 0.5113, lastUpdated: '2024-01-15' },
    language: { code: 'bs', nativeName: 'Bosanski', englishName: 'Bosnian', rtl: false, locale: 'bs-BA', fallback: ['sr', 'hr', 'en'], dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', numberFormat: { decimal: ',', thousand: '.', grouping: 3 } },
    region: 'balkans',
    market: 'bosnia',
    timezone: 'Europe/Sarajevo',
    tax: { vatRate: 0.17, vatNumberFormat: '^[0-9]{12}$', vatNumberPrefix: 'BA' },
    shipping: { zones: [], freeShippingThreshold: 75, internationalShipping: false, carriers: ['bh_posta', 'gls'] },
    pricing: { baseCurrency: 'BAM', ppvMultiplier: 0.6, rounding: { method: 'round', precision: 2 } },
    active: false,
  },
  
  ME: {
    code: 'ME',
    name: { sr: 'Crna Gora', en: 'Montenegro', bs: 'Crna Gora' },
    nativeName: 'Crna Gora',
    flag: '🇲🇪',
    active: false,
    launchDate: null,
    currency: { code: 'EUR', symbol: '€', symbolNative: '€', decimals: 2, format: '{amount} {symbol}', exchangeRateToEUR: 1.0, lastUpdated: '2024-01-15' },
    language: { code: 'sr', nativeName: 'Српски', englishName: 'Montenegrin', rtl: false, locale: 'sr-ME', fallback: ['sr-RS', 'en'], dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', numberFormat: { decimal: ',', thousand: '.', grouping: 3 } },
    region: 'balkans',
    market: 'montenegro',
    timezone: 'Europe/Podgorica',
    tax: { vatRate: 0.21, reducedVatRate: 0.07, vatNumberFormat: '^[0-9]{13}$' },
    shipping: { zones: [], freeShippingThreshold: 29.99, internationalShipping: false, carriers: ['posta_cg', 'gls'] },
    pricing: { baseCurrency: 'EUR', ppvMultiplier: 0.55, rounding: { method: 'round', precision: 2 } },
    active: false,
  },
  
  SI: {
    code: 'SI',
    name: { sl: 'Slovenija', en: 'Slovenia', sr: 'Slovenija' },
    nativeName: 'Slovenija',
    flag: '🇸🇮',
    active: false,
    launchDate: null,
    currency: { code: 'EUR', symbol: '€', symbolNative: '€', decimals: 2, format: '{symbol}{amount}', exchangeRateToEUR: 1.0, lastUpdated: '2024-01-15' },
    language: { code: 'sl', nativeName: 'Slovenščina', englishName: 'Slovenian', rtl: false, locale: 'sl-SI', fallback: ['en'], dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', numberFormat: { decimal: ',', thousand: '.', grouping: 3 } },
    region: 'balkans',
    market: 'slovenia',
    timezone: 'Europe/Ljubljana',
    tax: { vatRate: 0.22, reducedVatRate: 0.095, vatNumberFormat: '^SI[0-9]{8}$', vatNumberPrefix: 'SI', ossRegistered: true },
    shipping: { zones: [], freeShippingThreshold: 39.99, internationalShipping: true, carriers: ['posta_slovenije', 'gls', 'dpd'] },
    pricing: { baseCurrency: 'EUR', ppvMultiplier: 0.8, rounding: { method: 'round', precision: 2 } },
    active: false,
  },
};

const REGIONS = {
  'balkans': {
    code: 'balkans',
    name: { sr: 'Balkan', en: 'Balkans', de: 'Balkan', fr: 'Balkans' },
    countries: ['RS', 'HR', 'BA', 'ME', 'SI', 'MK', 'AL', 'XK'],
    currency: 'EUR',
    languages: ['sr', 'hr', 'bs', 'sl', 'mk', 'sq', 'en'],
    timezone: 'Europe/Belgrade',
    taxHarmonization: false,
    shippingAgreement: 'CEFTA',
  },
  'eu-central': {
    code: 'eu-central',
    name: { de: 'Mitteleuropa', en: 'Central Europe', sr: 'Centralna Evropa' },
    countries: ['DE', 'AT', 'CH', 'CZ', 'SK', 'HU', 'PL', 'SI'],
    currency: 'EUR',
    languages: ['de', 'sk', 'hu', 'pl', 'sl', 'cs', 'en'],
    timezone: 'Europe/Berlin',
    taxHarmonization: true,
    shippingAgreement: 'EU Single Market',
  },
  'eu-west': {
    code: 'eu-west',
    name: { fr: 'Europe de l\'Ouest', en: 'Western Europe', sr: 'Zapadna Evropa' },
    countries: ['FR', 'ES', 'PT', 'BE', 'NL', 'LU', 'IE'],
    currency: 'EUR',
    languages: ['fr', 'es', 'pt', 'nl', 'en'],
    timezone: 'Europe/Paris',
    taxHarmonization: true,
    shippingAgreement: 'EU Single Market',
  },
  'eu-south': {
    code: 'eu-south',
    name: { it: 'Europa Meridionale', en: 'Southern Europe', sr: 'Južna Evropa' },
    countries: ['IT', 'GR', 'MT', 'CY'],
    currency: 'EUR',
    languages: ['it', 'el', 'mt', 'en'],
    timezone: 'Europe/Rome',
    taxHarmonization: true,
    shippingAgreement: 'EU Single Market',
  },
};

const MARKETS = {
  serbia: {
    code: 'serbia',
    name: { sr: 'Srbija', en: 'Serbia Market' },
    region: 'balkans',
    primaryCountry: 'RS',
    countries: ['RS'],
    defaultLanguage: 'sr',
    defaultCurrency: 'RSD',
    seo: { canonicalBase: 'https://dalli.rs' },
  },
  germany: {
    code: 'germany',
    name: { de: 'Deutschland Markt', en: 'Germany Market' },
    region: 'eu-central',
    primaryCountry: 'DE',
    countries: ['DE', 'AT'],
    defaultLanguage: 'de',
    defaultCurrency: 'EUR',
    seo: { canonicalBase: 'https://dalli.de' },
  },
  austria: {
    code: 'austria',
    name: { de: 'Österreich Markt', en: 'Austria Market' },
    region: 'eu-central',
    primaryCountry: 'AT',
    countries: ['AT'],
    defaultLanguage: 'de',
    defaultCurrency: 'EUR',
    seo: { canonicalBase: 'https://dalli.at' },
  },
  france: {
    code: 'france',
    name: { fr: 'France Marché', en: 'France Market' },
    region: 'eu-west',
    primaryCountry: 'FR',
    countries: ['FR'],
    defaultLanguage: 'fr',
    defaultCurrency: 'EUR',
    seo: { canonicalBase: 'https://dalli.fr' },
  },
  italy: {
    code: 'italy',
    name: { it: 'Italia Mercato', en: 'Italy Market' },
    region: 'eu-south',
    primaryCountry: 'IT',
    countries: ['IT'],
    defaultLanguage: 'it',
    defaultCurrency: 'EUR',
    seo: { canonicalBase: 'https://dalli.it' },
  },
  spain: {
    code: 'spain',
    name: { es: 'España Mercado', en: 'Spain Market' },
    region: 'eu-south',
    primaryCountry: 'ES',
    countries: ['ES'],
    defaultLanguage: 'es',
    defaultCurrency: 'EUR',
    seo: { canonicalBase: 'https://dalli.es' },
  },
  croatia: {
    code: 'croatia',
    name: { hr: 'Hrvatska Tržište', en: 'Croatia Market', sr: 'Hrvatsko Tržište' },
    region: 'balkans',
    primaryCountry: 'HR',
    countries: ['HR'],
    defaultLanguage: 'hr',
    defaultCurrency: 'EUR',
    seo: { canonicalBase: 'https://dalli.hr' },
  },
  bosnia: {
    code: 'bosnia',
    name: { bs: 'BiH Tržište', en: 'Bosnia Market', sr: 'BiH Tržište' },
    region: 'balkans',
    primaryCountry: 'BA',
    countries: ['BA'],
    defaultLanguage: 'bs',
    defaultCurrency: 'BAM',
    seo: { canonicalBase: 'https://dalli.ba' },
  },
  montenegro: {
    code: 'montenegro',
    name: { sr: 'Crna Gora Tržište', en: 'Montenegro Market' },
    region: 'balkans',
    primaryCountry: 'ME',
    countries: ['ME'],
    defaultLanguage: 'sr',
    defaultCurrency: 'EUR',
    seo: { canonicalBase: 'https://dalli.me' },
  },
  slovenia: {
    code: 'slovenia',
    name: { sl: 'Slovenija Tržište', en: 'Slovenia Market' },
    region: 'balkans',
    primaryCountry: 'SI',
    countries: ['SI'],
    defaultLanguage: 'sl',
    defaultCurrency: 'EUR',
    seo: { canonicalBase: 'https://dalli.si' },
  },
};

// Global defaults (fallback chain end)
const GLOBAL_DEFAULTS = {
  currency: { code: 'EUR', symbol: '€', decimals: 2, format: '{symbol}{amount}' },
  language: { code: 'en', fallback: ['en'], rtl: false, dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm', numberFormat: { decimal: '.', thousand: ',', grouping: 3 } },
  tax: { vatRate: 0.20, reducedVatRate: 0.05 },
  shipping: { freeShippingThreshold: 50, internationalShipping: true },
  pricing: { baseCurrency: 'EUR', ppvMultiplier: 1.0, rounding: { method: 'round', precision: 2 } },
  tax: { vatRate: 0.20 },
  language: { code: 'en', rtl: false, dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm' },
  seo: { canonicalBase: 'https://dalli.eu' },
};

// Utility functions
function getCountry(code) {
  return COUNTRIES[code.toUpperCase()] || null;
}

function getActiveCountries() {
  return Object.values(COUNTRIES).filter(c => c.active);
}

function getCountriesByRegion(regionCode) {
  const region = REGIONS[regionCode];
  if (!region) return [];
  return region.countries.map(code => COUNTRIES[code]).filter(Boolean);
}

function getCountriesByMarket(marketCode) {
  const market = MARKETS[marketCode];
  if (!market) return [];
  return market.countries.map(code => COUNTRIES[code]).filter(Boolean);
}

function getCountryWithFallback(code, path) {
  const country = getCountry(code);
  if (!country) return getCountryWithFallback('RS', path); // fallback to Serbia
  
  // Traverse path (e.g., 'tax.vatRate') with fallback to region/global
  const keys = path.split('.');
  let value = country;
  for (const key of keys) {
    if (value && value[key] !== undefined) {
      value = value[key];
    } else {
      // Fallback to region
      const region = REGIONS[country.region];
      if (region) {
        let regionValue = region;
        for (const k of keys) {
          if (regionValue && regionValue[k] !== undefined) {
            regionValue = regionValue[k];
          } else {
            regionValue = undefined;
            break;
          }
        }
        if (regionValue !== undefined) return regionValue;
        
        // Fallback to global
        let globalValue = GLOBAL_DEFAULTS;
        for (const k of keys) {
          if (globalValue && globalValue[k] !== undefined) {
            globalValue = globalValue[k];
          } else {
            globalValue = undefined;
            break;
          }
        }
        return globalValue;
      }
    }
    return value;
  }
  return value;
}

function getActiveMarkets() {
  return Object.values(MARKETS).filter(m => m.countries.some(c => COUNTRIES[c]?.active));
}

function getCountrySeoConfig(code) {
  const country = getCountry(code);
  if (!country || !country.seo) return GLOBAL_DEFAULTS.seo;
  return { ...GLOBAL_DEFAULTS.seo, ...country.seo };
}

// Export for both Node/CommonJS and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COUNTRIES,
    REGIONS,
    MARKETS,
    GLOBAL_DEFAULTS,
    getCountry,
    getActiveCountries,
    getCountriesByRegion,
    getCountriesByMarket,
    getCountryWithFallback,
    getActiveMarkets,
    getCountrySeoConfig,
  };
} else {
  window.DALLI_COUNTRIES = {
    COUNTRIES,
    REGIONS,
    MARKETS,
    GLOBAL_DEFAULTS,
    getCountry,
    getActiveCountries,
    getCountriesByRegion,
    getCountriesByMarket,
    getCountryWithFallback,
    getActiveMarkets,
    getCountrySeoConfig,
  };
}