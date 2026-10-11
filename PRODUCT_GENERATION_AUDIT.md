# PRODUCT_GENERATION_AUDIT.md

Audit of the static-page generation pipeline's output quality. Scope: generators, Handlebars/HTML templates, and product/collection/category/blog data only. Generated HTML under `dist/` was inspected; no generated file was hand-edited.

- Build baseline: `npm run build:prod` (pipeline: validate-html → vite build → generate-products.cjs → generate-category-pages.cjs → render-blog-posts.cjs → render-blog-index.cjs → inject-islands.cjs → generate-sitemap.cjs → validate-dist.cjs)
- Verification run: fresh `npm run build:prod` passed exit 0 (`dist/` = 73 HTML files).
- Audit tooling: `/tmp/opencode/audit.cjs`, `/tmp/opencode/audit2.cjs` (link resolver, per-file broken-ref census, orphan detection, JSON-LD parse), manual review of outputs.

## 1. Dist census (73 HTML)

| Class | Count | Pages |
|---|---|---|
| Generated product pages | 13 | `casual/men|women/{essentials,hoodies,t-shirts,tracksuits}/*.html`, `casual/unisex/accessories/salica-za-kafU.html`, `elegance/men/{blazers/crna-sako,shirts/bela-kozulja}.html` |
| Generated collection/category pages | 25 | `casual/` (1 index + men/women/unisex + 13 category) + `elegance/` (1 index + men/women/unisex + blazers/shirts × men & unisex) |
| Legacy category pages | 5 | `dukseri.html`, `majice.html`, `trenerke.html`, `muska-garderoba.html`, `zenska-garderoba.html` |
| Blog posts | 5 | `blog/*.html` |
| SPA / static (Vite output) | 25 | index, blog-index, cart, checkout, profile, settings, wishlist, orders, admin-login, admin/index, collections/×8, locations/×6, size-guide/index |

Product pages report "13 stranica proizvoda" (matches: 5×men + 5×women + 1×unisex + 2×elegance). Sitemap = 57 `<loc>`, 0 resolve missing locally.

## 2. Broken-resource census (full-build audit)

Generated pages reference assets that do not exist in `dist/`. The effective `dist/css` contains only `critical.css`; `dist/js` contains only `admin/`; there is no `dist/config/`.

Top broken refs across all 73 pages (occurrences in links):

| Target | Ref count | Generated pages affected |
|---|---|---|
| `/css/style.css` (and relative `css/style.css`) | ~86 | all product, legacy, blog pages |
| `/js/app.js` / `/js/app.jsx` | ~50 | product + collection pages |
| `/js/i18n/i18n.js` / `/js/i18n.js` | ~56 | collection, product, blog pages |
| `/config/countries.js` | ~18 | product pages |
| `/js/components/CollectionFilters.js` | ~25 | collection pages |
| `/js/components/{ProductGallery,ProductVariantPicker,FAQAccordion,FAQSchemaInjector}.js` | per product page | product pages |
| `/js/components/Logo.js` | ~6 | blog pages |
| `/products.html` | ~32 | product + legacy pages ("Svi Proizvodi" nav) |
| `/proizvodi.html` | ~27 | collection pages ("Malo Slovo" note: legacy route, no redirect) |
| `/faq.html` `/shipping.html` `/returns.html` `/contact.html` | ~25 each | collection pages (footer) |
| `/complaints.html` `/advertising.html` | ~22 | legacy category pages (footer) |
| `/rss.xml` | ~6 | injected into `<head>` of every blog page |
| `/elegance/women/{blazers,shirts}/` | 2 | SPA home (`index.html`) – future placeholder routes |
| `/elegance/women/shirts` `/elegance/women/blazers` | 2 | collection category-nav residue |

Net: **627 broken (href|src) occurrences**. These pages render un-styled and with dead scripts in production.

## 3. Per-page-type findings

### 3.1 Product pages (`templates/product-template.html` + `scripts/generate-products.cjs`)
- All dead asset refs from §2 (style.css ×2 with `?v=20241215`, app.js, countries.js, i18n.js + component module imports) — page has no CSS, no currency/i18n config.
- Mangled `<meta>` emission: right after the JSON-LD `</script>` the literal text `erty="og:locale" content="sr_RS"` is printed (line 30 of template glues a `</script>`-terminated comment to a `<meta prop` fragment) → stray visible text in `<body>`-adjacent `<head>`.
- `og:image` points to `https://dalli.rs/images/og-{slug}.svg` — **10 of 10 files do not exist** (dist/images has only `og-default|products|cart|checkout|dukseri|musk|zensk|advertising|complaints.svg`).
- Review section always shows the empty-state ("Prve recenzije još uvek nisu objavljene") while `aggregateRating`/JSON-LD show real reviews for products 1 (osnovna-majica), 3 (carape), 5 (muska trenerka), 6 (zenski duks). Cause: `renderData.reviews = product.reviews || []` (products.json has no `reviews` field).
- `aggregateRating` = `0.0/0` emitted on the 7 products without approved reviews (LD violation, Section 4 of SEO audit).
- Card/breadcrumb URLs per hierarchy are otherwise correct (canonical matches the file). Exception: `salica-za-kafU.html` — data slug keeps a stray capital `U` (`/casual/unisex/accessories/salica-za-kafU.html`), inconsistent with the rest of the URL scheme.

