/**
 * Image Alt Text Validator
 * Validates image alt attributes for accessibility and SEO
 * Checks: presence, descriptiveness, keyword stuffing, redundancy, accessibility
 */

import { BaseValidator, ValidationResult, ValidatorConfig } from './base-validator.js';

export class ImageAltConfig extends ValidatorConfig {
  constructor(options = {}) {
    super(options);
    this.requireAlt = options.requireAlt !== false;
    this.minLength = options.minLength || 10;
    this.maxLength = options.maxLength || 125;
    this.optimalMin = options.optimalMin || 50;
    this.optimalMax = options.optimalMax || 100;
    this.checkDecorative = options.checkDecorative !== false;
    this.checkRedundancy = options.checkRedundancy !== false;
    this.checkKeywordStuffing = options.checkKeywordStuffing !== false;
    this.checkFileNameFallback = options.checkFileNameFallback !== false;
    this.allowEmptyForDecorative = options.allowEmptyForDecorative !== false;
    this.checkContextRelevance = options.checkContextRelevance !== false;
    this.maxImagesWithoutAlt = options.maxImagesWithoutAlt || 0;
  }
}

export class ImageAltValidator extends BaseValidator {
  constructor(config = {}) {
    super(new ImageAltConfig(config));
    this.name = 'image-alt';
    this.results = [];
  }

  /**
   * Reset results (call before new audit)
   */
  resetResults() {
    this.results = [];
  }

  /**
   * Get all results for cross-image analysis
   * @returns {Array}
   */
  getResults() {
    return this.results;
  }

  async runValidation(document, url, context = {}) {
    const result = new ValidationResult();
    result.metadata.url = url;
    result.metadata.validator = this.name;

    const images = this.getAllImages(document);
    result.metadata.totalImages = images.length;
    result.metadata.imagesWithAlt = 0;
    result.metadata.imagesWithoutAlt = 0;
    result.metadata.decorativeImages = 0;

    if (images.length === 0) {
      result.addInfo('No images found on page', { recommendation: 'Consider adding relevant images for better engagement and SEO.' });
      return result;
    }

    // Process each image
    for (const img of images) {
      const imgResult = this.validateImage(img, document, url, context);
      this.results.push({
        url,
        src: img.src,
        ...imgResult
      });
      result.merge(imgResult.result);

      if (imgResult.hasAlt) result.metadata.imagesWithAlt++;
      else result.metadata.imagesWithoutAlt++;
      if (imgResult.isDecorative) result.metadata.decorativeImages++;
    }

    // Summary checks
    this.validateCoverage(result);
    this.validateConsistency(result);

    result.metadata.score = this.calculateScore(result);
    return result;
  }

  /**
   * Get all images from document
   * @param {Document} document
   * @returns {Array<Object>}
   */
  getAllImages(document) {
    const imgs = this.$$(document, 'img');
    return Array.from(imgs).map(img => ({
      element: img,
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || '',
      hasAlt: img.hasAttribute('alt'),
      altText: img.getAttribute('alt') || '',
      width: img.getAttribute('width'),
      height: img.getAttribute('height'),
      loading: img.getAttribute('loading'),
      decoding: img.getAttribute('decoding'),
      className: img.className,
      parent: img.parentElement,
      role: img.getAttribute('role'),
      'aria-label': img.getAttribute('aria-label'),
      'aria-labelledby': img.getAttribute('aria-labelledby')
    }));
  }

