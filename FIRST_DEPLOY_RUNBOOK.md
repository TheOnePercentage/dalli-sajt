# FIRST_DEPLOY_RUNBOOK.md — First Deployment to dalli.rs

> Execute top-to-bottom on go-live day. Every block is a runnable operator step for the
> **first** production deployment. See `GO_LIVE_CHECKLIST.md` for the tick-list view.

Preconditions: `DALLI_DEPLOYMENT_PLAN.md` read; launch gates closed; backup drill done.

---

## Phase 0 — Local preflight (must pass locally)

```bash
git checkout main && git pull --ff-only
npm ci
npm run build:prod                       # 73 HTML / 44 SEO / 0 errors / sitemap 57
node --check server/index.js
npm run lint -- --quiet                  # or scoped to changed files (repo debt: see note)
npm run typecheck
npx vitest run --reporter=verbose admin-new/tests src/tests   # record baseline
```

> Note: repo-wide lint/prettier has pre-existing debt (CI red). For the runbook, gate on
> `npm audit --omit=dev --audit-level=high` (must pass) + `build:prod` — keep lint as
> follow-up debt. CI wiring for audit is a launch gate (see PLAN §0).

---

## Phase 1 — Provision data plane (Neon, Upstash)

```bash
# Neon: create project 'dalli'; create role 'dalli' + db 'dalli'.
#         Enable PITR + snapshots (30 d), disable auto-suspend.
export DATABASE_URL="postgresql://dalli:<pw>@<region>.pooler.neon.tech/dalli?pgbouncer=true&connection_limit=1&schema=public"
psql "$DATABASE_URL" -c "SELECT version();"          # expect PostgreSQL 16.x

# Upstash: create Redis DB, TLS region eu-central-1, eviction allkeys-lru.
export REDIS_URL="rediss://default:<token>@<region>.upstash.io:<port>"
redis-cli -u "$REDIS_URL" PING                        # expect PONG
```

---

## Phase 2 — VPS bring-up

```bash
# On the VPS (Ubuntu 22.04+), as root or sudoer:
apt update && apt install -y docker.io docker-compose-plugin certbot python3-certbot-nginx

# Clone the repo (deploy key / CI runner), then:
# Prepare the production compose override (exact content):
cat > docker-compose.prod.yml <<'EOF'
services:
  meilisearch:
    image: getmeili/meilisearch:v1.9
    container_name: dalli-meilisearch
    environment:
      MEILI_MASTER_KEY: ${MEILI_API_KEY:?set MEILI_API_KEY}
      MEILI_ENV: production
    volumes:
      - meilisearch_data:/meili_data
    expose:
      - "7700"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7700/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [dalli-network]

  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: dalli-api:${RELEASE_TAG:-1.0.0}
    container_name: dalli-app
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL:?set in .env}
      REDIS_URL: ${REDIS_URL:?set in .env}
      MEILI_HOST: http://meilisearch:7700
      MEILI_API_KEY: ${MEILI_API_KEY:?set in .env}
      JWT_SECRET: ${JWT_SECRET:?set in .env}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:?set in .env}
      FRONTEND_URL: ${FRONTEND_URL:?set in .env}
      PORT: 3001
    expose:
      - "3001"
    depends_on:
      meilisearch:
        condition: service_healthy
    networks: [dalli-network]
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: dalli-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf.prod:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on: [app]
    networks: [dalli-network]
    restart: unless-stopped

volumes:
  meilisearch_data:

networks:
  dalli-network:
    driver: bridge
EOF

# nginx for api.dalli.rs ONLY (replaces the storefront-static server blocks):
cat > nginx.conf.prod <<'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 10M;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_origin" "$http_user_agent"';
    access_log /var/log/nginx/access.log main;

    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;

    upstream backend { server app:3001; keepalive 32; }

    server {
        listen 80;
        server_name api.dalli.rs;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 301 https://$host$request_uri; }
    }

    server {
        listen 443 ssl http2;
        server_name api.dalli.rs;

        ssl_certificate /etc/nginx/ssl/dalli.rs.crt;
        ssl_certificate_key /etc/nginx/ssl/dalli.rs.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;

        location / {
            limit_req zone=api burst=200 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_buffering off;
        }

        location /socket.io/ {
            limit_req zone=api burst=400 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 60s;
        }
    }
}
EOF

# Firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

> ⚠️ `X-Forwarded-For` is trusted by the API (`trust proxy = true`) — the nginx above always
> overwrites it (`$proxy_add_x_forwarded_for`), so clients cannot forge it when only nginx
> is reachable. Ports 3001/7700 are NOT published externally.

### TLS for api.dalli.rs (Let's Encrypt)

```bash
# Preferred (certbot, auto-renew):
certbot certonly --nginx -d api.dalli.rs --agree-tos --email ops@dalli.rs
ln -sf /etc/letsencrypt/live/api.dalli.rs/fullchain.pem ssl/dalli.rs.crt
ln -sf /etc/letsencrypt/live/api.dalli.rs/privkey.pem    ssl/dalli.rs.key

