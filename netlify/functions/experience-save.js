/**
 * Netlify Function - Experience Center Save
 * Authorizes and persists Experience Center mutations to Netlify Blobs
 * Owner-only: theme activation/scheduling/rollback
 * Permission model lives in Core Platform RBAC (AuthManager / Roles),
 * enforced client-side today; server-side RBAC arrives with PostgreSQL + Prisma.
 */

import { getStore } from '@netlify/blobs';
import { createDefaultConfig, getPublicSlice } from '../../js/experience/experience-config.js';
import {
  applySectionUpdate,
  applyThemeAction,
  authorize,
} from '../../js/experience/experience-mutations.js';

const STORE_NAME = 'experience';
const CONFIG_KEY = 'config';
const PUBLIC_KEY = 'public';

const OWNER_ONLY_SCOPES = ['theme-action'];

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
      console.warn('[Experience Save] Config read failed:', err.message);
    }
  }
  return createDefaultConfig();
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

export default async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return jsonResponse(400, { success: false, error: 'Neispravan JSON' });
  }

  const role =
    (event.headers && (event.headers['x-experience-role'] || event.headers['X-Experience-Role'])) ||
    body.role;
  const scope = body.scope;

  if (!['section', 'theme-action'].includes(scope)) {
    return jsonResponse(400, { success: false, error: `Nepoznat scope: ${scope}` });
  }

  try {
    const store = getExperienceStore();
    const config = await loadConfig(store);

    const auth = authorize(role, config, OWNER_ONLY_SCOPES.includes(scope));
    if (!auth.ok) {
      return jsonResponse(403, { success: false, error: auth.error });
    }

    const by = `${auth.role}`;

    if (scope === 'section') {
      const result = applySectionUpdate(config, body.section, body.data, by);
      if (!result.ok) {
        return jsonResponse(400, { success: false, error: result.error });
      }
      const saved = result.config;
      await persist(store, saved);
      return jsonResponse(200, { success: true, config: saved });
    }

    if (scope === 'theme-action') {
      const result = applyThemeAction(config, body.action, body.data, by);
      if (!result.ok) {
        return jsonResponse(400, { success: false, error: result.error });
      }
      const saved = result.config;
      await persist(store, saved);
      return jsonResponse(200, { success: true, config: saved });
    }

    return jsonResponse(400, { success: false, error: 'Nepoznat scope' });
  } catch (err) {
    console.error('[Experience Save] Error:', err);
    return jsonResponse(500, { success: false, error: err.message });
  }
}

async function persist(store, config) {
  config.updatedAt = new Date().toISOString();
  await store.setJSON(CONFIG_KEY, config);
  await store.setJSON(PUBLIC_KEY, getPublicSlice(config));
}
