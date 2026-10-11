# REACT_ISLANDS_PLAN.md — FazA 2A: Hybrid MPA + React Islands

> Status: **ISPORUČENO — implementirano i verifikovano** (build:prod ✅, dist validacija ✅)
> Datum: 2026-10-09 · Deo projekta DALLI 2.0 (Phase 2a iz `STOREFRONT_STRATEGY.md`)

---

## 1. Cilj

Uvesti **React samo tamo gde interaktivnost donosi vrednost**, a da sačuvamo sve benefite
trenutnog sajta: **SSG/SEO, generisane product/category/blog stranice, MPA navigaciju i
odlične Core Web Vitals**. Ovaj plan ne pretvara sajt u SPA, ne menja URL-je i ne dira
postojeću vanilla logiku.

## 2. Principi (ograničenja)

1. **MPA ostaje glavni pristup** — navigacija dalje učitava HTML po stranici.
2. **React se NIKAD ne učitava statički.** Loader (1.6 kB) je nova jedina skripta na island
   stranicama; React runtime, error boundary i sam island idu kroz **dinamički import** tek na idle.
3. **Islands su aditivne** — ne zamenjuju postojeće vanilla widgete (loyalty UI, korpa, ...),
   ne dele ID-jeve sa njima, i mogu se ukloniti bez razbijanja sajta.
4. **Bez URL promena, bez SEO regresije, bez CWV regresije** (verifikovano u build-u i dist-u).
5. **Error-safe** — svaki island je omotan u error boundary; pad islanda uklanja placeholder,
   nikad ne ruši stranicu.

## 3. Arhitektura (kako je izvedeno)

```
                        ┌─────────────────────────────────────────┐
   HTML stranica        │  <div data-island="loyalty">            │
   (MPA, bez React-a)   │  <div data-island="concierge">          │
                        │  <script type="module" src="/js/islands/index.js"> │
                        └──────────────┬──────────────────────────┘
                                       │  dinamički import (requestIdleCallback)
                                       ▼
   js/islands/index.js (1.6 kB) ──►   registry: { loyalty, concierge }
                                       │
                 ┌─────────────────────┼──────────────────────┐
                 ▼                     ▼                      ▼
   react-islands chunk (312 kB)   ErrorBoundary.jsx      LoyaltyIsland.jsx /
   (react + react-dom, samo         (0.4 kB)              ConciergeIsland.jsx
   kada treba hydrate)                     
```

- **Loader** (`js/islands/index.js`): skenira `[data-island]`, čita `data-props` (JSON),
  hydratuje kroz `createRoot` tek kad browser pređe u idle (`requestIdleCallback`).
- **manualChunks** (`vite.config.ts`): `react/react-dom/scheduler/jsx-runtime` → zaseban
  `react-islands` chunk; ne ulazi ni u jedan HTML kao `<script>`/`modulepreload`.
- **`@vitejs/plugin-react`** transformiše SAMO `*.jsx` module; legacy fajlovi
  (`js/app.jsx`, `VirtualTryOnUpload.jsx`) su **isključeni** (`exclude`) jer su vanilla JS
  sa ne-namernim JSX simbolima.
- **Montiranje** u `profile.html` i `cart.html` (data-island marker + loader).

## 4. Saga isporuke (šta je urađeno)

### 4.1 Prvi par island-a (realizovano)
| Island | Fajl | Gde se montira | Veličina | Šta radi |
|---|---|---|---|---|
| `loyalty` | `js/islands/LoyaltyIsland.jsx` | `profile.html` (ispod postojećeg loyalty bloka) | 6.2 kB | „Status roadmap": tierovi member→silver→gold→black, progress bar do sledećeg nivoa, popusti |
| `concierge` | `js/islands/ConciergeIsland.jsx` | `profile.html` + `cart.html` | 4.3 kB | Plutajući luksuz-servis CTA (WhatsApp / email / telefon / radno vreme) |

