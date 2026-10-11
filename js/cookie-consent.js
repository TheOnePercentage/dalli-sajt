/**
 * Cookie Consent Management (GDPR/Privacy)
 * Handles cookie consent banner and user preferences
 */

class CookieConsent {
  constructor() {
    this.consentKey = 'dalli_cookie_consent';
    this.consent = this.loadConsent();
    this.init();
  }

  init() {
    // Check if consent already given
    if (this.consent) {
      this.applyConsent(this.consent);
      this.hideBanner();
    } else {
      this.showBanner();
    }

    // Bind events
    this.bindEvents();
  }

  loadConsent() {
    try {
      const stored = localStorage.getItem('dalli_cookie_consent');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Handle legacy string values
        if (typeof parsed === 'string') {
          return { level: parsed, timestamp: new Date().toISOString(), version: '1.0' };
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load cookie consent:', e);
      // Clear corrupted data
      localStorage.removeItem('dalli_cookie_consent');
    }
    return null;
  }

  saveConsent(consent) {
    const consentData = {
      ...consent,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem('dalli_cookie_consent', JSON.stringify(consentData));
    this.consent = consentData;
  }

  showBanner() {
    const banner = document.getElementById('cookieConsent');
    if (banner) {
      banner.classList.remove('hidden');
      // Animate in
      requestAnimationFrame(() => {
        banner.classList.add('visible');
      });
    }
  }

  hideBanner() {
    const banner = document.getElementById('cookieConsent');
    if (banner) {
      banner.classList.remove('visible');
      banner.classList.add('hidden');
    }
  }

  acceptAll() {
    const consent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
      timestamp: new Date().toISOString()
    };
    this.saveConsent(consent);
    this.applyConsent(consent);
    this.hideBanner();
    this.loadScriptsForConsent(consent);
  }

  rejectAll() {
    const consent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString()
    };
    this.saveConsent(consent);
    this.applyConsent(consent);
    this.hideBanner();
  }

  openSettings() {
    // Open settings modal
    const modal = document.createElement('div');
    modal.className = 'cookie-settings-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Postavke kolačića</h3>
          <div class="cookie-setting">
            <label>
              <input type="checkbox" checked disabled> Neophodni (obavezni)
            </label>
          </div>
          <div class="cookie-setting">
            <label>
              <input type="checkbox" id="consentAnalytics" ${this.consent?.analytics ? 'checked' : ''}>
              <span>Analitika</span>
            </label>
          </div>
          <div class="cookie-setting">
            <label>
              <input type="checkbox" id="consentMarketing" ${this.consent?.marketing ? 'checked' : ''}>
              <span>Marketing</span>
            </label>
          </div>
          <div class="cookie-setting">
            <label>
              <input type="checkbox" id="consentPreferences" ${this.consent?.preferences ? 'checked' : ''}>
              <span>Podešavanja</span>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="cookieSave">Sačuvaj</button>
            <button class="btn btn-ghost" id="cookieCancel">Otkaži</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Bind modal events
    document.getElementById('cookieSave').addEventListener('click', () => {
      const consent = {
        necessary: true,
        analytics: document.getElementById('consentAnalytics').checked,
        marketing: document.getElementById('consentMarketing').checked,
        preferences: document.getElementById('consentPreferences').checked,
        timestamp: new Date().toISOString()
      };
      this.saveConsent(this.consent);
      this.applyConsent(this.consent);
      this.loadScriptsForConsent(this.consent);
      document.querySelector('.cookie-settings-modal').remove();
    });
    
    document.getElementById('cookieCancel').addEventListener('click', () => {
      document.querySelector('.cookie-settings-modal').remove();
    });
  }

  bindEvents() {
    const rejectBtn = document.getElementById('cookieReject');
    const acceptBtn = document.getElementById('cookieAccept');
    const settingsBtn = document.getElementById('cookieSettings');

    if (rejectBtn) rejectBtn.addEventListener('click', () => this.rejectAll());
    if (acceptBtn) acceptBtn.addEventListener('click', () => this.acceptAll());
    if (settingsBtn) settingsBtn.addEventListener('click', () => this.openSettings());
  }

  applyConsent(consent) {
    // Apply consent - enable/disable scripts based on consent
    this.loadScriptsForConsent(consent);
  }

  loadScriptsForConsent(consent) {
    // Load analytics scripts if analytics consent given
    if (consent.analytics) {
      this.loadAnalyticsScripts();
    }
    if (consent.marketing) {
      this.loadMarketingScripts();
    }
  }

  loadAnalyticsScripts() {
    // Load Google Analytics, etc.
    if (window.gtag) return; // Already loaded
    
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'GA_MEASUREMENT_ID');
  }

  loadMarketingScripts() {
    // Load Facebook Pixel, TikTok Pixel, etc.
    // Implementation depends on marketing pixels used
  }

  // Method to check if consent was given for a category
  hasConsent(category) {
    const consent = this.consent;
    if (!consent) return false;
    return consent[category] === true;
  }

  // Method to revoke consent
  revokeConsent(category) {
    const consent = this.consent;
    if (consent && category in consent.consent) {
      consent.consent[category] = false;
      this.saveConsent(consent);
      this.applyConsent(consent);
    }
  }

  // Check if consent was given for a category
  hasConsent(category) {
    return this.consent && this.consent[category] === true;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.cookieConsent = new CookieConsent();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CookieConsent };
}

if (typeof window !== 'undefined') {
  window.CookieConsent = CookieConsent;
}