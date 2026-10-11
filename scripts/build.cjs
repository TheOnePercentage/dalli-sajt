// build.cjs
// DALLI build orchestrator — SPA + generated SEO pages + validation.
// Order matters: vite empties dist/ on build, so generators MUST run AFTER vite.

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { cwd: opts.cwd || ROOT, stdio: 'inherit', env: { ...process.env, ...opts.env } });
}

console.log('=== DALLI Build Process (FE/BE pipeline) ===\n');

// 1. Validate source HTML (pre-build)
run('node scripts/validate-html.cjs');

// 2. Build SPA (vite empties dist/, proizvodi public/ u dist/)
run('npx vite build --mode production');

// 3. Generate SEO product/collection pages directly into dist/
run('node scripts/generate-products.cjs', { env: { GENERATE_OUTPUT_DIR: DIST } });

// 4. Generate legacy category landing pages into dist/
run('node scripts/generate-category-pages.cjs', { env: { GENERATE_OUTPUT_DIR: DIST } });

// 5. Render blog index + blog posts into dist/
run('node scripts/render-blog-posts.cjs');
run('node scripts/render-blog-index.cjs');

// 6. Post-build: inject islands loader chunk u generisane SSG stranice
run('node scripts/inject-islands.cjs', { env: { GENERATE_OUTPUT_DIR: DIST } });

// 7. Generate sitemap.xml into dist/
run('node scripts/generate-sitemap.cjs', { env: { GENERATE_OUTPUT_DIR: DIST } });

// 8. Generate RSS feed into dist/
run('node scripts/generate-rss.cjs', { env: { GENERATE_OUTPUT_DIR: DIST } });

// 9. Final validation of the deployable dist/
run('node scripts/validate-dist.cjs');

console.log('\n=== Build završen. dist/ spreman za Netlify deploy. ===');