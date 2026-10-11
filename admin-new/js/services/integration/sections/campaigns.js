import { apiService } from '../../api.js';

function unwrapArray(res) {
  const data = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.campaigns)) return data.campaigns;
  return [];
}

export const campaignsAPI = {
  list: async (params) => unwrapArray(await apiService.getCampaigns(params)),
  get: (id) => apiService.getCampaign(id),
  create: (data) => apiService.createCampaign(data),
  update: (id, data) => apiService.updateCampaign(id, data),
  delete: (id) => apiService.deleteCampaign(id),
  pause: (id) => apiService.pauseCampaign(id),
  activate: (id) => apiService.activateCampaign(id),
};

export default campaignsAPI;