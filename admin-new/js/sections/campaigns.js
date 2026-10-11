import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';
import { SectionAPI } from '../services/integration.js';

export class CampaignsSection extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.api = SectionAPI.campaigns;
    this.campaigns = [];
    this.t = this.admin?.t || ((key) => key);
  }

  async onEnter() {
    await this.loadCampaigns();
    this.render();
  }

  async loadCampaigns() {
    try {
      this.campaigns = await this.api.list();
    } catch (error) {
      console.warn('[Campaigns] API failed, falling back to mock data:', error);
      this.campaigns = this.generateMockCampaigns();
    }
  }

  generateMockCampaigns() {
    return [
      { id: 'CMP-001', name: 'Zimska Kolekcija 2024', type: 'seasonal', status: 'active', budget: 500000, spent: 320000, impressions: 1250000, clicks: 28500, conversions: 1240, startDate: '2024-11-01', endDate: '2024-02-28' },
      { id: 'CMP-002', name: 'Black Friday 2024', type: 'flash', status: 'completed', budget: 800000, spent: 785000, impressions: 2100000, clicks: 89000, conversions: 3420, startDate: '2024-11-25', endDate: '2024-11-29' },
      { id: 'CMP-003', name: 'Influencer Kampanja - Moda', type: 'influencer', status: 'active', budget: 300000, spent: 180000, impressions: 890000, clicks: 15600, conversions: 567, startDate: '2024-10-01', endDate: '2024-12-31' },
      { id: 'CMP-004', name: 'Email Newsletter - Novembar', type: 'email', status: 'completed', budget: 50000, spent: 48000, impressions: 120000, clicks: 8900, conversions: 345, startDate: '2024-11-01', endDate: '2024-11-30' },
      { id: 'CMP-005', name: 'Google Ads - Branded', type: 'paid', status: 'active', budget: 200000, spent: 95000, impressions: 450000, clicks: 12300, conversions: 890, startDate: '2024-10-15', endDate: '2025-01-15' }
    ];
  }

  render() {
    this.bindEvents();
    return `
      <div class="campaigns-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">${this.t('campaigns.title')}</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">${this.t('campaigns.subtitle')}</p>
          </div>
          <button class="btn btn-primary" data-action="create-campaign">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${this.t('campaigns.createCampaign')}
          </button>
        </div>

        <div class="data-grid" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: var(--space-5);">
          ${this.campaigns.map(c => `
            <div class="campaign-card">
              <div class="campaign-header">
                <div>
                  <h3 class="campaign-name">${ImperiumUtils.escapeHtml(c.name)}</h3>
                  <span class="campaign-type campaign-type-${c.type}">${this.getTypeLabel(c.type)}</span>
                </div>
                <span class="badge badge-${c.status === 'active' ? 'success' : c.status === 'completed' ? 'primary' : c.status === 'paused' ? 'info' : 'warning'}">${this.getStatusLabel(c.status)}</span>
              </div>
              <div class="campaign-metrics">
                <div class="campaign-metric"><div class="campaign-metric-label">${this.t('campaigns.budget')}</div><div class="campaign-metric-value">${ImperiumUtils.formatCurrency(c.budget)}</div></div>
                <div class="campaign-metric"><div class="campaign-metric-label">${this.t('campaigns.spent')}</div><div class="campaign-metric-value">${ImperiumUtils.formatCurrency(c.spent)}</div></div>
                <div class="campaign-metric"><div class="campaign-metric-label">${this.t('campaigns.impressions')}</div><div class="campaign-metric-value">${ImperiumUtils.formatNumber(c.impressions)}</div></div>
                <div class="campaign-metric"><div class="campaign-metric-label">${this.t('campaigns.clicks')}</div><div class="campaign-metric-value">${ImperiumUtils.formatNumber(c.clicks)}</div></div>
                <div class="campaign-metric"><div class="campaign-metric-label">${this.t('campaigns.conversions')}</div><div class="campaign-metric-value">${ImperiumUtils.formatNumber(c.conversions)}</div></div>
                <div class="campaign-metric"><div class="campaign-metric-label">${this.t('campaigns.ctr')}</div><div class="campaign-metric-value">${c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) : 0}%</div></div>
              </div>
              <div class="campaign-budget">
                <div><span class="budget-spent">${ImperiumUtils.formatCurrency(c.spent)}</span> / <span class="budget-total">${ImperiumUtils.formatCurrency(c.budget)}</span></div>
                <div class="budget-bar"><div class="budget-bar-fill" style="width: ${Math.min(100, (c.spent / c.budget) * 100)}%"></div></div>
              </div>
              <div style="margin-top: var(--space-3); font-size: var(--text-2xs); color: var(--color-text-tertiary);">
                ${ImperiumUtils.formatDate(c.startDate)} – ${ImperiumUtils.formatDate(c.endDate)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getTypeLabel(type) {
    return this.t(`campaigns.types.${type}`) || type;
  }

  getStatusLabel(status) {
    return this.t(`campaigns.statusLabels.${status}`) || status;
  }
}