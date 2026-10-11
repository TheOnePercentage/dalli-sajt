/**
 * DALLI Brand Content Loader
 * Loads brand.json, applies Experience Center overrides, renders into placeholders.
 * Lightweight - no dependencies, no heavy video libs.
 *
 * Usage:
 *   <div data-brand="brand.story.title"></div>
 *   <div data-brand-html="brand.story.content"></div>
 *   <section data-brand-section="trustBlocks"></section>
 */

const BRAND_DATA_URL = '/data/brand.json';
const CACHE_KEY = 'dalli_brand_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

let _brandData = null;
let _loadPromise = null;

function deepGet(obj, path) {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, obj);
}

function deepMerge(base, override) {
  if (override === null || override === undefined) return base;
  if (Array.isArray(override)) return override.slice();
  if (typeof override !== 'object') return override;
  if (base === null || base === undefined || typeof base !== 'object' || Array.isArray(base)) {
    return deepMerge({}, override);
  }
  const result = { ...base };
  Object.keys(override).forEach(key => {
    result[key] = deepMerge(base[key], override[key]);
  });
  return result;
}

function getCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch { return null; }
}

function setCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota exceeded - skip */ }
}

async function fetchExperienceOverride() {
  try {
    const res = await fetch('/.netlify/functions/experience-get', {
      headers: { 'X-Experience-Role': 'public' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.config?.brand || null;
  } catch { return null; }
}

export async function loadBrandData(force = false) {
  if (!force && _brandData) return _brandData;
  if (!force && _loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const cached = getCached();
      if (cached && !force) { _brandData = cached; return _brandData; }

      const res = await fetch(BRAND_DATA_URL);
      if (!res.ok) throw new Error(`Failed to load brand data: ${res.status}`);
      const data = await res.json();

      // Try Experience Center override
      const override = await fetchExperienceOverride();
      if (override) {
        Object.keys(override).forEach(section => {
          if (data[section] !== undefined) {
            data[section] = deepMerge(data[section], override[section]);
          } else {
            data[section] = override[section];
          }
        });
      }

      _brandData = data;
      setCache(data);
      return _brandData;
    } catch (err) {
      console.warn('[BrandContent] Load failed:', err);
      _brandData = _brandData || {};
      return _brandData;
    } finally {
      _loadPromise = null;
    }
  })();

  return _loadPromise;
}

export function getBrandData() { return _brandData; }

export function getBrandValue(path) {
  return deepGet(_brandData, path);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function paragraphsToHtml(text) {
  if (!text) return '';
  return text.split('\n\n').map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
}

function renderText(el, path, asHtml) {
  const val = deepGet(_brandData, path);
  if (val === undefined || val === null) return;
  if (asHtml) el.innerHTML = paragraphsToHtml(String(val));
  else el.textContent = String(val);
}

function renderTrustBlocks(container) {
  const tb = _brandData?.trustBlocks;
  if (!tb?.enabled || !Array.isArray(tb.blocks)) { container.style.display = 'none'; return; }
  const active = tb.blocks.filter(b => b.enabled);
  if (!active.length) { container.style.display = 'none'; return; }

  container.innerHTML = `
    <div class="brand-trust" style="padding:var(--space-8) 0">
      ${tb.title ? `<h2 style="text-align:center;font-size:var(--text-2xl);font-weight:var(--font-bold);margin-bottom:var(--space-6)">${escapeHtml(tb.title)}</h2>` : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-5)">
        ${active.map(b => `
          <div class="brand-trust__block" style="text-align:center;padding:var(--space-5);border:1px solid var(--color-border);border-radius:var(--radius-lg)">
            <div style="font-size:2rem;margin-bottom:var(--space-3)">${b.icon || '✦'}</div>
            <h3 style="font-size:var(--text-base);font-weight:var(--font-semibold);margin:0 0 var(--space-2)">${escapeHtml(b.title)}</h3>
            <p style="font-size:var(--text-sm);color:var(--color-text-tertiary);margin:0;line-height:1.6">${escapeHtml(b.description)}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStoryModules(container) {
  const sm = _brandData?.storyModules;
  if (!sm) return;

  const parts = [];

  if (sm.founderMessage?.enabled) {
    const fm = sm.founderMessage;
    parts.push(`
      <blockquote class="brand-story-module brand-story-module--founder" style="padding:var(--space-8);border-left:3px solid var(--color-primary);background:var(--color-bg-secondary);border-radius:var(--radius-lg);margin:var(--space-6) 0">
        <h3 style="font-size:var(--text-lg);font-weight:var(--font-bold);margin:0 0 var(--space-4)">${escapeHtml(fm.title)}</h3>
        <div style="font-size:var(--text-base);line-height:1.8;color:var(--color-text-secondary);font-style:italic">${paragraphsToHtml(fm.content)}</div>
        <footer style="margin-top:var(--space-4);font-weight:var(--font-semibold)">${escapeHtml(fm.signature || fm.author || '')}</footer>
      </blockquote>
    `);
  }

  if (sm.brandManifesto?.enabled) {
    const bm = sm.brandManifesto;
    parts.push(`
      <div class="brand-story-module brand-story-module--manifesto" style="padding:var(--space-8);background:var(--color-text-primary);color:var(--color-bg-primary);border-radius:var(--radius-lg);margin:var(--space-6) 0;text-align:center">
        <h3 style="font-size:var(--text-xl);font-weight:var(--font-bold);margin:0 0 var(--space-5)">${escapeHtml(bm.title)}</h3>
        <div style="font-size:var(--text-lg);line-height:2;max-width:600px;margin:0 auto">${bm.content.split('\n').map(l => l.trim() ? `<p style="margin:var(--space-2) 0">${escapeHtml(l)}</p>` : '').join('')}</div>
      </div>
    `);
  }

  if (sm.luxuryValues?.enabled) {
    const lv = sm.luxuryValues;
    parts.push(`
      <div class="brand-story-module brand-story-module--luxury-values" style="padding:var(--space-8);border:1px solid var(--color-border);border-radius:var(--radius-lg);margin:var(--space-6) 0">
        <h3 style="font-size:var(--text-lg);font-weight:var(--font-bold);margin:0 0 var(--space-5);text-align:center">${escapeHtml(lv.title)}</h3>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:var(--space-3);max-width:600px;margin:0 auto">
          ${(lv.items || []).map(item => `<li style="display:flex;align-items:flex-start;gap:var(--space-3);font-size:var(--text-base);line-height:1.6"><span style="color:var(--color-primary);font-size:var(--text-lg);line-height:1.4">✦</span><span>${escapeHtml(item)}</span></li>`).join('')}
        </ul>
      </div>
    `);
  }

  if (sm.sustainabilityMessage?.enabled) {
    const ssm = sm.sustainabilityMessage;
    parts.push(`
      <div class="brand-story-module brand-story-module--sustainability" style="padding:var(--space-8);background:linear-gradient(135deg, #f0fdf4, #ecfdf5);border:1px solid #bbf7d0;border-radius:var(--radius-lg);margin:var(--space-6) 0">
        <h3 style="font-size:var(--text-lg);font-weight:var(--font-bold);margin:0 0 var(--space-4);color:#166534">${escapeHtml(ssm.title)}</h3>
        <p style="font-size:var(--text-base);line-height:1.8;color:#15803d;margin:0">${paragraphsToHtml(ssm.content)}</p>
      </div>
    `);
  }

  if (parts.length) container.innerHTML = parts.join('');
}

function renderTimeline(container) {
  const heritage = _brandData?.brand?.heritage;
  if (!heritage?.enabled || !Array.isArray(heritage.timeline)) { container.style.display = 'none'; return; }

  container.innerHTML = `
    <div class="brand-heritage-timeline" style="padding:var(--space-8) 0">
      <h2 style="text-align:center;font-size:var(--text-2xl);font-weight:var(--font-bold);margin-bottom:var(--space-8)">${escapeHtml(heritage.title)}</h2>
      <div style="position:relative;max-width:700px;margin:0 auto">
        <div style="position:absolute;left:28px;top:0;bottom:0;width:2px;background:var(--color-border)"></div>
        ${heritage.timeline.map((item, i) => `
          <div style="position:relative;padding-left:72px;padding-bottom:var(--space-6)">
            <div style="position:absolute;left:0;top:0;width:56px;height:56px;border-radius:50%;background:var(--color-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:var(--font-bold);font-size:var(--text-sm);z-index:1">${escapeHtml(item.year)}</div>
            <h3 style="font-size:var(--text-base);font-weight:var(--font-semibold);margin:8px 0 var(--space-2)">${escapeHtml(item.title)}</h3>
            <p style="font-size:var(--text-sm);color:var(--color-text-tertiary);line-height:1.6;margin:0">${escapeHtml(item.description)}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderValuesGrid(container) {
  const values = _brandData?.brand?.values;
  if (!values?.enabled || !Array.isArray(values.items)) { container.style.display = 'none'; return; }

  container.innerHTML = `
    <div class="brand-values-grid" style="padding:var(--space-6) 0">
      <h2 style="text-align:center;font-size:var(--text-2xl);font-weight:var(--font-bold);margin-bottom:var(--space-6)">${escapeHtml(values.title)}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:var(--space-5)">
        ${values.items.map(v => `
          <div style="padding:var(--space-5);border:1px solid var(--color-border);border-radius:var(--radius-lg)">
            <div style="font-size:2rem;margin-bottom:var(--space-3)">${v.icon || '✦'}</div>
            <h3 style="font-size:var(--text-base);font-weight:var(--font-semibold);margin:0 0 var(--space-2)">${escapeHtml(v.title)}</h3>
            <p style="font-size:var(--text-sm);color:var(--color-text-tertiary);line-height:1.6;margin:0">${escapeHtml(v.description)}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function applyEditorialMode() {
  const em = _brandData?.editorialMode;
  if (!em?.enabled) {
    document.documentElement.classList.remove('editorial-mode');
    return;
  }
  document.documentElement.classList.add('editorial-mode');
  document.documentElement.dataset.editorialSettings = JSON.stringify(em.settings || {});

  // Reduce promotional elements
  if (em.settings?.reducePromotions) {
    document.querySelectorAll('.promo-badge, .sale-badge, .discount-banner').forEach(el => {
      el.style.display = 'none';
    });
  }
  if (em.settings?.hideSaleBadges) {
    document.querySelectorAll('[class*="sale"], [class*="discount"], [class*="promo"]').forEach(el => {
      if (el.classList.contains('brand-trust__block')) return;
      el.style.opacity = '0.7';
    });
  }
}

async function renderAll() {
  if (!_brandData) return;

  // Simple text/html placeholders
  document.querySelectorAll('[data-brand]').forEach(el => renderText(el, el.dataset.brand, false));
  document.querySelectorAll('[data-brand-html]').forEach(el => renderText(el, el.dataset.brandHtml, true));

  // Composite sections
  document.querySelectorAll('[data-brand-section="trustBlocks"]').forEach(renderTrustBlocks);
  document.querySelectorAll('[data-brand-section="storyModules"]').forEach(renderStoryModules);
  document.querySelectorAll('[data-brand-section="timeline"]').forEach(renderTimeline);
  document.querySelectorAll('[data-brand-section="values"]').forEach(renderValuesGrid);

  applyEditorialMode();
}

export async function initBrandContent() {
  await loadBrandData();
  await renderAll();

  // Re-render on Experience Center changes
  window.addEventListener('experience:changed', async () => {
    await loadBrandData(true);
    await renderAll();
  });
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initBrandContent());
} else {
  initBrandContent();
}

export default { initBrandContent, loadBrandData, getBrandData, getBrandValue };
