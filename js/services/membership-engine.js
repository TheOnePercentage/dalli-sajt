/**
 * Membership Engine Service
 * Core logic for DALLI Private Client & Luxury Membership Ecosystem
 * Handles tier calculation, progression, benefits, early access, and exclusive content
 */

const MEMBERSHIP_DATA_URL = '/data/membership.json';
const EXCLUSIVE_ACCESS_URL = '/data/exclusive-access.json';
const LIMITED_EDITIONS_URL = '/data/limited-editions.json';

let _membershipData = null;
let _exclusiveAccessData = null;
let _limitedEditionsData = null;
let _loadPromise = null;

async function loadAllData() {
  if (_membershipData && _exclusiveAccessData && _limitedEditionsData) {
    return { membership: _membershipData, exclusiveAccess: _exclusiveAccessData, limitedEditions: _limitedEditionsData };
  }

  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const [membershipRes, exclusiveRes, limitedRes] = await Promise.all([
        fetch(MEMBERSHIP_DATA_URL),
        fetch(EXCLUSIVE_ACCESS_URL),
        fetch(LIMITED_EDITIONS_URL)
      ]);

      if (membershipRes.ok) _membershipData = await membershipRes.json();
      else _membershipData = { membership: { hierarchy: [], progression: {}, statusCalculation: {} } };

      if (exclusiveRes.ok) _exclusiveAccessData = await exclusiveRes.json();
      else _exclusiveAccessData = { exclusiveAccess: { collections: {}, products: {} } };

      if (limitedRes.ok) _limitedEditionsData = await limitedRes.json();
      else _limitedEditionsData = { limitedEditions: { types: {} } };
    } catch (err) {
      console.warn('[MembershipEngine] Load failed:', err);
      _membershipData = _membershipData || { membership: { hierarchy: [], progression: {}, statusCalculation: {} } };
      _exclusiveAccessData = _exclusiveAccessData || { exclusiveAccess: { collections: {}, products: {} } };
      _limitedEditionsData = _limitedEditionsData || { limitedEditions: { types: {} } };
    } finally {
      _loadPromise = null;
    }

    return { membership: _membershipData, exclusiveAccess: _exclusiveAccessData, limitedEditions: _limitedEditionsData };
  })();

  return _loadPromise;
}

export function getTierById(tierId) {
  const hierarchy = _membershipData?.membership?.hierarchy || [];
  return hierarchy.find(t => t.id === tierId) || hierarchy[0];
}

export function getTierByLevel(level) {
  const hierarchy = _membershipData?.membership?.hierarchy || [];
  return hierarchy.find(t => t.level === level) || hierarchy[0];
}

export function getAllTiers() {
  return _membershipData?.membership?.hierarchy || [];
}

export function getTierConfig(tierId) {
  return getTierById(tierId);
}

export function getEarlyAccessTiers() {
  return _membershipData?.earlyAccess?.tiers || [];
}

export function getEarlyAccessHours(tierId) {
  const tier = getTierById(tierId);
  return tier?.earlyAccessHours || 0;
}

export function getTierBenefits(tierId) {
  const tier = getTierById(tierId);
  return tier?.benefits || [];
}

export function getTierRequirements(tierId) {
  const tier = getTierById(tierId);
  return tier?.requirements || {};
}

export async function calculateUserTier(userProfile) {
  await loadAllData();

  if (!userProfile) return getTierByLevel(1);

  const { purchaseValue = 0, orderCount = 0, loyaltyPoints = 0, collectionEngagement = {}, manualTier = null, invitedTier = null } = userProfile;

  // Manual/owner assignment takes precedence
  if (manualTier && _membershipData?.membership?.progression?.manualOverride?.ownerOnly) {
    return getTierById(manualTier);
  }

  // Invite-only tiers
  if (invitedTier) {
    const invited = getTierById(invitedTier);
    if (invited?.requirements?.inviteOnly) return invited;
  }

  // Auto-assignment based on requirements
  const hierarchy = _membershipData?.membership?.hierarchy || [];
  const autoTiers = hierarchy.filter(t => t.requirements?.autoAssign).reverse(); // highest first

  for (const tier of autoTiers) {
    const req = tier.requirements || {};
    const meetsValue = purchaseValue >= (req.minPurchaseValue || 0);
    const meetsOrders = orderCount >= (req.minOrders || 0);
    const meetsPoints = loyaltyPoints >= (req.minLoyaltyPoints || 0);

    if (meetsValue && meetsOrders && meetsPoints) {
      return tier;
    }
  }

  return getTierByLevel(1); // Default to Member
}

export async function getUserTierProgress(userProfile, currentTierId) {
  await loadAllData();

  const currentTier = getTierById(currentTierId);
  const hierarchy = _membershipData?.membership?.hierarchy || [];
  const currentIndex = hierarchy.findIndex(t => t.id === currentTierId);

  if (currentIndex >= hierarchy.length - 1) {
    return { currentTier, nextTier: null, progress: 100, requirements: {} };
  }

  const nextTier = hierarchy[currentIndex + 1];
  const req = nextTier.requirements || {};

  const purchaseValue = userProfile?.purchaseValue || 0;
  const orderCount = userProfile?.orderCount || 0;
  const loyaltyPoints = userProfile?.loyaltyPoints || 0;

  const valueProgress = req.minPurchaseValue ? Math.min(100, (purchaseValue / req.minPurchaseValue) * 100) : 100;
  const orderProgress = req.minOrders ? Math.min(100, (orderCount / req.minOrders) * 100) : 100;
  const pointsProgress = req.minLoyaltyPoints ? Math.min(100, (loyaltyPoints / req.minLoyaltyPoints) * 100) : 100;

  const overallProgress = Math.round((valueProgress + orderProgress + pointsProgress) / 3);

  return {
    currentTier,
    nextTier,
    progress: overallProgress,
    requirements: {
      purchaseValue: { current: purchaseValue, required: req.minPurchaseValue || 0, progress: valueProgress },
      orders: { current: orderCount, required: req.minOrders || 0, progress: orderProgress },
      loyaltyPoints: { current: loyaltyPoints, required: req.minLoyaltyPoints || 0, progress: pointsProgress }
    }
  };
}

