# FRONTEND_MIGRATION_STATUS.md — Status migracije FE na React Islands

> Datum: 2026-10-09 · Project DALLI · Prati `REACT_ISLANDS_PLAN.md` (Faza 2A/2B/2C/2D)
> Princip: **MPA/SSG ostaje** — islands su aditivni sloj, React se učitava isključivo dinamički.

---

## 1. Migrisani islands (React 18)

| Island | Fajl | Stranice | Uloga | Interaktivno | Podaci |
|---|---|---|---|---|---|
| `loyalty` | `js/islands/LoyaltyIsland.jsx` | profile.html | Status roadmap (member→black) | prikaz + progress | stati+static (`data/loyalty.json`-uzorak) |
| `concierge` | `js/islands/ConciergeIsland.jsx` | profile, cart | Plutajući concierge CTA | otvori/zatvori panel | static data-props |
| `cart` | `js/islands/CartIsland.jsx` | cart, checkout | Live status korpe + free-shipping progress | CTA + „Prazni" (piše u store!) | **live** — shared signal store |
| `wishlist` | `js/islands/WishlistIsland.jsx` | wishlist | Live stat strip (broj + vrednost) | prikaz | **live** — sync sa vanilla localStorage |
| `search` | `js/islands/SearchIsland.jsx` | SSG produkti, checkout, profile | Komandna paleta / pretraga kataloga | pretraga po `search-index.json`, linkovi na SSG stranice, prikaz cene | **live** — data/search-index.json |
| `checkout` | `js/islands/CheckoutIsland.jsx` | checkout | Widget pregled korpe (korak 1) | međuzbir, dostava, zahtev za korak pre potvrde | **live** — shared store |
| `auth` | `js/islands/AuthIsland.jsx` | profile, orders | Auth status kartica | status prijave, crypto wallet postavka, logout | **live** — state/user.js |
| `profile` | `js/islands/ProfileIsland.jsx` | profile | Dashboard pregled | sažetak naloga/korpe/želja | **live** — shared store |
| `orders` | `js/islands/OrdersIsland.jsx` | orders, profile | Istorija porudžbina + statistika | lista iz `dalli_orders`, statusi, agregatne sume | **live** — localStorage dalli_orders |
| `vto` | `js/islands/VtoIsland.jsx` | SSG produkti | Virtual Try-On kontrole | webcam/upload + canvas preview, aditivno (bez app.jsx na tim stranicama!) | static data-props |
| `configurator` | `js/islands/ConfiguratorIsland.jsx` | SSG produkti | Konfigurator varijante + dodaj u korpu + size finder | izbor veličine/boje/količine → `addToCart` (bridge) | **live** — shared store |
| `reviews` | `js/islands/ReviewsIsland.jsx` | SSG produkti | Obrazac za recenziju + statistika + glasanje | zvezde, naslov, tekst, slike; submit → `dalli_reviews` (pending/auto-approved), vote „Pomaže" | **live** — `dalli_reviews` + `/data/reviews.json` (fetch-cache) |
| `cart-drawer` | `js/islands/CartDrawerIsland.jsx` | SSG produkti, orders, profile, wishlist | Drawer korpe (header FAB/`#cartBtn`/`.cart-link`) | qty/ukloni, free-shipping progress (5000 RSD), crypto popust, CTA; scroll-lock + Esc | **live** — shared store |
| `profile-forms` | `js/islands/ProfileFormsIsland.jsx` | profile | Forme ličnih podataka + lozinka + kripto | izmena podataka → `updateUser`, uključi kripto → `setCryptoWallet` | **live** — `state/user.js` |
| `orders-management` | `js/islands/OrdersManagementIsland.jsx` | profile | Upravljanje narudžbinama | otkazivanje (pending/confirmed, 2-step), ponovna kupovina isporučene → `addToCart` | **live** — `dalli_orders` |

