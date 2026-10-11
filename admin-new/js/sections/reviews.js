import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { Table, Pagination, Button, Modal, Input, Select, Textarea, Dropdown } from '../components/index.js';
import { SectionAPI } from '../services/integration.js';

export class ReviewsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.reviews;
    this.reviews = [];
    this.filteredReviews = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalItems = 0;
    this.filters = {
      status: 'all',
      rating: 'all',
      product: 'all',
      location: 'all',
      type: 'all',
      search: ''
    };
    this.selectedReviews = [];
    this.t = this.admin?.t || ((key) => key);
  }

  async onEnter() {
    await this.loadReviews();
    this.render();
  }

  async loadReviews() {
    try {
      // Try to load from API first
      this.reviews = await this.api.list(this.getFilterParams());
    } catch (error) {
      console.warn('[Reviews] API failed, loading from local data:', error);
      // Fallback to local reviews data
      try {
        const response = await fetch('/data/reviews.json');
        const data = await response.json();
        this.reviews = data.reviews || [];
      } catch (e) {
        console.warn('[Reviews] Failed to load local data, using mock:', e);
        this.reviews = this.generateMockReviews();
      }
    }
    this.applyFilters();
  }

  getFilterParams() {
    const params = { page: this.currentPage, limit: this.pageSize };
    if (this.filters.status !== 'all') params.status = this.filters.status;
    if (this.filters.rating !== 'all') params.rating = this.filters.rating;
    if (this.filters.product !== 'all') params.product = this.filters.product;
    if (this.filters.search) params.search = this.filters.search;
    return params;
  }

  generateMockReviews() {
    const products = [
      { id: 1, name: 'Osnovna Majica' },
      { id: 2, name: 'Dugorukava Majica' },
      { id: 3, name: 'Muška Sportska Trenerka' },
      { id: 4, name: 'Ženska Kapuljača Trenerka' },
      { id: 5, name: 'Muški Duks (Hoodie)' },
      { id: 6, name: 'Ženski Duks (Hoodie)' },
      { id: 7, name: 'Čarape Unisex (set 3 para)' },
      { id: 8, name: 'Šalica za Kafu DALLI' }
    ];

    const firstNames = ['Marko', 'Ana', 'Nikola', 'Jelena', 'Stefan', 'Milica', 'Aleksandar', 'Sara', 'Petar', 'Marija'];
    const lastNames = ['Petrović', 'Jovanović', 'Đorđević', 'Stanković', 'Milošević', 'Radović', 'Vuković', 'Nikolić', 'Stojanović', 'Pavlović'];

    const reviewTexts = [
      { rating: 5, title: 'Odličan kvalitet', text: 'Proizvod je baš onakav kakav sam očekivao. Materijal je odličan, šiv je savršen. Preporučujem!' },
      { rating: 5, title: 'Predivno', text: 'Veoma zadovoljan kupovinom. Brza dostava, ambalaža premium. Sigurno ću ponovo poručivati.' },
      { rating: 4, title: 'Dobra majica', text: 'Kvalitet je dobar, veličina odgovara tabeli. Jedina mana je što je malo duža nego što mislim.' },
      { rating: 4, title: 'Kvalitetan', text: 'Dobro izgleda, prijatno na dodiru. Posle몇 pranja nijedna deformacija. Vredna pare.' },
      { rating: 3, title: 'U redu', text: 'Proizvod je u redu, ali očekivao sam malo bolji kvalitet za ovu cenu. Isporuka brza.' },
      { rating: 3, title: 'Prosečno', text: 'Ni loše ni odlično. Standardan kvalitet. Boja je malo drugačija nego na slici.' },
      { rating: 2, title: 'Razčaran', text: 'Materijal je tanak, posle prvog pranja se skupi. Ne bih preporučio.' },
      { rating: 1, title: 'Loše', text: 'Šivovi su kurvi, boja ne odgovara slici. Vratio sam proizvod.' }
    ];

    const statuses = ['approved', 'pending', 'rejected'];

    return Array.from({ length: 50 }, (_, i) => {
      const product = products[Math.floor(Math.random() * products.length)];
      const review = reviewTexts[Math.floor(Math.random() * reviewTexts.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const verified = Math.random() > 0.3;
      const date = new Date(Date.now() - Math.random() * 90 * 86400000);

      return {
        id: `REV-${String(i + 1).padStart(5, '0')}`,
        productId: product.id,
        productName: product.name,
        customerName: `${firstName} ${lastName.charAt(0)}.`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        rating: review.rating,
        title: review.title,
        text: review.text,
        status,
        verified,
        helpful: Math.floor(Math.random() * 20),
        date: date.toISOString(),
        adminNote: status === 'rejected' ? 'Neodgovarajući sadržaj' : ''
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  applyFilters() {
    let filtered = [...this.reviews];

    if (this.filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === this.filters.status);
    }

    if (this.filters.rating !== 'all') {
      filtered = filtered.filter(r => r.rating == this.filters.rating);
    }

    if (this.filters.type !== 'all') {
      if (this.filters.type === 'product') {
        filtered = filtered.filter(r => r.productId);
      } else if (this.filters.type === 'location') {
        filtered = filtered.filter(r => r.locationId);
      }
    }

    if (this.filters.product !== 'all') {
      filtered = filtered.filter(r => r.productId == this.filters.product);
    }

    if (this.filters.location !== 'all') {
      filtered = filtered.filter(r => r.locationId == this.filters.location);
    }

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(search) ||
        (r.productName || '').toLowerCase().includes(search) ||
        (r.locationName || '').toLowerCase().includes(search) ||
        r.customerName.toLowerCase().includes(search) ||
        r.text.toLowerCase().includes(search) ||
        r.title.toLowerCase().includes(search)
      );
    }

    this.filteredReviews = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  get paginatedReviews() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredReviews.slice(start, start + this.pageSize);
  }

  getProducts() {
    return [...new Map(this.reviews.filter(r => r.productId).map(r => [r.productId, { id: r.productId, name: r.productName }])).values()];
  }

  getLocations() {
    return [...new Map(this.reviews.filter(r => r.locationId).map(r => [r.locationId, { id: r.locationId, name: r.locationName }])).values()];
  }

  render() {
    const statsHtml = this.renderStatsCards();
    const filtersHtml = this.renderFilters();
    const tableHtml = this.renderTable();
    const paginationHtml = this.totalItems > this.pageSize ? this.renderPagination() : '';

    this.bindEvents();
    return `
      <div class="reviews-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.t('reviews.title')}</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">${this.t('reviews.subtitle')}</p>
          </div>
          <button class="btn btn-primary" data-action="export-reviews">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${this.t('reviews.exportCsv')}
          </button>
        </div>
        ${statsHtml}
        ${filtersHtml}
        ${this.selectedReviews.length > 0 ? this.renderBulkToolbar() : ''}
        ${tableHtml}
        ${paginationHtml}
      </div>
    `;

  }

  renderStatsCards() {
    const total = this.reviews.length;
    const approved = this.reviews.filter(r => r.status === 'approved').length;
    const pending = this.reviews.filter(r => r.status === 'pending').length;
    const rejected = this.reviews.filter(r => r.status === 'rejected').length;
    const avgRating = total > 0 ? (this.reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : 0;
    const verified = this.reviews.filter(r => r.verified).length;

    this.bindEvents();
    return `
      <div class="kpi-grid" style="margin-bottom: var(--space-5);">
        <div class="kpi-card" style="--kpi-color: var(--color-primary);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
          </div>
          <div class="kpi-value">${total}</div>
          <div class="kpi-label">${this.t('reviews.totalReviews')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-success);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-success), var(--color-success-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg></div>
          </div>
          <div class="kpi-value">${approved}</div>
          <div class="kpi-label">${this.t('reviews.approved')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-warning);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-warning), var(--color-warning-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          </div>
          <div class="kpi-value">${pending}</div>
          <div class="kpi-label">${this.t('reviews.pending')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-error);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-error), var(--color-error-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
          </div>
          <div class="kpi-value">${rejected}</div>
          <div class="kpi-label">${this.t('reviews.rejected')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-accent);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></div>
          </div>
          <div class="kpi-value">${avgRating}</div>
          <div class="kpi-label">${this.t('reviews.avgRating')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-info);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-info), var(--color-info-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          </div>
          <div class="kpi-value">${verified}</div>
          <div class="kpi-label">${this.t('reviews.verifiedPurchases')}</div>
        </div>
      </div>
    `;
  }

  renderFilters() {
    const products = this.getProducts();
    const ratingOptions = [
      { value: 'all', label: this.t('common.allRatings') },
      { value: '5', label: this.t('common.5stars') },
      { value: '4', label: this.t('common.4stars') },
      { value: '3', label: this.t('common.3stars') },
      { value: '2', label: this.t('common.2stars') },
      { value: '1', label: this.t('common.1star') }
    ];

    this.bindEvents();
    return `
      <div class="card" style="margin-bottom: var(--space-5);">
        <div class="card-body" style="padding: var(--space-4) var(--space-5);">
          <div class="form-row" style="align-items: flex-end; gap: var(--space-4); flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 200px;">
              <label class="input-label">${this.t('common.search')}</label>
              <input type="text" class="input-field" placeholder="${this.t('reviews.searchPlaceholder')}" 
                value="${ImperiumUtils.escapeHtml(this.filters.search)}" data-filter="search">
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">${this.t('common.status')}</label>
              <select class="input-field select-field" data-filter="status">
                <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>${this.t('common.all')}</option>
                <option value="approved" ${this.filters.status === 'approved' ? 'selected' : ''}>${this.t('reviews.approved')}</option>
                <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>${this.t('reviews.pending')}</option>
                <option value="rejected" ${this.filters.status === 'rejected' ? 'selected' : ''}>${this.t('reviews.rejected')}</option>
              </select>
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">${this.t('common.rating')}</label>
              <select class="input-field select-field" data-filter="rating">
                ${ratingOptions.map(opt => `<option value="${opt.value}" ${this.filters.rating === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 200px;">
              <label class="input-label">${this.t('common.type')}</label>
              <select class="input-field select-field" data-filter="type">
                <option value="all" ${this.filters.type === 'all' ? 'selected' : ''}>${this.t('common.all')}</option>
                <option value="product" ${this.filters.type === 'product' ? 'selected' : ''}>${this.t('reviews.productReviews')}</option>
                <option value="location" ${this.filters.type === 'location' ? 'selected' : ''}>${this.t('reviews.locationReviews')}</option>
              </select>
            </div>
            <div class="form-group" style="min-width: 200px;">
              <label class="input-label">${this.t('common.product')}</label>
              <select class="input-field select-field" data-filter="product">
                <option value="all" ${this.filters.product === 'all' ? 'selected' : ''}>${this.t('reviews.allProducts')}</option>
                ${products.map(p => `<option value="${p.id}" ${this.filters.product == p.id ? 'selected' : ''}>${ImperiumUtils.escapeHtml(p.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 200px;">
              <label class="input-label">${this.t('common.location')}</label>
              <select class="input-field select-field" data-filter="location">
                <option value="all" ${this.filters.location === 'all' ? 'selected' : ''}>${this.t('common.all')}</option>
                ${this.getLocations().map(l => `<option value="${l.id}" ${this.filters.location == l.id ? 'selected' : ''}>${ImperiumUtils.escapeHtml(l.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" data-action="clear-filters">${this.t('common.clear')}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTable() {
    if (this.paginatedReviews.length === 0) {
      return `
        <div class="table-container">
          <div class="table-empty" style="padding: var(--space-12);">
            <svg class="table-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <h3 class="table-empty-title">${this.t('reviews.noReviews')}</h3>
            <p class="table-empty-message">${this.t('reviews.noReviewsMatch')}</p>
          </div>
        </div>
      `;
    }

    this.bindEvents();
    return `
      <div class="table-container">
        <table class="table" id="reviewsTable">
          <thead>
            <tr>
              <th scope="col" style="width: 50px;">
                <input type="checkbox" class="table-select-all" data-action="select-all" aria-label="${this.t('reviews.selectAll')}">
              </th>
              <th scope="col" style="width: 130px;">${this.t('common.id')}</th>
              <th scope="col">${this.t('reviews.entity')}</th>
              <th scope="col">${this.t('reviews.customer')}</th>
              <th scope="col" style="width: 100px;">${this.t('common.rating')}</th>
              <th scope="col">${this.t('reviews.title')}</th>
              <th scope="col">${this.t('reviews.text')}</th>
              <th scope="col" style="width: 120px;">${this.t('common.status')}</th>
              <th scope="col" style="width: 140px;">${this.t('common.date')}</th>
              <th scope="col" style="width: 140px;">${this.t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${this.paginatedReviews.map(review => {
                const isLocation = !!review.locationId;
                const entityName = isLocation ? review.locationName : review.productName;
                const entityType = isLocation ? 'location' : 'product';
                return `
              <tr data-id="${review.id}" data-type="${entityType}">
                <td>
                  <input type="checkbox" class="table-row-select" data-review-id="${review.id}" ${this.selectedReviews.includes(review.id) ? 'checked' : ''} aria-label="${this.t('reviews.selectReview', { id: review.id })}">
                </td>
                <td class="cell-secondary">${review.id}</td>
                <td>
                  <div class="cell-primary">${ImperiumUtils.escapeHtml(isLocation ? review.locationName : review.productName)}</div>
                  <div class="cell-tertiary" style="font-size: var(--text-xs);">${isLocation ? this.t('reviews.locationReview') : this.t('reviews.productReview')}</div>
                </td>
                <td>${this.renderStars(review.rating)}</td>
                <td class="cell-primary" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ImperiumUtils.escapeHtml(review.title)}</td>
                <td class="cell-secondary" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ImperiumUtils.escapeHtml(review.text)}</td>
                <td>${this.renderStatusBadge(review.status)}</td>
                <td class="cell-secondary">${ImperiumUtils.formatDateTime(review.date)}</td>
                <td>
                  <div class="admin-actions">
                    ${review.status === 'pending' ? `
                      <button class="btn-action update btn-icon" data-action="approve" data-id="${review.id}" aria-label="${this.t('reviews.approve')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button class="btn-action danger btn-icon" data-action="reject" data-id="${review.id}" aria-label="${this.t('reviews.reject')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      </button>
                    ` : ''}
                    ${review.status === 'approved' ? `
                      <button class="btn-action update btn-icon" data-action="unapprove" data-id="${review.id}" aria-label="${this.t('reviews.unapprove')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </button>
                    ` : ''}
                    ${review.status === 'rejected' ? `
                      <button class="btn-action view btn-icon" data-action="view-rejected" data-id="${review.id}" aria-label="${this.t('reviews.viewRejected')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    ` : ''}
                    <button class="btn-action delete btn-icon" data-action="delete" data-id="${review.id}" aria-label="${this.t('common.delete')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<svg width="16" height="16" viewBox="0 0 24 24" fill="${i <= rating ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="color: ${i <= rating ? 'var(--color-warning)' : 'var(--color-border-primary)'};"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    this.bindEvents();
    return `<span class="star-rating" style="display: flex; gap: 2px;">${stars}</span>`;
  }

  renderStatusBadge(status) {
    const badges = {
      approved: `<span class="badge badge-success">${this.t('reviews.approved')}</span>`,
      pending: `<span class="badge badge-warning">${this.t('reviews.pending')}</span>`,
      rejected: `<span class="badge badge-danger">${this.t('reviews.rejected')}</span>`
    };
    return badges[status] || `<span class="badge badge-neutral">${status}</span>`;
  }

  renderPagination() {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (totalPages <= 1) return '';

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages); }

    this.bindEvents();
    return `
      <div class="table-pagination">
        <div class="table-pagination-info">${this.t('reviews.pageInfo', { current: this.currentPage, total: totalPages, count: this.totalItems })}</div>
        <div class="table-pagination-controls">
          <button class="table-pagination-btn" data-page="first" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="${this.t('common.first')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><line x1="18" y1="17" x2="18" y2="7"/></svg></button>
          <button class="table-pagination-btn" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="${this.t('common.previous')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
          <div class="table-pagination-pages">${pages.map(page => page === '...' ? '<span class="table-pagination-page ellipsis" aria-hidden="true">…</span>' : `<button class="table-pagination-page ${page === this.currentPage ? 'active' : ''}" data-page="${page}" ${page === this.currentPage ? 'aria-current="page"' : ''}>${page}</button>`).join('')}</div>
          <button class="table-pagination-btn" data-page="next" ${this.currentPage === totalPages ? 'disabled' : ''} aria-label="${this.t('common.next')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
          <button class="table-pagination-btn" data-page="last" ${this.currentPage === totalPages ? 'disabled' : ''} aria-label="${this.t('common.last')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><line x1="6" y1="17" x2="6" y2="7"/></svg></button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.on('input', '[data-filter="search"]', ImperiumUtils.debounce((e) => {
      this.filters.search = e.target.value;
      this.applyFilters();
      this.render();
    }, 300));

    this.on('change', '[data-filter="status"]', (e) => {
      this.filters.status = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="rating"]', (e) => {
      this.filters.rating = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="product"]', (e) => {
      this.filters.product = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-action="clear-filters"]', () => {
      this.filters = { status: 'all', rating: 'all', product: 'all', search: '' };
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-page]', (e) => {
      const action = e.delegateTarget.dataset.page;
      if (action === 'first') this.currentPage = 1;
      else if (action === 'prev') this.currentPage = Math.max(1, this.currentPage - 1);
      else if (action === 'next') this.currentPage = Math.min(Math.ceil(this.totalItems / this.pageSize), this.currentPage + 1);
      else if (action === 'last') this.currentPage = Math.ceil(this.totalItems / this.pageSize);
      else this.currentPage = parseInt(action);
      this.render();
    });

    this.on('click', '[data-action="approve"]', (e) => {
      const id = e.delegateTarget.dataset.id;
      this.updateReviewStatus(id, 'approved');
    });

    this.on('click', '[data-action="reject"]', async (e) => {
      const id = e.delegateTarget.dataset.id;
      const note = prompt(this.t('reviews.rejectionReason'));
      this.updateReviewStatus(id, 'rejected', note);
    });

    this.on('click', '[data-action="unapprove"]', (e) => {
      const id = e.delegateTarget.dataset.id;
      this.updateReviewStatus(id, 'pending');
    });

    this.on('click', '[data-action="view-rejected"]', (e) => {
      const id = e.delegateTarget.dataset.id;
      const review = this.reviews.find(r => r.id === id);
      if (!review) return;
      this.admin.openModal({
        title: this.t('reviews.rejectedReview'),
        content: `
          <div class="detail-full">
            <div class="detail-row"><span class="detail-label">${this.t('common.id')}</span><span class="detail-value">${review.id}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('reviews.product')}</span><span class="detail-value">${review.productName}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('reviews.customer')}</span><span class="detail-value">${review.customerName}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('common.rating')}</span><span class="detail-value">${this.renderStars(review.rating)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('reviews.title')}</span><span class="detail-value">${ImperiumUtils.escapeHtml(review.title)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('reviews.text')}</span><span class="detail-value"><div class="detail-message">${ImperiumUtils.escapeHtml(review.text)}</div></span></div>
            <div class="detail-row"><span class="detail-label">${this.t('reviews.rejectionReason')}</span><span class="detail-value">${review.adminNote || this.t('common.notSpecified')}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('common.date')}</span><span class="detail-value">${ImperiumUtils.formatDateTime(review.date)}</span></div>
          </div>
        `,
        footer: `<button class="btn btn-secondary" data-action="close">${this.t('common.close')}</button>`
      });
    });

    this.on('click', '[data-action="delete"]', async (e) => {
      const id = e.delegateTarget.dataset.id;
      const confirmed = await this.confirm(this.t('reviews.deleteConfirm'), { title: this.t('reviews.deleteTitle'), variant: 'danger' });
      if (confirmed) {
        this.reviews = this.reviews.filter(r => r.id !== id);
        this.applyFilters();
        this.render();
        this.admin.success(this.t('reviews.deleted'));
      }
    });

    this.on('click', '[data-action="export-reviews"]', () => this.exportCSV());

    this.on('change', '[data-action="select-all"]', (e) => {
      const checkbox = e.target;
      if (checkbox.checked) {
        this.selectedReviews = [...new Set([...this.selectedReviews, ...this.paginatedReviews.map(r => r.id)])];
      } else {
        this.selectedReviews = this.selectedReviews.filter(id => !this.paginatedReviews.map(r => r.id).includes(id));
      }
      this.render();
    });

    this.on('change', '.table-row-select', (e) => {
      const id = e.target.dataset.reviewId;
      if (e.target.checked) {
        if (!this.selectedReviews.includes(id)) this.selectedReviews.push(id);
      } else {
        this.selectedReviews = this.selectedReviews.filter(selId => selId !== id);
      }
      this.render();
    });

    this.on('click', '[data-action="clear-selection"]', () => {
      this.selectedReviews = [];
      this.render();
    });

    this.on('click', '[data-action="bulk-approve"]', () => {
      if (this.selectedReviews.length === 0) return;
      const count = this.selectedReviews.length;
      this.reviews = this.reviews.map(r => {
        if (this.selectedReviews.includes(r.id)) {
          return { ...r, status: 'approved' };
        }
        return r;
      });
      this.selectedReviews = [];
      this.applyFilters();
      this.render();
      this.admin.success(this.t('reviews.bulkApproved', { count }));
    });

    this.on('click', '[data-action="bulk-reject"]', async () => {
      if (this.selectedReviews.length === 0) return;
      const note = prompt(this.t('reviews.bulkRejectReason'));
      if (note === null) return;
      const count = this.selectedReviews.length;
      this.reviews = this.reviews.map(r => {
        if (this.selectedReviews.includes(r.id)) {
          return { ...r, status: 'rejected', adminNote: note };
        }
        return r;
      });
      this.selectedReviews = [];
      this.applyFilters();
      this.render();
      this.admin.success(this.t('reviews.bulkRejected', { count }));
    });

    this.on('click', '[data-action="bulk-delete"]', async () => {
      if (this.selectedReviews.length === 0) return;
      const confirmed = await this.confirm(this.t('reviews.bulkDeleteConfirm', { count: this.selectedReviews.length }), { title: this.t('reviews.bulkDeleteTitle'), variant: 'danger' });
      if (confirmed) {
        const count = this.selectedReviews.length;
        this.reviews = this.reviews.filter(r => !this.selectedReviews.includes(r.id));
        this.selectedReviews = [];
        this.applyFilters();
        this.render();
        this.admin.success(this.t('reviews.bulkDeleted', { count }));
      }
    });

    this.on('click', '[data-action="clear-selection"]', () => {
      this.selectedReviews = [];
      this.render();
    });

    this.on('change', '[data-action="select-all"]', (e) => {
      const checkbox = e.target;
      if (checkbox.checked) {
        this.selectedReviews = [...new Set([...this.selectedReviews, ...this.paginatedReviews.map(r => r.id)])];
      } else {
        this.selectedReviews = this.selectedReviews.filter(id => !this.paginatedReviews.map(r => r.id).includes(id));
      }
      this.render();
    });

    this.on('change', '.table-row-select', (e) => {
      const id = e.target.dataset.reviewId;
      if (e.target.checked) {
        if (!this.selectedReviews.includes(id)) this.selectedReviews.push(id);
      } else {
        this.selectedReviews = this.selectedReviews.filter(selId => selId !== id);
      }
      this.render();
    });
  }

  updateReviewStatus(id, status, note = '') {
    const review = this.reviews.find(r => r.id === id);
    if (!review) return;
    review.status = status;
    if (note) review.adminNote = note;
    this.applyFilters();
    this.render();
    const messages = {
      approved: this.t('reviews.approvedSuccess'),
      rejected: this.t('reviews.rejectedSuccess'),
      pending: this.t('reviews.returnedToPending')
    };
    this.admin.success(messages[status] || this.t('reviews.updated'));
  }

  exportCSV() {
    const headers = [this.t('common.id'), this.t('reviews.product'), this.t('reviews.customer'), this.t('common.email'), this.t('common.rating'), this.t('reviews.title'), this.t('reviews.text'), this.t('common.status'), this.t('reviews.verified'), this.t('reviews.helpful'), this.t('common.date')];
    const rows = this.filteredReviews.map(r => [
      r.id, r.productName, r.customerName, r.email, r.rating, r.title, r.text, r.status, r.verified ? this.t('common.yes') : this.t('common.no'), r.helpful, ImperiumUtils.formatDateTime(r.date)
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    ImperiumUtils.downloadFile(csv, `recenzije-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    this.admin.success(this.t('reviews.reportDownloaded'));
  }
}