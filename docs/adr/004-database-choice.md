# ADR 004: Database Technology Choice

## Status
Accepted

## Context
Choosing the database technology for the DALLI e-commerce platform.

## Decision
We will use **PostgreSQL** as the primary database.

## Reasoning

### ACID Compliance
E-commerce requires strong consistency for:
- Order processing
- Inventory management
- Payment transactions
- Customer data integrity

PostgreSQL provides full ACID compliance with:
- Atomic transactions
- Consistency constraints
- Isolation levels
- Durability (WAL)

### JSONB Support
PostgreSQL's JSONB provides:
- Flexible schema for product attributes
- Efficient querying of semi-structured data
- GIN indexes for fast JSON queries
- No need for separate document store

### Performance
- MVCC for high concurrency
- Advanced indexing (B-tree, Hash, GiST, GIN, BRIN)
- Partitioning for large tables
- Parallel query execution
- Connection pooling (PgBouncer)

### Extensions
- `pg_trgm` for fuzzy search
- `pg_cron` for scheduled jobs
- `pg_stat_statements` for monitoring
- `pg_partman` for partitioning
- `pg_stat_statements` for query analysis

### Operational Maturity
- 30+ years of development
- Battle-tested at scale (Instagram, Uber, etc.)
- Excellent tooling (pgAdmin, pgAdmin4, pgAdmin4)
- Strong community and commercial support

## Alternatives Considered

### MongoDB
**Rejected**: 
- Eventual consistency unsuitable for orders/payments
- No ACID transactions (until 4.0, limited)
- Schema-less leads to data inconsistency
- No native JOINs

### MySQL
**Considered but Rejected**:
- Limited JSON support (pre-8.0)
- Weaker JSON querying
- Less advanced indexing
- Oracle ownership concerns

### CockroachDB
**Considered but Rejected**:
- Overkill for current scale
- Higher operational complexity
- Cost considerations

### DynamoDB
**Rejected**:
- Vendor lock-in
- Limited query flexibility
- Cost at scale
- No SQL interface

## Migration Strategy

### Initial Schema
```sql
-- Core tables
CREATE TABLE users (...);
CREATE TABLE products (...);
CREATE TABLE orders (...);
CREATE TABLE categories (...);
CREATE TABLE cart_items (...);
```

### Migrations
- Managed via `node-pg-migrate`
- Version controlled in `/migrations`
- Run on deploy via Netlify Functions

### Indexing Strategy
```sql
-- Products
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_gender ON products(gender);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_slug ON products(slug) UNIQUE;
CREATE INDEX idx_products_search ON products USING gin(
  to_tsvector('serbian', name || ' ' || description)
);

-- Orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Cart
CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE UNIQUE INDEX idx_cart_unique ON cart_items(user_id, product_id, variant_id);
```

## Connection Pooling
- **PgBouncer** in transaction mode
- Pool size: 20-50 connections
- Max client connections: 100
- Idle timeout: 30 seconds

## Backup Strategy
- Continuous WAL archiving
- Daily base backups
- Point-in-time recovery (PITR)
- Cross-region replication

## Monitoring
- `pg_stat_statements` for query analysis
- `pg_stat_activity` for active connections
- `pg_stat_database` for database stats
- Custom metrics in Prometheus/Grafana

## Migration Strategy
1. Development: Local PostgreSQL
2. Staging: Neon branch
3. Production: Neon main branch
4. Migrations run via GitHub Actions
5. Zero-downtime migrations with `pgroll` or manual steps

## References
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Neon Documentation](https://neon.tech/docs)
- [PgBouncer](https://www.pgbouncer.org/)