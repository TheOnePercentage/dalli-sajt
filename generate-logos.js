const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'images');
const OUTPUT_DIR = path.join(__dirname, 'images/logos');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateLogos() {
  console.log('Generating logo variants...\n');

  // logo1.jpg - MASTER DALLI LOGO
  // Variants needed:
  // - logo1-master@1x.webp (56px height for desktop header)
  // - logo1-master@2x.webp (112px height for retina)
  // - logo1-mobile@1x.webp (44px height for mobile header)
  // - logo1-mobile@2x.webp (88px height for mobile retina)
  // - logo1-footer.webp (32px height for footer)

  console.log('Processing logo1.jpg (MASTER)...');
  const logo1 = sharp(path.join(SOURCE_DIR, 'logo1.jpg'));
  
  // Master desktop @1x (56px height)
  await logo1.clone()
    .resize({ height: 56 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo1-master@1x.webp'));
  console.log('  ✓ logo1-master@1x.webp (56px)');

  // Master desktop @2x (112px height)
  await logo1.clone()
    .resize({ height: 112 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo1-master@2x.webp'));
  console.log('  ✓ logo1-master@2x.webp (112px)');

  // Mobile @1x (44px height)
  await logo1.clone()
    .resize({ height: 44 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo1-mobile@1x.webp'));
  console.log('  ✓ logo1-mobile@1x.webp (44px)');

  // Mobile @2x (88px height)
  await logo1.clone()
    .resize({ height: 88 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo1-mobile@2x.webp'));
  console.log('  ✓ logo1-mobile@2x.webp (88px)');

  // Footer (32px height)
  await logo1.clone()
    .resize({ height: 32 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo1-footer.webp'));
  console.log('  ✓ logo1-footer.webp (32px)');

  // logo2.jpg - DARK LUXURY VARIANT
  // Variants needed:
  // - logo2-dark@1x.webp (80px height for large contexts)
  // - logo2-dark@2x.webp (160px height for retina)

  console.log('\nProcessing logo2.jpg (DARK LUXURY)...');
  const logo2 = sharp(path.join(SOURCE_DIR, 'logo2.jpg'));

  // Dark @1x (80px height)
  await logo2.clone()
    .resize({ height: 80 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo2-dark@1x.webp'));
  console.log('  ✓ logo2-dark@1x.webp (80px)');

  // Dark @2x (160px height)
  await logo2.clone()
    .resize({ height: 160 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo2-dark@2x.webp'));
  console.log('  ✓ logo2-dark@2x.webp (160px)');

  // logo3.jpg - HORIZONTAL WORDMARK
  // Variants needed:
  // - logo3-wordmark@1x.webp (800px max width for desktop hero)
  // - logo3-wordmark@2x.webp (1600px max width for retina)
  // - logo3-wordmark-tablet.webp (560px width for tablet)

  console.log('\nProcessing logo3.jpg (HORIZONTAL WORDMARK)...');
  const logo3 = sharp(path.join(SOURCE_DIR, 'logo3.jpg'));

  // Wordmark desktop @1x (800px width)
  await logo3.clone()
    .resize({ width: 800 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo3-wordmark@1x.webp'));
  console.log('  ✓ logo3-wordmark@1x.webp (800px wide)');

  // Wordmark desktop @2x (1600px width)
  await logo3.clone()
    .resize({ width: 1600 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo3-wordmark@2x.webp'));
  console.log('  ✓ logo3-wordmark@2x.webp (1600px wide)');

  // Wordmark tablet (560px width)
  await logo3.clone()
    .resize({ width: 560 })
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'logo3-wordmark-tablet.webp'));
  console.log('  ✓ logo3-wordmark-tablet.webp (560px wide)');

  // Also create favicon variants from logo1
  console.log('\nGenerating favicon variants from logo1...');
  const sizes = [16, 32, 48, 192, 512];
  for (const size of sizes) {
    await logo1.clone()
      .resize(size, size)
      .webp({ quality: 85 })
      .toFile(path.join(OUTPUT_DIR, `favicon-${size}.webp`));
    console.log(`  ✓ favicon-${size}.webp`);
  }

  // Apple touch icon (180x180)
  await logo1.clone()
    .resize(180, 180)
    .webp({ quality: 85 })
    .toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.webp'));
  console.log('  ✓ apple-touch-icon.webp (180px)');

  console.log('\n✅ All logo variants generated successfully!');
}

generateLogos().catch(err => {
  console.error('Error generating logos:', err);
  process.exit(1);
});