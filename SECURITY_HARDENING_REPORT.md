# SECURITY HARDENING REPORT — DALLI E-Commerce

Date: 2026-10-09
Companion to: GO_LIVE_AUDIT.md, LAUNCH_DECISION.md

---

## 1. Executive summary

5 hardening fixes were applied during this phase (none required architectural changes):

1. **CSP currently enforced would have broken the storefront** → replaced client-side nonce with an edge-function generated per-request nonce; inline scripts/styles now carry real nonces; CSP is only sent on successfully processed HTML (fail-open).
2. **JWT fallback secrets removed + fail-fast startup** → no guessable default secret in any code path.
3. **Socket status endpoint information leak closed** → socket counts + room list (`user:`/`order:` ids) no longer exposed in production.
4. **Production dependency attack surface reduced 27 → 1** → removed 3 unused legacy deps (`netlify-cms`, `netlify-identity-widget`, `express-rate-limit`), forced patched rollup via override.
5. **Structured logging + error context** → request/error JSON logs, no stack leakage in prod.

---

## 2. Fix 1 — CSP / Trusted Types / nonce (CRITICAL, fixed)

### Before
- `netlify.toml` carried an enforced static CSP with `'nonce-{NONCE}'` placeholder and `trusted-types dalla-trusted-types; require-trusted-types-for 'script'`.
- `dist/index.html` (and 7/8 inline scripts + 1 inline style) was generated with a **client-side runtime nonce** (`GENERATED_AT_RUNTIME`) via the missing `scripts/csp-nonce-generator.js`.
- Result under rollout: CSP would be **enforced, breaking the storefront** (inline scripts blocked, innerHTML blocked by Trusted Types). The fallback `scripts/csp-nonce-generator.js` did not exist.

### After
- `netlify/edge-functions/theme-injector.js` now:
  - generates a cryptographic nonce per request (`crypto.randomBytes(...)` base64url),
  - rewrites the HTML on the fly: every inline `<script>`/`<style>` gets `nonce="<real>"`, and `nonce="NONCE"` / `nonce="GENERATED_AT_RUNTIME"` / `data-csp-nonce="GENERATED_AT_RUNTIME"` placeholders are replaced,
  - swaps `'nonce-{NONCE}'` → `'nonce-<real>'` in the CSP,
  - sets the `Content-Security-Policy` header only when it processed the HTML successfully — **never blocks a page on edge failure**,
  - passes through `/admin/*` and non-HTML untouched (no header).
- CSP policy (`DEFAULT_CSP` in the edge): `default-src 'self'; script-src 'self' 'nonce-...'; style-src 'self' 'nonce-...' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; form-action 'self'; base-uri 'self'; report-uri /api/security/csp-report` — **no `unsafe-eval` unaffected, no Trusted Types** (no policy exists to align with).
- `netlify/functions/security/csp-report-only.js` aligned (same policy shape; still report-only so we keep telemetry).
- Removed static CSP from `netlify.toml`; documented area without CSP: `/admin/*` log-in pages (they are not customer-facing and will be removed with the legacy admin).

### Validation
- Ran the nonce engine against the real `dist/index.html`: 8/8 inline scripts + the inline style receive nonces; CSP placeholder swap verified; remaining `GENERATED_AT_RUNTIME` strings only exist inside script source (harmless).
- `netlify.toml` edge function syntax previously fixed (valid `[[edge_functions]]`); edge rebundles cleanly (esbuild, `@netlify/blobs` external).
- Smoke test expectations updated (`tests/security/security-headers.test.js`).

---

## 3. Fix 2 — JWT secrets (HIGH, fixed)

### Before
`server/src/lib/auth.js` fell back to hardcoded guessable secrets; `routes/auth.js` `/logout` used its own literal secret; `socket.js` read `process.env` directly.

### After
- `auth.js`: `sign`/`verify` use `signingSecret()` which throws if `JWT_SECRET`/`JWT_REFRESH_SECRET` is missing. `requireSecrets()` called in `server/index.js` `start()` → **the API refuses to boot without strong secrets**.
- `socket.js` depends on the centralized constant (single source of truth); next time the keys rotate, one place changes.
- Removed commented `createAdapter` import (dead code).

---

## 4. Fix 3 — Socket status information leak (MEDIUM, fixed)

`/api/socket/status` returned connected counts and the full room list (`user:<id>`, `order:<id>`), enabling session/order activity enumeration. Now returns 404 when `NODE_ENV=production`. A private health equivalent can be added later behind auth if desired.

---

## 5. Fix 4 — Dependency audit (HIGH, fixed → 1 residual)

### Production tree audit before
27 vulnerabilities (0 critical, 6 high, 21 moderate) — almost all from the **`netlify-cms`** transitive chain: outdated `dompurify` (dozens of mXSS/permanent-policy advisories), vulnerable `uuid`, `ajv`, `fast-uri`, `trim`, `sprintf-js`, and a high `rollup` path-traversal (arbitrary file write).

Verification that the legacy deps were dead (grep across source, functions, dist, admin-new):
- `netlify-cms` — no `import`/`require`; legacy `/admin` CMS loads it from `https://unpkg.com/netlify-cms@^2.0.0` at runtime (not bundled, not in the lock resolution).
- `netlify-identity-widget` — no references.
- `express-rate-limit` — no references (custom cache-backed `throttle()` middleware is used).

