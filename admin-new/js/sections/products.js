import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { Table, Pagination, Button, Modal, Input, Select, Textarea, Dropdown, ToastContainer } from '../components/index.js';
import { SectionAPI } from '../services/integration.js';

export class ProductsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.products;
    this.products = [];
    this.filteredProducts = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalItems = 0;
    this.filters = {
      status: 'all',
      category: 'all',
      search: '',
      stock: 'all',
      collection: 'all',
      styleOccasion: 'all',
      gender: 'all'
    };
    this.categories = ['t-shirts', 'hoodies', 'tracksuits', 'shorts', 'jackets', 'essentials', 'leggings', 'matching-sets', 'shirts', 'blazers', 'suits', 'trousers', 'coats', 'dresses', 'accessories'];
    this.collections = ['casual', 'elegance'];
    this.genders = ['men', 'women', 'unisex'];
    this.styleOccasions = ['everyday', 'business', 'formal', 'evening', 'travel', 'sport', 'smart-casual', 'luxury-essentials', 'special-occasion'];
  }

  async onEnter() {
    await this.loadProducts();
    this.render();
  }

  async loadProducts() {
    try {
      this.products = await this.api.list(this.getFilterParams());
    } catch (error) {
      console.warn('[Products] API failed, falling back to mock data:', error);
      this.products = this.generateMockProducts();
    }
    this.applyFilters();
  }

  getFilterParams() {
    const params = { page: this.currentPage, limit: this.pageSize };
    if (this.filters.status !== 'all') params.status = this.filters.status;
    if (this.filters.category !== 'all') params.category = this.filters.category;
    if (this.filters.search) params.search = this.filters.search;
    if (this.filters.stock !== 'all') params.stock = this.filters.stock;
    return params;
  }

  generateMockProducts() {
    const baseProducts = [
      { id: 1, name: 'Osnovna Majica', collection: 'casual', category: 't-shirts', gender: 'unisex', basePrice: 1290, colors: ['Bela', 'Crna', 'Navy', 'Siva'], sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], material: '100% organski pamuk, 180g/m²', images: 3, styleOccasion: ['everyday', 'luxury-essentials', 'travel', 'smart-casual'] },
      { id: 2, name: 'Dugorukava Majica', collection: 'casual', category: 't-shirts', gender: 'unisex', basePrice: 1590, colors: ['Bela', 'Crna', 'Bordeaux', 'Olive'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: '100% organski pamuk, 200g/m²', images: 3, styleOccasion: ['everyday', 'travel', 'luxury-essentials'] },
      { id: 3, name: 'Muška Sportska Trenerka', collection: 'casual', category: 'tracksuits', gender: 'men', basePrice: 3490, colors: ['Crna', 'Navy', 'Graphite'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: '80% pamuk / 20% poliester, 300g/m²', images: 4, styleOccasion: ['sport', 'everyday', 'travel'] },
      { id: 4, name: 'Ženska Kapuljača Trenerka', collection: 'casual', category: 'tracksuits', gender: 'women', basePrice: 3890, colors: ['Roza', 'Bela', 'Crna', 'Bež'], sizes: ['XS', 'S', 'M', 'L', 'XL'], material: '70% pamuk / 30% poliester, 280g/m²', images: 4, styleOccasion: ['sport', 'everyday', 'travel', 'smart-casual'] },
      { id: 5, name: 'Muški Duks (Hoodie)', collection: 'casual', category: 'hoodies', gender: 'men', basePrice: 4290, colors: ['Crna', 'Navy', 'Siva', 'Olive'], sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'], material: '100% pamuk, 350g/m²', images: 5, styleOccasion: ['everyday', 'travel', 'smart-casual'] },
      { id: 6, name: 'Ženski Duks (Hoodie)', collection: 'casual', category: 'hoodies', gender: 'women', basePrice: 3990, colors: ['Bela', 'Roza', 'Crna', 'Lavanda'], sizes: ['XS', 'S', 'M', 'L', 'XL'], material: '100% pamuk, 320g/m²', images: 4, styleOccasion: ['everyday', 'travel', 'smart-casual', 'evening'] },
      { id: 7, name: 'Čarape Unisex (set 3 para)', collection: 'casual', category: 'accessories', gender: 'unisex', basePrice: 490, colors: ['Crne', 'Bele', 'Miks'], sizes: ['36-40', '41-45'], material: '80% pamuk / 17% poliester / 3% elastan', images: 2, styleOccasion: ['everyday', 'sport', 'travel', 'luxury-essentials'] },
      { id: 8, name: 'Šalica za Kafu DALLI', collection: 'casual', category: 'accessories', gender: 'unisex', basePrice: 890, colors: ['Crna', 'Bela'], sizes: ['Standard 330ml'], material: 'Keramika, visoka kvaliteta', images: 2, styleOccasion: ['everyday', 'luxury-essentials'] }
    ];

    const statuses = ['aktivan', 'skriven', 'rasprodato'];

    return baseProducts.map((p, i) => {
      const variants = p.colors.flatMap(color => 
        p.sizes.map(size => ({
          color,
          size,
          sku: `ML-${String(p.id).padStart(3, '0')}-${color.substring(0,3).toUpperCase()}-${size}`,
          stock: Math.floor(Math.random() * 50),
          price: p.basePrice + (color === 'Crna' || color === 'Navy' ? 100 : 0)
        }))
      );

      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
      let status = statuses[Math.floor(Math.random() * statuses.length)];
      if (totalStock === 0) status = 'rasprodato';

      return {
        ...p,
        sku: `ML-${String(p.id).padStart(3, '0')}`,
        variants,
        totalStock,
        status,
        description: `Kvalitetan ${p.name.toLowerCase()} od ${p.material}. Dizajniran za maksimalan udobnost i stil.`,
        shortDescription: `Premium ${p.name.toLowerCase()} za svakodnevno nošenje.`,
        tags: ['premium', 'organsko', p.category],
        seo: {
          title: `${p.name} | DALLI - Premium Moda`,
          description: `Kupite ${p.name.toLowerCase()} po najpovoljnijoj ceni. ${p.shortDescription} Brza dostava.`
        },
        createdAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  }

  applyFilters() {
    let filtered = [...this.products];

    if (this.filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === this.filters.status);
    }

    if (this.filters.collection !== 'all') {
      filtered = filtered.filter(p => p.collection === this.filters.collection);
    }

    if (this.filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === this.filters.category);
    }

    if (this.filters.gender !== 'all') {
      filtered = filtered.filter(p => p.gender === this.filters.gender);
    }

    if (this.filters.styleOccasion !== 'all') {
      filtered = filtered.filter(p => p.styleOccasion?.includes(this.filters.styleOccasion));
    }

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        p.category.includes(search) ||
        p.collection?.includes(search)
      );
    }

    if (this.filters.stock !== 'all') {
      if (this.filters.stock === 'low') {
        filtered = filtered.filter(p => p.totalStock > 0 && p.totalStock <= 10);
      } else if (this.filters.stock === 'out') {
        filtered = filtered.filter(p => p.totalStock === 0);
      } else if (this.filters.stock === 'ok') {
        filtered = filtered.filter(p => p.totalStock > 10);
      }
    }

    this.filteredProducts = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  get paginatedProducts() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  render() {
    const filtersHtml = this.renderFilters();
    const tableHtml = this.renderTable();
    const paginationHtml = this.totalItems > this.pageSize ? this.renderPagination() : '';

    this.bindEvents();
    return `
      <div class="products-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Proizvodi</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Upravljajte katalogom proizvoda, varijantama i inventarom.</p>
          </div>
          <button class="btn btn-primary" data-action="create-product">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novi proizvod
          </button>
        </div>
        ${filtersHtml}
        ${tableHtml}
        ${paginationHtml}
      </div>
    `;

  }

  renderFilters() {
    this.bindEvents();
    return `
      <div class="card" style="margin-bottom: var(--space-5);">
        <div class="card-body" style="padding: var(--space-4) var(--space-5);">
          <div class="form-row" style="align-items: flex-end; gap: var(--space-4); flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label class="input-label">Pretraga</label>
              <input type="text" class="input-field" placeholder="Naziv, SKU, kategorija..." 
                value="${ImperiumUtils.escapeHtml(this.filters.search)}" data-filter="search">
            </div>
            <div class="form-group" style="min-width: 160px;">
              <label class="input-label">Kolekcija</label>
              <select class="input-field select-field" data-filter="collection">
                <option value="all" ${this.filters.collection === 'all' ? 'selected' : ''}>Sve kolekcije</option>
                ${this.collections.map(c => `<option value="${c}" ${this.filters.collection === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 160px;">
              <label class="input-label">Kategorija</label>
              <select class="input-field select-field" data-filter="category">
                <option value="all" ${this.filters.category === 'all' ? 'selected' : ''}>Sve kategorije</option>
                ${this.categories.map(c => `<option value="${c}" ${this.filters.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, ' ')}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 160px;">
              <label class="input-label">Stil/Prilika</label>
              <select class="input-field select-field" data-filter="styleOccasion">
                <option value="all" ${this.filters.styleOccasion === 'all' ? 'selected' : ''}>Svi stilovi</option>
                ${this.styleOccasions.map(s => `<option value="${s}" ${this.filters.styleOccasion === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 160px;">
              <label class="input-label">Pol</label>
              <select class="input-field select-field" data-filter="gender">
                <option value="all" ${this.filters.gender === 'all' ? 'selected' : ''}>Svi</option>
                ${this.genders.map(g => `<option value="${g}" ${this.filters.gender === g ? 'selected' : ''}>${g.charAt(0).toUpperCase() + g.slice(1)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 160px;">
              <label class="input-label">Status</label>
              <select class="input-field select-field" data-filter="status">
                <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>Svi statusi</option>
                <option value="aktivan" ${this.filters.status === 'aktivan' ? 'selected' : ''}>Aktivni</option>
                <option value="skriven" ${this.filters.status === 'skriven' ? 'selected' : ''}>Skriveni</option>
                <option value="rasprodato" ${this.filters.status === 'rasprodato' ? 'selected' : ''}>Rasprodati</option>
              </select>
            </div>
            <div class="form-group" style="min-width: 160px;">
              <label class="input-label">Zalihe</label>
              <select class="input-field select-field" data-filter="stock">
                <option value="all" ${this.filters.stock === 'all' ? 'selected' : ''}>Sve</option>
                <option value="ok" ${this.filters.stock === 'ok' ? 'selected' : ''}>OK (>10)</option>
                <option value="low" ${this.filters.stock === 'low' ? 'selected' : ''}>Niske (1-10)</option>
                <option value="out" ${this.filters.stock === 'out' ? 'selected' : ''}>Nema na stanju</option>
              </select>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" data-action="clear-filters">Očisti</button>
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
            <svg class="table-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20.5 17A5 5 0 0 0 18 7h-1.58a5 5 0 0 0-7.16 1.5"/><path d="M4 15.5s2 2 4 2 4-2 4-2-2-2-4-2"/><path d="M14 13h10"/><path d="M14 17h6"/>
            </svg>
            <h3 class="table-empty-title">Nema proizvoda</h3>
            <p class="table-empty-message">${this.filters.search || this.filters.status !== 'all' ? 'Nema proizvoda koji odgovaraju filterima.' : 'Katalog je prazan. Dodajte prvi proizvod.'}</p>
          </div>
        </div>
      `;
    }

    this.bindEvents();
    return `
      <div class="table-container">
        <table class="table" id="productsTable">
          <thead>
            <tr>
              <th scope="col" style="width: 80px;">Slika</th>
              <th scope="col" data-sort="name">Proizvod</th>
              <th scope="col" style="width: 120px;" data-sort="category">Kategorija</th>
              <th scope="col" style="width: 100px;" data-sort="totalStock">Zalihe</th>
              <th scope="col" style="width: 120px;" data-sort="basePrice">Cena</th>
              <th scope="col" style="width: 100px;" data-sort="product360">360°</th>
              <th scope="col" style="width: 130px;" data-sort="status">Status</th>
              <th scope="col" style="width: 160px;">Akcije</th>
            </tr>
          <tbody>
            ${this.paginatedProducts.map(product => `
              <tr data-id="${product.id}">
                <td>
                  <div class="product-thumb" style="width: 50px; height: 50px; border-radius: var(--radius-sm); background: var(--color-bg-tertiary); display: flex; align-items: center; justify-content: center; color: var(--color-text-tertiary); font-size: var(--text-xl);">
                    ${this.getProductIcon(product.category)}
                  </div>
                </td>
                <td>
                  <div class="cell-primary">${ImperiumUtils.escapeHtml(product.name)}</div>
                  <div class="cell-tertiary">${ImperiumUtils.escapeHtml(product.sku)}</div>
                </td>
                <td><span class="badge badge-neutral">${product.category}</span></td>
                <td>
                  <span class="${this.getStockClass(product.totalStock)}">${product.totalStock}</span>
                  ${product.totalStock > 0 && product.totalStock <= 10 ? '<span class="badge badge-warning badge-sm" style="margin-left: var(--space-1);">Nisko</span>' : ''}
                  ${product.totalStock === 0 ? '<span class="badge badge-danger badge-sm" style="margin-left: var(--space-1);">Nema</span>' : ''}
                </td>
                <td class="cell-primary">${ImperiumUtils.formatCurrency(product.basePrice)}</td>
                <td>${product.product360?.enabled && product.product360?.images?.length >= 24 ? '<span class="badge badge-info">360°</span>' : '<span class="badge badge-neutral">—</span>'}</td>
                <td>${this.renderStatusBadge(product.status)}</td>
                <td>
                  <div class="admin-actions">
                    <button class="btn-action view btn-icon" data-action="view" data-id="${product.id}" aria-label="Pogledaj">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-action update btn-icon" data-action="edit" data-id="${product.id}" aria-label="Izmeni">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-action update btn-icon" data-action="duplicate" data-id="${product.id}" aria-label="Dupliciraj">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="btn-action ${product.status === 'aktivan' ? 'update' : 'view'} btn-icon" data-action="toggle-status" data-id="${product.id}" aria-label="${product.status === 'aktivan' ? 'Skrij' : 'Aktiviraj'}">
                      ${product.status === 'aktivan' 
                        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-5.52 0-10-4.48-10-10S6.48 2 12 2c5.52 0 10 4.48 10 10 0 1.63-.37 3.16-.99 4.58"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
                        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
                      }
                    </button>
                    <button class="btn-action delete btn-icon" data-action="delete" data-id="${product.id}" aria-label="Obriši">
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

  getProductIcon(category) {
    const icons = {
      majice: '👕',
      trenerke: '🏃',
      dukseri: '🧥',
      ostalo: '📦'
    };
    return icons[category] || '📦';
  }

  getStockClass(stock) {
    if (stock === 0) return 'text-danger';
    if (stock <= 10) return 'text-warning';
    return '';
  }

  renderStatusBadge(status) {
    const badges = {
      aktivan: '<span class="badge badge-success">Aktivan</span>',
      skriven: '<span class="badge badge-warning">Skriven</span>',
      rasprodato: '<span class="badge badge-danger">Rasprodato</span>'
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

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    this.bindEvents();
    return `
      <div class="table-pagination">
        <div class="table-pagination-info">
          Stranica ${this.currentPage} od ${totalPages} (${this.totalItems} proizvoda)
        </div>
        <div class="table-pagination-controls">
          <button class="table-pagination-btn" data-page="first" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prva">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><line x1="18" y1="17" x2="18" y2="7"/></svg>
          </button>
          <button class="table-pagination-btn" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prethodna">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="table-pagination-pages">
            ${pages.map(page => page === '...' 
              ? '<span class="table-pagination-page ellipsis" aria-hidden="true">…</span>'
              : `<button class="table-pagination-page ${page === this.currentPage ? 'active' : ''}" data-page="${page}" ${page === this.currentPage ? 'aria-current="page"' : ''}>${page}</button>`
            ).join('')}
          </div>
          <button class="table-pagination-btn" data-page="next" ${this.currentPage === totalPages ? 'disabled' : ''} aria-label="Sledeća">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="table-pagination-btn" data-page="last" ${this.currentPage === totalPages ? 'disabled' : ''} aria-label="Poslednja">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><line x1="6" y1="17" x2="6" y2="7"/></svg>
          </button>
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

    this.on('change', '[data-filter="collection"]', (e) => {
      this.filters.collection = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="category"]', (e) => {
      this.filters.category = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="gender"]', (e) => {
      this.filters.gender = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="styleOccasion"]', (e) => {
      this.filters.styleOccasion = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="stock"]', (e) => {
      this.filters.stock = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-action="clear-filters"]', () => {
      this.filters = { status: 'all', category: 'all', search: '', stock: 'all', collection: 'all', styleOccasion: 'all', gender: 'all' };
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-sort]', (e) => {
      const column = e.delegateTarget.dataset.sort;
      // Simple sort implementation
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

    this.on('click', '[data-action="create-product"]', () => this.openCreateModal());

    this.on('click', '[data-action="view"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      this.openViewModal(id);
    });

    this.on('click', '[data-action="edit"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      this.openEditModal(id);
    });

    this.on('click', '[data-action="duplicate"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      this.duplicateProduct(id);
    });

    this.on('click', '[data-action="toggle-status"]', (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      this.toggleStatus(id);
    });

    this.on('click', '[data-action="delete"]', async (e) => {
      const id = parseInt(e.delegateTarget.dataset.id);
      const product = this.products.find(p => p.id === id);
      if (!product) return;
      const confirmed = await this.confirm(`Obrišati proizvod "${product.name}"? Ova akcija je nepovratna.`, {
        title: 'Brisanje proizvoda',
        variant: 'danger'
      });
      if (confirmed) {
        this.products = this.products.filter(p => p.id !== id);
        this.applyFilters();
        this.render();
        this.admin.success('Proizvod obrisan');
      }
    });
  }

  openCreateModal() {
    this.openProductModal('create');
  }

  openEditModal(id) {
    this.openProductModal('edit', id);
  }

  openViewModal(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    const variantsHtml = product.variants.map(v => `
      <div class="detail-row">
        <span class="detail-label">${v.color} / ${v.size}</span>
        <span class="detail-value">SKU: ${v.sku} | Zalihe: ${v.stock} | Cena: ${ImperiumUtils.formatCurrency(v.price)}</span>
      </div>
    `).join('');

    this.admin.openModal({
      title: product.name,
      size: 'lg',
      content: `
        <div class="detail-full">
          <div class="detail-row"><span class="detail-label">SKU</span><span class="detail-value">${product.sku}</span></div>
          <div class="detail-row"><span class="detail-label">Kolekcija</span><span class="detail-value">${product.collection?.charAt(0).toUpperCase() + product.collection?.slice(1) || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Kategorija</span><span class="detail-value">${product.category?.charAt(0).toUpperCase() + product.category?.slice(1).replace(/-/g, ' ') || '—'} ${product.subcategory ? ' > ' + product.subcategory : ''}</span></div>
          <div class="detail-row"><span class="detail-label">Pol</span><span class="detail-value">${product.gender?.charAt(0).toUpperCase() + product.gender?.slice(1) || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Stil/Prilika</span><span class="detail-value">${product.styleOccasion?.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')).join(', ') || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Osnovna cena</span><span class="detail-value">${ImperiumUtils.formatCurrency(product.basePrice)}</span></div>
          <div class="detail-row"><span class="detail-label">Ukupne zalihe</span><span class="detail-value">${product.totalStock}</span></div>
          <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${this.renderStatusBadge(product.status)}</span></div>
          <div class="detail-row"><span class="detail-label">Materijal</span><span class="detail-value">${product.material}</span></div>
          <div class="detail-row"><span class="detail-label">Kratak opis</span><span class="detail-value">${product.shortDescription}</span></div>
          <div class="detail-row"><span class="detail-label">Detaljan opis</span><span class="detail-value"><div class="detail-message">${product.description}</div></span></div>
          <div class="detail-row"><span class="detail-label">Variantе (${product.variants.length})</span><span class="detail-value">${variantsHtml}</span></div>
          <div class="detail-row"><span class="detail-label">Kreiran</span><span class="detail-value">${ImperiumUtils.formatDateTime(product.createdAt)}</span></div>
          <div class="detail-row"><span class="detail-label">Ažuriran</span><span class="detail-value">${ImperiumUtils.formatDateTime(product.updatedAt)}</span></div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">Zatvori</button>
        <button class="btn btn-primary" data-action="edit" data-id="${product.id}">Izmeni</button>
      `
    });
  }

  openProductModal(mode, id = null) {
    const product = id ? this.products.find(p => p.id === id) : null;
    const isEdit = mode === 'edit';

    this.admin.openModal({
      title: isEdit ? `Izmeni: ${product.name}` : 'Novi proizvod',
      size: 'xl',
      content: `
        <form id="productForm" class="product-form">
          <div class="form-section">
            <h3 class="form-section-title">Osnovni podaci</h3>
            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label class="input-label">Naziv *</label>
                <input type="text" class="input-field" name="name" value="${product ? ImperiumUtils.escapeHtml(product.name) : ''}" required placeholder="Naziv proizvoda">
              </div>
              <div class="form-group" style="min-width: 200px;">
                <label class="input-label">SKU</label>
                <input type="text" class="input-field" name="sku" value="${product ? product.sku : 'ML-' + String(Date.now()).slice(-3)}" placeholder="Auto-generiše se">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" style="min-width: 180px;">
                <label class="input-label">Kolekcija *</label>
                <select class="input-field select-field" name="collection" required>
                  ${this.collections.map(c => `<option value="${c}" ${product && product.collection === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="min-width: 180px;">
                <label class="input-label">Kategorija *</label>
                <select class="input-field select-field" name="category" required>
                  ${this.categories.map(c => `<option value="${c}" ${product && product.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, ' ')}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="min-width: 150px;">
                <label class="input-label">Pol *</label>
                <select class="input-field select-field" name="gender" required>
                  ${this.genders.map(g => `<option value="${g}" ${product && product.gender === g ? 'selected' : ''}>${g.charAt(0).toUpperCase() + g.slice(1)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" style="min-width: 180px;">
                <label class="input-label">Stil/Prilika</label>
                <select class="input-field select-field" name="styleOccasion" multiple>
                  ${this.styleOccasions.map(s => `<option value="${s}" ${product && product.styleOccasion?.includes(s) ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')}</option>`).join('')}
                </select>
                <small style="color: var(--color-text-tertiary);">Držite Ctrl/Cmd za višestruki izbor</small>
              </div>
              <div class="form-group" style="min-width: 150px;">
                <label class="input-label">Pol *</label>
                <select class="input-field select-field" name="gender" required>
                  ${this.genders.map(g => `<option value="${g}" ${product && product.gender === g ? 'selected' : ''}>${g.charAt(0).toUpperCase() + g.slice(1)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" style="min-width: 150px;">
                <label class="input-label">Osnovna cena (RSD) *</label>
                <input type="number" class="input-field" name="basePrice" value="${product ? product.basePrice : ''}" required min="0" step="10">
              </div>
              <div class="form-group" style="min-width: 150px;">
                <label class="input-label">Akcijska cena (RSD)</label>
                <input type="number" class="input-field" name="salePrice" value="${product ? (product.salePrice || '') : ''}" min="0" step="10">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3 class="form-section-title">Opis</h3>
            <div class="form-group">
              <label class="input-label">Kratak opis (za kartice) *</label>
              <textarea class="input-field textarea-field" name="shortDescription" rows="3" required placeholder="Maks 300 karaktera">${product ? product.shortDescription : ''}</textarea>
            </div>
            <div class="form-group">
              <label class="input-label">Detaljan opis *</label>
              <textarea class="input-field textarea-field" name="description" rows="6" required placeholder="Puni opis za stranicu proizvoda">${product ? product.description : ''}</textarea>
            </div>
            <div class="form-group">
              <label class="input-label">Materijal *</label>
              <input type="text" class="input-field" name="material" value="${product ? product.material : ''}" required placeholder="Npr. 100% organski pamuk, 180g/m²">
            </div>
          </div>

          <div class="form-section">
            <h3 class="form-section-title">Variantе (boje i veličine)</h3>
            <div id="variantsContainer">
              ${this.renderVariantsEditor(product ? product.variants : [])}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" data-action="add-variant">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Dodaj variantu
            </button>
          </div>

          <div class="form-section">
            <h3 class="form-section-title">SEO (opciono)</h3>
            <div class="form-group">
              <label class="input-label">Meta Title</label>
              <input type="text" class="input-field" name="seoTitle" value="${product ? (product.seo?.title || '') : ''}" maxlength="60" placeholder="Auto-generiše se">
            </div>
            <div class="form-group">
              <label class="input-label">Meta Description</label>
              <textarea class="input-field textarea-field" name="seoDescription" rows="2" maxlength="160" placeholder="Auto-generiše se">${product ? (product.seo?.description || '') : ''}</textarea>
            </div>
          </div>

          <div class="form-section">
            <h3 class="form-section-title">Status</h3>
            <div class="form-group">
              <label class="input-label">Status *</label>
              <select class="input-field select-field" name="status" required>
                <option value="aktivan" ${product && product.status === 'aktivan' ? 'selected' : ''}>Aktivan</option>
                <option value="skriven" ${product && product.status === 'skriven' ? 'selected' : ''}>Skriven</option>
                <option value="rasprodato" ${product && product.status === 'rasprodato' ? 'selected' : ''}>Rasprodato</option>
              </select>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">Otkaži</button>
        <button class="btn btn-primary" data-action="save-product" ${isEdit ? `data-id="${id}"` : ''}>${isEdit ? 'Sačuvaj izmene' : 'Kreiraj proizvod'}</button>
      `
    });
  }

  renderVariantsEditor(variants) {
    const colors = ['Bela', 'Crna', 'Navy', 'Siva', 'Bordeaux', 'Olive', 'Roza', 'Bež', 'Lavanda', 'Graphite'];
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '36-40', '41-45', 'Standard 330ml', 'One Size'];

    if (variants.length === 0) {
      return `
        <div class="variant-row" data-index="0">
          <div class="form-row" style="gap: var(--space-3);">
            <div class="form-group" style="flex: 1;">
              <label class="input-label">Boja</label>
              <select class="input-field select-field" name="color" required>
                <option value="">Izaberite boju</option>
                ${colors.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 120px;">
              <label class="input-label">Veličina</label>
              <select class="input-field select-field" name="size" required>
                <option value="">Izaberite veličinu</option>
                ${sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">Zalihe</label>
              <input type="number" class="input-field" name="stock" value="0" min="0" required>
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">Cena</label>
              <input type="number" class="input-field" name="price" value="0" min="0" step="10" required>
            </div>
            <button type="button" class="btn btn-ghost btn-sm btn-icon" data-action="remove-variant" aria-label="Ukloni variantu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      `;
    }

    return variants.map((v, i) => `
      <div class="variant-row" data-index="${i}">
        <div class="form-row" style="gap: var(--space-3);">
          <div class="form-group" style="flex: 1;">
            <label class="input-label">Boja</label>
            <select class="input-field select-field" name="color" required>
              <option value="">Izaberite boju</option>
              ${colors.map(c => `<option value="${c}" ${v.color === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="min-width: 120px;">
            <label class="input-label">Veličina</label>
            <select class="input-field select-field" name="size" required>
              <option value="">Izaberite veličinu</option>
              ${sizes.map(s => `<option value="${s}" ${v.size === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="min-width: 150px;">
            <label class="input-label">Zalihe</label>
            <input type="number" class="input-field" name="stock" value="${v.stock}" min="0" required>
          </div>
          <div class="form-group" style="min-width: 150px;">
            <label class="input-label">Cena</label>
            <input type="number" class="input-field" name="price" value="${v.price}" min="0" step="10" required>
          </div>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" data-action="remove-variant" aria-label="Ukloni variantu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  duplicateProduct(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    const newProduct = {
      ...product,
      id: Math.max(...this.products.map(p => p.id)) + 1,
      sku: `ML-${String(Math.max(...this.products.map(p => p.id)) + 1).padStart(3, '0')}`,
      name: product.name + ' (Kopija)',
      status: 'skriven',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.products.unshift(newProduct);
    this.applyFilters();
    this.render();
    this.admin.success(`Proizvod "${product.name}" dupliciran`);
  }

  toggleStatus(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    const statuses = ['aktivan', 'skriven', 'rasprodato'];
    const currentIndex = statuses.indexOf(product.status);
    product.status = statuses[(currentIndex + 1) % statuses.length];
    product.updatedAt = new Date().toISOString();

    this.applyFilters();
    this.render();
    this.admin.success(`Status proizvoda promenjen na ${product.status}`);
  }
}