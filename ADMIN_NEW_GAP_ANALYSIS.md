# ADMIN-NEW GAP ANALYSIS
## Elite Product Management Platform — Requirements vs Current Implementation

**Audit Date:** 2026-10-09  
**Scope:** Admin-New product sections vs Elite Product Management Platform requirements  
**Verdict:** Admin-New provides ~45% of required functionality. Significant gaps in luxury features, media management, 360/VTO, pricing automation, crypto/fiat payment controls, shipping, AI generators, and workflow states.

---

## 1. Executive Summary

| Category | Current Coverage | Required | Gap Severity |
|----------|------------------|----------|--------------|
| **General Product Data** | 85% | 100% | 🟡 Medium |
| **Media Management** | 30% | 100% | 🔴 Critical |
| **360° Viewer** | 10% (model only) | 100% | 🔴 Critical |
| **Virtual Try-On** | 10% (model only) | 100% | 🔴 Critical |
| **Pricing & Promotions** | 40% | 100% | 🔴 Critical |
| **Crypto Payments** | 50% (backend only) | 100% | 🔴 Critical |
| **Fiat Payments** | 50% (backend only) | 100% | 🔴 Critical |
| **Inventory (Variant-level)** | 60% | 100% | 🟡 Medium |
| **SEO Automation** | 60% | 100% | 🟡 Medium |
| **Content/Storytelling** | 25% | 100% | 🔴 Critical |
| **Luxury Features** | 0% | 100% | 🔴 Critical |
| **FAQ Builder** | 20% (generic FAQ) | 100% | 🔴 Critical |
| **Shipping Controls** | 0% | 100% | 🔴 Critical |
| **Analytics** | 30% (counters only) | 100% | 🟡 Medium |
| **Workflow States** | 60% (draft/published/archived) | 100% | 🟡 Medium |
| **AI Generators** | 20% (widgets exist) | 100% | 🟡 Medium |

**Overall:** ~45% complete. Admin-New is a strong **administrative shell** (RBAC, tables, filters, modals, API layer, Prisma schema) but the **product editor itself is a basic CRUD form** — not a luxury publishing platform.

---

## 2. Detailed Gap Matrix

### 2.1 GENERAL — Product Identity & Classification

| Field | Current | Required | Notes |
|-------|---------|----------|-------|
| Product Name | ✅ input | ✅ | |
| Slug | ✅ (auto) | ✅ | |
| SKU | ✅ input (auto) | ✅ | |
| Brand | ❌ | ✅ | Hardcoded "DALLI" in Prisma default |
| Collection | ✅ select | ✅ | Via Collection relation |
| Category | ✅ select | ✅ | Via Category relation |
| Gender | ✅ multi-select | ✅ | Via ProductGender relation |
| Style Occasion | ✅ multi-select | ✅ | Via ProductStyleOccasion |
| Product Status | ✅ select (3 states) | ✅ | Missing: Review, Scheduled |
| Featured Product | ✅ boolean | ✅ | |
| Bestseller | ✅ boolean | ✅ | |
| Priority | ✅ number | ✅ | |

**Gap:** Brand field missing (single-brand assumption). Workflow states incomplete.

---

### 2.2 MEDIA — Image Management

| Requirement | Current | Gap |
|-------------|---------|-----|
| Main Image | ✅ (JSON `images.main`) | No upload UI, no preview |
| Gallery Images | ✅ (JSON `images.gallery[]`) | No drag-drop, no sorting, no per-image alt |
| Drag-and-drop sorting | ❌ | **Critical** — manual JSON only |
| Image Alt Text | ❌ | **Critical** — SEO/accessibility |
| OpenGraph Image | ❌ | **Critical** — social sharing |
| Image compression/optimization | ❌ | |
| Bulk upload | ❌ | |
| Focal point / crop | ❌ | |

