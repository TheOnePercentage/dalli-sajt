/**
 * DALLI Security & Compliance
 * CSP, HSTS, Permissions Policy, GDPR, Cookie Consent, CSP Reporting
 */

export class SecurityCompliance {
  static init() {
    this.initCSP();
    this.initHSTS();
    this.initPermissionsPolicy();
    this.initCookieConsent();
    this.initGDPRCompliance();
    this.initCSPReporting();
    this.initSecurityHeaders();
    this.initSubresourceIntegrity();
    this.initTrustedTypes();
    this.initSecurityMonitoring();
  }

  // ============================================================
  // CONTENT SECURITY POLICY (CSP)
  // ============================================================
  static initCSP() {
    // CSP is primarily set via HTTP headers, but we can also set via meta tag
    // and handle CSP reporting
    
    // CSP Reporting endpoint
    const cspReportEndpoint = '/api/csp-report';
    
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (e) => {
      this.reportCSPViolation(e);
    });

    // Report CSP violations to server
    this.reportCSPViolation = (e) => {
      const report = {
        'csp-report': {
          'document-uri': e.documentURI,
          'referrer': e.referrer,
          'violated-directive': e.violatedDirective,
          'effective-directive': e.effectiveDirective,
          'original-policy': e.originalPolicy,
          'disposition': e.disposition,
          'blocked-uri': e.blockedURI,
          'line-number': e.lineNumber,
          'column-number': e.columnNumber,
          'source-file': e.sourceFile,
          'status-code': e.statusCode,
          'script-sample': e.sample
        }
      };

      // Send to reporting endpoint
      fetch('/api/csp-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        credentials: 'include'
      }).catch(() => {});
    };
  }

  static initCSPReporting() {
    // CSP Reporting is handled via HTTP headers and the securitypolicyviolation event
    // This method sets up the reporting endpoint
    
    // Create CSP report endpoint handler
    if (!window.cspReportHandler) {
      window.cspReportHandler = async (report) => {
        try {
          await fetch('/api/csp-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 'csp-report': report }),
            credentials: 'include'
          });
        } catch (e) {
          console.warn('CSP report failed:', e);
        }
      };
    }
  }

  // ============================================================
  // HSTS (Strict Transport Security)
  // ============================================================
  static initHSTS() {
    // HSTS is set via HTTP headers, but we can enforce via JS as fallback
    if (location.protocol === 'https:') {
      // Ensure all resources load over HTTPS
      document.querySelectorAll('a[href^="http:"], img[src^="http:"], script[src^="http:"], link[href^="http:"], iframe[src^="http:"]').forEach(el => {
        const attr = el.tagName === 'A' ? 'href' : 
                     el.tagName === 'IMG' ? 'src' : 
                     el.tagName === 'SCRIPT' ? 'src' : 'href';
        const href = el.getAttribute(attr);
        if (href && href.startsWith('http:')) {
          el.setAttribute(attr, href.replace('http:', 'https:'));
        }
      });
    }
  }

  // ============================================================
  // PERMISSIONS POLICY
  // ============================================================
  static initPermissionsPolicy() {
    // Permissions Policy is set via HTTP headers
    // This is a fallback via meta tag
    const permissionsPolicy = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
      'payment=()',
      'usb=()',
      'bluetooth=()',
      'nfc=()',
      'serial=()',
      'hid=()',
      'clipboard-read=()',
      'clipboard-write=()',
      'picture-in-picture=()',
      'fullscreen=(self)',
      'sync-xhr=()'
    ].join(', ');

    let meta = document.querySelector('meta[http-equiv="Permissions-Policy"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.httpEquiv = 'Permissions-Policy';
      document.head.appendChild(meta);
    }
    meta.content = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
      'payment=()',
      'usb=()',
      'bluetooth=()',
      'nfc=()',
      'serial=()',
      'hid=()',
      'clipboard-read=()',
      'clipboard-write=()',
      'picture-in-picture=()',
      'fullscreen=(self)',
      'sync-xhr=()'
    ].join(', ');
  }

  // ============================================================
  // COOKIE CONSENT (GDPR/ePrivacy)
  // ============================================================
  static initCookieConsent() {
    // Check if consent already given
    const consent = localStorage.getItem('dalli_cookie_consent');
    if (consent) {
      this.applyConsent(JSON.parse(consent));
      return;
    }

    // Show consent banner after delay
    setTimeout(() => {
      this.showCookieBanner();
    }, 3000);
  }

  static showCookieBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookieConsent';
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'cookieTitle');
    banner.setAttribute('aria-describedby', 'cookieDesc');
    banner.innerHTML = `
      <div class="cookie-content">
        <h3 id="cookieTitle">Vaša privatnost je važna</h3>
        <p id="cookieDesc">Koristimo kolačiće za poboljšanje iskustva, analitiku i personalizaciju reklama. Prihvatanjem slažete se sa našom <a href="/privatnost.html">Politikom privatnosti</a> i <a href="/kolacici.html">Politikom kolačića</a>.</p>
        <div class="cookie-actions">
          <button class="btn btn-secondary" id="cookieReject">Odbij sve</button>
          <button class="btn btn-primary" id="cookieAccept">Prihvati sve</button>
          <button class="btn btn-ghost" id="cookieSettings">Podešavanja</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => {
      banner.classList.add('open');
    });

    // Event listeners
    document.getElementById('cookieAccept').addEventListener('click', () => {
      this.acceptAllCookies();
    });

    document.getElementById('cookieReject').addEventListener('click', () => {
      this.rejectAllCookies();
    });

    document.getElementById('cookieSettings').addEventListener('click', () => {
      this.openCookieSettings();
    });
  }

  static acceptAllCookies() {
    const consent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
      timestamp: Date.now()
    };
    this.saveConsent(consent);
    this.applyConsent(consent);
    this.hideCookieBanner();
    this.enableTracking();
  }

  static rejectAllCookies() {
    const consent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: Date.now()
    };
    this.saveConsent(consent);
    this.applyConsent(consent);
    this.hideCookieBanner();
    this.disableNonEssentialTracking();
  }

  static openCookieSettings() {
    // Create settings modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal-modern" style="max-width: 500px;">
        <div class="modal-header">
          <h3>Postavke kolačića</h3>
          <button class="modal-close" aria-label="Zatvori">&times;</button>
        </div>
        <div class="modal-body">
          <div class="cookie-setting">
            <label class="switch-label">
              <input type="checkbox" id="consent-necessary" checked disabled>
              <span class="switch-track"><span class="switch-thumb"></span></span>
              <span>Neophodni (obavezni)</span>
            </label>
            <small>Neophodni za rad sajta. Ne mogu se isključiti.</small>
          </div>
          <div class="cookie-setting">
            <label class="switch-label">
              <input type="checkbox" id="consent-analytics" checked>
              <span class="switch-track"><span class="switch-thumb"></span></span>
              <span>Analitika</span>
            </label>
            <small>Pomažu nam da razumemo kako posetioci koriste sajt.</small>
          </div>
          <div class="cookie-setting">
            <label class="switch-label">
              <input type="checkbox" id="consent-marketing" checked>
              <span class="switch-track"><span class="switch-thumb"></span></span>
              <span>Marketing i reklame</span>
            </label>
            <small>Omogućavaju personalizovane oglase i reklame.</small>
          </div>
          <div class="cookie-setting">
            <label class="switch-label">
              <input type="checkbox" id="consent-preferences" checked>
              <span class="switch-track"><span class="switch-thumb"></span></span>
              <span>Postavke</span>
            </label>
            <small>Zapamćavaju vaše preferencije (jezik, valuta, tema).</small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary btn-block" id="saveConsent">Sačuvaj postavke</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => this.closeCookieSettings(modal));
    modal.querySelector('#saveConsent').addEventListener('click', () => this.saveCustomConsent(modal));

    // Focus trap
    this.trapFocus(modal);
  }

  static saveConsent(consent) {
    localStorage.setItem('dalli_cookie_consent', JSON.stringify(consent));
    this.applyConsent(consent);
  }

  static saveCustomConsent(modal) {
    const consent = {
      necessary: true,
      analytics: modal.querySelector('#consent-analytics').checked,
      marketing: modal.querySelector('#consent-marketing').checked,
      preferences: modal.querySelector('#consent-preferences').checked,
      timestamp: Date.now()
    };
    this.saveConsent(consent);
    this.closeCookieSettings(modal);
    window.showToast?.('Postavke sačuvane', 'success');
  }

  static applyConsent(consent) {
    // Apply analytics consent
    if (consent.analytics) {
      this.enableAnalytics();
    } else {
      this.disableAnalytics();
    }

    // Apply marketing consent
    if (consent.marketing) {
      this.enableMarketing();
    } else {
      this.disableMarketing();
    }

    // Apply preferences
    if (consent.preferences) {
      this.enablePreferences();
    } else {
      this.disablePreferences();
    }

    // Update Consent Mode v2
    if (window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage: consent.marketing ? 'granted' : 'denied',
        analytics_storage: consent.analytics ? 'granted' : 'denied',
        ad_user_data: consent.marketing ? 'granted' : 'denied',
        ad_personalization: consent.marketing ? 'granted' : 'denied',
        functionality_storage: consent.preferences ? 'granted' : 'denied',
        security_storage: 'granted'
      });
    }
  }

  static enableTracking() {
    this.enableAnalytics();
    this.enableMarketing();
    this.enablePreferences();
  }

  static disableNonEssentialTracking() {
    this.disableAnalytics();
    this.disableMarketing();
    this.disablePreferences();
  }

  static enableAnalytics() {
    // Enable GA4
    if (window.gtag) {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    // Re-enable GA4 scripts
    document.querySelectorAll('script[data-analytics]').forEach(script => {
      if (script.src) {
        const newScript = document.createElement('script');
        newScript.src = script.src;
        newScript.async = script.async;
        document.head.appendChild(newScript);
      }
    });
  }

  static disableAnalytics() {
    if (window.gtag) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  }

  static enableMarketing() {
    if (window.gtag) {
      window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
    }
  }

  static disableMarketing() {
    if (window.gtag) {
      window.gtag('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    }
  }

  static enablePreferences() {
    if (window.gtag) {
      window.gtag('consent', 'update', { functionality_storage: 'granted' });
    }
  }

  static disablePreferences() {
    if (window.gtag) {
      window.gtag('consent', 'update', { functionality_storage: 'denied' });
    }
  }

  static hideCookieBanner() {
    const banner = document.getElementById('cookieConsent');
    if (banner) {
      banner.classList.remove('open');
      setTimeout(() => banner.remove(), 300);
    }
  }

  static closeCookieSettings(modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
    document.body.style.overflow = '';
  }

  static closeCookieSettings(modal) {
    modal.classList.remove('open');
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = '';
    }, 300);
  }

  // ============================================================
  // GDPR COMPLIANCE
  // ============================================================
  static initGDPRCompliance() {
    // Data subject rights
    this.initDataSubjectRights();
    
    // Data processing records
    this.initDataProcessingRecords();
    
    // Data retention
    this.initDataRetention();
    
    // Data breach notification
    this.initDataBreachNotification();
  }

  static initDataSubjectRights() {
    // Right to access
    window.requestDataAccess = async () => {
      try {
        const response = await fetch('/api/gdpr/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        const data = await response.json();
        return data;
      } catch (e) {
        console.error('Data access request failed:', e);
      }
    };

    // Right to rectification
    window.requestDataRectification = async (data) => {
      try {
        const response = await fetch('/api/gdpr/rectify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include'
        });
        return response.json();
      } catch (e) {
        console.error('Rectification request failed:', e);
      }
    };

    // Right to erasure (Right to be forgotten)
    window.requestDataErasure = async () => {
      try {
        const response = await fetch('/api/gdpr/erase', {
          method: 'DELETE',
          credentials: 'include'
        });
        return response.json();
      } catch (e) {
        console.error('Erasure request failed:', e);
      }
    };

    // Right to data portability
    window.requestDataPortability = async () => {
      try {
        const response = await fetch('/api/gdpr/portability', {
          method: 'GET',
          credentials: 'include'
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dalli-data-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Portability request failed:', e);
      }
    };

    // Right to restriction of processing
    window.requestRestriction = async () => {
      try {
        const response = await fetch('/api/gdpr/restrict', {
          method: 'POST',
          credentials: 'include'
        });
        return response.json();
      } catch (e) {
        console.error('Restriction request failed:', e);
      }
    };

    // Right to object
    window.requestObjection = async () => {
      try {
        const response = await fetch('/api/gdpr/object', {
          method: 'POST',
          credentials: 'include'
        });
        return response.json();
      } catch (e) {
        console.error('Objection request failed:', e);
      }
    };
  }

  static initDataProcessingRecords() {
    // Record processing activities
    window.recordProcessingActivity = (activity) => {
      const activities = JSON.parse(localStorage.getItem('dalli_processing_activities') || '[]');
      activities.push({
        ...activity,
        timestamp: Date.now(),
        id: Date.now().toString()
      });
      localStorage.setItem('dalli_processing_activities', JSON.stringify(activities));
    };
  }

  static initDataRetention() {
    // Auto-delete old data
    const retentionPolicies = {
      analytics: 365 * 24 * 60 * 60 * 1000, // 1 year
      marketing: 180 * 24 * 60 * 60 * 1000, // 6 months
      preferences: 365 * 24 * 60 * 60 * 1000, // 1 year
      cart: 30 * 24 * 60 * 60 * 1000, // 30 days
      session: 24 * 60 * 60 * 1000 // 24 hours
    };

    // Clean up old data periodically
    const cleanupRetention = () => {
      const now = Date.now();
      Object.entries(retentionPolicies).forEach(([key, maxAge]) => {
        const data = localStorage.getItem(`dalli_${key}`);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(item => now - (item.timestamp || 0) < maxAge);
              localStorage.setItem(`dalli_${key}`, JSON.stringify(filtered));
            } else if (parsed.timestamp && now - parsed.timestamp > maxAge) {
              localStorage.removeItem(`dalli_${key}`);
            }
          } catch (e) {}
        }
      });
    };
    setInterval(cleanupRetention, 24 * 60 * 60 * 1000); // Daily
  }

  static initDataBreachNotification() {
    // Data breach detection
    window.reportDataBreach = async (breachDetails) => {
      try {
        await fetch('/api/gdpr/breach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(breachDetails),
          credentials: 'include'
        });
      } catch (e) {
        console.error('Breach reporting failed:', e);
      }
    };
  }

  // ============================================================
  // SUBRESOURCE INTEGRITY (SRI)
  // ============================================================
  static initSubresourceIntegrity() {
    // Add integrity attributes to external resources
    document.querySelectorAll('script[src], link[rel="stylesheet"]').forEach(el => {
      if (el.hasAttribute('integrity')) return;
      
      // For external resources, we'd ideally have pre-computed hashes
      // This is a placeholder for build-time SRI generation
      if (el.src && el.src.startsWith('https://cdn.')) {
        // In production, these would be pre-computed at build time
        // el.integrity = 'sha384-...';
        // el.crossOrigin = 'anonymous';
      }
    });
  }

  // ============================================================
  // TRUSTED TYPES
  // ============================================================
  static initTrustedTypes() {
    if (window.trustedTypes) {
      try {
        window.trustedTypes.createPolicy('dalli', {
          createHTML: (string) => string,
          createScript: (string) => string,
          createScriptURL: (url) => url,
          createHTML: (string) => string
        });
      } catch (e) {
        // Policy already exists
      }
    }
  }

  // ============================================================
  // SECURITY MONITORING
  // ============================================================
  static initSecurityMonitoring() {
    // XSS detection
    document.addEventListener('securitypolicyviolation', (e) => {
      this.reportSecurityViolation({
        type: 'CSP_VIOLATION',
        directive: e.violatedDirective,
        blockedURI: e.blockedURI,
        lineNumber: e.lineNumber,
        columnNumber: e.columnNumber,
        sourceFile: e.sourceFile
      });
    });

    // XSS detection via DOM monitoring
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
              if (!node.hasAttribute('data-allowed')) {
                console.warn('Unauthorized script injection detected:', node);
                node.remove();
              }
            }
            if (node.nodeType === 1 && node.hasAttribute('onerror')) {
              console.warn('Inline event handler detected:', node);
              node.removeAttribute('onerror');
            }
          });
        }
        });
      });
    observer.observe(document.body, { childList: true, subtree: true });

    // Clickjacking protection
    if (window.top !== window.self) {
      document.body.style.display = 'none';
      window.top.location = window.location;
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================
  static reportCSPViolation(e) {
    const report = {
      'csp-report': {
        'document-uri': e.documentURI,
        'referrer': e.referrer,
        'violated-directive': e.violatedDirective,
        'effective-directive': e.effectiveDirective,
        'original-policy': e.originalPolicy,
        'disposition': e.disposition,
        'blocked-uri': e.blockedURI,
        'line-number': e.lineNumber,
        'column-number': e.columnNumber,
        'source-file': e.sourceFile,
        'status-code': e.statusCode,
        'script-sample': e.sample
      }
    };

    fetch('/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'csp-report': report }),
      credentials: 'include'
    }).catch(() => {});
  }

  static init() {
    this.initCSP();
    this.initHSTS();
    this.initPermissionsPolicy();
    this.initCookieConsent();
    this.initGDPRCompliance();
    this.initCSPReporting();
    this.initSecurityHeaders();
    this.initSubresourceIntegrity();
    this.initTrustedTypes();
    this.initSecurityMonitoring();
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SecurityCompliance.init());
} else {
  SecurityCompliance.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityCompliance };
}

if (typeof window !== 'undefined') {
  window.SecurityCompliance = SecurityCompliance;
}