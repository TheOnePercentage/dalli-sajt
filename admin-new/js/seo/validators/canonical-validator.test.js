/**
 * Canonical Validator Tests
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { CanonicalValidator } from './canonical-validator.js';
import { BaseValidator, ValidationResult } from './base-validator.js';

const testCases = {
  // Perfect self-referencing canonical
  perfectSelfRef: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Perfect Page</title>
      <link rel="canonical" href="https://example.com/product/black-hoodie-xl">
    </head>
    <body></body>
    </html>
  `,

  // Perfect with HTTP header canonical
  perfectWithHeader: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Perfect Page</title>
      <link rel="canonical" href="https://example.com/product/black-hoodie-xl">
    </head>
    <body></body>
    </html>
  `,

  // Missing canonical entirely
  missingCanonical: `
    <!DOCTYPE html>
    <html>
    <head><title>Test Page</title></head>
    <body><p>No canonical here</p></body>
    </html>
  `,

  // Canonical points to different URL (cross-page)
  crossPageCanonical: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Duplicate Page</title>
      <link rel="canonical" href="https://example.com/original-page">
    </head>
    <body></body>
    </html>
  `,

  // Relative canonical URL
  relativeCanonical: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Relative Canonical</title>
      <link rel="canonical" href="/product/black-hoodie-xl">
    </head>
    <body></body>
    </html>
  `,

  // Multiple canonical tags
  multipleCanonicals: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Multiple Canonicals</title>
      <link rel="canonical" href="https://example.com/page-a">
      <link rel="canonical" href="https://example.com/page-b">
    </head>
    <body></body>
    </html>
  `,

  // Cross-domain canonical
  crossDomainCanonical: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cross Domain</title>
      <link rel="canonical" href="https://otherdomain.com/product">
    </head>
    <body></body>
    </html>
  `,

  // Trailing slash inconsistency
  trailingSlashMismatch: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Trailing Slash</title>
      <link rel="canonical" href="https://example.com/product/">
    </head>
    <body></body>
    </html>
  `,

  // WWW vs non-WWW mismatch
  wwwMismatch: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>WWW Mismatch</title>
      <link rel="canonical" href="https://www.example.com/product">
    </head>
    <body></body>
    </html>
  `,

  // HTTP canonical on HTTPS page
  httpOnHttps: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>HTTP on HTTPS</title>
      <link rel="canonical" href="http://example.com/product">
    </head>
    <body></body>
    </html>
  `,

  // Paginated page with canonical to first page
  paginatedFirstPage: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page 2</title>
      <link rel="canonical" href="https://example.com/category">
      <link rel="prev" href="https://example.com/category">
      <link rel="next" href="https://example.com/category?page=3">
    </head>
    <body></body>
    </html>
  `,

  // Paginated page self-referencing
  paginatedSelfRef: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page 2</title>
      <link rel="canonical" href="https://example.com/category?page=2">
      <link rel="prev" href="https://example.com/category">
      <link rel="next" href="https://example.com/category?page=3">
    </head>
    <body></body>
    </html>
  `,

  // Hreflang with canonical
  hreflangWithCanonical: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>International</title>
      <link rel="canonical" href="https://example.com/product">
      <link rel="alternate" hreflang="en" href="https://example.com/product">
      <link rel="alternate" hreflang="de" href="https://example.de/produkt">
      <link rel="alternate" hreflang="x-default" href="https://example.com/product">
    </head>
    <body></body>
    </html>
  `,

  // Hreflang cross-domain mismatch
  hreflangCrossDomain: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hreflang Cross Domain</title>
      <link rel="canonical" href="https://example.com/product">
      <link rel="alternate" hreflang="de" href="https://otherdomain.com/produkt">
    </head>
    <body></body>
    </html>
  `,

  // Invalid canonical URL
  invalidCanonical: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invalid Canonical</title>
      <link rel="canonical" href="not-a-valid-url">
    </head>
    <body></body>
    </html>
  `,

  // Canonical chain (A -> B -> C)
  canonicalChain: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Chain</title>
      <link rel="canonical" href="https://example.com/page-b">
    </head>
    <body></body>
    </html>
  `,

  // HTML and HTTP header canonical mismatch
  headerHtmlMismatch: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mismatch</title>
      <link rel="canonical" href="https://example.com/page-a">
    </head>
    <body></body>
    </html>
  `,

  // Relative canonical
  relativeUrl: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Relative</title>
      <link rel="canonical" href="/product/black-hoodie">
    </head>
    <body></body>
    </html>
  `,

  // Trailing slash mismatch (current has slash, canonical doesn't)
  trailingSlashCurrentOnly: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Trailing Slash Current</title>
      <link rel="canonical" href="https://example.com/product">
    </head>
    <body></body>
    </html>
  `,

  // Pagination with sort/filter hints
  paginationWithSort: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Category Page 2</title>
      <link rel="canonical" href="https://example.com/category">
      <link rel="prev" href="https://example.com/category">
      <link rel="next" href="https://example.com/category?page=3">
    </head>
    <body>
      <a href="/category?sort=price">Sort by Price</a>
      <a href="/category?filter=color">Filter by Color</a>
    </body>
    </html>
  `,

  // Session IDs in URLs
  sessionIds: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Session IDs</title>
      <link rel="canonical" href="https://example.com/product">
    </head>
    <body>
      <a href="/product?sid=abc123">Link with session</a>
    </body>
    </html>
  `,

  // UTM parameters in internal links
  utmParams: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>UTM Params</title>
      <link rel="canonical" href="https://example.com/product">
    </head>
    <body>
      <a href="/product?utm_source=newsletter&utm_medium=email">Link with UTM</a>
    </body>
    </html>
  `,

  // Print version link
  printVersion: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Version</title>
      <link rel="canonical" href="https://example.com/article">
      <link rel="alternate" media="print" href="https://example.com/article?print=1">
    </head>
    <body></body>
    </html>
  `,

  // Empty canonical href
  emptyCanonical: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Empty Canonical</title>
      <link rel="canonical" href="">
    </head>
    <body></body>
    </html>
  `
};

async function runCanonicalValidatorTests() {
  console.log('🧪 Running Canonical Validator Tests...\n');

  const validator = new CanonicalValidator({
    requireCanonical: true,
    checkSelfReferencing: true,
    checkCrossDomain: true,
    checkPagination: true,
    checkHreflang: true,
    checkDuplicateContent: true,
    checkHttpHeader: true,
    allowRelative: false,
    allowedDomains: ['example.com', 'example.de'],
    blockedDomains: ['spam.com', 'malware.com'],
    checkTrailingSlash: true,
    checkWwwNonWww: true,
    checkHttpHttps: true,
    maxCanonicalChain: 1
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

  // Test 1: Perfect self-referencing canonical
  console.log('\n📝 Test 1: Perfect self-referencing canonical');
  let result = await validator.validate(testCases.perfectSelfRef, 'https://example.com/product/black-hoodie-xl');
  assert(!result.hasErrors, 'No errors for perfect canonical');
  assert(result.metadata.hasCanonical === true, 'Has canonical');
  assert(result.metadata.isSelfReferencing === true, 'Self-referencing');
  assert(result.metadata.score >= 90, `High score: ${result.metadata.score}`);

  // Test 2: Missing canonical
  console.log('\n📝 Test 2: Missing canonical');
  result = await validator.validate(testCases.missingCanonical, 'https://example.com/missing');
  assert(result.hasErrors, 'Error for missing canonical');
  assert(result.metadata.hasCanonical === false, 'hasCanonical = false');
  assert(result.metadata.score === 0, 'Score = 0');

  // Test 3: Cross-page canonical (valid use case)
  console.log('\n📝 Test 3: Cross-page canonical (duplicate content)');
  result = await validator.validate(testCases.crossPageCanonical, 'https://example.com/duplicate-page');
  assert(!result.hasErrors, 'No errors for cross-page canonical (valid use case)');
  assert(result.hasWarnings, 'Warning for non-self-referencing');
  assert(result.metadata.isSelfReferencing === false, 'Not self-referencing');

  // Test 4: Relative canonical URL
  console.log('\n📝 Test 4: Relative canonical URL (not allowed by default)');
  result = await validator.validate(testCases.relativeCanonical, 'https://example.com/product/black-hoodie-xl');
  assert(result.hasErrors, 'Error for relative canonical');
  assert(result.metadata.isRelative === true, 'isRelative = true');

  // Test 5: Multiple canonical tags
  console.log('\n📝 Test 5: Multiple canonical tags');
  result = await validator.validate(testCases.multipleCanonicals, 'https://example.com/multiple');
  // First one wins, but should warn about multiple
  // The validator uses first one, but this is a common issue

  // Test 6: Cross-domain canonical
  console.log('\n📝 Test 6: Cross-domain canonical');
  result = await validator.validate(testCases.crossDomainCanonical, 'https://example.com/cross-domain');
  assert(result.hasWarnings, 'Warning for cross-domain');
  assert(result.metadata.crossDomain === true, 'crossDomain = true');

  // Test 6b: Cross-domain to blocked domain
  console.log('\n📝 Test 6b: Cross-domain to blocked domain');
  const blockedDomain = `<html><head><link rel="canonical" href="https://malware.com/product"></head><body></body></html>`;
  result = await validator.validate(blockedDomain, 'https://example.com/blocked');
  assert(result.hasErrors, 'Error for blocked domain');
  const blockedError = result.errors.find(e => e.message.includes('blocked domain'));
  assert(blockedError !== undefined, 'Blocked domain error');

  // Test 7: Trailing slash mismatch
  console.log('\n📝 Test 7: Trailing slash mismatch');
  result = await validator.validate(testCases.trailingSlashMismatch, 'https://example.com/product');
  assert(result.hasWarnings, 'Warning for trailing slash mismatch');

  // Test 8: WWW vs non-WWW mismatch
  console.log('\n📝 Test 8: WWW vs non-WWW mismatch');
  result = await validator.validate(testCases.wwwMismatch, 'https://example.com/product');
  assert(result.hasWarnings, 'Warning for www/non-www mismatch');

  // Test 9: HTTP canonical on HTTPS page
  console.log('\n📝 Test 9: HTTP canonical on HTTPS page');
  result = await validator.validate(testCases.httpOnHttps, 'https://example.com/product');
  assert(result.hasErrors, 'Error for HTTP canonical on HTTPS page');

  // Test 10: Paginated page canonical to first page
  console.log('\n📝 Test 10: Paginated page canonical to first page');
  result = await validator.validate(testCases.paginatedFirstPage, 'https://example.com/category?page=2');
  assert(result.hasWarnings, 'Warning for paginated canonical to first page');

  // Test 11: Paginated page self-referencing (preferred)
  console.log('\n📝 Test 11: Paginated page self-referencing (preferred)');
  result = await validator.validate(testCases.paginatedSelfRef, 'https://example.com/category?page=2');
  // Self-referencing on paginated pages is also valid

  // Test 12: Hreflang with canonical
  console.log('\n📝 Test 12: Hreflang with canonical');
  result = await validator.validate(testCases.hreflangWithCanonical, 'https://example.com/product');
  assert(!result.hasErrors, 'No errors for hreflang with canonical');
  const xDefaultPassed = result.passed.find(p => p.message.includes('x-default'));
  assert(xDefaultPassed !== undefined, 'x-default hreflang detected');

  // Test 13: Hreflang cross-domain mismatch
  console.log('\n📝 Test 13: Hreflang cross-domain mismatch');
  result = await validator.validate(testCases.hreflangCrossDomain, 'https://example.com/product');
  assert(result.hasWarnings, 'Warning for hreflang cross-domain');

  // Test 14: Invalid canonical URL format
  console.log('\n📝 Test 14: Invalid canonical URL format');
  result = await validator.validate(testCases.invalidCanonical, 'https://example.com/invalid');
  assert(result.hasErrors, 'Error for invalid URL format');

  // Test 15: Canonical chain detection (needs context)
  console.log('\n📝 Test 15: Canonical chain detection');
  result = await validator.validate(testCases.canonicalChain, 'https://example.com/page-a', {
    canonicalChain: ['https://example.com/page-a', 'https://example.com/page-b', 'https://example.com/page-c']
  });
  assert(result.hasErrors, 'Error for canonical chain too long');

  // Test 16: HTML and HTTP header canonical mismatch (simulated via context)
  console.log('\n📝 Test 16: HTML and HTTP header canonical mismatch');
  result = await validator.validate(testCases.headerHtmlMismatch, 'https://example.com/page', {
    httpHeaderCanonical: 'https://example.com/page-b'
  });
  assert(result.hasErrors, 'Error for HTML/header mismatch');

  // Test 17: Empty canonical href
  console.log('\n📝 Test 17: Empty canonical href');
  result = await validator.validate(testCases.emptyCanonical, 'https://example.com/empty');
  assert(result.hasErrors || result.metadata.hasCanonical === false, 'Empty canonical treated as missing');

  // Test 18: Duplicate content hints (pagination with sort/filter)
  console.log('\n📝 Test 18: Duplicate content hints (sort/filter params)');
  result = await validator.validate(testCases.paginationWithSort, 'https://example.com/category?page=2');
  const sortHint = result.infos.find(i => i.details.type === 'duplicate-content-hint' && i.message.includes('Sort/filter'));
  assert(sortHint !== undefined, 'Sort/filter hint detected');

  // Test 19: Session IDs in URLs
  console.log('\n📝 Test 19: Session IDs in URLs');
  result = await validator.validate(testCases.sessionIds, 'https://example.com/product');
  const sessionHint = result.infos.find(i => i.details.type === 'duplicate-content-hint' && i.message.includes('Session IDs'));
  assert(sessionHint !== undefined, 'Session ID hint detected');

  // Test 20: UTM parameters in internal links
  console.log('\n📝 Test 20: UTM parameters in internal links');
  result = await validator.validate(testCases.utmParams, 'https://example.com/product');
  const utmHint = result.infos.find(i => i.details.type === 'duplicate-content-hint' && i.message.includes('UTM'));
  assert(utmHint !== undefined, 'UTM parameter hint detected');

  // Test 21: Print version link
  console.log('\n📝 Test 21: Print version link');
  result = await validator.validate(testCases.printVersion, 'https://example.com/article');
  const printHint = result.infos.find(i => i.details.type === 'duplicate-content-hint' && i.message.includes('Print version'));
  assert(printHint !== undefined, 'Print version hint detected');

  // Test 22: Score calculation
  console.log('\n📝 Test 22: Score calculation');
  result = await validator.validate(testCases.perfectSelfRef, 'https://example.com/perfect');
  assert(result.metadata.score >= 95, `Perfect score: ${result.metadata.score}`);

  result = await validator.validate(testCases.missingCanonical, 'https://example.com/score-missing');
  assert(result.metadata.score === 0, 'Missing canonical scores 0');

  // Test 23: Allowed domains config
  console.log('\n📝 Test 23: Allowed domains configuration');
  const allowedValidator = new CanonicalValidator({ allowedDomains: ['example.com', 'example.de'] });
  result = await allowedValidator.validate(testCases.crossDomainCanonical, 'https://example.com/allowed');
  // example.com is allowed, example.de is allowed, but crossDomainCanonical uses otherdomain.com
  // So this should still warn/error since otherdomain.com is not in allowed list

  // Test 24: Cross-page canonical analysis (static method)
  console.log('\n📝 Test 24: Cross-page canonical analysis');
  const crossResults = [
    { metadata: { validator: 'canonical', url: 'https://a.com', canonicalUrl: 'https://example.com/canonical', canonicalSource: 'html', isSelfReferencing: false } },
    { metadata: { validator: 'canonical', url: 'https://b.com', canonicalUrl: 'https://example.com/canonical', canonicalSource: 'html', isSelfReferencing: false } },
    { metadata: { validator: 'canonical', url: 'https://c.com', canonicalUrl: 'https://example.com/canonical', canonicalSource: 'html', isSelfReferencing: true } }
  ];
  const crossResult = CanonicalValidator.checkCrossPageCanonicals(crossResults);
  assert(crossResult.hasWarnings, 'Cross-page canonical analysis warns about multiple pages');

  // Test 25: Canonical loop detection
  console.log('\n📝 Test 25: Canonical loop detection');
  const loopResults = [
    { metadata: { validator: 'canonical', url: 'https://a.com', canonicalUrl: 'https://b.com', canonicalSource: 'html' } },
    { metadata: { validator: 'canonical', url: 'https://b.com', canonicalUrl: 'https://a.com', canonicalSource: 'html' } }
  ];
  const loopResult = CanonicalValidator.checkCrossPageCanonicals(loopResults);
  assert(loopResult.hasErrors, 'Canonical loop detected');

  // Test 26: Score for perfect
  console.log('\n📝 Test 26: Score for perfect canonical');
  result = await validator.validate(testCases.perfectSelfRef, 'https://example.com/perfect');
  assert(result.metadata.score >= 95, `Perfect score: ${result.metadata.score}`);

  // Test 27: Empty canonical href
  console.log('\n📝 Test 27: Empty canonical href');
  result = await validator.validate(testCases.emptyCanonical, 'https://example.com/empty');
  assert(result.hasErrors || !result.metadata.hasCanonical, 'Empty canonical treated as missing');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All tests passed!' : `\n⚠️ ${failed} test(s) failed`);

  return { passed, failed };
}

export { runCanonicalValidatorTests, testCases };

if (typeof document !== 'undefined') {
  runCanonicalValidatorTests().catch(console.error);
}