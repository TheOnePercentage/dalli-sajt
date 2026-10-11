# LUXURY EXPERIENCE ROADMAP

> PHASE 3 — WORLD-CLASS LUXURY EXPERIENCE (analiza + roadmap, BEZ implementacije).
> Cilj: DALLI superioran u luxury e-commerce iskustvu. Benchmark: Hermès, LVMH (LV/Dior),
> Armani, Hugo Boss, Zegna.

---

## 0. EXECUTIVE SUMMARY

DALLI danas ima **dobre fundamentalne blokove** (SSG brzina, tema/experience engine, VTO/360,
personalizacija config, loyalty tierovi, kripto kao diferencijator), ali **luxury percepciju
koči iskustvo**, ne sadržaj:

1. Homepage je **"katalog" a ne "editorial kampanja"** — nema video heroja, sezonske kampanje, lookbooka.
2. PDP je **funkcionalan ali ne senzualan** — materijal priče su u odvojenim "guide" sadržajima
   (26 fajlova postoje!) ali nisu integrisani u PDP tok.
3. Checkout je **višeslojan ali bez concierge/trust storytellinga**.
4. Personalizacija postoji u configu (`personalization.json`, iskrivljeni algoritmi) ali nije u
   prvom planu UX; loyalty tierovi postoje ali su slabo komunicirani (nisu "clienteling").

**Strategija: „Tihi luksuz + brzina SSG-a"** — DALLI gradi premium percepciju na
(i) editorijalnom pripovedanju (materijal, atelje, poreklo), (ii) senzualnom PDP iskustvu sa
izuzetnim 360/VTO, (iii) čistoj mobilnoj velocarnosti (SSG već > SPA kod konkurencije),
(iv) VIP tretmanu (clienteling + ekskluzivni drops) i (v) **experience engine-u** (teme se menjaju
na edge-u — jedinstveno za tržište).

---

## 1. BENCHMARK — šta vladare čini „svetskom klasom"

