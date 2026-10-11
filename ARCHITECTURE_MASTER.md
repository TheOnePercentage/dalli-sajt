# A R C H I T E C T U R E   M A S T E R

> Zvanični arhitekturni referent projekta. Faza: **PHASE 1 — ARCHITECTURE CONSOLIDATION**.
> Datum: 2026-10-09. Status: AUDIT (bez izmena koda).

---

## 0. VERDICT — Šta JE projekat danas?

### **MPA + Backend**

(Višestruki statički HTML dokumenti / multi-page, sa klijentskim JS pojačanjima i PWA,
generisani u build fazi od JSON podataka — *SSG*)*, koji konzumiraju **Node.js/Express REST API
backend** (+ Prisma/Postgres, Redis keš, opcioni Meilisearch), **Netlify Functions**
(serverless CMS podaci) i **Edge Function** (injektovanje tema).*

| Kandidat | Zašto NIJE |
|---|---|
| Static Website | Postoji realan backend transakcija (checkout, auth, narudžbine, inventar) |
| SPA + Backend | Svaka stranica je zaseban HTML dokument (31 HTML fajl); nema klijentskog router-a; vite radi multipli entry points |
| SSR Application | Stranice se generišu u **build fazi**, ne per-request; HTML je identičan za sve korisnike |
| **MPA + Backend** | **DA** — statički generisane HTML stranice + JSON REST API + serverless/edge dodatci |

Objašnjenje: MPA ovde = *statički generisana multipage* (SSG, ne SSR).

---

## 1. AUDIT — sažetak

