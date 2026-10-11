/**
 * Canonical URL Validator
 * Validates canonical tags for SEO best practices
 * Checks: presence, self-referencing, cross-domain, pagination, hreflang consistency, duplicate content
 */

import { BaseValidator, ValidationResult, ValidatorConfig } from './base-validator.js';

export class CanonicalConfig extends ValidatorConfig {
  constructor(options = {}) {
    super(options);
    this.requireCanonical = options.requireCanonical !== false;
    this.checkSelfReferencing = options.checkSelfReferencing !== false;
    this.checkCrossDomain = options.checkCrossDomain !== false;
    this.checkPagination = options.checkPagination !== false;
    this.checkHreflang = options.checkHreflang !== false;
    this.checkDuplicateContent = options.checkDuplicateContent !== false;
    this.checkHttpHeader = options.checkHttpHeader !== false;
    this.allowRelative = options.allowRelative || false;
    this.allowedDomains = options.allowedDomains || [];
    this.blockedDomains = options.blockedDomains || [];
    this.checkTrailingSlash = options.checkTrailingSlash !== false;
    this.checkWwwNonWww = options.checkWwwNonWww !== false;
    this.checkHttpHttps = options.checkHttpHttps !== false;
    this.maxCanonicalChain = options.maxCanonicalChain || 1;
  }
}

export class CanonicalValidator extends BaseValidator {
  constructor(config = {}) {
    super(new CanonicalConfig(config));
    this.name = 'canonical';
    this.results = [];
  }

  resetResults() {
    this.results = [];
  }

  getResults() {
    return this.results;
  }

  async runValidation(document, url, context = {}) {
    const result = new ValidationResult();
    result.metadata.url = url;
    result.metadata.validator = this.name;
    result.metadata.currentUrl = url;

    try {
      const currentUrlObj = new URL(url);
      result.metadata.currentUrlObj = {
        protocol: currentUrlObj.protocol,
        hostname: currentUrlObj.hostname,
        pathname: currentUrlObj.pathname,
        search: currentUrlObj.search,
        hash: currentUrlObj.hash
      };
    } catch (e) {
      result.addError('Invalid current URL', { url });
      return result;
    }

    // Extract canonical from HTML
    const htmlCanonical = this.extractHtmlCanonical(document);
    const httpHeaderCanonical = context.httpHeaderCanonical || null;
    const hreflangUrls = this.extractHreflang(document);
    const pagination = this.detectPagination(document);

    result.metadata.htmlCanonical = htmlCanonical;
    result.metadata.httpHeaderCanonical = httpHeaderCanonical;
    result.metadata.hreflangUrls = hreflangUrls;
    result.metadata.pagination = pagination;

    // Track for cross-page analysis
    this.results.push({
      url,
      htmlCanonical,
      httpHeaderCanonical,
      hreflangUrls,
      pagination
    });

    // 1. PRESENCE CHECK
    if (!htmlCanonical && !httpHeaderCanonical) {
      if (this.config.requireCanonical) {
        result.addError('No canonical URL found', {
          field: 'canonical',
          recommendation: 'Add <link rel="canonical" href="..."> to <head> or Link HTTP header.',
          impact: 'high'
        });
      } else {
        result.addWarning('No canonical URL found', {
          recommendation: 'Consider adding canonical URL for duplicate content prevention.'
        });
      }
      result.metadata.hasCanonical = false;
      return result;
    }

    result.metadata.hasCanonical = true;

    // Use HTML canonical as primary, fallback to HTTP header
    const canonicalUrl = htmlCanonical || httpHeaderCanonical;
    const canonicalSource = htmlCanonical ? 'html' : 'http-header';
    
    result.metadata.canonicalUrl = canonicalUrl;
    result.metadata.canonicalSource = canonicalSource;

    // 2. PARSE AND VALIDATE CANONICAL URL
    let canonicalUrlObj;
    try {
      canonicalUrlObj = new URL(canonicalUrl, url);
      result.metadata.canonicalUrlObj = {
        protocol: canonicalUrlObj.protocol,
        hostname: canonicalUrlObj.hostname,
        pathname: canonicalUrlObj.pathname,
        search: canonicalUrlObj.search,
        hash: canonicalUrlObj.hash
      };
    } catch (e) {
      result.addError('Invalid canonical URL format', {
        canonicalUrl,
        error: e.message,
        recommendation: 'Ensure canonical URL is a valid absolute URL.',
        impact: 'high'
      });
      result.metadata.canonicalUrlObj = null;
      return result;
    }

    result.metadata.isAbsolute = canonicalUrl.startsWith('http');
    result.metadata.isRelative = !result.metadata.isAbsolute;

    // 3. RELATIVE URL CHECK
    if (result.metadata.isRelative) {
      if (!this.config.allowRelative) {
        result.addError('Canonical URL is relative', {
          canonicalUrl,
          recommendation: 'Use absolute URLs for canonical tags (including protocol and domain).',
          impact: 'high'
        });
      } else {
        result.addWarning('Canonical URL is relative', {
          canonicalUrl,
          recommendation: 'Absolute URLs are strongly recommended for canonical tags.'
        });
      }
    }

    // 4. SELF-REFERENCING CHECK
    if (this.config.checkSelfReferencing) {
      this.validateSelfReferencing(canonicalUrlObj, result, url);
    }

    // 5. CROSS-DOMAIN CHECK
    if (this.config.checkCrossDomain) {
      this.validateCrossDomain(canonicalUrlObj, result, url);
    }

    // 6. TRAILING SLASH CONSISTENCY
    if (this.config.checkTrailingSlash) {
      this.validateTrailingSlash(canonicalUrlObj, result, url);
    }

    // 7. WWW vs NON-WWW CONSISTENCY
    if (this.config.checkWwwNonWww) {
      this.validateWwwNonWww(canonicalUrlObj, result, url);
    }

    // 8. HTTP vs HTTPS CONSISTENCY
    if (this.config.checkHttpHttps) {
      this.validateHttpHttps(canonicalUrlObj, result, url);
    }

    // 9. PAGINATION CHECK
    if (this.config.checkPagination && pagination.hasPagination) {
      this.validatePagination(pagination, canonicalUrlObj, result, url);
    }

    // 10. HREFLANG CONSISTENCY
    if (this.config.checkHreflang && hreflangUrls.length > 0) {
      this.validateHreflangConsistency(hreflangUrls, canonicalUrlObj, result, url);
    }

    // 11. CANONICAL CHAIN CHECK
    if (context.canonicalChain) {
      this.validateCanonicalChain(context.canonicalChain, result);
    }

    // 12. HTTP HEADER vs HTML CONSISTENCY
    if (htmlCanonical && httpHeaderCanonical) {
      this.validateHeaderHtmlConsistency(htmlCanonical, httpHeaderCanonical, result);
    }

    // 13. DUPLICATE CONTENT HINTS
    if (this.config.checkDuplicateContent) {
      this.checkDuplicateContentHints(document, result, url);
    }

    // Calculate score
    result.metadata.score = this.calculateScore(result);
    return result;
  }

