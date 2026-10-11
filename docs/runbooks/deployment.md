# Deployment Runbook

## Overview
This runbook covers the deployment process for the DALLI e-commerce platform on Netlify.

## Prerequisites
- Netlify account with admin access
- GitHub repository connected to Netlify
- Environment variables configured in Netlify dashboard
- Node.js 20+ installed locally

## Deployment Process

### Automatic Deployment (Recommended)
1. Push to `main` branch triggers production deployment
2. Push to `develop` branch triggers preview deployment
3. Pull requests create preview deployments

### Manual Deployment
```bash
# Local build
npm run build:prod

# Deploy to Netlify (preview)
netlify deploy --dir=dist

# Deploy to production
netlify deploy --prod --dir=dist
```

## Environment Variables

### Required (Production)
```
NETLIFY_AUTH_TOKEN=xxx
NETLIFY_SITE_ID=xxx
NODE_VERSION=20
NODE_OPTIONS=--max-old-space-size=4096
VITE_GA4_ID=G-XXXXXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXXXXXXX
VITE_TIKTOK_PIXEL_ID=XXXXXXXXXXXXXXX
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_API_URL=https://api.dalli.rs
```

### Build Environment
```
NODE_VERSION=20
NODE_OPTIONS=--max-old-space-size=4096
NPM_FLAGS=--legacy-peer-deps
```

## Build Process

### Local Build
```bash
npm ci
npm run build:prod
```

### Build Output
- **Publish directory**: `dist/`
- **Functions**: `netlify/functions/`
- **Assets**: `dist/assets/`
- **HTML**: `dist/*.html`

### Build Verification
```bash
# Check build size
du -sh dist/

# Validate HTML
npx html-validate dist/**/*.html

# Check bundle size
npx vite-bundle-analyzer dist
```

## Deployment Checklist

### Pre-deployment
- [ ] All tests pass (`npm run test:all`)
- [ ] Linting passes (`npm run lint && npm run stylelint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds locally (`npm run build:prod`)
- [ ] Environment variables configured
- [ ] Dependencies updated (`npm audit`)

### Post-deployment
- [ ] Site loads correctly
- [ ] SSL certificate valid
- [ ] CSP headers present
- [ ] Service worker registered
- [ ] Analytics firing
- [ ] Payment flow works
- [ ] Email notifications work

## Rollback Procedure

### Netlify Dashboard
1. Go to Netlify dashboard → Deploys
2. Find previous successful deploy
3. Click "Publish deploy"
4. Verify site works

### CLI Rollback
```bash
# List deploys
netlify deploy:list --site $NETLIFY_SITE_ID

# Rollback to specific deploy
netlify deploy:rollback --deploy-id=$DEPLOY_ID --site=$NETLIFY_SITE_ID
```

### Git-based Rollback
```bash
# Revert commit
git revert <commit-hash>
git push origin main

# Or reset and force push (last resort)
git reset --hard <commit-hash>
git push origin main --force
```

## Domain Management

### Custom Domain Setup
1. Add domain in Netlify dashboard
2. Configure DNS:
   - A record: `@` → Netlify load balancer IP
   - CNAME: `www` → `dalli.netlify.app`
3. SSL auto-provisioned (Let's Encrypt)
4. HSTS enabled

### DNS Records
```
Type    Name    Value
A       @       75.2.60.5
CNAME   www     dalli.netlify.app
TXT     @       netlify-verification=xxx
```

## SSL/TLS Configuration
- Automatic HTTPS (Let's Encrypt)
- HSTS enabled (1 year)
- TLS 1.2+ only
- OCSP Stapling enabled

## Cache Invalidation

### Manual Purge
```bash
# Netlify API
curl -X POST "https://api.netlify.com/api/v1/sites/$SITE_ID/builds" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -d '{"trigger_title": "Cache purge"}'
```

### Cache Headers
- Static assets: 1 year (immutable)
- HTML: no-cache
- API: no-cache
- Service Worker: no-cache

## Monitoring & Alerts

### Build Notifications
- Netlify build notifications → Slack/Discord
- Failed builds → PagerDuty/Slack
- Deploy success → Slack #deployments

### Uptime Monitoring
- UptimeRobot / Pingdom
- Check interval: 1 minute
- Alert channels: Slack, Email, PagerDuty

### Performance Monitoring
- Core Web Vitals → Google Search Console
- Lighthouse CI → GitHub Actions
- Real User Monitoring → Sentry/LogRocket

## Troubleshooting

### Build Failures
| Error | Cause | Solution |
|-------|-------|----------|
| Out of memory | Large bundle | Increase NODE_OPTIONS |
| Missing dependency | Missing in package.json | Add to package.json |
| TypeScript errors | Type errors | Fix types or use `// @ts-ignore` |
| Build timeout | Large bundle | Optimize chunks |

### Runtime Errors
| Issue | Solution |
|-------|----------|
| CSP violations | Update CSP headers |
| CORS errors | Check API CORS headers |
| Service worker fails | Check sw.js syntax |
| Fonts not loading | Check CORS headers |

### Performance Issues
| Symptom | Investigation |
|---------|---------------|
| Slow LCP | Check hero image, fonts |
| High CLS | Check layout shifts |
| High FID | Check main thread blocking |
| Slow TTFB | Check server/edge |

## Emergency Procedures

### Site Down
1. Check Netlify status page
2. Check DNS (dig +short dalli.rs)
3. Check SSL (SSL Labs)
4. Check origin server
5. Rollback if needed

### Data Breach
1. Rotate all secrets
2. Invalidate sessions
3. Notify users (GDPR 72h)
4. Contact authorities
5. Post-incident review

### Performance Degradation
1. Check Core Web Vitals
2. Check server response times
3. Check third-party scripts
4. Check database queries
5. Check CDN cache hit ratio

## Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| DevOps | devops@dalli.rs | PagerDuty |
| Backend | backend@dalli.rs | Slack #backend |
| Frontend | frontend@dalli.rs | Slack #frontend |
| Security | security@dalli.rs | PagerDuty Security |
| Business | business@dalli.rs | Email |

## Change Log
| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-01-15 | 1.0 | DevOps Team | Initial version |
| 2025-01-20 | 1.1 | DevOps Team | Added rollback procedures |