/**
 * DALLI Luxury Concierge & Personal Shopper Ecosystem
 * Phase 21 - Core concierge engine (architecture only)
 */

const CONCIERGE_CONFIG_URL = '/data/concierge.json';
let _cache = null;

async function loadConfig() {
  if (_cache) return _cache;
  try {
    const res = await fetch(CONCIERGE_CONFIG_URL);
    if (res.ok) {
      _cache = await res.json();
      return _cache;
    }
  } catch (e) {
    console.warn('[Concierge] Failed to load config', e);
  }
  return { enabled: false };
}

export async function isConciergeEnabled() {
  const cfg = await loadConfig();
  return cfg.enabled === true && cfg.conciergeCenterEnabled !== false;
}

export async function isPersonalShopperEnabled() {
  const cfg = await loadConfig();
  return cfg.enabled === true && cfg.personalShopperEnabled !== false;
}

export async function isStyleIntelligenceEnabled() {
  const cfg = await loadConfig();
  return cfg.enabled === true && cfg.styleIntelligenceEnabled !== false;
}

export async function isVIPExperiencesEnabled() {
  const cfg = await loadConfig();
  return cfg.enabled === true && cfg.vipExperiencesEnabled !== false;
}

export async function isClientelingEnabled() {
  const cfg = await loadConfig();
  return cfg.enabled === true && cfg.clientelingEngineEnabled !== false;
}
