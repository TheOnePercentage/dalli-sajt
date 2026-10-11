/**
 * ReviewWidget - Reusable review display component
 * Supports product reviews, collection reviews, and location reviews
 */

export class ReviewWidget extends HTMLElement {
  static get observedAttributes() {
    return ['entity-type', 'entity-id', 'max-reviews', 'show-form', 'sort-by'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.reviews = [];
    this.stats = { averageRating: 0, totalReviews: 0, distribution: {}, verifiedPercent: 0 };
    this.currentPage = 1;
    this.pageSize = 5;
    this.sortBy = 'newest';
  }

  connectedCallback() {
    this.entityType = this.getAttribute('entity-type') || 'product';
    this.entityId = this.getAttribute('entity-id');
    this.maxReviews = parseInt(this.getAttribute('max-reviews')) || 10;
    this.showForm = this.hasAttribute('show-form');
    this.sortBy = this.getAttribute('sort-by') || 'newest';
    
    this.loadData();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'entity-id' || name === 'entity-type') {
      this.entityId = newValue;
      this.loadData();
    } else if (name === 'sort-by') {
      this.sortBy = newValue;
      this.currentPage = 1;
      this.render();
    }
  }

  async loadData() {
    try {
      // Try to get stats
      const statsUrl = `/api/reviews/stats?type=${this.entityType}&id=${this.entityId}`;
      const statsRes = await fetch(statsUrl);
      if (statsRes.ok) {
        this.stats = await statsRes.json();
      }

      // Load reviews
      const reviewsUrl = `/api/reviews?type=${this.entityType}&id=${this.entityId}&sort=${this.sortBy}&page=1&limit=${this.maxReviews}`;
      const reviewsRes = await fetch(reviewsUrl);
      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        this.reviews = data.reviews || [];
      }

      this.render();
    } catch (error) {
      console.warn('[ReviewWidget] Failed to load data:', error);
      this.renderError();
    }
  }

  sortReviews(reviews) {
    switch (this.sortBy) {
      case 'newest':
        return [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return [...reviews].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'highest':
        return [...reviews].sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return [...reviews].sort((a, b) => a.rating - b.rating);
      case 'helpful':
        return [...reviews].sort((a, b) => (b.helpfulVotes || 0) - (a.helpfulVotes || 0));
      default:
        return reviews;
    }
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `pre ${diffMins} min`;
      }
      return `pre ${diffHours}h`;
    } else if (diffDays < 7) {
      return `pre ${diffDays} dan${diffDays === 1 ? '' : 'a'}`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `pre ${weeks} nedelj${weeks === 1 ? 'u' : 'e'}`;
    } else {
      return date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }

  renderStars(rating, size = 16) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${i <= value ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="color: var(--color-warning);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return stars;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getReviewTypeLabel(type) {
    return type === 'location' ? 'Store Review' : 'Product Review';
  }

  render() {
    const sortedReviews = this.sortReviews([...this.reviews]);
    const displayReviews = sortedReviews.slice(0, this.maxReviews);

    const statsHtml = this.stats.totalReviews > 0 ? `
      <div class="review-stats" style="margin-bottom: var(--space-6); padding: var(--space-4); background: var(--color-bg-secondary); border-radius: var(--radius-lg);">
        <div class="stats-header" style="display: flex; align-items: center; gap: var(--space-6); flex-wrap: wrap; margin-bottom: var(--space-4);">
          <div class="rating-summary" style="display: flex; align-items: center; gap: var(--space-3);">
            <div class="rating-value" style="font-size: var(--text-4xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.stats.averageRating || '0.0'}</div>
            <div class="stars" style="color: var(--color-warning);">${this.renderStars(this.stats.averageRating || 0, 24)}</div>
            <div class="review-count" style="color: var(--color-text-secondary); font-size: var(--text-sm);">${this.stats.totalReviews} recenzija</div>
          </div>
          <div class="verified-percent" style="display: flex; align-items: center; gap: var(--space-2); color: var(--color-success); font-weight: var(--font-medium);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>${this.stats.verifiedPercent || 0}% verifikovanih kupaca</span>
          </div>
        </div>
        <div class="rating-distribution">
          ${[5,4,3,2,1].map(star => {
            const count = this.stats.distribution?.[star] || 0;
            const pct = this.stats.totalReviews ? Math.round((count / this.stats.totalReviews) * 100) : 0;
            return `
              <div class="rating-bar-row" style="display: flex; align-items: center; gap: var(--space-2); margin: var(--space-1) 0; font-size: var(--fs-sm);">
                <span style="width: 24px; color: var(--color-text-secondary);">${star}★</span>
                <div style="flex: 1; height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden;">
                  <div class="rating-bar-fill" style="height: 100%; background: var(--color-warning); width: ${pct}%; transition: width 0.3s ease;"></div>
                </div>
                <span style="width: 30px; text-align: right; color: var(--color-text-tertiary);">${pct}%</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    const reviewsHtml = this.reviews.length > 0 ? `
      <div class="reviews-list" style="display: flex; flex-direction: column; gap: var(--space-4);">
        ${this.sortReviews([...this.reviews]).slice(0, this.maxReviews).map(review => `
          <article class="review-item" style="border: 1px solid var(--color-border-primary); border-radius: var(--radius-lg); padding: var(--space-4); background: var(--color-bg-primary);" itemprop="review" itemscope itemtype="https://schema.org/Review">
            <header class="review-header" style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); flex-wrap: wrap;">
              <div class="review-author" style="display: flex; align-items: center; gap: var(--space-2);">
                <span class="author-name" style="font-weight: var(--font-medium); color: var(--color-text-primary);" itemprop="author" itemscope itemtype="https://schema.org/Person">
                  <span itemprop="name">${this.escapeHtml(review.userName || review.userInitials || 'Anoniman')}</span>
                </span>
                ${review.verifiedPurchase ? `<span class="verified-badge" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: var(--color-success-light); color: var(--color-success); border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--font-bold);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Verifikovano</span>` : ''}
              </div>
              <time class="review-date" style="color: var(--color-text-tertiary); font-size: var(--text-xs);" itemprop="datePublished" datetime="${review.createdAt}">${this.formatDate(review.createdAt)}</time>
            </header>
            <div class="review-rating" style="margin-bottom: var(--space-2);" itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">
              <span class="rating-stars" style="color: var(--color-warning);">${this.renderStars(review.rating)}</span>
              <span class="rating-value" style="margin-left: var(--space-2); color: var(--color-text-tertiary); font-size: var(--text-sm);">(${review.rating}/5)</span>
              <meta itemprop="ratingValue" content="${review.rating}">
              <meta itemprop="bestRating" content="5">
              <meta itemprop="worstRating" content="1">
            </div>
            <h3 class="review-title" style="font-size: var(--text-base); font-weight: var(--font-semibold); color: var(--color-text-primary); margin-bottom: var(--space-2);" itemprop="name">${this.escapeHtml(review.title)}</h3>
            <div class="review-text" style="color: var(--color-text-secondary); line-height: 1.6;" itemprop="reviewBody">${this.escapeHtml(review.text).replace(/\n/g, '<br>')}</div>
            ${review.photos && review.photos.length > 0 ? `
              <div class="review-images" style="display: flex; gap: var(--space-2); margin-top: var(--space-3); flex-wrap: wrap;">
                ${review.photos.map(photo => `<img src="${this.escapeHtml(photo)}" alt="Review image" style="width: 80px; height: 80px; object-fit: cover; border-radius: var(--radius-md);" loading="lazy">`).join('')}
              </div>
            ` : ''}
            ${review.helpfulVotes > 0 || review.notHelpfulVotes > 0 ? `
              <footer class="review-footer" style="display: flex; align-items: center; gap: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--color-border-primary); margin-top: var(--space-3);">
                <button class="helpful-btn" data-review-id="${review.id}" data-helpful="true" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-full); font-size: var(--text-xs); cursor: pointer; transition: all var(--duration-fast);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 1 2 1.79 18.38 18.38 0 0 1-5.59 9.23H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6.28a2 2 0 0 1 2 1.79 17.23 17.23 0 0 0 6-3.47"/></svg>
                  <span>${review.helpfulVotes || 0}</span>
                </button>
                <button class="helpful-btn" data-review-id="${review.id}" data-helpful="false" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-full); font-size: var(--text-xs); cursor: pointer; transition: all var(--duration-fast);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15V9a3 3 0 0 1 3-3l4-9v11h11.28a2 2 0 0 1 2 1.79 18.38 18.38 0 0 1-5.59 9.23H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6.28a2 2 0 0 1 2 1.79 17.23 17.23 0 0 1-6 3.47"/></svg>
                  <span>${review.notHelpfulVotes || 0}</span>
                </button>
              </footer>
            ` : ''}
            <meta itemprop="datePublished" content="${review.createdAt}">
            <meta itemprop="author" content="${review.userName || review.userInitials || 'Anoniman'}">
            <meta itemprop="publisher" content="DALLI">
          </article>
        `).join('')}
      </div>
    ` : `
      <div class="no-reviews" style="text-align: center; padding: var(--space-12); color: var(--color-text-tertiary);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto var(--space-4); color: var(--color-border);"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <h3 style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--fw-light); margin-bottom: var(--space-2);">Još nema recenzija</h3>
        <p style="margin-bottom: var(--space-6);">Budi prvi koji ostavlja utisak o ovom ${this.entityType === 'location' ? 'store-u' : 'proizvodu'}.</p>
        ${this.showForm ? `<button class="btn btn-primary" id="writeReviewBtn" style="padding: var(--space-3) var(--space-6);">Napiši recenziju</button>` : ''}
      </div>
    `;

    // Sort dropdown
    const sortOptions = [
      { value: 'newest', label: 'Najnovije' },
      { value: 'oldest', label: 'Najstarije' },
      { value: 'highest', label: 'Najviše ocena' },
      { value: 'lowest', label: 'Najniže ocena' },
      { value: 'helpful', label: 'Najkorisnije' }
    ];

    return `
      ${statsHtml}
      <div class="reviews-widget" style="margin-top: var(--space-4);">
        <div class="reviews-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3);">
          <h2 style="font-size: var(--text-xl); font-weight: var(--font-semibold); color: var(--color-text-primary);">Recenzije</h2>
          <div class="sort-dropdown" style="position: relative;">
            <label for="reviewSort" class="visually-hidden">Sortiraj recenzije</label>
            <select id="reviewSort" style="padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--color-bg-primary); color: var(--color-text-primary); cursor: pointer;">
              ${[...sortOptions].map(opt => `<option value="${opt.value}" ${this.sortBy === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
          </div>
        </div>
        ${reviewsHtml}
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    // Event listeners
    this.shadowRoot.addEventListener('change', (e) => {
      if (e.target.id === 'reviewSort') {
        this.sortBy = e.target.value;
        this.currentPage = 1;
        this.loadData();
      }
    });

    this.shadowRoot.addEventListener('click', async (e) => {
      // Helpful buttons
      if (e.target.closest('.helpful-btn')) {
        const btn = e.target.closest('.helpful-btn');
        const reviewId = btn.dataset.reviewId;
        const isHelpful = btn.dataset.helpful === 'true';
        await this.voteHelpful(reviewId, isHelpful);
      }
      
      // Write review button
      if (e.target.id === 'writeReviewBtn') {
        this.openReviewForm();
      }
    });
  }

  async voteHelpful(reviewId, isHelpful) {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        const review = this.reviews.find(r => r.id === reviewId);
        if (review) {
          review.helpfulVotes = data.helpfulVotes;
          review.notHelpfulVotes = data.notHelpfulVotes;
          this.render();
        }
      }
    } catch (error) {
      console.warn('[ReviewWidget] Vote failed:', error);
    }
  }

  openReviewForm() {
    // Dispatch custom event for parent to handle
    this.dispatchEvent(new CustomEvent('review:write', {
      detail: { entityType: this.entityType, entityId: this.entityId },
      bubbles: true,
      composed: true
    }));
  }
}

if (!customElements.get('review-widget')) {
  customElements.define('review-widget', ReviewWidget);
}

export default ReviewWidget;