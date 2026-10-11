/**
 * DALLI Internationalization & Localization
 * Multi-language, multi-currency, geo-IP, RTL support
 */

export class I18n {
  static init() {
    this.initLanguageDetection();
    this.initCurrencyDetection();
    this.initGeoDetection();
    this.initRTLSupport();
    this.initDateTimeFormatting();
    this.initNumberFormatting();
    this.initTranslationSystem();
  }

  // ============================================================
  // LANGUAGE DETECTION & MANAGEMENT
  // ============================================================
  static initLanguageDetection() {
    // Supported languages
    this.languages = {
      'sr-Cyrl': { name: 'Српски (ћирилица)', nativeName: 'Српски (ћирилица)', rtl: false, locale: 'sr-RS' },
      'sr-Latn': { name: 'Srpski (latinica)', nativeName: 'Srpski (latinica)', rtl: false, locale: 'sr-RS' },
      'en': { name: 'English', nativeName: 'English', rtl: false, locale: 'en-US' },
      'de': { name: 'Deutsch', nativeName: 'Deutsch', rtl: false, locale: 'de-DE' },
      'fr': { name: 'Français', nativeName: 'Français', rtl: false, locale: 'fr-FR' },
      'it': { name: 'Italiano', nativeName: 'Italiano', rtl: false, locale: 'it-IT' },
      'es': { name: 'Español', nativeName: 'Español', rtl: false, locale: 'es-ES' },
      'ar': { name: 'العربية', nativeName: 'العربية', rtl: true, locale: 'ar-SA' },
      'he': { name: 'עברית', nativeName: 'עברית', rtl: true, locale: 'he-IL' }
    };

    // Detect language
    this.detectLanguage();

    // Language switcher
    this.initLanguageSwitcher();

    // Listen for language changes
    window.addEventListener('i18n:language-change', (e) => {
      this.setLanguage(e.detail.language);
    });
  }

  static detectLanguage() {
    // Priority: localStorage > browser navigator > default
    const saved = localStorage.getItem('dalli_language');
    if (saved && this.languages[saved]) {
      this.setLanguage(saved);
      return;
    }

    // Browser language detection
    const browserLang = navigator.language || navigator.userLanguage;
    const matched = this.matchLanguage(browserLang);
    this.setLanguage(matched);
  }

  static matchLanguage(browserLang) {
    const lang = browserLang.toLowerCase();
    
    // Direct match
    if (this.languages[lang]) return lang;
    
    // Partial match (e.g., 'sr-RS' -> 'sr-Cyrl')
    const baseLang = lang.split('-')[0];
    for (const [code, data] of Object.entries(this.languages)) {
      if (code.startsWith(baseLang + '-') || code === baseLang) {
        return code;
      }
    }

    // Serbian variants
    if (baseLang === 'sr') {
      // Default to Cyrillic for Serbian
      return 'sr-Cyrl';
    }

    return 'en'; // Default fallback
  }

  static setLanguage(langCode) {
    if (!this.languages[langCode]) return false;

    const lang = this.languages[langCode];
    
    // Update HTML lang attribute
    document.documentElement.lang = lang.locale;
    document.documentElement.setAttribute('data-lang', langCode);
    document.documentElement.setAttribute('dir', lang.rtl ? 'rtl' : 'ltr');

    // Update document direction for RTL
    document.body.style.direction = lang.rtl ? 'rtl' : 'ltr';

    // Save to localStorage
    localStorage.setItem('dalli_language', langCode);

    // Update language switcher UI
    this.updateLanguageSwitcher(langCode);

    // Dispatch event
    window.dispatchEvent(new CustomEvent('i18n:language-change', {
      detail: { language: langCode, locale: lang.locale, rtl: lang.rtl }
    }));

    // Reload translations
    this.loadTranslations(langCode);

    return true;
  }

