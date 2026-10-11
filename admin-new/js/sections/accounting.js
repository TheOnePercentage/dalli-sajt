import { Component, defineComponent } from '../core/component.js';
import { SectionAPI } from '../services/integration.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class AccountingSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.analytics;
    this.transactions = [];
    this.summary = { revenue: 0, expenses: 0, profit: 0, orders: 0 };
    this.currentView = 'overview';
    this.dateRange = { from: null, to: null };
  }

  async onEnter() {
    await this.loadAccountingData();
  }

  async onMount() {
    await this.onEnter();
  }

  async loadAccountingData() {
    this.showSkeleton();
    try {
      // Real transactions derived server-side from real orders + owner ad spend.
      const params = {};
      if (this.dateRange.from) params.from = this.dateRange.from;
      if (this.dateRange.to) params.to = this.dateRange.to;
      const response = await this.api.getAccounting(params);
      this.transactions = Array.isArray(response.transactions) ? response.transactions : [];
      this.summary = this.calculateSummary(this.transactions);
      this.render();
    } catch (error) {
      console.error('Failed to load accounting data:', error);
      this.showError('Greška pri učitavanju finansijskih podataka');
    }
  }

  calculateSummary(transactions) {
    const revenue = transactions
      .filter(t => t.amount > 0 && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const refunds = transactions
      .filter(t => t.type === 'refund' && t.status === 'completed')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const fees = transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.fees, 0);
    const tax = transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.tax, 0);
    const orders = transactions.filter(t => t.type === 'sale' && t.status === 'completed').length;

    return {
      revenue,
      refunds,
      fees,
      tax,
      netRevenue: revenue - refunds - fees,
      profit: revenue - refunds - fees - tax,
      orders,
      avgOrderValue: orders > 0 ? revenue / orders : 0,
    };
  }

  bindEvents() {
    // View tabs
    this.delegate('click', '[data-accounting-view]', e => {
      this.currentView = e.target.closest('[data-accounting-view]').dataset.accountingView;
      this.render();
    });

    // Date range
    this.delegate('change', '#dateFrom', e => {
      this.dateRange.from = e.target.value;
      this.loadAccountingData();
    });
    this.delegate('change', '#dateTo', e => {
      this.dateRange.to = e.target.value;
      this.loadAccountingData();
    });

    // Quick range buttons
    this.delegate('click', '[data-quick-range]', e => {
      const range = e.target.dataset.quickRange;
      const to = new Date();
      const from = new Date();
      switch (range) {
        case 'today':
          from.setHours(0, 0, 0, 0);
          break;
        case 'week':
          from.setDate(from.getDate() - 7);
          break;
        case 'month':
          from.setMonth(from.getMonth() - 1);
          break;
        case 'quarter':
          from.setMonth(from.getMonth() - 3);
          break;
        case 'year':
          from.setFullYear(from.getFullYear() - 1);
          break;
      }
      this.dateRange.from = from.toISOString().split('T')[0];
      this.dateRange.to = to.toISOString().split('T')[0];
      this.loadAccountingData();
    });

    // Export
    this.delegate('click', '#exportCsv', () => this.exportCSV());
    this.delegate('click', '#exportPdf', () => this.exportPDF());
  }

  exportCSV() {
    const headers = [
      'Datum',
      'ID Porudžbine',
      'Tip',
      'Status',
      'Iznos',
      'Net Iznos',
      'Način plaćanja',
      'Kupac',
      'Provizije',
      'PDV',
    ];
    const rows = this.transactions.map(t => [
      t.date,
      t.orderId,
      t.type,
      t.status,
      t.amount,
      t.netAmount,
      t.paymentMethod,
      t.customer,
      t.fees,
      t.tax,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `racunovodstvo-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.admin.toastContainer.success('CSV eksportovan');
  }

  exportPDF() {
    this.admin.toastContainer.info('PDF eksport u razvoju');
  }

  render() {
    this.element.innerHTML = `
      <div class="section-header">
        <div class="section-header-main">
          <h2>Računovodstvo</h2>
          <p>Finansijski evidencije, izvještaji i analitika</p>
        </div>
        <div class="section-actions">
          <div class="date-range-picker">
            <input type="date" id="dateFrom" class="input-field" value="${this.dateRange.from || ''}" placeholder="Od">
            <span>–</span>
            <input type="date" id="dateTo" class="input-field" value="${this.dateRange.to || ''}" placeholder="Do">
          </div>
          <div class="quick-ranges">
            <button class="btn btn-ghost btn-sm" data-quick-range="today">Danas</button>
            <button class="btn btn-ghost btn-sm" data-quick-range="week">Sedmica</button>
            <button class="btn btn-ghost btn-sm active" data-quick-range="month">Mesec</button>
            <button class="btn btn-ghost btn-sm" data-quick-range="quarter">Kvartal</button>
            <button class="btn btn-ghost btn-sm" data-quick-range="year">Godina</button>
          </div>
          <div class="dropdown export-dropdown">
            <button class="dropdown-trigger btn btn-ghost" aria-label="Izvoz" aria-expanded="false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>
              <span>Izvoz</span>
            </button>
            <div class="dropdown-menu export-menu">
              <button class="dropdown-item" id="exportCsv">CSV</button>
              <button class="dropdown-item" id="exportPdf">PDF</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon revenue"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="stat-content">
            <span class="stat-label">Ukupni prihodi</span>
            <span class="stat-value text-success">${ImperiumUtils.format.currency(this.summary.revenue)}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon refunds"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5v5M16 19h6M8 19H2M21 19V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/></svg></div>
          <div class="stat-content">
            <span class="stat-label">Povraći</span>
            <span class="stat-value text-error">${ImperiumUtils.format.currency(this.summary.refunds)}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon fees"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="stat-content">
            <span class="stat-label">Provizije</span>
            <span class="stat-value text-warning">${ImperiumUtils.format.currency(this.summary.fees)}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon profit"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg></div>
          <div class="stat-content">
            <span class="stat-label">Neto profit</span>
            <span class="stat-value ${this.summary.profit >= 0 ? 'text-success' : 'text-error'}">${ImperiumUtils.format.currency(this.summary.profit)}</span>
          </div>
        </div>
      </div>

      <!-- View Tabs -->
      <nav class="tabs" role="tablist" aria-label="Prikazi">
        <button class="tab ${this.currentView === 'overview' ? 'active' : ''}" role="tab" data-accounting-view="overview" aria-selected="${this.currentView === 'overview'}">Pregled</button>
        <button class="tab ${this.currentView === 'transactions' ? 'active' : ''}" role="tab" data-accounting-view="transactions" aria-selected="${this.currentView === 'transactions'}">Transakcije</button>
        <button class="tab ${this.currentView === 'reports' ? 'active' : ''}" role="tab" data-accounting-view="reports" aria-selected="${this.currentView === 'reports'}">Izvještaji</button>
        <button class="tab ${this.currentView === 'tax' ? 'active' : ''}" role="tab" data-accounting-view="tax" aria-selected="${this.currentView === 'tax'}">PDV</button>
      </nav>

      <div class="tab-panels">
        ${this.currentView === 'overview' ? this.renderOverview() : ''}
        ${this.currentView === 'transactions' ? this.renderTransactions() : ''}
        ${this.currentView === 'reports' ? this.renderReports() : ''}
        ${this.currentView === 'tax' ? this.renderTax() : ''}
      </div>
    `;
  }

  renderOverview() {
    return `
      <div class="chart-grid">
        <div class="chart-card">
          <h3>Prihodi po danima (poslednjih 30 dana)</h3>
          <div class="chart-placeholder" style="height: 300px;">
            <svg class="chart-skeleton" viewBox="0 0 400 300" aria-hidden="true">
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--color-success)" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="var(--color-success)" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path d="M20,280 L40,260 L60,240 L80,250 L100,220 L120,200 L140,180 L160,190 L180,160 L200,150 L220,140 L240,130 L260,125 L280,120 L300,115 L320,110 L340,105 L360,100 L380,95" 
                fill="url(#revenueGradient)" stroke="var(--color-success)" stroke-width="2" fill-opacity="0.3"/>
            </svg>
          </div>
        </div>
        <div class="chart-card">
          <h3>Prihodi po kategorijama</h3>
          <div class="chart-placeholder" style="height: 300px;">
            <div class="pie-chart-skeleton"></div>
          </div>
        </div>
        <div class="chart-card full-width">
          <h3>Uplate po načinu plaćanja</h3>
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th scope="col">Način plaćanja</th><th scope="col">Broj uplata</th><th scope="col">Ukupan prihod</th><th scope="col">Udeo</th></tr></thead>
              <tbody>
                ${this.renderPaymentBreakdown()}
              </tbody></table>
          </div>
        </div>
      </div>
    `;
  }

  renderPaymentBreakdown() {
    const byPayment = new Map();
    for (const t of this.transactions) {
      if (t.type !== 'sale') continue;
      const key = t.paymentMethod || 'ostalo';
      const bucket = byPayment.get(key) || { count: 0, revenue: 0 };
      bucket.count += 1;
      bucket.revenue += t.amount;
      byPayment.set(key, bucket);
    }
    const rows = Array.from(byPayment.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
    const total = rows.reduce((sum, [, v]) => sum + v.revenue, 0);
    if (!rows.length) {
      return '<tr><td colspan="4" style="text-align:center;color:var(--color-text-tertiary);">Nema podataka</td></tr>';
    }
    return rows
      .map(([method, v]) => {
        const pct = total > 0 ? ((v.revenue / total) * 100).toFixed(1) : '0.0';
        return `<tr><td>${method}</td><td>${v.count}</td><td>${ImperiumUtils.format.currency(v.revenue)}</td><td>${pct}%</td></tr>`;
      })
      .join('');
  }

  renderTransactions() {
    const rows = this.transactions
      .slice(0, 100)
      .map(
        t => `
      <tr>
        <td>${t.date}</td>
        <td><a href="#orders?id=${t.orderId}">${t.orderId}</a></td>
        <td><span class="badge badge-${t.type === 'sale' ? 'success' : t.type === 'refund' ? 'error' : t.type === 'fee' ? 'warning' : 'info'}">${t.type}</span></td>
        <td><span class="badge badge-${t.status === 'completed' ? 'success' : t.status === 'pending' ? 'warning' : 'error'}">${t.status}</span></td>
        <td>${t.amount >= 0 ? '+' : ''}${ImperiumUtils.format.currency(t.amount)}</td>
        <td>${t.netAmount >= 0 ? '+' : ''}${ImperiumUtils.format.currency(t.netAmount)}</td>
        <td>${t.paymentMethod}</td>
        <td>${t.customer}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="filters-bar">
        <div class="filter-group">
          <input type="search" placeholder="Pretraži transakcije..." class="search-input" aria-label="Pretraži">
        </div>
        <div class="filter-group">
          <select class="select-field" aria-label="Filtruj po tipu">
            <option value="">Svi tipovi</option>
            <option value="sale">Prodaja</option>
            <option value="refund">Povrat</option>
            <option value="fee">Provizija</option>
            <option value="payout">Isplata</option>
          </select>
        </div>
        <div class="filter-group">
          <select class="select-field" aria-label="Filtruj po statusu">
            <option value="">Svi statusi</option>
            <option value="completed">Završeno</option>
            <option value="pending">Na čekanju</option>
            <option value="refunded">Vraćeno</option>
            <option value="cancelled">Otkazano</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Datum</th>
              <th scope="col">Porudžbina</th>
              <th scope="col">Tip</th>
              <th scope="col">Status</th>
              <th scope="col">Iznos</th>
              <th scope="col">Net iznos</th>
              <th scope="col">Način plaćanja</th>
              <th scope="col">Kupac</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <nav class="pagination" aria-label="Stranice">
        <button class="btn btn-ghost btn-sm" disabled aria-label="Prethodna"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="pagination-info">Strana 1 od 5</span>
        <button class="btn btn-ghost btn-sm" aria-label="Sledeća"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </nav>
    `;
  }

  renderReports() {
    return `
      <div class="reports-grid">
        <div class="report-card">
          <h3>Dnevni izveštaj</h3>
          <p>Detaljan pregled dnevnih transakcija</p>
          <button class="btn btn-primary" data-report="daily">Generiši</button>
        </div>
        <div class="report-card">
          <h3>Mesečni izveštaj</h3>
          <p>Sažetak mesečnih poslovanja</p>
          <button class="btn btn-primary" data-report="monthly">Generiši</button>
        </div>
        <div class="report-card">
          <h3>PDV izveštaj</h3>
          <p>Izveštaj za porezne potrebe</p>
          <button class="btn btn-primary" data-report="vat">Generiši</button>
        </div>
        <div class="report-card">
          <h3>Godisnji izveštaj</h3>
          <p>Kompletan godišnji pregled</p>
          <button class="btn btn-primary" data-report="yearly">Generiši</button>
        </div>
      </div>
    `;
  }

  renderTax() {
    const vatCollected = this.transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.tax || 0), 0);
    const vatDeductible = this.summary.fees * 0.2; // procena na osnovu provizija

    const byMonth = new Map();
    for (const t of this.transactions) {
      const month = (t.date || '').slice(0, 7);
      if (!month) continue;
      const bucket = byMonth.get(month) || { vat: 0, ded: 0 };
      bucket.vat += t.tax || 0;
      bucket.ded += (t.fees || 0) * 0.2;
      byMonth.set(month, bucket);
    }
    const rows = Array.from(byMonth.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

    return `
      <div class="tax-summary">
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-content">
              <span class="stat-label">Naplaćen PDV</span>
              <span class="stat-value text-success">${ImperiumUtils.format.currency(vatCollected)}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-content">
              <span class="stat-label">Odbitak PDV (procena)</span>
              <span class="stat-value text-warning">${ImperiumUtils.format.currency(vatDeductible)}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-content">
              <span class="stat-label">Za uplatu</span>
              <span class="stat-value ${vatCollected > vatDeductible ? 'text-error' : 'text-success'}">${ImperiumUtils.format.currency(vatCollected - vatDeductible)}</span>
            </div>
          </div>
        </div>

        <div class="tax-periods">
          <h3>PDV po periodima</h3>
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th scope="col">Period</th><th scope="col">Naplaćen PDV</th><th scope="col">Odbitak</th><th scope="col">Saldo</th></tr></thead>
              <tbody>
                ${
                  rows.length
                    ? rows
                        .map(
                          ([month, v]) =>
                            `<tr><td>${month}</td><td>${ImperiumUtils.format.currency(v.vat)}</td><td>${ImperiumUtils.format.currency(v.ded)}</td><td>${ImperiumUtils.format.currency(v.vat - v.ded)}</td></tr>`
                        )
                        .join('')
                    : '<tr><td colspan="4" style="text-align:center;color:var(--color-text-tertiary);">Nema podataka</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-actions" style="margin-top: var(--space-6);">
          <button class="btn btn-primary" id="exportPdf">Preuzmi PDV izveštaj (PDF)</button>
          <button class="btn btn-secondary" id="exportCsv">Preuzmi PDV izveštaj (CSV)</button>
        </div>
      </div>
    `;
  }

  showSkeleton() {
    this.element.innerHTML = `
      <div class="accounting-skeleton" aria-hidden="true">
        <div class="stat-grid skeleton-stat"></div>
        <div class="chart-grid skeleton-chart"></div>
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

defineComponent('accounting-section', AccountingSection);
export default AccountingSection;
