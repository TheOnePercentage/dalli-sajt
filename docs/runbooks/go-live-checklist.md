# DALLI E-commerce - Go-Live Checklist

## Overview
Comprehensive go-live checklist for DALLI e-commerce platform production launch.

## Timeline
- **T-7 days**: Code freeze
- **T-3 days**: Final QA, performance testing
- **T-1 day**: Final stakeholder review, final deploy to staging
- **T-0 (Launch Day)**: Production deployment
- **T+1 day**: Post-launch monitoring
- **T+7 days**: Post-launch review

---

## Pre-Launch Checklist (T-7 to T-1)

### Infrastructure
- [ ] DNS configured (A, CNAME, MX, TXT, CAA)
- [ ] SSL certificates valid (SSL Labs A+)
- [ ] HSTS preload submitted & confirmed
- [ ] CSP in enforce mode (not report-only)
- [ ] HSTS preload confirmed
- [ ] DNSSEC enabled
- [ ] CAA records configured
- [ ] CDN configured (Cloudflare)
- [ ] WAF rules enabled
- [ ] Bot management configured
- [ ] Rate limiting configured
- [ ] DDoS protection enabled
- [ ] CDN configured (Cloudflare)
- [ ] WAF rules active
- [ ] Bot management configured
- [ ] Rate limiting configured
- [ ] DDoS protection enabled

### Application
- [ ] All tests passing (unit, integration, e2e)
- [ ] Lighthouse score > 90 (all categories)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Security headers validated
- [ ] CSP in enforce mode (not report-only)
- [ ] HSTS preload confirmed
- [ ] Error pages (404, 500, 503)
- [ ] Maintenance mode page
- [ ] Favicon & icons (all sizes)
- [ ] PWA manifest valid
- [ ] Service worker registered
- [ ] Offline fallback page

### Database
- [ ] Migrations run
- [ ] Indexes optimized
- [ ] Connection pooling configured
- [ ] Read replicas configured
- [ ] Backup verified (last 24h)
- [ ] Point-in-time recovery tested
- [ ] Connection pooling configured
- [ ] Query performance reviewed
- [ ] Slow query log enabled

### Caching
- [ ] CDN configured (Cloudflare)
- [ ] Cache headers set correctly
- [ ] Purge API tested
- [ ] Cache warming script ready
- [ ] Stale-while-revalidate configured
- [ ] Cache-Control headers correct
- [ ] ETags/Last-Modified headers

### CDN
- [ ] Cloudflare configured
- [ ] Cache rules set
- [ ] Page Rules configured
- [ ] WAF rules active
- [ ] Bot Management enabled
- [ ] Rate limiting configured
- [ ] DDoS protection enabled

### DNS
- [ ] A record: @ → Load Balancer IP
- [ ] CNAME: www → domain
- [ ] CNAME: api → Netlify
- [ ] CNAME: cdn → Cloudflare
- [ ] TXT: SPF, DKIM, DMARC
- [ ] CAA: Let's Encrypt, DigiCert
- [ ] DNSSEC: Enabled

### Email
- [ ] SPF: v=spf1 include:_spf.resend.com ~all
- [ ] DKIM: Configured (Resend)
- [ ] DMARC: p=quarantine; rua=mailto:dmarc@dalli.rs
- [ ] BIMI: Configured (SVG logo)
- [ ] MTA-STS: Enabled
- [ ] TLS-RPT: Enabled

## Launch Day Checklist (T-0)

### Pre-Deploy (T-2 hours)
- [ ] Code freeze confirmed
- [ ] Final PR merged to main
- [ ] CI/CD pipeline green
- [ ] Staging smoke tests passed
- [ ] Stakeholder approval obtained
- [ ] Rollback plan reviewed
- [ ] Rollback tested (staging)
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] On-call engineer assigned
- [ ] Support team briefed
- [ ] Status page updated

### Deploy (T-0)
- [ ] Merge to main branch
- [ ] CI/CD pipeline triggered
- [ ] Build successful
- [ ] Deploy to production
- [ ] DNS propagation verified
- [ ] SSL certificate valid
- [ ] Health checks passing
- [ ] Smoke tests passing
- [ ] Critical user flows tested
- [ ] Error rate < 0.1%
- [ ] Latency p95 < 500ms
- [ ] No new Sentry errors
- [ ] Analytics firing
- [ ] Email/SMS sending works
- [ ] Payment flow works
- [ ] Admin panel accessible

### Post-Deploy (T+0 to T+1 hour)
- [ ] Homepage loads < 2s
- [ ] Product pages load
- [ ] Cart add/remove works
- [ ] Checkout flow works
- [ ] Payment flow works (card, crypto, COD)
- [ ] Order confirmation email sent
- [ ] Order confirmation SMS sent
- [ ] Admin panel accessible
- [ ] Orders visible in admin
- [ ] Inventory updates work
- [ ] Email sending works
- [ ] SMS sending works
- [ ] Push notifications work
- [ ] PWA install prompt works
- [ ] Service worker updates
- [ ] Offline mode works
- [ ] PWA install prompt works

