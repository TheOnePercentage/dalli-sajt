/**
 * Membership Personalization Integration
 * Connects membership tier with personalization engine for tier-based content delivery
 */

import { getTierConfig } from '../services/membership-engine.js';
import { getRecommendationBoost, getContentVisibilityRules, getHomepageContentFilter, getSearchFilter, getEditorialContentFilter } from '../services/exclusive-access.js';
import { getProfile, trackStyleView, trackCollectionView } from '../services/personalization-v2.js';

let _membershipConfig = null;

export async function initMembershipPersonalization(userTierId) {
  const profile = getProfile();
  
  // Update personalization profile with membership data
  if (profile && userTierId) {
    profile.membershipTier = userTierId;
    profile.membershipLevel = getTierConfig(userTierId)?.level || 1;
    
    // Track membership tier as a style preference
    const tier = getTierConfig(userTierId);
    if (tier) {
      trackStyleView(`membership-${tier.id}`);
    }
  }
  
  return getMembershipPersonalizationConfig(userTierId);
}

export function getMembershipPersonalizationConfig(userTierId) {
  if (!userTierId) return getDefaultConfig();
  
  const tier = getTierConfig(userTierId);
  if (!tier) return getDefaultConfig();
  
  return {
    tier: userTierId,
    tierLevel: tier.level,
    tierName: tier.name,
    tierLabel: tier.label,
    tierColor: tier.color,
    tierIcon: tier.icon,
    visibility: getContentVisibilityRules(userTierId),
    homepageFilter: getHomepageContentFilter(userTierId),
    searchFilter: getSearchFilter(userTierId),
    editorialFilter: getEditorialContentFilter(userTierId),
    recommendationBoost: getRecommendationBoost(userTierId),
    earlyAccessHours: tier.earlyAccessHours || 0,
    exclusiveAccess: tier.exclusiveAccess || false,
    privateClientAccess: tier.privateClientAccess || false,
    conciergeAccess: tier.conciergeAccess || false
  };
}

function getDefaultConfig() {
  return {
    tier: 'member',
    tierLevel: 1,
    tierName: 'Member',
    tierLabel: 'Član',
    tierColor: '#8b95a1',
    tierIcon: '🤍',
    visibility: getContentVisibilityRules('member'),
    homepageFilter: getHomepageContentFilter('member'),
    searchFilter: getSearchFilter('member'),
    editorialFilter: getEditorialContentFilter('member'),
    recommendationBoost: getRecommendationBoost('member'),
    earlyAccessHours: 24,
    exclusiveAccess: false,
    privateClientAccess: false,
    conciergeAccess: false
  };
}

export function filterContentByTier(content, userTierId, contentType = 'product') {
  const config = getMembershipPersonalizationConfig(userTierId);
  
  if (!Array.isArray(content)) return content;
  
  return content.filter(item => {
    if (!item) return false;
    
    // Check access level
    const itemAccessLevel = item.accessLevel || item.memberTier || item.collectionAccess || 'public';
    const userLevel = config.tierLevel;
    const requiredLevel = getTierConfig(itemAccessLevel)?.level || 1;
    
    if (userLevel < requiredLevel) {
      // Check if we should show as "coming soon"
      if (config.visibility.showComingSoonBadge && userLevel === requiredLevel - 1) {
        item._comingSoon = true;
        item._requiredTier = itemAccessLevel;
        return true;
      }
      return false;
    }
    
    return true;
  });
}

