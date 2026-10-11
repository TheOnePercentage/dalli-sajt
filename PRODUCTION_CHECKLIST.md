# PRODUCTION_CHECKLIST.md — DALLI GO-LIVE CHECKLIST

> PHASE: Production Readiness · Deliverable 2.
> Revizija: 2026-10-09 · Stanje blokera osveženo prema trenutnom kodu (verifikovano,
> vidi DEPLOYMENT_GUIDE.md §14).
> Koristi zajedno sa `DEPLOYMENT_GUIDE.md` (§11 backup/recovery, §13 runbook) i
> `ROLLBACK_PLAN.md`.

---

## STATUSI BLOKERA (2026-10-09)

| # | Bloker / nalaz | Status | Napomena |
|---|---|---|---|
| B1 | `netlify.toml` — sintaksa `[edge_functions]` | ✅ **FIXED** | → `[[edge_functions]]` (§14) |
| B2 | `security/security-audit-logger.js` SyntaxError + runtime statika | ✅ **FIXED** | `node --check` OK; esbuild bundle OK (§14) |
| B3 | `@netlify/blobs` u functions | ✅ **OK** | `netlify/functions/package.json` (^8.0.0) |
| B4 | `docker-compose.yml` dupli `redis:` | ✅ **FIXED** | compose parsira: postgres/redis/meilisearch/app/nginx (§14) |
| B5 | `Dockerfile` — server deps | ✅ **FIXED** | `npm ci --prefix server --omit=dev` (§14) |
| B6 | `init-scripts/` + `ssl/` mount | ✅ **FIXED** | dirs + README kreirani; ssl keys git-ignorirani (§14) |
| B7 | **CSP / nonce mehanizam** | ⛔ **BLOKER (go-live)** | §9 DEPLOYMENT_GUIDE: implementirati nonce na edge-u ili relaksirati CSP; NIKAD literal `nonce-{NONCE}` u prod |
| B8 | JWT fallback tajne u `auth.js` | ⛔ **ZAHTEV: set tajni** | `JWT_SECRET`/`JWT_REFRESH_SECRET` → `openssl rand -base64 32`; opcionalno fail-fast guard |
| B9 | Socket.IO redis adapter | ⚠️ **DOKUMENTOVANO** | multi-instance NIJE aktivno (§5); jedna instanca ok |
| B10 | `/api/socket/status` javan | ⚠️ **DOKUMENTOVANO** | gejtovati u production |
| B11 | CI: repo-wide lint + prettier fail (~17k) | ⚠️ **Otvoreno (teh. dug)** | CI crven; fokus na kritične fajlove ili odraditi dug pre go-live |
| B12 | Dupli deploy workflow (`ci.yml` + `deploy.yml`) | ⚠️ **Otvoreno** | obrisati legacy pre go-live (dvostruki deploy) |
| B13 | `npm audit` u CI ne postoji | ⚠️ **Otvoreno** | dodati `npm audit --audit-level=high` |
| B14 | `[[schedules]]` za scheduled-audit | ⚠️ **Otvoreno** | dodati u netlify.toml (cron @daily) |

---

## A. PREDUSLOVI / OKRUŽENJE

- [ ] Neon baza: connection string sa `?pgbouncer=true&connection_limit=1&schema=public` u `DATABASE_URL`
- [ ] Upstash TCP string (`rediss://…`) u `REDIS_URL`
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET` — dugi random (≠ dev fallback)
- [ ] `FRONTEND_URL` sadrži prod domen(e)
- [ ] Mrži MOCK: `NODE_ENV=production` + gateway gating (`checkout.js` §10) — potvrđeno 403
- [ ] Edge/functioni nemaju mock — potvrđeno (14 funkcija, grep `mock` = 0)

---

## B. BUILD + ARTIFAKTI

- [ ] `npm run build:prod` → 73 HTML / 0 grešaka / sitemap (57 URL-ova) / loader hashed
- [ ] `dist/` sadrži `_headers`, `_redirects`, `sw.js`, `manifest.json`, `admin/`, `assets/`, `sitemap.xml`
- [ ] `scripts/check-size.js` prolazi
- [ ] `npm run test` — suite prolazi (uključuje islands 46/46 ispravljenim gasovima)

---

## C. NETLIFY

- [ ] `[[edge_functions]]` — validna lista (theme-injector)
- [ ] Functions bundle: `csp-report-only` + `scheduled-audit` esbuild-clean
- [ ] Env: `SITE_URL`, `API_URL`, `ALERT_WEBHOOK_URL`, `NETLIFY_AUTH_TOKEN`, `SMTP_*`, `NETLIFY_SITE_ID`
- [ ] `[[schedules]]` dodat za scheduled-audit (B14)
- [ ] Deploy history: prvi “Preview + Production” proučen, rollback poznat

---

## D. API (VPS / Docker)

- [ ] `docker compose config` prolazi (redis jednoznačan)
- [ ] `Dockerfile.build`: `npm ci --prefix server` OK → `node server/index.js` radi u image-u
- [ ] `npx prisma migrate deploy` — idempotentno (bez breaking-a u prod)
- [ ] Health: `curl https://api.dalli.rs/api/v1/health` → `db up` + `cache: redis|memory`
- [ ] Mongo/socket status endpoint: gejtovan (B10) ili dokazano siguran

---

## E. SECURITY

- [ ] CSP: izabrana opcija A (nonce @ edge) ili B (hash/pragmatičan) — B7 rešen
- [ ] JWT tajne setovane (B8); rotacija testirana (2 klijenta)
- [ ] `npm audit --audit-level=high` prolazi (B13)
- [ ] CI: unifikacija workflow-a (B12); repo-wide lint/prettier zelen ili scoped ili noGit-cheat (B11)
- [ ] Admin: RBAC seed nije u prod; 2FA plan definisan
- [ ] Legacy `server/init-db.js` — nije deo prod putanje (NE brisati poslovnu logiku; samo doraditi pristup ili ukloniti)

---

## F. BACKUP & RECOVERY (Task 13 / DEPLOYMENT_GUIDE §11)

- [ ] Dnevni `pg_dump -Fc` → off-site (S3/GCS), retention 30d
- [ ] Mesečni test restore + smoke (`SELECT count(*) FROM "Order"`, health)
- [ ] Redis: regenerabilni (nije backup kandidat) — potvrđeno self-heal na memory fallback
- [ ] Env/tajne u vault-u; klon env-a podiže API bez manuelnog unosa
- [ ] Docker image tagovan `<git-sha>`; 2 prethodna stable taga čuvana
- [ ] Alert na health failure → `ALERT_WEBHOOK_URL` konfigurisan

---

## G. NADZOR

- [ ] Uptime monitor: `https://dalli.rs` + `https://api.dalli.rs/api/v1/health`
- [ ] Core Web Vitals (CrUX) praćenje
- [ ] Log agregacija API; bez tajni u logovima

---

## H. FINALNA VERIFIKACIJA (post-deploy smoke)

```bash
curl -fsSI https://dalli.rs                        # 200, TLS, HSTS header
curl -fsS https://api.dalli.rs/api/v1/health       # status ok, db up, cache set
node -e "fetch('https://dalli.rs/sitemap.xml').then(r=>r.text()).then(t=>console.log((t.match(/<loc>/g)||[]).length,'urls'))"
netlify status                                     # site linked, env propagirano
```

---

*Checklist se ažurira sa promenama; B7 (CSP nonce) je jedini hard go-live blocker u
verificiranom stanju, uz B8 (tajne) i redne softverske poslove (CI/B12/B13/B14).*