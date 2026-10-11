import { apiService } from '../../api.js';

export const productsAPI = {
  list: (params) => apiService.getProducts(params),
  get: (id) => apiService.getProduct(id),
  create: (data) => apiService.createProduct(data),
  update: (id, data) => apiService.updateProduct(id, data),
  delete: (id) => apiService.deleteProduct(id),
  getVariants: (productId) => apiService.getProductVariants(productId),
  addVariant: (productId, data) => apiService.addProductVariant(productId, data),
  updateVariant: (productId, variantId, data) => apiService.updateProductVariant(productId, variantId, data),
  deleteVariant: (productId, variantId) => apiService.deleteProductVariant(productId, variantId),
  export: (params) => apiService.exportProducts(params),
  import: (file) => apiService.importProducts(file),
};

export default productsAPI;