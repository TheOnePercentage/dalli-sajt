#!/usr/bin/env node
/**
 * verify-i18n-text.cjs
 * DOM-based verification: for every element with data-i18n across all HTML files,
 * compare its rendered text against the sr locale value (en as fallback).
 * Flags OD-STRIPPED corruption (file text == locale minus "od").
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');

const sr = JSON.parse(fs.readFileSync(path.join(ROOT, 'js/i18n/locales/sr.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'js/i18n/locales/en.json'), 'utf8'));

function getPath(obj, key) { return key.split('.').reduce((o, k) => (o ? o[k] : undefined), obj); }
const norm = s => String(s).replace(/\s+/g, ' ').trim();

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'admin-new') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(ROOT);

let odCorrupted = 0;
let mismatch = 0;
for (const f of htmlFiles) {
  const rel = path.relative(ROOT, f);
  const content = fs.readFileSync(f, 'utf8');
  // skip file if it has no data-i18n at all
  if (!content.includes('data-i18n')) continue;
  let dom;
  try { dom = new JSDOM(content); } catch (e) { console.log(`- ${rel} [JSDOMPARSE: ${e.message.slice(0,40)}]`); continue; }
  const doc = dom.window.document;
  const els = doc.querySelectorAll('[data-i18n]');
  let fileIssues = [];
  for (const el of els) {
    const key = el.getAttribute('data-i18n');
    const text = norm(el.textContent || '');
    if (!key || !text) continue;
    const srV = getPath(sr, key);
    const enV = getPath(en, key);
    if (srV === undefined && enV === undefined) {
      continue; // key not in locales (en-admin pages etc.) - not i18n corruption
    }
    const srN = srV !== undefined ? norm(srV) : '';
    const enN = enV !== undefined ? norm(enV) : '';
    if (srN && text === srN) continue;
    if (enN && text === enN) continue;
    // od-stripped check
    const strip = s => s.replace(/od/gi, '');
    if ((srN && strip(srN) === text) || (enN && strip(enN) === text)) {
      odCorrupted++;
      fileIssues.push(`[OD-STRIPPED] key=${key} text="${text}" sr="${srN}" en="${enN}"`);
    } else if (srN) {
      // differs from sr and NOT an od-strip - report as mismatch (may be legit dynamic)
      mismatch++;
    }
  }
  if (fileIssues.length) {
    console.log(`- ${rel}`);
    for (const x of fileIssues) console.log(`    ${x}`);
  }
}
console.log(`\nFiles checked (with data-i18n): ${htmlFiles.length}`);
console.log(`OD-STRIPPED corruption instances: ${odCorrupted}`);
console.log(`Non-matching (review-worthy) instances: ${mismatch}`);
process.exit(odCorrupted ? 2 : 0);