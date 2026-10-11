# ADR 006: CI/CD Pipeline Strategy

## Status
Accepted

## Context
Defining the CI/CD pipeline strategy for the DALLI e-commerce platform.

## Decision
Use **GitHub Actions** with **Netlify** for CI/CD pipeline.

## Pipeline Stages

### 1. Pull Request Validation
```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run stylelint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3

  test-e2e:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:prod
      - run: npm run preview &
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:4173
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: test-results/
          retention-days: 7

  test-a11y:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --project=chromium --grep @a11y
        env:
          BASE_URL: http://localhost:4173

  test-visual:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx playwright test --project=chromium --grep=visual
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:4173
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-regression
          path: test-results/
          retention-days: 7

  test-performance:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx playwright test --project=chromium --grep=performance
      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-results
          path: lighthouse-results/
          retention-days: 7

### 2. Build & Deploy Preview
```yaml
# .github/workflows/deploy-preview.yml
name: Deploy Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:prod
      - uses: netlify/actions/cli@master
        with:
          args: deploy --dir=dist --alias=pr-${{ github.event.number }}
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Production Deploy
```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:prod
      - uses: netlify/actions/cli@master
        with:
          args: deploy --dir=dist --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          text: 'Production deployment ${{ job.status }}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Rollback Strategy
```yaml
# .github/workflows/rollback.yml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      deploy_id:
        description: 'Deployment ID to rollback to'
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: netlify/actions/cli@master
        with:
          args: rollback --site-id=${{ secrets.NETLIFY_SITE_ID }} --deploy-id=${{ github.event.inputs.deploy_id }}
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

### Branch Strategy
```
main          → Production (auto-deploy)
develop       → Staging (auto-deploy)
feature/*     → Preview deployments
hotfix/*      → Hotfix branch from main
release/*     → Release preparation
```

### Branch Protection Rules
```yaml
# Branch Protection Rules (GitHub Settings)
main:
  - Require PR reviews: 2 approvals
  - Require status checks: lint-and-typecheck, test, test-e2e
  - Require linear history: true
  - Require conversation resolution: true
  - Restrict pushes: true
  - Require signed commits: true

develop:
  - Require PR reviews: 1 approval
  - Require status checks: lint-and-typecheck, test
  - Restrict pushes: true

feature/*:
  - No restrictions (but PR required for develop)

hotfix/*:
  - Require PR reviews: 1 approval
  - Require status checks: lint-and-typecheck, test

release/*:
  - Require PR reviews: 2 approvals
  - Require status checks: all
```

### Environment Variables
```yaml
# GitHub Secrets Required
secrets:
  NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
  NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
  NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
  
  # API Keys
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
  STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
  META_PIXEL_ID: ${{ secrets.META_PIXEL_ID }}
  TIKTOK_PIXEL_ID: ${{ secrets.TIKTOK_PIXEL_ID }
  
  # Database
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  REDIS_URL: ${{ secrets.REDIS_URL }}
  
  # Email
  RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
  
  # Crypto
  COINBASE_COMMERCE_API_KEY: ${{ secrets.COINBASE_COMMERCE_API_KEY }}
  COINBASE_WEBHOOK_SECRET: ${{ secrets.COINBASE_WEBHOOK_SECRET }}
  
  # Monitoring
  SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
  DATADOG_API_KEY: ${{ secrets.DATADOG_API_KEY }}
  
  # CodePush
  CODEPUSH_DEPLOYMENT_KEY: ${{ secrets.CODEPUSH_DEPLOYMENT_KEY }}
  
  # Monitoring
  DATADOG_API_KEY: ${{ secrets.DATADOG_API_KEY }}
  SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

## Deployment Environments

### Preview (PR)
- URL: `https://deploy-preview-{pr-number}--dalli.netlify.app`
- Auto-deploy on PR open/update
- Expires after 30 days of inactivity

### Staging (develop branch)
- URL: `https://staging.dalli.rs`
- Auto-deploy on `develop` branch push
- Separate database (Neon branch)
- Separate Stripe test mode

### Production
- URL: `https://dalli.rs`
- Branch: `main`
- Manual approval required for production deploy
- Blue-green deployment via Netlify

## Rollback Procedures

### Automatic Rollback
```yaml
# Netlify automatic rollback on failed health checks
# Configured in netlify.toml
[functions]
  node_bundler = "esbuild"
  
[build.environment]
  NETLIFY_NEXT_PLUGIN = "netlify-plugin-cypress"
```

### Manual Rollback
```bash
# Netlify CLI rollback
netlify rollback --site=$NETLIFY_SITE_ID

# Or via API
curl -X POST "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys/$DEPLOY_ID/restore" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN"

# Git revert
git revert <commit-hash>
git push origin main
```

### Database Rollback
```bash
# 1. Identify backup
aws s3 ls s3://dalli-backups/db/ --recursive | sort | tail -5

# 2. Restore to test DB
pg_restore -d postgresql://user:pass@host:5432/test_db \
  -Fc s3://dalli-backups/db/backup_20240115_020000.dump

# 3. Verify
psql -d test_db -c "SELECT count(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 day';"

# 4. Switch traffic (DNS/Connection string)
# Update Netlify env vars or DNS

# 5. Verify
curl -f https://api.dalli.rs/health
```

## Deployment Checklist

### Pre-deploy
- [ ] All tests pass (CI)
- [ ] E2E tests pass
- [ ] Visual regression tests pass
- [ ] Performance budgets met
- [ ] Security scan clean
- [ ] Dependencies updated
- [ ] Database migrations ready
- [ ] Feature flags configured
- [ ] Feature flags tested
- [ ] Rollback plan documented

### Post-deploy
- [ ] Health checks pass
- [ ] Smoke tests pass
- [ ] Error rate < 0.1%
- [ ] Latency p95 < 500ms
- [ ] No new Sentry errors
- [ ] Analytics firing
- [ ] Search indexing works
- [ ] Email/SMS sending works
- [ ] Payment flow works
- [ ] Admin panel accessible

### Rollback Plan
1. Netlify rollback (2 min)
2. Database rollback if needed (15 min)
3. DNS rollback (if DNS changed)
5. Verify health
5. Notify team
7. Post-mortem scheduled

---

*Last Updated: 2025-01-15*
*Version: 1.0*