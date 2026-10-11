# SEO_GENERATION_AUDIT.md

SEO/schema audit of all generated output (`dist/`, 73 HTML from a fresh `npm run build:prod`, sitemap = 57 `<loc>`). Scope: sitemap, canonicals, OpenGraph/Twitter, robots/meta, JSON-LD, redirects, alt text.

Legend: ✅ OK · ⚠️ Defect · 🚫 Critical

## 1. Sitemap (`dist/sitemap.xml`)
- ✅ **57 URLs, 0 resolve to missing files** (verified by file-existence resolution for every `<loc>`).
- ✅ All 13 product pages, all 25 real collection/category pages, home, `blog-index.html`, 5 blog posts present.
- ⚠️ **Sitemap contains 5 URLs that are 301-redirected** (`/dukseri.html`, `/majice.html`, `/trenerke.html`, `/muska-garderoba.html`, `/zenska-garderoba.html`) — legacy pages in the sitemap while they permanently redirect to canonical new pages. Duplicate/conflicting crawl signals.
- ⚠️ **13 sitemap URLs have no physical file** (documented future placeholders, OK over time): `/elegance/men|women/{suits,coats,trousers}/`, `/elegance/women/{dresses,blazers,shirts}/`, `/style/{business,formal,smart-casual,luxury-essentials,special-occasion}/`. These URLs currently produce 404 on the site despite being in the sitemap.
- 🚫 Generator noise: `scripts/generate-products.cjs` writes its own internal 49-URL sitemap (`Generisan: sitemap.xml (49 URL-ova)`), immediately overwritten by the pipeline's `generate-sitemap.cjs` (57 URLs). Dead code + confusing logs; two sitemap writers.

## 2. Canonical / Hreflang
- ✅ Product pages: per-hierarchy canonical `https://dalli.rs/{collection}/{gender}/{category}/{slug}.html` — matches the file. Breadcrumbs match the page hierarchy.
- ✅ Collection pages: absolute canonical `https://dalli.rs/{collection}/{gender}/{category}/` — matches.
- ✅ Legacy pages: canonical pins their own legacy URL (intentional; the 301 preserves the URL).
- ✅ Blog posts: canonical corrected to `https://dalli.rs/blog/{slug}.html` by `render-blog-posts.cjs` (post-template default lacked `.html`).
- ⚠️ `blog-index.html` canonical is `https://dalli.rs/blog` (Vite input canonical) while the file lives at `/blog-index.html` and nothing serves `/blog` — root-relative canonical mismatch on the only blog landing page.
- 🚫 No `hreflang`/`x-default` anywhere (sr_RS-only site; the `<meta og:locale:alternate>` list exists but hreflang links are absent — minor, whole-site).
- ✅ Only the 3 SPA files (`profile.html`, `admin/index.html`, `admin-login.html`) lack a canonical — out of SEO scope.

## 3. OpenGraph / Twitter cards
- 🚫 **Product pages: 10/10 `og:image` point to non-existent files** (`/images/og-{slug}.svg`); social previews 404. Only product-page OG images referenced by products.json's `images.ogImage`.
- 🚫 **Collection pages: 27/27 `og:image` → `/images/og/og-{collection}-{gender}.svg` → file missing** (`dist/images/og/` only has og-home*, og-cart.svg, og-checkout.svg).
- 🚫 **Blog posts: `og:image` = `/images/blog/{topic}.jpg` → missing**; also no `og:type`, no absolute og:title/og:description for posts.
- ⚠️ Product pages emit literal garbage after `</script>`: `erty="og:locale" content="sr_RS"` (template line-30 fragment). Also `og:locale` duplicated (broken + proper).
- ⚠️ Collection `og:image` URL template is conditional on `collection`/`gender` and breaks to `og--.svg` on index pages (`/casual/`, `/elegance/`).
- ✅ `og:image:width/height/type` correctly declared everywhere; twitter:cards present.
- ✅ `og:url`/canonical consistent per page except blog-index (`/blog` mismatch).

