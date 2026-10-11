import crypto from 'crypto';

const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

function generateToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length) {
      cookies[name] = rest.join('=');
    }
  });
  return cookies;
}

function setCsrfCookie(token, isSecure = true) {
  const cookieParts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'Path=/',
    'SameSite=Strict',
    isSecure ? 'Secure' : '',
    'HttpOnly',
    `Max-Age=${Math.floor(CSRF_TOKEN_EXPIRY / 1000)}`
  ].filter(Boolean);
  
  return cookieParts.join('; ');
}

function validateCsrfToken(requestToken, cookieToken) {
  if (!requestToken || !cookieToken) return false;
  if (requestToken.length !== cookieToken.length) return false;
  
  return crypto.timingSafeEqual(
    Buffer.from(requestToken),
    Buffer.from(cookieToken)
  );
}

export const getCsrfToken = async (request, context) => {
  const cookies = parseCookies(request.headers.get('cookie'));
  let token = cookies[CSRF_COOKIE_NAME];
  
  if (!token) {
    token = generateToken();
  }
  
  const isSecure = request.headers.get('x-forwarded-proto') === 'https' 
    || request.url.startsWith('https://');
  
  return new Response(JSON.stringify({ csrfToken: token }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCsrfCookie(token, isSecure),
      'Cache-Control': 'no-store'
    }
  });
};

export const validateCsrf = async (request, context) => {
  const cookies = parseCookies(request.headers.get('cookie'));
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  
  const requestToken = request.headers.get(CSRF_HEADER_NAME) 
    || (await request.json()).csrfToken;
  
  if (!validateCsrfToken(requestToken, cookieToken)) {
    return new Response(JSON.stringify({ 
      error: 'CSRF validation failed',
      code: 'CSRF_INVALID'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return context.next();
};

export const csrfMiddleware = async (request, context) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return context.next();
  }
  
  return validateCsrf(request, context);
};

export const config = {
  path: '/api/*'
};