# PHASE 20.5 — DALLI EXPERIENCE CENTER GOVERNANCE & MASTER OPERATING SYSTEM

## Post-Implementation Report

---

## Executive Summary

Phase 20.5 turns the Experience Center from a theme/content editor into the **Master Operating System** of the DALLI platform. The owner can now run the business — brand, assets, domains, money, communication, shipping, stores, warehouses, operations, and reporting — from a single owner-controlled surface, **without editing code, config files, or the database**.

The Experience Center remains a *thin admin shell* over the shared `js/experience/` core (`experience-api.js`, `experience-config.js`, `experience-mutations.js`, `experience-store.js`, `experience-permissions.js`) used by both the admin UI and the Netlify Functions + Edge layer. Nothing was duplicated: the new sectors extend the same config schema, the same validation, and the same save path.

The platform now has **24 owner-editable sections** grouped into 9 logical areas, a live **Owner Dashboard**, **200-entry audit logging**, and a **local-first save fallback** so the OS is operable even when the serverless persistence layer is unreachable.

---

## 1. Architecture (unchanged foundation, extended surface)

| Layer | File | Role |
|-------|------|------|
| Schema / validation | `js/experience/experience-config.js` | `SECTION_KEYS`, `createDefaultConfig()`, `getPublicSlice()`, `validateSection()`, `deepMerge()` |
| Mutation / authorization | `js/experience/experience-mutations.js` | `applySectionUpdate()`, `applyThemeAction()`, audit + history |
| Browser store | `js/experience/experience-store.js` | localStorage persistence (`dalli_experience_config`), server apply |
| API client | `js/experience/experience-api.js` | `experience-get` / `experience-save` Netlify Functions |
| Permissions | `js/experience/experience-permissions.js` | `experienceCenter` core RBAC mapping |
| Admin shell | `admin-new/js/sections/experience-center.js` | Master OS section (tabs, handlers, render) |

**Persistence:** Netlify Blobs via `experience-get` / `experience-save`, with localStorage fallback. Save path = `validateSection` → `sanitizeConfigText` → `deepMerge` (arrays replace, objects merge) → `updatedAt` / `updatedBy` → audit push.

---

## 2. Owner Dashboard (`os`)

The default tab on entry. Aggregates live platform state into KPI cards and an action list:

- **KPI grid** — company profile status, bank accounts, crypto wallets, payment methods, active theme, scheduled theme, homepage campaign, membership, system health (`OK` / `DEGRADED`).
- **Operational alerts** — missing company data, no bank account, crypto enabled without a wallet, active holiday mode, active maintenance mode.
- **Live data** — couriers enabled count, stores count, domain list.

Data is loaded through `onEnter()` → `loadConfig()` + `loadLiveData()`, where `loadLiveData()` fetches (defensively via `fetchJsonSafe`) the six live JSON sources: `shipping`, `brand`, `payments`, `locations`, `countries`, `currencies`.

---

## 3. Sector-by-Sector Coverage

All tabs live in a grouped rail (`EC_GROUPS`): Control, Brand & Assets, Experience & Content, Communication, Sales & Finance, Operations, Infrastructure, System, Core (read-only).

