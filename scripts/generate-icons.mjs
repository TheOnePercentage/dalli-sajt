#!/usr/bin/env node
/**
 * DALLI Icon Generator
 * Generates all required PWA icons from a source SVG
 * Requires: sharp (npm install sharp)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

const SHORTCUT_ICONS = [
  { name: 'muska-shortcut.png', label: 'Muška' },
  { name: 'zenska-shortcut.png', label: 'Ženska' },
  { name: 'cart-shortcut.png', label: 'Korpa' }
];

const BADGE_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const SOURCE_SVG = path.resolve(__dirname, '../public/images/favicon.svg');
const OUTPUT_DIR = path.resolve(__dirname, '../public/images/icons');
const SHORTCUT_DIR = path.resolve(__dirname, '../public/images/icons');
const BADGE_DIR = path.resolve(__dirname, '../public/images/icons');

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');

  // Ensure output directories exist
  for (const dir of [OUTPUT_DIR, SHORTCUT_DIR, BADGE_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }

  // Check source SVG exists
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error('❌ Source SVG not found:', SOURCE_SVG);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SOURCE_SVG);

  // Generate main icons
  console.log('\n📱 Generating main app icons...');
  for (const { size, name } of ICON_SIZES) {
    await generateIcon(svgBuffer, size, size, path.join(OUTPUT_DIR, name));
    console.log(`  ✅ ${name} (${size}x${size})`);
  }

  // Generate maskable versions
  console.log('\n🎭 Generating maskable icons...');
  for (const { size, name } of ICON_SIZES) {
    const maskableName = name.replace('.png', '-maskable.png');
    await generateMaskableIcon(svgBuffer, size, size, path.join(OUTPUT_DIR, maskableName));
    console.log(`  ✅ ${maskableName} (${size}x${size})`);
  }

  // Generate shortcut icons
  console.log('\n🔗 Generating shortcut icons...');
  for (const { name, label } of SHORTCUT_ICONS) {
    await generateShortcutIcon(label, 192, 192, path.join(SHORTCUT_DIR, name));
    console.log(`  ✅ ${name} (192x192)`);
  }

  // Generate badge icons
  console.log('\n🏷️ Generating badge icons...');
  for (const size of BADGE_SIZES) {
    const name = `badge-${size}x${size}.png`;
    await generateBadgeIcon(size, size, path.join(BADGE_DIR, name));
    console.log(`  ✅ ${name} (${size}x${size})`);
  }

  // Generate apple touch icon
  console.log('\n🍎 Generating Apple touch icon...');
  await generateIcon(svgBuffer, 180, 180, path.resolve(__dirname, '../public/images/icons/apple-touch-icon.png'));
  console.log('  ✅ apple-touch-icon.png (180x180)');

  // Generate favicon.ico
  console.log('\n🌐 Generating favicon.ico...');
  await generateFavicon();
  console.log('  ✅ favicon.ico');

  // Generate splash screens
  console.log('\n📱 Generating splash screens...');
  await generateSplashScreens();
  console.log('  ✅ Splash screens generated');

  // Generate screenshots placeholder
  console.log('\n📸 Generating screenshot placeholders...');
  await generateScreenshotPlaceholders();
  console.log('  ✅ Screenshot placeholders generated');

  console.log('\n✨ All icons generated successfully!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

async function generateIcon(svgBuffer, width, height, outputPath) {
  await sharp(svgBuffer)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(outputPath);
}

async function generateMaskableIcon(svgBuffer, width, height, outputPath) {
  // Add safe zone padding for maskable icons (40% safe zone)
  const padding = Math.min(width, height) * 0.1;
  const innerSize = Math.min(width, height) - padding * 2;

  await sharp(svgBuffer)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 26, g: 26, b: 46, alpha: 1 } // #1a1a2e
    })
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(outputPath);
}

async function generateShortcutIcon(label, width, height, outputPath) {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f0f1a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" rx="${width * 0.2}"/>
      <text x="${width/2}" y="${height/2 + 10}" font-family="Arial, sans-serif" font-size="${width * 0.12}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(path.resolve(outputPath));
}

async function generateBadgeIcon(width, height, outputPath) {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="badge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f7931a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f2a900;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${width/2}" cy="${height/2}" r="${width/2 - 4}" fill="url(#badge)"/>
      <text x="${width/2}" y="${height/2 + width*0.04}" font-family="Arial, sans-serif" font-size="${width * 0.3}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">₿</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(outputPath);
}

async function generateFavicon() {
  const sizes = [16, 32, 48, 64];
  const images = [];

  for (const size of sizes) {
    const buffer = await sharp(SOURCE_SVG)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    images.push(buffer);
  }

  // Create ICO with multiple sizes
  // For simplicity, we'll just use the 32x32 as favicon.ico
  const favicon32 = await sharp(SOURCE_SVG)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Convert PNG to ICO (simplified - just copy as .ico)
  fs.writeFileSync(path.resolve(__dirname, '../public/images/favicon.ico'), favicon32);
  fs.writeFileSync(path.resolve(__dirname, '../public/favicon.ico'), favicon32);
}

async function generateSplashScreens() {
  const splashDir = path.resolve(__dirname, '../public/images/splash');
  if (!fs.existsSync(splashDir)) {
    fs.mkdirSync(splashDir, { recursive: true });
  }

  const splashConfigs = [
    { name: 'splash-640x1136.png', width: 640, height: 1136 }, // iPhone 5/SE
    { name: 'splash-750x1334.png', width: 750, height: 1334 }, // iPhone 6/7/8
    { name: 'splash-828x1792.png', width: 828, height: 1792 }, // iPhone XR
    { name: 'splash-1125x2436.png', width: 1125, height: 2436 }, // iPhone X/XS
    { name: 'splash-1242x2688.png', width: 1242, height: 2688 }, // iPhone XS Max
    { name: 'splash-1536x2048.png', width: 1536, height: 2048 }, // iPad Pro
    { name: 'splash-1668x2388.png', width: 1668, height: 2388 }, // iPad Pro 12.9
    { name: 'splash-2048x2732.png', width: 2048, height: 2732 } // iPad Pro 12.9 (2020)
  ];

  const svgBuffer = fs.readFileSync(SOURCE_SVG);

  for (const { name, width, height } of splashConfigs) {
    await sharp(svgBuffer)
      .resize(width, height, { fit: 'cover', background: { r: 26, g: 26, b: 46 } })
      .png({ compressionLevel: 9 })
      .toFile(path.resolve(splashDir, name));
  }
}

async function generateScreenshotPlaceholders() {
  const screenshotDir = path.resolve(__dirname, '../public/images/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Mobile screenshot (390x844)
  await generateScreenshotPlaceholder(390, 844, path.resolve(screenshotDir, 'home-mobile.png'), 'Mobile');
  // Desktop screenshot (1920x1080)
  await generateScreenshotPlaceholder(1920, 1080, path.resolve(screenshotDir, 'home-desktop.png'), 'Desktop');
}

async function generateScreenshotPlaceholder(width, height, outputPath, label) {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0f"/>
          <stop offset="100%" style="stop-color:#1a1a2e"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#e74c3c"/>
          <stop offset="50%" style="stop-color:#f7931a"/>
          <stop offset="100%" style="stop-color:#e74c3c"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <g opacity="0.03">
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="0.5"/>
        </pattern>
        <rect width="${width}" height="${height}" fill="url(#grid)"/>
      </g>
      <g transform="translate(${width/2}, ${height/2})" text-anchor="middle">
        <text x="0" y="-60" font-family="system-ui, sans-serif" font-size="${width * 0.08}" font-weight="700" fill="white" letter-spacing="-0.02em">DALLI</text>
        <text x="0" y="20" font-family="system-ui, sans-serif" font-size="${width * 0.04}" fill="rgba(255,255,255,0.8)" font-weight="400">${label} Preview</text>
        <text x="0" y="80" font-family="system-ui, sans-serif" font-size="${width * 0.03}" fill="url(#accent)" font-weight="600">15% popust sa kripto</text>
      </g>
      <circle cx="${width/2}" cy="${height/2 + 180}" r="120" fill="none" stroke="url(#accent)" stroke-width="3" opacity="0.3"/>
      <text x="${width/2}" y="${height/2 + 186}" font-family="system-ui, sans-serif" font-size="${width * 0.1}" fill="url(#accent)" text-anchor="middle" dominant-baseline="middle" opacity="0.4">📦</text>
      <text x="${width/2}" y="${height - 60}" font-family="system-ui, sans-serif" font-size="${width * 0.04}" fill="rgba(255,255,255,0.5)" text-anchor="middle">dalli.rs</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ compressionLevel: 9 })
    .toFile(path.resolve(outputPath));
}

async function main() {
  try {
    await generateIcons();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

main();