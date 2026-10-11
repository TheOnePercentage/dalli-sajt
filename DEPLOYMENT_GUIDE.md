# DEPLOYMENT_GUIDE.md — DALLI PRODUCTION READINESS

> PHASE: Production Readiness · Deliverable 1.
> Revizija: 2026-10-09 (verify passes na trenutnom kodu).
> Pokriva: deployment audit (Task 1), env (Task 2/3), Neon (Task 4), Upstash (Task 5),
> Netlify (Task 6), build artifacts (Task 7), migracije (Task 8), security (Task 9),
> mock endpoints (Task 10), backup & recovery (Task 13). Vidi i:
> `PRODUCTION_CHECKLIST.md` (go-live redosled) i `ROLLBACK_PLAN.md`.

---

## 1. TOPOLOGIJA (ciljna produkcija)

```
Browser
  │  https://dalli.rs (edge: Netlify CDN, edge function theme-injector)
  ▼
Netlify: dist/ (SSG MPA, PWA) + Netlify Functions (/api/security, blobs,
  experience, promotions, redirects, languages, search, send-email,
  scheduled-audit, generate-sitemaps, blog-*) + Edge Function theme-injector
  │
  ▼
API Server (Node 20, Express 4, Socket.IO) — VPS/Docker (persistent)
  │   server/index.js · /api/v1/* + legacy /api/* + /admin/auth
  ▼                        ▼
Neon PostgreSQL        Upstash Redis (TCP, ioredis) | Meilisearch (opcionalno)
```

| Sloj | Host | Artifakt | Deploy putanja |
|---|---|---|---|
| Storefront + functions | Netlify | `dist/` + `netlify/functions` | CI → `nwtgck/actions-netlify` (push na `main`) |
| API + Socket.IO | VPS/Docker | `server/` (Dockerfile) | `docker compose up -d app` |
| Baze / cache / search | Neon / Upstash / Meili | — | konekcija preko env |

---

## 2. DEPLOYMENT AUDIT — trenutno stanje (Task 1)

### Storefront — ✅ zrelo
- Build: `npm run build:prod` → `dist/` (SSG MPA + produktske hijerarhijske stranice +
  sitemap + PWA + islands injekt). Verify: 73 HTML / 44 SEO stranice / 0 grešaka;
  `scripts/check-size.js` = u budžetu.
- `netlify.toml`: publish `dist`, functions dir, edge functions, `[[redirects]]`
  (SEO + legacy hijerarhija + admin), `[[headers]]` (cache-control; CSP/HSTS u planu —
  vidi §9 CSP nala z). **Edge functions sintaksa je ispravljena: `[[edge_functions]]`.**
- CI/CD: `.github/workflows/ci.yml` (lint/stylelint/typecheck/test/e2e/a11y/visual/perf/build
  + deploy-preview na PR + deploy-production na main). ⚠️ Vidi nalaze CI u §9.

### API — ⚠️ funkcionalno, ali za prod završiti nala ze §9
- `server/index.js`: health (`/api/v1/health`), CORS allowlist, CSRF origin check na
  mutating methods, throttle (120/min → Redis/memory), JSON limit 2mb, graceful
  SIGTERM/SCIGINT (socket + prisma disconnect).
- Nedostaci za prod zabeleženi u §9: nema `helmet` (direktni VPS put), Socket.IO Redis
  adapter je komentarisan (multi-instance NIJE aktivno), fallback JWT tajne, debug
  endpoint `/api/socket/status`, legacy `server/init-db.js` (lowdb, hardkodovan admin —
  NIJE povezan u `server/index.js`).

### Docker / compose — ✅ sada validno (popravljeno u ovoj reviziji)
- `docker-compose.yml`: uklonjen **duplirani `redis:` servis** (ranije `docker compose up`
  nije parsirao). Servisi: `postgres, redis, meilisearch, app, nginx`.
- `Dockerfile`: sada installa i **server zavisnosti** (`npm ci --prefix server --omit=dev`)
  → `node server/index.js` u image-u radi (ranije padao: express/socket.io/korisni).