| # | Sector | Tab id(s) | Owned config | Highlights |
|---|--------|-----------|--------------|-----------|
| — | Owner Dashboard | `os` | — | KPIs, alerts, live counts |
| 1 | Brand Settings | `brandIdentity` | `brandIdentity` | name, legal name, business info, primary/secondary domains, phones, emails, structured address |
| 1 | Domain Manager | `domains` | `domains` | per-domain enable/primary, language, currency, SEO override, regional rules |
| 2 | Brand Asset Center | `assets` | `assets` | asset library + 11 positions (header/footer/mobile/dark/light logo, wordmark, icon, favicon, app icon, OG, social) with recommended/min/max sizes |
| 3 | Payments & Finance | `payments`, `finance` | `payments`, `finance` | bank accounts (7 legal tender fields + type), multi crypto wallets (multi-network/currency), card deposit accounts, VAT profiles, invoice center (template, prefix, VAT toggle, footer, regions) |
| 3+ | Treasury & Reconciliation | `treasury` | `treasury` | ledger entries, reconciliation run (matched/unmatched/auto-match), revenue scale daily → yearly |
| — | Reports & Accounting | `reports` | `audit` | period reports, exports, sharing architecture, audit log table |
| 4 | Communication | `communication` | `communication` | role-based e-mail routing (orders, marketing, membership, VIP, support, returns, finance, operations) + phone kinds |
| 5 | Stores | `stores` | `stores[]` | physical stores seeded from `data/locations.json`, editable array |
| 6 | Warehouses | `warehouses` | `warehouses[]` | warehouse records, active toggle |
| 7 | Shipping & Couriers | `shipping` | `shipping` | courier toggles merged over live `data/shipping.json` (Pošta Srbije, BEX, Aks, City Express, D Express, Daily Express, X Express, DHL, UPS, FedEx), zones, tracking notifications |
| 8 | Theme Engine | `themes` | `themes` | pre-existing activate/schedule/rollback/preview/compare |
| 9 | Social Media Center | `social` | `social` | unlimited accounts, scope = GLOBAL / CASUAL / ELEGANCE / COUNTRY / COLLECTION, primary flag |
| 10 | Operations Center | `operations` | `operations` | collective vacation / holiday mode (dates, message, customer notice, suspend shipping/orders, countdown), order pause, shipping pause, store notices |
| 11 | Permissions | `permissions` | `permissions` (read-only) | mirror of Core RBAC policy |
| — | Core tabs | `promotions`, `campaigns`, `seo`, `analytics` | — | read-only links to existing Phase 14–20 sections |

---

## 4. Schema Extensions (`experience-config.js`)

`SECTION_KEYS` now includes:
`brandIdentity, assets, domains, finance, treasury, communication, stores, warehouses, shipping, social, operations`
(plus the previously existing `permissions` and every Phase 14–20 key).

`createDefaultConfig()` gained default shapes for every new sector (company profile, empty asset library with all 11 positions, 8 pre-seeded domains, empty finance/treasury stores, 6 role-routed e-mails, 2 phones, 9 social accounts, empty stores/warehouses, courier map, holiday/notices/pauses) and a top-level `audit: []`.

`getPublicSlice()` now also exposes the storefront-relevant sectors: `brandIdentity, assets, domains, communication, stores, shipping, social, operations` — so the live storefront can consume brand/asset/shipping/operations state from the same config without exposing finance or treasury.

---

## 5. Audit Logging (`experience-mutations.js`)

- `MAX_AUDIT = 200`.
- Every `applySectionUpdate` captures the section value **before** and **after** (JSON-summarized at 900 chars), plus `by` (role), timestamp, and section, and pushes it onto `config.audit` (newest first).
- Rendered in the Reports tab as a "who / when / which section / new value" table.

---

## 6. Persistence Robustness (local-first fallback)

`saveSection()` now tries the Netlify Function first. If the function is unavailable (static/local deployment), it falls back to `experienceStore.updateSection()` (same schema, same audit, persisted to localStorage) instead of failing. This makes the entire OS — and all pre-existing sectors — operable offline without changing server-available behaviour.

---

## 7. Reports, Exports & Sharing

`generateReport(period, format)` builds a report object (revenue scale, account/wallet counts, tax profile, payment methods, domain states, reconciliation) and exports:

| Format | Behaviour |
|--------|-----------|
| CSV | `toCsv()` flatten → download |
| Excel | CSV with `application/vnd.ms-excel` + `.xls` |
| JSON | pretty JSON download |
| PDF | print-optimized HTML window |

Periods: daily / weekly / monthly / quarterly / yearly.

**Sharing is live (no dead buttons):** `shareReport(channel)` opens a real e-mail client (`mailto:`), WhatsApp (`wa.me`), Telegram (`t.me/share`), posts to a configured Slack webhook (`finance.slackWebhook`), or copies the summary to the clipboard as a fallback.

---

## 7a. Reconciliation Engine (real matching, no fabricated data)

The Treasury "Pokreni usklađivanje" button opens a modal where the owner pastes actual statement lines (`[{ "id": "...", "amount": 1234.56 }]`). `runReconciliation(ledger, actuals, tolerance, autoMatch)` matches each ledger entry to an actual by **ID + amount within tolerance**, flags `matched`/`unmatched`, reports **orphans** (actuals with no ledger entry), stamps `matchedAt`, and persists `ledger`, `actuals` and a `reconciliation` summary. Since no transaction store exists in the repo, all inputs are owner-provided — nothing is invented.

## 7b. Employee Access Tracking

