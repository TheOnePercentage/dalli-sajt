import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { Button, Modal, Input, Textarea, Dropdown } from '../components/index.js';
import { SectionAPI } from '../services/integration.js';

export class CategoriesSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.categories;
    this.categories = [];
    this.filteredCategories = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalItems = 0;
    this.filters = { search: '' };
    this.t = this.admin?.t || ((key) => key);
  }

  async onEnter() {
    await this.loadCategories();
    this.render();
  }

  async loadCategories() {
    try {
      this.categories = await this.api.list({ search: this.filters.search });
    } catch (error) {
      console.warn('[Categories] API failed, falling back to mock data:', error);
      this.categories = this.generateMockCategories();
    }
    this.applyFilters();
  }

  generateMockCategories() {
    const mainCategories = [
      { id: 1, name: 'Majice', slug: 'majice', parentId: null, order: 1, productCount: 2 },
      { id: 2, name: 'Trenerke', slug: 'trenerke', parentId: null, order: 2, productCount: 2 },
      { id: 3, name: 'Duksevi', slug: 'dukseri', parentId: null, order: 3, productCount: 2 },
      { id: 4, name: 'Ostalo', slug: 'ostalo', parentId: null, order: 4, productCount: 2 }
    ];

    const subcategories = [
      { id: 5, name: 'Kratki rukav', slug: 'kratki-rukav', parentId: 1, order: 1, productCount: 1 },
      { id: 6, name: 'Dugi rukav', slug: 'dugi-rukav', parentId: 1, order: 2, productCount: 1 },
      { id: 7, name: 'Sportska', slug: 'sportska', parentId: 2, order: 1, productCount: 1 },
      { id: 8, name: 'Kapuljača', slug: 'kapuljaca', parentId: 2, order: 2, productCount: 1 },
      { id: 9, name: 'Kapuljača', slug: 'kapuljaca', parentId: 3, order: 1, productCount: 2 },
      { id: 10, name: 'Čarape', slug: 'carape', parentId: 4, order: 1, productCount: 1 },
      { id: 11, name: 'Aksesoari', slug: 'aksesoari', parentId: 4, order: 2, productCount: 1 }
    ];

    return [...mainCategories, ...subcategories].map(cat => ({
      ...cat,
      description: `Kategorija ${cat.name.toLowerCase()}`,
      seo: {
        title: `${cat.name} | DALLI`,
        description: `Kupite ${cat.name.toLowerCase()} po najboljim cenama. Brza dostava i kvalitet.`
      },
      active: true,
      image: null,
      createdAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString()
    }));
  }

  applyFilters() {
    let filtered = [...this.categories];

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.slug.toLowerCase().includes(search) ||
        (c.description && c.description.toLowerCase().includes(search))
      );
    }

    filtered.sort((a, b) => {
      if (a.parentId !== b.parentId) {
        return (a.parentId || 0) - (b.parentId || 0);
      }
      return a.order - b.order;
    });

    this.filteredCategories = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  get paginatedCategories() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCategories.slice(start, start + this.pageSize);
  }

  getMainCategories() {
    return this.filteredCategories.filter(c => !c.parentId);
  }

  getSubcategories(parentId) {
    return this.filteredCategories.filter(c => c.parentId === parentId);
  }

render() {
    const statsHtml = this.renderStatsCards();
    const filtersHtml = this.renderFilters();
    const treeHtml = this.renderCategoryTree();
    const paginationHtml = this.totalItems > this.pageSize ? this.renderPagination() : '';

    this.bindEvents();
    return `
      <div class="categories-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.t('categories.title')}</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">${this.t('categories.subtitle')}</p>
          </div>
          <button class="btn btn-primary" data-action="create-category">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${this.t('categories.addCategory')}
          </button>
        </div>
        ${statsHtml}
        ${filtersHtml}
        <div class="card">
          <div class="card-body" style="padding: 0;">
            ${treeHtml}
          </div>
        </div>
        ${paginationHtml}
      </div>
    `;
  }