export function getMemberSince(tierId, joinDate) {
  const tier = getTierById(tierId);
  if (!joinDate) return null;

  const date = new Date(joinDate);
  const now = new Date();
  const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();

  return {
    tier: tier.name,
    since: date.toISOString(),
    months: diffMonths,
    formatted: date.toLocaleDateString('sr-RS', { year: 'numeric', month: 'long' })
  };
}

export function getExclusiveBenefits(tierId) {
  const tier = getTierById(tierId);
  const allTiers = getAllTiers();
  const currentIndex = allTiers.findIndex(t => t.id === tierId);

  const exclusiveBenefits = [];
  for (let i = currentIndex; i < allTiers.length; i++) {
    const t = allTiers[i];
    if (t.exclusiveAccess && t.benefits) {
      t.benefits.forEach(b => {
        if (!exclusiveBenefits.some(eb => eb.text === b)) {
          exclusiveBenefits.push({ text: b, tier: t.name, tierId: t.id });
        }
      });
    }
  }

  return exclusiveBenefits;
}

export function getAvailableCollections(userTierId, collection = null) {
  if (!_exclusiveAccessData) return [];

  const accessData = _exclusiveAccessData.exclusiveAccess?.collections;
  if (!accessData) return [];

  const collections = collection ? [accessData[collection]] : Object.values(accessData).flat();
  const userTier = getTierById(userTierId);
  const userLevel = userTier?.level || 1;

  return collections
    .filter(c => {
      if (!c) return false;
      const tier = getTierById(c.accessLevel);
      return tier && tier.level <= userLevel;
    })
    .map(c => ({
      accessLevel: c.accessLevel,
      collection: c.collection,
      visibleTo: c.visibleTo
    }));
}

export function canAccessCollection(userTierId, collectionName, accessLevel = 'public') {
  const userTier = getTierById(userTierId);
  const userLevel = userTier?.level || 1;
  const requiredTier = getTierById(accessLevel);
  const requiredLevel = requiredTier?.level || 1;

  return userLevel >= requiredLevel;
}

export function canAccessProduct(userTierId, product) {
  if (!product) return true;

  const accessLevel = product.accessLevel || product.memberTier || 'public';
  return canAccessCollection(userTierId, null, accessLevel);
}

export function getProductReleaseDate(product, userTierId) {
  if (!product || !_membershipData) return product?.releaseDate || null;

  const baseDate = product.releaseDate ? new Date(product.releaseDate) : new Date();
  const tierReleaseDates = _membershipData.exclusiveAccess?.products?.tierReleaseDates || {};
  const userTier = getTierById(userTierId);
  const hoursOffset = tierReleaseDates[userTierId] || tierReleaseDates[userTier?.id] || 0;

  const releaseDate = new Date(baseDate.getTime() + hoursOffset * 60 * 60 * 1000);
  return releaseDate.toISOString();
}

export function isProductAvailable(product, userTierId) {
  const releaseDateStr = getProductReleaseDate(product, userTierId);
  if (!releaseDateStr) return true;

  const releaseDate = new Date(releaseDateStr);
  return new Date() >= releaseDate;
}

export function getLimitedEditionTypes() {
  return _limitedEditionsData?.limitedEditions?.types || {};
}

export function getLimitedEditionConfig(typeId) {
  const types = getLimitedEditionTypes();
  return types[typeId];
}

export function getMaxPerCustomer(typeId, tierId) {
  const config = getLimitedEditionConfig(typeId);
  return config?.maxPerCustomer?.[tierId] || 1;
}

export function getCertificateConfig(typeId) {
  const config = getLimitedEditionConfig(typeId);
  return config?.certificate ? {
    enabled: true,
    template: config.certificateTemplate,
    digital: _limitedEditionsData?.limitedEditions?.certificateOfAuthenticity?.digital,
    physical: _limitedEditionsData?.limitedEditions?.certificateOfAuthenticity?.physical,
    qrCode: _limitedEditionsData?.limitedEditions?.certificateOfAuthenticity?.qrCode,
    verificationUrl: _limitedEditionsData?.limitedEditions?.certificateOfAuthenticity?.verificationUrl
  } : { enabled: false };
}

export async function initializeMembershipEngine() {
  await loadAllData();
  return _membershipData;
}

export default {
  loadAllData,
  getAllTiers,
  getTierConfig,
  getTierById,
  getEarlyAccessTiers,
  getEarlyAccessHours,
  getTierBenefits,
  getTierRequirements,
  calculateUserTier,
  getUserTierProgress,
  getMemberSince,
  getExclusiveBenefits,
  getAvailableCollections,
  canAccessCollection,
  canAccessProduct,
  getProductReleaseDate,
  isProductAvailable,
  getLimitedEditionTypes,
  getLimitedEditionConfig,
  getMaxPerCustomer,
  getCertificateConfig,
  initializeMembershipEngine
};