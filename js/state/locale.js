import { createSignal } from '../core/signals.js';
import { emit, DOM_EVENTS } from '../core/events.js';

export const LOCALE_STORAGE_KEY = 'dalli_lang';
export const CURRENCY_STORAGE_KEY = 'dalli_currency';

export const languageSignal = createSignal(localStorage.getItem(LOCALE_STORAGE_KEY) || 'sr');
export const currencySignal = createSignal(localStorage.getItem(CURRENCY_STORAGE_KEY) || 'RSD');

const LOCALE_CURRENCY_MAP = {
  sr: 'RSD',
  en: 'EUR',
  de: 'EUR',
  fr: 'EUR',
  es: 'EUR',
  it: 'EUR',
  ru: 'RUB',
  tr: 'TRY',
  bs: 'BAM',
  hr: 'EUR',
  me: 'EUR',
  sl: 'EUR'
};

const CURRENCY_CONFIG = {
  RSD: { locale: 'sr-RS', currency: 'RSD', minimumFractionDigits: 0, maximumFractionDigits: 0 },
  EUR: { locale: 'de-DE', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  RUB: { locale: 'ru-RU', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 0 },
  TRY: { locale: 'tr-TR', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  BAM: { locale: 'bs-BA', currency: 'BAM', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  USD: { locale: 'en-US', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }
};

languageSignal.subscribe((lang) => {
  localStorage.setItem(LOCALE_STORAGE_KEY, lang);
  const currency = LOCALE_CURRENCY_MAP[lang] || 'RSD';
  if (currencySignal.get() !== currency) {
    currencySignal.set(currency);
  }
  emit(DOM_EVENTS.LANGUAGE_CHANGED, { language: lang, currency });
});

currencySignal.subscribe((currency) => {
  localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  emit(DOM_EVENTS.CURRENCY_CHANGED, { currency });
});

export const getLanguage = () => languageSignal.get();
export const getCurrency = () => currencySignal.get();

export const setLanguage = (lang) => {
  if (LOCALE_CURRENCY_MAP[lang]) {
    languageSignal.set(lang);
  }
};

export const setCurrency = (currency) => {
  if (CURRENCY_CONFIG[currency]) {
    currencySignal.set(currency);
  }
};

export const formatPrice = (amount, currency = null) => {
  const curr = currency || currencySignal.get();
  const config = CURRENCY_CONFIG[curr] || CURRENCY_CONFIG.RSD;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.minimumFractionDigits,
    maximumFractionDigits: config.maximumFractionDigits
  }).format(amount);
};

export const formatNumber = (num, locale = null) => {
  const lang = locale || languageSignal.get();
  const localeMap = {
    sr: 'sr-RS', en: 'en-US', de: 'de-DE', fr: 'fr-FR',
    es: 'es-ES', it: 'it-IT', ru: 'ru-RU', tr: 'tr-TR',
    bs: 'bs-BA', hr: 'hr-HR', me: 'sr-ME', sl: 'sl-SI'
  };
  return new Intl.NumberFormat(localeMap[lang] || 'sr-RS').format(num);
};

export const formatDate = (date, options = {}, locale = null) => {
  const lang = locale || languageSignal.get();
  const localeMap = {
    sr: 'sr-RS', en: 'en-US', de: 'de-DE', fr: 'fr-FR',
    es: 'es-ES', it: 'it-IT', ru: 'ru-RU', tr: 'tr-TR',
    bs: 'bs-BA', hr: 'hr-HR', me: 'sr-ME', sl: 'sl-SI'
  };
  const defaultOptions = { year: 'numeric', month: 'long', day: 'numeric', ...options };
  return new Intl.DateTimeFormat(localeMap[lang] || 'sr-RS', defaultOptions).format(date);
};

export const subscribeToLanguage = (fn) => languageSignal.subscribe(fn);
export const subscribeToCurrency = (fn) => currencySignal.subscribe(fn);

export const getSupportedLanguages = () => Object.keys(LOCALE_CURRENCY_MAP);
export const getSupportedCurrencies = () => Object.keys(CURRENCY_CONFIG);