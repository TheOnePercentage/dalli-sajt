import { apiService } from '../../api.js';

export const dashboardAPI = {
  getStats: (period = '30d') => apiService.getDashboardStats(period),
  getRevenueChart: (period = '30d') => apiService.getRevenueChart(period),
  getOrdersChart: (period = '30d') => apiService.getOrdersChart(period),
  getRecentOrders: (limit = 10) => apiService.getRecentOrders(limit),
  getRecentActivity: (limit = 8) => apiService.getRecentActivity(limit),
  getTopProducts: (limit = 6) => apiService.getTopProducts(limit),
};

export default dashboardAPI;