- `init-scripts/` i `ssl/` direktorijumi su **kreirani** (compose mount više ne failuje);
  `ssl/` zahteva operatorove sertifikate (`dalli.rs.crt`, `dalli.rs.key`) — vidi README.

### Fajlovi .env
- Root `.env` postoji i git-ignorisan je (`.gitignore` → `.env*`). `server/.env` NE postoji;
  server dev start koristi `--env-file-if-exists=../.env` (root `.env`). U prod: env se
  postavlja preko platforme (Docker env / systemd / Netlify env), ne preko fajla.

---

## 3. ENVIRONMENT VARIABLES (Task 2/3) — izvor: `.env.example`

Mapa env → kod (verifikovano `grep process.env` po celom repou):

| Varijabla | Gde se koristi | Prod obavezna? | Napomena |
|---|---|---|---|
| `DATABASE_URL` | `prisma/schema.prisma`, `server/src/lib/prisma.js` | ✅ | Neon + pgbouncer param |
| `REDIS_URL` | `server/src/lib/cache.js`, `server/src/lib/socket.js` | ✅ (multi-instance); else memory | Upstash TCP (`rediss://`) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | `server/src/lib/auth.js` | ✅ **HITNO** | bez njih → hardkodovane dev tajne |
| `PORT` | `server/index.js` | ✅ | k8s/Docker default 3001 |
| `NODE_ENV` | cookies secure, error handler, mock gate (`checkout.js`) | ✅ | `production` |
| `FRONTEND_URL` | CORS (CSV) + socket origin | ✅ | prod: kanni domen |
| `CRYPTO_DISCOUNT_PERCENT` / `CRYPTO_RATE_RSD` | `routes/checkout.js` | opcionalno | default 15 / 10_000_000 |
| `MEILI_HOST` / `MEILI_API_KEY` | `server/src/lib/meilisearch.js` | opcionalno (search) | default localhost:7700 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | `netlify/functions/send-email.js` | Opcionalno | `EMAIL_FROM` rezervisan |
| `NETLIFY_SITE_ID` / `NETLIFY_AUTH_TOKEN` | functions/edge (blobs, audit) + CI | ✅ | Netlify UI auto-postavlja site_id |
| `SITE_URL` | `scheduled-audit.js`, edge | ✅ | konzistentan sa prod domenom |
| `ALERT_WEBHOOK_URL` | scheduled-audit alert | Opcionalno | Slack/Discord |
| `API_URL` | `netlify/functions/search.js` (upstream) | ✅ | mora biti **public** API URL |
| `TEST_DB` / `TEST_PORT` | `scripts/run-api-tests.mjs`, `setup-test-db.mjs` | samo CI | |
| `SEED_PASSWORD` | `scripts/seed-rbac.js` | samo init | SAMO dev — ne puniti u prod |
| `GENERATE_OUTPUT_DIR` | build skripte | samo build | |
| `POSTGRES_PASSWORD` / `MEILI_MASTER_KEY` | `docker-compose.yml` | VPS compose | kompose var-e |

> Rezervisane (NE čita ih kod): `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`,
> `CRYPTO_WEBHOOK_SECRET`, `GA_MEASUREMENT_ID` — ostaju u `.env.example` §reserved.
> Prvo upoređuj kod pre dodavanja novih; ne širi env nepotrebno.

**Generisanje tajni:**
```bash
openssl rand -base64 32   # JWT_SECRET / JWT_REFRESH_SECRET
openssl rand -base64 24   # SMTP_PASS (ako je app-specifican)
```

**Gde definisati:**
- **Netlify** (Site → Environment variables): `SITE_URL`, `API_URL`, `ALERT_WEBHOOK_URL`,
  `NETLIFY_AUTH_TOKEN`, `SMTP_*` (+ auto `NETLIFY_SITE_ID`).
- **API host** (Docker env / systemd): `DATABASE_URL`, `REDIS_URL`, `JWT_*`, `NODE_ENV`,
  `PORT`, `FRONTEND_URL`, `MEILI_*`, `SMTP_*`.
