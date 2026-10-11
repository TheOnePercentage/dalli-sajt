(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // LINK AUDITOR - Step 4: Excessive Links Detection
  // ============================================

  // Thresholds for different page types
  const THRESHOLDS = {
    // Max internal links per page type
    homepage: 150,
    category: 100,
    product: 50,
    article: 80,
    landing: 60,
    default: 80,
  };

  // Minimum links that might indicate thin content
  const MIN_LINKS_THRESHOLD = 3;

  function detectExcessiveLinks(scanResults) {
    const pages = scanResults.pages || new Map();
    const excessivePages = [];

    pages.forEach((page, url) => {
      const internalLinkCount = page.outboundLinks || 0;
      const pageType = detectPageType(url, page);

      // Get threshold for this page type
      const threshold = THRESHOLDS[pageType] || THRESHOLDS.default;

      // Check for excessive links
      if (internalLinkCount > threshold) {
        excessivePages.push({
          url,
          title: page.title || 'Bez naslova',
          pageType,
          internalLinkCount,
          threshold,
          excess: internalLinkCount - threshold,
          severity: calculateExcessSeverity(internalLinkCount, threshold),
          linkDensity: calculateLinkDensity(page),
          suggestedFix: generateExcessiveLinksFix(page, pageType, threshold),
        });
      }

      // Check for too few links (thin content / dead ends)
      if (internalLinkCount < MIN_LINKS_THRESHOLD && page.wordCount > 300) {
        excessivePages.push({
          url,
          title: page.title || 'Bez naslova',
          pageType,
          internalLinkCount,
          threshold: MIN_LINKS_THRESHOLD,
          issue: 'too_few_links',
          severity: internalLinkCount === 0 ? 'high' : 'medium',
          suggestedFix: 'Dodaj relevantne unutrašnje linkove (minimum 3-5 za stranice sa sadržajem)',
        });
      }
    });

    // Sort by severity then by excess count
    excessivePages.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const sevDiff = (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
      if (sevDiff !== 0) return sevDiff;
      return (b.excess || 0) - (a.excess || 0);
    });

    return excessivePages;
  }

  function detectPageType(url, page) {
    const pathname = new URL(url).pathname.toLowerCase();

    if (pathname === '/' || pathname === '/index.html') return 'homepage';
    if (pathname.includes('/products') || pathname.includes('/casual/men') ||
        pathname.includes('/casual/women') || pathname.includes('/elegance/men') ||
        pathname.includes('/elegance/women')) return 'category';
    if (pathname.includes('/proizvod-') || pathname.includes('/product-') || pathname.includes('/casual/') || pathname.includes('/elegance/')) return 'product';
    if (pathname.includes('/blog') || pathname.includes('/article') || pathname.includes('/news')) return 'article';
    if (pathname.includes('/landing') || pathname.includes('/kampanja') || pathname.includes('/promo')) return 'landing';
    if (pathname.includes('/cart') || pathname.includes('/checkout') || pathname.includes('/account')) return 'functional';

    return 'default';
  }

  function calculateExcessSeverity(count, threshold) {
    const ratio = count / threshold;
    if (ratio >= 2.5) return 'critical';    // 250%+ of threshold
    if (ratio >= 2.0) return 'high';        // 200%+ of threshold
    if (ratio >= 1.5) return 'medium';      // 150%+ of threshold
    return 'low';                            // just over threshold
  }

  function calculateLinkDensity(page) {
    const wordCount = page.wordCount || 1;
    const linkCount = page.outboundLinks || 0;
    return Math.round((linkCount / wordCount) * 1000) / 10; // links per 100 words
  }

  function generateExcessiveLinksFix(page, pageType, threshold) {
    const fixes = [];
    const count = page.outboundLinks || 0;
    const density = calculateLinkDensity(page);

    if (page.issue === 'too_few_links') {
      return 'Dodaj 3-5 relevantnih unutrašnjih linkova u sadržaj (kontekstualno u tekstu, ne samo u navigaciji)';
    }

    fixes.push(`Predužimak: ${count} linkova (limit za ${pageType}: ${threshold})`);

    if (density > 15) { // >15 links per 100 words
      fixes.push('Gustina linkova prevelika (>15/100 reči) - ukloni nepotrebne');
    }

    // Specific suggestions by page type
    switch (pageType) {
      case 'homepage':
        fixes.push('Smanji linkove u footru/navigaciji; grupiši u mega-meni');
        fixes.push('Ostavi samo najvažnije kategorije na početnoj');
        break;
      case 'category':
        fixes.push('Ograniči paginaciju (max 10-15 produkta po strani)');
        fixes.push('Ukloni duplicate linkove ka istim proizvodima');
        break;
      case 'product':
        fixes.push('Ostavi samo: kategorija, srodni proizvodi, upsell (max 5-10)');
        break;
      case 'article':
        fixes.push('Linkuj samo kontekstualno relevantne stranice (2-5 u tekstu)');
        break;
    }

    // Generic fixes
    fixes.push('Ukloni duplicate linkove ka istom URL-u');
    fixes.push('Ukloni linkove ka stranicama sa thin content');
    fixes.push('Konsoliduj navigaciju - koristi dropdown umesto liste');

    return fixes.join(' | ');
  }

  function getExcessiveLinkStats(excessivePages) {
    const excessive = excessivePages.filter(p => !p.issue);
    const tooFew = excessivePages.filter(p => p.issue === 'too_few_links');

    return {
      totalExcessive: excessive.length,
      tooFewLinks: tooFew.length,
      critical: excessive.filter(p => p.severity === 'critical').length,
      high: excessive.filter(p => p.severity === 'high').length,
      medium: excessive.filter(p => p.severity === 'medium').length,
      low: excessive.filter(p => p.severity === 'low').length,
      avgExcess: excessive.length > 0
        ? Math.round(excessive.reduce((sum, p) => sum + (p.excess || 0), 0) / excessive.length)
        : 0,
      maxExcess: excessive.length > 0
        ? Math.max(...excessive.map(p => p.excess || 0))
        : 0,
      byPageType: excessive.reduce((acc, p) => {
        acc[p.pageType] = (acc[p.pageType] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  function getGlobalLinkStats(scanResults) {
    const pages = scanResults.pages || new Map();
    let totalInternalLinks = 0;
    let totalPages = 0;
    const linkCounts = [];

    pages.forEach(page => {
      if (page.outboundLinks > 0) {
        totalInternalLinks += page.outboundLinks;
        linkCounts.push(page.outboundLinks);
        totalPages++;
      }
    });

    linkCounts.sort((a, b) => a - b);

    return {
      totalPages: pages.size,
      pagesWithLinks: totalPages,
      avgLinksPerPage: totalPages > 0 ? Math.round(totalInternalLinks / totalPages) : 0,
      medianLinksPerPage: linkCounts.length > 0
        ? linkCounts[Math.floor(linkCounts.length / 2)]
        : 0,
      maxLinks: linkCounts.length > 0 ? linkCounts[linkCounts.length - 1] : 0,
      minLinks: linkCounts.length > 0 ? linkCounts[0] : 0,
      totalInternalLinks,
    };
  }

  // Export
  window.NC_LinkAuditorExcessive = {
    detectExcessiveLinks,
    getExcessiveLinkStats,
    getGlobalLinkStats,
    detectPageType,
    THRESHOLDS,
  };

})();