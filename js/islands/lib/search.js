/**
 * search.js — pure logika za pretragu proizvoda nad /search-index.json.
 *
 * search-index.json generiše build (generate-sitemap-adjacent), sadrži ceo
 * produktski katalog sa slug, name, shortDescription, colors, sizes, prices.
 * URL se gradi isto kao što generiše collection/product pipeline.
 */

export function productUrl(doc) {
  const collection = doc.collection || 'casual';
  const gender = doc.gender || 'unisex';
  const category = doc.category ? `/${doc.category}` : '';
  const slug = doc.slug || doc.id;
  return `/${collection}/${gender}${category}/${slug}.html`;
}

export function searchProducts(documents = [], query = '') {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return [];
  const has = value =>
    String(value || '')
      .toLowerCase()
      .includes(q);

  return documents
    .map(doc => {
      let score = 0;
      if (has(doc.name)) score += 10;
      if (has(doc.shortDescription)) score += 5;
      if (has(doc.category)) score += 2;
      if (has(doc.sku)) score += 3;
      if ((doc.colors || []).some(c => c && has(c.name))) score += 2;
      if ((doc.styleOccasion || []).some(s => has(s))) score += 2;
      return { doc, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.doc);
}

export function displayPrice(doc) {
  return doc.salePrice ?? doc.price ?? 0;
}
