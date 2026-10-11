export class FAQAccordion extends HTMLElement {
  static get observedAttributes() {
    return ['faqs', 'page-type', 'page-slug', 'max-items'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.faqs = [];
    this.maxItems = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'faqs') {
      try {
        this.faqs = JSON.parse(newValue);
      } catch {
        this.faqs = [];
      }
      this.render();
    } else if (name === 'max-items') {
      this.maxItems = newValue ? parseInt(newValue, 10) : null;
      this.render();
    } else {
      this.loadFAQs();
    }
  }

  async loadFAQs() {
    if (this.hasAttribute('faqs')) return;
    try {
      const response = await fetch('/data/faqs.json');
      const data = await response.json();
      const allFaqs = data.faqs || [];
      const pageType = this.getAttribute('page-type');
      const pageSlug = this.getAttribute('page-slug');
      
      this.faqs = allFaqs.filter(faq => {
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
        return false;
      });
      this.render();
    } catch (error) {
      console.warn('[FAQAccordion] Failed to load FAQs:', error);
    }
  }

  getStyles() {
    return `
      <style>
        :host {
          display: block;
          font-family: inherit;
        }
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3, 1rem);
        }
        .faq-item {
          border: 1px solid var(--color-border-primary, #e5e7eb);
          border-radius: var(--radius-md, 0.5rem);
          background: var(--color-bg-primary, #fff);
          overflow: hidden;
        }
        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4, 1rem);
          background: transparent;
          border: none;
          cursor: pointer;
          font: inherit;
          font-weight: 600;
          text-align: left;
          color: var(--color-text-primary, #111);
          gap: var(--space-3, 0.75rem);
        }
        .faq-question:hover {
          background: var(--color-bg-secondary, #f9fafb);
        }
        .faq-question:focus-visible {
          outline: 2px solid var(--color-primary, #2563eb);
          outline-offset: -2px;
        }
        .faq-icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          color: var(--color-text-tertiary, #9ca3af);
          transition: transform 0.2s ease;
        }
        .faq-item[open] .faq-icon {
          transform: rotate(180deg);
        }
        .faq-answer {
          padding: 0 var(--space-4, 1rem) var(--space-4, 1rem);
          color: var(--color-text-secondary, #4b5563);
          line-height: 1.7;
          animation: faq-slide-down 0.2s ease;
        }
        @keyframes faq-slide-down {
          from { opacity: 0; transform: translateY(-0.5rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        .faq-empty {
          text-align: center;
          padding: var(--space-8, 2rem);
          color: var(--color-text-tertiary, #9ca3af);
        }
        .faq-see-more {
          display: block;
          text-align: center;
          margin-top: var(--space-4, 1rem);
          padding: var(--space-3, 0.75rem);
          background: var(--color-primary-light, #eff6ff);
          color: var(--color-primary, #2563eb);
          border-radius: var(--radius-md, 0.5rem);
          font-weight: 500;
          text-decoration: none;
        }
        .faq-see-more:hover {
          background: var(--color-primary, #2563eb);
          color: white;
        }
      </style>
    `;
  }

  render() {
    const displayFaqs = this.maxItems ? this.faqs.slice(0, this.maxItems) : this.faqs;
    const hasMore = this.maxItems && this.faqs.length > this.maxItems;

    this.shadowRoot.innerHTML = `
      ${this.getStyles()}
      ${displayFaqs.length === 0 ? `
        <div class="faq-empty">
          <p>No FAQs available for this page.</p>
        </div>
      ` : `
        <div class="faq-list">
          ${displayFaqs.map((faq, index) => `
            <details class="faq-item" ${index === 0 ? 'open' : ''}>
              <summary class="faq-question">
                <span>${this.escapeHtml(faq.question)}</span>
                <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <div class="faq-answer">${this.escapeHtml(faq.answer).replace(/\n/g, '<br>')}</div>
            </details>
          `).join('')}
        </div>
        ${hasMore ? `
          <a href="/faq" class="faq-see-more">
            View all ${this.faqs.length} FAQs
          </a>
        ` : ''}
      `
    }`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

if (!customElements.get('faq-accordion')) {
  customElements.define('faq-accordion', FAQAccordion);
}

export default FAQAccordion;