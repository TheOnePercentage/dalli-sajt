# STOREFRONT STRATEGY — React SPA vs Vite MPA

> PHASE 2 — STOREFRONT MODERNIZATION (analiza, BEZ implementacije).
> Polazište: ARCHITECTURE_MASTER.md — projekat = **MPA + Backend** (SSG na Vite 5 + Express API).

---

## 0. UVOD (šta poredimo)

| | DANAS (Vite MPA) | React SPA (potencijal) |
|---|---|---|
| Dokumenti | 31 statički HTML; SEO stranice generisane u build fazi | JEDAN HTML shell + klijentski router |
| Render | Serverska gotova HTML (build-time) | Čist klijentski render (CSR) ukoliko bez SSR/prerender |
| JS na home-u | **~331 KB** (nekompresovano) + 5 CSS fajlova | React+vendor chunk (React 18 ~140 KB min + kôd) ≈ 200–300 KB |
| Podaci | `/data/*.json` (static) + `/api/v1` | `/api/v1` dominantno |
| Search | `search-index*.json` (klijentski, 11 KB) | isti izvor moguć, ili Meilisearch |
| SEO | 100% pre-rendered HTML (SEO-ready) | Zahteva SSG/prerender da ne padne |

Ključna razlika: **danas SEO održava build-time SSG; SPA mora to da očuva ili da izgubi vidljivost.**

---

## 1. TASK 1 — TEHNOLOŠKO POREĐENJE (MPA vs React SPA)

| Dimenzija | Vite MPA (danas) | React SPA | Obezbeđenje u MPA |
|---|---|---|---|
| Multi-page nav | Prirodna (linkovi) | Router (React Router) | + |
| Interakcija/islands | Vanila JS moduli, legacy `app.jsx` monolit | Komponentni model, state po potrebi | ± (ručno, pomalo tehnički dug) |
| Prvi render | Instant (server je već vratio HTML) | Potreban hydrate/CSR | SPA teži |
| SEO kontrolna | Per-doc meta, microdata, hreflang (SSG) | Zahteva prerendering | MPA olakšan |
| PWA | vite-plugin-pwa, Workbox | moguće (SPA shell) | ± |
| State (korpa/loyalty) | `js/state`, localStorage/IDB | Redux-ish library | ± |
| Iskustvo korisnika (animacije, drawer-ovi) | Ručno, manjka doslednost | Komponentne biblioteke brže | SPA prednost |
| Kataloški sadržaj | Handlebars string template | JSX komponente | MPA manjkav (dupli pristup template-ima) |

**Zaključak (tehnološki):** SPA je moderniji RADNI MODEL i bolje izgrađuje upravljivost interakcija,
ali ne donosi sam po sebi SEO/perf.

---

## 2. TASK 2 — PERFORMANCE IMPACT (sa izmerenim podacima)

### Trenutno (mereno, audit Okt 2026)
| Metrika | Vrednost | Komentar |
|---|---|---|
| Homepage HTML | **202 KB** | visok (veliki inline/HTML sadržaj; LCP tekstualan OK) |
| Homepage JS (ukupno, nekompresovano) | **~331 KB** (`app-DF8jbjkA.js` = 313 KB legacy bundle) | UNCOMPRESSED; gzip ≈ 90–110 KB |
| CSS fajlovi na home | **5** (duplikati `styles`/`logo-system` 2×) | duplo učitavanje — čist gubitak |
| Search indeks (client) | 11 KB | zanemarljiv |
| Render strategija | gotov HTML → brz FCP/LCP | JavaScript parse/exec utiče na INP odziv |

### Procena React SPA (CSR, bez prerenderinga)
| Metrika | Procena | Efekat |
|---|---|---|
| HTML | ~5–15 KB | Bolji (manji HTML), ali **prazan** do hydrate ⇒ FCP/LCP **gori** (client-side prazan shell) |
| JS (React + router + store + kôd) | 250–400 KB raw, ~85–120 KB gzip | Slično kao danas ili nešto veće |
| LCP | **Pogoršanje** (nema gotovog HTML) | Bez SSG/prerender: LCP +300–800 ms na mobilnim |
| INP/interakcija | **Poboljšanje** na visoko-interaktivnim elementima (transitions, drawer, VTO) | + |
| Preload | app shell + route-chunks → lepši "app feel" | + |

