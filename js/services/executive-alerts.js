/**
 * Executive Alert System - Phase 22
 * Architecture only
 */

export const ALERT_TYPES = [
  'low_inventory',
  'campaign_underperforming',
  'membership_decline',
  'conversion_drop',
  'shipping_problem',
  'finance_anomaly',
  'tax_deadline',
  'store_closure'
];

export function createAlert(type, message, severity = 'medium') {
  return {
    id: `alert_${Date.now()}`,
    type,
    message,
    severity,
    createdAt: new Date().toISOString(),
    acknowledged: false
  };
}
