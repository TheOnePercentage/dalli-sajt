# Netlify CMS Deployment Checklist

## Code Changes (DONE ✅)
- [x] Netlify CMS entry: `public/admin/index.html`
- [x] 4 custom widgets: `public/admin/widgets/*.js`
- [x] CMS config: `admin/config.yml` with 4 widget declarations
- [x] Vite public dir: `vite.config.ts` → `publicDir: 'public'`
- [x] Netlify redirects: `netlify.toml` → `/admin/cms/*` served
- [x] Media folder: `images/` created

## Deployment Steps (REQUIRED)

### 1. GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
**Update:** `admin/config.yml` → replace `YOUR_GITHUB_USERNAME/YOUR_REPO_NAME`

### 2. Netlify Dashboard
1. **New site from Git** → Connect your GitHub repo
2. **Build settings:**
   - Build command: `npm run build:prod`
   - Publish directory: `dist`
3. **Identity:** Enable → Settings → Identity → Enable Identity
4. **Git Gateway:** Settings → Identity → Git Gateway → Enable
5. **Environment variables** (if needed):
   - `VITE_API_URL` = your API URL
   - Any secret keys for social media connectors

### 4. Test
- Visit: `https://your-site.netlify.app/admin/cms/`
- Login with Netlify Identity
- Verify 4 custom widgets work in Products collection

## Custom Widgets Available
| Widget | Features |
|--------|----------|
| `image-upload` | Drag/drop, focal point, max 8 gallery, HEIC/AVIF |
| `alt-generator` | Auto alt from name/desc/color/category |
| `seo-generator` | Auto meta/JSON-LD, focus keyword, SEO score 0-100 |
| `bulk-seo-actions` | Multi-select, batch generate, preview table |

## Collections Configured
- **Products** - Full CMS with custom widgets
- **Employees** - Admin management
- **Pages** - Static pages
- **Link Auditor** - Custom dashboard
- **Redirect Manager** - 301/302 management
- **Currency Manager** - Exchange rates
- **Language Manager** - Multi-language
- **Promotions Manager** - Coupons/campaigns
- **Markets & Regions** - Expansion control