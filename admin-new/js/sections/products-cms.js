import { Component, defineComponent } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class ProductsCMSSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.products = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalProducts = 0;
    this.filters = { search: '', collection: '', gender: '', category: '', status: '' };
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
  }

  async onMount() {
    await this.loadProducts();
    this.bindEvents();
  }

  async loadProducts() {
    this.showSkeleton();
    try {
      // TODO: Replace with actual API call
      // const response = await this.admin.api.get('/api/admin/products', { params: this.getQueryParams() });
      // this.products = response.data.products;
      // this.totalProducts = response.data.total;

      // Mock data for demonstration
      this.products = this.getMockProducts();
      this.totalProducts = this.products.length;
      this.render();
    } catch (error) {
      console.error('Failed to load products:', error);
      this.showError('Greška pri učitavanju proizvoda');
    }
  }

  getMockProducts() {
    return [
      { id: 1, name: 'Osnovna Majica', sku: 'MAJ-001', collection: 'casual', gender: 'men', category: 't-shirts', price: 1290, status: 'active', stock: 150 },
      { id: 2, name: 'Dugorukava Majica', sku: 'MAJ-002', collection: 'casual', gender: 'men', category: 't-shirts', price: 1590, status: 'active', stock: 80 },
      { id: 3, name: 'Muška Sportska Trenerka', sku: 'TRE-001', collection: 'casual', gender: 'men', category: 'tracksuits', price: 3490, status: 'active', stock: 45 },
      { id: 4, name: 'Ženska Kapuljača Trenerka', sku: 'TRE-002', collection: 'casual', gender: 'women', category: 'tracksuits', price: 3890, status: 'active', stock: 60 },
      { id: 5, name: 'Muški Duks (Hoodie)', sku: 'DUK-001', collection: 'casual', gender: 'men', category: 'hoodies', price: 4290, status: 'active', stock: 30 },
      { id: 6, name: 'Ženski Duks (Hoodie)', sku: 'DUK-002', collection: 'casual', gender: 'women', category: 'hoodies', price: 3990, status: 'draft', stock: 25 },
      { id: 7, name: 'Čarape Unisex (set 3 para)', sku: 'ACC-001', collection: 'casual', gender: 'unisex', category: 'essentials', price: 490, status: 'active', stock: 200 },
      { id: 8, name: 'Šalica za Kafu DALLI', sku: 'MER-001', collection: 'casual', gender: 'unisex', category: 'accessories', price: 890, status: 'active', stock: 100 }
    ];
  }

  getQueryParams() {
    return {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.filters.search,
      collection: this.filters.collection,
      gender: this.filters.gender,
      category: this.filters.category,
      status: this.filters.status,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };
  }

  bindEvents() {
    // Search
    this.delegate('input', '#cmsSearch', ImperiumUtils.debounce((e) => {
      this.filters.search = e.target.value;
      this.currentPage = 1;
      this.loadProducts();
    }, 300));

    // Collection filter
    this.delegate('change', '#cmsCollectionFilter', (e) => {
      this.filters.collection = e.target.value;
      this.currentPage = 1;
      this.loadProducts();
    });

    // Gender filter
    this.delegate('change', '#cmsGenderFilter', (e) => {
      this.filters.gender = e.target.value;
      this.currentPage = 1;
      this.loadProducts();
    });

    // Category filter
    this.delegate('change', '#cmsCategoryFilter', (e) => {
      this.filters.category = e.target.value;
      this.currentPage = 1;
      this.loadProducts();
    });

    // Status filter
    this.delegate('change', '#cmsStatusFilter', (e) => {
      this.filters.status = e.target.value;
      this.currentPage = 1;
      this.loadProducts();
    });

    // Sort
    this.delegate('click', '[data-sort]', (e) => {
      const sortBy = e.target.closest('[data-sort]').dataset.sort;
      if (this.sortBy === sortBy) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortBy = sortBy;
        this.sortOrder = 'asc';
      }
      this.loadProducts();
    });

    // Pagination
    this.delegate('click', '[data-page]', (e) => {
      this.currentPage = parseInt(e.target.closest('[data-page]').dataset.page);
      this.loadProducts();
    });

    // Add product
    this.delegate('click', '#addProductBtn', () => this.admin.openCreateProductModal());

    // Edit product
    this.delegate('click', '[data-action="edit"]', (e) => {
      const id = parseInt(e.target.closest('[data-action="edit"]').dataset.id);
      const product = this.products.find(p => p.id === id);
      if (product) this.admin.openCreateProductModal(product);
    });

    // Delete product
    this.delegate('click', '[data-action="delete"]', async (e) => {
      const id = parseInt(e.target.closest('[data-action="delete"]').dataset.id);
      if (await this.confirm('Da li ste sigurni da želite da obrišete ovaj proizvod?')) {
        await this.deleteProduct(id);
      }
    });

    // Toggle status
    this.delegate('click', '[data-action="toggle-status"]', async (e) => {
      const btn = e.target.closest('[data-action="toggle-status"]');
      const id = parseInt(btn.dataset.id);
      const newStatus = btn.dataset.status === 'active' ? 'draft' : 'active';
      await this.toggleProductStatus(id, newStatus);
    });
  }

  async deleteProduct(id) {
    try {
      // await this.admin.api.delete(`/api/admin/products/${id}`);
      this.products = this.products.filter(p => p.id !== id);
      this.totalProducts--;
      this.render();
      this.admin.toastContainer.success('Proizvod obrisan');
    } catch (error) {
      this.admin.toastContainer.error('Greška pri brisanju');
    }
  }

  async toggleProductStatus(id, status) {
    try {
      // await this.admin.api.patch(`/api/admin/products/${id}`, { status });
      const product = this.products.find(p => p.id === id);
      if (product) product.status = status;
      this.render();
      this.admin.toastContainer.success(`Status promenjen na ${status === 'active' ? 'aktivan' : 'načrt'}`);
    } catch (error) {
      this.admin.toastContainer.error('Greška pri promeni statusa');
    }
  }

  render() {
    const statusBadge = (status) => `
      <span class="badge badge-${status === 'active' ? 'success' : 'secondary'}">
        ${status === 'active' ? 'Aktivan' : 'Načrt'}
      </span>
    `;

    const rows = this.products.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>
          <strong>${ImperiumUtils.escapeHtml(p.name)}</strong>
          <br><small class="text-tertiary">SKU: ${p.sku}</small>
        </td>
        <td>${p.collection || 'casual'}</td>
        <td>${Array.isArray(p.gender) ? p.gender.join(', ') : (p.gender || 'men')}</td>
        <td>${ImperiumUtils.escapeHtml(p.category)}</td>
        <td>${ImperiumUtils.format.currency(p.price)}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${p.stock} kom</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-ghost btn-sm btn-icon" data-action="edit" data-id="${p.id}" aria-label="Izmeni">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon ${p.status === 'active' ? 'text-warning' : 'text-success'}" data-action="toggle-status" data-id="${p.id}" data-status="${p.status}" aria-label="${p.status === 'active' ? 'Sačuvaj kao načrt' : 'Objavi'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${p.status === 'active' ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
              </svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon text-error" data-action="delete" data-id="${p.id}" aria-label="Obriši">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    const totalPages = Math.ceil(this.totalProducts / this.pageSize);
    const pagination = totalPages > 1 ? `
      <nav class="pagination" aria-label="Stranice">
        <button class="btn btn-ghost btn-sm" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prethodna">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="pagination-info">Strana ${this.currentPage} od ${totalPages}</span>
        <button class="btn btn-ghost btn-sm" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''} aria-label="Sledeća">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </nav>
    ` : '';

    this.element.innerHTML = `
      <div class="section-header">
        <div class="section-header-main">
          <h2>Proizvodi CMS</h2>
          <p>Upravljajte svim proizvodima u CMS-u</p>
        </div>
        <div class="section-actions">
          <button class="btn btn-primary" id="addProductBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Dodaj proizvod
          </button>
        </div>
      </div>

      <div class="filters-bar">
        <div class="filter-group">
          <input type="search" id="cmsSearch" placeholder="Pretraži po nazivu, SKU..." class="search-input" aria-label="Pretraži proizvode">
        </div>
        <div class="filter-group">
          <select id="cmsCollectionFilter" class="select-field" aria-label="Filtruj po kolekciji">
            <option value="">Sve kolekcije</option>
            <option value="casual">CASUAL</option>
            <option value="elegance">ELEGANCE</option>
          </select>
        </div>
        <div class="filter-group">
          <select id="cmsGenderFilter" class="select-field" aria-label="Filtruj po polu">
            <option value="">Svi polovi</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>
        <div class="filter-group">
          <select id="cmsCategoryFilter" class="select-field" aria-label="Filtruj po kategoriji">
            <option value="">Sve kategorije</option>
            <option value="t-shirts">T-Shirts</option>
            <option value="hoodies">Hoodies</option>
            <option value="tracksuits">Tracksuits</option>
            <option value="shorts">Shorts</option>
            <option value="jackets">Jackets</option>
            <option value="essentials">Essentials</option>
            <option value="leggings">Leggings</option>
            <option value="matching-sets">Matching Sets</option>
            <option value="shirts">Shirts</option>
            <option value="blazers">Blazers</option>
            <option value="suits">Suits</option>
            <option value="trousers">Trousers</option>
            <option value="coats">Coats</option>
            <option value="dresses">Dresses</option>
            <option value="elegant-trousers">Elegant Trousers</option>
            <option value="accessories">Accessories</option>
          </select>
        </div>
        <div class="filter-group">
          <select id="cmsStatusFilter" class="select-field" aria-label="Filtruj po statusu">
            <option value="">Svi statusi</option>
            <option value="active">Aktivni</option>
            <option value="draft">Načrti</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table" role="grid">
          <thead>
            <tr>
              <th scope="col" data-sort="id">ID <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16l-4-4 4-4"/><path d="M17 8l4 4-4 4"/></svg></th>
              <th scope="col" data-sort="name">Naziv <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16l-4-4 4-4"/><path d="M17 8l4 4-4 4"/></svg></th>
              <th scope="col" data-sort="collection">Kolekcija</th>
              <th scope="col" data-sort="gender">Pol</th>
              <th scope="col" data-sort="category">Kategorija</th>
              <th scope="col" data-sort="price">Cena</th>
              <th scope="col">Status</th>
              <th scope="col">Zalihe</th>
              <th scope="col">Akcije</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" class="text-center">Nema proizvoda</td></tr>'}
          </tbody>
        </table>
      </div>

      ${pagination}
    `;
  }

  showSkeleton() {
    this.element.innerHTML = `
      <div class="products-cms-skeleton" aria-hidden="true">
        <div class="products-grid-skeleton"></div>
      </div>
    `;
  }

  showError(message) {
    this.element.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <h3 class="empty-state-title">Greška</h3>
        <p class="empty-state-message">${message}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Pokušaj ponovo</button>
      </div>
    `;
  }
}

defineComponent('products-cms-section', ProductsCMSSection);
export default ProductsCMSSection;