### 3.2 Collection/category pages (`templates/collection-template.html`)
- Dead refs: `styles.css`, `app.jsx`, `CollectionFilters.js`, `i18n/i18n.js` (§2). `critical.css` exists and loads fine.
- Sidebar markup broken: `<h3 ...>Filteri</button>` (unclosed/self-closing tag mismatch, line 143) + one extra bare `</section>` (sidebar area) and one more stray `</section>` near the grid → unbalanced markup in every collection page.
- **Wrong-gender product URLs**: all category pages render cards via `{{getProductUrl this}}`, which resolves the *primary* hierarchy (always `men`). Verified:
  - `casual/women/t-shirts/` cards → `/casual/men/t-shirts/osnovna-majica.html`, `/casual/men/t-shirts/dugorukava-majica.html`
  - `casual/unisex/hoodies/` cards → `/casual/men/hoodies/muska-duks-hoodie.html`, `/casual/women/hoodies/zenska-duks-hoodie.html`
  Same wrong URL in the ItemList `@id`/`url` (JSON-LD).
- `og:image` = `https://dalli.rs/images/og/og-{collection}-{gender}.svg` — **27/27 collection pages point to non-existent files** (`dist/images/og/` holds only `og-home*`, `og-cart.svg`, `og-checkout.svg`).
- Footer links to `/contact.html`, `/faq.html`, `/shipping.html`, `/returns.html` — all 404 (SPA-only pages, not emitted to dist).
- **Orphan category pages (no inbound links, 6):** `casual/unisex/{hoodies,tracksuits,essentials,t-shirts}/`, `elegance/unisex/{blazers,shirts}/`. Root cause: the fallback generator block (generate-products.cjs ~line 729) renders unisex category pages **without** the `categories` context → the category-nav block renders nothing, so nothing links to them (they only self-reference). Additionally three of them (`unisex/t-shirts`, `elegance/unisex/blazers|shirts`) are generated with **0 products** (empty pages).
- `elegance/women/index.html` is generated as an empty placeholder (0 products, empty category-nav) — intended for future catalog growth; keep.

### 3.3 Legacy category pages (`templates/category-seo-template.html` + `scripts/generate-category-pages.cjs`)
- `muska-garderoba.html`: **6 rendered cards / 6 ItemList items vs 7 declared products** (`productCount` + stat counters say 7; cards are `slice(0, 6)`). `zenska`, `dukseri`, `trenerke`, `majice` are consistent (cards == numberOfItems).
- ItemList/card URLs use `proizvod-{slug}.html`; all 8 product slugs are covered by 301 rules in `dist/_redirects` (verified: redirect targets resolve). OK by design.
- `availability` hardcoded `http://schema.org/InStock` in both pricing schema and card `<meta itemprop="availability">` regardless of real stock.
- Footer links `/complaints.html`, `/advertising.html` 404.
- Cards target `/admin-login.html`, `/products.html`, legacy `/dukseri.html` nav (404) — product nav is the archive legacy route.

### 3.4 Blog posts (`blog-post.html` template (root) + `scripts/render-blog-posts.cjs`)
- **Leftover client-side renderer wipes SSR content**: the template still contains the old React-era script that does `fetch('data/blog.json')` (relative → `/blog/data/blog.json` → 404) and replaces `.main` innerHTML with an error/empty path. Present in all 5 posts.
- Unresolved template literals leak into output: `${relFeaturedImage}`, `${featuredImage}` appear inside `<img src>` of that leftover script (raw `${...}` text in every post).
- Featured images + og:image reference `/images/blog/{business|digital|trainerke|majica|sustainability}.jpg`; **none of these files exist** in `dist/images/blog`.
- JSON-LD `datePublished`/`dateModified` use the human string `{{date}}` (e.g. `"15. 1. 2024"`) — non-ISO, non-parseable.
- `<head>` additionally injected `<link rel="alternate" ... /rss.xml />` without `/rss.xml` existing (see §2).
- Featured `<img>` has a correct descriptive `alt` (good); the missing-alt occurence per post is inside the leftover script (removed with it).

## 4. Severity summary
- P0: dead assets on generated pages; wrong-gender product URLs on women/unisex pages; reviews SSR empty vs JSON-LD contradiction; blog client renderer destroying SSR; missing og:image for all products/collections.
- P1: mangled og:locale text; aggregateRating 0/0; orphan (unlinkable) unisex category pages; legacy card-count mismatch.
- P2: legacy hardcoded InStock; sitemap includes 301'd legacy URLs; collection footer 404s; empty unisex category pages.
- P3: non-ISO blog dates, rss.xml ref without file, salica slug casing, `elegance/women/*` & `/style/*` placeholder links in SPA home.

Full root-cause table, per-defect anchors and the prioritized remediation order are in `GENERATOR_DEFECT_REPORT.md` and `FIX_IMPLEMENTATION_PLAN.md`.