#!/bin/sh
# Imperium Admin - Health Check Script
# Checks nginx, API connectivity, DB, Redis, and system resources

set -e

NGINX_HEALTH_ENDPOINT="http://localhost:8080/health"
API_HEALTH_ENDPOINT="${VITE_API_URL:-http://api:3000}/health"
TIMEOUT=5

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

log_error() {
    echo "${RED}ERROR: $1${NC}"
}

log_warn() {
    echo "${YELLOW}WARNING: $1${NC}"
}

log_ok() {
    echo "${GREEN}OK: $1${NC}"
}

# Track overall health status
HEALTH_STATUS=0

# Check 1: nginx process
if ! pgrep -x nginx > /dev/null; then
    log_error "nginx process not found"
    HEALTH_STATUS=1
else
    log_ok "nginx process running"
fi

# Check 2: nginx health endpoint (static file serving)
if ! curl -f -s --max-time "$TIMEOUT" "$NGINX_HEALTH_ENDPOINT" > /dev/null; then
    log_error "nginx health endpoint unreachable"
    HEALTH_STATUS=1
else
    log_ok "nginx health endpoint responding"
fi

# Check 3: API health endpoint (checks DB, Redis, etc.)
if [ -n "$VITE_API_URL" ]; then
    if ! curl -f -s --max-time "$TIMEOUT" "$API_HEALTH_ENDPOINT" > /dev/null; then
        log_error "API health endpoint unreachable at $API_HEALTH_ENDPOINT"
        HEALTH_STATUS=1
    else
        # Parse API health response to check sub-components
        API_HEALTH_RESPONSE=$(curl -f -s --max-time "$TIMEOUT" "$API_HEALTH_ENDPOINT" 2>/dev/null || echo '{}')
        
        # Check DB status
        DB_STATUS=$(echo "$API_HEALTH_RESPONSE" | grep -o '"database":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        if [ "$DB_STATUS" = "connected" ] || [ "$DB_STATUS" = "healthy" ] || [ "$DB_STATUS" = "ok" ]; then
            log_ok "Database connectivity: $DB_STATUS"
        elif [ "$DB_STATUS" != "unknown" ]; then
            log_error "Database connectivity issue: $DB_STATUS"
            HEALTH_STATUS=1
        fi
        
        # Check Redis status
        REDIS_STATUS=$(echo "$API_HEALTH_RESPONSE" | grep -o '"redis":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        if [ "$REDIS_STATUS" = "connected" ] || [ "$REDIS_STATUS" = "healthy" ] || [ "$REDIS_STATUS" = "ok" ]; then
            log_ok "Redis connectivity: $REDIS_STATUS"
        elif [ "$REDIS_STATUS" != "unknown" ]; then
            log_error "Redis connectivity issue: $REDIS_STATUS"
            HEALTH_STATUS=1
        fi
        
        # Check API status
        API_STATUS=$(echo "$API_HEALTH_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        if [ "$API_STATUS" = "ok" ] || [ "$API_STATUS" = "healthy" ]; then
            log_ok "API status: $API_STATUS"
        elif [ "$API_STATUS" != "unknown" ]; then
            log_error "API status degraded: $API_STATUS"
            HEALTH_STATUS=1
        fi
        
        if [ "$DB_STATUS" = "unknown" ] && [ "$REDIS_STATUS" = "unknown" ] && [ "$API_STATUS" = "unknown" ]; then
            log_ok "API health endpoint responding (no detailed status)"
        fi
    fi
else
    log_warn "VITE_API_URL not set, skipping API health checks"
fi

# Check 4: nginx worker processes
WORKER_COUNT=$(pgrep -c nginx)
if [ "$WORKER_COUNT" -lt 2 ]; then
    log_warn "Low nginx worker count: $WORKER_COUNT"
else
    log_ok "nginx worker count: $WORKER_COUNT"
fi

# Check 5: Disk space
DISK_USAGE=$(df /usr/share/nginx/html | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    log_warn "High disk usage: ${DISK_USAGE}%"
    HEALTH_STATUS=1
elif [ "$DISK_USAGE" -gt 80 ]; then
    log_warn "Disk usage getting high: ${DISK_USAGE}%"
else
    log_ok "Disk usage: ${DISK_USAGE}%"
fi

# Check 6: Memory
if [ -f /proc/meminfo ]; then
    MEM_AVAILABLE=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    if [ "$MEM_AVAILABLE" -lt 100000 ]; then
        log_warn "Low available memory: ${MEM_AVAILABLE} KB"
        HEALTH_STATUS=1
    elif [ "$MEM_AVAILABLE" -lt 200000 ]; then
        log_warn "Available memory getting low: ${MEM_AVAILABLE} KB"
    else
        log_ok "Available memory: ${MEM_AVAILABLE} KB"
    fi
fi

# Final status
if [ "$HEALTH_STATUS" -eq 0 ]; then
    log_ok "All health checks passed"
    exit 0
else
    log_error "Some health checks failed"
    exit 1
fi