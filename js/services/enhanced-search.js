/**
 * Enhanced Search - Wraps CMS search with Phase 17 styling intelligence
 * Provides unified search across products, looks, and editorial content
 */

import { searchUnified, extractStyleFromQuery, extractLookTypeFromQuery, getSearchSuggestions } from './search-intelligence.js';

// Enhanced search that combines CMS product search with styling intelligence
export async function enhancedSearch(query, options = {}) {
  const { limit = 20, includeLooks = true, includeProducts = true } = options;
  
  if (!query || query.length < 2) {
    return { products: [], looks: [], editorial: [], suggestions: [] };
  }

  // Get base product search results from CMS
  let productResults = [];
  try {
    if (window.CMS && typeof window.CMS.search === 'function') {
      productResults = window.CMS.search(query, { limit: Math.floor(limit * 0.7) });
    }
  } catch (e) {
    console.warn('[EnhancedSearch] CMS search failed:', e);
  }

  // Get styling intelligence results
  const intelligence = await searchUnified(query, { 
    limit, 
    includeLooks, 
    includeProducts 
  });

  // Extract style/look intent from query
  const styleIntent = extractStyleFromQuery(query);
  const lookIntent = extractLookTypeFromQuery(query);
  const suggestions = getSearchSuggestions(query);

  // Combine and deduplicate products
  const productMap = new Map();
  productResults.forEach(p => productMap.set(p.id, { ...p, source: 'cms', score: p.score || 0 }));
  intelligence.products.forEach(p => {
    const existing = productMap.get(p.id);
    if (!existing || (p.score || 0) > (existing.score || 0)) {
      productMap.set(p.id, { ...p, source: 'intelligence', score: p.score || 0 });
    }
  });

  const combinedProducts = Array.from(productMap.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, Math.floor(limit * 0.7));

  return {
    products: combinedProducts,
    looks: intelligence.looks.slice(0, Math.floor(limit * 0.3)),
    editorial: intelligence.editorial || [],
    suggestions,
    intent: {
      styles: styleIntent,
      looks: lookIntent
    },
    combined: [
      ...combinedProducts.map(p => ({ ...p, type: 'product' })),
      ...intelligence.looks.slice(0, Math.floor(limit * 0.3)).map(l => ({ ...l, type: 'look' }))
    ].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit)
  };
}

export async function renderEnhancedSearchResults(query, container) {
  const results = await enhancedSearch(query);
  
  if (!container) return;
  
  let html = '';
  
  // Render looks first if any
  if (results.looks.length > 0) {
    html += `
      <div class="search-section" style="margin-bottom: var(--space-6);">
        <h3 style="font-size: var(--text-sm); font-weight: var(--font-semibold); margin-bottom: var(--space-3); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">Curated Looks</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-3);">
    `;
    
    results.looks.forEach(look => {
      const heroImg = look.heroImage || '';
      html += `
        <a href="/looks/${look.id}.html" style="text-decoration: none; color: inherit; border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; display: block; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
          <div style="width: 100%; height: 160px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${heroImg ? `<img src="${heroImg}" alt="${look.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : '<span style="font-size: 1.5rem;">👔</span>'}
          </div>
          <div style="padding: var(--space-3);">
            <div style="font-size: var(--text-sm); font-weight: var(--font-semibold); margin-bottom: var(--space-1);">${escapeHtml(look.name)}</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); line-height: 1.4;">${escapeHtml(look.description || '')}</div>
            <div style="font-size: var(--text-xs); color: var(--color-primary); margin-top: var(--space-1); text-transform: capitalize;">${escapeHtml(look.style || '')} • ${escapeHtml(look.collection || '')}</div>
          </div>
        </a>
      `;
    });
    
    html += `</div></div>`;
  }
  
  // Render products
  if (results.products.length > 0) {
    html += `
      <div class="search-section" style="margin-bottom: var(--space-6);">
        <h3 style="font-size: var(--text-sm); font-weight: var(--font-semibold); margin-bottom: var(--space-3); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">Products</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-3);">
    `;
    
    results.products.forEach(product => {
      const img = product.images?.main || product.image || '';
      html += `
        <a href="/product/${product.slug}.html" style="text-decoration: none; color: inherit; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; display: block; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
          <div style="width: 100%; height: 160px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${img ? `<img src="${img}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : '<span>👕</span>'}
          </div>
          <div style="padding: var(--space-2);">
            <div style="font-size: var(--text-xs); font-weight: var(--font-semibold); line-height: 1.3;">${escapeHtml(product.name)}</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); text-transform: capitalize;">${escapeHtml(product.category || '')}</div>
            ${product.price ? `<div style="font-size: var(--text-xs); font-weight: var(--font-semibold); margin-top: var(--space-1); color: var(--color-primary);">${Number(product.price).toLocaleString('sr-RS')} RSD</div>` : ''}
          </div>
        </a>
      `;
    });
    
    html += `</div></div>`;
  }
  
  // Render suggestions
  if (results.suggestions.length > 0) {
    html += `
      <div class="search-section">
        <h3 style="font-size: var(--text-sm); font-weight: var(--font-semibold); margin-bottom: var(--space-3); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">Suggested Searches</h3>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
    `;
    
    results.suggestions.forEach(s => {
      html += `<button type="button" class="btn btn-ghost btn-sm" data-search-suggestion="${escapeHtml(s.value)}" style="text-transform: capitalize;">${escapeHtml(s.label)}</button>`;
    });
    
    html += `</div></div>`;
  }
  
  if (!html) {
    html = `
      <div class="search-empty" style="text-align: center; padding: var(--space-12); color: var(--color-text-tertiary);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto var(--space-4); opacity: 0.5;"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <p style="font-size: var(--text-lg); margin-bottom: var(--space-2);">No results for "${escapeHtml(query)}"</p>
        <p style="font-size: var(--text-sm);">Try searching for a style, occasion, or product name</p>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // Bind suggestion buttons
  container.querySelectorAll('[data-search-suggestion]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.querySelector('#searchModalInput, [data-action="search"] input, input[type="search"]');
      if (input) {
        input.value = btn.dataset.searchSuggestion;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// Auto-initialize if search modal exists
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('#searchModalInput, input[type="search"][data-enhanced]');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const resultsContainer = document.querySelector('#searchResults, [data-search-results]');
          if (resultsContainer && e.target.value.length >= 2) {
            renderEnhancedSearchResults(e.target.value, resultsContainer);
          }
        }, 250);
      });
    }
  });
}

export default {
  enhancedSearch,
  renderEnhancedSearchResults
};