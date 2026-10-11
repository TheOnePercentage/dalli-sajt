# PRODUCT EDITOR SPECIFICATION
## Elite Product Management Platform — Detailed UI/UX Specification

**Version:** 1.0  
**Date:** 2026-10-09  
**Platform:** Admin-New (React + Vite + Prisma)

---

## 1. Editor Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HEADER BAR (sticky)                                                         │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ Product Name / SKU           │  │ [Draft ▼] [Save Draft] [Preview]     │  │
│  │ Collection > Gender > Cat    │  │ [Submit Review] [Schedule] [Publish] │  │
│  └──────────────────────────────┘  └──────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│  TAB NAVIGATION (sticky, horizontal scroll on mobile)                        │
│  [General*] [Media*] [Variants*] [360°] [VTO] [Pricing] [Payments]          │
│  [Inventory] [Shipping] [SEO] [Content] [Luxury] [FAQ] [Analytics]          │
│  [Workflow] [AI Assist] [Settings]                                           │
│  * = required for publish                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TAB PANEL CONTENT (scrollable, preserves state on tab switch)              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tab Specifications

### 2.1 GENERAL — Osnovni Podaci (Required)

**Fields:**
| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| Product Name * | Text | Required, max 120 chars | Auto-generates slug |
| Slug | Text (auto) | Unique, read-only after create | Editable on create only |
| SKU | Text (auto) | Format: ML-XXX | Auto: ML-{id}, editable |
| Brand | Select | Default "DALLI" | Future multi-brand |
| Collection * | Select | Required: Casual / Elegance | From Collection table |
| Category * | Select | Required, dependent on Collection | From Category table |
| Gender * | Multi-select | Required: Men / Women / Unisex | Chips display |
| Style Occasion | Multi-select | Chips: everyday, business, formal, evening, travel, sport, smart-casual, luxury-essentials, special-occasion | |
| Product Status | Select | Draft / Hidden / Sold Out | Workflow handles Published/Archived |
| Featured Product | Toggle | Boolean | Homepage hero eligibility |
| Bestseller | Toggle | Boolean | Badge on cards |
| Priority | Number | 0-100, default 0 | Sort order in collections |

**Actions:** Save Draft, Next Tab

---

### 2.2 MEDIA — Mediji (Required)

**Layout:** Two-column — Left: Main Image + Gallery | Right: OG Image + Alt Texts

**Main Image:**
- Drop zone / click to upload
- Preview (400×500, aspect-ratio 4:5)
- Focal point picker (click on image)
- Alt text field (required, max 125 chars)
- AI Alt Text button 🤖

**Gallery:**
- Drag-drop reorder (grid, 4 cols)
- Per-image: thumbnail, alt text, delete
- Max 20 images
- Bulk upload (multi-select)
- Per-image AI Alt Text

**OpenGraph Image:**
- Separate upload (1200×630 recommended)
- Preview card (Facebook/Twitter/LinkedIn)
- Fallback to main image if empty

**Image Requirements:**
- Formats: WebP, AVIF, JPG, PNG, SVG
- Max 10MB per file
- Auto-convert to WebP/AVIF on upload
- Responsive variants generated server-side

---

### 2.3 VARIANTS — Variante (Required for Physical Products)

**Matrix Editor (Size × Color Grid):**

```
Colors →    Bela    Crna    Navy    Bež
Sizes ↓
XS           [10]    [5]     [0]     [3]    ← stock per cell
S            [25]    [18]    [12]    [8]
M            [30]    [22]    [15]    [10]
L            [20]    [15]    [8]     [5]
XL           [10]    [8]     [3]     [2]
```

**Per-Cell Data (inline editable):**
- Stock (number, ≥0)
- Price override (optional, inherits base)
- Sale price override (optional)
- SKU (auto: {base}-{color3}-{size}, editable)
- Active toggle

**Bulk Actions:**
- Fill down / right
- Set stock for row/col
- Apply price to all
- CSV import/export
- Add color / Add size (opens picker)

**Color Picker:**
- Name + Hex + Sort order
- Swatch preview
- Predefined palette + custom

**Size Picker:**
- Name + Sort order
- Predefined: XS-3XL, 36-44, 46-56, One Size, Standard 330ml