### 4.2 Faza 2B — shared-store bridge + kart & wishlist (realizovano)
| Island | Fajl | Gde se montira | Veličina | Šta radi |
|---|---|---|---|---|
| `cart` | `js/islands/CartIsland.jsx` | `cart.html` + `checkout.html` | ~7 kB | Live status korpe: count, međuzbir, dostava, progress do besplatne dostave, crypto popust, CTA; „Prazni" piše kroz `clearCart()` (bidirekcioni bridge) |
| `wishlist` | `js/islands/WishlistIsland.jsx` | `wishlist.html` | ~3 kB | Live stat strip liste želja (broj + vrednost); re-sinhronizacija sa vanilla app-om |

Ključni novi sloj — **`js/islands/useStore.js` (bridge)**: React hook-ovi (`useCart`, `useCartTotals`, `useUser`, `usePrice`, `useWishlist`) nad **istim signal store-ima kao vanilla `app.jsx`** (`js/state/cart.js`, `js/state/user.js`, `js/state/locale.js`). Islands čitaju ISTO stanje kao vanilla UI i mogu pisati (npr. `clearCart()`), a vanilla se ažurira istog momenta — bez duplikacije business logike. Ovi state/core chunks su već u initial bundle-u (app.jsx ih puni), pa bridge NE dodaje initial bytes.

Testirano: `src/tests/unit/islands-bridge.test.js` (5 testova) — propagacija promena, free-shipping prag, qty/remove, clearCart, formatPrice.

### 4.2 Veličine u dist-u (build:prod, gzip)
```
js/islands/index.js             1.58 kB │  0.77 kB gz   (jedina nova skripta u HTML)
ErrorBoundary.jsx               0.38 kB │  0.29 kB gz
ConciergeIsland.jsx             4.32 kB │  1.27 kB gz
LoyaltyIsland.jsx               6.21 kB │  1.53 kB gz
react-islands chunk           312.77 kB │ 92.90 kB gz  (NIGDE u HTML – učitava se on-demand)
```

### 4.3 Faza 2C — islands za podršku NAP + SSG (realizovano)

Fokus: prioritetna lista iz §5 (checkout, auth, profile, orders, VTO, search, configurator).
Glavni iskorak — **SSG produkt stranice sada imaju React islands** kroz `scripts/inject-islands.cjs`
(post-build: pronalazi hashed loader chunk i zamenjuje/dopišuje ga generisanim `dist/**/*.html`).

| Island | Fajl | Gde se montira | Šta radi |
|---|---|---|---|
| `search` | `js/islands/SearchIsland.jsx` | SSG produkti, checkout, profile | Komandna paleta — pretraga po `search-index.json`, URL-i ka SSG produktima, prikaz cene |
| `checkout` | `js/islands/CheckoutIsland.jsx` | checkout | Widget pregled korpe (korak 1): međuzbir, dostava, potvrda pre step-a |
| `auth` | `js/islands/AuthIsland.jsx` | profile, orders | Auth status kartica (prijava, crypto wallet, logout) |
| `profile` | `js/islands/ProfileIsland.jsx` | profile | Dashboard: sažetak naloga/korpe/želja |
| `orders` | `js/islands/OrdersIsland.jsx` | orders, profile | Istorija + statistika porudžbina (`dalli_orders`) |
| `vto` | `js/islands/VtoIsland.jsx` | SSG produkti | Virtual Try-On kontrole (webcam/upload + canvas) — **aditivno**: tim SSG stranicama nedostaje app.jsx |
| `configurator` | `js/islands/ConfiguratorIsland.jsx` | SSG produkti | Vel./boja/količina + dodaj u korpu (bridge `addToCart`) + size finder |

Novi slojevi:
- `js/islands/lib/{fit,orders,search}.js` — pure logika (recommendSize, orderStats, searchProducts);
- `useStore.js` + `useOrders` — bridge čita `dalli_orders` (2s heartbeat + storage/focus event);
- `scripts/inject-islands.cjs` → korač u `scripts/build.cjs` (posle blog index, pre sitemap).

Testirano: `src/tests/unit/island-lib.test.js` + `islands-bridge.test.js` = **19/19** ✅;
`eslint js/islands/*.js js/islands/lib/*.js` čist. Build: **green** — 13 SSG produkta dobilo
loader, sitemap 57 URL, validate-dist Grešaka: 0.