**Net procena:** čista React SPA **pogoršava** LCP/FCP (bez dodatnog SSG sloja); zadržava sličan JS težinski teret.
Sve što bi SPA dobio (prerender HTML na edge-u) vodi na putanju B/D, ne na čisti CSR (C).

**Dominantni brzi dobici (jeftini, u obe arhitekture):**
1. Ukloniti dupli CSS load (5→3 fajla) — est. **–20–40 KB** request-a.
2. Zdrobkanje legacy `app.jsx` (313 KB) → **–60–70% JS parse**.
3. Code-split PDP-ekstenzija (VTO/360 lazy load — već postoji, proširiti).

---

## 3. TASK 3 — SEO IMPACT

| Aspekt | Vite MPA (danas) | React SPA (CSR) | Procena rizika |
|---|---|---|---|
| Indexacija sadržaja | Gotovi HTML — bot čita odmah | Prazan shell; bot (Google) može čekati JS, slabiji za ostatke | **Rizik: gubitak pozicija** za sve ključne LP (kategorije/proizvodi/blog) |
| Sitemap | SSG uredno (20+ URL hijerarhi) | Mora se održavati paralelno | Rizik |
| hreflang/i18n | per-doc presence | CSR težak (čita iz JS) | Rizik |
| SERP (dalli.rs) | Povoljno (lokalnije tržište, manje konkurencije ⇒ brzina manje bitna nego sadržaj) | — | SPA samo ako SA SSG |
| Structured data (Product/FAQ/Breadcrumb) | U HTML | JSON-LD javlja se tek nakon hydrate | Rizik |
| Core Web Vitals za ranking | FCP/LCP dobri ali HTML 202 KB | Bez prerender-a lošiji | SPA rizik |

**Zaključak:** za RS/mikro-niša tržište SEO je **strateški kanal jeftinog saobraćaja** — treba
izbegavati migraciju koja ga rizikuje. SPA u čistini NIJE SEO-paritetan sa SSG-om bez značajnog
sloja prerender (što u suštini znači prepravljanje načina generisanja).

---

## 4. TASK 4 — MAINTENANCE IMPACT

### Trenutni troškovi (MPA — dokumentovani u ARCHITECTURE_MASTER):
- Dvojni source of truth (JSON za build vs DB za API) — svaka promena odjekuje u 2 sistema.
- 3 admin sistema (legacy admin-login, Netlify CMS, admin-new) — dupli razvoj.
- Handlebars string template za proizvode/kategorije — nema komponentne reuse, teško održavanje,
  duplirana logika sa JS stranom.
- Legacy `js/app.jsx` monolit (313 KB) + mnoštvo fix-* skripti istorijski.

| | MPA (danas) | React SPA | MPA + islands |
|---|---|---|---|
| Komponentni reuse | ± (vanila, delom ručno) | **++** | **++** (islands deljeni) |
| Testability | jsdom/vitest | react-testing-library (robustniji) | + (po island) |
| Developer onboarding | Mešavina vanila/JSX parčela | Uniformno | varijabilno ali blizu SPA |
| Broj sistema koji treba održavati | 3 admin + 2 izvora podataka | Ne menja samo frontend | Ne menja |
| Saobraćaj / rizik regresije | Nizak kod pažljive izolacije | Visok kod rewrite | **Nizak** (postepen) |

**Zaključak:** React pomaže vezano za *frontend komponentni layer*; NE rešava glavne dugove
(dupli source, 3 admin-a). Migracija ne sme biti prodata kao "reši sve".

---

## 5. TASK 5 — MIGRATION EFFORT (estimates)

| Opcija | Obim | Čovek-dana (est.) | Rizik |
|---|---|---|---|
| **A. Keep MPA** | 0 | 0 | Niska (nastavak kumuliranja tehničkog duga) |
| **B. Hybrid MPA + Islands** | 3–6 islands (PDP 360/VTO modal, quick-view, cart drawer, search live, VIP/loyalty, checkout flow) | **6–10 dana** | Niska — island je po stranici, restore-friendly |
| **C. Full React SPA** | Rewrite 31 stranica + generatora (SEO LP, product, blog) + router + state + PWA + i18n + CSR/SSG sloj | **40–70 dana** (bez SSG sloja ≥90) | **Visok** — SEO/traffic rizik, regresioni testovi, onboarding |
| **D. Next.js App Router** | Totalna rearchitektura: SSR/SSG/ISR, routing, server/client komponente, migracija podataka | **70–120 dana** | **Najviši**; opravdan samo za veliku produktnu evoluciju |

