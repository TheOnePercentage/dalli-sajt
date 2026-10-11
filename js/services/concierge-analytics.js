/**
 * Concierge Analytics Tracker
 * Phase 21 - Architecture only
 */

const EVENTS = [
  'style_profile_created',
  'style_profile_updated',
  'collection_affinity',
  'vip_growth',
  'client_retention',
  'personalization_success',
  'look_conversion',
  'client_lifetime_value',
  'concierge_engagement',
  'membership_progression'
];

export function trackConciergeEvent(eventName, data = {}) {
  if (!EVENTS.includes(eventName)) return;
  try {
    if (window.dataLayer) {
      window.dataLayer.push({ event: 'concierge_' + eventName, ...data });
    }
  } catch (e) {
    // noop
  }
}
