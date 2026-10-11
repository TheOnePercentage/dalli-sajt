/**
 * Experience Center - Shared Configuration
 * Theme catalog, default config schema, validation, sanitization
 * Used by both admin panels (vanilla + admin-new) and Netlify Edge Functions
 */

export const EXPERIENCE_VERSION = 1;

export const PERMISSION_KEY = 'experienceCenter';

export const OWNER_ONLY_ACTIONS = [
  'activateTheme',
  'scheduleTheme',
  'rollbackTheme',
  'cancelScheduledTheme',
];

// Sections owned by the Experience Center.
// Campaigns, promotions, SEO, analytics and permissions are NOT here:
// they belong to the Core Platform (core RBAC / SectionAPI / core promotions store).
export const SECTION_KEYS = [
  'themes',
  'hero',
  'collections',
  'payments',
  'paymentIncentives',
  'concierge',
  'executive',
  'omnichannel',
  'ai',
  'community',
  'maintenance',
  'luxury',
  'brand',
  'editorial',
  'trust',
  'journal',
  'craftsmanship',
  'materials',
  'video',
  'outfits',
  'membership',
  'immersive',
  'global',
  // Phase 20.5 - Experience Center Governance & Master OS sectors
  'brandIdentity',
  'assets',
  'domains',
  'finance',
  'treasury',
  'communication',
  'stores',
  'warehouses',
  'shipping',
  'social',
  'integrations',
  'operations',
  'api',
  'employee',
  'fraud',
];

export const THEME_CATALOG = [
  { id: 'default', label: 'Podrazumevana', emoji: '🏢' },
  { id: 'black-friday', label: 'Black Friday', emoji: '🖤' },
  { id: 'christmas', label: 'Božić', emoji: '🎄' },
  { id: 'new-year', label: 'Nova Godina', emoji: '🎆' },
  { id: 'valentines', label: 'Valentinovo', emoji: '💝' },
  { id: 'summer', label: 'Leto', emoji: '☀️' },
  { id: 'winter', label: 'Zima', emoji: '❄️' },
  { id: 'spring', label: 'Proleće', emoji: '🌸' },
  { id: 'autumn', label: 'Jesen', emoji: '🍂' },
  { id: 'ramadan', label: 'Ramazan', emoji: '🌙' },
  { id: 'eid', label: 'Bajram', emoji: '🎉' },
  { id: 'halloween', label: 'Noć veštica', emoji: '🎃' },
];

const THEME_ACCENTS = {
  default: {
    primary: '#2c3e50',
    secondary: '#34495e',
    highlight: '#e74c3c',
    background: '#ffffff',
    surface: '#f8f9fa',
    textOnPrimary: '#ffffff',
  },
  'black-friday': {
    primary: '#0d0d0d',
    secondary: '#1a1a1a',
    highlight: '#ffd700',
    background: '#0a0a0a',
    surface: '#141414',
    textOnPrimary: '#ffd700',
  },
  christmas: {
    primary: '#0b6623',
    secondary: '#8b1a1a',
    highlight: '#c41e3a',
    background: '#fdf6f0',
    surface: '#ffffff',
    textOnPrimary: '#ffffff',
  },
  'new-year': {
    primary: '#0f1b3d',
    secondary: '#1a2a5e',
    highlight: '#d4af37',
    background: '#0a1030',
    surface: '#141c40',
    textOnPrimary: '#d4af37',
  },
  valentines: {
    primary: '#d6336c',
    secondary: '#c2255c',
    highlight: '#ff6b9d',
    background: '#fff0f5',
    surface: '#ffffff',
    textOnPrimary: '#ffffff',
  },
  summer: {
    primary: '#0e7490',
    secondary: '#0891b2',
    highlight: '#f59e0b',
    background: '#fffbeb',
    surface: '#ffffff',
    textOnPrimary: '#ffffff',
  },
  winter: {
    primary: '#1e3a5f',
    secondary: '#2d5a87',
    highlight: '#7dd3fc',
    background: '#f0f9ff',
    surface: '#ffffff',
    textOnPrimary: '#ffffff',
  },
  spring: {
    primary: '#15803d',
    secondary: '#16a34a',
    highlight: '#ec4899',
    background: '#f0fdf4',
    surface: '#ffffff',
    textOnPrimary: '#ffffff',
  },
  autumn: {
    primary: '#9a3412',
    secondary: '#c2410c',
    highlight: '#f59e0b',
    background: '#fff7ed',
    surface: '#ffffff',
    textOnPrimary: '#ffffff',
  },
  ramadan: {
    primary: '#1e3a8a',
    secondary: '#1e40af',
    highlight: '#d4af37',
    background: '#0c1445',
    surface: '#16205c',
    textOnPrimary: '#d4af37',
  },
  eid: {
    primary: '#065f46',
    secondary: '#047857',
    highlight: '#d4af37',
    background: '#ecfdf5',
    surface: '#ffffff',
    textOnPrimary: '#ffffff',
  },
  halloween: {
    primary: '#7c2d12',
    secondary: '#9a3412',
    highlight: '#f97316',
    background: '#1a0a02',
    surface: '#241005',
    textOnPrimary: '#f97316',
  },
};