| House | Suština luxury moći | Šta UX DALLI može ukrasti |
|---|---|---|
| **Hermès** | Pedigre + retkost (+kolekcija se ne prodaje onlajn brzo; „waiting list"), editorijalske filmove, atelje priča | Exclusivity storytelling; "art of making" filmovi; pojačanje "očekuj" — newsletter za drops |
| **Louis Vuitton** | Kampanje == filmovi; sezonske kolekcije sa lookbookom; city experience | Sezonski kampanj-moda na homepage; lookbook po kolekciji; seamless dark/lux mode |
| **Dior** | Emocionalno pripovedanje (heritage, muse); visoka fotografija; concierge chat | Heritage stranica "Veština DALLI"; concierge kanal (WhatsApp/email) |
| **Armani** | Čist minimalizam, whitespace, tipografija; "spreparisan" lux feel | Tipografska disciplina: manje, ritam, prostor; restriktivirana paleta |
| **Hugo Boss** | Polished korporativni commerce: brz checkout, jasna politika, size advisor | Nega korpa → checkout (0 friccije), transparentnost dostave |
| **Zegna** | "Luxury is subtle": materijalni storytelling, sustainable, made-to-measure | Material-first PDP (fabric science), made-to-measure/veličinski savetnik |

**Benchmark diferencijator:** svi vladari su SPA/SSR; DALLI ima **SSG brzinu** + **edge theming**
(ne postoji kod konkurenata) — to je seed za premoć u Core Web Vitals i perceived luxury.

---

## 2. AUDIT (8 oblasti) — sadašnje stanje vs cilj

Legenda: ✅ postoji · ◐ delimično · ✗ ne postoji · 🎯 ciljno stanje

### 2.1 Homepage
- **Sada:** hero + hero--elegance, collection-worlds (CASUAL/ELEGANCE + gender), featured (samo 4 proizvoda), brand-story, for-you, recently-viewed, trending, UGC feed, newsletter. Drawers/modal (search, cart, notifikacije).
- **Gap:** ✗ video/sezonska kampanja · ✗ lookbook · ◐ featured premalo · ◐ naslovni hero nije editorial · 🎯 sezonski hero (video/parallax) + "Kolekcija" editorial blok + featured 8–12 sa "art direction".

### 2.2 Product page (PDP)
- **Sada:** gallery+color+size, VTO lazy, 360 (`product360-config.json`), reviews (rating/media/verified), QA, FAQ, recently-viewed carousel, promo banner (`productOffer`), theme toggle.
- **Gap:** ✗ fabric/sastav priča INLINE (vodiči postoje ali odvojeno) · ✗ model fotke u kontekstu (stilovi/look) · ◐ zoom/magnifier · ◐ video · 🎯 PDP = senzualan tok: gallery→360/VTO→"Materijal" editorial sekcija→styling look→reviews; trust badges (materijal, dostava, garancija).

### 2.3 Checkout
- **Sada:** cart drawer, address, promo (2×), card fields (Visa/MC), crypto (BTC — sa diskontom), COD, trust-badge, free-shipping progress.
- **Gap:** ✗ concierge kanal pre/posle · ✗ gift options (poklon pakovanje, čestitka) · ◐ multistep — bez express opcije · ✗ express/one-tap · 🎯 3-step lako + concierge + gift + trust strip (dostava, povraćaj, materijali) + crypto/"luks" stavka dopuna.

### 2.4 Mobile
- **Sada:** responsive (93 media query u styles.css), drawers, touch.
- **Gap:** ◐ nema app-feel (bez view-transition gestova) · ◐ heavy JS na slabim telefonima (331 KB) · 🎯 mobile-first 60fps, reduced JS na first load, gesture nav, "view transition" između kolekcija.

### 2.5 Storytelling
- **Sada:** 26 editorial/guide sadržaja (cotton/fabric/size/hoodie/tracksuit), blog (16 postova), about.html, brand-story na home, collections.
- **Gap:** ✗ manifesto/heritage stranica · ✗ lookbook (editorial pages) · ◐ vodiči nisu povezani sa PDP/checkout · ✗ video (atelje, materijal) · 🎯 "Atelje DALLI" (heritage + sustainability) + lookbook/every-post i integracija vodiča u PDP drawere.

### 2.6 Personalization
- **Sada:** `personalization.json` (collaborative .35 / contentBased .30 / FBT .20), for-you sekcija, recently-viewed, search-index klijentski.
- **Gap:** ◐ nema VIP segmentaciju na UX · ◐ nema "za vas" na PDP/cart · ✗ nema klijentski savetnik · 🎯 personalizovani dropdown (Welcome-back VIP), "Preporuke za tebe" na svim dodirnim tačkama, veličinski savetnik (size advisor po meri kupca).

### 2.7 Visual luxury
- **Sada:** theme toggle (dark/light), design-system (`dalli-design-system.css`), experience center (tema flips na edge `theme-injector`), luxury mode pominjan u experience.
- **Gap:** ◐ tipografska disciplina (previše elemenata) · ◐ fotografija nije unificirana · ✗ motion discipline · 🎯 "Tihi dizajn": definirana tipografska hijerarhija (serif display), jedinstvena fotografija, motion easing, luxury paleta — sve preko postojećeg theme enginea (bez refaktora).

### 2.8 Retention
- **Sada:** loyalty tierovi (member/silver→minSpent 100k, benefits early-access 24h, free shipping), newsletter, UGC, blog.
- **Gap:** ◐ tiers postoje ali ne "clienteling" (personal outreach, early drops, birthday) · ✗ reward za review (postoji review sistem bez incentivize) · ✗ referral · ✗ paket "VIP klan" · 🎯 White-glove: tier progres bar, ekskluzivni drops (limitiran broj), birthday/bad appel rewards, concierge linija za VIP, review→loyalty points.

---

## 3. KONKURENCIJA — competitive advantages DALLI-ja

| Prednost DALLI-ja | Zašto superiorno | Kako unovčiti |
|---|---|---|
| **SSG brzina** (LCP < konkurencija SPA) | Perceived luxury = brzina + tihost | Promovisati golim brojevima (badge "0.8s load"), meriti CWV |
| **Experience Engine + edge theming** | Npr. sezonska tema/sale režim bez redeploy-a | Kampanje = tematski switch na edge-u u sekundi |
| **Kripto plaćanje + 15% popust** | Unikatna za RS region | VIP kanal: "platite kriptom, dobijete 15% i rani pristup drops" |
| **Organski pamuk priča (sustainability)** | Raste apel kod luxury kupaca | "Materijal" vault na PDP/checkout (fabric science stories) |
| **VTO + 360** već postoje | Hermès/Armani se uglavnom ne igraju AR | Iskoristiti kao "pokazni" lux feature (fit confidence) |
| **Niska cena migracije** (MPA, bez rizika refaktora) | Brza isporuka inicijative | Roadmap ispod: početi sa P0 u jednoj nedelji |

---

## 4. RANKING POBOLJŠANJA (impact / effort / revenue)

Skale: Impact 1–5 (visok=5), Effort 1–5 (lak=1), Revenue 1–5 (max=5).
**Priority = impact×0.4 + revenue×0.4 − effort×0.2** (poslovno-vođena formula). Max ~4.

| # | Inicijativa (oblast) | Impact | Effort | Revenue | Priority | Faza |
|---|---|---|---|---|---|---|
| P0-1 | Material-first PDP ("Materijal" editorial + fabric science inline, trust strip) | 5 | 2 | 5 | **3.8** | 0 |
| P0-2 | Checkout concierge + gift options (wrap/čestitka) | 4 | 2 | 5 | **3.4** | 0 |
| P0-3 | Sezonski kampanj hero (video/parallax) na home + lookbook link | 5 | 3 | 4 | **3.4** | 0 |
| P0-4 | Loyalty progres bar + ekskluzivni drops (early access + limit) | 4 | 2 | 5 | **3.4** | 0 |
| P0-5 | Veličinski savetnik (size advisor po meri; koristi postojeći size-guide) | 4 | 2 | 4 | **3.2** | 0 |
| P0-6 | Dark/lux "tihi dizajn" — tipografija + whitespace (preko theme enginea) | 4 | 3 | 3 | **2.8** | 0 |
| P1-1 | "Atelje DALLI" — heritage + sustainability editorial stranica (SSG) | 3 | 2 | 4 | **2.8** | 1 |
| P1-2 | PDP look kao model u kontekstu (styling shots per kolekcija) | 4 | 3 | 4 | **2.6** | 1 |
| P1-3 | VIP clienteling: personal balcony (WhatsApp concierge, birthday perk) | 4 | 3 | 4 | **2.6** | 1 |
| P1-4 | Express checkout (one-tap za vraćene kupce), manje koraka | 3 | 2 | 4 | **2.6** | 1 |
| P1-5 | Review incentivization → loyalty points (mapiraju se postojeći Review model) | 3 | 2 | 4 | **2.6** | 1 |
| P1-6 | Mobile view-transition + smanjiti first-load JS (code-split app.jsx) | 3 | 2 | 3 | **2.6** | 1 |
| P1-7 | Personalizacija na PDP („Preporuke uz ovo") — koristi postojeći personalization.json | 3 | 2 | 3 | **2.4** | 1 |
| P2-1 | Lookbook editorijal (per kolekcija, SSG) | 3 | 3 | 3 | **2.4** | 2 |
| P2-2 | Referral program („Donesi prijatelja") | 3 | 3 | 3 | **2.2** | 2 |
| P2-3 | Video „atelje/finishing" na PDP | 3 | 3 | 3 | **2.2** | 2 |
| P2-4 | Newsletter / drip-email kampanja (abandoned cart luxury touch) | 3 | 2 | 3 | **2.4** | 1 |
| P2-5 | Ekskluzivne kapsule kolekcije (limitirane, numerisane) | 4 | 4 | 4 | **2.2** | 2 |
| P2-6 | AR/VTO na mobilnoj (pokreni postojeći VTO u mobilnom WebAR) | 4 | 4 | 4 | **2.0** | 3 |
| P3-1 | Made-to-measure pilot za blazere/odela (B2B/MTM priča) | 4 | 5 | 4 | **1.8** | 3 |
| P3-2 | "Waiting list" za kolekcije (Hermès-stil ekskluzivitet) | 3 | 2 | 3 | **2.4** | 2 |

---

## 5. ROADMAP — faze

### FAZA 0 — „Tihi luksuz u jednoj nedelji" (impact brzo, niski trošak)
1. **P0-1 Material-first PDP** (jedna sekcija na proizvodu: "Materijal", "Poreklo", "Nega" — sadržaj već postoji u `data/*guide*`).
2. **P0-2 Gift & concierge** na checkout (checkbox gift, čestitka, WhatsApp CTA).
3. **P0-3 Sezonski hero** (video/parallax) + "Kolekcija" CTA.
4. **P0-4 Loyalty progres bar + drops** (early access 24h već postoji kao benefit → istaknuti kao UX).
5. **P0-5 Size advisor** (dijalog uz postojeći `size-guide`).
6. **P0-6 "Tihi dizajn" pass** (tipografska skala, whitespace — preko theme enginea, bez logike).

Puštanje KPI merenje od Dana 1 (LCP, AddToCart, AOV).

### FAZA 1 — „Editorijal + standard" (2–4 nedelje od P0)
7. **P1-1 Atelje DALLI stranica** (SSG, heritage + organic cotton + atelje priča).
8. **P1-2 Styling look na PDP** (fotke modela po kolekcijama).
9. **P1-3 VIP clienteling** (concierge kanal + birthday perk preko postojećih Loyalty/User modela).
10. **P1-4 Express checkout** za vraćene kupce (one-tap token, korišćenjem postojećeg API-ja).
11. **P1-5 Review→points** (već postoji Review sistem; dodati incentive).
12. **P1-6 Perf: code-split app.jsx, view-transition, mobile-first load** (SSG očuvanje SEO-a — vidi STOREFRONT_STRATEGY B).

### FAZA 2 — „Razlika" (1–2 meseca)
13. **P2-1 Lookbook** (editorijal per kolekcija).
14. **P2-2 Referral** (VIP program).
15. **P2-3 Video atelje na PDP**.
16. **P2-4 Abandoned-cart kampanja** (email template već postoji: `templates/abandoned-cart-email*.html` — samo aktivirati).
17. **P2-5 Ekskluzivne kapsule** (limitirane kolekcije + numerisani narativ).
18. **P2-2b Waiting list** (Hermès-style ekskluzivitet).

### FAZA 3 — „Prelazak granice" (3–6 meseci)
19. **P2-6 AR VTO na mobile** (WebAR wrapper oko postojećeg VTO).
20. **P3-1 MTM pilot** (made-to-measure za svečana odela — RS tržište premium B2C).
21. Status: revizija → STOREFRONT_STRATEGY C/D ako saobraćaj signalizira potrebu za SPA.

---

## 6. KPI TARGETI (šta mjerimo da dokažemo "svetska klasa")

| Metrika | Sada (est.) | Cilj (3 meseca) |
|---|---|---|
| LCP (mobile) | SSG, HTML ~200 KB | **< 1.6 s** |
| INP | dosta JS-a → srednji | **< 200 ms** |
| AddToCart rate (PDP) | — | **+15–25%** |
| AOV | — | **+10–15%** (gift/cross-sell/MTM) |
| Checkout conversion | — | **+8–15%** (concierge + express) |
| VIP retencija (30d) | — | **≥ 35%** |
| Newsletter → drops click | — | **≥ 20%** |

---

## 7. FOKUS NA KONKURENTSKU PREDNOST

> **"Tihi luksuz + brzina SSG + experience engine."**
> Ne kopiramo Hermès/Armani vizuel — između njihovog SPA-a i našeg SSG-a biramo ono što smo
> jedino sposobni da uradimo BOLJE: (1) ultra-brzu percepcionu luksuznost, (2) dizajn koji se
> menja na edge-u za svaku kampanju, (3) materijalnu senzualnost na PDP, (4) VIP tretman u
> mikro-tržištu RS (gde velika house-a nisu ni prisutna).

Prva 3 P0 stavka (Material-first PDP, Gift+Concierge, Sezonski hero) daju najviši
revenue/impact po danu i dokazuju metod — MVP da merimo pre uvećanja obima.

*(Ne primenjeno — prema zadatku PHASE 3.)*