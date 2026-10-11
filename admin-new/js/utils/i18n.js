let currentLocale = 'sr';
let translations = {};

async function loadLocale(locale) {
  try {
    const response = await fetch(`/admin/js/locales/${locale}.json`);
    if (response.ok) {
      translations = await response.json();
      currentLocale = locale;
      return true;
    }
  } catch (e) {
    console.warn(`Failed to load locale ${locale}:`, e);
  }
  return false;
}

function t(key, params = {}) {
  const keys = key.split('.');
  let value = translations;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (match, param) => params[param] ?? match);
}

function setLocale(locale) {
  if (translations[locale]) {
    currentLocale = locale;
    return true;
  }
  return loadLocale(locale);
}

function getLocale() {
  return currentLocale;
}

export const i18n = {
  loadLocale,
  t,
  setLocale,
  getLocale
};

export function createT(locale) {
  return (key, params) => t(key, params);
}

window.i18n = i18n;
window.t = t;