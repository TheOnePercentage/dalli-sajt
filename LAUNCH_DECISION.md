# LAUNCH DECISION — DALLI E-Commerce

Date: 2026-10-09
Sources: `GO_LIVE_AUDIT.md`, `SECURITY_HARDENING_REPORT.md`

---

## Conclusion: **B — READY FOR PRODUCTION AFTER MINOR FIXES**

Deploy is safe **once the five small operational checks below are completed**. No blocking code changes remain; every CRITICAL/HIGH finding found during this audit was fixed and verified in this session.

---

## Decision rationale

| Factor | Evidence |
|---|---|
| Code-changing blockers | **0 remaining**. All CRITICAL/HIGH findings fixed this phase: CSP would have broken the storefront; JWT fallback secrets; socket info leak; production dependency attack surface 27 → 1. |
| Residual high (RI-1, netlify-cli rollup) | Dev-tooling only, **not shipped** (production bundle uses patched rollup 4.64.3). Not a launch blocker. |
| Remaining work | 5 operational (non-code) checks below; none require code changes or architecture changes. |

---

## The 5 minor fixes/checks required before flipping the switch

| # | Item | Severity | Affected / Where | Effort | Recommended fix |
|---|---|---|---|---|---|
| 1 | Perform DB backup/restore drill | High (ops) | Postgres (Neon) via `DATABASE_URL` | ~30–60 min | Restore latest backup into scratch DB; record RTO; verify Neon automated backups + PITR enabled. Update `ROLLBACK_PLAN.md` with measured RTO. |
| 2 | Confirm payment gateway webhook signature verification is ON | High (ops) | gateway dashboard config for `/api/v1/payments/webhook/:gateway` | 5 min | Enable/inspect HMAC signature check dashboard-side; confirm `WEBHOOK_SECRET` (if any) is set and matches server. |
| 3 | Add `npm audit --omit=dev --audit-level=high` to CI + smoke test | Low | `.github/workflows`, `tests/security/security-headers.test.js` (not in vitest include globs) | 30 min | CI step fails on prod high/critical; optional post-deploy job runs the smoke test against the deployed URL (`TEST_BASE_URL=...`). |
| 4 | Uptime monitors + log drain | Low (ops) | `https://dalli.rs`, `https://api.dalli.rs/api/v1/health` | 15 min | UptimeRobot/Pingdom on storefront + health check; Netlify log drain (or Better Stack/Sentry) for the API. |
| 5 | Confirm `/api/v1/auth/register` posture | Medium | `server/src/routes/auth.js` | 5 min | If storefront has no self-registration, disable the route (leave DB seeding via admin). |

**Promotion rule:** when items 1–5 are done and verified, the site **may proceed to launch** (status → A). If any of 1–2 fail (e.g., restore not verifiable), the launch must be paused → C.

---

## Blockers (threshold for C)

None present at time of writing. The following would demote this decision to C if discovered during item verification:

- Production DB restore cannot be completed successfully (no backup, no PITR) — **(item 1).**
- Gateway webhook signatures cannot be verified — **(item 2).**
- Enforced CSP breaks a core storefront page in a real-browser check (beyond the synthetic nonce test already passed).

---

## Residual / recommended (post-launch, explicitly NON-blocking)

Consolidated from GO_LIVE_AUDIT.md (severity · affected · effort · recommendation):

- MEDIUM · `server/index.js` CSRF middleware · ~15 lines · Compare `x-csrf-token` header with `csrf_token` cookie to close sibling-subdomain gap.
- MEDIUM · Express throttle at `/api` · ~10 lines · Add dedicated login/refresh budget (20/min per IP).
- LOW · server mount paths · small · Deprecate `/api/*`, `/admin/auth`, `/api/admin` legacy duplicates after confirming `/api/v1/*` traffic.
- LOW · legacy admin (`admin/`, `public/admin/`, unpkg netlify-cms, `/admin/*`+`/admin/cms/*` redirects) · moderate · Remove after launch; page is 302'd to `/admin-login.html` today and carries the only `unsafe-inline`-style script include.
- LOW · `@socket.io/admin-ui` unused dep · trivial · Remove from `server/package.json`.
- LOW · `scheduled-audit.js` header comment (stale `[[functions]]` syntax) · trivial · Cosmetic.
- LOW · horizontal scale · once multi-instance · Enable redis socket adapter (`@socket.io/redis-adapter`; `REDIS_URL` exists).

---

## Signature

**Decision: B.** Fixes from this hardening phase are done and verified; the five operational checks are the only gate between today and launch.