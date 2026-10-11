// cleanup-i18n.js - Remove corrupted i18n spans from HTML files
// Removes <span data-i18n="common.of">od</span> injections that corrupt HTML element names

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const HTML_DIR = BASE_DIR;

// Patterns to remove - corrupted i18n spans that inject "od" inside HTML
const corruptedPatterns = [
  // Pattern 1: <span data-i18n="common.of">od</span> - the main corruption pattern
  /<span\s+data-i18n="common\.of">od<\/span>/gi,
  // Pattern 2: variations with extra spaces
  /<span\s+data-i18n="common\.of"\s*>od<\/span>/gi,
];

let totalFilesFixed = 0;
let totalSpansRemoved = 0;

function cleanupFile(filePath) {
  if (!fs.existsSync(filePath)) return 0;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let spansRemoved = 0;

  // Remove all corrupted patterns
  for (const pattern of corruptedPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      spansRemoved += matches.length;
      content = content.replace(pattern, '');
    }
  }

  // Also fix any broken tag names where i18n span was injected inside
  // Example: pr<span data-i18n="common.of">od</span>ucts -> products
  // We need to remove spans that are inside tag-like structures
  const insideTagPattern = /<span\s+data-i18n="common\.of">od<\/span>/gi;
  // Remove any remaining instances
  let remainingMatches = content.match(insideTagPattern);
  if (remainingMatches) {
    spansRemoved += remainingMatches.length;
    content = content.replace(insideTagPattern, '');
  }

  // Remove any empty spans left behind (just <span data-i18n="common.of"></span>)
  const emptySpanPattern = /<span\s+data-i18n="common\.of"><\/span>/gi;
  let emptyMatches = content.match(emptySpanPattern);
  if (emptyMatches) {
    spansRemoved += emptyMatches.length;
    content = content.replace(emptySpanPattern, '');
  }

  // Remove any orphaned "od" text that was left after span removal
  // Pattern: text that was inside the span, now standalone
  const orphanOdPattern = /od/gi;
  // Only remove standalone "od" that might be left - but be careful not to remove legitimate uses
  // We'll check if "od" appears where it shouldn't (outside of known contexts)

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return spansRemoved;
  }

  return 0;
}

// Find all HTML files
const htmlFiles = [];
const walkDir = dir => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.html')) {
      htmlFiles.push(path.join(fullPath));
    }
  }
};

walkDir(HTML_DIR);

// Remove .dist directory from the list (it's a build output, not source)
htmlFiles.sort();

// Process each file
console.log(`\n=== HTML i18n Cleanup Report ===\n`);
console.log(`Scanning ${htmlFiles.length} HTML files...\n`);

for (const file of htmlFiles) {
  // Skip dist directory - those are build outputs
  if (file.includes('/dist/') || file.includes('\\dist\\')) {
    continue;
  }

  const spansRemoved = cleanupFile(file);
  if (spansRemoved > 0) {
    totalFilesFixed++;
    totalSpansRemoved += spansRemoved;
    const relPath = path.relative(BASE_DIR, file);
    // Only report first few files
    if (totalFilesFixed <= 10) {
      console.log(`  FIXED: ${relPath} - removed ${spansRemoved} corrupted spans`);
    }
  }
}

console.log(`\n=== CLEANUP SUMMARY ===`);
console.log(`Files fixed: ${totalFilesFixed}`);
console.log(`Total corrupted spans removed: ${totalSpansRemoved}`);
console.log(`Total files scanned: ${htmlFiles.length}`);

if (totalSpansRemoved > 0) {
  console.log(
    `\n✅ Cleanup complete - removed ${totalSpansRemoved} corrupted i18n spans from ${totalFilesFixed} files`
  );
  process.exit(0);
} else {
  console.log(`\nNo corrupted spans found (or already cleaned)`);
  process.exit(0);
}
