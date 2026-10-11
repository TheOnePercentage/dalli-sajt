/**
 * SEO Auditor Tests
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { SEOAuditor } from '../seo-auditor.js';
import { MetaDescriptionValidator } from './validators/meta-description-validator.js';
import { ImageAltValidator } from './validators/image-alt-validator.js';
import { SchemaValidator } from './validators/schema-validator.js';
import { CanonicalValidator } from './validators/canonical-validator.js';

const testPages = {
  // Perfect page - all validators should pass
  perfect: {
    url: 'https://example.com/perfect',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Perfect Product | DALLI</title>
        <meta name="description" content="Shop premium black hoodie XL - 100% cotton, 350g/m². Free shipping over 10,000 RSD. Order now!">
        <link rel="canonical" href="https://example.com/perfect">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": "Perfect Product",
          "image": "https://example.com/img.jpg",
          "description": "Perfect product description",
          "sku": "PERFECT-001",
          "offers": {
            "@type": "Offer",
            "price": "1000",
            "priceCurrency": "RSD",
            "availability": "https://schema.org/InStock"
          }
        }
        </script>
      </head>
      <body>
        <img src="/product.jpg" alt="Perfect product front view showing all details">
      </body>
      </html>
    `
  },

  // Page with multiple issues
  problematic: {
    url: 'https://example.com/problems',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Problems</title>
        <!-- Missing meta description -->
        <link rel="canonical" href="https://otherdomain.com/page">
      </head>
      <body>
        <img src="/image.jpg"> <!-- Missing alt -->
        <img src="/image2.jpg" alt="image"> <!-- Generic alt -->
        <img src="/image3.jpg" alt="Product product product product"> <!-- Keyword stuffing -->
      </body>
      </html>
    `
  },

  // Page with schema issues
  schemaIssues: {
    url: 'https://example.com/schema-problems',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Schema Problems</title>
        <meta name="description" content="Page with schema issues for testing.">
        <link rel="canonical" href="https://example.com/schema-problems">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": "Test Product"
          <!-- Missing: image, description, sku, offers -->
        }
        </script>
      </head>
      <body>
        <img src="/product.jpg" alt="Product photo">
      </body>
      </html>
    `
  },

  // Missing canonical
  missingCanonical: {
    url: 'https://example.com/no-canonical',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>No Canonical</title>
        <meta name="description" content="This page has no canonical tag.">
      </head>
      <body>
        <img src="/image.jpg" alt="Descriptive alt text for the image">
      </body>
      </html>
    `
  }
};

async function runAuditorTests() {
  console.log('🧪 Running SEO Auditor Tests...\n');

  const auditor = new SEOAuditor({
    validators: ['meta-description', 'image-alt', 'schema', 'canonical'],
    weights: {
      'meta-description': 0.25,
      'image-alt': 0.20,
      'schema': 0.30,
      'canonical': 0.25
    },
    crawl: false
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

  // Test 1: Audit perfect page
  console.log('\n📝 Test 1: Audit perfect page');
  let result = await auditor.auditPage(testPages.perfect.url, testPages.perfect.html);
  assert(result.overallScore >= 90, `Perfect page score: ${result.overallScore}`);
  assert(result.grade === 'A', `Grade: ${result.grade}`);
  assert(result.results.has('meta-description'), 'Has meta-description result');
  assert(result.results.has('image-alt'), 'Has image-alt result');
  assert(result.results.has('schema'), 'Has schema result');
  assert(result.results.has('canonical'), 'Has canonical result');

  // Test 2: Audit problematic page
  console.log('\n📝 Test 2: Audit problematic page');
  result = await auditor.auditPage(testPages.problematic.url, testPages.problematic.html);
  assert(result.overallScore < 50, `Low score for problematic page: ${result.overallScore}`);
  assert(result.grade === 'F' || result.grade === 'D', `Poor grade: ${result.grade}`);
  assert(result.issueCounts.critical + result.issueCounts.high > 0, 'Has critical/high issues');

  // Check specific validators found issues
  const metaResult = result.results.get('meta-description');
  assert(metaResult && metaResult.hasErrors, 'Meta description validator found missing description');

  const altResult = result.results.get('image-alt');
  assert(altResult && altResult.hasErrors, 'Image alt validator found missing alt');

  const canonicalResult = result.results.get('canonical');
  assert(canonicalResult && canonicalResult.hasWarnings, 'Canonical validator found cross-domain warning');

  // Test 3: Audit schema issues page
  console.log('\n📝 Test 3: Audit page with schema issues');
  result = await auditor.auditPage(testPages.schemaIssues.url, testPages.schemaIssues.html);
  const schemaResult = result.results.get('schema');
  assert(schemaResult && schemaResult.hasErrors, 'Schema validator found missing required properties');

  // Test 4: Missing canonical page
  console.log('\n📝 Test 4: Missing canonical');
  result = await auditor.auditPage(testPages.missingCanonical.url, testPages.missingCanonical.html);
  const canonicalResult2 = result.results.get('canonical');
  assert(canonicalResult2 && canonicalResult2.hasErrors, 'Canonical validator found missing canonical');

  // Test 5: Weighted scoring
  console.log('\n📝 Test 5: Weighted scoring');
  const customAuditor = new SEOAuditor({
    validators: ['meta-description', 'canonical'],
    weights: {
      'meta-description': 0.8,
      'canonical': 0.2
    }
  });
  
  result = await customAuditor.auditPage(testPages.perfect.url, testPages.perfect.html);
  // Perfect page should still score high even with different weights
  assert(result.overallScore >= 90, `Custom weights score: ${result.overallScore}`);

  // Test 6: Site audit (single page, no crawl)
  console.log('\n📝 Test 6: Site audit (single page)');
  const siteAuditor = new SEOAuditor({
    validators: ['meta-description', 'canonical'],
    crawl: false
  });

  // Mock fetch function
  const mockFetch = async (url) => {
    if (url.includes('perfect')) return testPages.perfect.html;
    if (url.includes('problems')) return testPages.problematic.html;
    return testPages.perfect.html;
  };

  const siteResult = await siteAuditor.auditSite('https://example.com/perfect', mockFetch);
  assert(siteResult.pages.size === 1, 'Site audit audited 1 page');
  assert(siteResult.overallScore >= 90, `Site audit score: ${siteResult.overallScore}`);
  assert(siteResult.grade === 'A', `Site audit grade: ${siteResult.grade}`);

  // Test 7: Cross-page analyses (simulated)
  console.log('\n📝 Test 7: Cross-page analyses setup');
  const multiAuditor = new SEOAuditor({
    validators: ['meta-description', 'image-alt', 'schema', 'canonical']
  });

  // Audit multiple pages
  const page1 = await multiAuditor.auditPage('https://a.com', testPages.perfect.html);
  const page2 = await multiAuditor.auditPage('https://b.com', testPages.perfect.html); // Same perfect content
  
  // Run cross-page analyses manually
  const allResults = [page1, page2];
  
  // Meta description cross-page
  const metaCross = MetaDescriptionValidator.checkCrossPageUniqueness(
    allResults.map(p => p.results.get('meta-description')).filter(Boolean)
  );
  assert(metaCross.hasErrors, 'Cross-page meta description detects duplicates');

  // Image alt cross-page
  const altCross = ImageAltValidator.checkCrossImageConsistency(
    allResults.map(p => p.results.get('image-alt')).filter(Boolean)
  );
  assert(altCross.hasWarnings, 'Cross-page alt detects inconsistency');

  // Schema cross-page
  const schemaCross = SchemaValidator.checkCrossPageConsistency(
    allResults.map(p => p.results.get('schema')).filter(Boolean)
  );
  assert(schemaCross.hasWarnings, 'Schema cross-page detects name inconsistency');

  // Canonical cross-page
  const canonicalCross = CanonicalValidator.checkCrossPageCanonicals(
    allResults.map(p => p.results.get('canonical')).filter(Boolean)
  );
  assert(canonicalCross.hasWarnings, 'Canonical cross-page detects shared canonical');

  // Test 8: Report generation
  console.log('\n📝 Test 8: Report generation');
  const reportAuditor = new SEOAuditor({
    validators: ['meta-description', 'canonical'],
    reportFormats: ['json', 'summary', 'html', 'csv']
  });

  const reportSiteResult = await reportAuditor.auditSite('https://example.com/test', mockFetch);
  const reports = reportAuditor.generateReport(reportSiteResult);

  assert(reports.json && reports.json.length > 100, 'JSON report generated');
  assert(reports.summary && reports.summary.includes('SEO AUDIT REPORT'), 'Summary report generated');
  assert(reports.html && reports.html.includes('<html'), 'HTML report generated');
  assert(reports.csv && reports.csv.includes('URL,Score'), 'CSV report generated');

  // Test 9: Custom weights affect scoring
  console.log('\n📝 Test 9: Custom weights affect scoring');
  const weightAuditor = new SEOAuditor({
    validators: ['meta-description', 'image-alt'],
    weights: {
      'meta-description': 0.9,
      'image-alt': 0.1
    }
  });

  // Page with good meta but bad images
  const mixedPage = {
    url: 'https://example.com/mixed',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mixed</title>
        <meta name="description" content="Perfect meta description with good length and keywords for testing purposes.">
        <link rel="canonical" href="https://example.com/mixed">
      </head>
      <body>
        <img src="/bad.jpg"> <!-- Missing alt -->
        <img src="/bad2.jpg" alt="img"> <!-- Generic alt -->
      </body>
      </html>
    `
  };

  result = await weightAuditor.auditPage(mixedPage.url, mixedPage.html);
  // Meta description weight 0.9, so score should be higher than if equal weights
  assert(result.overallScore > 40, `Weighted score favors meta: ${result.overallScore}`);

  // Test 10: Grade thresholds
  console.log('\n📝 Test 10: Grade thresholds');
  const gradeAuditor = new SEOAuditor({
    validators: ['meta-description'],
    gradeThresholds: {
      A: 95, B: 85, C: 70, D: 50, F: 0
    }
  });

  // Create page with score around 90
  const gradeTestPage = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Grade Test</title>
      <meta name="description" content="Good but not perfect meta description for testing grade thresholds.">
      <link rel="canonical" href="https://example.com/grade-test">
    </head>
    <body><img src="/img.jpg" alt="Good descriptive alt text for the image"></body>
    </html>
  `;

  result = await gradeAuditor.auditPage('https://example.com/grade-test', gradeTestPage);
  // With stricter thresholds (A: 95), score ~90 should be B
  console.log(`  Score: ${result.overallScore}, Grade: ${result.grade}`);
  assert(result.grade === 'B' || result.grade === 'A', `Grade with custom thresholds: ${result.grade}`);

  // Test 11: Crawl configuration (not actually crawling)
  console.log('\n📝 Test 11: Crawl configuration');
  const crawlAuditor = new SEOAuditor({
    validators: ['meta-description'],
    crawl: true,
    maxPages: 5,
    crawlDepth: 2,
    requestDelay: 0
  });
  
  assert(crawlAuditor.config.crawl === true, 'Crawl enabled');
  assert(crawlAuditor.config.maxPages === 5, 'Max pages configured');
  assert(crawlAuditor.config.crawlDepth === 2, 'Crawl depth configured');

  // Test 12: Report formats
  console.log('\n📝 Test 12: Report formats');
  const formatAuditor = new SEOAuditor({
    validators: ['meta-description'],
    reportFormats: ['json', 'summary', 'html', 'csv']
  });

  const formatResult = await formatAuditor.auditSite('https://example.com/format', mockFetch);
  const formatReports = formatAuditor.generateReport(formatResult);
  
  assert(typeof formatReports.json === 'string', 'JSON report is string');
  assert(typeof formatReports.summary === 'string', 'Summary is string');
  assert(typeof formatReports.html === 'string', 'HTML is string');
  assert(typeof formatReports.csv === 'string', 'CSV is string');
  assert(formatReports.json.startsWith('{'), 'JSON is valid');
  assert(formatReports.summary.includes('SEO AUDIT REPORT'), 'Summary has header');
  assert(formatReports.html.includes('<html'), 'HTML has html tag');
  assert(formatReports.csv.startsWith('URL,Score'), 'CSV has header');

  // Test 12: Export methods
  console.log('\n📝 Test 12: Export methods');
  result = await auditor.auditPage(testPages.perfect.url, testPages.perfect.html);
  const pageJson = result.toJSON();
  assert(pageJson.overallScore === result.overallScore, 'Page JSON export works');
  assert(pageJson.validatorResults, 'Page JSON has validator results');

  const siteJson = siteResult.toJSON();
  assert(siteJson.overallScore === siteResult.overallScore, 'Site JSON export works');
  assert(siteJson.pages, 'Site JSON has pages');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All tests passed!' : `\n⚠️ ${failed} test(s) failed`);

  return { passed, failed };
}

export { runAuditorTests, testPages };

if (typeof document !== 'undefined') {
  runAuditorTests().catch(console.error);
}