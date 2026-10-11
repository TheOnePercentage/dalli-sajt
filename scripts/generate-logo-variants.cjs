const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../images');
const OUT_DIR = path.join(__dirname, '../public/images/logos');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function generate() {
  console.log('🎨 Generating logo variants...\n');

  // logo1.jpg — Master (763x628, aspect ~1.21)
  const logo1 = sharp(path.join(SRC_DIR, 'logo1.jpg'));
  
  // Header desktop: 56px height @ 2x = 112px, width = 112 * (763/628) = 136px
  await logo1.clone().resize({ height: 112 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo1-master@1x.webp'));
  console.log('✅ logo1-master@1x.webp (112px height)');
  
  // Header desktop retina: 224px height
  await logo1.clone().resize({ height: 224 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo1-master@2x.webp'));
  console.log('✅ logo1-master@2x.webp (224px height)');
  
  // Header mobile: 44px @ 2x = 88px height, width = 88 * (763/628) = 107px
  await logo1.clone().resize({ height: 88 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo1-mobile@1x.webp'));
  console.log('✅ logo1-mobile@1x.webp (88px height)');
  
  // Header mobile retina: 176px height
  await logo1.clone().resize({ height: 176 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo1-mobile@2x.webp'));
  console.log('✅ logo1-mobile@2x.webp (176px height)');
  
  // Footer: 32px @ 2x = 64px height
  await logo1.clone().resize({ height: 64 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo1-footer.webp'));
  console.log('✅ logo1-footer.webp (64px height)');

  // logo2.jpg — Dark Luxury (1020x1280, aspect ~0.80)
  const logo2 = sharp(path.join(SRC_DIR, 'logo2.jpg'));
  
  // Dark hero: 200px width (aspect 0.80 → height 250px)
  await logo2.clone().resize({ width: 200 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo2-dark@1x.webp'));
  console.log('✅ logo2-dark@1x.webp (200px width)');
  
  // Dark hero retina: 400px width
  await logo2.clone().resize({ width: 400 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo2-dark@2x.webp'));
  console.log('✅ logo2-dark@2x.webp (400px width)');

  // logo3.jpg — Horizontal Wordmark (1280x329, aspect ~3.89)
  const logo3 = sharp(path.join(SRC_DIR, 'logo3.jpg'));
  
  // Hero max: 800px width (height = 800/3.89 = 206px)
  await logo3.clone().resize({ width: 800 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo3-wordmark@1x.webp'));
  console.log('✅ logo3-wordmark@1x.webp (800px width)');
  
  // Hero retina: 1600px width
  await logo3.clone().resize({ width: 1600 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo3-wordmark@2x.webp'));
  console.log('✅ logo3-wordmark@2x.webp (1600px width)');
  
  // Tablet hero: 560px width
  await logo3.clone().resize({ width: 560 }).webp({ quality: 85 }).toFile(path.join(OUT_DIR, 'logo3-wordmark-tablet.webp'));
  console.log('✅ logo3-wordmark-tablet.webp (560px width)');

  // Favicon from logo1: 32x32 (crop to square from center)
  await logo1.clone().resize(32, 32, { fit: 'cover', position: 'center' }).png().toFile(path.join(OUT_DIR, 'favicon-32.png'));
  console.log('✅ favicon-32.png');
  
  // PWA 192x192
  await logo1.clone().resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(OUT_DIR, 'favicon-192.png'));
  console.log('✅ favicon-192.png');
  
  // PWA 512x512
  await logo1.clone().resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(OUT_DIR, 'favicon-512.png'));
  console.log('✅ favicon-512.png');
  
  // Apple touch icon 180x180
  await logo1.clone().resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png');

  // ICO (multiple sizes in one)
  await logo1.clone().resize(16, 16, { fit: 'cover', position: 'center' }).png().toFile(path.join(OUT_DIR, 'favicon-16.png'));
  await logo1.clone().resize(32, 32, { fit: 'cover', position: 'center' }).png().toFile(path.join(OUT_DIR, 'favicon-32.png'));
  await logo1.clone().resize(48, 48, { fit: 'cover', position: 'center' }).png().toFile(path.join(OUT_DIR, 'favicon-48.png'));
  console.log('✅ favicon PNGs for ICO generation');

  console.log('\n🎉 All logo variants generated in:', OUT_DIR);
}

generate().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});