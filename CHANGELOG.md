# Changelog

All notable changes to the DALLI e-commerce platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-10-08

### Added
- API integracioni testovi (node --test, 37 provera): auth/sessions/refresh/reuse, RBAC, CSRF, checkout (COD+crypto), stock+movements+audit, payment rules, webhook (idempotencija, failed→stock restore), order lifecycle (shipped/delivered+history), refund (409 na drugi), lockout, rate limit — pokretanje: `node scripts/run-api-tests.mjs`
- Test infrastruktura: `scripts/setup-test-db.mjs` (izolovana `dalli_test` baza), `scripts/run-api-tests.mjs` (test server na :3100)
- PostgreSQL v2 schema (Prisma): 86 models / 76 tables + 3 migrations
- Migration tooling: `scripts/migrate-data.js` (idempotent, 25 checks), `scripts/seed-rbac.js`, `scripts/fix-sequences.mjs`
- REST API v1 (`/api/v1`): auth, products, collections, search, payment-methods, checkout, payment webhook
- Admin REST API (`/api/v1/admin`): dashboard, roles, users, customers, orders (+export), products (+variants/stock/movements), catalog (categories/collections), campaigns, payment-rules, payments (+refund), reviews, settings, seo, redirects, homepage-blocks, audit-logs
- RBAC: 6 roles, 27 permissions, enforcement middleware
- JWT auth: access (15m) + refresh (30d) rotation with `jti`, sessions, logout-all, reuse-detection
- Security: CSRF (Origin allowlist), global rate limit (120/min), login lockout (5/email/15min, IP throttle), audit log
- Redis layer (`server/src/lib/cache.js`): memory→ioredis, fail-open, + Socket.io Redis adapter
- Dev infra scripts: `pg-dev-server.mjs` (embedded PostgreSQL), `fake-redis-server.mjs` (RESP2)
- Socket.io server mount + `/api/socket/status`, health endpoint with db/cache/sockets
- Phase STEP 14 report: `PHASE_CORE_IMPLEMENTATION_REPORT.md`

### Changed
- `server/index.js`: ESM bootstrap replacing legacy dev mock (routing, CSRF, throttle, error handler, graceful shutdown)
- `netlify/functions/search.js`: fixed SyntaxError, ESM, PG proxy via `API_URL`
- Admin checks/migrations: `check-size.js`, `cleanup-i18n.js`, `fix-duplicated-html.js` (pre-existing)

### Fixed
- `cryptoTransaction.create` missing `data:` wrapper in `checkout.js` (crypto checkout 500 → 201)
- Refresh token `jti` collision (randomUUID) breaking refresh rotation
- Payment webhook lookup: findFirst(transactionId) / findUnique(paymentId) fallback
- `audit-logs` filter (where) now applied in `findMany`, not only count
- Netlify search: duplicate `loadIndex`, `const index` shadow, duplicate price-asc case, unused vars

---

## [Unreleased]

### Added
- Comprehensive test suite (unit, component, E2E, visual regression, a11y)
- PWA optimization with Service Worker, offline support, push notifications
- Full CI/CD pipeline with GitHub Actions
- Netlify deployment configuration
- Storybook component library
- OpenAPI 3.0 specification
- Architecture Decision Records (ADRs)
- Comprehensive documentation (README, onboarding, runbooks)

### Changed
- Migrated to Vite 5 for faster builds
- Updated all dependencies to latest versions
- Improved TypeScript configuration

### Fixed
- Fixed CSP header issues
- Fixed mobile viewport issues
- Fixed form validation edge cases

---

## [1.0.0] - 2025-01-15

### Added
- Initial release of DALLI e-commerce platform
- Complete e-commerce functionality (products, cart, checkout, orders)
- Admin panel with dashboard, products, orders, customers, analytics
- Crypto payment support (BTC, ETH, USDT, USDC) with 15% discount
- Multi-language support (Serbian Cyrillic, Latin, English)
- PWA with offline support and push notifications
- Admin panel with role-based access control
- Real-time analytics dashboard
- Enhanced ecommerce tracking (GA4, Meta Pixel, TikTok Pixel)
- Consent Mode v2 for GDPR compliance
- Schema.org structured data for all product pages
- Full SEO optimization (sitemap, hreflang, Open Graph, Twitter Cards)
- WCAG 2.1 AA accessibility compliance
- Dark/light mode with system preference detection
- PWA with offline support, push notifications, install prompt
- Responsive design (mobile-first, 320px to 1920px+)
- Component library with Storybook documentation
- Design system with OKLCH color space
- Container queries for component-level responsiveness
- CSS Cascade Layers for maintainable styles
- CSS Anchor Positioning for tooltips/popovers
- View Transitions API for smooth page transitions
- CSS Scroll-driven Animations
- CSS Color Mix for dynamic theming

### Core Features
- **Products**: Categories, variants, colors, sizes, inventory, SEO
- **Shopping Cart**: Persistent, guest + user, crypto discount
- **Checkout**: Multi-step, multiple payment methods, crypto 15% discount
- **Orders**: Status tracking, history, invoices, returns
- **User Accounts**: Profiles, addresses, wishlist, order history
- **Admin Panel**: Dashboard, products, orders, customers, analytics, settings
- **Analytics**: Real-time dashboard, funnels, cohorts, cohorts, export
- **Marketing**: Promo banners, countdown timers, newsletters, referrals
- **Social**: Instagram feed, UGC, reviews, share buttons, trust badges

