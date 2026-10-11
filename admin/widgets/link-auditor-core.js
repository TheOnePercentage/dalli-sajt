(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // LINK AUDITOR CORE - Step 1: Scan Pages
  // ============================================

  const EXCLUDED_PATHS = [
    '/admin/',
    '/admin-new/',
    '/.git/',
    '/node_modules/',
    '/netlify/',
    '/scripts/',
    '/images/',
    '/css/',
    '/js/',
    '/fonts/',
    '/api/',
    '/.netlify/',
  ];

  const EXCLUDED_EXTENSIONS = [
    '.css', '.js', '.json', '.xml', '.txt', '.md',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
    '.woff', '.woff2', '.ttf', '.eot',
    '.pdf', '.zip', '.gz',
  ];

  function isValidInternalUrl(url, baseUrl) {
    try {
      const parsed = new URL(url, baseUrl);
      // Must be same origin
      if (parsed.origin !== new URL(baseUrl).origin) return false;
      // Must be HTML page
      const pathname = parsed.pathname.toLowerCase();
      if (EXCLUDED_EXTENSIONS.some(ext => pathname.endsWith(ext))) return false;
      // Exclude admin paths
      if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) return false;
      // Exclude fragments only
      if (pathname === '' || pathname === '/') return true;
      return true;
    } catch {
      return false;
    }
  }

  function normalizeUrl(url, baseUrl) {
    try {
      const parsed = new URL(url, baseUrl);
      // Remove hash, normalize path
      parsed.hash = '';
      // Remove trailing slash except root
      if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  function extractLinksFromHtml(html, baseUrl) {
    const links = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract all <a> tags
    const anchors = doc.querySelectorAll('a[href]');
    anchors.forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;

      const normalized = normalizeUrl(href, baseUrl);
      if (!normalized) return;

      const isInternal = isValidInternalUrl(normalized, baseUrl);

      links.push({
        sourceUrl: baseUrl,
        targetUrl: normalized,
        anchorText: a.textContent?.trim() || '',
        title: a.getAttribute('title') || '',
        rel: a.getAttribute('rel') || '',
        isInternal,
        isExternal: !isInternal,
        lineNumber: getLineNumber(html, a.outerHTML),
      });
    });

    // Extract canonical
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical) {
      links.push({
        sourceUrl: baseUrl,
        targetUrl: normalizeUrl(canonical.getAttribute('href'), baseUrl),
        type: 'canonical',
        isInternal: true,
      });
    }

    // Extract hreflang
    const hreflangs = doc.querySelectorAll('link[rel="alternate"][hreflang]');
    hreflangs.forEach(link => {
      links.push({
        sourceUrl: baseUrl,
        targetUrl: normalizeUrl(link.getAttribute('href'), baseUrl),
        type: 'hreflang',
        hreflang: link.getAttribute('hreflang'),
        isInternal: true,
      });
    });

    return links;
  }

  function getLineNumber(html, searchString) {
    const index = html.indexOf(searchString);
    if (index === -1) return null;
    return html.substring(0, index).split('\n').length;
  }

  function getPageContent(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    return {
      title: doc.querySelector('title')?.textContent?.trim() || '',
      h1: doc.querySelector('h1')?.textContent?.trim() || '',
      metaDescription: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      keywords: doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
      ogTitle: doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
      ogDescription: doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
      canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      wordCount: (doc.body?.textContent || '').split(/\s+/).filter(w => w.length > 2).length,
      headings: Array.from(doc.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim() || ''),
    };
  }

  async function scanAllPages(baseUrl = window.location.origin) {
    const results = {
      pages: new Map(),
      links: [],
      errors: [],
      scanTime: Date.now(),
      baseUrl,
    };

    // Get all HTML files from the project
    // In Netlify CMS context, we can't directly read filesystem
    // So we'll use a pre-generated manifest or fetch known pages
    const knownPages = await getKnownPages(baseUrl);

    for (const pageUrl of knownPages) {
      try {
        const response = await fetch(pageUrl, { credentials: 'same-origin' });
        if (!response.ok) {
          results.errors.push({ url: pageUrl, error: `HTTP ${response.status}` });
          continue;
        }
        const html = await response.text();
        const pageLinks = extractLinksFromHtml(html, pageUrl);
        const content = getPageContent(html);

        results.pages.set(pageUrl, {
          url: pageUrl,
          title: content.title,
          h1: content.h1,
          metaDescription: content.metaDescription,
          wordCount: content.wordCount,
          headings: content.headings,
          outboundLinks: pageLinks.filter(l => l.isInternal).length,
          inboundLinks: 0, // Will be calculated after
          links: pageLinks,
          lastScanned: Date.now(),
        });

        results.links.push(...pageLinks);
      } catch (err) {
        results.errors.push({ url: pageUrl, error: err.message });
      }
    }

    // Calculate inbound links
    calculateInboundLinks(results);

    return results;
  }

  function calculateInboundLinks(results) {
    // Reset
    results.pages.forEach(page => page.inboundLinks = 0);

    // Count internal links pointing to each page
    results.links.forEach(link => {
      if (link.isInternal && results.pages.has(link.targetUrl)) {
        const targetPage = results.pages.get(link.targetUrl);
        targetPage.inboundLinks++;
      }
    });
  }

  async function getKnownPages(baseUrl) {
    // Try to get from sitemap first
    try {
      const sitemapUrl = `${baseUrl}/sitemap.xml`;
      const response = await fetch(sitemapUrl);
      if (response.ok) {
        const xml = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const urls = Array.from(doc.querySelectorAll('url > loc'))
          .map(el => el.textContent.trim())
          .filter(u => isValidInternalUrl(u, baseUrl));
        if (urls.length > 0) return urls;
      }
    } catch {}

    // Fallback: known pages for DALLI
    const knownPaths = [
      '/',
      '/index.html',
      '/products.html',
      '/casual/men',
      '/casual/women',
      '/elegance/men',
      '/elegance/women',
      '/cart.html',
      '/checkout.html',
      '/complaints.html',
      '/advertising.html',
      '/admin-login.html',
      // Product pages - will be discovered via links
    ];

    return knownPaths.map(p => `${baseUrl}${p}`);
  }

  // Export for use by other modules
  window.NC_LinkAuditorCore = {
    scanAllPages,
    extractLinksFromHtml,
    getPageContent,
    normalizeUrl,
    isValidInternalUrl,
    calculateInboundLinks,
    getKnownPages,
  };

})();