**Bridge sloj:** `js/islands/useStore.js` — React hook-ovi nad ISTIM signal store-ima kao vanilla
(`js/state/cart.js`, `js/state/user.js`, `js/state/locale.js`). Islands čitaju isti izvor i mogu
pisati (dugme „Prazni" → `clearCart()`), vanilla UI se ažurira trenutno. **Nema duplikacije logike.**

**Infrastruktura:** `js/islands/index.js` (loader: `[data-island]`, `data-props`, idle hydrate), `ErrorBoundary.jsx`, react manualChunk u `vite.config.ts`.

## 2. Preostali vanilla moduli (još NISU island-i)

| Oblast | Moduli | Napomena |
|---|---|---|
| **Cart drawer** (header FAB + pregled) | `js/features/cart-drawer.js`, deo `app.jsx` | 2D dodao **`cart-drawer` island** na SSG produktima, orders, profile, wishlist (isti store); vanilla okidač na app.jsx stranicama ostaje |
| **Checkout (4 koraka)** | `js/pages/checkout/*` (step1-4, orchestrator) | Vanilla step*.js ostaju; 2C dodao **`checkout` island** (pregled korpe u koraku 1) preko bridge-a |
| **Auth / user meni** | `js/features/auth-modal.js`, `state/user.js` | Modal ostaje vanilla; 2C dodao **`auth` island** (status kartica) na profil/orders |
| **Search modal** | `js/pages/search-ui.js` (+ `app.jsx` deo) | Vanilla modal netaknut; 2C dodao **`search` island** (komandna paleta) na SSG produktima, checkout, profil |
| **Product page** (gallery, 360, recenzije, Q&A) | `js/pages/product.js`, `js/modules/*` | Na SSG produktima: **`vto`** + **`configurator`** (2C) i **`reviews`** (2D, obrazac+statistika); gallery/360/Q&A ostaju vanilla |
| **Wishlist grid render** | `app.jsx` (toggleWishlist/saveWishlist) | Read-only part kroz island; render ostaje vanilla |
| **Profile forma / crypto wallet** | `js/pages/profile.js` | 2D dodao **`profile-forms` island** (lični podaci, lozinka, kripto toggle) pored 2C `profile` dashboard pregleda |
| **Orders / Settings forme** | `app.jsx` deo | 2D dodao **`orders-management` island** (otkazivanje + ponovna kupovina) pored 2C `orders` istorijskog island-a |
| **Kategorije/filteri** | `js/components/CollectionFilters.js` | Ostaje vanilla |
| **Blog** | `js/blog/*` | SSG-generated; ostaje vanilla |
| **Loyalty render** (originalni blok) | `js/features/loyalty-integration.js` | Island dodaje roadmap; original UI netaknut |
| **i18n / theme / locale** | `js/i18n*`, `state/theme.js`, `state/locale.js` | Ostaje vanilla (islands ga KORISTE kroz bridge) |

## 3. Procenjeni stepen migracije

Metodologija: broj interaktivnih površina • težina • da li su obrađene/u toku/neta.
Ukupno interaktivnih površina (iz Phase 2B audita): **~29** — isti skup kao u 2B.

| Oblast | Površine | Status | % |
|---|---|---|---|
| Header / navigacija / user-meni / cart drawer | 6 | **`cart-drawer` island (2D)**; meni/navigacija vanilla (1 obrađeno) | ~17% |
| Home killer-slajder / featured / modali | 4 | Vanilla | 0% |
| **Cart / Wishlist** | 4 | Island **+** vanilla (2 obrađeno) | 50% |
| **Loyalty / Profil status** | 2 | Island **+** vanilla (1.5 obrađeno) | ~75% |
| **Checkout** (4 koraka) | 4 | Vanilla step*.js + **`checkout` island** (1 obrađeno) | ~25% |
| **Product page** (VTO, config, gallery, recenzije, Q&A) | 6 | **`vto` + `configurator`** (2C) + **`reviews`** (2D) na SSG (3 obrađeno), gallery/360/Q&A ostaju vanilla | ~50% |
| **Search overlay / paleta** | 1 | **`search` island** (obrađeno na SSG+checkout+profil) | 100%* |
| **Auth / Profil dashboard + forme** | 3 | **`auth` + `profile`** (2C) + **`profile-forms`** (2D) (3 obrađeno) | 100% |
| **Orders / Settings forme** | 2 | **`orders`** (2C) + **`orders-management`** (2D) (2 obrađeno) | 100% |
| **U K U P N O (površine, stroga metoda)** | **~29 površina** | ~14.5 površina ima React obradu | **~50%** |

> Alternativna, grublja metoda — **klasteri interaktivnih celina** (isti fokus kao prioritetna lista u planu):
> od **18 klastera**, React islands pokrivaju **11** (search, checkout, auth, profile, orders,
> vto, configurator, cart, wishlist, loyalty, concierge) → **~61%**. 2D ne dodaje NIJEDAN novi
> klaster (reviews/cart-drawer/profil forme spadaju u već-pokrivene product/cart/profile/orders
> blokove) — ali produbljuje pokrivenost unutar postojećih klastera.

> Realna ocena: stroga površinska metoda (ista osnova kao 2B, ~20% → 2C **~36%** → 2D **~50%**);
> klaster metoda **~61%**. Razlika je u granici: površine broje i još-ne-obrađene delove istog
> bloka (npr. gallery/360 pored vto/config island-a), dok klasteri mere da li ceo interaktivni
> blok ima React prisustvo. POSLE 2D remaining veliki blok bez React-a: gallery/360/Q&A na
> produktu, home moduli, kategorije/filteri.

## 4. Preporuka: Islands vs Full SPA

### ✅ Preporuka: **OSTATI na Islands arhitekturi (2026-2027)**

**Zašto NE full SPA:**
1. **SEO/SSG su poslovna prednost** — 44 SSG stranice, generisane product stranice, blog, lokacije.
   SPA bi zahtevao SSR/ISR re-izgradnju (Edge SSR na Netlify-u i dalje rizičan; Vercel nije cilj).
2. **Core Web Vitals** — MPA daje prirodno odličan LCP na generisanim stranicama; SPA bez SSR bi ga uništio.
3. **app.jsx monolit (13k+ linija)** — prevelik rizik za jednokratnu migraciju; islands omogućava inkrementalno.
4. **Rok/budget** — islands već donosi vrednost uz minimalan rizik i 0 regresiju.

**Kada bi se preispitalo:**
- Ako kroz 2C/2D **>70% interaktivnih površina** postane islands, a još uvek želimo SPA osećaj
  (prelazi, animacije, offline-first) → glasaj za **Hybrid+SSG (Astro/SolidStart)** pre nego za
  čisti client SPA.
- Prebaciti na SPA samo ako UX metrike (bounce, konverzija) eksplicitno pokažu da MPA košta prodaju.

**Prag odluke (revisit pre do 2.1):**
- Islands prelazak >20% → nastavi islands.
- Pojava više od 3 island-a na istoj stranici → razmotri konsolidaciju u jedan root kompozit.
- Aukcija: izmeriti INP + LCP na island stranicama protiv baseline-a (Lighthouse CI).

## 5. Verifikacija (Phase 2C + 2D)

```
✅ npm run build:prod                  — vite ✓ SSG ✓ inject-islands ✓ sitemap (57 URL) ✓ dist validan (0 grešaka)
✅ React i dalje 100% lazy             — react-islands chunk NIGDE u HTML; loader (index-*.js hashed) jedina nova skripta
✅ Loader na SSG produktima            — 13/13 generisanih produkt stranica dobilo hashed islands loader (inject-islands.cjs)
✅ data-props na SSG-u                 — vto/configurator/search/reviews JSON ispravno parsira posle entity decode (getAttribute)
✅ init JS netaknut                    — index.html (glavna stranica) bez islands loadera
✅ unit testovi 2C/2B                 — islands-bridge.test.js + island-lib.test.js 19/19 ✅
✅ unit testovi 2D                    — island-lib-2d.test.js (26) + islands-2d-smoke.test.js (5, createRoot mount + interakcija) ✅
✅ ukupno islands testovi             — 46/46 ✓
✅ ESLint js/islands/*                — 0 grešaka (uključujući 2D lib/komponente i test fajlove)
✅ Bundle uticaj izmeren              — reviews 21.4/5.3 kB, profile-forms 14.5/2.7 kB, cart-drawer 13.2/2.8 kB, orders-management 11.1/2.3 kB (raw/gz); react-islands chunk & dalje NIGDE u HTML
```

**Struktura 2D isporuke** — novi slojevi:
- `js/islands/lib/reviews.js` — čista logika recenzija (fetch-cache baze, `dalli_reviews` store, merge, statistika, validate/submit/vote) — isti ugovor kao vanilla ReviewSystem
- `js/islands/lib/orders.js` proširen — statusi boje, `getPaymentMethodLabel`, `canCancelOrder`, `canReorderOrder`, `saveOrders`, `updateOrderStatus`, `buildReorderItems`
- funkcionalni smoke test okvir — `islands-2d-smoke.test.js` (mount pravih komponenti preko `createRoot` + simulirane interakcije + provera upisa u localStorage)

Napomena: `npm test` (vitest, ceo) vraća 4 failed fajla — svi su u `admin-new/tests/*`
(ImperiumAdmin SPA, isključen iz vite build-a, import `admin-new/js/admin.js`); nijedan ne
referencira islands/storefront kod i ti failure-ovi su pre-egzistirajući.

**Struktura 2C isporuke** — novi slojevi:
- `js/islands/lib/{fit,orders,search}.js` — čista business logika (veličine, porudžbine, pretraga) učitava se lagano i testabilna
- `useStore.js` + `useOrders` — bridge proširen za čuvanje/čitanje porudžbina (dalli_orders)
- `scripts/inject-islands.cjs` — post-build korak koji zamenjuje/dopišuje hashed islands loader u generisane (SSG) HTML stranice koje nisu rollup input-i (produkt-template, kolekcije)