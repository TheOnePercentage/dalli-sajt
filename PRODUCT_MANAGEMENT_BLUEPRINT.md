# PRODUCT MANAGEMENT BLUEPRINT
## Elite Product Management Platform — Architecture & Implementation Plan

**Version:** 1.0  
**Date:** 2026-10-09  
**Status:** Ready for Implementation

---

## 1. Vision

Build a **luxury-grade product publishing platform** that becomes the **Single Source of Truth** for the entire DALLI catalog. Admin-New replaces Netlify CMS and `products.json` entirely — every product, variant, image, price, SEO tag, and luxury attribute is authored, validated, and published from one interface.

**Core Principles:**
- **Luxury First** — Every field, workflow, and preview reflects premium brand standards
- **AI-Assisted** — Generators for SEO, alt text, product stories, luxury copy
- **Zero JSON Editing** — All data through structured UI; JSON only for advanced metadata
- **Automated Compliance** — JSON-LD, sitemaps, canonicals, breadcrumbs auto-generated on publish
- **Workflow-Driven** — Draft → Review → Approved → Scheduled → Published → Archived
- **Real-time Preview** — 360°, VTO, media, SEO, social cards all previewable in-editor

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN-NEW (React + Vite)                      │
├─────────────────────────────────────────────────────────────────────┤
│  Product Editor (Tabs)                                               │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐          │
│  │General│ Media │ 360°  │ VTO   │ Pricing│Inventory│ SEO  │Content │
│  │Luxury │ FAQ   │Shipping│Analytics│Workflow│Settings│ AI   │        │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘          │
├─────────────────────────────────────────────────────────────────────┤
│  SectionAPI (products, variants, inventory, categories, collections) │
│  APIService (caching, offline queue, dedup, retries, auth)          │
├─────────────────────────────────────────────────────────────────────┤
│  Prisma ORM → PostgreSQL                                             │
│  Models: Product, ProductVariant, ProductColor, ProductSize,        │
│          Inventory, Collection, Category, Gender, StyleOccasion,    │
│          Viewer360Asset, AiTryOnJob, PaymentRule, Campaign,         │
│          ProductFaq, ProductLuxury, ProductShipping, ProductSeo,    │
│          ProductAnalytics, ProductWorkflow, AuditLog                │
├─────────────────────────────────────────────────────────────────────┤
│  Events → Search Index (Meilisearch) → Public API → Storefront      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model Extensions (Prisma)

### 3.1 New Models & Fields

