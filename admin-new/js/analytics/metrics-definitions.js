// analytics metrics definitions and calculations
// Step 1: Data Structure & Metrics Definition

const CURRENCY = 'RSD';
const SITE_URL = 'https://dalli.rs';

/**
 * Metric types with calculation formulas
 * All metrics are calculated based on available data sources:
 * - products: price, category, inventory data
 * - orders: 50 mock orders with items, subtotal, shipping, status, date
 * - customers: 100 mock customers with segment, orderCount, totalSpent, avgOrderValue
 */

export const METRICS = {
  // 1. Total Revenue - sum of all order totals
  REVENUE: {
    name: 'Ukupni Prenos',
    description: 'Ukupan iznos svih izvršenih porudžbina',
    unit: CURRENCY,
    category: 'financial',
    calculation: (orders) => {
      if (!orders || orders.length === 0) return 0;
      return orders.reduce((sum, order) => sum + order.total, 0);
    },
    format: (value) => `${ImperiumUtils.formatCurrency(value)}`,
    precision: 0,
  },

  // 2. Conversion Rate - percentage of visitors/sessions that result in orders
  // Formula: (Number of orders / Number of sessions/visitors) * 100
  // Note: Requires visitor/session data which may need to be added
  CONVERSION_RATE: {
    name: 'Stopa Pretvorbe',
    description: 'Postotak posetilaca koji naprave kupovinu',
    unit: '%',
    category: 'conversion',
    calculation: (orders, sessions = 0) => {
      if (sessions === 0 || !orders) return 0;
      // Assuming sessions can be derived or passed; using orders count as proxy
      const uniqueCustomers = new Set(orders.map(o => o.customer.id)).size;
      return Math.round((uniqueCustomers / Math.max(sessions, 1)) * 100);
    },
    format: (value) => `${value}%`,
    precision: 2,
  },

  // 3. Average Order Value (AOV) - average total per order
  AOV: {
    name: 'Prosečna Vrednost Porudžbine',
    description: 'Prosek ukupnog iznosa po jednoj porudžbini',
    unit: CURRENCY,
    category: 'financial',
    calculation: (orders) => {
      if (!orders || orders.length === 0) return 0;
      const total = orders.reduce((sum, order) => sum + order.total, 0);
      return Math.round(total / orders.length);
    },
    format: (value) => `${ImperiumUtils.formatCurrency(value)}`,
    precision: 0,
  },

  // 4. Repeat Customer Rate - percentage of customers with more than 1 order
  REPEAT_CUSTOMER_RATE: {
    name: 'Stopa Vraćajućih Kupaca',
    description: 'Postotak kupaca koji su napravili više od jedne porudžbine',
    unit: '%',
    category: 'retention',
    calculation: (customers) => {
      if (!customers || customers.length === 0) return 0;
      const repeatCustomers = customers.filter(c => c.orderCount > 1).length;
      return Math.round((repeatCustomers / customers.length) * 100);
    },
    format: (value) => `${value}%`,
    precision: 0,
  },

  // 5. Profit Margin - gross margin percentage
  // Formula: (Revenue - COGS) / Revenue * 100
  // For now, using approximate margin based on product pricing
  PROFIT_MARGIN: {
    name: 'Ukupan Marž',
    description: 'Brutni marž iznos (Revenue - COGS) u postocima',
    unit: '%',
    category: 'financial',
    calculation: (orders, products) => {
      if (!orders || !products || orders.length === 0) return 0;
      
      // Approximate COGS based on typical retail markup
      // Assuming 60% margin on products (40% COGS)
      // This can be refined with actual cost data later
      const revenue = orders.reduce((sum, order) => sum + order.total, 0);
      const cogsEstimate = revenue * 0.4; // 40% cost of goods sold
      const profit = revenue - cogsEstimate;
      
      return Math.round((profit / revenue) * 100);
    },
    format: (value) => `${value}%`,
    precision: 0,
  },

  // 6. Customer Acquisition Cost (CAC) - marketing cost per acquired customer
  CAC: {
    name: 'Cena Akvizicije Kupca',
    description: 'Prosecni marketing trošak za acquisition jednog novog kupca',
    unit: CURRENCY,
    category: 'marketing',
    calculation: (customers, marketingBudget) => {
      const totalCustomers = customers.filter(c => c.status === 'active' || c.orderCount > 0).length;
      const activeCustomers = Math.max(totalCustomers, 1);
      return Math.round((marketingBudget || 0) / activeCustomers);
    },
    format: (value) => `${ImperiumUtils.formatCurrency(value)}`,
    precision: 0,
  },

  // 7. Return on Ad Spend (ROAS) - revenue generated per ad spend unit
  ROAS: {
    name: 'ROAS (Return on Ad Spend)',
    description: 'Izdeljeni ingreso po jedinici marketing troška',
    unit: '',
    category: 'marketing',
    calculation: (revenue, adSpend) => {
      const rev = revenue || 0;
      const spend = adSpend || 1; // Avoid division by zero
      return Math.round((rev / spend) * 100) / 100; // Round to 2 decimal places
    },
    format: (value) => value > 1 ? `${value}x` : `${value} (below 1x)`,
    precision: 2,
  },

  // 8. Customer Lifetime Value (LTV) - total expected revenue from a customer
  LTV: {
    name: 'Prosečni LTV (Lifetime Value)',
    description: 'Prosecni ukupan prihod po životnom ciklusu kupca',
    unit: CURRENCY,
    category: 'retention',
    calculation: (customers) => {
      if (!customers || customers.length === 0) return 0;
      const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
      const totalCustomers = customers.filter(c => c.orderCount > 0).length;
      const activeCustomers = Math.max(totalCustomers, 1);
      return Math.round(totalRevenue / activeCustomers);
    },
    format: (value) => `${ImperiumUtils.formatCurrency(value)}`,
    precision: 0,
  },
};

