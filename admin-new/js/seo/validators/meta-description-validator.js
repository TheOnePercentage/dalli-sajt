/**
 * Meta Description Validator
 * Validates meta description tags for SEO best practices
 * Checks: length, uniqueness, keyword presence, CTR optimization, duplicates
 */

import { BaseValidator, ValidationResult, ValidatorConfig } from './base-validator.js';

export class MetaDescriptionConfig extends ValidatorConfig {
  constructor(options = {}) {
    super(options);
    this.minLength = options.minLength || 120;
    this.maxLength = options.maxLength || 160;
    this.optimalMin = options.optimalMin || 150;
    this.optimalMax = options.optimalMax || 160;
    this.checkUniqueness = options.checkUniqueness !== false;
    this.requireKeywords = options.requireKeywords !== false;
    this.minKeywords = options.minKeywords || 1;
    this.ctrKeywords = options.ctrKeywords || [
      'buy', 'shop', 'get', 'discover', 'learn', 'find', 'explore', 'try',
      'free', 'new', 'best', 'top', 'premium', 'quality', 'fast', 'easy',
      'save', 'discount', 'offer', 'deal', 'limited', 'exclusive', 'guarantee'
    ];
    this.stopWords = options.stopWords || new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that',
      'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
      'da', 'ne', 'i', 'u', 'je', 'su', 'si', 'smo', 'ste', 'to', 'za', 'na',
      'od', 'iz', 'sa', 'po', 'o', 'koji', 'koja', 'koje', 'kako', 'gde'
    ]);
  }
}

export class MetaDescriptionValidator extends BaseValidator {
  constructor(config = {}) {
    super(new MetaDescriptionConfig(config));
    this.name = 'meta-description';
    this.seenDescriptions = new Map(); // For cross-page uniqueness tracking
  }

  /**
   * Reset seen descriptions (call before new audit)
   */
  resetUniquenessTracking() {
    this.seenDescriptions.clear();
  }

  /**
   * Track a description for uniqueness checking
   * @param {string} description
   * @param {string} url
   */
  trackDescription(description, url) {
    const normalized = description.toLowerCase().trim();
    if (!this.seenDescriptions.has(normalized)) {
      this.seenDescriptions.set(normalized, []);
    }
    this.seenDescriptions.get(normalized).push(url);
  }

  /**
   * Get duplicate groups
   * @returns {Array<{description: string, urls: string[], count: number}>}
   */
  getDuplicateGroups() {
    const duplicates = [];
    for (const [desc, urls] of this.seenDescriptions.entries()) {
      if (urls.length > 1) {
        duplicates.push({
          description: urls[0], // Use first URL's description as reference
          urls,
          count: urls.length
        });
      }
    }
    return duplicates;
  }

  async runValidation(document, url, context = {}) {
    const result = new ValidationResult();
    result.metadata.url = url;
    result.metadata.validator = this.name;

    // Get meta description
    const metaDesc = this.getMetaContent(document, 'description');
    const ogDesc = this.getMetaContent(document, 'og:description', true);

    // Use meta description, fallback to OG description
    const description = metaDesc || ogDesc;
    const source = metaDesc ? 'meta' : ogDesc ? 'og' : null;

    result.metadata.hasDescription = !!description;
    result.metadata.source = source;
    result.metadata.length = description ? description.length : 0;

    if (!description) {
      result.addError('Meta description is missing', {
        field: 'description',
        recommendation: 'Add a unique meta description tag (150-160 characters) with target keywords and a call-to-action.',
        impact: 'high'
      });
      
      // Track missing for reporting
      this.trackDescription('', url);
      return result;
    }

    // Track for uniqueness checking
    this.trackDescription(description, url);

    const length = description.length;
    result.metadata.length = length;

    // 1. LENGTH VALIDATION
    this.validateLength(description, length, result);

    // 2. QUALITY & CONTENT VALIDATION
    this.validateQuality(description, result);

    // 3. KEYWORD VALIDATION
    this.validateKeywords(description, result, context);

    // 4. CTR OPTIMIZATION
    this.validateCTROptimization(description, result);

    // 5. UNIQUENESS (cross-page)
    if (this.config.checkUniqueness) {
      this.validateUniqueness(description, url, result);
    }

    // 6. DUPLICATE DETECTION (within same page - multiple meta desc tags)
    this.validateDuplicates(document, result);

    // 7. OG DESCRIPTION CONSISTENCY
    if (metaDesc && ogDesc) {
      this.validateOGConsistency(metaDesc, ogDesc, result);
    } else if (!metaDesc && ogDesc) {
      result.addInfo('Using Open Graph description as fallback', {
        recommendation: 'Add explicit meta description tag for better control'
      });
    }

    // Calculate overall score
    result.metadata.score = this.calculateScore(result, description);

    return result;
  }

