#!/usr/bin/env node
/**
 * Responsive Image Generator using Sharp
 * Generates WebP, AVIF, and responsive variants for images
 * Usage: node scripts/generate-responsive-images.js
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const IMAGES_DIR = '/home/alpatron/Documents/Default Project/moonlight-sajt/images';
const PUBLIC_DIR = '/home/alpatron/Documents/Default Project/moonlight-sajt/public/images';

const TARGET_SIZES = [320, 640, 960, 1280, 1920];
const WEBP_QUALITY = 80;
const AVIF_QUALITY = 50;

// Generate responsive variants for a single image
async function generateVariants(imagePath, relativePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const baseName = path.basename(imagePath, ext);
  const dir = path.dirname(imagePath);
  
  // Skip if already processed (has -320w variant)
  const variantPath = path.join(dir, `${baseName}-320w${ext}`);
  if (fs.existsSync(variantPath)) {
    return { skipped: true, reason: 'Already processed' };
  }
  
  // Skip SVGs - they're vector
  if (ext === '.svg') {
    return { skipped: true, reason: 'SVG (vector)' };
  }
  
  const results = {
    original: path.relative('/home/alpatron/Documents/Default Project/moonlight-sajt/images', imagePath),
    variants: [],
    webp: [],
    avif: []
  };
  
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    // Generate width variants
    for (const width of [320, 640, 960, 1280, 1920]) {
      // Skip if width is larger than original
      if (width > metadata.width) continue;
      
      const outName = `${path.basename(imagePath, ext)}-${width}w${ext}`;
      const outPath = path.join(dir, outName);
      
      try {
        await sharp(imagePath)
          .resize(width, null, { withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toFile(outPath);
        results.variants.push({ width, path: outName });
      } catch (e) {
        console.warn(`Failed to generate ${width}w variant for ${relativePath}:`, e.message);
      }
    }
    
    // Generate WebP variants
    for (const width of [320, 640, 960, 1280]) {
      if (width > metadata.width) continue;
      
      const outName = `${path.basename(imagePath, ext)}-${width}w.webp`;
      const outPath = path.join(dir, outName);
      
      try {
        await sharp(imagePath)
          .resize(width, null, { withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toFile(outPath);
        results.webp.push({ width, path: outName });
      } catch (e) {
        console.warn(`Failed to generate ${width}w WebP for ${relativePath}:`, e.message);
      }
    }
    
    // Generate AVIF (smaller subset for better compression)
    for (const width of [320, 640]) {
      if (width > metadata.width) continue;
      
      const outName = `${path.basename(imagePath, ext)}-${width}w.avif`;
      const outPath = path.join(dir, outName);
      
      try {
        await sharp(imagePath)
          .resize(width, null, { withoutEnlargement: true })
          .avif({ quality: 50, effort: 4 })
          .toFile(outPath);
        results.avif.push({ width, path: outName });
      } catch (e) {
        console.warn(`Failed to generate ${width}w AVIF for ${relativePath}:`, e.message);
      }
    }
    
    return results;
  } catch (e) {
    console.error(`Error processing ${relativePath}:`, e.message);
    return { skipped: true, reason: e.message };
  }
}

// Copy to public/images for Netlify
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Main function
async function main() {
  console.log('Starting responsive image generation with Sharp...');
  console.log('Source:', '/home/alpatron/Documents/Default Project/moonlight-sajt/images');
  console.log('');
  
  let totalProcessed = 0;
  let totalVariants = 0;
  let totalWebP = 0;
  let totalAVIF = 0;
  
  for (const sourceDir of ['categories', 'hero', 'logos', 'og', 'payments', 'root']) {
    const fullDir = sourceDir === 'root' 
      ? '/home/alpatron/Documents/Default Project/moonlight-sajt/images' 
      : path.join('/home/alpatron/Documents/Default Project/moonlight-sajt/images', sourceDir);
    
    if (!fs.existsSync(fullDir)) {
      console.log(`Skipping ${sourceDir} (not found)`);
      continue;
    }
    
    const files = fs.readdirSync(fullDir);
    const imageFiles = files.filter(f => 
      /\.(jpg|jpeg|png|webp)$/i.test(f) && 
      !/-(\d+)w\.(jpg|jpeg|png|webp|avif)$/i.test(f) &&
      !f.includes('thumb')
    );
    
    if (imageFiles.length === 0) {
      console.log(`\n${sourceDir}: No images to process`);
      continue;
    }
    
    console.log(`\nProcessing ${sourceDir} (${imageFiles.length} images)...`);
    
    for (const file of imageFiles) {
      const imgPath = path.join(fullDir, file);
      const baseName = path.basename(file, path.extname(file));
      const ext = path.extname(file);
      const variantPath = path.join(fullDir, `${baseName}-320w${ext}`);
      
      if (fs.existsSync(variantPath)) {
        console.log(`  ⊘ ${file} - Already processed`);
        continue;
      }
      
      // Skip SVGs
      if (path.extname(file).toLowerCase() === '.svg') {
        console.log(`  ⊘ ${file} - SVG (vector)`);
        continue;
      }
      
      const imgPath2 = path.join(fullDir, file);
      const relativePath = sourceDir === 'root' ? file : path.join(sourceDir, file);
      
      const result = await generateVariants(imgPath, relativePath);
      
      if (result.skipped) {
        console.log(`  ⊘ ${file} - ${result.reason}`);
        continue;
      }
      
      console.log(`  ✓ ${file}`);
      console.log(`    Variants: ${result.variants.length}, WebP: ${result.webp.length}, AVIF: ${result.avif.length}`);
      
      totalProcessed++;
      totalVariants += result.variants.length;
      totalWebP += result.webp.length;
      totalAVIF += result.avif.length;
    }
  }
  
  // Copy to public/images for Netlify
  console.log('\nCopying to public/images...');
  const PUBLIC_IMAGES_DIR = '/home/alpatron/Documents/Default Project/moonlight-sajt/public/images';
  if (!fs.existsSync(PUBLIC_IMAGES_DIR)) {
    fs.mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });
  }
  
  const copyDir = (src, dest) => {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      if (fs.statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  
  copyDir('/home/alpatron/Documents/Default Project/moonlight-sajt/images', '/home/alpatron/Documents/Default Project/moonlight-sajt/public/images');
  console.log('Copied to public/images/');
  
  console.log('\n========== SUMMARY ==========');
  console.log(`Images processed: ${totalProcessed}`);
  console.log(`Responsive variants: ${totalVariants}`);
  console.log(`WebP variants: ${totalWebP}`);
  console.log(`AVIF variants: ${totalAVIF}`);
  console.log('=============================');
}

main().catch(console.error);