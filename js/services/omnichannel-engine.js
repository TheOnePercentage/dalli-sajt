/**
 * Omnichannel Engine - Phase 24
 * Unified commerce across all channels
 */

const CONFIG_URL = '/data/omnichannel.json';
let _cache = null;

async function loadConfig() {
  if (_cache) return _cache;
  try {
    const res = await fetch(CONFIG_URL);
    if (res.ok) { _cache = await res.json(); return _cache; }
  } catch (e) { console.warn('[Omnichannel]', e); }
  return { omnichannelEngine: true };
}

export async function isOmnichannelEnabled() {
  const cfg = await loadConfig();
  return cfg.omnichannelEngine !== false;
}

export function getChannels() {
  return ['website', 'instagram', 'facebook', 'whatsapp', 'tiktok', 'pinterest', 'store', 'wholesale', 'b2b', 'mobile_app', 'other'];
}
