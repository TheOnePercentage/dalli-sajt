import { faqSchema } from '../services/faq-schema.js';

export class FAQSchemaInjector {
  constructor() {
    this.initialized = false;
  }

  detectPageContext() {
    const path = window.location.pathname;
    const metaType = document.querySelector('meta[name="page-type"]')?.getAttribute('content');
    const metaSlug = document.querySelector('meta[name="page-slug"]')?.getAttribute('content');

    if (metaType && metaSlug) {
      return { type: metaType, slug: metaSlug };
    }

    if (path.includes('/kategorija/') || path.includes('/category/')) {
      const slug = path.split('/').filter(Boolean).pop();
      return { type: 'category', slug };
    }
    if (path.includes('/proizvod/') || path.includes('/product/')) {
      const slug = path.split('/').filter(Boolean).pop();
      return { type: 'product', slug };
    }
    if (path.includes('/vodic/') || path.includes('/guide/')) {
      const slug = path.split('/').filter(Boolean).pop();
      return { type: 'guide', slug };
    }
    return null;
  }

  async init() {
    if (this.initialized) return;
    const context = this.detectPageContext();
    if (!context) return;
    await faqSchema.initForPage(context.type, context.slug);
    this.initialized = true;
  }
}

export const faqSchemaInjector = new FAQSchemaInjector();
export default FAQSchemaInjector;