const THEME_COPY = {
  default: {
    title: 'DALLI — Kolekcija koja priča vašu priču',
    subtitle: 'Casual i Elegance linije, pažljivo dizajnirane za svaki dan.',
    announcement: '',
    cta: 'Istraži kolekcije',
  },
  'black-friday': {
    title: 'Black Friday — Do -70% na ceo asortiman',
    subtitle: 'Najveća rasprodaja godine. Ograničene količine, nenadmašne cene.',
    announcement: '🖤 Black Friday traje! Besplatna dostava za porudžbine preko 5.000 RSD',
    cta: 'Uhviti popust',
  },
  christmas: {
    title: 'Božićna čarolija u DALLI-ju',
    subtitle: 'Pokloni sa stilom — odabrane kreacije za najlepše trenutke.',
    announcement: '🎄 Božićna akcija — poklon paketi i besplatno pakovanje',
    cta: 'Odaberi poklon',
  },
  'new-year': {
    title: 'Nova Godina, novi stil',
    subtitle: 'Započnite godinu sa kolekcijom koja osvaja.',
    announcement: '🎆 Novogodišnja ponuda — do -50% na selekciju',
    cta: 'Otkrij novitete',
  },
  valentines: {
    title: 'Valentinovo — stil koji govori srcom',
    subtitle: 'Pažljivo odabrani komadi za posebne trenutke.',
    announcement: '💝 Valentine’s kolekcija — pokloni koji oduševljavaju',
    cta: 'Pronađi inspiraciju',
  },
  summer: {
    title: 'Leto počinje ovde',
    subtitle: 'Lagani materijali, vibrantne boje, savršen osećaj.',
    announcement: '☀️ Letnja kolekcija — slobodan povraćaj 30 dana',
    cta: 'Uđi u leto',
  },
  winter: {
    title: 'Zimska elegancija',
    subtitle: 'Topli slojevi, profinjeni detalji, neprikosnoven stil.',
    announcement: '❄️ Zimska kolekcija — besplatna dostava',
    cta: 'Osvajaj zimu',
  },
  spring: {
    title: 'Proleće u svakom koraku',
    subtitle: 'Sveže boje i novi krojevi za novu sezonu.',
    announcement: '🌸 Prolećni noviteti su stigli',
    cta: 'Vidi novitete',
  },
  autumn: {
    title: 'Jesenji tonovi, savršen stil',
    subtitle: 'Bogate teksture i tople nijanse za hladnije dane.',
    announcement: '🍂 Jesenja selekcija — novi komadi svake nedelje',
    cta: 'Istraži jesen',
  },
  ramadan: {
    title: 'Ramazan Mubarak',
    subtitle: 'Elegantna kolekcija za vreme mira i spajanja.',
    announcement: '🌙 Posebna ponuda za Ramazan',
    cta: 'Pogledaj kolekciju',
  },
  eid: {
    title: 'Bajram Šerif Mubarek',
    subtitle: 'Svečani stil za najradosnije dane.',
    announcement: '🎉 Bajramska kolekcija — pokloni sa stilom',
    cta: 'Odaberi svečani stajling',
  },
  halloween: {
    title: 'Noć veštica — tamna strana stila',
    subtitle: 'Dramatični komadi za najhrabrije.',
    announcement: '🎃 Halloween akcija — misteriozni popusti',
    cta: 'Uroni u mrak',
  },
};