# Or place static certs into ./ssl as dalli.rs.crt / dalli.rs.key (mounted read-only).
```

### Start + migrate + bootstrap

```bash
set -a; . ./.env; set +a                      # VPS .env with all §7 vars
export RELEASE_TAG="$(git rev-parse --short HEAD)"

docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps   # meilisearch healthy, app healthy, nginx running

# **Migration order (Task 9)** — run INSIDE the app container
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
#   → 20261008173120_prisma_v2, 20261008173447_product_metadata_review_details, 20261008173815_sitesettings_cuid

# RBAC bootstrap (one-time; rotate afterwards)
export SEED_PASSWORD="$(openssl rand -base64 18)"   # temp strong value
docker compose -f docker-compose.prod.yml exec -e SEED_PASSWORD app node scripts/seed-rbac.js
unset SEED_PASSWORD                                   # rotate admin password in-app afterwards

docker compose -f docker-compose.prod.yml exec app node -e "
const {prisma}=require('./server/src/lib/prisma.js');
prisma.\$queryRaw\`SELECT 1\`.then(async()=>{console.log('DB OK');await prisma.\$disconnect()});"
```

---

## Phase 3 — Storefront on Netlify

```bash
# local machine, tag the release
git tag -a v1.0.0 -m "production v1.0.0" && git push origin v1.0.0

# create site (once)
npx netlify sites:create --name dalli-ecommerce
npx netlify link

# env (Site → Environment variables) — set BEFORE first deploy:
#   SITE_URL=https://dalli.rs  API_URL=https://api.dalli.rs
#   ALERT_WEBHOOK_URL=<slack|discord>  NETLIFY_AUTH_TOKEN=<personal token>
#   SMTP_HOST/PORT/USER/PASS  EMAIL_FROM='DALLI <noreply@dalli.rs>'

npm run build:prod
npx netlify deploy --prod --dir dist --message "v1.0.0"
```

From now on, CI on `main` deploys production (workflow `deploy-production`).

---

## Phase 4 — DNS cutover (order matters)

1. `api.dalli.rs A → <VPS_IPv4>` (24–48 h earlier lower TTL to 300 s).
2. Verify API over public cert: `curl -fsS https://api.dalli.rs/api/v1/health`.
3. Add `dalli.rs` + `www.dalli.rs` in Netlify (Approach A: NS change; Approach B: A/CNAME).
4. Wait for Netlify “Let’s Encrypt issued”.
5. Full smoke (checklist §D5).

---

## Phase 5 — Rollback (if anything breaks)

| Failure | Action |
|---|---|
| API crash-loop | `docker compose -f docker-compose.prod.yml logs app`; re-deploy previous image `dalli-api:<prev-sha>` |
| Wrong DB schema | FORWARD-FIX (`prisma migrate deploy` with revert migration) — never `migrate down`; data-rollback via Neon snapshot `pg_restore` |
| Storefront broken | Netlify → Deploys → **Publish** previous deploy (deploy lock first) |
| DNS mess | restore previous registrar records (keep old records saved in this runbook) |

---

## Phase 6 — Immediately after success

- [ ] PowerShell/`crontab`: off-site daily `pg_dump` (custom-format) → object storage:
  ```bash
  pg_dump --format=custom --compress=9 "$DATABASE_URL" > "dalli_$(date +%F_%H%M).dump"
  ```
- [ ] UptimeRobot/BetterStack: `dalli.rs` + `api.dalli.rs/api/v1/health` (alert → ALERT_WEBHOOK_URL).
- [ ] Log drain: API stdout is JSON lines → ship to Loki/CloudWatch (see OPERATIONS_RUNBOOK strategy); Netlify deploy logs available natively.
- [ ] HSTS **preload** submission for `dalli.rs` after stable HTTPS.