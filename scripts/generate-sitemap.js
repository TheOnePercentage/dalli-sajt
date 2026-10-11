#!/usr/bin/env node
/**
 * Unified Sitemap Generator
 * Automatically generates sitemap.xml from all data sources
 * Usage: node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = '/home/alpatron/Documents/Default Project/moonlight-sajt/data';
const OUTPUT_FILE = '/home/alpatron/Documents/Default Project/moonlight-sajt/public/sitemap.xml';
const BASE_URL = 'https://dalli.rs';

async function loadJSON(file) {
  const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
  return JSON.parse(content);
}

function generateSitemapEntry(loc, options = {}) {
  const {
    changefreq = 'weekly',
    priority = '0.5',
    lastmod = new Date().toISOString().split('T')[0],
    alternates = []
  } = options;

let entry = `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>`;

  if (alternates.length > 0) {
    for (const alt of alternates) {
      entry += `\n    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}"/>`;
    }
  }

  entry += `\n  </url>`;
  return entry;
}

async function main() {
  console.log('Generating unified sitemap...');

  // Load all data sources
  const [productsData, categoriesData, blogData, collectionsData] = await Promise.all([
    loadJSON('products.json').catch(() => ({ products: [] })),
    loadJSON('categories.json').catch(() => ({ categories: [] })),
    loadJSON('blog.json').catch(() => ({ posts: [], categories: [] })),
    loadJSON('collections.json').catch(() => ({ collections: [] }))
  ]);

  const urls = [];

  // 1. Homepage
  urls.push(generateSitemapEntry(`${BASE_URL}/`, {
    changefreq: 'daily',
    priority: '1.0'
  }));

  // 2. Static pages
  const staticPages = [
    { path: '/products.html', changefreq: 'daily', priority: '0.9' },
    { path: '/collections/', changefreq: 'weekly', priority: '0.8' },
    { path: '/blog-index.html', changefreq: 'daily', priority: '0.8' },
    { path: '/about.html', changefreq: 'monthly', priority: '0.7' },
    { path: '/craftsmanship.html', changefreq: 'monthly', priority: '0.7' },
    { path: '/materials.html', changefreq: 'monthly', priority: '0.7' },
    { path: '/size-guide.html', changefreq: 'monthly', priority: '0.5' },
    { path: '/settings.html', changefreq: 'yearly', priority: '0.3' },
    { path: '/newsletter.html', changefreq: 'weekly', priority: '0.6' },
    { path: '/complaints.html', changefreq: 'monthly', priority: '0.4' },
    { path: '/advertising.html', changefreq: 'monthly', priority: '0.4' }
  ];

  for (const page of staticPages) {
    urls.push(generateSitemapEntry(`${BASE_URL}${page.path}`, {
      changefreq: page.changefreq,
      priority: page.priority
    }));
  }

  // 3. Products
  const products = productsData.products || [];
  console.log(`Found ${products.length} products`);
  for (const product of products) {
    // Treat null/undefined status as published
    if (product.status && product.status !== 'published') continue;
    const slug = product.slug || product.id;
    urls.push(generateSitemapEntry(`${BASE_URL}/product/${slug}.html`, {
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: product.updatedAt ? product.updatedAt.split('T')[0] : product.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]
    }));
  }

  // 4. Categories
  const categories = categoriesData.categories || [];
  console.log(`Found ${categories.length} categories`);
  for (const category of categories) {
    // Treat null/undefined isActive as true
    if (category.isActive === false) continue;
    const slug = category.slug;
    const parentSlug = category.parentId ? categories.find(c => c.id === category.parentId)?.slug : null;
    
    let url;
    if (parentSlug) {
      url = `${BASE_URL}/casual/${parentSlug}/${slug}/`;
    } else {
      url = `${BASE_URL}/casual/${slug}/`;
    }
    
    urls.push(generateSitemapEntry(url, {
      changefreq: 'weekly',
      priority: parentSlug ? '0.7' : '0.9',
      lastmod: category.updatedAt?.split('T')[0] || category.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]
    }));
  }

  // 5. Blog posts
  const blogPosts = blogData.posts || [];
  console.log(`Found ${blogPosts.length} blog posts`);
  for (const post of blogPosts) {
    // Treat null/undefined status as published
    if (post.status && post.status !== 'published') continue;
    urls.push(generateSitemapEntry(`${BASE_URL}/blog/${post.slug}.html`, {
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: post.updatedAt?.split('T')[0] || post.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]
    }));
  }

  // 6. Collections
  const collections = collectionsData.collections || [];
  console.log(`Found ${collections.length} collections`);
  for (const collection of collections) {
    if (collection.status !== 'published') continue;
    urls.push(generateSitemapEntry(`${BASE_URL}/collections/${collection.slug}.html`, {
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: collection.updatedAt?.split('T')[0] || collection.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]
    }));
  }

  // 6. Collection index
  urls.push(generateSitemapEntry(`${BASE_URL}/collections/`, {
    changefreq: 'weekly',
    priority: '0.8'
  }));

  // Build sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  const outputPath = '/home/alpatron/Documents/Default Project/moonlight-sajt/public/sitemap.xml';
  fs.writeFileSync(outputPath, sitemap);
  
  console.log(`\nSitemap generated: ${outputPath}`);
  console.log(`Total URLs: ${urls.length}`);
  console.log('Sitemap generation complete!');
}

main().catch(console.error);