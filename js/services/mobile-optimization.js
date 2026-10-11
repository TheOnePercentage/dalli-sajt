/**
 * Mobile-First Optimization Service - Phase 23
 * Architecture only
 */

const CONFIG_URL = '/data/mobile-optimization.json';
let _cache = null;

async function loadConfig() {
  if (_cache) return _cache;
  try {
    const res = await fetch(CONFIG_URL);
    if (res.ok) {
      _cache = await res.json();
      return _cache;
    }
  } catch (e) {
    console.warn('[MobileOpt] Failed to load config', e);
  }
  return { mobileFirst: true };
}

export async function isMobileFirstEnabled() {
  const cfg = await loadConfig();
  return cfg.mobileFirst === true;
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
}

export function supportsBiometrics() {
  return typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
}
