# DALLI 2.0 — BLUEPRINT (next-gen luxury commerce)

> PHASE 5 · Visionary blueprint · Dizajn, ne implementacija.
> **Fokus: category leadership, ne feature parity.** „Ne radimo šta Hermès ima; radimo ono što
> digitalni nativni couturier može, a kuće ne." → **DALLI 2.0 = "Digital Couturier"**.

---

## 0. IZVRŠNI REZIME — TEZA

Svaka faza do sada gradila je temelje koje 2.0 sada **spaja u jedan sistem koji kupca vodi od
„vidim" → „probam" → „imam" → „nosim" → „vraćam se"**, uz ljudski dodir koji zamagljuje granicu
onlajn/butik.

```
   +-----------+   +----------------+   +-------------+
   |  VIDIM    | → |    PROBAM      | → |    IMAM     |
   | VisualSrch|   | AI Stylist+VTO |   | Concierge   |
   +-----------+   +----------------+   +------+------+
                                                 ↓
   +-----------+   +----------------+   +-------------+
   | VRAĆAM SE | ← |   NOSIM       | ← |  VIP/Loyal  |
   | Omni/2.0  |   | Care/Refund   |   |  Klan 2.0   |
   +-----------+   +----------------+   +-------------+
```

Jedna rečenica cilja:
> **„Every outfit you dream of, styled, fitted, delivered, and remembered."**

Osam stubova — roadmap ih integriše, počevši od re-use-a postojećeg koda (VTO AI interface,
event bus `js/core/events.js`, loyalty tiers, experience engine).

---

## 1. NORTH STAR & PRINCIPLES

### Category leadership teza (vs benchmark)
| Dimenzija | Kuće (Hermès/LV/Dior/Armani/Boss/Zegna) | DALLI 2.0 diferencijator |
|---|---|---|
| Styling | Editorial lookbook (statičan) | **AI Stylist po osobi** — personalizovani look da svaki proizvod |
| Fit | Veloviči guide table | **Digital fit: selfie → VTO → veličina preporuka** (ukrštajući telemetriju) |
| Kartica napuštena | Drip email | **AI konverzija: „stylist napravio ti outfit"** u jednoj poruci |
| Loyalty | Points/status | **Status kao moda** — ekskluzivni klan, drops, personal shopper |
| Servis | Chatbot/CRM | **Concierge „moja radnja"** — 1:1 WhatsApp ljudi + AI-helper |
| Tržište | Global | **Lokalna prevlast**: RS/region, kurirski dostava, kripto, stručnost |

### Principi
1. **"Fitted luxury"** — personalizacija je luksuz, ne algoritamski spam.
2. **Data je jedini vlasnik** — konverzija stupa iz iskustva, ne agresivnog remarketinga.
3. **Ljudsko + mašinsko** — AI je prvi, čovek (concierge) je poslednja reč za VIP.
4. **Mobile-native, butik-feel** — sve staje u telefon; ništa ne izgleda kao store jaja.
5. **SSG-prilagođeno** — brzina kao luxury (nalazi iz PHASE 2/3 ostaju netaknuti).

---

## 2. REFERENTNA ARHITEKTURA (DALLI 2.0)

