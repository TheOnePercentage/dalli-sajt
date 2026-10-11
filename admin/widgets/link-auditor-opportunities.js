(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // LINK AUDITOR - Step 5: Linking Opportunities
  // ============================================

  // Stop words for keyword extraction (Serbian)
  const STOP_WORDS = new Set([
    'i', 'u', 'na', 'za', 'od', 'sa', 'je', 'da', 'se', 'su', 'ne', 'ni',
    'kao', 'to', 'a', 'o', 'iz', 'kako', 'što', 'koji', 'koja', 'koje',
    'ovo', 'ona', 'oni', 'one', 'moje', 'tvoje', 'njegovo', 'naše', 'vaše',
    'ali', 'ili', 'pa', 'te', 'no', 'bilo', 'često', 'retko', 'uvek',
    'nekad', 'sada', 'tada', 'ovde', 'tamo', 'gde', 'kada', 'zašto',
    'dali', 'ma', 'bar', 'samo', 'još', 'već', 'pre', 'posle',
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  ]);

  function extractKeywords(text, maxKeywords = 10) {
    if (!text) return [];

    const words = text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[đ]/g, 'dj')
      .replace(/[čć]/g, 'c')
      .replace(/[š]/g, 's')
      .replace(/[ž]/g, 'z')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    // Count frequencies
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

    // Sort by frequency
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  function extractNgrams(text, n = 2, maxNgrams = 10) {
    if (!text) return [];
    const words = text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[đ]/g, 'dj')
      .replace(/[čć]/g, 'c')
      .replace(/[š]/g, 's')
      .replace(/[ž]/g, 'z')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));

    const ngrams = {};
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(' ');
      ngrams[gram] = (ngrams[gram] || 0) + 1;
    }

    return Object.entries(ngrams)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxNgrams)
      .map(([gram]) => gram);
  }

  function getPageFingerprint(page) {
    const text = [
      page.title || '',
      page.h1 || '',
      page.metaDescription || '',
      ...(page.headings || []),
      ...(page.keywords || []),
    ].join(' ');

    return {
      keywords: extractKeywords(text, 15),
      bigrams: extractNgrams(text, 2, 10),
      trigrams: extractNgrams(text, 3, 5),
      category: page.category || '',
      wordCount: page.wordCount || 0,
    };
  }

  function calculateSimilarity(fp1, fp2) {
    // Jaccard similarity for keywords
    const set1 = new Set(fp1.keywords);
    const set2 = new Set(fp2.keywords);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    const keywordSim = intersection.size / union.size || 0;

    // Bigram similarity
    const bigram1 = new Set(fp1.bigrams);
    const bigram2 = new Set(fp2.bigrams);
    const bigramIntersection = new Set([...bigram1].filter(x => bigram2.has(x)));
    const bigramUnion = new Set([...bigram1, ...bigram2]);
    const bigramSim = bigramIntersection.size / bigramUnion.size || 0;

    // Category match bonus
    const categoryBonus = fp1.category && fp1.category === fp2.category ? 0.15 : 0;

    // Weighted combination
    return (keywordSim * 0.5) + (bigramSim * 0.35) + categoryBonus;
  }

  function findLinkingOpportunities(scanResults, options = {}) {
    const { minSimilarity = 0.25, maxOpportunitiesPerPage = 5, minWordCount = 100 } = options;
    const pages = scanResults.pages || new Map();
    const opportunities = [];

    // Build fingerprints for all pages
    const fingerprints = new Map();
    pages.forEach((page, url) => {
      if (page.wordCount >= minWordCount) {
        fingerprints.set(url, getPageFingerprint(page));
      }
    });

    // For each page, find best linking targets
    fingerprints.forEach((fp, sourceUrl) => {
      const sourcePage = pages.get(sourceUrl);
      const candidates = [];

      fingerprints.forEach((targetFp, targetUrl) => {
        if (sourceUrl === targetUrl) return;

        const similarity = calculateSimilarity(fp, targetFp);
        if (similarity >= minSimilarity) {
          const targetPage = pages.get(targetUrl);
          candidates.push({
            targetUrl,
            targetTitle: targetPage?.title || 'Bez naslova',
            similarity: Math.round(similarity * 100),
            sharedKeywords: getSharedKeywords(fp, targetFp),
            targetWordCount: targetPage?.wordCount || 0,
            targetCategory: targetPage?.category || '',
          });
        }
      });

      // Sort by similarity
      candidates.sort((a, b) => b.similarity - a.similarity);
      const topCandidates = candidates.slice(0, maxOpportunitiesPerPage);

      if (topCandidates.length > 0) {
        // Check which ones are already linked
        const sourcePage = pages.get(sourceUrl);
        const existingLinks = new Set(
          (sourcePage.links || [])
            .filter(l => l.isInternal)
            .map(l => l.targetUrl)
        );

        const opportunities_list = topCandidates
          .filter(c => !existingLinks.has(c.targetUrl))
          .map(c => ({
            targetUrl: c.targetUrl,
            targetTitle: c.targetTitle,
            similarity: c.similarity,
            sharedKeywords: c.sharedKeywords,
            reason: generateOpportunityReason(c, fp),
          }));

        if (opportunities_list.length > 0) {
          opportunities.push({
            sourceUrl,
            sourceTitle: sourcePage?.title || 'Bez naslova',
            sourceCategory: sourcePage?.category || '',
            opportunities: opportunities_list,
            priority: calculateOpportunityPriority(opportunities_list),
          });
        }
      }
    });

    // Sort by priority
    opportunities.sort((a, b) => b.priority - a.priority);

    return opportunities;
  }

  function getSharedKeywords(fp1, fp2) {
    const set1 = new Set(fp1.keywords);
    return fp2.keywords.filter(k => set1.has(k)).slice(0, 5);
  }

  function generateOpportunityReason(candidate, sourceFp) {
    const reasons = [];

    if (candidate.sharedKeywords.length > 0) {
      reasons.push(`Zajedničke ključne reči: ${candidate.sharedKeywords.join(', ')}`);
    }

    if (candidate.targetCategory && candidate.targetCategory === sourceFp.category) {
      reasons.push(`Ista kategorija: ${candidate.targetCategory}`);
    }

    if (candidate.similarity >= 50) {
      reasons.push('Visok sadržaj similarity');
    } else if (candidate.similarity >= 35) {
      reasons.push('Umerena tema sličnost');
    }

    return reasons.join(' | ');
  }

  function calculateOpportunityPriority(opportunities_list) {
    if (opportunities_list.length === 0) return 0;

    const avgSimilarity = opportunities_list.reduce((sum, o) => sum + o.similarity, 0) / opportunities_list.length;
    const highSimCount = opportunities_list.filter(o => o.similarity >= 50).length;

    return Math.round(avgSimilarity * 10 + highSimCount * 5);
  }

  function getOpportunityStats(opportunities) {
    let totalSuggestions = 0;
    let highPriority = 0;
    let mediumPriority = 0;
    let lowPriority = 0;

    opportunities.forEach(opp => {
      totalSuggestions += opp.opportunities.length;
      if (opp.priority >= 60) highPriority++;
      else if (opp.priority >= 35) mediumPriority++;
      else lowPriority++;
    });

    return {
      pagesWithOpportunities: opportunities.length,
      totalSuggestions,
      highPriority,
      mediumPriority,
      lowPriority,
      avgPerPage: opportunities.length > 0
        ? Math.round(totalSuggestions / opportunities.length)
        : 0,
    };
  }

  function getCategoryOpportunities(opportunities) {
    const byCategory = {};
    opportunities.forEach(opp => {
      const cat = opp.sourceCategory || 'accessories';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, suggestions: 0 };
      byCategory[cat].count++;
      byCategory[cat].suggestions += opp.opportunities.length;
    });
    return byCategory;
  }

  // Export
  window.NC_LinkAuditorOpportunities = {
    findLinkingOpportunities,
    getOpportunityStats,
    getCategoryOpportunities,
    calculateSimilarity,
    extractKeywords,
    extractNgrams,
  };

})();