import { createClient } from '@netlify/functions';

const rateLimitStore = new Map();

const RATE_LIMITS = {
  '/api/': { windowMs: 60000, max: 100 },
  '/api/auth/': { windowMs: 900000, max: 5 },
  '/api/payment/': { windowMs: 60000, max: 10 },
  '/api/security/': { windowMs: 60000, max: 50 },
  '/api/admin/': { windowMs: 60000, max: 30 },
  'default': { windowMs: 60000, max: 60 }
};

function getClientKey(event) {
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || event.headers['x-real-ip'] 
    || 'unknown';
  const userAgent = event.headers['user-agent'] || 'unknown';
  return `${ip}:${userAgent.substring(0, 50)}`;
}

function getRateLimitConfig(path) {
  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(prefix)) return config;
  }
  return RATE_LIMITS.default;
}

function cleanupStore() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export default async (request, context) => {
  cleanupStore();

  const path = new URL(request.url).pathname;
  const config = getRateLimitConfig(path);
  const clientKey = getClientKey(request);

  const now = Date.now();
  let clientData = rateLimitStore.get(clientKey);

  if (!clientData || now > clientData.resetTime) {
    clientData = {
      count: 0,
      resetTime: now + config.windowMs,
      firstRequest: now
    };
    rateLimitStore.set(clientKey, clientData);
  }

  clientData.count++;

  const remaining = Math.max(0, config.max - clientData.count);
  const resetTime = new Date(clientData.resetTime).toISOString();

  const headers = {
    'X-RateLimit-Limit': config.max.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime,
    'Retry-After': Math.ceil((clientData.resetTime - now) / 1000).toString()
  };

  if (clientData.count > config.max) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      }),
      {
        status: 429,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }

  return context.next();
};

export const config = {
  path: '/api/*'
};