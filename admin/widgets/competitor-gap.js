(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // COMPETITOR GAP ANALYZER - Step 12
  // ============================================

  // Default competitor domains for fashion/clothing niche in Serbia
  const DEFAULT_COMPETITORS = [
    { domain: 'hm.com', name: 'H&M', type: 'international' },
    { domain: 'zara.com', name: 'Zara', type: 'international' },
    { domain: 'pullandbear.com', name: 'Pull&Bear', type: 'international' },
    { domain: 'bershka.com', name: 'Bershka', type: 'international' },
    { domain: 'mango.com', name: 'Mango', type: 'international' },
    { domain: 'lcwaikiki.com', name: 'LC Waikiki', type: 'regional' },
    { domain: 'koton.com', name: 'Koton', type: 'regional' },
    { domain: 'deichmann.com', name: 'Deichmann', type: 'footwear' },
  ];

  // Content type categories for gap analysis
  const CONTENT_TYPES = {
    'product': { label: '🛍️ Proizvodi', weight: 1.0 },
    'category': { label: '📂 Kategorije', weight: 0.9 },
    'blog': { label: '📝 Blog/Članci', weight: 0.8 },
    'guide': { label: '📖 Vodiči', weight: 0.9 },
    'landing': { label: '🎯 Landing stranice', weight: 0.7 },
    'faq': { label: '❓ FAQ', weight: 0.6 },
    'review': { label: '⭐ Recenzije', weight: 0.7 },
  };

  // Fashion/clothing keywords by category
  const FASHION_KEYWORDS = {
    't-shirts': ['majica', 't-shirt', 'tširt', 'polo', 'tank top', 'kratki rukav', 'dugi rukav', 'ovrsajz', 'slim fit', 'basic tee', 'essential tee'],
    'hoodies': ['trenerka', 'hoodie', 'dukseri', 'kapuljača', 'sweatshirt', 'fleeca', 'zip hoodie', 'oversized hoodie'],
    'tracksuits': ['trenerka', 'set trenerka', 'sportski set', 'jogging set', 'track suit'],
    'shorts': ['šortovi', 'kratke hlače', 'bermude', 'sportski šortovi', 'plavački šortovi'],
    'jackets': ['jakna', 'kožna jakna', 'bomber', 'parka', 'trench', 'prislavlena', 'mehka jakna', 'denim jakna'],
    'shirts': ['košulja', 'business košulja', 'formal košulja', 'oxford', 'poplin', 'flanel'],
    'blazers': ['blazer', 'sak', 'sportski sak', 'neformalni blazer', 'velvet blazer'],
    'suits': ['odjel', 'košulja i hlače', 'poslovni odjel', 'svadbeni odjel', 'tuxedo'],
    'trousers': ['pantalone', 'činos', 'džemperi', 'leggings', 'elegantne hlače', 'wool trousers'],
    'coats': ['kabanica', 'trench coat', 'peacoat', 'duffle coat', 'zimska kabanica', 'overcoat'],
    'dresses': ['haljina', 'suknja', 'mini', 'midi', 'maxi', 'večeraška', 'letnja', 'pletena', 'cocktail haljina'],
    'leggings': ['leggings', 'jeggings', 'sportski leginsi', 'yoga hlače', 'termalne leginsi'],
    'accessories': ['aksesoari', 'šal', 'kapa', 'rukavice', 'pojas', 'torba', 'ranac', 'novčanik', 'naušnice', 'ogrlica', 'sat'],
    'essentials': ['osnovna majica', 'basic', 'essential', 'vladika', 'undershirt', 'temeljna garderoba'],
    'matching-sets': ['set majica i hlače', 'koordinirani set', 'matching outfit', 'twin set'],
    'farmerke': ['farmerke', 'džemper', 'pulover', 'kardigan', 'pleteno', 'merino', 'kšmir'],
    'haljine': ['haljina', 'suknja', 'mini', 'midi', 'maxi', 'večeraška', 'letnja', 'pletena'],
    'pantalone': ['pantalone', 'činos', 'džemperi', 'leggings', 'trenerke', 'kratke hlače', 'bermude'],
    'aksesoari': ['sesir', 'kapa', 'šal', 'rukavice', 'pojas', 'torba', 'ranac', 'novčanik', 'naušnice', 'ogrlica'],
    'obuca': ['patike', 'cipela', 'cizme', 'cipelice', 'sandale', 'slipon', 'treking', 'trcanje'],
    'velicine': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'plus size', 'oversize'],
    'materijali': ['pamuk', 'organski pamuk', 'polyester', 'viscose', 'len', 'svila', 'voal', 'denim', 'flanel'],
    'boje': ['crna', 'bela', 'siva', 'plava', 'crvena', 'zelena', 'bež', 'braon', 'roza', 'ljubicasta', 'naranasta'],
    'prilike': ['posao', 'skola', 'sport', 'izlazak', 'vecera', 'brak', 'krstenje', 'slavlje', 'putovanje'],
    'sezone': ['prolece', 'leto', 'jesen', 'zima', 'prelazna', 'godisnja'],
  };

  // Flatten keywords for search
  const ALL_KEYWORDS = Object.values(FASHION_KEYWORDS).flat();

  function extractContentInventory(scanResults) {
    const pages = scanResults.pages || new Map();
    const inventory = [];

    pages.forEach((page, url) => {
      const content = extractPageContent(page);
      const type = detectContentType(page);
      const keywords = extractKeywordsFromContent(content);
      const fashionCategories = detectFashionCategories(keywords);

      inventory.push({
        url,
        title: page.title || 'Bez naslova',
        type,
        wordCount: page.wordCount || 0,
        keywords,
        fashionCategories,
        headings: page.headings || [],
        metaDescription: page.metaDescription || '',
        h1: page.h1 || '',
        lastScanned: page.lastScanned,
      });
    });

    return inventory;
  }

  function extractPageContent(page) {
    return [
      page.title || '',
      page.h1 || '',
      page.metaDescription || '',
      ...(page.headings || []),
    ].join(' ');
  }

  function detectContentType(page) {
    const url = page.url || '';
    const pathname = new URL(url).pathname.toLowerCase();
    const title = (page.title || '').toLowerCase();
    const h1 = (page.h1 || '').toLowerCase();

    if (pathname.includes('/proizvod-') || pathname.includes('/product-')) return 'product';
    if (pathname.includes('/blog') || pathname.includes('/article') || pathname.includes('/news')) return 'blog';
    if (pathname.includes('/guide') || pathname.includes('/vodic') || title.includes('vodic') || title.includes('kako')) return 'guide';
    if (pathname.includes('/category') || pathname.includes('/kategorija') || pathname.includes('/kolekcija')) return 'category';
    if (pathname.includes('/landing') || pathname.includes('/kampanja') || pathname.includes('/promo')) return 'landing';
    if (pathname.includes('/faq') || title.includes('faq') || title.includes('pitanja')) return 'faq';
    if (title.includes('recenzija') || title.includes('review') || title.includes('iskustvo')) return 'review';
    
    return 'other';
  }

  function extractKeywordsFromContent(content) {
    const STOP_WORDS = new Set([
      'i', 'u', 'na', 'za', 'od', 'sa', 'je', 'da', 'se', 'su', 'ne', 'ni',
      'kao', 'to', 'a', 'o', 'iz', 'kako', 'što', 'koji', 'koja', 'koje',
      'ovo', 'ona', 'oni', 'one', 'moje', 'tvoje', 'njegovo', 'naše', 'vaše',
      'ali', 'ili', 'pa', 'te', 'no', 'bilo', 'često', 'retko', 'uvek',
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    ]);

    const words = content
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
      .slice(0, 20)
      .map(([word]) => word);
  }

  function detectFashionCategories(keywords) {
    const categories = {};
    keywords.forEach(kw => {
      Object.entries(FASHION_KEYWORDS).forEach(([category, terms]) => {
        if (terms.some(t => kw.includes(t) || t.includes(kw))) {
          categories[category] = (categories[category] || 0) + 1;
        }
      });
    });
    return categories;
  }

  // Mock competitor data (in real implementation, this would come from API)
  function generateMockCompetitorData(competitorDomains) {
    return competitorDomains.map(domain => ({
      domain,
      name: domain.name || domain.domain,
      type: domain.type || 'unknown',
      estimatedPages: Math.floor(Math.random() * 5000) + 1000,
      topKeywords: generateMockKeywords(50),
      contentTypes: {
        product: Math.floor(Math.random() * 2000) + 500,
        category: Math.floor(Math.random() * 100) + 20,
        blog: Math.floor(Math.random() * 500) + 50,
        guide: Math.floor(Math.random() * 100) + 10,
        landing: Math.floor(Math.random() * 50) + 5,
      },
      topCategories: Object.keys(FASHION_KEYWORDS).sort(() => Math.random() - 0.5).slice(0, 8),
      estimatedTraffic: Math.floor(Math.random() * 1000000) + 50000,
      domainAuthority: Math.floor(Math.random() * 50) + 30,
    }));
  }

  function generateMockKeywords(count) {
    const allKw = [...ALL_KEYWORDS, ...Object.keys(FASHION_KEYWORDS)];
    const shuffled = [...allKw].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(kw => ({
      keyword: kw,
      volume: Math.floor(Math.random() * 10000) + 100,
      difficulty: Math.floor(Math.random() * 100),
      cpc: (Math.random() * 5).toFixed(2),
    }));
  }

  function analyzeCompetitorGaps(ourInventory, competitorData) {
    // Build our keyword set
    const ourKeywords = new Set();
    const ourCategories = new Set();
    const ourContentTypes = {};

    ourInventory.forEach(page => {
      page.keywords.forEach(kw => ourKeywords.add(kw));
      Object.keys(page.fashionCategories).forEach(cat => ourCategories.add(cat));
      ourContentTypes[page.type] = (ourContentTypes[page.type] || 0) + 1;
    });

    // Aggregate competitor data
    const allCompetitorKeywords = new Set();
    const competitorCategories = new Map();
    const competitorContentTypes = {};

    competitorData.forEach(comp => {
      comp.topKeywords.forEach(kw => allCompetitorKeywords.add(kw.keyword));
      comp.topCategories.forEach(cat => competitorCategories.set(cat, (competitorCategories.get(cat) || 0) + 1));
      Object.entries(comp.contentTypes).forEach(([type, count]) => {
        competitorContentTypes[type] = (competitorContentTypes[type] || 0) + count;
      });
    });

    // Find gaps
    const keywordGaps = [];
    allCompetitorKeywords.forEach(kw => {
      if (!ourKeywords.has(kw)) {
        keywordGaps.push(kw);
      }
    });

    const categoryGaps = [];
    competitorCategories.forEach((count, cat) => {
      if (!ourCategories.has(cat)) {
        categoryGaps.push({ category: cat, competitorCoverage: count });
      }
    });

    const contentTypeGaps = [];
    Object.entries(competitorContentTypes).forEach(([type, count]) => {
      const ourCount = ourContentTypes[type] || 0;
      const avgCompetitor = count / competitorData.length;
      if (ourCount < avgCompetitor * 0.5) {
        contentTypeGaps.push({
          type: type,
          ourCount,
          competitorAvg: Math.round(avgCompetitor),
          gap: Math.round(avgCompetitor - ourCount),
        });
      }
    });

    // Find keyword opportunities (high volume, low difficulty)
    const opportunities = [];
    competitorData.forEach(comp => {
      comp.topKeywords.forEach(kw => {
        if (!ourKeywords.has(kw.keyword) && kw.volume > 500 && kw.difficulty < 50) {
          opportunities.push({
            keyword: kw.keyword,
            volume: kw.volume,
            difficulty: kw.difficulty,
            cpc: kw.cpc,
            competitors: competitorData.filter(c => c.topKeywords.some(k => k.keyword === kw.keyword)).length,
          });
        }
      });
    });

    // Deduplicate and sort opportunities
    const uniqueOpportunities = [];
    const seen = new Set();
    opportunities.forEach(opp => {
      if (!seen.has(opp.keyword)) {
        seen.add(opp.keyword);
        uniqueOpportunities.push(opp);
      }
    });
    uniqueOpportunities.sort((a, b) => (b.volume / (b.difficulty + 1)) - (a.volume / (a.difficulty + 1)));

    return {
      keywordGaps: keywordGaps.slice(0, 100),
      categoryGaps: categoryGaps.slice(0, 20),
      contentTypeGaps: contentTypeGaps.sort((a, b) => b.gap - a.gap),
      keywordOpportunities: uniqueOpportunities.slice(0, 50),
      ourCoverage: {
        keywords: ourKeywords.size,
        categories: ourCategories.size,
        contentTypes: ourContentTypes,
      },
      competitorCoverage: {
        keywords: allCompetitorKeywords.size,
        categories: competitorCategories.size,
        avgContentTypes: competitorContentTypes,
      },
    };
  }

  function generateContentRecommendations(gapAnalysis) {
    const recommendations = [];

    // Category gap recommendations
    gapAnalysis.categoryGaps.forEach(gap => {
      recommendations.push({
        type: 'category',
        priority: 'high',
        title: `Nedostaje kategorija: ${gap.category}`,
        description: `Konkurenti pokrivaju "${gap.category}" (${gap.competitorCoverage} sajtova). Mi nemamo nijednu stranicu za ovu temu.`,
        action: `Kreiraj kategoriju "${gap.category}" sa 5-10 proizvodima i vodičem za kupovinu.`,
        estimatedTraffic: estimateCategoryTraffic(gap.category),
      });
    });

    // Content type gap recommendations
    gapAnalysis.contentTypeGaps.forEach(gap => {
      recommendations.push({
        type: 'content_type',
        priority: gap.gap > 20 ? 'high' : 'medium',
        title: `Nedovoljan ${CONTENT_TYPES[gap.type]?.label || gap.type} sadržaj`,
        description: `Imamo ${gap.ourCount} ${gap.type} stranica, a konkurenti u proseku ${gap.competitorAvg}.`,
        action: `Dodaj ${gap.gap} novih ${gap.type} stranica.`,
        estimatedTraffic: gap.gap * 50,
      });
    });

    // Keyword opportunity recommendations
    gapAnalysis.keywordOpportunities.slice(0, 20).forEach(opp => {
      recommendations.push({
        type: 'keyword',
        priority: opp.volume > 2000 && opp.difficulty < 30 ? 'high' : 'medium',
        title: `Ključna reč: "${opp.keyword}"`,
        description: `Mesečni pretrage: ${opp.volume}, Težina: ${opp.difficulty}/100, CPC: $${opp.cpc}. ${opp.competitors} konkurenta rankira.`,
        action: `Kreiraj landing stranicu ili blog članak optimizovan za "${opp.keyword}".`,
        estimatedTraffic: Math.round(opp.volume * 0.15),
      });
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  function estimateCategoryTraffic(category) {
    const estimates = {
      'majice': 5000,
      'trenerke': 3000,
      'farmerke': 2000,
      'jakne': 2500,
      'haljine': 3000,
      'pantalone': 2000,
      'odeca_za_dec': 1500,
      'aksesoari': 1000,
      'obuca': 3000,
      'velicine': 500,
      'materijali': 800,
      'boje': 300,
      'prilike': 1000,
      'sezone': 600,
    };
    return estimates[category] || 1000;
  }

  function calculateCompetitiveScore(gapAnalysis) {
    const ourKw = gapAnalysis.ourCoverage.keywords;
    const compKw = gapAnalysis.competitorCoverage.keywords;
    const kwCoverage = compKw > 0 ? Math.round((ourKw / compKw) * 100) : 100;

    const ourCats = gapAnalysis.ourCoverage.categories;
    const compCats = gapAnalysis.competitorCoverage.categories;
    const catCoverage = compCats > 0 ? Math.round((ourCats / compCats) * 100) : 100;

    const ourTypes = Object.values(gapAnalysis.ourCoverage.contentTypes).reduce((a, b) => a + b, 0);
    const compTypes = Object.values(gapAnalysis.competitorCoverage.avgContentTypes).reduce((a, b) => a + b, 0);
    const typeCoverage = compTypes > 0 ? Math.round((ourTypes / compTypes) * 100) : 100;

    const overall = Math.round((kwCoverage * 0.5) + (catCoverage * 0.3) + (typeCoverage * 0.2));

    return {
      overall,
      keywordCoverage: kwCoverage,
      categoryCoverage: catCoverage,
      contentTypeCoverage: typeCoverage,
      label: overall >= 80 ? 'Odlično' : overall >= 60 ? 'Dobro' : overall >= 40 ? 'Prosečno' : 'Slabo',
    };
  }

  // Export
  window.NC_CompetitorGap = {
    analyzeCompetitorGaps,
    generateContentRecommendations,
    calculateCompetitiveScore,
    extractContentInventory,
    generateMockCompetitorData,
    DEFAULT_COMPETITORS,
    FASHION_KEYWORDS,
    ALL_KEYWORDS,
  };

})();