### 4.4 Novo u dist-u (build:prod 2C, gzip)
```
AuthIsland.jsx            5.51 kB │  1.29 kB gz
SearchIsland.jsx          6.70 kB │  2.07 kB gz
OrdersIsland.jsx          2.61 kB │  0.89 kB gz
ProfileIsland.jsx         3.13 kB │  1.07 kB gz
VtoIsland.jsx            10.36 kB │  2.80 kB gz
ConfiguratorIsland.jsx   13.23 kB │  3.24 kB gz
CheckoutIsland.jsx        3.24 kB │  1.05 kB gz
react-islands chunk      312.77 kB │ 92.90 kB gz  (i dalje NIGDE u HTML – on-demand)
```

### 4.5 Faza 2D — reviews / cart drawer / profilske forme (realizovano)

| Island | Fajl | Gde se montira | Veličina (raw / gzip) | Šta radi |
|---|---|---|---|---|
| `reviews` | `js/islands/ReviewsIsland.jsx` | SSG produkti (`product-template.html`) | 21.4 kB / 5.3 kB | Obrazac za pisanje recenzije (zvezde, naslov, tekst, slike), live statistika, statusi (login / verifikovana kupovina / već recenzirano), moje recenzije, glasanje „Pomaže" |
| `cart-drawer` | `js/islands/CartDrawerIsland.jsx` | produkti, orders, profile, wishlist | 13.2 kB / 2.8 kB | Drawer na `[data-action="cart"]` / `#cartBtn` / `.header__cart` / `.cart-link` — qty/ukloni, progress do besplatne dostave (5000 RSD), crypto popust, checkout/korpa CTA, empty state; scroll-lock + Esc |
| `profile-forms` | `js/islands/ProfileFormsIsland.jsx` | profile | 14.5 kB / 2.7 kB | Lični podaci (ime/prezime/telefon/marketing, email zaključan), lozinka (demo), uključivanje kripto plaćanja → `setCryptoWallet` |
| `orders-management` | `js/islands/OrdersManagementIsland.jsx` | profile | 11.1 kB / 2.3 kB | Lista korisnikovih narudžbina sa detaljima, otkazivanje (pending/confirmed, 2-step potvrda), ponovna kupovina isporučene → `addToCart` |

Novi slojevi:
- `js/islands/lib/reviews.js` — pure logika recenzija (`loadBaseReviews` fetch-cache `/data/reviews.json`, `readStoredReviews`/`saveStoredReviews` na `dalli_reviews`, `mergeReviews`, `getProductReviews`, `getReviewStats`, `hasUserPurchased`, `canUserReview`, `validateReview`, `submitReview`, `voteHelpful` — isti ugovor kao vanilla ReviewSystem; vrednosti čuva `review_vote_<id>`).
- `js/islands/lib/orders.js` proširen — `ORDER_STATUS_COLORS`, `PAYMENT_METHOD_LABELS`, `getPaymentMethodLabel`, `canCancelOrder`, `canReorderOrder`, `saveOrders`, `updateOrderStatus`, `buildReorderItems`.
- Loader chunk je sada `index-zCu8evbH.js` (hash se promeni jer je registry narastao); inject-islands i dalje pronalazi tačno jedan `assets/js/index-*`.

Testirano: `src/tests/unit/island-lib-2d.test.js` (26 testova: reviews lib 15 + orders management 11) +
`src/tests/unit/islands-2d-smoke.test.js` (5 funkcionalnih testova: pravi mount preko `createRoot` +
neprijavljen korisnik vidi login poziv, drawer otvara i ažurira `#cartCount`, čuvanje profila +
kripto toggle, otkazivanje + ponovna kupovina). **27/27** u 2D + 19/19 iz 2C = 46/46 ✅;
`eslint js/islands/*.js js/islands/lib/*.js` + 2D test fajlovi čist.

Napomena o test okruženju (važi za sve smoke testove): `src/tests/setup.ts` zamenjuje
`window.localStorage` in-memory mock-om i čisti ga posle svakog testa → svaki test preseja
stanje pre importa state modula (signali čitaju localStorage u trenutku importa); pošto su
signal store-ovi modul-singltoni, testovi koriste `loginUser`/`logoutUser`/`clearCart` za
determinističko resetovanje.

