# ELITE PRODUCT EDITOR — Phase Report

## 1. Cilj

Zameniti ograničeni proizvodi CRM sloj Admin-Nev-a (sitni `ProductsSection`) zasebnom,
veličanstvenom **Elite Product Editor platformom** — full-screen editorom sa 16 specijalizovanih
tabova, bez mok podataka, sa Prisma `SectionAPI` perzistencijom i offline redom čekanja.

## 2. Urađeno

### 2.1 `admin-new/js/sections/products-elite.js` — `EliteProductEditorSection`
- **Lista**: pretraga po nazivu/SKU/slugu, kolekcija filter, metabar „Elite pokriće %“
  (elično izračunato iz 16 grupa), dugmad „Elite Editor“ / „Novi elite proizvod“.
- **Editor (16 tabova)**: general, media, pricing, inventory, variants, seo, content,
  craftsmanship, view360, vto, crypto, shipping, luxury, faq, analytics, publishing —
  svaki tab renderuje stvarne field-e i mapa u payload.
- **Radni tok (workflow)**: `draft → review → approved → scheduled → published → archived`,
  sa stepper UI i automatskim preslikavanjem u `cms.status`.
- **Stvarni podaci, 0 mokova**:
  - Proizvodi: `SectionAPI.products.list({limit:500})`, fallback `fetch('/data/products.json')`
    (23 proizvoda).
  - Kripto/fiat: *runtime auto-detekcija* iz `data/crypto-payment-model.json` (fajl je izvor
    `const SUPPORTED_CRYPTO_CURRENCIES = [...]`) — parsiranje `extractJsArray` (regex +
    bracket scan + JSON.parse). Fallback BTC/ETH/USDT/USDC/PI + 4 metoda. Nema hardkodovanih
    tabela, `source` se prikazuje u listi.
- **Perzistencija**: `toApiPayload()` → `api.create/update`; na grešku mreže upise se u
  localStorage red (`dalli_elite_offline_queue`, max 50) sa toast obaveštenjem.
- **Bezbednost koda**: live capture preko `[data-elite-field]` (input + change, `select[multiple]`
  posebno); DOM-sync helperi (colors/sizes/faqs/gallery) su guard-ovani da prelazak tab-a ne
  obriše nizove; `brandNew` flag razdvaja create/update; srednji bug-ovi (dupla normalizacija,
  `base.emptyProduct()`, neuskladjene re-render ruke) su ispravljeni u drugoj iteraciji.

### 2.2 Registracija i navigacija
- `services/admin-sections.js`: dinamički import `products-elite` → `EliteProductEditorSection` +
  section meta (title/subtitle).
- `services/admin-components.js`: sidebar stavka „Elite Editor" (ikona `edit-3`) u Trgovini.
- `components/sidebar.js`: `getSectionInfo` meta zapis (breadcrumb/page header).
- `index.html`: sidebar `<a data-section>`, tab dugme `#products-elite-tab`, prazan
  `data-panel="products-elite"` panel (mount root kreira framework).

### 2.3 Stilovi
- Novi `css/sections/products-elite.css` (import u `admin.css`): sticky editor bar, inner tab
  strip (`.elite-etab`), check-chip stagger nastavaka (`.et-check:has(input:checked)`), galerija,
  variant/faq redovi, KPI chips, workflow stepper, coverage meter, editor footer — sve preko
  postojećih dizajn tokena (gold accent = luxury).

### 2.4 `PRODUCT_EDITOR_MIGRATION_PROPOSALS.md` — Predlog migracije Prisma
- M1–M10 koraci (nove tabele `ProductShipping`, `ProductLuxury`, `ProductCraftsmanship`,
  `ProductPayments`, `ProductPublishing` + `ProductWorkflowEvent`, `ProductAnalytics`,
  `ProductVariant`; backfill M9 idempotentan po `productId`/`sku`/`entityId`).
- Mapiranje **16 tabova → payload → model/polje** tabelom.
- Sinhronizacija sa postojećim modelima (Faq, SeoEntry, Viewer360Asset, AiTryOnJob,
  PaymentRule) — migracije izvršava vlasnik baze, ne agenat.

## 3. Verifikacija

- `vite build` (admin-new): **prošao** — `sections` chunk sadrži editor; jedina CSS upozorenja su
  preegzistentna (`.category-drag-handle`, `.query-item:hover`, `.top-account-card:hover` u
  kategorije/growth/accounting stilovima).
- `tsc --noEmit`: 79 grešaka **sve preegzistentne** u `js/components/ui/*` i `context/ThemeContext.tsx`
  (direktni fajlovi novog editora nemaju grešaka).
- Lint: nova `products-elite.js`, `admin-sections.js`, `admin-components.js`, `sidebar.js` — čisto.
- Testovi (vitest): 26 pass / 20 fail — isti preegzistentni failovi (jsdom nema IndexedDB/
  IDBRequest; ToastContainer template u test env) — nisu vezani za editor.

## 4. Otvorene napomene / rizici

- **Rešeno**: `public/data/crypto-payment-model.json` sada **postoji** kao validan JSON
  (generisano iz kanonskih v1 blokova `data/crypto-payment-model.json`). Izvor
  `data/crypto-payment-model.json` je zapravo **pokvaren artefakt**: nije validan JSON ni
  izvršiv CJS (duplicirane `const PAYMENT_METHODS`/`CRYPTO_ORDER_SCHEMA`, `module.exports`
  poziva nedefinisane `CRYPTO_ORDER_STATUS`/`ADMIN_CRYPTO_ORDER_FIELDS`). Elit editor
  podržava oba oblika (JSON → direktno; legacy → `extractJsArray`), a storefront
  `CryptoPaymentLoader.js` (`response.json()`) sada radi ispravno.
- Prettier na `admin-new/index.html` prijavljuje preegzistentnu parse grešku (linija 639 header
  indentacija) — izmene su pažljivo ručno usklađene sa postojećim markup-om.
- `ImperiumUtils.format.slugify` / `formatCurrency` postoje u helperima — korišćeni u editoru.
- `data/crypto-payment-model.json` je ostavljen netaknut kao izvor za regeneraciju
  (`/tmp/opencode/build-crypto-model-json.cjs`); ako se menja njegov v1 sadržaj, ponoviti
  generaciju public kopije.

## 5. Sledeći koraci (preporuka)

1. Vlasnik baze pregleda/izvršava `PRODUCT_EDITOR_MIGRATION_PROPOSALS.md` (M1–M10).
2. Opcija: povezati `saveCurrentTabAndPersist` sa pravim `PlayerService`-om koji upisuje i
   `Faq`/`SeoEntry`/`Viewer360Asset`/`PaymentRule` (M10).
3. Ručni smoke test u browseru: Elite Editor → otvori proizvod → izmeni → sačuvaj → offline → red.