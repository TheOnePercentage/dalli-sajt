# STARTUP COMMANDS — DALLI E-commerce

Brzí referentni list komandi (faza: LOCAL RUNTIME VERIFICATION).

## Install / Setup

| Komanda | Šta radi |
|---|---|
| `npm install` | root deps (frontend) |
| `npm install --prefix server` | server deps |
| `cp .env.example .env` | kopira env template |
| `cd server && npx prisma migrate deploy --env-file-if-exists ../.env` | migracije |
| `cd server && node --env-file=../.env ../scripts/migrate-data.js --clean` | osnovni podaci |
| `cd server && node --env-file=../.env ../scripts/seed-rbac.js` | RBAC role/permissions |

## Startup

| Komanda | Pozicija | URL | Opis |
|---|---|---|---|
| `npm run dev` | root | http://localhost:8000 | Vite dev (frontend, hmr off, auto-open browser) |
| `npm run dev` | `server/` | http://localhost:3001 | API backend (`node --watch`, env iz `../.env`) |
| `npm run preview` | root | http://localhost:8080 | `vite preview` — servira `dist/` (static, bez API proxy) |
| `docker compose up --build` | root | http://localhost (nginx) | Full prod-preview: nginx + API:3001 + Postgres + Redis + Meili |
| `npx netlify functions:serve` | root | http://localhost:9999 | Netlify Functions lokalno |
| `npx netlify dev` | root | — | Potpuni Netlify lokal runtime (dist + functions) |
| `npm run test:api` | `server/` | — | API integracioni testovi (37) |

## Build

| Komanda | Rezultat |
|---|---|
| `npm run build` | `validate-html` + `vite build` → `dist/` |
| `npm run build:prod` | Pun pipeline → `dist/` (SEO stranice, blog, sitemap, dist-validacija) |
| `npm run build:ui` | vite build only |

## Verifikacija

```bash
curl http://localhost:3001/api/v1/health                    # API zdrav
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/            # frontend dev → 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/majice.html # preview dist → 200
curl -s http://localhost:9999/.netlify/functions/search      # Netlify funkcija
curl http://localhost/health                                  # nginx health (docker)
```

## Napomene iz audita

- Vite dev nema `/api` proxy — API pozivi iz browsera rade samo preko nginx-a
  (docker) ili direktno na :3001.
- `netlify.toml` sa `[edge_functions]` (nevalidan blok) blokira `netlify dev`/`deploy`
  do ispravke.
- Generisane SEO stranice u source root-u daju 500 u vite dev (parse bug);
  dist kopije su ispravne.
- Preporučujemo Node 20 (netlify.toml `NODE_VERSION=20`; v24 je nestabilan sa netlify-cli).