export function sortContentByTierRelevance(content, userTierId) {
  const config = getMembershipPersonalizationConfig(userTierId);
  const boost = config.recommendationBoost;
  
  if (!Array.isArray(content)) return content;
  
  return [...content].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    // Collection boost
    if (boost.collections.includes(a.collection)) scoreA += 10;
    if (boost.collections.includes(b.collection)) scoreB += 10;
    
    // Style boost
    if (a.styleOccasion && a.styleOccasion.some(s => boost.styles.includes(s))) scoreA += 5;
    if (b.styleOccasion && b.styleOccasion.some(s => boost.styles.includes(s))) scoreB += 5;
    
    // Tier exclusive content gets priority for eligible users
    const aExclusive = a.accessLevel && getTierConfig(a.accessLevel)?.level > 1;
    const bExclusive = b.accessLevel && getTierConfig(b.accessLevel)?.level > 1;
    const userLevel = config.tierLevel;
    
    if (aExclusive && getTierConfig(a.accessLevel)?.level <= userLevel) scoreA += 15;
    if (bExclusive && getTierConfig(b.accessLevel)?.level <= userLevel) scoreB += 15;
    
    // Early access content
    if (a.earlyAccessTier && getTierConfig(a.earlyAccessTier)?.level <= userLevel) scoreA += 8;
    if (b.earlyAccessTier && getTierConfig(b.earlyAccessTier)?.level <= userLevel) scoreB += 8;
    
    return scoreB - scoreA;
  });
}

export function getTierBasedHeroContent(userTierId) {
  const config = getMembershipPersonalizationConfig(userTierId);
  const tier = getTierConfig(userTierId);
  
  const heroContent = {
    member: {
      title: 'Dobrodošli u DALLI svet',
      subtitle: 'Otvorite vrata luksuzu. Postanite deo naše zajednice.',
      cta: { text: 'Postani Član', href: '/membership' },
      image: '/images/hero/member-welcome.jpg'
    },
    silver: {
      title: 'Silver Status — Unapređena iskustva',
      subtitle: 'Rani pristup, ekskluzivni drop-ovi, posvećena podrška.',
      cta: { text: 'Istraži Silver Prednosti', href: '/membership/silver' },
      image: '/images/hero/silver-status.jpg'
    },
    gold: {
      title: 'Gold Status — Prestiž unutar DALLI kuće',
      subtitle: 'Private Client preview, personal styling, modni show pozivi.',
      cta: { text: 'Istraži Gold Prednosti', href: '/membership/gold' },
      image: '/images/hero/gold-status.jpg'
    },
    black: {
      title: 'Black Status — Unutrašnji krug DALLI kuće',
      subtitle: '7 dana ranijeg pristupa, 24/7 concierge, bespoke prilike.',
      cta: { text: 'Istraži Black Prednosti', href: '/membership/black' },
      image: '/images/hero/black-status.jpg'
    },
    'private-client': {
      title: 'Private Client — Pozivnica za DALLI svet',
      subtitle: 'Brojana izdanja, personal shopper, privatni atelje pregledi.',
      cta: { text: 'Istraži Private Client', href: '/membership/private-client' },
      image: '/images/hero/private-client.jpg'
    },
    'elite-client': {
      title: 'Elite Client — Vrhunac DALLI protekcije',
      subtitle: 'Ko-dizajn, heritage acquisition, lifetime warranty.',
      cta: { text: 'Istraži Elite Client', href: '/membership/elite-client' },
      image: '/images/hero/elite-client.jpg'
    }
  };
  
  return heroContent[config.tier] || heroContent.member;
}

export function getTierBasedNavigationItems(userTierId, allNavItems) {
  const config = getMembershipPersonalizationConfig(userTierId);
  
  return allNavItems.map(item => {
    if (!item.accessLevel) return { ...item, visible: true };
    
    const requiredLevel = getTierConfig(item.accessLevel)?.level || 1;
    const userLevel = config.tierLevel;
    
    return {
      ...item,
      visible: userLevel >= requiredLevel,
      locked: userLevel < requiredLevel,
      comingSoon: config.visibility.showComingSoonBadge && userLevel === requiredLevel - 1,
      requiredTier: item.accessLevel
    };
  });
}

export default {
  initMembershipPersonalization,
  getMembershipPersonalizationConfig,
  filterContentByTier,
  sortContentByTierRelevance,
  getTierBasedHeroContent,
  getTierBasedNavigationItems
};