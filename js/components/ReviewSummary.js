/**
 * ReviewSummary - Compact review summary for product cards, collection cards, etc.
 */

export class ReviewSummary extends HTMLElement {
  static get observedAttributes() {
    return ['rating', 'count', 'size', 'show-text'];
  }

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  renderStars(rating, size = 14) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${i <= value ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="color: var(--color-warning);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return stars;
  }

  render() {
    const rating = parseFloat(this.getAttribute('rating')) || 0;
    const count = parseInt(this.getAttribute('count')) || 0;
    const size = parseInt(this.getAttribute('size')) || 14;
    const showText = this.hasAttribute('show-text');

    this.innerHTML = `
      <div class="review-summary" style="display: inline-flex; align-items: center; gap: var(--space-1);">
        <span class="rating-stars" style="color: var(--color-warning); display: inline-flex;">${this.renderStars(rating, 14)}</span>
        ${this.hasAttribute('show-text') ? `
          <span class="rating-value" style="font-weight: var(--font-semibold); color: var(--color-text-primary); margin-left: var(--space-1);">${rating.toFixed(1)}</span>
          <span class="review-count" style="color: var(--color-text-tertiary); font-size: var(--text-xs); margin-left: var(--space-1);">(${this.getAttribute('count') || 0})</span>
        ` : ''}
      </div>
    `;
  }
}

if (!customElements.get('review-summary')) {
  customElements.define('review-summary', ReviewSummary);
}

export default ReviewSummary;