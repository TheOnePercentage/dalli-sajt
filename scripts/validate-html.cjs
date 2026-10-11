// validate-html.cjs - Automated HTML corruption validation
// Checks for i18n corruption, duplicated HTML, and other issues

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const HTML_DIR = path.join(BASE_DIR, '');

let totalFilesChecked = 0;
let filesWithErrors = 0;
const errors = [];

function checkFile(filePath) {
  const ext = path.extname(filePath);
  if (ext !== '.html') return true; // Skip non-HTML files
  
  if (!fs.existsSync(filePath)) return true;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fileErrors = [];
  
  // 1. Duplicate DOCTYPE detection
  const doctypeCount = (content.match(/<!DOCTYPE\s+html>/gi) || []).length;
  if (doctypeCount > 1) {
    fileErrors.push(`DUPLICATE_DOCTYPE: Found ${doctypeCount} <!DOCTYPE html> declarations`);
  }
  
  // 2. Duplicate HTML tag detection - count `<html ` openings
  const htmlOpenCount = (content.match(/<html\s/gi) || []).length;
  if (htmlOpenCount > 1) {
    fileErrors.push(`DUPLICATE_HTML_OPEN: Found ${htmlOpenCount} <html> opening tags (expected 1)`);
  }
  
  // 3. Duplicate HEAD detection - count `<head>` openings
  const headOpenCount = (content.match(/<head\s/gi) || []).length;
  if (headOpenCount > 1) {
    fileErrors.push(`DUPLICATE_HEAD_OPEN: Found ${headOpenCount} <head> opening tags (expected 1)`);
  }
  
  // 4. Duplicate BODY detection - count `<body>` openings
  const bodyOpenCount = (content.match(/<body\s/gi) || []).length;
  if (bodyOpenCount > 1) {
    fileErrors.push(`DUPLICATE_BODY_OPEN: Found ${bodyOpenCount} <body> opening tags (expected 1)`);
  }
  
  // 5. Duplicate CLOSING HTML tag detection
  const htmlCloseCount = (content.match(/<\/html>/gi) || []).length;
  if (htmlCloseCount > 1) {
    fileErrors.push(`DUPLICATE_HTML_CLOSE: Found ${htmlCloseCount} </html> closing tags (expected 1)`);
  }
  
  // 6. Corrupted tag detection - <span data-i18n="common.of"> inside HTML
  const corruptedTagPattern = /<span\s+data-i18n="common\.of">od<\/span>/gi;
  const corruptedTagMatches = content.match(corruptedTagPattern) || [];
  if (corruptedTagMatches.length > 0) {
    fileErrors.push(`CORRUPTED_TAG: Found ${corruptedTagMatches.length} <span data-i18n="common.of">od</span> injections`);
  }
  
  // 7. Corrupted tag detection - data-i18n embedded INSIDE attribute values (not as normal attribute)
  // Normal: <span data-i18n="key">text</span> or <a href="..." data-i18n="key">
  // Corrupted: data-i18n="<span data-i18n=..." (span inside attribute value)
  const i18nInAttrValue = content.match(/\w+=["'][^"']*<span[^>]*data-i18n=/gi);
  if (i18nInAttrValue) {
    fileErrors.push(`CORRUPTED_TAG_SYNTAX: ${i18nInAttrValue.length} attributes with embedded span/data-i18n`);
  }
  
  // 8. Corrupted URLs - data-i18n embedded INSIDE the href value (not as sibling attribute)
  // Normal: <a href="/cart.html" data-i18n="common.cart">
  // Corrupted: href="...<span data-i18n=..." or href="<span data-i18n=..."
  const hrefWithI18n = content.match(/href=["'][^"']*<span[^>]*data-i18n=/gi);
  if (hrefWithI18n) {
    fileErrors.push(`CORRUPTED_URL: ${hrefWithI18n.length} href attributes with embedded span/data-i18n`);
  }
  
  // 9. Corrupted schema markup - data-i18n inside JSON-LD script tags
  const jsonLdSections = content.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const jsonLd of jsonLdSections) {
    if (jsonLd.includes('data-i18n')) {
      fileErrors.push(`CORRUPTED_SCHEMA: data-i18n found inside Schema.org JSON-LD script tag`);
      break; // Report once per file
    }
  }
  
  // 10. Corrupted canonical URLs - check for i18n corruption in canonical
  const canonicalMatch = content.match(/<link\s+rel=["']canonical["'][^>]*>/gi);
  if (canonicalMatch) {
    for (const canonical of canonicalMatch) {
      if (canonical.includes('data-i18n')) {
        fileErrors.push(`CORRUPTED_CANONICAL: Canonical URL contains data-i18n attribute`);
        break;
      }
    }
  }
  
  // 11. Corrupted Open Graph tags - check for i18n in og:* attributes
  const ogTags = content.match(/property=["'](og:[^"']+)["'][^>]*content=["'][^"']*["']/gi) || [];
  const ogWithI18n = ogTags.filter(tag => {
    // Extract the content value and check if it might contain i18n injection
    const contentMatch = tag.match(/content=["']([^"']+)["']/);
    if (contentMatch && contentMatch[1]) {
      const contentValue = contentMatch[1];
      // Check for span with data-i18n inside content
      if (contentValue.includes('<span data-i18n')) {
        return true;
      }
    }
    return false;
  });
  if (ogWithI18n.length > 0) {
    fileErrors.push(`CORRUPTED_OG: ${ogWithI18n.length} Open Graph tags with corrupted content`);
  }
  
  // 12. Check for i18n placeholders in URLs (from the user's examples)
  const i18nInUrl = content.match(/https?:\/\/[^"'>\s]*<span[^>]*data-i18n=/gi);
  if (i18nInUrl) {
    fileErrors.push(`CORRUPTED_URL_PATH: URLs containing <span data-i18n> tags`);
  }
  
  // 13. Check for corrupted product names (pr + span + udcts pattern)
  const corruptedProductName = content.match(/pr<span\s+data-i18n="common\.of">od<\/span>ucts/gi);
  if (corruptedProductName) {
    fileErrors.push(`CORRUPTED_PRODUCT_NAME: ${corruptedProductName.length} product names corrupted with i18n span`);
  }
  
  // 14. Check for corrupted body tag pattern
  const corruptedBody = content.match(/b<span\s+data-i18n="common\.of">od<\/span>y/gi);
  if (corruptedBody) {
    fileErrors.push(`CORRUPTED_BODY: ${corruptedBody.length} body text corrupted with i18n span`);
  }
  
  if (fileErrors.length > 0) {
    errors.push({
      file: path.relative(BASE_DIR, filePath),
      errors: fileErrors
    });
    filesWithErrors++;
  }
  
  totalFilesChecked++;
  return true;
}

// Find all HTML files
const htmlFiles = [];
const walkDir = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }
};

walkDir(HTML_DIR);

// Run validation on each file
console.log(`\n=== HTML Validation Report ===\n`);
console.log(`Total HTML files found: ${htmlFiles.length}\n`);

for (const file of htmlFiles) {
  checkFile(file);
}

console.log(`Files checked: ${totalFilesChecked}`);
console.log(`Files with errors: ${filesWithErrors}\n`);

if (filesWithErrors > 0) {
  console.log('=== ERRORS FOUND ===\n');
  errors.forEach(err => {
    console.log(`FILE: ${err.file}`);
    err.errors.forEach(e => {
      console.log(`  ❌ ${e}`);
    });
    console.log();
  });
  
  console.log(`\n${filesWithErrors} out of ${totalFilesChecked} files have HTML corruption issues.`);
  process.exit(1);
} else {
  console.log('✅ All HTML files are valid - no corruption detected!');
  console.log('✅ No duplicate DOCTYPE declarations');
  console.log('✅ No duplicate <html> tags');
  console.log('✅ No duplicate <head> tags');
  console.log('✅ No duplicate <body> tags');
  console.log('✅ No corrupted i18n tags (<span data-i18n="common.of">od</span>)');
  console.log('✅ No corrupted URLs or schema markup');
  process.exit(0);
}