/**
 * Style Profile & Intelligence Engine
 * Phase 21 - Architecture only
 */

const STYLE_PROFILES_URL = '/data/style-profiles.json';
let _cache = null;

async function loadProfiles() {
  if (_cache) return _cache;
  try {
    const res = await fetch(STYLE_PROFILES_URL);
    if (res.ok) {
      _cache = await res.json();
      return _cache;
    }
  } catch (e) {
    console.warn('[StyleIntelligence] Failed to load', e);
  }
  return { profiles: [], default: 'mixed_style' };
}

export async function getStyleProfiles() {
  const cfg = await loadProfiles();
  return cfg.profiles || [];
}

export async function getDefaultStyleProfile() {
  const cfg = await loadProfiles();
  return cfg.default || 'mixed_style';
}
