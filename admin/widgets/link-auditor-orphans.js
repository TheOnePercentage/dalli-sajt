(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // LINK AUDITOR - Step 2: Orphan Pages Detection
  // ============================================

  function detectOrphanPages(scanResults) {
    const orphans = [];
    const pages = scanResults.pages || new Map();

    pages.forEach((page, url) => {
      // Skip non-content pages
      if (shouldSkipOrphanCheck(url)) return;

      if (page.inboundLinks === 0) {
        orphans.push({
          url,
          title: page.title || 'Bez naslova',
          h1: page.h1 || '',
          wordCount: page.wordCount || 0,
          outboundLinks: page.outboundLinks || 0,
          lastScanned: page.lastScanned,
          severity: calculateOrphanSeverity(page),
          suggestedFix: generateOrphanFixSuggestion(page),
        });
      }
    });

    // Sort by severity (critical first) then by word count (more content = higher priority)
    orphans.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return (b.wordCount || 0) - (a.wordCount || 0);
    });

    return orphans;
  }

  function shouldSkipOrphanCheck(url) {
    const skipPaths = [
      '/admin-login.html',
      '/admin.html',
      '/admin-new/',
      '/404.html',
      '/500.html',
      '/search.html',
      '/tag/',
      '/category/',
      '/author/',
      '/page/',
      '/feed.',
      '/rss.',
      '/sitemap.',
      '/robots.',
    ];

    const pathname = new URL(url).pathname.toLowerCase();

    // Skip if it's a known system page
    if (skipPaths.some(p => pathname.includes(p))) return true;

    // Skip if it has no content (likely auto-generated)
    return false;
  }

  function calculateOrphanSeverity(page) {
    const wordCount = page.wordCount || 0;
    const outboundLinks = page.outboundLinks || 0;
    const hasMetaDescription = !!page.metaDescription;
    const hasH1 = !!page.h1;

    // Critical: High content value but no inbound links
    if (wordCount > 500 && outboundLinks > 0) return 'critical';
    if (wordCount > 300 && outboundLinks > 0) return 'high';
    if (wordCount > 100) return 'medium';

    // Low: Thin content pages
    if (wordCount < 100 && !hasMetaDescription && !hasH1) return 'low';

    return 'medium';
  }

  function generateOrphanFixSuggestion(page) {
    const suggestions = [];

    if (page.wordCount > 300) {
      suggestions.push('Dodaj link u relevantne kategorije (navigacija, footer, sidebar)');
      suggestions.push('Unutrašnje linkovanje iz povezanih clanaka/proizvoda');
    }

    if (!page.h1) {
      suggestions.push('Dodaj H1 naslov za bolju SEO strukturu');
    }

    if (!page.metaDescription) {
      suggestions.push('Dodaj meta description');
    }

    if (page.outboundLinks === 0) {
      suggestions.push('Dodaj unutrašnje linkove ka drugim relevantnim stranicama');
    }

    return suggestions.join(' | ');
  }

  function getOrphanStats(orphans) {
    return {
      total: orphans.length,
      critical: orphans.filter(o => o.severity === 'critical').length,
      high: orphans.filter(o => o.severity === 'high').length,
      medium: orphans.filter(o => o.severity === 'medium').length,
      low: orphans.filter(o => o.severity === 'low').length,
    };
  }

  // Export
  window.NC_LinkAuditorOrphans = {
    detectOrphanPages,
    getOrphanStats,
    calculateOrphanSeverity,
    generateOrphanFixSuggestion,
  };

})();