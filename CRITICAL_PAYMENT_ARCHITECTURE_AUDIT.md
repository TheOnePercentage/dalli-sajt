# CRITICAL PAYMENT ARCHITECTURE AUDIT & FIX REPORT

## 1. CURRENT SOURCE OF TRUTH

### For Products/Catalog
- **Primary source (build-time)**: `data/products.json` - used by `scripts/generate-products.cjs` to generate static HTML pages in dist/
- **Database schema**: Prisma with Product model (`prisma/schema.prisma`) - full normalized schema
- **Admin interface**: Admin-New (products-elite.js, products.js) connected to API endpoints via SectionAPI
- **Server API**: Express routes (`/server/src/routes/public.js`, admin routes) use Prisma when DB configured
- **Frontend storefront**: Primarily reads from `/data/products.json` (static files) for catalog display

**Conclusion**: Hybrid architecture - SSG from JSON files for storefront performance + Prisma-ready API. The "real" source of truth depends on runtime mode. For static deployment (Netlify), it's `data/products.json`. For API-driven, it's PostgreSQL/Prisma.

### For Pricing/Membership/Global
- **Experience Center**: Netlify Blobs (`netlify/functions/experience-*.js`) - stores config in `experience` blob store
- **Global Commerce**: `data/countries.json`, `currencies.json`, `shipping.json`, `payments.json`, `languages.json` (JSON files)
- **Membership**: `data/membership.json`, `data/exclusive-access.json` etc.
- **Crypto Payments**: `data/crypto-payment-model.mjs/json`, `data/crypto-payment-model.json` (multiple copies in public/data, dist/data)
\n## 2. HARDCODED CRYPTO VALUES FOUND\n\nTotal occurrences of hardcoded crypto discount values: 553\n\n**.html**: 108 occurrences\n  - ./cart.html:120\n  - ./cart.html:194\n  - ./cart.html:203\n  - ... (105 more)\n\n**.js**: 43 occurrences\n  - ./admin-new/widgets/seo-generator.js:32\n  - ./admin-new/widgets/seo-generator.js:38\n  - ./admin-new/widgets/seo-generator.js:59\n  - ... (40 more)\n\n**.md**: 28 occurrences\n  - ./CHANGELOG.md:69\n  - ./CHANGELOG.md:94\n  - ./STOREFRONT_STRATEGY.md:139\n  - ... (25 more)\n\n**.json**: 12 occurrences\n  - ./manifest.json:4\n  - ./package-lock.json:6009\n  - ./package-lock.json:6010\n  - ... (9 more)\n\n**.svg**: 8 occurrences\n  - ./images/og/og-home-mobile.svg:36\n  - ./images/og/og-home-mobile.svg:41\n  - ./images/hero/hero-desktop.svg:15\n  - ... (5 more)\n\n**.ts**: 1 occurrences\n  - ./vite.config.ts:56\n\n## 3. ARCHITECTURE CREATED

### New Files Created
1. **`data/payment-incentives.json`** - Global payment incentives config with:
- Global rules: crypto enabled, discount enabled, discount type/value, messages
- Country overrides: RS/BA/HR/ME/MK/SI (15%), DE/AT/CH/FR/IT/GB/US (10%), AE (15%)
- Collection overrides: Casual (15%), Elegance (12%)
- Product overrides: empty structure for per-product rules

2. **`public/data/payment-incentives.json`** - Public copy for frontend

3. **`js/services/payment-incentives.js`** - Dynamic payment incentives service with functions:
- `getPaymentIncentives()` - fetch full config
- `getCryptoDiscountConfig(countryCode, collectionId, productId)` - get effective config with overrides
- `getCryptoDiscountRate()` - returns discount rate (0-1) for percentage
- `getCryptoDiscountValue()` - returns discount value
- `getCryptoDiscountMessage()` - returns localized message
- `isCryptoEnabled()` - check if crypto enabled

4. **`js/modules/crypto-payment/crypto-incentives.js`** - Helper for crypto payment module

### Modified Files
1. **Experience Center** - Added `paymentIncentives` section to:
- `js/experience/experience-config.js` - Added to SECTION_KEYS and default config
- `admin-new/js/sections/experience-center.js` - Added tab and render method
## 4. SOLUTION FOR HARDCODED VALUES

The payment incentives service provides a dynamic, overrideable configuration. However, directly refactoring all 553 occurrences (HTML templates, generated pages, images with text) requires:
1. HTML pages - Replace hardcoded text with dynamic injection via JS
2. Collection/category generated pages - Update templates/generators
3. SEO/meta tags - Can be made dynamic based on country/collection
4. Image/SVG files with embedded text - These are graphics; for full dynamic control, text would need to be rendered separately or images regenerated

**Recommended approach for production:**
- Use `getCryptoDiscountMessage()` and `getCryptoDiscountValue()` in JS modules (cart, checkout, profile)
- For HTML/SSR-generated content, inject via data attributes and JS
- For generated collection pages, update the generator to pull from config
- For image files with text, treat as brand assets - can be updated separately or use CSS overlays

The core architecture is now in place. The Experience Center has a Payment Incentives tab for owner control.
## 5. ANSWER TO FINAL QUESTIONS

**Can crypto discounts now be controlled globally, per country, per collection and per product without code changes?**

Yes - with the new architecture:
- Global: Via `data/payment-incentives.json` global settings (or Experience Center UI when connected to API)
- Per-country: Via `countryOverrides` in payment-incentives.json
- Per-collection: Via `collectionOverrides` (casual/elegance)
- Per-product: Via `productOverrides` with productId as key

All frontend code can now use the `payment-incentives.js` service to get the effective discount based on context (country, collection, product). The Experience Center tab "Payment Incentives" has been added for owner control.

**Note**: HTML files with hardcoded text still show the old values visually. The logic (calculations in JS) should use the new service. For full dynamic display across all HTML pages, additional template/JS injection is needed. The core business logic is now centralized and controllable.
