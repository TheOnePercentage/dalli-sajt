/**
 * Chart.js Integration for ROAS Dashboard
 * Wrapper for Chart.js with DALLI theme support
 */

// Chart.js will be loaded from CDN
let Chart = null;
let chartInstances = new Map();

export async function loadChartJS() {
  if (typeof window !== 'undefined' && window.Chart) {
    Chart = window.Chart;
    return Chart;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    script.onload = () => {
      Chart = window.Chart;
      // Chart.js v4 auto-registers components, no manual registration needed
      resolve(Chart);
    };
    script.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(script);
  });
}

export function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
                 (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return {
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#a855f7',
    pink: '#ec4899',
    
    gridColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    textColor: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
    bgColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.8)',
    tooltipBg: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  };
}

export function createGradient(ctx, colorStops) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  colorStops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  return gradient;
}

export const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: { size: 12, family: 'Inter' }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: '#e2e8f0',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      cornerRadius: 8,
      titleFont: { size: 13, weight: '600' },
      bodyFont: { size: 12 },
      callbacks: {
        label: (context) => {
          const label = context.dataset.label || '';
          const value = context.parsed.y;
          return `${label}: ${typeof value === 'number' ? value.toLocaleString('sr-RS') : value}`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: 'rgba(0,0,0,0.5)', font: { size: 11 } }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.05)' },
      ticks: { color: 'rgba(0,0,0,0.5)', font: { size: 11 }, callback: (v) => v.toLocaleString('sr-RS') }
    }
  }
};

export function applyTheme(chart) {
  const colors = getChartColors();
  
  chart.options.plugins.legend.labels.color = colors.textColor;
  chart.options.scales.x.ticks.color = colors.textColor;
  chart.options.scales.y.ticks.color = colors.textColor;
  chart.options.scales.x.grid.color = colors.gridColor;
  chart.options.scales.y.grid.color = colors.gridColor;
  
  chart.update('none');
}

export function createROASChart(canvasId, data, options = {}) {
  if (!Chart) throw new Error('Chart.js not loaded');
  
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) throw new Error(`Canvas ${canvasId} not found`);
  
  const colors = getChartColors();
  
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Trošak (RSD)',
          data: data.spend,
          borderColor: colors.danger,
          backgroundColor: createGradient(ctx, [[0, `${colors.danger}33`], [1, `${colors.danger}00`]]),
          fill: true,
          tension: 0.3,
          yAxisID: 'y',
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Prihod (RSD)',
          data: data.revenue,
          borderColor: colors.success,
          backgroundColor: createGradient(ctx, [[0, `${colors.success}33`], [1, `${colors.success}00`]]),
          fill: true,
          tension: 0.3,
          yAxisID: 'y',
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'ROAS',
          data: data.roas,
          borderColor: colors.purple,
          backgroundColor: `${colors.purple}22`,
          fill: false,
          tension: 0.3,
          yAxisID: 'y1',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      ...options,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          ...CHART_DEFAULTS.scales.y,
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'RSD', color: colors.textColor }
        },
        y1: {
          ...CHART_DEFAULTS.scales.y,
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'ROAS', color: colors.purple },
          grid: { drawOnChartArea: false },
          min: 0,
          suggestedMax: Math.max(10, Math.max(...data.roas) * 1.2)
        }
      }
    }
  });
  
  chartInstances.set(canvasId, chart);
  return chart;
}

export function createStackedBarChart(canvasId, data, options = {}) {
  if (!Chart) throw new Error('Chart.js not loaded');
  
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) throw new Error(`Canvas ${canvasId} not found`);
  
  const colors = getChartColors();
  
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.color || [
          colors.primary, colors.success, colors.warning, colors.danger, colors.info, colors.purple, colors.pink
        ][i % 7],
        borderRadius: 4,
        borderSkipped: false
      }))
    },
    options: {
      ...CHART_DEFAULTS,
      ...options,
      scales: {
        ...CHART_DEFAULTS.scales,
        x: { ...CHART_DEFAULTS.scales.x, stacked: true },
        y: { ...CHART_DEFAULTS.scales.y, stacked: true }
      }
    }
  });
  
  chartInstances.set(canvasId, chart);
  return chart;
}

export function createDoughnutChart(canvasId, data, options = {}) {
  if (!Chart) throw new Error('Chart.js not loaded');
  
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) throw new Error(`Canvas ${canvasId} not found`);
  
  const colors = getChartColors();
  
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: data.colors || [
          colors.primary, colors.success, colors.warning, colors.danger, colors.info, colors.purple, colors.pink
        ],
        borderWidth: 0,
        cutout: '65%'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 16, font: { size: 11 } }
        },
        tooltip: CHART_DEFAULTS.plugins.tooltip
      }
    }
  });
  
  chartInstances.set(canvasId, chart);
  return chart;
}

export function destroyChart(canvasId) {
  const chart = chartInstances.get(canvasId);
  if (chart) {
    chart.destroy();
    chartInstances.delete(canvasId);
  }
}

export function destroyAllCharts() {
  chartInstances.forEach(chart => chart.destroy());
  chartInstances.clear();
}

export function updateChartTheme() {
  chartInstances.forEach(chart => applyTheme(chart));
}

// Listen for theme changes
if (typeof window !== 'undefined') {
  window.addEventListener('theme-change', updateChartTheme);
}

export default { loadChartJS, createROASChart, createStackedBarChart, createDoughnutChart, destroyChart, destroyAllCharts, updateChartTheme };