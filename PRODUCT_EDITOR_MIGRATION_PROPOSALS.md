# Elite Product Editor — Prisma Migration Proposals

Dokument definiše predloge za rezervaciju/sloj pronicanja između **Elite Product Editora**
(`admin-new/js/sections/products-elite.js`) i baze (`prisma/schema.prisma`). Migracije
**ne izvršava agenat** — ovo su predlozi koje će vlasnik baze pregledati i pokrenuti.

Stanje: predlozi su usklađeni sa pažljivo strukturiranim 16-tab editorom već registrovanim
u Admin-Nev (tab → payload polje → prisma model/polje). Sva nova polja čuvaju postojeće
modele (Product, ProductColor, ProductSize, Inventory, PaymentRule, Faq, SeoEntry,
Viewer360Asset, AiTryOnJob) — ne uvode se duplikati.

---

## 1. Hronološki plan (koraci)

| # | Tip | Sadržaj | Namena |
|---|-----|---------|--------|
| M1 | Ažuriranje `Product` | novi skalari + `@@` indeksi | bazni 16 tabova |
| M2 | Novi model `ProductShipping` | shipping tab | dostava |
| M3 | Novi model `ProductLuxury` | luxury tab | ekskluzivnost/loyalty |
| M4 | Novi model `ProductCraftsmanship` | craftsmanship tab | zanatstvo |
| M5 | Novi model `ProductPayments` | crypto + pricing (payCurrencies/payMethods) | kripto/fiat |
| M6 | Novi model `ProductPublishing` | publishing + workflow | izdavaštvo |
| M7 | Novi model `ProductAnalytics` | analytics tab | KPI |
| M8 | Novi model `ProductVariant` | variants tab | veličine/boje varijante |
| M9 | Migracija podataka | backfill iz `metadata`/`images` JSON | prenos postojećih proizvoda |
| M10 | Seed/ažuriranje ekvipolentnih tabela | `PaymentRule`, `Faq`, `SeoEntry`, `Viewer360Asset` | sinhronizacija |

Preporučeni redosled: **M1 → M2/M3/M4/M5/M6/M7 (paralelno) → M9 → M8 → M10**.

---

## 2. M1 — `Product` (nova polja na glavnom modelu)

Dodaje se nakon postojećih denormalizovanih brojača (linija ~188):

```prisma
// --- Elite Editor — bazni 16 tabova (M1) ---
images Json?  // već postoji: { main, gallery[], ogImage }

vatRate           Int?    // PDV u %
marginPct         Int?    // ciljana marža u %
shipping          Json?   // shipping tab: { weightKg, dimensions{...}, freeShippingAbove,
                          //   returnsPolicy, shippingMethods[], estimatedDays }
craftsmanship     Json?   // craftsmanship tab: { materials[], origin, madeToOrderDays,
                          //   artisanNote, certificate?, careInstructions[] }
payments          Json?   // crypto tab: { currencies[], methods[] } — snapshot iz
                          //   crypto-payment-model.json
publishing        Json?   // publishing tab: { workflow, scheduledAt, publishedAt, archivedAt,
                          //   updatedAt, notes[] }
analytics         Json?   // analytics tab: { viewCount, cartAddCount, salesCount, conversionRate,
                          //   avgTimeOnPage, wishlistAdds, revenue }

@@index([publishing_status])
```

> Napomena: `publishing.workflow` ostaje primarno u JSON (startuje na `draft`), a
> storefront/statički generator čita `status` (postojeći `draft|published|archived`) koji se
> preslikava iz workflow u `cms.status` okviru editora. Oba ostaju konzistentna preko
> `toApiPayload()`.

---

## 3. M2 — `ProductShipping`

Pokriva shipping tab (pravila dostave, težina, dimenzije). `Json` na `Product.shipping` služi
kao brzi snapshot za winde; normalizovan model se čuva za izveštaje/izračun troškova:

```prisma
model ProductShipping {
  id              Int     @id @default(autoincrement())
  productId       Int     @unique
  product         Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  weightKg        Float   @default(0)
  lengthCm        Float?
  widthCm         Float?
  heightCm        Float?
  freeShippingAbove Int?   // u centima RSD
  estimatedDays   Int     @default(3)
  returnsPolicy   String? // vraćanje
  methods         String[] @default([]) // kurir, post_ex, paketomat, preuzimanje
  status          String  @default("active")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 4. M3 — `ProductLuxury`

Luxury tab — ekskluzivnost, limitacija, povezivanje sa postojećim loyalty sistemom
(`LoyaltyTier`, `LoyaltyBenefit`). Kolekcije `casual`/`elegance` su već u `Collection`:

```prisma
model ProductLuxury {
  id             Int      @id @default(autoincrement())
  productId      Int      @unique
  product        Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  limitedEdition Boolean  @default(false)
  editionNumber  Int?     // # od X
  editionTotal   Int?
  numbered       Boolean  @default(false)
  certificateUrl String?  // sertifikat autentičnosti
  embossed       Boolean  @default(false)
  giftWrap       Boolean  @default(true)
  boxes          String[]? @default([]) // luxury-box, travel-pouch
  tierRequired   String?  // loyalty tier id (member|silver|gold|black)
  showroomOnly   Boolean  @default(false)
  priorityScore  Int      @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 5. M4 — `ProductCraftsmanship`

Craftsmanship tab — materijali, poreklo, made-to-order, briga o odevnom predmetu:

```prisma
model ProductCraftsmanship {
  id            Int      @id @default(autoincrement())
  productId     Int      @unique
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  materials     String[] @default([]) // "100% organski pamuk" → radi specifikacije
  origin        String?  // "RS", "IT", "TR"
  madeToOrder   Boolean  @default(false)
  madeToOrderDays Int?
  artisanNote   String?
  certificateId String?  // veza ka MediaAsset/sertifikatu
  careInstructions String[] @default([])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

> Već postoji `Product.metadata.specifications { material, weight, care, warrantyMonths }`.
> Ova tabela je normalizovana forma koja se puni iz JSON-a (ažuriranje zapisa vraća se u
> `specifications` preko `toApiPayload()`).

---

## 6. M5 — `ProductPayments`

Crypto + fiat načini plaćanja po proizvodu. **Ne** duplira `PaymentRule` — on je globalni
sistem pravila; ovo je snapshot kurirane liste iz `data/crypto-payment-model.json`
(`SUPPORTED_CRYPTO_CURRENCIES`, `PAYMENT_METHODS`) po proizvodu:

```prisma
model ProductPayments {
  id           Int      @id @default(autoincrement())
  productId    Int      @unique
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  currencies    String[] @default([]) // BTC, ETH, USDT, USDC, PI, ...
  methods       String[] @default([]) // card, bank_transfer, cod, crypto
  cryptoEnabled Boolean  @default(false)
  fiatEnabled   Boolean  @default(true)
  source        String   @default("crypto-payment-model.json")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 7. M6 — `ProductPublishing`

Publishing tab + workflow (draft → review → approved → scheduled → published → archived).
Normalizovan zapis za istoriju prelaza (integriše se sa `AuditLog`):

```prisma
model ProductPublishing {
  id           Int      @id @default(autoincrement())
  productId    Int      @unique
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  workflow     String   @default("draft") // draft, review, approved, scheduled, published, archived
  status       String   @default("draft") // ogledalo storefront statusa
  scheduledAt  DateTime?
  publishedAt  DateTime?
  archivedAt   DateTime?
  priority     Int      @default(0)
  featured     Boolean  @default(false)
  bestseller   Boolean  @default(false)
  newArrival   Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([workflow, status])
}

model ProductWorkflowEvent {
  id          String   @id @default(cuid())
  productId   Int
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  from        String?
  to          String
  note        String?
  changedBy   String?  // admin id
  createdAt   DateTime @default(now())

  @@index([productId, createdAt])
}
```

> KPI (`viewCount`, `cartAddCount`, `salesCount`, `searchKeywords`) već postoje na
> `Product` (linije 184–187) — analytics tab ih čita direktno, ne duplira.

---

## 8. M7 — `ProductAnalytics`

Denormalizovana prodajno-analitička tabela (zarada automatski = `price - costPrice`):

```prisma
model ProductAnalytics {
  id             Int     @id @default(autoincrement())
  productId      Int     @unique
  product        Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  costPrice      Int     @default(0) // RSD centi
  viewCount      Int     @default(0)
  cartAddCount   Int     @default(0)
  salesCount     Int     @default(0)
  wishlistAdds   Int     @default(0)
  revenue        Int     @default(0)
  conversionRate Float   @default(0)
  avgTimeOnPage  Int     @default(0) // sekunde

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 9. M8 — `ProductVariant`

Variants tab — organizovane kombinacije veličina × boja. Postojeći `ProductColor` i
`ProductSize` koriste zasebne tabele; ova vežbana pivot tabela povezuje ih u varijantu sa
cifrom i stanjem. `Inventory` ostaje vezan za `ProductSize` (postojeće ponašanje).

```prisma
model ProductVariant {
  id           Int     @id @default(autoincrement())
  productId    Int
  product      Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku          String  @unique
  name         String  // "M / Navy"
  options      Json?   // { color: "Navy", size: "M" }
  priceDelta   Int     @default(0) // razlika u odnosu na baznu cenu
  stock        Int     @default(0)
  enabled      Boolean @default(true)
  sortOrder    Int     @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([productId, sku])
  @@index([productId, enabled])
}
```

---

## 10. M9 — Backfill iz postojećih proizvoda

Migracija podataka kojom se postojeći 23 proizvoda (`data/products.json`) prenose u nove
tabele **bez gubitka**:

1. `ProductShipping`: iz `metadata.specifications.weight` + `metadata.shipping*` (ako postoji).
2. `ProductLuxury`: `collection === 'elegance'` → `limitedEdition=false`, `numbered=false`.
3. `ProductCraftsmanship`: iz `metadata.specifications {material, care, warrantyMonths}`.
4. `ProductPayments`: svi proizvodi → `methods=['card','bank_transfer','cod','crypto']`,
   `currencies` iz `crypto-payment-model.json` (BTC/ETH/USDT/USDC/PI).
5. `ProductPublishing`: iz `cms.status` + `cms.publishedAt` (ili null → draft).
6. `ProductAnalytics`: iz postojećih `viewCount/cartAddCount/salesCount`.
7. `ProductVariant`: iz `colors[] × sizes[]` (generiši kombinacije).
8. `Faq`: postojeći `faq[]` → `Faq` sa `type=product`, `targetId=slug`.
9. `SeoEntry`: `seo.{title,description}` + `structuredData` → `SeoEntry(entityType='product')`.
10. `PaymentRule`: `payments.methods` po metodi → `PaymentRule(scope='product')`.

Sve akcije idempotentne (upsert po `productId` / `sku` / `entityId`).

---

## 11. M10 — Sinhronizacija sa postojećim modelima

Editor HTTP payload (`toApiPayload`) već šalje `faq`, `seo`, `structuredData`, `inventory`,
`cms`, `loyalty`, `images`. Propozicija: da `ProductService` prilikom `create/update`
zapiše i:

- `Faq` (iz `payload.faq`, `type=product`, `targetId=slug`)
- `SeoEntry` (iz `payload.seo` + `payload.structuredData`)
- `Viewer360Asset` (iz `payload.cms.product360` → `frames/spinConfig`) — **samo ako
  `product360.enabled === true`**
- `AiTryOnJob` tip `virtual_tryon` (iz `payload.cms.virtualTryOn` kada je `eligible`)
- `PaymentRule` (iz `payload.payments`, `scope=product`)

Tako Elite editor postaje jedini source of truth, a statički generator i storefront nastavljaju
da čitaju iste podatke.

---

## 12. Validacija i testiranje migracije

1. `prisma migrate diff --from-current --to-schema-datamodel prisma/schema.prisma` (dry-run).
2. Nakon migracije: `prisma generate` + `node prisma/seed.js` (backfill M9, idempotentan).
3. Regression: `npm run build:prod` (statički generator) + `npm test` (nepotpuni testovi u
   `admin-new` su objašnjeni — jsdom nema IndexedDB/IDBRequest, nisu zavisni od ove migracije).
4. Ručna provera u Admin-Nevo → **Elite Editor** → otvori proizvod → sačuvaj → proveri
   `ProductShipping/ProductLuxury/...` upise.

---

## 13. Mapiranje: 16 tabova → polja

| Tab | Payload (`toApiPayload`) | Model / polje |
|-----|--------------------------|---------------|
| general | `name, slug, sku, category, gender, collection` | `Product` (+ `ProductGender`, `Collection`, `Category`) |
| media | `images{main,gallery,ogImage}, altText` | `Product.images`, `altText` |
| pricing | `price, salePrice, currency, vatRate, marginPct` | `Product` |
| inventory | `inventory` | `Product.inventory` + `Inventory`/`ProductSize` |
| variants | `colors[], sizes[]` | `ProductColor`, `ProductSize`, `ProductVariant` |
| seo | `seo, structuredData` | `Product.metadata`, `SeoEntry` |
| content | `description, shortDescription, specifications` | `Product` + `metadata` |
| craftsmanship | `craftsmanship` | `ProductCraftsmanship` |
| view360 | `cms.product360` | `Viewer360Asset` |
| vto | `cms.virtualTryOn` | `AiTryOnJob` / `Product.metadata` |
| crypto | `payments {currencies, methods}` | `ProductPayments` + `PaymentRule` |
| shipping | `shipping` | `ProductShipping` |
| luxury | `loyalty, collection` | `ProductLuxury` + `LoyaltyTier` |
| faq | `faq[]` | `Faq` |
| analytics | `analytics` | `ProductAnalytics` (+ postojeći brojači) |
| publishing | `publishing{workflow,...}, cms.status` | `ProductPublishing`, `ProductWorkflowEvent` |