import { apiService } from '../../api.js';

function unwrapArray(res) {
  const data = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.categories)) return data.categories;
  return [];
}

export const categoriesAPI = {
  list: async (params) => unwrapArray(await apiService.getCategories(params)),
  tree: () => apiService.getCategoryTree(),
  get: (id) => apiService.getCategory(id),
  create: (data) => apiService.createCategory(data),
  update: (id, data) => apiService.updateCategory(id, data),
  delete: (id) => apiService.deleteCategory(id),
  reorder: (orderedIds) => apiService.reorderCategories(orderedIds),
  uploadImage: (id, file) => apiService.uploadCategoryImage(id, file),
};

export default categoriesAPI;