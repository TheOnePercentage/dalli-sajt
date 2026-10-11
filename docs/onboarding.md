# DALLI E-commerce - Developer Onboarding Guide

## Welcome! 🎉

Welcome to the DALLI team! This guide will help you get up to speed with our e-commerce platform.

## 📋 Table of Contents
1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Architecture](#architecture)
5. [Troubleshooting](#troubleshooting)
6. [Resources](#resources)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Git 2.40+
- VS Code (recommended) with extensions:
  - ESLint
  - Stylelint
  - Prettier
  - Vitest
  - Playwright

### First Day Setup

```bash
# 1. Clone repository
git clone https://github.com/dalli/ecommerce.git
cd ecommerce

# 2. Install dependencies
npm ci

# 3. Install Playwright browsers
npx playwright install --with-deps chromium

# 4. Start development server
npm run dev

# 4. Open http://localhost:3000
```

### Verify Setup
```bash
# Run tests
npm run test

# Run linter
npm run lint

# Type check
npm run typecheck

# Build
npm run build
```

## 📁 Project Structure

```
moonlight-sajt/
├── public/                 # Static assets (served as-is)
│   ├── images/             # Optimized images
│   ├── icons/              # PWA icons
│   ├── fonts/              # Web fonts
│   ├── sw.js               # Service worker
│   ├── manifest.json       # PWA manifest
│   ├── _headers            # Netlify headers
│   └── _redirects          # Netlify redirects
├── admin/                  # Netlify CMS config
├── admin-new/              # Modern admin panel (React-like)
│   ├── index.html
│   ├── js/
│   │   ├── app.js          # Main app entry
│   │   └── components/ui/  # UI components
│   └── css/
├── src/
│   ├── tests/              # Test files
│   │   ├── unit/          # Unit tests
│   │   ├── component/     # Component tests
│   │   ├── e2e/           # Playwright tests
│   │   ├── a11y/          # Accessibility tests
│   │   └── visual/        # Visual regression
│   └── stories/           # Storybook stories
├── scripts/                # Build/utility scripts
├── data/                   # JSON data files
├── css/                    # Global styles
├── js/                     # Legacy JS
├── netlify/
│   └── functions/         # Netlify Functions
├── netlify.toml            # Netlify config
├── vite.config.ts          # Vite + PWA config
├── vitest.config.ts        # Vitest config
├── playwright.config.ts    # Playwright config
├── netlify.toml            # Netlify deployment config
└── package.json
```

## 🔧 Development Workflow

### Branching Strategy
```
main          # Production (protected)
├── develop   # Integration branch
├── feature/* # Feature branches
├── fix/*     # Bug fixes
├── chore/*   # Maintenance
└── hotfix/*  # Urgent production fixes
```

### Commit Convention
```
type(scope): description

Types:
  feat     - New feature
  fix      - Bug fix
  docs     - Documentation
  style    - Formatting
  refactor - Code restructuring
  test     - Tests
  chore    - Maintenance
  perf     - Performance
  ci       - CI/CD

Examples:
  feat(cart): add crypto payment option
  fix(auth): fix login redirect loop
  docs(readme): update installation steps
```

### Pull Request Process
1. Create feature branch from `develop`
2. Make changes with tests
3. Run `npm run test:all`
4. Create PR to `develop`
5. Code review (1 approval required)
5. Squash merge to `develop`
6. Release to `main` via release PR

### Code Review Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] TypeScript compiles
- [ ] Accessibility verified
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] SEO meta tags present
- [ ] No console errors
- [ ] Performance budget met

## 🎨 Code Standards

### JavaScript (ES Modules)
```javascript
// Use ES modules
import { createSignal } from './utils/signals.js';

// Named exports
export const createSignal = (initial) => { ... };

// Default export for single exports
export default class Component { }

// JSDoc for public APIs
/**
 * Creates a reactive signal
 * @param {*} initial - Initial value
 * @returns {Object} Signal object
 */
export const createSignal = (initial) => { ... }
```

### CSS (CSS Custom Properties)
```css
/* Use design tokens */
.component {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  color: var(--color-text);
  background: var(--color-surface);
}

/* Mobile-first */
@media (min-width: 768px) {
  .component { padding: var(--space-6); }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .component { --color-bg: var(--color-bg-dark); }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

### HTML (Semantic + Accessible)
```html
<article class="product-card" itemscope itemtype="https://schema.org/Product">
  <img src="..." alt="Product name" loading="lazy" width="400" height="400">
  <h3 itemprop="name">Product Name</h3>
  <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <span itemprop="price" content="1290">1.290 RSD</span>
    <meta itemprop="priceCurrency" content="RSD">
    <link itemprop="availability" href="https://schema.org/InStock">
  </div>
</article>
```

### Git Hooks (Husky)
```bash
# Pre-commit: lint-staged
# Pre-push: npm run test:all
```

## 🧪 Testing

### Unit Tests (Vitest)
```bash
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:ui       # UI
npm run test:coverage # Coverage report
```

```javascript
// Example test
import { describe, it, expect, vi } from 'vitest';
import { createSignal } from '../src/utils/signals';

describe('createSignal', () => {
  it('should create signal with initial value', () => {
    const signal = createSignal(42);
    expect(signal.get()).toBe(42);
  });
});
```

### E2E Tests (Playwright)
```bash
npm run test:e2e        # Headless
npm run test:e2e:ui     # UI mode
npm run test:e2e:headed # Headed
```

```typescript
// Example test
test('should add product to cart', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-action="quick-add"]');
  await expect(page.locator('#cartCount')).toHaveText('1');
});
```

### Accessibility Tests
```bash
npm run test:a11y
```

```typescript
// Example a11y test
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should have no a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### Visual Regression
```bash
npm run test:visual
```