**Current:** Images stored as JSON `{ main, gallery[], variants{} }` in `Product.images`. Admin uses `image-upload` widget but **not wired to product form**.

---

### 2.3 360° VIEWER

| Requirement | Current | Gap |
|-------------|---------|-----|
| Enable 360 toggle | ❌ | Model `Viewer360Asset` exists, no UI |
| Upload 360 sequence | ❌ | No upload, no frame validation |
| Validation (≥24 frames) | ❌ | |
| 360 Viewer Preview | ❌ | No inline preview in editor |
| Spin config (fps, direction) | ❌ | Model has `spinConfig` JSON |

**Prisma model ready:** `Viewer360Asset` with `frames[]`, `posterUrl`, `spinConfig`. **Zero UI.**

---

### 2.4 VIRTUAL TRY-ON

| Requirement | Current | Gap |
|-------------|---------|-----|
| Enable VTO toggle | ❌ | Model `AiTryOnJob` exists, no UI |
| Model Type selector | ❌ | |
| VTO Assets Upload | ❌ | Front/back/detail images |
| Eligibility Rules | ❌ | Category-based auto-enable |
| Product Preview | ❌ | In-editor try-on preview |

**Prisma model ready:** `AiTryOnJob` with `inputMediaUrl`, `outputMediaUrl`, `params`. **Zero UI.**

---

### 2.5 PRICING & PROMOTIONS

| Requirement | Current | Gap |
|-------------|---------|-----|
| Original Price | ✅ `price` (cents) | |
| Current/Sale Price | ✅ `salePrice` | |
| Discount % (auto) | ❌ | Manual only |
| Scheduled Promotions | ❌ | Campaign model exists, no product UI |
| Price history | ❌ | |
| Tiered pricing | ❌ | |
| Regional pricing | ❌ | |

**Backend ready:** `Campaign`, `CampaignProduct`, `PaymentRule`. **No product-level pricing UI.**

---

### 2.6 CRYPTO PAYMENTS — Auto-populate from Implementation

| Requirement | Current | Gap |
|-------------|---------|-----|
| Allow Crypto (toggle) | ❌ | `PaymentRule` has `method: 'crypto'` |
| Crypto Discount Enabled | ❌ | |
| Crypto Discount % | ❌ | Hardcoded 15% in frontend |
| Supported Currencies | ❌ **Hardcoded** | **Must auto-populate from `data/crypto-payment-provider.js` / `CryptoPaymentProvider`** |
| Currency configs (decimals, network, confirmations) | ❌ | |

**Real implementation exists:** `data/crypto-payment-provider.js` defines `CryptoPaymentProvider` interface + `SUPPORTED_CRYPTO_CURRENCIES` (BTC, ETH, USDT, USDC, PI). **Admin must read this dynamically.**

---

### 2.7 FIAT PAYMENTS — Audit All Methods

| Requirement | Current | Gap |
|-------------|---------|-----|
| Product-level enable/disable | ❌ | `PaymentRule.scope: 'product'` exists, no UI |
| Supported methods list | ❌ | `data/crypto-payment-model.json` has `PAYMENT_METHODS` (cod, bank-transfer, card, crypto) — **must read dynamically** |
| Method configs (discount, min/max order) | ❌ | `PaymentRule` has `minOrderTotal`, `maxOrderTotal`, `discount` |
| COD / Bank Transfer / Card toggles | ❌ | |

**Real implementation:** `PAYMENT_METHODS` array in `data/crypto-payment-model.json` + `PaymentRule` Prisma model. **Admin must auto-populate.**

---

### 2.8 INVENTORY — Variant-Level (Size + Color)

| Requirement | Current | Gap |
|-------------|---------|-----|
| Size Matrix | ✅ `ProductSize` + `Inventory` | Per-size only |
| Size Selection | ✅ | |
| Stock Per Size | ✅ `Inventory.quantity` | |
| Color Selection | ✅ `ProductColor` | |
| Stock Per Color | ❌ | No color-level inventory |
| Stock Per Variant (size+color) | ❌ | **Critical** — true SKU inventory |
| Backorder Allowed | ✅ `Inventory.allowBackorder` | |
| Low Stock Threshold | ✅ `Inventory.lowStockThreshold` | |

