# Post-Launch Operations Runbook

## Overview
This runbook covers the first 30 days post-launch operations for the DALLI e-commerce platform.

## On-Call Rotation

### Schedule
| Week | Primary | Secondary | Escalation |
|-------|---------|-----------|------------|
| Week 1 | Milan P. | Ana M. | Jovan P. |
| Week 2 | Nikola J. | Dragan S. | Milan P. |
| Week 3 | Ana M. | Jovan P. | Nikola J. |
| Week 4 | Dragan S. | Milan P. | Ana M. |

### Schedule
- **Primary**: Mon-Fri 9:00-18:00, Sat-Sun 10:00-16:00
- **Secondary**: Backup during primary hours
- **Escalation**: 24/7 for SEV-1

### Escalation Matrix
| Severity | Response | Escalation |
|----------|-----------|------------|
| SEV-1 (Site down, payments down) | 5 min | Primary → Eng Lead → CTO |
| SEV-2 (Major feature down) | 15 min | Primary → Eng Lead |
| SEV-3 (Minor) | 1 hour | Primary → Team Lead |
| SEV-4 (Low) | 4 hours | Next business day |

## Daily Operations

### Morning Checklist (09:00)
- [ ] Check Sentry for new errors
- [ ] Check Datadog/CloudWatch dashboards
- [ ] Review error rates (last 24h)
- [ ] Check Core Web Vitals
- [ ] Review order volume vs baseline
- [ ] Check error rates by endpoint
- [ ] Verify payment processing
- [ ] Check email/SMS delivery
- [ ] Review failed orders
- [ ] Check inventory sync
- [ ] Verify CDN cache hit rate
- [ ] Check SSL certificate expiry
- [ ] Review error budget

### Mid-Day Check (13:00)
- [ ] Error rate < 0.1%
- [ ] Latency p95 < 500ms
- [ ] Conversion rate normal
- [ ] Payment success rate > 98%
- [ ] Email/SMS delivery > 98%
- [ ] No critical alerts firing

### Evening Wrap-up (17:00)
- [ ] Error rate review
- [ ] Performance summary
- [ ] Incident count
- [ ] Deployments today
- [ ] Tomorrow's deployments
- [ ] Handoff notes for next shift

## Incident Response

### Severity Levels
| Level | Definition | Response | Examples |
|-------|------------|----------|----------|
| SEV-1 | Site down, payments down, data loss | 5 min | Site down, payments failing, data breach |
| SEV-2 | Major feature down | 15 min | Checkout down, payments failing, admin down |
| SEV-3 | Minor feature degraded | 1 hour | Search slow, images not loading |
| SEV-4 | Minor issue | 4 hours | Typos, minor UI bugs |

### Incident Response Flow
```
1. Alert received (PagerDuty/Opsgenie/Slack)
    ↓
2. Acknowledge (5 min SEV-1, 15 min SEV-2)
    ↓
3. Investigate (check dashboards, logs, traces)
    ↓
4. Mitigate (rollback, config change, scale up)
    ↓
4. Communicate (status page, Slack, email)
    ↓
5. Resolve & verify
    ↓
6. Post-mortem (SEV-1/2 within 48h)
```

### Communication Templates

#### SEV-1 Declaration
```
🚨 SEV-1 DECLARED: [Brief description]
Impact: [User-facing impact]
Status: Investigating
Commander: @oncall
Channel: #incident-sev1
Started: [timestamp]
Updates: Every 15 min
```

#### Status Update (every 15 min SEV-1, 30 min SEV-2)
```
Update #[n]: [timestamp]
Status: [Investigating/Mitigating/Resolved]
Impact: [Current impact]
Actions: [What we're doing]
Next update: [time]
```

#### Resolution
```
✅ RESOLVED: [Incident title]
Root cause: [Root cause]
Impact duration: [duration]
Affected users: [count/percentage]
Action items: [Follow-up tasks]
Post-mortem: [link/date]
```

## Common Incidents & Runbooks

### 1. High Error Rate
**Symptoms**: Error rate > 1% for 5min
**Diagnosis**:
1. Check Sentry for new errors
2. Check deploy timeline
3. Check recent deployments
3. Check dependencies (DB, Redis, Stripe, APIs)
**Mitigation**:
- Rollback last deploy
- Scale up services
- Circuit breaker patterns

### 2. High Latency (P95 > 2s)
**Diagnosis**:
1. Check APM (Datadog/Sentry)
2. Check DB slow queries
3. Check Redis/DB CPU
3. Check external API latency
**Mitigation**:
- Scale up read replicas
- Enable query cache
- Rate limit aggressive clients
- Enable query cache

### 3. Payment Failures
**Symptoms**: Payment error rate > 5%
**Diagnosis**:
1. Check Stripe/Crypto dashboard
2. Check webhook delivery
3. Check API rate limits
3. Check card network status
**Mitigation**:
- Enable fallback payment methods
- Contact Stripe/Crypto support
- Enable fallback payment methods

### 4. High Error Rate
**Threshold**: > 1% for 5 min
**Diagnosis**:
1. Check Sentry for new errors
2. Check recent deployments
3. Check dependency health
**Mitigation**:
- Rollback last deploy
- Disable problematic feature
- Scale up resources

### 4. High Latency (P95 > 2s)
**Diagnosis**:
1. Check APM traces
2. Check DB slow queries
3. Check Redis/DB CPU
3. Check external API latency
**Mitigation**:
- Scale read replicas
- Enable query cache
- Rate limit aggressive clients
- Enable query cache

