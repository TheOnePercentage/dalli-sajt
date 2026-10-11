/**
 * Netlify Function - Social Metrics
 * Real social media statistics for the accounts configured in the Experience
 * Center ("API i kredencijali" tab).
 *
 *   GET /api/v1/admin/social-metrics          -> { accounts, summary }
 *   GET /api/v1/admin/social-metrics?refresh=1
 *
 * Credentials are read server-side from the `experience` Blobs store and are
 * never returned to the client. When an account has no credentials the entry is
 * reported as `configured: false`; when a provider has no public metrics API it
 * is reported as `supported: false`. Nothing is ever fabricated.
 */

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'experience';
const CONFIG_KEY = 'config';

const GRAPH_VERSION = 'v20.0';
const FETCH_TIMEOUT = 8000;

function getExperienceStore() {
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

async function loadConfig(store) {
  try {
    const config = await store.get(CONFIG_KEY, { type: 'json' });
    if (config && typeof config === 'object') return config;
  } catch (err) {
    if (err && err.message && !/404|not found/i.test(err.message)) {
      console.warn('[Social Metrics] Config read failed:', err.message);
    }
  }
  return null;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text.slice(0, 200) };
    }
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchInstagram(cred) {
  const token = cred.accessToken;
  if (!token) return { ok: false, error: 'missing accessToken' };
  let igId = cred.businessAccountId;
  if (!igId && cred.pageId) {
    const page = await fetchJson(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(
        cred.pageId
      )}?fields=instagram_business_account&access_token=${encodeURIComponent(token)}`
    );
    if (page.ok) igId = page.data?.instagram_business_account?.id;
  }
  if (!igId) return { ok: false, error: 'missing businessAccountId/pageId' };
  const res = await fetchJson(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(
      igId
    )}?fields=username,followers_count,media_count&access_token=${encodeURIComponent(token)}`
  );
  if (!res.ok) return res;
  const d = res.data || {};
  return {
    ok: true,
    metrics: {
      followers: numberOrNull(d.followers_count),
      posts: numberOrNull(d.media_count),
      username: d.username || null,
    },
  };
}

async function fetchFacebook(cred) {
  const token = cred.accessToken;
  if (!token || !cred.pageId) return { ok: false, error: 'missing pageId/accessToken' };
  const res = await fetchJson(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(
      cred.pageId
    )}?fields=name,followers_count,fan_count&access_token=${encodeURIComponent(token)}`
  );
  if (!res.ok) return res;
  const d = res.data || {};
  return {
    ok: true,
    metrics: {
      followers: numberOrNull(d.followers_count),
      likes: numberOrNull(d.fan_count),
      name: d.name || null,
    },
  };
}

async function fetchYoutube(cred) {
  if (!cred.apiKey || !cred.channelId) return { ok: false, error: 'missing apiKey/channelId' };
  const res = await fetchJson(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(
      cred.channelId
    )}&key=${encodeURIComponent(cred.apiKey)}`
  );
  if (!res.ok) return res;
  const item = res.data?.items?.[0];
  if (!item) return { ok: false, error: 'channel not found' };
  return {
    ok: true,
    metrics: {
      followers: numberOrNull(item.statistics?.subscriberCount),
      videos: numberOrNull(item.statistics?.videoCount),
      views: numberOrNull(item.statistics?.viewCount),
      name: item.snippet?.title || null,
    },
  };
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const SUPPORTED = {
  instagram: fetchInstagram,
  facebook: fetchFacebook,
  youtube: fetchYoutube,
};

function providerConfigured(accounts) {
  if (!Array.isArray(accounts) || accounts.length === 0) return false;
  return accounts.some(
    a => a && Object.values(a).some(v => v !== '' && v !== null && v !== undefined)
  );
}

async function metricsForAccount(platform, cred) {
  const fn = SUPPORTED[platform];
  if (!fn) {
    return {
      supported: false,
      configured: providerConfigured([cred]),
      ok: false,
      error: 'provider has no public metrics API',
    };
  }
  if (!providerConfigured([cred])) {
    return { supported: true, configured: false, ok: false, error: 'not configured' };
  }
  const result = await fn(cred);
  return { supported: true, configured: true, ...result };
}

export default async function handler(event) {
  if (event.httpMethod && event.httpMethod !== 'GET') {
    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  }

  const store = getExperienceStore();
  const config = await loadConfig(store);
  const integrations = config?.integrations?.social || {};
  const socialAccounts = config?.social?.accounts || [];

  const accounts = [];
  let followers = 0;
  let connected = 0;
  let configuredCount = 0;

  for (const [platform, creds] of Object.entries(integrations)) {
    const list = Array.isArray(creds) && creds.length ? creds : [{}];
    for (const cred of list) {
      const result = await metricsForAccount(platform, cred || {});
      if (result.configured) configuredCount += 1;
      if (result.ok) connected += 1;
      if (result.ok && result.metrics?.followers != null) followers += result.metrics.followers;
      const match = socialAccounts.find(a => a.platform === platform);
      accounts.push({
        platform,
        handle: match?.handle || null,
        url: match?.url || null,
        supported: result.supported !== false,
        configured: !!result.configured,
        ok: !!result.ok,
        error: result.ok ? null : result.error || null,
        metrics: result.metrics || null,
      });
    }
  }

  return jsonResponse(200, {
    success: true,
    fetchedAt: new Date().toISOString(),
    connected,
    configured: configuredCount,
    summary: {
      followers,
      accounts: accounts.length,
      connected,
      configured: configuredCount,
    },
    accounts,
  });
}

export { metricsForAccount, providerConfigured };
