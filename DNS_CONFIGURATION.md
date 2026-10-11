# DNS_CONFIGURATION.md — dalli.rs DNS Plan

> Companion to `DALLI_DEPLOYMENT_PLAN.md`.
> Domain: **dalli.rs** (existing). Namespace plan below maps every zone requirement.

---

## 1. Target records (final state)

| Name | Type | Target | Use |
|---|---|---|---|
| `dalli.rs` | A | Netlify-assigned IP (`75.2.60.5` shared apex IP; or per-site IP from Site → Domain settings) | Storefront apex |
| `dalli.rs` | AAAA | Netlify-assigned IPv6 (shown in Domain settings) | IPv6 storefront |
| `www.dalli.rs` | CNAME | `<site>.netlify.app` | Storefront www (Netlify 301 → apex) |
| `api.dalli.rs` | A | `<VPS_IPv4>` | API + Socket.IO + webhooks |
| `api.dalli.rs` | AAAA | `<VPS_IPv6>` (if VPS has IPv6) | API IPv6 |
| `_dmarc.dalli.rs` | TXT | `v=DMARC1; p=none; rua=mailto:dmarc@dalli.rs` | Mail (if SMTP used) |
| `@` SPF | TXT | `v=spf1 … … ?all` | Mail (if SMTP hosted on dalli.rs) |

> Meilisearch, Redis and PostgreSQL are **not** exposed via DNS. They are private to the
> API VPS (Meili internal) or fully managed behind MongoDB-free provider URLs (Neon/Upstash).

---

## 2. Approach A — Netlify DNS (recommended)

Move the apex to Netlify-managed DNS so it can provision apex/AAAA, Let's Encrypt certs
and redirects automatically, with HSTS-ready HTTPS.

1. In registrar (e.g. the .rs registrar, PAGEDNS/other) replace the existing nameservers
   with Netlify's:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```
2. In Netlify: **Site → Domain management → Add custom domain → `dalli.rs`**, then `Add → www`.
   Netlify auto-creates the apex records + www CNAME to the site and the www→apex redirect.
3. Add the non-Netlify records Netlify DNS can't manage:
   - `api.dalli.rs` A → `<VPS_IPv4>`.
   - Mail records if needed (§4).
4. Enable HTTPS in Netlify (provisions Let's Encrypt).
5. Keep NS propagation until timers clear: check `https://dnschecker.org` for `dalli.rs`.

> ⚠️ Adding `ap@…`/wildcard is NOT needed. Wildcard DNS is out of scope.

---

## 3. Approach B — keep registrar DNS

If you prefer to keep the current DNS provider:
1. Create the site + add the custom domain in Netlify UI (it will show the required A/AAAA).
2. In the registrar, set:
   - `dalli.rs` A → `75.2.60.5` (Netlify shared apex IP) + the displayed AAAA.
   - `www.dalli.rs` CNAME → `<site>.netlify.app`.
   - `api.dalli.rs` A → `<VPS_IPv4>` (+ AAAA if available).
3. In Netlify → Domain settings confirm the domain is "DNS assigned" and HTTPS issued.
4. Non-Netlify records are managed by the registrar directly.

---

## 4. Email (optional but recommended for `from@dalli.rs` mail)

Transactional mail uses `SMTP_HOST=smtp.dalli.rs` (see netlify function `send-email.js`). Confirm whether SMTP is (a) a mailbox provider reachable at `smtp.dalli.rs`, or (b) the VPS MTA — then add:
- MX (`dalli.rs` → mail host) if receiving mail is required (usually NOT for transactional-only).
- SPF TXT listing the sending host / provider; recommend DMARC `p=none` first, tighten to `p=quarantine`.

If SMTP is not yet hosted, leave mail records out and only send from the provider's domain — do not send `From: @dalli.rs` before SPF/DMARC is configured (deliverability).

---

## 5. Cutover sequence & verification

1. **Pre-cutover (all namespaces already live via IP/alt):**
   - API verified over `https://<VPS_IPv4>` (hosts header) or temporary `api.dalli.rs` record with **low TTL (60–300 s)** set 24–48 h earlier.
2. **Set `api.dalli.rs` first** (A → VPS): verify API + Let's Encrypt cert issued, health ok. Keep the storefront pointed at the preview URL meanwhile.
3. **Then `dalli.rs` / `www` → Netlify.**
4. Verification tools:
   ```
   dig +short dalli.rs A                dig +short www.dalli.rs CNAME
   dig +short api.dalli.rs A
   curl -fsSI https://dalli.rs | grep -i -E "strict-transport|content-security|x-frame"
   curl -fsS https://api.dalli.rs/api/v1/health
   curl -fsS https://dalli.rs/sitemap.xml | grep -c "<loc>"
   ```
5. Watch Netlify "Let's Encrypt issued" state; if it stays pending >30 min re-check TTL/NS cutover.
6. After full rollout: lower nothing; set HSTS preload decision after stable HTTPS for at least 2 weeks (or as agreed).

---

## 6. Risks & notes

- **TTL planning:** drop DNS TTL to 300 s at least 24 h before the switch; raise back afterwards.
- **HSTS `includeSubDomains`** (present in storefront headers) also covers `api.dalli.rs` only if api is a subdomain *of dalli.rs* — it is. That means `api.dalli.rs` **must always be HTTPS** (it will be). Do not add `preload` to the API's own header.
- **VPS firewall:** only 80/443 (and optionally 22 admin) reachable; `3001` and `7700` remain internal, never publish them.
- **DNS propagation can expose mixed state** — keep the maintenance page up (see GO_LIVE_CHECKLIST launch day) until both namespaces return expected headers.