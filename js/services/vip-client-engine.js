/**
 * VIP Client Classification & Management
 * Phase 21 - Architecture only
 */

const VIP_CONFIG_URL = '/data/vip-client-system.json';
let _cache = null;

async function loadConfig() {
  if (_cache) return _cache;
  try {
    const res = await fetch(VIP_CONFIG_URL);
    if (res.ok) {
      _cache = await res.json();
      return _cache;
    }
  } catch (e) {
    console.warn('[VIPClient] Failed to load', e);
  }
  return { tiers: [], segments: [] };
}

export async function getVIPTiers() {
  const cfg = await loadConfig();
  return cfg.tiers || [];
}

export async function getVIPSegments() {
  const cfg = await loadConfig();
  return cfg.segments || [];
}
