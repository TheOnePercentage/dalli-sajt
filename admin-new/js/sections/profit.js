import { Component } from '../core/component.js';
import { SectionAPI } from '../services/integration.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class ProfitSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.analytics;
    this.period = '30d';
    this.summary = null;
    this.monthlyData = [];
    this.expenses = [];
    this.cogs = [];
  }

  async onEnter() {
    await this.loadData();
    this.render();
  }

  async loadData() {
    try {
      // Real P&L computed server-side from real orders + owner-entered ad spend.
      const finance = await this.api.getFinance(this.period);
      this.summary = finance.summary || null;
      this.monthlyData = Array.isArray(finance.monthly) ? finance.monthly : [];
      this.expenses = Array.isArray(finance.expenses) ? finance.expenses : [];
      this.cogs = Array.isArray(finance.cogs) ? finance.cogs : [];
    } catch (error) {
      console.warn('[Profit] Finance API failed:', error);
      this.summary = null;
      this.monthlyData = [];
      this.expenses = [];
      this.cogs = [];
    }
  }

  bindEvents() {
    this.delegate('change', '#periodSelect', async e => {
      this.period = e.target.value;
      await this.loadData();
      this.render();
    });
  }

  render() {
    const summary = this.summary || {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      adSpend: 0,
      totalExpenses: 0,
      netProfit: 0,
      netMargin: 0,
      aov: 0,
      orders: 0,
      cogsRatio: 0,
    };

    const totalRevenue = this.monthlyData.length
      ? this.monthlyData.reduce((s, m) => s + m.revenue, 0)
      : this.summary?.revenue || 0;
    const totalCogs = this.monthlyData.reduce((s, m) => s + m.cogs, 0) || this.summary?.cogs || 0;
    const totalExpenses =
      this.monthlyData.reduce((s, m) => s + m.expenses, 0) || summary.totalExpenses || 0;
    const totalGross =
      this.monthlyData.reduce((s, m) => s + m.gross, 0) || summary.grossProfit || 0;
    const totalNet = this.monthlyData.reduce((s, m) => s + m.net, 0) || summary.netProfit || 0;
    const avgMargin = totalRevenue > 0 ? ((totalNet / totalRevenue) * 100).toFixed(1) : '0.0';
    const cogsShare = totalRevenue > 0 ? ((totalCogs / totalRevenue) * 100).toFixed(1) : '0.0';
    const adShare = totalRevenue > 0 ? ((summary.adSpend / totalRevenue) * 100).toFixed(1) : '0.0';

    const trendClass = v => (v >= 0 ? 'positive' : 'negative');

    this.bindEvents();
    return `
      <div class="profit-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Profit Centar</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Pregled prihoda, troškova, marži i profitabilnosti.</p>
          </div>
          <select class="input-field select-field" style="width: auto; min-width: 160px;" id="periodSelect" aria-label="Vremenski period">
            <option value="30d" ${this.period === '30d' ? 'selected' : ''}>Poslednjih 30 dana</option>
            <option value="90d" ${this.period === '90d' ? 'selected' : ''}>Poslednjih 90 dana</option>
            <option value="1y" ${this.period === '1y' ? 'selected' : ''}>Poslednje godine</option>
          </select>
        </div>

        ${
          this.monthlyData.length === 0 && !summary.revenue
            ? `
          <div class="empty-state" style="padding: var(--space-6); text-align: center; color: var(--color-text-tertiary);">
            <p>Nema podataka za izabrani period. Profit se računa iz stvarnih porudžbina.</p>
          </div>
        `
            : ''
        }

        <div class="profit-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-5); margin-bottom: var(--space-6);">
          <div class="profit-card revenue"><div class="profit-header"><div class="profit-icon" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><span class="profit-trend ${trendClass(summary.netMargin)}">${summary.netMargin}% neto</span></div><div class="profit-value">${ImperiumUtils.formatCurrency(totalRevenue)}</div><div class="profit-label">Ukupni Prihod</div><div class="profit-sublabel">${summary.orders} porudžbina · AOV ${ImperiumUtils.formatCurrency(summary.aov)}</div></div>
          <div class="profit-card expenses"><div class="profit-header"><div class="profit-icon" style="background: linear-gradient(135deg, var(--color-error), var(--color-error-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><span class="profit-trend ${adShare > 30 ? 'negative' : 'positive'}">${adShare}% prihoda</span></div><div class="profit-value">${ImperiumUtils.formatCurrency(totalExpenses)}</div><div class="profit-label">Ukupni Troškovi</div><div class="profit-sublabel">Marketing / oglasi + operativni</div></div>
          <div class="profit-card cogs"><div class="profit-header"><div class="profit-icon" style="background: linear-gradient(135deg, var(--color-warning), var(--color-warning-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v16"/><path d="M2 12h20"/></svg></div><span class="profit-trend negative">${cogsShare}% prihoda</span></div><div class="profit-value">${ImperiumUtils.formatCurrency(totalCogs)}</div><div class="profit-label">COGS (procena)</div><div class="profit-sublabel">Troškovi Proizvoda · procena ${(summary.cogsRatio * 100).toFixed(0)}%</div></div>
          <div class="profit-card gross"><div class="profit-header"><div class="profit-icon" style="background: linear-gradient(135deg, var(--color-info), var(--color-info-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg></div><span class="profit-trend ${trendClass(summary.grossMargin)}">${summary.grossMargin}%</span></div><div class="profit-value">${ImperiumUtils.formatCurrency(totalGross)}</div><div class="profit-label">Bruto Profit</div><div class="profit-sublabel">Prihod - COGS</div></div>
          <div class="profit-card net"><div class="profit-header"><div class="profit-icon" style="background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg></div><span class="profit-trend ${trendClass(summary.netMargin)}">${summary.netMargin}%</span></div><div class="profit-value">${ImperiumUtils.formatCurrency(totalNet)}</div><div class="profit-label">Neto Profit</div><div class="profit-sublabel">Posle svih troškova</div></div>
          <div class="profit-card margin"><div class="profit-header"><div class="profit-icon" style="background: linear-gradient(135deg, var(--color-success), var(--color-success-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg></div><span class="profit-trend ${trendClass(Number(avgMargin))}">Neto marža</span></div><div class="profit-value">${avgMargin}%</div><div class="profit-label">Neto Marža</div><div class="profit-sublabel">Neto Profit / Prihod</div></div>
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Mesečni Pregled</h3>
        <div class="monthly-breakdown" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
          ${this.monthlyData
            .map(
              m => `
            <div class="month-card">
              <div class="month-header">
                <span class="month-name">${m.month}</span>
                <span class="month-net ${m.net > 0 ? 'positive' : 'negative'}">${ImperiumUtils.formatCurrency(m.net)}</span>
              </div>
              <div class="month-details">
                <div class="month-detail"><span class="month-detail-label">Prihod</span><span class="month-detail-value">${ImperiumUtils.formatCurrency(m.revenue)}</span></div>
                <div class="month-detail"><span class="month-detail-label">COGS</span><span class="month-detail-value">${ImperiumUtils.formatCurrency(m.cogs)}</span></div>
                <div class="month-detail"><span class="month-detail-label">Troškovi</span><span class="month-detail-value">${ImperiumUtils.formatCurrency(m.expenses)}</span></div>
                <div class="month-detail"><span class="month-detail-label">Bruto</span><span class="month-detail-value">${ImperiumUtils.formatCurrency(m.gross)}</span></div>
                <div class="month-detail"><span class="month-detail-label">Neto</span><span class="month-detail-value">${ImperiumUtils.formatCurrency(m.net)}</span></div>
                <div class="month-detail"><span class="month-detail-label">Marža</span><span class="month-detail-value">${m.margin}%</span></div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Troškovi po Kategorijama</h3>
        <div class="expense-breakdown" style="display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-6);">
          ${
            this.expenses.length
              ? this.expenses
                  .map(
                    e => `
            <div class="expense-item">
              <div class="expense-category">
                <div class="expense-name">${e.category}</div>
                <div class="expense-bar"><div class="expense-fill" style="width: ${e.pct}%; background: linear-gradient(90deg, var(--color-accent), var(--color-accent-dark));"></div></div>
              </div>
              <div class="expense-stats">
                <div class="expense-cost">${ImperiumUtils.formatCurrency(e.amount)}</div>
                <div class="expense-margin">${e.pct}%</div>
              </div>
            </div>
          `
                  )
                  .join('')
              : '<p style="color: var(--color-text-tertiary);">Nema evidentiranih troškova. Dodajte troškove oglasa u Experience Center.</p>'
          }
        </div>

        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">COGS po Proizvodima</h3>
        <div class="cogs-breakdown" style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${
            this.cogs.length
              ? this.cogs
                  .map(
                    c => `
            <div class="cogs-item">
              <div class="cogs-product">
                <div class="cogs-name">${c.product}</div>
                <div class="cogs-sku">${c.units} kom · prihod ${ImperiumUtils.formatCurrency(c.revenue)}</div>
              </div>
              <div class="cogs-stats">
                <div class="cogs-cost">${ImperiumUtils.formatCurrency(c.cogs)}</div>
                <div class="cogs-margin ${c.margin > 50 ? 'positive' : 'negative'}">${c.margin}% marža</div>
              </div>
            </div>
          `
                  )
                  .join('')
              : '<p style="color: var(--color-text-tertiary);">Nema prodaje u izabranom periodu.</p>'
          }
        </div>
      </div>
    `;
  }
}

export default ProfitSection;