- **GitHub secrets** (ci.yml/deploy.yml): `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.

---

## 4. NEON POSTGRESQL — VERIFIKACIJA (Task 4)

**U kodu:** `server/src/lib/prisma.js` → `new PrismaClient()`; schema u `prisma/schema.prisma`
(datasource `postgresql`, `env("DATABASE_URL")`); 74 modela. Migracije u `prisma/migrations/`:
- `20261008173120_prisma_v2`
- `20261008173447_product_metadata_review_details`
- `20261008173815_sitesettings_cuid`

**Neon pooler:** URL mora sadržati `?pgbouncer=true&connection_limit=1&schema=public`
(Prisma korektno radi kroz transaction pooler). PrismaClient nema eksplicitan
`connection_limit`, pa ovaj URL parametar je kritičan da se izbegne saturacija pool-a.

**Validacija (operator):**
```bash
psql "$DATABASE_URL" -c "SELECT version();"
npx prisma migrate deploy    # primena migracija (idempotentno, safe za prod)
npx prisma generate          # klijent usklađen (verzija == na serveru)
node -e "import('./server/src/lib/prisma.js').then(async m=>{await m.prisma.$queryRaw\`SELECT 1\`;console.log('DB OK');await m.prisma.\$disconnect()})"
```

**Iz aplikacije:** `GET /api/v1/health` → `{"status":"ok","db":"up",...}` (select 1 kroz prisma).

**Backup:** Neon built-in snapshots/PITR; preporuka §10.

---

## 5. UPSTASH REDIS — VERIFIKACIJA (Task 5)

**U kodu:**
- Cache: `server/src/lib/cache.js` → `ioredis`, `lazyConnect`, `retryStrategy: () => null`
  (fail-fast → memory fallback). `cache.kind` = `redis` | `memory` (vidi u `/api/v1/health`).
- Socket.IO Redis adapter: `server/src/lib/socket.js` — stvara pub/sub klijente, ali
  `createAdapter(...)` je **zakomentarisan** → adapter NIJE aktivan. ⚠️ Doc: multi-instance
  API bez adaptera znači bez zajedničkog socket/a uredjaja. Za sada je jedan API instance
  pa je memory-adapter OK; pri scale-u dodati `@socket.io/redis-adapter` u `server/package.json`
  i otkomentarisati `io.adapter(...)`.

**Validacija TCP endpointa (NOT REST):**
```bash
redis-cli -u "rediss://default:<token>@<region>.upstash.io:<port>" PING   # → PONG
```

**Iz aplikacije:** na startu log `[cache] Redis connected: rediss://***@...`; `/api/v1/health`
vraća `"cache":"redis"`. Bez `REDIS_URL` → `"cache":"memory"` (safe fallback, app NE pada).

> ⚠️ Upstash **REST** URL NIJE podržan kroz ioredis; koristi TCP connection string
> (`rediss://default:<token>@<region>.upstash.io:<port>`).

---

## 6. NETLIFY — VERIFIKACIJA (Task 6)

### Mreža deploy konfiguracija (danas ZELENA)
- `netlify.toml`: `[[edge_functions]]` (ispravljeno), `functions` dir, `included_files`,
  `[[headers]]` (cache), `[[redirects]]` (SEO hijerarhija + legacy), `[build.environment]`
  (`NODE_VERSION=20`, `NPM_FLAGS=--legacy-peer-deps`, `VITE_APP_*`).
- `netlify/functions/`: 14 funkcija + `security/` (index na `/api/*`, CSP/CSRF/CORS/rate-limit
  + report endpoints). `@netlify/blobs` je deklarisan u `netlify/functions/package.json` ✓.
- `security/security-audit-logger.js` — **popravljen** (dupli `constructor` + dupli
  `logCSPViolation` = SyntaxError; + runtime `this.EVENT_TYPES` na statičku klasu).
  Verifikovano: `node --check` OK + esbuild bundle funkcija (csp-report-only, scheduled-audit).
- Edge function `theme-injector.js` (path `/*`, skips admin/_netlify/api/assets) — injektuje
  theme-vars + experience boot + maintenance page. ✅ Sintaksa usklađena.
- **Nedostaje `[[schedules]]`** za `scheduled-audit` — funkcija nikad ne zakazuje. Dodati:
  ```toml
  [[schedules]]
    cron = "0 6 * * *"
    path = "/.netlify/functions/scheduled-audit"
    schedule = "@daily"
  ```

