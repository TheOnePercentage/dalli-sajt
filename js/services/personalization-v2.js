/**
 * Personalization Engine V2
 * Tracks user style preferences and powers personalized recommendations
 */

const PERSONALIZATION_STORAGE_KEY = 'dalli_personalization_v2';
const SESSION_STORAGE_KEY = 'dalli_personalization_session';

let _personalizationData = null;
let _config = null;

function loadConfig() {
  if (_config) return Promise.resolve(_config);
  return fetch('/data/personalization-v2.json')
    .then(r => r.json())
    .then(data => {
      _config = data;
      return _config;
    })
    .catch(() => {
      _config = { personalization: { userProfile: {}, inferenceRules: {}, recommendationBoosts: {} } };
      return _config;
    });
}

function loadFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(PERSONALIZATION_STORAGE_KEY);
    if (stored) {
      _personalizationData = JSON.parse(stored);
    } else {
      _personalizationData = getDefaultProfile();
    }
  } catch (e) {
    _personalizationData = getDefaultProfile();
  }
  return _personalizationData;
}

function saveToStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(_personalizationData));
  } catch (e) {
    console.warn('[PersonalizationV2] Failed to save:', e);
  }
}

function getDefaultProfile() {
  return {
    mostViewedStyles: {},
    mostViewedLooks: {},
    mostPurchasedStyles: {},
    mostPurchasedLooks: {},
    preferredCollection: null,
    preferredStyle: null,
    preferredOccasion: null,
    lastUpdated: new Date().toISOString()
  };
}

export async function initPersonalization() {
  await loadConfig();
  if (!_personalizationData) loadFromStorage();
  if (!_personalizationData) _personalizationData = getDefaultProfile();
  return _personalizationData;
}

export function trackStyleView(style) {
  if (!_personalizationData) loadFromStorage();
  if (!_personalizationData.mostViewedStyles) _personalizationData.mostViewedStyles = {};
  _personalizationData.mostViewedStyles[style] = (_personalizationData.mostViewedStyles[style] || 0) + 1;
  _personalizationData.lastUpdated = new Date().toISOString();
  saveToStorage();
  inferPreferences();
}

export function trackLookView(lookId) {
  if (!_personalizationData) loadFromStorage();
  if (!_personalizationData.mostViewedLooks) _personalizationData.mostViewedLooks = {};
  _personalizationData.mostViewedLooks[lookId] = (_personalizationData.mostViewedLooks[lookId] || 0) + 1;
  _personalizationData.lastUpdated = new Date().toISOString();
  saveToStorage();
  inferPreferences();
}

export function trackStylePurchase(style) {
  if (!_personalizationData) loadFromStorage();
  if (!_personalizationData.mostPurchasedStyles) _personalizationData.mostPurchasedStyles = {};
  _personalizationData.mostPurchasedStyles[style] = (_personalizationData.mostPurchasedStyles[style] || 0) + 1;
  _personalizationData.lastUpdated = new Date().toISOString();
  saveToStorage();
  inferPreferences();
}

export function trackLookPurchase(lookId) {
  if (!_personalizationData) loadFromStorage();
  if (!_personalizationData.mostPurchasedLooks) _personalizationData.mostPurchasedLooks = {};
  _personalizationData.mostPurchasedLooks[lookId] = (_personalizationData.mostPurchasedLooks[lookId] || 0) + 1;
  _personalizationData.lastUpdated = new Date().toISOString();
  saveToStorage();
  inferPreferences();
}

export function trackCollectionView(collection) {
  if (!_personalizationData) loadFromStorage();
  const current = _personalizationData.preferredCollection;
  if (!current) {
    _personalizationData.preferredCollection = collection;
    _personalizationData.lastUpdated = new Date().toISOString();
    saveToStorage();
  }
}

function inferPreferences() {
  if (!_personalizationData || !_config) return;

  const viewed = _personalizationData.mostViewedStyles || {};
  const purchased = _personalizationData.mostPurchasedStyles || {};

  let topViewed = Object.entries(viewed).sort((a, b) => b[1] - a[1])[0];
  let topPurchased = Object.entries(purchased).sort((a, b) => b[1] - a[1])[0];

  if (topPurchased) {
    _personalizationData.preferredStyle = topPurchased[0];
  } else if (topViewed) {
    _personalizationData.preferredStyle = topViewed[0];
  }

  const inferenceRules = _config.personalization?.inferenceRules || {};
  const collectionAffinity = inferenceRules.collectionAffinity || {};

  if (_personalizationData.preferredStyle) {
    for (const [collection, styles] of Object.entries(collectionAffinity)) {
      if (styles.includes(_personalizationData.preferredStyle)) {
        _personalizationData.preferredCollection = collection;
        break;
      }
    }
  }

  _personalizationData.lastUpdated = new Date().toISOString();
  saveToStorage();
}

export function getPersonalizedBoosts() {
  if (!_personalizationData || !_config) return { collection: null, styles: [], looks: [] };

  const preferredStyle = _personalizationData.preferredStyle;
  const preferredCollection = _personalizationData.preferredCollection;
  const boosts = _config.personalization?.recommendationBoosts || {};

  if (preferredStyle && boosts[preferredCollection]) {
    return boosts[preferredCollection];
  }

  if (preferredCollection && boosts[preferredCollection]) {
    return boosts[preferredCollection];
  }

  return { collection: null, styles: [], looks: [] };
}

export function getProfile() {
  if (!_personalizationData) loadFromStorage();
  return { ..._personalizationData };
}

export function resetProfile() {
  _personalizationData = getDefaultProfile();
  saveToStorage();
  return _personalizationData;
}

export default {
  initPersonalization,
  trackStyleView,
  trackLookView,
  trackStylePurchase,
  trackLookPurchase,
  trackCollectionView,
  getPersonalizedBoosts,
  getProfile,
  resetProfile
};