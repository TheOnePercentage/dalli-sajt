# DALLI E-commerce - Disaster Recovery & Backup Runbook

## Overview
This document outlines the disaster recovery and backup strategy for the DALLI e-commerce platform.

## Recovery Objectives

| Metric | Target | Measurement |
|--------|--------|-------------|
| RTO (Recovery Time Objective) | 4 hours | Maximum time to restore service |
| RPO (Recovery Point Objective) | 1 hour | Maximum data loss |
| RTO (Critical Systems) | 1 hour | Critical systems (payments, orders) |
| RPO (Critical Systems) | 15 minutes | Critical data (orders, payments) |

## Backup Strategy

### Database Backups
| Database | Frequency | Retention | Storage | Encryption |
|----------|-----------|-----------|---------|------------|
| Primary DB (PostgreSQL) | Every 15 min | 30 days | S3 (encrypted) | AES-256 |
| Analytics DB | Hourly | 90 days | S3 (encrypted) | AES-256 |
| Redis Cache | Every 6 hours | 7 days | S3 (encrypted) | AES-256 |
| Search Index (Elasticsearch) | Daily | 30 days | S3 (encrypted) | AES-256 |

### Application Backups
| Component | Frequency | Retention | Storage |
|-----------|-----------|-----------|---------|
| Application Code | On deploy | 90 days | GitHub + S3 |
| Configuration | On change | 90 days | Git + S3 |
| SSL Certificates | On renewal | 2 years | Secure Vault |
| SSL Private Keys | On generation | 2 years | HSM / Vault |

### Media & Assets
| Asset Type | Frequency | Retention | Storage |
|------------|-----------|-----------|---------|
| Product Images | On upload | Permanent | CDN + S3 |
| User Uploads | On upload | 2 years | S3 (encrypted) |
| Logs | Continuous | 90 days | CloudWatch / S3 |

## Backup Procedures

### Automated Backups (Cron)
```bash
# Database backup (every 15 minutes)
*/15 * * * * /scripts/backup-db.sh

# Daily full backup
0 2 * * * /scripts/full-backup.sh

# Weekly full backup
0 3 * * 0 /scripts/full-backup.sh

# Monthly archive
0 3 1 * * /scripts/monthly-archive.sh
```

### Backup Verification
```bash
# Daily verification
0 6 * * * /scripts/verify-backups.sh

# Weekly restore test
0 4 * * 0 /scripts/test-restore.sh

# Monthly full restore drill
0 3 1 * * /scripts/full-restore-drill.sh
```

## Recovery Procedures

### Scenario 1: Single Service Failure
**RTO: 15 minutes**

1. Alert received (PagerDuty/Opsgenie)
2. Check service health: `kubectl get pods -n production`
2. Check logs: `kubectl logs -n production <pod-name>`
3. Restart service: `kubectl rollout restart deployment/<service>`
4. Verify health: `curl -f https://api.dalli.rs/health`
4. Update status page

### Scenario 2: Database Failure
**RTO: 30 minutes**

1. Alert: Database connection failures
2. Check replica status: `kubectl get pods -n database`
2. Promote replica: `kubectl exec -it pg-primary -- pg_ctl promote`
3. Update DNS/connection strings
3. Verify application connectivity
4. Monitor replication lag

### Scenario 3: Complete Region Outage
**RTO: 4 hours | RPO: 1 hour**

1. Declare disaster (Incident Commander)
2. Activate DR runbook
2. Failover to secondary region (EU-West)
2. Update DNS (Route53/Cloudflare) - TTL 60s
3. Update CDN origin
4. Verify all services
5. Communicate to stakeholders
5. Monitor for 30 minutes

### Scenario 4: Data Corruption/Ransomware
**RTO: 4 hours | RPO: 1 hour**

1. Isolate affected systems
2. Identify scope of corruption
2. Restore from last clean backup
3. Verify data integrity
4. Replay transactions from WAL
5. Validate data integrity
5. Resume operations

## Failover Procedures

### Database Failover
```bash
# Automatic (Patroni)
# Manual override:
kubectl exec -it pg-primary -- patronictl failover --force

# Verify
kubectl exec -it pg-replica -- psql -c "SELECT pg_is_in_recovery();"
```

### Application Failover
```bash
# Update DNS (Route53/Cloudflare)
aws route53 change-resource-record-sets --hosted-zone-id Z123456 --change-batch file://failover.json

# Update CDN origin
# Cloudflare API call to update origin

# Verify
curl -f https://api.dalli.rs/health
```

### Database Restore Procedure
```bash
#!/bin/bash
# restore-db.sh
BACKUP_FILE=$1
TARGET_DB=$2

# Stop application
kubectl scale deployment api --replicas=0

# Restore
pg_restore -d $TARGET_DB -Fc $BACKUP_FILE

# Run migrations
npm run migrate

# Restart app
kubectl scale deployment api --replicas=3
```

