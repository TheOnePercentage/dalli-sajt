/**
 * Social Commerce Foundation - Phase 24
 * Architecture only
 */

export const SOCIAL_CHANNELS = ['instagram', 'facebook', 'whatsapp', 'tiktok', 'pinterest', 'youtube'];

export function createSocialOrder(orderData) {
  return {
    id: `social_${Date.now()}`,
    channel: orderData.channel || 'other',
    source: orderData.source || 'social',
    customer: orderData.customer || {},
    items: orderData.items || [],
    totals: orderData.totals || {},
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}