### 2.1 Slojevi
```
┌──────────────────────────────────────────────────────────────┐
│ UX LAYER (MPA + React islands per STOREFRONT_STRATEGY B)      │
│  islands: StylistChat · VisualSearch · VTO·Fitting ·           │
│           VIPLounge · LoyaltyWallet · ConciergeDrawer ·        │
│           LookBuilder                                          │
├──────────────────────────────────────────────────────────────┤
│ API LAYER (Node/Express, /api/v2)                             │
│  /v2/stylist · /v2/search/visual · /v2/fit · /v2/loyalty ·     │
│  /v2/concierge · /v2/personalization · /v2/analytics · /v2/omni│
├──────────────────────────────────────────────────────────────┤
│ AI LAYER (provider-swappable, interface kao VirtualTryOnAI)     │
│  Embeddings (prod/user) · Recs hybrid · Outfit generator ·     │
│  Fit model · Visual embed · NLU concierge · Copilot analitika  │
├──────────────────────────────────────────────────────────────┤
│ DATA LAYER                                                     │
│  Postgres (Neon) = facts  · Redis (Upstash) = online featuure  │
│  Event Stream (analytics/tracking) · Vector store (pgvector)   │
│  Object store (user images, UGC)                               │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Osnova na postojećem (NE gradimo iz nule)
| Postojeći asset | 2.0 koristi kao |
|---|---|
| `js/modules/VirtualTryOnAI.js` (interface swap contract) | AI fabric fit pipeline (već je provider-agnostičan) |
| `js/core/events.js` (eventBus, emit) | Preface za **event stream** (dodati batching/send) |
| `data/personalization.json` (weights) | Start tačka za ML recs (naslediti na v2) |
| `data/loyalty.json` (member/silver/gold/**black** + personal_shopper_access) | **VIP Klan 2.0** već ima klu: black tier gradi member economy |
| `data/virtual-tryon-config.json` (categories, camera, eu-central-1) | Fitting pipeline parametri |
| Experience Engine / theme-injector (edge) | Dynamic surface per korisnik/segment (kampanje + personalizacija) |
| Scheduled-audit + blobs (Netlify) | Analytics/site health postoje; nadograditi telemetrijom |

---

## 3. STUB 1 — PERSONALIZATION ENGINE (jezgro svega)

### 3.1 Event stream (temelj)
- Ambientalni tracking: view, add_to_cart, scroll, fit attempt, consultation, refund, support ticket.
- **Client** (islands emit via `js/core/events.js` → batching to `/v2/track`) → **Stream** (Redis queue) → **Buffer/ML**.

### 3.2 Recos hijerarhija (nasleđuje personalization.json → nadograđen)
```
nivo 1  Populiarni (kolekcija, season)          — cold start, login/no-login
nivo 2  Content-based (tags/category/style/price, teže postojećih .30)
nivo 3  Collaborative („kupili su i", .35)       — nakon 5 interakcija
nivo 4  Hybrid + Contexual (weather, event, segment, likeme)   — DALLI 2.0
nivo 5  Style embedding (nasledi „slični looks", uz VTO preference) — flagship
```
- **Delivery**: islands na PDP/cart/home + email (drip) + concierge chat + push.
- Context bihva: sezona, region (RS temperatur), kategorija, price-point, loyalty tier.

### 3.3 Vector store (pgvector na Neon)
- embeddings proizvoda (style/category/color/material) i korisničkog profila.
- „style match" — outfit → najbliži proizvodi; „find your style" kviz → embedding.

---

## 4. STUB 2 — AI STYLIST

### 4.1 Konverzacioni stylist („DALLI Stylist")
- Input: cilj/event („venčanje", „poslovni sastanak", „grad u subotu"), budžet, emocionalni ton.
- Output: 1.–3. **outfit** (top+bottom+shoes+accessories) sa kostimom i „zašto".
- Stanje: stil keeps u „Look Wallet".

### 4.2 Look Builder (outfit construction)
- Drag-and-drop outfita iz proizvoda, ti-side by side kompatibilnost (color harmony, layering).
- Nudi „complete the look" — better AOV (PHASE 3 KPI hook).

### 4.3 AI fit asistent (vezan na VTO)
- Poceni fit telemetrija (šta korisnik vraća, veličine, komentari) → **fit-profil po korisniku**.
- Rekomendacija veličine pre VTO slike („po tvom profilu i istoriji → S, ne M").

### 4.4 Content
- Stilski vodiči (26 postojećih editorial-a) postaju **outfit pages** (SSG) sa AI „look links".

---

## 5. STUB 3 — VISUAL SEARCH

### 5.1 „Slikom do proizvoda"
- U kasu kit na search: upload/screenshot/Instagram repost → visual embed → kandidati.
- Plus **„find the look"**: screenshot editorijala → detect outfita → šta je u story (vidljivo).

### 5.2 Camera→VTO bridging
- Ista slika za vizuelni search takođe ulazi u VTO (jedan klik „probaj na sebi").
- Kandidat: VTO agencija na edge (`eu-central-1` već u config).

### 5.3 Search 2.0 sa baze
- Upgrade search: FTS na Postgres + embeddings (pgvector); Netlify `search.js` već ima upstream API pier-rezim (`API_URL`) — proširiti vizuelnim rerankom.

---

## 6. STUB 4 — LOYALTY 2.0 + VIP MEMBERSHIPS

### 6.1 Statusna ekonomija (nasledi tiers)
- Trenutni `member/silver/gold/black` → dodati **progression bar**, „spend za upgrade", **status perks** već delom definisani (free_returns, personal_shopper_access, exclusive_collections — osnažiti).
- **Wear-earn**: review + fit confirmation + UGC sa slikom u stvarnom nošenju → points (besplatno sočivost).

### 6.2 VIPMembership (paid klan)
| Tier | Cena | Perk |
|---|---|---|
| **Member** | besplatno | osnova: points, wishlist sync, order tracking |
| **Silver** | → | free shipping, birthday gift, 24h early access (postoji!) |
| **Gold** | rec. ~9.000 RSD/god | priority support, exclusive collections, gold-only discounts, onboarding session (consierge 30 min) |
| **Black** | rec. ~24.000 RSD/god (invite) | personal shopper 1:1, waiting list pre drops, made-to-measure slot, besplatni restilising savet, kućni try-on (naročito za blazers) |

### 6.3 Drops & waiting list (Hermès-stil, digital native)
- **Waiting list** za kapsule (numerisane), push kada je „tvoj" red na redu → inbox envy do **preorder**.
- **Early access** već postoji za Silver — razbiti u UX (timeline na home „Otvoreno za Black").

---

## 7. STUB 5 — LUXURY CONCIERGE

### 7.1 Kanal
- WhatsApp/Business + Telegram + e-mail (postojeći SMTP template-ovi) + in-site drawer.
- **1:1 = ljudi + AI copilot** (AI priprema, agent odobrava; VIP=čovek).

### 7.2 Use cases
- Pre-purchase: stilsko savetovanje, fit, dostupnost, veleposlanik.
- Purchase: personalizovan sanit zasnivan, gift wrap (PHASE 3), poruka.
- Post-purchase: pranje/brijaške, zamene, povrati — „return atelje" sa fotografijom razloga.

### 7.3 Merni
- CSAT po kanalu, first-response time (<60s za S+, <5min ostalo VIP), revenue po konsultaciji.

---

## 8. STUB 6 — ADVANCED ANALYTICS

### 8.1 Customer 360 / CLV
- Košarica: identify (logged) + guest bake (device, IP, email capture) → unified profile.
- Segmenti po CLV cohort (RFM), lifetime, category affinity, style embed.

### 8.2 Kanali
- Merenje: acquisition → activation → revenue → **luxury metrics** (AOV, repurchase, VIP retention, try-on→buy, stylist influence).

### 8.3 Dashboard (admin)
- Netlify scheduled-audit + existing admin charts (chart.js već u deps) → **"Luxury Command Center"**:
  - LTV funnel, cohort heatmap, stylist conversions, drops waitlist, inventory sell-through za IG looks.

### 8.4 Attribution (privacy-first)
- First-party, bez creepy tracking-a; clearouta transparentnost (cookie-consent.css postoji).

---

## 9. STUB 7 — OMNICHANNEL

### 9.1 Unified commerce
- Jedan **inventory+price+order** sloj kroz: web, WhatsApp chat-to-order, IG/product tags, in-person (butik/events).
- Na web UGC iz Instagrama već postoji (`ugcFeed`) → proširiti na "shop the look" IG reels.
  
### 9.2 Physical points (events/butik beta)
- Pop-up na sajmu/event → QR: „nosi ovaj look digitalno odmah" (onim visual search + VTO) → cart ready.

### 9.3 Social buying
- IG shoppable postovi → deep link na PDP (redirects postoje w/ /proizvod-*).
- **Migracija kotara** između chat i web (QR rezervisana korpa).

---

## 10. DATA & PRIVACY (zaštita)

- **GDPR/LSSI**: consent menadžer (cookie-consent već postoji), data minimization, opt-out za personalizaciju, anonimizacija eventa posle N dana.
- User images (VTO/uploads) — **brisanje po zahtevu**, opcionalna opcija „obriši sav moj digitalni odraz".
- ML: čuvati embeddings i modele s pseudonimizovanim ID (bez PII).
- Payment (kripto/visa) — ništa novo; ceo X dev samo adds hope, root data ostaje u DB.

---

## 11. MIGRATION ROADMAP (DALLI 2.0)

Faze oslanjaju se na ranije PHASE (2=islands, 3=luxury, 4=prod readiness):

| Faza | Sadržaj | Trajanje (est.) |
|---|---|---|
| **2.0-A Foundations** | Event stream (+batch), 2.0 auth/identify, pgvector setup, /v2 API skeleton | 3–4 nedelje |
| **2.0-B Personalization v1** | Upgrade recos (hybrid prikaz), context, style embedding v0 | 4–6 nedelja |
| **2.0-C Stylist chat MVP** | NLU → outfit gen ove ra; Look Builder + integracija sa filters archipelago | 4–6 nedelja |
| **2.0-D Visual search + camera→VTO** | image embed, find-the-look, fit asistent MVP | 4 nedelje |
| **2.0-E Loyalty 2.0 + VIP Klan** | wallet, progression, drops/waitlist, paid memberships, points for UGC | 3–4 nedelje |
| **2.0-F Concierge + Omni** | WhatsApp gateway, chat-to-order, IG shop, return atelier, pop-up QR | 3–4 nedelje |
| **2.0-G Command Center** | analytics dashboards, luxury metrics, attribution | 2–3 nedelje |

**Ukupno: ~6–8 meseci inkrementalno.** Svaka faza samostalno sadrži bezbedan release (feat-flags,
A/B), bez velikog bounce-a (SSG brzina zadržana).

---

## 12. POZICIONIRANJE VODSTVA (category leadership)

| Kapacitet | Konkurent (benchmark) | DALLI 2.0 | Značaj |
|---|---|---|---|
| AI personalizacija outfita | LV/Armani: editorijalni, ne personalizovan | stylist po osobi | **novi standard** |
| Fit & T&A (try-on) | Hermès: nema; neki imaju size charts | digital fit + true VTO na obuci | **jedinstveno** |
| Membership stranka | Dior/LV: VIP silos, globalni; RH | lokalni VIP klan kod RS premium segmenta | **lokalna prevlast** |
| Visual search | Parionski nudimo; nijedna od 6 kuća | članica od dana 1 | **early-mover** |
| Omnichannel | Concierge chat je gmj; WhatsApp često ne postoji | WhatsApp = primarni servis (region) | **local trust win** |
| Data/brzina | SPA/SSR teški | SSG + edge theme | **perceived luxury** |

**Zaključak:** DALLI 2.0 ne "prati" kuće — definiše ono što one ne mogu da urade jer su vezane
legacy SPA-ovima i globalnom jedno-obraznošću. Naš konkurentski put: **digital native couturier
za region sa AI stilizovanjem, fit-om i VIP tretmanom 1:1.**

---

## 13. TARGET KPI (2.0 nakon zrelosti)

| Metrika | Target (12 meseci nakon 2.0) | Nasuprot danas |
|---|---|---|
| Konverzija (PDP→order) | +25–35% | bazno |
| AOV | +20–30% (outfit/gift/MTM) | bazno |
| Self-diagnozza refund stopa | −30% (fit/veličina rešen) | bazno |
| VIP retencija (180d) | ≥50% | ~- |
| Stylist→buy rate | ≥8% | nema |
| Visual search → add-to-cart | ≥5% | nema |
| Omni share (chat/IG/boutique) | 15–20% web revenue | 0 |

---

## 14. LIMITI I RIZICI

- **AI kvalitet** (VTO/outfit-gen): početno mock (kao VirtualTryOnAI) → dugačak ugovor sa providerom (Replicate/Fal.ai/OpenAI) sa fallback.
- **Data hladni start**: embed regus dovoljno proizvoda+orders (seed generated već postoji) — start sa content-based + bootstrap kolekcijama.
- **Nedovoljan inventar MLAO**: veći broj proizvoda (→ skalisati na 200+ SKU) pre vizuelnog search/outfit bila smislena.
- **Privatnost**: transparentnost, GDPR compliance pre 2.0-B release-a.
- **Trošak**: model hosting startup; koristiti pravne dugoročne minimalne instance trenutno (pgvector na Neon, batch na serverless).

---

## 15. PRVI KORAK (Faza 2.0-A, nakon odobrenja)

1. **Event stream stub** na postojećem `js/core/events.js` → `POST /v2/track` (batch, Redis queue) — frontend bez velikog budžeta, islands adapt.
2. **pgvector + /v2/personalization** — recos upgrade po nivoi 1–5, drop-in za `data/personalization.json`.
3. **Identify**: unify user ID (anon → logged) na postojećem auth (JWT cookies).
4. **/v2 skeleton** ruta (stylist/fit/visual/loyalty stubs) uz OpenAPI spec.

Plan za implementaciju dolazi iza odobrenja korisnika (ne primenjujemo kod bez dozvole).

---

*DALLI 2.0 — category leadership, ne feature parity. Temelji postoječan kod: VTO AI interface,
event bus, loyalty tiers (Black), experience engine, SSG brzina, scheduled-audit. Svaki stub je
dizajniran da se može izgraditi fazno bez velikog refaktora.*