**Variant-Level Inventory:** Links to `ProductVariant` → `Inventory` (1:1)

---

### 2.4 360° — 360° Pregled

**Enable Toggle:** ON/OFF — shows/hides entire tab content

**Frame Uploader:**
- Drop zone: "Upload 24+ frames (JPG/PNG/WebP, 360° sequence)"
- Progress bar per file
- Thumbnail strip (scrollable, draggable reorder)
- Frame counter: "24/72 frames uploaded"
- Validation: Minimum 24 frames, power of 2 preferred (24, 36, 48, 72)

**Preview:**
- Interactive WebGL viewer (Three.js) inline
- Auto-rotate toggle
- Fullscreen button
- Frame stepper (scrub through frames)

**Spin Config:**
| Setting | Type | Default |
|---------|------|---------|
| FPS | Number 1-60 | 30 |
| Direction | Select | clockwise / counterclockwise / bounce |
| Autoplay | Toggle | ON |
| Mouse drag | Toggle | ON |
| Touch swipe | Toggle | ON |

**Poster Image:** Separate upload (first frame fallback)

**Requirements:** 24-72 frames, same dimensions, centered product

---

### 2.5 VTO — Virtualno Probanje

**Enable Toggle:** ON/OFF

**Model Type:** Select — upper-body / lower-body / full-body / footwear / accessory / eyewear / headwear

**Asset Uploader (3 required):**
| Asset | Description | Specs |
|-------|-------------|-------|
| Front | Front-facing model | PNG/WebP, transparent BG, 1024×1024 |
| Back | Rear view | Same |
| Detail | Close-up (fabric, stitching) | Same |

**Eligibility Rules:**
- Auto-enable by category (from `VTO_ELIGIBLE_CATEGORIES` in storefront)
- Manual override toggle

**Preview:** In-editor try-on canvas (WebGL, loads VTO model)

**Status:** Shows processing/completed/failed from `AiTryOnJob`

---

### 2.5 PRICING — Cene i Promocije

**Base Pricing:**
| Field | Type | Notes |
|-------|------|-------|
| Original Price (RSD) * | Number | Cents, required |
| Sale Price (RSD) | Number | Optional, < original |
| Discount % | Read-only | Auto: (1 - sale/original)×100 |
| Currency | Select | Default RSD |

**Scheduled Promotions:**
- Table: [Campaign] [Start Date] [End Date] [Discount %] [Status]
- "Add Promotion" → opens campaign picker with date range
- Links to `Campaign` + `CampaignProduct`

**Price History:** Read-only log of price changes (from audit)

**Tiered Pricing (future):** Quantity breaks

---

### 2.6 PAYMENTS — Načini Plaćanja

**Auto-Populated from Implementation:**

**Crypto Section:**
- Data source: `data/crypto-payment-provider.js` → `SUPPORTED_CRYPTO_CURRENCIES`
- Table per currency (read from provider):
  | Currency | Enabled | Discount % | Min Confirmations | Est. Time |
  |----------|---------|------------|-------------------|-----------|
  | BTC | ☑ | 15% | 1 | 10 min |
  | ETH | ☑ | 15% | 12 | 5 min |
  | USDT | ☑ | 15% | 12 | 5 min |
  | ... | | | | |

- Global crypto discount % (default 15%, overridable)
- Per-product crypto toggle (PaymentRule scope=product)

**Fiat Section:**
- Data source: `data/crypto-payment-model.json` → `PAYMENT_METHODS`
- Table per method:
  | Method | Enabled | Discount | Min Order | Max Order | Sort |
  |--------|---------|----------|-----------|-----------|------|
  | COD | ☑ | 0% | — | — | 1 |
  | Bank Transfer | ☑ | 0% | — | — | 2 |
  | Card | ☑ | 0% | — | — | 3 |

- Per-product enable/disable via `PaymentRule`

**Backend Sync:** "Refresh from Config" button fetches latest from provider/model

---

### 2.7 INVENTORY — Inventar

**Variant-Level Stock Table (from Variants tab, read-only summary):**

