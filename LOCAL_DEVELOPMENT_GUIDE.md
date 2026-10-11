# LOCAL DEVELOPMENT GUIDE — DALLI E-commerce

Faza: **LOCAL RUNTIME VERIFICATION** (audit, bez izmena aplikacije).
Svrha: tačne komande i URL-ovi za lokalno pokretanje posle FE/BE migracije.

---

## 1. Arhitektura lokalnog runtime-a (posle migracije)

```
┌─ Frontend (static SPA) ─────────────────────────────────────────┐
│  izvor: *.html + js/ + css/ (Vite 5, rollup input u vite.config.ts)│
│  dev :  vite dev  → http://localhost:8000                        │
│  prev:  vite preview (servira dist/) → http://localhost:8080     │
└──────────────────────────────────────────────────────────────────┘
┌─ API backend (Node + Express) ───────────────────────────────────┐
│  server/index.js  → http://localhost:3001                        │
│  rute: /api/v1/*, legacy /api/*, /admin/auth, /health            │
│  zavisnosti: Postgres (5433 dev / 5432 docker) + Redis (6390/6379)│
└──────────────────────────────────────────────────────────────────┘
┌─ Netlify Functions (lokalno) ────────────────────────────────────┐
│  netlify/functions/* → http://localhost:9999/.netlify/functions/*│
└──────────────────────────────────────────────────────────────────┘
```

- **Frontend koristi relativne `/api/...` pozive** (npr. `fetch('/api/orders')`).
  U produkciji same-origin proxy (nginx / Netlify) prosleđuje `/api` ka API-ju.
  Čist `vite dev` **nema proxy** — API pozivi iz browsera padaju na SPA-fallback.
  Za funkcionalan dev stack koristi Docker kompozicu (nginx) ili eksplicitan proxy.

---

## 2. Preduslovi

| Stavka | Vrednost |
|---|---|
| Node.js | **20.x** (preporuka; netlify.toml `NODE_VERSION=20`). Lokalno trenutno v24 — radi za vite/API, netlify-cli je nestabilan (vidi Poznati problemi) |
| npm | >= 10 |
| Postgres | dev: `localhost:5433` (user `postgres` / baza `dalli`); docker: `5432` |
| Redis | dev: `localhost:6390` (fake redis) / 6379; docker: `6379` |
| Docker (opciono) | za `docker compose up` (full prod-preview) |

Install deps:

```bash
npm install                        # root (frontend)
npm install --prefix server        # server deps (ako nisu tu)
cd admin-new && npm install        # samo ako se razvija novi admin
```

---

## 3. Obligatory environment (.env)

Kopiraj `.env.example` → `.env` i podesi:

```bash
cp .env.example .env
```

Obavezno (server čita `--env-file-if-exists=../.env`):

| Var | Napomena |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5433/dalli?schema=public` (dev) |
| `REDIS_URL` | `redis://localhost:6379` (dev: fake redis na 6390 ili prazno → in-memory cache) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -base64 32` |
| `PORT` | `3001` |
| `NODE_ENV` | `development` lokalno |
| `FRONTEND_URL` | `http://localhost:8000` (za CORS) |

Opciono: `SMTP_*`, `CRYPTO_WEBHOOK_SECRET`, `GA_MEASUREMENT_ID`.

DB migracije + seed:

```bash
cd server && npx prisma migrate deploy --env-file-if-exists ../.env
node --env-file=../.env ../scripts/migrate-data.js --clean   # osnovni podaci
node --env-file=../.env ../scripts/seed-rbac.js              # role/permissions
```

---

## 4. Razvojni (live reload) startup

### 4.1 API backend → http://localhost:3001

```bash
cd server
npm run dev        # node --watch, env iz ../.env
```

Provera: `curl http://localhost:3001/api/v1/health` → `{"status":"ok","db":"up",...}`

### 4.2 Frontend (Vite dev) → http://localhost:8000

```bash
npm run dev        # = vite (port 8000, hmr off, otvara browser)
```

Provera: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/` → `200`.

> **Napomena:** vite dev servira SPA ulaze (index, cart, checkout, profile, orders,
> wishlist, settings, size-guide, blog). Generisane SEO stranice `majice.html`,
> `dukseri.html`, `products.html`, `muska-garderoba.html`, `zenska-garderoba.html`,
> `trenerke.html` **u izvornom root-u imaju parse bug** (canonical link bez `>`)
> → vite dev vraća **500** za njih; ispravne kopije su u `dist/` (vidi 5).

### 4.3 Ako želiš ispravan dev bez Docker-a (API proksi)

Opcija: `~/Documents/Default Project/moonlight-sajt` + nginx ili dodavanje
`server.proxy['/api'] → localhost:3001` u `vite.config.ts` (nije aplikaciona logika,
ali izvan obima ovog audita — dokumentovano kao opcija).

---

## 5. Production-preview (dist build)

### 5.1 Build

```bash
npm run build       # validate-html + vite build                → dist/
npm run build:prod  # kompletan pipeline: dist/ + SEO stranice  → dist/
                    #  = scripts/build.cjs (generate-products, category-pages,
                    #    blog render, sitemap, validate-dist)