> Napomena: procene za C/D uključuju i SSG/prerender sloj (bez njega C ima SEO rizik;
> sa njim obim C ≈ D).

---

## 6. TASK 6 — LUXURY-COMMERCE UX (poslovna vrednost)

Segment: DALLI = premium garderoba, visoka prosečna vrednost korpe, "experience" kao diferencijator.

| Luxury UX želja | MPA danas | React SPA | Island rešenje |
|---|---|---|---|
| PDP interakcije (360°, virtual try-on, zoom) | Postoji (lazy moduli) ali kruto integrisano | Prirodno (komponenta + state) | Island `ProductStudio` |
| Quick-view modal (bez napuštanja liste) | Ručno, slabo | Lako | Island `QuickView` |
| Korpa/drawer sa animacijom & logo | Klasične stranice | Glatki transitions | Island `CartDrawer` |
| Live search sa predviđanjem (luxury feel) | search-ui.js postoji (static index) | Lako poboljšivo | Island `SearchAutocomplete` |
| VIP/loyalty widget, personalizacija dočeka | Raštrkano po JS | Komponenta | Island |
| Perceived speed (transition bez reload) | Reload stranice | App-like | Islands + View Transition API (bez full reload) |
| A11y & touch | Dovoljno | Ričnije | Island komponenta sa a11y |

**Poslovna procena:** za luxury segment, **perceived experience na PDP i korpi direktno utiče na
conversion i AOV.** Islands dostavljaju 80% UX vrednosti SPA za ~15% troška, jer su visoko-
interaktivni momenti koncentrisani (ne na svih 31 strana).

---

## 7. PREPORUKA

### **B. Hybrid MPA + React Islands** (uz zadržavanje Vite MPA shell)

Poslovna racionalizacija:
- **SEO = tržišni kanal koji se ne sme rizikovati** (SSG i dalje najbolji).
- **JS trošak koji se uoči** je koncentrisan u 313 KB legacy bundle i korpa/PDP interakcije — mesta
  gde island donosi merljiv INP/UX dobitak.
- Migracija **6–10 čovek-dana**, vraćanje unazad bezbolno, dok C/D nosi 4–7× trošak i SEO rizik
  bez jasne isplativosti za današnji obim.
- A (stay) **nije** preporuka: postojeći dug (dupli izvor, 3 admina, legacy bundle) se ne smanjuje
  sam od sebe; island sloj omogućava i pripremu za buduću migraciju.

**Roadmap (bez implementacije sada):**
1. **Faza 2a — Safety items (najpre)**: deduplikacija CSS (5→3), code-split legacy `app.jsx`,
   izolacija islands foldera `js/islands/`.
2. **Faza 2b — Islands (prioritet redosled)**:
   `CartDrawer` → `QuickView` → `SearchAutocomplete` → `ProductStudio` (360/VTO) → `LoyaltyWidget`.
   Svaki island: SSG HTML i dalje primaran; island hydrate samo kod interakcije (no-JS fallback).
3. **Faza 2c — Merenje**: KPIs — LCP, INP, uzimanje vremena do "Add to cart", A/B na PDP; posle
   2–3 meseca revizija da li se isplati prelazak na C/D.

**Kriterijumi za kasniju reviziju (C/D)** — ukoliko za 12–24 meseca:
> visok obim mobilnog, ≥60% saobraćaja na PDP, potreba za personalizacijom u realnom vremenu,
> veća ekipa, PWA-first strategija → tada se ozbiljno razmatra Next.js (D) uz SSG očuvanje.

---

## 8. TABELA ODLUKE (sa težinama)

| Kriterijum (težina) | A. MPA | B. Islands | C. SPA | D. Next.js |
|---|---|---|---|---|
| SEO očuvanje (0.30) | 5 | 5 | 1 | 4 |
| Performance (0.20) | 3 | 4 | 3 | 5 |
| UX luxury (0.20) | 2 | 4 | 5 | 5 |
| Maintenance (0.15) | 1 | 3 | 3 | 4 |
| Migration cost (0.15) | 5 | 4 | 1 | 1 |
| **Ukupno (1.00)** | **3.3** | **4.15** | 2.6 | 3.9 |

**Final: B (Hybrid MPA + React Islands)** — najbolja poslovna vrednost prema odnosu rizik/cena.

*(Ne primenjeno — prema zahtevu PHASE 2.)*