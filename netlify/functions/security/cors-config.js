const ALLOWED_ORIGINS = [
  'https://dalli.rs',
  'https://www.dalli.rs',
  'https://admin.dalli.rs',
  'https://api.dalli.rs'
];

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-CSRF-Token',
  'X-Requested-With',
  'Accept',
  'Origin',
  'Cache-Control',
  'X-Request-ID'
];
const EXPOSED_HEADERS = [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'Retry-After',
  'X-Request-ID'
];

const CORS_CONFIG = {
  '/api/auth/': {
    origins: ['https://dalli.rs', 'https://www.dalli.rs'],
    credentials: true,
    maxAge: 86400
  },
  '/api/payment/': {
    origins: ['https://dalli.rs', 'https://www.dalli.rs', 'https://checkout.stripe.com'],
    credentials: true,
    maxAge: 3600
  },
  '/api/admin/': {
    origins: ['https://admin.dalli.rs'],
    credentials: true,
    maxAge: 3600
  },
  '/api/security/': {
    origins: ['https://dalli.rs', 'https://www.dalli.rs'],
    credentials: false,
    maxAge: 86400
  },
  'default': {
    origins: ['https://dalli.rs', 'https://www.dalli.rs'],
    credentials: true,
    maxAge: 86400
  }
};

function getCorsConfig(path) {
  for (const [prefix, config] of Object.entries(CORS_CONFIG)) {
    if (path.startsWith(prefix)) return config;
  }
  return CORS_CONFIG.default;
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return false;
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin === `https://${domain}`;
    }
    return origin === allowed;
  });
}

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const config = getCorsConfig(path);
  const origin = request.headers.get('origin');
  
  const corsHeaders = {
    'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
    'Access-Control-Expose-Headers': EXPOSED_HEADERS.join(', '),
    'Access-Control-Max-Age': config.maxAge.toString()
  };
  
  if (origin && isOriginAllowed(origin, config.origins)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Vary'] = 'Origin';
    
    if (config.credentials) {
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    }
  }
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  const response = await context.next();
  
  const responseHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
};

export const config = {
  path: '/api/*'
};