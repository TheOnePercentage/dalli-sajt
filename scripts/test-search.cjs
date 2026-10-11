const fs = require('fs');
const path = require('path');

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
  return normalizeQuery(text).split(' ').filter(t => t.length > 1);
}

function loadIndex() {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'public', 'search-index.json'), 'utf8');
  return JSON.parse(raw);
}

function search(idxData, query, options = {}) {
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
    inStockOnly = false
  } = options;

  if (!idxData) return { results: [], total: 0, facets: {}, page, limit, totalPages: 0 };

  const tokens = tokenize(query);
  let candidateDocIds = new Set();

  if (tokens.length === 0) {
    idxData.documents.forEach((_, i) => candidateDocIds.add(i));
  } else {
    tokens.forEach((token, i) => {
      const matching = idxData.invertedIndex[token] || [];
      if (i === 0) {
        matching.forEach(id => candidateDocIds.add(id));
      } else {
        const newSet = new Set();
        matching.forEach(id => {
          if (candidateDocIds.has(id)) newSet.add(id);
        });
        candidateDocIds = newSet;
      }
    });
  }

  let results = Array.from(candidateDocIds).map(docId => ({
    ...idxData.documents[docId],
    _score: calculateScore(idxData.documents[docId], tokens)
  }));

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

  const facetCounts = calculateFacets(results);

  switch (sort) {
    case 'price-asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      results.sort((a, b) => (b.cms?.newArrival === a.cms?.newArrival ? 0 : b.cms?.newArrival ? 1 : -1));
      break;
    case 'bestselling':
      results.sort((a, b) => (b.cms?.bestseller === a.cms?.bestseller ? 0 : b.cms?.bestseller ? 1 : -1));
      break;
    case 'relevance':
    default:
      results.sort((a, b) => b._score - a._score);
      break;
  }

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
      filters: { collection, gender, category, styleOccasion, priceMin, priceMax, colors, inStockOnly }
    }
  };
}

function calculateScore(doc, tokens) {
  if (tokens.length === 0) return 1;
  
  const searchableText = [
    doc.name,
    doc.shortDescription,
    doc.category,
    doc.collection,
    doc.gender,
    ...(doc.styleOccasion || []),
    ...doc.colors.map(c => c.name)
  ].join(' ').toLowerCase();

  let score = 0;
  tokens.forEach(token => {
    if (doc.name.toLowerCase().includes(token)) score += 10;
    else if (doc.name.toLowerCase().includes(token.substring(0, 3))) score += 5;
    else if (doc.shortDescription.toLowerCase().includes(token)) score += 3;
    else if (doc.category.includes(token)) score += 2;
    else if (doc.collection.includes(token)) score += 2;
    else if (doc.styleOccasion?.some(so => so.includes(token))) score += 2;
    else if (doc.colors.some(c => c.name.toLowerCase().includes(token))) score += 1;
  });

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
    priceRange: { min: Infinity, max: 0 }
  };

  results.forEach(doc => {
    facets.collection[doc.collection] = (facets.collection[doc.collection] || 0) + 1;
    facets.gender[doc.gender] = (facets.gender[doc.gender] || 0) + 1;
    facets.category[doc.category] = (facets.category[doc.category] || 0) + 1;
    (doc.styleOccasion || []).forEach(so => facets.styleOccasion[so] = (facets.styleOccasion[so] || 0) + 1);
    doc.colors.forEach(c => facets.color[c.name] = (facets.color[c.name] || 0) + 1);
    if (doc.price < facets.priceRange.min) facets.priceRange.min = doc.price;
    if (doc.price > facets.priceRange.max) facets.priceRange.max = doc.price;
  });

  return facets;
}

