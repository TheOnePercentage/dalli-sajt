/**
 * FAQ Service - Unified FAQ management for DALLI
 * Handles FAQ loading, filtering, rendering, and schema.org injection
 */

class FAQService {
  constructor() {
    this.faqs = [];
    this.loaded = false;
    this.cache = new Map();
  }

  /**
   * Initialize FAQ service by loading data
   * @returns {Promise<void>}
   */
  async init() {
    if (this.loaded) return;

    try {
      const response = await fetch('/data/faqs.json');
      if (!response.ok) throw new Error('Failed to load FAQs');
      const data = await response.json();
      this.faqs = data.faqs || [];
      this.loaded = true;
      this.buildCache();
      console.log('[FAQService] Loaded', this.faqs.length, 'FAQs');
    } catch (error) {
      console.error('[FAQService] Init failed:', error);
      this.faqs = [];
      this.loaded = true;
    }
  }

  /**
   * Build internal cache for fast lookups
   * @private
   */
  buildCache() {
    this.cache.clear();
    
    // Cache by type
    this.cache.set('byType', new Map());
    this.cache.set('byTarget', new Map());
    this.cache.set('byId', new Map());

    this.faqs.forEach(faq => {
      // By ID
      this.cache.get('byId').set(faq.id, faq);

      // By type
      const typeMap = this.cache.get('byType');
      if (!typeMap.has(faq.type)) typeMap.set(faq.type, []);
      typeMap.get(faq.type).push(faq);

      // By target
      if (faq.targetId) {
        const targetMap = this.cache.get('byTarget');
        if (!targetMap.has(faq.targetId)) targetMap.set(faq.targetId, []);
        targetMap.get(faq.targetId).push(faq);
      }
    });
  }

  /**
   * Get FAQs by target (category, product, guide)
   * @param {string} targetId - e.g., "category:majice", "product:1", "guide:kako-izabrati-duks"
   * @returns {Array} Filtered FAQs
   */
  getByTarget(targetId) {
    if (!this.loaded) return [];
    return this.cache.get('byTarget').get(targetId) || [];
  }

  /**
   * Get FAQs by type
   * @param {string} type - "category" | "product" | "guide" | "brand" | "shipping" | "returns" | "payments"
   * @returns {Array} Filtered FAQs
   */
  getByType(type) {
    if (!this.loaded) return [];
    return this.cache.get('byType').get(type) || [];
  }

  /**
   * Get FAQ by ID
   * @param {string} id - FAQ ID
   * @returns {Object|null} FAQ object
   */
  getById(id) {
    if (!this.loaded) return null;
    return this.cache.get('byId').get(id) || null;
  }

  /**
   * Search FAQs by query
   * @param {string} query - Search query
   * @param {Object} options - { type, targetId, limit }
   * @returns {Array} Matching FAQs
   */
  search(query, options = {}) {
    if (!this.loaded || !query.trim()) return [];

    const q = query.toLowerCase().trim();
    const words = q.split(/\s+/).filter(w => w.length > 1);

    let candidates = this.faqs;

    if (options.type) {
      candidates = candidates.filter(f => f.type === options.type);
    }
    if (options.targetId) {
      candidates = candidates.filter(f => f.targetId === options.targetId);
    }

    // Score matches
    const scored = candidates.map(faq => {
      let score = 0;
      const text = (faq.question + ' ' + faq.answer + ' ' + (faq.keywords || []).join(' ')).toLowerCase();

      words.forEach(word => {
        if (faq.question.toLowerCase().includes(word)) score += 10;
        if (faq.keywords && faq.keywords.some(k => k.toLowerCase().includes(word))) score += 5;
        if (text.includes(word)) score += 1;
      });

      return { faq, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10)
      .map(s => s.faq);
  }

  /**
   * Get FAQs for a page (category, product, guide) with schema.org injection
   * @param {string} pageType - "category" | "product" | "guide"
   * @param {string} pageSlug - Page identifier
   * @returns {Object} { faqs, schemaJsonLd }
   */
  getForPage(pageType, pageSlug) {
    let targetId;
    switch (pageType) {
      case 'category':
        targetId = `category:${pageSlug}`;
        break;
      case 'product':
        targetId = `product:${pageSlug}`;
        break;
      case 'guide':
        targetId = `guide:${pageSlug}`;
        break;
      default:
        return { faqs: [], schemaJsonLd: null };
    }

    const faqs = this.getByTarget(targetId).filter(f => f.status === 'published');

    // Generate FAQPage schema.org JSON-LD
    const schemaJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };

    return {
      faqs,
      schemaJsonLd: JSON.stringify(schemaJsonLd, null, 2)
    };
  }

  /**
   * Render FAQ accordion HTML with schema.org microdata
   * @param {Array} faqs - FAQ objects
   * @param {Object} options - { showSearch, showCategories }
   * @returns {string} HTML string
   */
  renderAccordion(faqs, options = {}) {
    if (!faqs.length) return '';

    const itemsHtml = faqs.map((faq, index) => `
      <details class="faq-item" itemscope itemtype="https://schema.org/Question" data-faq-id="${faq.id}">
        <summary class="faq-question" itemprop="name" aria-expanded="false">
          ${faq.question}
          <span class="faq-toggle" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </summary>
        <div class="faq-answer" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
          <div itemprop="text">${faq.answer}</div>
        </div>
      </details>
    `).join('');

    return `
      <section class="faq-accordion" aria-label="Često postavljana pitanja" itemscope itemtype="https://schema.org/FAQPage">
        ${itemsHtml}
      </section>
    `;
  }

  /**
   * Track FAQ view
   * @param {string} faqId - FAQ ID
   */
  trackView(faqId) {
    const faq = this.getById(faqId);
    if (faq) {
      faq.viewCount = (faq.viewCount || 0) + 1;
      this.buildCache(); // Rebuild cache
      // Send to analytics
      this.sendAnalytics('faq_view', { faqId, question: faq.question });
    }
  }

  /**
   * Track FAQ helpful vote
   * @param {string} faqId - FAQ ID
   * @param {boolean} helpful - true/false
   */
  trackHelpful(faqId, helpful) {
    const faq = this.getById(faqId);
    if (faq) {
      faq.helpfulCount = (faq.helpfulCount || 0) + (helpful ? 1 : -1);
      this.buildCache();
      this.sendAnalytics('faq_helpful', { faqId, helpful });
    }
  }

  /**
   * Send analytics event
   * @private
   */
  sendAnalytics(event, data) {
    if (window.gtag) {
      gtag('event', event, data);
    }
    if (window.dataLayer) {
      window.dataLayer.push({ event, ...data });
    }
  }

  /**
   * Get stats
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      total: this.faqs.length,
      byType: this.faqs.reduce((acc, f) => {
        acc[f.type] = (acc[f.type] || 0) + 1;
        return acc;
      }, {}),
      published: this.faqs.filter(f => f.status === 'published').length,
      totalViews: this.faqs.reduce((sum, f) => sum + (f.viewCount || 0), 0),
      totalHelpful: this.faqs.reduce((sum, f) => sum + (f.helpfulCount || 0), 0)
    };
  }
}

// Export singleton
let faqServiceInstance = null;

export function getFAQService() {
  if (!faqServiceInstance) faqServiceInstance = new FAQService();
  return faqServiceInstance;
}

export { FAQService };
export default FAQService;