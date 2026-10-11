import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { Table, Pagination, Button, Modal, Input, Select, Textarea, Dropdown } from '../components/index.js';
import { SectionAPI } from '../services/integration.js';

export class InventorySection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.inventory;
    this.products = [];
    this.filteredProducts = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalItems = 0;
    this.filters = {
      stock: 'all',
      category: 'all',
      search: ''
    };
    this.categories = ['majice', 'trenerke', 'dukseri', 'ostalo'];
    this.t = this.admin?.t || ((key) => key);
  }

  async onEnter() {
    await this.loadProducts();
    this.render();
  }

  async loadProducts() {
    try {
      this.products = await this.api.list(this.getFilterParams());
    } catch (error) {
      console.warn('[Inventory] API failed, falling back to mock data:', error);
      this.products = this.generateMockProducts();
    }
    this.applyFilters();
  }

  getFilterParams() {
    const params = { page: this.currentPage, limit: this.pageSize };
    if (this.filters.stock !== 'all') params.stock = this.filters.stock;
    if (this.filters.category !== 'all') params.category = this.filters.category;
    if (this.filters.search) params.search = this.filters.search;
    return params;
  }

  generateMockProducts() {
    const baseProducts = [
      { id: 1, name: 'Osnovna Majica', category: 'majice', basePrice: 1290 },
      { id: 2, name: 'Dugorukava Majica', category: 'majice', basePrice: 1590 },
      { id: 3, name: 'Muška Sportska Trenerka', category: 'trenerke', basePrice: 3490 },
      { id: 4, name: 'Ženska Kapuljača Trenerka', category: 'trenerke', basePrice: 3890 },
      { id: 5, name: 'Muški Duks (Hoodie)', category: 'dukseri', basePrice: 4290 },
      { id: 6, name: 'Ženski Duks (Hoodie)', category: 'dukseri', basePrice: 3990 },
      { id: 7, name: 'Čarape Unisex (set 3 para)', category: 'ostalo', basePrice: 490 },
      { id: 8, name: 'Šalica za Kafu DALLI', category: 'ostalo', basePrice: 890 }
    ];

    return baseProducts.map(p => {
      const variants = [
        { color: 'Bela', size: 'S', sku: `${p.id}-BEL-S`, stock: Math.floor(Math.random() * 30) },
        { color: 'Bela', size: 'M', sku: `${p.id}-BEL-M`, stock: Math.floor(Math.random() * 30) },
        { color: 'Bela', size: 'L', sku: `${p.id}-BEL-L`, stock: Math.floor(Math.random() * 30) },
        { color: 'Crna', size: 'S', sku: `${p.id}-CRNA-S`, stock: Math.floor(Math.random() * 30) },
        { color: 'Crna', size: 'M', sku: `${p.id}-CRNA-M`, stock: Math.floor(Math.random() * 30) },
        { color: 'Crna', size: 'L', sku: `${p.id}-CRNA-L`, stock: Math.floor(Math.random() * 30) },
        { color: 'Navy', size: 'S', sku: `${p.id}-NAVY-S`, stock: Math.floor(Math.random() * 30) },
        { color: 'Navy', size: 'M', sku: `${p.id}-NAVY-M`, stock: Math.floor(Math.random() * 30) },
        { color: 'Navy', size: 'L', sku: `${p.id}-NAVY-L`, stock: Math.floor(Math.random() * 30) }
      ];

      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
      const lowStockVariants = variants.filter(v => v.stock > 0 && v.stock <= 5).length;
      const outOfStockVariants = variants.filter(v => v.stock === 0).length;

      return {
        ...p,
        sku: `ML-${String(p.id).padStart(3, '0')}`,
        variants,
        totalStock,
        lowStockVariants,
        outOfStockVariants,
        reservedStock: Math.floor(Math.random() * 5),
        incomingStock: Math.floor(Math.random() * 20),
        reorderPoint: 10,
        reorderQty: 50,
        supplier: 'DALLI Manufacturing',
        lastRestocked: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
      };
    });
  }

  applyFilters() {
    let filtered = [...this.products];

    if (this.filters.stock !== 'all') {
      if (this.filters.stock === 'critical') {
        filtered = filtered.filter(p => p.outOfStockVariants > 0);
      } else if (this.filters.stock === 'low') {
        filtered = filtered.filter(p => p.lowStockVariants > 0 && p.outOfStockVariants === 0);
      } else if (this.filters.stock === 'ok') {
        filtered = filtered.filter(p => p.lowStockVariants === 0 && p.outOfStockVariants === 0);
      }
    }

    if (this.filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === this.filters.category);
    }

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        p.category.includes(search)
      );
    }

    filtered.sort((a, b) => {
      if (a.outOfStockVariants > 0 && b.outOfStockVariants === 0) return -1;
      if (b.outOfStockVariants > 0 && a.outOfStockVariants === 0) return 1;
      if (a.lowStockVariants > 0 && b.lowStockVariants === 0) return -1;
      if (b.lowStockVariants > 0 && a.lowStockVariants === 0) return 1;
      return b.totalStock - a.totalStock;
    });

    this.filteredProducts = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  get paginatedProducts() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

