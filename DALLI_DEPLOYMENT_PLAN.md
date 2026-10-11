# DALLI_DEPLOYMENT_PLAN.md — Production Deployment Plan (dalli.rs)

> PHASE: Final Deployment Preparation.
> Revizija: 2026-10-09.
> This is the authoritative plan for taking **dalli.rs** to production. Companion docs:
> `DNS_CONFIGURATION.md`, `GO_LIVE_CHECKLIST.md`, `FIRST_DEPLOY_RUNBOOK.md`,
> `ROLLBACK_PLAN.md`, `DEPLOYMENT_GUIDE.md`, `LAUNCH_DECISION.md`.

---

## 0. Prerequisites (must be true before this plan is executed)

| Gate | Status | Owner |
|---|---|---|
| Production package (`npm run build:prod`) green — 73 HTML / 44 SEO / 0 errors | ⏳ verified in current state | Dev |
| Go-live hardening verdict B applied (`LAUNCH_DECISION.md`) | ✅ done this session | Dev |
| Launch gates 1–5 from `LAUNCH_DECISION.md` | see GO_LIVE_CHECKLIST.md | Ops |

---

## 1. Hosting architecture audit (Task 1)

**Current (verified against repo):**

| Layer | Technology | Host | Artifact |
|---|---|---|---|
| Storefront + PWA + SEO pages | Vite SSG/MPA + React islands | **Netlify** | `dist/` (`npm run build:prod`) |
| Netlify Functions | JS, esbuild bundling | Netlify | `netlify/functions/**` (security, search, blog-, promotions, redirects, languages, experience, send-email, scheduled-audit, generate-sitemaps) |
| Edge Function | `theme-injector.js` (nonce CSP) | Netlify edge | `netlify/edge-functions/**` |
| API + Socket.IO | Node 20, Express 4 | **VPS / Docker** | `server/` (`Dockerfile`) |
| PostgreSQL | Neon 16 (managed) or compose `postgres:16` | Neon / VPS | `DATABASE_URL` |
| Redis | Upstash (managed) or compose `redis:7` | Upstash / VPS | `REDIS_URL` |
| Search | Meilisearch v1.9 | compose `meilisearch` on VPS (internal) or Meili Cloud | `MEILI_HOST` / `MEILI_API_KEY` |
| TLS storefront | Netlify Let's Encrypt | Netlify | auto |
| TLS API | nginx + Let's Encrypt | VPS | `ssl/` certs (or certbot) |

**Findings that affect go-live (handled below):**
1. `public/_headers` **overrides** `netlify.toml` headers on the same paths (Netlify precedence: file > toml). It is **weaker** (Permissions-Policy missing usb/bluetooth/accelerometer/gyroscope/magnetometer; duplicate `Permissions-Policy` line) and **lacks** COOP/COEP/CORP that are in `netlify.toml`. → Reconcile §4.1.
2. `docker-compose.yml` bundles `postgres`, `redis`, `meilisearch`, `app`, `nginx`. For the **managed-service topology** the VPS runs only `meilisearch + app + nginx` — use the prod override (§6 API).
3. `nginx.conf` currently serves `dalli.rs/www.dalli.rs` static **and** proxies the API. In the final topology the storefront is on Netlify, so nginx must serve **`api.dalli.rs` only** (§6.2).
4. Unique API surface served from VPS: `/api/v1/*`, legacy `/api/*`, `/admin/auth`, `/api/v1/auth`, `/api/v1/admin`, `/api/admin` (all guarded).

---

## 2. Final production topology (Task 2)

