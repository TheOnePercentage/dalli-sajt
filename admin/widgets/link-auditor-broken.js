(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // LINK AUDITOR - Step 3: Broken Links Detection
  // ============================================

  const BROKEN_LINK_CACHE = new Map(); // Cache results to avoid re-checking
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Common external domains to check
  const KNOWN_EXTERNAL_DOMAINS = [
    'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com',
    'youtube.com', 'google.com', 'maps.google.com',
    'github.com', 'netlify.com', 'netlify.app',
  ];

  function isExternalUrl(url, baseUrl) {
    try {
      return new URL(url, baseUrl).origin !== new URL(baseUrl).origin;
    } catch {
      return false;
    }
  }

  function isMalformedUrl(url) {
    // Check for common malformed patterns
    const malformedPatterns = [
      /^https?:\/\/\s/,           // whitespace after protocol
      /^https?:\/\/[^/]*\s/,      // whitespace in domain
      /^javascript:/i,            // javascript: links
      /^mailto:/i,                // mailto: (not broken, but not HTTP)
      /^tel:/i,                   // tel: (not HTTP)
      /^#/,                       // anchor only
      /^\/\//,                    // protocol-relative (may be intentional)
    ];
    return malformedPatterns.some(p => p.test(url));
  }

  async function checkUrlStatus(url, options = {}) {
    const { timeout = 10000, method = 'HEAD', allowRedirects = true } = options;

    // Check cache first
    const cached = BROKEN_LINK_CACHE.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.result;
    }

    // Skip malformed
    if (isMalformedUrl(url)) {
      return { url, status: 'malformed', error: 'Malformed URL', isBroken: true };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        credentials: 'omit',
        redirect: allowRedirects ? 'follow' : 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'DALLI Link Auditor/1.0',
        },
      });

      clearTimeout(timeoutId);

      const isBroken = response.status >= 400;
      let error = null;

      if (response.status === 404) error = '404 Not Found';
      else if (response.status === 403) error = '403 Forbidden';
      else if (response.status === 500) error = '500 Server Error';
      else if (response.status >= 400) error = `HTTP ${response.status}`;

      const result = {
        url,
        status: response.status,
        statusText: response.statusText,
        isBroken,
        error,
        contentType: response.headers.get('content-type'),
        redirected: response.redirected,
        finalUrl: response.url,
        checkedAt: Date.now(),
      };

      // Cache result
      BROKEN_LINK_CACHE.set(url, { result, timestamp: Date.now() });

      return result;
    } catch (err) {
      let error = err.message;
      let type = 'network_error';

      if (err.name === 'AbortError') {
        error = 'Timeout';
        type = 'timeout';
      } else if (err.name === 'TypeError' && err.message.includes('CORS')) {
        error = 'CORS blocked';
        type = 'cors';
      } else if (err.message.includes('Failed to fetch')) {
        error = 'Network error / DNS';
        type = 'dns';
      }

      const result = {
        url,
        status: 0,
        isBroken: true,
        error,
        errorType: type,
        checkedAt: Date.now(),
      };

      BROKEN_LINK_CACHE.set(url, { result, timestamp: Date.now() });

      return result;
    }
  }

  async function detectBrokenLinks(scanResults, options = {}) {
    const { checkExternal = true, checkInternal = true, concurrency = 5 } = options;
    const allLinks = scanResults.links || [];
    const pages = scanResults.pages || new Map();
    const baseUrl = scanResults.baseUrl;

    const brokenLinks = [];
    const checkedUrls = new Set();

    // Group links by URL to avoid duplicate checks
    const uniqueLinks = new Map();
    allLinks.forEach(link => {
      const key = link.targetUrl || link.url;
      if (!uniqueLinks.has(key)) {
        uniqueLinks.set(key, []);
      }
      uniqueLinks.get(key).push(link);
    });

    const urlsToCheck = Array.from(uniqueLinks.keys())
      .filter(url => {
        if (!checkInternal && !isExternalUrl(url, baseUrl)) return false;
        if (!checkExternal && isExternalUrl(url, baseUrl)) return false;
        return true;
      });

    // Process in batches for concurrency control
    for (let i = 0; i < urlsToCheck.length; i += concurrency) {
      const batch = urlsToCheck.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(url => checkUrlStatus(url))
      );

      results.forEach((result, idx) => {
        const url = batch[idx];
        if (result.status === 'fulfilled' && result.value.isBroken) {
          const occurrences = uniqueLinks.get(url) || [];
          brokenLinks.push({
            url: result.value.url,
            status: result.value.status,
            error: result.value.error,
            errorType: result.value.errorType,
            occurrences: occurrences.map(occ => ({
              sourceUrl: occ.sourceUrl,
              anchorText: occ.anchorText,
              lineNumber: occ.lineNumber,
              rel: occ.rel,
              type: occ.type || 'link',
            })),
            isExternal: isExternalUrl(url, baseUrl),
            checkedAt: result.value.checkedAt,
          });
        } else if (result.status === 'rejected') {
          // Network error
          brokenLinks.push({
            url,
            status: 0,
            error: result.reason?.message || 'Unknown error',
            errorType: 'network_error',
            occurrences: (uniqueLinks.get(url) || []).map(occ => ({
              sourceUrl: occ.sourceUrl,
              anchorText: occ.anchorText,
              lineNumber: occ.lineNumber,
            })),
            isExternal: isExternalUrl(url, baseUrl),
            checkedAt: Date.now(),
          });
        }
      });
    }

    // Classify broken links
    brokenLinks.forEach(link => {
      link.severity = classifyBrokenLinkSeverity(link, pages);
      link.suggestedFix = generateBrokenLinkFix(link, pages);
    });

    // Sort by severity and occurrence count
    brokenLinks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.occurrences.length - a.occurrences.length;
    });

    return brokenLinks;
  }

  function classifyBrokenLinkSeverity(link, pages) {
    const occurrences = link.occurrences?.length || 1;
    const isExternal = link.isExternal;
    const isInternal = !isExternal;

    // Critical: Internal 404 on high-traffic page
    if (isInternal && link.status === 404 && occurrences > 3) return 'critical';
    if (isInternal && link.status === 404) return 'high';

    // High: External 404 on important page (navigation, footer)
    if (isExternal && link.status === 404 && occurrences > 2) return 'high';
    if (isExternal && link.status === 404) return 'medium';

    // Medium: Server errors, timeouts
    if (link.status >= 500) return 'high';
    if (link.errorType === 'timeout' || link.errorType === 'dns') return 'medium';

    // Low: CORS blocked, 403 on external
    if (link.errorType === 'cors' || link.status === 403) return 'low';

    return 'medium';
  }

  function generateBrokenLinkFix(link, pages) {
    const isExternal = link.isExternal;
    const occurrences = link.occurrences || [];
    const sourcePages = occurrences.map(o => o.sourceUrl).filter(Boolean);

    const fixes = [];

    if (isExternal) {
      if (link.status === 404) {
        fixes.push('Proveri da li stranica još postoji - možda je premještena');
        fixes.push('Zameni sa aktuelnim URL-om ili ukloni link');
      }
      if (link.errorType === 'cors') {
        fixes.push('Eksterni sajt blokira proveru - proveri ručno u browseru');
      }
      if (link.errorType === 'timeout') {
        fixes.push('Sajt je spor ili neodgovoran - proveri da li je online');
      }
    } else {
      // Internal broken link
      fixes.push('Ciljni fajl ne postoji - proveri putanju');
      if (link.status === 404) {
        fixes.push('Mogući razlozi: fajl premešten, preimenovan ili obrisan');
      }
      fixes.push(`Link se pojavljuje na ${occurrences.length} mesta - fiksiraj sve`);
    }

    // Suggest redirect for internal 404s
    if (isInternal && link.status === 404) {
      fixes.push('Dodaj 301 redirect na novu stranicu u .htaccess / Netlify redirects');
    }

    return fixes.join(' | ');
  }

  function getBrokenLinkStats(brokenLinks) {
    return {
      total: brokenLinks.length,
      internal: brokenLinks.filter(l => !l.isExternal).length,
      external: brokenLinks.filter(l => l.isExternal).length,
      critical: brokenLinks.filter(l => l.severity === 'critical').length,
      high: brokenLinks.filter(l => l.severity === 'high').length,
      medium: brokenLinks.filter(l => l.severity === 'medium').length,
      low: brokenLinks.filter(l => l.severity === 'low').length,
      byStatus: {
        '404': brokenLinks.filter(l => l.status === 404).length,
        '500': brokenLinks.filter(l => l.status >= 500).length,
        'timeout': brokenLinks.filter(l => l.errorType === 'timeout').length,
        'cors': brokenLinks.filter(l => l.errorType === 'cors').length,
        'dns': brokenLinks.filter(l => l.errorType === 'dns').length,
        'malformed': brokenLinks.filter(l => l.errorType === 'malformed').length,
      },
    };
  }

  // Export
  window.NC_LinkAuditorBroken = {
    detectBrokenLinks,
    checkUrlStatus,
    getBrokenLinkStats,
    classifyBrokenLinkSeverity,
    generateBrokenLinkFix,
    BROKEN_LINK_CACHE,
  };

})();