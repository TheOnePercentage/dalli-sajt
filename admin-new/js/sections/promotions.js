import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';

export class PromotionsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.promotions;
    this.promotions = [];
    this.filter = { status: 'all', type: 'all', search: '' };
  }

  async onEnter() {
    await this.loadPromotions();
    this.render();
  }

  async loadPromotions() {
    try {
      this.promotions = await this.api.list(this.filter);
    } catch (error) {
      console.warn('[Promotions] API failed, falling back to mock data:', error);
      this.promotions = this.generateMockPromotions();
    }
  }

  generateMockPromotions() {
    return [
      { id: 'PROM-001', code: 'WELCOME10', type: 'coupon', title: 'Dobrodošlica 10%', discount: '10%', minOrder: 3000, usage: 245, limit: 1000, status: 'active', startDate: '2024-01-01', endDate: '2024-12-31' },
      { id: 'PROM-002', code: 'FLASH20', type: 'flash', title: 'Flash Sale 20%', discount: '20%', minOrder: 5000, usage: 89, limit: 200, status: 'active', startDate: '2024-12-01', endDate: '2024-12-07' },
      { id: 'PROM-003', code: 'BUNDLE15', type: 'bundle', title: 'Paket 2+1 Gratis', discount: 'Buy 2 Get 1 Free', minOrder: 0, usage: 156, limit: 500, status: 'active', startDate: '2024-11-01', endDate: '2024-12-31' },
      { id: 'PROM-004', code: 'FREESHIP', type: 'free_shipping', title: 'Besplatna Dostava', discount: 'Free Shipping', minOrder: 8000, usage: 423, limit: null, status: 'active', startDate: '2024-01-01', endDate: '2024-12-31' },
      { id: 'PROM-005', code: 'VIP25', type: 'coupon', title: 'VIP 25% Popust', discount: '25%', minOrder: 15000, usage: 34, limit: 50, status: 'scheduled', startDate: '2025-01-01', endDate: '2025-01-31' },
      { id: 'PROM-006', code: 'OLD20', type: 'coupon', title: 'Stari 20% Kod', discount: '20%', minOrder: 5000, usage: 500, limit: 500, status: 'expired', startDate: '2023-11-01', endDate: '2023-11-30' }
    ];
  }

  render() {
    this.bindEvents();
    return `
      <div class="promotions-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Promocije</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Upravljajte kuponima, flash prodajama i promocijama.</p>
          </div>
          <button class="btn btn-primary" data-action="create-promotion">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Promocija
          </button>
        </div>

        <div class="card" style="margin-bottom: var(--space-5);">
          <div class="card-body" style="padding: var(--space-4) var(--space-5);">
            <div class="search-filters" style="display: flex; flex-wrap: wrap; gap: var(--space-3);">
              <div class="form-group" style="flex: 1; min-width: 200px;"><label class="input-label">Pretraga</label><input type="text" class="input-field" placeholder="Kod, naziv..." value="${this.filter.search}" data-filter="search"></div>
              <div class="form-group" style="min-width: 160px;"><label class="input-label">Status</label><select class="input-field select-field" data-filter="status"><option value="all" ${this.filter.status === 'all' ? 'selected' : ''}>Svi</option><option value="active" ${this.filter.status === 'active' ? 'selected' : ''}>Aktivne</option><option value="scheduled" ${this.filter.status === 'scheduled' ? 'selected' : ''}>Zakazane</option><option value="expired" ${this.filter.status === 'expired' ? 'selected' : ''}>Istekle</option></select></div>
              <div class="form-group" style="min-width: 160px;"><label class="input-label">Tip</label><select class="input-field select-field" data-filter="type"><option value="all" ${this.filter.type === 'all' ? 'selected' : ''}>Svi</option><option value="coupon" ${this.filter.type === 'coupon' ? 'selected' : ''}>Kupon</option><option value="flash" ${this.filter.type === 'flash' ? 'selected' : ''}>Flash Sale</option><option value="bundle" ${this.filter.type === 'bundle' ? 'selected' : ''}>Paket</option><option value="free_shipping" ${this.filter.type === 'free_shipping' ? 'selected' : ''}>Besplatna Dostava</option></select></div>
              <div class="form-group"><button class="btn btn-secondary" data-action="clear-filters">Očisti</button></div>
            </div>
          </div>
        </div>

        <div class="data-grid" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: var(--space-5);">
          ${this.promotions.map(p => `
            <div class="promo-card">
              <div class="promo-card-header">
                <div class="promo-code">${p.code}</div>
                <span class="promo-type promo-type-${p.type}">${this.getTypeLabel(p.type)}</span>
              </div>
              <h4 style="margin-bottom: var(--space-3);">${ImperiumUtils.escapeHtml(p.title)}</div>
              <div class="promo-details">
                <div class="promo-detail"><div class="promo-detail-label">Popust</div><div class="promo-detail-value">${p.discount}</div></div>
                <div class="promo-detail"><div class="promo-detail-label">Min. Porudžbina</div><div class="promo-detail-value">${p.minOrder ? ImperiumUtils.formatCurrency(p.minOrder) : 'Bez minimum'}</div></div>
                <div class="promo-detail"><div class="promo-detail-label">Iskorišćenost</div><div class="promo-detail-value">${p.limit ? p.usage + '/' + p.limit : p.usage + ' / ∞'}</div></div>
                <div class="promo-detail"><div class="promo-detail-label">Status</div><div class="promo-detail-value"><span class="badge badge-${p.status === 'active' ? 'success' : p.status === 'scheduled' ? 'info' : p.status === 'expired' ? 'danger' : 'warning'}">${this.getStatusLabel(p.status)}</span></div></div>
              </div>
              <div class="usage-bar" style="margin-top: var(--space-3);"><div class="usage-bar-fill" style="width: ${p.limit ? Math.min(100, (p.usage / p.limit) * 100) : 0}%"></div></div>
              <div class="promo-actions">
                <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${p.id}">Izmeni</button>
                <button class="btn btn-sm btn-${p.status === 'active' ? 'warning' : 'secondary'}" data-action="${p.status === 'active' ? 'pause' : p.status === 'scheduled' ? 'activate' : 'view'}" data-id="${p.id}">${p.status === 'active' ? 'Pauziraj' : p.status === 'scheduled' ? 'Aktiviraj' : 'Detalji'}</button>
                <button class="btn btn-sm btn-danger" data-action="delete" data-id="${p.id}">Obriši</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getTypeLabel(type) {
    const labels = { coupon: 'Kupon', flash: 'Flash Sale', bundle: 'Paket', free_shipping: 'Besplatna Dostava' };
    return labels[type] || type;
  }

  getStatusLabel(status) {
    const labels = { active: 'Aktivna', scheduled: 'Zakazana', expired: 'Istekla', paused: 'Pauzirana', draft: 'Načrt' };
    return labels[status] || status;
  }

  bindEvents() {
    this.on('change', '[data-filter]', (e) => {
      this.filter[e.target.dataset.filter] = e.target.value;
      this.render();
    });
    this.on('click', '[data-action="clear-filters"]', () => {
      this.filter = { status: 'all', type: 'all', search: '' };
      this.render();
    });
    this.on('click', '[data-action="create-promotion"]', () => this.openCreateModal());
    this.on('click', '[data-action="edit"]', (e) => this.openEditModal(e.delegateTarget.dataset.id));
    this.on('click', '[data-action="delete"]', async (e) => {
      const id = e.delegateTarget.dataset.id;
      const confirmed = await this.confirm('Obrišati promociju?', { title: 'Brisanje promocije', variant: 'danger' });
      if (confirmed) {
        this.promotions = this.promotions.filter(p => p.id !== id);
        this.render();
        this.admin.success('Promocija obrisana');
      }
    });
    this.on('click', '[data-action="pause"]', (e) => {
      const p = this.promotions.find(p => p.id === e.delegateTarget.dataset.id);
      if (p) { p.status = 'paused'; this.render(); this.admin.success(this.t('promotions.paused')); }
    });
    this.on('click', '[data-action="activate"]', (e) => {
      const p = this.promotions.find(p => p.id === e.delegateTarget.dataset.id);
      if (p) { p.status = 'active'; this.render(); this.admin.success(this.t('promotions.activated')); }
    });
  }

  openCreateModal() {
    this.admin.openModal({
      title: 'Nova Promocija',
      size: 'lg',
      content: `
        <form class="promo-form" id="promoForm">
          <div class="form-section"><h3 class="form-section-title">Osnovni Podaci</h3>
            <div class="form-row">
              <div class="form-group" style="flex: 1;"><label class="input-label">Naziv *</label><input type="text" class="input-field" name="title" required placeholder="Npr. Zimska Promocija 20%"></div>
              <div class="form-group" style="min-width: 150px;"><label class="input-label">Kod *</label><input type="text" class="input-field" name="code" required placeholder="Npr. WINTER20" style="text-transform: uppercase;"></div>
            </div>
            <div class="form-row">
              <div class="form-group" style="min-width: 180px;"><label class="input-label">Tip *</label><select class="input-field select-field" name="type" required><option value="coupon">Kupon</option><option value="flash">Flash Sale</option><option value="bundle">Paket</option><option value="free_shipping">Besplatna Dostava</option></select></div>
              <div class="form-group" style="min-width: 180px;"><label class="input-label">Status *</label><select class="input-field select-field" name="status" required><option value="draft">Načrt</option><option value="active">Aktivna</option><option value="scheduled">Zakazana</option></select></div>
            </div>
          </div>
          <div class="form-section"><h3 class="form-section-title">Popust</h3>
            <div class="form-row">
              <div class="form-group" style="flex: 1;"><label class="input-label">Vrednost Popusta *</label><input type="text" class="input-field" name="discount" required placeholder="Npr. 20% ili Buy 2 Get 1 Free"></div>
              <div class="form-group" style="min-width: 180px;"><label class="input-label">Min. Iznos Porudžbine</label><input type="number" class="input-field" name="minOrder" value="0" min="0" step="100"></div>
            </div>
          </div>
          <div class="form-section"><h3 class="form-section-title">Ograničenja</h3>
            <div class="form-row">
              <div class="form-group" style="flex: 1;"><label class="input-label">Maks. Iskorišćenja</label><input type="number" class="input-field" name="limit" min="1" placeholder="Ostavi prazno za neograničeno"></div>
            </div>
          </div>
          <div class="form-section"><h3 class="form-section-title">Vreme Važenja</h3>
            <div class="form-row">
              <div class="form-group" style="flex: 1;"><label class="input-label">Početak *</label><input type="date" class="input-field" name="startDate" required></div>
              <div class="form-group" style="flex: 1;"><label class="input-label">Kraj *</label><input type="date" class="input-field" name="endDate" required></div>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="close">Otkaži</button>
        <button class="btn btn-primary" data-action="save-promotion">Kreiraj Promociju</button>
      `
    });
  }
}