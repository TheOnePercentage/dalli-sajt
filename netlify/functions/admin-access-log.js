/**
 * Netlify Function - Admin Access Log
 * Records and reads admin/employee sign-in activity:
 *   - login / logout time (server timestamps)
 *   - IP address (server-detected via Netlify connection headers)
 *   - device / browser / OS (parsed from User-Agent, both server + client supplied)
 *
 * Storage: Netlify Blobs store `admin-access`, key `log` (newest first).
 * GET  ?limit=100  -> { success, entries }
 * POST { type, user, sessionId, device } -> { success, entry }
 */

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'admin-access';
const LOG_KEY = 'log';
const MAX_ENTRIES = 500;

function getAccessStore() {
  const options = { name: STORE_NAME };
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
    options.siteID = process.env.NETLIFY_SITE_ID;
    options.token = process.env.NETLIFY_AUTH_TOKEN;
  }
  return getStore(options);
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

function headerValue(headers, name) {
  if (!headers) return '';
  const lower = name.toLowerCase();
  const found = Object.keys(headers).find(k => k.toLowerCase() === lower);
  return found ? headers[found] : '';
}

function extractIp(event) {
  const candidates = [
    headerValue(event.headers, 'x-nf-client-connection-ip'),
    headerValue(event.headers, 'client-ip'),
    headerValue(event.headers, 'x-real-ip'),
    headerValue(event.headers, 'x-forwarded-for'),
  ];
  for (const raw of candidates) {
    if (raw) {
      const first = String(raw).split(',')[0].trim();
      if (first) return first;
    }
  }
  return 'unknown';
}

function parseUserAgent(ua) {
  const agent = String(ua || '');
  const lower = agent.toLowerCase();

  let deviceType = 'desktop';
  if (/ipad|tablet|(android(?!.*mobile))/.test(lower)) deviceType = 'tablet';
  else if (/mobi|iphone|ipod|android.*mobile/.test(lower)) deviceType = 'mobile';

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

  return { deviceType, os, browser, userAgent: agent.slice(0, 300) };
}

async function loadLog(store) {
  try {
    const log = await store.get(LOG_KEY, { type: 'json' });
    if (Array.isArray(log)) return log;
  } catch (err) {
    if (err && err.message && !/404|not found/i.test(err.message)) {
      console.warn('[Admin Access] Log read failed:', err.message);
    }
  }
  return [];
}

export default async function handler(event) {
  const method = event.httpMethod || 'GET';

  try {
    const store = getAccessStore();

    if (method === 'GET') {
      const params = event.queryStringParameters || {};
      const limit = Math.min(parseInt(params.limit, 10) || 100, MAX_ENTRIES);
      const log = await loadLog(store);
      return jsonResponse(200, { success: true, entries: log.slice(0, limit), total: log.length });
    }

    if (method === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (err) {
        return jsonResponse(400, { success: false, error: 'Neispravan JSON' });
      }

      const type = body.type === 'logout' ? 'logout' : 'login';
      const user = body.user && typeof body.user === 'object' ? body.user : {};
      const ua = parseUserAgent(
        body.device && body.device.userAgent
          ? body.device.userAgent
          : headerValue(event.headers, 'user-agent')
      );

      const entry = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
        type,
        sessionId: body.sessionId || null,
        userId: user.id || null,
        name: user.name || user.email || 'Nepoznat',
        email: user.email || null,
        role: user.role || null,
        ip: extractIp(event),
        device: ua.deviceType,
        os: ua.os,
        browser: ua.browser,
        userAgent: ua.userAgent,
        source: 'server',
      };

      const log = await loadLog(store);

      if (type === 'login') {
        log.unshift(entry);
      } else {
        // Attach logout to the most recent open login for the same session/user.
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
          log[idx].logoutDevice = `${entry.device} · ${entry.os} · ${entry.browser}`;
        } else {
          log.unshift(entry);
        }
      }

      await store.setJSON(LOG_KEY, log.slice(0, MAX_ENTRIES));
      return jsonResponse(200, { success: true, entry });
    }

    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[Admin Access] Error:', err);
    return jsonResponse(500, { success: false, error: err.message });
  }
}