  /**
   * Validate a single image
   * @param {Object} img - Image data object
   * @param {Document} document
   * @param {string} url
   * @param {Object} context
   * @returns {{result: ValidationResult, hasAlt: boolean, isDecorative: boolean}}
   */
  validateImage(img, document, url, context) {
    const result = new ValidationResult();
    result.metadata.imageSrc = img.src;
    result.metadata.imageUrl = img.src;

    const alt = img.altText;
    const hasAlt = img.hasAlt;
    const src = img.src;

    result.metadata.hasAlt = hasAlt;
    result.metadata.altLength = alt.length;

    // 1. PRESENCE CHECK
    if (!hasAlt) {
      result.addError('Missing alt attribute', {
        field: 'alt',
        imageSrc: src,
        recommendation: 'Add descriptive alt attribute. Use empty alt="" only for purely decorative images.',
        impact: 'high',
        wcag: '1.1.1 Non-text Content'
      });
      return { result, hasAlt: false, isDecorative: false };
    }

    // 2. EMPTY ALT CHECK (decorative images)
    if (alt.trim() === '') {
      const isDecorative = this.isLikelyDecorative(img, document);
      result.metadata.isDecorative = isDecorative;

      if (isDecorative && this.config.allowEmptyForDecorative) {
        result.addPassed('Empty alt correctly used for decorative image', {
          field: 'alt',
          imageSrc: src,
          wcag: '1.1.1 Non-text Content'
        });
      } else {
        result.addWarning('Empty alt attribute - verify image is truly decorative', {
          field: 'alt',
          imageSrc: src,
          recommendation: 'If image conveys information, add descriptive alt text. If purely decorative, ensure it has role="presentation" or aria-hidden="true".',
          wcag: '1.1.1 Non-text Content'
        });
      }
      return { result, hasAlt: true, isDecorative: true };
    }

    // 3. LENGTH VALIDATION
    this.validateAltLength(alt, result, img);

    // 4. QUALITY & CONTENT VALIDATION
    this.validateAltQuality(alt, result, img, context);

    // 5. KEYWORD STUFFING
    if (this.config.checkKeywordStuffing) {
      this.validateKeywordStuffing(alt, result, context);
    }

    // 6. REDUNDANCY CHECK
    if (this.config.checkRedundancy) {
      this.validateRedundancy(alt, img, document, result);
    }

    // 7. FILENAME FALLBACK CHECK
    if (this.config.checkFileNameFallback) {
      this.validateFilenameFallback(alt, img, result);
    }

    // 8. CONTEXT RELEVANCE
    if (this.config.checkContextRelevance) {
      this.validateContextRelevance(alt, img, document, result, context);
    }

    // 9. ACCESSIBILITY BEST PRACTICES
    this.validateAccessibility(img, result);

    // 10. TECHNICAL ATTRIBUTES
    this.validateTechnicalAttributes(img, result);

    return { result, hasAlt: true, isDecorative: false };
  }

  /**
   * Determine if image is likely decorative
   * @param {Object} img
   * @param {Document} document
   * @returns {boolean}
   */
  isLikelyDecorative(img, document) {
    // Check for explicit role
    if (img.role === 'presentation' || img['aria-hidden'] === 'true') return true;

    // Check class names for decorative indicators
    const decorativeClasses = ['decoration', 'decorative', 'bg-', 'background', 'icon', 'spacer', 'divider', 'ornament'];
    const className = img.className || '';
    if (decorativeClasses.some(cls => className.includes(cls))) return true;

    // Check if in decorative context (e.g., background image container)
    const parent = img.parent;
    if (parent) {
      const parentClass = parent.className || '';
      if (decorativeClasses.some(cls => parentClass.includes(cls))) return true;
    }

    // Check for small images (likely icons/spacers)
    const width = parseInt(img.width) || 0;
    const height = parseInt(img.height) || 0;
    if (width > 0 && height > 0 && width <= 16 && height <= 16) return true;

    // Check src for decorative patterns
    const src = img.src || '';
    if (src.includes('icon') || src.includes('spacer') || src.includes('divider') || src.includes('bg-')) return true;

    return false;
  }

  validateAltLength(alt, result, img) {
    const { minLength, maxLength, optimalMin, optimalMax } = this.config;
    const length = alt.length;

    result.metadata.altLength = length;

    if (length < minLength) {
      result.addError(`Alt text too short (${length} chars). Minimum: ${minLength} characters.`, {
        field: 'alt',
        imageSrc: img.src,
        currentLength: length,
        minLength,
        recommendation: `Provide more descriptive alt text (${minLength}+ characters). Describe the image content and function.`,
        impact: 'high'
      });
    } else if (length > maxLength) {
      result.addWarning(`Alt text too long (${length} chars). Maximum recommended: ${maxLength} characters.`, {
        field: 'alt',
        imageSrc: img.src,
        currentLength: length,
        maxLength,
        recommendation: `Shorten to ${maxLength} characters. Screen readers may truncate longer alt text.`
      });
    } else if (length >= optimalMin && length <= optimalMax) {
      result.addPassed(`Optimal alt length (${length} chars)`, { field: 'alt', length });
    } else if (length < optimalMin) {
      result.addWarning(`Alt text could be more descriptive (${length} chars). Optimal: ${optimalMin}-${optimalMax} chars.`, {
        field: 'alt',
        currentLength: length,
        optimalMin,
        optimalMax,
        recommendation: 'Add more detail about what the image shows and its purpose.'
      });
    }
  }

