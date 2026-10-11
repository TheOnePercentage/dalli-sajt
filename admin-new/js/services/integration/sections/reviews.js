import { apiService } from '../../api.js';

function unwrapArray(res) {
  const data = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.reviews)) return data.reviews;
  return [];
}

export const reviewsAPI = {
  list: async (params) => unwrapArray(await apiService.getReviews(params)),
  get: (id) => apiService.getReview(id),
  moderate: (id, action, response) => apiService.moderateReview(id, action, response),
  reply: (id, response) => apiService.replyToReview(id, response),
  export: (params) => apiService.exportReviews(params),
};

export default reviewsAPI;