### CI/CD nalazi (za zeleni go-live) — vidi §9
1. `ci.yml` deploy-produkciju na push `main` PLUS dupli legacy `deploy.yml` (isti job-ovi)
   → **dva konkurentna deploy-a na istu lokaciju**. Pre go-live-a obrisati/unifikovati.
2. CI `npm run lint` + `npx prettier --check .` (repo-wide) trenutno FAIL → 17k+
   pre-postojećih prettier grešaka. CI je danas CRVEN. Preporuka: splitatelj: pin
   islands/kritične fajlove ili odraditi tehn. dug; do tada `--max-warnings`/scope.
3. U CI ne postoji `npm audit`. Dodati `npm audit --audit-level=high`.

### Lokalna validacija
```bash
npm run build:prod          # → dist/ (verifikovano: 73 HTML / 0 grešaka / sitemap 57)
netlify functions:serve     # (koristi Node 20; na Node 24 klijent je nestabilan)
netlify dev                 # lokalno edge+functions+redirects
```

---

## 7. BUILD ARTIFACTS & DIST (Task 7) — verifikovano

`npm run build:prod` redosled: validate-html → vite build → generate-products →
generate-category-pages → inject-islands → generate-sitemap → validate-dist.

- `dist/` veličina ~9.6 MB; sadrži: `index.html`, `*.html` (SSG generated 73), hijerarhiju
  `casual/`, `elegance/`, `collections/`, `blog/`, `locations/`, `admin/`, `assets/`,
  `data/search-index.json`, `_headers`, `_redirects`, `sw.js`, `manifest.json`,
  `robots.txt`, `sitemap.xml`.
- `registerSW.js`, `personalization.js`, `search-ui.js` se emituju u `dist/` root.
- Islands loader: `assets/js/index-*.js` (hashed); 13/13 SSG produkt stranica ima loader.
- `scripts/check-size.js` proverava budžet (CI job `check-size`).

---

## 8. DATABASE MIGRATION STRATEGY (Task 8) — verifikovano

- Migracije: folder-bazirane (`prisma/migrations/<timestamp>_<name>/migration.sql`),
  zaključan `migration_lock.toml` (provider `postgresql`).
- **Produkcija:** epik su safe `npx prisma migrate deploy` (primenjuje samo nove; bez reset).
  NIJE automatizovano u build/deploy (po dizajnu) — operator pokreće pre deploy API verzije
  koja zahteva novu šemu.
- **Develop:** `prisma migrate dev --create-only` u CI-review, zatim ručna provera SQL-a —
  zbog toga `migrate dev` se ne koristi direktno na prod.
- **Seed:** `prisma/seed.js` + `scripts/seed-rbac.js` (admin/roles). RBAC seed koristi
  `SEED_PASSWORD` — NE pokretati u prod proizvoljno.
- **Rollback migracija:** vidi `ROLLBACK_PLAN.md` §3 (default forward-fix; restore iz dumps).

---

## 9. SECURITY REVIEW (Task 9) — nalazi i status

| Područje | Status | Preporuka za prod |
|---|---|---|
| TLS | ✅ HSTS `max-age=31536000; includeSubDomains; preload` (netlify.toml; .htaccess za Apache put) | domen sa TLS; HSTS preload submit |
| CSP / nonce | ⚠️ **BLOKER — mehanizam nefunkcionalan** (vidi dole) | implementirati nonce na edge-u ili relaksirati CSP |
| Frame/iframe | ✅ XFO SAMEORIGIN, frame-ancestors 'self', COOP/COEP/CORP | proveriti CORP/CORS na CDN asetima (fonts ima ACAO *) |
| JWT tajne | ⚠️ fallback poznatih dev tajni u `auth.js` ako env nije setovan | **obavezno postaviti**; poželjno fail-fast guard + rotacija |
| Rate limit | ✅ 120 req/min fixed-window (Redis/memory, fail-open) | auth/login strožiji per-email per-IP (postoji `loginLockStatus`) |
| CSRF | ✅ origin-check na mutating methods (403) | admin cookie CSRF double-submit je u functions layer |
| Input | ✅ express.json limit 2mb | dodati `helmet` na direktni VPS API + query validation |
| Admin | ⚠️ RBAC seed postoji; admin SPA u `admin-new/` | 2FA; NE koristiti `server/init-db.js` (lowdb default admin lozinka) |
| Logging | ◐ pino dostupan; error handler loguje | remote agregacija; NE logovati tajne/body |
| Dependency | ⚠️ nema audit u CI | `npm audit --audit-level=high` u CI |
| Debug rute | ⚠️ `/api/socket/status` javan u prod | gejtovati/skloniti u production |
| Socket | ✅ origin allowlist | multi-instance: redis adapter iz §5 |