`netlify/functions/admin-access-log.js` (Blobs store `admin-access`, key `log`, max 500) records each admin login/logout with **server-side IP** (`x-nf-client-connection-ip` / `client-ip` / `x-real-ip` / `x-forwarded-for`), parsed **device / OS / browser**, timestamps and computed **session duration** (logout is paired to the open login). The Employees section (`Zaposleni i pristup`) gained a **Pristup** tab that lists, refreshes, exports (CSV) and clears the log; `auth-manager.js` records login on `auth:login` and logout on `handleLogout()` (`access-log.js` optimistically writes locally, server best-effort).

## 7c. Storefront Wiring (theme actually affects the live site)

`netlify/edge-functions/theme-injector.js` now injects a consumer stylesheet and extends the boot script so Experience Center changes are visible on every processed HTML page:
- Theme accent → `--exp-*` vars + `#dalli-exp-announcement` bar styling.
- Luxury / editorial modes → promo elements dimmed via `--exp-promo-opacity`.
- `operations` → holiday / order-pause / shipping-pause / manual notices rendered into the announcement bar (priority over promo text).
- `brandIdentity` → fills `[data-exp-brand-name|company-name|phone|email|address]` placeholders (text + `tel:`/`mailto:` hrefs).
- `assets` positions → swapped into header/footer/mobile/dark/light logos, favicon, apple-touch-icon and `og:image`.

All boot operations are wrapped in `try/catch` — a miss can never break the page.

---

## 7d. Real Order Pipeline (no fabricated orders)

The storefront previously POSTed to `/api/orders` with **no backend**, and the admin Orders table fell back to `generateMockOrders()` (50 fake rows). Both are now replaced by a single real, persisted pipeline:

- **`netlify/functions/orders.js` (new)** — Netlify Blobs store `orders` (key `orders`, cap `MAX_ORDERS = 2000`). Canonical order shape (`orderNumber = DAL-YYYYMMDD-XXXXXX`, statuses `pending/confirmed/processing/shipped/delivered/cancelled/returned/refunded`, `customer`, `shippingAddress`, `paymentMethod`, `items[]`, `totals`, `statusHistory`). Routes: `POST /api/orders` (create), `GET /api/orders` (storefront, paginated), `GET/POST` single, `POST /api/orders/reorder`, `POST /api/orders/:id/cancel-return`, `GET /api/v1/admin/orders` (admin shape, `pending → new`, `bank_transfer → bank`), `GET /api/v1/admin/orders/:id`, `PATCH /api/v1/admin/orders/:id/status` (+notes → `statusHistory`). **Nothing is fabricated** — every record originates from a real checkout or an explicit owner action.
- **Redirects** (`netlify.toml` lines 111–130 + `public/_redirects`) map `/api/orders*` and `/api/v1/admin/orders*` to the function (defined before any catch-all).
- **Storefront sync** (`js/app.jsx`): new `syncOrderToServer(orderData)` fires after both the standard and crypto `trackOrderPlacement(orderData)` paths — best-effort, never blocks the customer; localStorage history remains the customer-side source.
- **Modular checkout** (`js/pages/checkout/index.js`): payload now carries `userId`.
- **Admin orders** (`admin-new/js/sections/orders.js`): `generateMockOrders()` removed; empty list + error toast on failure; row `delete` now cancels via API; `save-status` / `update-status` wired through a document-level handler to `PATCH .../status` using `#modalOrderStatus` / `#newStatus` + `#statusNote`. Now extended with **tabs** (Porudžbine / Kanta / Obaveštenja-owner-only), **role-aware delete**, **restore/purge**, and **realtime polling** (see below).
- **Admin API** (`admin-new/js/services/api.js` + `integration/sections/orders.js`): `getOrders`/`getOrder` send `scope=admin`; `unwrapArray`/`unwrapOrder` normalize the list to a real array.