  validateLength(description, length, result) {
    const { minLength, maxLength, optimalMin, optimalMax } = this.config;

    if (length < minLength) {
      result.addError(
        `Meta description too short (${length} chars). Minimum recommended: ${minLength} characters.`,
        {
          field: 'description',
          currentLength: length,
          minLength,
          recommendation: `Expand description to at least ${minLength} characters. Include key benefits and call-to-action.`,
          impact: 'high'
        }
      );
    } else if (length > maxLength) {
      result.addError(
        `Meta description too long (${length} chars). Maximum recommended: ${maxLength} characters (truncated in SERPs).`,
        {
          field: 'description',
          currentLength: length,
          maxLength,
          recommendation: `Shorten to ${maxLength} characters or less. Front-load important keywords and CTA.`,
          impact: 'high'
        }
      );
    } else if (length >= optimalMin && length <= optimalMax) {
      result.addPassed(
        `Optimal length (${length} chars) - within ${optimalMin}-${optimalMax} range`,
        { field: 'description', length }
      );
    } else if (length >= minLength && length < optimalMin) {
      result.addWarning(
        `Description could be longer (${length} chars). Optimal range: ${optimalMin}-${optimalMax} characters.`,
        {
          field: 'description',
          currentLength: length,
          optimalMin,
          optimalMax,
          recommendation: `Expand to ${optimalMin}+ characters for better SERP visibility.`
        }
      );
    } else if (length > optimalMax && length <= maxLength) {
      result.addWarning(
        `Description slightly over optimal (${length} chars). Optimal range: ${optimalMin}-${optimalMax} characters.`,
        {
          field: 'description',
          currentLength: length,
          optimalMin,
          optimalMax,
          recommendation: `Consider trimming to ${optimalMax} characters to avoid truncation.`
        }
      );
    }
  }

  validateQuality(description, result) {
    const qualityScore = this.calculateTextQuality(description);
    result.metadata.qualityScore = qualityScore;

    if (qualityScore < 40) {
      result.addError('Low description quality score', {
        score: qualityScore,
        recommendation: 'Improve readability: use complete sentences, avoid keyword stuffing, include clear value proposition.'
      });
    } else if (qualityScore < 60) {
      result.addWarning('Description quality could be improved', {
        score: qualityScore,
        recommendation: 'Enhance with complete sentences, clear benefits, and stronger call-to-action.'
      });
    } else {
      result.addPassed(`Good quality score (${qualityScore}/100)`, { score: qualityScore });
    }

    // Check for all caps (shouting)
    const upperRatio = (description.match(/[A-Z]/g) || []).length / description.length;
    if (upperRatio > 0.3) {
      result.addWarning('Excessive uppercase characters detected', {
        ratio: upperRatio,
        recommendation: 'Use normal sentence case. Avoid ALL CAPS as it appears spammy.'
      });
    }

    // Check for excessive punctuation
    const punctCount = (description.match(/[!?]{2,}|[.]{3,}/g) || []).length;
    if (punctCount > 0) {
      result.addWarning('Excessive punctuation (!!!, ???, ...) detected', {
        recommendation: 'Use single punctuation marks. Multiple exclamation/question marks appear unprofessional.'
      });
    }

    // Check for call-to-action presence
    const ctaPattern = /\b(buy|shop|get|discover|learn|find|explore|try|download|register|sign up|subscribe|contact|call)\b/i;
    if (!ctaPattern.test(description)) {
      result.addInfo('No clear call-to-action detected', {
        recommendation: 'Consider adding action-oriented language: "Shop now", "Learn more", "Get started", etc.'
      });
    } else {
      result.addPassed('Contains call-to-action language', {});
    }

    // Check for numbers/specifics (specifics increase CTR)
    const hasNumbers = /\d+/.test(description);
    if (hasNumbers) {
      result.addPassed('Contains specific numbers/data', {});
    } else {
      result.addInfo('Consider adding specific numbers (prices, percentages, counts)', {
        recommendation: 'Specifics like "50% off", "24h delivery", "10,000+ customers" increase CTR.'
      });
    }
  }

