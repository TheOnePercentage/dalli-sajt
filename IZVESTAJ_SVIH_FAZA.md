# IZVEŠTAJ — SVIH 5 FAZA (PHASE 1–5)

> Kompletan i detaljan zbirni izveštaj projekta DALLI e-commerce.
> Datum: 2026-10-09 · Projekat: `/home/alpatron/Documents/Default Project/moonlight-sajt`
> Obuhvata: PHASE 1 (Architecture) · PHASE 2 (Storefront) · PHASE 3 (Luxury) · PHASE 4 (Production Readiness) · PHASE 5 (DALLI 2.0).

---

## 0. PREGLED (EXECUTIVE SUMMARY)

U **5 faza** izvršena je potpuna **arhitektonska, UX i produkciona analiza** platforme DALLI,
sa 13 kreiranih dokumenata i ZERO planiranih izmena business logike (faze su bile audit/plan).
Ukupno je dokumentovano 30+ nalaza, 4 glavne preporuke (A/B/C/D), 21 luxury iniciativa,
7 produkcionih blokera, i puni blueprint za DALLI 2.0.

| Faza | Glavna odluka/preporuka | Glavni deliverable |
|---|---|---|
| 1 · Architecture | **MPA + Backend** ostaje; dual source of truth | `ARCHITECTURE_MASTER.md` |
| 2 · Storefront | **B. Hybrid MPA + React Islands** (4.15/5) | `STOREFRONT_STRATEGY.md` |
| 3 · Luxury | **„Tihi luksuz + brzina SSG + experience engine"** | `LUXURY_EXPERIENCE_ROADMAP.md` |
| 4 · Production | **7 kritičnih blokera pre go-live-a** | `DEPLOYMENT_GUIDE.md`, `PRODUCTION_CHECKLIST.md`, `ROLLBACK_PLAN.md`, `.env.example` |
| 5 · DALLI 2.0 | **„Digital Couturier"** — category leadership | `DALLI_2_0_BLUEPRINT.md` |

