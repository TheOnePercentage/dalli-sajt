export class FAQSchema {
  constructor() {
    this.faqsCache = null;
    this.baseUrl = window.location.origin;
  }

  async loadFAQs() {
    if (this.faqsCache) return this.faqsCache;
    try {
      const response = await fetch('/data/faqs.json');
      const data = await response.json();
      this.faqsCache = data.faqs || [];
      return this.faqsCache;
    } catch (error) {
      console.warn('[FAQSchema] Failed to load FAQs:', error);
      return [];
    }
  }

  getFAQsForPage(pageType, pageSlug) {
    if (!this.faqsCache) return [];
    return this.faqsCache.filter(faq => {
      if (faq.status !== 'published') return false;
      if (pageType === 'category') {
        return faq.type === 'category' && faq.targetId === `category:${pageSlug}`;
      }
      if (pageType === 'product') {
        return faq.type === 'product' && faq.targetId === `product:${pageSlug}`;
      }
      if (pageType === 'guide') {
        return faq.type === 'guide' && faq.targetId === `guide:${pageSlug}`;
      }
      if (pageType === 'global') {
        return faq.type === 'global';
      }
      return false;
    });
  }

  generateFAQPageSchema(faqs) {
    if (!faqs || faqs.length === 0) return null;
    return {
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
  }

  injectSchema(schema) {
    if (!schema) return;
    const existing = document.getElementById('faq-schema-jsonld');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'faq-schema-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  async initForPage(pageType, pageSlug) {
    await this.loadFAQs();
    const faqs = this.getFAQsForPage(pageType, pageSlug);
    const schema = this.generateFAQPageSchema(faqs);
    this.injectSchema(schema);
    return { faqs, schema };
  }

  static getInstance() {
    if (!FAQSchema.instance) {
      FAQSchema.instance = new FAQSchema();
    }
    return FAQSchema.instance;
  }
}

export const faqSchema = FAQSchema.getInstance();
export default FAQSchema;