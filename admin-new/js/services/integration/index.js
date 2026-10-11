import { APIMixin } from './api-mixin.js';
import { useAPI } from './use-api.js';
import { withAPI } from './with-api.js';

import {
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
} from './sections/index.js';

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
};

import { apiService } from '../api.js';
import { cacheService } from '../cache.js';
import { errorBoundary } from '../error-boundary.js';
import { performanceMonitor } from '../performance.js';
import { realtimeService } from '../realtime.js';
import { CollaborativeEditor } from '../collaborative.js';
import { analyticsService } from '../analytics-advanced.js';
import { multiTenantService } from '../multi-tenant.js';
import { securityService } from '../security.js';

export {
  apiService,
  cacheService,
  errorBoundary,
  performanceMonitor,
  realtimeService,
  CollaborativeEditor,
  analyticsService,
  multiTenantService,
  securityService,
};

export default {
  apiService,
  SectionAPI,
  APIMixin,
  useAPI,
  withAPI,
  cacheService,
  errorBoundary,
  performanceMonitor,
  realtimeService,
  CollaborativeEditor,
  analyticsService,
  multiTenantService,
  securityService,
};