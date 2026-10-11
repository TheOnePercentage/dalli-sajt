import { apiService } from '../../api.js';

function unwrapArray(res) {
  const data = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.inventory)) return data.inventory;
  return [];
}

export const inventoryAPI = {
  list: async (params) => unwrapArray(await apiService.getInventory(params)),
  adjustStock: (productId, adjustment) => apiService.adjustStock(productId, adjustment),
  getLowStock: (threshold) => apiService.getLowStock(threshold),
  getMovements: (productId, params) => apiService.getStockMovements(productId, params),
  getStats: () => apiService.getInventoryStats(),
  adjustInventory: (productId, adjustment) => apiService.adjustInventory(productId, adjustment),
};

export default inventoryAPI;