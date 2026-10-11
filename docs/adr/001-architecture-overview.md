# ADR 001: Architecture Overview

## Status
Accepted

## Context
DALLI is a modern e-commerce platform serving the Serbian market with plans for regional expansion. The platform must handle high traffic, secure payments, multi-language support, and complex inventory management.

## Decision
We will use a **modular monolith** architecture deployed as a single-page application (SPA) with a separate admin panel, backed by serverless functions for API endpoints.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Web (React SPA)  │  Mobile (React Native)  │  Admin Panel     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CDN / Edge (Cloudflare)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway / Edge Functions                 │
│  (Netlify Functions / Cloudflare Workers)                        │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │    Redis      │    │  Object Store │
│  (Primary)    │    │  (Cache/Sess) │    │   (S3/R2)     │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Vanilla JavaScript (ES Modules) - No framework overhead
- **Styling**: CSS Custom Properties + CSS Layers
- **State Management**: Custom Signals implementation
- **Routing**: Custom hash/history router
- **Build**: Vite 5 + Rollup
- **PWA**: Workbox (Workbox Window)

### Backend (Netlify Functions)
- **Runtime**: Node.js 20
- **Language**: TypeScript (ES Modules)
- **Database**: PostgreSQL (via pg)
- **Cache**: Redis (Upstash)
- **Storage**: Cloudflare R2 / AWS S3
- **Auth**: JWT + HttpOnly Cookies
- **Payments**: Stripe + Crypto (BTC/ETH/USDT/USDC)

### Infrastructure
- **Hosting**: Netlify (Edge)
- **CDN**: Cloudflare
- **Database**: Neon PostgreSQL (Serverless)
- **Cache**: Upstash Redis
- **Storage**: Cloudflare R2
- **DNS**: Cloudflare
- **Email**: Resend
- **Monitoring**: Sentry + Custom Metrics

## Key Architectural Decisions

### ADR 001: Vanilla JS over React/Vue
**Status**: Accepted
**Reason**: Zero framework overhead, better performance, smaller bundle, full control

### ADR 002: OKLCH Color Space
**Status**: Accepted
**Reason**: Perceptually uniform, better dark mode support

### ADR 003: CSS Cascade Layers
**Status**: Accepted
**Reason**: Better specificity management, easier maintenance

### ADR 004: Vanilla JS State Management (Signals)
**Status**: Accepted
**Reason**: Lightweight, no dependencies, fine-grained reactivity

### ADR 005: Netlify Functions over Express
**Status**: Accepted
**Reason**: Zero-config deployment, automatic scaling, edge deployment

### ADR 006: Netlify + Cloudflare over AWS
**Status**: Accepted
**Reason**: Simpler operations, better DX, integrated CDN/WAF

### ADR 007: PostgreSQL over MongoDB
**Status**: Accepted
**Reason**: ACID compliance for orders/payments, JSONB for flexibility

### ADR 008: Redis for Sessions/Cache
**Status**: Accepted
**Reason**: Sub-millisecond latency, built-in TTL, pub/sub

### ADR 009: Stripe + Crypto Payments
**Status**: Accepted
**Reason**: Market demand, 15% crypto discount differentiator

### ADR 010: PWA First
**Status**: Accepted
**Reason**: Mobile-first market, offline support, installable

## Component Architecture

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   └── features/        # Feature-specific components
├── hooks/               # Custom React-like hooks
├── context/             # React-like Context providers
├── store/               # State management (signals)
├── services/            # API clients, utilities
├── utils/               # Pure utility functions
├── types/               # TypeScript definitions
├── styles/              # CSS (layers, variables, components)
└── components/
    └── ui/              # Atomic UI components
```

## Data Flow

```
User Action
    │
    ▼
Component (Signal-based state)
    │
    ▼
Service Layer (API Client)
    │
    ▼
Netlify Function (Edge)
    │
    ├── PostgreSQL (Data)
    ├── Redis (Cache/Sessions)
    ├── S3/R2 (Files)
    └── External APIs (Stripe, Crypto, Email)
```

## Security Architecture

- **CSP**: Strict CSP with nonce-based scripts
- **HSTS**: Preloaded, 1 year
- **CSP Reporting**: Enabled with `/api/security/csp-report`
- **CSP Report-Only**: Monitor mode for new policies
- **Permissions Policy**: Restricted features
- **CORS**: Strict origin validation
- **CSRF**: Double-submit cookie + SameSite=Strict
- **CSP Reporting**: Endpoint at `/api/security/csp-report`

## Deployment Architecture

```
Git Push → GitHub Actions → Vite Build → Netlify Deploy → Cloudflare CDN
     │                                                         │
     ▼                                                         ▼
GitHub Actions                                             Cloudflare Edge
     │                                                         │
     ├── Lint + TypeCheck                                   ├── WAF
     ├── Unit Tests                                         ├── DDoS Protection
     ├── E2E Tests                                          ├── Bot Management
     ├── Build (Vite)                                       ├── Caching
     ├── Deploy Preview                                     └── SSL/TLS
     └── Deploy Production
```

## Scaling Strategy

| Component | Scaling Approach |
|-----------|------------------|
| Static Assets | Cloudflare CDN (Global) |
| Netlify Functions | Auto-scale (0 to N) |
| Database | Neon Serverless (Auto-scale) |
| Redis | Upstash (Auto-scale) |
| Storage | Cloudflare R2 (Unlimited) |

## Disaster Recovery

- **RTO**: 4 hours
- **RPO**: 1 hour (15 min for critical)
- **Backup**: Daily automated + continuous WAL
- **Failover**: Manual DNS switch (5 min)
- **DR Region**: eu-west-1 (backup), eu-central-1 (primary)

## Security Checklist

- [x] CSP with nonce
- [x] HSTS Preload
- [x] CSP Reporting
- [x] Permissions Policy
- [x] COOP/COEP
- [x] SRI for external resources
- [x] Subresource Integrity
- [x] Trusted Types
- [x] Secure Cookies (HttpOnly, Secure, SameSite=Strict)
- [x] CSRF Protection (Double Submit + SameSite)
- [x] Rate Limiting (API)
- [x] WAF (Cloudflare)
- [x] Bot Management
- [x] DDoS Protection
- [x] CSP Reporting Endpoint
- [x] SRI for External Resources

## Monitoring Stack

- **Errors**: Sentry (Frontend + Backend)
- **Metrics**: Custom + Web Vitals
- **Logs**: Netlify Functions Logs + Custom
- **Uptime**: UptimeRobot + Custom Health Checks
- **Alerting**: PagerDuty / Slack
- **RUM**: Custom + Web Vitals

---

*Last Updated: 2025-01-15*
*Version: 2.0*
*Next Review: 2025-02-15*