### Post-Deploy (T+0 to T+1 hour)
- [ ] Homepage loads < 2s
- [ ] Product pages load
- [ ] Cart add/remove works
- [ ] Checkout flow works
- [ ] Payment flow works (card, crypto, COD)
- [ ] Order confirmation email sent
- [ ] Order confirmation SMS sent
- [ ] Admin panel accessible
- [ ] Orders visible in admin
- [ ] Inventory updates work
- [ ] Email sending works
- [ ] SMS sending works
- [ ] Push notifications work
- [ ] PWA install prompt works
- [ ] Service worker updates
- [ ] Offline mode works
- [ ] PWA install prompt works

### Monitoring (T+0 to T+24 hours)
- [ ] Homepage loads < 2s
- [ ] Product pages load
- [ ] Cart add/remove works
- [ ] Checkout flow works
- [ ] Payment flow works
- [ ] Order confirmation email
- [ ] Order confirmation SMS
- [ ] Admin panel accessible
- [ ] Orders visible in admin
- [ ] Inventory updates work
- [ ] Email sending works
- [ ] SMS sending works
- [ ] Push notifications work
- [ ] PWA install prompt works
- [ ] Service worker updates
- [ ] Offline mode works
- [ ] PWA install prompt works

### Monitoring (T+0 to T+24 hours)
- [ ] Homepage loads < 2s
- [ ] Product pages load
- [ ] Cart add/remove works
- [ ] Checkout flow works
- [ ] Payment flow works
- [ ] Order confirmation email
- [ ] Order confirmation SMS
- [ ] Admin panel accessible
- [ ] Orders visible in admin
- [ ] Inventory updates work
- [ ] Email sending works
- [ ] SMS sending works
- [ ] Push notifications work
- [ ] PWA install prompt works
- [ ] Service worker updates
- [ ] Offline mode works
- [ ] PWA install prompt works

### Monitoring (T+0 to T+24 hours)
- [ ] Homepage loads < 2s
- [ ] Product pages load
- [ ] Cart add/remove works
- [ ] Checkout flow works
- [ ] Payment flow works
- [ ] Order confirmation email
- [ ] Order confirmation SMS
- [ ] Admin panel accessible
- [ ] Orders visible in admin
- [ ] Inventory updates work
- [ ] Email sending works
- [ ] SMS sending works
- [ ] Push notifications work
- [ ] PWA install prompt works
- [ ] Service worker updates
- [ ] Offline mode works
- [ ] PWA install prompt works

### Monitoring (T+0 to T+24 hours)
- [ ] Homepage loads < 2s
- [ ] Product pages load
- [ ] Cart add/remove works
- [ ] Checkout flow works
- [ ] Payment flow works
- [ ] Order confirmation email
- [ ] Order confirmation SMS
- [ ] Admin panel accessible
- [ ] Orders visible in admin
- [ ] Inventory updates work
- [ ] Email sending works
- [ ] SMS sending works
- [ ] Push notifications work
- [ ] PWA install prompt works
- [ ] Service worker updates
- [ ] Offline mode works
- [ ] PWA install prompt works

### Monitoring (T+0 to T+24 hours)
- [ ] Homepage loads < 2s
- [ ] Product pages load
- [ ] Cart add/remove works
- [ ] Checkout flow works
- [ ] Payment flow works
- [ ] Order confirmation email
- [ ] Order confirmation SMS
- [ ] Admin panel accessible
- [ ] Orders visible in admin
- [ ] Inventory updates work
- [ ] Email sending works
- [ ] SMS sending works
- [ ] Push notifications work
- [ ] PWA install prompt works
- [ ] Service worker updates
- [ ] Offline mode works
- [ ] PWA install prompt works

### Monitoring (T+0 to T+24 hours)
- [ ] Sentry: No new errors
- [ ] Uptime: 100%
- [ ] Apdex > 0.95
- [ ] No alert firing
- [ ] Error rate < 0.1%
- [ ] Latency p95 < 500ms

### T+1 Day
- [ ] Daily active users > baseline
- [ ] Conversion rate > baseline
- [ ] Average order value > baseline
- [ ] No critical bugs
- [ ] Support tickets < threshold
- [ ] Refund rate < 2%
- [ ] Cart abandonment < baseline

### T+7 Days
- [ ] Post-launch review meeting
- [ ] Metrics review
- [ ] Bug triage
- [ ] Performance review
- [ ] Security review
- [ ] Cost review
- [ ] Capacity planning
- [ ] Retrospective scheduled

## Stakeholder Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tech Lead | | | |
| Engineering Lead | | | |
| Product Owner | | | |
| Security Officer | | |
| Compliance Officer | | |
| CEO/CTO | | | |

## Go/No-Go Decision

| Criteria | Status |
|----------|--------|
| All smoke tests pass | ☐ |
| Performance budgets met | ☐ |
| No critical bugs | ☐ |
| Security scan clean | ☐ |
| Accessibility audit passed | ☐ |
| Rollback plan tested | ☐ |
| Runbooks updated | ☐ |
| Team notified | ☐ |
| Support ready | ☐ |
| Monitoring active | ☐ |
| On-call scheduled | ☐ |

**Decision**: ☐ GO / ☐ NO-GO

**Decision Maker**: _________________ **Date**: ___________

---

*Checklist Version: 1.0 | Last Updated: 2025-01-15*