  validateKeywords(description, result, context) {
    if (!this.config.requireKeywords) return;

    const targetKeywords = context.targetKeywords || [];
    const pageKeywords = context.pageKeywords || this.extractKeywords(description);
    
    result.metadata.pageKeywords = pageKeywords;

    // Check if target keywords appear in description
    if (targetKeywords.length > 0) {
      const foundKeywords = targetKeywords.filter(kw => 
        description.toLowerCase().includes(kw.toLowerCase())
      );
      const missingKeywords = targetKeywords.filter(kw => 
        !description.toLowerCase().includes(kw.toLowerCase())
      );

      result.metadata.targetKeywordsFound = foundKeywords;
      result.metadata.targetKeywordsMissing = missingKeywords;

      if (missingKeywords.length > 0) {
        result.addWarning(`Missing target keywords in description: ${missingKeywords.join(', ')}`, {
          found: foundKeywords,
          missing: missingKeywords,
          recommendation: `Include primary target keywords: ${missingKeywords.slice(0, 3).join(', ')}`
        });
      } else if (foundKeywords.length > 0) {
        result.addPassed(`All target keywords present: ${foundKeywords.join(', ')}`, {});
      }
    }

    // Check minimum keyword density (not stuffing)
    const descLower = description.toLowerCase();
    const wordCount = description.split(/\s+/).length;
    
    pageKeywords.forEach(kw => {
      const occurrences = (descLower.match(new RegExp(kw.toLowerCase(), 'g')) || []).length;
      const density = (occurrences * kw.length) / description.length;
      
      if (occurrences > 2 || density > 0.05) {
        result.addWarning(`Possible keyword stuffing: "${kw}" appears ${occurrences} times`, {
          keyword: kw,
          occurrences,
          density: (density * 100).toFixed(1) + '%',
          recommendation: 'Reduce keyword repetition. Use synonyms and natural language.'
        });
      }
    });
  }

  validateCTROptimization(description, result) {
    const ctrSignals = {
      hasCTA: /\b(buy|shop|get|discover|learn|find|explore|try|download|register|sign up|subscribe|contact|call|start|join)\b/i.test(description),
      hasBenefit: /\b(free|save|discount|offer|deal|guarantee|quality|premium|best|top|fast|easy|quick)\b/i.test(description),
      hasUrgency: /\b(now|today|limited|hurry|last chance|ending soon|only)\b/i.test(description),
      hasSocialProof: /\b(customers|reviews|rated|trusted|recommended|popular|bestselling)\b/i.test(description),
      hasNumbers: /\d+/.test(description),
      startsWithVerb: /^(buy|shop|get|discover|learn|find|explore|try|download|save)\b/i.test(description.trim()),
      frontLoadsKeywords: true // Would need target keywords to verify
    };

    const signalCount = Object.values(ctrSignals).filter(Boolean).length;
    result.metadata.ctrSignals = ctrSignals;
    result.metadata.ctrScore = signalCount;

    if (signalCount >= 4) {
      result.addPassed(`Strong CTR optimization (${signalCount}/6 signals)`, { signals: ctrSignals });
    } else if (signalCount >= 2) {
      result.addWarning(`Moderate CTR optimization (${signalCount}/6 signals)`, {
        signals: ctrSignals,
        recommendation: 'Add more CTR signals: CTA, benefits, urgency, social proof, numbers.'
      });
    } else {
      result.addWarning(`Weak CTR optimization (${signalCount}/6 signals)`, {
        signals: ctrSignals,
        recommendation: 'Add call-to-action, clear benefits, urgency, or specific numbers to improve click-through rate.'
      });
    }

    // Specific recommendations
    if (!ctrSignals.hasCTA) {
      result.addInfo('Missing call-to-action', { recommendation: 'Add action verb: "Shop", "Get", "Discover", "Learn", "Try"' });
    }
    if (!ctrSignals.hasBenefit) {
      result.addInfo('Missing clear benefit statement', { recommendation: 'Highlight value: "Free shipping", "Premium quality", "Best price"' });
    }
    if (!ctrSignals.hasNumbers) {
      result.addInfo('No specific numbers', { recommendation: 'Add specifics: "50% off", "24h delivery", "10,000+ happy customers"' });
    }
  }