  validateAltQuality(alt, result, img, context) {
    const qualityScore = this.calculateTextQuality(alt);
    result.metadata.qualityScore = qualityScore;

    if (qualityScore < 40) {
      result.addError('Low alt text quality', {
        score: qualityScore,
        recommendation: 'Write descriptive, specific alt text. Avoid generic terms like "image", "photo", "picture".'
      });
    } else if (qualityScore < 60) {
      result.addWarning('Alt text quality could be improved', {
        score: qualityScore,
        recommendation: 'Be more specific: describe what is shown, colors, actions, text in image, etc.'
      });
    } else {
      result.addPassed(`Good alt quality (${qualityScore}/100)`, { score: qualityScore });
    }

    // Check for generic/useless descriptions
    const genericTerms = ['image', 'photo', 'picture', 'img', 'pic', 'photograph', 'snapshot', 'graphic', 'illustration'];
    const altLower = alt.toLowerCase();
    const isGeneric = genericTerms.some(term => altLower === term || altLower === term + ' of' || altLower.startsWith(term + ' '));

    if (isGeneric) {
      result.addError('Generic alt text (e.g., "image", "photo") provides no value', {
        field: 'alt',
        imageSrc: img.src,
        recommendation: 'Describe WHAT the image shows: "Red cotton hoodie on model", "Size chart for hoodies", "Free shipping badge"'
      });
    }

    // Check for "image of" / "picture of" redundancy
    if (/^(image|photo|picture|graphic|illustration)\s+(of|showing)\s+/i.test(alt)) {
      result.addWarning('Redundant "image of" prefix', {
        recommendation: 'Remove "image of" / "picture of". Screen readers already announce "image". Start directly with description.'
      });
    }

    // Check for file name as alt
    if (this.config.checkFileNameFallback) {
      this.validateFilenameFallback(alt, img, result);
    }
  }

  validateKeywordStuffing(alt, result, context) {
    const altLower = alt.toLowerCase();
    const words = alt.split(/\s+/).filter(w => w.length > 2);
    
    // Check for repeated words
    const wordFreq = {};
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    
    for (const [word, count] of Object.entries(wordFreq)) {
      if (count > 2) {
        result.addWarning(`Word "${word}" repeated ${count} times in alt text`, {
          word,
          count,
          recommendation: 'Avoid keyword repetition. Use synonyms and natural language.'
        });
      }
    }

    // Check against target keywords if provided
    if (context.targetKeywords) {
      context.targetKeywords.forEach(kw => {
        const occurrences = (altLower.match(new RegExp(kw.toLowerCase(), 'g')) || []).length;
        if (occurrences > 2) {
          result.addWarning(`Target keyword "${kw}" repeated ${occurrences} times in alt`, {
            keyword: kw,
            occurrences,
            recommendation: 'Use keyword naturally once. Alt text is for accessibility, not keyword stuffing.'
          });
        }
      });
    }
  }

  validateRedundancy(alt, img, document, result) {
    const altLower = alt.toLowerCase().trim();
    
    // Check against nearby text content
    const parent = img.parent;
    if (parent) {
      const parentText = parent.textContent?.toLowerCase() || '';
      
      // If alt text is identical to adjacent text, it's redundant
      if (parentText.includes(altLower) && altLower.length > 20) {
        result.addWarning('Alt text duplicates adjacent text content', {
          recommendation: 'Alt text should complement, not duplicate, surrounding text. Describe visual details not in text.'
        });
      }
    }

    // Check against figure caption
    const figure = img.element.closest?.('figure');
    if (figure) {
      const figcaption = figure.querySelector('figcaption');
      if (figcaption) {
        const captionText = figcaption.textContent?.toLowerCase().trim() || '';
        if (captionText === altLower) {
          result.addWarning('Alt text duplicates figcaption', {
            recommendation: 'Alt text and caption should complement each other. Alt = visual details, Caption = context/attribution.'
          });
        }
      }
    }

    // Check for multiple identical alt texts on page (handled in cross-image analysis)
  }

