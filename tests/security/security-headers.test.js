import { beforeAll, describe, expect, it } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4321';

async function fetchWithHeaders(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'User-Agent': 'Security-Test-Suite/1.0',
      ...options.headers,
    },
  });
  return response;
}

describe('Security Headers', () => {
  let response;

  beforeAll(async () => {
    response = await fetchWithHeaders('/');
  });

  describe('HSTS', () => {
    it('should have Strict-Transport-Security header', async () => {
      const hsts = response.headers.get('strict-transport-security');
      expect(hsts).toBeTruthy();
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });
  });

  describe('CSP', () => {
    it('should have Content-Security-Policy header', async () => {
      const csp = response.headers.get('content-security-policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('should have nonce in script-src', async () => {
      const csp = response.headers.get('content-security-policy');
      expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=_-]+'/);
    });

    it('should have report-uri directive', async () => {
      const csp = response.headers.get('content-security-policy');
      expect(csp).toContain('report-uri /api/security/csp-report');
    });
  });

  describe('X-Frame-Options', () => {
    it('should have X-Frame-Options set to SAMEORIGIN', async () => {
      const xfo = response.headers.get('x-frame-options');
      expect(xfo).toBe('SAMEORIGIN');
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should have X-Content-Type-Options set to nosniff', async () => {
      const xcto = response.headers.get('x-content-type-options');
      expect(xcto).toBe('nosniff');
    });
  });

  describe('X-XSS-Protection', () => {
    it('should have X-XSS-Protection header', async () => {
      const xxss = response.headers.get('x-xss-protection');
      expect(xxss).toBe('1; mode=block');
    });
  });

  describe('Referrer-Policy', () => {
    it('should have Referrer-Policy set to strict-origin-when-cross-origin', async () => {
      const rp = response.headers.get('referrer-policy');
      expect(rp).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Permissions-Policy', () => {
    it('should have Permissions-Policy with restricted features', async () => {
      const pp = response.headers.get('permissions-policy');
      expect(pp).toBeTruthy();
      expect(pp).toContain('camera=()');
      expect(pp).toContain('microphone=()');
      expect(pp).toContain('geolocation=()');
      expect(pp).toContain('payment=()');
      expect(pp).toContain('accelerometer=()');
      expect(pp).toContain('gyroscope=()');
      expect(pp).toContain('magnetometer=()');
      expect(pp).toContain('usb=()');
      expect(pp).toContain('bluetooth=()');
    });
  });

  describe('Cross-Origin Policies', () => {
    it('should have Cross-Origin-Opener-Policy set to same-origin', async () => {
      const coop = response.headers.get('cross-origin-opener-policy');
      expect(coop).toBe('same-origin');
    });

    it('should have Cross-Origin-Embedder-Policy set to require-corp', async () => {
      const coep = response.headers.get('cross-origin-embedder-policy');
      expect(coep).toBe('require-corp');
    });

    it('should have Cross-Origin-Resource-Policy set to same-origin', async () => {
      const corp = response.headers.get('cross-origin-resource-policy');
      expect(corp).toBe('same-origin');
    });
  });

  describe('Server Headers', () => {
    it('should not expose Server header', async () => {
      const server = response.headers.get('server');
      expect(server).toBeFalsy();
    });

    it('should not expose X-Powered-By header', async () => {
      const poweredBy = response.headers.get('x-powered-by');
      expect(poweredBy).toBeFalsy();
    });
  });
});

describe('Rate Limiting', () => {
  it('should return 429 after exceeding rate limit', async () => {
    const requests = Array(105)
      .fill(null)
      .map(() => fetchWithHeaders('/api/test', { method: 'GET' }));

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);

    expect(rateLimited).toBe(true);
  });

  it('should include rate limit headers', async () => {
    const response = await fetchWithHeaders('/api/test');

    expect(response.headers.get('x-ratelimit-limit')).toBeTruthy();
    expect(response.headers.get('x-ratelimit-remaining')).toBeTruthy();
    expect(response.headers.get('x-ratelimit-reset')).toBeTruthy();
  });
});

describe('CSRF Protection', () => {
  it('should set CSRF token cookie on GET /api/security/csrf-token', async () => {
    const response = await fetchWithHeaders('/api/security/csrf-token', { method: 'GET' });

    expect(response.status).toBe(200);

    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('__Host-csrf-token=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Secure');
  });

  it('should reject POST without CSRF token', async () => {
    const response = await fetchWithHeaders('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.code).toBe('CSRF_INVALID');
  });

  it('should accept POST with valid CSRF token', async () => {
    const tokenResponse = await fetchWithHeaders('/api/security/csrf-token', { method: 'GET' });
    const setCookie = tokenResponse.headers.get('set-cookie');
    const tokenMatch = setCookie.match(/__Host-csrf-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    expect(token).toBeTruthy();

    const response = await fetchWithHeaders('/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        Cookie: `__Host-csrf-token=${token}`,
      },
      body: JSON.stringify({ test: 'data' }),
    });

    expect(response.status).not.toBe(403);
  });
});

describe('CORS', () => {
  it('should allow requests from allowed origin', async () => {
    const response = await fetchWithHeaders('/api/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://dalli.rs',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('https://dalli.rs');
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('should reject requests from disallowed origin', async () => {
    const response = await fetchWithHeaders('/api/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    expect(response.headers.get('access-control-allow-origin')).toBeFalsy();
  });
});

describe('CSP Reporting', () => {
  it('should accept CSP violation reports', async () => {
    const report = {
      'csp-report': {
        'document-uri': 'https://dalli.rs/',
        referrer: '',
        'violated-directive': "script-src 'self'",
        'effective-directive': 'script-src',
        'original-policy': "default-src 'self'; script-src 'self'",
        disposition: 'enforce',
        'blocked-uri': 'https://evil.com/script.js',
        'line-number': 10,
        'column-number': 5,
        'source-file': 'https://dalli.rs/',
        'script-sample': '',
        'status-code': 200,
      },
    };

    const response = await fetchWithHeaders('/api/security/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });

    expect(response.status).toBe(204);
  });

  it('should accept Report-Only CSP reports', async () => {
    const reports = [
      {
        type: 'csp-violation',
        url: 'https://dalli.rs/',
        body: {
          'document-uri': 'https://dalli.rs/',
          'violated-directive': "script-src 'self'",
          'blocked-uri': 'https://evil.com/script.js',
        },
      },
    ];

    const response = await fetchWithHeaders('/api/security/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reports),
    });

    expect(response.status).toBe(204);
  });
});

describe('Security.txt', () => {
  it('should have security.txt', async () => {
    const response = await fetchWithHeaders('/.well-known/security.txt');
    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).toContain('Contact:');
    expect(text).toContain('Expires:');
    expect(text).toContain('Policy:');
  });
});

describe('Cookies', () => {
  it('should set Secure flag on cookies', async () => {
    const response = await fetchWithHeaders('/');
    const cookies = response.headers.get('set-cookie');

    if (cookies) {
      expect(cookies).toContain('Secure');
    }
  });

  it('should set HttpOnly on auth cookies', async () => {
    const response = await fetchWithHeaders('/');
    const cookies = response.headers.get('set-cookie');

    if (cookies) {
      expect(cookies).toContain('HttpOnly');
    }
  });

  it('should set SameSite on cookies', async () => {
    const response = await fetchWithHeaders('/');
    const cookies = response.headers.get('set-cookie');

    if (cookies) {
      expect(cookies).toMatch(/SameSite=(Strict|Lax)/);
    }
  });
});

describe('HTTPS Enforcement', () => {
  it('should redirect HTTP to HTTPS', async () => {
    const httpUrl = BASE_URL.replace('https://', 'http://');
    const response = await fetch(httpUrl, { redirect: 'manual' });

    expect([301, 302]).toContain(response.status);
    expect(response.headers.get('location')).toContain('https://');
  });
});

describe('Subresource Integrity', () => {
  it('should have integrity attributes on external scripts', async () => {
    const response = await fetchWithHeaders('/');
    const html = await response.text();

    const scriptTags = html.match(/<script[^>]*src=["']https?:\/\/[^"']+["'][^>]*>/gi) || [];

    for (const tag of scriptTags) {
      expect(tag).toContain('integrity=');
      expect(tag).toContain('crossorigin=');
    }
  });

  it('should have integrity attributes on external stylesheets', async () => {
    const response = await fetchWithHeaders('/');
    const html = await response.text();

    const linkTags =
      html.match(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']https?:\/\/[^"']+["'][^>]*>/gi) ||
      [];

    for (const tag of linkTags) {
      expect(tag).toContain('integrity=');
      expect(tag).toContain('crossorigin=');
    }
  });
});
