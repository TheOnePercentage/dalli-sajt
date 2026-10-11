#!/usr/bin/env node
/**
 * DALLI - Sitemap Generator
 * Emits URLs for pages that are actually produced by the FE/BE build pipeline:
 *   - existing static SPA pages (verified against the deployable output dir)
 *   - collection / gender / category landing pages derived from product data
 *   - product pages (one per hierarchy path)
 *   - blog posts
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://dalli.rs';
const OUTPUT = process.env.GENERATE_OUTPUT_DIR
  ? path.resolve(process.env.GENERATE_OUTPUT_DIR)
  : path.resolve('./dist');

const today = new Date().toISOString().split('T')[0];
const urls = [];

function existing(pathname) {
  const rel = pathname.replace(/^\//, '').replace(/\/$/, '');
  // Check for flat HTML file (e.g., casual/men/t-shirts/osnovna-majica.html)
  const flatFile = rel.endsWith('.html') ? rel : rel + '.html';
  // Check for directory with index.html (e.g., casual/men/t-shirts/index.html)
  const dirFile = rel.endsWith('.html') ? rel.replace('.html', '/index.html') : path.join(rel, 'index.html');
  return fs.existsSync(path.join(OUTPUT, flatFile)) || fs.existsSync(path.join(OUTPUT, dirFile));
}

function addUrl(pathname, changefreq = 'monthly', priority = 0.5, lastmod = today) {
  urls.push({ url: `${BASE_URL}${pathname}`, changefreq, priority, lastmod });
}

// 1. Static pages that exist in the deployable output
const staticPages = [
  ['/', 'daily', 1.0],
  ['/blog-index.html', 'weekly', 0.8],
  ['/cart.html', 'monthly', 0.5],
  ['/checkout.html', 'monthly', 0.5],
  ['/profile.html', 'monthly', 0.5],
  ['/orders.html', 'monthly', 0.5],
  ['/wishlist.html', 'monthly', 0.5],
  ['/settings.html', 'monthly', 0.5],
  ['/muska-garderoba.html', 'weekly', 0.8],
  ['/zenska-garderoba.html', 'weekly', 0.8],
  ['/dukseri.html', 'weekly', 0.8],
  ['/trenerke.html', 'weekly', 0.8],
  ['/majice.html', 'weekly', 0.8],
  ['/size-guide/', 'monthly', 0.5]
];
for (const [p, cf, pr] of staticPages) {
  if (p === '/' || existing(p)) addUrl(p, cf, pr);
}

// 2. Collection / gender / category pages derived from product data
let products = [];
try {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/products.json'), 'utf8'));
  products = data.products || [];
} catch (e) {
  console.warn('Could not load products:', e.message);
}

const collections = [...new Set(products.map(p => p.collection || 'casual'))];

// Gender -> category membership from data, mirroring the generator's grouping
const groups = {};
products.forEach(p => {
  const collection = p.collection || 'casual';
  const genders = Array.isArray(p.gender) ? p.gender : [p.gender || 'unisex'];
  const category = p.category || 'accessories';
  genders.forEach(gender => {
    groups[collection] = groups[collection] || {};
    groups[collection][gender] = groups[collection][gender] || new Set();
    groups[collection][gender].add(category);
  });
});

collections.forEach(collection => {
  addUrl(`/${collection}/`, 'weekly', 0.8);
  const collectionCategories = new Set(
    products.filter(p => (p.collection || 'casual') === collection).map(p => p.category)
  );
  ['men', 'women', 'unisex'].forEach(gender => {
    addUrl(`/${collection}/${gender}/`, 'monthly', 0.7);
    // unisex categories are materialized as aggregates; men/women categories
    // only exist when data has products under that exact combination
    const categories = gender === 'unisex'
      ? collectionCategories
      : (groups[collection]?.[gender] || new Set());
    categories.forEach(category => addUrl(`/${collection}/${gender}/${category}/`, 'monthly', 0.6));
  });
});

// 3. Product pages (one per hierarchy path)
products.forEach(product => {
  const hierarchyPaths = product.hierarchyPaths || [product.primaryHierarchy || {}];
  hierarchyPaths.forEach(hierarchy => {
    const collection = hierarchy.collection || product.collection || 'casual';
    const gender = hierarchy.gender || 'unisex';
    const category = hierarchy.category || product.category || 'accessories';
    addUrl(
      `/${collection}/${gender}/${category}/${product.slug}.html`,
      'weekly',
      0.7,
      product.updatedAt || product.cms?.updatedAt || today
    );
  });
});

// 4. Blog posts
try {
  const blogData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/blog.json'), 'utf8'));
  (blogData.posts || []).forEach(post => {
    addUrl(`/blog/${post.slug}.html`, 'monthly', 0.6, post.updatedAt || post.date || today);
  });
} catch (e) {
  console.warn('Could not load blog:', e.message);
}

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

for (const page of urls) {
  xml += `  <url>\n`;
  xml += `    <loc>${page.url}</loc>\n`;
  xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
  xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
  xml += `    <priority>${page.priority}</priority>\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="sr-RS" href="${page.url}" />\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="sr-Latn" href="${page.url}" />\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="sr-Cyrl" href="${page.url}" />\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${page.url}" />\n`;
  xml += `  </url>\n`;
}

xml += `</urlset>`;

const outputPath = path.resolve(OUTPUT, 'sitemap.xml');
const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outputPath, xml);
console.log(`✅ Sitemap generated: ${outputPath} (${urls.length} URL-ova)`);