### CSP / nonce — detaljan nalaz (BLOKER)
- `netlify.toml` i `security/csp-report-only.js` imaju CSP sa `'nonce-{NONCE}'` +
  `require-trusted-types-for 'script'`.
- Statički HTML (dist) koristi placeholder `nonce="GENERATED_AT_RUNTIME"` (index.html ima
  klijentski replacement skript), dok **edge function** theme-injector ubacuje
  `nonce="{NONCE}"` — dva različita placeholder tokena.
- `scripts/csp-nonce-generator.js` (reference u `package.json`) **NE POSTOJI** → nema nijednog
  mesta koje generiše realan nonce niti postavlja CSP header sa njim.
- Posledica: sa aktivnim `netlify.toml` header-om svaki inline script/style bi bio blokiran.

**Preporuka (izabrati jednu):**
- **A (preporučeno):** obračunati nonce u edge function — edge generiše `crypto nonce` po
  zahtevu, menjajući `GENERATED_AT_RUNTIME`/`{NONCE}` u body-u i postavlja
  `Content-Security-Policy` sa `'nonce-<vrednost>'` (override toml-a). Skripta +
  header konzistentni po zahtevu.
- **B:** ukloniti `'nonce-{NONCE}'` nece iz CSP-a i preći na hash lokalnih inline blokova
  (bez `'unsafe-inline'`) ili na pragmatičan CSP bez `require-trusted-types-for`.
  **Ne** izgurati literal `'nonce-{NONCE}'` u produkciju.

---

## 10. MOCK ENDPOINTS — VERIFIKACIJA (Task 10) ✅

- **Payment mock:** `server/src/routes/checkout.js:357` — `if (NODE_ENV === 'production' &&
  payment.gateway?.startsWith('mock_')) return 403 'Mock confirmation disabled in production'`.
  → Verifikovano: mock gateway je **blokiran** u `NODE_ENV=production`. `mock_crypto`/
  `mock_card`/`MOCK_WALLETS` postoje isključivo kao dev klijentske etikete/credential.
- **Nijedan drugi mock endpoint ne postoji** u `server/src/routes/*` (grep `mock` → samo
  checkout rutama + testovi). Netlify functions nemaju mock.
- **Legacy:** `server/init-db.js` (lowdb admin seed) NIJE importovan od `server/index.js`
  (verifikovano) → ne može se aktivirati u prod putanji. Preporuka ukloniti iz repo-a ili
  izolovati pod `scripts/` za eksplicitni dev-only call.
- **CI testovi:** `scripts/run-api-tests.mjs` koristi `dalli_test` bazu (TEST_DB) — izolovana
  od prod podataka.

---

## 11. BACKUP & RECOVERY (Task 13) — checklist

> Ciljevi: **RPO ≤ 24h** (dnevni snapshot baze) / **RTO ≤ 30min** (restore + deploy).

### 11.1 Baza (Neon PostgreSQL)
- [ ] Neon built-in snapshots uključena; za SLA dodatno **dnevni `pg_dump` → off-site**:
  ```bash
  pg_dump --format=custom --compress=9 "$DATABASE_URL" > "dalli_$(date +%F_%H%M).dump"
  # upload na S3/GCS (retention 30 dana), npr. `aws s3 cp`
  ```
- [ ] Mesečni **test restore**: `pg_restore --clean --if-exists` u privremenu bazu + smoke
      (`SELECT count(*) FROM "Order"`; `GET /api/v1/health`).
