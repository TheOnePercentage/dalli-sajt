/**
 * Product Visibility (storefront)
 *
 * Reads the owner/admin visibility overlay (`/api/products-visibility`) and
 * filters the static catalog fetched from `/data/products.json` so that:
 *   - 'archived' products disappear from the whole storefront;
 *   - 'hidden' ("sakrij sa main page") products disappear from the main page
 *     (and are still reachable from category/search/detail pages).
 *
 * A single fetch interceptor keeps every existing product loader consistent
 * without touching each module.
 */

const VISIBILITY_URL = '/api/products-visibility';
const CACHE_KEY = 'dalli_product_visibility';
const CACHE_TTL = 60 * 1000;

const overlay = { hidden: [], archived: [] };
let overlayPromise = null;
let fetchPatched = false;

function normalize(data) {
  return {
    hidden: Array.isArray(data && data.hidden) ? data.hidden.map(String) : [],
    archived: Array.isArray(data && data.archived) ? data.archived.map(String) : [],
  };
}

function applyOverlay(data) {
  overlay.hidden = data.hidden;
  overlay.archived = data.archived;
  return overlay;
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Date.now() - (parsed.at || 0) < CACHE_TTL) return parsed.data;
  } catch (err) {
    // ignore
  }
  return null;
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch (err) {
    // ignore (private mode / quota)
  }
}

export async function loadProductVisibility(force = false) {
  if (!force && overlayPromise) return overlayPromise;
  overlayPromise = (async () => {
    if (!force) {
      const cached = readCache();
      if (cached) return applyOverlay(normalize(cached));
    }
    try {
      const res = await fetch(VISIBILITY_URL, { headers: { Accept: 'application/json' } });
      if (res && res.ok) {
        const data = await res.json();
        writeCache(data);
        return applyOverlay(normalize(data));
      }
    } catch (err) {
      // Offline / function unavailable — keep current overlay.
    }
    return overlay;
  })();
  return overlayPromise;
}

function isHomePage() {
  try {
    const path = location.pathname.replace(/\/+$/, '');
    return path === '' || path === '/' || /\/index\.html$/.test(location.pathname);
  } catch (err) {
    return true;
  }
}

function idsOf(product) {
  const out = [];
  if (product && product.id !== undefined && product.id !== null) out.push(String(product.id));
  if (product && product.slug) out.push(String(product.slug));
  return out;
}

export function isProductVisible(product, opts = {}) {
  const home = opts.home !== undefined ? opts.home : isHomePage();
  const ids = idsOf(product);
  const cmsStatus = (product && (product.cms?.status || product.cmsStatus)) || '';

  const isArchived = cmsStatus === 'archived' || ids.some(id => overlay.archived.includes(id));
  if (isArchived) return false;

  if (home) {
    const isHidden = cmsStatus === 'hidden' || ids.some(id => overlay.hidden.includes(id));
    if (isHidden) return false;
  }

  return true;
}

export function filterVisibleProducts(list, opts = {}) {
  if (!Array.isArray(list)) return list;
  return list.filter(p => isProductVisible(p, opts));
}

export function installProductVisibilityInterceptor() {
  if (fetchPatched || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  fetchPatched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input && input.url;
    if (!url || !/\/data\/products\.json(\?|$)/.test(url)) {
      return originalFetch(input, init);
    }

    await loadProductVisibility();
    const res = await originalFetch(input, init);
    if (!res || !res.ok) return res;

    try {
      const data = await res.clone().json();
      const list = Array.isArray(data) ? data : data && data.products;
      if (!Array.isArray(list)) return res;

      const filtered = filterVisibleProducts(list);
      const payload = Array.isArray(data) ? filtered : { ...data, products: filtered };
      return new Response(JSON.stringify(payload), {
        status: res.status,
        statusText: res.statusText,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return res;
    }
  };
}
