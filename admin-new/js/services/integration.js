/**
 * API Integration - Connects API Service to Admin Sections
 * Re-exports from new modular structure for backward compatibility
 */

export {
  APIMixin,
  useAPI,
  withAPI,
  dashboardAPI,
  ordersAPI,
  productsAPI,
  inventoryAPI,
  categoriesAPI,
  customersAPI,
  reviewsAPI,
  campaignsAPI,
  promotionsAPI,
  analyticsAPI,
  settingsAPI,
  usersAPI,
  utilsAPI,
  SectionAPI,
  apiService,
  cacheService,
  errorBoundary,
  performanceMonitor,
  realtimeService,
  CollaborativeEditor,
  analyticsService,
  multiTenantService,
  securityService,
} from './integration/index.js';

import { default as integrationDefault } from './integration/index.js';
export default integrationDefault;