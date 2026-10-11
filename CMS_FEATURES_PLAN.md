# CMS Features Implementation Plan - DALLI E-commerce

> **Status**: PLAN ONLY - Do not implement yet. Awaiting approval per step.

---

## Overview
Netlify CMS custom widgets & enhancements for professional product management with zero quality loss.

---

## STEP 1: Professional Image Upload System

### 1.1 Main Image Upload (Required)
- **Drag & drop zone** + click to select
- **Accept**: JPEG, PNG, WebP, AVIF, HEIC (converts to JPEG on upload)
- **Max file size**: 50MB (warning only at >15MB, no block)
- **No resize/compress on upload** — store original
- **EXIF preservation**: orientation, color profile, copyright metadata
- **Preview**: thumbnail (200px) + "View original" link (opens full-res in new tab)
- **Focal point picker** (optional): click on preview to set crop center for thumbnails
- **Output**: `{ src: "/images/original-filename.jpg", alt: "", focalPoint: {x: 0.5, y: 0.5} }`

### 1.2 Gallery Upload (Optional, Max 8)
- **Multi-file drag & drop** (select multiple at once)
- **Reorder**: drag & drop thumbnails to change order
- **Per-image alt text** (inline editable under each thumbnail)
- **Per-image focal point** (optional)
- **Delete**: hover → trash icon
- **First image** = hover swap on product cards
- **Output**: `[{ src, alt, focalPoint, order }]`

### 1.3 Recommended Resolution (Advisory Only)
| Use Case | Recommended | User Can Override |
|----------|-------------|-------------------|
| Product detail (zoom) | 2400-3000px wide | ✅ Any resolution |
| Category/grid | 1200px wide | ✅ Any resolution |
| OG social share | 1200x630 (1.91:1) | ✅ Any resolution |
| Thumbnail | 400px wide | ✅ Any resolution |

> **UI**: Show recommended next to upload zone. No enforcement. User sees: *"Preporučeno: 2400px+ širine za zoom. Možete uploadovati originalnu rezoluciju."*

### 1.4 Delivery (Zero Quality Loss)
- **Netlify Image CDN** / Cloudinary `f_auto,q_auto` on-the-fly
- **`srcset` generated automatically** in template:
  ```html
  <img srcset="
    /images/prod.jpg?w=400&q=80 400w,
    /images/prod.jpg?w=800&q=85 800w,
    /images/prod.jpg?w=1600&q=90 1600w,
    /images/prod.jpg 2400w
  " sizes="(max-width: 480px) 400px, (max-width: 1024px) 800px, 1600px" />
  ```
- **Original always accessible** at `/images/original-filename.jpg`

---

## STEP 2: Auto SEO Generator

### 2.1 Input Fields (User Fills)
| Field | Source | Required |
|-------|--------|----------|
| `naziv` | User | ✅ |
| `kratak_opis` (≤300 char) | User | ✅ |
| `dugi_opis` (Markdown) | User | ✅ |
| `cena` | User | ✅ |
| `kategorija` | Select | ✅ |
| `boje[0].naziv` | Auto from variants | ✅ |
| `focus_keyword` | User (optional) | ❌ |

### 2.2 Auto-Generated Output (On "Generate SEO" Click)
| Output | Logic | Max Length |
|--------|-------|------------|
| `meta_title` | `{naziv} - DALLI | {cena} RSD` | 60 char |
| `meta_description` | First 155 char of `kratak_opis` + " Kupovina na rate. Besplatna dostava >5000 RSD." | 160 char |
| `og:title` | `{naziv} - DALLI` | 60 char |
| `og:description` | `kratak_opis` (truncated) | 160 char |
| `og:image` | Main image URL (auto from upload) | - |
| `og:url` | `https://dalli.rs/proizvod-{slug}` | - |
| `canonical` | Same as `og:url` | - |
| `twitter:card` | `summary_large_image` | - |
| `Schema.org Product` | Full JSON-LD with price, availability, brand, aggregateRating | - |

### 2.3 Focus Keyword Validation (If Provided)
- Checks presence in: `meta_title`, `meta_description`, `H1 (naziv)`, `alt text`, `slug`, first paragraph of `dugi_opis`
- **Score**: 0-100% (shown as badge)
- **Warnings**: "Ključna reč 'pamukna majica' nedostaje u meta description"

### 2.4 SEO Score Badge (0-100)
Factors (weighted):
- Title length optimal (15%)
- Description length optimal (15%)
- Focus keyword coverage (25%)
- Alt text on main image (15%)
- Schema.org valid (15%)
- Image dimensions ≥ recommended (15%)

### 2.5 UI in CMS
- **Collapsible "SEO" section** in product editor
- **Auto-filled fields** (editable — user can override any)
- **Button**: "🔄 Generiši SEO" (runs generator)
- **Button**: "🔍 Preview" → opens Step 4 modal
- **Badge** in product list: 🟢 92 / 🟡 67 / 🔴 34