  validateFilenameFallback(alt, img, result) {
    const src = img.src || '';
    if (!src) return;

    // Extract filename from URL
    const filename = src.split('/').pop()?.split('?')[0] || '';
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
    const normalizedFilename = nameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase();

    const altLower = alt.toLowerCase().trim();
    
    // Check if alt is just the filename
    if (altLower === normalizedFilename || altLower === filename.toLowerCase()) {
      result.addError('Alt text appears to be auto-generated from filename', {
        filename,
        recommendation: 'Write meaningful alt text describing the image content, not the file name.'
      });
    }
    
    // Check for common filename patterns in alt
    const filenamePatterns = [/img_\d+/i, /image_\d+/i, /photo_\d+/i, /pic_\d+/i, /screenshot/i, /dsc\d+/i, /img-\d+/i];
    if (filenamePatterns.some(p => p.test(alt))) {
      result.addWarning('Alt text resembles auto-generated filename', {
        recommendation: 'Replace with descriptive alt text about image content.'
      });
    }
  }

  validateContextRelevance(alt, img, document, result, context) {
    // Check if alt relates to page content
    if (context.targetKeywords) {
      const altLower = alt.toLowerCase();
      const relevantKeywords = context.targetKeywords.filter(kw => altLower.includes(kw.toLowerCase()));
      
      if (relevantKeywords.length === 0 && context.targetKeywords.length > 0) {
        result.addInfo('Alt text does not contain target keywords', {
          targetKeywords: context.targetKeywords,
          recommendation: 'Consider including relevant keywords naturally if they describe the image.'
        });
      } else if (relevantKeywords.length > 0) {
        result.addPassed(`Alt text contains relevant keywords: ${relevantKeywords.join(', ')}`, {});
      }
    }

    // Check for product image context
    const productContext = document.querySelector('[itemtype*="Product"], .product, .product-detail, [data-product]');
    if (productContext && productContext.contains(img.element)) {
      // This is a product image - should describe product visually
      const visualTerms = ['color', 'front', 'back', 'side', 'detail', 'close', 'zoom', 'model', 'wearing', 'fit'];
      const hasVisualContext = visualTerms.some(term => alt.toLowerCase().includes(term));
      if (!hasVisualContext) {
        result.addInfo('Product image could include visual context', {
          recommendation: 'Add details like "front view", "red color", "model wearing size M", "close-up of stitching"'
        });
      }
    }
  }

  validateAccessibility(img, result) {
    // Check for loading attribute
    if (!img.loading) {
      result.addInfo('Missing loading attribute', {
        recommendation: 'Add loading="lazy" for below-fold images, loading="eager" for above-fold.'
      });
    }

    // Check for width/height (prevents layout shift)
    if (!img.width || !img.height) {
      result.addInfo('Missing width/height attributes', {
        recommendation: 'Add width and height attributes to prevent cumulative layout shift (CLS).'
      });
    }

    // Check for decoding attribute
    if (!img.decoding) {
      result.addInfo('Missing decoding attribute', {
        recommendation: 'Add decoding="async" for non-critical images to improve paint time.'
      });
    }

    // Check for role="presentation" on decorative
    if (img.role === 'presentation' && img.altText !== '') {
      result.addWarning('role="presentation" with non-empty alt', {
        recommendation: 'Use empty alt="" with role="presentation" for decorative images.'
      });
    }

    // Check aria-label vs alt
    if (img['aria-label'] && img.altText && img['aria-label'] !== img.altText) {
      result.addWarning('aria-label differs from alt text', {
        recommendation: 'Ensure aria-label and alt provide consistent information.'
      });
    }
  }

  validateTechnicalAttributes(img, result) {
    // Check for srcset (responsive images)
    const srcset = img.element?.getAttribute?.('srcset');
    if (!srcset && img.src) {
      result.addInfo('Missing srcset for responsive images', {
        recommendation: 'Add srcset with multiple resolutions for better performance on different devices.'
      });
    }

    // Check for sizes attribute
    const sizes = img.element?.getAttribute?.('sizes');
    if (srcset && !sizes) {
      result.addInfo('Missing sizes attribute with srcset', {
        recommendation: 'Add sizes attribute to help browser choose correct image from srcset.'
      });
    }
  }

  validateCoverage(result) {
    const { totalImages, imagesWithoutAlt, decorativeImages } = result.metadata;
    const meaningfulImages = totalImages - decorativeImages;
    const missingAltOnMeaningful = imagesWithoutAlt;

    if (meaningfulImages > 0) {
      const coverage = ((meaningfulImages - missingAltOnMeaningful) / meaningfulImages * 100).toFixed(1);
      result.metadata.altCoverage = coverage + '%';

      if (missingAltOnMeaningful > 0) {
        result.addError(`${missingAltOnMeaningful} of ${meaningfulImages} meaningful images missing alt text`, {
          coverage: coverage + '%',
          recommendation: 'Add descriptive alt text to all meaningful images for accessibility and SEO.',
          impact: 'high'
        });
      } else {
        result.addPassed(`100% alt coverage on ${meaningfulImages} meaningful images`, { coverage: '100%' });
      }
    }
  }