```prisma
// ProductVariant — true size×color SKU
model ProductVariant {
  id            Int      @id @default(autoincrement())
  productId     Int
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  colorId       Int
  color         ProductColor @relation(fields: [colorId], references: [id], onDelete: Cascade)
  sizeId        Int
  size          ProductSize  @relation(fields: [sizeId], references: [id], onDelete: Cascade)
  sku           String   @unique
  price         Int      // override or inherit
  salePrice     Int?
  inventory     Inventory?
  position      Int      @default(0)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([productId, colorId, sizeId])
  @@index([productId])
}

// ProductLuxury — luxury-specific attributes
model ProductLuxury {
  productId             Int      @id
  product               Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  isExclusiveAccess     Boolean  @default(false)
  isMemberOnly          Boolean  @default(false)
  isEarlyAccess         Boolean  @default(false)
  earlyAccessDate       DateTime?
  isLimitedEdition      Boolean  @default(false)
  editionNumber         Int?     // e.g., 1 of 50
  editionTotal          Int?     // total edition size
  hasCertificateOfAuth  Boolean  @default(false)
  certificateNumber     String?
  luxuryPackaging       Boolean  @default(false)
  giftPackaging         Boolean  @default(false)
  conciergeAvailable    Boolean  @default(false)
  conciergeContact      String?
  personalShopperNote   String?
  vipPreviewDate        DateTime?
  archiveLocation       String?  // physical archive reference
  provenance            String?  // heritage/story
  materialsDetail       Json?    // detailed material breakdown
  craftsmanshipHours    Int?
  artisanName           String?
  atelierLocation       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ProductShipping — per-product shipping rules
model ProductShipping {
  productId           Int      @id
  product             Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  isShippable         Boolean  @default(true)
  shippingRestrictions String[] @default([]) // country codes where NOT shippable
  regionalAvailability String[] @default([]) // country codes where available (empty = worldwide)
  expressEligible     Boolean  @default(true)
  freeShippingThreshold Int?   // override global
  shipsFrom           String?  // warehouse/atelier location
  shipsWithinDays     Int?     // handling time
  specialHandling     String[] @default([]) // fragile, temperature, insurance
  hazmatClass         String?
  dimensionalWeight   Json?    // { length, width, height, weight } per variant
  packagingType       String?  // box, tube, garment-bag, gift-box
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ProductSeo — auto-generated + manual overrides
model ProductSeo {
  productId       Int      @id
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  metaTitle       String?
  metaDescription String?
  metaKeywords    String[] @default([])
  canonicalUrl    String?
  noindex         Boolean  @default(false)
  nofollow        Boolean  @default(false)
  ogTitle         String?
  ogDescription   String?
  ogImage         String?
  ogType          String   @default("product")
  twitterCard     String   @default("summary_large_image")
  twitterTitle    String?
  twitterDescription String?
  twitterImage    String?
  structuredData  Json?    // auto-generated JSON-LD
  breadcrumbJson  Json?    // auto-generated
  lastGeneratedAt DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ProductFaq — product-scoped FAQ
model ProductFaq {
  id          Int      @id @default(autoincrement())
  productId   Int
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  locale      String   @default("sr")
  question    String
  answer      String
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([productId, locale, question])
  @@index([productId])
}

// ProductWorkflow — state machine
model ProductWorkflow {
  productId       Int      @id
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  state           String   @default("draft") // draft, review, approved, scheduled, published, archived
  previousState   String?
  submittedBy     String?
  submittedAt     DateTime?
  reviewedBy      String?
  reviewedAt      DateTime?
  approvedBy      String?
  approvedAt      DateTime?
  scheduledAt     DateTime?
  publishedAt     DateTime?
  archivedAt      DateTime?
  scheduledPublishAt DateTime?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ProductAnalytics — denormalized counters
model ProductAnalytics {
  productId       Int      @id
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  viewCount       Int      @default(0)
  uniqueViews     Int      @default(0)
  wishlistCount   Int      @default(0)
  cartAddCount    Int      @default(0)
  checkoutCount   Int      @default(0)
  purchaseCount   Int      @default(0)
  revenueTotal    Int      @default(0) // RSD cents
  conversionRate  Float    @default(0)
  avgOrderValue   Int      @default(0)
  returnRate      Float    @default(0)
  lastCalculated  DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ProductContent — luxury storytelling sections
model ProductContent {
  productId        Int      @id
  product          Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  story            String?  // Product Story — heritage, inspiration
  craftsmanship    String?  // Craftsmanship Section
  materials        String?  // Materials Section (detailed)
  careInstructions String?  // Care Instructions
  warrantyInfo     String?  // Warranty Information
  sizeGuide        String?  // Size Guide
  fitNotes         String?  // Fit Notes
  sustainability   String?  // Sustainability Info
  locale           String   @default("sr")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### 3.2 Product Model — Additional Fields

```prisma
model Product {
  // ... existing fields ...
  
  // Workflow
  status          String   @default("draft") // draft, review, approved, scheduled, published, archived
  workflow        ProductWorkflow?
  
  // Luxury
  luxury          ProductLuxury?
  
  // Shipping
  shipping        ProductShipping?
  
  // SEO
  seo             ProductSeo?
  
  // Content
  content         ProductContent?
  
  // Analytics
  analytics       ProductAnalytics?
  
  // FAQs
  faqs            ProductFaq[]
  
  // Variants (size × color)
  variants        ProductVariant[]
  
  // Virtual Try-On
  tryOnJobs       AiTryOnJob[]
  
  // 360 Viewer
  viewer360       Viewer360Asset?
  
  // Payment Rules
  paymentRules    PaymentRule[]
  
  // AI Generated Content Tracking
  aiGeneratedFields Json? // { metaTitle: true, metaDescription: false, story: true, ... }
}
```

---

## 4. API Layer — SectionAPI Extensions

```javascript
// admin-new/js/services/integration/sections/products.js