### Admin Panel
- Dashboard with real-time metrics
- Product management (CRUD, bulk actions, SEO generator)
- Order management (status, fulfillment, tracking)
- Customer management (roles, permissions, loyalty)
- Analytics dashboard (real-time, funnels, cohorts)
- Promotions manager (coupons, campaigns, scheduling)
- Settings (general, payments, shipping, taxes, SEO)
- Role-based access control (6 roles)
- Activity feed with real-time updates

### Technical Stack
- **Frontend**: Vanilla JS (ES Modules), no framework
- **Styling**: CSS Custom Properties, Cascade Layers, Container Queries
- **Build**: Vite 5, ES Modules, ESBuild
- **PWA**: Workbox, Service Worker, Background Sync, Push API
- **Testing**: Vitest (unit), Playwright (E2E), axe-core (a11y)
- **CI/CD**: GitHub Actions, Netlify deploy
- **Hosting**: Netlify (Edge, Functions, CDN)
- **Database**: Netlify Functions + JSON (demo), PostgreSQL ready
- **Payments**: Stripe, Crypto (BTC/ETH/USDT/USDC), COD, Bank Transfer
- **Email**: Netlify Functions + SendGrid/Resend
- **Analytics**: GA4, Meta Pixel, TikTok Pixel, Consent Mode v2
- **Monitoring**: Sentry, Web Vitals, Custom metrics

### Design System
- **Colors**: OKLCH color space (perceptually uniform)
- **Typography**: Inter Variable, fluid clamp() scaling
- **Spacing**: Fluid clamp() system
- **Radius**: 8-step scale with component-specific tokens
- **Shadows**: 5-level elevation system
- **Typography**: Fluid clamp() scale (fs-4xs to fs-6xl)
- **Spacing**: Fluid clamp() scale (space-0 to space-24)
- **Radius**: 10-step scale with component presets
- **Shadows**: 5-level elevation + colored shadows
- **Animations**: 8 easing curves, spring physics
- **Breakpoints**: 7 named breakpoints (320px - 1920px+)
- **Container Queries**: 23 named containers
- **Z-Index**: 11-layer documented hierarchy

### Accessibility (WCAG 2.1 AA)
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

### SEO
- Semantic HTML5
- Schema.org (Product, Breadcrumb, FAQ, Organization, WebSite)
- Open Graph + Twitter Cards
- Hreflang (sr-RS, sr-Latn, sr-Cyrl, x-default)
- Canonical URLs
- Sitemap.xml (auto-generated)
- Robots.txt
- Meta tags
- JSON-LD structured data

### PWA
- Service Worker (Workbox)
- Offline-first caching
- Background Sync
- Push Notifications (VAPID)
- Install Prompt
- App Shortcuts
- Splash Screens
- Manifest v1.1
- Icon masks

### Admin Panel
- Dashboard with real-time metrics
- Product management (inline edit, bulk actions)
- Order management (status, fulfillment, invoices)
- Customer management (roles, segments, LTV)
- Analytics (real-time, funnels, cohorts, export)
- Promotions (coupons, campaigns, scheduling)
- Settings (general, payments, shipping, taxes, SEO)
- Role-based access (6 roles)
- Activity feed
- Settings panel with live preview

### Security
- CSP (strict, nonce-based)
- HSTS (preload)
- COOP/COEP
- Permissions Policy
- Trusted Types
- SRI
- CSP Reporting
- Secure Cookies
- CSRF Protection
- Rate Limiting
- Input Validation
- XSS Protection

---

## [0.9.0] - 2024-12-01

### Added
- Initial project structure
- Vite + PWA configuration
- Basic component library
- Netlify CMS integration
- Netlify Functions setup

### Changed
- Migrated from Create React App to Vite
- Migrated from CSS Modules to CSS Custom Properties

### Fixed
- Build performance issues
- Mobile viewport issues

---

## [0.8.0] - 2024-11-01

### Added
- Initial project setup
- Basic product catalog
- Simple cart functionality
- Netlify CMS integration

### Changed
- Migrated from jQuery to Vanilla JS

### Fixed
- Mobile menu issues
- Cart persistence

---

## [0.5.0] - 2024-10-01

### Added
- Initial project setup
- Basic HTML/CSS structure
- Netlify CMS configuration
- Basic product data

---

## Versioning Scheme

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes (API, architecture, data models)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes, minor improvements

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release branch: `release/vX.Y.Z`
3. Run full test suite: `npm run test:all`
4. Create PR to `main`
4. Merge to `main`
5. Tag release: `git tag vX.Y.Z`
5. GitHub Actions builds and deploys
6. Create GitHub Release with changelog

## Support Policy

| Version | Status | Support Until |
|--------|--------|---------------|
| 1.x    | Active | 2026-01-15 |
| 0.x    | Deprecated | 2025-01-15 |

## Migration Guides

### 0.x → 1.0
- Complete rewrite (Vanilla JS)
- New component architecture
- New CSS architecture
- New build system (Vite)
- New testing stack
- New deployment pipeline

---

**Full changelog**: [GitHub Releases](https://github.com/dalli/ecommerce/releases)