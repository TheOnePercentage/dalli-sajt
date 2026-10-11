# Rollback Plan

## Overview
This document describes the rollback procedures for the DALLI e-commerce platform.

## Rollback Triggers
Automatic rollback triggers:
- Error rate > 5% for 5 minutes
- P95 latency > 2 seconds for 5 minutes
- Error rate > 1% for 5 minutes
- Critical functionality broken (checkout, payments)
- Data corruption detected
- Security breach detected

## Rollback Procedures

### Application Rollback (Netlify)
```bash
# Option 1: Netlify CLI rollback (preferred)
netlify rollback --site=dalli

# Option 2: Git revert + deploy
git revert <bad-commit-hash>
git push origin main

# Option 3: Deploy specific commit
netlify deploy --prod --dir=dist --commit=<commit-hash>
```

### Database Rollback
```bash
# 1. Identify backup
aws s3 ls s3://dalli-backups/db/ --recursive | sort | tail -5

# 2. Create test database
psql -c "CREATE DATABASE dalli_test_restore;"

# 3. Restore
pg_restore -d postgresql://user:pass@host:5432/dalli_restore \
  -Fc s3://dalli-backups/db/backup_20240115_020000.dump

# 4. Verify
psql -d dalli_test_restore -c "SELECT count(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 day';"

# 4. Switch traffic (update DNS/connection strings)
```

### Database Rollback Checklist
- [ ] Identify correct backup
- [ ] Create test database
- [ ] Restore backup
- [ ] Verify data integrity
- [ ] Switch DNS/connection strings
- [ ] Verify application health
- [ ] Monitor for 30 minutes

### Database Rollback Checklist
- [ ] Backup identified and verified
- [ ] Test database created
- [ ] Backup restored successfully
- [ ] Data integrity verified
- [ ] Application switched to restored DB
- [ ] Health checks passing
- [ ] Monitoring for 30 minutes

### Rollback Verification
- [ ] Health checks pass
- [ ] Smoke tests pass
- [ ] Critical user flows work
- [ ] Error rate < 0.1%
- [ ] Latency < 500ms p95
- [ ] No new errors in Sentry
- [ ] Monitoring stable for 30 minutes

### Communication
1. **Internal**: #incident Slack channel
2. **Status Page**: Update status.dalli.rs
3. **Customers**: Email/In-app notification if needed
4. **Stakeholders**: Email to stakeholders

### Post-Rollback
1. Root cause analysis
2. Post-mortem scheduled
3. Fix deployed
5. Re-deploy with fix
6. Post-mortem document

---

## Emergency Contacts

| Role | Name | Phone | Slack |
|-------|------|-------|-------|
| Incident Commander | Milan Petrović | +381 60 123 4567 | @milan |
| DBA | Ana Marković | +381 61 234 5678 | @ana |
| DevOps Lead | Nikola Jovanović | +381 62 345 6789 | @nikola |
| Security | Dragan Stojanović | +381 63 456 7890 | @dragan |
| Engineering Lead | Jovan Petrović | +381 64 567 8901 | @jovan |

## Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| SEV-1 (Critical) | 5 min | IC → Eng Lead → CTO |
| SEV-2 (Major) | 15 min | IC → Eng Lead |
| SEV-3 (Minor) | 1 hour | Team Lead |

## Communication Channels
- **Incident Channel**: #incident-dalli
- **Status Page**: status.dalli.rs
- **Customer Comms**: Email + In-app
- **Stakeholder**: Email + Slack #stakeholders