import { apiService } from '../../api.js';

export const settingsAPI = {
  get: () => apiService.getSettings(),
  update: (data) => apiService.updateSettings(data),
  getSystemInfo: () => apiService.getSystemInfo(),
  clearCache: () => apiService.clearCache(),
};

export default settingsAPI;