  /**
   * Extract canonical from HTML
   * @param {Document} document
   * @returns {string|null}
   */
  extractHtmlCanonical(document) {
    // Check <link rel="canonical">
    const link = this.$(document, 'link[rel="canonical"]');
    if (link) {
      const href = link.getAttribute('href');
      if (href) return href.trim();
    }

    // Check for multiple canonicals
    const links = this.$$(document, 'link[rel="canonical"]');
    if (links.length > 1) {
      // Return first, but validation will catch multiple
    }

    return null;
  }

  /**
   * Extract hreflang URLs
   * @param {Document} document
   * @returns {Array<Object>}
   */
  extractHreflang(document) {
    const links = this.$$(document, 'link[rel="alternate"][hreflang]');
    return Array.from(links).map(link => ({
      hreflang: link.getAttribute('hreflang'),
      href: link.getAttribute('href')
    })).filter(l => l.href);
  }

  /**
   * Detect pagination elements
   * @param {Document} document
   * @returns {Object}
   */
  detectPagination(document) {
    const result = {
      hasPagination: false,
      relPrev: null,
      relNext: null,
      pageNumbers: []
    };

    const prevLink = this.$(document, 'link[rel="prev"]');
    const nextLink = this.$(document, 'link[rel="next"]');
    
    if (prevLink) result.relPrev = prevLink.getAttribute('href');
    if (nextLink) result.relNext = nextLink.getAttribute('href');
    result.hasPagination = !!prevLink || !!nextLink;

    // Check for pagination numbers
    const pageLinks = this.$$(document, 'a[href*="page="], a[href*="/page/"]');
    result.pageNumbers = Array.from(pageLinks).map(a => a.getAttribute('href')).filter(Boolean);

    return result;
  }