**Gap:** Inventory is per `ProductSize` only. True variant (size×color) inventory requires composite key or separate `ProductVariant` model (not in Prisma). Current `Inventory` links 1:1 to `ProductSize`.

---

### 2.9 SEO — Auto-Generation

| Requirement | Current | Gap |
|-------------|---------|-----|
| Meta Title | ✅ field | No auto-generate |
| Meta Description | ✅ field | No auto-generate |
| Keywords | ✅ `metaKeywords[]` | No auto-generate |
| Canonical URL | ✅ field | No auto-generate |
| Robots Settings | ❌ | |
| OpenGraph | ❌ | `ogTitle`, `ogDescription`, `ogImage` in `SeoEntry` but no UI |
| Twitter Cards | ❌ | |
| JSON-LD Product Schema | ❌ | Auto-generate on publish |
| Breadcrumb Schema | ❌ | Auto-generate |
| Sitemap Updates | ❌ | Trigger on publish |

**Widgets exist:** `admin-new/widgets/seo-generator.js`, `alt-generator.js`, `bulk-seo-actions.js` — **not integrated into product editor.**

---

### 2.10 CONTENT / STORYTELLING

| Requirement | Current | Gap |
|-------------|---------|-----|
| Short Description | ✅ `shortDescription` | |
| Long Description | ✅ `description` | |
| Product Story | ❌ | Missing field |
| Craftsmanship Section | ❌ | Missing field |
| Materials Section | ❌ | Missing field (metadata JSON has `specifications.material`) |
| Care Instructions | ❌ | Missing field (metadata JSON has `specifications.care`) |
| Warranty Information | ❌ | Missing field (metadata JSON has `specifications.warrantyMonths`) |

**Gap:** Content fields exist in `metadata` JSON but **no structured UI sections** for luxury storytelling.

---

### 2.11 LUXURY FEATURES — **COMPLETELY MISSING**

| Feature | Current | Required |
|---------|---------|----------|
| Exclusive Access | ❌ | ✅ |
| Member-Only Product | ❌ | ✅ |
| Early Access Product | ❌ | ✅ |
| Limited Edition | ❌ | ✅ |
| Edition Number | ❌ | ✅ |
| Certificate of Authenticity | ❌ | ✅ |
| Luxury Packaging Enabled | ❌ | ✅ |
| Gift Packaging Enabled | ❌ | ✅ |
| Concierge Available | ❌ | ✅ |

**Prisma additions needed:** Fields on `Product` or new `ProductLuxury` relation.

---

### 2.12 FAQ — Product-Specific Builder

| Requirement | Current | Gap |
|-------------|---------|-----|
| Product FAQ Builder | ❌ | Generic `Faq` model with `targetId` exists, no product-scoped UI |
| FAQ ordering | ❌ | |
| Per-language FAQ | ❌ | `Faq` has no locale |

---

### 2.13 SHIPPING CONTROLS — **COMPLETELY MISSING**

| Requirement | Current |
|-------------|---------|
| Shipping Restrictions | ❌ |
| Regional Availability | ❌ |
| Express Delivery Eligibility | ❌ |

---

### 2.14 ANALYTICS — Denormalized Counters

| Requirement | Current | Gap |
|-------------|---------|-----|
| View Count | ✅ `viewCount` | No UI |
| Wishlist Count | ❌ | `WishlistItem` exists, no counter |
| Cart Count | ✅ `cartAddCount` | No UI |
| Conversion Metrics | ❌ | |
| Revenue per product | ❌ | |

---

### 2.15 WORKFLOW STATES

