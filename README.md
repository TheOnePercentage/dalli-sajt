# DALLI E-commerce Platform

Premium Serbian e-commerce platform for organic clothing with crypto payment support.

## 🚀 Features

### Core E-commerce
- **Product Catalog** - Categories, variants, colors, sizes, inventory
- **Shopping Cart** - Persistent, crypto discount (15%), guest checkout
- **Secure Checkout** - Multiple payment methods (card, cash on delivery, crypto)
- **User Accounts** - Profiles, orders, wishlists, address book
- **Admin Panel** - Products, orders, customers, analytics, promotions

### Technical Excellence
- **Mobile-First** - 44px/48px/56px touch targets, responsive design
- **WCAG 2.1 AA** - Full accessibility, skip links, focus management, ARIA
- **SEO Optimized** - Schema.org Product, BreadcrumbList, FAQPage, hreflang
- **PWA Ready** - Service Worker, offline support, push notifications, install prompt
- **Real-time** - WebSocket/SSE/polling for live updates

### Admin Features
- **Dashboard** - Real-time metrics, charts, KPIs
- **Products** - Inline editing, bulk actions, SEO generator
- **Orders** - Status tracking, fulfillment, returns
- **Customers** - CRM, segmentation, loyalty tiers
- **Analytics** - Funnels, cohorts, funnels, real-time
- **Marketing** - Promotions, banners, email campaigns, referrals

### Marketing & Social
- Instagram feed embed
- UGC cards with likes/shares
- Referral program (15% crypto discount)
- Promo banners (scheduled, geo-targeted)
- Countdown timers
- Newsletter (exit intent, multi-step)
- Share buttons (9 platforms + native)
- Review cards (photos, verified badges)
- Trust badges (animated, certified)

### Technical Stack
- **Vanilla JS** - ES modules, no framework overhead
- **CSS** - OKLCH colors, cascade layers, container queries
- **PWA** - Service Worker, offline-first, push notifications
- **Testing** - Vitest (unit), Playwright (E2E), axe-core (a11y), visual regression
- **CI/CD** - GitHub Actions, Netlify deploy, preview deployments

## 📦 Project Structure

```
moonlight-sajt/
├── index.html                 # Main entry point (SEO optimized)
├── admin-login.html           # Admin login page
├── admin-new/                 # Modern admin panel
│   ├── index.html
│   ├── js/
│   │   ├── app.js             # Main app entry
│   │   ├── components/ui/     # Reusable UI components
│   │   └── components/ui/*.js # Individual components
│   └── css/                   # Component styles
├── js/
│   ├── app.js                 # Main app logic
│   └── components/            # Public components
├── css/
│   ├── styles.css             # Main stylesheet
│   └── critical.css           # Critical CSS (inlined)
├── admin/                     # Netlify CMS config
├── netlify/
│   ├── functions/             # Serverless functions
│   └── toml                   # Netlify config
├── scripts/                   # Build scripts
├── public/                    # Static assets
├── src/
│   ├── tests/                 # Test files
│   └── stories/               # Storybook stories
├── .github/workflows/         # CI/CD pipelines
├── .storybook/                # Storybook config
├── vite.config.ts             # Vite + PWA config
├── vitest.config.ts           # Vitest config
├── playwright.config.ts       # Playwright config
├── .eslintrc.cjs              # ESLint config
├── .stylelintrc.cjs           # Stylelint config
├── .prettierrc                # Prettier config
├── .husky/                    # Git hooks
├── .lintstagedrc              # Lint-staged config
├── vite.config.ts             # Vite + PWA config
├── vitest.config.ts           # Vitest config
├── playwright.config.ts       # Playwright config
├── netlify.toml               # Netlify config
├── package.json
└── README.md
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build:prod

# Preview production build
npm run preview

# Run tests
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:a11y     # Accessibility tests
npm run test:visual   # Visual regression
npm run test:perf     # Performance tests
npm run test:all      # All tests

# Linting & formatting
npm run lint          # ESLint
npm run stylelint     # Stylelint
npm run typecheck     # TypeScript check
npm run format        # Prettier

# Build & deploy
npm run build         # Production build
npm run preview       # Preview build
npm run deploy        # Deploy to Netlify
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Accessibility
npm run test:a11y

# Visual regression
npm run test:visual

# Performance
npm run test:perf

# All tests
npm run test:all
```