export const ProductAPI = {
  // CRUD
  list: (params) => apiService.getWithCache('/products', { params, tags: ['products'] }),
  get: (id) => apiService.getWithCache(`/products/${id}`, { tags: ['products'] }),
  create: (data) => apiService.mutateWithOfflineSupport('/products', 'POST', data, { 
    tags: ['products', 'dashboard', 'search-index'] 
  }),
  update: (id, data) => apiService.mutateWithOfflineSupport(`/products/${id}`, 'PUT', data, { 
    tags: ['products', 'dashboard', 'search-index'] 
  }),
  delete: (id) => apiService.mutateWithOfflineSupport(`/products/${id}`, 'DELETE', null, { 
    tags: ['products', 'dashboard', 'search-index'] 
  }),

  // Variants
  getVariants: (productId) => apiService.getWithCache(`/products/${productId}/variants`, { tags: ['products'] }),
  createVariant: (productId, data) => apiService.mutateWithOfflineSupport(`/products/${productId}/variants`, 'POST', data, { tags: ['products'] }),
  updateVariant: (productId, variantId, data) => apiService.mutateWithOfflineSupport(`/products/${productId}/variants/${variantId}`, 'PUT', data, { tags: ['products'] }),
  deleteVariant: (productId, variantId) => apiService.mutateWithOfflineSupport(`/products/${productId}/variants/${variantId}`, 'DELETE', null, { tags: ['products'] }),
  reorderVariants: (productId, orderedIds) => apiService.mutateWithOfflineSupport(`/products/${productId}/variants/reorder`, 'POST', { orderedIds }, { tags: ['products'] }),

  // Media
  uploadMainImage: (productId, file) => apiService.client.upload(`/products/${productId}/images/main`, file),
  uploadGalleryImages: (productId, files) => apiService.client.upload(`/products/${productId}/images/gallery`, files),
  deleteImage: (productId, imageId) => apiService.mutateWithOfflineSupport(`/products/${productId}/images/${imageId}`, 'DELETE', null, { tags: ['products'] }),
  setMainImage: (productId, imageId) => apiService.mutateWithOfflineSupport(`/products/${productId}/images/main`, 'PUT', { imageId }, { tags: ['products'] }),
  reorderGallery: (productId, orderedIds) => apiService.mutateWithOfflineSupport(`/products/${productId}/images/gallery/reorder`, 'POST', { orderedIds }, { tags: ['products'] }),

  // 360° Viewer
  get360Asset: (productId) => apiService.getWithCache(`/products/${productId}/viewer360`, { tags: ['products'] }),
  upload360Frames: (productId, files) => apiService.client.upload(`/products/${productId}/viewer360/frames`, files),
  update360Config: (productId, config) => apiService.mutateWithOfflineSupport(`/products/${productId}/viewer360/config`, 'PUT', config, { tags: ['products'] }),
  delete360Asset: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/viewer360`, 'DELETE', null, { tags: ['products'] }),

  // Virtual Try-On
  getTryOnJob: (productId) => apiService.getWithCache(`/products/${productId}/tryon`, { tags: ['products'] }),
  uploadTryOnAssets: (productId, files) => apiService.client.upload(`/products/${productId}/tryon/assets`, files),
  updateTryOnConfig: (productId, config) => apiService.mutateWithOfflineSupport(`/products/${productId}/tryon/config`, 'PUT', config, { tags: ['products'] }),

  // Inventory (variant-level)
  getInventory: (productId) => apiService.getWithCache(`/products/${productId}/inventory`, { tags: ['inventory'] }),
  adjustStock: (variantId, adjustment) => apiService.mutateWithOfflineSupport(`/variants/${variantId}/stock/adjust`, 'POST', adjustment, { tags: ['inventory', 'products'] }),
  getStockMovements: (variantId) => apiService.getWithCache(`/variants/${variantId}/stock/movements`, { tags: ['inventory'] }),

  // Payment Rules
  getPaymentRules: (productId) => apiService.getWithCache(`/products/${productId}/payment-rules`, { tags: ['payments'] }),
  updatePaymentRules: (productId, rules) => apiService.mutateWithOfflineSupport(`/products/${productId}/payment-rules`, 'PUT', rules, { tags: ['payments', 'products'] }),

  // Shipping
  getShipping: (productId) => apiService.getWithCache(`/products/${productId}/shipping`, { tags: ['products'] }),
  updateShipping: (productId, data) => apiService.mutateWithOfflineSupport(`/products/${productId}/shipping`, 'PUT', data, { tags: ['products'] }),

  // SEO
  getSeo: (productId) => apiService.getWithCache(`/products/${productId}/seo`, { tags: ['products', 'seo'] }),
  generateSeo: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/seo/generate`, 'POST', {}, { tags: ['products', 'seo'] }),
  updateSeo: (productId, data) => apiService.mutateWithOfflineSupport(`/products/${productId}/seo`, 'PUT', data, { tags: ['products', 'seo'] }),

  // Content
  getContent: (productId) => apiService.getWithCache(`/products/${productId}/content`, { tags: ['products'] }),
  updateContent: (productId, data) => apiService.mutateWithOfflineSupport(`/products/${productId}/content`, 'PUT', data, { tags: ['products'] }),

  // Luxury
  getLuxury: (productId) => apiService.getWithCache(`/products/${productId}/luxury`, { tags: ['products'] }),
  updateLuxury: (productId, data) => apiService.mutateWithOfflineSupport(`/products/${productId}/luxury`, 'PUT', data, { tags: ['products'] }),

  // FAQ
  getFaqs: (productId) => apiService.getWithCache(`/products/${productId}/faqs`, { tags: ['products'] }),
  createFaq: (productId, data) => apiService.mutateWithOfflineSupport(`/products/${productId}/faqs`, 'POST', data, { tags: ['products'] }),
  updateFaq: (productId, faqId, data) => apiService.mutateWithOfflineSupport(`/products/${productId}/faqs/${faqId}`, 'PUT', data, { tags: ['products'] }),
  deleteFaq: (productId, faqId) => apiService.mutateWithOfflineSupport(`/products/${productId}/faqs/${faqId}`, 'DELETE', null, { tags: ['products'] }),

  // Analytics
  getAnalytics: (productId) => apiService.getWithCache(`/products/${productId}/analytics`, { tags: ['analytics'] }),

  // Workflow
  getWorkflow: (productId) => apiService.getWithCache(`/products/${productId}/workflow`, { tags: ['products'] }),
  submitForReview: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/workflow/submit`, 'POST', {}, { tags: ['products'] }),
  approve: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/workflow/approve`, 'POST', {}, { tags: ['products'] }),
  reject: (productId, reason) => apiService.mutateWithOfflineSupport(`/products/${productId}/workflow/reject`, 'POST', { reason }, { tags: ['products'] }),
  schedulePublish: (productId, date) => apiService.mutateWithOfflineSupport(`/products/${productId}/workflow/schedule`, 'POST', { scheduledAt: date }, { tags: ['products'] }),
  publish: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/workflow/publish`, 'POST', {}, { tags: ['products', 'search-index', 'sitemap'] }),
  archive: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/workflow/archive`, 'POST', {}, { tags: ['products', 'search-index', 'sitemap'] }),

  // AI Generators
  generateMetaTitle: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/ai/meta-title`, 'POST', {}, { tags: ['products'] }),
  generateMetaDescription: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/ai/meta-description`, 'POST', {}, { tags: ['products'] }),
  generateProductStory: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/ai/story`, 'POST', {}, { tags: ['products'] }),
  generateAltText: (productId, imageId) => apiService.mutateWithOfflineSupport(`/products/${productId}/ai/alt-text`, 'POST', { imageId }, { tags: ['products'] }),
  generateLuxuryCopy: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/ai/luxury-copy`, 'POST', {}, { tags: ['products'] }),

  // Import/Export
  export: (params) => apiService.client.get('/products/export', { params, responseType: 'blob' }),
  import: (file) => apiService.client.upload('/products/import', file),
  bulkUpdate: (ids, data) => apiService.mutateWithOfflineSupport('/products/bulk', 'PATCH', { ids, data }, { tags: ['products'] }),
  duplicate: (productId) => apiService.mutateWithOfflineSupport(`/products/${productId}/duplicate`, 'POST', {}, { tags: ['products'] }),
};
```

---

## 5. UI Component Architecture

### 5.1 Product Editor — Tab Structure

```jsx
// admin-new/js/sections/products-elite.js

