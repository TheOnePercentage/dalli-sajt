/**
 * Security Hardening Service
 * CSP, HSTS, Rate Limiting, Audit Trail, Input Sanitization
 */

import { apiService } from './api.js';
import { cacheService } from './cache.js';
import { envConfig } from '../utils/env-config.js';

class SecurityService {
  constructor() {
    this.cspPolicy = null;
    this.rateLimiters = new Map();
    this.auditQueue = [];
    this.auditFlushInterval = null;
    this.violations = [];
    this.maxViolations = 100;
    this.csrfToken = null;
    this.nonce = null;
  }

  // =========================================================================
  // Content Security Policy
  // =========================================================================

  generateCSP(config = {}) {
    const nonce = this.getNonce();
    const {
      defaultSrc = ["'self'"],
      scriptSrc = ["'self'", `'nonce-${nonce}'`],
      styleSrc = ["'self'", `'nonce-${nonce}'`],
      imgSrc = ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc = ["'self'", 'data:', 'https:'],
      connectSrc = ["'self'", 'wss:', 'https:'],
      mediaSrc = ["'self'", 'blob:'],
      objectSrc = ["'none'"],
      frameSrc = ["'self'"],
      workerSrc = ["'self'", 'blob:'],
      manifestSrc = ["'self'"],
      prefetchSrc = ["'self'"],
      formAction = ["'self'"],
      frameAncestors = ["'none'"],
      baseUri = ["'self'"],
      reportUri = '',
      upgradeInsecureRequests = true,
      blockAllMixedContent = true,
    } = config;

    const directives = {
      'default-src': defaultSrc.join(' '),
      'script-src': scriptSrc.join(' '),
      'style-src': styleSrc.join(' '),
      'img-src': imgSrc.join(' '),
      'font-src': fontSrc.join(' '),
      'connect-src': connectSrc.join(' '),
      'media-src': mediaSrc.join(' '),
      'object-src': objectSrc.join(' '),
      'frame-src': frameSrc.join(' '),
      'worker-src': workerSrc.join(' '),
      'manifest-src': manifestSrc.join(' '),
      'prefetch-src': prefetchSrc.join(' '),
      'form-action': formAction.join(' '),
      'frame-ancestors': frameAncestors.join(' '),
      'base-uri': baseUri.join(' '),
    };

    if (upgradeInsecureRequests) {
      directives['upgrade-insecure-requests'] = '';
    }
    if (blockAllMixedContent) {
      directives['block-all-mixed-content'] = '';
    }
    if (reportUri) {
      directives['report-uri'] = reportUri;
    }

    this.cspPolicy = Object.entries(directives)
      .map(([key, value]) => value ? `${key} ${value}` : key)
      .join('; ');

    return this.cspPolicy;
  }

  getCSPHeader() {
    return this.cspPolicy || this.generateCSP();
  }

  getCSPMetaTag() {
    return `<meta http-equiv="Content-Security-Policy" content="${this.getCSPHeader()}">`;
  }

