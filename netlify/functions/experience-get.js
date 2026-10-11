/**
 * Netlify Function - Experience Center Get
 * Reads experience config from Netlify Blobs (scope=full | scope=public)
 */

import { getStore } from '@netlify/blobs';
import { createDefaultConfig, getPublicSlice } from '../../js/experience/experience-config.js';
import { evaluateScheduledTheme } from '../../js/experience/experience-mutations.js';

const STORE_NAME = 'experience';
const CONFIG_KEY = 'config';
const PUBLIC_KEY = 'public';

function getExperienceStore() {
  const options = { name: STORE_NAME };
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
    options.siteID = process.env.NETLIFY_SITE_ID;
    options.token = process.env.NETLIFY_AUTH_TOKEN;
  }
  return getStore(options);
}

async function loadConfig(store) {
  try {
    const config = await store.get(CONFIG_KEY, { type: 'json' });
    if (config && typeof config === 'object') return config;
  } catch (err) {
    if (err && err.message && !/404|not found/i.test(err.message)) {
      console.warn('[Experience Get] Config read failed:', err.message);
    }
  }
  return null;
}

export default async function handler(event) {
  if (event.httpMethod && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const params = event.queryStringParameters || {};
  const scope = params.scope === 'full' ? 'full' : 'public';

  try {
    const store = getExperienceStore();
    let config = await loadConfig(store);
    let needsRewrite = false;

    if (!config) {
      config = createDefaultConfig();
      needsRewrite = true;
    } else {
      const scheduled = evaluateScheduledTheme(config);
      if (scheduled.changed && scheduled.config) {
        config = scheduled.config;
        needsRewrite = true;
      }
    }

    if (needsRewrite) {
      try {
        await store.setJSON(CONFIG_KEY, config);
        await store.setJSON(PUBLIC_KEY, getPublicSlice(config));
      } catch (err) {
        console.warn('[Experience Get] Rewrite failed:', err.message);
      }
    }

    const payload = scope === 'full' ? config : getPublicSlice(config);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        success: true,
        scope,
        config: payload,
        updatedAt: config.updatedAt || null,
      }),
    };
  } catch (err) {
    console.error('[Experience Get] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