| State | Current | Required |
|-------|---------|----------|
| Draft | ✅ `status: 'draft'` | ✅ |
| Review | ❌ | ✅ |
| Approved | ❌ | ✅ |
| Scheduled | ❌ | ✅ (`publishedAt` exists, no scheduler UI) |
| Published | ✅ `status: 'published'` | ✅ |
| Archived | ✅ `status: 'archived'` | ✅ |

**Gap:** Missing **Review**, **Approved**, **Scheduled** states + publish scheduler UI.

---

### 2.16 AI SUPPORT — Generators

| Generator | Current | Gap |
|-----------|---------|-----|
| Meta Title | ✅ Widget `seo-generator.js` | Not in product editor |
| Meta Description | ✅ Widget `seo-generator.js` | Not in product editor |
| Product Story | ❌ | ✅ Required |
| Alt Text | ✅ Widget `alt-generator.js` | Not in product editor |
| Luxury Marketing Copy | ❌ | ✅ Required |

**Widgets exist** but **not integrated** into product form.

---

## 3. Architecture Readiness Assessment

| Layer | Status | Notes |
|-------|--------|-------|
| **Prisma Schema** | 🟢 90% ready | Luxury fields, variant inventory, workflow states need additions |
| **API Layer** | 🟢 95% ready | `SectionAPI.products` CRUD + variants + inventory endpoints exist |
| **Admin Shell** | 🟢 95% ready | RBAC, routing, modals, tables, forms, toasts, i18n all solid |
| **Components** | 🟢 80% ready | Input, Select, Modal, ImageUpload, Textarea, Chips, ColorPicker missing |
| **Widgets** | 🟢 70% ready | SEO, Alt, ImageUpload widgets exist but not composed |
| **Auth/RBAC** | 🟢 100% ready | Roles, permissions, audit log, sessions |
| **Real-time** | 🟢 100% ready | Socket.io, event bus |
| **Search/Index** | 🟢 80% ready | Meilisearch + Prisma fallback, `SearchIndex` model |

---

## 4. Critical Path to 100%

### Phase 1: Prisma Extensions (Week 1)
- Add luxury fields to `Product`
- Add `ProductVariant` (size×color) with inventory
- Add workflow states: `review`, `approved`, `scheduled`
- Add shipping fields, luxury fields, content sections
- Add `ProductFaq` relation

### Phase 2: Core Editor Components (Week 2-3)
- Media manager (drag-drop, gallery, alt, OG image, crop)
- 360° uploader + preview (canvas/WebGL)
- VTO asset manager + preview
- Variant matrix editor (size×color grid with stock)
- Payment rule editor (crypto auto-populate, fiat methods from config)
- Shipping section
- SEO auto-generate buttons (wire existing widgets)
- Content tabs (Story, Craftsmanship, Materials, Care, Warranty)
- Luxury features panel
- FAQ builder (product-scoped)
- Analytics dashboard tab
- Workflow state machine + scheduler

### Phase 3: AI Generators Integration (Week 3)
- Wire `seo-generator`, `alt-generator` into editor
- Add `story-generator`, `luxury-copy-generator` widgets
- AI-assisted field population with review/accept flow

### Phase 4: Migration & Cutover (Week 4)
- Import `products.json` → Prisma
- Retire `products.json` as source
- Retire Netlify CMS
- Sync generated static pages from Admin-New

---

## 5. Conclusion

**Admin-New CAN completely replace Netlify CMS and `products.json`** — the backend architecture (Prisma, API, RBAC, auth, schema) is enterprise-grade and 90% ready.

**The gap is almost entirely in the Product Editor UI** — the current form is a basic admin CRUD, not a luxury publishing platform. With ~3-4 weeks of focused frontend work on the editor components, Admin-New becomes the **exclusive, luxury-grade product publishing system** for DALLI.

**Recommendation:** Proceed with implementation. The foundation is solid; the editor needs to be built.