## Backup Verification Scripts

### verify-backups.sh
```bash
#!/bin/bash
# verify-backups.sh

set -e

echo "Verifying backups..."

# Check latest backup exists
LATEST_BACKUP=$(aws s3 ls s3://dalli-backups/db/ --recursive | sort | tail -1 | awk '{print $4}')
if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No backup found"
  exit 1
fi

# Check backup age
BACKUP_TIME=$(aws s3api head-object --bucket dalli-backups --key "$LATEST_BACKUP" --query 'LastModified' --output text)
BACKUP_AGE=$(( $(date +%s) - $(date -d "$BACKUP_TIME" +%s) ))
if [ $BACKUP_AGE -gt 3600 ]; then
  echo "WARNING: Latest backup is older than 1 hour"
  # Alert
fi

# Verify backup integrity
pg_restore --list "s3://dalli-backups/db/$LATEST_BACKUP" | head -20

echo "Backup verification complete"
```

### test-restore.sh
```bash
#!/bin/bash
# test-restore.sh

set -e

TEST_DB="dalli_test_restore_$(date +%s)"
BACKUP_FILE=$(aws s3 ls s3://dalli-backups/db/ --recursive | sort | tail -1 | awk '{print $4}')

echo "Testing restore from $BACKUP_FILE"

# Create test database
psql -c "CREATE DATABASE $TEST_DB;"

# Restore
pg_restore -d $TEST_DB -Fc "s3://dalli-backups/db/$BACKUP_FILE"

# Verify
TABLE_COUNT=$(psql -d $TEST_DB -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
if [ "$TABLE_COUNT" -lt 10 ]; then
  echo "ERROR: Too few tables restored"
  exit 1
fi

# Check critical tables
for table in users orders products categories; do
  COUNT=$(psql -d $TEST_DB -t -c "SELECT count(*) FROM $table;")
  if [ "$COUNT" -eq 0 ]; then
    echo "WARNING: Table $table is empty"
  fi
done

# Cleanup
dropdb $TEST_DB

echo "Restore test PASSED"
```

## Monitoring & Alerting

### Backup Alerts
```yaml
# Prometheus alerts
groups:
- name: backup-alerts
  rules:
  - alert: BackupFailed
    expr: |
      time() - backup_last_success_timestamp_seconds > 3600
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Backup failed for {{ $labels.job }}"
      description: "Backup has not completed successfully in the last hour"
      
  - alert: BackupAgeExceeded
    expr: |
      time() - backup_last_success_timestamp_seconds > 7200
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Backup is stale"
      description: "Last successful backup was more than 2 hours ago"
```

## Runbook: Database Restore

### Prerequisites
- Access to AWS CLI
- kubectl access to production cluster
- pg_restore installed
- Access to backup S3 bucket

### Step-by-step Restore

1. **Identify backup to restore**
   ```bash
   aws s3 ls s3://dalli-backups/db/ --recursive | sort | tail -5
   ```

2. **Create restore namespace**
   ```bash
   kubectl create namespace restore-test
   ```

3. **Restore database**
   ```bash
   pg_restore -d postgresql://user:pass@host:5432/restore_db \
     -Fc s3://dalli-backups/db/backup_20240115_020000.dump
   ```

3. **Verify data**
   ```sql
   SELECT count(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 day';
   ```

4. **Switch traffic**
   ```bash
   kubectl patch service postgres -p '{"spec":{"selector":{"role":"primary"}}}'
   ```

5. **Verify application**
   ```bash
   curl -f https://api.dalli.rs/health
   ```

## Runbooks Location
- `/docs/runbooks/database-restore.md`
- `/docs/runbooks/failover.md`
- `/docs/runbooks/data-corruption.md`
- `/docs/runbooks/ransomware.md`

## Testing Schedule
| Test | Frequency | Owner |
|------|-----------|-------|
| Backup verification | Daily | DevOps |
| Restore test | Weekly | DBA |
| Full DR drill | Monthly | DevOps + DBA |
| Failover test | Quarterly | DevOps + DBA |
| Ransomware simulation | Bi-annual | Security + DBA |

## Contacts
| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | Milan Petrović | +381 60 123 4567 | milan@dalli.rs |
| DBA | Ana Marković | +381 61 234 5678 | ana@dalli.rs |
| DevOps Lead | Nikola Jovanović | +381 62 345 6789 | nikola@dalli.rs |
| Security | Dragan Stojanović | +381 63 456 7890 | dragan@dalli.rs |
| Management | Aleksandar Đorđević | +381 64 567 8901 | aleksandar@dalli.rs |

---
*Last updated: 2025-01-15 | Version 1.2*
*Next review: 2025-02-15*