  validateSelfReferencing(canonicalUrlObj, result, currentUrl) {
    try {
      const currentUrlObj = new URL(url);
      const isSelfRef = this.isSelfReferencing(canonicalUrlObj.href, currentUrlObj.href);
      
      result.metadata.isSelfReferencing = isSelfRef;

      if (isSelfRef) {
        result.addPassed('Canonical is self-referencing', {
          canonicalUrl: canonicalUrlObj.href,
          currentUrl: currentUrlObj.href
        });
      } else {
        result.addWarning('Canonical points to different URL', {
          canonicalUrl: canonicalUrlObj.href,
          currentUrl: currentUrlObj.href,
          recommendation: 'For unique pages, canonical should point to itself. Only use different canonical for duplicate/consolidated content.',
          impact: 'medium'
        });
      }
    } catch (e) {
      result.addError('Error checking self-referencing', { error: e.message });
    }
  }

  validateCrossDomain(canonicalUrlObj, result, currentUrl) {
    try {
      const currentUrlObj = new URL(url);
      const canonicalHost = canonicalUrlObj.hostname.toLowerCase();
      const currentHost = currentUrlObj.hostname.toLowerCase();

      result.metadata.crossDomain = canonicalHost !== currentHost;

      if (result.metadata.crossDomain) {
        // Check allowed/blocked domains
        if (this.config.allowedDomains.length > 0) {
          const allowed = this.config.allowedDomains.some(d => canonicalHost === d.toLowerCase() || canonicalHost.endsWith('.' + d.toLowerCase()));
          if (!allowed) {
            result.addError('Canonical points to disallowed domain', {
              canonicalHost,
              allowedDomains: this.config.allowedDomains,
              recommendation: 'Canonical points to external domain not in allowed list.',
              impact: 'high'
            });
          }
        }

        if (this.config.blockedDomains.length > 0) {
          const blocked = this.config.blockedDomains.some(d => canonicalHost === d.toLowerCase() || canonicalHost.endsWith('.' + d.toLowerCase()));
          if (blocked) {
            result.addError('Canonical points to blocked domain', {
              canonicalHost,
              blockedDomains: this.config.blockedDomains,
              impact: 'critical'
            });
          }
        }

        if (!this.config.allowedDomains.length) {
          result.addWarning('Canonical points to different domain', {
            currentDomain: currentHost,
            canonicalDomain: canonicalHost,
            recommendation: 'Cross-domain canonicals are valid for syndicated content, but ensure this is intentional.',
            impact: 'medium'
          });
        }
      }
    } catch (e) {
      result.addError('Error checking cross-domain', { error: e.message });
    }
  }