- [ ] Role/grant ovlašćenja za dump — ograničen user (read-only replikacija ili dedicated dump user).

### 11.2 Cache (Upstash Redis)
- [ ] Redis je **regenerabilan** (nema poslovnih podataka; samo `rl:*`, session cache).
      Gubitak → app self-heal sa memory fallback. NIJE potreban dump backup.
- [ ] Ako se uvodi disk/međuverzija cache (npr. cart snapshot), tek tada backup.

### 11.3 Konfiguracija / tajne / env
- [ ] `.env.example` u gitu; realne vrednosti u vault (Netlify env + **Bitwarden/Vault
      snapshot**) — rollback bez "env miss".
- [ ] Baza tajni testirana: klon okruženja podigne API bez manuelnog unosa.

### 11.4 Deploy artifakt
- [ ] `dist/` generativan — nije backup kandidat; Netlify **deploy history** služi rollback.
- [ ] Docker image **tagovisan** `dalli-api:<git-sha>`; čuvati 2 prethodna „stable" taga.

---

## 12. NADZOR (MONITORING) — preporuka

- Uptime: `https://dalli.rs` + `https://api.dalli.rs/api/v1/health` (UptimeRobot/BetterStack),
  alert → `ALERT_WEBHOOK_URL`.
- Core Web Vitals (CrUX + `test:perf` u CI), error tracking (Sentry opcionalno).
- Log agregacija API (pino JSON → Loki/CloudWatch). NE logovati tajne.

---

## 13. DEPLOY RUNBOOK (azuriran — posle popravke blokera)

```bash
# 1. Preduslovi (DOGOvoreno u §9/§11 + PRODUCTION_CHECKLIST.md):
#    CSP nonce · JWT tajne · CI/workflow cleanup · prisma migrate deploy
git checkout main && git pull
npm ci
npm run lint && npm run stylelint && npm run typecheck   # (kidaj: repo-wide lint debt §9.2)
npm run test
npm run build:prod                                       # → dist/ (73 HTML / 0 grešaka)
npm run test:api                                         # API integracije (dalli_test)
netlify functions:serve                                  # bundle provera (Node 20)

# 2. Storefront → Netlify (CI: push na main; repository secrets setovani)
netlify deploy --build --prod --message "release <tag>"  # ili preko GitHub workflow-a

# 3. API → VPS (Docker)
docker compose build app && docker compose up -d app     # compose je sada validan
npx prisma migrate deploy                                # SAMO pri prvom setup / pre breaking-a

# 4. Smoke
curl -fsSI https://dalli.rs
curl -fsS https://api.dalli.rs/api/v1/health              # {"status":"ok","db":"up",...}
```

---

## 14. ZNANI NALAZI (rešenja u ovoj reviziji)

| Razredi nalaza | Pre revizije | Sada |
|---|---|---|
| `netlify.toml` edge_functions sintaksa | neispravna `[edge_functions]` | ✅ `[[edge_functions]]` |
| `security/security-audit-logger.js` | SyntaxError (dupli constructor) + runtime TypeError (statika) | ✅ ispravljeno, bundluje se |
| `docker-compose.yml` | dupli `redis:` → compose ne parsira | ✅ obrisan blok |
| `Dockerfile` | server deps neinstallane → API pada u image-u | ✅ `npm ci --prefix server` |
| `init-scripts/` + `ssl/` | mount fail | ✅ kreirani dirs + README |
| `.gitignore` | ssl keys nijesu ignorisani | ✅ `ssl/*.key`, `ssl/*.crt` |

**Ostali nalazi zabeleženi za go-live (NISU menjani — bez diranja logike):**
CSP nonce mehanizam (BLOKER, §9), JWT fallback tajne (set env + opcionalno fail-fast),
socket Redis adapter zakomentarisan (§5), `/api/socket/status` javan (§9), CI lint/prettier
dug + dupli deploy workflow + nema `npm audit` (§6/§9), nedostaje `[[schedules]]` za
scheduled-audit (§6), legacy `server/init-db.js` (dokumentovano, nije u prod putanji).

*Revizija završena: lokalu audit + popravka deployment-konfiguracije. Business logika netaknuta.*