  applyCSP() {
    // Remove existing CSP meta tags
    document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(el => el.remove());

    // Add new CSP meta tag
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = this.getCSPHeader();
    document.head.appendChild(meta);

    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (e) => this.handleCSPViolation(e));
  }

  handleCSPViolation(event) {
    const violation = {
      timestamp: new Date().toISOString(),
      directive: event.violatedDirective,
      blockedUri: event.blockedURI,
      documentUri: event.documentURI,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber,
      sourceFile: event.sourceFile,
      disposition: event.disposition,
      originalPolicy: event.originalPolicy,
    };

    this.violations.push(violation);
    if (this.violations.length > this.maxViolations) {
      this.violations.shift();
    }

    // Report to server
    this.reportViolation(violation);

    console.warn('[Security] CSP Violation:', violation);
  }

  async reportViolation(violation) {
    try {
      await apiService.post('/security/csp-report', violation);
    } catch (e) {
      // Queue for retry
      this.auditQueue.push({ type: 'csp_violation', data: violation });
    }
  }

  // =========================================================================
  // HSTS
  // =========================================================================

  getHSTSHeader(maxAge = 31536000, includeSubDomains = true, preload = true) {
    let header = `max-age=${maxAge}`;
    if (includeSubDomains) header += '; includeSubDomains';
    if (preload) header += '; preload';
    return header;
  }

  // =========================================================================
  // Rate Limiting
  // =========================================================================

  createRateLimiter(key, options = {}) {
    const {
      maxRequests = 100,
      windowMs = 60 * 1000, // 1 minute
      blockDuration = 15 * 60 * 1000, // 15 minutes
      onLimitExceeded = null,
    } = options;

    const limiter = {
      key,
      maxRequests,
      windowMs,
      blockDuration,
      onLimitExceeded,
      requests: [],
      blockedUntil: 0,
    };

    this.rateLimiters.set(key, limiter);
    return limiter;
  }

  checkRateLimit(key, cost = 1) {
    const limiter = this.rateLimiters.get(key);
    if (!limiter) return { allowed: true, remaining: Infinity, resetTime: null };

    const now = Date.now();

    // Check if blocked
    if (limiter.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: limiter.blockedUntil,
        blocked: true,
      };
    }

    // Clean old requests
    limiter.requests = limiter.requests.filter(t => now - t < limiter.windowMs);

    // Check limit
    if (limiter.requests.length + cost > limiter.maxRequests) {
      limiter.blockedUntil = now + limiter.blockDuration;
      
      if (limiter.onLimitExceeded) {
        limiter.onLimitExceeded(key, limiter);
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: limiter.blockedUntil,
        blocked: true,
      };
    }

    // Add request
    for (let i = 0; i < cost; i++) {
      limiter.requests.push(now);
    }

    return {
      allowed: true,
      remaining: limiter.maxRequests - limiter.requests.length,
      resetTime: now + limiter.windowMs,
    };
  }

  getRateLimitInfo(key) {
    const limiter = this.rateLimiters.get(key);
    if (!limiter) return null;

    const now = Date.now();
    const validRequests = limiter.requests.filter(t => now - t < limiter.windowMs);

    return {
      key,
      used: validRequests.length,
      remaining: Math.max(0, limiter.maxRequests - validRequests.length),
      limit: limiter.maxRequests,
      windowMs: limiter.windowMs,
      blocked: limiter.blockedUntil > now,
      blockedUntil: limiter.blockedUntil > now ? limiter.blockedUntil : null,
    };
  }

  resetRateLimit(key) {
    this.rateLimiters.delete(key);
  }

  // Pre-configured limiters
  setupDefaultLimiters() {
    // API calls
    this.createRateLimiter('api', { maxRequests: 100, windowMs: 60 * 1000 });
    
    // Auth attempts
    this.createRateLimiter('auth', { maxRequests: 5, windowMs: 15 * 60 * 1000, blockDuration: 30 * 60 * 1000 });
    
    // Search
    this.createRateLimiter('search', { maxRequests: 30, windowMs: 60 * 1000 });
    
    // File upload
    this.createRateLimiter('upload', { maxRequests: 10, windowMs: 60 * 1000 });
    
    // Mutations
    this.createRateLimiter('mutation', { maxRequests: 50, windowMs: 60 * 1000 });
  }

  // =========================================================================
  // CSRF Protection
  // =========================================================================

  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    this.csrfToken = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    return this.csrfToken;
  }

  getCSRFToken() {
    if (!this.csrfToken) {
      this.generateCSRFToken();
    }
    return this.csrfToken;
  }

  validateCSRFToken(token) {
    return token === this.csrfToken;
  }

  // =========================================================================
  // Nonce Generation (for CSP)
  // =========================================================================

  generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    this.nonce = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    return this.nonce;
  }

  getNonce() {
    if (!this.nonce) {
      this.generateNonce();
    }
    return this.nonce;
  }

  // =========================================================================
  // Input Sanitization
  // =========================================================================

  sanitizeHTML(html, options = {}) {
    const {
      allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div'],
      allowedAttributes = ['href', 'class', 'id', 'style', 'title', 'target', 'rel'],
      allowedSchemes = ['http', 'https', 'mailto', 'tel'],
    } = options;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove scripts and dangerous elements
    doc.querySelectorAll('script, iframe, object, embed, form, input, button, link, meta, style').forEach(el => el.remove());

    // Sanitize elements
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    const node = walker.nextNode();
    while (node) {
      // Check tag
      if (!allowedTags.includes(node.tagName.toLowerCase())) {
        node.replaceWith(...node.childNodes);
      } else {
        // Sanitize attributes
        Array.from(node.attributes).forEach(attr => {
          const name = attr.name.toLowerCase();
          if (!allowedAttributes.includes(name)) {
            node.removeAttribute(name);
          } else if (name === 'href' || name === 'src') {
            // Validate URL scheme
            try {
              const url = new URL(attr.value, window.location.origin);
              if (!allowedSchemes.includes(url.protocol.replace(':', ''))) {
                node.removeAttribute(name);
              }
            } catch {
              node.removeAttribute(name);
            }
          }
        });
      }
      walker.nextNode();
    }

    return doc.body.innerHTML;
  }

  sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  sanitizeSQL(input) {
    // Basic SQL injection prevention
    return String(input)
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/\b(union|select|insert|update|delete|drop|alter|create|exec|execute)\b/gi, '');
  }

  sanitizePath(path) {
    // Prevent directory traversal
    return String(path)
      .replace(/\.\./g, '')
      .replace(/\/+/g, '/')
      .replace(/^\/+/, '/');
  }

  // =========================================================================
  // XSS Protection
  // =========================================================================

  escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/\//g, '&#x2F;');
  }

  escapeJS(str) {
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/</g, '\\u003C')
      .replace(/>/g, '\\u003E');
  }

  escapeCSS(str) {
    return String(str).replace(/[^a-zA-Z0-9]/g, c => `\\${c.charCodeAt(0).toString(16)} `);
  }

  // =========================================================================
  // Audit Trail
  // =========================================================================

  startAuditCollection(intervalMs = 30000) {
    if (this.auditFlushInterval) {
      clearInterval(this.auditFlushInterval);
    }

    this.auditFlushInterval = setInterval(() => this.flushAuditQueue(), intervalMs);

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flushAuditQueue(true));

    // Flush on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushAuditQueue();
      }
    });
  }

  stopAuditCollection() {
    if (this.auditFlushInterval) {
      clearInterval(this.auditFlushInterval);
      this.auditFlushInterval = null;
    }
  }

  logAuditEvent(event) {
    const auditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      ip: null, // Filled by server
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      ...event,
    };

    this.auditQueue.push(auditEntry);

    // Flush immediately for critical events
    if (event.critical || event.type === 'security') {
      this.flushAuditQueue();
    }
  }

  async flushAuditQueue(sync = false) {
    if (this.auditQueue.length === 0) return;

    const events = [...this.auditQueue];
    this.auditQueue = [];

    try {
      if (sync) {
        // Use sendBeacon for reliable delivery on unload
        const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
        navigator.sendBeacon('/api/security/audit', blob);
      } else {
        await apiService.post('/security/audit', { events });
      }
    } catch (e) {
      // Re-queue on failure
      this.auditQueue.unshift(...events);
    }
  }

  getAuditEvents(filters = {}) {
    return apiService.get('/security/audit', { params: filters });
  }

  // =========================================================================
  // Security Headers (for server-side)
  // =========================================================================

  getSecurityHeaders() {
    return {
      'Content-Security-Policy': this.getCSPHeader(),
      'Strict-Transport-Security': this.getHSTSHeader(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    };
  }

  // =========================================================================
  // Feature Policy / Permissions Policy
  // =========================================================================

  getPermissionsPolicy() {
    return {
      accelerometer: [],
      camera: [],
      geolocation: [],
      gyroscope: [],
      magnetometer: [],
      microphone: [],
      payment: [],
      usb: [],
      'xr-spatial-tracking': [],
      clipboard: ['self'],
      'clipboard-read': ['self'],
      'clipboard-write': ['self'],
    };
  }

  // =========================================================================
  // Session Security
  // =========================================================================

  validateSession() {
    // Check session expiry
    const expiry = sessionStorage.getItem('session_expiry');
    if (expiry && Date.now() > parseInt(expiry)) {
      this.logAuditEvent({
        type: 'session_expired',
        action: 'auto_logout',
        critical: true,
      });
      return false;
    }

    // Check for session fixation
    const sessionId = this.getSessionId();
    const storedId = sessionStorage.getItem('session_id');
    if (storedId && storedId !== sessionId) {
      this.logAuditEvent({
        type: 'session_fixation_attempt',
        action: 'session_regenerated',
        critical: true,
      });
      sessionStorage.setItem('session_id', sessionId);
    }

    return true;
  }

  regenerateSession() {
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    sessionStorage.setItem('session_id', newSessionId);
    sessionStorage.setItem('session_expiry', String(Date.now() + 24 * 60 * 60 * 1000));
    this.generateCSRFToken();
    this.generateNonce();
    return newSessionId;
  }

  getSessionId() {
    let id = sessionStorage.getItem('session_id');
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      sessionStorage.setItem('session_id', id);
    }
    return id;
  }

  getCurrentUserId() {
    try {
      const auth = JSON.parse(localStorage.getItem('imperium_auth') || '{}');
      return auth.user?.id || null;
    } catch {
      return null;
    }
  }

  // =========================================================================
  // Dependency Security
  // =========================================================================

  async checkDependencies() {
    // Check for known vulnerabilities in dependencies
    // In production, integrate with npm audit or Snyk
    return apiService.get('/security/dependency-check');
  }

  // =========================================================================
  // Utility
  // =========================================================================

  getViolations() {
    return [...this.violations];
  }

  clearViolations() {
    this.violations = [];
  }

  isSecureContext() {
    return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
  }

  enforceHTTPS() {
    if (!this.isSecureContext() && location.hostname !== 'localhost') {
      location.replace(location.href.replace('http:', 'https:'));
    }
  }
}

const securityService = new SecurityService();

// Initialize defaults
securityService.generateCSP();
securityService.setupDefaultLimiters();
securityService.startAuditCollection();
securityService.enforceHTTPS();

export { SecurityService, securityService };
export default securityService;