### 7e. Orders: owner/admin deletion model, trash, audit notifications, realtime
- **Permissions by role.** The backend reads `x-admin-role` / `x-admin-name` / `x-admin-id` (set by `admin-new/js/services/api.js` from the `dalli_admin_auth` session). `OWNER_ROLES = vlasnik|owner|super_admin|superadmin|founder` → owner. Owner `DELETE` is **permanent** (never enters the trash); any non-owner admin `DELETE` **moves the order to the trash** (`trashed/trashedAt/trashedBy/trashedByName`), recoverable via `POST /orders/:id/restore`.
- **Owner-only audit on purge.** When a non-owner admin permanently removes an order from the trash (`POST /orders/:id/purge`), a `notifications` Blob entry is written (`type: order_purged`, who + order + customer). `GET /orders/notifications` / `POST /orders/notifications/read` are **owner-only (403 otherwise)** — admins never see the audit trail.
- **Trash + storefront isolation.** `GET /api/v1/admin/orders?trash=1` returns the trash; the normal admin list and the storefront list both exclude trashed rows.
- **Realtime without WebSockets.** `admin-new/js/sections/orders.js` polls the Blobs orders API every ~15s (`onEnter` → `setInterval`, cleared in `onLeave`), refreshing the active list, trash count and owner notifications, and toasting the owner when new audit entries arrive. (Netlify has no WS; `realtime.js` WS stub is intentionally unused here.)
- **Second demo account** (`admin-new/js/services/auth-manager.js`): `admin@dalli.rs / admin123` → owner (`super_admin`); **`menadzer@dalli.rs / admin123`** → non-owner admin `admin` — so the trash/purge/notification flow is testable end-to-end.

### 7f. Experience Center — Marketing API credentials (multi-account)
- New **`integrations`** section (`js/experience/experience-config.js` `SECTION_KEYS` + defaults) storing **owner-only secrets**: `integrations.social.{instagram,facebook,tiktok,youtube,pinterest,linkedin,x,threads}[]` and `integrations.ads.{google,meta,tiktok}[]`. Each account = `{ label, enabled, credentials:{...} }`; **unlimited accounts per provider** (arrays replace wholesale on save).
- New tab **“API i kredencijali”** (`EC_TABS`, group `communication`) + `renderIntegrationsTab` / `renderProviderGroups` / `renderApiAccountRow` in `admin-new/js/sections/experience-center.js`. Every provider has a fixed, realistic credential schema (`SOCIAL_PROVIDERS`, `AD_PROVIDERS`) — e.g. Meta `appId/appSecret/accessToken/adAccountId/pixelId`, Google Ads `developerToken/clientId/clientSecret/refreshToken/loginCustomerId/customerId`, TikTok `appKey/secret/accessToken/advertiserId/pixelId`. Secret fields render as `type=password`.
- Owner pastes keys copied from each platform; **credentials are never added to `getPublicSlice()`**, so they never reach the storefront. Persisted through the existing `experience-save` function (`scope:'section'`) with the same permission/validation/audit path; secrets survive `sanitizeConfigText` untouched.

### 7g. Product visibility — “Sakrij sa main page” / “Arhiviraj”
- New **`netlify/functions/products-visibility.js`** — a Blobs overlay (`products` store, key `visibility`) over the static catalog. `GET /api/products-visibility` (public) → `{ hidden, archived }`; `GET /api/v1/admin/products-visibility` (admin, `x-admin-role`) → `{ overrides }`; `PATCH /api/v1/admin/products-visibility/:id` `{ status }` where status ∈ `published|hidden|archived`. `published` deletes the override. Redirects added to `netlify.toml` + `public/_redirects`.
- New **`js/services/product-visibility.js`** — loads the overlay (memory + 60s `sessionStorage` cache) and installs a single **fetch interceptor** for `/data/products.json`, so every existing product loader is filtered consistently: `archived` disappears from the **whole** storefront, `hidden` disappears from the **main page** only (still reachable from category/search/detail). Installed in both `js/app.js` and `js/app.jsx`. Also honours a product’s own `cms.status`.
- New Experience Center tab **“Vidljivost proizvoda”** (`admin-new/js/sections/experience-center.js`) — table of the real catalog with a per-product selector (Objavljen / Sakrij sa main page / Arhiviraj); `saveProductVisibility()` PATCHes only changed rows and refreshes badges.

### 7h. Crypto shipping toggle (Experience Center)
- `js/experience/experience-config.js`: `payments.cryptoShippingPaid` (default `true`); `payments` (store + `cryptoShippingPaid`) added to `getPublicSlice()`, so it reaches the storefront through the theme-injector data island — **without** exposing credentials.
- Experience Center → **Plaćanje → Kripto plaćanje**: “Naplaćuj poštarinu za kripto plaćanje” checkbox (unchecked ⇒ besplatna dostava za kripto).
- `js/state/cart.js`: `getCartTotals()` reads `#dalli-experience-data` (fallback: local-first `dalli_experience_config`) via `isCryptoShippingFree()` and zeroes shipping for crypto when disabled. Mirrored in `js/app.jsx` (`recalcCart` + `updateSummaryTotals`); checkout summary (`getCartTotals`) updates automatically.