  validateUniqueness(description, url, result) {
    // This will be checked after all pages are processed
    // For single page validation, we just track it
    this.trackDescription(description, url);
    result.metadata.trackedForUniqueness = true;
  }

  validateDuplicates(document, result) {
    const metaTags = this.getMetaTags(document, 'description');
    if (metaTags.length > 1) {
      result.addError(`Multiple meta description tags found (${metaTags.length})`, {
        count: metaTags.length,
        recommendation: 'Remove duplicate meta description tags. Keep only one per page.',
        impact: 'high'
      });
    }
  }

  validateOGConsistency(metaDesc, ogDesc, result) {
    const similarity = this.calculateSimilarity(metaDesc.toLowerCase(), ogDesc.toLowerCase());
    
    if (similarity < 0.7) {
      result.addWarning('Meta description and OG description differ significantly', {
        similarity: (similarity * 100).toFixed(0) + '%',
        metaLength: metaDesc.length,
        ogLength: ogDesc.length,
        recommendation: 'Align meta and OG descriptions for consistent messaging across platforms.'
      });
    } else {
      result.addPassed('Meta and OG descriptions are consistent', { similarity: (similarity * 100).toFixed(0) + '%' });
    }
  }

  calculateSimilarity(str1, str2) {
    // Simple Jaccard similarity on words
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  calculateScore(result, description) {
    let score = 100;

    // Deduct for errors
    result.errors.forEach(e => {
      score -= e.details.impact === 'high' ? 25 : 15;
    });

    // Deduct for warnings
    result.warnings.forEach(w => {
      score -= 8;
    });

    // Deduct for missing description
    if (!description) {
      score = 0;
    }

    // Bonus for good signals
    if (result.metadata.ctrScore >= 4) score += 5;
    if (result.metadata.qualityScore > 70) score += 5;
    if (description && description.length >= 150 && description.length <= 160) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Post-process all tracked descriptions (call after auditing all pages)
   * @param {ValidationResult[]} allResults
   * @returns {ValidationResult} Aggregated uniqueness issues
   */
  static checkCrossPageUniqueness(allResults) {
    const validator = new MetaDescriptionValidator({ checkUniqueness: true });
    const allDescriptions = new Map();
    
    allResults.forEach(r => {
      if (r.metadata.hasDescription && r.metadata.url) {
        const desc = r.metadata.description || '';
        const normalized = desc.toLowerCase().trim();
        if (!allDescriptions.has(normalized)) {
          allDescriptions.set(normalized, []);
        }
        allDescriptions.get(normalized).push({
          url: r.metadata.url,
          length: r.metadata.length,
          score: r.metadata.score
        });
      }
    });

    const uniquenessResult = new ValidationResult();
    
    for (const [desc, pages] of allDescriptions.entries()) {
      if (pages.length > 1) {
        uniquenessResult.addError(
          `Duplicate meta description across ${pages.length} pages`,
          {
            pages: pages.map(p => p.url),
            description: desc.substring(0, 100) + '...',
            recommendation: 'Each page must have a unique meta description. Differentiate by page-specific keywords, product names, or categories.',
            impact: 'high'
          }
        );
      }
    }

    // Near-duplicate detection (high similarity)
    const descArray = Array.from(allDescriptions.keys());
    for (let i = 0; i < descArray.length; i++) {
      for (let j = i + 1; j < descArray.length; j++) {
        const sim = new MetaDescriptionValidator().calculateSimilarity(descArray[i], descArray[j]);
        if (sim > 0.85) {
          uniquenessResult.addWarning(
            `Near-duplicate descriptions detected (${(sim * 100).toFixed(0)}% similar)`,
            {
              page1: allDescriptions.get(descArray[i])[0]?.url,
              page2: allDescriptions.get(descArray[j])[0]?.url,
              similarity: (sim * 100).toFixed(0) + '%',
              recommendation: 'Differentiate descriptions with page-specific details, unique selling points, or different keyword focus.'
            }
          );
        }
      }
    }

    return uniquenessResult;
  }
}

export default MetaDescriptionValidator;