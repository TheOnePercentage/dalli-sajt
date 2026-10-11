/**
 * PWA Enhancement - Phase 23
 * Architecture only
 */

export function isPWAInstalled() {
  return typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true);
}

export function getPWACapabilities() {
  return {
    installable: 'BeforeInstallPromptEvent' in window,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    pushSupported: 'PushManager' in window,
    notificationsSupported: 'Notification' in window,
    offlineSupported: 'caches' in window
  };
}
