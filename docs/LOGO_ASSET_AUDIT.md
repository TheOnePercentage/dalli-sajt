# DALLI Logo Asset Audit

## Source Files

| File | Format | Dimensions | Size | Aspect Ratio | Purpose |
|------|--------|------------|------|--------------|---------|
| `images/logo1.jpg` | JPEG | 763 × 628 px | 27 KB | 1.21:1 | Master Logo (primary) |
| `images/logo2.jpg` | JPEG | 1020 × 1280 px | 25 KB | 0.80:1 | Dark Luxury Variant |
| `images/logo3.jpg` | JPEG | 1280 × 329 px | 9 KB | 3.89:1 | Horizontal Wordmark |
| `images/logo.svg` | SVG | 400 × 300 (viewBox) | — | 1.33:1 | Placeholder only |

## Logo Hierarchy Specification

### logo1.jpg — MASTER DALLI LOGO
**Use globally:**
- Header (desktop: 56px height, mobile: 44px height)
- Footer
- Cart / Checkout
- Account pages
- CMS / Admin
- General brand identity
- Favicon source (generate from this)

**Constraints:**
- Never stretch beyond natural aspect ratio
- Maintain 56px/44px height in header
- Use on light/neutral backgrounds only

---

### logo2.jpg — DARK LUXURY VARIANT
**Use only on:**
- Dark backgrounds (#1a1a1a, #0a0a0a, deep navy)
- Dark hero sections
- Elegance collection campaigns
- Premium editorial sections
- Footer on dark theme

**Never use on:**
- Light backgrounds
- White/cream surfaces
- Casual collection pages (unless dark theme)

**Constraints:**
- Higher contrast version for dark surfaces
- Same proportions as master but optimized for dark

---

### logo3.jpg — HORIZONTAL WORDMARK
**Use as:**
- Homepage hero luxury statement (large, centered)
- Collection identity headers (Casual / Elegance landing)
- Elegance presentation sections
- Editorial spreads
- `/about/` page brand divider

**Do NOT use as:**
- Primary header logo (use logo1)
- Footer logo (use logo1)
- Favicon / app icon
- Small contexts (< 200px width)

**Constraints:**
- Minimum display width: 280px
- Maximum display width: 800px
- Always horizontal, never stacked
- Generous breathing room (min 2x height padding)

---

## Current Usage Analysis

### Header (index.html, blog-index.html, etc.)
- **Current:** Inline SVG with gradient circle + "DALLI" text
- **Required:** Replace with `logo1.jpg` at 56px/44px height
- **CSS:** `--nav-logo-size: 56px` desktop, `44px` mobile

### Footer
- **Current:** Same inline SVG
- **Required:** `logo1.jpg` at smaller size (~32px)

### Admin/Login
- **Current:** `logo1.jpg` directly
- **Status:** Correct file, but wrong sizing/context

### Schema.org / JSON-LD
- **Current:** References `https://cdn.dalli.rs/images/logo.svg`
- **Required:** Update to `logo1.jpg` as master brand logo

---

## Required Transformations

### 1. Generate Optimized Variants
From each source, create:
| Variant | Format | Width | Use Case |
|---------|--------|-------|----------|
| `logo1-master@1x.webp` | WebP | 112px | Header desktop (56px @ 2x) |
| `logo1-master@2x.webp` | WebP | 224px | Header desktop retina |
| `logo1-master-mobile@1x.webp` | WebP | 88px | Header mobile (44px @ 2x) |
| `logo1-master-mobile@2x.webp` | WebP | 176px | Header mobile retina |
| `logo1-footer.webp` | WebP | 64px | Footer (32px @ 2x) |
| `logo2-dark@1x.webp` | WebP | 200px | Dark hero sections |
| `logo2-dark@2x.webp` | WebP | 400px | Dark hero retina |
| `logo3-wordmark@1x.webp` | WebP | 800px | Hero max width |
| `logo3-wordmark@2x.webp` | WebP | 1600px | Hero retina |
| `logo3-wordmark-tablet.webp` | WebP | 560px | Tablet hero |
| `favicon.ico` | ICO | 32×32 | Browser tab |
| `favicon-192.png` | PNG | 192×192 | PWA manifest |
| `favicon-512.png` | PNG | 512×512 | PWA manifest |
| `apple-touch-icon.png` | PNG | 180×180 | iOS home screen |

### 2. SVG Master (if vector source available)
- Recreate `logo1` as clean SVG for infinite scalability
- Use for: print, large format, future-proofing

---

## Implementation Checklist

### Phase 0.1 — Asset Preparation
- [ ] Verify source file quality (no compression artifacts)
- [ ] Generate all WebP variants (sharp, 85% quality)
- [ ] Generate favicon set from `logo1`
- [ ] Create SVG version of `logo1` if vector source exists
- [ ] Store in `public/images/logos/` with clear naming

### Phase 0.2 — Logo Component System
- [ ] Create `Logo` React/Vanilla component with variant/size props
- [ ] Auto-select variant by background (light/dark detection)
- [ ] Responsive sizing via CSS custom properties
- [ ] Tree-shakable ES module export

### Phase 0.3 — Integration
- [ ] Replace all header logos with `Logo` component (variant="master")
- [ ] Replace footer logos with `Logo` component (variant="master", size="sm")
- [ ] Update homepage hero to use `Logo` component (variant="wordmark", size="xl")
- [ ] Update elegance sections to use `Logo` component (variant="dark")
- [ ] Update Schema.org JSON-LD to reference `logo1` WebP
- [ ] Update PWA manifest icons

---

## File Naming Convention
```
public/images/logos/
├── logo1-master.svg              # Vector master (if available)
├── logo1-master@1x.webp          # 112w
├── logo1-master@2x.webp          # 224w
├── logo1-mobile@1x.webp          # 88w
├── logo1-mobile@2x.webp          # 176w
├── logo1-footer.webp             # 64w
├── logo2-dark@1x.webp            # 200w
├── logo2-dark@2x.webp            # 400w
├── logo3-wordmark@1x.webp        # 800w
├── logo3-wordmark@2x.webp        # 1600w
├── logo3-wordmark-tablet.webp    # 560w
├── favicon.ico
├── favicon-192.png
├── favicon-512.png
└── apple-touch-icon.png
```

---

## CSS Custom Properties
```css
:root {
  --logo-header-height: 56px;
  --logo-header-height-mobile: 44px;
  --logo-footer-height: 32px;
  --logo-hero-min-width: 280px;
  --logo-hero-max-width: 800px;
}
```

---

## Notes
- `logo3.jpg` is very wide (3.89:1) — ensure container allows horizontal overflow or use `object-fit: contain`
- `logo2.jpg` is taller than wide (0.80:1) — verify it's actually a dark variant, not just a different crop
- All JPEGs are progressive — good for web delivery
- Consider converting `logo1` to SVG for true resolution independence