const TABS = [
  { id: 'general', label: 'Osnovni podaci', icon: 'info', required: true },
  { id: 'media', label: 'Mediji', icon: 'image', required: true },
  { id: 'variants', label: 'Variantе', icon: 'grid', required: true },
  { id: '360', label: '360° Pregled', icon: 'rotate-3d' },
  { id: 'vto', label: 'Virtualno Probanje', icon: 'user-check' },
  { id: 'pricing', label: 'Cene i Promocije', icon: 'tag' },
  { id: 'payments', label: 'Načini Plaćanja', icon: 'credit-card' },
  { id: 'inventory', label: 'Inventar', icon: 'package' },
  { id: 'shipping', label: 'Dostava', icon: 'truck' },
  { id: 'seo', label: 'SEO', icon: 'search' },
  { id: 'content', label: 'Priča i Detalji', icon: 'book-open' },
  { id: 'luxury', label: 'Luksuzne Opcije', icon: 'gem' },
  { id: 'faq', label: 'FAQ', icon: 'help-circle' },
  { id: 'analytics', label: 'Analitika', icon: 'bar-chart' },
  { id: 'workflow', label: 'Radni Tok', icon: 'git-branch' },
  { id: 'ai', label: 'AI Asistent', icon: 'bot' },
  { id: 'settings', label: 'Postavke', icon: 'settings' },
];

