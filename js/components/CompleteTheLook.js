/**
 * Complete The Look Component
 * Dynamically renders outfit suggestions on product pages
 * Lightweight, no hardcoding, CSS-only styling
 */

import { buildCompleteLook, getRecommendedLooks, getStyleMatches, getCollectionMatches } from '../services/styling-engine.js';
import { getLooksForProduct } from '../services/looks-engine.js';

export async function renderCompleteTheLook(product, containerId = 'complete-the-look') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const [look, looks] = await Promise.all([
      buildCompleteLook(product, 4),
      getRecommendedLooks(product, 3)
    ]);

    if (look.length <= 1 && (!looks || looks.length === 0)) {
      container.style.display = 'none';
      return;
    }

    let html = `
      <section class="complete-look" style="margin: var(--space-10) 0;">
        <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); margin-bottom: var(--space-6);">Complete The Look</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-4);">
    `;

    look.slice(1).forEach(item => {
      html += `
        <a href="/product/${item.slug}.html" style="text-decoration: none; color: inherit; border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; display: block; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
          <div style="width: 100%; height: 200px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${item.images && item.images[0] ? `<img src="${item.images[0]}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : '<span style="font-size: 2rem;">🧥</span>'}
          </div>
          <div style="padding: var(--space-3);">
            <div style="font-size: var(--text-sm); font-weight: var(--font-semibold); margin-bottom: var(--space-1); line-height: 1.4;">${escapeHtml(item.name)}</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); text-transform: capitalize;">${escapeHtml(item.category || '')}</div>
            ${item.price ? `<div style="font-size: var(--text-sm); font-weight: var(--font-semibold); margin-top: var(--space-2);">€${Number(item.price).toFixed(2)}</div>` : ''}
          </div>
        </a>
      `;
    });

    html += `
        </div>
    `;

    if (looks && looks.length > 0) {
      html += `
        <h3 style="font-size: var(--text-lg); font-weight: var(--font-bold); margin: var(--space-8) 0 var(--space-4);">Featured Looks</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4);">
      `;
      looks.forEach(l => {
        html += `
          <a href="/looks/${l.id}.html" style="text-decoration: none; color: inherit; border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; display: block; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
            <div style="width: 100%; height: 160px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${l.heroImage ? `<img src="${l.heroImage}" alt="${l.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : '<span style="font-size: 1.8rem;">👔</span>'}
            </div>
            <div style="padding: var(--space-3);">
              <div style="font-size: var(--text-sm); font-weight: var(--font-semibold); margin-bottom: var(--space-1);">${escapeHtml(l.name)}</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); line-height: 1.4;">${escapeHtml(l.description || '')}</div>
            </div>
          </a>
        `;
      });
      html += `</div>`;
    }

    html += `</section>`;
    container.innerHTML = html;
  } catch (err) {
    console.warn('[CompleteTheLook] render failed:', err);
    container.style.display = 'none';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export async function renderStyleMatches(product, containerId = 'style-matches') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const { getStyleMatches, getCollectionMatches } = await import('./styling-engine.js');
    const [styleMatches, colMatches] = await Promise.all([
      getStyleMatches(product, 6),
      getCollectionMatches(product, 6)
    ]);

    if (!styleMatches.length && !colMatches.length) {
      container.style.display = 'none';
      return;
    }

    let html = `
      <section style="margin: var(--space-10) 0;">
    `;

    if (styleMatches.length > 0) {
      html += `
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin-bottom: var(--space-4);">Style Matches</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-6);">
      `;
      styleMatches.forEach(p => {
        html += `
          <a href="/product/${p.slug}.html" style="text-decoration: none; color: inherit; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; display: block; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
            <div style="width: 100%; height: 160px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center;">
              ${p.images && p.images[0] ? `<img src="${p.images[0]}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : '🧥'}
            </div>
            <div style="padding: var(--space-2);">
              <div style="font-size: var(--text-xs); font-weight: var(--font-semibold); line-height: 1.3;">${escapeHtml(p.name)}</div>
            </div>
          </a>
        `;
      });
      html += `</div>`;
    }

    if (colMatches.length > 0) {
      html += `
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin-bottom: var(--space-4);">More From Collection</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-3);">
      `;
      colMatches.forEach(p => {
        html += `
          <a href="/product/${p.slug}.html" style="text-decoration: none; color: inherit; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; display: block; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
            <div style="width: 100%; height: 160px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center;">
              ${p.images && p.images[0] ? `<img src="${p.images[0]}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : '🧥'}
            </div>
            <div style="padding: var(--space-2);">
              <div style="font-size: var(--text-xs); font-weight: var(--font-semibold); line-height: 1.3;">${escapeHtml(p.name)}</div>
            </div>
          </a>
        `;
      });
      html += `</div>`;
    }

    html += `</section>`;
    container.innerHTML = html;
  } catch (err) {
    console.warn('[StyleMatches] render failed:', err);
    container.style.display = 'none';
  }
}

export default { renderCompleteTheLook, renderStyleMatches };