export function createThemeConfig(themeId) {
  const meta = THEME_CATALOG.find(t => t.id === themeId) || THEME_CATALOG[0];
  const copy = THEME_COPY[themeId] || THEME_COPY['default'];
  const accents = THEME_ACCENTS[themeId] || THEME_ACCENTS['default'];

  return {
    id: meta.id,
    label: meta.label,
    emoji: meta.emoji,
    accent: { ...accents },
    hero: {
      image: '',
      title: copy.title,
      subtitle: copy.subtitle,
      ctas: [
        { id: 'cta-primary', label: copy.cta, href: '/casual/', variant: 'primary' },
        {
          id: 'cta-secondary',
          label: 'Elegance kolekcija',
          href: '/elegance/',
          variant: 'outline',
        },
      ],
      collectionFocus: 'all',
    },
    banners: [
      {
        id: 'announcement',
        location: 'announcement',
        text: copy.announcement,
        link: '',
        active: true,
      },
    ],
    promotionalText: {
      announcement: copy.announcement,
      homepage: '',
      collection: '',
    },
    collectionSpotlight: themeId === 'default' ? 'both' : 'elegance',
    featuredProducts: [],
    featuredCategories: [],
    homepageCampaign: {
      enabled: false,
      title: '',
      body: '',
      image: '',
      ctaLabel: '',
      ctaHref: '',
    },
    editorial: themeId === 'luxury',
  };
}