/**
 * Data sources - paths to existing data
 * These will be used by the dashboard to fetch/calculate metrics
 */

export const DATA_SOURCES = {
  ORDERS: {
    path: '/admin-new/js/sections/orders.js',
    type: 'orders',
    description: '50 mock orders with full transaction data',
    keyField: 'id',
    metricsSupporting: ['REVENUE', 'CONVERSION_RATE', 'AOV', 'PROFIT_MARGIN', 'CAC', 'ROAS'],
  },

  CUSTOMERS: {
    path: '/admin-new/js/sections/customers.js',
    type: 'customers',
    description: '100 mock customers with segment and order history',
    keyField: 'id',
    metricsSupporting: ['REPEAT_CUSTOMER_RATE', 'PROFIT_MARGIN', 'CAC', 'LTV'],
  },

  PRODUCTS: {
    path: '/data/products.json',
    type: 'products',
    description: '8 products with pricing and inventory data',
    keyField: 'id',
    metricsSupporting: ['PROFIT_MARGIN', 'REVENUE'],
  },
};

/**
 * Initial metrics state - calculated values that dashboard will display
 */

export const INITIAL_METRICS_STATE = {
  REVENUE: 0,
  CONVERSION_RATE: 0,
  AOV: 0,
  REPEAT_CUSTOMER_RATE: 0,
  PROFIT_MARGIN: 0,
  CAC: 0,
  ROAS: 0,
  LTV: 0,
  // Supporting data for calculations
  lastCalculated: null,
  calculationErrors: [],
};

/**
 * Helper function to calculate all 8 metrics
 * @param {Object} options - Data sources
 * @param {Array} options.orders - Order data array
 * @param {Array} options.customers - Customer data array  
 * @param {Array} options.products - Product data array
 * @param {number} options.marketingBudget - Total marketing spend
 * @param {number} options.sessions - Number of site sessions (for conversion rate)
 * @param {number} options.adSpend - Total ad spend amount
 * @returns {Object} Calculated metrics
 */

export function calculateAllMetrics({
  orders = [],
  customers = [],
  products = [],
  marketingBudget = 0,
  sessions = 0,
  adSpend = 0,
}) {
  const results = {};

  // REVENUE
  results[METRICS.REVENUE.name] = METRICS.REVENUE.calculation(orders);

  // CONVERSION_RATE
  results[METRICS.CONVERSION_RATE.name] = METRICS.CONVERSION_RATE.calculation(orders, sessions);

  // AOV
  results[METRICS.AOV.name] = METRICS.AOV.calculation(orders);

  // REPEAT_CUSTOMER_RATE
  results[METRICS.REPEAT_CUSTOMER_RATE.name] = METRICS.REPEAT_CUSTOMER_RATE.calculation(customers);

  // PROFIT_MARGIN
  results[METRICS.PROFIT_MARGIN.name] = METRICS.PROFIT_MARGIN.calculation(orders, products);

  // CAC
  results[METRICS.CAC.name] = METRICS.CAC.calculation(customers, marketingBudget);

  // ROAS
  results[METRICS.ROAS.name] = METRICS.ROAS.calculation(results[METRICS.REVENUE.name], adSpend);

  // LTV
  results[METRICS.LTV.name] = METRICS.LTV.calculation(customers);

  return results;
}

export default {
  METRICS,
  DATA_SOURCES,
  INITIAL_METRICS_STATE,
  calculateAllMetrics,
};