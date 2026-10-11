/**
 * Clienteling Engine - Relationship Building
 * Phase 21 - Architecture only, no external comms
 */

const CONFIG_URL = '/data/clienteling.json';
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
    console.warn('[Clienteling] Failed to load', e);
  }
  return { enabled: false, features: {} };
}

export async function isClientelingEnabled() {
  const cfg = await loadConfig();
  return cfg.enabled === true;
}

export async function getClientelingFeatures() {
  const cfg = await loadConfig();
  return cfg.features || {};
}