  validateTrailingSlash(canonicalUrlObj, result, currentUrl) {
    try {
      const currentUrlObj = new URL(url);
      const canonicalPath = canonicalUrlObj.pathname;
      const currentPath = currentUrlObj.pathname;

      const canonicalHasSlash = canonicalPath.endsWith('/') && canonicalPath !== '/';
      const currentHasSlash = currentPath.endsWith('/') && currentPath !== '/';

      if (canonicalHasSlash !== currentHasSlash) {
        result.addWarning('Trailing slash inconsistency between canonical and current URL', {
          canonicalPath,
          currentPath,
          recommendation: 'Ensure consistent trailing slash usage. Choose one convention and apply consistently.',
          impact: 'medium'
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  validateWwwNonWww(canonicalUrlObj, result, currentUrl) {
    try {
      const currentUrlObj = new URL(url);
      const canonicalHost = canonicalUrlObj.hostname.toLowerCase();
      const currentHost = currentUrlObj.hostname.toLowerCase();

      const canonicalHasWww = canonicalHost.startsWith('www.');
      const currentHasWww = currentHost.startsWith('www.');

      if (canonicalHasWww !== currentHasWww) {
        result.addWarning('WWW/non-WWW inconsistency between canonical and current URL', {
          canonicalHost,
          currentHost,
          recommendation: 'Choose www or non-www as canonical and redirect consistently.',
          impact: 'medium'
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  validateHttpHttps(canonicalUrlObj, result, currentUrl) {
    try {
      const currentUrlObj = new URL(url);
      const canonicalProtocol = canonicalUrlObj.protocol;
      const currentProtocol = currentUrlObj.protocol;

      if (canonicalProtocol !== currentProtocol) {
        if (canonicalProtocol === 'https:' && currentProtocol === 'http:') {
          result.addPassed('Canonical correctly uses HTTPS', {
            canonicalProtocol,
            currentProtocol
          });
        } else if (canonicalProtocol === 'http:' && currentProtocol === 'https:') {
          result.addError('Canonical uses HTTP while page uses HTTPS', {
            canonicalProtocol,
            currentProtocol,
            recommendation: 'Canonical should use HTTPS when page is served over HTTPS.',
            impact: 'high'
          });
        } else {
          result.addWarning('Protocol mismatch between canonical and current URL', {
            canonicalProtocol,
            currentProtocol
          });
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  validatePagination(pagination, canonicalUrlObj, result, currentUrl) {
    try {
      const currentUrlObj = new URL(currentUrl);
      
      // Check if canonical points to first page (common pattern)
      const canonicalPath = canonicalUrlObj.pathname;
      
      // If paginated, canonical should typically point to first page or self
      if (pagination.relPrev && canonicalUrlObj.href !== currentUrl) {
        // Check if canonical points to page 1
        const isFirstPage = !currentUrlObj.search.includes('page=') && !currentUrlObj.pathname.match(/\/page\/\d+/);
        
        if (!isFirstPage) {
          result.addWarning('Paginated page canonical may not point to first page', {
            canonicalUrl: canonicalUrlObj.href,
            currentUrl,
            relPrev: pagination.relPrev,
            relNext: pagination.relNext,
            recommendation: 'For paginated series, consider pointing canonical to first page (view-all) or self-reference each page.'
          });
        }
      }

      // Check rel="prev"/"next" consistency with canonical
      if (pagination.relPrev) {
        const prevUrlObj = new URL(pagination.relPrev, url);
        if (prevUrlObj.hostname !== canonicalUrlObj.hostname) {
          result.addWarning('rel="prev" points to different domain', {
            prevUrl: pagination.relPrev,
            canonicalHost: canonicalUrlObj.hostname
          });
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  validateHreflangConsistency(hreflangUrls, canonicalUrlObj, result, currentUrl) {
    const canonicalHost = canonicalUrlObj.hostname.toLowerCase();
    const canonicalPath = canonicalUrlObj.pathname;

    hreflangUrls.forEach(hrefLang => {
      try {
        const hrefUrl = new URL(hrefLang.href, currentUrl);
        
        // Check if hreflang URLs have matching canonical structure
        if (hrefUrl.hostname.toLowerCase() !== canonicalUrlObj.hostname.toLowerCase()) {
          result.addWarning(`hreflang ${hrefLang.hreflang} points to different domain`, {
            hreflang: hrefLang.hreflang,
            href: hrefLang.href,
            canonicalHost: canonicalUrlObj.hostname
          });
        }

        // Check for x-default
        if (hrefLang.hreflang === 'x-default') {
          result.addPassed('x-default hreflang present', { href: hrefLang.href });
        }
      } catch (e) {
        result.addWarning(`Invalid hreflang URL: ${hrefLang.href}`, { error: e.message });
      }
    });

    // Check for x-default
    const hasXDefault = hreflangUrls.some(h => h.hreflang === 'x-default');
    if (!hasXDefault && hreflangUrls.length > 1) {
      result.addInfo('No x-default hreflang specified', {
        recommendation: 'Add x-default hreflang for international pages.'
      });
    }
  }

  validateCanonicalChain(canonicalChain, result) {
    if (canonicalChain.length > this.config.maxCanonicalChain) {
      result.addError(`Canonical chain too long (${canonicalChain.length} hops)`, {
        chain: canonicalChain,
        maxAllowed: this.config.maxCanonicalChain,
        recommendation: 'Canonical chains should be direct (1 hop). Avoid canonical -> canonical -> canonical.',
        impact: 'high'
      });
    }
  }

  validateHeaderHtmlConsistency(htmlCanonical, httpHeaderCanonical, result) {
    if (htmlCanonical !== httpHeaderCanonical) {
      result.addError('HTML canonical and HTTP header canonical differ', {
        htmlCanonical,
        httpHeaderCanonical,
        recommendation: 'Ensure both HTML link tag and HTTP Link header specify the same canonical URL.',
        impact: 'high'
      });
    } else {
      result.addPassed('HTML and HTTP header canonicals match', {
        canonicalUrl: htmlCanonical
      });
    }
  }

  checkDuplicateContentHints(document, result, url) {
    // Check for common duplicate content indicators
    const hints = [];

    // Check for print version links
    const printLinks = this.$$(document, 'a[href*="print"], link[rel="alternate"][media="print"]');
    if (printLinks.length > 0) {
      hints.push('Print version detected - ensure print pages have canonical to main page');
    }

    // Check for sort/filter parameters
    const sortLinks = this.$$(document, 'a[href*="sort="], a[href*="filter="], a[href*="order="]');
    if (sortLinks.length > 0) {
      hints.push('Sort/filter parameters detected - ensure canonical points to base URL without parameters');
    }

    // Check for session IDs in URLs
    const sessionLinks = this.$$(document, 'a[href*="sid="], a[href*="sessionid="], a[href*="PHPSESSID"]');
    if (sessionLinks.length > 0) {
      hints.push('Session IDs in URLs detected - ensure canonical strips session parameters');
    }

    // Check for UTM parameters
    const utmLinks = this.$$(document, 'a[href*="utm_"]');
    if (utmLinks.length > 0) {
      hints.push('UTM parameters in internal links - ensure canonical strips UTM parameters');
    }

    if (hints.length > 0) {
      hints.forEach(hint => {
        result.addInfo(hint, { type: 'duplicate-content-hint' });
      });
    }
  }

  calculateScore(result) {
    if (!result.metadata.hasCanonical) return 0;
    
    let score = 100;
    
    // Penalties
    result.errors.forEach(e => {
      score -= e.details.impact === 'critical' ? 30 : (e.details.impact === 'high' ? 20 : 10);
    });
    
    result.warnings.forEach(w => score -= 8);
    
    // Bonuses
    if (result.metadata.isSelfReferencing) score += 10;
    if (result.metadata.crossDomain === false) score += 5;
    if (!result.metadata.crossDomain) score += 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Static method for cross-page canonical analysis
   * @param {Array} allResults
   * @returns {ValidationResult}
   */
  static checkCrossPageCanonicals(allResults) {
    const consistencyResult = new ValidationResult();
    const canonicals = new Map();
    
    allResults.forEach(r => {
      if (r.metadata.validator === 'canonical' && r.metadata.canonicalUrl) {
        const canonical = r.metadata.canonicalUrl;
        if (!canonicals.has(canonical)) {
          canonicals.set(canonical, []);
        }
        canonicals.get(canonical).push({
          url: r.metadata.url,
          source: r.metadata.canonicalSource,
          isSelfRef: r.metadata.isSelfReferencing
        });
      }
    });

    // Check for canonicals shared by multiple pages (potential duplicate content)
    for (const [canonical, pages] of canonicals.entries()) {
      if (pages.length > 1) {
        const selfRefCount = pages.filter(p => p.isSelfRef).length;
        
        if (selfRefCount > 1) {
          consistencyResult.addWarning(`Multiple pages self-reference same canonical: ${canonical}`, {
            canonical,
            pages: pages.map(p => p.url),
            recommendation: 'Each unique page should have unique canonical. Multiple self-referencing same canonical indicates duplicate content.'
          });
        } else if (selfRefCount === 0) {
          consistencyResult.addWarning(`Multiple pages point to same canonical but none self-reference: ${canonical}`, {
            canonical,
            pages: pages.map(p => p.url),
            recommendation: 'One page should self-reference this canonical as the primary version.'
          });
        }
      }
    }

    // Check for canonical loops (A -> B, B -> A)
    const canonicalMap = new Map();
    allResults.forEach(r => {
      if (r.metadata.validator === 'canonical' && r.metadata.canonicalUrl) {
        canonicalMap.set(r.metadata.url, r.metadata.canonicalUrl);
      }
    });

    for (const [url, canonical] of canonicalMap.entries()) {
      if (canonicalMap.has(canonical) && canonicalMap.get(canonical) === url && url !== canonical) {
        consistencyResult.addError(`Canonical loop detected: ${url} <-> ${canonical}`, {
          url,
          canonical,
          recommendation: 'Fix canonical chain - should point directly to final canonical, not create loop.',
          impact: 'critical'
        });
      }
    }

    return consistencyResult;
  }
}

export default CanonicalValidator;