### Performance Tests
```bash
npm run test:perf
```

## 🏗️ Architecture

### Component Architecture
```
Component
├── State (Signals)
├── Template (Template literals)
├── Styles (CSS Custom Properties)
├── Events (Event delegation)
└── Lifecycle (init, destroy)
```

### State Management (Signals)
```javascript
const createSignal = (initial) => {
  let value = initial;
  const subscribers = new Set();
  return {
    get: () => value,
    set: (fn) => { value = typeof fn === 'function' ? fn(value) : fn; notify(); },
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); }
  };
}
```

### Component Pattern
```javascript
export class Component {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...defaults, ...options };
    this.state = createSignal({});
    this.init();
  }
  
  init() {
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.element.innerHTML = this.template();
    this.bindElements();
  }
  
  destroy() { /* cleanup */ }
}
```

### CSS Architecture (Layers)
```css
@layer reset, tokens, base, layout, components, utilities, overrides;

@layer tokens {
  :root { --color-primary: oklch(0.18 0.02 260); }
}

@layer components {
  .btn { /* ... */ }
}
```

## 🚀 Deployment

### Environments
| Branch | Environment | URL |
|--------|-------------|-----|
| main | Production | https://dalli.rs |
| develop | Staging | https://develop.dalli.rs |
| PR #xxx | Preview | https://deploy-preview-xxx.dalli.rs |

### Deploy Commands
```bash
# Preview deploy (auto on PR)
git push origin feature/xyz

# Production deploy
git push origin main

# Manual
npm run build:prod
netlify deploy --prod --dir=dist
```

### Environment Variables
```env
# Production
VITE_GA4_ID=G-XXXXXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXXXXXXX
VITE_API_URL=https://api.dalli.rs
```

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `npm ci` fails | `rm -rf node_modules package-lock.json && npm ci` |
| Port in use | `lsof -ti:3000 | xargs kill -9` |
| Build fails | `rm -rf dist node_modules && npm ci && npm run build` |
| Tests flaky | Check async/await, increase timeouts |
| Styles not updating | Hard refresh (Cmd+Shift+R) |
| CSP errors | Check `Content-Security-Policy` header |

### Debug Commands
```bash
# Clear all caches
rm -rf node_modules dist .vite .vitest coverage playwright-report test-results
npm ci

# Debug build
npm run build -- --debug

# Debug test
npm run test -- --reporter=verbose

# Inspect bundle
npx vite-bundle-analyzer dist
```

## 📚 Resources

### Documentation
- [Architecture Decision Records](./docs/adr/)
- [Component Library](http://localhost:6006) (Storybook)
- [API Documentation](https://api.dalli.rs/docs)
- [Deployment Runbook](./docs/runbooks/deployment.md)

### External Links
- [Netlify Dashboard](https://app.netlify.com/sites/dalli)
- [Sentry](https://sentry.io/dalli)
- [GA4](https://analytics.google.com)
- [Meta Events Manager](https://events.facebook.com)
- [TikTok Ads Manager](https://ads.tiktok.com)

### Key Contacts
| Role | Contact | Channel |
|------|---------|---------|
| Tech Lead | lead@dalli.rs | #tech-lead |
| Backend | backend@dalli.rs | #backend |
| Frontend | frontend@dalli.rs | #frontend |
| DevOps | devops@dalli.rs | #devops |
| Design | design@dalli.rs | #design |
| Product | product@dalli.rs | #product |

## 📋 First Week Checklist

- [ ] Clone repo & install deps
- [ ] Run dev server
- [ ] Run all tests
- [ ] Review architecture docs
- [ ] Read ADRs
- [ ] Explore Storybook
- [ ] Run E2E tests
- [ ] Deploy preview
- [ ] Review PR process
- [ ] Pair program with buddy
- [ ] First commit
- [ ] First PR

---

**Welcome to DALLI! 🚀**

*Built with ❤️ in Serbia* 🇷🇸