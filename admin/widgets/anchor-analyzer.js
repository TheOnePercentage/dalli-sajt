(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // ANCHOR TEXT ANALYZER - Step 10
  // ============================================

  // Brand terms for DALLI
  const BRAND_TERMS = [
    'dalli', 'dali', 'moonlight', 'moon light', 'dalli.rs', 'dalli rs',
    'dalli shop', 'dalli store', 'dalli online', 'dalli sajt', 'dalli website'
  ];

  // Generic anchor patterns (Serbian + English)
  const GENERIC_PATTERNS = [
    // Serbian
    'klikni ovde', 'kliknite ovde', 'ovde', 'tu', 'saznaj vise', 'saznajte vise',
    'procitaj vise', 'procitajte vise', 'detaljnije', 'vidi vise', 'vidite vise',
    'pogledaj', 'pogledajte', 'otvori', 'otvorite', 'poseti', 'posetite',
    'dodaj u korpu', 'kupi', 'kupovina', 'naruci', 'narucite',
    'više', 'vise', 'dalje', 'nastavi', 'citaj', 'čitaj',
    // English
    'click here', 'click', 'here', 'read more', 'learn more', 'view more',
    'see more', 'read', 'view', 'visit', 'go to', 'check out', 'check',
    'more', 'continue', 'next', 'shop now', 'buy now', 'add to cart',
    'get started', 'sign up', 'register', 'login', 'sign in',
  ];

  // Exact match detection - will compare against target page keywords
  // This is done dynamically in the analysis

  function analyzeAnchorTexts(scanResults) {
    const pages = scanResults.pages || new Map();
    const links = scanResults.links || [];
    
    // Build target page keyword map for exact/partial match detection
    const targetKeywords = new Map();
    pages.forEach((page, url) => {
      const keywords = extractPageKeywords(page);
      targetKeywords.set(url, keywords);
    });

    // Analyze each internal link
    const anchorAnalysis = links
      .filter(l => l.isInternal && l.anchorText)
      .map(link => {
        const targetKeywords_list = targetKeywords.get(link.targetUrl) || [];
        const anchorText = link.anchorText.toLowerCase().trim();
        
        const category = categorizeAnchorText(anchorText, targetKeywords_list);
        
        return {
          ...link,
          anchorText: link.anchorText,
          anchorTextClean: anchorText,
          category,
          targetKeywords: targetKeywords_list,
          isExactMatch: isExactMatch(anchorText, targetKeywords_list),
          isPartialMatch: isPartialMatch(anchorText, targetKeywords_list),
        };
      });

    // Aggregate statistics
    const stats = calculateAnchorStats(anchorAnalysis);
    
    // Find issues
    const issues = detectAnchorIssues(anchorAnalysis, stats);
    
    // Per-page breakdown
    const pageBreakdown = calculatePageBreakdown(anchorAnalysis, pages);

    return {
      totalAnchors: anchorAnalysis.length,
      distribution: stats.distribution,
      percentages: stats.percentages,
      issues,
      pageBreakdown,
      rawAnchors: anchorAnalysis,
    };
  }

  function extractPageKeywords(page) {
    const text = [
      page.title || '',
      page.h1 || '',
      page.metaDescription || '',
      ...(page.headings || []),
    ].join(' ');

    return extractKeywords(text, 10);
  }

  function extractKeywords(text, maxKeywords = 10) {
    if (!text) return [];
    
    const STOP_WORDS = new Set([
      'i', 'u', 'na', 'za', 'od', 'sa', 'je', 'da', 'se', 'su', 'ne', 'ni',
      'kao', 'to', 'a', 'o', 'iz', 'kako', 'što', 'koji', 'koja', 'koje',
      'ovo', 'ona', 'oni', 'one', 'moje', 'tvoje', 'njegovo', 'naše', 'vaše',
      'ali', 'ili', 'pa', 'te', 'no', 'bilo', 'često', 'retko', 'uvek',
      'nekad', 'sada', 'tada', 'ovde', 'tamo', 'gde', 'kada', 'zašto',
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    ]);

    const words = text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[đ]/g, 'dj')
      .replace(/[čć]/g, 'c')
      .replace(/[š]/g, 's')
      .replace(/[ž]/g, 'z')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  function categorizeAnchorText(anchorText, targetKeywords) {
    // 1. Naked URL
    if (anchorText.startsWith('http://') || anchorText.startsWith('https://')) {
      return 'naked_url';
    }

    // 2. Branded
    if (BRAND_TERMS.some(brand => anchorText.includes(brand))) {
      return 'branded';
    }

    // 3. Generic
    if (GENERIC_PATTERNS.some(generic => anchorText === generic || anchorText.includes(generic))) {
      return 'generic';
    }

    // 4. Exact Match
    if (isExactMatch(anchorText, targetKeywords)) {
      return 'exact_match';
    }

    // 5. Partial Match
    if (isPartialMatch(anchorText, targetKeywords)) {
      return 'partial_match';
    }

    // 6. Long-tail (longer descriptive text)
    if (anchorText.split(' ').length >= 5) {
      return 'long_tail';
    }

    // 7. Other
    return 'other';
  }

  function isExactMatch(anchorText, targetKeywords) {
    return targetKeywords.some(kw => {
      const kwNormalized = kw.toLowerCase();
      // Exact match or very close (allowing small variations)
      return anchorText === kwNormalized || 
             anchorText === kwNormalized + 'a' || // Serbian case variations
             anchorText === kwNormalized + 'e' ||
             anchorText === kwNormalized + 'i' ||
             anchorText === kwNormalized + 'o' ||
             anchorText === kwNormalized + 'u';
    });
  }

  function isPartialMatch(anchorText, targetKeywords) {
    return targetKeywords.some(kw => {
      const kwNormalized = kw.toLowerCase();
      return anchorText.includes(kwNormalized) && anchorText !== kwNormalized;
    });
  }

  function calculateAnchorStats(anchors) {
    const distribution = {
      branded: 0,
      exact_match: 0,
      partial_match: 0,
      generic: 0,
      naked_url: 0,
      long_tail: 0,
      other: 0,
    };

    anchors.forEach(a => {
      distribution[a.category] = (distribution[a.category] || 0) + 1;
    });

    const total = anchors.length || 1;
    const percentages = {};
    Object.keys(distribution).forEach(key => {
      percentages[key] = Math.round((distribution[key] / total) * 100);
    });

    return { distribution, percentages };
  }

  function detectAnchorIssues(anchors, stats) {
    const issues = [];
    const total = anchors.length;

    // Too many generic anchors
    const genericPct = stats.percentages.generic || 0;
    if (genericPct > 30) {
      issues.push({
        type: 'too_many_generic',
        severity: genericPct > 50 ? 'high' : 'medium',
        message: `Previše generic anchor teksta (${stats.percentages.generic}%). Google to vidi kao manipulativno.`,
        recommendation: 'Zameni "klikni ovde", "ovde", "saznaj više" sa opisnim ključnim rečima.',
        count: stats.distribution.generic,
      });
    }

    // Too many exact match (Penguin penalty risk)
    const exactPct = stats.percentages.exact_match || 0;
    if (exactPct > 20) {
      issues.push({
        type: 'too_many_exact_match',
        severity: exactPct > 35 ? 'high' : 'medium',
        message: `Previše exact match anchor teksta (${stats.percentages.exact_match}%). Rizik od Penguin penalizacije.`,
        recommendation: 'Uvedi varijacije: partial match, branded, long-tail.',
        count: stats.distribution.exact_match,
      });
    }

    // Too many naked URLs
    const nakedPct = stats.percentages.naked_url || 0;
    if (nakedPct > 15) {
      issues.push({
        type: 'too_many_naked_urls',
        severity: 'low',
        message: `Previše naked URL anchor-a (${stats.percentages.naked_url}%).`,
        recommendation: 'Zameni naked URL-ove sa opisnim anchor tekstom.',
        count: stats.distribution.naked_url,
      });
    }

    // No branded anchors
    if ((stats.percentages.branded || 0) === 0) {
      issues.push({
        type: 'no_branded_anchors',
        severity: 'medium',
        message: 'Nema branded anchor teksta (DALLI, DALLI.rs).',
        recommendation: 'Dodaj branded anchor-e u navigaciji, footeru, blog postovima.',
        count: 0,
      });
    }

    // Too many links with same anchor (site-wide)
    const anchorFrequency = {};
    anchors.forEach(a => {
      const key = a.anchorTextClean.substring(0, 50);
      anchorFrequency[key] = (anchorFrequency[key] || 0) + 1;
    });

    const overused = Object.entries(anchorFrequency)
      .filter(([_, count]) => count > 10)
      .sort((a, b) => b[1] - a[1]);

    if (overused.length > 0) {
      issues.push({
        type: 'overused_anchors',
        severity: 'medium',
        message: `${overused.length} anchor teksta se koristi više od 10 puta site-wide.`,
        recommendation: 'Raznovrsi anchor tekstove za iste ciljne stranice.',
        details: overused.slice(0, 5).map(([anchor, count]) => ({ anchor, count })),
      });
    }

    return issues;
  }

  function calculatePageBreakdown(anchors, pages) {
    const pageStats = new Map();

    anchors.forEach(anchor => {
      const sourceUrl = anchor.sourceUrl;
      if (!pageStats.has(sourceUrl)) {
        pageStats.set(sourceUrl, {
          url: sourceUrl,
          title: pages.get(sourceUrl)?.title || 'Bez naslova',
          totalAnchors: 0,
          categories: {
            branded: 0,
            exact_match: 0,
            partial_match: 0,
            generic: 0,
            naked_url: 0,
            long_tail: 0,
            other: 0,
          },
        });
      }

      const stat = pageStats.get(anchor.sourceUrl);
      stat.totalAnchors++;
      stat.categories[anchor.category] = (stat.categories[anchor.category] || 0) + 1;
    });

    // Calculate percentages per page
    const breakdown = [];
    pageStats.forEach((stat, url) => {
      const pct = {};
      Object.keys(stat.categories).forEach(cat => {
        pct[cat] = stat.totalAnchors > 0 
          ? Math.round((stat.categories[cat] / stat.totalAnchors) * 100)
          : 0;
      });
      breakdown.push({ ...stat, percentages: pct });
    });

    // Sort by total anchors descending
    breakdown.sort((a, b) => b.totalAnchors - a.totalAnchors);

    return breakdown;
  }

  // Export
  window.NC_AnchorAnalyzer = {
    analyzeAnchorTexts,
    categorizeAnchorText,
    calculateAnchorStats,
    detectAnchorIssues,
    calculatePageBreakdown,
    extractKeywords,
    BRAND_TERMS,
    GENERIC_PATTERNS,
  };

})();