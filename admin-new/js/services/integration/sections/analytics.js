import { apiService } from '../../api.js';

export const analyticsAPI = {
  getStats: period => apiService.getAnalyticsStats(period),
  getRevenueChart: period => apiService.getRevenueChart(period),
  getOrdersChart: period => apiService.getOrdersChart(period),
  getTrafficSources: period => apiService.getTrafficSources(period),
  getDeviceBreakdown: period => apiService.getDeviceBreakdown(period),
  getConversionFunnel: period => apiService.getConversionFunnel(period),
  getFinance: period => apiService.getFinance(period),
  getAccounting: params => apiService.getAccounting(params),
  getAdSpend: () => apiService.getAdSpend(),
  addAdSpend: entry => apiService.addAdSpend(entry),
  removeAdSpend: id => apiService.removeAdSpend(id),
  getSocialMetrics: refresh => apiService.getSocialMetrics(refresh),
};

export default analyticsAPI;