### Modal system fix (unblocks 30 call sites across 12 sections)
`admin-new/js/components/modals-toasts.js` — `Modal.open(options)` previously ignored its argument, so every section modal opened empty. `open(options)` now accepts `title/size/children|content/footer/onClose/onOpen/closable/closeOnOverlay/closeOnEscape`, re-renders, and re-registers the Escape handler without duplication.

### Tests
`src/tests/functions/orders.test.js` (new) — mocks `@netlify/blobs` with an in-memory store. Covers: rejects empty items / incomplete address, **creates one real order** (`DAL-YYYYMMDD-XXXXXX`, server-computed total), lists it for the admin surface (`status: 'new'`), updates status via the admin PATCH route (asserts persisted `statusHistory`), fetches a single order, **non-owner delete → trash + restore**, **admin purge → owner-only notification**, **notifications 403 for non-owner**, **owner delete is permanent**, and **storefront never returns trashed orders**. **12/12 passing.**

### Legacy ESM / syntax repair (whole `js/` tree now parses)
A broad `node --check` scan of all 124 modules under `js/` exposed a systematic invalid-ESM bug class (`import { a: b }` / `export { a: b }` instead of `a as b`) plus assorted broken files. All were repaired so **124/124 parse** and both bundles build:
- `js/pages/checkout/index.js` + `step1–4` + `progress.js` — ESM `as` imports, `init` export contract, `.checkout-step[data-step="N"]` selectors.
- `js/app.js` — `on as onEvent`, `init as init*`; `js/pages/product.js` — `export { init, currentProduct }`; `js/pages/cart.js` — `export { recalcCart, initCartPage as init }`.
- `js/pages/orders.js` — missing `)` in `filterOrders` `.filter(...)`; `js/pages/wishlist.js` — duplicate `const init` removed + `isInitialized` guard.
- `js/i18n.js` — unclosed outer `Promise` in `requestGeoConsent` (`}` → `});`) + `checkInterval` → `checkResult`.
- `js/modules/index.js` — dead CJS/ESM barrel rewritten as valid ESM barrel; `js/modules/crypto-payment/CryptoPaymentLoader.js` — duplicate functions/vars removed, `export default` pruned of undefined identifiers.
- `js/components/CryptoPayment.js` — duplicate re-export removed; `js/components/FAQAccordion.js` — outer template literal properly closed; `js/components/MarketSelector.js` — illegal optional-chain assignment.
- `js/blog/blog-renderer.js` — missing `}` in filter `forEach`.

---

## 8. Files Changed / Added

