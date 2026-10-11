/**
 * DALLI Analytics Dashboard
 * Mobile-first, SEO-optimized, Real-time
 * Components: Metric Cards, Charts, Date Range, Funnel, Cohort, Real-time Indicators, Export
 */

export class AnalyticsDashboard {
  static init() {
    this.initMetricCards();
    this.initCharts();
    this.initDateRangePicker();
    this.initFunnel();
    this.initCohortAnalysis();
    this.initRealTimeIndicators();
    this.initExport();
    this.initRealTimeUpdates();
  }

  // ============================================================
  // METRIC CARDS (KPIs, Trends, Comparisons)
  // ============================================================
  static initMetricCards() {
    document.querySelectorAll('.analytics-metric-card').forEach(card => {
      const url = card.dataset.url;
      const refreshBtn = card.querySelector('[data-metric-refresh]');
      const trend = card.querySelector('[data-metric-trend]');
      const comparison = card.querySelector('[data-metric-comparison]');
      const format = card.dataset.format || 'number';

      if (url) {
        this.loadMetric(card, url);
      }

      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this.loadMetric(card, url));
      }

      // Format value
      const valueEl = card.querySelector('[data-metric-value]');
      if (valueEl && valueEl.dataset.value) {
        valueEl.textContent = this.formatValue(valueEl.dataset.value, format);
      }

      // Trend indicator
      if (trend && trend.dataset.trend !== undefined) {
        const trendValue = parseFloat(trend.dataset.trend);
        trend.textContent = `${trendValue >= 0 ? '+' : ''}${trendValue}%`;
        trend.className = `analytics-metric__trend analytics-metric__trend--${trendValue >= 0 ? 'positive' : 'negative'}`;
        trend.innerHTML = `${trendValue >= 0 ? '↑' : '↓'} ${Math.abs(trendValue)}%`;
      }

      // Comparison (WoW, MoM, YoY)
      if (comparison) {
        const current = parseFloat(comparison.dataset.current);
        const previous = parseFloat(comparison.dataset.previous);
        if (!isNaN(current) && !isNaN(previous) && previous > 0) {
          const change = ((current - previous) / previous * 100);
          comparison.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs prethodni period`;
          comparison.className = `analytics-metric__comparison analytics-metric__comparison--${change >= 0 ? 'positive' : 'negative'}`;
        }
      }
    });
  }

  static loadMetric(card, url) {
    const valueEl = card.querySelector('[data-metric-value]');
    const loader = card.querySelector('.analytics-metric__loader');
    const format = card.dataset.format || 'number';

    if (loader) loader.style.display = 'flex';
    if (valueEl) valueEl.style.opacity = '0.5';

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (valueEl) {
          valueEl.textContent = this.formatValue(data.value, card.dataset.format);
          valueEl.dataset.value = data.value;
        }
        if (card.querySelector('[data-metric-trend]') && data.trend !== undefined) {
          const trendEl = card.querySelector('[data-metric-trend]');
          const trend = data.trend;
          trendEl.textContent = `${trend >= 0 ? '+' : ''}${trend}%`;
          trendEl.className = `analytics-metric__trend analytics-metric__trend--${trend >= 0 ? 'positive' : 'negative'}`;
          trendEl.innerHTML = `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%`;
        }
        if (card.querySelector('[data-metric-comparison]') && data.previous !== undefined) {
          const current = parseFloat(card.querySelector('[data-metric-value]')?.dataset.value || 0);
          const previous = data.previous;
          if (previous > 0) {
            const change = ((data.value - previous) / previous * 100);
            const compEl = card.querySelector('[data-metric-comparison]');
            compEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs prethodni`;
            compEl.className = `analytics-metric__comparison analytics-metric__comparison--${change >= 0 ? 'positive' : 'negative'}`;
          }
        }
      })
      .catch(() => {
        window.showToast?.('Greška pri učitavanju metrike', 'error');
      })
      .finally(() => {
        if (loader) loader.style.display = 'none';
        if (valueEl) valueEl.style.opacity = '1';
      });
  }

  static formatValue(value, format) {
    if (format === 'currency') {
      return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', minimumFractionDigits: 0 }).format(value);
    }
    if (format === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    if (format === 'compact') {
      if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
      if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
      return value.toLocaleString('sr-RS');
    }
    return value.toLocaleString('sr-RS');
  }

  // ============================================================
  // CHARTS (Line, Bar, Doughnut, Area, Mixed)
  // ============================================================
  static initCharts() {
    document.querySelectorAll('.analytics-chart').forEach(wrapper => {
      const type = wrapper.dataset.chartType || 'line';
      const dataUrl = wrapper.dataset.url;
      const options = wrapper.dataset.options ? JSON.parse(wrapper.dataset.options) : {};

      if (dataUrl) {
        this.loadChartData(wrapper, dataUrl, type, options);
      } else {
        this.renderChart(wrapper, JSON.parse(wrapper.dataset.data || '{}'), type, options);
      }

      // Download button
      const downloadBtn = wrapper.querySelector('[data-chart-download]');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => this.downloadChart(wrapper));
      }

      // Period selector
      const periodSelect = wrapper.querySelector('[data-chart-period]');
      if (periodSelect) {
        periodSelect.addEventListener('change', (e) => {
          this.updateChartPeriod(wrapper, e.target.value);
        });
      }
    });
  }

  static loadChartData(wrapper, url, type, options) {
    const canvas = wrapper.querySelector('canvas');
    const loader = wrapper.querySelector('.analytics-chart__loader');

    if (loader) loader.style.display = 'flex';
    if (canvas) canvas.style.opacity = '0.5';

    fetch(wrapper.dataset.url)
      .then(res => res.json())
      .then(data => this.renderChart(wrapper, data, type, options))
      .catch(() => {
        wrapper.innerHTML = '<div class="analytics-chart__error">Greška pri učitavanju grafikona</div>';
      })
      .finally(() => {
        if (loader) loader.style.display = 'none';
        if (canvas) canvas.style.opacity = '1';
      });
  }

  static renderChart(wrapper, data, type, options) {
    const canvas = wrapper.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (window.Chart) {
      if (wrapper.chart) wrapper.chart.destroy();

      wrapper.chart = new Chart(ctx, {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { color: 'var(--color-text-secondary)', usePointStyle: true, padding: 20 } },
            tooltip: { 
              backgroundColor: 'var(--color-surface)', 
              titleColor: 'var(--color-text)', 
              bodyColor: 'var(--color-text)', 
              borderColor: 'var(--color-border)', 
              borderWidth: 1,
              padding: 12,
              displayColors: true
            }
          },
          scales: {
            x: { grid: { color: 'var(--color-border)' }, ticks: { color: 'var(--color-text-secondary)' } },
            y: { grid: { color: 'var(--color-border)' }, ticks: { color: 'var(--color-text-secondary)' }, beginAtZero: true }
          },
elements: { line: { tension: 0.3 }, point: { radius: 4, hoverRadius: 6 } }
       }});
      return;
    }

    // Fallback
    this.drawSimpleChart(canvas, data, type);
  }

  static drawSimpleChart(ctx, data, type) {
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const w = canvas.width / 2;
    const h = canvas.height / 2;
    const padding = 40;
    const maxVal = Math.max(...data.datasets[0].data);
    
    if (data.datasets[0].type === 'line' || type === 'line') {
      ctx.strokeStyle = 'var(--color-primary)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.labels.forEach((label, i) => {
        const x = 40 + (i / (data.labels.length - 1)) * (canvas.width - 80);
        const y = canvas.height - 40 - (data.datasets[0].data[i] / Math.max(...data.datasets[0].data) * (canvas.height - 80));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  static updateChartPeriod(wrapper, period) {
    const url = wrapper.dataset.url.replace(/period=[^&]+/, `period=${period}`);
    wrapper.dataset.url = url;
    this.loadChartData(wrapper, url, wrapper.dataset.chartType, JSON.parse(wrapper.dataset.options || '{}'));
  }

  static downloadChart(wrapper) {
    const canvas = wrapper.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `chart-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // ============================================================
  // DATE RANGE PICKER (Presets, Custom, URL Sync)
  // ============================================================
  static initDateRangePicker() {
    document.querySelectorAll('.analytics-date-range').forEach(picker => {
      const startInput = picker.querySelector('[data-date-start]');
      const endInput = picker.querySelector('[data-date-end]');
      const presets = picker.querySelectorAll('[data-preset]');
      const applyBtn = picker.querySelector('[data-date-apply]');
      const clearBtn = picker.querySelector('[data-date-clear]');
      const urlSync = picker.dataset.urlSync === 'true';

      const updateFromUrl = () => {
        if (!urlSync) return;
        const params = new URLSearchParams(window.location.search);
        if (params.has('date_start')) startInput.value = params.get('date_start');
        if (params.has('date_end')) endInput.value = params.get('date_end');
      };

      const syncToUrl = () => {
        if (!urlSync) return;
        const params = new URLSearchParams(window.location.search);
        params.set('date_start', startInput.value);
        params.set('date_end', endInput.value);
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
      };

      const updatePresets = () => {
        const start = new Date(startInput.value);
        const end = new Date(endInput.value);
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        presets.forEach(btn => {
          const preset = btn.dataset.preset;
          let match = false;
          if (preset === 'today' && diff === 0) match = true;
          if (preset === 'yesterday' && diff === 1 && start.toDateString() === new Date(Date.now() - 86400000).toDateString()) match = true;
          if (preset === '7d' && diff === 6) match = true;
          if (preset === '30d' && diff === 29) match = true;
          if (preset === '90d' && diff === 89) match = true;
          if (preset === 'this_month' && start.getDate() === 1 && end.getDate() === new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()) match = true;
          if (preset === 'last_month' && end.getDate() === new Date(start.getFullYear(), start.getMonth(), 0).getDate()) match = true;
          
          btn.classList.toggle('active', match);
        });
      };

      // Preset buttons
      picker.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          const preset = btn.dataset.preset;
          const end = new Date();
          let start = new Date();

          switch (preset) {
            case 'today': start = new Date(); break;
            case 'yesterday': 
              start = new Date(Date.now() - 86400000);
              end = new Date(start);
              break;
            case '7d': start.setDate(end.getDate() - 6); break;
            case '30d': start.setDate(end.getDate() - 29); break;
            case '90d': start.setDate(end.getDate() - 89); break;
            case 'this_month': start = new Date(end.getFullYear(), end.getMonth(), 1); break;
            case 'last_month': 
              start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
              end = new Date(end.getFullYear(), end.getMonth(), 0);
              break;
            case 'custom': return; // Don't change dates
          }

          startInput.value = start.toISOString().split('T')[0];
          endInput.value = end.toISOString().split('T')[0];
          picker.dispatchEvent(new CustomEvent('analytics:datechange', { detail: { start: startInput.value, end: endInput.value } }));
        });
      });

      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          picker.dispatchEvent(new CustomEvent('analytics:datechange', { detail: { start: startInput.value, end: endInput.value } }));
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          startInput.value = '';
          endInput.value = '';
          picker.dispatchEvent(new CustomEvent('analytics:datechange', { detail: { start: '', end: '' } }));
        });
      }

      // Auto-sync
      [startInput, endInput].forEach(input => {
        input.addEventListener('change', () => {
          syncToUrl();
          picker.dispatchEvent(new CustomEvent('analytics:datechange', { detail: { start: startInput.value, end: endInput.value } }));
        });
      });

      updateFromUrl();
      updatePresets();
    });
  }

  // ============================================================
  // FUNNEL ANALYSIS (Steps, Conversion Rates, Drop-offs)
  // ============================================================
  static initFunnel() {
    document.querySelectorAll('.analytics-funnel').forEach(funnel => {
      const steps = funnel.querySelectorAll('.analytics-funnel__step');
      const url = funnel.dataset.url;

      if (url) {
        this.loadFunnel(funnel);
      }

      // Step click for details
      funnel.querySelectorAll('.analytics-funnel__step').forEach(step => {
        step.addEventListener('click', () => {
          const detail = step.querySelector('.analytics-funnel__detail');
          if (detail) {
            detail.classList.toggle('open');
            step.setAttribute('aria-expanded', detail.classList.contains('open'));
          }
        });
      });
    });
  }

  static loadFunnel(funnel) {
    const steps = funnel.querySelectorAll('.analytics-funnel__step');
    const loader = funnel.querySelector('.analytics-funnel__loader');

    if (loader) loader.style.display = 'flex';

    fetch(funnel.dataset.url)
      .then(res => res.json())
      .then(data => {
        data.steps.forEach((step, i) => {
          const stepEl = funnel.querySelectorAll('.analytics-funnel__step')[i];
          if (!stepEl) return;

          const valueEl = stepEl.querySelector('[data-funnel-value]');
          const rateEl = stepEl.querySelector('[data-funnel-rate]');
          const dropoffEl = stepEl.querySelector('[data-funnel-dropoff]');
          const barEl = stepEl.querySelector('[data-funnel-bar]');

          if (valueEl) valueEl.textContent = step.value.toLocaleString('sr-RS');
          if (rateEl) rateEl.textContent = `${step.rate.toFixed(1)}%`;
          if (dropoffEl) dropoffEl.textContent = `${step.dropoff.toFixed(1)}% ispalo`;
          if (barEl) barEl.style.width = `${step.rate}%`;
        });

        // Overall conversion
        const overall = funnel.querySelector('[data-funnel-overall]');
        if (overall) overall.textContent = `${data.overallRate.toFixed(1)}%`;
      })
      .catch(() => {
        window.showToast?.('Greška pri učitavanju lejka', 'error');
      })
      .finally(() => {
        if (loader) loader.style.display = 'none';
      });
  }

  // ============================================================
  // COHORT ANALYSIS (Retention Matrix, Heatmap)
  // ============================================================
  static initCohortAnalysis() {
    document.querySelectorAll('.analytics-cohort').forEach(cohort => {
      const url = cohort.dataset.url;
      const metric = cohort.dataset.metric || 'retention';
      const period = cohort.dataset.period || 'weekly';

      if (url) {
        this.loadCohort(cohort, url);
      }

      // Metric selector
      cohort.querySelectorAll('[data-cohort-metric]').forEach(btn => {
        btn.addEventListener('click', () => {
          cohort.querySelectorAll('[data-cohort-metric]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          cohort.dataset.metric = btn.dataset.metric;
          this.loadCohort(cohort, cohort.dataset.url);
        });
      });

      // Period selector
      cohort.querySelectorAll('[data-cohort-period]').forEach(btn => {
        btn.addEventListener('click', () => {
          cohort.querySelectorAll('[data-cohort-period]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          cohort.dataset.period = btn.dataset.period;
          this.loadCohort(cohort, cohort.dataset.url);
        });
      });
    });
  }

  static loadCohort(cohort, url) {
    const table = cohort.querySelector('.analytics-cohort__table');
    const loader = cohort.querySelector('.analytics-cohort__loader');

    if (loader) loader.style.display = 'flex';

    fetch(`${url}?metric=${cohort.dataset.metric}&period=${cohort.dataset.period}`)
      .then(res => res.json())
      .then(data => {
        if (!table) return;

        // Header
        const thead = table.querySelector('thead');
        if (thead) {
          thead.innerHTML = `
            <tr>
              <th>Kohorta</th>
              <th>Veličina</th>
              ${data.periods.map(p => `<th>${p}</th>`).join('')}
              <th>Prosečno</th>
            </tr>
          `;
        }

        // Body
        const tbody = table.querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = data.cohorts.map(cohort => `
            <tr>
              <td class="analytics-cohort__label">${cohort.label}</td>
              <td class="analytics-cohort__size">${cohort.size.toLocaleString('sr-RS')}</td>
              ${cohort.values.map((v, i) => `
                <td class="analytics-cohort__cell analytics-cohort__cell--${v >= 50 ? 'high' : v >= 25 ? 'medium' : 'low'}" 
                    style="--intensity: ${v / 100}">${v.toFixed(1)}%</td>
              `).join('')}
              <td class="analytics-cohort__avg">${cohort.average.toFixed(1)}%</td>
            </tr>
          `).join('');
        }
      })
      .catch(() => window.showToast?.('Greška pri učitavanju kohorte', 'error'))
      .finally(() => {
        const loader = document.querySelector('.analytics-cohort__loader');
        if (loader) loader.style.display = 'none';
      });
  }

  // ============================================================
  // REAL-TIME INDICATORS (Live Visitors, Orders, Revenue)
  // ============================================================
  static initRealTimeIndicators() {
    document.querySelectorAll('.analytics-realtime').forEach(indicator => {
      const metrics = indicator.querySelectorAll('.analytics-realtime__metric');
      const status = indicator.querySelector('.analytics-realtime__status');
      const url = indicator.dataset.url;
      const interval = parseInt(indicator.dataset.interval || '5000', 10);

      const update = async () => {
        try {
          const res = await fetch(indicator.dataset.url);
          const data = await res.json();

          metrics.forEach(metric => {
            const key = metric.dataset.key;
            const valueEl = metric.querySelector('[data-realtime-value]');
            const trendEl = metric.querySelector('[data-realtime-trend]');
            
            if (valueEl && data[key] !== undefined) {
              metric.dataset.value = data[key];
              valueEl.textContent = data[key].toLocaleString('sr-RS');
            }
            if (trendEl && data[`${key}_trend`] !== undefined) {
              const trend = data[`${key}_trend`];
              trendEl.textContent = `${trend >= 0 ? '+' : ''}${trend}%`;
              trendEl.className = `analytics-realtime__trend analytics-realtime__trend--${trend >= 0 ? 'positive' : 'negative'}`;
            }
          });

          if (status) {
            status.textContent = 'Uživo';
            status.className = 'analytics-realtime__status analytics-realtime__status--live';
          }
        } catch (e) {
          if (status) {
            status.textContent = 'Prekinuto';
            status.className = 'analytics-realtime__status analytics-realtime__status--offline';
          }
        }
      };

      // Initial load
      this.update();

      // Interval
      const intervalId = setInterval(update, interval);
      indicator.dataset.intervalId = intervalId;
    });
  }

  // ============================================================
  // EXPORT (CSV, PDF, Excel, JSON)
  // ============================================================
  static initExport() {
    document.querySelectorAll('[data-export]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const format = btn.dataset.export; // csv, pdf, excel, json
        const source = btn.dataset.source; // table, chart, funnel, cohort, custom
        const sourceEl = document.getElementById(btn.dataset.sourceId);

        btn.disabled = true;
        btn.textContent = 'Izvoz...';

        try {
          let data;
          if (source === 'table' && sourceEl) {
            data = this.tableToData(sourceEl);
          } else if (source === 'chart' && sourceEl) {
            data = sourceEl.chart?.data;
          } else if (source === 'custom') {
            data = JSON.parse(btn.dataset.customData || '{}');
          }

          switch (format) {
            case 'csv': this.exportCSV(data, btn.dataset.filename || 'export.csv'); break;
            case 'json': this.exportJSON(data, btn.dataset.filename || 'export.json'); break;
            case 'excel': await this.exportExcel(data, btn.dataset.filename || 'export.xlsx'); break;
            case 'pdf': await this.exportPDF(sourceEl, btn.dataset.filename || 'export.pdf'); break;
          }

          window.showToast?.(`Uspešno izvezено u ${format.toUpperCase()}`, 'success');
        } catch (e) {
          window.showToast?.('Greška pri izvozu', 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = btn.dataset.originalText || 'Izvezi';
        }
      });
    });
  }

  static tableToData(table) {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => 
      Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim())
    );
    return { headers, rows };
  }

  static exportCSV(data, filename) {
    if (!data.headers || !data.rows) return;
    const csv = [data.headers.join(','), ...data.rows.map(r => r.join(','))].join('\n');
    this.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
  }

  static exportJSON(data, filename) {
    this.downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
  }

  static async exportExcel(data, filename) {
    // Using SheetJS if available, fallback to CSV
    if (window.XLSX) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
      XLSX.utils.book_append_sheet(wb, ws, 'Export');
      XLSX.writeFile(wb, filename);
    } else {
      this.exportCSV(data, filename.replace('.xlsx', '.csv'));
      window.showToast?.('SheetJS nije učitan, izvezeno kao CSV', 'warning');
    }
  }

  static async exportPDF(element, filename) {
    if (window.html2pdf) {
      await html2pdf().from(element).save(filename);
    } else {
      window.showToast?.('html2pdf nije učitan, preuzmite kao sliku', 'warning');
    }
  }

  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // REAL-TIME UPDATES (WebSocket, SSE, Polling)
  // ============================================================
  static initRealTimeUpdates() {
    // WebSocket connection for real-time analytics
    if (window.WebSocket && document.querySelector('[data-ws-url]')) {
      this.connectWebSocket();
    }

    // Server-Sent Events fallback
    if (document.querySelector('[data-sse-url]')) {
      this.connectSSE();
    }

    // Polling fallback
    this.startPolling();
  }

  static connectWebSocket() {
    const url = document.querySelector('[data-ws-url]').dataset.wsUrl;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected for real-time analytics');
      document.querySelectorAll('.analytics-realtime__status').forEach(el => {
        el.textContent = 'Uživo';
        el.className = 'analytics-realtime__status analytics-realtime__status--live';
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealtimeMessage(data);
    };

    ws.onclose = () => {
      document.querySelectorAll('.analytics-realtime__status').forEach(el => {
        el.textContent = 'Prekinuto';
        el.className = 'analytics-realtime__status analytics-realtime__status--offline';
      });
      setTimeout(() => this.connectWebSocket(), 5000);
    };

    window.analyticsWS = ws;
  }

  static connectSSE() {
    const url = document.querySelector('[data-sse-url]').dataset.sseUrl;
    const evtSource = new EventSource(url);

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealtimeMessage(data);
    };

evtSource.onerror = () => {
      document.querySelectorAll('.analytics-realtime__status').forEach(el => {
        el.textContent = 'Prekinuto';
        el.className = 'analytics-realtime__status analytics-realtime__status--offline';
      });
    };

    window.analyticsSSE = evtSource;
  }

  static startPolling() {
    const pollInterval = 30000;
    const urls = Array.from(document.querySelectorAll('[data-poll-url]')).map(el => el.dataset.pollUrl);

    if (urls.length === 0) return;

    setInterval(async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          const data = await res.json();
          this.handleRealtimeMessage(data);
        } catch (e) {
          console.warn('Polling failed for', url);
        }
      }
    }, 30000);
  }

  static handleRealtimeMessage(data) {
    // Dispatch to relevant components
    document.dispatchEvent(new CustomEvent('analytics:realtime', { detail: data }));

    // Update metric cards
    if (data.metrics) {
      Object.entries(data.metrics).forEach(([key, value]) => {
        const cards = document.querySelectorAll(`[data-metric-key="${key}"]`);
        cards.forEach(card => {
          const valueEl = card.querySelector('[data-metric-value]');
          if (valueEl) valueEl.textContent = value.toLocaleString('sr-RS');
        });
      });

      // Update real-time indicators
      if (data.realtime) {
        Object.entries(data.realtime).forEach(([key, value]) => {
          const metrics = document.querySelectorAll(`[data-realtime-key="${key}"]`);
          metrics.forEach(metric => {
            const valueEl = metric.querySelector('[data-realtime-value]');
            const trendEl = metric.querySelector('[data-realtime-trend]');
            if (valueEl) valueEl.textContent = value.toLocaleString('sr-RS');
            if (trendEl && data[`${key}_trend`] !== undefined) {
              const trend = data[`${key}_trend`];
              trendEl.textContent = `${trend >= 0 ? '+' : ''}${trend}%`;
              trendEl.className = `analytics-realtime__trend analytics-realtime__trend--${trend >= 0 ? 'positive' : 'negative'}`;
            }
          });
        });
      }
    }
  }

  // Auto-initialize
  static init() {
    this.initMetricCards();
    this.initCharts();
    this.initDateRangePicker();
    this.initFunnel();
    this.initCohortAnalysis();
    this.initRealTimeIndicators();
    this.initExport();
    this.initRealTimeUpdates();
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AnalyticsDashboard.init());
} else {
  AnalyticsDashboard.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnalyticsDashboard };
}

if (typeof window !== 'undefined') {
  window.AnalyticsDashboard = AnalyticsDashboard;
}