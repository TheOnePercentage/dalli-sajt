import { apiService } from '../../api.js';

function unwrapArray(res) {
  const data = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.orders)) return data.orders;
  return [];
}

function unwrapOrder(res) {
  const data = res && res.data !== undefined ? res.data : res;
  if (data && data.order) return data.order;
  return data;
}

export const ordersAPI = {
  list: async params => unwrapArray(await apiService.getOrders(params)),
  get: async id => unwrapOrder(await apiService.getOrder(id)),
  updateStatus: (id, status, notes) => apiService.updateOrderStatus(id, status, notes),
  export: params => apiService.exportOrders(params),
  getDetails: id => apiService.getOrderDetails(id),
  updateNotes: (id, notes) => apiService.updateOrderNotes(id, notes),
  trashList: async params => unwrapArray(await apiService.getTrashOrders(params)),
  delete: id => apiService.deleteOrder(id),
  restore: id => apiService.restoreOrder(id),
  purge: id => apiService.purgeOrder(id),
  notifications: async () => {
    const res = await apiService.getOrderNotifications();
    const data = res && res.data !== undefined ? res.data : res;
    return {
      unread: data?.unread || 0,
      notifications: Array.isArray(data?.notifications) ? data.notifications : [],
    };
  },
  markNotificationsRead: () => apiService.markOrderNotificationsRead(),
};

export default ordersAPI;
