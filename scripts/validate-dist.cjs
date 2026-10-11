// validate-dist.cjs — Final validation of deployable dist/ output.
// Checks: handlebars leakage, valid JSON-LD, key deployable pages present.

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
let errors = 0;
let warnings = 0;

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith('.html')) files.push(p);
  }
  return files;
}

if (!fs.existsSync(DIST)) {
  console.error('❌ dist/ ne postoji. Build nije proizveo output.');
  process.exit(1);
}

const htmlFiles = walk(DIST);

// 1. Handlebars leakage
for (const f of htmlFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/\{\{[^}]*\}\}/g);
  if (matches) {
    errors++;
    console.error(`❌ HBS_LEAK ${path.relative(DIST, f)}: ${matches.length} šablonskih tokena u izlazu`);
  }
}

// 2. JSON-LD validity (only non-empty ld+json blocks — must parse, no template leakage)
for (const f of htmlFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const blocks = [...content.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)];
  for (const m of blocks) {
    const body = m[1].trim();
    if (!body) continue;
    if (body.startsWith('{{') || body.endsWith('}}')) {
      errors++;
      console.error(`❌ JSONLD_MANGLED ${path.relative(DIST, f)}: double-brace JSON-LD`); 
      continue;
    }
    try {
      JSON.parse(body);
    } catch (e) {
      errors++;
      console.error(`❌ JSONLD_INVALID ${path.relative(DIST, f)}: ${e.message.slice(0, 80)}`);
    }
  }
}

// 3. Key deployable pages present
const required = [
  'index.html',
  'cart.html',
  'checkout.html',
  'profile.html',
  'orders.html',
  'wishlist.html',
  'settings.html',
  'blog-index.html',
  'sitemap.xml'
];
for (const r of required) {
  if (!fs.existsSync(path.join(DIST, r))) {
    warnings++;
    console.warn(`⚠️  NEDOSTAJE ${r} u dist/`);
  }
}

const productPages = htmlFiles.filter(f => /casual|elegance|\/proizvod-|dukseri|majice|muska-garderoba|zenska-garderoba|trenerke/.test(path.relative(DIST, f)));
if (productPages.length === 0) {
  errors++;
  console.error('❌ dist/ nema nijednu generisanu SEO stranicu (casual/elegance/proizvod-*).');
}

console.log(`\n=== dist validacija ===`);
console.log(`HTML fajlova u dist: ${htmlFiles.length}`);
console.log(`SEO generated stranica: ${productPages.length}`);
console.log(`Grešaka: ${errors}, Upozorenja: ${warnings}`);

if (errors > 0) {
  console.error('\n❌ Build output nije validan.');
  process.exit(1);
}
console.log(errors === 0 ? '\n✅ dist/ je validan.' : '');
process.exit(0);