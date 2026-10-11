# ADR 007: Monitoring & Observability Strategy

## Status
Accepted

## Context
Defining the monitoring and observability stack for the DALLI e-commerce platform.

## Decision
Implement a comprehensive observability stack with:
- **Sentry**: Error tracking & performance monitoring
- **Custom Metrics**: Business & technical metrics
- **Real User Monitoring (RUM)**: Web Vitals, user interactions
- **Synthetic Monitoring**: Uptime, API health
- **Log Aggregation**: Structured logging
- **Alerting**: Multi-channel alerting
- **Dashboards**: Business & technical dashboards

## Tool Selection

### Primary: Sentry
**Reasoning**:
- Excellent error tracking with context
- Performance monitoring (transactions, spans)
- Release tracking
- User feedback widget
- Release health tracking
- Session replay
- Cron monitoring
- Release health

**Configuration**:
```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  tracesSampleRate: 0.2,
  profilesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true
    })
  ],
  beforeSend(event, hint) {
    // Filter noise
    if (event.exception) {
      const error = hint.originalException;
      if (error?.name === 'NetworkError') return null;
      if (error?.name === 'AbortError') return null;
    }
    return event;
  }
});
```

### Datadog (Infrastructure)
- Infrastructure monitoring
- APM for backend services
- Log management
- Synthetic monitoring
- Real-time dashboards

### Custom Metrics
Custom metrics exported to Datadog/Prometheus:
- Business metrics (orders, revenue, conversion)
- Technical metrics (latency, errors, throughput)
- Custom business events

### Log Aggregation
- **Netlify Functions Logs**: Built-in
- **Custom Logs**: Structured JSON logging
- **Log Levels**: debug, info, warn, error, critical
- **Correlation IDs**: Request tracing

---

## SLO/SLI Definitions

### Service Level Objectives (SLOs)

| Service | SLI | SLO Target | Window |
|---------|-----|------------|--------|
| **Availability** | Uptime | 99.9% | 30d |
| **Latency (p95)** | HTTP p95 | < 500ms | 5m |
| **Latency (p99)** | HTTP p99 | < 1000ms | 5m |
| **Error Rate** | HTTP 5xx rate | < 0.1% | 5m |
| **Checkout Success** | Checkout completion | > 99% | 1h |
| **Payment Success** | Payment completion | > 98% | 1h |
| **Search Latency** | Search p95 | < 300ms | 5m |
| **Page Load (LCP)** | LCP < 2.5s | > 75% | 7d |

### Error Budget Policy
| SLO | Error Budget | Alert Threshold |
|-----|--------------|-----------------|
| Availability | 0.1% (43 min/month) | 50% consumed → Warning |
| Latency p95 | 500ms | 80% consumed → Warning |
| Error Rate | 0.1% | 50% consumed → Warning |

---

## Alerting Rules

### Critical Alerts (Page Immediately)
| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| **Site Down** | Availability < 99% for 5m | Critical | PagerDuty + Slack + SMS |
| **Payment Failures** | Payment error rate > 5% | Critical | PagerDuty + Slack + SMS |
| **Database Down** | DB connections failed | Critical | PagerDuty + SMS |
| **High Error Rate** | Error rate > 5% for 5m | Critical | PagerDuty + Slack |

### Warning Alerts (Slack + Email)
| Alert | Condition | Window |
|-------|-----------|--------|
| High Error Rate | Error rate > 1% for 5m | Warning |
| High Latency (p95) | p95 > 1s for 5m | 5m |
| High Latency (p99) | p99 > 2s for 5m | 5m |
| High Error Rate | Error rate > 1% | 5m |
| High CPU | CPU > 85% for 5m | 5m |
| High Memory | Memory > 85% | 5m |
| Disk Space | Disk > 85% | 1h |
| Queue Depth | Queue > 1000 | 5m |
| Dead Letter Queue | DLQ > 100 | 5m |