renderStatsCards() {
    const mainCats = this.getMainCategories().length;
    const subCats = this.filteredCategories.filter(c => c.parentId).length;
    const totalProducts = this.filteredCategories.reduce((sum, c) => sum + (c.productCount || 0), 0);
    const active = this.filteredCategories.filter(c => c.active).length;

    this.bindEvents();
    return `
      <div class="kpi-grid" style="margin-bottom: var(--space-5);">
        <div class="kpi-card" style="--kpi-color: var(--color-primary);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2v20M17 7H8.5a2.5 2.5 0 0 1 0-5H17"/><path d="M7 17h10"/></svg></div>
          </div>
          <div class="kpi-value">${mainCats}</div>
          <div class="kpi-label">${this.t('categories.mainCategories')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-info);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-info), var(--color-info-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          </div>
          <div class="kpi-value">${subCats}</div>
          <div class="kpi-label">${this.t('categories.subcategories')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-success);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-success), var(--color-success-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20.5 17A5 5 0 0 0 18 7h-1.58a5 5 0 0 0-7.16 1.5"/><path d="M4 15.5s2 2 4 2 4-2 4-2-2-2-4-2"/><path d="M14 13h10"/><path d="M14 17h6"/></svg></div>
          </div>
          <div class="kpi-value">${totalProducts}</div>
          <div class="kpi-label">${this.t('categories.totalProducts')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-accent);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg></div>
          </div>
          <div class="kpi-value">${active}</div>
          <div class="kpi-label">${this.t('categories.activeCategories')}</div>
        </div>
      </div>
    `;
  }

  renderFilters() {
    this.bindEvents();
    return `
      <div class="card" style="margin-bottom: var(--space-5);">
        <div class="card-body" style="padding: var(--space-4) var(--space-5);">
          <div class="form-row" style="align-items: flex-end; gap: var(--space-4);">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label class="input-label">${this.t('common.search')}</label>
              <input type="text" class="input-field" placeholder="${this.t('categories.searchPlaceholder')}" 
                value="${ImperiumUtils.escapeHtml(this.filters.search)}" data-filter="search">
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" data-action="clear-filters">${this.t('common.clear')}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderCategoryTree() {
    const mainCategories = this.getMainCategories();
    if (mainCategories.length === 0) {
      return `
        <div class="table-empty" style="padding: var(--space-12);">
          <svg class="table-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M17 7H8.5a2.5 2.5 0 0 1 0-5H17"/><path d="M7 17h10"/></svg>
          <h3 class="table-empty-title">${this.t('categories.noCategories')}</h3>
          <p class="table-empty-message">${this.t('categories.addFirstCategory')}</p>
        </div>
      `;
    }

    this.bindEvents();
    return `
      <div class="category-tree">
        ${mainCategories.map(cat => this.renderCategoryNode(cat)).join('')}
      </div>
    `;
  }

  renderCategoryNode(cat, level = 0) {
    const subcategories = this.getSubcategories(cat.id);
    const hasChildren = subcategories.length > 0;
    const indent = level * 24;

    this.bindEvents();
    return `
      <div class="category-node" data-id="${cat.id}" style="${level > 0 ? `padding-left: ${indent}px;` : ''}">
        <div class="category-row" style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border-primary);">
          ${hasChildren ? `
            <button class="btn btn-ghost btn-sm btn-icon category-toggle" data-action="toggle-category" data-id="${cat.id}" aria-expanded="true" aria-label="${cat.active ? this.t('categories.actions.toggleCollapse') : this.t('categories.actions.toggleExpand')}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          ` : '<div style="width: 32px;"></div>'}
          
          ${cat.image ? `<img src="${cat.image}" alt="" style="width: 32px; height: 32px; border-radius: var(--radius-sm); object-fit: cover;">` : `
            <div class="category-icon" style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--color-bg-tertiary); display: flex; align-items; center; justify-content: center; color: var(--color-text-tertiary);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M17 7H8.5a2.5 2.5 0 0 1 0-5H17"/><path d="M7 17h10"/></svg>
            </div>
          `}
          
          <div style="flex: 1; min-width: 0;">
            <div class="cell-primary" style="font-weight: var(--font-semibold);">${ImperiumUtils.escapeHtml(cat.name)}</div>
            <div class="cell-tertiary" style="font-size: var(--text-xs);">${cat.slug} • ${cat.productCount || 0} ${this.t('categories.totalProducts').toLowerCase()}</div>
          </div>
          
          <span class="${cat.active ? 'badge badge-success' : 'badge badge-neutral'}" style="font-size: var(--text-xs);">
            ${cat.active ? this.t('categories.active') : this.t('categories.inactive')}
          </span>
          
          <div class="admin-actions">
            <button class="btn-action view btn-icon" data-action="edit" data-id="${cat.id}" aria-label="${this.t('categories.actions.edit')}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            ${hasChildren ? `
              <button class="btn-action update btn-icon" data-action="add-subcategory" data-id="${cat.id}" aria-label="${this.t('categories.actions.addSubcategory')}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            ` : ''}
            <button class="btn-action ${cat.active ? 'update' : 'view'} btn-icon" data-action="toggle-status" data-id="${cat.id}" aria-label="${cat.active ? this.t('categories.actions.deactivate') : this.t('categories.actions.activate')}">
              ${cat.active 
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-5.52 0-10-4.48-10-10S6.48 2 12 2c5.52 0 10 4.48 10 10 0 1.63-.37 3.16-.99 4.58"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
              }
            </button>
            <button class="btn-action delete btn-icon" data-action="delete" data-id="${cat.id}" aria-label="${this.t('categories.actions.delete')}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        
        ${hasChildren ? `
          <div class="category-children" data-parent="${cat.id}" style="display: block;">
            ${subcategories.map(sub => this.renderCategoryNode(sub, level + 1)).join('')}
          </div>
        ` : ''}
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
        <div class="table-pagination-info">${this.t('categories.pageInfo', { current: this.currentPage, total: totalPages, count: this.totalItems })}</div>
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

    this.on('click', '[data-action="clear-filters"]', () => {
      this.filters = { search: '' };
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

    this.on('click', '[data-action="create-category"]', () => this.openCategoryModal('create'));
    this.on('click', '[data-action="add-subcategory"]', (e) => this.openCategoryModal('create', parseInt(e.delegateTarget.dataset.id)));

    this.on('click', '[data-action="edit"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      this.openCategoryModal('edit', id);
    });

    this.on('click', '[data-action="toggle-category"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      const children = this.element?.querySelector(`.category-children[data-parent="${id}"]`);
      const toggle = e.delegateTarget;
      if (children) {
        const isHidden = children.style.display === 'none';
        children.style.display = isHidden ? 'block' : 'none';
        toggle.setAttribute('aria-expanded', isHidden);
        toggle.querySelector('svg').style.transform = isHidden ? 'rotate(0)' : 'rotate(-90deg)';
      }
    });

    this.on('click', '[data-action="toggle-status"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      this.toggleCategoryStatus(id);
    });

    this.on('click', '[data-action="delete"]', async (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      const cat = this.categories.find(c => c.id === id);
      if (!cat) return;
      const hasChildren = this.categories.some(c => c.parentId === id);
      let message = this.t('categories.confirmDelete', { name: cat.name });
      if (hasChildren) message += this.t('categories.confirmDeleteWithChildren');
      const confirmed = await this.confirm(message, { title: this.t('categories.deleteTitle'), variant: 'danger' });
      if (confirmed) {
        this.categories = this.categories.filter(c => c.id !== id && c.parentId !== id);
        this.applyFilters();
        this.render();
        this.admin.success(this.t('categories.deleted'));
      }
    });
  }

  openCategoryModal(mode, id = null) {
    const isEdit = mode === 'edit';
    const category = isEdit ? this.categories.find(c => c.id === id) : null;
    const parentId = !isEdit ? id : (category?.parentId || null);

    const parentOptions = this.categories
      .filter(c => !c.parentId && c.id !== (isEdit ? id : null))
      .map(c => `<option value="${c.id}" ${parentId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');

    this.admin.openModal({
      title: isEdit ? this.t('categories.form.editTitle', { name: category.name }) : this.t('categories.form.addTitle'),
      content: `
        <form id="categoryForm" class="category-form">
          <div class="form-group">
            <label class="input-label">${this.t('categories.form.nameRequired')}</label>
            <input type="text" class="input-field" name="name" value="${category ? ImperiumUtils.escapeHtml(category.name) : ''}" required placeholder="${this.t('categories.form.nameRequired').replace(' *', '')}">
          </div>
          <div class="form-group">
            <label class="input-label">${this.t('categories.form.slugRequired')}</label>
            <input type="text" class="input-field" name="slug" value="${category ? category.slug : ''}" required placeholder="${this.t('categories.form.slugPlaceholder')}" pattern="^[a-z0-9-]+$">
          </div>
          <div class="form-group">
            <label class="input-label">${this.t('categories.form.parentCategory')}</label>
            <select class="input-field select-field" name="parentId">
              <option value="">${this.t('categories.form.mainCategoryOption')}</option>
              ${parentOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="input-label">${this.t('categories.form.displayOrder')}</label>
            <input type="number" class="input-field" name="order" value="${category ? category.order : 0}" min="0" style="width: 100px;">
          </div>
          <div class="form-group">
            <label class="input-label">${this.t('categories.form.description')}</label>
            <textarea class="input-field textarea-field" name="description" rows="3" placeholder="${this.t('categories.form.descriptionPlaceholder')}">${category ? category.description : ''}</textarea>
          </div>
          <div class="form-section">
            <h3 class="form-section-title">${this.t('categories.form.seoSection')}</h3>
            <div class="form-group">
              <label class="input-label">${this.t('categories.form.metaTitle')}</label>
              <input type="text" class="input-field" name="seoTitle" value="${category ? (category.seo?.title || '') : ''}" maxlength="60" placeholder="${this.t('categories.form.metaTitlePlaceholder')}">
            </div>
            <div class="form-group">
              <label class="input-label">${this.t('categories.form.metaDescription')}</label>
              <textarea class="input-field textarea-field" name="seoDescription" rows="2" maxlength="160" placeholder="${this.t('categories.form.metaDescriptionPlaceholder')}">${category ? (category.seo?.description || '') : ''}</textarea>
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-wrapper">
              <input type="checkbox" class="checkbox-input" name="active" ${category ? (category.active ? 'checked' : '') : 'checked'}>
              <span class="checkbox-box"></span>
              <span class="checkbox-text">${this.t('categories.form.activeCheckbox')}</span>
            </label>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">${this.t('categories.form.cancel')}</button>
        <button class="btn btn-primary" data-action="save-category" ${isEdit ? `data-id="${id}"` : ''}>${isEdit ? this.t('categories.form.saveChanges') : this.t('categories.form.createButton')}</button>
      `
    });
  }

  toggleCategoryStatus(id) {
    const category = this.categories.find(c => c.id === id);
    if (!category) return;
    category.active = !category.active;
    this.applyFilters();
    this.render();
    this.admin.success(category.active ? this.t('categories.toggledOn') : this.t('categories.toggledOff'));
  }
}