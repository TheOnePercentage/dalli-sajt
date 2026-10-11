# Imperium Admin - Multi-stage Docker Build
# Optimized for size, security, and performance

# =============================================================================
# Stage 1: Base & Dependencies
# =============================================================================
FROM node:20-alpine AS base
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    tzdata
WORKDIR /app
ENV NODE_ENV=production \
    TZ=Europe/Belgrade \
    PNPM_VERSION=9.0.0

# =============================================================================
# Stage 2: Dependencies Installation
# =============================================================================
FROM base AS deps
COPY package*.json ./
COPY pnpm-lock.yaml* ./
RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm store prune

# =============================================================================
# Stage 3: Build
# =============================================================================
FROM base AS builder
COPY package*.json ./
COPY pnpm-lock.yaml* ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile --ignore-scripts

COPY . .
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_SENTRY_DSN
ARG VITE_GA_MEASUREMENT_ID
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_WS_URL=${VITE_WS_URL} \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN} \
    VITE_GA_MEASUREMENT_ID=${VITE_GA_MEASUREMENT_ID}
RUN pnpm run build

# =============================================================================
# Stage 4: Runtime (NGINX)
# =============================================================================
FROM nginx:alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    openssl \
    gettext \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf.template
COPY docker/nginx.default.conf /etc/nginx/conf.d/default.conf.template
COPY docker/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Set up directories and permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
    /var/log/nginx \
    /etc/nginx/conf.d \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose ports
EXPOSE 8080 8443

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Entrypoint
ENTRYPOINT ["dumb-init", "--"]
CMD ["/bin/sh", "-c", "envsubst '${VITE_API_URL} ${VITE_WS_URL} ${VITE_SENTRY_DSN} ${VITE_GA_MEASUREMENT_ID}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && envsubst '${VITE_API_URL} ${VITE_WS_URL} ${VITE_SENTRY_DSN} ${VITE_GA_MEASUREMENT_ID}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]