const ProductEditor = ({ productId, mode }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [dirtyTabs, setDirtyTabs] = useState(new Set());
  const [product, setProduct] = useState(null);
  
  // Auto-save draft every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyTabs.size > 0) saveDraft();
    }, 30000);
    return () => clearInterval(interval);
  }, [dirtyTabs]);

  return (
    <div className="product-editor">
      <EditorHeader product={product} onSave={saveAll} onPublish={publish} workflow={workflow} />
      <TabNavigation tabs={TABS} activeTab={activeTab} onChange={setActiveTab} dirtyTabs={dirtyTabs} />
      <TabPanels activeTab={activeTab} product={product} onChange={markDirty} />
    </div>
  );
};
```

### 5.2 Key Components Needed

| Component | Purpose | Status |
|-----------|---------|--------|
| `MediaManager` | Drag-drop upload, gallery grid, alt text per image, OG image picker, crop/focal point | 🟡 Partial (widget exists) |
| `VariantMatrix` | Size×color grid with inline stock/price editing, bulk actions, import/export CSV | 🔴 New |
| `Viewer360Editor` | Frame uploader (24+), WebGL preview, spin config (fps, direction, autoplay) | 🔴 New |
| `TryOnAssetManager` | Model type selector, front/back/detail upload, eligibility rules, preview | 🔴 New |
| `PaymentRuleEditor` | Auto-populated crypto currencies, fiat methods from config, per-product toggles | 🔴 New |
| `ShippingEditor` | Restrictions, regional availability, express, dimensional weight, packaging | 🔴 New |
| `SEOPanel` | Auto-generate buttons (wire widgets), live preview (Google/Social), JSON-LD viewer | 🟡 Partial |
| `ContentEditor` | Rich text for Story, Craftsmanship, Materials, Care, Warranty, Size Guide, Sustainability | 🔴 New |
| `LuxuryPanel` | All luxury toggles, edition numbering, certificate, packaging, concierge | 🔴 New |
| `FaqBuilder` | Accordion list, add/edit/delete, reorder, per-locale | 🔴 New |
| `AnalyticsDashboard` | Views, wishlist, cart, conversion, revenue, returns — charts + tables | 🟡 Partial |
| `WorkflowEngine` | State machine UI, scheduler, publish queue, approval workflow | 🟡 Partial |
| `AIGeneratorPanel` | Buttons for each generator, preview diff, accept/reject, mark AI-generated | 🟡 Partial |

---

## 6. AI Generators Specification

Each generator is a widget with consistent interface:

```javascript
// admin-new/widgets/ai-generators.js