export function createDefaultConfig() {
  const themes = {};
  THEME_CATALOG.forEach(t => {
    themes[t.id] = createThemeConfig(t.id);
  });

  return {
    version: EXPERIENCE_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
    activeThemeId: 'default',
    previousThemeId: null,
    scheduledTheme: null,
    previewThemeId: null,
    comparisonThemes: [],
    themes,
    history: [],
    audit: [],
    hero: {
      image: '',
      title: themes['default'].hero.title,
      subtitle: themes['default'].hero.subtitle,
      ctas: [...themes['default'].hero.ctas],
      collectionFocus: 'all',
      overrideTheme: false,
    },
    collections: {
      casual: {
        label: 'CASUAL',
        logo: '',
        hero: {
          image: '',
          title: 'Casual kolekcija',
          subtitle: 'Svakodnevni komodi sa karakterom.',
        },
        featuredProducts: [],
        featuredCategories: [],
        seasonalOverrides: {},
      },
      elegance: {
        label: 'ELEGANCE',
        logo: '',
        hero: {
          image: '',
          title: 'Elegance kolekcija',
          subtitle: 'Prolinjenost za posebne trenutke.',
        },
        featuredProducts: [],
        featuredCategories: [],
        seasonalOverrides: {},
      },
    },
    payments: {
      store: {
        cod: true,
        card: true,
        bankTransfer: true,
        crypto: false,
      },
      // Owner toggle: when false, shipping (postarina) is FREE for crypto payments.
      // true = unchanged behaviour (shipping charged like any other method).
      cryptoShippingPaid: true,
      productOverrides: {},
    },
    paymentIncentives: {
      global: {
        cryptoEnabled: true,
        cryptoDiscountEnabled: true,
        discountType: 'percentage',
        discountValue: 15,
        customMessage: '15% popust kripto',
        customMessageEn: '15% crypto discount',
        appliesTo: 'subtotal',
      },
      countryOverrides: {},
      collectionOverrides: {},
      productOverrides: {},
    },
    concierge: {
      enabled: true,
      conciergeCenterEnabled: true,
      personalShopperEnabled: true,
      styleIntelligenceEnabled: true,
      vipExperiencesEnabled: true,
      clientelingEngineEnabled: true,
    },
    executive: {
      enabled: true,
      executiveIntelligenceEnabled: true,
      businessInsightsEnabled: true,
      forecastingEnabled: true,
      automaticReportsEnabled: true,
      alertsEnabled: true,
    },
    omnichannel: {
      omnichannelEngine: true,
      storeIntegration: true,
      socialCommerce: true,
      warehouseNetwork: true,
      customer360: true,
    },
    api: {
      apiEcosystem: true,
      applicationManager: true,
      marketIntelligenceApi: true,
      keys: {},
    },
    employee: {
      attendanceSystem: true,
      dynamicQrAttendance: true,
      employeeAppReadiness: true,
    },
    fraud: {
      fraudDetectionEngine: true,
      adminAlerts: true,
      ownerOverride: true,
    },
    ai: {
      global: { tryOn: false, viewer360: false, personalization: false, recommendations: false },
      collections: {
        casual: { tryOn: false, viewer360: false, personalization: false, recommendations: false },
        elegance: {
          tryOn: false,
          viewer360: false,
          personalization: false,
          recommendations: false,
        },
      },
      products: {},
    },
    community: {
      reviews: { enabled: true, anonymous: false, minOrder: true },
      photoReviews: { enabled: true, maxPhotos: 5 },
      videoReviews: { enabled: false, maxDurationSeconds: 60 },
      gallery: { enabled: true, autoApprove: false },
      qna: { enabled: true, autoApprove: false },
      moderation: { queue: [], requireApproval: true, autoRejectSpam: true },
    },
    maintenance: {
      enabled: false,
      message: 'Radimo na unapređenju sajta. Vraćamo se vrlo brzo.',
      countdownEnabled: false,
      targetAt: null,
      allowAdminBypass: true,
    },
    luxury: {
      enabled: false,
      emphasis: 'elegance',
      reducePromotions: true,
      editorialLayout: true,
    },
    brand: {
      story: { enabled: true },
      philosophy: { enabled: true },
      mission: { enabled: true },
      values: { enabled: true },
      sustainability: { enabled: true },
      heritage: { enabled: true },
      futureVision: { enabled: true },
      founderMessage: { enabled: true },
      brandManifesto: { enabled: true },
      sustainabilityMessage: { enabled: true },
      luxuryValues: { enabled: true },
      seasonalStory: { enabled: false },
      collectionStory: { enabled: false },
    },
    editorial: {
      enabled: false,
      reducePromotions: true,
      largerStorySections: true,
      moreBrandContent: true,
      moreCollectionPresentation: true,
      hideSaleBadges: true,
      showEditorialNote: true,
    },
    trust: {
      enabled: true,
      blocks: {
        'premium-materials': true,
        'hand-finished': true,
        'limited-production': true,
        sustainability: true,
        'ethical-manufacturing': true,
        'lifetime-quality': true,
      },
    },
    journal: {
      enabled: true,
      categories: {
        'style-guides': true,
        'fashion-intelligence': true,
        collections: true,
        lifestyle: true,
        'product-care': true,
        materials: true,
        editorial: true,
      },
      showEditorialNote: true,
    },
    craftsmanship: {
      enabled: true,
      sections: {
        manufacturing: true,
        designProcess: true,
        qualityStandards: true,
        garmentConstruction: true,
        materialSelection: true,
      },
    },
    materials: {
      enabled: true,
      visible: [
        'organic-cotton',
        'premium-cotton',
        'french-terry',
        'brushed-fleece',
        'linen-blend',
        'merino-wool',
        'future-materials',
      ],
    },
    video: {
      enabled: false,
      lazyLoad: true,
      preload: 'none',
      maxConcurrent: 1,
      videos: {},
    },
    outfits: {
      enabled: true,
      lookRecommendations: true,
      styleRecommendations: true,
      luxuryStylingMode: false,
      completeTheLook: true,
      lookOfTheWeek: true,
    },
    membership: {
      enabled: true,
      earlyAccessEngine: true,
      exclusiveCollections: true,
      vipDashboard: true,
      privateClientProgram: true,
      invitationSystem: false,
      limitedEditionEngine: true,
      tierRules: {},
      releaseRules: {},
      visibility: {
        showLockedCollections: false,
        showComingSoonBadge: true,
      },
    },
    immersive: {
      enabled: true,
      worlds: {
        casual: {
          enabled: true,
          journeySteps: ['discover', 'story', 'materials', 'looks', 'products', 'membership'],
        },
        elegance: {
          enabled: true,
          journeySteps: ['discover', 'story', 'materials', 'looks', 'products', 'membership'],
        },
      },
      collectionWorlds: true,
      signatureMoments: true,
      editorialExperience: true,
      luxuryJourneySystem: true,
      cinematicCollections: true,
      microInteractions: true,
      presentationRules: {
        respectReducedMotion: true,
        defaultDuration: 600,
        defaultEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        maxConcurrentAnimations: 3,
      },
      soundArchitecture: { enabled: false, architectureReady: true },
    },
    global: {
      enabled: true,
      countryActivation: true,
      regionalPricing: true,
      regionalSEO: true,
      regionalCollections: true,
      multiCurrency: true,
      regionalPersonalization: true,
      countries: {
        balkanPriority: ['RS', 'BA', 'ME', 'HR', 'MK', 'SI'],
        dachExpansion: ['DE', 'AT', 'CH'],
        euWestExpansion: ['FR', 'IT'],
        ukExpansion: ['GB'],
        northAmericaExpansion: ['US'],
        middleEastExpansion: ['AE'],
      },
      currencies: {
        enabled: ['RSD', 'BAM', 'EUR', 'MKD', 'CHF', 'GBP', 'USD', 'AED'],
        autoConvert: true,
        baseCurrency: 'EUR',
      },
      languages: {
        enabled: ['sr', 'sr-Latn', 'bs', 'hr', 'mk', 'sl', 'de', 'fr', 'it', 'en', 'ar'],
        autoDetect: true,
        fallback: 'en',
      },
      shipping: {
        controlCenter: true,
        luxuryDelivery: true,
        zonesEnabled: true,
      },
      payments: {
        controlCenter: true,
        perCountryOverrides: true,
        cryptoGlobal: true,
      },
      seo: {
        regionalEngine: true,
        hreflangManagement: true,
        canonicalManagement: true,
        structuredDataPerCountry: true,
      },
      availability: {
        productLevel: true,
        collectionLevel: true,
        elegantMessaging: true,
        alternativesEngine: true,
      },
      analytics: {
        countryRevenue: true,
        countryConversion: true,
        countryAOV: true,
        countryShipping: true,
        countryMembership: true,
      },
      futureReady: {
        europeanExpansion: { architectureReady: true },
        middleEastExpansion: { architectureReady: true },
        northAmericaExpansion: { architectureReady: true },
        globalWarehouses: { architectureReady: true },
        regionalFulfillment: { architectureReady: true },
      },
    },
    // Phase 20.5 - Brand settings (Sector 1)
    brandIdentity: {
      brandName: 'DALLI',
      companyName: 'DALLI d.o.o.',
      businessInfo: '',
      primaryDomain: 'dalli.rs',
      secondaryDomains: [],
      phones: [{ label: 'Glavni telefon', number: '+381 11 2630 123', primary: true }],
      emails: [{ label: 'Opšti kontakt', address: 'hello@dalli.rs', primary: true }],
      address: {
        streetAddress: '',
        addressLocality: '',
        postalCode: '',
        addressCountry: 'RS',
      },
      contactInfo: '',
    },
    // Phase 20.5 - Asset center (Sector 2)
    assets: {
      library: [],
      positions: {
        headerLogo: { assetId: '', alt: 'DALLI' },
        footerLogo: { assetId: '', alt: 'DALLI' },
        mobileLogo: { assetId: '', alt: 'DALLI' },
        darkLogo: { assetId: '', alt: 'DALLI' },
        lightLogo: { assetId: '', alt: 'DALLI' },
        wordmarkLogo: { assetId: '', alt: 'DALLI' },
        iconLogo: { assetId: '', alt: 'DALLI' },
        favicon: { assetId: '', alt: '' },
        appIcon: { assetId: '', alt: '' },
        ogLogo: { assetId: '', alt: '' },
        socialLogo: { assetId: '', alt: '' },
      },
    },
    // Phase 20.5 - Domain manager (Sector 1 / Domain Manager)
    domains: {
      primary: { domain: 'dalli.rs', language: 'sr', currency: 'RSD' },
      list: [
        {
          domain: 'dalli.rs',
          enabled: true,
          primary: true,
          language: 'sr',
          currency: 'RSD',
          seoOverride: '',
          regionalRules: '',
        },
        {
          domain: 'dalli.rs-lat',
          enabled: true,
          primary: false,
          language: 'sr-Latn',
          currency: 'RSD',
          seoOverride: '',
          regionalRules: '',
        },
        {
          domain: 'dalli.ba',
          enabled: false,
          primary: false,
          language: 'bs',
          currency: 'BAM',
          seoOverride: '',
          regionalRules: '',
        },
        {
          domain: 'dalli.me',
          enabled: false,
          primary: false,
          language: 'sr-Latn',
          currency: 'EUR',
          seoOverride: '',
          regionalRules: '',
        },
        {
          domain: 'dalli.hr',
          enabled: false,
          primary: false,
          language: 'hr',
          currency: 'EUR',
          seoOverride: '',
          regionalRules: '',
        },
        {
          domain: 'dalli.de',
          enabled: false,
          primary: false,
          language: 'de',
          currency: 'EUR',
          seoOverride: '',
          regionalRules: '',
        },
        {
          domain: 'dalli.at',
          enabled: false,
          primary: false,
          language: 'de',
          currency: 'EUR',
          seoOverride: '',
          regionalRules: '',
        },
        {
          domain: 'dalli.ch',
          enabled: false,
          primary: false,
          language: 'de',
          currency: 'CHF',
          seoOverride: '',
          regionalRules: '',
        },
      ],
    },
    // Phase 20.5 - Finance center (Sector 3)
    finance: {
      bankAccounts: [],
      cryptoWallets: [],
      cardDepositAccounts: [],
      taxProfiles: { vatRules: '', countryVat: {} },
      regionalRules: { vat: {}, customs: {} },
      invoices: {
        template: 'default',
        numberingPrefix: 'INV',
        showVat: true,
        footerNote: '',
        regions: {},
      },
      paymentInstructions: '',
      refundRules: '',
    },
    // Phase 20.5 - Treasury & reconciliation (Sector 3 expansion)
    treasury: {
      ledger: [],
      reconciliation: { lastRunAt: null, matched: 0, unmatched: 0, autoMatch: true },
      reports: {
        dailyScale: 0,
        weeklyScale: 0,
        monthlyScale: 0,
        quarterlyScale: 0,
        yearlyScale: 0,
      },
    },
    // Phase 20.5 - Communication center (Sector 4)
    communication: {
      emails: [
        { address: 'support@dalli.rs', roles: ['support', 'returns'], primary: true },
        { address: 'orders@dalli.rs', roles: ['orders'], primary: false },
        { address: 'marketing@dalli.rs', roles: ['marketing'], primary: false },
        { address: 'vip@dalli.rs', roles: ['vip', 'membership'], primary: false },
        { address: 'returns@dalli.rs', roles: ['returns'], primary: false },
        { address: 'finance@dalli.rs', roles: ['finance', 'operations'], primary: false },
      ],
      phones: [
        { label: 'Glavni telefon', number: '+381 11 2630 123', kind: 'primary', primary: true },
        { label: 'VIP linija', number: '+381 60 000 0000', kind: 'vip', primary: false },
      ],
    },
    // Phase 20.5 - Stores (Sector 5)
    stores: [],
    // Phase 20.5 - Warehouses (Sector 6)
    warehouses: [],
    // Phase 20.5 - Shipping center (Sector 7). Courier toggles merged over live data/shipping.json at runtime.
    shipping: {
      couriers: {},
      zonesEnabled: true,
      tracking: { customerNotifications: true, ownerControlled: true },
    },
    // Phase 20.5 - Social media center (Sector 9)
    social: {
      accounts: [
        {
          platform: 'instagram',
          handle: 'dalli.rs',
          url: 'https://instagram.com/dalli.rs',
          scope: 'casual',
          primary: true,
        },
        {
          platform: 'instagram',
          handle: 'dalli.elegance',
          url: 'https://instagram.com/dalli.elegance',
          scope: 'elegance',
          primary: false,
        },
        {
          platform: 'facebook',
          handle: 'dalli.rs',
          url: 'https://facebook.com/dalli.rs',
          scope: 'global',
          primary: true,
        },
        {
          platform: 'tiktok',
          handle: 'dalli.rs',
          url: 'https://tiktok.com/@dalli.rs',
          scope: 'global',
          primary: false,
        },
        {
          platform: 'pinterest',
          handle: 'dalli.rs',
          url: 'https://pinterest.com/dalli.rs',
          scope: 'elegance',
          primary: false,
        },
        {
          platform: 'youtube',
          handle: 'DALLI',
          url: 'https://youtube.com/@DALLI',
          scope: 'global',
          primary: false,
        },
        {
          platform: 'linkedin',
          handle: 'dalli',
          url: 'https://linkedin.com/company/dalli',
          scope: 'global',
          primary: false,
        },
        {
          platform: 'x',
          handle: 'dalli.rs',
          url: 'https://x.com/dalli.rs',
          scope: 'global',
          primary: false,
        },
        {
          platform: 'threads',
          handle: 'dalli.rs',
          url: 'https://threads.net/@dalli.rs',
          scope: 'global',
          primary: false,
        },
      ],
      platforms: [
        'instagram',
        'facebook',
        'tiktok',
        'pinterest',
        'youtube',
        'linkedin',
        'x',
        'threads',
      ],
      scopes: ['global', 'casual', 'elegance', 'country', 'collection'],
    },
    // Marketing / Ads API credentials (owner-only secret, never exposed publicly).
    // Multiple accounts per provider — the owner pastes tokens/keys copied from
    // each platform (Meta, Google Ads, TikTok, ...) and future accounts.
    integrations: {
      social: {
        instagram: [],
        facebook: [],
        tiktok: [],
        youtube: [],
        pinterest: [],
        linkedin: [],
        x: [],
        threads: [],
      },
      ads: {
        google: [],
        meta: [],
        tiktok: [],
      },
    },
    // Phase 20.5 - Operations center (Sector 10)
    operations: {
      holiday: {
        enabled: false,
        startAt: '',
        endAt: '',
        message: '',
        suspendShipping: false,
        suspendOrders: false,
        customerNotice: '',
        countdown: false,
      },
      notices: [],
      orderPause: { enabled: false, message: '' },
      shippingPause: { enabled: false, message: '' },
    },
    // Phase 20.5 - Permissions mirror (Sector 11, read-only from Core RBAC)
    permissions: {
      policy: {
        manageBrand: false,
        manageFinance: false,
        manageDomains: false,
        manageThemes: false,
        managePayments: false,
        manageStores: false,
        manageExpansion: false,
        manageMembership: false,
        manageExperience: false,
      },
      audit: [],
    },
  };
}