```

### 5.2 Static preview (samo frontend) → http://localhost:8080

```bash
npm run preview     # = vite preview (servira dist/)
```

Provera:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/majice.html   # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/manifest.json # 200
```
> Vite preview **ne prox-uje `/api`** — `/api/...` vraća SPA index.html (200 po fallback-u),
> nije pravi API. Za full preview sa API-jem koristi Docker (5.3) ili direktno :3001.

### 5.3 Full production-preview (nginx + API + DB + Redis + Meilisearch)

```bash
docker compose up --build
```

Servisi: `postgres:5432`, `redis:6379`, `meilisearch:7700`, `app:3001`, `nginx:80/443`
(nginx servira `dist/` i prox-uje `/api → app:3001`, `/admin/auth`, `/api/search`,
rate limiting, health na `/health`).

URL-ovi:
- Frontend: `http://localhost`
- Health: `curl http://localhost/health`
- API (same-origin): `http://localhost/api/v1/...`

> Ustanovljeno u auditu (nije menjao):
> - `docker-compose.yml` sadrži **duplikat `redis:` servisa** (YAML last-wins).
> - referencira `init-scripts/` (ne postoji) i `./ssl` (ne postoji) — proveriti pre upa.
> - Dockerfile radi samo `npm ci` u root-u; server deps (express i dr.) nisu deklarisan
>   u root package.json → dva-način je da se u image dopremi `server/node_modules`.
> - Docker daemon **nije dostupan** u trenutnoj radnoj mašini → 5.3 nije izvršen.

### 5.4 Netlify Functions lokalno

```bash
npx netlify functions:serve        # → http://localhost:9999
# funkcija: http://localhost:9999/.netlify/functions/<name>
# potpuni lokalni Netlify runtime (frontend dist + functions):
npx netlify dev
```

Provera: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9999/.netlify/functions/search`

> Ustanovljeno u auditu:
> - `netlify.toml` ima nevalidni `[edge_functions]` blok (mora `[[edge_functions]]`
>   array) → **netlify-cli odbija config**, pa i `netlify dev` i `netlify deploy`
>   neće startovati. Radni bypass u /tmp (bez `[edge_functions]`) startuje server,
>   13/14 funkcija se učitava, ostale padaju na `@netlify/blobs` (nije instaliran
>   kao top-level dep) i esbuild bug-u `security/security-audit-logger.js` (2 konstruktora).
> - Node v24 + netlify-cli 17.38.1: proces neujednačen (esbuild crash) → koristiti Node 20.

---

## 6. Automatski API testovi

```bash
cd server && npm run test:api       # reset dalli_test, spawn :3100, node --test (37 testova)
```

---

## 7. URL matrica

| Šta | URL |
|---|---|
| Frontend dev (Vite) | http://localhost:8000 |
| Frontend preview (dist) | http://localhost:8080 |
| Backend API direktno | http://localhost:3001 |
| API base (/api/v1) | http://localhost:3001/api/v1 |
| API legacy (/api) | http://localhost:3001/api |
| Health (API) | http://localhost:3001/api/v1/health |
| Health (nginx, docker) | http://localhost/health |
| Netlify Functions lokal | http://localhost:9999/.netlify/functions |
| Meilisearch (docker) | http://localhost:7700 |
| Admin login (statika) | http://localhost:8000/admin-login.html |
| CMS | /admin/cms (preko redirecta u netlify.toml) |

---

## 8. Poznati problemi (iz audita, ne rešavani)

1. **SEO stranice u source root-u — vite dev 500** (canonical link bez `>` na
   `majice.html:13` i slično). Dist kopije su ispravne (preview 200).
2. **netlify.toml `[edge_functions]` nevalidan** → blokira `netlify dev`/`deploy`.
3. **`security` funkcija ne bundluje** — `security/security-audit-logger.js:83` ima dupli konstruktor.
4. **`@netlify/blobs`** nije deklarisan na mesto gde ga bundler nađe → funkcije koje ga koriste 500.
5. **Node verzija**: v24 + netlify-cli 17 → nestabilan; preporuka Node 20.
6. **Vite dev bez `/api` proxy** — za puni dev koristi Docker ili dodaj proxy.