### 4.6 Novo u dist-u (build:prod 2D, gzip)
```
ReviewsIsland.jsx           21.42 kB │ 5.27 kB gz
ProfileFormsIsland.jsx      14.46 kB │ 2.71 kB gz
CartDrawerIsland.jsx        13.17 kB │ 2.85 kB gz
OrdersManagementIsland.jsx  11.14 kB │ 2.28 kB gz
js/islands/index.js          3.37 kB │ 1.24 kB gz  (index-zCu8evbH.js)
react-islands chunk         312.78 kB │ 92.73 kB gz  (i dalje NIGDE u HTML – on-demand)
```

## 5. Kandidati za buduće islands (roadmap 2C / 2D)

Iz `STOREFRONT_STRATEGY.md` i audita (Phase 2B) — prioritet + status posle 2C:

| # | Island | Stranica | Status |
|---|---|---|---|
| 1 | **Search (komandna paleta)** | sve | ✅ 2C: `search` island (SSG + checkout + profile) |
| 3 | **Checkout step widget (pregled korpe)** | checkout | ✅ 2C: `checkout` island (korak 1) |
| 4 | **Size finder (configurator)** | product | ✅ 2C: `configurator` island na SSG produktima |
| 7 | **Virtual Try-On** | product | ✅ 2C: `vto` island (aditivne kontrole; vanilla VTO engine je na app.jsx stranicama) |
| 2 | **Reviews komentar obrazac** | product | ✅ 2D: `reviews` island na SSG produktima (obrazac + statistika + glasanje) |
| 5 | **Cart drawer (header)** | sve | ✅ 2D: `cart-drawer` island (SSG produkti, orders, profile, wishlist) |
| 6 | **Profile/orders forme** | account | ✅ 2D: `profile-forms` (lični podaci, lozinka, kripto) + `orders-management` (otkaz, ponovna kupovina); uz postojeće `orders`/`auth`/`profile` |

## 6. Afektirani fajlovi

**Novo:**
- `js/islands/index.js` — loader (registry, data-props, idle hydrate)
- `js/islands/ErrorBoundary.jsx` — error boundary za sve islands
- `js/islands/LoyaltyIsland.jsx` — loyalty status roadmap
- `js/islands/ConciergeIsland.jsx` — concierge widget

**Izmenjeno:**
- `vite.config.ts` — react plugin (include/exclude), react manualChunk
- `profile.html` — `data-island="loyalty"` + `data-island="concierge"` + loader script
- `cart.html` — `data-island="concierge"` + loader script
- `package.json` / `package-lock.json` — `react@18.3.1`, `react-dom@18.3.1`, `@vitejs/plugin-react@4.7.0`

## 7. Roadmap i effort

| Kvarat | Fokus | Effort (procenjeno) |
|---|---|---|
| **2A (uradjeno)** | infrastruktura + loyalty + concierge | ~1 dan |
| **2B (uradjeno)** | shared-store bridge + `cart` + `wishlist` islands + status doc | ~1-2 dana |
| **2C (uradjeno)** | search/checkout/auth/profile/orders/VTO/configurator islands + `inject-islands.cjs` (SSG produkte) → **~61% klaster coverage** | ~2-4 dana |
| **2D (uradjeno)** | reviews obrazac / cart drawer / profile-forms / orders-management islands + funkcionalni smoke test okvir (mount + interakcija) | ~4-7 dana |

## 8. Rizici i mitigacije

| Rizik | Težina | Mitigacija |
|---|---|---|
| React chunk poveća initial load | visok | ✅ Rešeno: react-islands se učitava dinamički, verifikovano da NE postoji u HTML ni kao modulepreload |
| Dupli widgeti (vanilla + React) | srednji | ✅ Islands su aditivni; loyalty/roadmap i concierge su novi, ne dele ID-jeve |
| Greška u islands ruši sajt | nizak | ✅ ErrorBoundary + loader catch (element se uklanja) |
| Build pipeline pukne | srednji | ✅ build:prod prolazi; dist validacija 0 grešaka; zbog toga su ispravljena 2 kvaru postojeće korupcije (videti §9) |
| JSX transformacija legacy .jsx | visok | ✅ exclude pravila u react({ include, exclude }); app.jsx i VirtualTryOnUpload.jsx su netaknuti (stari bundle identičan) |

