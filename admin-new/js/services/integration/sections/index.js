import * as dashboardModule from './dashboard.js';
import * as ordersModule from './orders.js';
import * as productsModule from './products.js';
import * as inventoryModule from './inventory.js';
import * as categoriesModule from './categories.js';
import * as customersModule from './customers.js';
import * as reviewsModule from './reviews.js';
import * as campaignsModule from './campaigns.js';
import * as promotionsModule from './promotions.js';
import * as analyticsModule from './analytics.js';
import * as settingsModule from './settings.js';
import * as usersModule from './users.js';
import * as utilsModule from './utils.js';

export const dashboardAPI = dashboardModule.default;
export const ordersAPI = ordersModule.default;
export const productsAPI = productsModule.default;
export const inventoryAPI = inventoryModule.default;
export const categoriesAPI = categoriesModule.default;
export const customersAPI = customersModule.default;
export const reviewsAPI = reviewsModule.default;
export const campaignsAPI = campaignsModule.default;
export const promotionsAPI = promotionsModule.default;
export const analyticsAPI = analyticsModule.default;
export const settingsAPI = settingsModule.default;
export const usersAPI = usersModule.default;
export const utilsAPI = utilsModule.default;

export const SectionAPI = {
  dashboard: dashboardModule.default,
  orders: ordersModule.default,
  products: productsModule.default,
  inventory: inventoryModule.default,
  categories: categoriesModule.default,
  customers: customersModule.default,
  reviews: reviewsModule.default,
  campaigns: campaignsModule.default,
  promotions: promotionsModule.default,
  analytics: analyticsModule.default,
  settings: settingsModule.default,
  users: usersModule.default,
  utils: utilsModule.default,
};