## 4. JSON-LD / Structured data
### Product pages
- ✅ `Product` + `BreadcrumbList` + `Offer` block: SKU, brand DALLI, price `RSD`, currency, `ItemAvailability` — verified consistent between LD and visible price markup.
- ⚠️ **`aggregateRating` emitted as `0.0/0` on products without approved reviews** (products: carape men/women, dugorukava men/women, muska trenerka, salica): a rating markup with `reviewCount: 0` violates `schema:aggregateRating` guidance (must be ≥1 review). Omit when no approved reviews.
- ⚠️ **`review` array populated in LD while the rendered review list is empty** (products 1/3/5/6): contradictory UI. SSR list reads `product.reviews` (always `[]`); LD reads `reviewSystem` (real reviews). Same data source is used twice, differently.
- ✅ Product `@id`, `url`, `image` point correctly per hierarchy.

### Collection pages
- ⚠️ **`ItemList` `@id`/`url`/`Offer.url` use the primary (men) product URL on women/unisex pages** — LD advertises `/casual/men/...` inside `/casual/women/...` and `/casual/unisex/...` pages. Verified in `casual/women/t-shirts/` and `casual/unisex/hoodies/`.
- ⚠️ `availability` hardcoded `InStock` in collection `ItemList` (uses buildCollectionSchema; stock never consulted).
- ✅ `CollectionPage` + `BreadcrumbList` names/paths correct; aggregateRating only added when approved reviews exist on the page's products (correct behavior).
- ⚠️ Empty unisex category pages (`casual/unisex/t-shirts/`, `elegance/unisex/{blazers,shirts}/`) carry `CollectionPage`/`ItemList` markup with 0 items — skip them.

### Legacy pages
- ⚠️ `availability` hardcoded `InStock` (both `ItemList` products and card `<meta itemprop="availability">`).
- ⚠️ `muska-garderoba.html` declares 7 products (`numberOfItems` 7, stat counters "7 proizvoda") but renders only 6 ItemList items/cards (`slice(0,6)`).

### Blog
- ⚠️ **`datePublished`/`dateModified` non-ISO** (`"15. 1. 2024"`): not machine-parseable; `dateModified` also equal to publish date.
- ⚠️ Blog `WebPage`/`BlogPosting` schema: no `headline` subtitle, `image` uses the missing featured file, `publisher` lacks logo, no `mainEntityOfPage`, no `author` Organization/Person object (only name string) — partial schemas.
- ✅ `Blog` + `CollectionPage` (blog-index) + `WebSite` + `BreadcrumbList` present on blog-index.html; post cards link to the correct per-post URLs.

## 5. Redirects / links
- ✅ `_redirects`: all 13 legacy redirect targets (8 `proizvod-*` + 5 category) resolve to existing pages; 301 for each legacy product/category; legacy canonical preserved.
- ⚠️ Legacy pages also appear in sitemap (§1) and internal nav — mixed signals with the 301 plan.
- ⚠️ 13 `/elegance/*` + `/style/*` placeholder rules point at non-existent pages (documented future; they 301 to themselves = loop until pages ship).
- 🚫 627 broken (href|src) references across generated pages (see PRODUCT_GENERATION_AUDIT §2): unstyled pages, dead scripts, dead og images. This is the dominant SEO-quality factor (CLS/brand signals, 404s).
- 🚫 Blog posts' surviving client script fetches `/blog/data/blog.json` (404) and overwrites SSR content with an error/empty state — content invisible to users after JS.
- ✅ Product cards' `href` correctness aside from gender issue; breadcrumbs, footer, site nav all match SPA routing where dist provides those pages.

## 6. Accessibility / micro-markup
- ✅ Featured blog `<img>` has descriptive alt (post title); missing-alt occurrences in generated SEO pages = 0 outside the leftover script. (The 5 "IMG_NO_ALT" hits are the `${relFeaturedImage}` template-literal `<img>` inside the leftover script.)
- ⚠️ Collection sidebar `Filteri</button>` + stray `</section>` (4 bare `</section>` vs 2 expected) → invalid markup on every collection page.
- ⚠️ `og:image:alt` present on collection pages only.

## 7. SEO priorities (see FIX_IMPLEMENTATION_PLAN.md for owners/lines)
1. Fix dead assets (styling, JS init) on product/collection/legacy/blog pages.
2. Fix wrong-gender URLs in cards + ItemList. 3. Fix reviews SSR vs LD. 4. Kill leftover blog renderer. 5. og:image fallbacks + real files. 6. sitemap hygiene (drop 301'd legacy; single writer). 7. blog schemas/dates. 8. collection markup validity.