export const AIGenerators = {
  metaTitle: {
    label: 'Meta Title',
    prompt: (product) => `Write a compelling SEO meta title (max 60 chars) for luxury product: ${product.name}. Brand: DALLI. Collection: ${product.collection}. Category: ${product.category}. Key features: ${product.material}. Tone: elegant, premium.`,
    maxTokens: 80,
    temperature: 0.7,
    validate: (text) => text.length <= 60,
  },
  metaDescription: {
    label: 'Meta Description',
    prompt: (product) => `Write an SEO meta description (max 155 chars) for: ${product.name}. ${product.shortDescription}. Include: free shipping >5000 RSD, 15% crypto discount, 30-day returns. Tone: persuasive, luxury.`,
    maxTokens: 120,
    temperature: 0.7,
    validate: (text) => text.length <= 155,
  },
  productStory: {
    label: 'Product Story',
    prompt: (product) => `Write a luxury product story (150-300 words) for ${product.name}, a ${product.category} from DALLI ${product.collection}. Materials: ${product.material}. Style occasions: ${product.styleOccasion?.join(', ')}. Focus on heritage, craftsmanship, emotional connection. Serbian language.`,
    maxTokens: 400,
    temperature: 0.8,
    validate: (text) => text.length >= 100,
  },
  altText: {
    label: 'Alt Text',
    prompt: (product, imageContext) => `Write concise alt text (max 125 chars) for product image: ${product.name}, ${product.category}. Context: ${imageContext}. Include: color, material, key visual detail. Serbian.`,
    maxTokens: 60,
    temperature: 0.5,
    validate: (text) => text.length <= 125,
  },
  luxuryCopy: {
    label: 'Luxury Marketing Copy',
    prompt: (product) => `Write premium marketing copy for ${product.name} (DALLI ${product.collection}). Highlight: exclusivity, craftsmanship, materials (${product.material}), investment value. Target: affluent buyers. Serbian. 3 variants: short (50w), medium (150w), long (300w).`,
    maxTokens: 600,
    temperature: 0.8,
    validate: (text) => text.length >= 50,
  },
};
```

**Integration:** Each generator button in editor calls `/products/:id/ai/*` endpoint, returns generated text, shows diff modal, user accepts → fills field + marks `aiGeneratedFields.{field}=true`.

---

## 7. Workflow State Machine

```
┌────────┐     submit      ┌─────────┐     approve     ┌──────────┐
│ DRAFT  │ ──────────────► │ REVIEW  │ ──────────────► │ APPROVED │
└────────┘                 └─────────┘                 └──────────┘
    ▲                         │    │  reject            │
    │                         │    ▼                    │
    │                    ┌─────────┐                    │
    │                    │ REJECTED│                    │
    │                    └─────────┘                    │
    │                         │                        │
    │              schedule   │              schedule  │
    └─────────────────────────┼────────────────────────┘
                              │
                              ▼
                        ┌───────────┐
                        │ SCHEDULED │
                        └───────────┘
                              │
                     publishAt
                              │
                              ▼
                        ┌───────────┐
                        │ PUBLISHED │
                        └───────────┘
                              │
                        archive
                              │
                              ▼
                        ┌──────────┐
                        │ ARCHIVED │
                        └──────────┘
```

**Transitions:**
- `draft → review` — Editor submits; notifies reviewers
- `review → approved` — Approver approves; auto-generates SEO, sitemap entry
- `review → rejected` — Returns to draft with notes
- `approved → scheduled` — Set `scheduledPublishAt`; enters publish queue
- `scheduled → published` — Cron job at scheduled time; triggers search index, sitemap, cache purge
- `published → archived` — Soft delete; removes from search, sitemap
- `archived → draft` — Restore for rework

---

## 8. Migration Strategy

See `SOURCE_OF_TRUTH_MIGRATION_PLAN.md` for detailed cutover plan.

---

## 9. Success Criteria

| Metric | Target |
|--------|--------|
| Time to create luxury product | < 15 min (vs 45 min manual JSON) |
| SEO auto-generation accuracy | > 95% no manual edits needed |
| 360/VTO upload success rate | 100% (validation prevents errors) |
| Crypto currency sync | Real-time from provider config |
| Workflow compliance | 100% products follow state machine |
| Search index lag | < 30 sec after publish |
| Sitemap update lag | < 60 sec after publish |
| Zero JSON editing | All fields via UI |
| Audit trail coverage | 100% product changes logged |

---

## 10. Implementation Phases

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1: Schema & API** | Week 1 | Prisma migrations, API endpoints, migration script |
| **Phase 2: Core Editor** | Weeks 2-3 | Tabbed editor, media manager, variant matrix, basic tabs |
| **Phase 3: Luxury Features** | Week 3 | 360, VTO, luxury panel, content tabs, shipping, payments |
| **Phase 4: SEO & AI** | Week 4 | SEO panel, AI generators, auto-generation on publish |
| **Phase 5: Workflow & Analytics** | Week 4 | State machine, scheduler, analytics dashboard |
| **Phase 5: Migration & Cutover** | Week 5 | Import script, parallel run, DNS cutover, retirement |

**Total: ~5 weeks to production-ready Elite Platform.**