| File | Change |
|------|--------|
| `js/experience/experience-config.js` | 11 new `SECTION_KEYS`, defaults for all new sectors + top-level `audit`, extended `getPublicSlice()` |
| `js/experience/experience-mutations.js` | `MAX_AUDIT = 200`, audit capture in `applySectionUpdate` (`summarizeValue`, `pushAudit`) |
| `admin-new/js/sections/experience-center.js` | `EC_GROUPS`/`EC_TABS` rewrite, sector constants, module helpers (`esc`, `fetchJsonSafe`, `field`, `fieldArea`, `toCsv`, `downloadFile`), live-data loading, all sector handlers, 13 render methods, local-first save, **`openModal`/`closeModal` + `.ec-modal-*`**, **membership buttons (Tier Rules / Release Rules / Private Client)**, **real report sharing**, **`openReconcileModal` + `runReconciliation`** |
| `admin-new/js/sections/employees.js` | registered section; **Pristup (access-log) tab** — list/refresh/export/clear, `renderAccessLog`, `formatDuration` |
| `admin-new/js/services/access-log.js` | **new** — browser access-log client |
| `netlify/functions/admin-access-log.js` | **new** — Blobs-backed access log with IP/device capture |
| `admin-new/js/services/auth-manager.js` | records login/logout into access log |
| `admin-new/js/services/admin-sections.js` | `employees` registered in section map + meta |
| `netlify/edge-functions/theme-injector.js` | extended data island + boot script + consumer stylesheet (brandIdentity/assets/operations/social) |
| `admin-new/js/services/admin-components.js` | added `sparkles` icon; sidebar nav "Zaposleni i pristup" |
| `admin-new/css/sections/experience-os.css` | **new** — `.ec-kpi*`, `.ec-list`, `.ec-sector-label`, `.et-row`, `.et-roles`, **`.ec-modal-*`** |
| `admin-new/css/admin.css` | import of `experience-os.css` |
| `public/data/experience-config.default.json` | **new** — generated default config snapshot |
| `admin-new/public/data/experience-config.default.json` | **new** — same snapshot for the admin bundle |
| `netlify/functions/orders.js` | **new** — real Blobs-backed orders API (create/list/get/status/reorder/cancel; storefront + admin shapes) |
| `netlify.toml`, `public/_redirects` | `/api/orders*` + `/api/v1/admin/orders*` → orders function |
| `js/app.jsx` | `syncOrderToServer(orderData)` called on both checkout success paths |
| `js/pages/checkout/index.js` | payload carries `userId` |
| `admin-new/js/sections/orders.js` | mock removed; real list + `delete`/`save-status`/`update-status` wiring; **tabs + role-aware delete + trash/restore/purge + owner notifications + 15s polling** |
| `admin-new/js/services/api.js` | `getOrders`/`getOrder` send `scope=admin`; **role headers + `getTrashOrders`/`deleteOrder`/`restoreOrder`/`purgeOrder`/`getOrderNotifications`/`markOrderNotificationsRead`/`getAdminIdentity`** |
| `admin-new/js/services/auth-manager.js` | **`resolveDemoUser` (owner + non-owner demo accounts); syncs `AuthService` token on login/logout** |
| `admin-new/js/services/integration/sections/orders.js` | `unwrapArray`/`unwrapOrder`; **delete/restore/purge/trash/notifications adapters** |
| `netlify/functions/orders.js` | real Blobs orders API; **owner hard-delete / admin trash / restore / purge + owner-only notifications, trash filtering** |
| `js/experience/experience-config.js` | `integrations` section key + defaults (owner-only social/ads API credential stores) |
| `admin-new/js/sections/experience-center.js` | **“API i kredencijali” tab** — per-provider credential schemas, multi-account add/remove, secret fields, save handler; **“Vidljivost proizvoda” tab**; **crypto shipping toggle** |
| `netlify/functions/products-visibility.js` | **new** — public visibility overlay + admin hide/archive routes (Blobs) |
| `js/services/product-visibility.js` | **new** — overlay loader + `/data/products.json` fetch interceptor |
| `js/state/cart.js` | **new `isCryptoShippingFree()`**; crypto free shipping in `getCartTotals` |
| `netlify.toml`, `public/_redirects` | **new** `/api/products-visibility*` + `/api/v1/admin/products-visibility*` routes |
| `src/tests/functions/products-visibility.test.js` | **new** — 7 tests (public/admin hide/archive/reset/forbidden) |
| `admin-new/js/components/modals-toasts.js` | `Modal.open(options)` now applies options (unblocks all section modals) |
| `src/tests/functions/orders.test.js` | **new** — orders handler tests (**12 passing**, incl. trash/restore/purge/notifications/permissions) |
| `js/pages/checkout.js` | removed duplicate `getUserDiscount` import (dead module) |
| `js/pages/checkout/index.js`, `step1-customer.js`, `step2-shipping.js`, `step3-payment.js`, `step4-review.js`, `progress.js` | ESM `as` syntax fixed; `init` export contract; step selectors |
| `js/app.js`, `js/pages/product.js`, `js/pages/cart.js` | invalid ESM re-export syntax fixed |
| `js/pages/orders.js` | missing `)` in `filterOrders` `.filter(...)` |
| `js/pages/wishlist.js` | duplicate `const init` removed; `isInitialized` guard |
| `js/i18n.js` | unclosed `Promise` in `requestGeoConsent`; `checkInterval` → `checkResult` |
| `js/modules/index.js` | dead CJS/ESM barrel rewritten as valid ESM barrel |
| `js/modules/crypto-payment/CryptoPaymentLoader.js` | duplicate functions/vars removed; `export default` pruned |
| `js/components/CryptoPayment.js` | duplicate re-export removed |
| `js/components/FAQAccordion.js` | outer template literal closed |
| `js/components/MarketSelector.js` | illegal optional-chain assignment fixed |
| `js/blog/blog-renderer.js` | missing `}` in filter `forEach` |