| SKU | Color | Size | Stock | Reserved | Available | Incoming | Reorder Pt | Reorder Qty | Status |
|-----|-------|------|-------|----------|-----------|----------|------------|-------------|--------|
| ML-001-BEL-S | Bela | S | 25 | 2 | 23 | 50 | 10 | 50 | ✅ OK |

**Actions per row:**
- Restock (modal: qty, note, create PO)
- Edit Reorder (point, qty, supplier)
- View Movements (history)

**Summary Cards (top):**
- Total Variants, Total Stock, Available, Reserved, Incoming
- Critical (out of stock), Low (≤ threshold), OK counts

**Export:** CSV button

---

### 2.8 SHIPPING — Dostava

**Product-Level Shipping Rules:**

| Field | Type |
|-------|------|
| Shippable | Toggle |
| Shipping Restrictions | Multi-select countries (ISO codes) — where NOT shipped |
| Regional Availability | Multi-select countries — where available (empty = worldwide) |
| Express Eligible | Toggle |
| Free Shipping Threshold | Number (overrides global) |
| Ships From | Select warehouse/atelier |
| Handling Time (days) | Number |
| Special Handling | Multi-select: fragile, temperature-controlled, insurance-required, signature-required |
| Hazmat Class | Text |
| Packaging Type | Select: box, tube, garment-bag, gift-box, custom |
| Dimensional Weight | Per-variant JSON editor (L×W×H×Weight) |

---

### 2.9 SEO — SEO (Auto-Generation)

**Fields (with Auto-Generate Buttons):**

| Field | Auto-Gen | Validation |
|-------|----------|------------|
| Meta Title | 🤖 | ≤ 60 chars |
| Meta Description | 🤖 | ≤ 155 chars |
| Meta Keywords | 🤖 | Comma-separated |
| Canonical URL | Auto | Read-only |
| Robots | Select | index/follow, noindex/follow, noindex/nofollow |
| OG Title | 🤖 | ≤ 90 chars |
| OG Description | 🤖 | ≤ 300 chars |
| OG Image | Picker | From Media tab |
| Twitter Card | Select | summary_large_image / summary |

**Live Preview Panel (right side):**
- Google SERP preview
- Facebook/Twitter/LinkedIn card preview
- JSON-LD structured data viewer (collapsible)

**Auto-Generate Actions:**
- [Generate Meta Title] → calls AI → fills field + marks AI
- [Generate Meta Description] → calls AI → fills field + marks AI
- [Generate All] → runs all generators

**JSON-LD Output:** Read-only code block (copy button)

**On Publish:** Auto-generates all if empty, writes to `ProductSeo`, triggers sitemap update

---

### 2.10 CONTENT — Priča i Detalji

**Rich Text Sections (TipTap/ProseMirror):**

| Section | Field | Placeholder |
|---------|-------|-------------|
| Product Story | `content.story` | "Priča o izvoru, inspiraciji, heritage-u..." |
| Craftsmanship | `content.craftsmanship` | "Detalji ručnerade, tehnike, sati rada..." |
| Materials | `content.materials` | "Sastav materijala, sertifikati, održivost..." |
| Care Instructions | `content.careInstructions` | "Pranje, sušenje, čuvanje, profesionalno čišćenje..." |
| Warranty Info | `content.warrantyInfo` | "Trajanje garancije, što pokriva, proces..." |
| Size Guide | `content.sizeGuide` | "Merne tabele, saveti za izbor veličine..." |
| Fit Notes | `content.fitNotes` | "Kroj (regular/slim/oversized), preporuka..." |
| Sustainability | `content.sustainability` | "Ekološki Fußtap, reciklaža,/organski materijali..." |

**Toolbar:** Bold, Italic, Link, H2/H3, Bullet, Numbered, Quote, Image embed

**AI Generate:** Per-section 🤖 button → calls generator → inserts at cursor

---

### 2.11 LUXURY — Luksuzne Opcije

**Toggle Grid (2 columns):**

