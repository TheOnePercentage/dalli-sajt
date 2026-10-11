/**
 * Look Of The Week Renderer
 * Uses looks-engine.js to display curated look
 */
import { getLookOfTheWeek } from './js/services/looks-engine.js';
import { experienceStore } from './js/experience/experience-store.js';
import { getPublicSlice } from './js/experience/experience-config.js';

async function renderLookOfTheWeek() {
  const container = document.getElementById('lookOfWeekContent');
  const section = document.getElementById('lookOfTheWeek') || document.querySelector('[data-look-of-week]');
  if (!container) return;

  try {
    let cfg = {};
    try { if (experienceStore.getState) cfg = experienceStore.getState(); } catch (e) {}
    const publicCfg = getPublicSlice(cfg);
    const outfits = publicCfg.outfits || {};
    if (outfits.lookOfTheWeek === false) {
      if (section) section.style.display = 'none';
      return;
    }

    const look = await getLookOfTheWeek();
    if (!look) {
      if (section) section.style.display = 'none';
      return;
    }

    let productsHtml = '';
    if (look.products && look.products.length > 0) {
      productsHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-3); margin-top: var(--space-4);">
          ${look.products.slice(0, 4).map(p => {
            const img = p.images && p.images[0] ? p.images[0] : '';
            return `
              <a href="/product/${p.slug}.html" style="text-decoration: none; color: inherit; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; display: block;">
                <div style="width: 100%; height: 140px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                  ${img ? `<img src="${img}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : '<span>👔</span>'}
                </div>
                <div style="padding: var(--space-2);">
                  <div style="font-size: var(--text-xs); font-weight: var(--font-semibold); line-height: 1.3;">${escapeHtml(p.name)}</div>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="card" style="padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-xl); box-shadow: 0 8px 40px rgba(0,0,0,0.06);">
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          <div>
            <h3 style="margin: 0 0 var(--space-2); font-size: var(--text-2xl); font-weight: var(--font-bold);">${escapeHtml(look.name)}</h3>
            <p style="margin: 0; color: var(--color-text-secondary); line-height: 1.7;">${escapeHtml(look.description)}</p>
            <div style="margin-top: var(--space-2); font-size: var(--text-sm); color: var(--color-text-tertiary);">
              Style: <strong style="text-transform: capitalize;">${escapeHtml(look.style || '')}</strong> • Collection: <strong style="text-transform: capitalize;">${escapeHtml(look.collection || '')}</strong>
            </div>
          </div>
          ${productsHtml}
          <div style="margin-top: var(--space-3);">
            <a href="/looks/${look.id}.html" class="btn btn-primary">View Full Look</a>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.warn('[LookOfTheWeek] render failed:', err);
    if (section) section.style.display = 'none';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderLookOfTheWeek);
} else {
  renderLookOfTheWeek();
}
