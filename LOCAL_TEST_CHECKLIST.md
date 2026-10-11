# LOCAL TEST CHECKLIST — DALLI E-commerce

Faza: LOCAL RUNTIME VERIFICATION. Rezultati označeni `[OK]` su izvršeni u ovom auditu
(besmalo bez izmena aplikacije; procesi pokretani i judanje pozadinskih procesa).

## 1. Package.json scripts (audit)

- [OK] Root `package.json` sadrži: `dev` (vite), `build`, `build:prod`, `preview`,
      `lint`, `stylelint`, `typecheck`, `test` (vitest), `test:e2e` (playwright),
      `deploy` (netlify deploy --prod), `deploy:preview`
- [OK] `server/package.json`: `start`, `dev` (watch), `test:api`
- [OK] `admin-new/package.json`: `dev`, `build`, `preview`, `test`, docker/vercel skripte
- [OK] netlify-cli prisutan u devDeps (v17.38.1)

## 2. Razvojni startup

- [OK] `npm run dev` (root) → Vite **ready on localhost:8000** (176 ms)
- [OK] `http://localhost:8000/` → **200** (index)
- [OK] `http://localhost:8000/cart.html` → **200**
- [OK] API: `cd server && npm run dev` → **:3001** zdravo (`status:ok, db:up, cache:redis`)
- [OK] `curl :3001/api/v1/health` → 200 `{"status":"ok","db":"up",...}`
- [OK] vite dev **nema /api proxy** → `/api/v1/health` preko :8000 vraća SPA fallback (200, nije API)

## 3. Generisane SEO stranice (dev vs dist)

- [!!] `http://localhost:8000/majice.html` → **500** (vite parse error: `majice.html:13`
      `<link rel="canonical" ...` **bez `>` na kraju**)
- [!!] Isto 500: `dukseri.html`, `trenerke.html`, `products.html`, `muska-garderoba.html`,
      `zenska-garderoba.html` (u **source root-u**)
- [OK] Iste stranice u `dist/` su **ispravne** (`dist/majice.html:13` ima `>`) → 200 u preview

## 4. Production-preview

- [OK] `npm run preview` → http://localhost:8080 (servira dist/)
- [OK] `/` , `/cart.html` → 200
- [OK] `/majice.html` , `/products.html` → 200 (title ispravan)
- [OK] `/blog-index.html` , `/blog/` → 200
- [OK] `/admin-login.html` , `/manifest.json` , `/sitemap.xml` , `/data/products.json` → 200
- [OK] `/css/style.css` , `/assets/js/` , `/images/icons/favicon.svg` → 200
- [OK] `/api/v1/health` preko :8080 → 200 ali je **SPA fallback** (nije realni API; preview nema proxy)
- [N/A] `docker compose up --build` — **nije izvršeno**: Docker daemon nedostupan u radnoj mašini.
      Komanda i caveati dokumentovani (dupli `redis:`, fale `init-scripts/` i `ssl/`,
      server deps u Dockerfile-u nisu deklarisan u root package.json)

## 5. Netlify Functions lokalno

- [!!] `npx netlify functions:serve` (repo root) → **odbija config**: `[edge_functions]`
      mora biti `[[edge_functions]]` array (netlify.toml) → blokira i `netlify dev`/`deploy`
- [OK] Bypass (privremeni config u /tmp bez edge bloka): server na **:9999** — 13/14 funkcija učitano
- [!!] `security` funkcija **ne bundluje**: `security/security-audit-logger.js:83` ima
      **dva konstruktora** u klasi
- [!!] Poziv funkcija (get-redirects, get-languages, search, blog-search) → **500**:
      «Cannot find module '@netlify/blobs'» (nije instaliran na mestu koje bundler vidi)
- [!!] Node v24.21.0 + netlify-cli 17.38.1 → esbuild crash / proces umire (preporuka: Node 20)

## 6. API backend (lokalno, :3001)

- [OK] `GET /api/v1/health` → 200
- [OK] `GET /api/v1/products?page=1&pageSize=2` → 200 (JSON podaci)
- [OK] `GET /api/v1/search?q=majica` → 200
- [OK] `GET /api/v1/collections` → 200
- [OK] `GET /api/v1/payment-methods` → 200
- [OK] Legacy alias `GET /api/products?limit=2` → 200
- [OK] `GET /admin/auth/login` → 404 (POST-only ruta — očekivano)

## 7. Build output (dist/)

- [OK] `dist/` postoji, ~5,7 MB
- [OK] Sadrži: index.html, cart/checkout/orders/wishlist/profile/settings,
      blog/, blog-index.html, admin/, admin-login.html, sitemap.xml, manifest.json,
      css/, js/, assets/, images/, data/ (products.json), _headers
- [OK] Preview nad dist/ vraća generisan sadržaj (poglavlje 4)

## 8. Env — obavezno pre pokretanja

- [OK] `.env` prisutan (root); vrednosti prepoznate: DATABASE_URL, JWT_SECRET,
      JWT_REFRESH_SECRET, PORT, NODE_ENV, FRONTEND_URL
- [OK] `.env.example` dokumentuje i opcione: REDIS_URL, RATE_LIMIT_*, SMTP_*, CRYPTO_WEBHOOK_SECRET, GA_MEASUREMENT_ID

## Rezultati koje zapisujemo u izveštaj

| Stavka | Vrednost |
|---|---|
| Frontend URL | http://localhost:8000 |
| Frontend preview | http://localhost:8080 |
| Backend URL | http://localhost:3001 |
| API base | http://localhost:3001/api/v1 (same-origin preko nginx-a: /api/v1) |
| Netlify Functions | http://localhost:9999/.netlify/functions |
| Potrebni env | DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, PORT, NODE_ENV, FRONTEND_URL |
| Testovi | `server: npm run test:api` (37) |

## BLOKERI (be izmena rešavati naknadno)

1. `netlify.toml` `[edge_functions]` → nevalidan (array sintaksa).
2. `security/security-audit-logger.js` dupli konstruktor → `security` fn ne putuje na deploy.
3. `@netlify/blobs` nije top-level dep → funkcije koje ga koriste 500 lokalno.
4. SEO stranice u source root-u (parse bug) — živote 500 u vite dev; dist ispravan.