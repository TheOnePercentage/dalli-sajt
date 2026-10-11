/**
 * inject-islands.cjs — post-build korak za generisane/SSG HTML stranice.
 *
 * Rollup (vite build) automatski zameni `/js/islands/index.js` sa hashed
 * chunk-om SAMO za vite-bundled ulazne stranice (profile/cart/checkout/
 * wishlist/orders...). Generisane stranice (proizvodi iz product-template-a,
 * kolekcije, blog) NISU rollup input-i — renderovane su posle vite build-a,
 * pa im ostaje sirova putanja `/js/islands/index.js` koja u dist ne postoji.
 *
 * Ovaj skript:
 *  1. nađe hashed loader chunk (dist/assets/js/index-*.js koji sadrži
 *     `data-island` — to je islands loader),
 *  2. u svakom dist HTML fajlu (rekurzivno) koji ima `data-island`:
 *     - ako već ima `assets/js/index-` (rollup stranica) → skip,
 *     - ako ima sirov `/js/islands/index.js` → zameni hashed verzijom,
 *     - inače → dopiše hashed loader pre kraja fajla.
 *
 * Pokreće se iz build.cjs posle generisanja HTML-a, pre validate-dist.
 */

const fs = require('fs');
const path = require('path');

const DIST = process.env.GENERATE_OUTPUT_DIR || path.join(__dirname, '..', 'dist');
const ASSETS_JS = path.join(DIST, 'assets', 'js');

function findLoaderChunk() {
  let candidates = [];
  if (fs.existsSync(ASSETS_JS)) {
    candidates = fs
      .readdirSync(ASSETS_JS)
      .filter(f => /^index-.*\.js$/.test(f))
      .map(f => path.join(ASSETS_JS, f))
      .filter(f => fs.readFileSync(f, 'utf8').includes('data-island'));
  }
  if (candidates.length !== 1) {
    throw new Error(
      `[inject-islands] očekivan TAČNO jedan islands loader chunk (index-*.js sa 'data-island'), nađeno: ${candidates.length}`
    );
  }
  return path.basename(candidates[0]);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function main() {
  const loader = findLoaderChunk();
  const scriptTag = `<script type="module" src="/assets/js/${loader}" defer></script>`;

  let touched = 0;
  const pages = walk(DIST);
  for (const file of pages) {
    let html = fs.readFileSync(file, 'utf8');
    if (!html.includes('data-island')) continue;
    if (html.includes('assets/js/index-')) continue; // rollup već rešio

    const raw = '<script type="module" src="/js/islands/index.js" defer></script>';
    if (html.includes(raw)) {
      html = html.split(raw).join(scriptTag);
    } else if (html.includes('js/islands/index.js')) {
      html = html.replace(/<script type="module" src="\/js\/islands\/index\.js"[^>]*><\/script>/, scriptTag);
    } else {
      html = `${html.replace(/\s*$/, '\n')}\n${scriptTag}\n`;
    }

    fs.writeFileSync(file, html);
    touched += 1;
    console.log(`[inject-islands] ${path.relative(DIST, file)} → ${loader}`);
  }
  console.log(`[inject-islands] obradjeno ${touched} HTML stranica.`);
}

main();