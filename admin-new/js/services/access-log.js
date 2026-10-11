/**
 * Admin Access Log Service
 * Records admin/employee sign-in activity (login/logout, IP, device, session)
 * through the `admin-access-log` Netlify Function, with a localStorage fallback
 * so the log still works in local/offline deployments.
 *
 * Displayed in the Employees section ("Pristup" tab).
 */

const ENDPOINT = '/.netlify/functions/admin-access-log';
const LOCAL_KEY = 'dalli_access_log';
const MAX_LOCAL = 500;
const SESSION_KEY = 'dalli_admin_session_id';

function uid() {
  return `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function localDevice() {
  const ua = navigator.userAgent || '';
  const lower = ua.toLowerCase();
  let device = 'desktop';
  if (/ipad|tablet|(android(?!.*mobile))/.test(lower)) device = 'tablet';
  else if (/mobi|iphone|ipod|android.*mobile/.test(lower)) device = 'mobile';

  let os = 'Nepoznat';
  if (/windows nt 10/.test(lower)) os = 'Windows 10/11';
  else if (/windows/.test(lower)) os = 'Windows';
  else if (/iphone|ipad|ipod/.test(lower)) os = 'iOS';
  else if (/mac os x/.test(lower)) os = 'macOS';
  else if (/android/.test(lower)) os = 'Android';
  else if (/linux/.test(lower)) os = 'Linux';

  let browser = 'Nepoznat';
  if (/edg\//.test(lower)) browser = 'Edge';
  else if (/opr\/|opera/.test(lower)) browser = 'Opera';
  else if (/chrome\/|crios\//.test(lower)) browser = 'Chrome';
  else if (/firefox\/|fxios\//.test(lower)) browser = 'Firefox';
  else if (/safari\//.test(lower)) browser = 'Safari';

  return { deviceType: device, os, browser, userAgent: ua.slice(0, 300) };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    return [];
  }
}

function writeLocal(entries) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, MAX_LOCAL)));
  } catch (err) {
    /* storage full / unavailable - ignore */
  }
}

function applyLocal(entry) {
  const log = readLocal();
  if (entry.type === 'login') {
    log.unshift(entry);
  } else {
    const idx = log.findIndex(
      e =>
        e.type === 'login' &&
        !e.logoutAt &&
        ((entry.sessionId && e.sessionId === entry.sessionId) ||
          (!entry.sessionId && e.email === entry.email))
    );
    if (idx !== -1) {
      log[idx].logoutAt = entry.at;
      const start = new Date(log[idx].at).getTime();
      const end = new Date(entry.at).getTime();
      log[idx].durationMs = end > start ? end - start : 0;
      log[idx].logoutIp = entry.ip;
      log[idx].logoutDevice = `${entry.deviceType} · ${entry.os} · ${entry.browser}`;
    } else {
      log.unshift(entry);
    }
  }
  writeLocal(log);
}

export const accessLog = {
  /**
   * Record a login or logout event. Best-effort: never throws.
   * @param {'login'|'logout'} type
   * @param {object} user  { id, name, email, role }
   */
  async record(type, user) {
    const device = localDevice();
    const entry = {
      id: uid(),
      at: new Date().toISOString(),
      type,
      sessionId: getSessionId(),
      userId: user?.id || null,
      name: user?.name || user?.email || 'Nepoznat',
      email: user?.email || null,
      role: user?.role || null,
      ip: 'local',
      device: device.deviceType,
      os: device.os,
      browser: device.browser,
      userAgent: device.userAgent,
      source: 'client',
    };

    // Optimistic local record (works offline and in local dev).
    applyLocal(entry);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          user: user || {},
          sessionId: entry.sessionId,
          device: { userAgent: device.userAgent },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.entry) return data.entry;
      }
    } catch (err) {
      /* function unavailable - local record already stored */
    }
    return entry;
  },

  /**
   * Read the access log. Prefers server (with IP), falls back to local.
   * @param {number} limit
   */
  async list(limit = 100) {
    try {
      const res = await fetch(`${ENDPOINT}?limit=${limit}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.entries) && data.entries.length) {
          return data.entries;
        }
      }
    } catch (err) {
      /* fall through to local */
    }
    return readLocal().slice(0, limit);
  },

  clearLocal() {
    writeLocal([]);
  },
};

export default accessLog;
