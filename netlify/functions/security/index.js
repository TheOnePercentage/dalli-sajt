import rateLimiter from './rate-limiter.js';
import { csrfMiddleware, getCsrfToken } from './csrf-protection.js';
import corsConfig from './cors-config.js';
import { cspReportOnlyMiddleware, cspViolationReport, expectCtReport, nelReport } from './csp-report-only.js';

const securityMiddlewares = [
  rateLimiter,
  corsConfig,
  cspReportOnlyMiddleware,
  csrfMiddleware
];

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path === '/api/security/csrf-token' && request.method === 'GET') {
    return getCsrfToken(request, context);
  }
  
  if (path === '/api/security/csp-report' && request.method === 'POST') {
    return cspViolationReport(request, context);
  }
  
  if (path === '/api/security/expect-ct-report' && request.method === 'POST') {
    return expectCtReport(request, context);
  }
  
  if (path === '/api/security/nel-report' && request.method === 'POST') {
    return nelReport(request, context);
  }
  
  if (path === '/api/security/csp-report-only' && request.method === 'GET') {
    return getReportOnlyCsp(request, context);
  }
  
  let response = await context.next();
  
  for (const middleware of securityMiddlewares) {
    const middlewareResponse = await middleware(request, {
      ...context,
      next: async () => response
    });
    
    if (middlewareResponse && middlewareResponse !== response) {
      response = middlewareResponse;
    }
  }
  
  return response;
};

export const config = {
  path: '/api/*'
};