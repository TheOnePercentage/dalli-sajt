# SOURCE OF TRUTH MIGRATION PLAN
## From products.json / Netlify CMS → Admin-New (Prisma + PostgreSQL)

**Version:** 1.0  
**Date:** 2026-10-09  
**Status:** Ready for Execution

---

## 1. Current State Analysis

### 1.1 Sources of Truth (Current)

| Source | Role | Data | Update Mechanism |
|--------|------|------|------------------|
| `data/products.json` | **Primary catalog** | 23 products, full hierarchy, SEO, inventory, media, luxury flags | Manual edit + `generate-products.cjs` |
| `data/collections.json` | Collection metadata | 12 collections, types, dates | Manual edit |
| `data/categories.json` | Category tree | 11 categories + subcategories | Manual edit |
| Netlify CMS (`admin/`) | Content editing | Blog, pages, some product fields | Git-based, disconnected from products.json |
| `public/data/products.json` | Storefront read | Copy of products.json (stale) | Manual copy |
| Prisma/PostgreSQL | Transactional | Orders, users, reviews, loyalty, inventory | Live |

### 1.2 Problems

1. **Dual write risk** — `products.json` edited manually, Prisma edited via API
2. **Netlify CMS disconnected** — Cannot edit product catalog; only blog/pages
3. **Stale public copy** — `public/data/products.json` manually copied, often outdated
4. **No workflow** — Direct JSON edit = instant production change
5. **No audit trail** — Who changed what, when?
6. **Generate step required** — `npm run build:prod` regenerates static pages from JSON
7. **No validation** — JSON syntax errors break build
8. **No preview** — Cannot preview product before publish

---

## 2. Target State

### 2.2 Single Source of Truth: Admin-New + Prisma/PostgreSQL

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN-NEW (React)                         │
│  Product Editor → Prisma API → PostgreSQL                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  EVENT BUS / WEBHOOK │
                    └─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ Search Index │ │  Sitemap     │ │ Static Pages │
      │ (Meilisearch)│ │  Generator   │ │  (on-demand) │
      └──────────────┘ └──────────────┘ └──────────────┘
              │               │               │
              ▼               ▼               ▼
      ┌─────────────────────────────────────────┐
      │           STOREFRONT (Vite)              │
      │  Reads from Search API / Prisma API      │
      └─────────────────────────────────────────┘