render() {
    const statsHtml = this.renderStatsCards();
    const filtersHtml = this.renderFilters();
    const tableHtml = this.renderTable();
    const paginationHtml = this.totalItems > this.pageSize ? this.renderPagination() : '';

    this.bindEvents();
    return `
      <div class="inventory-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.t('inventory.title')}</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">${this.t('inventory.subtitle')}</p>
          </div>
          <button class="btn btn-primary" data-action="export-inventory">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${this.t('inventory.exportCsv')}
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
    const totalProducts = this.products.length;
    const totalVariants = this.products.reduce((sum, p) => sum + p.variants.length, 0);
    const totalStock = this.products.reduce((sum, p) => sum + p.totalStock, 0);
    const criticalProducts = this.products.filter(p => p.outOfStockVariants > 0).length;
    const lowStockProducts = this.products.filter(p => p.lowStockVariants > 0 && p.outOfStockVariants === 0).length;
    const incomingStock = this.products.reduce((sum, p) => sum + p.incomingStock, 0);

    this.bindEvents();
    return `
      <div class="kpi-grid" style="margin-bottom: var(--space-5);">
        <div class="kpi-card" style="--kpi-color: var(--color-primary);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v16"/><path d="M2 12h20"/></svg></div>
          </div>
          <div class="kpi-value">${totalProducts}</div>
          <div class="kpi-label">${this.t('inventory.productsCount')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-info);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-info), var(--color-info-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></div>
          </div>
          <div class="kpi-value">${totalVariants}</div>
          <div class="kpi-label">${this.t('inventory.totalVariants')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-success);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-success), var(--color-success-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
          </div>
          <div class="kpi-value">${totalStock}</div>
          <div class="kpi-label">${this.t('inventory.total')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-warning);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-warning), var(--color-warning-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg></div>
          </div>
          <div class="kpi-value">${lowStockProducts}</div>
          <div class="kpi-label">${this.t('inventory.lowStock')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-error);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-error), var(--color-error-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
          </div>
          <div class="kpi-value">${criticalProducts}</div>
          <div class="kpi-label">${this.t('inventory.outOfStock')}</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-info);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-info), var(--color-info-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2v20M17 7H8.5a2.5 2.5 0 0 1 0-5H17"/><path d="M7 17h10"/></svg></div>
          </div>
          <div class="kpi-value">${incomingStock}</div>
          <div class="kpi-label">${this.t('inventory.incoming')}</div>
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
              <input type="text" class="input-field" placeholder="${this.t('inventory.searchPlaceholder')}" 
                value="${ImperiumUtils.escapeHtml(this.filters.search)}" data-filter="search">
            </div>
            <div class="form-group" style="min-width: 180px;">
              <label class="input-label">${this.t('inventory.stockStatus')}</label>
              <select class="input-field select-field" data-filter="stock">
                <option value="all" ${this.filters.stock === 'all' ? 'selected' : ''}>${this.t('inventory.allStockStatuses')}</option>
                <option value="critical" ${this.filters.stock === 'critical' ? 'selected' : ''}>${this.t('inventory.critical')}</option>
                <option value="low" ${this.filters.stock === 'low' ? 'selected' : ''}>${this.t('inventory.low')}</option>
                <option value="ok" ${this.filters.stock === 'ok' ? 'selected' : ''}>${this.t('inventory.ok')}</option>
              </select>
            </div>
            <div class="form-group" style="min-width: 180px;">
              <label class="input-label">${this.t('common.category')}</label>
              <select class="input-field select-field" data-filter="category">
                <option value="all" ${this.filters.category === 'all' ? 'selected' : ''}>${this.t('inventory.allCategories')}</option>
                ${this.categories.map(c => `<option value="${c}" ${this.filters.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
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
    if (this.paginatedProducts.length === 0) {
      return `
        <div class="table-container">
          <div class="table-empty" style="padding: var(--space-12);">
            <svg class="table-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v16"/><path d="M2 12h20"/></svg>
            <h3 class="table-empty-title">${this.t('inventory.noProducts')}</h3>
            <p class="table-empty-message">${this.t('inventory.noProductsMatch')}</p>
          </div>
        </div>
      `;
    }

    this.bindEvents();
    return `
      <div class="table-container">
        <table class="table" id="inventoryTable">
          <thead>
            <tr>
              <th scope="col" style="width: 80px;">${this.t('inventory.table.image')}</th>
              <th scope="col">${this.t('inventory.table.product')}</th>
              <th scope="col" style="width: 120px;">${this.t('inventory.table.category')}</th>
              <th scope="col" style="width: 100px;" class="text-right">${this.t('inventory.table.totalStock')}</th>
              <th scope="col" style="width: 100px;" class="text-right">${this.t('inventory.table.availableStock')}</th>
              <th scope="col" style="width: 100px;" class="text-right">${this.t('inventory.table.reservedStock')}</th>
              <th scope="col" style="width: 100px;" class="text-right">${this.t('inventory.table.incomingStock')}</th>
              <th scope="col" style="width: 100px;" class="text-right">${this.t('inventory.table.reorder')}</th>
              <th scope="col" style="width: 160px;">${this.t('inventory.table.variantStatus')}</th>
              <th scope="col" style="width: 140px;">${this.t('inventory.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${this.paginatedProducts.map(product => `
              <tr data-id="${product.id}" class="${product.outOfStockVariants > 0 ? 'row-critical' : product.lowStockVariants > 0 ? 'row-warning' : ''}">
                <td>
                  <div class="product-thumb" style="width: 50px; height: 50px; border-radius: var(--radius-sm); background: var(--color-bg-tertiary); display: flex; align-items: center; justify-content: center; color: var(--color-text-tertiary); font-size: var(--text-xl);">
                    ${this.getProductIcon(product.category)}
                  </div>
                </td>
                <td>
                  <div class="cell-primary">${ImperiumUtils.escapeHtml(product.name)}</div>
                  <div class="cell-tertiary">${product.sku}</div>
                </td>
                <td><span class="badge badge-neutral">${product.category}</span></td>
                <td class="text-right cell-primary">${product.totalStock}</td>
                <td class="text-right ${product.totalStock - product.reservedStock <= 10 ? 'text-warning' : ''}">${product.totalStock - product.reservedStock}</td>
                <td class="text-right cell-secondary">${product.reservedStock}</td>
                <td class="text-right cell-info">${product.incomingStock}</td>
                <td class="text-right">${product.reorderPoint} / ${product.reorderQty}</td>
                <td>
                  <div class="variant-status">
                    ${product.outOfStockVariants > 0 ? `<span class="badge badge-danger badge-sm">${product.outOfStockVariants} ${this.t('inventory.statuses.critical')}</span>` : ''}
                    ${product.lowStockVariants > 0 ? `<span class="badge badge-warning badge-sm">${product.lowStockVariants} ${this.t('inventory.statuses.warning')}</span>` : ''}
                    ${product.outOfStockVariants === 0 && product.lowStockVariants === 0 ? `<span class="badge badge-success badge-sm">${product.variants.length} ${this.t('inventory.statuses.ok')}</span>` : ''}
                  </div>
                </td>
                <td>
                  <div class="admin-actions">
                    <button class="btn-action view btn-icon" data-action="view" data-id="${product.id}" aria-label="${this.t('inventory.actions.view')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-action update btn-icon" data-action="restock" data-id="${product.id}" aria-label="${this.t('inventory.actions.restock')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button class="btn-action update btn-icon" data-action="edit-reorder" data-id="${product.id}" aria-label="${this.t('inventory.actions.editReorder')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
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

  getProductIcon(category) {
    const icons = {
      majice: '👕',
      trenerke: '🏃',
      dukseri: '🧥',
      ostalo: '📦'
    };
    return icons[category] || '📦';
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
        <div class="table-pagination-info">Stranica ${this.currentPage} od ${totalPages} (${this.totalItems} proizvoda)</div>
        <div class="table-pagination-controls">
          <button class="table-pagination-btn" data-page="first" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prva"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><line x1="18" y1="17" x2="18" y2="7"/></svg></button>
          <button class="table-pagination-btn" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prethodna"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
          <div class="table-pagination-pages">${pages.map(page => page === '...' ? '<span class="table-pagination-page ellipsis" aria-hidden="true">…</span>' : `<button class="table-pagination-page ${page === this.currentPage ? 'active' : ''}" data-page="${page}" ${page === this.currentPage ? 'aria-current="page"' : ''}>${page}</button>`).join('')}</div>
          <button class="table-pagination-btn" data-page="next" ${this.currentPage === totalPages ? 'disabled' : ''} aria-label="Sledeća"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
          <button class="table-pagination-btn" data-page="last" ${this.currentPage === totalPages ? 'disabled' : ''} aria-label="Poslednja"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><line x1="6" y1="17" x2="6" y2="7"/></svg></button>
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

    this.on('change', '[data-filter="stock"]', (e) => {
      this.filters.stock = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="category"]', (e) => {
      this.filters.category = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-action="clear-filters"]', () => {
      this.filters = { stock: 'all', category: 'all', search: '' };
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

    this.on('click', '[data-action="view"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      this.openVariantDetail(id);
    });

    this.on('click', '[data-action="restock"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      this.openRestockModal(id);
    });

    this.on('click', '[data-action="edit-reorder"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      this.openReorderModal(id);
    });

    this.on('click', '[data-action="export-inventory"]', () => this.exportCSV());
  }

  openVariantDetail(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    const variantsHtml = product.variants.map(v => `
      <tr class="${v.stock === 0 ? 'row-critical' : v.stock <= 5 ? 'row-warning' : ''}">
        <td>${ImperiumUtils.escapeHtml(v.color)}</td>
        <td>${ImperiumUtils.escapeHtml(v.size)}</td>
        <td class="cell-secondary">${ImperiumUtils.escapeHtml(v.sku)}</td>
        <td class="text-right ${v.stock === 0 ? 'text-danger' : v.stock <= 5 ? 'text-warning' : ''}">${v.stock}</td>
        <td class="text-right cell-secondary">0</td>
        <td class="text-right cell-info">${product.incomingStock > 0 ? Math.ceil(product.incomingStock / product.variants.length) : 0}</td>
      </tr>
    `).join('');

    this.admin.openModal({
      title: `${product.name} - Detalji zaliha`,
      size: 'lg',
      content: `
        <div class="detail-full">
          <div class="detail-row"><span class="detail-label">Proizvod</span><span class="detail-value">${ImperiumUtils.escapeHtml(product.name)} (${product.sku})</span></div>
          <div class="detail-row"><span class="detail-label">Kategorija</span><span class="detail-value">${product.category}</span></div>
          <div class="detail-row"><span class="detail-label">Dobavljač</span><span class="detail-value">${product.supplier}</span></div>
          <div class="detail-row"><span class="detail-label">Poslednje dopunjene</span><span class="detail-value">${ImperiumUtils.formatDateTime(product.lastRestocked)}</span></div>
        </div>
        <div class="table-container" style="margin-top: var(--space-5);">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Boja</th>
                <th scope="col">Veličina</th>
                <th scope="col">SKU</th>
                <th scope="col" class="text-right">Na stanju</th>
                <th scope="col" class="text-right">Rezervisano</th>
                <th scope="col" class="text-right">U putu</th>
              </tr>
            </thead>
            <tbody>${variantsHtml}</tbody>
          </table>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">Zatvori</button>
        <button class="btn btn-primary" data-action="restock" data-id="${product.id}">Dodaj zalihe</button>
      `
    });
  }

  openRestockModal(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    this.admin.openModal({
      title: `Dodaj zalihe: ${product.name}`,
      content: `
        <div class="form-group">
          <label class="input-label">Količina za dodavanje *</label>
          <input type="number" class="input-field" id="restockQty" min="1" value="${product.reorderQty}" required>
        </div>
        <div class="form-group">
          <label class="input-label">Napomena</label>
          <textarea class="input-field textarea-field" id="restockNote" rows="2" placeholder="Broj fakture, napomena dobavljaču..."></textarea>
        </div>
        <div class="form-group">
          <label class="checkbox-wrapper">
            <input type="checkbox" class="checkbox-input" id="createPO" checked>
            <span class="checkbox-box"></span>
            <span class="checkbox-text">Kreiraj narudžbenicu dobavljaču</span>
          </label>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">Otkaži</button>
        <button class="btn btn-primary" data-action="confirm-restock" data-id="${product.id}">Dodaj zalihe</button>
      `
    });
  }

  openReorderModal(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    this.admin.openModal({
      title: `Podesi reorder: ${product.name}`,
      content: `
        <div class="form-row">
          <div class="form-group">
            <label class="input-label">Reorder Point (kada naručiti) *</label>
            <input type="number" class="input-field" id="reorderPoint" value="${product.reorderPoint}" min="0" required>
          </div>
          <div class="form-group">
            <label class="input-label">Reorder Quantity (koliko naručiti) *</label>
            <input type="number" class="input-field" id="reorderQty" value="${product.reorderQty}" min="1" required>
          </div>
        </div>
        <div class="form-group">
          <label class="input-label">Dobavljač</label>
          <input type="text" class="input-field" id="supplier" value="${product.supplier}" placeholder="Naziv dobavljača">
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">Otkaži</button>
        <button class="btn btn-primary" data-action="save-reorder" data-id="${product.id}">Sačuvaj</button>
      `
    });
  }

  exportCSV() {
    const headers = ['SKU', 'Proizvod', 'Kategorija', 'Ukupno zalihe', 'Dostupno', 'Rezervisano', 'U putu', 'Niske varijante', 'Rasprodato varijante', 'Reorder Point', 'Reorder Qty', 'Dobavljač'];
    const rows = this.filteredProducts.map(p => [
      p.sku, p.name, p.category, p.totalStock, p.totalStock - p.reservedStock, p.reservedStock, p.incomingStock,
      p.lowStockVariants, p.outOfStockVariants, p.reorderPoint, p.reorderQty, p.supplier
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    ImperiumUtils.downloadFile(csv, `inventar-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    this.admin.success('CSV izveštaj inventara preuzet');
  }
}