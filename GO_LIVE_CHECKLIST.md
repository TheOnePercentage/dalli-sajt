# GO_LIVE_CHECKLIST.md — dalli.rs Go-Live Checklist

> Final checklist for the go-live day. Every item has an owner and a verification command.
> Companion: `DALLI_DEPLOYMENT_PLAN.md`, `DNS_CONFIGURATION.md`, `FIRST_DEPLOY_RUNBOOK.md`.

Prepared for verdict **B → A** per `LAUNCH_DECISION.md` (5 minor gates + hardening already applied).

Legend: [ ] operator tick when done.

---

## A. Pre-releases (before go-live day)

- [ ] `npm run build:prod` green — 73 HTML / 44 SEO / 0 errors / sitemap 57 URLs.
- [ ] `public/_headers` reconciled with `netlify.toml` (dedupe Permissions-Policy; add COOP/COEP/CORP). No static CSP in `_headers` (edge delivers nonce CSP).
- [ ] Launch gates 1–5 closed:
  - [ ] DB restore drill executed (RTO measured) → `PRODUCTION_ACCEPTANCE_REPORT.md`.
  - [ ] Payment gateway webhook signature verification confirmed ON.
  - [ ] `npm audit --omit=dev --audit-level=high` added to CI (fail on high/critical).
  - [ ] Uptime monitors created (`dalli.rs`, `api.dalli.rs/api/v1/health`) + alert webhook.
  - [ ] `POST /api/v1/auth/register` posture decided (customer self-registration intended → keep; lockout + timing-equalization verified).
- [ ] VPS provisioned: Docker 24+, UFW open `22/80/443`; `dalli-api:<git-sha>` image tagged.
- [ ] Neon project + pooler URL ready; PITR/snapshots enabled.
- [ ] Upstash Redis provisioned; TLS TCP endpoint ready.
- [ ] GitHub secrets set: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.
- [ ] `docker-compose.prod.yml` (meilisearch+app+nginx) + VPS `.env` staged.
- [ ] DNS TTLs lowered to 300 s (≥24 h before cutover).

---

## B. API bring-up (VPS)

- [ ] `docker compose -f docker-compose.prod.yml up -d` — meilisearch healthy, app healthy, nginx healthy.
- [ ] `npx prisma migrate deploy` on VPS → applied: `prisma_v2`, `product_metadata_review_details`, `sitesettings_cuid`.
- [ ] RBAC bootstrap `node scripts/seed-rbac.js` with temp strong `SEED_PASSWORD`, then **rotate** admin password and remove `SEED_PASSWORD` from prod env.
- [ ] Meilisearch index bootstrapped (`products`, `products.variants`, ...) — first product write syncs.
- [ ] `curl http://127.0.0.1:3001/api/v1/health` → `"status":"ok","db":"up","cache":"redis"`.
- [ ] `curl -fsSI https://api.dalli.rs/api/v1/health` (after `api.dalli.rs` DNS) → 200 + HSTS.

---

## C. Storefront bring-up (Netlify)

- [ ] Netlify site exists, linked, env vars set (§7 of PLAN).
- [ ] First production deploy green (`npm run build:prod && netlify deploy --prod` or CI).
- [ ] Edge function served: CSP header has `'nonce-…'` and **every inline script/style carries a matching nonce** (check via view-source + DevTools console "Content Security Policy" warnings = 0).
- [ ] `netlify functions` endpoints smoke: `/api/security/csp-report` (204), `/api/security/csrf-token` (200 + `__Host-csrf-token` cookie), search functions reach the API via `API_URL`.
- [ ] Scheduled function `scheduled-audit` fires at `0 3 * * *` (observe at least one run).
- [ ] Custom domains `dalli.rs` + `www.dalli.rs` added; HTTPS enabled; www → apex 301s.

---

## D. Launch Day Procedure (final section)

