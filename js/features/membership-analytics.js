/**
 * Membership Analytics - Tracks Phase 18 membership ecosystem events
 * Integrates with existing analytics infrastructure
 */

import { trackEvent } from './analytics.js';

export const MembershipAnalytics = {
  trackTierView(tierId, tierName, source) {
    trackEvent('membership_tier_view', {
      tier_id: tierId,
      tier_name: tierName,
      source: source || 'dashboard'
    });
  },

  trackTierUpgrade(fromTierId, fromTierName, toTierId, toTierName, trigger) {
    trackEvent('membership_tier_upgrade', {
      from_tier_id: fromTierId,
      from_tier_name: fromTierName,
      to_tier_id: toTierId,
      to_tier_name: toTierName,
      trigger: trigger || 'automatic'
    });
  },

  trackTierDowngrade(fromTierId, fromTierName, toTierId, toTierName, reason) {
    trackEvent('membership_tier_downgrade', {
      from_tier_id: fromTierId,
      from_tier_name: fromTierName,
      to_tier_id: toTierId,
      to_tier_name: toTierName,
      reason: reason || 'inactivity'
    });
  },

  trackEarlyAccessView(productId, productName, tierId, tierName, hoursEarly) {
    trackEvent('membership_early_access_view', {
      product_id: productId,
      product_name: productName,
      tier_id: tierId,
      tier_name: tierName,
      hours_early: hoursEarly
    });
  },

  trackEarlyAccessPurchase(productId, productName, tierId, tierName, hoursEarly, value) {
    trackEvent('membership_early_access_purchase', {
      product_id: productId,
      product_name: productName,
      tier_id: tierId,
      tier_name: tierName,
      hours_early: hoursEarly,
      value: value
    });
  },

  trackExclusiveCollectionView(collectionName, accessLevel, tierId, tierName) {
    trackEvent('membership_exclusive_collection_view', {
      collection_name: collectionName,
      access_level: accessLevel,
      tier_id: tierId,
      tier_name: tierName
    });
  },

  trackExclusiveCollectionPurchase(collectionName, accessLevel, tierId, tierName, value, productCount) {
    trackEvent('membership_exclusive_collection_purchase', {
      collection_name: collectionName,
      access_level: accessLevel,
      tier_id: tierId,
      tier_name: tierName,
      value: value,
      product_count: productCount
    });
  },

  trackPrivateClientDashboardOpen(tierId, tierName) {
    trackEvent('membership_private_client_dashboard_open', {
      tier_id: tierId,
      tier_name: tierName
    });
  },

  trackPrivateClientBenefitView(benefitName, tierId, tierName) {
    trackEvent('membership_private_client_benefit_view', {
      benefit_name: benefitName,
      tier_id: tierId,
      tier_name: tierName
    });
  },

  trackInvitationSent(invitationType, recipientTierId, recipientTierName, eventId) {
    trackEvent('membership_invitation_sent', {
      invitation_type: invitationType,
      recipient_tier_id: recipientTierId,
      recipient_tier_name: recipientTierName,
      event_id: eventId
    });
  },

  trackInvitationRSVP(invitationType, eventId, rsvpStatus, tierId, tierName) {
    trackEvent('membership_invitation_rsvp', {
      invitation_type: invitationType,
      event_id: eventId,
      rsvp_status: rsvpStatus,
      tier_id: tierId,
      tier_name: tierName
    });
  },

  trackLimitedEditionView(editionType, productId, productName, tierId, tierName, maxPerCustomer) {
    trackEvent('membership_limited_edition_view', {
      edition_type: editionType,
      product_id: productId,
      product_name: productName,
      tier_id: tierId,
      tier_name: tierName,
      max_per_customer: maxPerCustomer
    });
  },

  trackLimitedEditionPurchase(editionType, productId, productName, tierId, tierName, quantity, value, editionNumber) {
    trackEvent('membership_limited_edition_purchase', {
      edition_type: editionType,
      product_id: productId,
      product_name: productName,
      tier_id: tierId,
      tier_name: tierName,
      quantity: quantity,
      value: value,
      edition_number: editionNumber
    });
  },

  trackConciergeContact(tierId, tierName, requestType) {
    trackEvent('membership_concierge_contact', {
      tier_id: tierId,
      tier_name: tierName,
      request_type: requestType
    });
  },

  trackMembershipProgressView(currentTierId, currentTierName, nextTierId, nextTierName, progressPercent) {
    trackEvent('membership_progress_view', {
      current_tier_id: currentTierId,
      current_tier_name: currentTierName,
      next_tier_id: nextTierId,
      next_tier_name: nextTierName,
      progress_percent: progressPercent
    });
  },

  trackTierDistribution(distribution) {
    trackEvent('membership_tier_distribution', {
      distribution: distribution
    });
  },

  trackUpgradeRate(period, rate, totalMembers, upgrades) {
    trackEvent('membership_upgrade_rate', {
      period: period,
      rate: rate,
      total_members: totalMembers,
      upgrades: upgrades
    });
  },

  trackRetentionRate(period, tierId, tierName, rate, retained, total) {
    trackEvent('membership_retention_rate', {
      period: period,
      tier_id: tierId,
      tier_name: tierName,
      rate: rate,
      retained: retained,
      total: total
    });
  },

  trackVIPConversion(period, fromTierId, fromTierName, toTierId, toTierName, conversions) {
    trackEvent('membership_vip_conversion', {
      period: period,
      from_tier_id: fromTierId,
      from_tier_name: fromTierName,
      to_tier_id: toTierId,
      to_tier_name: toTierName,
      conversions: conversions
    });
  },

  trackCollectionEngagement(collectionName, accessLevel, views, purchases, tierBreakdown) {
    trackEvent('membership_collection_engagement', {
      collection_name: collectionName,
      access_level: accessLevel,
      views: views,
      purchases: purchases,
      tier_breakdown: tierBreakdown
    });
  },

  trackExclusiveReleasePerformance(releaseId, releaseName, editionType, tierId, tierName, sold, revenue, sellThroughRate) {
    trackEvent('membership_exclusive_release_performance', {
      release_id: releaseId,
      release_name: releaseName,
      edition_type: editionType,
      tier_id: tierId,
      tier_name: tierName,
      sold: sold,
      revenue: revenue,
      sell_through_rate: sellThroughRate
    });
  },

  trackMembershipGrowth(period, newMembers, totalMembers, growthRate, tierBreakdown) {
    trackEvent('membership_growth', {
      period: period,
      new_members: newMembers,
      total_members: totalMembers,
      growth_rate: growthRate,
      tier_breakdown: tierBreakdown
    });
  }
};

if (typeof window !== 'undefined') {
  window.MembershipAnalytics = MembershipAnalytics;
}

export default MembershipAnalytics;