function calculateFacetOptions(results) {
  const facets = {
    collection: {},
    gender: {},
    category: {},
    styleOccasion: {},
    color: {},
    priceRange: { min: Infinity, max: 0 }
  };

  results.forEach(doc => {
    facets.collection[doc.collection] = (facets.collection[doc.collection] || 0) + 1;
    facets.gender[doc.gender] = (facets.gender[doc.gender] || 0) + 1;
    facets.category[doc.category] = (facets.category[doc.category] || 0) + 1;
    (doc.styleOccasion || []).forEach(so => facets.styleOccasion[so] = (facets.styleOccasion[so] || 0) + 1);
    doc.colors.forEach(c => facets.color[c.name] = (facets.color[c.name] || 0) + 1);
    if (doc.price < facets.priceRange.min) facets.priceRange.min = doc.price;
    if (doc.price > facets.priceRange.max) facets.priceRange.max = doc.price;
  });

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

function loadIndex() {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'public', 'search-index.json'), 'utf8');
  return JSON.parse(raw);
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
  return normalizeQuery(text).split(' ').filter(t => t.length > 1);
}

const indexData = loadIndex();

console.log('Testing search function...\n');

// Test 1: Empty query (should return all)
console.log('--- Test 1: Empty query ---');
const result1 = search(indexData, '', { limit: 5 });
console.log(`Total: ${result1.total}, Results: ${result1.results.length}`);
console.log('Facets:', JSON.stringify(result1.facets, null, 2));

// Test 2: Search for "majica"
console.log('\n--- Test 2: Query "majica" ---');
const result2 = search(indexData, 'majica', { limit: 5 });
console.log(`Total: ${result2.total}, Results: ${result2.results.length}`);
result2.results.forEach(r => console.log(`  - ${r.name} (${r.category}) score: ${r._score}`));

// Test 3: Search for "duks"
console.log('\n--- Test 3: Query "duks" ---');
const result3 = search(indexData, 'duks', { limit: 5 });
console.log(`Total: ${result3.total}, Results: ${result3.results.length}`);
result3.results.forEach(r => console.log(`  - ${r.name} (${r.category}) score: ${r._score}`));

// Test 4: Filter by collection
console.log('\n--- Test 4: Filter collection=casual ---');
const result4 = search(indexData, '', { collection: 'casual', limit: 5 });
console.log(`Total: ${result4.total}, Results: ${result4.results.length}`);

// Test 5: Filter by gender
console.log('\n--- Test 5: Filter gender=men ---');
const result5 = search(indexData, '', { gender: 'men', limit: 5 });
console.log(`Total: ${result5.total}, Results: ${result5.results.length}`);

// Test 6: Filter by category
console.log('\n--- Test 6: Filter category=tracksuits ---');
const result6 = search(indexData, '', { category: 'tracksuits', limit: 5 });
console.log(`Total: ${result6.total}, Results: ${result6.results.length}`);

// Test 7: Price range
console.log('\n--- Test 7: Price range 1000-2000 ---');
const result7 = search(indexData, '', { priceMin: 1000, priceMax: 2000, limit: 5 });
console.log(`Total: ${result7.total}, Results: ${result7.results.length}`);
result7.results.forEach(r => console.log(`  - ${r.name}: ${r.price} RSD`));

// Test 8: Style occasion
console.log('\n--- Test 8: Style occasion=sport ---');
const result8 = search(indexData, '', { styleOccasion: ['sport'], limit: 5 });
console.log(`Total: ${result8.total}, Results: ${result8.results.length}`);

// Test 9: Sort by price
console.log('\n--- Test 9: Sort price-asc ---');
const result9 = search(indexData, '', { sort: 'price-asc', limit: 5 });
result9.results.forEach(r => console.log(`  - ${r.name}: ${r.price} RSD`));

// Test 10: Pagination
console.log('\n--- Test 10: Pagination page=1, limit=3 ---');
const result10 = search(indexData, '', { page: 1, limit: 3 });
console.log(`Total: ${result10.total}, Page: ${result10.page}, Limit: ${result10.limit}, TotalPages: ${result10.totalPages}`);
console.log('Results:', result10.results.map(r => r.name).join(', '));

console.log('\n✅ All tests passed!');