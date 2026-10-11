/**
 * Search Intelligence - Enhanced search for looks, outfits, and style queries
 * Integrates with existing CMS search engine
 */

import { getAllLooks } from './looks-engine.js';
import { getCompatibleProducts, normalizeStyles } from './styling-engine.js';

let _looksCache = null;
let _styleKeywords = {
  'business': ['business', 'poslovni', 'poslovna', 'office', 'radni', 'formalni', 'odelo', 'sako', 'košulja', 'pantalone'],
  'formal': ['formal', 'formalni', 'crni', 'black tie', 'gala', 'svadba', 'proslava', 'odlikovanje'],
  'evening': ['evening', 'večernji', 'večer', 'izlazak', 'klub', 'rođendan', 'cocktail', 'košulja', 'sako'],
  'smart-casual': ['smart casual', 'smart-casual', 'položaj', 'casual elegant', 'uredan', 'svakodnevni', 'poslovni casual'],
  'everyday': ['everyday', 'svakodnevni', 'casual', 'opušteni', 'relax', 'kućni', 'šetnja', 'kafa'],
  'travel': ['travel', 'putovanje', 'put', 'avion', 'let', 'gep', 'prtljag', 'udobni', 'praktični'],
  'sport': ['sport', 'sportski', 'trening', 'fitness', 'teretana', 'trčanje', 'rekreacija', 'aktivni'],
  'special-occasion': ['special occasion', 'special-occasion', 'slava', 'rođendan', 'jubilej', 'godišnjica', 'specijalni'],
  'luxury-essentials': ['luxury essentials', 'luxury-essentials', 'osnovni', 'temeljna', 'osnova', 'kvalitet', 'dugotrajni', 'investicija']
};

let _lookKeywords = {
  'business look': ['business look', 'business outfit', 'poslovni izgled', 'poslovna kombinacija', 'radni look'],
  'formal look': ['formal look', 'formal outfit', 'formalni izgled', 'crni tie', 'gala look'],
  'smart casual': ['smart casual', 'smart casual look', 'smart casual outfit', 'položaj look'],
  'travel look': ['travel look', 'travel outfit', 'putnički look', 'putovanje outfit'],
  'evening look': ['evening look', 'evening outfit', 'večernji look', 'izlazak look'],
  'luxury essentials': ['luxury essentials', 'luxury essentials look', 'temeljna garderoba'],
  'weekend look': ['weekend look', 'weekend outfit', 'vikend look', 'opušteni look']
};

function buildLookSearchIndex(looks) {
  return looks.map(look => ({
    id: look.id,
    name: look.name,
    description: look.description || '',
    style: look.style,
    collection: look.collection,
    season: look.season,
    priority: look.priority || 0,
    products: look.products || [],
    searchable: `${look.name} ${look.description || ''} ${look.style} ${look.collection} ${look.season}`.toLowerCase()
  }));
}

function buildStyleSearchIndex(products) {
  return products
    .filter(p => p.status !== 'draft' && p.status !== 'archived')
    .map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      styleOccasion: normalizeStyles(p.styleOccasion),
      collection: p.collection,
      gender: Array.isArray(p.gender) ? p.gender : [p.gender],
      price: p.price,
      searchable: `${p.name} ${p.category} ${p.shortDescription || ''} ${normalizeStyles(p.styleOccasion).join(' ')} ${p.collection}`.toLowerCase()
    }));
}

