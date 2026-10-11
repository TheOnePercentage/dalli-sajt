/**
 * Experience Center - Pure Mutations
 * Storage-free mutation logic shared by browser store and Netlify save function
 */

import {
  createDefaultConfig,
  deepMerge,
  makeHistoryEntry,
  sanitizeConfigText,
  validateSection,
} from './experience-config.js';

const MAX_HISTORY = 50;
const MAX_AUDIT = 200;
const OWNER_ROLES = ['vlasnik', 'owner', 'super_admin'];

export function normalizeRole(role) {
  return String(role || '')
    .toLowerCase()
    .trim();
}

export function isOwnerRole(role) {
  return OWNER_ROLES.includes(normalizeRole(role));
}

export function authorize(role, config, ownerOnly) {
  const normalized = normalizeRole(role);

  if (!normalized || normalized === 'anonymous') {
    return { ok: false, error: 'Pristup odbijen - niste prijavljeni' };
  }

  if (isOwnerRole(normalized)) {
    return { ok: true, role: normalized, isOwner: true };
  }

  if (ownerOnly) {
    return { ok: false, error: 'Samo vlasnik sme vršiti ovu akciju' };
  }

  if (normalized === 'admin') {
    // Core RBAC (AuthManager / Roles / Permissions) is the authority for the
    // `experienceCenter` permission and is enforced client-side today.
    // Server-side enforcement arrives with the PostgreSQL + Prisma + RBAC architecture.
    return { ok: true, role: normalized, isOwner: false };
  }

  return { ok: false, error: 'Uloga nema pristup Experience Centru' };
}

export function applySectionUpdate(config, section, data, by) {
  const validation = validateSection(section, data);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const clean = sanitizeConfigText(data);
  const before = section === 'themes' ? null : config[section] || null;

  if (section === 'themes') {
    const existing = config.themes[clean.id];
    if (!existing) return { ok: false, error: 'Tema ne postoji' };
    config.themes[clean.id] = deepMerge(existing, clean);
  } else {
    const existing = config[section];
    config[section] = deepMerge(
      existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {},
      clean
    );
  }

  config.updatedBy = by || 'unknown';
  config.updatedAt = new Date().toISOString();
  pushAudit(config, section, before, config[section], by);
  return { ok: true, config };
}

function summarizeValue(value) {
  if (value === null || value === undefined) return String(value);
  try {
    const text = JSON.stringify(value);
    return text && text.length > 900 ? `${text.slice(0, 900)}…` : text;
  } catch (err) {
    return String(value);
  }
}

function pushAudit(config, section, before, after, by) {
  const entry = {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    by: by || 'unknown',
    section,
    before: summarizeValue(before),
    after: summarizeValue(after),
  };
  config.audit = config.audit || [];
  config.audit.unshift(entry);
  if (config.audit.length > MAX_AUDIT) {
    config.audit = config.audit.slice(0, MAX_AUDIT);
  }
}

export function applyThemeAction(config, action, payload, by) {
  const allowed = [
    'activateTheme',
    'scheduleTheme',
    'rollbackTheme',
    'cancelScheduledTheme',
    'previewTheme',
    'cancelPreview',
    'compareThemes',
  ];
  if (!allowed.includes(action)) {
    return { ok: false, error: `Nedozvoljena akcija: ${action}` };
  }

  if (action === 'activateTheme') {
    const themeId = payload && payload.themeId;
    if (!config.themes[themeId]) return { ok: false, error: 'Tema ne postoji' };
    if (themeId === config.activeThemeId) return { ok: false, error: 'Tema je već aktivna' };
    config.previousThemeId = config.activeThemeId;
    config.activeThemeId = themeId;
    config.scheduledTheme = null;
    pushHistory(config, action, themeId, by);
  }

  if (action === 'scheduleTheme') {
    const { themeId, startAt, endAt } = payload || {};
    if (!config.themes[themeId]) return { ok: false, error: 'Tema ne postoji' };
    if (!startAt) return { ok: false, error: 'Datum aktivacije je obavezan' };
    if (endAt && endAt < startAt) {
      return { ok: false, error: 'Kraj zakazivanja mora biti posle početka' };
    }
    config.scheduledTheme = { themeId, startAt, endAt: endAt || null, by: by || 'unknown' };
    pushHistory(config, action, themeId, by);
  }

  if (action === 'rollbackTheme') {
    const target = (payload && payload.themeId) || config.previousThemeId;
    if (!target || !config.themes[target]) {
      return { ok: false, error: 'Nema prethodne teme za vraćanje' };
    }
    const current = config.activeThemeId;
    config.activeThemeId = target;
    config.previousThemeId = current;
    config.scheduledTheme = null;
    pushHistory(config, action, target, by);
  }

  if (action === 'cancelScheduledTheme') {
    config.scheduledTheme = null;
    pushHistory(config, action, null, by);
  }

  if (action === 'previewTheme') {
    const themeId = payload && payload.themeId;
    if (!themeId) return { ok: false, error: 'Tema za pregled nije odabrana' };
    if (!config.themes[themeId]) return { ok: false, error: 'Tema ne postoji' };
    config.previewThemeId = themeId;
  }

  if (action === 'cancelPreview') {
    config.previewThemeId = null;
  }

  if (action === 'compareThemes') {
    const themes = payload && payload.themes;
    if (!Array.isArray(themes) || themes.length < 2) {
      return { ok: false, error: 'Potrebne su najmanje 2 teme za poređenje' };
    }
    for (const tid of themes) {
      if (!config.themes[tid]) return { ok: false, error: `Tema ne postoji: ${tid}` };
    }
    config.comparisonThemes = themes.slice(0, 3);
  }

  config.updatedBy = by || 'unknown';
  config.updatedAt = new Date().toISOString();
  return { ok: true, config };
}

export function evaluateScheduledTheme(config) {
  const scheduled = config.scheduledTheme;
  if (!scheduled) return { ok: true, changed: false, config };

  const now = new Date().toISOString();
  const started = scheduled.startAt <= now;
  const notEnded = !scheduled.endAt || scheduled.endAt > now;

  if (started && notEnded) {
    if (config.activeThemeId !== scheduled.themeId) {
      const result = applyThemeAction(
        config,
        'activateTheme',
        { themeId: scheduled.themeId },
        'scheduler'
      );
      return { ok: result.ok, changed: result.ok, config, error: result.error };
    }
    return { ok: true, changed: false, config };
  }

  if (scheduled.endAt && scheduled.endAt <= now) {
    if (config.activeThemeId === scheduled.themeId) {
      const fallback = config.previousThemeId || 'default';
      const result = applyThemeAction(config, 'activateTheme', { themeId: fallback }, 'scheduler');
      return { ok: result.ok, changed: result.ok, config, error: result.error };
    }
    config.scheduledTheme = null;
    return { ok: true, changed: true, config };
  }

  return { ok: true, changed: false, config };
}

function pushHistory(config, action, themeId, by) {
  config.history = config.history || [];
  config.history.unshift(makeHistoryEntry(action, themeId, by));
  if (config.history.length > MAX_HISTORY) {
    config.history = config.history.slice(0, MAX_HISTORY);
  }
}

export function mergeConfig(current, incoming) {
  const base = current && typeof current === 'object' ? current : createDefaultConfig();
  return deepMerge(base, incoming || {});
}
