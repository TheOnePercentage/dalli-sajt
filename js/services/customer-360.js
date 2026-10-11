/**
 * Customer 360 Profile - Phase 24
 * Unified view of customer across all touchpoints
 */

export function createCustomer360Profile(customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    orders: [],
    wishlist: [],
    membership: null,
    conciergeActivity: [],
    storeVisits: [],
    appActivity: [],
    socialPurchases: [],
    returns: [],
    reviews: [],
    preferences: {},
    countries: [],
    languages: [],
    timeline: [],
    lifetimeValue: 0
  };
}

export function addTimelineEvent(profile, event) {
  if (!profile.timeline) profile.timeline = [];
  profile.timeline.push({
    id: `event_${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...event
  });
  return profile;
}
