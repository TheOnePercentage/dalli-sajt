/**
 * Exclusive Access Service
 * Handles collection/product visibility, early access, and tier-based content filtering
 */

import { getTierById, getTierConfig, canAccessCollection, canAccessProduct, getProductReleaseDate, isProductAvailable } from './membership-engine.js';

let _exclusiveAccessData = null;

async function loadData() {
  if (_exclusiveAccessData) return _exclusiveAccessData;

  try {
    const res = await fetch('/data/exclusive-access.json');
    if (res.ok) _exclusiveAccessData = await res.json();
    else _exclusiveAccessData = { exclusiveAccess: {}, collectionAccessControl: {} };
  } catch (err) {
    console.warn('[ExclusiveAccess] Load failed:', err);
    _exclusiveAccessData = { exclusiveAccess: {}, collectionAccessControl: {} };
  }

  return _exclusiveAccessData;
}

export function filterProductsByTier(products, userTierId) {
  if (!products || !Array.isArray(products)) return [];

  return products.filter(product => {
    if (!product) return false;
    return canAccessProduct(userTierId, product);
  });
}

export function filterCollectionsByTier(collections, userTierId) {
  if (!collections || !Array.isArray(collections)) return [];

  return collections.filter(collection => {
    if (!collection) return false;
    const accessLevel = collection.accessLevel || collection.memberTier || 'public';
    return canAccessCollection(userTierId, collection.collection || '', accessLevel);
  });
}

export function getVisibleNavigationItems(userTierId, allNavItems) {
  if (!allNavItems || !Array.isArray(allNavItems)) return [];

  return allNavItems.filter(item => {
    if (!item.accessLevel) return true; // Public items
    return canAccessCollection(userTierId, item.collection || '', item.accessLevel);
  });
}

export function getEarlyAccessProducts(products, userTierId, hoursAhead = 0) {
  if (!products || !Array.isArray(products)) return [];

  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return products.filter(product => {
    if (!product) return false;
    if (!canAccessProduct(userTierId, product)) return false;

    const releaseDate = getProductReleaseDate(product, userTierId);
    if (!releaseDate) return true;

    const release = new Date(releaseDate);
    return release <= cutoff;
  });
}

export function getUpcomingReleases(products, userTierId, limit = 10) {
  if (!products || !Array.isArray(products)) return [];

  const now = new Date();
  const userTier = getTierById(userTierId);
  const userLevel = userTier?.level || 1;

  return products
    .filter(product => {
      if (!product) return false;
      if (!canAccessProduct(userTierId, product)) return false;

      const releaseDate = getProductReleaseDate(product, userTierId);
      if (!releaseDate) return false;

      const release = new Date(releaseDate);
      return release > now;
    })
    .map(product => ({
      ...product,
      releaseDate: getProductReleaseDate(product, userTierId),
      earlyAccessHours: getTierConfig(userTierId)?.earlyAccessHours || 0
    }))
    .sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate))
    .slice(0, limit);
}

export async function getCollectionAccessInfo(collectionName, userTierId) {
  await loadData();

  const collectionControl = _exclusiveAccessData?.collectionAccessControl?.[collectionName];
  if (!collectionControl) return { accessible: true, accessLevel: 'public', message: null };

  const userTier = getTierById(userTierId);
  const userLevel = userTier?.level || 1;

  const subCollections = collectionControl.subCollections || {};
  const accessLevels = Object.keys(subCollections).flatMap(key => subCollections[key].accessLevels || []);
  const highestAccess = accessLevels.reduce((highest, level) => {
    const tier = getTierById(level);
    return (tier?.level || 0) > (getTierById(highest)?.level || 0) ? level : highest;
  }, 'public');

  const requiredTier = getTierById(highestAccess);
  const requiredLevel = requiredTier?.level || 1;

  return {
    accessible: userLevel >= requiredLevel,
    accessLevel: highestAccess,
    requiredTier: requiredTier?.name,
    message: userLevel < requiredLevel
      ? `This collection is exclusive to ${requiredTier?.name} members and above`
      : null,
    subCollections: Object.entries(subCollections).map(([key, value]) => ({
      name: key,
      accessible: canAccessCollection(userTierId, collectionName, value.accessLevels[value.accessLevels.length - 1]),
      accessLevels: value.accessLevels
    }))
  };
}

