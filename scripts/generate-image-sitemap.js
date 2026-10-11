#!/usr/bin/env node
/**
 * Image Sitemap Generator
 * Generates sitemap-image.xml for Google Images SEO
 * Usage: node scripts/generate-image-sitemap.js
 */

import fs from 'fs';
import path from 'path';

const IMAGES_DIR = '/home/alpatron/Documents/Default Project/moonlight-sajt/images';
const PUBLIC_DIR = '/home/alpatron/Documents/Default Project/moonlight-sajt/public/images';
const OUTPUT_FILE = '/home/alpatron/Documents/Default Project/moonlight-sajt/public/sitemap-image.xml';

const BASE_URL = 'https://dalli.rs';

function walkImages(dir, baseDir = '') {
  const results = [];
  
  if (!fs.existsSync(dir)) return results;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    const relPath = path.join(baseDir, file);
    
    if (stat.isDirectory()) {
      results.push(...walkImages(fullPath, relPath));
    } else if (/\.(jpg|jpeg|png|webp|avif)$/i.test(file) && !/-(\d+)w\.(jpg|jpeg|png|webp|avif)$/i.test(file)) {
      // Only include original images, not responsive variants
      results.push({
        src: `/images/${relPath}`,
        title: path.basename(file, path.extname(file)).replace(/[-_]/g, ' '),
        caption: `DALLI ${path.basename(file, path.extname(file)).replace(/[-_]/g, ' ')}`,
        lastmod: stat.mtime.toISOString().split('T')[0]
      });
    }
  }
  
  return results;
}

function generateSitemap() {
  console.log('Generating image sitemap...');
  
  const images = walkImages('/home/alpatron/Documents/Default Project/moonlight-sajt/images');
  
  console.log(`Found ${images.length} images`);
  
  const urls = images.map(item => {
    return `  <url>
    <loc>${BASE_URL}${item.src}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <image:image>
      <image:loc>${BASE_URL}${item.src}</image:loc>
      <image:title>${item.title}</image:title>
      <image:caption>${item.caption}</image:caption>
    </image:image>
  </url>`;
  }).join('\n');
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
  
  fs.writeFileSync(OUTPUT_FILE, sitemap);
  console.log(`Image sitemap written to ${OUTPUT_FILE}`);
  console.log(`Total images: ${images.length}`);
}

generateSitemap();