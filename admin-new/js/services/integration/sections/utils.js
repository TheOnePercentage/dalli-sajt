import { apiService } from '../../api.js';

export const utilsAPI = {
  healthCheck: () => apiService.healthCheck(),
  getSystemLogs: (params) => apiService.getSystemLogs(params),
  exportData: (type, params) => apiService.exportData(type, params),
};

export default utilsAPI;