export function getContentVisibilityRules(userTierId) {
  const tier = getTierConfig(userTierId);

  return {
    showExclusiveCollections: tier?.exclusiveAccess || false,
    showPrivateClientContent: tier?.privateClientAccess || false,
    showEliteContent: tier?.id === 'elite-client',
    earlyAccessHours: tier?.earlyAccessHours || 0,
    hideLockedContent: _exclusiveAccessData?.navigationVisibility?.hideFromLowerTiers !== false,
    showComingSoonBadge: _exclusiveAccessData?.navigationVisibility?.showComingSoonBadge !== false,
    lockedMessage: _exclusiveAccessData?.navigationVisibility?.lockedCollectionMessage || 'This collection is exclusive to {tier} members and above',
    upgradeCTA: _exclusiveAccessData?.navigationVisibility?.upgradeCTA || 'Upgrade to unlock'
  };
}

export function getHomepageContentFilter(userTierId) {
  const visibility = getContentVisibilityRules(userTierId);

  return {
    hero: { showAll: true },
    featuredCollections: { filter: visibility.showExclusiveCollections ? 'tier' : 'public' },
    newArrivals: { filter: 'early-access', hours: visibility.earlyAccessHours },
    looks: { filter: visibility.showPrivateClientContent ? 'all' : 'public' },
    journal: { filter: visibility.showPrivateClientContent ? 'all' : 'public' },
    limitedEditions: { filter: visibility.showExclusiveCollections ? 'tier' : 'public' }
  };
}

export function getSearchFilter(userTierId) {
  const visibility = getContentVisibilityRules(userTierId);

  return {
    includeExclusive: visibility.showExclusiveCollections,
    includePrivateClient: visibility.showPrivateClientContent,
    includeElite: visibility.showEliteContent,
    earlyAccessOnly: false,
    tier: userTierId
  };
}

export function getRecommendationBoost(userTierId) {
  const tier = getTierConfig(userTierId);
  if (!tier) return { collections: [], styles: [] };

  const boosts = {
    collections: [],
    styles: [],
    multiplier: 1.0
  };

  if (tier.id === 'member') {
    boosts.collections = ['casual'];
    boosts.styles = ['everyday', 'travel', 'sport', 'smart-casual', 'luxury-essentials'];
    boosts.multiplier = 1.0;
  } else if (tier.id === 'silver') {
    boosts.collections = ['casual'];
    boosts.styles = ['everyday', 'travel', 'sport', 'smart-casual', 'luxury-essentials', 'business'];
    boosts.multiplier = 1.1;
  } else if (tier.id === 'gold') {
    boosts.collections = ['casual', 'elegance'];
    boosts.styles = ['everyday', 'travel', 'sport', 'smart-casual', 'luxury-essentials', 'business', 'formal', 'evening'];
    boosts.multiplier = 1.25;
  } else if (tier.id === 'black') {
    boosts.collections = ['elegance', 'casual'];
    boosts.styles = ['business', 'formal', 'evening', 'special-occasion', 'luxury-essentials'];
    boosts.multiplier = 1.5;
  } else if (tier.id === 'private-client') {
    boosts.collections = ['elegance'];
    boosts.styles = ['business', 'formal', 'evening', 'special-occasion', 'luxury-essentials'];
    boosts.multiplier = 2.0;
  } else if (tier.id === 'elite-client') {
    boosts.collections = ['elegance'];
    boosts.styles = ['business', 'formal', 'evening', 'special-occasion', 'luxury-essentials'];
    boosts.multiplier = 3.0;
  }

  return boosts;
}

export function getEditorialContentFilter(userTierId) {
  const tier = getTierConfig(userTierId);

  return {
    showPrivateClientEditorials: tier?.privateClientAccess || false,
    showEliteEditorials: tier?.id === 'elite-client',
    showCollectionPreviews: tier?.exclusiveAccess || false,
    showRunwayContent: tier?.level >= 4,
    showArchiveContent: tier?.level >= 4
  };
}

export default {
  loadData,
  filterProductsByTier,
  filterCollectionsByTier,
  getVisibleNavigationItems,
  getEarlyAccessProducts,
  getUpcomingReleases,
  getCollectionAccessInfo,
  getContentVisibilityRules,
  getHomepageContentFilter,
  getSearchFilter,
  getRecommendationBoost,
  getEditorialContentFilter
};