import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { Table, Pagination, Button, Modal, Input, Select, Textarea, Dropdown, Chip } from '../components/index.js';
import { SectionAPI } from '../services/integration.js';
import { faqService } from '../services/faq.js';

export class FaqsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.faqs;
    this.faqs = [];
    this.filteredFaqs = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalItems = 0;
    this.filters = {
      type: 'all',
      target: 'all',
      search: ''
    };
    this.selectedFaqs = [];
    this.viewMode = 'list';
    this.t = this.admin?.t || ((key) => key);
  }

  async onEnter() {
    await this.loadFaqs();
    this.render();
  }

  async loadFaqs() {
    try {
      this.faqs = await this.api.list(this.getFilterParams());
    } catch (error) {
      console.warn('[FAQs] API failed, falling back to service data:', error);
      this.faqs = faqService.getByTarget('all');
    }
    this.applyFilters();
  }

  getFilterParams() {
    const params = { page: this.currentPage, limit: this.pageSize };
    if (this.filters.type !== 'all') params.type = this.filters.type;
    if (this.filters.target !== 'all') params.target = this.filters.target;
    if (this.filters.search) params.search = this.filters.search;
    return params;
  }

  applyFilters() {
    let filtered = [...this.faqs];

    if (this.filters.type !== 'all') {
      filtered = filtered.filter(f => f.type === this.filters.type);
    }

    if (this.filters.target !== 'all') {
      filtered = filtered.filter(f => f.target === this.filters.target);
    }

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(f =>
        f.question.toLowerCase().includes(search) ||
        f.answer.toLowerCase().includes(search) ||
        f.keywords.some(k => k.toLowerCase().includes(search))
      );
    }

    this.filteredFaqs = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
    this.selectedFaqs = this.selectedFaqs.filter(id => filtered.some(f => f.id === id));
  }

  get paginatedFaqs() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredFaqs.slice(start, start + this.pageSize);
  }

  render() {
    if (this.viewMode === 'analytics') {
      return this.renderAnalytics();
    }

    const statsHtml = this.renderStatsCards();
    const filtersHtml = this.renderFilters();
    const bulkToolbarHtml = this.renderBulkToolbar();
    const tableHtml = this.renderTable();
    const paginationHtml = this.totalItems > this.pageSize ? this.renderPagination() : '';

    this.bindEvents();
    return `
      <div class="faqs-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.t('faqs.title')}</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">${this.t('faqs.subtitle')}</p>
          </div>
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <button class="btn ${this.viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}" data-action="view-list">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <button class="btn ${this.viewMode === 'analytics' ? 'btn-primary' : 'btn-secondary'}" data-action="view-analytics">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </button>
            <button class="btn btn-primary" data-action="create-faq">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/><polyline points="12 9 15 12 12 15"/></svg>
              ${this.t('faqs.createFAQ')}
            </button>
            <button class="btn btn-secondary" data-action="import-faqs" title="${this.t('faqs.importFAQs')}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </button>
            <button class="btn btn-secondary" data-action="export-all-faqs" title="${this.t('faqs.exportAll')}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>
        </div>
        ${statsHtml}
        ${filtersHtml}
        ${bulkToolbarHtml}
        ${tableHtml}
        ${paginationHtml}
      </div>
    `;
  }


  renderAnalytics() {
    const total = this.faqs.length;
    const totalViews = this.faqs.reduce((sum, f) => sum + (f.views || 0), 0);
    const totalHelpful = this.faqs.reduce((sum, f) => sum + (f.helpful || 0), 0);
    const avgHelpful = total > 0 ? (totalHelpful / total).toFixed(1) : 0;
    const byType = { category: 0, product: 0, guide: 0 };
    const byTarget = { category: 0, product: 0, guide: 0 };
    const topFaqs = [...this.faqs].sort((a, b) => (b.helpful || 0) - (a.helpful || 0)).slice(0, 10);
    const recentFaqs = [...this.faqs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);

    this.faqs.forEach(f => {
      byType[f.type] = (byType[f.type] || 0) + 1;
      byTarget[f.target] = (byTarget[f.target] || 0) + 1;
    });

    this.bindEvents();
    return `
      <div class="faqs-section faqs-analytics">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.t('faqs.analytics')}</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">${this.t('faqs.analyticsSubtitle')}</p>
          </div>
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <button class="btn ${this.viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}" data-action="view-list">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <button class="btn ${this.viewMode === 'analytics' ? 'btn-primary' : 'btn-secondary'}" data-action="view-analytics">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </button>
            <button class="btn btn-primary" data-action="create-faq">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/><polyline points="12 9 15 12 12 15"/></svg>
              ${this.t('faqs.createFAQ')}
            </button>
            <button class="btn btn-secondary" data-action="import-faqs" title="${this.t('faqs.importFAQs')}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </button>
            <button class="btn btn-secondary" data-action="export-all-faqs" title="${this.t('faqs.exportAll')}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>
        </div>
        
        <div class="kpi-grid" style="margin-bottom: var(--space-5);">
          <div class="kpi-card" style="--kpi-color: var(--color-primary);">
            <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div></div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">${this.t('faqs.totalFAQs')}</div>
          </div>
          <div class="kpi-card" style="--kpi-color: var(--color-success);">
            <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div></div>
            <div class="kpi-value">${totalViews.toLocaleString()}</div>
            <div class="kpi-label">${this.t('faqs.totalViews')}</div>
          </div>
          <div class="kpi-card" style="--kpi-color: var(--color-warning);">
            <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div></div>
            <div class="kpi-value">${totalHelpful.toLocaleString()}</div>
            <div class="kpi-label">${this.t('faqs.totalHelpful')}</div>
          </div>
          <div class="kpi-card" style="--kpi-color: var(--color-accent);">
            <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div></div>
            <div class="kpi-value">${avgHelpful}</div>
            <div class="kpi-label">${this.t('faqs.avgHelpful')}</div>
          </div>
        </div>

        <div class="analytics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-5);">
          <div class="card">
            <div class="card-header" style="padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border-primary);">
              <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold);">${this.t('faqs.byType')}</h3>
            </div>
            <div class="card-body" style="padding: var(--space-4) var(--space-5);">
              ${Object.entries(byType).map(([type, count]) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-primary);">
                  <span style="text-transform: capitalize;">${type}</span>
                  <span style="font-weight: var(--font-semibold); color: var(--color-primary);">${count}</span>
                </div>
              `).join('')}
              <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; font-weight: var(--font-bold);">
                <span>${this.t('common.total')}</span>
                <span>${total}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header" style="padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border-primary);">
              <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold);">${this.t('faqs.byTarget')}</h3>
            </div>
            <div class="card-body" style="padding: var(--space-4) var(--space-5);">
              ${Object.entries(byTarget).map(([target, count]) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-primary);">
                  <span style="text-transform: capitalize;">${target}</span>
                  <span style="font-weight: var(--font-semibold); color: var(--color-info);">${count}</span>
                </div>
              `).join('')}
              <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; font-weight: var(--font-bold);">
                <span>${this.t('common.total')}</span>
                <span>${total}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="analytics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-5); margin-top: var(--space-5);">
          <div class="card">
            <div class="card-header" style="padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border-primary); display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold);">${this.t('faqs.topHelpful')}</h3>
            </div>
            <div class="card-body" style="padding: var(--space-4) var(--space-5); max-height: 400px; overflow-y: auto;">
              ${topFaqs.length === 0 ? `<p style="color: var(--color-text-tertiary); text-align: center; padding: var(--space-8);">${this.t('faqs.noData')}</p>` : `
              <table class="table" style="font-size: var(--text-sm);">
                <thead>
                  <tr>
                    <th scope="col" style="width: 40px;">#</th>
                    <th scope="col">${this.t('faqs.question')}</th>
                    <th scope="col" style="width: 100px;">${this.t('faqs.type')}</th>
                    <th scope="col" style="width: 100px;">${this.t('common.helpful')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${topFaqs.map((faq, i) => `
                    <tr>
                      <td class="cell-secondary">${i + 1}</td>
                      <td class="cell-primary" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ImperiumUtils.escapeHtml(faq.question)}</td>
                      <td><span class="chip" style="background: var(--color-secondary-light); color: var(--color-secondary);">${faq.type}</span></td>
                      <td style="font-weight: var(--font-bold); color: var(--color-warning);">${faq.helpful || 0}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              `}
            </div>
          </div>

          <div class="card">
            <div class="card-header" style="padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border-primary);">
              <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold);">${this.t('faqs.recentFaqs')}</h3>
            </div>
            <div class="card-body" style="padding: var(--space-4) var(--space-5); max-height: 400px; overflow-y: auto;">
              ${recentFaqs.length === 0 ? `<p style="color: var(--color-text-tertiary); text-align: center; padding: var(--space-8);">${this.t('faqs.noData')}</p>` : `
              <table class="table" style="font-size: var(--text-sm);">
                <thead>
                  <tr>
                    <th scope="col" style="width: 40px;">#</th>
                    <th scope="col">${this.t('faqs.question')}</th>
                    <th scope="col" style="width: 100px;">${this.t('faqs.type')}</th>
                    <th scope="col" style="width: 140px;">${this.t('common.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentFaqs.map((faq, i) => `
                    <tr>
                      <td class="cell-secondary">${i + 1}</td>
                      <td class="cell-primary" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ImperiumUtils.escapeHtml(faq.question)}</td>
                      <td><span class="chip" style="background: var(--color-secondary-light); color: var(--color-secondary);">${faq.type}</span></td>
                      <td class="cell-secondary">${faq.createdAt ? ImperiumUtils.formatDateTime(faq.createdAt) : 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderBulkToolbar() {
    if (this.selectedFaqs.length === 0) return '';

    this.bindEvents();
    return `
      <div class="bulk-toolbar" style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--color-primary-light); border: 1px solid var(--color-primary); border-radius: var(--radius-md); margin-bottom: var(--space-4);">
        <span class="bulk-count" style="font-weight: var(--font-medium); color: var(--color-primary);">
          ${this.t('faqs.selectedCount', { count: this.selectedFaqs.length })}
        </span>
        <div style="flex: 1;"></div>
        <button class="btn btn-secondary btn-sm" data-action="bulk-export">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${this.t('faqs.exportSelected')}
        </button>
        <button class="btn btn-primary btn-sm" data-action="bulk-delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          ${this.t('faqs.deleteSelected')}
        </button>
        <button class="btn btn-secondary btn-sm" data-action="bulk-export-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${this.t('faqs.exportAll')}
        </button>
        <button class="btn btn-secondary btn-sm" data-action="clear-selection">${this.t('faqs.clearSelection')}</button>
      </div>
    `;
  }

  renderStatsCards() {
    const total = this.faqs.length;
    const byType = {};
    const types = ['category', 'product', 'guide'];
    types.forEach(type => {
      byType[type] = this.faqs.filter(f => f.type === type).length;
    });

    this.bindEvents();
    return `
      <div class="kpi-grid" style="margin-bottom: var(--space-5);">
        <div class="kpi-card" style="--kpi-color: var(--color-primary);">
          <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div></div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">${this.t('faqs.totalFAQs')}</div>
          </div>
        </div>
        ${types.map(type => `
          <div class="kpi-card" style="--kpi-color: var(--color-secondary);">
            <div class="kpi-header"><div class="kpi-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 9l9 6 9-6v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2l9 6 9-6"/></svg></div></div>
            <div class="kpi-value">${byType[type]}</div>
            <div class="kpi-label">${type}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderFilters() {
    const typeOptions = [
      { value: 'all', label: this.t('common.all') },
      { value: 'category', label: this.t('faqs.category') },
      { value: 'product', label: this.t('faqs.product') },
      { value: 'guide', label: this.t('faqs.guide') }
    ];

    this.bindEvents();
    return `
      <div class="card" style="margin-bottom: var(--space-5);">
        <div class="card-body" style="padding: var(--space-4) var(--space-5);">
          <div class="form-row" style="align-items: flex-end; gap: var(--space-4);">
            <div class="form-group" style="flex: 1; min-width: 200px;">
              <label class="input-label">${this.t('common.search')}</label>
              <input type="text" class="input-field" placeholder="${this.t('faqs.searchPlaceholder')}" 
                value="${ImperiumUtils.escapeHtml(this.filters.search)}" data-filter="search">
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">${this.t('common.type')}</label>
              <select class="input-field select-field" data-filter="type">
                ${typeOptions.map(opt => `<option value="${opt.value}" ${this.filters.type === opt.value ? 'selected' : ''}>${ImperiumUtils.escapeHtml(opt.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">${this.t('faqs.target')}</label>
              <select class="input-field select-field" data-filter="target">
                <option value="all" ${this.filters.target === 'all' ? 'selected' : ''}>${this.t('common.all')}</option>
                <option value="category" ${this.filters.target === 'category' ? 'selected' : ''}>${this.t('faqs.categoryTarget')}</option>
                <option value="product" ${this.filters.target === 'product' ? 'selected' : ''}>${this.t('faqs.productTarget')}</option>
                <option value="guide" ${this.filters.target === 'guide' ? 'selected' : ''}>${this.t('faqs.guideTarget')}</option>
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
    if (this.paginatedFaqs.length === 0) {
      return `
        <div class="table-container">
          <div class="table-empty" style="padding: var(--space-12);">
            <svg class="table-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            <h3 class="table-empty-title">${this.t('faqs.noFAQs')}</h3>
            <p class="table-empty-message">${this.t('faqs.noFAQsMatch')}</p>
          </div>
        </div>
      `;
    }

    const allSelected = this.paginatedFaqs.length > 0 && this.paginatedFaqs.every(f => this.selectedFaqs.includes(f.id));
    const canReorder = this.filters.type !== 'all' || this.filters.target !== 'all';

    this.bindEvents();
    return `
      <div class="table-container">
        <table class="table" id="faqsTable">
          <thead>
            <tr>
              <th scope="col" style="width: 50px;">
                <input type="checkbox" class="table-select-all" ${allSelected ? 'checked' : ''} data-action="select-all" aria-label="${this.t('faqs.selectAll')}">
              </th>
              ${canReorder ? `<th scope="col" style="width: 50px;" aria-label="${this.t('faqs.dragHandle')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-tertiary);"><path d="M3 9l9 6 9-6"/><path d="M3 15l9 6 9-6"/></svg></th>` : ''}
              <th scope="col" style="width: 80px;">${this.t('common.id')}</th>
              <th scope="col" style="width: 180px;">${this.t('faqs.question')}</th>
              <th scope="col" style="width: 120px;">${this.t('faqs.type')}</th>
              <th scope="col" style="width: 120px;">${this.t('faqs.target')}</th>
              <th scope="col" style="width: 100px;">${this.t('common.helpful')}</th>
              <th scope="col">${this.t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${this.paginatedFaqs.map((faq, index) => {
              const isSelected = this.selectedFaqs.includes(faq.id);
              const globalIndex = (this.currentPage - 1) * this.pageSize + index;
              return `
              <tr data-id="${faq.id}" data-index="${globalIndex}" ${isSelected ? 'class="selected"' : ''} draggable="true">
                <td>
                  <input type="checkbox" class="table-row-select" data-faq-id="${faq.id}" ${isSelected ? 'checked' : ''} aria-label="${this.t('faqs.selectRow', { id: faq.id })}">
                </td>
                ${canReorder ? `
                <td class="drag-handle" style="cursor: grab; text-align: center; color: var(--color-text-tertiary);" tabindex="0" role="button" aria-label="${this.t('faqs.dragToReorder')}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9 6 9-6"/><path d="M3 15l9 6 9-6"/></svg>
                </td>` : ''}
                <td class="cell-secondary">${faq.id}</td>
                <td class="cell-primary" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ImperiumUtils.escapeHtml(faq.question)}</td>
                <td>
                  <span class="chip ${faq.type}-chip" style="background: var(--color-secondary-light); color: var(--color-secondary);">
                    ${ImperiumUtils.escapeHtml(faq.type)}
                  </span>
                </td>
                <td>
                  <span class="chip" style="background: var(--color-info-light); color: var(--color-info);">
                    ${ImperiumUtils.escapeHtml(faq.target)}
                  </span>
                </td>
                <td>${faq.helpful}</td>
                <td>
                  <div class="admin-actions">
                    <button class="btn-action view btn-icon" data-action="view-faq" data-id="${faq.id}" aria-label="${this.t('faqs.view')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9 6 9-6v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2l9 6 9-6"/></svg>
                    </button>
                    <button class="btn-action preview btn-icon" data-action="preview-faq" data-id="${faq.id}" aria-label="${this.t('faqs.preview')}" title="${this.t('faqs.preview')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </button>
                    <button class="btn-action edit btn-icon" data-action="edit-faq" data-id="${faq.id}" aria-label="${this.t('faqs.edit')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-action danger btn-icon" data-action="delete-faq" data-id="${faq.id}" aria-label="${this.t('common.delete')}">
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
    return `<span class="star-rating" style="display: flex; gap: 2px;">${stars}</span>`;
  }

  bindEvents() {
    this.on('input', '[data-filter="search"]', (e) => {
      this.filters.search = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="type"]', (e) => {
      this.filters.type = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="target"]', (e) => {
      this.filters.target = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-action="clear-filters"]', () => {
      this.filters = { type: 'all', target: 'all', search: '' };
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-action="create-faq"]', () => this.openCreateModal());

    this.on('click', '[data-action="view-list"]', () => {
      this.viewMode = 'list';
      this.render();
    });

    this.on('click', '[data-action="view-analytics"]', () => {
      this.viewMode = 'analytics';
      this.render();
    });

    // Keyboard shortcuts
    this.on('keydown', (e) => {
      // Ignore if typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      
      const isMac = navigator.platform.includes('Mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      
      switch (e.key.toLowerCase()) {
        case 'n':
          if (mod) {
            e.preventDefault();
            this.openCreateModal();
          }
          break;
        case 'e':
          if (this.selectedFaqs.length === 1) {
            e.preventDefault();
            const faq = this.faqs.find(f => f.id === this.selectedFaqs[0]);
            if (faq) this.openEditModal(faq);
          }
          break;
        case 'delete':
        case 'backspace':
          if (this.selectedFaqs.length > 0) {
            e.preventDefault();
            const deleteBtn = document.querySelector('[data-action="bulk-delete"]');
            if (deleteBtn) deleteBtn.click();
          }
          break;
        case 'a':
          if (mod) {
            e.preventDefault();
            const selectAll = document.querySelector('[data-action="select-all"]');
            if (selectAll && !selectAll.checked) selectAll.click();
          }
          break;
        case 'escape':
          this.selectedFaqs = [];
          this.render();
          break;
        case 'arrowup':
        case 'arrowdown':
          if (this.viewMode === 'list' && this.canReorder()) {
            const focusedRow = document.querySelector('#faqsTable tbody tr:focus-within, #faqsTable tbody tr.focused');
            if (focusedRow) {
              e.preventDefault();
              this.moveFaqWithKeyboard(focusedRow.dataset.id, e.key === 'ArrowUp' ? -1 : 1);
            }
          }
          break;
      }
    });

    // ARIA live region for announcements
    if (!document.getElementById('faq-announcer')) {
      const announcer = document.createElement('div');
      announcer.id = 'faq-announcer';
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-9999px';
      document.body.appendChild(announcer);
    }

    this.announce = (message) => {
      const announcer = document.getElementById('faq-announcer');
      if (announcer) {
        announcer.textContent = '';
        setTimeout(() => { announcer.textContent = message; }, 100);
      }
    };


    this.on('change', '[data-action="select-all"]', (e) => {
      const checkbox = e.target;
      if (checkbox.checked) {
        this.selectedFaqs = [...new Set([...this.selectedFaqs, ...this.paginatedFaqs.map(f => f.id)])];
      } else {
        this.selectedFaqs = this.selectedFaqs.filter(id => !this.paginatedFaqs.map(f => f.id).includes(id));
      }
      this.render();
    });

    this.on('change', '.table-row-select', (e) => {
      const id = e.target.dataset.faqId;
      if (e.target.checked) {
        if (!this.selectedFaqs.includes(id)) this.selectedFaqs.push(id);
      } else {
        this.selectedFaqs = this.selectedFaqs.filter(selId => selId !== id);
      }
      this.render();
    });

    this.on('click', '[data-action="clear-selection"]', () => {
      this.selectedFaqs = [];
      this.render();
    });

    this.on('click', '[data-action="bulk-delete"]', async () => {
      if (this.selectedFaqs.length === 0) return;
      const confirmed = await this.confirm(
        this.t('faqs.bulkDeleteConfirm', { count: this.selectedFaqs.length }),
        { title: this.t('faqs.bulkDeleteTitle'), variant: 'danger' }
      );
      if (confirmed) {
        const count = this.selectedFaqs.length;
        this.faqs = this.faqs.filter(f => !this.selectedFaqs.includes(f.id));
        this.selectedFaqs = [];
        this.applyFilters();
        this.render();
        this.announce(this.t('faqs.bulkDeletedAnnounce', { count }));
        this.admin.success(this.t('faqs.bulkDeleted', { count }));
      }
    });

                    this.on('click', '[data-action="bulk-export"]', () => {
      if (this.selectedFaqs.length === 0) return;
      const selected = this.faqs.filter(f => this.selectedFaqs.includes(f.id));
      const headers = [this.t('common.id'), this.t('faqs.question'), this.t('faqs.answer'), this.t('faqs.type'), this.t('faqs.target'), this.t('faqs.keywords'), this.t('common.helpful'), this.t('common.date')];
      const rows = selected.map(r => [
        r.id, r.question, r.answer, r.type, r.target, r.keywords?.join('; ') || '', r.helpful, ImperiumUtils.formatDateTime(r.createdAt)
      ]);
      const csv = [headers, ...rows].map(row => row.map(cell => `${cell}`).join(',')).join('\n');
      ImperiumUtils.downloadFile(csv, `faqs-selected-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      this.admin.success(this.t('faqs.exported', { count: selected.length }));
    });

    this.on('click', '[data-action="import-faqs"]', () => this.openImportModal());

    this.on('click', '[data-action="view-faq"]', (e) => {
      const id = e.delegateTarget.dataset.id;
      const faq = this.faqs.find(f => f.id === id);
      if (!faq) return;
      this.admin.openModal({
        title: this.t('faqs.view') + ' #' + faq.id,
        content: `
          <div class="detail-full">
            <div class="detail-row"><span class="detail-label">${this.t('common.id')}</span><span class="detail-value">${faq.id}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('faqs.question')}</span><span class="detail-value">${ImperiumUtils.escapeHtml(faq.question)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('faqs.answer')}</span><span class="detail-value" style="white-space: pre-line;">${ImperiumUtils.escapeHtml(faq.answer)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('faqs.type')}</span><span class="detail-value">${ImperiumUtils.escapeHtml(faq.type)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('faqs.target')}</span><span class="detail-value">${ImperiumUtils.escapeHtml(faq.target)}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('faqs.helpful')}</span><span class="detail-value">${faq.helpful}</span></div>
            <div class="detail-row"><span class="detail-label">${this.t('common.date')}</span><span class="detail-value">${ImperiumUtils.formatDateTime(faq.createdAt)}</span></div>
            ${faq.updatedAt ? `<div class="detail-row"><span class="detail-label">${this.t('common.lastUpdated')}</span><span class="detail-value">${ImperiumUtils.formatDateTime(faq.updatedAt)}</span></div>` : ''}
          </div>
        `,
        footer: `<button class="btn btn-secondary" data-action="close">${this.t('common.close')}</button>`
      });
    });

    this.on('click', '[data-action="preview-faq"]', (e) => {
      const id = e.delegateTarget.dataset.id;
      const faq = this.faqs.find(f => f.id === id);
      if (!faq) return;
      this.openPreviewModal(faq);
    });

    this.on('click', '[data-action="edit-faq"]', (e) => {
      const id = e.delegateTarget.dataset.id;
      const faq = this.faqs.find(f => f.id === id);
      if (!faq) return;
      this.openEditModal(faq);
    });

    this.on('click', '[data-action="delete-faq"]', async (e) => {
      const id = e.delegateTarget.dataset.id;
      const confirmed = await this.confirm(this.t('faqs.deleteConfirm'), { title: this.t('faqs.deleteTitle'), variant: 'danger' });
      if (confirmed) {
        this.faqs = this.faqs.filter(f => f.id !== id);
        this.applyFilters();
        this.render();
        this.admin.success(this.t('faqs.deleted'));
      }
    });

    this.on('dragstart', 'tr[draggable="true"]', (e) => {
      if (!this.canReorder()) return;
      const row = e.target.closest('tr');
      if (!row) return;
      e.target.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.dataset.id);
    });

    this.on('dragend', 'tr[draggable="true"]', (e) => {
      e.target.classList.remove('dragging');
      document.querySelectorAll('#faqsTable tr.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    this.on('dragover', '#faqsTable tbody tr', (e) => {
      if (!this.canReorder()) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const row = e.target.closest('tr');
      if (row && !row.classList.contains('dragging')) {
        document.querySelectorAll('#faqsTable tr.drag-over').forEach(el => el.classList.remove('drag-over'));
        row.classList.add('drag-over');
      }
    });

    this.on('dragleave', '#faqsTable tbody tr', (e) => {
      const row = e.target.closest('tr');
      if (row && !e.relatedTarget?.closest('tr')) {
        row.classList.remove('drag-over');
      }
    });

    this.on('drop', '#faqsTable tbody tr', (e) => {
      if (!this.canReorder()) return;
      e.preventDefault();
      const targetRow = e.target.closest('tr');
      if (!targetRow || targetRow.classList.contains('dragging')) return;

      const draggedId = e.dataTransfer.getData('text/plain');
      const targetId = targetRow.dataset.id;
      if (!draggedId || draggedId === targetId) return;

      this.reorderFaqs(draggedId, targetId);
      this.render();
    });

    this.on('keydown', '.drag-handle', (e) => {
      if (!this.canReorder()) return;
      const row = e.target.closest('tr');
      if (!row) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        row.focus();
        this.admin.info(this.t('faqs.useArrowsToReorder'));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? -1 : 1;
        this.moveFaqWithKeyboard(row.dataset.id, direction);
      }
    });
  }

  canReorder() {
    return this.filters.type !== 'all' || this.filters.target !== 'all';
  }

  reorderFaqs(draggedId, targetId) {
    const draggedIndex = this.faqs.findIndex(f => f.id === draggedId);
    const targetIndex = this.faqs.findIndex(f => f.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [dragged] = this.faqs.splice(draggedIndex, 1);
    this.faqs.splice(targetIndex, 0, dragged);

    this.faqs.forEach((faq, index) => {
      faq.order = index;
      faq.updatedAt = new Date().toISOString();
    });

    this.admin.success(this.t('faqs.reordered'));
  }

  moveFaqWithKeyboard(faqId, direction) {
    const index = this.faqs.findIndex(f => f.id === faqId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.faqs.length) return;

    const [faq] = this.faqs.splice(index, 1);
    this.faqs.splice(newIndex, 0, faq);

    this.faqs.forEach((f, i) => {
      f.order = i;
      f.updatedAt = new Date().toISOString();
    });

    this.render();
    this.admin.success(this.t('faqs.reordered'));
  }

  openPreviewModal(faq) {
    const schema = this.generateFAQSchema(faq);
    const schemaHtml = `<pre style="background: var(--color-bg-secondary); padding: var(--space-4); border-radius: var(--radius-md); overflow-x: auto; font-size: var(--text-xs); max-height: 300px;"><code>${JSON.stringify(schema, null, 2)}</code></pre>`;
    const renderedHtml = this.renderFAQPreview(faq);

    this.admin.openModal({
      title: this.t('faqs.preview') + ' #' + faq.id,
      content: `
        <div class="preview-modal" style="display: flex; flex-direction: column; gap: var(--space-5);">
          <div class="preview-tabs" style="display: flex; border-bottom: 1px solid var(--color-border-primary);">
            <button class="preview-tab active" data-tab="rendered" style="padding: var(--space-2) var(--space-4); background: none; border: none; cursor: pointer; font-weight: var(--font-medium); color: var(--color-primary); border-bottom: 2px solid var(--color-primary);">${this.t('faqs.previewRendered')}</button>
            <button class="preview-tab" data-tab="schema" style="padding: var(--space-2) var(--space-4); background: none; border: none; cursor: pointer; font-weight: var(--font-medium); color: var(--color-text-tertiary);">${this.t('faqs.previewSchema')}</button>
            <button class="preview-tab" data-tab="validation" style="padding: var(--space-2) var(--space-4); background: none; border: none; cursor: pointer; font-weight: var(--font-medium); color: var(--color-text-tertiary);">${this.t('faqs.previewValidation')}</button>
          </div>
          <div class="preview-panels">
            <div class="preview-panel" data-panel="rendered" style="display: block;">
              <div class="faq-preview" style="border: 1px solid var(--color-border-primary); border-radius: var(--radius-md); padding: var(--space-5); background: var(--color-bg-primary);">
                ${renderedHtml}
              </div>
            </div>
            <div class="preview-panel" data-panel="schema" style="display: none;">
              ${schemaHtml}
            </div>
            <div class="preview-panel" data-panel="validation" style="display: none;">
              <div class="validation-results" style="padding: var(--space-4);">
                <h4 style="margin-bottom: var(--space-3);">${this.t('faqs.validationResults')}</h4>
                <ul style="list-style: none; padding: 0;">
                  <li style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); color: var(--color-success);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg> ${this.t('faqs.validSchema')}</li>
                  <li style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); color: var(--color-success);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg> ${this.t('faqs.hasQuestion')}</li>
                  <li style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); color: var(--color-success);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg> ${this.t('faqs.hasAnswer')}</li>
                  <li style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); color: ${faq.keywords?.length ? 'var(--color-success)' : 'var(--color-warning)'};">${faq.keywords?.length ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'} ${faq.keywords?.length ? this.t('faqs.hasKeywords') : this.t('faqs.missingKeywords')}</li>
                  <li style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); color: var(--color-success);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg> ${this.t('faqs.validTarget')}: ${faq.target}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="copy-schema">${this.t('faqs.copySchema')}</button>
        <button class="btn btn-secondary" data-action="close">${this.t('common.close')}</button>
      `
    });

    this.on('click', '.preview-tab', (e) => {
      const tab = e.target.dataset.tab;
      document.querySelectorAll('.preview-tab').forEach(t => {
        t.classList.remove('active');
        t.style.color = 'var(--color-text-tertiary)';
        t.style.borderBottomColor = 'transparent';
      });
      e.target.classList.add('active');
      e.target.style.color = 'var(--color-primary)';
      e.target.style.borderBottomColor = 'var(--color-primary)';
      document.querySelectorAll('.preview-panel').forEach(p => p.style.display = 'none');
      document.querySelector(`.preview-panel[data-panel="${tab}"]`).style.display = 'block';
    });

    this.on('click', '[data-action="copy-schema"]', () => {
      navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      this.admin.success(this.t('faqs.schemaCopied'));
    });
  }

  generateFAQSchema(faq) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }]
    };
  }

  renderFAQPreview(faq) {
    return `
      <details class="faq-item" style="border-bottom: 1px solid var(--color-border-primary);" open>
        <summary style="cursor: pointer; font-weight: var(--font-semibold); padding: var(--space-3) 0; list-style: none; display: flex; align-items: center; justify-content: space-between;">
          <span>${ImperiumUtils.escapeHtml(faq.question)}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-text-tertiary); transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <div style="padding: var(--space-3) 0; color: var(--color-text-secondary); line-height: 1.6;">${ImperiumUtils.escapeHtml(faq.answer).replace(/\n/g, '<br>')}</div>
      </details>
    `;
  }

  openImportModal() {
    this.admin.openModal({
      title: this.t('faqs.importFAQs'),
      content: `
        <div style="padding: var(--space-4);">
          <p style="margin-bottom: var(--space-4); color: var(--color-text-secondary);">${this.t('faqs.importInstructions')}</p>
          <div class="form-group">
            <label class="input-label">${this.t('faqs.importFile')}</label>
            <input type="file" class="input-field" accept=".csv,.json" id="faq-import-file">
            <p class="form-hint" style="margin-top: var(--space-2); font-size: var(--text-xs); color: var(--color-text-tertiary);">${this.t('faqs.importHint')}</p>
          </div>
          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="input-label">
              <input type="checkbox" id="faq-import-append" checked> ${this.t('faqs.importAppend')}
            </label>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">${this.t('common.close')}</button>
        <button class="btn btn-primary" data-action="import-faqs-submit">${this.t('faqs.import')}</button>
      `
    });

    this.on('click', '[data-action="import-faqs-submit"]', () => this.handleImportSubmit());
  }


  openCreateModal() {
    this.admin.openModal({
      title: this.t('faqs.createFAQ'),
      content: `
        <form class="faq-form" novalidate>
          <div class="form-row" style="gap: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('faqs.question')}<span class="required">*</span></label>
              <input type="text" class="input-field" required data-field="question" placeholder="Enter question">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('faqs.target')}</label>
              <select class="input-field select-field" data-field="target">
                <option value="category">${this.t('faqs.categoryTarget')}</option>
                <option value="product">${this.t('faqs.productTarget')}</option>
                <option value="guide">${this.t('faqs.guideTarget')}</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="input-label">${this.t('faqs.answer')}<span class="required">*</span></label>
            <textarea class="input-field" required data-field="answer" rows="4" placeholder="Enter answer"></textarea>
          </div>
          <div class="form-row" style="gap: var(--space-4) margin-top: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('faqs.type')}</label>
              <select class="input-field select-field" data-field="type">
                <option value="category">${this.t('faqs.category')}</option>
                <option value="product">${this.t('faqs.product')}</option>
                <option value="guide">${this.t('faqs.guide')}</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('faqs.keywords')}</label>
              <input type="text" class="input-field" data-field="keywords" placeholder="Comma-separated keywords">
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">${this.t('common.close')}</button>
        <button class="btn btn-primary" data-action="create-faq-submit">${this.t('faqs.create')}</button>
      `
    });

    this.on('click', '[data-action="create-faq-submit"]', () => this.handleCreateSubmit());
    this.on('click', '[data-action="close"]', (e) => {
      const modal = e.delegateTarget.closest('.modal');
      if (modal) modal.remove();
    });
  }

  handleCreateSubmit() {
    const form = document.querySelector('.faq-form');
    if (!form) return;

    const question = form.querySelector('[data-field="question"]')?.value?.trim();
    const answer = form.querySelector('[data-field="answer"]')?.value?.trim();
    const target = form.querySelector('[data-field="target"]')?.value;
    const type = form.querySelector('[data-field="type"]')?.value;
    const keywordsInput = form.querySelector('[data-field="keywords"]')?.value?.trim();
    const keywords = keywordsInput ? keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0) : [];

    if (!question || !answer) {
      this.admin.error(this.t('faqs.fillRequired'));
      return;
    }

    const newFaq = {
      id: `FAQ-${Date.now().toString(36).padStart(6, '0')}`,
      question,
      answer,
      type,
      target,
      keywords,
      helpful: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.faqs.push(newFaq);
    this.applyFilters();
    this.render();
    this.announce(this.t('faqs.createdAnnounce'));
    this.admin.success(this.t('faqs.created'));

    setTimeout(() => this.admin.closeModal(), 300);
  }

  handleImportSubmit() {
    const fileInput = document.getElementById('faq-import-file');
    if (!fileInput || !fileInput.files.length) {
      this.admin.error(this.t('faqs.noFileSelected'));
      return;
    }

    const file = fileInput.files[0];
    const isJSON = file.name.endsWith('.json');
    const isCSV = file.name.endsWith('.csv');

    if (!isJSON && !isCSV) {
      this.admin.error(this.t('faqs.invalidFileType'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let imported = [];
        if (isJSON) {
          imported = JSON.parse(e.target.result);
        } else {
          // Simple CSV parsing
          const lines = e.target.result.split('\n').filter(l => l.trim());
          if (lines.length < 2) throw new Error('Empty CSV');
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          imported = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, i) => obj[h] = values[i]);
            return obj;
          });
        }

        if (!Array.isArray(imported)) throw new Error('Invalid format');

        const append = document.getElementById('faq-import-append')?.checked;
        if (!append) this.faqs = [];

        let count = 0;
        imported.forEach(item => {
          if (item.question && item.answer) {
            const newFaq = {
              id: `FAQ-${Date.now().toString(36).padStart(6, '0')}-${Math.random().toString(36).substr(2, 4)}`,
              question: item.question.trim(),
              answer: item.answer.trim(),
              type: item.type || 'category',
              target: item.target || 'category',
              keywords: item.keywords ? item.keywords.split(';').map(k => k.trim()) : [],
              helpful: parseInt(item.helpful) || 0,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            this.faqs.push(newFaq);
            count++;
          }
        });

        this.applyFilters();
        this.render();
        this.admin.success(this.t('faqs.imported', { count }));
        this.admin.closeModal();
      } catch (err) {
        this.admin.error(this.t('faqs.importError') + ': ' + err.message);
      }
    };
    reader.readAsText(file);
  }


  openEditModal(faq) {
    this.admin.openModal({
      title: this.t('faqs.editFAQ') + ' #' + faq.id,
      content: `
        <form class="faq-form" novalidate>
          <div class="form-row" style="gap: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('faqs.question')}<span class="required">*</span></label>
              <input type="text" class="input-field" required data-field="question" value="${ImperiumUtils.escapeHtml(faq.question)}">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('faqs.target')}</label>
              <select class="input-field select-field" data-field="target">
                <option value="category" ${faq.target === 'category' ? 'selected' : ''}>${this.t('faqs.categoryTarget')}</option>
                <option value="product" ${faq.target === 'product' ? 'selected' : ''}>${this.t('faqs.productTarget')}</option>
                <option value="guide" ${faq.target === 'guide' ? 'selected' : ''}>${this.t('faqs.guideTarget')}</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="input-label">${this.t('faqs.answer')}<span class="required">*</span></label>
            <textarea class="input-field" required data-field="answer" rows="4">${ImperiumUtils.escapeHtml(faq.answer)}</textarea>
          </div>
          <div class="form-row" style="gap: var(--space-4) margin-top: var(--space-4);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('faqs.type')}</label>
              <select class="input-field select-field" data-field="type">
                <option value="category" ${faq.type === 'category' ? 'selected' : ''}>${this.t('faqs.category')}</option>
                <option value="product" ${faq.type === 'product' ? 'selected' : ''}>${this.t('faqs.product')}</option>
                <option value="guide" ${faq.type === 'guide' ? 'selected' : ''}>${this.t('faqs.guide')}</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="input-label">${this.t('faqs.keywords')}</label>
              <input type="text" class="input-field" data-field="keywords" value="${faq.keywords ? faq.keywords.join(', ') : ''}" placeholder="Comma-separated keywords">
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">${this.t('common.close')}</button>
        <button class="btn btn-primary" data-action="edit-faq-submit">${this.t('faqs.save')}</button>
      `
    });

    this.on('click', '[data-action="edit-faq-submit"]', () => this.handleEditSubmit(faq));
    this.on('click', '[data-action="close"]', (e) => {
      const modal = e.delegateTarget.closest('.modal');
      if (modal) modal.remove();
    });
  }

  handleEditSubmit(faq) {
    const form = document.querySelector('.faq-form');
    if (!form) return;

    const question = form.querySelector('[data-field="question"]')?.value?.trim();
    const answer = form.querySelector('[data-field="answer"]')?.value?.trim();
    const target = form.querySelector('[data-field="target"]')?.value;
    const type = form.querySelector('[data-field="type"]')?.value;
    const keywordsInput = form.querySelector('[data-field="keywords"]')?.value?.trim();
    const keywords = keywordsInput ? keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0) : [];

    if (!question || !answer) {
      this.admin.error(this.t('faqs.fillRequired'));
      return;
    }

    faq.question = question;
    faq.answer = answer;
    faq.target = target;
    faq.type = type;
    faq.keywords = keywords;
    faq.updatedAt = new Date().toISOString();

    this.applyFilters();
    this.render();
    this.announce(this.t('faqs.updatedAnnounce'));
    this.admin.success(this.t('faqs.updated'));

    setTimeout(() => this.admin.closeModal(), 300);
  }
}