export function deepMerge(base, override) {
  if (Array.isArray(override)) return override.slice();
  if (override === null || typeof override !== 'object') {
    return override === undefined ? base : override;
  }
  if (base === null || typeof base !== 'object' || Array.isArray(base)) {
    return deepMerge(createEmptyLike(override), override);
  }
  const result = { ...base };
  Object.keys(override).forEach(key => {
    result[key] = deepMerge(base[key], override[key]);
  });
  return result;
}

function createEmptyLike(sample) {
  return Array.isArray(sample) ? [] : {};
}

export function stripTags(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function sanitizeConfigText(node) {
  if (typeof node === 'string') return stripTags(node);
  if (Array.isArray(node)) return node.map(sanitizeConfigText);
  if (node && typeof node === 'object') {
    const out = {};
    Object.keys(node).forEach(key => {
      out[key] = sanitizeConfigText(node[key]);
    });
    return out;
  }
  return node;
}

export function getPublicSlice(config) {
  if (!config) return null;
  const activeTheme = config.themes ? config.themes[config.activeThemeId] : null;

  return {
    version: config.version,
    updatedAt: config.updatedAt,
    activeThemeId: config.activeThemeId,
    activeTheme: activeTheme || null,
    scheduledTheme: config.scheduledTheme || null,
    previewThemeId: config.previewThemeId || null,
    comparisonThemes: Array.isArray(config.comparisonThemes) ? config.comparisonThemes : [],
    hero: config.hero || null,
    collections: config.collections || null,
    maintenance: config.maintenance || null,
    luxury: config.luxury || null,
    // Phase 20.5 - public, storefront-consumed sectors
    brandIdentity: config.brandIdentity || null,
    assets: config.assets || null,
    domains: config.domains || null,
    communication: config.communication || null,
    stores: Array.isArray(config.stores) ? config.stores : null,
    shipping: config.shipping || null,
    social: config.social || null,
    payments: config.payments
      ? {
          store: config.payments.store || null,
          cryptoShippingPaid: config.payments.cryptoShippingPaid !== false,
        }
      : null,
    operations: config.operations || null,
  };
}

export function isThemeAction(action) {
  return OWNER_ONLY_ACTIONS.includes(action);
}

export function validateSection(section, data) {
  if (!SECTION_KEYS.includes(section)) {
    return { ok: false, error: `Nepoznata sekcija: ${section}` };
  }
  if (data === undefined || data === null || typeof data !== 'object') {
    return { ok: false, error: 'Podaci moraju biti objekat' };
  }
  if (section === 'themes') {
    const id = data.id;
    if (!id || !THEME_CATALOG.some(t => t.id === id)) {
      return { ok: false, error: 'Nepoznata tema' };
    }
  }
  return { ok: true };
}

export function makeHistoryEntry(action, themeId, by) {
  return {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    action,
    themeId,
    by: by || 'unknown',
  };
}
