/**
 * Netlify Function - Search API
 * Provides search functionality with faceting, filtering, and pagination
 * Uses pre-built search index from public/search-index.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = path.join(__dirname, '..', '..', 'public', 'search-index.json');

let searchIndex = null;

function loadIndex() {
  if (searchIndex) return searchIndex;

  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf8');
    searchIndex = JSON.parse(raw);
    return searchIndex;
  } catch (err) {
    console.error('[Search] Failed to load index:', err);
    return null;
  }
}

function normalizeQuery(query) {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeQuery(text)
    .split(' ')
    .filter(t => t.length > 1);
}

function search(index, query, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = 'relevance',
    collection,
    gender,
    category,
    styleOccasion,
    priceMin,
    priceMax,
    colors,
    inStockOnly = false,
  } = options;

  if (!index) return { results: [], total: 0, facets: {}, page, limit, totalPages: 0 };
  const tokens = tokenize(query);
  let candidateDocIds = new Set();

  // If no query, all documents are candidates
  if (tokens.length === 0) {
    index.documents.forEach((_, i) => candidateDocIds.add(i));
  } else {
    // Find documents matching all tokens (AND search)
    tokens.forEach((token, i) => {
      const matching = index.invertedIndex[token] || [];
      if (i === 0) {
        matching.forEach(id => candidateDocIds.add(id));
      } else {
        // Intersect with previous candidates
        const newSet = new Set();
        matching.forEach(id => {
          if (candidateDocIds.has(id)) newSet.add(id);
        });
        candidateDocIds = newSet;
      }
    });
  }

  // Convert to array and apply filters
  let results = Array.from(candidateDocIds).map(docId => ({
    ...index.documents[docId],
    _score: calculateScore(index.documents[docId], tokens),
  }));

  // Apply filters
  if (collection) {
    results = results.filter(r => r.collection === collection);
  }
  if (gender) {
    results = results.filter(r => r.gender === gender);
  }
  if (category) {
    results = results.filter(r => r.category === category);
  }
  if (styleOccasion) {
    const occasions = Array.isArray(styleOccasion) ? styleOccasion : [styleOccasion];
    results = results.filter(r => occasions.some(so => r.styleOccasion?.includes(so)));
  }
  if (colors && colors.length > 0) {
    results = results.filter(r => r.colors?.some(c => colors.includes(c.name)));
  }
  if (priceMin !== undefined) {
    results = results.filter(r => r.price >= priceMin);
  }
  if (priceMax !== undefined) {
    results = results.filter(r => r.price <= priceMax);
  }
  if (inStockOnly) {
    results = results.filter(r => r.sizes?.some(s => s.available));
  }

  // Sort
  switch (sort) {
    case 'price-asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      results.sort((a, b) =>
        b.cms?.newArrival === a.cms?.newArrival ? 0 : b.cms?.newArrival ? 1 : -1
      );
      break;
    case 'bestselling':
      results.sort((a, b) =>
        b.cms?.bestseller === a.cms?.bestseller ? 0 : b.cms?.bestseller ? 1 : -1
      );
      break;
    case 'relevance':
    default:
      results.sort((a, b) => b._score - a._score);
      break;
  }

  // Pagination
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = results.slice(start, start + limit);

  return {
    results: paginated.map(({ _score, ...r }) => r),
    total,
    page,
    limit,
    totalPages,
    facets: calculateFacetOptions(results),
    query: {
      original: query,
      tokens,
      filters: {
        collection,
        gender,
        category,
        styleOccasion,
        priceMin,
        priceMax,
        colors,
        inStockOnly,
      },
    },
  };
}

function calculateScore(doc, tokens) {
  if (tokens.length === 0) return 1;

  let score = 0;
  tokens.forEach(token => {
    // Exact phrase match in name
    if (doc.name.toLowerCase().includes(token)) score += 10;
    // Partial match in name
    else if (doc.name.toLowerCase().includes(token.substring(0, 3))) score += 5;
    // Match in description
    else if (doc.shortDescription.toLowerCase().includes(token)) score += 3;
    // Match in other fields
    else if (doc.category.includes(token)) score += 2;
    else if (doc.collection.includes(token)) score += 2;
    else if (doc.styleOccasion?.some(so => so.includes(token))) score += 2;
    else if (doc.colors.some(c => c.name.toLowerCase().includes(token))) score += 1;
  });

  // Boost featured/bestseller/new
  if (doc.cms?.featured) score += 5;
  if (doc.cms?.bestseller) score += 3;
  if (doc.cms?.newArrival) score += 2;

  return score;
}

function calculateFacets(results) {
  const facets = {
    collection: {},
    gender: {},
    category: {},
    styleOccasion: {},
    color: {},
    priceRange: { min: Infinity, max: 0 },
  };

  results.forEach(doc => {
    facets.collection[doc.collection] = (facets.collection[doc.collection] || 0) + 1;
    facets.gender[doc.gender] = (facets.gender[doc.gender] || 0) + 1;
    facets.category[doc.category] = (facets.category[doc.category] || 0) + 1;
    (doc.styleOccasion || []).forEach(
      so => (facets.styleOccasion[so] = (facets.styleOccasion[so] || 0) + 1)
    );
    doc.colors.forEach(c => (facets.color[c.name] = (facets.color[c.name] || 0) + 1));
    if (doc.price < facets.priceRange.min) facets.priceRange.min = doc.price;
    if (doc.price > facets.priceRange.max) facets.priceRange.max = doc.price;
  });

  return facets;
}

function calculateFacetOptions(results) {
  const facets = calculateFacets(results);
  const options = {};

  Object.keys(facets).forEach(key => {
    if (key === 'priceRange') {
      options[key] = facets[key];
    } else {
      options[key] = Object.entries(facets[key])
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    }
  });

  return options;
}

export default async function handler(event, _context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};

    // STEP 8: when the API (Prisma/PostgreSQL) is available, delegate to it.
    if (process.env.API_URL) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v != null) qs.set(k, v);
      });
      const upstream = await fetch(`${process.env.API_URL}/api/v1/search?${qs.toString()}`);
      const data = await upstream.json();
      return {
        statusCode: upstream.status,
        headers,
        body: JSON.stringify({
          success: upstream.ok,
          data,
          meta: { source: 'postgres', timestamp: new Date().toISOString() },
        }),
      };
    }

    // Parse query
    const query = params.q || params.query || '';

    // Parse filters
    const filters = {
      page: parseInt(params.page) || 1,
      limit: Math.min(parseInt(params.limit) || 20, 100),
      sort: params.sort || 'relevance',
      collection: params.collection,
      gender: params.gender,
      category: params.category,
      styleOccasion: params.styleOccasion ? params.styleOccasion.split(',') : undefined,
      priceMin: params.priceMin ? parseInt(params.priceMin) : undefined,
      priceMax: params.priceMax ? parseInt(params.priceMax) : undefined,
      colors: params.colors ? params.colors.split(',') : undefined,
      inStockOnly: params.inStock === 'true',
    };

    const result = search(loadIndex(), query, filters);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      }),
    };
  } catch (err) {
    console.error('[Search API] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Search failed',
        message: err.message,
      }),
    };
  }
}