### 1.1 Frontend
| Stavka | Nalaz |
|---|---|
| Tip | MPA (31 `*.html` u root-u), build: **Vite 5** (multi-entry `rollupOptions.input`) |
| Entry points | index, cart, checkout, profile, orders, wishlist, settings, size-guide, blog-index, blog-entry, virtual-tryon |
| JS | Modularno: `js/core`, `js/components`, `js/pages`, `js/features`, `js/state`, `js/services`, `js/experience`, legacy `js/app.jsx` |
| Podaci | Frontend čita **statičke JSON** (`/data/products.json`, `/data/categories.json`, `/data/blog.json`) + poziva `/api/**` |
| Search | Klijentski **pretražni indeks** (`dist/search-index.json` + `search-ui.js`) — rad bez servera |
| PWA | `vite-plugin-pwa`, Workbox (precache, runtime caching, `/api` NetworkFirst) |
| i18n | `js/i18n/` (sr-Latn/sr-Cyrl/en/ru), atributi u HTML |
| Moderni admin | `admin-new/` („Imperium") — Vite SPA, zasebna app, **NIJE u produkciji** |

### 1.2 Backend
| Stavka | Nalaz |
|---|---|
| Runtime | Node.js + **Express** (`server/index.js`), HTTP server sa Socket.IO |
| Port/Env | `PORT=3001` (lokalno), `node --env-file-if-exists=../.env` |
| Rute | `/api/v1/*` (public, checkout, auth, admin), legacy `/api/*`, `/admin/auth` (kompat), `/health` (nginx), `/api/socket/status` |
| Data sloj | **Prisma + PostgreSQL** (86 modela: catalog, RBAC, orders, payments, loyalty, reviews, campaigns, SEO, audit, admin...) |
| Keš | `src/lib/cache.js` — Redis (ioredis) ili in-memory TTL fallback |
| Search | `src/lib/meilisearch.js` — opcionalni Meilisearch indeksi (products/categories/blog_posts) |
| Throttle/Rate-limit | global `120 req/min/IP`, per-route limiteri |
| Auth | JWT (access+refresh rotacija, reuse-detection, device/trusted-device), WebAuthn stub; RBAC (`Role/Permission/RolePermission`) |
| Realtime | Socket.IO (`src/lib/socket.js` + admin UI), webhook webhooks |
| Plugin deps (server/) | lowdb, sql.js, meilisearch, @socket.io/admin-ui (rezervno/legacy — ne koristi se u src) |

### 1.3 Build pipeline
| Komanda | Koraci |
|---|---|
| `npm run build` | `validate-html.cjs` → `vite build --mode production` (dist = public/ + vite + PWA) |
| `npm run build:prod` | `scripts/build.cjs`: validate-html → vite build → **generate-products** → **generate-category-pages** → **render-blog-posts/index** → **generate-sitemap** → **validate-dist** |
| Ostali | `build-search-index.cjs`, `generate-sitemap.cjs`, `generate-icons.cjs`, `generate-sri.cjs`, `csp-nonce-generator.cjs`, `check-size.js` |

### 1.4 SEO generisanje
| Generisanje | Ulaz | Izlaz (dist) |
|---|---|---|
| `generate-products.cjs` | `data/products.json` + `templates/product-template.html` (Handlebars) | `proizvod-*.html` |
| `generate-category-pages.cjs` | `data/category-seo.json` + `data/products.json` + `templates/category-seo-template.html` | `majice.html`, `dukseri.html`, `trenerke.html`, `muska-garderoba.html`, `zenska-garderoba.html`, ... |
| `generate-categories.cjs` | `templates/collection-template.html` + kolekcije | `collections/*.html` |
| `render-blog-posts.cjs` / `render-blog-index.cjs` | `data/blog.json` + `blog-post.html`/`blog-index.html` | `blog/*.html`, `blog-index.html` |
| `build-search-index.cjs` | `data/products.json` | `search-index.json` + `search-ui.js` |
| `generate-sitemap.cjs` | provere stvarnog dist (stranice koje JESU generisane) | `sitemap.xml` |
| `generate-blog-rss.cjs` | blog.json | RSS |

Zapažanje: generatori default-u pisu u root, a `build.cjs` ih preusmerava na `dist` preko
`GENERATE_OUTPUT_DIR`. Stari izlazi u root-u (`majice.html`, `proizvod-*.html`...) su **stale
i imaju parse-bug** (vite dev 500) — dist kopije su ispravne.

### 1.5 Deployment arhitektura
| Platforma | Mehanizam |
|---|---|
| **Netlify (primarno)** | `netlify.toml`: `build: prod`, publish `dist`, functions `netlify/functions` (14), edge `netlify/edge-functions/theme-injector.js`, headers/redirects, 9090MB heap |
| **CI/CD** | GitHub Actions: `ci.yml` (lint+stylelint+typecheck+prettier), `deploy.yml` (push main/develop → Netlify) |
| **Docker (opciono)** | `Dockerfile` (node:20 build+runtime, CMD `node server/index.js`) + `docker-compose.yml` (postgres:16, redis:7, meilisearch, app:3001, nginx:80/443 proxy `/api→app`) |
| **Nginx conf** | rate-limit zone, HTTPS, `/api/` proxy, `/admin/auth`, `/api/search`, SPA fallback, `/health` |
| **Apache (.htaccess)** | legacy hosting opcija (security headers, rewrites) |
| **api.dalli.rs** | produkcijski API domen (CSP `connect-src`); lokalno: same-origin `/api` preko nginx-a |

### 1.6 Admin sistemi (danas ih ima TRI)
| Sistem | Tip | Status |
|---|---|---|
| `admin-login.html` + `js/admin.bundle.js` | Legacy monolitni admin (static JS) | U produkciji (legacy path `/admin/auth`) |
| `admin/` (Netlify CMS) | Git-based CMS (`config.yml`, kolekcije proizvoda, widget ekstenzije) | U produkciji (`/admin/cms`, `/admin/*`→admin-login) |
| `admin-new/` (Imperium) | Novo SPA admin (Vite, /api/v1/admin, offline queue, RBAC) | **U razvoju**, ne deplojuje se |

---

## 2. FRONTEND ARHITEKTURA

```
browser
 ├─ HTML dokumenti (MPA) ── izvorni *.html (ručno) + dist/*.html (generisani SEO)
 ├─ Vite bundle ── js/ moduli → assets/js/*-[hash].js (manualChunks: core/state/features/pages/vendor/lazy)
 ├─ Statistički podaci ── /data/*.json (products, categories, blog, faqs, collections...)
 ├─ PWA ── sw.js (precache + runtime: /api NetworkFirst, products StaleWhileRevalidate, images CacheFirst)
 ├─ Search (bez servera) ── search-index*.json + search-ui.js
 └─ API klijent ── fetch('/api/...') same-origin; auth JWT (localStorage/token) → header
```

- Stranice su **odvojene dokumente** (različit `title`, meta, microdata, hreflang), što je
  arhitektonski MPA — a ne SPA shell.
- Dinamičko (korpa, checkout, orders, auth, admin-pozivi) ide na `/api/**`.
- i18n + PWA + `theme-injector` edge (Experience Center) rade na svim stranicama.

## 3. BACKEND ARHITEKTURA

```
Express (server/index.js, :3001)
 ├─ middleware: JSON, CORS, cookieParser, request-id/logging, /api throttle
 ├─ GET /api/v1/health
 ├─ auth: /api/v1/auth + /admin/auth (JWT access/refresh, reuse-detection, RBAC)
 ├─ public: products, product/:id, search, collections, categories, faqs, redirects, seo...
 ├─ checkout: quote, create, lookup, confirm (mock), webhook
 ├─ /api/v1/admin: analytics, catalog, customers, dashboard, inventory, orders, payments,
 │                  products, reviews, campaigns, settings, users (permission-gated)
 ├─ GET /api/socket/status
 └─ Socket.IO (#socket lib, @socket.io/admin-ui)
Data: Prisma/PostgreSQL (86 modela)  ·  Cache: Redis | in-memory  ·  Search: Meilisearch (opt.)
```

## 4. BUILD FLOW

```
   source (*.html, js/, css/, data/, templates/, public/) 
        │   npm run build:prod  (= scripts/build.cjs)
        ▼
 1. validate-html.cjs ── ručni HTML (pre-build)
 2. vite build ── dist/ = public/ kopija + SPA bundle (core/state/pages/vendor chunks, PWA sw.js)
 3. generate-products.cjs ── proizvod-*.html (data/products.json + Handlebars template)
 4. generate-category-pages.cjs ── majice/dukseri/trenerke/muska/zenska/*.html
 5. render-blog-posts.cjs + render-blog-index.cjs ── blog/*.html, blog-index.html
 6. generate-sitemap.cjs ── sitemap.xml (samo URL-jevi koji ZAISTA postoje u dist)
 7. validate-dist.cjs ── finalna provera
        ▼
     dist/  (artefakt za deploy)
```

## 5. DEPLOYMENT FLOW

```
push main/develop ─► GitHub Actions
    ├─ lint/stylelint/typecheck/prettier (ci.yml, Node 20)
    └─ Netlify deploy (deploy.yml) ─► npm run build:prod ─► dist/
        ─► netlify deploy --prod  (headers/redirects/functions/edge)
Alternative: docker compose up --build  (nginx:80 + app:3001 + pg:5432 + redis:6379 + meilisearch:7700)
```

## 6. SOURCE OF TRUTH

| Domen | Primarni izvor istine | Napomena |
|---|---|---|
| Katalog/SEO sadržaj (build-time, CMS-editable) | **`data/*.json`** u git-u (uređuje Netlify CMS preko `/admin/cms`) | generatori je konzumiraju; `public/data/*` ide u dist |
| Transakcije, korisnici, RBAC, narudžbine, inventar (runtime) | **PostgreSQL** (Prisma, 86 modela) | API čita/pisе iz baze |
| Cache | Redis (fallback: in-memory) | kratkoročna istina, ispraviva |
| Search | in-memory `search-index.json` (client) ili Meilisearch (opc.) | |

⚠️ **Rizik arhitekture:** katalog ima **dva izvora** (JSON za build/SEO vs DB za API/admin).
Promena proizvoda preko CMS menja JSON, pa tek rebuild regeneriše HTML; API stanje se menja
preko payloada (migrate-data). Konsolidacija u JEDAN izvor je deo ciljne arhitekture.

## 7. GENERATED ARTIFACTS (dist/)

| Artifact | Poreklo |
|---|---|
| `index.html`, `cart.html`, `checkout.html`, `orders.html`, `profile.html`, `wishlist.html`, `settings.html`, `size-guide/` | vite build (rollup entries) |
| `proizvod-*.html` | generate-products.cjs |
| `majice.html`, `dukseri.html`, `trenerke.html`, `muska-garderoba.html`, `zenska-garderoba.html`, ... | generate-category-pages.cjs |
| `collections/*.html` | generate-categories.cjs |
| `blog/*.html`, `blog-index.html` | render-blog-*.cjs |
| `search-index*.json`, `search-ui.js` | build-search-index.cjs |
| `sitemap.xml` | generate-sitemap.cjs |
| `sw.js`, `registerSW.js`, `manifest*.json`, `workbox-*.js` | vite-plugin-pwa |
| `css/`, `assets/*`, `images/`, `data/*`, `admin/`, `admin-login.html`, `_headers`, `_redirects` | public/ kopija (vite publicDir) |
| `blog/`, `faq/`, ... | generisano + ručno | 

Napomena: dist je **transijentan** — trentni sadržaj zavisi od poslednje pozvane build komande.

## 8. RELEVANTNI RIZICI / ZAPAŽANJA (iz audita)

1. **Tri admin sistema** paralelno (legacy static admin, git-CMS, novi admin-new) — konfuzno.
2. **Dvojni source of truth** kataloga (JSON vs DB).
3. **Stale generisane stranice u root-u** (`majice.html`… bez `>` → vite dev 500); dogenerisi samo u dist.
4. **netlify.toml `[edge_functions]`** nevalidna sintaksa (mora `[[edge_functions]]`) → blokira
   `netlify dev`/`deploy`; `netlify/functions/security` ne bundluje (dupli konstruktor u
   `security/security-audit-logger.js`); `@netlify/blobs` nije top-level dep.
5. Router kompatibilnost: isti endpointi izloženi i pod `/api/v1` i pod `/api` (legacy) — šire napade/podvojenu logiku.
6. Dockerfile: `npm ci` samo u root-u, server deps nisu deklarisan u root package.json → fragilan image.

---

## 9. CILJNA ARHITEKTURA (future target)

```
┌─────────────────────────────────────────────────────────────┐
│  SLOJ 1 — PREDNJI (produkcija)                               │
│   MPA/SSG (Vite) + PWA, jedan source of truth:             │
│   NEXT: unifikacija admin-a → admin-new (Imperium) kao     │
│   jedini admin (RBAC preko API), ukidanje legacy admin.html │
├─────────────────────────────────────────────────────────────┤
│  SLOJ 2 — API (Node/Express + Prisma/Postgres, :3001)       │
│   /api/v1 (jedna verzija rute), Socket.IO, webhooks,        │
│   Redis keš, Meilisearch (primarni search — web+index)      │
├─────────────────────────────────────────────────────────────┤
│  SLOJ 3 — SERVERLESS/EDGE (Netlify)                         │
│   functions (CMS data, sitemap, email, blog) + edge theme   │
├─────────────────────────────────────────────────────────────┤
│  SLOJ 4 — INFRAS (opcije)                                   │
│   Netlify (primarni)  |  Docker Compose (nginx+Docker)      │
└─────────────────────────────────────────────────────────────┘
```

Ciljevi:
1. **Jedan source of truth** kataloga (DB) — HTML odds setaji/build-time snapshot, ne duplikat.
2. **Jedan admin** (admin-new) sa potpunim RBAC; Netlify CMS → samo sadržaj (blog), ne katalog.
3. **Jedna verzija API rute** (`/api/v1`), legacy alias se uklanja posle migracije klijenata.
4. **Ispravka Netlify config/Functions** (edge block, security fn, blobs dep).
5. **SSR opcija** za dinamičke stranice (produkt/checkout) ako SEO/low-data zahteva — kao
   dodirna tačka ka Next.js; inače SSG+CSR je dovoljno za dati saobraćaj (10-godišnji horizont).
6. **CI/CD ≥ kvalitet**: netlify build import-u u oznaku; preview deployments za PR-ove.
```

Dokument: ARCHITECTURE_MASTER.md (referenca). Povezani: LOCAL_DEVELOPMENT_GUIDE.md,
STARTUP_COMMANDS.md, LOCAL_TEST_CHECKLIST.md, PHASE_CORE_IMPLEMENTATION_REPORT.md.