import { apiService } from '../../api.js';

function unwrapArray(res) {
  const data = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.promotions)) return data.promotions;
  if (data && Array.isArray(data.coupons)) return data.coupons;
  return [];
}

export const promotionsAPI = {
  list: async (params) => unwrapArray(await apiService.getPromotions(params)),
  create: (data) => apiService.createPromotion(data),
  update: (id, data) => apiService.updatePromotion(id, data),
  delete: (id) => apiService.deletePromotion(id),
  toggle: (id, active) => apiService.togglePromotion(id, active),
};

export default promotionsAPI;