| Feature | Type | Conditional Fields |
|---------|------|-------------------|
| Exclusive Access | Toggle | — |
| Member Only | Toggle | Required Tier (Silver/Gold/Black) |
| Early Access | Toggle | Early Access Date (datetime picker) |
| Limited Edition | Toggle | Edition Number, Total Edition Size |
| Certificate of Authenticity | Toggle | Certificate Number (auto: CA-{sku}-{edition}) |
| Luxury Packaging | Toggle | — |
| Gift Packaging | Toggle | — |
| Concierge Available | Toggle | Concierge Contact (email/phone), Personal Shopper Note |
| VIP Preview Date | DateTime | — |

**Edition Numbering (when Limited Edition ON):**
- Current: auto-increment per product
- Total: manual input
- Display: "3 / 50" on product page

**Certificate Preview:** Modal with formatted certificate

---

### 2.12 FAQ — FAQ

**Accordion List Builder:**

```
┌─────────────────────────────────────────┐
│ [+ Add FAQ]                             │
├─────────────────────────────────────────┤
│ ▼ Pitanje: Da li je materijal organski? │
│   Odgovor: Da, 100% organski pamuk...   │
│   [Edit] [Delete] [↑] [↓]               │
├─────────────────────────────────────────┤
│ ▶ Pitanje: Kako prati?                  │
│   [Edit] [Delete] [↑] [↓]               │
└─────────────────────────────────────────┘
```

**Per-FAQ:**
- Question (required)
- Answer (rich text)
- Locale (sr/en/de/fr/it/es/ru/ar)
- Active toggle
- Sort order (drag handle)

---

### 2.13 ANALYTICS — Analitika

**Dashboard Cards (read-only, from `ProductAnalytics`):**

| Metric | Period | Visualization |
|--------|--------|---------------|
| Views / Unique Views | 7d/30d/90d | Line chart |
| Wishlist Adds | 7d/30d | Number + trend |
| Cart Adds | 7d/30d | Number + trend |
| Conversion Rate | 7d/30d | Gauge |
| Revenue | 7d/30d/90d | Bar chart |
| Avg Order Value | 30d | Number |
| Return Rate | 90d | Percentage |
| Top Referrers | 30d | Table |

**Refresh:** Manual button (calls `/products/:id/analytics`)

---

### 2.14 WORKFLOW — Radni Tok

**State Machine Visualizer:**

```
DRAFT ──► REVIEW ──► APPROVED ──► SCHEDULED ──► PUBLISHED ──► ARCHIVED
  │          │          │            │           │            │
  ▼          ▼          ▼            ▼           ▼            ▼
Edit      Submit    Approve/      Schedule    Auto-pub    Archive
          Review    Reject       Date        at date
```

**Current State Badge:** Large, color-coded (Draft=gray, Review=blue, Approved=green, Scheduled=purple, Published=success, Archived=muted)

**Actions (per state):**
- **Draft:** [Save Draft] [Submit for Review]
- **Review:** [Approve] [Reject w/ notes] [Return to Draft]
- **Approved:** [Schedule Publish] [Publish Now]
- **Scheduled:** [Reschedule] [Publish Now] [Cancel Schedule]
- **Published:** [Archive] [Create Revision]
- **Archived:** [Restore to Draft]

**Scheduler:** DateTime picker for `scheduledPublishAt`, timezone selector

**History Log:** Timeline of all state transitions (who, when, notes)

---

### 2.15 AI ASSIST — AI Asistent

**Generator Cards (one per generator):**

```
┌────────────────────────────────────────────┐
│ Meta Title                    [Generate]   │
│ ────────────────────────────────────────  │
│ Preview: "Osnovna Majica \| DALLI Casual"  │
│ [Accept] [Regenerate] [Edit Manually]      │
└────────────────────────────────────────────┘
```

**Generators:**
1. Meta Title
2. Meta Description
3. Product Story
4. Alt Text (per image — selector)
5. Luxury Marketing Copy (3 variants)

**Output:** Diff view (current vs generated), Accept → fills field + sets `aiGeneratedFields.{field}=true`

**Model:** OpenAI GPT-4o-mini (configurable), Serbian language, luxury tone

---

### 2.16 SETTINGS — Postavke

**Advanced:**
- Product ID (read-only)
- Created/Updated timestamps
- Created by / Last modified by
- Version history (last 10 revisions, diff view)
- Delete product (danger zone, requires typing name)
- Bulk actions (duplicate, bulk status, bulk category)

