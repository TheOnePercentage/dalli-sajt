#!/usr/bin/env node
/**
 * scan-all-corruption.cjs
 * Exhaustive scan for ANY remnant of older i18n-algorithm corruption
 * across every HTML file in the repository.
 *
 * Marker classes from the old algorithm (add_i18n.py / add_i18n_attributes.py):
 *  A. <span data-i18n="common.of">od</span> injection inside words
 *  B. Words with "od" stripped (products->pructs, hoodies->hoies, cod->c,
 *     proizvodi->proizvi/proizv, bod->b etc.) in text, keys, URLs
 *  C. i18n spans embedded inside attribute VALUES (href/aria-label/content/data-i18n)
 *  D. Nested/duplicated identical i18n spans
 *  E. Duplicate document scaffolding: DOCTYPE/<html>/<head>/<body>/<title>
 *  F. data-i18n inside JSON-LD / OG / schema
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const markers = {
  'A_COMMON_OF_SPAN': /\b\w*<span[^>]*data-i18n="common\.of"[^>]*>od<\/span>\w*|(<span[^>]*data-i18n="common\.of"[^>]*>od<\/span>)/gi,
  'B_MISSING_OD_TEXT': /(pructs|hoies|hoie|features\.c\.title|features\.c\.desc|Proizvi|proizvi\b|proizv-(?=[a-z])|b<span[^>]*data-i18n="common\.of"|pr<span[^>]*data-i18n="common\.of")/gi,
  'C_SPAN_IN_ATTR': /\b(?:href|aria-label|content|data-i18n|title|alt|name)=["'][^"']*<span[^>]*data-i18n=/gi,
  'D_NESTED_DUP_SPAN': /<span([^>]*data-i18n="[^"]*"[^>]*)>\s*<span\1>/gi,
  'E_DUP_SCAFFOLD': {
    doctype: /<!DOCTYPE\s+html>/gi,
    htmlOpen: /<html[\s>]/gi,
    head: /<head[\s>]/gi,
    body: /<body[\s>]/gi,
    title: /<title>/gi,
    htmlClose: /<\/html>/gi,
  },
  'F_I18N_IN_JSONLD': /<script[^>]*application\/ld\+json[^>]*>[\s\S]*?data-i18n[\s\S]*?<\/script>/gi,
};

function scanFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const found = {};

  // A & B: word corruption
  const a = [];
  const reA = /\w*<span[^>]*data-i18n="common\.of"[^>]*>od<\/span>\w*/gi;
  let m;
  while ((m = reA.exec(content)) !== null) a.push(m[0].slice(0, 80));
  if (!a.length) {
    reA.lastIndex = 0;
    const reA2 = /<span[^>]*data-i18n="common\.of"[^>]*>od<\/span>/gi;
    while ((m = reA2.exec(content)) !== null) a.push(m[0]);
  }
  if (a.length) found['A_COMMON_OF_SPAN'] = a.length;

  const reB = /(pructs|hoies|hoie|features\.c\.title|features\.c\.desc|\bProizvi\b|\bproizvi\b|dalli\.rs\/proizv-|href="\/proizv-|og-proizv)/gi;
  let bCount = 0;
  const bSamples = [];
  while ((m = reB.exec(content)) !== null) { bCount++; if (bSamples.length < 3) bSamples.push(m[0]); }
  if (bCount) found['B_MISSING_OD'] = bCount + (bSamples.length ? ` (${bSamples.join(', ')})` : '');

  // C: spans in attribute values
  const reC = /\b(?:href|aria-label|content|data-i18n|title|alt|name)=["'][^"']*<span[^>]*data-i18n=/gi;
  let cCount = 0;
  while ((m = reC.exec(content)) !== null) cCount++;
  if (cCount) found['C_SPAN_IN_ATTR'] = cCount;

  // D: nested duplicate spans
  const reD = /<span([^>]*data-i18n="[^"]*"[^>]*)>\s*<span\1>/gi;
  let dCount = 0;
  while ((m = reD.exec(content)) !== null) dCount++;
  if (dCount) found['D_NESTED_DUP_SPAN'] = dCount;

  // E: duplicate scaffolding
  for (const [key, re] of Object.entries(markers.E_DUP_SCAFFOLD)) {
    const c = (content.match(re) || []).length;
    const expected = (key === 'htmlClose') ? 1 : (key === 'htmlOpen' ? 1 : 1);
    if (c > 0) {
      // title may legitimately appear once in head; flag >1
      if (c > (key === 'title' || key === 'htmlClose' ? 1 : 1)) {
        found[`E_DUP_${key.toUpperCase()}`] = c;
      }
    }
  }

  // F: data-i18n inside JSON-LD
  const reF = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  let fCount = 0;
  while ((m = reF.exec(content)) !== null) { if (m[1].includes('data-i18n')) fCount++; }
  if (fCount) found['F_I18N_IN_JSONLD'] = fCount;

  return found;
}

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(ROOT);

const results = [];
for (const f of htmlFiles) {
  const found = scanFile(f);
  if (Object.keys(found).length) {
    results.push({ file: path.relative(ROOT, f), found });
  }
}

console.log('=== EXHAUSTIVE CORRUPTION SCAN ===\n');
console.log(`Total HTML files scanned: ${htmlFiles.length}`);
console.log(`Files with ANY corruption remnant: ${results.length}\n`);

for (const r of results) {
  console.log(`- ${r.file}`);
  for (const [k, v] of Object.entries(r.found)) console.log(`    ${k}: ${v}`);
}

process.exit(results.length ? 2 : 0);