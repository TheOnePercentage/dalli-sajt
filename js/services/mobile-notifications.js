/**
 * Mobile Notification Readiness - Phase 23
 * Architecture only
 */

export const NOTIFICATION_TYPES = [
  'orders', 'low_stock', 'vip_activity', 'membership_events',
  'finance_alerts', 'shipping_alerts'
];

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }
  return Notification.permission;
}

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}