---

## 3. Responsive Behavior

| Breakpoint | Tabs | Panels |
|------------|------|--------|
| Desktop (≥1024) | Horizontal, all visible | Side-by-side where applicable |
| Tablet (768-1023) | Horizontal scroll | Single column |
| Mobile (<768) | Horizontal scroll + "More" dropdown | Single column, collapsible sections |

---

## 4. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save Draft |
| `Ctrl/Cmd + Enter` | Save & Next Tab |
| `Ctrl/Cmd + Shift + P` | Publish / Schedule |
| `Ctrl/Cmd + [` | Previous Tab |
| `Ctrl/Cmd + ]` | Next Tab |
| `Ctrl/Cmd + /` | Focus Search (in list view) |
| `Esc` | Close Modal / Cancel Edit |

---

## 5. Accessibility

- All form fields: labels, aria-describedby for errors/help
- Tab order: logical (top-to-bottom, left-to-right)
- Drag-drop: keyboard alternative (arrow keys + Space/Enter)
- Color contrast: WCAG AA minimum
- Screen reader: live regions for auto-save, validation errors
- Focus management: modal trap, return to trigger

---

## 6. Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Name | Required, 2-120 chars | "Naziv je obavezan (2-120 karaktera)" |
| Slug | Unique, lowercase, hyphens only | "Slug mora biti jedinstven" |
| SKU | Unique, format ML-XXX | "SKU već postoji" |
| Base Price | Required, > 0 | "Cena mora biti veća od 0" |
| Sale Price | < Base Price | "Akcijska cena mora biti manja od osnovne" |
| Main Image | Required for publish | "Glavna slika je obavezna za objavu" |
| At least 1 variant | Required for physical | "Minimalno jedna varijanta obavezna" |
| Meta Title | ≤ 60 chars | "Meta title predugačak (max 60)" |
| Meta Description | ≤ 155 chars | "Meta description predugačka (max 155)" |
| OG Image | Required for publish | "OG slika obavezna za deljenje" |

---

## 7. Auto-Save & Conflict Handling

- **Auto-save:** Every 30 seconds to `/products/:id/draft` (localStorage backup)
- **Conflict detection:** ETag on GET, 409 on PUT → show diff modal (server vs local)
- **Offline:** Queue mutations in IndexedDB, sync on reconnect
- **Dirty tracking:** Per-tab, visual indicator (orange dot on tab)

---

## 8. Performance Budgets

| Metric | Budget |
|--------|--------|
| Editor initial load | < 2s |
| Tab switch | < 100ms |
| Image upload (10MB) | Progress at 25%/50%/75%/100% |
| 360 preview init | < 3s |
| VTO preview init | < 5s |
| AI generation | < 10s (streaming) |
| Save draft | < 500ms |
| Publish | < 3s (includes index/sitemap) |

---

## 9. Integration Points

| Feature | External Dependency |
|---------|---------------------|
| Image optimization | Server-side (Sharp) → WebP/AVIF |
| 360 viewer | Three.js (lazy-loaded) |
| VTO preview | WebGL model (lazy-loaded) |
| AI generators | `/api/v1/admin/products/:id/ai/*` |
| Search index | Meilisearch webhook on publish |
| Sitemap | Auto-regenerate on publish |
| Cache purge | Cloudflare/Netlify purge API on publish |
| Analytics | UserEvent → ProductAnalytics rollup (cron) |

---

## 10. Testing Checklist

- [ ] All required fields block publish
- [ ] Auto-save works across tabs
- [ ] Drag-drop reorder persists
- [ ] 360 frames validate (count, dimensions)
- [ ] VTO assets validate (3 required, transparency)
- [ ] Crypto currencies sync from provider
- [ ] Fiat methods sync from model
- [ ] Variant matrix: add/remove color/size, bulk edit
- [ ] SEO auto-gen fills all fields
- [ ] AI generators produce valid output
- [ ] Workflow transitions enforce rules
- [ ] Scheduler publishes at correct time
- [ ] Search index updated on publish
- [ ] Sitemap updated on publish
- [ ] Offline mutations sync on reconnect
- [ ] Accessibility: keyboard, screen reader, contrast