/**
 * ReviewForm - Form component for submitting new reviews
 */

export class ReviewForm extends HTMLElement {
  static get observedAttributes() {
    return ['entity-type', 'entity-id', 'prefill-rating'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.entityType = 'product';
    this.entityId = null;
    this.selectedRating = 0;
  }

  connectedCallback() {
    this.entityType = this.getAttribute('entity-type') || 'product';
    this.entityId = this.getAttribute('entity-id');
    this.prefillRating = parseInt(this.getAttribute('prefill-rating')) || 0;
    
    if (this.prefillRating) {
      this.selectedRating = this.prefillRating;
    }
    
    this.render();
  }

  connectedCallback() {
    this.entityType = this.getAttribute('entity-type') || 'product';
    this.entityId = this.getAttribute('entity-id');
    this.prefillRating = parseInt(this.getAttribute('prefill-rating')) || 0;
    
    if (this.prefillRating) {
      this.selectedRating = this.prefillRating;
    }
    
    this.render();
  }

  renderStars(rating) {
    return [5,4,3,2,1].map(i => `
      <input type="radio" name="rating" value="${i}" id="star${i}" ${this.selectedRating === i ? 'checked' : ''} style="display: none;">
      <label for="star${i}" style="cursor: pointer; color: var(--color-border); font-size: 28px; transition: color 0.2s;" data-rating="${i}">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="${i <= rating ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="color: ${i <= rating ? 'var(--color-warning)' : 'var(--color-border)'};">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </label>
    `).join('');
  }

  connectedCallback() {
    this.render();
    
    // Star rating interaction
    this.shadowRoot.addEventListener('click', (e) => {
      const star = e.target.closest('[data-rating]');
      if (star) {
        this.selectedRating = parseInt(star.dataset.rating);
        this.render();
      }
    });

    this.shadowRoot.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitForm();
    });
  }

  async submitForm() {
    const form = this.shadowRoot.querySelector('form');
    const formData = new FormData(form);
    
    const data = {
      entityType: this.entityType,
      entityId: this.entityId,
      rating: parseInt(formData.get('rating')) || this.selectedRating,
      title: formData.get('title'),
      text: formData.get('text'),
      authorName: formData.get('authorName'),
      authorEmail: formData.get('authorEmail'),
      verifiedPurchase: false // Will be verified server-side
    };

    if (!data.rating || !data.title || !data.text || !data.authorName || !data.authorEmail) {
      this.showError('Molimo popunite sva obavezna polja.');
      return;
    }

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        this.dispatchEvent(new CustomEvent('review:submitted', {
          detail: result,
          bubbles: true,
          composed: true
        }));
        this.showSuccess('Hvala na recenziji! Biće objavljena nakon moderacije.');
        this.resetForm();
      } else {
        this.showError(result.error || 'Došlo je do greške. Pokušajte ponovo.');
      }
    } catch (error) {
      console.error('[ReviewForm] Submit failed:', error);
      this.showError('Došlo je do greške. Pokušajte ponovo.');
    }
  }

  showError(message) {
    const errorEl = this.shadowRoot.querySelector('.form-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  showSuccess(message) {
    const successEl = this.shadowRoot.querySelector('.form-success');
    if (successEl) {
      successEl.textContent = message;
      successEl.style.display = 'block';
    }
  }

  resetForm() {
    const form = this.shadowRoot.querySelector('form');
    if (form) form.reset();
    this.selectedRating = 0;
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: inherit; }
        .review-form { padding: var(--space-4); }
        .form-group { margin-bottom: var(--space-4); }
        .input-label { display: block; font-size: var(--text-sm); color: var(--color-text-secondary); margin-bottom: var(--space-1); font-weight: var(--font-medium); }
        .input-field { width: 100%; padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--text-base); background: var(--color-bg-primary); color: var(--color-text-primary); transition: border-color var(--duration-fast), box-shadow var(--duration-fast); }
        .input-field:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
        .btn { padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-weight: var(--font-medium); cursor: pointer; transition: all var(--duration-fast); border: none; font-size: var(--text-sm); }
        .btn-primary { background: var(--color-primary); color: var(--color-text-inverse); }
        .btn-primary:hover { background: var(--color-primary-dark); }
        .btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
        .btn-secondary:hover { background: var(--color-bg-tertiary); }
        .form-actions { display: flex; gap: var(--space-3); margin-top: var(--space-4); }
        .form-error { display: none; color: var(--color-error); font-size: var(--text-sm); margin-bottom: var(--space-3); padding: var(--space-2) var(--space-3); background: var(--color-error-light); border-radius: var(--radius-md); }
        .form-success { display: none; color: var(--color-success); font-size: var(--text-sm); margin-bottom: var(--space-3); padding: var(--space-2) var(--space-3); background: var(--color-success-light); border-radius: var(--radius-md); }
        .rating-inputs { display: flex; gap: 4px; direction: rtl; justify-content: flex-end; }
        .rating-inputs input { display: none; }
        .rating-inputs label { cursor: pointer; font-size: 28px; transition: color 0.2s; display: inline-block; }
        .rating-inputs input:checked ~ label { color: var(--color-warning); }
        .rating-inputs label:hover,
        .rating-inputs input:checked ~ label { color: var(--color-warning); }
        .rating-inputs label:hover ~ label { color: var(--color-warning); }
      </style>
      <form class="review-form" novalidate>
        <div class="form-success" style="display: none;"></div>
        <div class="form-error" style="display: none;"></div>
        
        <div class="form-group">
          <label class="input-label">Ocena <span class="required" style="color: var(--color-error);">*</span></label>
          <div class="rating-inputs" role="radiogroup" aria-label="Ocena">
            <input type="radio" name="rating" value="5" id="star5" required>
            <label for="star5" data-rating="5" style="cursor: pointer; font-size: 28px; transition: color 0.2s; color: var(--color-border);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </label>
            <input type="radio" name="rating" value="4" id="star4" required>
            <label for="star4" data-rating="4" style="cursor: pointer; font-size: 28px; transition: color 0.2s; color: var(--color-border);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </label>
            <input type="radio" name="rating" value="3" id="star3" required>
            <label for="star3" data-rating="3" style="cursor: pointer; font-size: 28px; transition: color 0.2s; color: var(--color-border);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </label>
            <input type="radio" name="rating" value="2" id="star2" required>
            <label for="star2" data-rating="2" style="cursor: pointer; font-size: 28px; transition: color 0.2s; color: var(--color-border);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </label>
            <input type="radio" name="rating" value="1" id="star1" required>
            <label for="star1" data-rating="1" style="cursor: pointer; font-size: 28px; transition: color 0.2s; color: var(--color-border);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label class="input-label">${this.t('reviews.title')}<span class="required" style="color: var(--color-error);">*</span></label>
          <input type="text" class="input-field" id="title" name="title" placeholder="Naslov recenzije" required maxlength="100">
        </div>
        
        <div class="form-group">
          <label class="input-label">${this.t('reviews.text')}<span class="required" style="color: var(--color-error);">*</span></label>
          <textarea class="input-field" id="text" name="text" placeholder="Podijelite svoje iskustvo..." rows="4" required minlength="20" maxlength="2000"></textarea>
        </div>
        
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-4);">
          <div class="form-group">
            <label class="input-label">${this.t('common.name')}<span class="required" style="color: var(--color-error);">*</span></label>
            <input type="text" class="input-field" id="authorName" name="authorName" placeholder="Vaše ime" required>
          </div>
          <div class="form-group">
            <label class="input-label">${this.t('common.email')}<span class="required" style="color: var(--color-error);">*</span></label>
            <input type="email" class="input-field" id="authorEmail" name="authorEmail" placeholder="vaš@email.com" required>
          </div>
        </div>
        
        <div class="form-group" style="margin-top: var(--space-4);">
          <label class="input-label">
            <input type="checkbox" name="verifiedPurchase" id="verifiedPurchase"> ${this.t('reviews.verifiedPurchaseConfirm')}
          </label>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" style="flex: 1;">${this.t('reviews.submit')}</button>
          <button type="button" class="btn btn-secondary" onclick="this.closest('review-form').dispatchEvent(new Event('review:cancel', { bubbles: true, composed: true }))">${this.t('common.cancel')}</button>
        </div>
        
        <div class="form-error" style="display: none;"></div>
        <div class="form-success" style="display: none;"></div>
      </form>
    `;
  }
}

if (!customElements.get('review-form')) {
  customElements.define('review-form', ReviewForm);
}

export default ReviewForm;