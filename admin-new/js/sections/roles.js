import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';

export class RolesSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.users;
    this.permissions = [
      { key: 'view_dashboard', label: 'Pregled Dashboard', category: 'Dashboard' },
      { key: 'view_orders', label: 'Pregled Porudžbina', category: 'Porudžbine' },
      { key: 'manage_orders', label: 'Upravljanje Porudžbinama', category: 'Porudžbine' },
      { key: 'view_products', label: 'Pregled Proizvoda', category: 'Proizvodi' },
      { key: 'manage_products', label: 'Upravljanje Proizvodima', category: 'Proizvodi' },
      { key: 'manage_inventory', label: 'Upravljanje Inventarom', category: 'Inventar' },
      { key: 'view_customers', label: 'Pregled Kupaca', category: 'Kupci' },
      { key: 'manage_customers', label: 'Upravljanje Kupcima', category: 'Kupci' },
      { key: 'view_reviews', label: 'Pregled Recenzija', category: 'Recenzije' },
      { key: 'moderate_reviews', label: 'Moderacija Recenzija', category: 'Recenzije' },
      { key: 'view_promotions', label: 'Pregled Promocija', category: 'Marketing' },
      { key: 'manage_promotions', label: 'Upravljanje Promocijama', category: 'Marketing' },
      { key: 'manage_campaigns', label: 'Upravljanje Kampanjama', category: 'Marketing' },
      { key: 'view_analytics', label: 'Pregled Analitike', category: 'Analitika' },
      { key: 'view_financials', label: 'Pregled Finansija', category: 'Analitika' },
      { key: 'view_seo', label: 'Pregled SEO', category: 'SEO' },
      { key: 'manage_seo', label: 'Upravljanje SEO', category: 'SEO' },
      { key: 'view_diagnostics', label: 'Pregled Dijagnostike', category: 'Sistem' },
      { key: 'manage_settings', label: 'Upravljanje Postavkama', category: 'Sistem' },
      { key: 'manage_roles', label: 'Upravljanje Ulogama', category: 'Sistem' },
      { key: 'manage_users', label: 'Upravljanje Korisnicima', category: 'Sistem' },
      { key: 'experienceCenter', label: 'Experience Center', category: 'Sistem' }
    ];

    this.roles = [];
    this.users = [];
    this.t = this.admin?.t || ((key) => key);
  }

  async onEnter() {
    await this.loadData();
    this.render();
  }

  async loadData() {
    try {
      const [roles, users] = await Promise.all([
        this.api.getRoles(),
        this.api.list({ limit: 50 })
      ]);
      this.roles = roles;
      this.users = users;
    } catch (error) {
      console.warn('[Roles] API failed, falling back to mock data:', error);
      this.roles = this.generateMockRoles();
      this.users = this.generateMockUsers();
    }
  }

  generateMockRoles() {
    return [
      { id: 'vlasnik', name: 'vlasnik', description: 'Pun pristup svim funkcionalnostima', system: true, permissions: this.permissions.map(p => p.key), userCount: 1, color: 'danger' },
      { id: 'admin', name: 'Admin', description: 'Upravljanje prodavnicom bez sistemskih postavki', system: true, permissions: this.permissions.filter(p => !['manage_settings', 'manage_roles', 'manage_users', 'experienceCenter'].includes(p.key)).map(p => p.key), userCount: 2, color: 'primary' },
      { id: 'manager', name: 'Menadžer', description: 'Operativno upravljanje prodavnicom', system: true, permissions: ['view_dashboard', 'view_orders', 'manage_orders', 'view_products', 'manage_products', 'manage_inventory', 'view_customers', 'view_reviews', 'moderate_reviews', 'view_promotions', 'manage_promotions', 'view_analytics', 'view_seo', 'manage_seo'], userCount: 3, color: 'info' },
      { id: 'accountant', name: 'Knjižigovodstveni', description: 'Pristup finansijskim podacima', system: true, permissions: ['view_dashboard', 'view_orders', 'view_analytics', 'view_financials', 'view_customers'], userCount: 1, color: 'success' },
      { id: 'support', name: 'Podrška', description: 'Komunikacija sa kupcima', system: false, permissions: ['view_dashboard', 'view_orders', 'view_customers', 'view_reviews', 'moderate_reviews'], userCount: 2, color: 'warning' },
      { id: 'content_manager', name: 'Content Manager', description: 'Upravljanje sadržajem i SEO', system: false, permissions: ['view_dashboard', 'view_products', 'manage_products', 'view_promotions', 'manage_promotions', 'view_seo', 'manage_seo', 'view_analytics'], userCount: 1, color: 'info' },
      { id: 'custom_1', name: 'Regionalni Menadžer', description: 'Upravljanje specifičnom regijom', system: false, permissions: ['view_dashboard', 'view_orders', 'manage_orders', 'view_products', 'view_customers', 'view_analytics'], userCount: 2, color: 'primary' }
    ];

    this.users = [
      { id: 'USR-001', name: 'Marko Petrović', email: 'marko@dalli.rs', role: 'vlasnik', status: 'active' },
      { id: 'USR-002', name: 'Ana Jovanović', email: 'ana@dalli.rs', role: 'admin', status: 'active' },
      { id: 'USR-003', name: 'Nikola Đorđević', email: 'nikola@dalli.rs', role: 'manager', status: 'active' },
      { id: 'USR-004', name: 'Jelena Stanković', email: 'jelena@dalli.rs', role: 'manager', status: 'active' },
      { id: 'USR-005', name: 'Stefan Milošević', email: 'stefan@dalli.rs', role: 'accountant', status: 'active' },
      { id: 'USR-006', name: 'Milica Radović', email: 'milica@dalli.rs', role: 'support', status: 'active' },
      { id: 'USR-007', name: 'Aleksandar Vuković', email: 'aleksandar@dalli.rs', role: 'support', status: 'inactive' },
      { id: 'USR-008', name: 'Sara Pavlović', email: 'sara@dalli.rs', role: 'content_manager', status: 'active' },
      { id: 'USR-009', name: 'Petar Nikolić', email: 'petar@dalli.rs', role: 'custom_1', status: 'active' },
      { id: 'USR-010', name: 'Marija Ilić', email: 'marija@dalli.rs', role: 'custom_1', status: 'active' }
    ];
  }

  generateMockUsers() {
    return [
      { id: 'USR-001', name: 'Marko Petrović', email: 'marko@dalli.rs', role: 'vlasnik', status: 'active' },
      { id: 'USR-002', name: 'Ana Jovanović', email: 'ana@dalli.rs', role: 'admin', status: 'active' },
      { id: 'USR-003', name: 'Nikola Đorđević', email: 'nikola@dalli.rs', role: 'manager', status: 'active' },
      { id: 'USR-004', name: 'Jelena Stanković', email: 'jelena@dalli.rs', role: 'manager', status: 'active' },
      { id: 'USR-005', name: 'Stefan Milošević', email: 'stefan@dalli.rs', role: 'accountant', status: 'active' },
      { id: 'USR-006', name: 'Milica Radović', email: 'milica@dalli.rs', role: 'support', status: 'active' },
      { id: 'USR-007', name: 'Aleksandar Vuković', email: 'aleksandar@dalli.rs', role: 'support', status: 'inactive' },
      { id: 'USR-008', name: 'Sara Pavlović', email: 'sara@dalli.rs', role: 'content_manager', status: 'active' },
      { id: 'USR-009', name: 'Petar Nikolić', email: 'petar@dalli.rs', role: 'custom_1', status: 'active' },
      { id: 'USR-010', name: 'Teodora Stojanović', email: 'teodora@dalli.rs', role: 'custom_1', status: 'pending' }
    ];
  }

  render() {
    this.bindEvents();
    return `
      <div class="roles-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.t('roles.title')}</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">${this.t('roles.subtitle')}</p>
          </div>
          <button class="btn btn-primary" data-action="create-role">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${this.t('roles.createRole')}
          </button>
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">${this.t('roles.title')}</h3>
        <div class="data-grid" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: var(--space-5); margin-bottom: var(--space-6);">
          ${this.roles.map(r => `
            <div class="role-card">
              <div class="role-header">
                <div class="role-icon" style="background: linear-gradient(135deg, var(--color-${r.color}), var(--color-${r.color}-dark));">${this.getRoleIcon(r.id)}</div>
                <div class="role-info">
                  <div class="role-name">${r.name} ${r.system ? '<span class="badge badge-primary" style="font-size: var(--text-2xs); margin-left: var(--space-2);">Sistem</span>' : ''}</div>
                  <div class="role-desc">${r.description}</div>
                </div>
                <span class="role-badge ${r.system ? 'system' : 'custom'}">${r.system ? this.t('roles.systemRole') : this.t('roles.customRole')}</span>
              </div>
              <div class="role-stats">
                <div class="role-stat"><span class="role-stat-label">${this.t('roles.permissions')}</span><span class="role-stat-value">${r.permissions.length}</span></div>
                <div class="role-stat"><span class="role-stat-label">${this.t('roles.users')}</span><span class="role-stat-value">${r.userCount}</span></div>
              </div>
              <div class="role-actions">
                <button class="btn btn-sm btn-secondary" data-action="edit-role" data-id="${r.id}">${this.t('roles.actions.editPermissions')}</button>
                ${!r.system ? `<button class="btn btn-sm btn-danger" data-action="delete-role" data-id="${r.id}">${this.t('roles.actions.deleteRole')}</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">${this.t('roles.permissionMatrix')}</h3>
        <div class="permissions-matrix" style="overflow-x: auto; margin-bottom: var(--space-6);">
          <table class="table permissions-table" style="min-width: 1000px;">
            <thead>
              <tr>
                <th scope="col" style="position: sticky; left: 0; background: var(--color-bg-card); z-index: 3; width: 280px;">${this.t('roles.permissionRoleHeader')}</th>
                ${this.roles.map(r => `<th scope="col" style="position: sticky; top: 0; z-index: 2; text-align: center; min-width: 100px;">${r.name}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${this.renderPermissionsMatrix()}
            </tbody>
          </table>
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">${this.t('roles.usersAndRoles')}</h3>
        <div class="table-container">
          <table class="table users-table">
            <thead><tr><th scope="col" style="width: 100px;">${this.t('roles.table.id')}</th><th scope="col">${this.t('roles.table.user')}</th><th scope="col" style="width: 200px;">${this.t('roles.table.email')}</th><th scope="col" style="width: 150px;">${this.t('roles.table.role')}</th><th scope="col" style="width: 100px;">${this.t('roles.table.status')}</th><th scope="col" style="width: 140px;">${this.t('roles.table.actions')}</th></tr></thead>
            <tbody>
              ${this.users.map(u => `
                <tr>
                  <td class="cell-secondary">${u.id}</td>
                  <td><div class="cell-primary">${ImperiumUtils.escapeHtml(u.name)}</div></td>
                  <td class="cell-secondary">${ImperiumUtils.escapeHtml(u.email)}</td>
                  <td><select class="input-field select-field user-role-select" data-user-id="${u.id}" style="width: auto;">${this.roles.map(r => `<option value="${r.id}" ${r.id === u.role ? 'selected' : ''}>${r.name}</option>`).join('')}</select></td>
                  <td><span class="badge badge-${u.status === 'active' ? 'success' : 'warning'}">${u.status === 'active' ? 'Aktivan' : 'Neaktivan'}</span></td>
                  <td><button class="btn btn-sm btn-secondary" data-action="view-user" data-id="${u.id}">Detalji</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin: var(--space-6) 0 var(--space-4);">${this.t('roles.auditLog.title')}</h3>
        <div class="audit-log" style="display: flex; flex-direction: column; gap: var(--space-2); max-height: 300px; overflow-y: auto;">
          ${[
            { time: '14:32:15', user: 'admin@dalli.rs', action: this.t('roles.auditLog.action'), details: 'Korisnik USR-004 dodeljena uloga manager' },
            { time: '14:28:45', user: 'admin@dalli.rs', action: this.t('roles.auditLog.action'), details: 'Uloga manager: dodata dozvola manage_promotions' },
            { time: '14:20:00', user: 'admin@dalli.rs', action: this.t('roles.auditLog.action'), details: 'Kreirana prilagođena uloga "Regionalni Menadžer"' },
            { time: '14:15:33', user: 'vlasnik@dalli.rs', action: this.t('roles.auditLog.action'), details: 'Korisnik USR-007 promenjen iz support u inactive' }
          ].map(a => `
            <div class="audit-log-entry">
              <span class="audit-log-time">${a.time}</span>
              <span class="audit-log-user">${a.user}</span>
              <span class="audit-log-action">${a.action}</span>
              <span class="audit-log-details">${a.details}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderPermissionsMatrix() {
    const categories = [...new Set(this.permissions.map(p => p.category))];
    return categories.map(cat => {
      const perms = this.permissions.filter(p => p.category === cat);
      return `
        <tr class="permission-category"><td colspan="${1 + this.roles.length}">${cat}</td></tr>
        ${perms.map(p => `
          <tr>
            <td style="position: sticky; left: 0; background: var(--color-bg-card); font-weight: var(--font-medium); color: var(--color-text-primary); z-index: 1; padding: var(--space-3) var(--space-4);">${p.label}</td>
            ${this.roles.map(r => `
              <td class="permission-cell" style="text-align: center;">
                <div class="permission-toggle ${r.permissions.includes(p.key) ? 'granted' : 'denied'}" data-role="${r.id}" data-permission="${p.key}" title="${r.permissions.includes(p.key) ? this.t('roles.actions.grantPermission') : this.t('roles.actions.revokePermission')}">
                  ${r.permissions.includes(p.key) ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
                </div>
              </td>
            `).join('')}
          </tr>
        `).join('')}
      `;
    }).join('');
  }

  getRoleIcon(roleId) {
    const icons = {
      vlasnik: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
      admin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
      manager: '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20V16"/>',
      accountant: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      support: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      content_manager: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
      custom_1: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>'
    };
    return icons[roleId] || icons.vlasnik;
  }

  bindEvents() {
    this.delegate('click', '[data-action="create-role"]', () => this.openRoleModal('create'));
    this.delegate('click', '[data-action="edit-role"]', (e, target) => this.openRoleModal('edit', target.dataset.id));
    this.delegate('click', '[data-action="delete-role"]', async (e, target) => {
      const id = target.dataset.id;
      const confirmed = await this.confirm(this.t('roles.form.confirmDelete'), { title: this.t('roles.form.deleteTitle'), variant: 'danger' });
      if (confirmed) {
        this.roles = this.roles.filter(r => r.id !== id);
        this.render();
        this.admin.success(this.t('roles.form.deleted'));
      }
    });

    this.delegate('change', '.user-role-select', async (e, target) => {
      const userId = target.dataset.userId;
      const newRole = target.value;
      const user = this.users.find(u => u.id === userId);
      if (user && user.role !== newRole) {
        const confirmed = await this.confirm(this.t('roles.form.confirmChange', { name: user.name, role: this.roles.find(r => r.id === newRole)?.name }));
        if (confirmed) {
          user.role = newRole;
          this.admin.success(this.t('roles.form.roleChangedSuccess'));
        } else {
          target.value = user.role;
        }
      }
    });

    this.delegate('click', '.permission-toggle', (e, target) => {
      const roleId = target.dataset.role;
      const permKey = target.dataset.permission;
      const role = this.roles.find(r => r.id === roleId);
      if (role && !this.roles.find(r => r.id === roleId && r.system)) {
        const idx = role.permissions.indexOf(permKey);
        if (idx > -1) role.permissions.splice(idx, 1);
        else role.permissions.push(permKey);
        this.render();
        const action = idx > -1 ? this.t('roles.actions.revokePermission') : this.t('roles.actions.grantPermission');
        this.admin.success(`${action} za ${role.name}`);
      }
    });
  }

  openRoleModal(mode, id = null) {
    const role = id ? this.roles.find(r => r.id === id) : null;
    const isEdit = mode === 'edit';

    this.admin.openModal({
      title: isEdit ? this.t('roles.form.editTitle', { name: role.name }) : this.t('roles.form.addTitle'),
      size: 'lg',
      content: `
        <form id="roleForm" class="role-form">
          <div class="form-section">
            <h3 class="form-section-title">${this.t('roles.form.basicInfo')}</h3>
            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label class="input-label">${this.t('roles.form.nameRequired')}</label>
                <input type="text" class="input-field" name="name" required 
                  value="${role ? ImperiumUtils.escapeHtml(role.name) : ''}" 
                  placeholder="${this.t('roles.form.namePlaceholder')}">
              </div>
              <div class="form-group" style="min-width: 150px;">
                <label class="input-label">${this.t('roles.form.idLabel')}</label>
                <input type="text" class="input-field" name="id" 
                  value="${role ? role.id : 'custom_' + Date.now().toString(36).toUpperCase()}" 
                  ${isEdit ? 'readonly' : ''} placeholder="${this.t('roles.form.idPlaceholder')}">
              </div>
            </div>
            <div class="form-group">
              <label class="input-label">${this.t('roles.form.description')}</label>
              <textarea class="input-field textarea-field" name="description" rows="3" 
                placeholder="${this.t('roles.form.descriptionPlaceholder')}">${role ? (role.description || '') : ''}</textarea>
            </div>
            <div class="form-group">
              <label class="input-label">${this.t('roles.form.colorLabel')}</label>
              <select class="input-field select-field" name="color">
                <option value="primary" ${role && role.color === 'primary' ? 'selected' : ''}>${this.t('roles.primary')}</option>
                <option value="success" ${role && role.color === 'success' ? 'selected' : ''}>${this.t('roles.success')}</option>
                <option value="warning" ${role && role.color === 'warning' ? 'selected' : ''}>${this.t('roles.warning')}</option>
                <option value="info" ${role && role.color === 'info' ? 'selected' : ''}>${this.t('roles.info')}</option>
                <option value="error" ${role && role.color === 'error' ? 'selected' : ''}>${this.t('roles.danger')}</option>
                <option value="accent" ${role && role.color === 'accent' ? 'selected' : ''}>${this.t('roles.accent')}</option>
              </select>
            </div>
          </div>

          <div class="form-section">
            <h3 class="form-section-title">${this.t('roles.form.permissions')}</h3>
            <p class="form-hint" style="margin-bottom: var(--space-4);">${this.t('roles.form.permissionsHint')}</p>
            <div class="permissions-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3); max-height: 400px; overflow-y: auto;">
              ${this.permissions.map(p => `
                <label class="permission-checkbox" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary); border-radius: var(--radius-md); cursor: pointer; transition: background var(--transition-fast);">
                  <input type="checkbox" name="permissions" value="${p.key}" ${role && role.permissions?.includes(p.key) ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-primary);">
                  <span style="font-size: var(--text-sm); color: var(--color-text-primary);">${p.label}</span>
                  <span class="permission-category-tag" style="margin-left: auto; font-size: var(--text-2xs); color: var(--color-text-tertiary); background: var(--color-bg-tertiary); padding: 2px 8px; border-radius: var(--radius-full);">${p.category}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-section">
            <h3 class="form-section-title">${this.t('roles.form.statusLabel')}</h3>
            <div class="form-group">
              <label class="input-label">${this.t('roles.form.statusLabel')}</label>
              <select class="input-field select-field" name="status">
                <option value="active" ${role && role.status === 'active' ? 'selected' : ''}>${this.t('roles.form.active')}</option>
                <option value="inactive" ${role && role.status === 'inactive' ? 'selected' : ''}>${this.t('roles.form.inactive')}</option>
              </select>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">${this.t('roles.form.cancel')}</button>
        <button class="btn btn-primary" data-action="save-role" ${role ? `data-id="${role.id}"` : ''}>${isEdit ? this.t('roles.form.saveChanges') : this.t('roles.form.createRole')}</button>
      `,
      onOpen: () => this.bindRoleFormEvents(mode, id)
    });
  }

  bindRoleFormEvents(mode, id) {
    const isEdit = mode === 'edit';
    const role = id ? this.roles.find(r => r.id === id) : null;

    // Save role
    this.delegate('click', '[data-action="save-role"]', async (e, btn) => {
      const form = document.getElementById('roleForm');
      if (!form) return;

      btn.disabled = true;
      btn.textContent = this.t('roles.form.saving');

      const formData = new FormData(form);
      const permissions = [];
      form.querySelectorAll('[name="permissions"]:checked').forEach(cb => {
        permissions.push(cb.value);
      });

      const roleData = {
        id: formData.get('id'),
        name: formData.get('name'),
        description: formData.get('description'),
        color: formData.get('color'),
        permissions,
        status: formData.get('status')
      };

      if (isEdit) {
        const idx = this.roles.findIndex(r => r.id === id);
        if (idx !== -1) this.roles[idx] = { ...this.roles[idx], ...roleData };
      } else {
        this.roles.unshift({ ...roleData, system: false, createdAt: new Date().toISOString() });
      }

      this.render();
      this.modal.close();
      this.admin.success(isEdit ? this.t('roles.form.saved') : this.t('roles.form.created'));
    });
  }
}