### 5. Payment Failures
**Threshold**: > 5% failure rate
**Diagnosis**:
1. Check Stripe dashboard
2. Check webhook delivery
3. Check card network status
**Mitigation**:
- Enable fallback payment methods
- Contact Stripe support
- Enable fallback payment methods

### 6. High Error Rate
**Threshold**: > 1% for 5 min
**Diagnosis**:
1. Check Sentry for new errors
2. Check recent deployments
3. Check dependency health
**Mitigation**:
- Rollback last deploy
- Disable problematic feature
- Scale up resources

### 6. High Latency (P95 > 2s)
**Diagnosis**:
1. Check APM traces
2. Check DB slow queries
3. Check Redis/DB CPU
3. Check external API latency
**Mitigation**:
- Scale read replicas
- Enable query cache
- Rate limit aggressive clients
- Enable query cache

### 7. Database Issues
**Symptoms**: Connection errors, slow queries, replication lag
**Diagnosis**:
1. Check connection pool
2. Check long-running queries
2. Check replication lag
3. Check disk space
**Mitigation**:
- Kill long-running queries
- Scale read replicas
- Increase connection pool
- Add read replicas

### 8. Cache Issues
**Symptoms**: Stale data, cache misses, high latency
**Diagnosis**:
1. Check Redis memory
2. Check hit rate
2. Check eviction rate
3. Check key expiration
**Mitigation**:
- Flush specific keys
- Increase memory
- Adjust TTL
- Warm cache

### 9. CDN Issues
**Symptoms**: Stale content, 404s, slow loads
**Diagnosis**:
1. Check Cloudflare status
2. Check cache hit rate
2. Check origin health
3. Check purge status
**Mitigation**:
- Purge cache
- Bypass cache temporarily
- Check origin health

### 10. Email/SMS Failures
**Symptoms**: Notifications not sending
**Diagnosis**:
1. Check provider status (Resend/Twilio)
2. Check API limits
2. Check template errors
3. Check suppression lists
**Mitigation**:
- Switch provider
- Retry queue
- Manual send for critical

## Post-Incident Process

### Post-Mortem (SEV-1/2 within 48h)
1. **Timeline**: Create timeline of events
2. **Root Cause**: 5 Whys analysis
3. **Impact**: Users affected, revenue loss, duration
3. **Action Items**: Preventive measures with owners/dates
4. **Review**: Team review within 1 week
3. **Documentation**: Update runbooks, runbooks

### Post-Mortem Template
```markdown
# Incident Post-Mortem: [INC-ID]

## Summary
- **Date**: YYYY-MM-DD
- **Duration**: Xh Ym
- **Severity**: SEV-X
- **Impact**: X users affected, $Y revenue impact

## Timeline
- HH:MM - Detection
- HH:MM - Investigation started
- HH:MM - Mitigation applied
- HH:MM - Resolved

## Root Cause
[5 Whys analysis]

## Impact
- Users affected: X
- Revenue impact: $X
- Orders affected: X

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Fix root cause | @dev | YYYY-MM-DD | ☐ |
| Add monitoring | @devops | YYYY-MM-DD | ☐ |
| Improve runbook | @devops | YYYY-MM-DD | ☐ |

## Follow-up
- Post-mortem review: [date]
- Action items review: [date + 2 weeks]
```

## On-Call Handoff Template
```
## Handoff: [Date] [Time] - [Next On-Call]

### Current Status
- Active incidents: [list]
- Deployments today: [list]
- Known issues: [list]
- Upcoming deployments: [list]

### Handoff Notes
- [Important context for next shift]

### Contacts
- Primary: [Name] - [Phone] - @slack
- Secondary: [Name] - [Phone] - @slack
- Escalation: [Name] - [Phone] - @slack

### Upcoming
- Deployments: [times]
- Maintenance: [windows]
- Known issues: [links]
```

## Escalation Contacts

| Role | Name | Phone | Slack | Email |
|------|------|-------|-------|-------|
| Primary On-Call | Milan P. | +381 60 123 4567 | @milan | milan@dalli.rs |
| Secondary | Ana M. | +381 61 234 5678 | @ana | ana@dalli.rs |
| Engineering Lead | Jovan P. | +381 62 345 6789 | @jovan | jovan@dalli.rs |
| DevOps Lead | Nikola J. | +381 63 456 7890 | @nikola | nikola@dalli.rs |
| Security | Dragan S. | +381 63 456 7890 | @dragan | dragan@dalli.rs |
| CTO | Jovan P. | +381 64 567 8901 | @jovan | jovan@dalli.rs |

## Tools & Access
- **Sentry**: https://sentry.io/dalli
- **Datadog**: https://app.datadoghq.com
- **Netlify**: https://app.netlify.com/teams/dalli
- **Cloudflare**: https://dash.cloudflare.com
- **Neon DB**: https://console.neon.tech
- **Upstash Redis**: https://console.upstash.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Coinbase Commerce**: https://commerce.coinbase.com
- **Resend**: https://resend.com
- **Twilio**: https://console.twilio.com
- **Netlify**: https://app.netlify.com/teams/dalli
- **Cloudflare**: https://dash.cloudflare.com
- **Netlify**: https://app.netlify.com/teams/dalli

## Useful Commands
```bash
# Deploy
netlify deploy --prod --dir=dist

# Rollback
netlify rollback --site=dalli

# Logs
netlify logs --site=dalli --function=api

# DB
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Cache
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD INFO

# Logs
netlify logs --function=api --tail=100
```

---
*Last Updated: 2025-01-15 | Version 1.0*