```
User browser
   │ https://dalli.rs  (www → 301 → dalli.rs)
   ▼
NETLIFY — CDN + Let's Encrypt
   ├─ dist/ (SSG HTML, PWA, hashed assets, _redirects, _headers)
   ├─ Edge Function theme-injector → per-request nonce + CSP header
   ├─ Functions: /api/security/* (CSRF/CSP reports/rate headers), search, blog..., send-email,
   │             promotions/redirects/languages/experience (blobs), scheduled-audit (cron "0 3 * * *")
   └─ (client JS calls)  https://api.dalli.rs
                              ▼
VPS (Docker compose)   — nginx :443 (TLS, api.dalli.rs) → app :3001
   ├─ app: Node 20 / Express / Socket.IO  (JWT fail-fast, origin-check, throttle)
   ├─ meilisearch (internal only, port 7700, not published to internet)
   └─ (no public postgres/redis ports)
        │ DATABASE_URL (pgbouncer=true&connection_limit=1)
        ├── Neon PostgreSQL 16  (managed, snapshots/PITR)
        │ REDIS_URL (rediss://… TCP)
        └── Upstash Redis (cache + socket pub/sub)
```

- **Storefront namespace:** `dalli.rs` + `www.dalli.rs` → Netlify.
- **API namespace:** `api.dalli.rs` → VPS IPv4 (A record).
- **Search namespace:** none public — Meilisearch is private on the VPS and reached only via the API.

---

## 3. DNS requirements (Task 3) — see `DNS_CONFIGURATION.md`

Summary:
- `dalli.rs` apex → Netlify (via Netlify DNS, recommended) or A `75.2.60.5` + AAAA from Site → Domain settings.
- `www.dalli.rs` → CNAME `<site>.netlify.app` (redirect loop to apex handled in Netlify).
- `api.dalli.rs` → A `<VPS_IPv4>` (AAAA if the VPS has IPv6).
- No public record for meilisearch/redis/postgres. Mail records (MX/SPF/DMARC) only if transactional SMTP is hosted on `smtp.dalli.rs`.

---

## 4. Netlify deployment steps (Task 4)

### 4.1 Reconcile headers first (do before first deploy)
In `public/_headers`:
- Remove the duplicate `Permissions-Policy` line.
- Match the `netlify.toml` Permissions-Policy set: `camera=(), microphone=(), geolocation=(), payment=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=(), bluetooth=()`.
- Add `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Resource-Policy: same-origin`.
- CSP is delivered by the edge function at runtime (nonce) — do **not** add a static CSP to `_headers`.

### 4.2 Create & link the site
```
netlify sites:create --name dalli-ecommerce
netlify link   # connect local repo → site
```

### 4.3 Configure environment (Site → Environment variables) — full list in §7 checklist
`SITE_URL`, `API_URL`, `ALERT_WEBHOOK_URL`, `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`, `NETLIFY_AUTH_TOKEN` (`NETLIFY_SITE_ID` is auto-injected).

### 4.4 Deploy
- CI path (recommended): GitHub workflow on `main` → `nwtgck/actions-netlify` with `NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID` secrets (§5).
- Manual: `npm run build:prod && netlify deploy --prod`.

