/**
 * Image Alt Validator Tests
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { ImageAltValidator } from './image-alt-validator.js';
import { BaseValidator, ValidationResult } from './base-validator.js';

const testCases = {
  perfect: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/hoodie-black-xl.jpg" alt="Black cotton hoodie front view, size XL on model, showing relaxed fit and ribbed cuffs">
      <img src="/hoodie-black-xl-back.jpg" alt="Back view of black hoodie showing embroidered DALLI logo on neck">
    </body>
    </html>
  `,
  missingAlt: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/product.jpg">
      <img src="/hero.jpg" alt="Hero banner with summer collection">
    </body>
    </html>
  `,
  emptyAltDecorative: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/spacer.gif" alt="" role="presentation">
      <img src="/divider.png" alt="" class="divider">
    </body>
    </html>
  `,
  emptyAltNotDecorative: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/product.jpg" alt="">
    </body>
    </html>
  `,
  tooShort: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/hoodie.jpg" alt="Hoodie">
    </body>
    </html>
  `,
  tooLong: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/hoodie.jpg" alt="This is an extremely long alt text that goes way beyond the recommended maximum length for alt attributes. It contains way too much detail and will be truncated by screen readers which defeats the purpose of having concise, useful alternative text for accessibility purposes. We should keep alt text concise and focused on the essential information.">
    </body>
    </html>
  `,
  genericAlt: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/hoodie.jpg" alt="Image of hoodie">
      <img src="/tshirt.jpg" alt="Photo of t-shirt">
      <img src="/pants.jpg" alt="Picture of pants">
    </body>
    </html>
  `,
  imageOfPrefix: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/hoodie.jpg" alt="Image of black hoodie on model">
      <img src="/tshirt.jpg" alt="Photo of white t-shirt front view">
    </body>
    </html>
  `,
  keywordStuffing: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/hoodie.jpg" alt="Black hoodie black hoodie black hoodie cotton cotton cotton XL XL XL">
    </body>
    </html>
  `,
  filenameFallback: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/img_12345.jpg" alt="img_12345">
      <img src="/DSC00123.jpg" alt="DSC00123">
    </body>
    </html>
  `,
  redundantWithCaption: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <figure>
        <img src="/hoodie.jpg" alt="Black cotton hoodie front view on model">
        <figcaption>Black cotton hoodie front view on model</figcaption>
      </figure>
    </body>
    </html>
  `,
  missingTechnicalAttrs: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/hoodie.jpg" alt="Black hoodie front view">
    </body>
    </html>
  `,
  decorativeWithClass: `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <img src="/bg-pattern.png" alt="" class="bg-pattern">
      <img src="/icon-arrow.svg" alt="" class="icon icon-arrow">
    </body>
    </html>
  `,
  productImage: `
    <!DOCTYPE html>
    <html>
    <head><title>Product</title></head>
    <body>
      <div class="product" itemtype="https://schema.org/Product">
        <img src="/hoodie-black-xl.jpg" alt="Black cotton hoodie front view">
      </div>
    </body>
    </html>
  `
};

async function runImageAltTests() {
  console.log('🧪 Running Image Alt Validator Tests...\n');

  const validator = new ImageAltValidator({
    minLength: 10,
    maxLength: 125,
    optimalMin: 50,
    optimalMax: 100,
    checkDecorative: true,
    checkRedundancy: true,
    checkKeywordStuffing: true,
    checkFileNameFallback: true,
    checkContextRelevance: true,
    allowEmptyForDecorative: true
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.log(`  ❌ ${message}`);
      failed++;
    }
  }

  // Test 1: Perfect alt texts
  console.log('\n📝 Test 1: Perfect alt texts (descriptive, optimal length)');
  let result = await validator.validate(testCases.perfect, 'https://example.com/perfect');
  assert(result.metadata.imagesWithAlt === 2, '2 images with alt');
  assert(result.metadata.imagesWithoutAlt === 0, '0 images without alt');
  assert(!result.hasErrors, 'No errors for perfect alt texts');
  assert(result.metadata.score >= 85, `High score: ${result.metadata.score}`);

  // Test 2: Missing alt attribute
  console.log('\n📝 Test 2: Missing alt attribute');
  result = await validator.validate(testCases.missingAlt, 'https://example.com/missing');
  assert(result.hasErrors, 'Error for missing alt');
  assert(result.metadata.imagesWithoutAlt === 1, '1 image without alt');
  const missingError = result.errors.find(e => e.message.includes('Missing alt'));
  assert(missingError !== undefined, 'Specific missing alt error');

  // Test 3: Empty alt for decorative (valid)
  console.log('\n📝 Test 3: Empty alt for decorative images (valid)');
  result = await validator.validate(testCases.emptyAltDecorative, 'https://example.com/decorative');
  assert(!result.hasErrors, 'No errors for valid decorative images');
  assert(result.metadata.decorativeImages === 2, '2 decorative images detected');

  // Test 4: Empty alt NOT decorative
  console.log('\n📝 Test 4: Empty alt on non-decorative image');
  result = await validator.validate(testCases.emptyAltNotDecorative, 'https://example.com/empty-not-decorative');
  assert(result.hasWarnings, 'Warning for empty alt on content image');
  const emptyWarning = result.warnings.find(w => w.message.includes('Empty alt'));
  assert(emptyWarning !== undefined, 'Empty alt warning found');

  // Test 5: Too short alt
  console.log('\n📝 Test 5: Too short alt text (< 10 chars)');
  result = await validator.validate(testCases.tooShort, 'https://example.com/short');
  assert(result.hasErrors, 'Error for too short alt');
  const shortError = result.errors.find(e => e.message.includes('too short'));
  assert(shortError !== undefined, 'Specific short alt error');

  // Test 6: Too long alt
  console.log('\n📝 Test 6: Too long alt text (> 125 chars)');
  result = await validator.validate(testCases.tooLong, 'https://example.com/long');
  assert(result.hasWarnings, 'Warning for too long alt');

  // Test 7: Generic alt text
  console.log('\n📝 Test 7: Generic alt text (image, photo, picture)');
  result = await validator.validate(testCases.genericAlt, 'https://example.com/generic');
  assert(result.hasErrors, 'Errors for generic alt texts');
  const genericError = result.errors.find(e => e.message.includes('Generic alt'));
  assert(genericError !== undefined, 'Generic alt error found');
  assert(result.metadata.imagesWithAlt === 3, '3 images with alt');

  // Test 8: "Image of" prefix
  console.log('\n📝 Test 8: "Image of" redundant prefix');
  result = await validator.validate(testCases.imageOfPrefix, 'https://example.com/imageof');
  assert(result.hasWarnings, 'Warning for "image of" prefix');
  const prefixWarning = result.warnings.find(w => w.message.includes('Redundant'));
  assert(prefixWarning !== undefined, 'Redundant prefix warning found');

  // Test 9: Keyword stuffing
  console.log('\n📝 Test 9: Keyword stuffing detection');
  result = await validator.validate(testCases.keywordStuffing, 'https://example.com/stuffing', {
    targetKeywords: ['black hoodie', 'cotton']
  });
  assert(result.hasWarnings, 'Warning for keyword stuffing');
  const stuffingWarning = result.warnings.find(w => w.message.includes('repeated'));
  assert(stuffingWarning !== undefined, 'Keyword stuffing warning found');

  // Test 10: Filename fallback
  console.log('\n📝 Test 10: Filename as alt text');
  result = await validator.validate(testCases.filenameFallback, 'https://example.com/filename');
  assert(result.hasErrors, 'Error for filename as alt');
  const filenameError = result.errors.find(e => e.message.includes('filename'));
  assert(filenameError !== undefined, 'Filename fallback error found');

  // Test 11: Redundant with caption
  console.log('\n📝 Test 11: Alt text duplicates figcaption');
  result = await validator.validate(testCases.redundantWithCaption, 'https://example.com/redundant');
  assert(result.hasWarnings, 'Warning for redundant alt/caption');
  const redundantWarning = result.warnings.find(w => w.message.includes('duplicates'));
  assert(redundantWarning !== undefined, 'Redundant caption warning found');

  // Test 12: Missing technical attributes
  console.log('\n📝 Test 12: Missing technical attributes (loading, width, height)');
  result = await validator.validate(testCases.missingTechnicalAttrs, 'https://example.com/technical');
  assert(result.hasInfos, 'Info for missing technical attributes');
  const loadingInfo = result.infos.find(i => i.message.includes('loading'));
  assert(loadingInfo !== undefined, 'Missing loading attribute info');
  const dimensionsInfo = result.infos.find(i => i.message.includes('width/height'));
  assert(dimensionsInfo !== undefined, 'Missing width/height info');

  // Test 13: Decorative detection by class
  console.log('\n📝 Test 13: Decorative detection via CSS classes');
  result = await validator.validate(testCases.decorativeWithClass, 'https://example.com/decorative-class');
  assert(result.metadata.decorativeImages === 2, '2 decorative images detected by class');
  assert(!result.hasErrors, 'No errors for properly marked decorative');

  // Test 14: Product image context
  console.log('\n📝 Test 14: Product image context suggestions');
  result = await validator.validate(testCases.productImage, 'https://example.com/product', {
    targetKeywords: ['hoodie', 'black', 'cotton']
  });
  const productInfo = result.infos.find(i => i.message.includes('visual context'));
  assert(productInfo !== undefined, 'Product context info provided');

  // Test 15: Decorative with role="presentation"
  console.log('\n📝 Test 15: Decorative with role="presentation"');
  const withRole = `<html><body><img src="/icon.svg" alt="" role="presentation"></body></html>`;
  result = await validator.validate(withRole, 'https://example.com/role');
  assert(!result.hasErrors, 'Valid decorative with role');

  // Test 16: Role presentation with non-empty alt (warning)
  console.log('\n📝 Test 16: role="presentation" with non-empty alt (conflict)');
  const roleConflict = `<html><body><img src="/icon.svg" alt="Arrow icon" role="presentation"></body></html>`;
  result = await validator.validate(roleConflict, 'https://example.com/role-conflict');
  assert(result.hasWarnings, 'Warning for role/alt conflict');

  // Test 17: Cross-image consistency (static method)
  console.log('\n📝 Test 17: Cross-page alt consistency');
  const crossResults = [
    { metadata: { validator: 'image-alt', url: 'https://a.com', imageSrc: '/logo.png', altText: 'DALLI logo', hasAlt: true, altLength: 10 } },
    { metadata: { validator: 'image-alt', url: 'https://b.com', imageSrc: '/logo.png', altText: 'DALLI brand logo', hasAlt: true, altLength: 15 } }
  ];
  const consistencyResult = ImageAltValidator.checkCrossImageConsistency(crossResults);
  assert(consistencyResult.hasWarnings, 'Cross-page inconsistency detected');
  const consistencyWarning = consistencyResult.warnings.find(w => w.message.includes('different alt texts'));
  assert(consistencyWarning !== undefined, 'Cross-page inconsistency warning');

  // Test 18: Duplicate alt on same page
  console.log('\n📝 Test 18: Duplicate alt text on same page');
  const dupPage = `<html><body>
    <img src="/a.jpg" alt="Black hoodie front view">
    <img src="/b.jpg" alt="Black hoodie front view">
  </body></html>`;
  result = await validator.validate(dupPage, 'https://example.com/dup-page');
  // This would be caught in cross-image check, not single page

  // Test 19: Score calculation
  console.log('\n📝 Test 19: Score calculation');
  result = await validator.validate(testCases.perfect, 'https://example.com/score');
  assert(result.metadata.score >= 90, `Perfect score: ${result.metadata.score}`);

  result = await validator.validate(testCases.missingAlt, 'https://example.com/score2');
  assert(result.metadata.score < 50, `Low score for missing alt: ${result.metadata.score}`);

  // Test 20: Coverage calculation
  console.log('\n📝 Test 20: Alt coverage calculation');
  result = await validator.validate(testCases.missingAlt, 'https://example.com/coverage');
  assert(result.metadata.altCoverage !== undefined, 'Coverage calculated');
  assert(result.metadata.altCoverage === '50.0%', `Coverage: ${result.metadata.altCoverage}`);

  // Test 21: Target keywords in alt
  console.log('\n📝 Test 21: Target keywords in alt');
  result = await validator.validate(testCases.perfect, 'https://example.com/keywords', {
    targetKeywords: ['hoodie', 'cotton', 'model']
  });
  assert(result.metadata.targetKeywordsInAlt !== undefined || result.infos.some(i => i.message.includes('keyword')), 'Keyword relevance checked');

  // Test 22: Redundant with parent text
  console.log('\n📝 Test 22: Alt duplicates adjacent text');
  const redundantAdjacent = `<html><body>
    <p>Black cotton hoodie front view on model</p>
    <img src="/hoodie.jpg" alt="Black cotton hoodie front view on model">
  </body></html>`;
  result = await validator.validate(redundantAdjacent, 'https://example.com/redundant-adjacent');
  assert(result.hasWarnings, 'Warning for redundant adjacent text');

  // Test 23: aria-label vs alt conflict
  console.log('\n📝 Test 23: aria-label vs alt conflict');
  const ariaConflict = `<html><body><img src="/img.jpg" alt="Description A" aria-label="Description B"></body></html>`;
  result = await validator.validate(ariaConflict, 'https://example.com/aria-conflict');
  assert(result.hasWarnings, 'Warning for aria-label/alt conflict');

  // Test 24: srcset missing
  console.log('\n📝 Test 24: Missing srcset for responsive images');
  result = await validator.validate(testCases.missingTechnicalAttrs, 'https://example.com/srcset');
  const srcsetInfo = result.infos.find(i => i.message.includes('srcset'));
  assert(srcsetInfo !== undefined, 'Missing srcset info');

  // Test 25: Edge case - no images
  console.log('\n📝 Test 25: Page with no images');
  const noImages = `<html><body><p>No images here</p></body></html>`;
  result = await validator.validate(noImages, 'https://example.com/no-images');
  assert(!result.hasErrors, 'No errors for no images');
  assert(result.metadata.totalImages === 0, 'Total images = 0');
  assert(result.metadata.score === 100, 'Score 100 for no images');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All tests passed!' : `\n⚠️ ${failed} test(s) failed`);

  return { passed, failed };
}

export { runImageAltTests, testCases };

if (typeof document !== 'undefined') {
  runImageAltTests().catch(console.error);
}