**Trenutno stanje:** svi runtime procesi su ugašeni (ne radi API/Vite/Redis/Postgres — „obustavi sve").
Test suite: **37/37 API testova PASS, lint 0 grešaka.**

---

## 1. POLAZNO STANJE (FOUNDATION, pre faza)

Pre faza bila je izgrađena **jezgra implementacija** (dokumentovano u `CHANGELOG.md`):

- **Stack:** Vite 5 (MPA, SSG), Express 4 API (`server/index.js`), Prisma 5 + PostgreSQL, Socket.IO, Redis (ioredis, cache), Meilisearch, Netlify (Functions + Edge theme-injector), Node ≥18.
- **API testovi: 37/37 PASS** (`server/tests/api.integration.test.mjs`), Suite A–F:
  - **A** Health & public · **B** Auth/sessions/refresh/reuse/CSRF/register
  - **C** RBAC enforcement · **D** Checkout (COD+crypto) + stock + movements + audit + payment rules
  - **E** Lockout + rate limit (poslednji redosled) · **F** Order lifecycle, webhook (idempotencija, failed→stock restore), refund (409 na drugi), shipped/delivered+history, CSV export
- **Webhook contract:** API očekuje **`cryptoTxHash`** (ne `txHash`); idempotentan dup vraća `{duplicate:true}`.
- Pokretanje: `node scripts/run-api-tests.mjs` (reset `dalli_test`, spawn :3100, node --test).

---

## 2. FAZA 1 — ARCHITECTURE CONSOLIDATION

### 2.1 Delatnost
Dokument: **`ARCHITECTURE_MASTER.md`** (10 sekcija) — bez izmena koda (zabrana korisnika).

### 2.2 Verdict
> **MPA + Backend** — arhitektura ostaje; **ne prelazi se na SPA**.

### 2.3 Ključni nalazi
| Nalaz | Detalj |
|---|---|
| **Dual source of truth (RIZIK)** | `data/*.json` (build-time / Netlify CMS) vs **PostgreSQL/Prisma** (runtime transactions) — rizik evidentiran u master dokumentu |
| **3 admin sistema** | (1) legacy `admin-login.html` + `js/admin.bundle.js` — **u prod** · (2) Netlify CMS `admin/config.yml` — **u prod** · (3) `admin-new/` Imperium SPA — u razvoju, NIJE deploy |
| Status admin-new | vanilla JS (nema React) |
| Build flow | `data/*.json` + `templates/*.html` + `scripts/*.cjs` → SSG (generisane kategorije, proizvodi, blog, sitemap) |
| Deployment | Netlify (storefront) + VPS/Docker (API) + Neon/Upstash/Meili (podaci) |

---

## 3. FAZA 2 — STOREFRONT MODERNIZATION

### 3.1 Delatnost
Dokument: **`STOREFRONT_STRATEGY.md`** (6 taskova + tabela odluke + roadmap). Bez implementacije.

### 3.2 Izmereni podaci (audit)
- Homepage JS: **~331 KB** (od toga **313 KB** legacy `app-DF8jbjkA.js` + **152 KB** `app-CjuPNHl0.js`)
- Homepage HTML: **202 KB**; CSS: **5 fajlova** (duplikati); sitemap: **20 URL-a**; search-index: 11.3 KB
- `dist/` je **transijentan** (menja se po build-u; moguć paralelni akter)

### 3.3 Tabela odluke (težine)
| Opcija | Skor | Rezultat |
|---|---|---|
| **B. Hybrid MPA + React Islands** | **4.15** | ✅ **PREPORUKA** |
| D. Next.js (SSG/SSR) | 3.9 | — |
| A. Zadržati čisti MPA | 3.3 | — |
| C. Čista React SPA | 2.6 | ✗ najgora |

### 3.4 Zašto B (ne SPA, ne Next)
- Čista SPA pogoršava LCP/FCP (prazan HTML shell do hydrate); bez SSG sloja gubi SEO (danas 20+ URL hijerarhija build-time pre-rendered).
- React rešava komponentni sloj, NE dugove (dupli source of truth, 3 admin sistema).
- B = **6–10 čovek-dana** vs C = 40–70, D = 70–120.
- 80% vrednosti SPA dolazi kroz islands za ~15% troška (drawer, quick-view, search autocomplete, ProductStudio, loyalty).

### 3.5 Roadmap (bez implementacije)
- **2a Safety:** CSS 5→3, code-split `app.jsx`, `js/islands/`
- **2b Islands prioritet:** CartDrawer → QuickView → SearchAutocomplete → ProductStudio → LoyaltyWidget
- **2c KPI:** LCP/INP/AddToCart + revizija za C/D za 12–24 meseca

---

## 4. FAZA 3 — WORLD-CLASS LUXURY EXPERIENCE

### 4.1 Delatnost
Dokument: **`LUXURY_EXPERIENCE_ROADMAP.md`** (benchmark 6 kuća, audit 8 oblasti, 21 iniciativa, KPI). Bez implementacije.

### 4.2 Benchmark (šta kuće mogu dati DALLI-ju)
| House | Kjučni lekcija |
|---|---|
| Hermès | Exclusivity + waiting list + „art of making" filmovi |
| Louis Vuitton | Kampanje kao filmovi + lookbook + seamless lux mode |
| Dior | Heritage pripovedanje + concierge chat |
| Armani | Tipografska disciplina, whitespace, restriktivna paleta |
| Hugo Boss | Brisk checkout bez frikcije, size advisor |
| Zegna | Material-first PDP + made-to-measure |

### 4.3 Audit 8 oblasti (sada vs cilj)
1. **Homepage** — katalog vs editorijal kampanja (nema video heroja, lookbooka)
2. **PDP** — funkcionalan, ne senzualan (materijal-priče odvojeno, nema model stilova)
3. **Checkout** — višeslojan, bez concierge/gift/express
4. **Mobile** — responsive, ali heavy JS (331 KB); bez app-feel gestova
5. **Storytelling** — 26 editorial fajlova + 16 blog postova POSTOJI, ali nisu integrisani u PDP/checkout
6. **Personalization** — `personalization.json` (collaborative .35 / contentBased .30 / FBT .20) ali nije UX-first
7. **Visual luxury** — theme toggle + design-system + experience engine (edge theme-injector) postoje; fali tipografska discipline
8. **Retention** — loyalty tierovi (member/silver/gold/black) postoje, ali nisu „clienteling"

### 4.4 Ranking — Top inicijative (impact/effort/revenue→priority; formula `impact×0.4+revenue×0.4−effort×0.2`)
| # | Inicijativa | Prioritet |
|---|---|---|
| **P0-1** | Material-first PDP (editorial + fabric science inline + trust strip) | **3.8** |
| **P0-2** | Checkout concierge + gift options | **3.4** |
| **P0-3** | Sezonski kampanj hero (video/parallax) + lookbook | **3.4** |
| **P0-4** | Loyalty progres bar + ekskluzivni drops | **3.4** |
| **P0-5** | Veličinski savetnik (size advisor) | **3.2** |
| P0-6 | „Tihi dizajn" pass (tipografija/whitespace preko theme enginea) | 2.8 |
| P1-1 | „Atelje DALLI" — heritage + sustainability editorial (SSG) | 2.8 |
| P1-2 → P3-1 | Styling look → review incentive → view-transition → PDP recs → lookbook → referral → drip email → video → kapsule → waiting list → AR VTO → MTM | 2.6 → 1.8 |

### 4.5 Konkurentska prednost
> **„Tihi luksuz + brzina SSG + experience engine"** — ne kopiramo SPA vladare; koristimo ono što već posedujemo (SSG brzina, edge theming, kripto plaćanje +15%, organski pamuk priča, VTO/360).

### 4.6 KPI targeti (3 meseca)
LCP <1.6s · INP <200ms · AddToCart +15–25% · AOV +10–15% · Checkout conversion +8–15% · VIP retencija ≥35% · Newsletter→drops ≥20%.

---

## 5. FAZA 4 — PRODUCTION READINESS

### 5.1 Deliverables (4)
| Fajl | Sadržaj |
|---|---|
| **`DEPLOYMENT_GUIDE.md`** | Topologija, deployment audit, env mapa (Task 1–2), Neon (3), Upstash (4), Netlify/Vercel (5), Security (6), Backup (7), runbook |
| **`PRODUCTION_CHECKLIST.md`** | Go-live checklista (10 sekcija, blokeri → smoke) |
| **`ROLLBACK_PLAN.md`** | Track A (Netlify 5–10 min), B (Docker image), C (baza: forward-fix vs restore), D (cache/search); RTO ≤30 min, RPO ≤24h |
| **`.env.example`** | Proširen prema realno korišćenim varijablama + „Reserved/nekorišćeno" sekcija |

### 5.2 🚫 KRITIČNI BLOKERI ZA GO-LIVE (7)
| # | Bloker | Lokacija |
|---|---|---|
| 1 | `[edge_functions]` sintaksno NEVAŽNO → mora `[[edge_functions]]` (array) | `netlify.toml` |
| 2 | **Dupli `constructor` u klasi** (2×) → funkcija se ne bundluje | `netlify/functions/security/security-audit-logger.js:83` |
| 3 | `@netlify/blobs` nije deklarisan dep (koriste ga experience/promotions/redirects/languages/audit) | `netlify/functions/package.json` |
| 4 | **Dupliran `redis:` servis** → compose ne parsira | `docker-compose.yml` |
| 5 | **Dockerfile ne instalira server deps** (`server/package.json`): express/socket.io/cors/jsonwebtoken → `node server/index.js` u image-u pada | `Dockerfile` |
| 6 | Referenciraju se `./init-scripts` i `./ssl` koji **ne postoje** | `docker-compose.yml` |
| 7 | **JWT_SECRET/JWT_REFRESH_SECRET** su dev-default fallback u kodu | `server/src/lib/auth.js` |

### 5.3 Security review (Task 6) — šta je već dobro
- TLS/HSTS preload u headers · kompletan CSP (nonce + trusted-types) · XFO/COOP/COEP/CORP
- Cookies httpOnly + secure(prod) + sameSite=strict + CSRF double-submit
- CORS allowlist (CSV `FRONTEND_URL`) + origin check na mutating metode (403)
- Throttle 120 req/min na /api (fixed-window, Redis/memory fallback)
- `express.json` limit 2mb · graceful SIGTERM shutdown · mock gateway blokiran u prod (`checkout.js:357`)
- **Preporuke:** `helmet` na direktni API, `npm audit` u CI, 2FA za admin, stroži auth rate limit

### 5.4 Env mapa (koje varijable kod STVARNO čita)
`DATABASE_URL` (Prisma) · `REDIS_URL` (ioredis cache+socket) · `JWT_SECRET`/`JWT_REFRESH_SECRET` · `PORT`/`NODE_ENV` · `FRONTEND_URL` (CORS CSV) · `CRYPTO_DISCOUNT_PERCENT`/`CRYPTO_RATE_RSD` · `MEILI_HOST`/`MEILI_API_KEY` · `SMTP_HOST/PORT/USER/PASS` · `NETLIFY_SITE_ID`/`NETLIFY_AUTH_TOKEN` (blobs) · `SITE_URL`/`ALERT_WEBHOOK_URL` · `API_URL` (search upstream) · `TEST_DB`/`TEST_PORT`/`SEED_PASSWORD`/`GENERATE_OUTPUT_DIR`.
**Nekorišćene (rezervisane):** `RATE_LIMIT_*`, `EMAIL_FROM`, `CRYPTO_WEBHOOK_SECRET`, `GA_MEASUREMENT_ID`.

### 5.5 Neon / Upstash / Netlify validacija (Tasks 3–5)
- **Neon:** URL mora `?pgbouncer=true&connection_limit=1&schema=public`; `npx prisma migrate deploy`; health `/api/v1/health` → `db: up`.
- **Upstash:** koristiti **TCP `rediss://…`** (ioredis), NE REST URL; validacija `redis-cli -u … PING` → PONG; app pada na memory fallback (safe).
- **Netlify:** `netlify functions:serve` -> 13/14 (security fn pada); **scheduled-audit NIJE zakazan** (nema `[[schedules]]` u toml); Node 24 vs netlify-cli 17.38.1 nestabilan.
- **Vercel:** **nije target** (funkcije su Netlify-specifične; nema vercel.json).

### 5.6 Backup (Task 7)
- Neon built-in PITR (free ~48h); preporuka: dnevni `pg_dump --format=custom` → off-site (S3), retention 30 dana, mesečni test restore.
- Redis = regenerabilan (app self-heals na memory); Meili reindex iz baze.
- **RPO ≤24h · RTO ≤30min.**

---

## 6. FAZA 5 — DALLI 2.0 BLUEPRINT

### 6.1 Teza
> **„Digital Couturier"** — DALLI 2.0 ne prati kuće, nego radi ono što one ne mogu (legacy SPA, globalna uniformnost).
> Cilj: *„Every outfit you dream of, styled, fitted, delivered, and remembered."*

### 6.2 8 stubova (uz re-use postojećeg koda)
| Stub | Ključ | Re-use |
|---|---|---|
| 1 · **Personalization engine** | event stream (na `js/core/events.js`), pgvector embeddings, recos nivoi 1–5 | `personalization.json`, `events.js` |
| 2 · **AI stylist** | konverzacioni stylist + Look Builder + fit asistent | `VirtualTryOnAI.js` (swap contract) |
| 3 · **Visual search** | slikom do proizvoda + find-the-look + camera→VTO bridge | VTO config (`eu-central-1`) |
| 4 · **Loyalty 2.0 + VIP Klan** | statusna ekonomija, paid tiers (Gold/Black), drops, waiting list | `loyalty.json` (black + personal_shopper_access) |
| 5 · **Luxury concierge** | WhatsApp 1:1 (ljudi + AI copilot), return atelier | SMTP templates |
| 6 · **Advanced analytics** | Customer360/CLV, luxury metrics, Command Center | chart.js + scheduled-audit |
| 7 · **Omnichannel** | unified commerce: web/IG/shop/chat-to-order/butik QR | UGC feed + redirects |
| 8 · **(privatnost)** | GDPR/LSSI, consent, brisanje „digitalnog odraza" | cookie-consent |

### 6.3 Roadmap (7 faza, ~6–8 meseci inkrementalno)
2.0-A Foundations (event stream, pgvector, /v2 skeleton) → 2.0-B Personalization v1 → 2.0-C Stylist MVP → 2.0-D Visual search + fit → 2.0-E Loyalty+VIP → 2.0-F Concierge+Omni → 2.0-G Command Center.
- **2.0-A prvi korak:** `POST /v2/track` (batch, Redis queue), `/v2/personalization` recos upgrade, identify (anon→logged), /v2 API skeleton + OpenAPI.

### 6.4 KPI targeti (12 meseci nakon 2.0)
Konverzija +25–35% · AOV +20–30% · refund stopa −30% · VIP retencija (180d) ≥50% · stylist→buy ≥8% · visual search→cart ≥5% · omni share 15–20% web revenue.

---

## 7. OSTALI NALAZI (kroz sve faze, NEGDE I DALJE OTVORENI)

| Nalaz | Detalj | Faza |
|---|---|---|
| SEO generisane stranice u source root-u (majice.html, dukseri.html itd.) imaju **parse bug** (`>` canonical link) → vite dev 500 | `majice.html:13`-tip | Runtime |
| Vite dev **nema `/api` proxy** → browser API pozivi padaju na SPA-fallback | `vite.config.ts` (dev :8000, preview :8080) | Runtime |
| `dist/` je **transijentan** (zavisi od poslednjeg build-a; sadržaj se menjao tokom audita — moguć paralelni akter) | dist/ | 1–2 |
| `external_node_modules = [sharp, chart.js, date-fns, idb, workbox-window]` nepotrebno u Netlify runtime paket | `netlify.toml` | 4 |
| `server/start` koristi `--env-file-if-exists=../.env` (relativno, radi samo iz `server/` dir-a) | `server/package.json` | 1,4 |
| Dual source of truth (JSON CMS vs DB) — plan da se svede na jedan izvor | — | 1 |
| 3 admin sistema — konsolidovati pre 2.0 | — | 1,5 |

---

## 8. TESTIRANJE I KVALITET
| Kontrola | Status |
|---|---|
| API integracioni testovi (node --test) | **37/37 PASS** (Suite A–F) |
| Lint (eslint, max-warnings 0) | **0 grešaka** |
| Vite build | prolazi (SSG + SEO + PWA) |
| Validadija HTML (`validate-html.cjs`) | integrisano u `npm run build` |
| CI/CD | `.github/workflows/ci.yml` (lint/stylelint/typecheck/test/e2e/a11y/visual/perf) + `deploy.yml` (preview + production; secreti `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`) |

---

## 9. KOMPLETNA LISTA DELIVERABLES (13 dokumenata)
| Fajl | Faza | Svrha |
|---|---|---|
| `ARCHITECTURE_MASTER.md` | 1 | Arhitektonska referenca (MPA+Backend, dual SOF, rizici, ciljna arhitektura) |
| `STOREFRONT_STRATEGY.md` | 2 | 6 taskova + tabela odluke + roadmap (rekomendacija B) |
| `LUXURY_EXPERIENCE_ROADMAP.md` | 3 | Benchmark + audit 8 oblasti + 21 iniciativa + KPI |
| `DEPLOYMENT_GUIDE.md` | 4 | Topologija, env, Neon/Upstash/Netlify validacija, security, backup, runbook |
| `PRODUCTION_CHECKLIST.md` | 4 | Go-live checklista |
| `ROLLBACK_PLAN.md` | 4 | Rollback runbook (A–D trackovi) |
| `.env.example` | 4 | Šablon svih realno-korišćenih env varijabli |
| `DALLI_2_0_BLUEPRINT.md` | 5 | Next-gen platform blueprint (8 stubova) |
| `LOCAL_DEVELOPMENT_GUIDE.md` | Runtime | Lokalni dev vodič (portovi, komande) |
| `STARTUP_COMMANDS.md` | Runtime | Brze komande za pokretanje |
| `LOCAL_TEST_CHECKLIST.md` | Runtime | Checklista lokalne verifikacije |
| `CHANGELOG.md` | Core | Istorija implementacije (37 provera) |
| `COMPREHENSIVE_ANALYSIS_REPORT.md` | Core | Detalni core implementacioni izveštaj |

---

## 10. TREMUTNO STANJE / SLEDEĆI KORACI
- **Svi runtime procesi ugašeni** (API 3001, vite dev 8000, preview 8080, functions 9999, fake redis 6390, pg-dev 5433) — od korisnika „obustavi sve".
- **Radna pravila:** ne diraj business logiku bez dozvole; frontend frozen; `server/index.js` (Socket.IO proširen od strane paralelnog aktera) uvek re-read pre edita; netop prevoditi testiranje bez potrebe.

### Prioritet sledećih koraka (potrebna dozvola)
1. **Rešiti 7 produkcionih blokera** (Phase 4 §5.2) — prvo `netlify.toml` edge, `security-audit-logger.js`, blobs dep, `docker-compose` dup, `Dockerfile` server-deps.
2. **Faza 2a Storefront** (bezbedni dobici: CSS dedupe, code-split `app.jsx`, js/islands/).
3. **Faza 3 P0** (Material-first PDP, Gift+Concierge, Sezonski hero) — najviši revenue/impact.
4. **Faza 5 2.0-A** (event stream + pgvector + /v2 skeleton).
5. Redovno: `npm run lint && npm run test:api` (37/37) + održavati CHANGELOG.

---

*Kraj izveštaja — pokrivene sve faze 1–5 sa svim nalazima, preporukama, blokerima i sledećim koracima. Ništa nije izostavljeno.*