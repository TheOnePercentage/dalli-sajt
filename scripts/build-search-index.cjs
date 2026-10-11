/**
 * Netlify Function - Search Index Builder
 * Builds an in-memory search index from products.json for fast client-side search
 * Can be called at build time or on-demand
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'products.json');

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchIndex() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const { products } = JSON.parse(raw);

  const index = {
    version: '1.0',
    builtAt: new Date().toISOString(),
    totalProducts: products.length,
    documents: [],
    // Inverted index for fast term lookup
    invertedIndex: {},
    // Facets for filtering
    facets: {
      collection: {},
      gender: {},
      category: {},
      styleOccasion: {},
      color: {},
      priceRange: { min: Infinity, max: 0 }
    }
  };

  products.forEach((product, docId) => {
    // Build searchable text
    const searchableFields = [
      product.name,
      product.shortDescription,
      product.description,
      product.category,
      product.gender,
      product.collection,
      product.sku,
      ...(product.colors || []).map(c => c.name),
      ...(product.sizes || []).map(s => s.size),
      ...(product.styleOccasion || []),
      ...(product.cms?.searchKeywords || []),
      ...(product.cms?.lookIds || [])
    ].filter(Boolean);

    const searchableText = normalizeText(searchableFields.join(' '));
    const tokens = searchableText.split(' ').filter(t => t.length > 1);

    // Build document
    const doc = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      collection: product.collection,
      gender: product.gender,
      category: product.category,
      styleOccasion: product.styleOccasion || [],
      price: product.price,
      salePrice: product.salePrice,
      currency: product.currency,
      colors: (product.colors || []).map(c => ({ name: c.name, hex: c.hex })),
      sizes: (product.sizes || []).map(s => ({ size: s.size, available: s.available })),
      images: product.images,
      sku: product.sku,
      styleOccasion: product.styleOccasion || [],
      cms: {
        featured: product.cms?.featured,
        bestseller: product.cms?.bestseller,
        newArrival: product.cms?.newArrival,
        virtualTryOn: product.cms?.virtualTryOn?.eligible,
        product360: product.cms?.product360?.enabled
      }
    };

    index.documents.push(doc);

    // Build inverted index
    tokens.forEach(token => {
      if (!index.invertedIndex[token]) {
        index.invertedIndex[token] = [];
      }
      if (!index.invertedIndex[token].includes(docId)) {
        index.invertedIndex[token].push(docId);
      }
    });

    // Facets
    const coll = product.collection || 'casual';
    index.facets.collection[coll] = (index.facets.collection[coll] || 0) + 1;

    const gen = product.gender || 'unisex';
    index.facets.gender[gen] = (index.facets.gender[gen] || 0) + 1;

    const cat = product.category || 'accessories';
    index.facets.category[cat] = (index.facets.category[cat] || 0) + 1;

    (product.styleOccasion || []).forEach(so => {
      index.facets.styleOccasion[so] = (index.facets.styleOccasion[so] || 0) + 1;
    });

    (product.colors || []).forEach(c => {
      index.facets.color[c.name] = (index.facets.color[c.name] || 0) + 1;
    });

    if (product.price < index.facets.priceRange.min) index.facets.priceRange.min = product.price;
    if (product.price > index.facets.priceRange.max) index.facets.priceRange.max = product.price;
  });

  // Convert facet objects to arrays for easier client use
  Object.keys(index.facets).forEach(key => {
    if (typeof index.facets[key] === 'object' && !Array.isArray(index.facets[key]) && key !== 'priceRange') {
      index.facets[key] = Object.entries(index.facets[key])
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    }
  });

  return index;
}

// Build and output
const index = buildSearchIndex();

// Output to file for static serving
const outputPath = path.join(__dirname, '..', 'public', 'search-index.json');
fs.writeFileSync(outputPath, JSON.stringify(index), 'utf8');
console.log(`✅ Search index built: ${index.totalProducts} products, ${Object.keys(index.invertedIndex).length} unique terms`);

// Also output a minified version for production
const minPath = path.join(__dirname, '..', 'public', 'search-index.min.json');
fs.writeFileSync(minPath, JSON.stringify(index), 'utf8');
console.log(`✅ Minified index written`);

module.exports = { buildSearchIndex };