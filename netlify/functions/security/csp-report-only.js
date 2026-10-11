import { SecurityAuditLogger } from '../../../security/security-audit-logger.js';

const auditLogger = new SecurityAuditLogger({
  logLevel: 'warn',
  logDestination: 'console',
});

const REPORT_ONLY_CSP =
  "default-src 'self'; script-src 'self' 'nonce-{NONCE}' https://cdn.dalli.rs https://fonts.googleapis.com https://connect.facebook.net https://connect.instagram.com https://connect.tiktok.com https://tag.twitter.com https://www.google-analytics.com https://www.googletagmanager.com; style-src 'self' 'nonce-{NONCE}' https://fonts.googleapis.com https://cdn.dalli.rs; font-src 'self' data: https://fonts.gstatic.com https://cdn.dalli.rs; img-src 'self' data: https://cdn.dalli.rs https://www.google-analytics.com https://www.googletagmanager.com; connect-src 'self' https://api.dalli.rs https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com wss://api.dalli.rs; frame-src 'self' https://www.facebook.com https://www.instagram.com https://www.youtube.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://dalli.rs; manifest-src 'self'; worker-src 'self' blob:; report-uri /api/security/csp-report;";

export const getReportOnlyCsp = async (request, context) => {
  return new Response(REPORT_ONLY_CSP, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

export const cspReportOnlyMiddleware = async (request, context) => {
  const response = await context.next();

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Content-Security-Policy-Report-Only', REPORT_ONLY_CSP);
  responseHeaders.set(
    'Report-To',
    JSON.stringify({
      group: 'csp-endpoint',
      max_age: 86400,
      endpoints: [{ url: '/api/security/csp-report' }],
    })
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};

export const cspViolationReport = async (request, context) => {
  try {
    const body = await request.json();

    const reports = Array.isArray(body) ? body : [body];

    for (const reportWrapper of reports) {
      const report = reportWrapper['csp-report'] || reportWrapper.body || reportWrapper;

      const violation = {
        timestamp: new Date().toISOString(),
        'document-uri': report['document-uri'],
        referrer: report.referrer,
        'violated-directive': report['violated-directive'],
        'effective-directive': report['effective-directive'],
        'original-policy': report['original-policy'],
        disposition: report.disposition || 'enforce',
        'blocked-uri': report['blocked-uri'],
        'line-number': report['line-number'],
        'column-number': report['column-number'],
        'source-file': report['source-file'],
        'script-sample': report['script-sample'],
        'status-code': report['status-code'],
        userAgent: request.headers.get('User-Agent'),
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
      };

      auditLogger.logCSPViolation(violation);

      console.warn('[CSP VIOLATION REPORT-ONLY]', JSON.stringify(violation, null, 2));
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('CSP Report parsing error:', error);
    return new Response(JSON.stringify({ error: 'Invalid report format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const expectCtReport = async (request, context) => {
  try {
    const report = await request.json();

    console.warn('[EXPECT-CT REPORT]', JSON.stringify(report, null, 2));

    auditLogger.log({
      level: 'warn',
      type: 'security.expect_ct_violation',
      message: 'Expect-CT violation reported',
      metadata: report,
      riskLevel: 'medium',
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid report format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const nelReport = async (request, context) => {
  try {
    const reports = Array.isArray(await request.json())
      ? await request.json()
      : [await request.json()];

    for (const reportWrapper of reports) {
      const report = reportWrapper.body || reportWrapper;

      const entry = {
        timestamp: new Date().toISOString(),
        type: 'nel',
        body: report,
      };

      console.warn('[NEL REPORT]', JSON.stringify(entry, null, 2));

      auditLogger.log({
        level: 'warn',
        type: 'security.nel_report',
        message: 'Network Error Logging report',
        metadata: entry,
        riskLevel: 'low',
      });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid report format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/api/security/*',
};
