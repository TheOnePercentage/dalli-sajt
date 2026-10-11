/**
 * Base Validator Tests
 * Run with: node admin-new/js/seo/validators/base-validator.test.js
 * Or in browser console
 */

import { BaseValidator, ValidationResult, ValidatorConfig } from './base-validator.js';

class TestValidator extends BaseValidator {
  constructor(config) {
    super(config);
  }

  async runValidation(document, url, context) {
    const result = new ValidationResult();
    
    // Test basic functionality
    const title = this.$(document, 'title');
    if (title) {
      result.addPassed('Title tag found', { content: title.textContent });
    } else {
      result.addError('Title tag missing');
    }

    const metaDesc = this.getMetaContent(document, 'description');
    if (metaDesc) {
      result.addPassed('Meta description found', { length: metaDesc.length });
    } else {
      result.addWarning('Meta description missing');
    }

    // Test utility methods
    const keywords = this.extractKeywords('This is a test page about SEO validation and testing');
    result.metadata.keywords = keywords;

    const quality = this.calculateTextQuality('This is a good meta description for testing purposes.');
    result.metadata.qualityScore = quality;

    return result;
  }
}

// Test runner
async function runTests() {
  console.log('🧪 Running Base Validator Tests...\n');

  const testHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Page</title>
      <meta name="description" content="This is a test meta description for SEO validation.">
      <meta property="og:title" content="Test Page">
    </head>
    <body>
      <h1>Test Content</h1>
      <p>Some test content here.</p>
    </body>
    </html>
  `;

  const url = 'https://example.com/test-page';

  // Test 1: Basic validation
  console.log('Test 1: Basic validation');
  const validator = new TestValidator({ enabled: true, severity: 'warning' });
  const result = await validator.validate(testHtml, url);

  console.log('  Result:', result.toJSON());
  console.log('  Severity:', result.severity);
  console.log('  Issue count:', result.issueCount);
  console.log('  Passed:', result.passed.length);
  console.log('  Errors:', result.errors.length);
  console.log('  Warnings:', result.warnings.length);

  // Test 2: Disabled validator
  console.log('\nTest 2: Disabled validator');
  const disabledValidator = new TestValidator({ enabled: false });
  const disabledResult = await disabledValidator.validate(testHtml, url);
  console.log('  Result:', disabledResult.toJSON());

  // Test 3: Utility methods
  console.log('\nTest 3: Utility methods');
  console.log('  Keywords:', validator.extractKeywords('SEO optimization for better search rankings'));
  console.log('  Quality score:', validator.calculateTextQuality('Good meta description for SEO testing purposes.'));
  console.log('  Quality score (short):', validator.calculateTextQuality('Too short'));
  console.log('  Quality score (long):', validator.calculateTextQuality('A'.repeat(200)));

  // Test 4: Meta tag extraction
  console.log('\nTest 4: Meta tag extraction');
  const doc = new DOMParser().parseFromString(testHtml, 'text/html');
  console.log('  Description:', validator.getMetaContent(doc, 'description'));
  console.log('  OG Title:', validator.getMetaContent(doc, 'og:title', true));

  // Test 5: URL normalization
  console.log('\nTest 5: URL normalization');
  console.log('  Normalized:', validator.normalizeUrl('https://example.com/page/?utm_source=test#section'));
  console.log('  Self-ref check:', validator.isSelfReferencing('https://example.com/page/', 'https://example.com/page/'));
  console.log('  Self-ref check (diff):', validator.isSelfReferencing('https://example.com/other/', 'https://example.com/page/'));

  // Test 6: Config
  console.log('\nTest 6: Config');
  const customConfig = new ValidatorConfig({
    enabled: true,
    severity: 'error',
    thresholds: { minLength: 100 },
    customRules: ['custom-rule-1']
  });
  console.log('  Config:', customConfig);

  // Test 7: ValidationResult methods
  console.log('\nTest 7: ValidationResult methods');
  const vr = new ValidationResult();
  vr.addError('Test error', { field: 'title' });
  vr.addWarning('Test warning', { field: 'description' });
  vr.addInfo('Test info', { field: 'keywords' });
  vr.addPassed('Test passed', { field: 'canonical' });
  console.log('  Has errors:', vr.hasErrors);
  console.log('  Has warnings:', vr.hasWarnings);
  console.log('  Issue count:', vr.issueCount);
  console.log('  Severity:', vr.severity);
  console.log('  JSON:', JSON.stringify(vr.toJSON(), null, 2));

  // Test 8: Merge results
  console.log('\nTest 8: Merge results');
  const vr1 = new ValidationResult();
  vr1.addError('Error 1');
  const vr2 = new ValidationResult();
  vr2.addWarning('Warning 1');
  vr1.merge(vr2);
  console.log('  Merged:', vr1.toJSON());

  console.log('\n✅ All base validator tests completed!');
  return true;
}

// Auto-run if in browser or Node with DOMParser
if (typeof DOMParser !== 'undefined') {
  runTests().catch(console.error);
} else if (typeof document !== 'undefined') {
  // Browser environment
  runTests().catch(console.error);
}

export { runTests };