### 1. Configure FIRST (in strict order)
1. **API data plane:** Neon DB exists, derived pooler URL; Upstash Redis created. (No service yet.)
2. **VPS:** copy `Dockerfile`, `server/`, `prisma/`, `.env`; start `docker compose -f docker-compose.prod.yml up -d`; confirm containers `healthy`.
3. **Migrations:** `npx prisma migrate deploy` + RBAC bootstrap (§B).
4. **API sanity on private IP:** health shows `db: up`, `cache: redis`; login endpoint returns 200 with valid JWT (admin test fixture).
5. **Storefront build artifact:** push `v1.0.0` tag → CI builds `dist/`; artifact contents (`dist/index.html`, `dist/_redirects`, `dist/_headers`) verified locally (headers reconciled).

> **Nothing is yet on the public `dalli.rs` domain.** All of the above runs on:
> preview URL `<site>.netlify.app`, VPS IP, and managed-service dashboards.

### 2. Configure SECOND (storefront + API exposure, still NOT on apex)
1. Deploy storefront to Netlify (preview/prod-on-preview URL).
2. Verify edge CSP + functions on the preview URL.
3. Point **`api.dalli.rs`** → VPS (`dig api.dalli.rs A` = VPS IP), Let's Encrypt issues, `curl https://api.dalli.rs/api/v1/health` → 200.
4. Set VPS nginx config to serve ONLY `api.dalli.rs` (server block from PLAN §6.2) — do not bind `dalli.rs`.

### 3. Verify BEFORE changing DNS for the apex
- [ ] `https://<site>.netlify.app` → 200, CSP nonce correct, no console errors, `sitemap.xml` 57 `<loc>`, `robots.txt` present.
- [ ] `https://api.dalli.rs/api/v1/health` → `{status:ok, db:up, cache:redis, sockets:...}`; admin login + one admin action (e.g. product read) works; storefront search returns products.
- [ ] TLS: `api.dalli.rs` cert for `api.dalli.rs` (not the preview cert); ciphers TLS1.2/1.3.
- [ ] Environment audit: every required env var set exactly once, no secrets in repo/logs.
- [ ] Uptime monitors added and **had at least one successful check** on both endpoints.
- [ ] Rollback runbook printed (Netlify deploy history accessible; image tag + Neon snapshot ready).
- [ ] Payment gateway sandbox webhook → `POST https://api.dalli.rs/api/v1/payments/webhook/:gateway` returns 200 with valid signature, and 401/400 with wrong signature.

### 4. WHEN to point `dalli.rs` to production
- Only after ALL of §3 passes and a single maintainer approves.
- Sequence: (a) `api.dalli.rs` live (already done), (b) add `dalli.rs`+`www` custom domain in Netlify, (c) registrar NS change (Approach A) or A/AAAA/CNAME apex records (Approach B), (d) wait for Netlify "Let's Encrypt issued", (e) heater: run full smoke §5 immediately.
- If any smoke step fails → **Deploy lock** Netlify + revert NS/records to the previous state (Runbook §6 rollback).

### 5. Smoke tests immediately after launch
```
curl -fsSI https://dalli.rs                                   # 200, HSTS, CSP nonce
curl -fsSI https://www.dalli.rs                                # 301 → https://dalli.rs
curl -fsS  https://dalli.rs/sitemap.xml | grep -c "<loc>"      # ≥ 1 (57 expected)
curl -fsS  https://dalli.rs/robots.txt
curl -fsS  https://api.dalli.rs/api/v1/health                  # ok/db up/cache redis
curl -fsS  https://api.dalli.rs/api/v1/products | head -c 200  # product payload
# Browser (manual, real device):
#   - product page loads, images render, add-to-cart works
#   - checkout (sandbox gateway) works; webhook 200
#   - search returns products; admin login + dashboard loads
#   - DevTools: no CSP/console errors; Network all 2xx/3xx
node scripts/verify-i18n-text.cjs && node scripts/validate-html.cjs   # content integrity
```
- [ ] All smoke green → declare production.
- [ ] Post-launch: submit HSTS **preload** (after stable HTTPS), schedule first `scheduled-audit` check, review Netlify deploy history tag.

---

## E. Post-launch (SLA window)
- [ ] Monitor alerts wired to `ALERT_WEBHOOK_URL` (uptime + 5xx).
- [ ] Weekly: verify `scheduled-audit` blob store + alert delivery.
- [ ] Monthly: DB restore drill (repeat of gate #1) recorded in acceptance report.