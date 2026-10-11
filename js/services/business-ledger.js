/**
 * Business Ledger & Manual Accounting Layer - Phase 22 extension
 * Architecture only
 */

const CONFIG_URL = '/data/business-ledger.json';
let _cache = null;

async function loadConfig() {
  if (_cache) return _cache;
  try {
    const res = await fetch(CONFIG_URL);
    if (res.ok) {
      _cache = await res.json();
      return _cache;
    }
  } catch (e) {
    console.warn('[BusinessLedger] Failed to load config', e);
  }
  return { manualRevenueEnabled: true };
}

export async function isManualRevenueEnabled() {
  const cfg = await loadConfig();
  return cfg.manualRevenueEnabled !== false;
}

export async function isManualExpensesEnabled() {
  const cfg = await loadConfig();
  return cfg.manualExpensesEnabled !== false;
}

export async function isBudgetPlannerEnabled() {
  const cfg = await loadConfig();
  return cfg.budgetPlannerEnabled !== false;
}

export async function isMonthlyClosingEnabled() {
  const cfg = await loadConfig();
  return cfg.monthlyClosingEnabled !== false;
}

export function calculateProfit(revenue = {}, expenses = {}) {
  const grossRevenue = (revenue.website || 0) + (revenue.manual || 0);
  const totalExpenses = (expenses.website || 0) + (expenses.manual || 0);
  const netRevenue = grossRevenue - (revenue.refunds || 0);
  const estimatedProfit = netRevenue - totalExpenses;
  const profitMargin = netRevenue === 0 ? 0 : (estimatedProfit / netRevenue) * 100;
  return {
    grossRevenue,
    totalExpenses,
    netRevenue,
    estimatedProfit,
    profitMargin: Math.round(profitMargin * 100) / 100,
    revenueGrowth: 0,
    expenseGrowth: 0
  };
}

export function getRevenueChannels() {
  return [
    'website', 'instagram', 'facebook', 'whatsapp', 'physical_store',
    'wholesale', 'b2b', 'event', 'marketplace', 'other'
  ];
}

export function getExpenseCategories() {
  return [
    'inventory_purchase', 'supplier_invoice', 'packaging', 'marketing', 'advertising',
    'photography', 'video_production', 'warehouse', 'store_rent', 'utilities',
    'accounting', 'legal', 'staff', 'travel', 'equipment', 'software', 'other'
  ];
}
