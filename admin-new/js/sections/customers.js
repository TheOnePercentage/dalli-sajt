import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { Table, Pagination, Button, Modal, Input, Select, Dropdown } from '../components/index.js';
import { SectionAPI } from '../services/integration.js';

export class CustomersSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.customers;
    this.customers = [];
    this.filteredCustomers = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalItems = 0;
    this.filters = {
      segment: 'all',
      search: '',
      status: 'all'
    };
  }

  async onEnter() {
    await this.loadCustomers();
    this.render();
  }

  async loadCustomers() {
    try {
      this.customers = await this.api.list(this.getFilterParams());
    } catch (error) {
      console.warn('[Customers] API failed, falling back to mock data:', error);
      this.customers = this.generateMockCustomers();
    }
    this.applyFilters();
  }

  getFilterParams() {
    const params = { page: this.currentPage, limit: this.pageSize };
    if (this.filters.segment !== 'all') params.segment = this.filters.segment;
    if (this.filters.search) params.search = this.filters.search;
    if (this.filters.status !== 'all') params.status = this.filters.status;
    return params;
  }

  generateMockCustomers() {
    const firstNames = ['Marko', 'Ana', 'Nikola', 'Jelena', 'Stefan', 'Milica', 'Aleksandar', 'Sara', 'Petar', 'Marija', 'Luka', 'Teodora', 'Filip', 'Ivana', 'Nemanja'];
    const lastNames = ['Petrović', 'Jovanović', 'Đorđević', 'Stanković', 'Milošević', 'Radović', 'Vuković', 'Nikolić', 'Stojanović', 'Pavlović', 'Ilić', 'Kovačević', 'Simović', 'Mirić', 'Đukić'];
    const cities = ['Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Zrenjanin', 'Pančevo', 'Čačak', 'Kraljevo', 'Smederevo'];
    const segments = ['vip', 'loyal', 'regular', 'new', 'at_risk', 'lost'];

    return Array.from({ length: 100 }, (_, i) => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`;
      const phone = `+381 6${Math.floor(Math.random() * 9)} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;
      const city = cities[Math.floor(Math.random() * cities.length)];
      const segment = segments[Math.floor(Math.random() * segments.length)];
      const orderCount = Math.floor(Math.random() * 20);
      const totalSpent = orderCount * (Math.floor(Math.random() * 5000) + 2000);
      const lastOrderDate = orderCount > 0 ? new Date(Date.now() - Math.random() * 90 * 86400000) : null;
      const registeredDate = new Date(Date.now() - Math.random() * 730 * 86400000);
      const status = orderCount === 0 ? 'new' : lastOrderDate && (Date.now() - lastOrderDate.getTime()) > 90 * 86400000 ? 'inactive' : 'active';

      return {
        id: `CUST-${String(i + 1).padStart(5, '0')}`,
        firstName,
        lastName,
        email,
        phone,
        city,
        segment,
        orderCount,
        totalSpent,
        avgOrderValue: orderCount > 0 ? totalSpent / orderCount : 0,
        lastOrderDate: lastOrderDate?.toISOString(),
        registeredDate: registeredDate.toISOString(),
        status,
        tags: segment === 'vip' ? ['VIP'] : segment === 'loyal' ? ['Loijalan'] : [],
        notes: Math.random() > 0.8 ? 'Prefers express shipping. Prefers black color.' : ''
      };
    });
  }

  applyFilters() {
    let filtered = [...this.customers];

    if (this.filters.segment !== 'all') {
      filtered = filtered.filter(c => c.segment === this.filters.segment);
    }

    if (this.filters.status !== 'all') {
      filtered = filtered.filter(c => c.status === this.filters.status);
    }

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.id.toLowerCase().includes(search) ||
        c.firstName.toLowerCase().includes(search) ||
        c.lastName.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        c.city.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => new Date(b.registeredDate) - new Date(a.registeredDate));

    this.filteredCustomers = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  get paginatedCustomers() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCustomers.slice(start, start + this.pageSize);
  }

  render() {
    const statsHtml = this.renderStatsCards();
    const filtersHtml = this.renderFilters();
    const tableHtml = this.renderTable();
    const paginationHtml = this.totalItems > this.pageSize ? this.renderPagination() : '';

    this.bindEvents();
    return `
      <div class="customers-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Kupci</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Upravljajte profilima kupaca, segmentacijom i LTV.</p>
          </div>
          <button class="btn btn-primary" data-action="export-customers">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Izvezi CSV
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
    const total = this.customers.length;
    const active = this.customers.filter(c => c.status === 'active').length;
    const vip = this.customers.filter(c => c.segment === 'vip').length;
    const totalRevenue = this.customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgLTV = total > 0 ? totalRevenue / total : 0;

    this.bindEvents();
    return `
      <div class="kpi-grid" style="margin-bottom: var(--space-5);">
        <div class="kpi-card" style="--kpi-color: var(--color-primary);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          </div>
          <div class="kpi-value">${total}</div>
          <div class="kpi-label">Ukupno Kupaca</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-success);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-success), var(--color-success-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg></div>
          </div>
          <div class="kpi-value">${active}</div>
          <div class="kpi-label">Aktivni Kupci</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-accent);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
          </div>
          <div class="kpi-value">${vip}</div>
          <div class="kpi-label">VIP Kupci</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-info);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-info), var(--color-info-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          </div>
          <div class="kpi-value">${ImperiumUtils.formatCurrency(avgLTV)}</div>
          <div class="kpi-label">Prosečan LTV</div>
        </div>
      </div>
    `;
  }

  renderFilters() {
    const segmentOptions = [
      { value: 'all', label: 'Svi segmenti' },
      { value: 'vip', label: 'VIP' },
      { value: 'loyal', label: 'Loijalan' },
      { value: 'regular', label: 'Redovni' },
      { value: 'new', label: 'Novi' },
      { value: 'at_risk', label: 'Rizični' },
      { value: 'lost', label: 'Izgubljeni' }
    ];

    this.bindEvents();
    return `
      <div class="card" style="margin-bottom: var(--space-5);">
        <div class="card-body" style="padding: var(--space-4) var(--space-5);">
          <div class="form-row" style="align-items: flex-end; gap: var(--space-4);">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label class="input-label">Pretraga</label>
              <input type="text" class="input-field" placeholder="Ime, email, telefon, grad, ID..." 
                value="${ImperiumUtils.escapeHtml(this.filters.search)}" data-filter="search">
            </div>
            <div class="form-group" style="min-width: 180px;">
              <label class="input-label">Segment</label>
              <select class="input-field select-field" data-filter="segment">
                ${segmentOptions.map(opt => `<option value="${opt.value}" ${this.filters.segment === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 160px;">
              <label class="input-label">Status</label>
              <select class="input-field select-field" data-filter="status">
                <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>Svi</option>
                <option value="active" ${this.filters.status === 'active' ? 'selected' : ''}>Aktivni</option>
                <option value="inactive" ${this.filters.status === 'inactive' ? 'selected' : ''}>Neaktivni</option>
                <option value="new" ${this.filters.status === 'new' ? 'selected' : ''}>Bez porudžbina</option>
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
    if (this.paginatedCustomers.length === 0) {
      return `
        <div class="table-container">
          <div class="table-empty" style="padding: var(--space-12);">
            <svg class="table-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <h3 class="table-empty-title">Nema kupaca</h3>
            <p class="table-empty-message">Nema kupaca koji odgovaraju filterima.</p>
          </div>
        </div>
      `;
    }

    this.bindEvents();
    return `
      <div class="table-container">
        <table class="table" id="customersTable">
          <thead>
            <tr>
              <th scope="col" style="width: 130px;" data-sort="id">ID</th>
              <th scope="col" data-sort="name">Kupac</th>
              <th scope="col" style="width: 120px;" data-sort="segment">Segment</th>
              <th scope="col" style="width: 100px;" data-sort="orderCount">Porudžbine</th>
              <th scope="col" style="width: 130px;" data-sort="totalSpent">Ukupno potrošeno</th>
              <th scope="col" style="width: 140px;" data-sort="lastOrderDate">Poslednja porudžbina</th>
              <th scope="col" style="width: 100px;" data-sort="status">Status</th>
              <th scope="col" style="width: 120px;">Akcije</th>
            </tr>
          </thead>
          <tbody>
            ${this.paginatedCustomers.map(customer => `
              <tr data-clickable="true" data-id="${customer.id}">
                <td class="cell-secondary">${customer.id}</td>
                <td>
                  <div class="cell-primary">${ImperiumUtils.escapeHtml(customer.firstName)} ${ImperiumUtils.escapeHtml(customer.lastName)}</div>
                  <div class="cell-tertiary">${ImperiumUtils.escapeHtml(customer.email)}</div>
                  <div class="cell-tertiary">${ImperiumUtils.escapeHtml(customer.phone)} • ${ImperiumUtils.escapeHtml(customer.city)}</div>
                </td>
                <td>${this.renderSegmentBadge(customer.segment)}</td>
                <td class="cell-primary">${customer.orderCount}</td>
                <td class="cell-primary">${ImperiumUtils.formatCurrency(customer.totalSpent)}</td>
                <td class="cell-secondary">${customer.lastOrderDate ? ImperiumUtils.formatDateTime(customer.lastOrderDate) : '—'}</td>
                <td>${this.renderStatusBadge(customer.status)}</td>
                <td>
                  <div class="admin-actions">
                    <button class="btn-action view btn-icon" data-action="view" data-id="${customer.id}" aria-label="Pogledaj kupca">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-action update btn-icon" data-action="edit" data-id="${customer.id}" aria-label="Izmeni">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-action update btn-icon" data-action="orders" data-id="${customer.id}" aria-label="Porudžbine">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5v5M16 19h6M8 19H2M21 19V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/><circle cx="9" cy="19" r="1"/><circle cx="19" cy="19" r="1"/></svg>
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

  renderSegmentBadge(segment) {
    const badges = {
      vip: '<span class="badge badge-warning">VIP</span>',
      loyal: '<span class="badge badge-success">Loijalan</span>',
      regular: '<span class="badge badge-primary">Redovan</span>',
      new: '<span class="badge badge-info">Nov</span>',
      at_risk: '<span class="badge badge-warning">Rizičan</span>',
      lost: '<span class="badge badge-danger">Izgubljen</span>'
    };
    return badges[segment] || `<span class="badge badge-neutral">${segment}</span>`;
  }

  renderStatusBadge(status) {
    const badges = {
      active: '<span class="badge badge-success">Aktivan</span>',
      inactive: '<span class="badge badge-warning">Neaktivan</span>',
      new: '<span class="badge badge-info">Nov</span>'
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
        <div class="table-pagination-info">Stranica ${this.currentPage} od ${totalPages} (${this.totalItems} kupaca)</div>
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

    this.on('change', '[data-filter="segment"]', (e) => {
      this.filters.segment = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="status"]', (e) => {
      this.filters.status = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-action="clear-filters"]', () => {
      this.filters = { segment: 'all', search: '', status: 'all' };
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
      const id = e.delegateTarget.dataset.id;
      this.openCustomerDetail(id);
    });

    this.on('click', '[data-action="orders"]', (e) => {
      const id = e.delegateTarget.dataset.id;
      this.admin.navigateTo('orders');
    });

    this.on('click', '[data-action="export-customers"]', () => this.exportCSV());
  }

  openCustomerDetail(id) {
    const customer = this.customers.find(c => c.id === id);
    if (!customer) return;

    this.admin.openModal({
      title: `${customer.firstName} ${customer.lastName}`,
      size: 'lg',
      content: `
        <div class="detail-full">
          <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value">${customer.id}</span></div>
          <div class="detail-row"><span class="detail-label">Ime i prezime</span><span class="detail-value">${ImperiumUtils.escapeHtml(customer.firstName)} ${ImperiumUtils.escapeHtml(customer.lastName)}</span></div>
          <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value"><a href="mailto:${customer.email}">${ImperiumUtils.escapeHtml(customer.email)}</a></span></div>
          <div class="detail-row"><span class="detail-label">Telefon</span><span class="detail-value"><a href="tel:${customer.phone}">${ImperiumUtils.escapeHtml(customer.phone)}</a></span></div>
          <div class="detail-row"><span class="detail-label">Grad</span><span class="detail-value">${ImperiumUtils.escapeHtml(customer.city)}</span></div>
          <div class="detail-row"><span class="detail-label">Segment</span><span class="detail-value">${this.renderSegmentBadge(customer.segment)}</span></div>
          <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${this.renderStatusBadge(customer.status)}</span></div>
          <div class="detail-row"><span class="detail-label">Broj porudžbina</span><span class="detail-value">${customer.orderCount}</span></div>
          <div class="detail-row"><span class="detail-label">Ukupno potrošeno</span><span class="detail-value">${ImperiumUtils.formatCurrency(customer.totalSpent)}</span></div>
          <div class="detail-row"><span class="detail-label">Prosečna porudžbina</span><span class="detail-value">${ImperiumUtils.formatCurrency(customer.avgOrderValue)}</span></div>
          <div class="detail-row"><span class="detail-label">Poslednja porudžbina</span><span class="detail-value">${customer.lastOrderDate ? ImperiumUtils.formatDateTime(customer.lastOrderDate) : 'Nema porudžbina'}</span></div>
          <div class="detail-row"><span class="detail-label">Registrovan</span><span class="detail-value">${ImperiumUtils.formatDateTime(customer.registeredDate)}</span></div>
          ${customer.notes ? `<div class="detail-row"><span class="detail-label">Napomene</span><span class="detail-value"><div class="detail-message">${ImperiumUtils.escapeHtml(customer.notes)}</div></span></div>` : ''}
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">Zatvori</button>
        <button class="btn btn-primary" data-action="view-orders" data-id="${customer.id}">Pogledaj porudžbine</button>
      `
    });
  }

  exportCSV() {
    const headers = ['ID', 'Ime', 'Prezime', 'Email', 'Telefon', 'Grad', 'Segment', 'Status', 'Porudžbine', 'Ukupno potrošeno', 'Prosečna porudžbina', 'Poslednja porudžbina', 'Registrovan'];
    const rows = this.filteredCustomers.map(c => [
      c.id, c.firstName, c.lastName, c.email, c.phone, c.city, c.segment, c.status, c.orderCount, c.totalSpent, Math.round(c.avgOrderValue), c.lastOrderDate ? ImperiumUtils.formatDateTime(c.lastOrderDate) : 'Nema', ImperiumUtils.formatDateTime(c.registeredDate)
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    ImperiumUtils.downloadFile(csv, `kupci-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    this.admin.success('CSV izveštaj kupaca preuzet');
  }
}