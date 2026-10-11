import { Component, defineComponent } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class MarketsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.markets = [];
    this.currencies = [];
    this.languages = [];
  }

  async onMount() {
    await this.loadMarkets();
    this.bindEvents();
  }

  async loadMarkets() {
    this.showSkeleton();
    try {
      // TODO: Replace with actual API call
      // const response = await this.admin.api.get('/api/admin/markets');
      // this.markets = response.data.markets;
      // this.currencies = response.data.currencies;
      // this.languages = response.data.languages;

      // Mock data
      this.markets = this.getMockMarkets();
      this.currencies = this.getMockCurrencies();
      this.languages = this.getMockLanguages();
      this.render();
    } catch (error) {
      console.error('Failed to load markets:', error);
      this.showError('Greška pri učitavanju tržišta');
    }
  }

  getMockMarkets() {
    return [
      { id: 1, code: 'RS', name: 'Srbija', currency: 'RSD', language: 'sr', domain: 'dalli.rs', status: 'active', taxRate: 20, shippingZones: ['RS'] },
      { id: 2, code: 'BA', name: 'Bosna i Hercegovina', currency: 'BAM', language: 'bs', domain: 'dalli.ba', status: 'active', taxRate: 17, shippingZones: ['BA'] },
      { id: 3, code: 'ME', name: 'Crna Gora', currency: 'EUR', language: 'sr', domain: 'dalli.me', status: 'inactive', taxRate: 21, shippingZones: ['ME'] },
      { id: 4, code: 'HR', name: 'Hrvatska', currency: 'EUR', language: 'hr', domain: 'dalli.hr', status: 'pending', taxRate: 25, shippingZones: ['HR', 'EU'] }
    ];
  }

  getMockCurrencies() {
    return [
      { code: 'RSD', name: 'Srpski dinar', symbol: 'RSD', rate: 1, isBase: true },
      { code: 'EUR', name: 'Evro', symbol: '€', rate: 0.0085, isBase: false },
      { code: 'BAM', name: 'Konvertibilna marka', symbol: 'KM', rate: 0.0166, isBase: false },
      { code: 'USD', name: 'Američki dolar', symbol: '$', rate: 0.0092, isBase: false }
    ];
  }

  getMockLanguages() {
    return [
      { code: 'sr', name: 'Srpski', nativeName: 'Српски', rtl: false, isDefault: true },
      { code: 'bs', name: 'Bosanski', nativeName: 'Bosanski', rtl: false, isDefault: false },
      { code: 'hr', name: 'Hrvatski', nativeName: 'Hrvatski', rtl: false, isDefault: false },
      { code: 'en', name: 'English', nativeName: 'English', rtl: false, isDefault: false }
    ];
  }

  bindEvents() {
    this.delegate('click', '#addMarketBtn', () => this.openMarketModal());
    this.delegate('click', '[data-action="edit-market"]', (e) => {
      const id = parseInt(e.target.closest('[data-action="edit-market"]').dataset.id);
      const market = this.markets.find(m => m.id === id);
      if (market) this.openMarketModal(market);
    });
    this.delegate('click', '[data-action="toggle-market"]', async (e) => {
      const btn = e.target.closest('[data-action="toggle-market"]');
      const id = parseInt(btn.dataset.id);
      const newStatus = btn.dataset.status === 'active' ? 'inactive' : 'active';
      await this.toggleMarketStatus(id, newStatus);
    });
    this.delegate('click', '[data-action="delete-market"]', async (e) => {
      const id = parseInt(e.target.closest('[data-action="delete-market"]').dataset.id);
      if (await this.confirm('Da li ste sigurni da želite da obrišete ovo tržište?')) {
        await this.deleteMarket(id);
      }
    });
  }

  async toggleMarketStatus(id, status) {
    try {
      // await this.admin.api.patch(`/api/admin/markets/${id}`, { status });
      const market = this.markets.find(m => m.id === id);
      if (market) market.status = status;
      this.render();
      this.admin.toastContainer.success(`Status promenjen na ${status}`);
    } catch (error) {
      this.admin.toastContainer.error('Greška pri promeni statusa');
    }
  }

  async deleteMarket(id) {
    try {
      // await this.admin.api.delete(`/api/admin/markets/${id}`);
      this.markets = this.markets.filter(m => m.id !== id);
      this.render();
      this.admin.toastContainer.success('Tržište obrisano');
    } catch (error) {
      this.admin.toastContainer.error('Greška pri brisanju');
    }
  }

  openMarketModal(market = null) {
    const isEdit = !!market;
    this.admin.modal.setTitle(isEdit ? 'Izmeni tržište' : 'Novo tržište');
    this.admin.modal.setContent(`
      <form id="marketForm" class="market-form">
        <div class="form-row">
          <div class="form-group">
            <label class="input-label">Šifra tržišta *</label>
            <input type="text" class="input-field" name="code" required maxlength="2" pattern="[A-Z]{2}" 
              value="${market ? market.code : ''}" ${isEdit ? 'readonly' : ''} placeholder="RS">
            <small class="form-hint">ISO 3166-1 alpha-2 kod (npr. RS, BA, HR)</small>
          </div>
          <div class="form-group">
            <label class="input-label">Naziv *</label>
            <input type="text" class="input-field" name="name" required 
              value="${market ? market.name : ''}" placeholder="Srbija">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="input-label">Valuta *</label>
            <select class="input-field select-field" name="currency" required>
              ${this.currencies.map(c => `<option value="${c.code}" ${market && market.currency === c.code ? 'selected' : ''}>${c.code} - ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="input-label">Jezik *</label>
            <select class="input-field select-field" name="language" required>
              ${this.languages.map(l => `<option value="${l.code}" ${market && market.language === l.code ? 'selected' : ''}>${l.name} (${l.nativeName})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="input-label">Domen *</label>
            <input type="text" class="input-field" name="domain" required 
              value="${market ? market.domain : ''}" placeholder="dalli.rs">
          </div>
          <div class="form-group">
            <label class="input-label">PDV stopa (%) *</label>
            <input type="number" class="input-field" name="taxRate" required min="0" max="100" step="0.01"
              value="${market ? market.taxRate : '20'}">
          </div>
        </div>
        <div class="form-group">
          <label class="input-label">Zone isporuke (jedna po liniji)</label>
          <textarea class="input-field textarea-field" name="shippingZones" rows="3" placeholder="RS&#10;BA&#10;ME">${market ? market.shippingZones.join('\n') : ''}</textarea>
          <small class="form-hint">ISO kodovi zemalja za koje važi isporuka</small>
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" name="status" value="active" ${market && market.status === 'active' ? 'checked' : ''}>
            <span>Aktivno tržište</span>
          </label>
        </div>
      </form>
    `);
    this.admin.modal.setFooter(`
      <button class="btn btn-secondary" data-action="close">Otkaži</button>
      <button class="btn btn-primary" data-action="save-market" ${isEdit ? `data-id="${market.id}"` : ''}>${isEdit ? 'Sačuvaj izmene' : 'Kreiraj tržište'}</button>
    `);
    this.admin.modal.open();

    setTimeout(() => this.bindMarketFormEvents(market), 0);
  }

  bindMarketFormEvents(market) {
    const isEdit = !!market;
    this.admin.modal.element.querySelector('#marketForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        code: formData.get('code').toUpperCase(),
        name: formData.get('name'),
        currency: formData.get('currency'),
        language: formData.get('language'),
        domain: formData.get('domain'),
        taxRate: parseFloat(formData.get('taxRate')),
        shippingZones: formData.get('shippingZones').split('\n').map(z => z.trim()).filter(Boolean),
        status: formData.get('status') ? 'active' : 'inactive'
      };

      try {
        if (isEdit) {
          // await this.admin.api.put(`/api/admin/markets/${market.id}`, data);
          Object.assign(this.markets.find(m => m.id === market.id), data);
        } else {
          // const res = await this.admin.api.post('/api/admin/markets', data);
          data.id = Date.now();
          this.markets.push(data);
        }
        this.admin.toastContainer.success(isEdit ? 'Tržište sačuvano' : 'Tržište kreirano');
        this.admin.modal.close();
        this.render();
      } catch (error) {
        this.admin.toastContainer.error('Greška pri čuvanju');
      }
    });
  }

  render() {
    const statusBadge = (status) => `
      <span class="badge badge-${status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'secondary'}">
        ${status === 'active' ? 'Aktivno' : status === 'pending' ? 'Na čekanju' : 'Neaktivno'}
      </span>
    `;

    const rows = this.markets.map(m => `
      <tr>
        <td><code>${m.code}</code></td>
        <td><strong>${m.name}</strong></td>
        <td>${m.currency}</td>
        <td>${m.language}</td>
        <td>${m.domain}</td>
        <td>${statusBadge(m.status)}</td>
        <td>${m.taxRate}%</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-ghost btn-sm btn-icon" data-action="edit-market" data-id="${m.id}" aria-label="Izmeni">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon ${m.status === 'active' ? 'text-warning' : 'text-success'}" data-action="toggle-market" data-id="${m.id}" data-status="${m.status}" aria-label="${m.status === 'active' ? 'Deaktiviraj' : 'Aktiviraj'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${m.status === 'active' ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
              </svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon text-error" data-action="delete-market" data-id="${m.id}" aria-label="Obriši">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    this.element.innerHTML = `
      <div class="section-header">
        <div class="section-header-main">
          <h2>Tržišta</h2>
          <p>Upravljajte međunarodnim tržtištima, valutama i jezicima</p>
        </div>
        <div class="section-actions">
          <button class="btn btn-primary" id="addMarketBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Dodaj tržište
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Šifra</th>
              <th scope="col">Naziv</th>
              <th scope="col">Valuta</th>
              <th scope="col">Jezik</th>
              <th scope="col">Domen</th>
              <th scope="col">Status</th>
              <th scope="col">PDV</th>
              <th scope="col">Akcije</th>
            </tr>
          </thead>
          <tbody>
            ${this.markets.map(m => `
              <tr>
                <td><code>${m.code}</code></td>
                <td><strong>${m.name}</strong></td>
                <td>${m.currency}</td>
                <td>${m.language}</td>
                <td>${m.domain}</td>
                <td>${m.status === 'active' ? '<span class="badge badge-success">Aktivno</span>' : m.status === 'pending' ? '<span class="badge badge-warning">Na čekanju</span>' : '<span class="badge badge-secondary">Neaktivno</span>'}</td>
                <td>${m.taxRate}%</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-ghost btn-sm btn-icon" data-action="edit-market" data-id="${m.id}" aria-label="Izmeni">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon ${m.status === 'active' ? 'text-warning' : 'text-success'}" data-action="toggle-market" data-id="${m.id}" data-status="${m.status}" aria-label="${m.status === 'active' ? 'Deaktiviraj' : 'Aktiviraj'}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${m.status === 'active' ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
                      </svg>
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon text-error" data-action="delete-market" data-id="${m.id}" aria-label="Obriši">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="8" class="text-center">Nema tržišta</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  showSkeleton() {
    this.element.innerHTML = `
      <div class="markets-skeleton" aria-hidden="true">
        <div class="table-skeleton"></div>
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

defineComponent('markets-section', MarketsSection);
export default MarketsSection;