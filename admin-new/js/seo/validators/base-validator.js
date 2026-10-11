/**
 * Base SEO Validator - Abstract base class for all SEO validators
 * Provides common interface and utilities for validation
 */

export class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.infos = [];
    this.passed = [];
    this.metadata = {};
  }

  addError(message, details = {}) {
    this.errors.push({ message, details, timestamp: Date.now() });
  }

  addWarning(message, details = {}) {
    this.warnings.push({ message, details, timestamp: Date.now() });
  }

  addInfo(message, details = {}) {
    this.infos.push({ message, details, timestamp: Date.now() });
  }

  addPassed(message, details = {}) {
    this.passed.push({ message, details, timestamp: Date.now() });
  }

  get hasErrors() {
    return this.errors.length > 0;
  }

  get hasWarnings() {
    return this.warnings.length > 0;
  }

  get issueCount() {
    return this.errors.length + this.warnings.length;
  }

  get severity() {
    if (this.hasErrors) return 'critical';
    if (this.hasWarnings) return 'warning';
    return 'passed';
  }

  merge(other) {
    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
    this.infos.push(...other.infos);
    this.passed.push(...other.passed);
    return this;
  }

  toJSON() {
    return {
      errors: this.errors,
      warnings: this.warnings,
      infos: this.infos,
      passed: this.passed,
      severity: this.severity,
      issueCount: this.issueCount,
      metadata: this.metadata
    };
  }
}

export class ValidatorConfig {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.severity = options.severity || 'warning';
    this.thresholds = options.thresholds || {};
    this.customRules = options.customRules || [];
  }
}

export class BaseValidator {
  constructor(config = {}) {
    this.config = new ValidatorConfig(config);
    const className = this.constructor?.name || 'UnknownValidator';
    this.name = className.replace('Validator', '').toLowerCase() || 'unknown';
    this.version = '1.0.0';
  }

  /**
   * Main validation entry point - must be implemented by subclasses
   * @param {Document|string} html - HTML document or string to validate
   * @param {string} url - URL of the page being validated
   * @param {Object} context - Additional context (crawler data, previous results, etc.)
   * @returns {Promise<ValidationResult>}
   */
  async validate(html, url, context = {}) {
    if (!this.config.enabled) {
      const result = new ValidationResult();
      result.addInfo(`${this.name} validator is disabled`);
      return result;
    }

    const document = this.parseHTML(html);
    return this.runValidation(document, url, context);
  }

  /**
   * Core validation logic - must be implemented by subclasses
   * @param {Document} document - Parsed HTML document
   * @param {string} url - Page URL
   * @param {Object} context - Additional context
   * @returns {Promise<ValidationResult>}
   */
  async runValidation(document, url, context) {
    throw new Error(`runValidation() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Parse HTML string or return Document as-is
   * @param {Document|string} html
   * @returns {Document}
   */
  parseHTML(html) {
    if (html instanceof Document) {
      return html;
    }
    if (typeof html === 'string') {
      const parser = new DOMParser();
      return parser.parseFromString(html, 'text/html');
    }
    throw new Error('Invalid HTML input: must be Document or string');
  }

  /**
   * Safely query selector with error handling
   * @param {Document|Element} root
   * @param {string} selector
   * @returns {Element|null}
   */
  $(root, selector) {
    try {
      return root.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  /**
   * Safely query selector all with error handling
   * @param {Document|Element} root
   * @param {string} selector
   * @returns {NodeList}
   */
  $$(root, selector) {
    try {
      return root.querySelectorAll(selector);
    } catch (e) {
      return [];
    }
  }

  /**
   * Get meta tag content by name/property
   * @param {Document} doc
   * @param {string} name - name or property attribute
   * @param {boolean} isProperty - whether to use property attribute
   * @returns {string|null}
   */
  getMetaContent(doc, name, isProperty = false) {
    const attr = isProperty ? 'property' : 'name';
    const meta = this.$(doc, `meta[${attr}="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  }

  /**
   * Get all meta tags matching name/property
   * @param {Document} doc
   * @param {string} name
   * @param {boolean} isProperty
   * @returns {Element[]}
   */
  getMetaTags(doc, name, isProperty = false) {
    const attr = isProperty ? 'property' : 'name';
    return Array.from(this.$$(doc, `meta[${attr}="${name}"]`));
  }

  /**
   * Check if URL is self-referencing
   * @param {string} canonical
   * @param {string} currentUrl
   * @returns {boolean}
   */
  isSelfReferencing(canonical, currentUrl) {
    try {
      const canonUrl = new URL(canonical, currentUrl);
      const current = new URL(currentUrl);
      return canonUrl.href === current.href;
    } catch (e) {
      return false;
    }
  }

  /**
   * Normalize URL for comparison
   * @param {string} url
   * @returns {string}
   */
  normalizeUrl(url) {
    try {
      const u = new URL(url);
      u.hash = '';
      u.search = '';
      return u.href.replace(/\/$/, '');
    } catch (e) {
      return url;
    }
  }

  /**
   * Calculate text quality score (0-100)
   * @param {string} text
   * @returns {number}
   */
  calculateTextQuality(text) {
    if (!text || !text.trim()) return 0;

    let score = 50; // Base score

    // Length scoring
    const len = text.trim().length;
    if (len >= 50 && len <= 160) score += 20;
    else if (len >= 30 && len <= 200) score += 10;
    else if (len < 30) score -= 20;
    else score -= 10;

    // Word count
    const words = text.trim().split(/\s+/).length;
    if (words >= 5 && words <= 30) score += 10;
    else if (words < 3) score -= 15;

    // Readability - sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    if (sentences >= 1 && sentences <= 3) score += 10;

    // Special characters (penalty for excessive)
    const specialChars = (text.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length;
    if (specialChars > len * 0.1) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Extract keywords from text (simple frequency-based)
   * @param {string} text
   * @param {number} maxKeywords
   * @returns {string[]}
   */
  extractKeywords(text, maxKeywords = 10) {
    if (!text) return [];

    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'among', 'this', 'that', 'these', 'those', 'i',
      'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
      'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
      'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
      'what', 'which', 'who', 'whom', 'this', 'that', 'am', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
      'would', 'should', 'could', 'ought', 'im', 'youre', 'hes', 'shes', 'its', 'were',
      'theyre', 'dont', 'doesnt', 'didnt', 'wont', 'wouldnt', 'shouldnt', 'couldnt',
      'da', 'ne', 'i', 'u', 'je', 'su', 'si', 'smo', 'ste', 'su', 'to', 'za', 'na',
      'od', 'iz', 'sa', 'po', 'o', 'koji', 'koja', 'koje', 'koji', 'kako', 'gde',
      'kada', 'zašto', 'jer', 'ali', 'ili', 'da', 'ne', 'bi', 'će', 'ću', 'ćeš', 'će'
    ]);

    return (text || '')
      .toLowerCase()
      .replace(/[^\w\sšđčćžŠĐČĆŽ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .reduce((acc, w) => {
        acc[w] = (acc[w] || 0) + 1;
        return acc;
      }, {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Get validator metadata for reporting
   * @returns {Object}
   */
  getMeta() {
    return {
      name: this.name,
      version: this.version,
      config: {
        enabled: this.config.enabled,
        severity: this.config.severity,
        thresholds: this.config.thresholds
      }
    };
  }
}

export default BaseValidator;