## 🔧 Configuration

### Environment Variables
```env
# .env
VITE_GA4_ID=G-XXXXXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXXXXXXX
VITE_TIKTOK_PIXEL_ID=XXXXXXXXXXXXXXX
VITE_SENTRY_DSN=https://xxxx@sentry.io/xxx
VITE_API_URL=https://api.dalli.rs
```

### Netlify Environment Variables
```bash
NETLIFY_AUTH_TOKEN=xxx
NETLIFY_SITE_ID=xxx
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
META_PIXEL_ID=XXXXXXXXXXXXXXX
TIKTOK_PIXEL_ID=XXXXXXXXXXXXXXX
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## 📱 PWA Features

- **Offline Support** - Service Worker caches all assets
- **Install Prompt** - Custom install banner
- **Push Notifications** - Order updates, promos
- **Background Sync** - Offline cart sync
- **App Shortcuts** - Direct links to categories
- **Splash Screens** - All device sizes

## ♿ Accessibility (WCAG 2.1 AA)

- Semantic HTML5
- Skip links
- Focus management
- ARIA labels/roles
- Color contrast (4.5:1)
- Keyboard navigation
- Screen reader support
- Reduced motion
- High contrast mode
- Focus visible

## 🌐 SEO Features

- Semantic HTML5
- Schema.org (Product, Breadcrumb, FAQ, Organization)
- Open Graph / Twitter Cards
- Hreflang (sr-RS, sr-Latn, sr-Cyrl, x-default)
- Canonical URLs
- Sitemap.xml (auto-generated)
- Robots.txt
- Meta tags
- JSON-LD structured data

## 🔒 Security

- CSP (strict)
- HSTS
- Permissions Policy
- CSP Reporting
- SRI (Subresource Integrity)
- Trusted Types
- XSS Protection
- CSRF Protection
- Secure Cookies
- Content Security Policy

## 📊 Analytics & Tracking

- **GA4** - Enhanced Ecommerce
- **Meta Pixel** - Events, conversions
- **TikTok Pixel** - Events
- **Consent Mode v2** - GDPR compliant
- **Custom Events** - DataLayer, custom events
- **Enhanced Ecommerce** - Full funnel tracking

## 🌐 Internationalization

- Serbian (Cyrillic/Latin)
- English
- Hreflang support
- RTL ready
- Currency formatting (RSD)
- Date/number localization

## 💳 Payments

- **Card** - Stripe/Stripe Elements
- **Cash on Delivery** - COD
- **Crypto** - BTC, ETH, USDT, USDC (15% discount)
- **Bank Transfer**

## 📦 Deployment

### Netlify (Recommended)
```bash
# Connect to Netlify
# Build command: npm run build:prod
# Publish directory: dist
# Functions: netlify/functions
```

### Environment Variables (Netlify)
```
NODE_VERSION=20
NODE_OPTIONS=--max-old-space-size=4096
```

### Custom Domain
1. Add domain in Netlify
2. Configure DNS (A + CNAME)
3. SSL auto-provisioned (Let's Encrypt)
4. HSTS enabled

## 📁 Key Files

| File | Description |
|------|-------------|
| `index.html` | Main entry point |
| `vite.config.ts` | Vite + PWA config |
| `vitest.config.ts` | Vitest config |
| `playwright.config.ts` | Playwright E2E config |
| `.eslintrc.cjs` | ESLint config |
| `.stylelintrc.cjs` | Stylelint config |
| `.prettierrc` | Prettier config |
| `.github/workflows/ci.yml` | CI/CD pipeline |
| `netlify.toml` | Netlify config |
| `public/_headers` | Security headers |
| `public/_redirects` | Redirects |

## 📈 Performance Targets

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| TTFB | < 800ms |
| FCP | < 1.8s |
| TBT | < 200ms |

## 🧪 Testing Coverage

| Type | Target |
|------|--------|
| Unit | > 80% |
| Component | > 70% |
| E2E | Critical paths |
| Visual | Key components |
| A11y | WCAG 2.1 AA |
| Performance | Lighthouse > 90 |

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit PR

## 📞 Support

- Email: office@dalli.rs
- Phone: +381 11 123 4567
- Discord: [DALLI Community](https://discord.gg/dalli)

---

**Built with ❤️ in Serbia** 🇷🇸