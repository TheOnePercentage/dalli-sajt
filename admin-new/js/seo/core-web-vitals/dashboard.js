/**
 * Core Web Vitals - Dashboard UI
 * Visual cards, charts, trend lines, historical comparison
 * Integrates with existing SEO Section as new tab
 */

import { 
  CWV_METRICS, 
  CWV_RATINGS,
  CWV_THRESHOLDS,
  CWV_COLORS,
  CWVMetricKey,
  CWVRating,
  CWVPageReport,
  CWVHistoricalPoint,
  CWVTrendData
} from './models.js';
import { cwvScoringEngine } from './scoring.js';
import { cwvCollector } from './collector.js';

class CWVDashboard {
  constructor(config = {}) {
    this.config = {
      showHistorical: true,
      showTrends: true,
      showComparison: false,
      autoRefresh: false,
      refreshInterval: 300000, // 5 minutes
      compactMode: false,
      ...config
    };
  }

  /**
   * Mount dashboard to container
   */
  mount(container) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) : container;
    
    if (!this.container) {
      throw new Error('Container not found');
    }
    
    this.render();
    this.bindEvents();
  }

  /**
   * Load and display data for a URL
   */
  async loadData(url, options= {}) {
    this.showLoading();
    
    try {
      const report = await cwvCollector.generatePageReport(url, { device: options.device });
      this.currentReport = report;
      
      // Load historical data
      this.historicalData = await cwvCollector.getHistoricalData(url, options.device || 'mobile', 30);
      
      // Calculate trends
      this.calculateTrends();
      
      // Save historical point
      await cwvCollector.saveHistoricalPoint(report);
      
      this.currentReport = report;
      this.render();
      
      if (this.config.autoRefresh) {
        this.startAutoRefresh(url, options);
      }
    } catch (error) {
      console.error('Failed to load CWV data:', error);
      this.showError('Failed to load Core Web Vitals data');
    }
  }

  calculateTrends() {
    // Trends calculated in collector
  }

  /**
   * Render the dashboard
   */
  render() {
    if (!this.container) return;
    
    if (!this.currentReport) {
      this.container.innerHTML = this.renderEmptyState();
      return;
    }

    const scoringResult = cwvScoringEngine.calculateScore(this.currentReport);
    const metricCards = cwvScoringEngine.generateMetricCardData(scoringResult.breakdown);
    const progressData = cwvScoringEngine.generateProgressData(scoringResult.breakdown);
    const summary = cwvScoringEngine.generateSummary(this.currentReport, scoringResult);

    this.container.innerHTML = `
      <div class="cwv-dashboard">
        ${this.renderHeader(scoringResult, summary)}
        ${this.renderMetricCards(metricCards)}
        ${this.renderProgressBars(progressData)}
        ${this.config.showHistorical ? this.renderHistoricalCharts() : ''}
        ${this.config.showTrends ? this.renderTrendIndicators() : ''}
        ${this.config.showComparison ? this.renderComparisonSection() : ''}
        ${this.renderAlerts()}
      </div>
    `;
    
    this.initializeCharts();
  }

  renderHeader(scoringResult, summary) {
    const gradeColors = { A: '#16a34a', B: '#16a34a', C: '#eab308', D: '#f97316', F: '#dc2626' };
    const gradeColor = gradeColors[scoringResult.grade] || '#6b7280';
    
    return `
      <div class="cwv-header" style="margin-bottom: var(--space-6);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary); margin-bottom: var(--space-1);">
              Core Web Vitals
            </h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">
              ${this.currentReport?.url} • ${this.currentReport?.device} • ${new Date(this.currentReport?.timestamp).toLocaleString()}
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-4);">
            <div style="text-align: right;">
              <div style="font-size: var(--text-3xl); font-weight: var(--font-bold); color: ${gradeColor};">
                ${scoringResult.overallScore}
              </div>
              <div style="font-size: var(--text-sm); color: var(--color-text-tertiary);">Ukupni skor</div>
            </div>
            <div style="
              width: 80px; height: 80px; 
              border: 6px solid ${gradeColor}; 
              border-radius: 50%; 
              display: flex; align-items: center; justify-content: center;
              font-size: var(--text-2xl); font-weight: var(--font-bold); color: ${gradeColor};
            ">
              ${scoringResult.grade}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: var(--space-4); margin-top: var(--space-4); flex-wrap: wrap;">
          ${summary.metrics.map((m) => `
            <div style="flex: 1; min-width: 120px; padding: var(--space-3); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px;">${m.label}</div>
              <div style="font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-text-primary);">${m.value}</div>
              <div style="font-size: var(--text-xs); color: ${this.getRatingColor(m.rating).text};">${m.rating === 'good' ? '✓ Dobro' : m.rating === 'needs-improvement' ? '⚠ Poboljšanje' : '✗ Loše'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderMetricCards(metricCards) {
    return `
      <div class="cwv-metric-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
        ${metricCards.map(card => `
          <div class="cwv-metric-card" style="
            background: var(--color-bg-card);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            padding: var(--space-5);
            border-left: 4px solid ${card.ratingColor.border};
            transition: all var(--transition-fast);
          ">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--space-4);">
              <div>
                <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--space-1);">
                  ${card.threshold.label}
                </div>
                <div style="font-size: var(--text-3xl); font-weight: var(--font-bold); color: var(--color-text-primary);">
                  ${card.formattedValue}
                </div>
              </div>
              <div style="text-align: right;">
                <span class="cwv-rating-badge" style="
                  display: inline-block;
                  padding: var(--space-1) var(--space-3);
                  border-radius: var(--radius-full);
                  font-size: var(--text-xs);
                  font-weight: var(--font-bold);
                  background: ${card.ratingColor.bg};
                  color: ${card.ratingColor.text};
                  border: 1px solid ${card.ratingColor.border};
                ">
                  ${card.ratingLabel}
                </span>
              </div>
            </div>
            
            <div style="margin-bottom: var(--space-4);">
              <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
                <span style="font-size: var(--text-xs); color: var(--color-text-tertiary);">Skor</span>
                <span style="font-size: var(--text-sm); font-weight: var(--font-bold); color: ${card.rating === 'good' ? '#16a34a' : card.rating === 'needs-improvement' ? '#eab308' : '#dc2626'};">
                  ${card.score}/100
                </span>
              </div>
              <div style="height: 8px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden;">
                <div style="
                  width: ${card.rating === 'good' ? '100%' : card.rating === 'needs-improvement' ? '50%' : '25%'};
                  height: 100%;
                  background: linear-gradient(90deg, #16a34a, #eab308, #dc2626);
                  border-radius: var(--radius-full);
                  transition: width 0.5s ease;
                "></div>
              </div>
            </div>

            <div style="display: flex; gap: var(--space-2); font-size: var(--text-xs); color: var(--color-text-tertiary);">
              <span>✓ Good ≤ ${this.formatThreshold(card.threshold.good, card.threshold.unit)}</span>
              <span>⚠ Needs ≤ ${this.formatThreshold(card.threshold.poor, card.threshold.unit)}</span>
              <span>✗ Poor > ${this.formatThreshold(card.threshold.poor, card.threshold.unit)}</span>
            </div>

            ${card.improvementNeeded ? `
              <div style="margin-top: var(--space-4); padding: var(--space-3); background: #fef2f2; border: 1px solid #fca5a5; border-radius: var(--radius-md);">
                <div style="font-size: var(--text-xs); font-weight: var(--font-semibold); color: #991b1b; margin-bottom: var(--space-1);">
                  💡 Preporuka za poboljšanje
                </div>
                <div style="font-size: var(--text-sm); color: #991b1b;">${card.improvementNeeded}</div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  renderProgressBars(progressData) {
    return `
      <div class="cwv-progress-section" style="margin-bottom: var(--space-6);">
        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Progress Overview</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-4);">
          ${progressData.map(p => `
            <div class="cwv-progress-item" style="
              background: var(--color-bg-card);
              border: 1px solid var(--color-border);
              border-radius: var(--radius-lg);
              padding: var(--space-4);
            ">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
                <span style="font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-text-primary);">${p.label}</span>
                <span style="font-size: var(--text-xs); color: var(--color-text-tertiary);">${p.progressPercent}%</span>
              </div>
              <div style="height: 10px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden;">
                <div style="
                  width: ${p.progressPercent}%;
                  height: 100%;
                  background: linear-gradient(90deg, #16a34a, #eab308, #dc2626);
                  border-radius: var(--radius-full);
                  transition: width 0.5s ease;
                "></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderHistoricalCharts() {
    if (!this.currentReport || this.historicalData.length < 2) {
      return `
        <div class="cwv-historical-section" style="margin-bottom: var(--space-6);">
          <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Historical Trends (30 days)</h3>
          <div style="text-align: center; padding: var(--space-12); color: var(--color-text-tertiary); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
            <div style="font-size: var(--text-3xl); margin-bottom: var(--space-3);">📈</div>
            <p>Insufficient historical data. Run audits over several days to see trends.</p>
            <p style="font-size: var(--text-sm); margin-top: var(--space-2);">${this.historicalData.length} data points collected</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="cwv-historical-section" style="margin-bottom: var(--space-6);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
          <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold);">Historical Trends (30 days)</h3>
          <select id="cwv-history-metric" class="form-select" style="width: auto; min-width: 200px;">
            ${Object.values(CWV_METRICS).map(m => `
              <option value="${m}">${CWV_THRESHOLDS[m].label}</option>
            `).join('')}
          </select>
        </div>
        <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5);">
          <canvas id="cwv-history-chart" height="300"></canvas>
        </div>
        <div style="display: flex; gap: var(--space-4); margin-top: var(--space-4); flex-wrap: wrap;">
          ${Object.values(CWV_METRICS).map(m => `
            <div style="flex: 1; min-width: 150px; padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
              <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); text-transform: uppercase;">${CWV_THRESHOLDS[m].label}</div>
              <div id="cwv-trend-${m}" style="font-size: var(--text-lg); font-weight: var(--font-bold);">Loading...</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderTrendIndicators() {
    if (!this.currentReport) return '';

    return `
      <div class="cwv-trends-section" style="margin-bottom: var(--space-6);">
        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">7-Day Trend Analysis</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
          ${Object.values(CWV_METRICS).map(metric => {
            const trend = cwvCollector.calculateTrend(this.historicalData, metric);
            const trendColors = { improving: '#16a34a', stable: '#6b7280', declining: '#dc2626' };
            const trendIcons = { improving: '↗', stable: '→', declining: '↘' };
            
            return `
              <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
                  <span style="font-size: var(--text-sm); font-weight: var(--font-medium);">${CWV_THRESHOLDS[metric].label}</span>
                  <span style="
                    font-size: var(--text-lg); 
                    font-weight: var(--font-bold); 
                    color: ${trendColors[trend.trend]};
                  ">
                    ${trendIcons[trend.trend]} ${trend.changePercent.toFixed(1)}%
                  </span>
                </div>
                <div style="font-size: var(--text-xs); color: var(--color-text-tertiary);">
                  ${trend.trend === 'improving' ? '✓ Poboljšanje' : trend.trend === 'declining' ? '⚠ Pogoršanje' : '→ Stabilno'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderComparisonSection() {
    return `
      <div class="cwv-comparison-section" style="margin-bottom: var(--space-6);">
        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">Competitor Comparison</h3>
        <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5);">
          <p style="color: var(--color-text-tertiary); margin-bottom: var(--space-4);">Enter competitor URL to compare Core Web Vitals</p>
          <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
            <input type="url" id="cwv-competitor-url" class="form-input" placeholder="https://competitor.com" style="flex: 1; min-width: 250px;">
            <button class="btn btn-primary" id="cwv-compare-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><polyline points="15 3 9 9 3 3"/></svg>
              Compare
            </button>
          </div>
          <div id="cwv-comparison-results" style="margin-top: var(--space-4); display: none;"></div>
        </div>
      </div>
    `;
  }

  renderAlerts() {
    // Would show CWV alerts from collector
    return `
      <div class="cwv-alerts-section" style="margin-bottom: var(--space-6);">
        <h3 style="font-size: var(--text-lg); font-weight: var(--font-semibold); margin-bottom: var(--space-4);">⚠ CWV Alerts</h3>
        <div id="cwv-alerts-container" style="display: flex; flex-direction: column; gap: var(--space-2);">
          <div style="text-align: center; padding: var(--space-8); color: var(--color-text-tertiary);">
            No alerts configured. Set up alerts in settings.
          </div>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="cwv-dashboard-empty" style="text-align: center; padding: var(--space-12);">
        <div style="font-size: var(--text-5xl); margin-bottom: var(--space-4);">📊</div>
        <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); margin-bottom: var(--space-2);">Core Web Vitals Dashboard</h2>
        <p style="color: var(--color-text-tertiary); margin-bottom: var(--space-6); max-width: 400px; margin-left: auto; margin-right: auto;">
          Enter a URL to audit Core Web Vitals metrics, CLS, INP, FCP, TTFB
        </p>
        <div style="display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap;">
          <input type="url" id="cwv-input-url" class="form-input" placeholder="https://example.com" style="min-width: 300px; max-width: 400px;">
          <select id="cwv-device-select" class="form-select" style="width: auto;">
            <option value="mobile">📱 Mobile</option>
            <option value="desktop">🖥️ Desktop</option>
          </select>
          <button class="btn btn-primary" id="cwv-run-audit-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Run Audit
          </button>
        </div>
      </div>
    `;
  }

  showLoading() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div style="text-align: center; padding: var(--space-12);">
        <div style="width: 48px; height: 48px; border: 3px solid var(--color-border); border-top: 3px solid var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto var(--space-6);"></div>
        <h3 style="font-size: var(--text-xl); font-weight: var(--font-semibold); margin-bottom: var(--space-2);">Učitavanje Core Web Vitals...</h3>
        <p style="color: var(--color-text-tertiary);">Prikupljanje metrika LCP, CLS, INP, FCP, TTFB</p>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
      </div>
    `;
  }

  showError(message) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div style="text-align: center; padding: var(--space-12);">
        <div style="font-size: var(--text-4xl); margin-bottom: var(--space-4);">⚠️</div>
        <h3 style="font-size: var(--text-xl); font-weight: var(--font-semibold); margin-bottom: var(--space-2); color: #dc2626;">Greška</h3>
        <p style="color: var(--color-text-tertiary); margin-bottom: var(--space-6);">${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Pokušaj ponovo</button>
      </div>
    `;
  }

  initializeCharts() {
    // Initialize Chart.js charts for historical data
    this.initHistoryChart();
    this.initTrendIndicators();
  }

  initHistoryChart() {
    const canvas = document.getElementById('cwv-history-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (this.charts.has('history')) {
      this.charts.get('history')?.destroy();
    }

    // Will be populated when user selects metric
    this.charts.set('history', new Chart(ctx, {
      type: 'line',
      data,
      options: {
        plugins: {
          tooltip: {}
        },
        scales: {
          y: {}
        }
      }
    }));
  }

  initTrendIndicators() {
    if (!this.currentReport) return;
    
    for (const metric of Object.values(CWV_METRICS)) {
      const el = document.getElementById(`cwv-trend-${metric}`);
      if (el) {
        const trend = cwvCollector.calculateTrend(this.historicalData, metric);
        const trendColors = { improving: '#16a34a', stable: '#6b7280', declining: '#dc2626' };
        const trendIcons = { improving: '↗', stable: '→', declining: '↘' };
        
        el.innerHTML = `${trendIcons[trend.trend]} ${trend.changePercent.toFixed(1)}%`;
        el.style.color = trendColors[trend.trend];
      }
    }
  }

  bindEvents() {
    if (!this.container) return;

    // Run audit button
    this.container.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.matches('#cwv-run-audit-btn, #cwv-run-audit-btn *')) {
        const urlInput = this.container.querySelector('#cwv-input-url');
        const deviceSelect = this.container.querySelector('#cwv-device-select');
        const url = urlInput?.value?.trim();
        const device = deviceSelect?.value || 'mobile';
        
        if (url) this.loadData(url, { device });
      }

      // Compare button
      if (target.matches('#cwv-compare-btn')) {
        const competitorInput = this.container.querySelector('#cwv-competitor-url');
        if (competitorInput?.value) {
          this.runComparison(competitorInput.value);
        }
      }

      // History metric selector
      if (target.matches('#cwv-history-metric')) {
        const select = target;
        this.updateHistoryChart(select.value);
      }
    });

    // History metric change
    const historySelect = this.container?.querySelector('#cwv-history-metric');
    if (historySelect) {
      historySelect.addEventListener('change', (e) => {
        this.updateHistoryChart((e.target).value);
      });
    }
  }

  async runComparison(competitorUrl) {
    const resultsDiv = this.container?.querySelector('#cwv-comparison-results');
    if (!resultsDiv || !this.currentReport) return;

    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="color: var(--color-text-tertiary);">Loading competitor data...</p>';

    try {
      const competitorReport = await cwvCollector.generatePageReport(competitorUrl, { device: this.currentReport.device });
      const comparison = cwvScoringEngine.generateComparisonData(this.currentReport, competitorReport.metrics);
      
      resultsDiv.innerHTML = `
        <h4 style="font-size: var(--text-base); font-weight: var(--font-semibold); margin-bottom: var(--space-3);">
          Comparison: ${this.currentReport.url} vs ${competitorUrl}
        </h4>
        <div style="overflow-x: auto;">
          <table class="table" style="font-size: var(--text-sm);">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Us</th>
                <th>Them</th>
                <th>Difference</th>
                <th>Our Rating</th>
                <th>Their Rating</th>
                <th>Better</th>
              </tr>
            </thead>
            <tbody>
              ${comparison.map(c => `
                <tr>
                  <td>${CWV_THRESHOLDS[c.metric].label}</td>
                  <td>${this.formatValue(c.ourValue, CWV_THRESHOLDS[c.metric].unit)}</td>
                  <td>${this.formatValue(c.theirValue, CWV_THRESHOLDS[c.metric].unit)}</td>
                  <td style="color: ${c.weWin ? '#16a34a' : '#dc2626'}; font-weight: bold;">
                    ${c.weWin ? '+' : ''}${c.difference.toFixed(0)}ms
                  </td>
                  <td>${c.ourRating}</td>
                  <td>${c.theirRating}</td>
                  <td>${c.weWin ? '✅ Us' : '❌ Them'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
    } catch (error) {
      resultsDiv.innerHTML = `<p style="color: #dc2626;">Failed to load competitor data: ${error.message}</p>`;
    }
  }

  updateHistoryChart(metric) {
    const chart = this.charts.get('history');
    if (!chart || !this.historicalData.length) return;

    const labels = this.historicalData.map(p => new Date(p.date).toLocaleDateString());
    const data = this.historicalData.map(p => p.metrics[metric] || 0);
    const thresholds = CWV_THRESHOLDS[metric];

    chart.data = {
      labels,
      datasets: [{
        label: CWV_THRESHOLDS[metric].label,
        data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4
      }]
    };

    chart.options.plugins.title = {
      display: true,
      text: `${CWV_THRESHOLDS[metric].label} Trend (30 days)`,
      font: { size: 14, weight: 'bold' }
    };

    chart.update();
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  destroy() {
    this.stopAutoRefresh();
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
    this.container = null;
  }
}

// Load Chart.js dynamically
let Chart = null;

async function loadChartJS() {
  if (typeof window !== 'undefined' && (window).Chart) {
    Chart = (window).Chart;
    return Chart;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    script.onload = () => {
      Chart = (window).Chart;
      resolve(Chart);
    };
    script.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(script);
  });
}

// Export singleton
export const cwvDashboard = new CWVDashboard();

// Export class and types for external use
export { CWVDashboard, loadChartJS };

/**
 * @typedef {Object} DashboardConfig
 * @property {string[]} metrics - Metrics to display
 * @property {string} timeRange - Time range (e.g., '7d', '30d')
 * @property {string} granularity - 'hour' | 'day' | 'week'
 * @property {Object} filters - Filter configuration
 * @property {boolean} realTime - Whether real-time updates
 */

/**
 * @typedef {Object} ChartDataPoint
 * @property {number} x - X value (timestamp)
 * @property {number} y - Y value (metric value)
 * @property {string} [label] - Label
 * @property {string} [color] - Color
 */

// Export types for TypeScript consumers
/**
 * @typedef {Object} DashboardConfig
 * @typedef {Object} ChartDataPoint
 */
// Export types for TypeScript consumers
/**
 * @typedef {Object} DashboardConfig
 * @typedef {Object} ChartDataPoint
 */