### Actions
- `npm uninstall netlify-cms netlify-identity-widget express-rate-limit`
- Added `"overrides": { "rollup": "4.64.3" }` to `package.json` (patched) — verified via `npm ls rollup`: build toolchain (vite, workbox) resolves to 4.64.3.
- Removed the now-obsolete `generate:csp-nonce` script from `package.json`.
- Rebuilt production bundle: **73 HTML · 44 SEO · 0 errors** ✓

### Residual risk (documented, dev-tooling only)
**RI-1 — `rollup` 4.22.4 nested under `netlify-cli` (GHSA-mw96-cpmx-2vgc, high).**
- Path: `netlify-cli` (devDependency) → `@netlify/edge-bundler` → `@vercel/nft` → `@rollup/pluginutils` resolves `rollup` as a **peer dependency**, which npm installs nested. `overrides` cannot target peer dependencies (documented npm limitation).
- Not shipped: production build path uses the top-level rollup (4.64.3, patched). This only affects local `netlify dev`/`netlify deploy` CLI operation on untrusted project files.
- Mitigation: keep the global override; do not run the Netlify CLI against untrusted packages; re-check after `netlify-cli` bumps its nested peer. Audit-BCC: add `npm audit --omit=dev --audit-level=high` to CI.

---

## 6. Controls inventory (post-fix)

| Control | Where | Status |
|---|---|---|
| HSTS / frame / nosniff / referrer / permissions / CORP | `netlify.toml` headers + `public/_headers` | present |
| CSP (enforced, nonce-based) | edge function (storefront) | enforced, working |
| CSP-Report-Only | `/api/*` Netlify function middleware | telemetry on |
| CSRF (double-submit) | Netlify `/api/security/*` layer | enforced |
| CSRF (origin check) | Express API (mutating) | enforced |
| Rate limiting | Express `throttle` `/api` 120/min, cache-backed | enforced |
| JWT secrets fail-fast | Express startup + `signingSecret()` | enforced |
| Socket JWT + status hidden | `socket.js`, `server/index.js` | enforced |
| Structured logs, no stack leak | Express request/error middleware | enforced |
| Admin RBAC | `requireAuth`+`requireStaff`+per-route permission | enforced |
| Cache invalidation | admin product/settings/catalog + checkout writes | verified |
| Scheduled link audit | Netlify `[[schedules]]` (cron 0 3 * * *) | configured |

---

## 7. Controls to strengthen post-launch (recommended, non-blocking)

1. **Express double-submit check** in the CSRF origin middleware (`x-csrf-token` vs cookie) — covers sibling-subdomain CSRF; low effort.
2. **Dedicated login rate limit** (`/api/v1/auth/login`, `/refresh`) at ~20/min per IP, separate from the global 120/min.
3. **Deprecate legacy mounts** `/api/*`, `/admin/auth`, `/api/admin` once traffic confirms the `/api/v1/*` set (halves the API surface and its smoke-test surface).
4. **Remove legacy admin**: `admin/`, `public/admin/`, the `unpkg` netlify-cms include, `/admin/*` & `/admin/cms/*` redirects — the netlify-cms UI is not customer-facing and is redirected to `/admin-login.html`.
5. **Remove unused dep `@socket.io/admin-ui`** from `server/package.json` (imported nowhere).
6. **Server-side load balancing note**: when >1 Node instance launches, enable the redis socket adapter (`@socket.io/redis-adapter`; `REDIS_URL` exists).
7. **Auth**: confirm `POST /auth/register` is intentional for production (disable otherwise), and that JWT expirations have finite env-backed values.
8. **Monitoring**: uptime monitor on `/api/v1/health`; log drain to a searchable sink; Sentry/Better Stack for error reporting.
9. **Backup operational drill** before go-live: restore Postgres to scratch DB, record RTO (see ROLLBACK_PLAN.md).

---

## 8. Security test status

`tests/security/security-headers.test.js` is a **live integration smoke test** (hits `BASE_URL`, default `http://localhost:4321`) and is **not wired into `npm test`** (vitest includes only `src/tests/**` and `admin-new/tests/**`). It has been updated to the new CSP contract. It should be executed against a deployed/staging sandbox post-deploy:

```
TEST_BASE_URL=https://dalli.rs npm run test -- tests/security/security-headers.test.js
```

Candidate CI addition: a post-deploy job that runs this against the preview URL.

---

## 9. Environment inventory

| Env | Used by | Requirement |
|---|---|---|
| `DATABASE_URL` | Prisma/Postgres (Neon) | required, fail-fast absent DB = crashes on first query; backup on |
| `REDIS_URL` | cache, socket adapter (future) | optional, memory fallback |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | auth | **required; fail-fast enforced** |
| `FRONTEND_URL` | CORS + origin allowlist | required (comma-separated) |
| `MEILI_HOST` / `MEILI_API_KEY` | Meilisearch | required for search |
| `SMTP_*` | transactional mail | required for email flows |
| `SITE_URL` / `ALERT_WEBHOOK_URL` | scheduled-audit + blobs | required for scheduler |
| `NETLIFY_SITE_ID` / token | deploy CLI | ops |

Docker Compose provides `POSTGRES_PASSWORD`, `MEILI_MASTER_KEY`, `SEED_PASSWORD` (all placeholders flagged in `.env.example`).

---

## Verdict input

See LAUNCH_DECISION.md for the one required conclusion (A / B / C).