  validateConsistency(result) {
    // Check for consistent alt style across page
    const alts = this.results
      .filter(r => r.url === result.metadata.url && r.hasAlt && !r.isDecorative)
      .map(r => r.altText.toLowerCase());
    
    if (alts.length > 2) {
      // Check for consistent style (e.g., all start with capital, all end with period)
      const startsWithCapital = alts.filter(a => /^[A-Z]/.test(a.trim())).length;
      const endsWithPeriod = alts.filter(a => a.trim().endsWith('.')).length;
      
      if (startsWithCapital < alts.length * 0.5) {
        result.addInfo('Inconsistent capitalization in alt texts', {
          recommendation: 'Use consistent style: start all alt texts with capital letter.'
        });
      }
      if (endsWithPeriod < alts.length * 0.5) {
        result.addInfo('Inconsistent punctuation in alt texts', {
          recommendation: 'Consider ending all alt texts with a period for consistency.'
        });
      }
    }
  }

  calculateScore(result) {
    const { totalImages, imagesWithoutAlt, decorativeImages } = result.metadata;
    const meaningfulImages = totalImages - decorativeImages;
    
    if (totalImages === 0) return 100;
    if (meaningfulImages === 0) return 100; // All decorative
    
    let score = 100;
    
    // Heavy penalty for missing alt on meaningful images
    const missingRatio = imagesWithoutAlt / meaningfulImages;
    score -= missingRatio * 50;
    
    // Penalties from errors/warnings
    result.errors.forEach(e => score -= e.details.impact === 'high' ? 15 : 10);
    result.warnings.forEach(w => score -= 5);
    
    // Bonus for good practices
    if (result.metadata.altCoverage === '100%') score += 10;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Cross-image analysis (call after all pages)
   * @param {Array} allResults
   * @returns {ValidationResult}
   */
  static checkCrossImageConsistency(allResults) {
    const consistencyResult = new ValidationResult();
    const allImages = [];
    
    allResults.forEach(r => {
      if (r.metadata.validator === 'image-alt' && r.metadata.imageSrc) {
        allImages.push({
          url: r.metadata.url,
          src: r.metadata.imageSrc,
          alt: r.metadata.altText || '',
          hasAlt: r.metadata.hasAlt,
          length: r.metadata.altLength
        });
      }
    });

    // Group by similar src (same image used on multiple pages)
    const srcGroups = new Map();
    allImages.forEach(img => {
      const normalizedSrc = img.src.split('?')[0];
      if (!srcGroups.has(normalizedSrc)) {
        srcGroups.set(normalizedSrc, []);
      }
      srcGroups.get(normalizedSrc).push(img);
    });

    // Check consistency of alt text for same image across pages
    for (const [src, images] of srcGroups.entries()) {
      if (images.length > 1) {
        const alts = images.map(i => i.alt.trim().toLowerCase());
        const uniqueAlts = new Set(alts);
        
        if (uniqueAlts.size > 1) {
          consistencyResult.addWarning(`Same image has different alt texts on ${images.length} pages`, {
            src,
            alts: [...uniqueAlts],
            pages: images.map(i => i.url),
            recommendation: 'Use consistent alt text for the same image across pages. Create an alt text library for reused images.'
          });
        }
      }
    }

    // Check for duplicate alt texts on same page
    const pageGroups = new Map();
    allImages.forEach(img => {
      if (!pageGroups.has(img.url)) pageGroups.set(img.url, []);
      pageGroups.get(img.url).push(img);
    });

    for (const [url, images] of pageGroups.entries()) {
      const altMap = new Map();
      images.forEach(img => {
        if (img.hasAlt && img.alt) {
          const normalized = img.alt.toLowerCase().trim();
          if (!altMap.has(normalized)) altMap.set(normalized, []);
          altMap.get(normalized).push(img.src);
        }
      });

      for (const [alt, srcs] of altMap.entries()) {
        if (srcs.length > 1 && alt.length > 10) {
          consistencyResult.addWarning(`Duplicate alt text on page: "${alt.substring(0, 50)}..."`, {
            url,
            count: srcs.length,
            images: srcs,
            recommendation: 'Each image should have unique alt text describing its specific content.'
          });
        }
      }
    }

    return consistencyResult;
  }
}

export default ImageAltValidator;