## 9. Uputne korekcije korupcije (preduvjeti za stabilan build)

Tokom verifikacije otkrivena su **pre-postojeća oštećenja** koja su blokirala `build:prod`:

1. `templates/product-template.html` — višak `{{/if}}` (bilo 41 zatvaranje na 40 otvaranja)
2. `public/locations/{beograd-centar,kragujevac-delta-city,nis-forum-mall,novi-sad-promenada,usce-shopping-center}.html` — JSON-LD `{{ }}` duple vtičaste zagrade (istekla Handlebars sintaksa) → vraćeno `{ }`

Ovo NISU islands promene — kvarovi postoje u glavnoj grani i rušili bi svaki deploy.
Validirano: `validate-dist.cjs`: Grešaka: 0, Upozorenja: 0.

**Blokatori pronađeni tokom 2C verifikacije (takođe ispravljeni):**
1. `scripts/generate-products.cjs` — sintaksno pokvaren (nedostaje `}` koji zatvara
   `if (products && products.length > 0)` u `buildCollectionSchema`, plus višak `}` pred
   `module.exports` koji je gnezdio `generateSitemap`/`generateAll` unutar `generateCollectionPages`
   → runtime `ReferenceError: generateSitemap is not defined`).
2. `templates/product-template.html` — `{{/if}}` neposredno praćeno JSON `}` (za `{{else}}false{{/if}}}`)
   izaziva Handlebars parse error (`Expecting 'CLOSE', got 'CLOSE_UNESCAPED'`); rešeno razmakom
   `{{/if}} }` (JSON dozvoljava whitespace pre `}`).
3. `scripts/inject-islands.cjs` — u komentaru `**/*.html` je `*/` rano zatvarao block comment
   (`Unexpected token '*'`); rečeno opisno.

## 10. Verifikacija

Phase 2A/2B:
```
✅ npx eslint js/islands/index.js  — 0 grešaka (prettier čist)
✅ npm run build:prod              — vite ✓, products ✓, categories ✓, blog ✓, sitemap ✓
✅ dist validacija                 — 73 HTML fajla, 44 SEO stranice, Grešaka: 0
✅ React NIJE u initial load       — nema <script>/modulepreload za react-islands ni na jednoj strani
✅ Stari JS netaknut               — js/app.jsx virtuelno identičan bundle (app-*.js 78.6 kB gz, isti kao pre)
```

Phase 2C:
```
✅ npm run build:prod              — vite ✓, products ✓, inject-islands ✓, sitemap (57 URL) ✓, dist: 0 grešaka
✅ SSG produkti uključeni          — 13/13 generisanih produkt stranica ima hashed islands loader (inject-islands.cjs)
✅ data-props JSON                 — vto/configurator/search JSON parsira posle entity decode (getAttribute)
✅ Init JS netaknut                — index.html bez islands loadera
✅ Bridge + lib testovi            — islands-bridge + island-lib 19/19 ✅; eslint js/islands/* čist
```

Phase 2D:
```
✅ npm run build:prod              — vite ✓, products ✓, inject-islands ✓, sitemap (57 URL) ✓, dist: 0 grešaka (73 HTML / 44 SEO)
✅ Loader hash                     — index-zCu8evbH.js; 13/13 SSG produkta + orders/profile/wishlist na ispravnom hashu
✅ SSG produkti                    — reviews + cart-drawer + configurator + search + vto (5 islanda) na istim stranicama
✅ Unit testovi 2D                 — island-lib-2d (26) + islands-2d-smoke (5) = 27/27 u 2D
✅ Ukupno islands testovi          — 46/46 (island-lib + island-lib-2d + islands-bridge + islands-2d-smoke)
✅ eslint                          — js/islands/*.js, js/islands/lib/*.js + 2D testovi čisti
✅ Bundle uticaj izmeren           — ReviewsIsland 21.4/5.3 kB, ProfileForms 14.5/2.7, CartDrawer 13.2/2.8, OrdersMgmt 11.1/2.3; react-islands chunk i dalje NIGDE u HTML
```

Napomena: `npm run lint` (repo-wide eslint .) ima 17k+ pre-postojećih prettier grešaka —
to je nasleđeni tehnički dug, bez ijedne greške u `js/islands/`.