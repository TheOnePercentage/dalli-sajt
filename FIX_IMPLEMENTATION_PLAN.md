# FIX_IMPLEMENTATION_PLAN.md

Prioritized remediation plan for all defects in `PRODUCT_GENERATION_AUDIT.md`, `SEO_GENERATION_AUDIT.md`, and `GENERATOR_DEFECT_REPORT.md`. Every fix touches generators, templates, or `data/*.json` — never `dist/`.

## Prioritized table (P0 → P3)

| Pr | Defect IDs | Fix summary | Where (file:line) |
|---|---|---|---|
| **P0** | 1, 2 | **Assets on generated pages.** Emit a page-critical CSS inline + drop the dead refs. Product pages: inline `critical.css` (exists in dist) and remove `/css/style.css`, `/js/app.js`, `/js/i18n.js`, `/config/countries.js`, component imports (or ship real files under those paths if restoration is cheaper). Collection pages: keep `/css/critical.css` (exists), remove `/css/styles.css`, `/js/app.jsx`, `/js/components/CollectionFilters.js`, `/js/i18n/i18n.js`; keep minimal inline filter/search handler. Acceptance: `grep -l css/style.css dist/*.html` = 0; audit broken-ref count for /css,/config drops to 0 | `templates/product-template.html:77-92`, `templates/collection-template.html:39-48,345-346` |
| **P0** | 3 | **Gendered product URLs.** Make all card links + ItemList `@id`/`url` page-contextual. Replace `getProductUrl` helper usage in `collection-template.html:255` with a precomputed per-page URL: at each render call site map `products` → `{...p, pageUrl: getProductUrlForHierarchy(p, {collection, gender, category})}`; for `collection`/`gender` index pages fall back to primary. Use the same URL in `buildCollectionSchema` (`:542,:551-552`) via the already-passed `(collection, gender, category)` args. New helper `getProductUrlForPage(product, ctx)` = `ctx.gender && ctx.category ? getProductUrlForHierarchy(product, ctx) : getProductUrl(product)` | `scripts/generate-products.cjs:76-91,542,551-552`; `templates/collection-template.html:255` |
| **P0** | 4 | **Reviews SSR.** `reviews: reviewSystem.getProductReviews(product.id, { verifiedOnly:false })` (same call already at `:205`,`:574`). Keep statuses (`approved|pending|rejected`) so the template's three review-item blocks render; page then matches aggregateRating/LD | `scripts/generate-products.cjs:441` |
| **P0** | 15 | **Blog leftover renderer.** Delete the client renderer block in `blog-post.html` (fetch + template-literal img injection). SSR already renders post + related. Fix the `${featuredImage}`/`${relFeaturedImage}` leaks with it. Acceptance: no `fetch('data/blog.json')` in dist/blog/*.html, no `\${` occurrences | `blog-post.html:233-305` |
| **P0** | 7, 8, 9 | **og:image 404s.** Fallback behavior + real assets: (a) product template `og:image` → if `images.ogImage` file missing use `https://dalli.rs/images/og-default.svg` (exists); (b) collection `og:image` → fallback to existing `og-default.svg` when `dist/images/og/og-{collection}-{gender}.svg` absent; (c) blog → ship `dist/images/blog/*.jpg` and `placeholder-blog.svg` OR fallback to `og-default.svg`. Ensure flagship first where SVGs are cheap to add. Acceptance: every generated page's og:image resolves (audit exists()) | `templates/product-template.html:20`, `templates/collection-template.html:17`, `scripts/render-blog-posts.cjs:77,91`, `data/blog.json`, asset pipeline |
| **P0** | 5 | **aggregateRating 0/0.** Skip `aggregateRating` (and `review` array) in `buildProductJsonLd` when `reviewCount===0`. Acceptance: no `"ratingValue":"0.0","reviewCount":0` in dist | `scripts/generate-products.cjs` (buildProductJsonLd) |
| **P1** | 6 | **og:locale garbage.** Clean the mangled line: remove `></script>` glue and `erty=` fragment; emit a single proper `<meta property="og:locale" content="sr_RS">`. Acceptance: `grep -c 'og:locale'` = 1 per product page; no `erty="og:locale"` | `templates/product-template.html:30,39` |
| **P1** | 11 | **Orphan/empty unisex pages.** Pass `categories` to the fallback category render (`:729-740`) so their category-nav renders; stop generating 0-product pages (skip when `categoryProducts` empty unless documented placeholder). Optionally cross-link unisex category pages from `casual/unisex/index.html`. Acceptance: unisex/elegance-unisex pages have ≥1 inbound link; no empty CollectionPage in dist | `scripts/generate-products.cjs:700-746` |
| **P1** | 21 | **Sitemap hygiene.** Remove the 5 legacy URLs from `generate-sitemap.cjs` (they're 301'd). Keep the 13 future placeholders documented or drop and re-add when pages ship. Single sitemap writer: delete internal `generateSitemap` in `generate-products.cjs` (or guard `if (require.main===module)` to not write sitemap; pipeline step 7 owns it). Acceptance: sitemap = file-truth not redirect targets | `scripts/generate-sitemap.cjs`; `scripts/generate-products.cjs:769-847` |
| **P1** | 19, 16 | **Blog assets + dates.** Ship `/images/blog/*.jpg` (or switch featuredImage to existing assets); use `{{dateISO}}` for `datePublished`/`dateModified` (leave display date as `{{date}}` for visible text). Acceptance: og/blog img resolve; LD dates ISO | `blog-post.html:54-55`, `scripts/render-blog-posts.cjs:88-89` |
| **P2** | 12 | **Legacy count mismatch.** Render all `catProducts` (drop `slice(0,6)`) or align `numberOfItems`/stats to 6 if pagination intended. Recommendation: show all (5–7 items is fine). Acceptance: `cards === numberOfItems` on all 5 legacy pages | `scripts/generate-category-pages.cjs:94,116,214` |
| **P2** | 13, 14 | **Availability hardcodes.** Read `stockStatus`/`inventory` from products.json (projected: produce `OutOfStock` when stock 0). Legacy: compute from data; collection: compute in `buildCollectionSchema` | `scripts/generate-category-pages.cjs:106,131`; `scripts/generate-products.cjs:555` |
| **P2** | 10 | **Collection markup validity.** Fix `Filteri</button>`→`</h3>` and remove the two stray `</section>`. Acceptance: `xmllint --html`/validate-html passes on a collection page; `</section>` count correct | `templates/collection-template.html:143,287-288` |
| **P2** | 23, 24, 25 | **Dead nav/footer links.** Point to real destinations: SPA routes are reachable via hash/`/` fallbacks — either add dist files (contact/faq/shipping/returns/complaints/advertising as generated static pages) or link to their SPA equivalents. "Svi Proizvodi" → `https://dalli.rs/casual/` or `/#products`. Avoid emitting links that 404 | `templates/collection-template.html:329-332`, `templates/product-template.html:121`, `templates/category-seo-template.html` nav/footer |
| **P3** | 17 | **RSS link vs file.** Generate `/rss.xml` from `data/blog.json` (cheap) or drop the `<link rel="alternate">` injection | `scripts/render-blog-posts.cjs:105`, `scripts/render-blog-index.cjs:76` |
| **P3** | 18 | **blog-index canonical** → `https://dalli.rs/blog-index.html` (consistent with the file and internal links) | `blog-index.html` (root) |
| **P3** | 22 | **Slug casing.** Fix `slug` to `salica-za-kafu` in `data/products.json`; update pool of legacy redirects (add `salica-za-kafU` → new slug 301) to avoid breaking any shared links | `data/products.json`, `dist/_redirects` source |
| **P3** | 26, 27 | **Future placeholders.** Keep `elegance/women/index.html` and the `/style/*` + future elegance sitemap/redirect entries documented; remove from sitemap until pages ship (avoids crawler 404s) | sitemap/redirect source config |

## Recommended implementation order
1. **P0-3 (URLs)** and **P0-4 (reviews)** — both in `generate-products.cjs`; regenerate and verify product + collection pages (product page output is already hierarchy-correct; this fixes women/unisex cards/schema).
2. **P0-1/P0-2 (assets)** and **P1-6 (og:locale)** — template edits; simplest high-impact.
3. **P0-15 (blog renderer)** + **P1-16/19 (dates/images)** + **P3-17/18** — blog templates + renderer.
4. **P0-5 (aggregateRating)** in buildProductJsonLd.
5. **P0-7/8/9 (og:image)** — fallback + asset batch.
6. **P1-11 (unisex orphans)** + **P1-21 (sitemap)**.
7. **P2 cluster** (12,13,14,10,23,24,25) and P3 leftovers.

## Verification (run after each step, on a fresh `npm run build:prod`)
```bash
npm run build:prod
# broken refs -> 0 for /css,/config,/js/components,/products.html,/contact.html,...
node /tmp/opencode/audit2.cjs        # gender URL check (a), cards==label (b reduced), orphans (c -> 0)
node /tmp/opencode/audit.cjs         # full broken-link census -> 627 must drop (target >=-95%)
# targeted greps:
grep -rl "fetch('data/blog.json')\|\${" dist/blog                       # must be empty
grep -c 'og:locale' dist/casual/men/t-shirts/osnovna-majica.html        # == 1
grep -rl 'erty="og:locale"' dist                                       # must be empty
grep -rl 'ratingValue.*0\.0' dist --include='*.html'                   # must be empty
grep -rlo '/css/style.css\|/js/app.jsx\|/js/i18n\|/config/countries' dist --include='*.html' # must be empty
# og images: every property="og:image" content resolves on filesystem (audit extension)
# sitemap: node -e '...' count legacy entries == 0; single source of truth
```
`validate-dist.cjs` and `inject-islands.cjs` already pass in the pipeline; keep both green (islands injection recomputes the loader chunk on rebuild).

## Success criteria (original phase brief)
- ✓ Every generated page is self-consistent: cards/reviews/aggregateRating/schema agree on gender, stock, reviews.
- ✓ Zero broken asset/config/component references on generated pages.
- ✓ og:image/canonical/JSON-LD valid and resolvable; sitemap contains only live, non-redirected canonicals.
- ✓ No generated page is orphaned from navigation, empty-yet-indexable, or carrying dead JavaScript.
- ✓ All 4 audit files stay in sync so future regeneration re-runs green.