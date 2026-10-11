import { Component } from '../core/component.js';
import { SectionAPI } from '../services/integration.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class OrdersSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.orders;
    this.orders = [];
    this.filteredOrders = [];
    this.trash = [];
    this.notifications = [];
    this.notificationUnread = 0;
    this.tab = 'active';
    this.pollTimer = null;
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalItems = 0;
    this.filters = {
      status: 'all',
      search: '',
      dateFrom: '',
      dateTo: '',
    };
    this.sortColumn = 'date';
    this.sortDirection = 'desc';
    this.t = this.admin?.t || (key => key);
    this.currentUser = this.getCurrentUser();
    this.isOwner = this.checkOwner(this.currentUser);
  }

  getCurrentUser() {
    try {
      const raw =
        localStorage.getItem('dalli_admin_auth') || sessionStorage.getItem('dalli_admin_auth');
      return raw ? JSON.parse(raw).user : null;
    } catch {
      return null;
    }
  }

  checkOwner(user) {
    if (!user) return false;
    const role = String(user.role || '').toLowerCase();
    const ownerRoles = ['vlasnik', 'owner', 'super_admin', 'superadmin', 'founder', 'root'];
    return ownerRoles.includes(role) || (user.permissions || []).includes('*');
  }

  async onEnter() {
    await Promise.all([this.loadOrders(), this.loadTrash(), this.loadNotifications()]);
    this.render();
    this.startPolling();
  }

  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.poll(), 15000);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async poll() {
    try {
      const orders = await this.api.list(this.getFilterParams());
      const list = Array.isArray(orders) ? orders : [];
      const changed = JSON.stringify(list) !== JSON.stringify(this.orders);
      if (changed) {
        this.orders = list;
        this.applyFilters();
        if (this.tab === 'active') this.render();
      }
      if (this.isOwner) {
        const notes = await this.api.notifications();
        if (notes.unread > this.notificationUnread) {
          this.admin?.info?.(`${notes.unread} novo obaveštenje o brisanju porudžbina`);
        }
        this.notifications = notes.notifications;
        this.notificationUnread = notes.unread;
      }
      const trash = await this.api.trashList();
      this.trash = Array.isArray(trash) ? trash : [];
    } catch (err) {
      // silent — polling must never disrupt the UI
    }
  }

  async loadOrders() {
    this.loading = true;
    try {
      const orders = await this.api.list(this.getFilterParams());
      this.orders = Array.isArray(orders) ? orders : [];
    } catch (error) {
      console.warn('[Orders] API failed:', error);
      this.orders = [];
      this.admin?.toastContainer?.error?.('Greška pri učitavanju porudžbina');
    }
    this.loading = false;
    this.applyFilters();
  }

  async loadTrash() {
    try {
      const trash = await this.api.trashList();
      this.trash = Array.isArray(trash) ? trash : [];
    } catch (error) {
      this.trash = [];
    }
  }

  async loadNotifications() {
    if (!this.isOwner) {
      this.notifications = [];
      this.notificationUnread = 0;
      return;
    }
    try {
      const notes = await this.api.notifications();
      this.notifications = notes.notifications;
      this.notificationUnread = notes.unread;
    } catch (error) {
      this.notifications = [];
      this.notificationUnread = 0;
    }
  }

  getFilterParams() {
    const params = { page: this.currentPage, limit: this.pageSize };
    if (this.filters.status !== 'all') params.status = this.filters.status;
    if (this.filters.search) params.search = this.filters.search;
    if (this.filters.dateFrom) params.dateFrom = this.filters.dateFrom;
    if (this.filters.dateTo) params.dateTo = this.filters.dateTo;
    return params;
  }

  applyFilters() {
    let filtered = [...this.orders];

    if (this.filters.status !== 'all') {
      filtered = filtered.filter(o => o.status === this.filters.status);
    }

    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(
        o =>
          o.id.toLowerCase().includes(search) ||
          o.customer.name.toLowerCase().includes(search) ||
          o.customer.email.toLowerCase().includes(search) ||
          o.customer.phone.includes(search)
      );
    }

    if (this.filters.dateFrom) {
      filtered = filtered.filter(o => o.date >= this.filters.dateFrom);
    }

    if (this.filters.dateTo) {
      filtered = filtered.filter(o => o.date <= this.filters.dateTo + 'T23:59:59');
    }

    filtered.sort((a, b) => {
      const aVal = a[this.sortColumn];
      const bVal = b[this.sortColumn];
      const dir = this.sortDirection === 'asc' ? 1 : -1;
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });

    this.filteredOrders = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  get paginatedOrders() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  render() {
    const columns = [
      { key: 'id', label: 'Broj', width: '140px', sortable: true },
      {
        key: 'date',
        label: 'Datum',
        width: '140px',
        sortable: true,
        format: v => ImperiumUtils.formatDateTime(v),
      },
      {
        key: 'customer',
        label: 'Kupac',
        sortable: true,
        render: v => `
        <div class="cell-primary">${ImperiumUtils.escapeHtml(v.name)}</div>
        <div class="cell-tertiary">${ImperiumUtils.escapeHtml(v.email)}</div>
      `,
      },
      { key: 'items', label: 'Artikli', width: '100px', render: v => `${v.length} artikala` },
      {
        key: 'total',
        label: 'Ukupno',
        width: '130px',
        align: 'right',
        sortable: true,
        format: v => ImperiumUtils.formatCurrency(v),
      },
      {
        key: 'payment',
        label: 'Plaćanje',
        width: '120px',
        render: (v, row) => {
          if (v === 'crypto') {
            return `<span class="payment-badge payment-crypto">₿ Kripto</span>`;
          }
          return v === 'cod' ? '💰 Pri preuzimanju' : '🏦 Bankovni prenos';
        },
      },
      {
        key: 'status',
        label: 'Status',
        width: '130px',
        sortable: true,
        render: v => this.renderStatusBadge(v),
      },
      {
        key: 'actions',
        label: 'Akcije',
        width: '140px',
        render: (v, row) => this.renderActions(row),
      },
    ];

    const filtersHtml = this.renderFilters();
    const tableHtml = this.renderTable(columns);
    const paginationHtml = this.totalItems > this.pageSize ? this.renderPagination() : '';

    this.bindEvents();

    let body;
    if (this.tab === 'trash') body = this.renderTrash();
    else if (this.tab === 'notifications') body = this.renderNotifications();
    else body = `${filtersHtml}${tableHtml}${paginationHtml}`;

    return `
      <div class="orders-section">
        ${this.renderTabs()}
        ${body}
      </div>
    `;
  }

  renderTabs() {
    const tabs = [
      { id: 'active', label: 'Porudžbine' },
      { id: 'trash', label: `Kanta${this.trash.length ? ` (${this.trash.length})` : ''}` },
    ];
    if (this.isOwner) {
      tabs.push({
        id: 'notifications',
        label: `Obaveštenja${this.notificationUnread ? ` (${this.notificationUnread})` : ''}`,
      });
    }
    return `
      <div class="orders-tabs" style="display:flex; gap:var(--space-2); margin-bottom:var(--space-4); border-bottom:1px solid var(--color-border, #e5e7eb);">
        ${tabs
          .map(
            tab => `
          <button class="btn" data-action="switch-tab" data-tab="${tab.id}"
            style="border-radius:0; border:none; border-bottom:2px solid ${
              this.tab === tab.id ? 'var(--color-primary, #2563eb)' : 'transparent'
            }; font-weight:${this.tab === tab.id ? '600' : '400'}; color:${
              this.tab === tab.id ? 'var(--color-primary, #2563eb)' : 'inherit'
            };">${tab.label}</button>
        `
          )
          .join('')}
      </div>
    `;
  }

  renderTrash() {
    if (this.trash.length === 0) {
      return `
        <div class="table-container">
          <div class="table-empty" style="padding: var(--space-12); text-align:center;">
            <h3 class="table-empty-title">Kanta je prazna</h3>
            <p class="table-empty-message">Obrisane porudžbine (od strane admina) se pojavljuju ovde i mogu se vratiti.</p>
          </div>
        </div>
      `;
    }
    return `
      <div class="table-container">
        <table class="table" id="trashTable">
          <thead>
            <tr>
              <th>Broj</th>
              <th>Datum kreiranja</th>
              <th>Obrisao</th>
              <th>Kupac</th>
              <th>Ukupno</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            ${this.trash
              .map(
                order => `
              <tr data-id="${order.id}">
                <td class="cell-primary"><strong>${order.id}</strong></td>
                <td class="cell-secondary">${ImperiumUtils.formatDateTime(order.date)}</td>
                <td class="cell-secondary">${ImperiumUtils.escapeHtml(order.trashedByName || '—')}</td>
                <td>
                  <div class="cell-primary">${ImperiumUtils.escapeHtml(order.customer.name)}</div>
                  <div class="cell-tertiary">${ImperiumUtils.escapeHtml(order.customer.email)}</div>
                </td>
                <td>${ImperiumUtils.formatCurrency(order.total)}</td>
                <td>${this.renderStatusBadge(order.status)}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-secondary" data-action="restore" data-id="${order.id}">Vrati</button>
                    <button class="btn btn-sm btn-danger" data-action="purge" data-id="${order.id}">Obriši trajno</button>
                  </div>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderNotifications() {
    if (this.notifications.length === 0) {
      return `
        <div class="table-container">
          <div class="table-empty" style="padding: var(--space-12); text-align:center;">
            <h3 class="table-empty-title">Nema obaveštenja</h3>
            <p class="table-empty-message">Ovde se (samo vlasniku) prikazuju porudžbine koje su admini trajno obrisali iz kante.</p>
          </div>
        </div>
      `;
    }
    return `
      <div class="card">
        <div class="card-body" style="padding: var(--space-4);">
          <div class="btn-group" style="justify-content:flex-end; margin-bottom:var(--space-3);">
            <button class="btn btn-sm btn-secondary" data-action="mark-notifications-read">Označi sve kao pročitano</button>
          </div>
          <div class="order-notifications">
            ${this.notifications
              .map(
                n => `
              <div class="notification-row" style="display:flex; gap:var(--space-3); padding:var(--space-3) 0; border-bottom:1px solid var(--color-border, #e5e7eb); opacity:${
                n.read ? '0.6' : '1'
              };">
                <div style="flex:1;">
                  <div class="cell-primary">${ImperiumUtils.escapeHtml(n.message || '')}</div>
                  <div class="cell-tertiary" style="margin-top:4px;">
                    Kupac: ${ImperiumUtils.escapeHtml(n.order?.customerName || '—')}
                    · ${ImperiumUtils.escapeHtml(n.order?.customerEmail || '')}
                    · ${ImperiumUtils.formatCurrency(n.order?.total || 0)}
                  </div>
                </div>
                <div class="cell-tertiary" style="white-space:nowrap;">${ImperiumUtils.formatDateTime(
                  n.at
                )}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderFilters() {
    const statusOptions = [
      { value: 'all', label: 'Svi statusi' },
      { value: 'new', label: 'Nove' },
      { value: 'confirmed', label: 'Potvrđene' },
      { value: 'processing', label: 'U obradi' },
      { value: 'shipped', label: 'Poslate' },
      { value: 'delivered', label: 'Isporučene' },
      { value: 'cancelled', label: 'Otkazane' },
    ];

    this.bindEvents();
    return `
      <div class="card" style="margin-bottom: var(--space-5);">
        <div class="card-body" style="padding: var(--space-4) var(--space-5);">
          <div class="form-row" style="align-items: flex-end; gap: var(--space-4);">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label class="input-label">${this.t('common.search')}</label>
              <input type="text" class="input-field" placeholder="${this.t('orders.searchPlaceholder')}" 
                value="${ImperiumUtils.escapeHtml(this.filters.search)}" data-filter="search">
            </div>
            <div class="form-group" style="min-width: 180px;">
              <label class="input-label">${this.t('common.status')}</label>
              <select class="input-field select-field" data-filter="status">
                ${statusOptions.map(opt => `<option value="${opt.value}" ${this.filters.status === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width: 160px;">
              <label class="input-label">${this.t('orders.dateFrom')}</label>
              <input type="date" class="input-field" value="${this.filters.dateFrom}" data-filter="dateFrom">
            </div>
            <div class="form-group" style="min-width: 160px;">
              <label class="input-label">${this.t('orders.dateTo')}</label>
              <input type="date" class="input-field" value="${this.filters.dateTo}" data-filter="dateTo">
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" data-action="clear-filters">${this.t('common.clear')}</button>
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3); align-items: center; justify-content: space-between;">
            <span class="text-secondary">${this.t('orders.showing', { count: this.paginatedOrders.length, total: this.totalItems })}</span>
            <div class="btn-group">
              <button class="btn btn-sm btn-secondary" data-action="export-csv">${this.t('orders.exportCsv')}</button>
              <button class="btn btn-sm btn-secondary" data-action="bulk-print">${this.t('orders.bulkPrint')}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTable(columns) {
    if (this.paginatedOrders.length === 0) {
      return `
        <div class="table-container">
          <div class="table-empty" style="padding: var(--space-12);">
            <svg class="table-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 12V7H5v5M16 19h6M8 19H2M21 19V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/>
              <circle cx="9" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>
            </svg>
            <h3 class="table-empty-title">${this.t('orders.noOrders')}</h3>
            <p class="table-empty-message">${this.filters.search || this.filters.status !== 'all' ? this.t('orders.noOrdersMatch') : this.t('orders.noOrdersYet')}</p>
          </div>
        </div>
      `;
    }

    this.bindEvents();
    return `
      <div class="table-container">
        <table class="table" id="ordersTable">
          <thead>
            <tr>
              ${columns
                .map(
                  col => `
                <th scope="col" ${col.width ? `style="width: ${col.width}"` : ''} ${col.sortable ? `data-sort="${col.key}"` : ''}>
                  <div class="table-th-content">
                    <span>${col.label}</span>
                    ${col.sortable ? `<button class="table-sort-btn" aria-label="Sortiraj po ${col.label}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>` : ''}
                  </div>
                </th>
              `
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${this.paginatedOrders
              .map(
                order => `
              <tr data-clickable="true" data-id="${order.id}">
                <td class="cell-primary"><strong>${order.id}</strong></td>
                <td class="cell-secondary">${ImperiumUtils.formatDateTime(order.date)}</td>
                <td>
                  <div class="cell-primary">${ImperiumUtils.escapeHtml(order.customer.name)}</div>
                  <div class="cell-tertiary">${ImperiumUtils.escapeHtml(order.customer.email)}</div>
                </td>
                <td>${order.items.length} artikala</td>
                <td class="text-right">${ImperiumUtils.formatCurrency(order.total)}</td>
                <td>${order.payment === 'cod' ? '💰 Pri preuzimanju' : '🏦 Bankovni prenos'}</td>
                <td>${this.renderStatusBadge(order.status)}</td>
                <td>${this.renderActions(order)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderStatusBadge(status) {
    const badges = {
      new: `<span class="badge badge-primary">${this.t('orders.statusLabels.new')}</span>`,
      confirmed: `<span class="badge badge-success">${this.t('orders.statusLabels.confirmed')}</span>`,
      processing: `<span class="badge badge-warning">${this.t('orders.statusLabels.processing')}</span>`,
      shipped: `<span class="badge badge-info">${this.t('orders.statusLabels.shipped')}</span>`,
      delivered: `<span class="badge badge-success">${this.t('orders.statusLabels.delivered')}</span>`,
      cancelled: `<span class="badge badge-danger">${this.t('orders.statusLabels.cancelled')}</span>`,
    };
    return badges[status] || `<span class="badge badge-neutral">${status}</span>`;
  }

  renderActions(order) {
    this.bindEvents();
    return `
      <div class="admin-actions">
        <button class="btn-action view btn-icon" data-action="view" data-id="${order.id}" aria-label="${this.t('orders.table.actions')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="btn-action update btn-icon" data-action="edit" data-id="${order.id}" aria-label="${this.t('orders.detail.updateStatus')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-action delete btn-icon" data-action="delete" data-id="${order.id}" title="${
          this.isOwner ? 'Obriši trajno' : 'Prebaci u kantu'
        }" aria-label="${this.isOwner ? 'Obriši trajno' : 'Prebaci u kantu'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
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
          Stranica ${this.currentPage} od ${totalPages} (${this.totalItems} porudžbina)
        </div>
        <div class="table-pagination-controls">
          <button class="table-pagination-btn" data-page="first" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prva stranica">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><line x1="18" y1="17" x2="18" y2="7"/></svg>
          </button>
          <button class="table-pagination-btn" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prethodna">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="table-pagination-pages">
            ${pages
              .map(page =>
                page === '...'
                  ? '<span class="table-pagination-page ellipsis" aria-hidden="true">…</span>'
                  : `<button class="table-pagination-page ${page === this.currentPage ? 'active' : ''}" data-page="${page}" ${page === this.currentPage ? 'aria-current="page"' : ''}>${page}</button>`
              )
              .join('')}
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
    this.on(
      'input',
      '[data-filter="search"]',
      ImperiumUtils.debounce(e => {
        this.filters.search = e.target.value;
        this.applyFilters();
        this.render();
      }, 300)
    );

    this.on('change', '[data-filter="status"]', e => {
      this.filters.status = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="dateFrom"]', e => {
      this.filters.dateFrom = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="dateTo"]', e => {
      this.filters.dateTo = e.target.value;
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-action="clear-filters"]', () => {
      this.filters = { status: 'all', search: '', dateFrom: '', dateTo: '' };
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-sort]', e => {
      const column = e.delegateTarget.dataset.sort;
      if (this.sortColumn === column) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumn = column;
        this.sortDirection = 'asc';
      }
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-page]', e => {
      const action = e.delegateTarget.dataset.page;
      if (action === 'first') this.currentPage = 1;
      else if (action === 'prev') this.currentPage = Math.max(1, this.currentPage - 1);
      else if (action === 'next')
        this.currentPage = Math.min(
          Math.ceil(this.totalItems / this.pageSize),
          this.currentPage + 1
        );
      else if (action === 'last') this.currentPage = Math.ceil(this.totalItems / this.pageSize);
      else this.currentPage = parseInt(action);
      this.render();
    });

    this.on('click', '[data-action="view"]', e => {
      const orderId = e.delegateTarget.dataset.id;
      this.openOrderDetail(orderId);
    });

    this.on('click', '[data-action="edit"]', e => {
      const orderId = e.delegateTarget.dataset.id;
      this.openStatusModal(orderId);
    });

    this.on('click', '[data-action="delete"]', async e => {
      const orderId = e.delegateTarget.dataset.id;
      const isOwner = this.isOwner;
      const message = isOwner
        ? `Trajno obrisati porudžbinu ${orderId}? Ova radnja je NEPOVRATNA i ne ide u kantu.`
        : `Prebaciti porudžbinu ${orderId} u kantu? Može se vratiti kasnije.`;
      const confirmed = await this.confirm(message, {
        title: isOwner ? 'Trajno brisanje porudžbine' : 'Prebaci u kantu',
        variant: 'danger',
      });
      if (!confirmed) return;
      try {
        const res = await this.api.delete(orderId);
        const data = res && res.data !== undefined ? res.data : res;
        if (isOwner) this.admin.success('Porudžbina trajno obrisana');
        else if (data && data.mode === 'trash') this.admin.success('Porudžbina prebačena u kantu');
        else this.admin.success('Porudžbina obrisana');
      } catch (err) {
        this.admin.error('Greška pri brisanju porudžbine');
      }
      await Promise.all([this.loadOrders(), this.loadTrash()]);
      this.render();
    });

    this.on('click', '[data-action="switch-tab"]', async e => {
      this.tab = e.delegateTarget.dataset.tab;
      if (this.tab === 'trash') await this.loadTrash();
      if (this.tab === 'notifications') await this.loadNotifications();
      if (this.tab === 'active') await this.loadOrders();
      this.render();
    });

    this.on('click', '[data-action="restore"]', async e => {
      const orderId = e.delegateTarget.dataset.id;
      try {
        await this.api.restore(orderId);
        this.admin.success('Porudžbina vraćena iz kante');
      } catch (err) {
        this.admin.error('Greška pri vraćanju porudžbine');
      }
      await Promise.all([this.loadOrders(), this.loadTrash()]);
      this.render();
    });

    this.on('click', '[data-action="purge"]', async e => {
      const orderId = e.delegateTarget.dataset.id;
      const confirmed = await this.confirm(
        `Trajno obrisati porudžbinu ${orderId} iz kante? Ova radnja je nepovratna.`,
        { title: 'Trajno brisanje iz kante', variant: 'danger' }
      );
      if (!confirmed) return;
      try {
        await this.api.purge(orderId);
        this.admin.success('Porudžbina trajno obrisana iz kante');
      } catch (err) {
        this.admin.error('Greška pri trajnom brisanju');
      }
      await this.loadTrash();
      this.render();
    });

    this.on('click', '[data-action="mark-notifications-read"]', async () => {
      try {
        await this.api.markNotificationsRead();
      } catch (err) {
        // ignore
      }
      await this.loadNotifications();
      this.render();
    });

    this.on('click', '[data-action="export-csv"]', () => this.exportCSV());
    this.on('click', '[data-action="bulk-print"]', () =>
      this.admin.info('Funkcija masovnog štampanja u razvoju')
    );

    this._docClickBound = this._docClickBound || this.handleModalActions.bind(this);
    document.addEventListener('click', this._docClickBound);
  }

  async handleModalActions(e) {
    const btn = e.target.closest('[data-action="update-status"], [data-action="save-status"]');
    if (!btn) return;
    let orderId = btn.dataset.orderId;
    let status = '';
    let note = '';
    if (btn.dataset.action === 'save-status') {
      const sel = document.getElementById('modalOrderStatus');
      status = sel ? sel.value : '';
      if (sel) orderId = sel.dataset.orderId || orderId;
    } else {
      const sel = document.getElementById('newStatus');
      const noteEl = document.getElementById('statusNote');
      status = sel ? sel.value : '';
      note = noteEl ? noteEl.value : '';
      if (sel) orderId = sel.dataset.orderId || orderId;
    }
    if (!orderId || !status) return;
    btn.disabled = true;
    try {
      await this.api.updateStatus(orderId, status, note);
      this.admin?.closeModal?.();
      this.admin.success('Status porudžbine ažuriran');
    } catch (err) {
      this.admin.error('Greška pri ažuriranju statusa');
    } finally {
      btn.disabled = false;
    }
    await this.loadOrders();
    this.render();
  }

  onLeave() {
    this.stopPolling();
    if (this._docClickBound) {
      document.removeEventListener('click', this._docClickBound);
      this._docClickBound = null;
    }
    return super.onLeave && super.onLeave();
  }

  openOrderDetail(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const itemsHtml = order.items
      .map(
        item => `
      <div class="order-item-detail">
        <div class="order-item-info">
          <span class="order-item-name">${ImperiumUtils.escapeHtml(item.name)}</span>
          <span class="order-item-qty-price">Količina: ${item.qty} x ${ImperiumUtils.formatCurrency(item.price)}</span>
        </div>
        <span class="order-item-total">${ImperiumUtils.formatCurrency(item.price * item.qty)}</span>
      </div>
    `
      )
      .join('');

    this.admin.openModal({
      title: `Porudžbina ${order.id}`,
      size: 'lg',
      content: `
        <div class="detail-section">
          <h4>${this.t('orders.detail.customerInfo')}</h4>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">${this.t('orders.detail.name')}</span><span class="detail-value">${ImperiumUtils.escapeHtml(order.customer.name)}</span></div>
            <div class="detail-item"><span class="detail-label">${this.t('orders.detail.email')}</span><span class="detail-value"><a href="mailto:${order.customer.email}">${ImperiumUtils.escapeHtml(order.customer.email)}</a></span></div>
            <div class="detail-item"><span class="detail-label">${this.t('orders.detail.phone')}</span><span class="detail-value"><a href="tel:${order.customer.phone}">${ImperiumUtils.escapeHtml(order.customer.phone)}</a></span></div>
            <div class="detail-item"><span class="detail-label">${this.t('orders.detail.address')}</span><span class="detail-value">${ImperiumUtils.escapeHtml(order.customer.address)}, ${order.customer.postalCode} ${order.customer.city}</span></div>
          </div>
        </div>
        <div class="detail-section">
          <h4>${this.t('orders.detail.items')}</h4>
          <div class="order-items-list">${itemsHtml}</div>
        </div>
        <div class="detail-section">
          <h4>${this.t('orders.detail.total')}</h4>
          <div class="order-totals-detail">
            <div class="totals-row"><span>${this.t('orders.detail.subtotal')}:</span><span>${ImperiumUtils.formatCurrency(order.subtotal)}</span></div>
            <div class="totals-row"><span>${this.t('orders.detail.shipping')}:</span><span>${order.shipping === 0 ? this.t('orders.detail.freeShipping') : ImperiumUtils.formatCurrency(order.shipping)}</span></div>
            <div class="totals-row total"><span>${this.t('orders.detail.total')}:</span><span>${ImperiumUtils.formatCurrency(order.total)}</span></div>
          </div>
        </div>
        <div class="detail-section">
          <h4>${this.t('orders.detail.paymentMethod')}</h4>
          ${
            order.payment === 'crypto'
              ? `
            <div class="crypto-payment-details">
              <div class="crypto-detail-row">
                <span class="detail-label">💎 Kriptovaluta:</span>
                <span class="detail-value">${order.cryptoDetails?.currency || '—'}</span>
              </div>
              <div class="crypto-detail-row">
                <span class="detail-label">💰 Iznos (kripto):</span>
                <span class="detail-value"><strong>${order.cryptoDetails?.amountCrypto || '—'} ${order.cryptoDetails?.currency || ''}</strong></span>
              </div>
              <div class="crypto-detail-row">
                <span class="detail-label">💵 Iznos (RSD):</span>
                <span class="detail-value">${ImperiumUtils.formatCurrency(order.cryptoDetails?.amountRSD || 0)}</span>
              </div>
              <div class="crypto-detail-row">
                <span class="detail-label">📊 Kurs:</span>
                <span class="detail-value">1 ${order.cryptoDetails?.currency} = ${ImperiumUtils.formatCurrency(order.cryptoDetails?.exchangeRate || 0)} RSD</span>
              </div>
              <div class="crypto-detail-row">
                <span class="detail-label">🔗 Adresa za plaćanje:</span>
                <div class="address-row">
                  <code>${order.cryptoDetails?.walletAddress || '—'}</code>
                  <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText('${order.cryptoDetails?.walletAddress || ''}')">Kopiraj</button>
                </div>
              </div>
              ${
                order.cryptoDetails?.transactionId
                  ? `
                <div class="crypto-detail-row">
                  <span class="detail-label">🔗 TX Hash:</span>
                  <div class="tx-hash-row">
                    <code>${order.cryptoDetails.transactionId}</code>
                    <button class="btn btn-sm btn-secondary" onclick="window.open('https://blockchain.com/search?search=${order.cryptoDetails.transactionId}', '_blank')">Pogledaj na blockchain</button>
                  </div>
                </div>
              `
                  : ''
              }
              <div class="crypto-detail-row">
                <span class="detail-label">✅ Potvrde:</span>
                <span class="detail-value">${order.cryptoDetails?.confirmations || 0} / ${order.cryptoDetails?.requiredConfirmations || '—'}</span>
              </div>
              <div class="crypto-detail-row">
                <span class="detail-label">⏰ Vreme plaćanja:</span>
                <span class="detail-value">${order.cryptoDetails?.paidAt ? ImperiumUtils.formatDateTime(order.cryptoDetails.paidAt) : '—'}</span>
              </div>
              <div class="crypto-detail-row">
                <span class="detail-label">✅ Potvrđeno:</span>
                <span class="detail-value">${order.cryptoDetails?.confirmedAt ? ImperiumUtils.formatDateTime(order.cryptoDetails.confirmedAt) : '—'}</span>
              </div>
              ${
                order.cryptoDetails?.discountApplied
                  ? `
                <div class="crypto-detail-row discount-row">
                  <span class="detail-label">🎁 Popust:</span>
                  <span class="detail-value discount-value">${order.cryptoDetails.discountRate * 100}% popust (${ImperiumUtils.formatCurrency(order.cryptoDetails.discountAmountRSD)})</span>
                </div>
              `
                  : ''
              }
            </div>
          `
              : order.payment === 'cod'
                ? '💰 Plaćanje pri preuzimanju (gotovina/kartica kuriru)'
                : '🏦 Bankovni prenos'
          }
        </div>
        ${
          order.notes
            ? `
          <div class="detail-section">
            <h4>📝 Napomena kupca</h4>
            <p>${ImperiumUtils.escapeHtml(order.notes)}</p>
          </div>
        `
            : ''
        }
        <div class="status-update-form">
          <h4>🔄 Ažuriraj Status</h4>
          <select class="status-select" id="modalOrderStatus" data-order-id="${order.id}">
            <option value="new" ${order.status === 'new' ? 'selected' : ''}>Nova</option>
            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Potvrđena</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>U obradi</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Poslata</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Isporučena</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Otkazana</option>
          </select>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">Zatvori</button>
        <button class="btn btn-primary" data-action="save-status">Sačuvaj status</button>
      `,
    });
  }

  openStatusModal(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    this.admin.openModal({
      title: `Izmeni status: ${order.id}`,
      content: `
        <div class="form-group">
          <label class="input-label">Trenutni status</label>
          <select class="input-field select-field" id="newStatus" data-order-id="${order.id}">
            <option value="new" ${order.status === 'new' ? 'selected' : ''}>Nova</option>
            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Potvrđena</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>U obradi</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Poslata</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Isporučena</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Otkazana</option>
          </select>
        </div>
        <div class="form-group">
          <label class="input-label">Napomena (opciono)</label>
          <textarea class="input-field textarea-field" id="statusNote" rows="3" placeholder="Napomena za kupca..."></textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">Otkaži</button>
        <button class="btn btn-primary" data-action="update-status" data-order-id="${order.id}">Ažuriraj</button>
      `,
    });
  }

  exportCSV() {
    const headers = [
      'Broj',
      'Datum',
      'Kupac',
      'Email',
      'Telefon',
      'Artikala',
      'Ukupno',
      'Plaćanje',
      'Status',
    ];
    const rows = this.filteredOrders.map(order => [
      order.id,
      ImperiumUtils.formatDateTime(order.date),
      order.customer.name,
      order.customer.email,
      order.customer.phone,
      order.items.length,
      order.total,
      order.payment === 'cod' ? 'Pri preuzimanju' : 'Bankovni prenos',
      order.status,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    ImperiumUtils.downloadFile(
      csv,
      `porudzbine-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
    this.admin.success(this.t('orders.exported'));
  }
}