```

**All catalog data lives in PostgreSQL. Admin-New is the exclusive writer. Read paths fan out via events.**

---

## 3. Migration Phases

### Phase 0: Preparation (Week 0) — ✅ COMPLETE
- [x] Prisma schema designed with all required models
- [x] Admin-New API layer exists (`SectionAPI.products`, `ProductAPI`)
- [x] Admin-New product sections exist (`products.js`, `products-cms.js`)
- [x] Gap analysis complete
- [x] Blueprint & editor specification done

### Phase 1: Schema Migration & Data Import (Week 1)

#### 1.1 Prisma Migrations
```bash
# Run in admin-new/ or project root
npx prisma migrate dev --name add_product_management_platform
```

**New tables created:**
- `ProductVariant`, `ProductLuxury`, `ProductShipping`, `ProductSeo`, `ProductFaq`, `ProductWorkflow`, `ProductAnalytics`, `ProductContent`, `Viewer360Asset`, `AiTryOnJob`, `CategorySeo`, `Redirect` (if missing)

#### 1.2 Import Script: `scripts/migrate-products-json-to-prisma.ts`

```typescript
// Key mapping logic:
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function migrate() {
  const raw = fs.readFileSync('data/products.json', 'utf8');
  const { products } = JSON.parse(raw);

  for (const p of products) {
    // 1. Upsert Collection
    const collection = await prisma.collection.upsert({
      where: { slug: p.collection },
      create: { slug: p.collection, title: p.collection === 'casual' ? 'CASUAL' : 'ELEGANCE', isActive: true },
      update: {},
    });

    // 2. Upsert Category
    const category = await prisma.category.upsert({
      where: { slug: p.category },
      create: { slug: p.category, name: p.categoryLabel, isActive: true },
      update: {},
    });

    // 3. Upsert Genders
    const genders = Array.isArray(p.gender) ? p.gender : [p.gender];
    for (const g of genders) {
      await prisma.gender.upsert({
        where: { id: g },
        create: { id: g, slug: g, title: g.charAt(0).toUpperCase() + g.slice(1), enabled: true },
        update: {},
      });
    }

    // 4. Upsert StyleOccasions
    for (const so of p.styleOccasion || []) {
      await prisma.styleOccasion.upsert({
        where: { id: so },
        create: { id: so, slug: so, title: so, enabled: true },
        update: {},
      });
    }

    // 5. Create Product
    const product = await prisma.product.create({
      data: {
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        description: p.description,
        shortDescription: p.shortDescription,
        price: Math.round(p.price * 100), // RSD → cents
        salePrice: p.salePrice ? Math.round(p.salePrice * 100) : null,
        currency: p.currency || 'RSD',
        brand: 'DALLI',
        images: p.images, // { main, gallery[], variants{} }
        metadata: {
          specifications: p.specifications,
          breadcrumbs: p.breadcrumbs,
          structuredData: p.structuredData,
          cms: p.cms,
          loyalty: p.loyalty,
          hierarchyPaths: p.hierarchyPaths,
          primaryHierarchy: p.primaryHierarchy,
        },
        collectionId: collection.id,
        categoryId: category.id,
        status: p.cms?.status || 'draft',
        featured: p.cms?.featured || false,
        bestseller: p.cms?.bestseller || false,
        newArrival: p.cms?.newArrival || false,
        priority: p.cms?.priority || 0,
        publishedAt: p.cms?.status === 'published' ? new Date(p.cms.publishedAt || p.cms.updatedAt) : null,
        metaTitle: p.seo?.metaTitle,
        metaDescription: p.seo?.metaDescription,
        metaKeywords: p.seo?.keywords || [],
        altText: p.altText,
        viewCount: p.cms?.viewCount || 0,
        salesCount: p.cms?.salesCount || 0,
        cartAddCount: p.cms?.cartAddCount || 0,
        searchKeywords: p.cms?.searchKeywords || [],
        
        // Relations
        genders: { create: genders.map(g => ({ genderId: g })) },
        styleOccasions: { create: (p.styleOccasion || []).map(so => ({ styleOccasionId: so })) },
        colors: { create: (p.colors || []).map((c, i) => ({ name: c.name, hex: c.hex, sortOrder: i })) },
        sizes: { create: (p.sizes || []).map((s, i) => ({ name: s.size, sortOrder: i })) },
        
        // Variants (size × color)
        variants: {
          create: (p.sizes || []).flatMap(sz => 
            (p.colors || []).map(c => ({
              colorId: 0, // will update after color create
              sizeId: 0,  // will update after size create
              sku: `${p.sku}-${c.name.substring(0,3).toUpperCase()}-${sz.size}`,
              price: p.price,
              salePrice: p.salePrice,
              stock: sz.stock,
            }))
          ),
        },

        // Inventory per size
        // ... (link via ProductSize → Inventory)
      },
    });

    // 6. Update variant colorId/sizeId after create (requires 2-pass)
    // 7. Create Inventory records per variant
    // 8. Create ProductSeo, ProductContent, ProductLuxury, ProductShipping, ProductWorkflow, ProductAnalytics
    // 9. Create Viewer360Asset if p.cms.product360.enabled
    // 10. Create AiTryOnJob if p.cms.virtualTryOn.eligible
    // 11. Create ProductFaq from p.faq
    // 12. Create PaymentRules from p.loyalty / crypto config
  }
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
```

#### 1.3 Verification
```bash
# Count verification
npx prisma db execute --stdin <<'SQL'
SELECT 'products' as table, count(*) FROM "Product"
UNION ALL SELECT 'variants', count(*) FROM "ProductVariant"
UNION ALL SELECT 'colors', count(*) FROM "ProductColor"
UNION ALL SELECT 'sizes', count(*) FROM "ProductSize"
UNION ALL SELECT 'inventory', count(*) FROM "Inventory"
UNION ALL SELECT 'luxury', count(*) FROM "ProductLuxury"
UNION ALL SELECT 'seo', count(*) FROM "ProductSeo"
UNION ALL SELECT 'content', count(*) FROM "ProductContent"
UNION ALL SELECT 'shipping', count(*) FROM "ProductShipping"
UNION ALL SELECT 'faqs', count(*) FROM "ProductFaq"
UNION ALL SELECT 'workflow', count(*) FROM "ProductWorkflow"
UNION ALL SELECT 'analytics', count(*) FROM "ProductAnalytics";
SQL
```

**Expected:** 23 products, ~500 variants, 23 of each extended table.

### Phase 2: Admin-New Editor Completion (Weeks 2-4)

See `PRODUCT_EDITOR_SPECIFICATION.md` and `PRODUCT_MANAGEMENT_BLUEPRINT.md` for detailed implementation.

**Key milestones:**
- Week 2: Core editor tabs (General, Media, Variants, Pricing, SEO) functional
- Week 3: Luxury tabs (360, VTO, Luxury, Content, Shipping, Payments, FAQ)
- Week 4: Workflow engine, AI generators, Analytics, final polish

### Phase 3: Event-Driven Fan-Out (Week 4)

#### 3.1 Product Events
```typescript
// admin-new/js/services/events.js
export const ProductEvents = {
  created: 'product.created',
  updated: 'product.updated',
  published: 'product.published',
  archived: 'product.archived',
  statusChanged: 'product.status_changed',
};

// Emit in ProductAPI.publish(), archive(), status change
```

#### 3.2 Consumers
| Consumer | Trigger | Action |
|----------|---------|--------|
| Search Indexer | `product.published`, `product.updated`, `product.archived` | Upsert/delete Meilisearch document |
| Sitemap Generator | `product.published`, `product.archived` | Regenerate `sitemap.xml` |
| Static Page Generator | `product.published` | Generate/Update `/{collection}/{gender}/{category}/{slug}.html` |
| Cache Purge | `product.published`, `product.updated`, `product.archived` | Purge CDN/Cloudflare for product URLs |
| Analytics Rollup | `product.published` | Initialize `ProductAnalytics` row |

#### 3.3 Search Index Document Shape
```json
{
  "id": "product:123",
  "type": "product",
  "slug": "osnovna-majica",
  "name": "Osnovna Majica",
  "collection": "casual",
  "gender": ["men", "women"],
  "category": "t-shirts",
  "price": 129000,
  "salePrice": null,
  "currency": "RSD",
  "images": { "main": "/images/majica.svg", "gallery": [] },
  "colors": ["Bela", "Crna", "Navy", "Siva"],
  "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
  "styleOccasion": ["everyday", "luxury-essentials", "travel", "smart-casual"],
  "status": "published",
  "featured": true,
  "bestseller": false,
  "priority": 10,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2026-10-09T12:00:00Z"
}
```

### Phase 4: Parallel Run & Validation (Week 5)

#### 4.1 Dual-Write Period (2 weeks)
- Admin-New writes to **both** Prisma AND `data/products.json` (sync script)
- Storefront reads from Prisma via API (new) — JSON for fallback
- Compare outputs: generated pages, search results, sitemap
- Automated diff: `npm run compare:catalog`

#### 4.2 Validation Checklist
| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Product count match | `SELECT count(*) FROM Product` vs `products.json.length` | Equal |
| All slugs unique | `SELECT slug, count(*) FROM Product GROUP BY slug HAVING count(*) > 1` | 0 rows |
| All variants have inventory | `SELECT count(*) FROM ProductVariant v LEFT JOIN Inventory i ON v.id = i.productSizeId WHERE i.id IS NULL` | 0 rows |
| SEO fields populated | `SELECT count(*) FROM ProductSeo WHERE metaTitle IS NOT NULL` | = product count |
| Luxury data migrated | `SELECT count(*) FROM ProductLuxury` | = product count |
| Search index count | Meilisearch stats | = published products |
| Sitemap URLs | `grep -c "<loc>" dist/sitemap.xml` | ≥ expected |
| Static pages generated | `find dist -name "*.html" | wc -l` | ≥ expected |

### Phase 5: Cutover (Week 5, Day 10)

#### 5.1 Cutover Steps
```bash
# 1. Freeze products.json edits (announce to team)
# 2. Final sync Prisma ← products.json (if any stragglers)
# 3. Switch storefront API to Prisma-only
# 4. Disable Netlify CMS product collections
# 5. Remove products.json from build pipeline
# 6. Update CI/CD to use Admin-New as source
# 7. Deploy
```

#### 5.2 Code Changes for Cutover

**Storefront API (`server/src/routes/api.js`):**
```javascript
// BEFORE: reads data/products.json
// AFTER: reads from Prisma
app.get('/api/products', async (req, res) => {
  const products = await prisma.product.findMany({
    where: { status: 'published' },
    include: { colors: true, sizes: true, collection: true, category: true, genders: true },
  });
  res.json({ products });
});
```

**Build Script (`scripts/build.cjs`):**
```javascript
// REMOVE: generate-products.cjs, generate-collection-pages.cjs
// KEEP: generate-sitemap.cjs (now reads from Prisma)
// KEEP: inject-islands.cjs
// KEEP: validate-dist.cjs
```

**CI/CD (`.github/workflows/deploy.yml`):**
```yaml
# Add: npx prisma migrate deploy
# Remove: node scripts/generate-products.cjs
# Add: npm run build:admin-new (builds admin panel)
```

#### 5.3 Rollback Plan
- Keep `data/products.json` read-only for 30 days
- Feature flag: `USE_PRISMA_CATALOG=true/false`
- If critical issues: flip flag, redeploy (5 min)

### Phase 6: Post-Cutover Cleanup (Week 6)

- Delete `data/products.json`, `data/collections.json`, `data/categories.json`
- Remove `public/data/products.json`
- Remove Netlify CMS config (`admin/config.yml` product collections)
- Remove `generate-products.cjs`, `generate-collection-pages.cjs`, `generate-category-pages.cjs`
- Remove `scripts/validate-html.cjs` (validate against Prisma)
- Update documentation, README
- Archive migration scripts

---

## 4. Risk Assessment & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during import | Low | Critical | Dry-run on staging, verification queries, backup DB |
| Import script bugs | Medium | High | Unit tests for each mapping, staged import (10 products first) |
| Admin-New editor incomplete | Medium | High | Phase-gated: no cutover until all required tabs working |
| Search index lag | Low | Medium | Async event processing, monitor queue depth |
| Sitemap stale | Low | Medium | Event-driven regeneration, verify in validation |
| Storefront API regression | Medium | High | Parallel run with feature flag, automated diff tests |
| Team adoption | Medium | Medium | Training sessions, admin panel tour, cheat sheets |
| Performance regression | Low | Medium | Load test Prisma API, add indexes as needed |

---

## 5. Rollback Criteria

**Auto-rollback if any:**
- > 5% product pages return 404/500 post-deploy
- Search returns 0 results for known queries
- Sitemap missing > 10% expected URLs
- Admin-New editor crashes on product open
- Database migration fails (auto-rollback via Prisma)

---

## 6. Timeline Summary

| Week | Focus | Deliverable |
|------|-------|-------------|
| 0 | Prep | Gap analysis, blueprint, spec, migration plan ✅ |
| 1 | Schema + Import | Prisma migrations, import script, verification |
| 2 | Editor Core | General, Media, Variants, Pricing, SEO tabs |
| 3 | Editor Luxury | 360, VTO, Content, Luxury, Shipping, Payments, FAQ |
| 4 | Workflow + AI | State machine, scheduler, generators, analytics |
| 5 | Parallel Run | Dual-write, validation, diff testing |
| 5D10 | Cutover | Switch to Prisma-only, disable JSON/Netlify CMS |
| 6 | Cleanup | Remove legacy code, docs, archive |

**Total: 6 weeks to Single Source of Truth.**

---

## 7. Success Metrics (Post-Cutover, 30 Days)

| Metric | Target |
|--------|--------|
| Time to publish new product | < 15 min |
| Products with missing SEO | 0% |
| Products with 360/VTO | > 80% eligible |
| Crypto currencies auto-synced | 100% |
| Workflow compliance | 100% |
| Search index freshness | < 30 sec |
| Sitemap freshness | < 60 sec |
| Zero JSON edits | Enforced by CI |
| Audit trail coverage | 100% changes logged |

---

## 8. Team Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Backend Lead** | Prisma migrations, import script, API endpoints, event consumers |
| **Frontend Lead** | Admin-New editor tabs, components, validation, AI integration |
| **DevOps** | CI/CD updates, feature flags, monitoring, rollback automation |
| **QA** | Validation checklist, parallel run diff, accessibility, performance |
| **Content/Marketing** | Admin-New training, luxury content guidelines, workflow SOP |
| **Product Owner** | Acceptance criteria, go/no-go for cutover, stakeholder communication |

---

## Appendix A: Import Script Complete

See `scripts/migrate-products-json-to-prisma.ts` (to be created).

## Appendix B: Feature Flag Config

```javascript
// config/features.js
export const FEATURES = {
  USE_PRISMA_CATALOG: process.env.USE_PRISMA_CATALOG === 'true', // default false during parallel
  ENABLE_ADMIN_NEW_EDITOR: true,
  ENABLE_NETLIFY_CMS_PRODUCTS: false, // disable product collections
  AUTO_SYNC_JSON: process.env.AUTO_SYNC_JSON === 'true', // dual-write during parallel
};
```

## Appendix C: Netlify CMS Decommission

```yaml
# admin/config.yml — REMOVE these collections:
collections:
  - name: "products"
  - name: "collections"
  - name: "categories"
# KEEP:
collections:
  - name: "blog"
  - name: "pages"
  - name: "settings"
```

---

**End of Migration Plan**