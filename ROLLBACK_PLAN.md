# ROLLBACK_PLAN.md — DALLI ROLLBACK & RECOVERY

> PHASE: Production Readiness · Deliverable 3.
> Revizija: 2026-10-09 (blokeri osveženi — netlify.toml/logger/Docker popravljeni).
> Ciljevi: **RTO ≤ 30 min · RPO ≤ 24h**. Detalji env/backup: `DEPLOYMENT_GUIDE.md`
> (§3, §11) i `PRODUCTION_CHECKLIST.md` (F).

---

## 1. NAČELA (PRINCIPLES)

1. **Zatvori prod, ne modifikuj podatke.** Prvo zaustavi dotok (rollback/redirect), tek
   onda razmišljaj o podacima.
2. **Procure verifikovano.** Verzija koja se vraća je build koji je prošao smoke (§4).
3. **Migracije:** default je **forward-fix** (nova migracija) a NE `migrate down` — prod
   nikad ne vraćaj `migrate down` bez prekida; ako je nuzno: restore baze iz dumps (§3).
4. **Rollback trenutno zlatni: Storefront (Netlify) i API (Docker) su odvojivi → vrati
   zasebno.**

---

## 2. ROLLBACK MATRICE (DECISION MATRIX)

### 2.1 Storefront (Netlify) — najbrži put
| Scenario | Akcija | Vreme |
|---|---|---|
| Loš release (build ok, UX break, SEO) | Netlify UI: **Branch deploy → Deploy preview** starije ✅ / ili `netlify deploy --prod --dir dist` sa starim commit | ~1-2 min |
| Iste LCP/CLS/i18n regresije | `git revert <sha>` + push (CI deploys stari) | ~5-10 min |
| Scrib crven CI na main | stop-ruka: koristi **Deploy lock** u Netlify UI (sprečava auto deploy) | sekundi |

**Putanja releasa (Git → Netlify):**
```bash
git checkout <stable-tag>        # tag je verifikovan build
npm ci && npm run build:prod     # lokalna sigurnosna mreža — isti dist
netlify deploy --build --prod --message "rollback to <stable-tag>"
```
> Netlify hosts `dist/ + functions`; rollback func + edge ide automatski (isti repo).

### 2.2 API (Docker/VPS)
| Scenario | Akcija | Vreme |
|---|---|---|
| API crash na startu | `docker compose up -d --build app` (prethodni image) ili `docker run` sa starim tag | min |
| Crash-loop + DB migracija "pošla" | `stop app` → **ne** vraćaj baziraću migracije → restore DB iz dumps (§3) → start stari image | < 30 min |
| Slow memory/CPU regresija | vrati image; watchdog alert → health ✓ | min |

**Docker image** treba tagovoti: `dalli-api:<git-sha>` + čuvati 2 „stable" taga (§11.4 GUIDE).

### 2.3 Baza / cache
| Sloj | Rollback |
|---|---|
| Neon PostgreSQL | Neon snapshot / `pg_restore` (dumps iz §11.1) — aplikacija otvorena samo čitanje tokom restore-a |
| Upstash Redis | **Regenerabilan** (samo `rl:*`/session cache) → brisanje kapije; app self-heal na memory fallback. NO dumps potrebni |

---

## 3. MIGRACIJA — ROLLBACK STRATEGIJA

- **Default: FORWARD-FIX.** Kad nova migracija lomi prod, izdaj `migrate deploy` (reverting)
  s novom migracijom koja vraća šemu — bez `migrate down` u prod.
- **Kad je restore nužan (breaking šema):**
  1. Netlify: Deploy lock + vrati stable-tag (zaustavi novi API).
  2. `docker compose stop app`
  3. `pg_restore --clean --if-exists --dbname="$DATABASE_URL" < latest-good.dump`
  4. `docker compose up -d app`
  5. Smoke (§4) + ukloni Deploy lock.
- **NIKAD ne pokreći `prisma migrate reset/dev` u prod; `migrate deploy` je jedini prod-safe.**

---

## 4. POST-ROLLBACK SMOKE (verifikacija)

```bash
curl -fsSI https://dalli.rs                        # 200 + HSTS
curl -fsS https://api.dalli.rs/api/v1/health       # status ok, db up, cache redis|memory
curl -fsS https://dalli.rs/sitemap.xml | grep -c '<loc>'   # URL count > 0
node -e "fetch('https://dalli.rs/products').then(r=>r.status).then(console.log)"  # kritična ruta
# Admin login i jedna admin akcija (kratki sanity)
# Core Web Vitals — bez regresije prema stanju pre release-a
```

---

## 5. RECOVERY RUNBOOK (scenariji)

### 5.1 Totalni pad Netlify (domena / edge / CDN)
- Skloni custom domain → *Netlify Default URL* (stari deploy) ili DNS → backup host.
- Verifikovano: statični `dist/` + functions se redeploy-uju bez data state-a (generativni).

### 5.2 Pad API hosta (VPS)
- `docker compose up -d` s istim image (stateless; sockets reconnect);
- fallback: pokreni API na drugom VPS-u sa istim env + `DATABASE_URL`; DNS A/AAAA → novi host.
- Socket klijenti spawn nova konekcija (Socket.IO auto-reconnect).

### 5.3 Cloud provider incident (Neon / Upstash)
- Neon: iskoristi **snapshot** (region redun) ili globalni dump (§11.1); restore na novi
  endpoint, promeni `DATABASE_URL`, restart API.
- Upstash: cache-only → app nastavlja sa memory fallback; re-kreiraj instancu kada provider
  dostupan, vrati `REDIS_URL`.

---

## 6. KOMUNIKACIJA & INCIDENT LOG

- Obrati se timu odmah; objavi status page (exist UptimeRobot §12 GUIDE).
- Zapiši u CHANGELOG: vreme, uzrok, rollback putanja, rezultat smok-a.
- Poincident review: ista klasa bugova → CI regresija test.

---

## 7. ODRŽAVANJE PLANA

- [ ] Nakon svakog release-a: update `stable-tag` + smoke (§4) u roli.
- [ ] Mesečno: test restore baze (§11.2) + rollback rollback drill (storefront tag vraćen).
- [ ] Env table (GUIDE §3) i Backup checklist (GUIDE §11) ažurirani sa promenama.

---

*Revizija 2026-10-09: čiste instrukcije, bez legacy corruption tokena; rollback putanje
potvrđene u trenutnom verifikovanom stanju koda i config-a.*