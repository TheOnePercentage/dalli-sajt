# Netlify CMS Setup za DALLI

## 1. Netlify Identity podešavanje

### Na Netlify Dashboard-u:
1. Idi na **Site settings > Identity**
2. Klikni **Enable Identity**
3. **Registration preferences**: "Invite only" (preporučeno)
4. **External providers**: Dodaj GitHub/GitLab/Bitbucket po želji
5. **Services > Git Gateway**: Enable Git Gateway

### Poziv korisnika:
1. Idi na **Identity > Invite users**
2. Unesi email adrese admin korisnika
3. Korisnici dobijaju email sa pozivnicom za postavljanje lozinke

## 2. Repozitorijum konfiguracija

U `admin/config.yml` zameni:
```yaml
backend:
  name: git-gateway
  branch: main
  repo: TVOJ_USERNAME/dalli-sajt  # Zameni sa svojim GitHub repo
```

## 3. Deploy na Netlify

### Opcija A: Git integracija (preporučeno)
1. Pushuj kod na GitHub/GitLab/Bitbucket
2. Na Netlify: **New site from Git**
3. Izaberi repozitorijum
3. Build command: `echo 'Static site - no build step required'`
4. Publish directory: `.`
5. Deploy

### Opcija B: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## 4. Pristup CMS-u

Po deploy-u:
- CMS: `https://tvoj-sajt.netlify.app/admin/cms/`
- Admin panel: `https://tvoj-sajt.netlify.app/admin.html`

## 5. Custom Domain (opciono)

1. Netlify: **Domain settings > Add custom domain**
2. Unesi: `dalli.rs`
3. Konfiguriši DNS na tvojem registrar-u:
   - A record: `@` → `75.2.60.5` (Netlify load balancer)
   - CNAME: `www` → `tvoj-sajt.netlify.app`
4. Netlify automatski izdaje SSL sertifikat

## 6. Environment Variables (za produkciju)

U Netlify **Site settings > Build & deploy > Environment**:
```
NODE_VERSION=18
```

## 7. Redirects za Clean URLs

Već konfigurisano u `netlify.toml`:
- `/admin/*` → `/admin.html`
- `/proizvod/*` → `/proizvod/:splat`
- `/proizvodi/*` → `/proizvodi.html`
- `/korpa/*` → `/korpa.html`
- `/placanje/*` → `/checkout.html`

## 8. CMS Polja za Proizvode

Kolekcija `products` u `admin/config.yml` uključuje:
- **Osnovno**: Naziv, SKU, Kategorija, Pol
- **Cene**: Redovna, Akcijska
- **Opisi**: Kratak (300 kar), Detaljan (Markdown)
- **Varijante**: Boje (HEX + slika), Veličine (sa dostupnošću)
- **Specifikacije**: Materijal, Gramsa, Održavanje, Garancija
- **Slike**: Glavna + Galerija (do 5)
- **SEO**: Meta title, description, canonical (auto)
- **Status**: Aktivan/Skriven/Rasprodato, Prioritet

## 9. Testiranje lokalno

```bash
# Instalacija
npm install

# Lokalni CMS proxy (za netlify-identity-widget)
npm run cms:dev

# U drugom terminalu - Live server
npm run dev
# ili
npx serve . -p 3000
```

Zatim otvori `http://localhost:3000/admin/index.html`

## 10. Troubleshooting

### CMS ne učitava?
- Proveri da li je Git Gateway enabled
- Proveri `site_url` u config.yml
- Proveri CORS na Netlify-u

### Slike se ne učitavaju u CMS-u?
- `media_folder: images` mora pokazivati na javno pristupačan folder
- `public_folder: /images` za URL putanju

### Promene se ne vide na sajtu?
- Netlify CMS commituje u repo → pokreće build → deploy
- Proveri **Deploys** tab na Netlify-u
- Build vreme: ~1-2 minuta

### Loša slug generacija za srpski?
- Koristi se `netlify-cms-slugify-transformer` sa `locale: "sr"`
- Instaliraj ako fali: `npm install netlify-cms-slugify-transformer`

## 11. Korisni linkovi

- [Netlify CMS Docs](https://www.netlifycms.org/docs/)
- [Netlify Identity](https://docs.netlify.com/visitor-access/identity/)
- [Git Gateway](https://www.netlifycms.org/docs/git-gateway-backend/)
- [Custom Domains](https://docs.netlify.com/domains-https/custom-domains/)