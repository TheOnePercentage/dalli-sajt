/**
 * Netlify Function - Product Visibility
 *
 * A lightweight overlay over the static product catalog (data/products.json)
 * that lets the owner/admin hide a product from the main page ("sakrij sa main
 * page") or archive it entirely ("arhiviraj") without editing files.
 *
 *   GET    /api/products-visibility              -> public { hidden, archived }
 *   GET    /api/v1/admin/products-visibility     -> admin  { overrides }
 *   PATCH  /api/v1/admin/products-visibility/:id -> set { status }
 *
 * Statuses: 'published' (default/explicit reset) | 'hidden' | 'archived'
 *
 * Public endpoint is read-only and only exposes id lists — never credentials or
 * product data. Admin writes require an x-admin-role header.
 */

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'products';
const VISIBILITY_KEY = 'visibility';
const STATUSES = ['published', 'hidden', 'archived'];

const OWNER_ROLES = ['vlasnik', 'owner', 'super_admin', 'superadmin', 'founder'];

function getProductStore() {
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

function lowerHeaders(event) {
  const out = {};
  const src = event.headers || {};
  Object.keys(src).forEach(k => {
    out[k.toLowerCase()] = src[k];
  });
  return out;
}

function getActor(event) {
  const headers = lowerHeaders(event);
  const role = String(headers['x-admin-role'] || '').toLowerCase();
  const name = headers['x-admin-name'] || headers['x-admin-email'] || 'Admin';
  const id = headers['x-admin-id'] || name;
  return { id, name: String(name), role, owner: OWNER_ROLES.includes(role) };
}

function parseSegments(event) {
  const raw = (event.path || '').replace(/\/+$/, '');
  return raw.split('/').filter(Boolean);
}

async function loadOverrides(store) {
  try {
    const map = await store.get(VISIBILITY_KEY, { type: 'json' });
    if (map && typeof map === 'object' && !Array.isArray(map)) return map;
  } catch (err) {
    if (err && err.message && !/404|not found/i.test(err.message)) {
      console.warn('[Products] Visibility read failed:', err.message);
    }
  }
  return {};
}

async function saveOverrides(store, map) {
  await store.setJSON(VISIBILITY_KEY, map);
}

function publicPayload(map) {
  const hidden = [];
  const archived = [];
  Object.entries(map).forEach(([id, entry]) => {
    const status = entry && entry.status ? entry.status : entry;
    if (status === 'hidden') hidden.push(id);
    else if (status === 'archived') archived.push(id);
  });
  return { hidden, archived };
}

export default async function handler(event) {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const segments = parseSegments(event);
  const store = getProductStore();

  const isAdminPublic = segments.includes('v1');
  const isPublicRead =
    segments[0] === 'api' && segments[1] === 'products-visibility' && method === 'GET';

  // ---- Public read (storefront) ----
  if (isPublicRead) {
    const map = await loadOverrides(store);
    return jsonResponse(200, publicPayload(map));
  }

  // ---- Everything below is admin ----
  const actor = getActor(event);
  if (!actor.role) {
    return jsonResponse(403, { success: false, error: 'Nedostaje x-admin-role.' });
  }
  if (!isAdminPublic) {
    return jsonResponse(404, { success: false, error: 'Nije pronađeno' });
  }

  const markerIndex = segments.indexOf('products-visibility');
  const targetId = markerIndex >= 0 ? segments[markerIndex + 1] : null;

  if (method === 'GET') {
    const map = await loadOverrides(store);
    return jsonResponse(200, { success: true, overrides: map });
  }

  if (method === 'PATCH' || method === 'PUT' || method === 'POST') {
    if (!targetId) {
      return jsonResponse(400, { success: false, error: 'Nedostaje ID proizvoda.' });
    }
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (err) {
      return jsonResponse(400, { success: false, error: 'Neispravan JSON' });
    }
    const status = String(body.status || '').toLowerCase();
    if (!STATUSES.includes(status)) {
      return jsonResponse(400, {
        success: false,
        error: `Nepoznat status. Dozvoljeno: ${STATUSES.join(', ')}`,
      });
    }

    const map = await loadOverrides(store);
    if (status === 'published') {
      delete map[targetId];
    } else {
      map[targetId] = {
        status,
        at: new Date().toISOString(),
        by: actor.name,
        byId: actor.id,
      };
    }
    await saveOverrides(store, map);
    return jsonResponse(200, { success: true, overrides: map });
  }

  return jsonResponse(405, { success: false, error: 'Method Not Allowed' });
}