### 4.5 Custom domain + TLS
- Site → Domain management → add `dalli.rs` + `www.dalli.rs`.
- Enable HTTPS (Let's Encrypt) — completes automatically after DNS points at Netlify.
- Set the primary domain to `dalli.rs` and let Netlify create the www→apex 301 redirect.

### 4.6 Verify deployed behavior
- `https://dalli.rs` returns HTML with CSP header containing `script-src 'self' 'nonce-…'` and **all** inline scripts carry the matching nonce.
- `/api/security/csp-report` accepts reports (204).
- `robots.txt`, `sitemap.xml` (57 URLs), `manifest.json`, `sw.js` return 200 via the `[[redirects]]` FE tokens.
- Optional: hold off on HSTS **preload** submission until the full site is verified.

---

## 5. Neon PostgreSQL configuration (Task 5)

1. Create Neon project **dalli** (region eu-central-1 or closest), branch `main`, compute 0.25–1 CU autoscale.
2. Create role `dalli` with a strong password; create database `dalli` owned by it.
3. Use the **transaction (pgbouncer) pooler** URL:
   ```
   postgresql://dalli:<pw>@<region>.pooler.neon.tech/dalli?pgbouncer=true&connection_limit=1&schema=public
   ```
   ⚠️ `connection_limit=1` is required for Prisma's default pooled connections — do not drop it.
4. Settings to enable in Neon dashboard:
   - Compute: keep warm (disable auto-suspend) to avoid cold-start on first prod request.
   - Backup: enable **PITR** + snapshots, retention ≥ 24h (compliance: 30 days).
   - IP Allowlist (optional, e.g. VPS static IP or 0.0.0.0/0 if API is behind the VPS).
5. Validate from the VPS:
   ```
   psql "$DATABASE_URL" -c "SELECT version();"
   npx prisma migrate deploy           # applies only new migrations (idempotent)
   npx prisma generate
   ```

---

## 6. Upstash Redis configuration (Task 6)

1. Create an Upstash Redis database: region eu-central-1, **TLS enabled**, eviction policy `allkeys-lru`, maxmemory as needed.
2. Copy the **TCP** (not REST) endpoint:
   ```
   rediss://default:<token>@<region>.upstash.io:<port>
   ```
   ⚠️ `ioredis` does not support the REST URL — must be `rediss://`.
3. Set `REDIS_URL` in the VPS env (`.env` used by `docker compose`).
4. Validate:
   ```
   redis-cli -u "$REDIS_URL" PING     # → PONG
   # API health reports "cache":"redis"; without REDIS_URL → "cache":"memory" (safe fallback)
   ```
5. No backup needed — Redis is regenerable (rate-limit + session cache only).

---

## 7. Environment-variable checklist (Task 7)

### VPS `.env` (API)
| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon pooler URL (§5) |
| `REDIS_URL` | ✅ | Upstash TCP (§6) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ | `openssl rand -base64 32`; fail-fast enforced |
| `NODE_ENV` | ✅ | `production` (mock gate, cookies, socket status) |
| `PORT` | ✅ | `3001` |
| `FRONTEND_URL` | ✅ | `https://dalli.rs,https://www.dalli.rs` |
| `MEILI_HOST` | ✅ | `http://meilisearch:7700` (compose) |
| `MEILI_API_KEY` | ✅ | Meili master key |
| `CRYPTO_DISCOUNT_PERCENT` / `CRYPTO_RATE_RSD` | optional | defaults 15 / 10_000_000 |
| `SMTP_*` | optional | transactional mail if sent from API |

### Netlify env
`SITE_URL=https://dalli.rs`, `API_URL=https://api.dalli.rs`, `ALERT_WEBHOOK_URL` (Slack/Discord), `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`, `NETLIFY_AUTH_TOKEN`. Build env auto: `NODE_VERSION=20`, `NODE_OPTIONS`, `VITE_APP_VERSION`, `VITE_APP_ENV=production`.

### GitHub secrets (CI)
`NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.

### Secrets hygiene
- Generation: `openssl rand -base64 32` (JWT), `openssl rand -base64 24` (passwords).
- Set only real values in platform vaults; `.env.example` in git is template only.
- After first bootstrap, rotate the bootstrap admin password (seed-rbac).

---

## 8. SSL/TLS verification checklist (Task 8)

### Storefront (Netlify)
- Auto cert (`*.netlify.app` + custom domain), auto-renew.
- Enforce HTTPS (Site → Domain → HTTPS).
- HSTS header present (`max-age=31536000; includeSubDomains; preload`) — submit HSTS preload after 2 weeks of HSTS or on confirmed load.
- Check: `curl -sI https://dalli.rs | grep -i strict-transport-security`
- ssllabs.com `https://dalli.rs` → grade A/A+.

### API (VPS nginx)
- Issue cert: `certbot --nginx -d api.dalli.rs` (uses `ssl/` mount alternative: place `dalli.rs.crt`/`dalli.rs.key` in `ssl/`).
- nginx TLS: TLSv1.2 + 1.3, secure ciphers only (hardcoded in `nginx.conf`), `ssl_session_cache shared:SSL:10m`.
- Verify:
  ```
  openssl s_client -connect api.dalli.rs:443 -servername api.dalli.rs </dev/null 2>&1 | grep -E "subject|issuer|Protocol"
  curl -fsSI https://api.dalli.rs/api/v1/health
  ```
- HSTS on API responses (nginx `add_header Strict-Transport-Security … always`) — optional but recommended; do **not** include `preload`/`includeSubDomains` if you ever plan a subdomain that must be http.

### General
- No mixed content anywhere (storefront assets over https).
- www → apex canonical redirect.
- Certs are private-key-protected (`.gitignore` covers `ssl/*.key`).

---

## 9. Production database migration order (Task 9)

Apply with `npx prisma migrate deploy` on the VPS (never `migrate dev/reset` in prod). Order is intrinsic (Prisma applies in timestamp order from `prisma/migrations/`):

1. `20261008173120_prisma_v2` — core schema.
2. `20261008173447_product_metadata_review_details` — product metadata + review details.
3. `20261008173815_sitesettings_cuid` — sitesettings CUID refactor.

Then (bootstrap, VPS, one-time):
4. `node scripts/seed-rbac.js` (idempotent upserts; 6 roles/permissions; creates default accounts seeded from `SEED_PASSWORD`) → **set a strong `SEED_PASSWORD` for the bootstrap run, rotate afterwards; do not ship `SEED_PASSWORD` into the prod `.env` permanently.**
5. Meilisearch product-index bootstrap: `node -e "…lib/meilisearch `syncIndex/seed`…"` or first admin save (the API syncs indexes on product writes).
6. Verify: `GET /api/v1/health` → `db: up`; `GET /api/v1/products` → non-empty; admin login works.

> Migration on prod is run by an operator as part of the runbook — it is intentionally NOT wired into the CI deploy (forward-fix policy, see ROLLBACK_PLAN.md §3).

---

## 10. First deployment runbook (Task 10)

Full detail in `FIRST_DEPLOY_RUNBOOK.md`. Order:
1. Preflight (build/tests, §4.1 headers fix, launch gates).
2. Provision VPS, Docker engine, UFW (allow 22/80/443 only), mount compose file.
3. Neon + Upstash provisioning (§5, §6).
4. VPS `.env` (§7) + `docker compose -f docker-compose.prod.yml up -d` (meilisearch+app+nginx; app env from host).
5. `prisma migrate deploy` + bootstrap (§9).
6. Netlify site create + env + first deploy (§4).
7. DNS switch (§DNS_CONFIGURATION).
8. Smoke + verification (§12).

---

## 11. Rollback procedure (Task 11)

- **Storefront:** Netlify → Deploys → select previous deploy → **Publish** (1–2 min). Static `dist/` is regenerable from the same commit.
- **API:** re-tag previous image `dalli-api:<git-sha>` → `docker compose up -d app`. Stateless processes; sockets reconnect (Socket.IO auto-reconnect).
- **DB schema:** forward-fix (new migration), never `migrate down` in prod. If a nullable/breaking schema requires data rollback → restore from Neon snapshot / `pg_restore --clean --if-exists` (§3 ROLLBACK_PLAN.md).
- **Redis:** regenerable — nothing to roll back.
- Reference: `ROLLBACK_PLAN.md` (RTO ≤ 30 min, RPO ≤ 24 h).

---

## 12. Final go-live sequence (Task 12)

```
1.  Merge + tag release (v1.0.0); CI runs lint/typecheck/test/build.
2.  Deploy storefront to Netlify (staging/preview) & verify edge CSP nonce.
3.  Provision Neon + Upstash + VPS services; run migrations + RBAC bootstrap.
4.  Verify API on VPS IP: https://<ip>/api/v1/health → ok.
5.  Point api.dalli.rs (DNS) → VPS; verify API cert + HSTS.
6.  Point dalli.rs + www.dalli.rs (DNS) → Netlify; Let's Encrypt completes.
7.  Full smoke (§12 Launch Day Procedure) + monitoring wiring.
8.  Declare production; HSTS preload placement decision; take down maintenance page.
```

The exact day-of procedure with configuration order, pre-DNS verification and post-launch smoke tests is the **final section of `GO_LIVE_CHECKLIST.md` ("Launch Day Procedure")**.