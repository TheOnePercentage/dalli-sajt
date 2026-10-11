# HOMEPAGE ARCHITECTURE REDESIGN - PHASE 2
## Implementation Report

### CURRENT STATE ANALYSIS

**Current index.html**: 6,537 lines with:
- Video hero background (LCP candidate) - **VIOLATES: "No video hero"**
- Canvas ambient animation - **VIOLATES: "No WebGL"**
- 50+ preload hints (many unnecessary)
- 20+ JS modules loaded (many admin-only)
- Complex multi-layer parallax effects
- Heavy inline CSS (3,000+ lines)
- Multiple carousels/sliders - **VIOLATES: "No carousel, no slider"**

**Performance Issues**:
- LCP likely > 2.5s (video hero)
- CLS risk from dynamic content injection
- INP risk from heavy JS
- 300KB+ critical CSS

**SEO Issues**:
- Multiple H1 candidates
- Duplicate structured data
- Over-optimized meta keywords

---

### TARGET ARCHITECTURE (14 Sections)

| Section | Name | Priority | Key Requirements |
|---------|------|----------|------------------|
| 1 | Announcement Bar | High | Free shipping, returns, service |
| 2 | Luxury Header | High | Minimal nav, search, account, wishlist, cart |
| 3 | Hero Section | **Critical** | ONE luxury image, NO carousel, H1 SEO-optimized |
| 4 | Featured Categories | High | 5 editorial cards (4:5 aspect) |
| 5 | Best Sellers | High | Top products grid |
| 6 | New Arrivals | High | Latest products grid |
| 7 | Brand Story | Medium | Quality, materials, longevity focus |
| 8 | Shop The Look | Medium | Curated combinations (3:4 aspect) |
| 9 | Trust Section | Medium | Secure payment, delivery, returns, satisfaction |
| 10 | Customer Reviews | Medium | Real reviews |
| 11 | SEO Content Block | **Critical** | 600-1000 words, target keywords |
| 12 | FAQ | Medium | SEO-optimized, Schema.org |
| 13 | Newsletter | Medium | Premium styled |
| 14 | Luxury Footer | High | Complete site map |

---

### PERFORMANCE TARGETS

| Metric | Target | Strategy |
|--------|--------|----------|
| LCP | ≤ 1.5s | Static hero image (AVIF/WebP), preload, no JS |
| INP | ≤ 100ms | Minimal JS, passive listeners, no heavy libraries |
| CLS | ≤ 0.03 | Fixed aspect ratio containers, no layout shifts |

---

### VISUAL PLACEHOLDER SYSTEM

All images use fixed aspect ratio containers to prevent CLS:

| Component | Aspect Ratio | Container Class |
|-----------|-------------|-----------------|
| Hero | 16:9 | `.hero-media` |
| Category Cards | 4:5 | `.category-card__media` |
| Product Cards | 4:5 | `.product-card__media` |
| Shop The Look | 3:4 | `.look-card__media` |

**Placeholder Image Sources** (luxury aesthetic):
- Unsplash curated luxury fashion collections
- Pexels premium editorial imagery
- All images: neutral palette, high-end feel, no fast-fashion look

---

### TECHNICAL STACK DECISIONS

**CSS Approach**:
- Remove all inline critical CSS from HTML
- Use single `styles.css` loaded async with print media hack
- CSS Cascade Layers for organization
- OKLCH color system (already in place)
- Fluid typography & spacing (already in place)

**JS Approach**:
- Single `app.js` (vanilla, ~500 lines max)
- No frameworks, no heavy libraries
- IntersectionObserver for scroll reveal only
- Event delegation for interactions
- localStorage for cart/wishlist/recently-viewed

**Images**:
- `<picture>` with AVIF/WebP/JPG fallbacks
- `sizes` attribute for responsive loading
- `loading="lazy"` below fold
- `fetchpriority="high"` for hero
- LQIP via inline base64 blur (1x1px)

---

### SEO STRATEGY

**Single H1**: `Premium Muška i Ženska Garderoba` (Hero section)

**Internal Links** (visible, crawlable):
- `/muska-garderoba.html`
- `/zenska-garderoba.html`
- `/duksevi.html`
- `/trenerke.html`
- `/majice.html`

**Target Keywords** (natural integration):
- muška garderoba
- ženska garderoba
- duksevi
- trenerke
- majice
- online kupovina garderobe
- garderoba Srbija

**Schema.org**:
- Organization (homepage)
- BreadcrumbList
- FAQPage
- Product (for featured products)
- ItemList (for category grids)

---

### STEP-BY-STEP IMPLEMENTATION PLAN

#### Step 1: Create New HTML Structure (Clean Slate)
- New `index.html` with 14 semantic sections
- Remove all video/canvas/parallax
- Single hero image with proper preload
- Semantic HTML5 throughout

#### Step 2: Luxury CSS Framework
- Minimal critical CSS inlined (< 12KB gzipped)
- Full styles.css async loaded
- OKLCH tokens, fluid type, spacing
- Component styles: header, hero, cards, grids
- Reduced motion support

#### Step 3: Placeholder Image System
- Curate luxury placeholder images
- Set up aspect ratio containers
- Configure responsive images with `sizes`
- LQIP placeholders

#### Step 4: Vanilla JS Module
- Header scroll behavior
- Mobile menu drawer
- Cart/wishlist localStorage
- IntersectionObserver reveal
- Tab switching (featured products)
- FAQ accordion
- Newsletter form

#### Step 5: SEO Content & Schema
- 800-word SEO content block
- FAQ with Schema.org FAQPage
- Product structured data
- Internal linking structure

#### Step 6: Performance Verification
- Lighthouse CI audit
- WebPageTest validation
- Core Web Vitals measurement
- Fix any regressions

---

### FILES TO CREATE/MODIFY

| File | Action |
|------|--------|
| `index.html` | **REWRITE** - New 14-section structure |
| `css/styles.css` | **REWRITE** - Clean luxury styles |
| `css/critical.css` | **NEW** - Minimal above-fold CSS |
| `js/app.js` | **REWRITE** - Lightweight vanilla module |
| `data/homepage.json` | **NEW** - Content configuration |
| `images/placeholders/` | **NEW** - Luxury placeholder images |

---

### SUCCESS CRITERIA

✅ LCP ≤ 1.5s (hero image loads fast)
✅ INP ≤ 100ms (minimal JS, no blocking)
✅ CLS ≤ 0.03 (fixed aspect ratios, no shifts)
✅ Single H1, proper heading hierarchy
✅ 5 visible category links
✅ 800+ word SEO content
✅ Schema.org on all relevant sections
✅ Luxury aesthetic (Hermès/Loro Piana level)
✅ No video, no canvas, no carousels
✅ Mobile-first, accessible, reduced motion