  static initLanguageSwitcher() {
    const trigger = document.getElementById('languageSwitcher');
    const dropdown = document.getElementById('languageDropdown');

    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.toggle('open');
      trigger.setAttribute('aria-expanded', dropdown.classList.contains('open'));
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

    // Language options
    dropdown.querySelectorAll('[data-lang]').forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lang = option.dataset.lang;
        this.setLanguage(lang);
        dropdown.classList.remove('open');
      });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdown.classList.remove('open');
      }
    });
  }

  static updateLanguageSwitcher(langCode) {
    const trigger = document.getElementById('languageSwitcher');
    const dropdown = document.getElementById('languageDropdown');
    
    if (trigger) {
      const lang = this.languages[langCode];
      if (lang) {
        trigger.innerHTML = `
          <span class="lang-flag">${this.getLanguageFlag(langCode)}</span>
          <span class="lang-name">${lang.nativeName}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        `;
      }
    }

    // Update active state in dropdown
    document.querySelectorAll('[data-lang]').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === langCode);
      opt.setAttribute('aria-selected', opt.dataset.lang === langCode);
    });
  }

  static getLanguageFlag(langCode) {
    const flags = {
      'sr-Cyrl': '🇷🇸',
      'sr-Latn': '🇷🇸',
      'en': '🇬🇧',
      'de': '🇩🇪',
      'fr': '🇫🇷',
      'it': '🇮🇹',
      'es': '🇪🇸',
      'ar': '🇸🇦',
      'he': '🇮🇱'
    };
    return flags[langCode] || '🌐';
  }

  // ============================================================
  // TRANSLATION SYSTEM
  // ============================================================
  static async loadTranslations(langCode) {
    try {
      // Try to load from server
      const response = await fetch(`/locales/${langCode}.json`);
      if (response.ok) {
        this.translations = await response.json();
      } else {
        // Fallback to embedded translations
        this.translations = this.getEmbeddedTranslations(langCode);
      }
    } catch (e) {
      this.translations = this.getEmbeddedTranslations(langCode);
    }

    // Apply translations to DOM
    this.applyTranslations();
  }

  static getEmbeddedTranslations(langCode) {
    // Fallback translations for critical UI
    const translations = {
      'sr-Cyrl': {
        'home': 'Почетна',
        'products': 'Производи',
        'cart': 'Корпа',
        'checkout': 'Направи поручу',
        'login': 'Пријава',
        'register': 'Регистрација',
        'profile': 'Профил',
        'orders': 'Наруџбине',
        'wishlist': 'Lista жеља',
        'search': 'Претрага',
        'categories': 'Категорије',
        'men': 'Мушка gardероба',
        'women': 'Женска gardероба',
        'hoodies': 'Дуксеви',
        'cart_empty': 'Ваша корпа је празна',
        'add_to_cart': 'Додај у корпу',
        'buy_now': 'Купи odmа',
        'price': 'Цена',
        'sale': 'Акција',
        'new': 'Ново',
        'bestseller': 'Бестселер',
        'out_of_stock': 'Нема на стању',
        'size': 'Величина',
        'color': 'Boja',
        'quantity': 'Количина',
        'total': 'Укупно',
        'subtotal': 'Међузбир',
        'shipping': 'Доставка',
        'discount': 'Попуст',
        'total': 'Укупно за плаћање',
        'continue_shopping': 'Наставите куповину',
        'proceed_checkout': 'Наставите на чекaут',
        'email': 'Email',
        'password': 'Лозинка',
        'forgot_password': 'Заборавили сте лозинку?',
        'remember_me': 'Запамти ме',
        'login': 'Пријавите се',
        'register': 'Региструјте се',
        'logout': 'Одјавите се',
        'my_account': 'Мој налог',
        'my_orders': 'Моје наредбине',
        'my_wishlist': 'Моја листа жеља',
        'settings': 'Подешавања',
        'language': 'Језик',
        'currency': 'Валута',
        'theme': 'Тема',
        'dark_mode': 'Тамна тема',
        'light_mode': 'Светла тема',
        'system_default': 'Системска подразумевана',
        'crypto_discount': '15% попуст за крипто плаћање',
        'free_shipping_over': 'Бесплатна dostava за порудžбине preko 5.000 RSD',
        'free_returns': '30 дана за враћање',
        'secure_payment': 'Sigурно плаћање',
        'support': 'Подршка',
        'contact_us': 'Kонтактирајте нас',
        'privacy_policy': 'Politika privatnosti',
        'terms_of_service': 'Uslovi korišćenja',
        'cookie_policy': 'Politika kolačića'
      },
      'sr-Latn': {
        'home': 'Početna',
        'products': 'Proizvodi',
        'cart': 'Korpa',
        'checkout': 'Naruči',
        'login': 'Prijava',
        'register': 'Registracija',
        'profile': 'Profil',
        'orders': 'Narudžbine',
        'wishlist': 'Lista želja',
        'search': 'Pretraga',
        'categories': 'Kategorije',
        'men': 'Muška garderoba',
        'women': 'Ženska garderoba',
        'hoodies': 'Duksevi',
        'cart_empty': 'Vaša korpa je prazna',
        'add_to_cart': 'Dodaj u korpu',
        'buy_now': 'Kupi odmah',
        'price': 'Cena',
        'sale': 'Akcija',
        'new': 'Novo',
        'bestseller': 'Bestseller',
        'out_of_stock': 'Nema na stanju',
        'size': 'Veličina',
        'color': 'Boja',
        'quantity': 'Količina',
        'total': 'Ukupno',
        'subtotal': 'Međuzbir',
        'shipping': 'Dostava',
        'discount': 'Popust',
        'total': 'Ukupno za plaćanje',
        'continue_shopping': 'Nastavite kupovinu',
        'proceed_checkout': 'Nastavite na čekaut',
        'email': 'Email',
        'password': 'Lozinka',
        'forgot_password': 'Zaboravili ste lozinku?',
        'remember_me': 'Zapamti me',
        'login': 'Prijavite se',
        'register': 'Registrujte se',
        'logout': 'Odjavite se',
        'my_account': 'Moj nalog',
        'my_orders': 'Moje narudžbine',
        'my_wishlist': 'Moja lista želja',
        'settings': 'Podešavanja',
        'language': 'Jezik',
        'currency': 'Valuta',
        'theme': 'Tema',
        'dark_mode': 'Tamna tema',
        'light_mode': 'Svetla tema',
        'system_default': 'Sistemska podrazumevana',
        'crypto_discount': '15% popust za kripto plaćanje',
        'free_shipping_over': 'Besplatna dostava za porudžbine preko 5.000 RSD',
        'free_returns': '30 dana za vraćanje',
        'secure_payment': 'Sigurno plaćanje',
        'support': 'Podrška',
        'contact_us': 'Kontaktirajte nas',
        'privacy_policy': 'Politika privatnosti',
        'terms_of_service': 'Uslovi korišćenja',
        'cookie_policy': 'Politika kolačića'
      },
      'en': {
        'home': 'Home',
        'products': 'Products',
        'cart': 'Cart',
        'checkout': 'Checkout',
        'login': 'Login',
        'register': 'Register',
        'profile': 'Profile',
        'orders': 'Orders',
        'wishlist': 'Wishlist',
        'search': 'Search',
        'categories': 'Categories',
        'men': 'Men\'s Collection',
        'women': 'Women\'s Collection',
        'hoodies': 'Hoodies',
        'cart_empty': 'Your cart is empty',
        'add_to_cart': 'Add to Cart',
        'buy_now': 'Buy Now',
        'price': 'Price',
        'sale': 'Sale',
        'new': 'New',
        'bestseller': 'Bestseller',
        'out_of_stock': 'Out of Stock',
        'size': 'Size',
        'color': 'Color',
        'quantity': 'Quantity',
        'total': 'Total',
        'subtotal': 'Subtotal',
        'shipping': 'Shipping',
        'discount': 'Discount',
        'total': 'Total',
        'continue_shopping': 'Continue Shopping',
        'proceed_checkout': 'Proceed to Checkout',
        'email': 'Email',
        'password': 'Password',
        'forgot_password': 'Forgot Password?',
        'remember_me': 'Remember Me',
        'login': 'Sign In',
        'register': 'Sign Up',
        'logout': 'Sign Out',
        'my_account': 'My Account',
        'my_orders': 'My Orders',
        'my_wishlist': 'My Wishlist',
        'settings': 'Settings',
        'language': 'Language',
        'currency': 'Currency',
        'theme': 'Theme',
        'dark_mode': 'Dark Mode',
        'light_mode': 'Light Mode',
        'system_default': 'System Default',
        'crypto_discount': '15% off with crypto payment',
        'free_shipping_over': 'Free shipping over 5.000 RSD',
        'free_returns': '30-day returns',
        'secure_payment': 'Secure Payment',
        'support': 'Support',
        'contact_us': 'Contact Us',
        'privacy_policy': 'Privacy Policy',
        'terms_of_service': 'Terms of Service',
        'cookie_policy': 'Cookie Policy'
      },
      'de': {
        'home': 'Startseite',
        'products': 'Produkte',
        'cart': 'Warenkorb',
        'checkout': 'Zur Kasse',
        'login': 'Anmelden',
        'register': 'Registrieren',
        'profile': 'Profil',
        'orders': 'Bestellungen',
        'wishlist': 'Wunschliste',
        'search': 'Suche',
        'categories': 'Kategorien',
        'men': 'Herren',
        'women': 'Damen',
        'hoodies': 'Hoodies',
        'cart_empty': 'Ihr Warenkorb ist leer',
        'add_to_cart': 'In den Warenkorb',
        'buy_now': 'Jetzt kaufen',
        'price': 'Preis',
        'sale': 'Sale',
        'new': 'Neu',
        'bestseller': 'Bestseller',
        'out_of_stock': 'Nicht verfügbar',
        'size': 'Größe',
        'color': 'Farbe',
        'quantity': 'Menge',
        'total': 'Gesamt',
        'subtotal': 'Zwischensumme',
        'shipping': 'Versand',
        'discount': 'Rabatt',
        'total': 'Gesamt',
        'continue_shopping': 'Weiter einkaufen',
        'proceed_checkout': 'Zur Kasse gehen',
        'email': 'E-Mail',
        'password': 'Passwort',
        'forgot_password': 'Passwort vergessen?',
        'remember_me': 'Angemeldet bleiben',
        'login': 'Anmelden',
        'register': 'Registrieren',
        'logout': 'Abmelden',
        'my_account': 'Mein Konto',
        'my_orders': 'Meine Bestellungen',
        'my_wishlist': 'Meine Wunschliste',
        'settings': 'Einstellungen',
        'language': 'Sprache',
        'currency': 'Währung',
        'theme': 'Thema',
        'dark_mode': 'Dunkler Modus',
        'light_mode': 'Heller Modus',
        'system_default': 'Systemstandard',
        'crypto_discount': '15% Rabatt bei Krypto-Zahlung',
        'free_shipping_over': 'Kostenloser Versand ab 5.000 RSD',
        'free_returns': '30 Tage Rückgabe',
        'secure_payment': 'Sichere Zahlung',
        'support': 'Support',
        'contact_us': 'Kontakt',
        'privacy_policy': 'Datenschutz',
        'terms_of_service': 'AGB',
        'cookie_policy': 'Cookie-Richtlinie'
      }
    };

    return translations[langCode] || translations['en'];
  }

  static applyTranslations() {
    if (!this.translations) return;

    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (this.translations[key]) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = this.translations[key];
        } else {
          el.textContent = this.translations[key];
        }
      }
    });

    // Translate elements with data-i18n-attr attribute
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const attrs = el.dataset.i18nAttr.split(',');
      attrs.forEach(attr => {
        const key = el.dataset[`i18n${attr.charAt(0).toUpperCase() + attr.slice(1)}`];
        if (key && this.translations[key]) {
          el.setAttribute(attr, this.translations[key]);
        }
      });
    });
  }

  static t(key, params = {}) {
    if (!this.translations) return key;
    let translation = this.translations[key] || key;
    
    // Replace parameters
    Object.entries(params).forEach(([key, value]) => {
      translation = translation.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    
    return translation;
  }

  // ============================================================
  // CURRENCY DETECTION & FORMATTING
  // ============================================================
  static initCurrencyDetection() {
    this.currencies = {
      'RSD': { code: 'RSD', symbol: 'RSD', locale: 'sr-RS', decimals: 0, symbolPosition: 'after' },
      'EUR': { code: 'EUR', symbol: '€', locale: 'de-DE', decimals: 2, symbolPosition: 'before' },
      'USD': { code: 'USD', symbol: '$', locale: 'en-US', decimals: 2, symbolPosition: 'before' },
      'BTC': { code: 'BTC', symbol: '₿', locale: 'en-US', decimals: 8, symbolPosition: 'before' },
      'ETH': { code: 'ETH', symbol: 'Ξ', locale: 'en-US', decimals: 6, symbolPosition: 'before' },
      'USDT': { code: 'USDT', symbol: '₮', locale: 'en-US', decimals: 2, symbolPosition: 'before' },
      'USDC': { code: 'USDC', symbol: '$', locale: 'en-US', decimals: 2, symbolPosition: 'before' }
    };

    // Detect currency
    this.detectCurrency();

    // Currency switcher
    this.initCurrencySwitcher();
  }

  static detectCurrency() {
    const saved = localStorage.getItem('dalli_currency');
    if (saved && this.currencies[saved]) {
      this.setCurrency(saved);
      return;
    }

    // Geo-IP based detection (would be server-side in production)
    // For now, default to RSD for Serbian market
    this.setCurrency('RSD');
  }

  static setCurrency(currencyCode) {
    if (!this.currencies[currencyCode]) return false;

    this.currentCurrency = currencyCode;
    localStorage.setItem('dalli_currency', currencyCode);

    // Update currency switcher UI
    this.updateCurrencySwitcher(currencyCode);

    // Dispatch event
    window.dispatchEvent(new CustomEvent('i18n:currency-change', {
      detail: { currency: currencyCode, ...this.currencies[currencyCode] }
    }));

    return true;
  }

  static initCurrencySwitcher() {
    const trigger = document.getElementById('currencySwitcher');
    const dropdown = document.getElementById('currencyDropdown');

    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.toggle('open');
      trigger.setAttribute('aria-expanded', dropdown.classList.contains('open'));
    });

    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

    dropdown.querySelectorAll('[data-currency]').forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setCurrency(option.dataset.currency);
        dropdown.classList.remove('open');
      });
    });
  }

  static updateCurrencySwitcher(currencyCode) {
    const trigger = document.getElementById('currencySwitcher');
    const dropdown = document.getElementById('currencyDropdown');

    if (trigger && this.currencies[currencyCode]) {
      const currency = this.currencies[currencyCode];
      trigger.innerHTML = `
        <span class="currency-symbol">${currency.symbol}</span>
        <span class="currency-code">${currency.code}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;
    }

    document.querySelectorAll('[data-currency]').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.currency === currencyCode);
      opt.setAttribute('aria-selected', opt.dataset.currency === currencyCode);
    });
  }

  static formatPrice(amount, currencyCode = null) {
    const currency = this.currencies[currencyCode || this.currentCurrency || 'RSD'];
    amount = Number(amount);
    
    const formatter = new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals
    });

    // Custom formatting for crypto
    if (['BTC', 'ETH', 'USDT', 'USDC'].includes(currency.code)) {
      return `${currency.symbol}${amount.toFixed(currency.decimals)}`;
    }

    return formatter.format(amount);
  }

  // ============================================================
  // GEO-IP DETECTION
  // ============================================================
  static async initGeoDetection() {
    // Check if already detected
    if (localStorage.getItem('dalli_geo_detected')) return;

    try {
      // In production, this would call a geo-IP service
      // For now, simulate with a mock
      const geoData = await this.fetchGeoData();
      this.applyGeoData(geoData);
    } catch (e) {
      console.warn('Geo detection failed:', e);
    }
  }

  static async fetchGeoData() {
    // In production, call a geo-IP API
    // For demo, return Serbian market defaults
    return {
      country: 'RS',
      countryName: 'Serbia',
      currency: 'RSD',
      language: 'sr-Cyrl',
      timezone: 'Europe/Belgrade',
      region: 'Vojvodina',
      city: 'Novi Sad',
      timezoneOffset: 3600
    };
  }

  static applyGeoData(geoData) {
    // Set currency based on country
    const currencyMap = {
      'RS': 'RSD', 'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
      'US': 'USD', 'GB': 'GBP', 'BA': 'BAM', 'HR': 'EUR', 'ME': 'EUR',
      'MK': 'MKD', 'SI': 'EUR', 'AL': 'ALL', 'XK': 'EUR'
    };

    const currency = currencyMap[geoData.country] || 'EUR';
    const languageMap = {
      'RS': 'sr-Cyrl', 'DE': 'de', 'FR': 'fr', 'IT': 'it', 'ES': 'es',
      'US': 'en', 'GB': 'en', 'BA': 'sr-Latn', 'HR': 'hr', 'ME': 'sr-Latn',
      'MK': 'mk', 'SI': 'sl', 'AL': 'sq', 'XK': 'sq'
    };

    const language = languageMap[geoData.country] || 'en';

    // Apply if not manually set
    if (!localStorage.getItem('dalli_currency')) {
      this.setCurrency(currency);
    }
    if (!localStorage.getItem('dalli_language')) {
      this.setLanguage(language);
    }

    // Store geo data
    localStorage.setItem('dalli_geo', JSON.stringify(geoData));
  }

  // ============================================================
  // DATE/TIME & NUMBER FORMATTING
  // ============================================================
  static initDateTimeFormatting() {
    this.dateTimeFormats = {
      short: { dateStyle: 'short' },
      medium: { dateStyle: 'medium' },
      long: { dateStyle: 'long' },
      full: { dateStyle: 'full' },
      timeShort: { timeStyle: 'short' },
      timeMedium: { timeStyle: 'medium' },
      dateTimeShort: { dateStyle: 'short', timeStyle: 'short' },
      dateTimeMedium: { dateStyle: 'medium', timeStyle: 'medium' },
      relative: { style: 'relative', unit: 'day' }
    };
  }

  static formatDate(date, format = 'medium', locale = null) {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    locale = locale || this.getLocaleForLanguage();
    format = this.dateTimeFormats[format] || this.dateTimeFormats.medium;
    
    try {
      return new Intl.DateTimeFormat(locale, format).format(dateObj);
    } catch (e) {
      return dateObj.toLocaleDateString(locale);
    }
  }

  static formatRelativeTime(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    const now = Date.now();
    const diff = now - dateObj.getTime();
    const seconds = Math.floor(Math.abs(dateObj - new Date()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    const t = this.translations || {};
    const lang = localStorage.getItem('dalli_language') || 'en';

    if (seconds < 60) return t['just_now'] || 'Upravo sada';
    if (minutes < 60) return `${minutes} ${t['min_ago'] || 'min'}${t['ago_suffix'] || ''}`;
    if (hours < 24) return `${hours} ${t['hours_ago'] || 'h'}`;
    if (days < 7) return `${days} ${t['days_ago'] || 'd'}`;
    if (weeks < 4) return `${weeks} ${t['weeks_ago'] || 'ned'}`;
    if (months < 12) return `${months} ${t['months_ago'] || 'mes'}`;
    return `${years} ${t['years_ago'] || 'god'}`;
  }

  static initNumberFormatting() {
    this.numberFormats = {
      decimal: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      currency: { style: 'currency', currency: 'RSD' },
      percent: { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 },
      compact: { notation: 'compact', maximumFractionDigits: 1 }
    };
  }

  static formatNumber(value, format = 'decimal', locale = null) {
    locale = locale || this.getLocaleForLanguage();
    format = this.numberFormats[format] || this.numberFormats.decimal;

    try {
      return new Intl.NumberFormat(locale, format).format(value);
    } catch (e) {
      return value.toString();
    }
  }

  static getLocaleForLanguage() {
    const lang = localStorage.getItem('dalli_language') || 'sr-Cyrl';
    const langData = this.languages[lang];
    return langData?.locale || 'sr-RS';
  }

  // ============================================================
  // RTL SUPPORT
  // ============================================================
  static initRTLSupport() {
    // Monitor language changes for RTL
    window.addEventListener('i18n:language-change', (e) => {
      this.updateRTL(e.detail.rtl);
    });

    // Initial RTL check
    const lang = localStorage.getItem('dalli_language') || 'sr-Cyrl';
    const langData = this.languages[lang];
    this.updateRTL(langData?.rtl || false);
  }

  static updateRTL(isRTL) {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.body.style.direction = isRTL ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

    // Add RTL class to body for CSS targeting
    document.body.classList.toggle('rtl', isRTL);
    document.body.classList.toggle('ltr', !isRTL);

    // Update CSS logical properties if needed
    document.documentElement.style.setProperty('--direction', isRTL ? 'rtl' : 'ltr');

    // Update scroll direction for carousels
    document.querySelectorAll('[data-rtl-aware]').forEach(el => {
      el.style.direction = isRTL ? 'rtl' : 'ltr';
    });
  }

  // ============================================================
  // REGIONAL SETTINGS (Shipping, Tax, Payment)
  // ============================================================
  static initRegionalSettings() {
    this.regions = {
      'RS': {
        country: 'RS',
        name: 'Serbia',
        currency: 'RSD',
        taxRate: 0.20, // 20% PDV
        shippingZones: [
          { id: 'belgrade', name: 'Beograd', price: 0, freeThreshold: 5000 },
          { id: 'vojvodina', name: 'Vojvodina', price: 290, freeThreshold: 5000 },
          { id: 'centralna', name: 'Centralna Srbija', price: 350, freeThreshold: 5000 },
          { id: 'jug', name: 'Južna Srbija', price: 390, freeThreshold: 5000 },
          { id: 'kosovo', name: 'Kosovo i Metohija', price: 490, freeThreshold: 5000 }
        ],
        paymentMethods: ['card', 'cash_on_delivery', 'bank_transfer', 'crypto'],
        carriers: ['post_express', 'gls', 'dhl', 'ups']
      },
      'BA': {
        country: 'BA',
        name: 'Bosnia and Herzegovina',
        currency: 'BAM',
        taxRate: 0.17,
        shippingZones: [
          { id: 'sarajevo', name: 'Sarajevo', price: 15, freeThreshold: 100 },
          { id: 'bih_other', name: 'Ostala BiH', price: 25, freeThreshold: 200 }
        ],
        paymentMethods: ['card', 'cash_on_delivery', 'bank_transfer'],
        carriers: ['post_bh', 'dhl', 'gls']
      },
      'HR': {
        country: 'HR',
        name: 'Croatia',
        currency: 'EUR',
        taxRate: 0.25,
        shippingZones: [
          { id: 'zagreb', name: 'Zagreb', price: 30, freeThreshold: 300 },
          { id: 'hr_other', name: 'Ostala Hrvatska', price: 45, freeThreshold: 500 }
        ],
        paymentMethods: ['card', 'bank_transfer', 'crypto'],
        carriers: ['hp_posta', 'dpd', 'gls']
      },
      'DE': {
        country: 'DE',
        name: 'Germany',
        currency: 'EUR',
        taxRate: 0.19,
        shippingZones: [
          { id: 'de_national', name: 'Deutschland', price: 4.99, freeThreshold: 50 }
        ],
        paymentMethods: ['card', 'bank_transfer', 'paypal', 'klarna'],
        carriers: ['dhl', 'dpd', 'hermes']
      }
    };

    // Detect region from geo data
    const geoData = JSON.parse(localStorage.getItem('dalli_geo') || '{}');
    this.currentRegion = this.regions[geoData.country] || this.regions['RS'];
  }

  static getCurrentRegion() {
    return this.currentRegion;
  }

  static getShippingZones() {
    return this.currentRegion?.shippingZones || [];
  }

  static calculateShipping(cartTotal, zoneId) {
    const zone = this.currentRegion?.shippingZones?.find(z => z.id === zoneId);
    if (!zone) return this.currentRegion?.shippingZones?.[0]?.price || 0;

    if (cartTotal >= zone.freeThreshold) return 0;
    return zone.price;
  }

  static getTaxRate() {
    return this.currentRegion?.taxRate || 0.20;
  }

  static calculateTax(amount) {
    return Math.round(amount * this.getTaxRate());
  }

  static getAvailablePaymentMethods() {
    return this.currentRegion?.paymentMethods || ['card', 'cash_on_delivery', 'bank_transfer'];
  }

  static getAvailableCarriers() {
    return this.currentRegion?.carriers || ['post_express'];
  }

  // ============================================================
  // FORMATTING HELPERS
  // ============================================================
  static formatCurrency(amount, currencyCode = null) {
    const currency = this.currencies[currencyCode || this.currentCurrency || 'RSD'];
    amount = Number(amount);
    
    // Crypto special formatting
    if (['BTC', 'ETH', 'USDT', 'USDC'].includes(currency.code)) {
      return `${currency.symbol}${amount.toFixed(currency.decimals)}`;
    }

    // Fiat currencies
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: currency.decimals,
        maximumFractionDigits: currency.decimals
      }).format(amount);
    } catch (e) {
      return `${currency.symbol}${amount.toFixed(currency.decimals)}`;
    }
  }

  static formatNumber(value, options = {}) {
    const locale = this.getLocaleForLanguage();
    options = { minimumFractionDigits: 0, maximumFractionDigits: 2, ...options };
    
    try {
      return new Intl.NumberFormat(this.getLocaleForLanguage(), options).format(value);
    } catch (e) {
      return value.toString();
    }
  }

  static formatPercentage(value, decimals = 1) {
    return `${this.formatNumber(value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  static init() {
    this.initLanguageDetection();
    this.initCurrencyDetection();
    this.initGeoDetection();
    this.initRTLSupport();
    this.initDateTimeFormatting();
    this.initNumberFormatting();
    this.initTranslationSystem();
    this.initCurrencyDetection();
    this.initGeoDetection();
    this.initRegionalSettings();
    this.initDateTimeFormatting();
    this.initNumberFormatting();
    
    // Apply initial translations
    this.applyTranslations();
    
    console.log('[I18n] Initialized with language:', localStorage.getItem('dalli_language'), 'currency:', localStorage.getItem('dalli_currency'));
  }

  static getLocaleForLanguage() {
    const lang = localStorage.getItem('dalli_language') || 'sr-Cyrl';
    const langData = this.languages[lang];
    return langData?.locale || 'sr-RS';
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18n.init());
} else {
  I18n.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18n };
}

if (typeof window !== 'undefined') {
  window.I18n = I18n;
}