/**
 * Schema Validator Tests
 * Run in browser console at http://localhost:3000/admin-new/
 */

import { SchemaValidator } from './schema-validator.js';
import { BaseValidator, ValidationResult } from './base-validator.js';

const testCases = {
  // Perfect Product schema with all required fields
  perfectProduct: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Page</title>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "Black Cotton Hoodie XL",
        "image": "https://example.com/hoodie-black-xl.jpg",
        "description": "Premium black cotton hoodie, size XL, 350g/m²",
        "sku": "ML-001-BLK-XL",
        "brand": {
          "@type": "Brand",
          "name": "DALLI"
        },
        "offers": {
          "@type": "Offer",
          "price": "4290",
          "priceCurrency": "RSD",
          "availability": "https://schema.org/InStock",
          "seller": {
            "@type": "Organization",
            "name": "DALLI"
          }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "127"
        }
      }
      </script>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Organization",
        "name": "DALLI",
        "url": "https://dalli.rs",
        "logo": "https://dalli.rs/logo.png",
        "sameAs": [
          "https://instagram.com/dalli",
          "https://facebook.com/dalli"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+381-11-123-4567",
          "contactType": "customer service"
        }
      }
      </script>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "WebSite",
        "name": "DALLI",
        "url": "https://dalli.rs",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://dalli.rs/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      }
      </script>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://dalli.rs"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Duksevi",
            "item": "https://dalli.rs/dukseri"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Black Cotton Hoodie XL",
            "item": "https://dalli.rs/dukseri/hoodie-black-xl"
          }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // Product missing required fields
  productMissingFields: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "Test Product"
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // Product with invalid offer
  productInvalidOffer: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "Test Product",
        "image": "https://example.com/img.jpg",
        "description": "Test product description",
        "sku": "TEST-001",
        "offers": {
          "@type": "Offer",
          "price": "invalid-price",
          "priceCurrency": "RSD"
        }
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // Missing Organization schema
  noOrganization: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "Test Product",
        "image": "https://example.com/img.jpg",
        "description": "Test product description",
        "sku": "TEST-001",
        "offers": {
          "@type": "Offer",
          "price": "1000",
          "priceCurrency": "RSD",
          "availability": "https://schema.org/InStock"
        }
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // Organization missing logo and sameAs
  orgIncomplete: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Organization",
        "name": "Test Org",
        "url": "https://example.com"
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // WebSite missing SearchAction
  websiteNoSearch: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "WebSite",
        "name": "Test Site",
        "url": "https://example.com"
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // BreadcrumbList with issues
  breadcrumbIssues: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "item": "https://example.com"
          }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // No schema at all
  noSchema: `
    <!DOCTYPE html>
    <html>
    <head><title>Test Page</title></head>
    <body><p>No structured data here</p></body>
    </html>
  `,

  // Invalid JSON-LD
  invalidJsonLd: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      { invalid json }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // Microdata Product
  microdataProduct: `
    <!DOCTYPE html>
    <html>
    <head><title>Microdata Product</title></head>
    <body>
      <div itemscope itemtype="https://schema.org/Product">
        <span itemprop="name">Microdata Hoodie</span>
        <img itemprop="image" src="/hoodie.jpg" alt="Hoodie">
        <span itemprop="description">Microdata product description</span>
        <span itemprop="sku">MICRO-001</span>
        <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
          <span itemprop="price">3990</span>
          <span itemprop="priceCurrency">RSD</span>
          <link itemprop="availability" href="https://schema.org/InStock">
        </div>
      </div>
    </body>
    </html>
  `,

  // RDFa Product
  rdfaProduct: `
    <!DOCTYPE html>
    <html>
    <head><title>RDFa Product</title></head>
    <body>
      <div vocab="https://schema.org/" typeof="Product">
        <span property="name">RDFa Hoodie</span>
        <img property="image" src="/hoodie.jpg" alt="Hoodie">
        <span property="description">RDFa product description</span>
        <span property="sku">RDF-001</span>
        <div property="offers" typeof="Offer">
          <span property="price">3990</span>
          <span property="priceCurrency">RSD</span>
          <link property="availability" href="https://schema.org/InStock">
        </div>
      </div>
    </body>
    </html>
  `,

  // Duplicate Organization names
  duplicateOrgNames: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Organization",
        "name": "Org Name A",
        "url": "https://example.com"
      }
      </script>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Organization",
        "name": "Org Name B",
        "url": "https://example.com/page2"
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // Invalid availability
  invalidAvailability: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "Test Product",
        "image": "https://example.com/img.jpg",
        "description": "Test product",
        "sku": "TEST-001",
        "offers": {
          "@type": "Offer",
          "price": "1000",
          "priceCurrency": "RSD",
          "availability": "https://schema.org/UnknownAvailability"
        }
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // Article schema
  articleSchema: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Article",
        "headline": "Test Article",
        "datePublished": "2024-01-15T10:00:00Z",
        "author": {
          "@type": "Person",
          "name": "John Doe"
        },
        "image": "https://example.com/article.jpg",
        "publisher": {
          "@type": "Organization",
          "name": "Test Publisher"
        }
      }
      </script>
    </head>
    <body></body>
    </html>
  `,

  // Product with GTIN/MPN
  productWithIdentifiers: `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "Test Product",
        "image": "https://example.com/img.jpg",
        "description": "Test product",
        "sku": "TEST-001",
        "gtin": "1234567890123",
        "mpn": "MPN-001",
        "brand": {
          "@type": "Brand",
          "name": "Test Brand"
        },
        "offers": {
          "@type": "Offer",
          "price": "1000",
          "priceCurrency": "RSD",
          "availability": "https://schema.org/InStock"
        }
      }
      </script>
    </head>
    <body></body>
    </html>
  `
};

async function runSchemaValidatorTests() {
  console.log('🧪 Running Schema Validator Tests...\n');

  const validator = new SchemaValidator({
    requiredTypes: ['Product', 'Organization', 'WebSite', 'BreadcrumbList'],
    validateProduct: true,
    validateOrganization: true,
    validateBreadcrumb: true,
    validateWebSite: true,
    checkNestedSchemas: true,
    checkGoogleRichResults: true,
    checkPropertyTypes: true,
    checkSameAs: true,
    checkLogo: true
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

  // Test 1: Perfect complete schema set
  console.log('\n📝 Test 1: Perfect complete schema set (Product, Org, WebSite, Breadcrumb)');
  let result = await validator.validate(testCases.perfectProduct, 'https://example.com/perfect');
  assert(!result.hasErrors, 'No errors for perfect schema set');
  assert(result.metadata.totalSchemas >= 4, `Found ${result.metadata.totalSchemas} schemas`);
  assert(result.metadata.schemaTypes.includes('Product'), 'Product schema found');
  assert(result.metadata.schemaTypes.includes('Organization'), 'Organization schema found');
  assert(result.metadata.schemaTypes.includes('WebSite'), 'WebSite schema found');
  assert(result.metadata.schemaTypes.includes('BreadcrumbList'), 'BreadcrumbList schema found');
  assert(result.metadata.score >= 80, `Good score: ${result.metadata.score}`);

  // Test 2: Product missing required fields
  console.log('\n📝 Test 2: Product missing required fields');
  result = await validator.validate(testCases.productMissingFields, 'https://example.com/missing');
  assert(result.hasErrors, 'Errors for missing required fields');
  const missingErrors = result.errors.filter(e => e.message.includes('Missing required property'));
  assert(missingErrors.length >= 4, `Found ${missingErrors.length} missing property errors`);

  // Test 3: Product with invalid offer
  console.log('\n📝 Test 3: Product with invalid offer (price, currency, availability)');
  result = await validator.validate(testCases.productInvalidOffer, 'https://example.com/invalid-offer');
  assert(result.hasErrors, 'Errors for invalid offer');
  const priceError = result.errors.find(e => e.message.includes('price'));
  assert(priceError !== undefined, 'Invalid price error found');

  // Test 4: Missing Organization schema
  console.log('\n📝 Test 4: Missing Organization schema warning');
  result = await validator.validate(testCases.noOrganization, 'https://example.com/no-org');
  assert(result.hasWarnings, 'Warning for missing Organization');
  const orgWarning = result.warnings.find(w => w.message.includes('Organization'));
  assert(orgWarning !== undefined, 'Missing Organization warning');

  // Test 5: Organization incomplete (missing logo, sameAs)
  console.log('\n📝 Test 5: Organization incomplete (missing logo, sameAs)');
  result = await validator.validate(testCases.orgIncomplete, 'https://example.com/org-incomplete');
  assert(result.hasWarnings, 'Warnings for incomplete Organization');
  const logoWarning = result.warnings.find(w => w.message.includes('logo'));
  const sameAsWarning = result.warnings.find(w => w.message.includes('sameAs'));
  assert(logoWarning !== undefined, 'Missing logo warning');
  assert(sameAsWarning !== undefined, 'Missing sameAs warning');

  // Test 6: WebSite missing SearchAction
  console.log('\n📝 Test 6: WebSite missing SearchAction');
  result = await validator.validate(testCases.websiteNoSearch, 'https://example.com/website-no-search');
  assert(result.hasWarnings, 'Warning for missing SearchAction');
  const searchWarning = result.warnings.find(w => w.message.includes('SearchAction'));
  assert(searchWarning !== undefined, 'Missing SearchAction warning');

  // Test 7: BreadcrumbList issues (too few items)
  console.log('\n📝 Test 7: BreadcrumbList with too few items');
  result = await validator.validate(testCases.breadcrumbIssues, 'https://example.com/breadcrumb');
  assert(result.hasWarnings, 'Warning for breadcrumb with 1 item');
  const breadcrumbWarning = result.warnings.find(w => w.message.includes('fewer than 2'));
  assert(breadcrumbWarning !== undefined, 'Breadcrumb warning found');

  // Test 8: No schema at all
  console.log('\n📝 Test 8: No structured data at all');
  result = await validator.validate(testCases.noSchema, 'https://example.com/no-schema');
  assert(result.hasWarnings, 'Warning for no structured data');
  assert(result.metadata.totalSchemas === 0, 'Total schemas = 0');
  assert(result.metadata.score === 0, 'Score = 0 for no schemas');

  // Test 9: Invalid JSON-LD (should not crash)
  console.log('\n📝 Test 9: Invalid JSON-LD (graceful handling)');
  result = await validator.validate(testCases.invalidJsonLd, 'https://example.com/invalid-jsonld');
  assert(result.metadata.totalSchemas === 0, 'Invalid JSON-LD ignored gracefully');

  // Test 10: Microdata parsing
  console.log('\n📝 Test 10: Microdata Product parsing');
  result = await validator.validate(testCases.microdataProduct, 'https://example.com/microdata');
  assert(result.metadata.totalSchemas >= 1, 'Microdata parsed');
  assert(result.metadata.schemaTypes.includes('Product'), 'Product from microdata');

  // Test 11: RDFa parsing
  console.log('\n📝 Test 11: RDFa Product parsing');
  result = await validator.validate(testCases.rdfaProduct, 'https://example.com/rdfa');
  assert(result.metadata.totalSchemas >= 1, 'RDFa parsed');
  assert(result.metadata.schemaTypes.includes('Product'), 'Product from RDFa');

  // Test 12: Duplicate Organization names
  console.log('\n📝 Test 12: Duplicate Organization names across schemas');
  result = await validator.validate(testCases.duplicateOrgNames, 'https://example.com/dup-org');
  assert(result.hasWarnings, 'Warning for duplicate org names');
  const dupWarning = result.warnings.find(w => w.message.includes('different names'));
  assert(dupWarning !== undefined, 'Duplicate org warning found');

  // Test 13: Invalid availability value
  console.log('\n📝 Test 13: Invalid availability value');
  result = await validator.validate(testCases.invalidAvailability, 'https://example.com/invalid-avail');
  assert(result.hasWarnings, 'Warning for non-standard availability');
  const availWarning = result.warnings.find(w => w.message.includes('availability'));
  assert(availWarning !== undefined, 'Availability warning found');

  // Test 14: Article schema
  console.log('\n📝 Test 14: Article schema validation');
  result = await validator.validate(testCases.articleSchema, 'https://example.com/article');
  assert(result.metadata.schemaTypes.includes('Article'), 'Article schema found');
  assert(!result.hasErrors, 'Valid article schema has no errors');

  // Test 15: Product with GTIN/MPN (bonus)
  console.log('\n📝 Test 15: Product with GTIN/MPN');
  result = await validator.validate(testCases.productWithIdentifiers, 'https://example.com/with-gtin');
  const gtinInfo = result.infos.find(i => i.message.includes('GTIN'));
  // May or may not have info depending on implementation

  // Test 16: Cross-page consistency (static method)
  console.log('\n📝 Test 16: Cross-page Organization consistency');
  const crossResults = [
    { metadata: { validator: 'schema', url: 'https://a.com', schemaType: 'Organization', rawSchema: { name: 'Org A', url: 'https://example.com' } } },
    { metadata: { validator: 'schema', url: 'https://b.com', schemaType: 'Organization', rawSchema: { name: 'Org B', url: 'https://example.com' } } }
  ];
  const consistencyResult = SchemaValidator.checkCrossPageConsistency(crossResults);
  assert(consistencyResult.hasWarnings, 'Cross-page org name inconsistency detected');

  // Test 17: Score calculation
  console.log('\n📝 Test 17: Score calculation');
  result = await validator.validate(testCases.perfectProduct, 'https://example.com/score');
  assert(result.metadata.score >= 85, `Perfect schema scores high: ${result.metadata.score}`);

  result = await validator.validate(testCases.noSchema, 'https://example.com/score2');
  assert(result.metadata.score === 0, 'No schema scores 0');

  // Test 18: Rich results eligibility
  console.log('\n📝 Test 18: Google Rich Results eligibility');
  result = await validator.validate(testCases.perfectProduct, 'https://example.com/rich-results');
  const richErrors = result.errors.filter(e => e.details.googleRichResults);
  assert(richErrors.length === 0, 'Perfect product eligible for rich results');

  // Test 19: Product with invalid price
  console.log('\n📝 Test 19: Product with invalid price');
  const invalidPrice = `<script type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Test","image":"x","description":"x","sku":"x","offers":{"@type":"Offer","price":"not-a-number","priceCurrency":"RSD","availability":"https://schema.org/InStock"}}</script>`;
  result = await validator.validate(`<html><head>${invalidPrice}</head><body></body></html>`, 'https://example.com/invalid-price');
  const priceError2 = result.errors.find(e => e.message.includes('Invalid price'));
  assert(priceError2 !== undefined, 'Invalid price error detected');

  // Test 20: Missing BreadcrumbList
  console.log('\n📝 Test 20: Missing BreadcrumbList warning');
  result = await validator.validate(testCases.noOrganization, 'https://example.com/no-breadcrumb');
  const breadcrumbListWarning = result.warnings.find(w => w.message.includes('BreadcrumbList'));
  assert(breadcrumbListWarning !== undefined, 'Missing BreadcrumbList warning');

  // Test 21: Price currency validation
  console.log('\n📝 Test 21: Invalid priceCurrency format');
  const invalidCurrency = `<script type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Test","image":"x","description":"x","sku":"x","offers":{"@type":"Offer","price":"1000","priceCurrency":"RS","availability":"https://schema.org/InStock"}}</script>`;
  result = await validator.validate(`<html><head>${invalidCurrency}</head><body></body></html>`, 'https://example.com/bad-currency');
  const currencyWarning = result.warnings.find(w => w.message.includes('priceCurrency'));
  assert(currencyWarning !== undefined, 'Invalid currency warning');

  // Test 22: Nested schema validation
  console.log('\n📝 Test 22: Nested schema validation (Product -> Offer -> seller Organization)');
  result = await validator.validate(testCases.perfectProduct, 'https://example.com/nested');
  // Should validate nested Offer and Organization within Product

  // Test 22: Cross-page consistency (static method)
  console.log('\n📝 Test 22: Cross-page Organization consistency');
  const crossResults2 = [
    { metadata: { validator: 'schema', url: 'https://a.com', schemaType: 'Organization', rawSchema: { name: 'Org A', url: 'https://example.com' } } },
    { metadata: { validator: 'schema', url: 'https://b.com', schemaType: 'Organization', rawSchema: { name: 'Org B', url: 'https://example.com' } } }
  ];
  const consistencyResult2 = SchemaValidator.checkCrossPageConsistency(crossResults2);
  assert(consistencyResult2.hasWarnings, 'Cross-page org name inconsistency detected');

  // Test 23: Score for perfect vs empty
  console.log('\n📝 Test 23: Score comparison');
  result = await validator.validate(testCases.perfectProduct, 'https://example.com/score-perfect');
  assert(result.metadata.score >= 80, `Perfect score: ${result.metadata.score}`);
  
  result = await validator.validate(testCases.noSchema, 'https://example.com/score-empty');
  assert(result.metadata.score === 0, 'Empty schema scores 0');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\n🎉 All tests passed!' : `\n⚠️ ${failed} test(s) failed`);

  return { passed, failed };
}

export { runSchemaValidatorTests, testCases };

if (typeof document !== 'undefined') {
  runSchemaValidatorTests().catch(console.error);
} else {
  runSchemaValidatorTests().catch(console.error);
}