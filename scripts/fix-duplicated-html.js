// fix-duplicated-html.js - Remove duplicated HTML sections from category pages
// Keeps only the first <html><head><body> section, removes subsequent duplicates

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const FILES_TO_FIX = ['dukseri.html', 'muska-garderoba.html', 'zenska-garderoba.html'];

let totalFilesFixed = 0;
let totalDuplicatesRemoved = 0;

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Find all <html> opening positions
  const htmlOpenPositions = [];
  let match;
  const regex = /<html\s/gi;
  let lastIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    htmlOpenPositions.push({
      position: match.index,
      // Find the closing > of the html tag
      end: content.indexOf('>', match.index) + 1,
    });
  }

  if (htmlOpenPositions.length <= 1) return; // No duplicates to fix

  // Keep only the first <html> section
  // The first section ends at the first </html> or at a reasonable breaking point
  const firstHtmlOpen = htmlOpenPositions[0];
  const firstHtmlCloseRegex = /<\/html>/gi;
  const firstHtmlCloseMatch = content.match(firstHtmlCloseRegex);

  if (firstHtmlCloseMatch && firstHtmlCloseMatch.index > firstHtmlOpen.position) {
    // There's a closing </html> after the first opening - keep up to that point
    const keepEnd = firstHtmlCloseMatch.index + '<\/html>'.length;
    content = content.substring(0, keepEnd);
    // Remove any remaining <html> sections
    // Remove all <html and </html> that remain
    content = content.replace(/<html[^>]*>/gi, '');
    content = content.replace(/<\/html>/gi, '');
  } else {
    // No closing </html> found after first opening - keep up to a reasonable point
    // Find the first <body> closing or other marker
    const bodyClose = content.lastIndexOf('</body>');
    if (bodyClose > 0) {
      content = content.substring(0, bodyClose + '</body>'.length);
      content = content.replace(/<html[^>]*>/gi, '');
    }
  }

  // Remove any empty or duplicate DOCTYPE declarations, keeping only first
  const doctypeRegex = /<!DOCTYPE[^>]*>/gi;
  const doctypeMatches = content.match(doctypeRegex);
  if (doctypeMatches && doctypeMatches.length > 1) {
    // Keep only the first DOCTYPE
    content = content.replace(/<!DOCTYPE[^>]*>/gi, doctypeMatches[0]);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFilesFixed++;
    // Count how many <html> openings were removed
    const newHtmlCount = (content.match(/<html\s/gi) || []).length;
    const oldHtmlCount = (originalContent.match(/<html\s/gi) || []).length;
    totalDuplicatesRemoved += oldHtmlCount - newHtmlCount;
    console.log(
      `  FIXED: ${filePath} - removed ${oldHtmlCount - newHtmlCount} duplicate <html> sections`
    );
  }
}

// Process each file
console.log(`\n=== Duplicated HTML Fix Report ===\n`);
console.log(`Fixing duplicated HTML in: ${FILES_TO_FIX.join(', ')}\n`);

for (const file of FILES_TO_FIX) {
  const fullPath = path.join(BASE_DIR, file);
  fixFile(fullPath);
}

console.log(`\n=== FIX SUMMARY ===`);
console.log(`Files fixed: ${totalFilesFixed}`);
console.log(`Duplicate <html> sections removed: ${totalDuplicatesRemoved}`);
