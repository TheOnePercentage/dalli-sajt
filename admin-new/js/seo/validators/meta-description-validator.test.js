/**
 * Meta Description Validator Tests
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { MetaDescriptionValidator } from './meta-description-validator.js';
import { BaseValidator, ValidationResult } from './base-validator.js';

// Test HTML templates
const testCases = {
  perfect: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Premium Hoodie Black XL | DALLI</title>
      <meta name="description" content="Shop premium black hoodie XL - 100% cotton, 350g/m². Free shipping over 10,000 RSD. 30-day returns. Order now!">
    </head>
    <body></body>
    </html>
  `,
  tooShort: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Page</title>
      <meta name="description" content="Black hoodie for sale.">
    </head>
    <body></body>
    </html>
  `,
  tooLong: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Page</title>
      <meta name="description" content="This is an extremely long meta description that goes way beyond the recommended character limit for search engine results pages. It contains way too much information and will definitely be truncated in Google search results which is bad for click-through rates and user experience. We should definitely shorten this to fit within the optimal range.">
    </head>
    <body></body>
    </html>
  `,
  missing: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Page</title>
    </head>
    <body></body>
    </html>
  `,
  duplicates: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Page</title>
      <meta name="description" content="Black hoodie for sale.">
      <meta name="description" content="Another description here.">
    </head>
    <body></body>
    </html>
  `,
  keywordStuffing: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Black Hoodie</title>
      <meta name="description" content="Black hoodie black hoodie black hoodie premium cotton cotton cotton hoodie XL XL XL buy buy buy.">
    </head>
    <body></body>
    </html>
  `,
  missingCTA: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Page</title>
      <meta name="description" content="This black hoodie is made of premium cotton and comes in size XL with free shipping available.">
    </head>
    <body></body>
    </html>
  `,
  allCaps: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product</title>
      <meta name="description" content="THIS IS AN AMAZING BLACK HOODIE MADE OF PREMIUM COTTON WITH FREE SHIPPING!">
    </head>
    <body></body>
    </html>
  `,
  ogOnly: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Page</title>
      <meta property="og:description" content="Shop premium black hoodie XL - 100% cotton, free shipping. Order now!">
    </head>
    <body></body>
    </html>
  `,
  ogMismatch: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Page</title>
      <meta name="description" content="Shop premium black hoodie XL with free shipping.">
      <meta property="og:description" content="Completely different description for social media sharing with no overlap at all.">
    </head>
    <body></body>
    </html>
  `
};

async function runMetaDescriptionTests() {
  console.log('🧪 Running Meta Description Validator Tests...\n');

  const validator = new MetaDescriptionValidator({
    minLength: 120,
    maxLength: 160,
    optimalMin: 150,
    optimalMax: 160,
    checkUniqueness: true,
    requireKeywords: true,
    ctrKeywords: ['buy', 'shop', 'get', 'free', 'premium', 'shipping', 'order']
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

  // Test 1: Perfect description
  console.log('\n📝 Test 1: Perfect description (150-160 chars, CTA, keywords, numbers)');
  let result = await validator.validate(testCases.perfect, 'https://example.com/perfect');
  assert(!result.hasErrors, 'No errors for perfect description');
  assert(result.hasWarnings === false, 'No warnings for perfect description');
  assert(result.metadata.score >= 90, `High score: ${result.metadata.score}`);
  assert(result.metadata.ctrScore >= 4, `Good CTR score: ${result.metadata.ctrScore}`);

  // Test 2: Too short
  console.log('\n📝 Test 2: Too short description (< 120 chars)');
  result = await validator.validate(testCases.tooShort, 'https://example.com/short');
  assert(result.hasErrors, 'Error for too short description');
  const shortError = result.errors.find(e => e.message.includes('too short'));
  assert(shortError !== undefined, 'Specific "too short" error found');

  // Test 3: Too long
  console.log('\n📝 Test 3: Too long description (> 160 chars)');
  result = await validator.validate(testCases.tooLong, 'https://example.com/long');
  assert(result.hasErrors, 'Error for too long description');
  const longError = result.errors.find(e => e.message.includes('too long'));
  assert(longError !== undefined, 'Specific "too long" error found');

  // Test 4: Missing description
  console.log('\n📝 Test 4: Missing meta description');
  result = await validator.validate(testCases.missing, 'https://example.com/missing');
  assert(result.hasErrors, 'Error for missing description');
  assert(result.metadata.hasDescription === false, 'hasDescription is false');
  assert(result.metadata.score === 0, 'Score is 0 for missing description');

  // Test 5: Duplicate meta tags
  console.log('\n📝 Test 5: Duplicate meta description tags');
  result = await validator.validate(testCases.duplicates, 'https://example.com/duplicates');
  assert(result.hasErrors, 'Error for duplicate meta tags');
  const dupError = result.errors.find(e => e.message.includes('Multiple meta description tags'));
  assert(dupError !== undefined, 'Specific duplicate tags error found');

  // Test 6: Keyword stuffing
  console.log('\n📝 Test 6: Keyword stuffing detection');
  result = await validator.validate(testCases.keywordStuffing, 'https://example.com/stuffing', {
    targetKeywords: ['black hoodie', 'premium cotton']
  });
  assert(result.hasWarnings, 'Warning for keyword stuffing');
  const stuffingWarning = result.warnings.find(w => w.message.includes('keyword stuffing'));
  assert(stuffingWarning !== undefined, 'Keyword stuffing warning found');

  // Test 7: Missing CTA
  console.log('\n📝 Test 7: Missing call-to-action');
  result = await validator.validate(testCases.missingCTA, 'https://example.com/no-cta');
  const ctaInfo = result.infos.find(i => i.message.includes('call-to-action'));
  assert(ctaInfo !== undefined, 'Missing CTA info found');

  // Test 8: All caps warning
  console.log('\n📝 Test 8: Excessive uppercase warning');
  result = await validator.validate(testCases.allCaps, 'https://example.com/allcaps');
  const capsWarning = result.warnings.find(w => w.message.includes('uppercase'));
  assert(capsWarning !== undefined, 'Excessive uppercase warning found');

  // Test 9: OG description only (fallback)
  console.log('\n📝 Test 9: OG description as fallback');
  result = await validator.validate(testCases.ogOnly, 'https://example.com/og-only');
  assert(result.metadata.hasDescription === true, 'OG description used as fallback');
  assert(result.metadata.source === 'og', 'Source is OG');

  // Test 10: OG mismatch warning
  console.log('\n📝 Test 10: Meta vs OG description mismatch');
  result = await validator.validate(testCases.ogMismatch, 'https://example.com/og-mismatch');
  const ogWarning = result.warnings.find(w => w.message.includes('differ significantly'));
  assert(ogWarning !== undefined, 'OG mismatch warning found');

  // Test 11: Target keywords validation
  console.log('\n📝 Test 11: Target keywords checking');
  result = await validator.validate(testCases.perfect, 'https://example.com/keywords', {
    targetKeywords: ['premium', 'cotton', 'shipping', 'hoodie']
  });
  assert(result.metadata.targetKeywordsFound.length === 4, 'All target keywords found');
  assert(result.metadata.targetKeywordsMissing.length === 0, 'No missing target keywords');

  // Test 12: Missing target keywords
  console.log('\n📝 Test 12: Missing target keywords');
  result = await validator.validate(testCases.missingCTA, 'https://example.com/missing-keywords', {
    targetKeywords: ['premium', 'cotton', 'shipping', 'hoodie']
  });
  assert(result.metadata.targetKeywordsMissing.length > 0, 'Missing keywords detected');

  // Test 13: Quality scoring
  console.log('\n📝 Test 13: Quality score calculation');
  result = await validator.validate(testCases.perfect, 'https://example.com/quality');
  assert(result.metadata.qualityScore > 60, `Quality score reasonable: ${result.metadata.qualityScore}`);

  // Test 14: CTR signal detection
  console.log('\n📝 Test 14: CTR optimization signals');
  result = await validator.validate(testCases.perfect, 'https://example.com/ctr');
  assert(result.metadata.ctrScore >= 4, `CTR score: ${result.metadata.ctrScore}`);
  assert(result.metadata.ctrSignals.hasCTA === true, 'CTA detected');
  assert(result.metadata.ctrSignals.hasNumbers === true, 'Numbers detected');
  assert(result.metadata.ctrSignals.hasBenefit === true, 'Benefits detected');

  // Test 15: Configuration options
  console.log('\n📝 Test 15: Custom configuration');
  const customValidator = new MetaDescriptionValidator({
    minLength: 100,
    maxLength: 200,
    optimalMin: 140,
    optimalMax: 180,
    checkUniqueness: false,
    requireKeywords: false
  });
  result = await customValidator.validate(testCases.tooShort, 'https://example.com/custom');
  // With minLength 100, 24 chars should still be too short
  assert(result.hasErrors, 'Custom config still validates');

  // Test 16: Cross-page uniqueness (static method)
  console.log('\n📝 Test 16: Cross-page uniqueness detection');
  const results = [
    { metadata: { hasDescription: true, url: 'https://a.com', description: 'Buy black hoodie premium cotton', score: 85 } },
    { metadata: { hasDescription: true, url: 'https://b.com', description: 'Buy black hoodie premium cotton', score: 85 } },
    { metadata: { hasDescription: true, url: 'https://c.com', description: 'Shop red t-shirt organic cotton', score: 80 } }
  ];
  const uniquenessResult = MetaDescriptionValidator.checkCrossPageUniqueness(results);
  assert(uniquenessResult.hasErrors, 'Duplicate description detected across pages');
  assert(uniquenessResult.errors[0].details.pages.length === 2, 'Two pages with duplicate');

  // Test 17: Near-duplicate detection
  console.log('\n📝 Test 17: Near-duplicate detection');
  const nearDupResults = [
    { metadata: { hasDescription: true, url: 'https://a.com', description: 'Buy black hoodie premium cotton free shipping', score: 85 } },
    { metadata: { hasDescription: true, url: 'https://b.com', description: 'Buy black hoodie premium cotton fast delivery', score: 85 } }
  ];
  const nearDupResult = MetaDescriptionValidator.checkCrossPageUniqueness(nearDupResults);
  assert(nearDupResult.hasWarnings, 'Near-duplicate warning detected');

  // Test 18: Score calculation
  console.log('\n📝 Test 18: Score calculation');
  result = await validator.validate(testCases.perfect, 'https://example.com/score');
  assert(result.metadata.score >= 85, `Perfect description scores high: ${result.metadata.score}`);
  
  result = await validator.validate(testCases.missing, 'https://example.com/score2');
  assert(result.metadata.score === 0, 'Missing description scores 0');

  // Test 19: Edge cases - empty description
  console.log('\n📝 Test 19: Empty description tag');
  const emptyDesc = `<html><head><title>Test</title><meta name="description" content=""></head><body></body></html>`;
  result = await validator.validate(emptyDesc, 'https://example.com/empty');
  assert(result.hasErrors, 'Empty description treated as missing');

  // Test 20: Only whitespace description
  console.log('\n📝 Test 20: Whitespace-only description');
  const wsDesc = `<html><head><title>Test</title><meta name="description" content="   "></head><body></body></html>`;
  result = await validator.validate(wsDesc, 'https://example.com/whitespace');
  assert(result.hasErrors, 'Whitespace-only treated as missing');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All tests passed!' : `\n⚠️ ${failed} test(s) failed`);

  return { passed, failed };
}

// Export for manual running
export { runMetaDescriptionTests, testCases };

// Auto-run if in browser
if (typeof document !== 'undefined') {
  runMetaDescriptionTests().catch(console.error);
}