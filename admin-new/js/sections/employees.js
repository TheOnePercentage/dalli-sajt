import { Component } from '../core/component.js';
import { accessLog } from '../services/access-log.js';
import { SectionAPI } from '../services/integration.js';

export class EmployeesSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.employees;
    this.employees = [];
    this.accessEntries = [];
    this.activeTab = 'list';
    this.showForm = false;
    this.editingEmployee = null;
    this.searchQuery = '';
    this.formData = {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'employee',
      status: 'active',
      permissions: {},
    };
    this.submitting = false;
    this.t = this.admin?.t || (key => key);

    // Role-based permissions presets
    this.rolePermissions = {
      vlasnik: {
        orders: true,
        products: true,
        customers: true,
        analytics: true,
        settings: true,
        employees: true,
        markets: true,
        marketing: true,
      },
      admin: {
        orders: true,
        products: true,
        customers: true,
        analytics: true,
        settings: true,
        employees: false,
        markets: true,
        marketing: true,
      },
      accountant: {
        orders: true,
        products: false,
        customers: true,
        analytics: true,
        settings: false,
        employees: false,
        markets: false,
        marketing: false,
      },
      employee: {
        orders: true,
        products: false,
        customers: false,
        analytics: false,
        settings: false,
        employees: false,
        markets: false,
        marketing: false,
      },
      read_only: {
        orders: false,
        products: false,
        customers: false,
        analytics: false,
        settings: false,
        employees: false,
        markets: false,
        marketing: false,
      },
    };

    // Check if current user is absolute owner (vlasnik)
    this.isAbsolute = this.getAuth()?.getRole() === 'vlasnik';
  }

  getAuth() {
    return window.AuthManager;
  }

  async onEnter() {
    await this.loadEmployees();
    if (this.activeTab === 'access') await this.loadAccess();
    this.render();
  }

  async loadAccess() {
    try {
      this.accessEntries = await accessLog.list(200);
    } catch (error) {
      console.warn('[Employees] Access log load failed:', error);
      this.accessEntries = [];
    }
  }

  async loadEmployees() {
    try {
      const data = await this.api.list();
      this.employees = data.employees || [];
    } catch (error) {
      console.warn('[Employees] API failed, using localStorage fallback:', error);
      this.employees = this.getLocalEmployees();
    }
  }

  getLocalEmployees() {
    const stored = localStorage.getItem('dalli_employees');
    if (stored) return JSON.parse(stored);
    return [
      {
        id: 'EMP-001',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@dalli.rs',
        username: 'admin',
        role: 'vlasnik',
        status: 'active',
        createdAt: new Date().toISOString(),
        permissions: {},
      },
    ];
  }

  saveLocalEmployees(employees) {
    localStorage.setItem('dalli_employees', JSON.stringify(employees));
  }

  render() {
    this.bindEvents();
    return `
      <div class="employees-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.t('employees.title')}</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">${this.t('employees.subtitle')}</p>
          </div>
          <button class="btn btn-primary" data-action="add-employee">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            ${this.t('employees.addEmployee')}
          </button>
        </div>

        <div class="section-tabs" style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);border-bottom:1px solid var(--border-color);">
          <button type="button" class="tab ${this.activeTab === 'list' ? 'active' : ''}" data-tab="list" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid ${this.activeTab === 'list' ? 'var(--color-primary)' : 'transparent'};cursor:pointer;font-weight:600;color:${this.activeTab === 'list' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)'};">Zaposleni (${this.employees.length})</button>
          <button type="button" class="tab ${this.activeTab === 'access' ? 'active' : ''}" data-tab="access" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid ${this.activeTab === 'access' ? 'var(--color-primary)' : 'transparent'};cursor:pointer;font-weight:600;color:${this.activeTab === 'access' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)'};">Pristup i prijave</button>
        </div>

        <!-- Search & Filters -->
        <div class="employees-toolbar" style="display: ${this.activeTab === 'list' ? 'flex' : 'none'}; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center;">
          <div class="search-box" style="flex: 1; min-width: 250px; max-width: 400px;">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" class="input-field search-input" placeholder="${this.t('employees.searchPlaceholder')}" style="padding-left: 40px;">
          </div>
          <select class="input-field select-field" style="width: auto;" data-filter="role">
            <option value="">${this.t('employees.allRoles')}</option>
            <option value="vlasnik">${this.t('employees.roles.vlasnik')}</option>
            <option value="admin">${this.t('employees.roles.admin')}</option>
            <option value="accountant">${this.t('employees.roles.accountant')}</option>
            <option value="employee">${this.t('employees.roles.employee')}</option>
            <option value="read_only">${this.t('employees.roles.read_only')}</option>
          </select>
          <select class="input-field select-field" style="width: auto;" data-filter="status">
            <option value="">${this.t('employees.allStatuses')}</option>
            <option value="active">${this.t('employees.statuses.active')}</option>
            <option value="suspended">${this.t('employees.statuses.suspended')}</option>
            <option value="inactive">${this.t('employees.statuses.inactive')}</option>
          </select>
        </div>

        ${this.activeTab === 'access' ? this.renderAccessLog() : this.showForm ? this.renderForm() : this.renderList()}
      </div>
    `;
  }

  renderAccessLog() {
    const rows = this.accessEntries.length
      ? this.accessEntries
          .map(e => {
            const login = e.at ? new Date(e.at) : null;
            const logout = e.logoutAt ? new Date(e.logoutAt) : null;
            const dur = e.durationMs
              ? this.formatDuration(e.durationMs)
              : e.type === 'login' && !e.logoutAt
                ? '<span class="badge badge-success">Aktivan</span>'
                : '—';
            return `
            <tr>
              <td>${this.escape(e.name || '—')}</td>
              <td><span class="role-badge role-${this.escape(e.role || '')}">${this.escape(this.getRoleLabel(e.role))}</span></td>
              <td>${login ? login.toLocaleString('sr-RS') : '—'}</td>
              <td>${logout ? logout.toLocaleString('sr-RS') : '—'}</td>
              <td>${dur}</td>
              <td><code>${this.escape(e.ip || '—')}</code></td>
              <td>${this.escape([e.device, e.os, e.browser].filter(Boolean).join(' · ') || '—')}</td>
            </tr>`;
          })
          .join('')
      : '<tr><td colspan="7" class="text-tertiary" style="text-align:center;padding:32px;">Nema zabeleženih prijava.</td></tr>';

    return `
      <div class="card">
        <div class="card-body" style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4);">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3)">
            <div>
              <h3 style="margin:0">Pristup i prijave zaposlenih</h3>
              <p class="text-tertiary" style="margin:4px 0 0;font-size:12px">Vreme prijave i odjave, IP adresa (server), uređaj, OS i pregledač za svaki pristup.</p>
            </div>
            <div style="display:flex;gap:var(--space-2)">
              <button type="button" class="btn btn-secondary btn-sm" data-action="refresh-access">Osveži</button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="export-access">Izvezi CSV</button>
              <button type="button" class="btn btn-ghost btn-sm danger" data-action="clear-access">Očisti lokalno</button>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Zaposleni</th><th>Uloga</th><th>Prijava</th><th>Odjava</th><th>Trajanje</th><th>IP adresa</th><th>Uređaj</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  formatDuration(ms) {
    if (!ms || ms < 0) return '—';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  escape(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  renderList() {
    const filtered = this.getFilteredEmployees();

    if (filtered.length === 0) {
      return `
        <div class="empty-state" style="text-align: center; padding: 60px 20px; background: var(--surface); border-radius: var(--radius-lg); border: 2px dashed var(--border-color);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; color: var(--text-tertiary);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <h3 style="margin-bottom: 8px; color: var(--text-secondary);">${this.t('employees.noEmployees')}</h3>
          <p style="color: var(--text-tertiary); margin-bottom: 24px;">${this.t('employees.addFirstEmployee')}</p>
          <button class="btn btn-primary" data-action="add-employee">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            ${this.t('employees.addFirstButton')}
          </button>
        </div>
      `;
    }

    return `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">${this.t('employees.table.employee')}</th>
              <th scope="col">${this.t('employees.table.role')}</th>
              <th scope="col">${this.t('employees.table.status')}</th>
              <th scope="col">${this.t('employees.table.created')}</th>
              <th scope="col" style="width: 200px;">${this.t('employees.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${this.employees
              .map(
                emp => `
              <tr>
                <td>
                  <div class="employee-info">
                    <div class="employee-avatar">${emp.firstName?.[0] || '?'}${emp.lastName?.[0] || ''}</div>
                    <div class="employee-details">
                      <span class="employee-name">${emp.firstName} ${emp.lastName}</span>
                      <span class="employee-meta">${emp.email} · ${emp.username}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="role-badge role-${emp.role}">${this.getRoleLabel(emp.role)}</span>
                </td>
                <td>
                  <span class="status-badge status-${emp.status}">${this.getStatusLabel(emp.status)}</span>
                </td>
                <td>${this.formatDate(emp.createdAt)}</td>
                <td>
                  <div class="action-buttons">
                    ${
                      this.isAbsolute
                        ? `
                    <button class="btn-icon btn-sm" data-action="edit-employee" data-id="${emp.id}" aria-label="${this.t('employees.actions.edit')}" title="${this.t('employees.actions.edit')}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/></svg>
                    </button>
                    <button class="btn-icon btn-sm" data-action="toggle-status" data-id="${emp.id}" aria-label="${emp.status === 'active' ? this.t('employees.actions.suspend') : this.t('employees.actions.activate')}" title="${emp.status === 'active' ? this.t('employees.actions.suspend') : this.t('employees.actions.activate')}">
                      ${emp.status === 'active' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="15" x2="15" y2="9"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'}
                    </button>
                    ${emp.id !== 'EMP-001' ? `<button class="btn-icon btn-sm danger" data-action="delete-employee" data-id="${emp.id}" aria-label="${this.t('employees.actions.delete')}" title="${this.t('employees.actions.delete')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
                    `
                        : ''
                    }
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

  renderForm() {
    const isEdit = !!this.editingEmployee;
    const rolePermissions = this.rolePermissions[this.formData.role] || {};
    const t = this.t.bind(this);
    return `
      <div class="employee-form-overlay" data-action="close-form" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div class="employee-form-modal" style="background: var(--card-bg); border-radius: var(--radius-lg); box-shadow: 0 24px 48px rgba(0,0,0,0.2); max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto;" data-action="stop-propagation">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-color); position: sticky; top: 0; background: var(--card-bg); z-index: 1;">
            <h3 style="margin: 0;">${isEdit ? t('employees.form.editTitle') : t('employees.form.addTitle')}</h3>
            <button class="modal-close" data-action="close-form" aria-label="${t('employees.form.close')}&times;</button>
          </div>
          <form id="employeeForm" class="employee-form" style="padding: 24px;">
            <input type="hidden" name="id" value="${this.editingEmployee?.id || ''}">
            
            <div class="form-row">
              <div class="form-group"><label class="input-label">${t('employees.form.firstNameRequired')}</label><input type="text" class="input-field" name="firstName" value="${this.formData.firstName || ''}" required autocomplete="given-name"></div>
              <div class="form-group"><label class="input-label">${t('employees.form.lastNameRequired')}</label><input type="text" class="input-field" name="lastName" value="${this.formData.lastName || ''}" required autocomplete="family-name"></div>
            </div>
            <div class="form-group"><label class="input-label">${t('employees.form.emailRequired')}</label><input type="email" class="input-field" name="email" value="${this.formData.email || ''}" required autocomplete="email"></div>
            <div class="form-group"><label class="input-label">${t('employees.form.usernameRequired')}</label><input type="text" class="input-field" name="username" value="${this.formData.username || ''}" required autocomplete="username" minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]+"></div>
            
            ${
              !this.editingEmployee
                ? `
              <div class="form-row">
                <div class="form-group"><label class="input-label">${t('employees.form.passwordRequired')}</label><input type="password" class="input-field" name="password" required autocomplete="new-password" minlength="8" placeholder="${t('employees.form.passwordPlaceholder')}"></div>
                <div class="form-group"><label class="input-label">${t('employees.form.confirmPasswordRequired')}</label><input type="password" class="input-field" name="confirmPassword" required autocomplete="new-password" minlength="8"></div>
              </div>
            `
                : `
              <div class="form-group"><label class="input-label">${t('employees.form.newPasswordOptional')}</label><input type="password" class="input-field" name="password" autocomplete="new-password" minlength="8" placeholder="${t('employees.form.leaveBlankToKeep')}"></div>
            `
            }
            
            <div class="form-row">
              <div class="form-group"><label class="input-label">${t('employees.form.roleLabel')}</label>
                <select class="input-field select-field" name="role" required onchange="this.form.dispatchEvent(new Event('roleChange'))">
                  <option value="employee" ${this.formData.role === 'employee' ? 'selected' : ''}>${t('employees.roles.employee')}</option>
                  <option value="accountant" ${this.formData.role === 'accountant' ? 'selected' : ''}>${t('employees.roles.accountant')}</option>
                  <option value="admin" ${this.formData.role === 'admin' ? 'selected' : ''}>${t('employees.roles.admin')}</option>
                  <option value="vlasnik" ${this.formData.role === 'vlasnik' ? 'selected' : ''}>${t('employees.roles.vlasnik')}</option>
                </select>
              </div>
              <div class="form-group"><label class="input-label">${t('employees.form.statusLabel')}</label><select class="input-field select-field" name="status" required>
                <option value="active" ${this.formData.status === 'active' ? 'selected' : ''}>${t('employees.statuses.active')}</option>
                <option value="suspended" ${this.formData.status === 'suspended' ? 'selected' : ''}>${t('employees.statuses.suspended')}</option>
                <option value="inactive" ${this.formData.status === 'inactive' ? 'selected' : ''}>${t('employees.statuses.inactive')}</option>
              </select></div>
            </div>
            
            <!-- Permissions Grid -->
            <div class="form-group">
              <label class="input-label">${t('employees.form.permissionsLabel')}</label>
              <div class="permissions-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 8px;">
                ${Object.entries(this.rolePermissions.employee)
                  .map(
                    ([key, defaultVal]) => `
                  <label class="permission-checkbox" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer;">
                    <input type="checkbox" name="perm_${key}" value="true" ${this.formData.permissions[key] ? 'checked' : ''} onchange="this.form.querySelector('[name=permissions_json]').value = JSON.stringify(Object.fromEntries(new FormData(this.form).entries().filter(([k,v]) => k.startsWith('perm_')).map(([k,v]) => [k.replace('perm_',''), v==='on']))))">
                    <span style="text-transform: capitalize;">${key}</span>
                  </label>
                `
                  )
                  .join('')}
              </div>
              <input type="hidden" name="permissions_json" value='${JSON.stringify(this.formData.permissions || {})}'>
              <span class="input-hint">${t('employees.form.permissionsHint')}</span>
            </div>
            
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border-color); margin-top: 24px;">
              <button type="button" class="btn btn-secondary" data-action="close-form">${t('employees.form.cancel')}</button>
              <button type="submit" class="btn btn-primary" ${this.submitting ? 'disabled' : ''}>
                ${this.submitting ? '<svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg>' : ''}
                ${isEdit ? t('employees.form.saveChangesBtn') : t('employees.form.addButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  getFilteredEmployees() {
    const search = this.element?.querySelector('.search-input')?.value?.toLowerCase() || '';
    const roleFilter = this.element?.querySelector('[data-filter="role"]')?.value || '';
    const statusFilter = this.element?.querySelector('[data-filter="status"]')?.value || '';

    return this.employees.filter(emp => {
      if (this.searchQuery && !this.matchesSearch(emp, this.searchQuery)) return false;
      if (roleFilter && emp.role !== roleFilter) return false;
      if (statusFilter && emp.status !== statusFilter) return false;
      return true;
    });
  }

  matchesSearch(emp, query) {
    const searchable =
      `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.username}`.toLowerCase();
    return searchable.includes(query);
  }

  getRoleLabel(role) {
    const labels = {
      vlasnik: 'Vlasnik',
      admin: 'Admin',
      accountant: 'Književni',
      employee: 'Zaposleni',
      read_only: 'Samo Čitanje',
    };
    return labels[role] || role;
  }

  getStatusLabel(status) {
    const labels = {
      active: 'Aktivan',
      suspended: 'Suspendovan',
      inactive: 'Neaktivan',
    };
    return labels[status] || status;
  }

  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('sr-RS', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  bindEvents() {
    // Tab switching
    this.on('click', '.tab[data-tab]', async e => {
      this.activeTab = e.delegateTarget.dataset.tab;
      this.showForm = false;
      if (this.activeTab === 'access') await this.loadAccess();
      this.render();
    });

    // Access log: refresh
    this.on('click', '[data-action="refresh-access"]', async () => {
      await this.loadAccess();
      this.render();
      this.admin.toastContainer?.success('Pristup log osvežen');
    });

    // Access log: export CSV
    this.on('click', '[data-action="export-access"]', () => {
      if (!this.accessEntries.length) {
        this.admin.toastContainer?.error('Nema podataka za izvoz');
        return;
      }
      const header = 'Zaposleni,Uloga,Prijava,Odjava,Trajanje,IP,Uredjaj,OS,Pregledac';
      const lines = this.accessEntries.map(e =>
        [
          e.name,
          e.role,
          e.at || '',
          e.logoutAt || '',
          e.durationMs ? Math.round(e.durationMs / 1000) + 's' : '',
          e.ip || '',
          e.device || '',
          e.os || '',
          e.browser || '',
        ]
          .map(v => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`)
          .join(',')
      );
      const csv = [header, ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dalli-pristup-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.admin.toastContainer?.success('CSV izvezen');
    });

    // Access log: clear local cache
    this.on('click', '[data-action="clear-access"]', () => {
      accessLog.clearLocal();
      this.accessEntries = [];
      this.render();
      this.admin.toastContainer?.success('Lokalni log obrisan');
    });

    // Add employee
    this.on('click', '[data-action="add-employee"]', () => {
      this.showForm = true;
      this.editingEmployee = null;
      this.formData = {
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'employee',
        status: 'active',
        permissions: {},
      };
      this.render();
    });

    // Edit employee
    this.on('click', '[data-action="edit-employee"]', e => {
      const id = e.delegateTarget.dataset.id;
      const emp = this.employees.find(e => e.id === id);
      if (emp) {
        this.editingEmployee = emp;
        this.showForm = true;
        this.formData = { ...emp, password: '', confirmPassword: '' };
        this.render();
      }
    });

    // Toggle status
    this.on('click', '[data-action="toggle-status"]', async e => {
      const id = e.delegateTarget.dataset.id;
      const emp = this.employees.find(emp => emp.id === id);
      if (emp) {
        emp.status = emp.status === 'active' ? 'suspended' : 'active';
        await this.saveEmployee(emp);
        this.render();
        const message =
          emp.status === 'active' ? this.t('employees.activated') : this.t('employees.suspended');
        this.admin.toastContainer?.success(`${this.t('employees.title')} ${message}`);
      }
    });

    // Delete employee
    this.on('click', '[data-action="delete-employee"]', async e => {
      const id = e.delegateTarget.dataset.id;
      const confirmed = await window.ModalManager?.confirm({
        title: 'Brisanje zaposlenog',
        message:
          'Da li ste sigurni da želite da obrišete ovog zaposlenog? Ova akcija se ne može poništiti.',
        confirmText: 'Obriši',
        cancelText: 'Otkaži',
        variant: 'danger',
      });
      if (!confirmed) return;
      this.employees = this.employees.filter(emp => emp.id !== id);
      await this.saveEmployees();
      this.render();
      this.admin.toastContainer?.success('Zaposleni obrisan');
    });

    // Form submit
    this.on('submit', '#employeeForm', async e => {
      e.preventDefault();
      if (this.submitting) return;

      const form = e.target;
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Validation
      if (!data.firstName || !data.lastName || !data.email || !data.username) {
        this.admin.toastContainer?.error('Popunite sva obavezna polja');
        return;
      }

      // Email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        this.admin.toastContainer?.error('Nevalidan email format');
        return;
      }

      // Username format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) {
        this.admin.toastContainer?.error('Korisničko ime: 3-20 karaktera, samo slova, brojevi, _');
        return;
      }

      // Check unique email/username (excluding current employee)
      const existingEmail = this.employees.find(
        e => e.email === data.email && e.id !== this.editingEmployee?.id
      );
      if (existingEmail) {
        this.admin.toastContainer?.error('Email je već u upotrebi');
        return;
      }
      const existingUsername = this.employees.find(
        e => e.username === data.username && e.id !== this.editingEmployee?.id
      );
      if (existingUsername) {
        this.admin.toastContainer?.error('Korisničko ime je već u upotrebi');
        return;
      }

      // Password validation for new employees
      if (!this.editingEmployee) {
        if (data.password !== data.confirmPassword) {
          this.admin.toastContainer?.error('Lozinke se ne poklapaju');
          return;
        }
        if (data.password.length < 8) {
          this.admin.toastContainer?.error('Lozinka mora imati minimum 8 karaktera');
          return;
        }
        if (
          !/[A-Z]/.test(data.password) ||
          !/[a-z]/.test(data.password) ||
          !/[0-9]/.test(data.password) ||
          !/[^A-Za-z0-9]/.test(data.password)
        ) {
          this.admin.toastContainer?.error(
            'Lozinka mora sadržati: veliko slovo, malo slovo, broj, specijalni karakter'
          );
          return;
        }
      } else if (data.password && data.password.length > 0) {
        // Editing existing - password optional, but if provided, validate
        if (data.password.length < 8) {
          this.admin.toastContainer?.error('Lozinka mora imati minimum 8 karaktera');
          return;
        }
        if (
          !/[A-Z]/.test(data.password) ||
          !/[a-z]/.test(data.password) ||
          !/[0-9]/.test(data.password) ||
          !/[^A-Za-z0-9]/.test(data.password)
        ) {
          this.admin.toastContainer?.error(
            'Lozinka mora sadržati: veliko slovo, malo slovo, broj, specijalni karakter'
          );
          return;
        }
      }

      // Parse permissions from checkboxes
      const permissions = {};
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('perm_')) {
          const permKey = key.replace('perm_', '');
          permissions[permKey] = true;
        }
      }

      const employeeData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        username: data.username,
        role: data.role,
        status: data.status,
        permissions,
      };

      if (data.password && data.password.length > 0) {
        employeeData.password = data.password;
      }

      try {
        this.submitting = true;
        this.render(); // Re-render to show loading state

        if (this.editingEmployee) {
          // Update existing
          const index = this.employees.findIndex(emp => emp.id === this.editingEmployee.id);
          if (index !== -1) {
            this.employees[index] = { ...this.employees[index], ...employeeData };
            await this.saveEmployees();
            this.admin.toastContainer?.success('Zaposleni ažuriran');
          }
        } else {
          // Add new
          const newEmp = {
            id: 'EMP-' + Date.now().toString(36).toUpperCase(),
            ...employeeData,
            createdAt: new Date().toISOString(),
            createdBy: this.getCurrentUserId(),
            lastLogin: null,
          };
          this.employees.push(newEmp);
          await this.saveEmployees();
          this.admin.toastContainer?.success('Zaposleni dodat');
        }

        this.showForm = false;
        this.editingEmployee = null;
        this.formData = {};
        this.render();
      } catch (error) {
        this.admin.toastContainer?.error('Greška: ' + error.message);
        this.submitting = false;
        this.render();
      }
    });

    // Role change handler - update permissions preset
    this.on('roleChange', '#employeeForm', e => {
      const select = e.target;
      const newRole = select.value;
      this.formData.role = newRole;
      // Apply role-based permissions preset
      this.formData.permissions = { ...this.rolePermissions[newRole] };
      this.render();
    });

    // Close form
    this.on('click', '[data-action="close-form"]', () => {
      this.showForm = false;
      this.editingEmployee = null;
      this.formData = {
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'employee',
        status: 'active',
        permissions: {},
      };
      this.render();
    });

    // Search
    this.on('input', '.search-input', e => {
      this.searchQuery = e.target.value.toLowerCase();
      if (this.activeTab === 'list') this.render();
    });

    // Filters
    this.on('change', '[data-filter]', () => {
      if (this.activeTab === 'list') this.render();
    });

    // Modal overlay click close
    this.on('click', '.employee-form-overlay', e => {
      if (e.target === e.currentTarget) {
        this.showForm = false;
        this.editingEmployee = null;
        this.formData = {
          firstName: '',
          lastName: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          role: 'employee',
          status: 'active',
          permissions: {},
        };
        this.render();
      }
    });

    // Search input
    this.on('input', '.search-input', e => {
      this.searchQuery = e.target.value.toLowerCase();
      if (this.activeTab === 'list') this.render();
    });

    // Filters
    this.on('change', '[data-filter]', () => {
      if (this.activeTab === 'list') this.render();
    });
  }

  async saveEmployee(emp) {
    try {
      await this.api.update(emp.id, emp);
    } catch {
      // Fallback to localStorage
      this.saveLocalEmployees(this.employees);
    }
  }

  async saveEmployees() {
    try {
      await this.api.saveAll(this.employees);
    } catch {
      this.saveLocalEmployees(this.employees);
    }
  }

  getCurrentUserId() {
    return localStorage.getItem('dalli_admin_employee_id') || 'EMP-001';
  }
}