export async function searchLooks(query, limit = 10) {
  if (!_looksCache) {
    const { looks } = await getAllLooks();
    _looksCache = buildLookSearchIndex(looks.looks || []);
  }

  if (!query || query.length < 2) return _looksCache.slice(0, limit);

  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  
  return _looksCache
    .map(look => {
      let score = 0;
      terms.forEach(term => {
        if (look.name.toLowerCase().includes(term)) score += 5;
        if (look.style && look.style.includes(term)) score += 3;
        if (look.collection && look.collection.includes(term)) score += 2;
        if (look.searchable.includes(term)) score += 1;
      });
      return { ...look, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function searchByStyle(query, limit = 20) {
  const { products } = await import('/data/products.json').catch(() => ({ default: { products: [] } }));
  const productList = products.products || products || [];
  const styleIndex = buildStyleSearchIndex(productList);

  if (!query || query.length < 2) return styleIndex.slice(0, limit);

  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  
  return styleIndex
    .map(item => {
      let score = 0;
      terms.forEach(term => {
        if (item.name.toLowerCase().includes(term)) score += 5;
        if (item.category.toLowerCase().includes(term)) score += 3;
        if (item.styleOccasion?.some(s => s.includes(term))) score += 4;
        if (item.collection && item.collection.includes(term)) score += 2;
        if (item.searchable.includes(term)) score += 1;
      });
      return { ...item, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function searchOutfits(query, limit = 10) {
  const looks = await searchLooks(query, limit);
  const products = await searchByStyle(query, limit);
  
  return {
    looks,
    products,
    combined: [...looks.map(l => ({ ...l, type: 'look' })), ...products.map(p => ({ ...p, type: 'product' }))]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  };
}

export function getStyleSuggestions(partialQuery) {
  if (!partialQuery || partialQuery.length < 2) return [];
  
  const lower = partialQuery.toLowerCase();
  const suggestions = [];
  
  Object.keys(_styleKeywords).forEach(style => {
    const keywords = _styleKeywords[style];
    if (keywords.some(k => k.toLowerCase().includes(lower))) {
      suggestions.push({ type: 'style', value: style, label: style.charAt(0).toUpperCase() + style.slice(1) });
    }
  });
  
  Object.keys(_lookKeywords).forEach(look => {
    const keywords = _lookKeywords[look];
    if (keywords.some(k => k.toLowerCase().includes(lower))) {
      suggestions.push({ type: 'look', value: look, label: look.replace(/\b\w/g, l => l.toUpperCase()) });
    }
  });
  
  return suggestions.slice(0, 8);
}

export function getSearchSuggestions(query) {
  const styleSuggestions = getStyleSuggestions(query);
  return styleSuggestions;
}

export async function searchUnified(query, options = {}) {
  const { includeLooks = true, includeProducts = true, limit = 20 } = options;
  
  if (!query || query.length < 2) {
    return { looks: [], products: [], editorial: [] };
  }

  const [looks, products] = await Promise.all([
    includeLooks ? searchLooks(query, limit) : [],
    includeProducts ? searchByStyle(query, limit) : []
  ]);

  return {
    looks,
    products,
    editorial: [],
    combined: [
      ...looks.map(l => ({ ...l, type: 'look', score: l.score })),
      ...products.map(p => ({ ...p, type: 'product', score: p.score }))
    ].sort((a, b) => b.score - a.score).slice(0, limit)
  };
}

export function extractStyleFromQuery(query) {
  if (!query) return [];
  
  const lower = query.toLowerCase();
  const matchedStyles = [];
  
  Object.entries(_styleKeywords).forEach(([style, keywords]) => {
    if (keywords.some(k => lower.includes(k.toLowerCase()))) {
      matchedStyles.push(style);
    }
  });
  
  return matchedStyles;
}

export function extractLookTypeFromQuery(query) {
  if (!query) return [];
  
  const lower = query.toLowerCase();
  const matchedLooks = [];
  
  Object.entries(_lookKeywords).forEach(([look, keywords]) => {
    if (keywords.some(k => lower.includes(k.toLowerCase()))) {
      matchedLooks.push(look);
    }
  });
  
  return matchedLooks;
}

export default {
  searchLooks,
  searchByStyle,
  searchOutfits,
  searchUnified,
  getSearchSuggestions,
  extractStyleFromQuery,
  extractLookTypeFromQuery
};