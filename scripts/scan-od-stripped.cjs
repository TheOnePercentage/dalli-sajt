#!/usr/bin/env node
/**
 * scan-od-stripped.cjs
 * Detects residual "od"-stripped corruption from the old i18n algorithm
 * across every HTML file.
 *
 * The old algorithm injected <span data-i18n="common.of">od</span> inside words;
 * the cleanup removed the span AND the "od" text, so any word containing "od"
 * could be left mangled (body->by, module->mule, Product->Pruct, products->pructs,
 * proizvod->proizv, model->mel, method->meth, odds->s, etc.)
 *
 * Strategies:
 *  1. TAG VALIDITY: every <tag>/</tag> must be a known HTML5 element.
 *     This catches body->by, because <by> is not a valid element.
 *  2. SCRIPT TYPE: type="module" must not be mangled (mule).
 *  3. KNOWN MANGLED MARKERS for words common in this codebase.
 *  4. JSON-LD "@type" values must be valid schema.org types.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const VALID_TAGS = new Set([
  'a','abbr','address','area','article','aside','audio','b','base','bdi','bdo','blockquote',
  'body','br','button','canvas','caption','cite','code','col','colgroup','data','datalist','dd',
  'del','details','dfn','dialog','div','dl','dt','em','embed','fieldset','figcaption','figure',
  'footer','form','h1','h2','h3','h4','h5','h6','head','header','hgroup','hr','html','i','iframe',
  'img','input','ins','kbd','label','legend','li','link','main','map','mark','menu','meta','meter',
  'nav','noscript','object','ol','optgroup','option','output','p','param','picture','pre','progress',
  'q','rp','rt','ruby','s','samp','script','section','select','slot','small','source','span','strong',
  'style','sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time',
  'title','tr','track','u','ul','var','video','wbr','svg','path','circle','rect','line','polyline',
  'polygon','g','defs','use','foreignObject','lineargradient','feColorMatrix','feGaussianBlur','feMerge','feMergeNode',
  'feOffset','radialGradient','linearGradient','stop','mask','pattern','clipPath','text','tspan'
]);

const MANGLED = [
  /\bpructs?\b/gi,            // products / Product
  /\bhoies\b/gi,              // hoodies
  /\bhoie\b/gi,               // hoodie
  /\bfeatures\.c\./gi,        // features.cod.
  /\bproizv(?!od)\b/gi,       // proizvod without od
  /\bproizvi\b/gi,            // proizvodi without od
  /\bdalli\.rs\/proizv-/gi,   // proizvod- url stripped
  /\btype="mule"/gi,          // type="module" stripped
  /&#039;ody|"Proizvi"/gi,
  /\@type":\s*"Pruct"/gi,
  /(aria-label|content|title|name)=["'][^"']*<span[^>]*data-i18n=/gi,
  /<span[^>]*data-i18n="common\.of"[^>]*>od<\/span>/gi,
];

function scan(filePath) {
  const rel = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // 1. Tag validity (open + close)
  const anyTagOpen = /<\/?([a-zA-Z][a-zA-Z0-9]*)(?=[\s>\/])/g;
  let m;
  while ((m = anyTagOpen.exec(content)) !== null) {
    const tag = m[1].toLowerCase();
    if (tag.startsWith('!--')) continue;
    if (!VALID_TAGS.has(tag)) {
      issues.push(`invalid tag <${tag}> at ${content.slice(0, m.index).split('\n').length}:...`);
    }
  }

  // 2. script type sanity: <script type="..."> must be module or valid
  const reScript = /<script[^>]*type="([^"]*)"[^>]*>/gi;
  while ((m = reScript.exec(content)) !== null) {
    const t = m[1].toLowerCase();
    if (t && !['module','text/javascript','application/javascript','application/ld+json','text/template','importmap','application/json'].includes(t)) {
      issues.push(`suspicious script type "${m[1]}" at line ${content.slice(0, m.index).split('\n').length}`);
    }
  }

  // 3. known mangled markers
  for (const re of MANGLED) {
    let mm;
    re.lastIndex = 0;
    while ((mm = re.exec(content)) !== null) {
      issues.push(`mangled marker ${JSON.stringify(mm[0])} at line ${content.slice(0, mm.index).split('\n').length}`);
    }
  }

  // 4. JSON-LD "@type" sanity
  const reJsonLd = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = reJsonLd.exec(content)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const types = [];
      (function walk(x) {
        if (Array.isArray(x)) { x.forEach(walk); return; }
        if (x && typeof x === 'object') {
          if (typeof x['@type'] === 'string') types.push(x['@type']);
          Object.values(x).forEach(walk);
        }
      })(data);
      for (const t of types) {
        // schema.org-ish; "Pruct"/"Proizvod"-type would be wrong
        if (/Pruct|Proizv(?!od)/.test(t)) issues.push(`bad @type "${t}" in JSON-LD at line ${content.slice(0, m.index).split('\n').length}`);
      }
    } catch (e) { issues.push(`JSON-LD parse error: ${e.message.slice(0,60)}`); }
  }

  return issues;
}

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'admin-new') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(ROOT);

let total = 0;
const results = [];
for (const f of htmlFiles) {
  const issues = scan(f);
  if (issues.length) {
    total += issues.length;
    results.push({ file: path.relative(ROOT, f), issues });
  }
}

// VOID tag check is noisy; also ensure each open/close tag balanced for key scaffolding
console.log('=== OD-STRIPPED / TAG-VALIDITY SCAN ===\n');
console.log(`HTML files scanned: ${htmlFiles.length} (excluding node_modules, admin-new)`);
console.log(`Files with issues:   ${results.length}`);
console.log(`Total issues:        ${total}\n`);
for (const r of results) {
  console.log(`- ${r.file}`);
  for (const i of r.issues) console.log(`    ${i}`);
}
process.exit(results.length ? 2 : 0);