### Business Alerts
| Alert | Condition | Severity |
|-------|-----------|----------|
| Low Conversion | Conversion < 1% for 1h | Warning |
| High Cart Abandonment | Abandonment > 80% | Warning |
| Low Inventory | Stock < 10 for SKU | Warning |
| Failed Payments | Payment failure rate > 5% | Critical |
| High Refund Rate | Refund rate > 10% | Warning |

---

## Dashboard Specifications

### 1. Executive Dashboard
**Audience**: Leadership, Product
**Refresh**: 5min
**Panels**:
- Revenue (24h, 7d, 30d)
- Orders (count, trend)
- Conversion Rate (gauge)
- Average Order Value
- Revenue by Channel
- Top Products
- Top Categories

### 2. Technical Overview
**Audience**: Engineering, DevOps
**Refresh**: 30s
**Panels**:
- Request Rate (req/s)
- Error Rate (%)
- Latency p50, p95, p99
- Throughput (req/s)
- Apdex Score
- Error Rate by Endpoint
- Top Slow Endpoints

### 3. Business Metrics
**Audience**: Product, Marketing
**Refresh**: 5min
**Panels**:
- Orders (count, trend)
- Revenue (RSD)
- Conversion Rate (funnel)
- Average Order Value
- Items per Order
- New vs Returning Customers
- Cart Abandonment Rate
- Checkout Completion Rate

### 3. E-commerce Funnel
- Sessions → Product Views → Add to Cart → Checkout → Purchase
- Drop-off rates at each step
- Drop-off reasons (if available)

### 4. Real-time Monitoring
**Refresh**: 10s
- Active Users (1m, 5m, 15m)
- Current Orders/min
- Revenue/min
- Active Carts
- Checkout in Progress

### 4. E-commerce Funnel
- Sessions → Product Views → Add to Cart → Checkout → Purchase
- Drop-off analysis
- Drop-off reasons (if available)

### 5. Real-time Monitoring
**Panels**:
- Active Users (1m, 5m, 15m)
- Orders/min (real-time)
- Revenue/min (real-time)
- Active Carts
- Checkouts in Progress

---

## Alerting Channels

### Critical (Page Immediately)
- PagerDuty → SMS + Call
- Slack #alerts-critical
- Email to on-call

### Warning (Slack + Email)
- Slack #alerts-warning
- Email to team

### Info (Slack only)
- Channel: #alerts-info

---

## Runbook Links
Each alert should link to relevant runbook:
- `/runbooks/high-error-rate.md`
- `/runbooks/high-latency.md`
- `/runbooks/payment-failures.md`
- `/runbooks/database-issues.md`
- `/runbooks/cache-issues.md`
- `/runbooks/cdn-issues.md`

---

## On-Call Runbook

### Current On-Call
| Week | Primary | Secondary | Escalation |
|-------|---------|-----------|------------|
| Week 1 | Milan P. | Ana M. | Jovan P. |
| Week 2 | Nikola J. | Dragan S. | Milan P. |
| Week 3 | Ana M. | Jovan P. | Nikola J. |
| Week 4 | Dragan S. | Milan P. | Ana M. |

### Escalation Path
```
SEV-1: Primary (5min) → Eng Lead (15m) → CTO (30m)
SEV-2: Primary (15m) → Eng Lead (30m) → CTO (1h)
SEV-3: Primary (1h) → Eng Lead (2h)
SEV-4: Next business day
```

### Runbook Links
- [High Error Rate](./high-error-rate.md)
- [High Latency](./high-latency.md)
- [Payment Failures](./payment-failures.md)
- [Database Issues](./database-issues.md)
- [Cache Issues](./cache-issues.md)
- [CDN Issues](./cdn-issues.md)
- [Deployment Issues](./deployment-issues.md)
- [Security Incident](./security-incident.md)

---

*Last Updated: 2025-01-15 | Version 1.0*