---

## 9. Verification

| Check | Result |
|-------|--------|
| `eslint js/experience/experience-config.js js/experience/experience-mutations.js` | clean |
| `eslint admin-new/js/sections/experience-center.js admin-new/js/services/admin-components.js` | clean |
| `eslint netlify/edge-functions/theme-injector.js netlify/functions/admin-access-log.js` | clean |
| `eslint admin-new/.../access-log.js employees.js auth-manager.js admin-sections.js` | 0 errors (pre-existing warnings only) |
| Storefront `vite build --mode production` | ✓ built, PWA precache 341 entries |
| Admin `vite build` | ✓ built in ~10.5 s |
| `admin-login.html` | **unmodified** |
| Phases 14–20 sections | intact (no registry/schema regressions) |
| Dead buttons | membership (3), report share (4), theme cancel-preview — all wired |
| Orders function tests | `vitest run src/tests/functions/orders.test.js` → **6/6 pass** |
| Storefront `vite build` (re-run after orders + modal changes) | ✓ built in ~6.5 s |
| Admin `vite build` (re-run) | ✓ built in ~10.7 s |
| `node --check` scan of all `js/**/*.js` | **124/124 parse (0 broken)** |
| Storefront `vite build` (after legacy repair) | ✓ built in ~5.9 s, PWA precache 346 entries |
| Admin `vite build` (after legacy repair) | ✓ built (~10.7 s) |
| Orders function tests (after delete/trash/notifications) | `vitest run src/tests/functions/orders.test.js` → **12/12 pass** |
| Storefront `vite build` (after orders frontend changes) | ✓ built, PWA precache 346 entries |
| Admin `vite build` (after orders frontend changes) | ✓ built in ~10.7 s |
| `eslint` (orders section, api, auth-manager, orders adapter) | 0 errors (2 pre-existing `no-unused-vars` warnings) |
| Function tests (orders + products-visibility) | `vitest run src/tests/functions/{orders,products-visibility}.test.js` → **19/19 pass** |
| Storefront `vite build` (after product-visibility + crypto shipping) | ✓ built, PWA precache 346 entries |
| Admin `vite build` (after visibility/integrations tabs) | ✓ built in ~10.8 s |

Pre-existing, unrelated failures (unchanged, not introduced here): `tsc --noEmit` errors confined to `js/components/ui/*` + `ThemeContext.tsx`; vitest jsdom IndexedDB failures; prettier parse error in `admin-new/index.html`.

---

## 10. Can the owner run DALLI for years without a developer?

**For day-to-day operations — yes.** Brand identity, assets/logos, domains, payment methods and bank/crypto accounts, VAT and invoices, e-mail/phone routing, social accounts, physical stores, warehouses, courier selection and tracking, holiday/vacation and pause modes, themes, and financial reporting are all owner-editable and persisted to Netlify Blobs, with an audit trail and offline fallback.

**Boundaries (by design, unchanged from prior phases):** new *sectors/capabilities* and new *integrations* still require code, and the Permissions sector is a read-only mirror of Core RBAC. Everything that already exists in the OS is owner-operable; extending the OS itself is a developer task.

---

## 11. Real Analytics & Social Metrics Pipeline (no fabricated data)

A follow-up hardening pass removed every remaining mock data source from the reporting surface and replaced it with a real, persisted pipeline.

### Backend functions

| Function | Routes | Notes |
|----------|--------|-------|
| `netlify/functions/analytics.js` | storefront `POST /api/analytics/track`; admin `GET /stats`, `/revenue-chart`, `/orders-chart`, `/traffic-sources`, `/device-breakdown`, `/conversion-funnel`, `/finance`, `/accounting`; `GET/POST /adspend`, `DELETE /adspend/:id` | Reads real orders from the `orders` Blobs store; events and ad spend persist in the `analytics` store (`events`, `adspend`, `settings`). Ad-spend writes are owner-only (403 otherwise). |
| `netlify/functions/social-metrics.js` | `GET /api/v1/admin/social-metrics` | Reads the `experience` config (`integrations.social`) server-side; Instagram/Facebook via Graph v20.0, YouTube via Data API v3. Missing creds → `configured:false`; no public API → `supported:false`. Credentials are never returned to the client. |

