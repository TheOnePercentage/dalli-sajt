import { apiService } from '../../api.js';

function unwrapArray(res) {
  const data = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.customers)) return data.customers;
  if (data && Array.isArray(data.users)) return data.users;
  return [];
}

export const customersAPI = {
  list: async (params) => unwrapArray(await apiService.getCustomers(params)),
  get: (id) => apiService.getCustomer(id),
  create: (data) => apiService.createCustomer(data),
  update: (id, data) => apiService.updateCustomer(id, data),
  delete: (id) => apiService.deleteCustomer(id),
  getOrders: (customerId, params) => apiService.getCustomerOrders(customerId, params),
  getStats: (customerId) => apiService.getCustomerStats(customerId),
  export: (params) => apiService.exportCustomers(params),
  getAllStats: () => apiService.getCustomerStats(),
  getSegments: () => apiService.getCustomerSegments(),
};

export default customersAPI;