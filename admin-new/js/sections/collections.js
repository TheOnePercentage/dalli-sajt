import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { Button, Modal, Input, Select, Textarea, Dropdown, Chip } from '../components/index.js';
import { SectionAPI } from '../services/integration.js';

export class CollectionsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.collections;
    this.collections = [];
    this.filteredCollections = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalItems = 0;
    this.filters = {
      type: 'all',
      status: 'all',
      search: ''
    };
    this.t = this.admin?.t || ((key) => key);
  }

  async onEnter() {
    await this.loadCollections();
    this.render();
  }

  async loadCollections() {
    try {
      this.collections = await this.api.list(this.getFilterParams());
    } catch (error) {
      console.warn('[Collections] API failed, falling back to mock data:', error);
      this.collections = this.generateMockCollections();
    }
    this.applyFilters();
  }

  getFilterParams() {
    const params = { page: this.currentPage, limit: this.pageSize };
    if (this.filters.type !== 'all') params.type = this.filters.type;
    if (this.filters.status !== 'all') params.status = this.filters.status;
    if (this.filters.search) params.search = this.filters.search;
    return params;
  }

  generateMockCollections() {
    const types = ['seasonal', 'occasion', 'activity', 'dynamic'];
    const statuses = ['published', 'draft'];

    return Array.from({ length: 12 }, (_, i) => {
      const type = types[i % types.length];
      const status = statuses[i % statuses.length];
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() + (i % 6), 1);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0);

      return {
        id: `COL-${String(i + 1).padStart(4, '0')}`,
        title: [
          'Summer Essentials', 'Winter Warmth', 'Office Smart Casual',
          'Weekend Relaxed', 'Gym Performance', 'New Arrivals',
          'Best Sellers', 'Holiday Gift Guide', 'Spring Refresh',
          'Autumn Layers', 'Travel Essentials', 'Date Night'
        ][i],
        slug: [
          'summer-essentials', 'winter-warmth', 'office-smart-casual',
          'weekend-relaxed', 'gym-performance', 'new-arrivals',
          'best-sellers', 'holiday-gift-guide', 'spring-refresh',
          'autumn-layers', 'travel-essentials', 'date-night'
        ][i],
        type,
        status,
        priority: 100 - i * 5,
        tags: type === 'seasonal' ? ['summer', 'lightweight'] : 
              type === 'occasion' ? ['office', 'workwear'] :
              type === 'activity' ? ['gym', 'activewear'] : ['new', 'dynamic'],
        productCount: Math.floor(Math.random() * 10) + 1,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        createdAt: new Date(now.getTime() - Math.random() * 90 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString()
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  applyFilters() {
    let filtered = [...this.collections];

    if (this.filters.type !== 'all') {
      filtered = filtered.filter(c => c.type === this.filters.type);
    }

    if (this.filters.status !== 'all') {
      filtered = filtered.filter(c => c.status === this.filters.status);
    }

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(search) ||
        c.slug.toLowerCase().includes(search) ||
        c.tags.some(t => t.toLowerCase().includes(search))
      );
    }

    this.filteredCollections = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  get paginatedCollections() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCollections.slice(start, start + this.pageSize);
  }

  render() {
    const statsHtml = this.renderStatsCards();
    const filtersHtml = this.renderFilters();
    const tableHtml = this.renderTable();
    const paginationHtml = this.totalItems > this.pageSize ? this.renderPagination() : '';

    this.bindEvents();
    return `
      <div class="collections-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.t('collections.title')}</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">${this.t('collections.subtitle')}</p>
          </div>
          <button class="btn btn-primary" data-action="create-collection">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/><polyline points="12 9 15 12 12 15"/></svg>
            ${this.t('collections.createCollection')}
          </button>
        </div>
        ${statsHtml}
        ${filtersHtml}
        ${tableHtml}
        ${paginationHtml}
      </div>
    `;
  }

  renderStatsCards() {
    const total = this.collections.length;
    const published = this.collections.filter(c => c.status === 'published').length;
    const draft = this.collections.filter(c => c.status === 'draft').length;
    const seasonal = this.collections.filter(c => c.type === 'seasonal').length;
    const occasion = this.collections.filter(c => c.type === 'occasion').length;
    const activity = this.collections.filter(c => c.type === 'activity').length;
    const dynamic = this.collections.filter(c => c.type === 'dynamic').length;

    this.bindEvents();
    return `
      <div class="kpi-grid" style="margin-bottom: var(--space-5);">
        <div class="kpi-card" style="--kpi-color: var(--color-primary);">
          <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div></div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">${this.t('collections.totalCollections')}</div>
          </div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-success);">
          <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg></div></div>
          <div class="kpi-value">${published}</div>
          <div class="kpi-label">${this.t('collections.published')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-warning);">
          <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div></div>
          <div class="kpi-value">${draft}</div>
          <div class="kpi-label">${this.t('collections.draft')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-secondary);">
          <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2v20M17 5H7"/></svg></div></div>
          <div class="kpi-value">${seasonal}</div>
          <div class="kpi-label">${this.t('collections.seasonal')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-accent);">
          <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06"/></svg></div></div>
          <div class="kpi-value">${occasion}</div>
          <div class="kpi-label">${this.t('collections.occasion')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-info);">
          <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div></div>
          <div class="kpi-value">${activity}</div>
          <div class="kpi-label">${this.t('collections.activity')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-purple);">
          <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2v20M17 5H7"/></svg></div></div>
          <div class="kpi-value">${dynamic}</div>
          <div class="kpi-label">${this.t('collections.dynamic')}</div>
        </div>
      </div>
    `;
  }

  renderFilters() {
    const typeOptions = [
      { value: 'all', label: this.t('common.all') },
      { value: 'seasonal', label: this.t('collections.seasonal') },
      { value: 'occasion', label: this.t('collections.occasion') },
      { value: 'activity', label: this.t('collections.activity') },
      { value: 'dynamic', label: this.t('collections.dynamic') }
    ];

    this.bindEvents();
    return `
      <div class="card" style="margin-bottom: var(--space-5);">
        <div class="card-body" style="padding: var(--space-4) var(--space-5);">
          <div class="form-row" style="align-items: flex-end; gap: var(--space-4);">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label class="input-label">${this.t('common.search')}</label>
              <input type="text" class="input-field" placeholder="${this.t('collections.searchPlaceholder')}" 
                value="${ImperiumUtils.escapeHtml(this.filters.search)}" data-filter="search">
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">${this.t('common.type')}</label>
              <select class="input-field select-field" data-filter="type">
                ${typeOptions.map(opt => `<option value="${opt.value}" ${this.filters.type === opt.value ? 'selected' : ''}>${ImperiumUtils.escapeHtml(opt.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">${this.t('common.status')}</label>
              <select class="input-field select-field" data-filter="status">
                <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>${this.t('common.all')}</option>
                <option value="published" ${this.filters.status === 'published' ? 'selected' : ''}>${this.t('collections.published')}</option>
                <option value="draft" ${this.filters.status === 'draft' ? 'selected' : ''}>${this.t('collections.draft')}</option>
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
    if (this.paginatedCollections.length === 0) {
      return `
        <div class="table-container">
          <div class="table-empty" style="padding: var(--space-12);">
            <svg class="table-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            <h3 class="table-empty-title">${this.t('collections.noCollections')}</h3>
            <p class="table-empty-message">${this.t('collections.noCollectionsMatch')}</p>
          </div>
        </div>
      `;
    }

    this.bindEvents();
    return `
      <div class="table-container">
        <table class="table" id="collectionsTable">
          <thead>
            <tr>
              <th scope="col" style="width: 120px;">${this.t('common.id')}</th>
              <th scope="col" style="width: 200px;">${this.t('collections.title')}</th>
              <th scope="col" style="width: 130px;">${this.t('common.type')}</th>
              <th scope="col" style="width: 120px;">${this.t('common.status')}</th>
              <th scope="col" style="width: 100px;">${this.t('collections.products')}</th>
              <th scope="col" style="width: 140px;">${this.t('common.date')}</th>
              <th scope="col">${this.t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${this.paginatedCollections.map(c => `
              <tr data-id="${c.id}">
                <td class="cell-secondary">${c.id}</td>
                <td>
                  <div class="cell-primary">${ImperiumUtils.escapeHtml(c.title)}</div>
                  <div class="cell-tertiary" style="font-size: var(--text-xs);">${ImperiumUtils.escapeHtml(c.slug)}</div>
                </td>
                <td>
                  <span class="chip ${c.type}-chip" style="background: var(--color-secondary-light); color: var(--color-secondary);">
                    ${ImperiumUtils.escapeHtml(c.type)}
                  </span>
                </td>
                <td>
                  ${c.status === 'published' 
                    ? `<span class="badge badge-success">${this.t('collections.published')}</span>`
                    : `<span class="badge badge-warning">${this.t('collections.draft')}</span>`
                  }
                </td>
                <td>${c.productCount}</td>
                <td class="cell-secondary">${ImperiumUtils.formatDateTime(c.createdAt)}</td>
                <td>
                  <div class="admin-actions">
                    <button class="btn-action view btn-icon" data-action="view-collection" data-id="${c.id}" aria-label="${this.t('collections.view')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-action edit btn-icon" data-action="edit-collection" data-id="${c.id}" aria-label="${this.t('collections.edit')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-action danger btn-icon" data-action="delete-collection" data-id="${c.id}" aria-label="${this.t('common.delete')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
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
        <div class="table-pagination-info">${this.t('collections.pageInfo', { current: this.currentPage, total: totalPages, count: this.totalItems })}</div>
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

    this.on('change', '[data-filter="type"]', (e) => {
      this.filters.type = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="status"]', (e) => {
      this.filters.status = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-action="clear-filters"]', () => {
      this.filters = { type: 'all', status: 'all', search: '' };
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

    this.on('click', '[data-action="create-collection"]', () => this.openCreateModal());

    this.on('click', '[data-action="view-collection"]', (e) => {
      const id = e.delegateTarget.dataset.id;
      const collection = this.collections.find(c => c.id === id);
      if (!collection) return;
      this.admin.openModal({
        title: this.t('collections.view') + ' #' + collection.id,
        content: `
          <div class="detail-full">
            <div class="detail-row"><span class="detail-label">${this.t('common.id')}</span><span class="detail-value">${collection.id}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('collections.title')}</span><span class="detail-value">${ImperiumUtils.escapeHtml(collection.title)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('collections.slug')}</span><span class="detail-value">${ImperiumUtils.escapeHtml(collection.slug)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('common.type')}</span><span class="detail-value">${ImperiumUtils.escapeHtml(collection.type)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('common.status')}</span><span class="detail-value">${collection.status}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('collections.priority')}</span><span class="detail-value">${collection.priority}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('collections.products')}</span><span class="detail-value">${collection.productCount}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('collections.tags')}</span><span class="detail-value">${collection.tags.join(', ')}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('collections.startDate')}</span><span class="detail-value">${ImperiumUtils.formatDateTime(collection.startDate)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('collections.endDate')}</span><span class="detail-value">${ImperiumUtils.formatDateTime(collection.endDate)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('common.date')}</span><span class="detail-value">${ImperiumUtils.formatDateTime(collection.createdAt)}</span></div>
            ${collection.updatedAt ? `<div class="detail-row"><span class="detail-label">${this.t('common.lastUpdated')}</span><span class="detail-value">${ImperiumUtils.formatDateTime(collection.updatedAt)}</span></div>` : ''}
          </div>
        `,
        footer: `<button class="btn btn-secondary" data-action="close">${this.t('common.close')}</button>`
      });
    });

    this.on('click', '[data-action="edit-collection"]', (e) => {
      const id = e.delegateTarget.dataset.id;
      const collection = this.collections.find(c => c.id === id);
      if (!collection) return;
      this.openEditModal(collection);
    });

    this.on('click', '[data-action="delete-collection"]', async (e) => {
      const id = e.delegateTarget.dataset.id;
      const confirmed = await this.confirm(this.t('collections.deleteConfirm'), { title: this.t('collections.deleteTitle'), variant: 'danger' });
      if (confirmed) {
        this.collections = this.collections.filter(c => c.id !== id);
        this.applyFilters();
        this.render();
        this.admin.success(this.t('collections.deleted'));
      }
    });
  }

  openCreateModal() {
    this.admin.openModal({
      title: this.t('collections.createCollection'),
      content: `
        <form class="collection-form" novalidate>
          <div class="form-row" style="gap: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.title')}<span class="required">*</span></label>
              <input type="text" class="input-field" required data-field="title" placeholder="Collection title">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.slug')}</label>
              <input type="text" class="input-field" data-field="slug" placeholder="auto-generated from title">
            </div>
          </div>
          <div class="form-row" style="gap: var(--space-4); margin-top: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('common.type')}</label>
              <select class="input-field select-field" data-field="type">
                <option value="seasonal">${this.t('collections.seasonal')}</option>
                <option value="occasion">${this.t('collections.occasion')}</option>
                <option value="activity">${this.t('collections.activity')}</option>
                <option value="dynamic">${this.t('collections.dynamic')}</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('common.status')}</label>
              <select class="input-field select-field" data-field="status">
                <option value="draft">${this.t('collections.draft')}</option>
                <option value="published">${this.t('collections.published')}</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="input-label">${this.t('collections.description')}</label>
            <textarea class="input-field" data-field="description" rows="3" placeholder="Collection description"></textarea>
          </div>
          <div class="form-row" style="gap: var(--space-4); margin-top: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.priority')}</label>
              <input type="number" class="input-field" data-field="priority" value="50" min="0" max="100">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.tags')}</label>
              <input type="text" class="input-field" data-field="tags" placeholder="Comma-separated tags">
            </div>
          </div>
          <div class="form-row" style="gap: var(--space-4); margin-top: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.startDate')}</label>
              <input type="date" class="input-field" data-field="startDate">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.endDate')}</label>
              <input type="date" class="input-field" data-field="endDate">
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">${this.t('common.close')}</button>
        <button class="btn btn-primary" data-action="create-collection-submit">${this.t('collections.create')}</button>
      `
    });

    this.on('click', '[data-action="create-collection-submit"]', () => this.handleCreateSubmit());
  }

  handleCreateSubmit() {
    const form = document.querySelector('.collection-form');
    if (!form) return;

    const title = form.querySelector('[data-field="title"]')?.value?.trim();
    const slugInput = form.querySelector('[data-field="slug"]')?.value?.trim();
    const slug = slugInput || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const type = form.querySelector('[data-field="type"]')?.value;
    const status = form.querySelector('[data-field="status"]')?.value;
    const description = form.querySelector('[data-field="description"]')?.value?.trim();
    const priority = parseInt(form.querySelector('[data-field="priority"]')?.value) || 50;
    const tagsInput = form.querySelector('[data-field="tags"]')?.value?.trim();
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
    const startDate = form.querySelector('[data-field="startDate"]')?.value;
    const endDate = form.querySelector('[data-field="endDate"]')?.value;

    if (!title) {
      this.admin.error(this.t('collections.fillRequired'));
      return;
    }

    const newCollection = {
      id: `COL-${Date.now().toString(36).padStart(4, '0')}`,
      title,
      slug,
      type,
      status,
      description,
      priority,
      tags,
      productCount: 0,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.collections.unshift(newCollection);
    this.applyFilters();
    this.render();
    this.admin.success(this.t('collections.created'));

    setTimeout(() => this.admin.closeModal(), 300);
  }

  openEditModal(collection) {
    this.admin.openModal({
      title: this.t('collections.editCollection') + ' #' + collection.id,
      content: `
        <form class="collection-form" novalidate>
          <div class="form-row" style="gap: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.title')}<span class="required">*</span></label>
              <input type="text" class="input-field" required data-field="title" value="${ImperiumUtils.escapeHtml(collection.title)}">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.slug')}</label>
              <input type="text" class="input-field" data-field="slug" value="${ImperiumUtils.escapeHtml(collection.slug)}">
            </div>
          </div>
          <div class="form-row" style="gap: var(--space-4); margin-top: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('common.type')}</label>
              <select class="input-field select-field" data-field="type">
                <option value="seasonal" ${collection.type === 'seasonal' ? 'selected' : ''}>${this.t('collections.seasonal')}</option>
                <option value="occasion" ${collection.type === 'occasion' ? 'selected' : ''}>${this.t('collections.occasion')}</option>
                <option value="activity" ${collection.type === 'activity' ? 'selected' : ''}>${this.t('collections.activity')}</option>
                <option value="dynamic" ${collection.type === 'dynamic' ? 'selected' : ''}>${this.t('collections.dynamic')}</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('common.status')}</label>
              <select class="input-field select-field" data-field="status">
                <option value="draft" ${collection.status === 'draft' ? 'selected' : ''}>${this.t('collections.draft')}</option>
                <option value="published" ${collection.status === 'published' ? 'selected' : ''}>${this.t('collections.published')}</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="input-label">${this.t('collections.description')}</label>
            <textarea class="input-field" data-field="description" rows="3">${ImperiumUtils.escapeHtml(collection.description || '')}</textarea>
          </div>
          <div class="form-row" style="gap: var(--space-4); margin-top: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.priority')}</label>
              <input type="number" class="input-field" data-field="priority" value="${collection.priority}" min="0" max="100">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.tags')}</label>
              <input type="text" class="input-field" data-field="tags" value="${collection.tags?.join(', ') || ''}" placeholder="Comma-separated tags">
            </div>
          </div>
          <div class="form-row" style="gap: var(--space-4); margin-top: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.startDate')}</label>
              <input type="date" class="input-field" data-field="startDate" value="${collection.startDate ? collection.startDate.split('T')[0] : ''}">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('collections.endDate')}</label>
              <input type="date" class="input-field" data-field="endDate" value="${collection.endDate ? collection.endDate.split('T')[0] : ''}">
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">${this.t('common.close')}</button>
        <button class="btn btn-primary" data-action="edit-collection-submit">${this.t('collections.save')}</button>
      `
    });

    this.on('click', '[data-action="edit-collection-submit"]', () => this.handleEditSubmit(collection));
  }

  handleEditSubmit(collection) {
    const form = document.querySelector('.collection-form');
    if (!form) return;

    const title = form.querySelector('[data-field="title"]')?.value?.trim();
    const slug = form.querySelector('[data-field="slug"]')?.value?.trim();
    const type = form.querySelector('[data-field="type"]')?.value;
    const status = form.querySelector('[data-field="status"]')?.value;
    const description = form.querySelector('[data-field="description"]')?.value?.trim();
    const priority = parseInt(form.querySelector('[data-field="priority"]')?.value) || 50;
    const tagsInput = form.querySelector('[data-field="tags"]')?.value?.trim();
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
    const startDate = form.querySelector('[data-field="startDate"]')?.value;
    const endDate = form.querySelector('[data-field="endDate"]')?.value;

    if (!title) {
      this.admin.error(this.t('collections.fillRequired'));
      return;
    }

    collection.title = title;
    collection.slug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    collection.type = type;
    collection.status = status;
    collection.description = description;
    collection.priority = priority;
    collection.tags = tags;
    collection.startDate = startDate ? new Date(startDate).toISOString() : null;
    collection.endDate = endDate ? new Date(endDate).toISOString() : null;
    collection.updatedAt = new Date().toISOString();

    this.applyFilters();
    this.render();
    this.admin.success(this.t('collections.updated'));

    setTimeout(() => this.admin.closeModal(), 300);
  }
}