Redirects added in `netlify.toml` and `public/_redirects` for `/api/analytics{/*}`, `/api/v1/admin/analytics{/*}` and `/api/v1/admin/social-metrics{/*}`.

### Storefront tracking

`js/features/analytics.js` `trackEvent()` now enriches every event (path, referrer, source from `utm_source`/referrer host, device, visitor id, product id, query, value) and POSTs it via `navigator.sendBeacon` (fetch-keepalive fallback). A `product_view` event is emitted on the product page, and a search listener captures site search queries. Existing commerce callers (`cart`, `checkout`, `product`) already route through this module.

### Admin wiring

- `admin-new/js/services/api.js` + `services/integration/sections/analytics.js`: added `getFinance`, `getAccounting`, `getAdSpend`, `addAdSpend`, `removeAdSpend`, `getSocialMetrics`.
- `sections/analytics.js`: loads real stats (orders, customers, sessions, ad spend) and no longer fabricates fallbacks.
- `sections/profit.js`: rewritten to consume `getFinance(period)` (revenue, COGS estimate, ad spend, net profit, margins).
- `sections/accounting.js`: loads real transactions via `getAccounting()`; payment breakdown and VAT periods are derived from real transactions (removed `getMockTransactions` and hardcoded tables).
- `sections/experience-center.js`: the "API i kredencijali" tab now renders a live **Social analitika** panel and a real **Troškovi oglašavanja** (ad-spend) manager that persist through the analytics function.

### Verification

| Check | Result |
|-------|--------|
| `vitest run src/tests/functions/analytics.test.js` | **9/9 pass** |
| `vitest run src/tests/functions/social-metrics.test.js` | **5/5 pass** |
| Storefront `vite build --mode production` | ✓ built |
| Admin `vite build --mode production` | ✓ built |
| `eslint` (analytics, accounting, profit, experience-center, features/analytics) | 0 errors |

**Boundaries:** live Blobs end-to-end requires deployment / `NETLIFY_SITE_ID` + `NETLIFY_AUTH_TOKEN` (tests use an in-memory Blobs mock); real social stats require API tokens pasted into the Experience Center and degrade to "not configured/unsupported" until provided.

## 12. Test Suite Remediation

The pre-existing failing tests were resolved rather than left red. Root cause was a legacy test harness plus a few genuine defects it exposed.

| File | Problem | Fix |
| --- | --- | --- |
| `admin-new/tests/setup.js` | Replaced the real jsdom `document` with an incomplete stub, so `template.content`, `FormData`, `querySelectorAll`, `KeyboardEvent`, `checkValidity` etc. broke integration/smoke tests | Only install the stub `document` when no real DOM exists; jsdom document is now used for tests |
| `admin-new/js/core/component.js` | `defineComponent()` re-called `customElements.define()` after `vi.resetModules()`, throwing `NotSupportedError` | Guard with `!customElements.get(name)` |
| `admin-new/js/services/cache.js` | `set(key, data, ttl, tags)` positional callers were treated as `options`; `staleWhileRevalidate` option ignored; `isStale` window inverted | Accept both positional and options form; configurable `staleWhileRevalidate`; corrected stale-window check |
| `admin-new/tests/boot.smoke.test.js` | Read `index.html` from `process.cwd()`, so from repo root it loaded the storefront page | Resolve `admin-new/index.html` relative to the test file |
| `admin-new/tests/auth-navigation.integration.test.js` | Asserted an obsolete AuthManager contract (string auth key, `admin.logout()`, `admin.currentSection`) | Rewritten against the current API: `{user,token}` JSON, `sections.currentSectionName`, `checkPermissions`, `ThemeManager`, and fixed the 422 response mock headers / form option / `escapeHtml` expectations |
| `admin-new/tests/admin.test.js` | `sanitizeInput` expected unescaped output | Expect the correctly escaped `&lt;script&gt;…` |
| `src/tests/setup.ts` | jsdom reinstalls a partial `crypto`, so `crypto.getRandomValues` was occasionally undefined at test time | Re-ensure `webCryptoMock` in a global `beforeEach` |

**Result:** `npx vitest run` → **16 test files, 177 tests, all passing**. Storefront and admin `vite build --mode production` both succeed; `eslint` reports 0 errors on the touched files.

**Note:** the `admin-new` project also has its own separate Vitest config whose `include` picks up standalone console-runner SEO scripts (reported as "No test suite found"); that pre-existing infra issue is out of scope here.