---

## STEP 3: Alt Text Generator

### 3.1 Main Image Alt Text
**Template**: `{naziv} - {kratak_opis} u {boja} boji, {kategorija}`

**Example**: 
> Input: `naziv="Osnovna Majica"`, `kratak_opis="Udobna pamukna majica za svaki dan"`, `boja="Bela"`, `kategorija="majice"`
> 
> Output: `"Osnovna Majica - Udobna pamukna majica za svaki dan u beloj boji, majice"`

**Rules**:
- Max 125 char (screen reader limit)
- Auto-truncate `kratak_opis` if needed
- Remove duplicate words

### 3.2 Gallery Images Alt Text
**Template**: `{naziv} - Slika {index} od {total}: {kratak_opis}`

**Example**: 
> `"Osnovna Majica - Slika 2 od 4: Udobna pamukna majica za svaki dan"`

### 3.3 UI
- **Auto-fill on image upload** (after main image + first color selected)
- **Editable** — user can overwrite
- **Button**: "🔄 Generiši alt tekst" (re-runs generator)
- **Character counter** (0/125)

---

## STEP 4: Live SEO Preview Modal

### 4.1 Trigger
- Button "🔍 SEO Preview" in SEO section
- Keyboard: `Ctrl/Cmd + Shift + P`

### 4.2 Modal Structure (3 Tabs)
| Tab | Content |
|-----|---------|
| **Meta Tags** | `<title>`, `<meta name="description">`, `<link rel="canonical">`, `<meta name="robots">` |
| **Open Graph** | `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `og:locale`, `og:price:amount`, `og:price:currency` |
| **Schema.org** | Full `Product` JSON-LD (formatted, syntax highlighted) |

### 4.3 Features
- **Real-time sync** — updates as user types in any source field
- **Copy buttons** per section (📋 Copy Meta, 📋 Copy OG, 📋 Copy Schema)
- **Validation icons**: ✅ Valid length, ⚠️ Truncated, ❌ Missing
- **Google Rich Results Test link** (opens external with current Schema)
- **Mobile/desktop preview toggle** (shows how title/description appear in SERP)

### 4.4 Responsive Preview
- Shows truncated title/description as they'd appear in:
  - Desktop Google (≈60/160 char)
  - Mobile Google (≈55/120 char)
  - Facebook/Twitter card

---

## STEP 5: Quality Gates & Polish (Bonus)

### 5.1 SEO Score in Product List
- Column "SEO" with colored badge (🟢🟡🔴)
- Sortable by score
- Filter: "Samo sa lošim SEO (<50)"

### 5.2 Bulk SEO Generate
- In product list: checkbox select multiple → "🔄 Generiši SEO za izabrane"
- Processes in background, shows progress toast
- Skips products with manually edited SEO (detects `seo.manual_override: true`)

### 5.3 Image Quality Indicators
- In gallery: small badge on each thumbnail
  - 🟢 "Original 3200×2400" (≥2400px)
  - 🟡 "1800×1200" (1200-2399px)
  - 🔴 "800×600" (<1200px) — "Preporučeno veća rezolucija za zoom"

### 5.4 Publish Validation (Non-blocking Warnings)
| Check | Action |
|-------|--------|
| No main image | ❌ Block publish |
| Main image > 25MB | ⚠️ Warning only |
| Missing alt text | ⚠️ Warning |
| SEO score < 40 | ⚠️ Warning |
| No focus keyword set | ℹ️ Info |

---

## Technical Implementation Notes

### Netlify CMS Integration
- **Custom widgets** in `admin/index.html` via `CMS.registerWidget()`
- **Custom preview templates** for product card preview
- **Pre-save hooks** for auto-generation (optional, user-triggered preferred)

### File Structure
```
/admin/
  widgets/
    image-upload.js      # Step 1
    seo-generator.js     # Step 2
    alt-generator.js     # Step 3
    seo-preview.js       # Step 4
  css/
    cms-custom.css       # Modal, badges, drag-drop styles
```

### Dependencies
- **Netlify Image CDN** (built-in) or **Cloudinary** (if configured)
- **marked.js** (already in project) for markdown preview
- **No new npm deps** — vanilla JS widgets

---

## Approval Workflow

| Step | Description | Approve? |
|------|-------------|----------|
| 1 | Professional Image Upload (original quality, focal point, gallery reorder) | ⬜ |
| 2 | Auto SEO Generator (meta, OG, Schema, focus keyword, score badge) | ⬜ |
| 3 | Alt Text Generator (main + gallery, editable) | ⬜ |
| 4 | Live SEO Preview Modal (3 tabs, real-time, copy buttons) | ⬜ |
| 5 | Quality Gates (list badge, bulk generate, warnings) | ⬜ |

---

## Next Action
**Reply with**: "Kreni sa Korak 1" (or specify modifications)

Then I'll implement **only Step 1** and demo it before moving to Step 2.